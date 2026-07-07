const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const upload = require('../utils/fileUpload');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res, next) => {
  try {
    const { vehicleId, category } = req.query;
    const filter = { user: req.user.id };

    if (vehicleId) filter.vehicle = vehicleId;
    if (category) filter.category = category;

    const expenses = await Expense.find(filter).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }
    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual expense entry
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res, next) => {
  try {
    const { vehicleId, date, category, amount, odometer, notes } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Do not allow manual entry of 'Fuel' or 'Service' categories directly to prevent mismatching logs
    if (category === 'Fuel' || category === 'Service') {
      return res.status(400).json({
        success: false,
        error: "Please log 'Fuel' refuels or maintenance 'Services' through their respective logs to keep records in sync.",
      });
    }

    let receiptPhoto = null;
    if (req.file) {
      receiptPhoto = upload.getUploadedFileUrl(req.file);
    }

    const expense = await Expense.create({
      vehicle: vehicleId,
      user: req.user.id,
      date,
      category,
      amount,
      odometer,
      notes,
      receiptPhoto,
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense entry
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    // If sync-locked from a Fuel or Service record, prompt user to edit that source instead
    if (expense.associatedId) {
      return res.status(400).json({
        success: false,
        error: `This expense is linked to a ${expense.category} log. Please modify the original ${expense.category} record to update this expense.`,
      });
    }

    if (req.file) {
      req.body.receiptPhoto = upload.getUploadedFileUrl(req.file);
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense entry
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    if (expense.associatedId) {
      return res.status(400).json({
        success: false,
        error: `This expense is locked to a ${expense.category} log. Please delete the original ${expense.category} record instead.`,
      });
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense summary categorized for stats charts
// @route   GET /api/expenses/summary/:vehicleId
// @access  Private
exports.getExpenseSummary = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ vehicle: req.params.vehicleId });
    
    const categories = {};
    let total = 0;

    expenses.forEach(e => {
      if (!categories[e.category]) categories[e.category] = 0;
      categories[e.category] += e.amount;
      total += e.amount;
    });

    const breakdown = Object.keys(categories).map(cat => ({
      category: cat,
      amount: categories[cat],
      percentage: total > 0 ? Math.round((categories[cat] / total) * 100) : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalExpense: total,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
