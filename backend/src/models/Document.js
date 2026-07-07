const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a document name'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'RC',
        'Insurance',
        'PUC',
        'License',
        'Purchase Invoice',
        'Warranty',
        'Other',
      ],
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date, // Null for documents like invoices
    },
    filePath: {
      type: String, // Path to local uploads / cloud storage
      required: [true, 'Please upload a document file'],
    },
    notes: {
      type: String,
      trim: true,
    },
    remindBeforeDays: {
      type: Number,
      default: 15, // Number of days before expiry to notify user
    },
    reminded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ vehicle: 1, type: 1 });
documentSchema.index({ vehicle: 1, expiryDate: 1 });

module.exports = mongoose.model('Document', documentSchema);
