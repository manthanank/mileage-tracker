const Vehicle = require('../models/Vehicle');
const FuelEntry = require('../models/FuelEntry');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const Service = require('../models/Service');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const { calculateHealthScore, getPredictionsAndInsights } = require('../utils/aiEngine');

// @desc    Get all user vehicles
// @route   GET /api/vehicles
// @access  Private
exports.getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id });
    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
exports.getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private
exports.createVehicle = async (req, res, next) => {
  try {
    // Inject logged in user ID
    req.body.user = req.user.id;
    // Set initial currentOdometer to startOdometer if not specified
    if (req.body.startOdometer && !req.body.currentOdometer) {
      req.body.currentOdometer = req.body.startOdometer;
    }

    const vehicle = await Vehicle.create(req.body);

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
exports.updateVehicle = async (req, res, next) => {
  try {
    let vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Cascaded delete all associated records
    await FuelEntry.deleteMany({ vehicle: req.params.id });
    await Trip.deleteMany({ vehicle: req.params.id });
    await Expense.deleteMany({ vehicle: req.params.id });
    await Service.deleteMany({ vehicle: req.params.id });
    await Document.deleteMany({ vehicle: req.params.id });
    await Notification.deleteMany({ vehicle: req.params.id });

    await vehicle.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle dashboard overview (health, predictions, list records)
// @route   GET /api/vehicles/:id/dashboard
// @access  Private
exports.getVehicleDashboard = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // 1. Fetch recent activity (parallelized)
    const [recentFuel, recentTrips, recentExpenses, recentServices] = await Promise.all([
      FuelEntry.find({ vehicle: vehicle._id }).sort({ date: -1, odometer: -1 }).limit(5),
      Trip.find({ vehicle: vehicle._id }).sort({ startDate: -1 }).limit(5),
      Expense.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(5),
      Service.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(5),
    ]);

    // 2. Fetch latest calculated fuel efficiency
    const latestFuelEntry = await FuelEntry.findOne({ vehicle: vehicle._id, mileage: { $ne: null } })
      .sort({ odometer: -1 });
    const latestMileage = latestFuelEntry ? latestFuelEntry.mileage : null;

    // 3. Compute AI Health score
    let healthAnalysis = { score: 100, status: 'Excellent', factors: {} };
    try {
      healthAnalysis = await calculateHealthScore(vehicle._id);
    } catch (err) {
      console.error('Error calculating health score:', err.message);
    }

    // 4. Compute Predictions & Insights
    let predictiveInsights = { insights: [] };
    try {
      predictiveInsights = await getPredictionsAndInsights(vehicle._id);
    } catch (err) {
      console.error('Error fetching predictive insights:', err.message);
    }

    res.status(200).json({
      success: true,
      data: {
        vehicle,
        latestMileage,
        health: healthAnalysis,
        predictions: predictiveInsights,
        recentActivity: {
          fuel: recentFuel,
          trips: recentTrips,
          expenses: recentExpenses,
          services: recentServices,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
