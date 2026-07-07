const Service = require('../models/Service');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const { syncVehicleOdometer } = require('./fuelController');
const upload = require('../utils/fileUpload');

// @desc    Get all service records
// @route   GET /api/services
// @access  Private
exports.getServices = async (req, res, next) => {
  try {
    const { vehicleId, type } = req.query;
    const filter = { user: req.user.id };

    if (vehicleId) filter.vehicle = vehicleId;
    if (type) filter.type = type;

    const services = await Service.find(filter).sort({ date: -1, odometer: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service record
// @route   GET /api/services/:id
// @access  Private
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service record not found',
      });
    }
    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create service record
// @route   POST /api/services
// @access  Private
exports.createService = async (req, res, next) => {
  try {
    const { vehicleId, date, odometer, type, cost, description, serviceProvider, nextServiceOdometer, nextServiceDate } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    if (odometer < vehicle.startOdometer) {
      return res.status(400).json({
        success: false,
        error: `Odometer reading cannot be less than start odometer (${vehicle.startOdometer} km)`,
      });
    }

    let invoicePhoto = null;
    if (req.file) {
      invoicePhoto = upload.getUploadedFileUrl(req.file);
    }

    const service = await Service.create({
      vehicle: vehicleId,
      user: req.user.id,
      date,
      odometer,
      type,
      cost: cost ? Number(cost) : 0,
      description,
      serviceProvider,
      invoicePhoto,
      nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
      nextServiceDate,
    });

    // 1. Sync vehicle current odometer
    await syncVehicleOdometer(vehicleId);

    // 2. Auto-generate Expense sync
    await Expense.create({
      vehicle: vehicleId,
      user: req.user.id,
      date: service.date,
      category: 'Service',
      amount: service.cost,
      odometer: service.odometer,
      notes: `${type} Maintenance log at ${serviceProvider || 'Service Provider'}`,
      receiptPhoto: invoicePhoto,
      associatedId: service._id,
    });

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service record
// @route   PUT /api/services/:id
// @access  Private
exports.updateService = async (req, res, next) => {
  try {
    let service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service record not found',
      });
    }

    const { odometer, cost, type, serviceProvider, date } = req.body;

    if (req.file) {
      req.body.invoicePhoto = upload.getUploadedFileUrl(req.file);
    }

    service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // 1. Sync vehicle current odometer
    await syncVehicleOdometer(service.vehicle);

    // 2. Sync associated Expense record
    await Expense.findOneAndUpdate(
      { associatedId: service._id },
      {
        amount: cost !== undefined ? Number(cost) : service.cost,
        odometer: odometer !== undefined ? Number(odometer) : service.odometer,
        date: date !== undefined ? date : service.date,
        notes: `${type || service.type} Maintenance log at ${serviceProvider || service.serviceProvider || 'Service Provider'}`,
        receiptPhoto: service.invoicePhoto,
      }
    );

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service record
// @route   DELETE /api/services/:id
// @access  Private
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service record not found',
      });
    }

    const vehicleId = service.vehicle;
    await service.deleteOne();

    // 1. Sync vehicle current odometer
    await syncVehicleOdometer(vehicleId);

    // 2. Delete associated Expense
    await Expense.deleteMany({ associatedId: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
