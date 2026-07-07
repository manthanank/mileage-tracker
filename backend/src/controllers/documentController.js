const Document = require('../models/Document');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const upload = require('../utils/fileUpload');

// @desc    Get all documents for a vehicle
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    const { vehicleId, type } = req.query;
    const filter = { user: req.user.id };

    if (vehicleId) filter.vehicle = vehicleId;
    if (type) filter.type = type;

    const documents = await Document.find(filter).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload new document
// @route   POST /api/documents
// @access  Private
exports.createDocument = async (req, res, next) => {
  try {
    const { vehicleId, name, type, documentNumber, expiryDate, notes, remindBeforeDays, cost } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a document file (image or PDF)',
      });
    }

    const document = await Document.create({
      vehicle: vehicleId,
      user: req.user.id,
      name,
      type,
      documentNumber,
      expiryDate,
      filePath: upload.getUploadedFileUrl(req.file),
      notes,
      remindBeforeDays: remindBeforeDays ? Number(remindBeforeDays) : 15,
    });

    // Optional: If cost is logged (e.g. insurance premium, PUC fee), create Expense sync
    if (cost && Number(cost) > 0) {
      let expenseCategory = 'Other';
      if (type === 'Insurance') expenseCategory = 'Insurance';
      else if (type === 'PUC') expenseCategory = 'PUC';

      await Expense.create({
        vehicle: vehicleId,
        user: req.user.id,
        date: new Date(),
        category: expenseCategory,
        amount: Number(cost),
        notes: `Fee for logging ${name || type} (${documentNumber || 'N/A'})`,
        receiptPhoto: upload.getUploadedFileUrl(req.file),
        associatedId: document._id,
      });
    }

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update document details
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res, next) => {
  try {
    let document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    if (req.file) {
      req.body.filePath = upload.getUploadedFileUrl(req.file);
    }

    document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Sync expense if associated
    if (req.body.cost !== undefined && Number(req.body.cost) > 0) {
      let expenseCategory = 'Other';
      if (document.type === 'Insurance') expenseCategory = 'Insurance';
      else if (document.type === 'PUC') expenseCategory = 'PUC';

      await Expense.findOneAndUpdate(
        { associatedId: document._id },
        {
          amount: Number(req.body.cost),
          category: expenseCategory,
          receiptPhoto: document.filePath,
        },
        { upsert: true, new: true } // Creates expense if it didn't exist previously
      );
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    await document.deleteOne();

    // Delete associated Expense if any
    await Expense.deleteMany({ associatedId: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
