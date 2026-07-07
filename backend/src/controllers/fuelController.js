const FuelEntry = require('../models/FuelEntry');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const Service = require('../models/Service');
const { recalculateMileage } = require('../utils/mileageCalc');
const upload = require('../utils/fileUpload');

/**
 * Helper to sync vehicle's current odometer based on the highest logged odometer reading.
 */
const syncVehicleOdometer = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return;

  const [maxFuel, maxTrip, maxService] = await Promise.all([
    FuelEntry.findOne({ vehicle: vehicleId }).sort({ odometer: -1 }),
    Trip.findOne({ vehicle: vehicleId }).sort({ endOdometer: -1 }),
    Service.findOne({ vehicle: vehicleId }).sort({ odometer: -1 }),
  ]);

  let maxOdo = vehicle.startOdometer;
  if (maxFuel && maxFuel.odometer > maxOdo) maxOdo = maxFuel.odometer;
  if (maxTrip) {
    if (maxTrip.endOdometer && maxTrip.endOdometer > maxOdo) maxOdo = maxTrip.endOdometer;
    if (maxTrip.startOdometer && maxTrip.startOdometer > maxOdo) maxOdo = maxTrip.startOdometer;
  }
  if (maxService && maxService.odometer > maxOdo) maxOdo = maxService.odometer;

  if (vehicle.currentOdometer !== maxOdo) {
    vehicle.currentOdometer = maxOdo;
    await vehicle.save();
  }
};

// @desc    Get all fuel entries
// @route   GET /api/fuel
// @access  Private
exports.getFuelEntries = async (req, res, next) => {
  try {
    const { vehicleId } = req.query;
    const filter = { user: req.user.id };
    
    if (vehicleId) {
      filter.vehicle = vehicleId;
    }

    const entries = await FuelEntry.find(filter).sort({ date: -1, odometer: -1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new fuel entry
// @route   POST /api/fuel
// @access  Private
exports.createFuelEntry = async (req, res, next) => {
  try {
    const { vehicleId, date, odometer, liters, pricePerLiter, totalCost, fuelStation, location, partialFill, missedPreviousFill, notes } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Odometer integrity check: cannot be less than start odometer
    if (odometer < vehicle.startOdometer) {
      return res.status(400).json({
        success: false,
        error: `Odometer reading cannot be less than start odometer (${vehicle.startOdometer} km)`,
      });
    }

    // Handle uploaded file path if exists
    let receiptPhoto = null;
    if (req.file) {
      receiptPhoto = upload.getUploadedFileUrl(req.file);
    }

    // Create entry
    const entry = await FuelEntry.create({
      vehicle: vehicleId,
      user: req.user.id,
      date,
      odometer,
      liters,
      pricePerLiter,
      totalCost,
      fuelStation,
      location,
      partialFill: partialFill === 'true' || partialFill === true,
      missedPreviousFill: missedPreviousFill === 'true' || missedPreviousFill === true,
      notes,
      receiptPhoto,
    });

    // 1. Recalculate fuel economy
    await recalculateMileage(vehicleId);

    // 2. Synchronize vehicle's odometer
    await syncVehicleOdometer(vehicleId);

    // 3. Create automatic expense sync
    await Expense.create({
      vehicle: vehicleId,
      user: req.user.id,
      date: entry.date,
      category: 'Fuel',
      amount: totalCost,
      odometer,
      notes: notes || `Refueled at ${fuelStation || 'Fuel Station'}`,
      receiptPhoto,
      associatedId: entry._id,
    });

    // Fetch the updated entry to return with correct mileage calculation
    const updatedEntry = await FuelEntry.findById(entry._id);

    res.status(201).json({
      success: true,
      data: updatedEntry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fuel entry
// @route   PUT /api/fuel/:id
// @access  Private
exports.updateFuelEntry = async (req, res, next) => {
  try {
    let entry = await FuelEntry.findOne({ _id: req.params.id, user: req.user.id });
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Fuel entry not found',
      });
    }

    const { odometer, totalCost, notes, date, fuelStation } = req.body;

    // Handle receipt photo replacement
    if (req.file) {
      req.body.receiptPhoto = upload.getUploadedFileUrl(req.file);
    }

    // Parse booleans if passed as strings
    if (req.body.partialFill !== undefined) {
      req.body.partialFill = req.body.partialFill === 'true' || req.body.partialFill === true;
    }
    if (req.body.missedPreviousFill !== undefined) {
      req.body.missedPreviousFill = req.body.missedPreviousFill === 'true' || req.body.missedPreviousFill === true;
    }

    entry = await FuelEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // 1. Recalculate mileage
    await recalculateMileage(entry.vehicle);

    // 2. Sync vehicle current odometer
    await syncVehicleOdometer(entry.vehicle);

    // 3. Sync Expense entry
    await Expense.findOneAndUpdate(
      { associatedId: entry._id },
      {
        amount: totalCost !== undefined ? totalCost : entry.totalCost,
        odometer: odometer !== undefined ? odometer : entry.odometer,
        date: date !== undefined ? date : entry.date,
        notes: notes || `Refueled at ${fuelStation || entry.fuelStation || 'Fuel Station'}`,
        receiptPhoto: entry.receiptPhoto,
      }
    );

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fuel entry
// @route   DELETE /api/fuel/:id
// @access  Private
exports.deleteFuelEntry = async (req, res, next) => {
  try {
    const entry = await FuelEntry.findOne({ _id: req.params.id, user: req.user.id });
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Fuel entry not found',
      });
    }

    const vehicleId = entry.vehicle;

    await entry.deleteOne();

    // 1. Recalculate remaining entries
    await recalculateMileage(vehicleId);

    // 2. Update vehicle odometer
    await syncVehicleOdometer(vehicleId);

    // 3. Delete synced expense
    await Expense.deleteMany({ associatedId: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncVehicleOdometer,
  ...exports,
};
