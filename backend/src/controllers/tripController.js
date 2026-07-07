const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const { syncVehicleOdometer } = require('./fuelController');
const upload = require('../utils/fileUpload');

// @desc    Get all trips
// @route   GET /api/trips
// @access  Private
exports.getTrips = async (req, res, next) => {
  try {
    const { vehicleId, purpose, status } = req.query;
    const filter = { user: req.user.id };

    if (vehicleId) filter.vehicle = vehicleId;
    if (purpose) filter.purpose = purpose;
    if (status) filter.status = status;

    const trips = await Trip.find(filter).sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single trip
// @route   GET /api/trips/:id
// @access  Private
exports.getTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }
    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start a new trip
// @route   POST /api/trips/start
// @access  Private
exports.startTrip = async (req, res, next) => {
  try {
    const { vehicleId, startOdometer, purpose, startLocation, notes, tags, weather } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Check if there is already an active running trip for this vehicle
    const activeTrip = await Trip.findOne({ vehicle: vehicleId, status: { $in: ['started', 'running'] } });
    if (activeTrip) {
      return res.status(400).json({
        success: false,
        error: 'There is already an active trip running for this vehicle. End it first!',
      });
    }

    const tripOdometer = startOdometer !== undefined ? Number(startOdometer) : vehicle.currentOdometer;

    const trip = await Trip.create({
      vehicle: vehicleId,
      user: req.user.id,
      startDate: new Date(),
      startOdometer: tripOdometer,
      purpose,
      startLocation,
      notes,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      status: 'running',
      weather,
    });

    // Update vehicle odo if the started odo is higher
    if (tripOdometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = tripOdometer;
      await vehicle.save();
    }

    res.status(201).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End an active running trip
// @route   POST /api/trips/:id/end
// @access  Private
exports.endTrip = async (req, res, next) => {
  try {
    const { endOdometer, endLocation, notes, rideScore, weather } = req.body;
    
    let trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Trip is already completed',
      });
    }

    const vehicle = await Vehicle.findById(trip.vehicle);
    const finalOdometer = endOdometer !== undefined ? Number(endOdometer) : vehicle.currentOdometer;

    if (finalOdometer < trip.startOdometer) {
      return res.status(400).json({
        success: false,
        error: `End odometer (${finalOdometer} km) cannot be less than start odometer (${trip.startOdometer} km)`,
      });
    }

    const distance = finalOdometer - trip.startOdometer;
    const endDate = new Date();
    const duration = Math.max(1, Math.round((endDate - new Date(trip.startDate)) / 60000)); // in minutes

    // Handle photos uploaded
    const photos = [];
    if (req.files) {
      req.files.forEach(file => {
        photos.push(upload.getUploadedFileUrl(file));
      });
    }

    trip.endOdometer = finalOdometer;
    trip.endDate = endDate;
    trip.distance = distance;
    trip.duration = duration;
    trip.endLocation = endLocation;
    trip.status = 'completed';
    trip.rideScore = rideScore !== undefined ? Number(rideScore) : undefined;
    if (notes) trip.notes = (trip.notes ? trip.notes + '\n' : '') + notes;
    if (photos.length > 0) trip.photos = trip.photos.concat(photos);
    if (weather) {
      if (typeof weather === 'string') {
        try {
          trip.weather = JSON.parse(weather);
        } catch (e) {
          // Fallback if not valid JSON
        }
      } else {
        trip.weather = weather;
      }
    }

    await trip.save();

    // Sync vehicle's odometer
    await syncVehicleOdometer(trip.vehicle);

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Live GPS Point
// @route   POST /api/trips/:id/gps
// @access  Private
exports.recordGpsPoint = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and Longitude are required',
      });
    }

    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'GPS points can only be recorded on a running trip',
      });
    }

    trip.routePoints.push({ lat, lng, timestamp: new Date() });
    await trip.save();

    res.status(200).json({
      success: true,
      data: {
        pointsCount: trip.routePoints.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Trip Statistics
// @route   GET /api/trips/stats/:vehicleId
// @access  Private
exports.getTripStats = async (req, res, next) => {
  try {
    const trips = await Trip.find({ vehicle: req.params.vehicleId, status: 'completed' });
    
    if (trips.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          longestRide: 0,
          shortestRide: 0,
          averageRide: 0,
          totalTrips: 0,
        },
      });
    }

    const distances = trips.map(t => t.distance || 0);
    const longestRide = Math.max(...distances);
    const shortestRide = Math.min(...distances.filter(d => d > 0)); // Exclude 0km errors
    const totalDistance = distances.reduce((s, d) => s + d, 0);
    const averageRide = parseFloat((totalDistance / trips.length).toFixed(1));

    res.status(200).json({
      success: true,
      data: {
        longestRide,
        shortestRide: shortestRide === Infinity ? 0 : shortestRide,
        averageRide,
        totalTrips: trips.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update trip notes, tags, photos
// @route   PUT /api/trips/:id
// @access  Private
exports.updateTrip = async (req, res, next) => {
  try {
    let trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (req.files && req.files.length > 0) {
      const photos = req.files.map(file => upload.getUploadedFileUrl(file));
      req.body.photos = trip.photos.concat(photos);
    }

    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(t => t.trim());
    }

    trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Recalculate distance/duration if dates or odometers are modified
    if (req.body.startOdometer || req.body.endOdometer) {
      trip.distance = (trip.endOdometer || 0) - trip.startOdometer;
      await trip.save();
      await syncVehicleOdometer(trip.vehicle);
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    const vehicleId = trip.vehicle;
    await trip.deleteOne();
    await syncVehicleOdometer(vehicleId);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
