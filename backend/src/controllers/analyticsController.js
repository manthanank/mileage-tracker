const FuelEntry = require('../models/FuelEntry');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const Service = require('../models/Service');
const Vehicle = require('../models/Vehicle');
const {
  generateFuelCSV,
  generateExpenseCSV,
  generateServiceCSV,
  generateTripCSV,
} = require('../utils/reports');

// @desc    Get monthly summary stats (Trips, Distance, Fuel, Expenses)
// @route   GET /api/analytics/monthly/:vehicleId
// @access  Private
exports.getMonthlySummary = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) !== undefined ? Number(req.query.month) : new Date().getMonth(); // 0-indexed

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [trips, fuelEntries, expenses] = await Promise.all([
      Trip.find({
        vehicle: vehicleId,
        startDate: { $gte: startDate, $lte: endDate },
        status: 'completed',
      }),
      FuelEntry.find({
        vehicle: vehicleId,
        date: { $gte: startDate, $lte: endDate },
      }),
      Expense.find({
        vehicle: vehicleId,
        date: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const tripsCount = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    const totalFuelLiters = fuelEntries.reduce((sum, entry) => sum + entry.liters, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        month: month + 1,
        year,
        tripsCount,
        distance: parseFloat(totalDistance.toFixed(1)),
        fuel: parseFloat(totalFuelLiters.toFixed(1)),
        expense: Math.round(totalExpense),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get annual Year in Review stats
// @route   GET /api/analytics/annual/:vehicleId
// @access  Private
exports.getAnnualSummary = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const year = Number(req.query.year) || new Date().getFullYear();

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const [trips, fuelEntries, expenses] = await Promise.all([
      Trip.find({
        vehicle: vehicleId,
        startDate: { $gte: startDate, $lte: endDate },
        status: 'completed',
      }),
      FuelEntry.find({
        vehicle: vehicleId,
        date: { $gte: startDate, $lte: endDate },
      }),
      Expense.find({
        vehicle: vehicleId,
        date: { $gte: startDate, $lte: endDate },
      }),
    ]);

    // Odometer math
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    const totalFuelLiters = fuelEntries.reduce((sum, entry) => sum + entry.liters, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Longest ride
    const distances = trips.map(t => t.distance || 0);
    const longestRide = distances.length > 0 ? Math.max(...distances) : 0;

    // Best mileage
    const validMileages = fuelEntries.map(e => e.mileage).filter(m => m !== null && m !== undefined);
    const bestMileage = validMileages.length > 0 ? Math.max(...validMileages) : 0;

    // Most visited station
    const stations = {};
    fuelEntries.forEach(entry => {
      if (entry.fuelStation) {
        const name = entry.fuelStation.trim().toUpperCase();
        stations[name] = (stations[name] || 0) + 1;
      }
    });

    let mostVisitedStation = 'N/A';
    let maxVisits = 0;
    Object.keys(stations).forEach(name => {
      if (stations[name] > maxVisits) {
        maxVisits = stations[name];
        mostVisitedStation = name.replace(/\b\w/g, c => c.toUpperCase());
      }
    });

    res.status(200).json({
      success: true,
      data: {
        year,
        distance: parseFloat(totalDistance.toFixed(1)),
        fuel: parseFloat(totalFuelLiters.toFixed(1)),
        expense: Math.round(totalExpense),
        tripsCount: trips.length,
        bestMileage,
        longestRide,
        mostVisitedStation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download CSV reports
// @route   GET /api/analytics/report/download
// @access  Private
exports.downloadReport = async (req, res, next) => {
  try {
    const { vehicleId, type } = req.query;

    if (!vehicleId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Please specify vehicleId and report type (fuel, expenses, services, trips)',
      });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'fuel':
        const fuelEntries = await FuelEntry.find({ vehicle: vehicleId }).sort({ date: -1, odometer: -1 });
        csvData = generateFuelCSV(fuelEntries);
        filename = `${vehicle.name.replace(/\s+/g, '_')}_fuel_report.csv`;
        break;
      case 'expenses':
        const expenses = await Expense.find({ vehicle: vehicleId }).sort({ date: -1 });
        csvData = generateExpenseCSV(expenses);
        filename = `${vehicle.name.replace(/\s+/g, '_')}_expense_report.csv`;
        break;
      case 'services':
        const services = await Service.find({ vehicle: vehicleId }).sort({ date: -1, odometer: -1 });
        csvData = generateServiceCSV(services);
        filename = `${vehicle.name.replace(/\s+/g, '_')}_service_report.csv`;
        break;
      case 'trips':
        const trips = await Trip.find({ vehicle: vehicleId }).sort({ startDate: -1 });
        csvData = generateTripCSV(trips);
        filename = `${vehicle.name.replace(/\s+/g, '_')}_trip_report.csv`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid report type. Allowed values are 'fuel', 'expenses', 'services', 'trips'",
        });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
