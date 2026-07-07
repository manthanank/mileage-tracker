const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Fuel',
        'Service',
        'Insurance',
        'PUC',
        'Parking',
        'Tolls',
        'Wash',
        'Accessories',
        'Other',
      ],
    },
    amount: {
      type: Number,
      required: [true, 'Please specify expense amount'],
    },
    odometer: {
      type: Number, // Optional odometer when the expense occurred
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptPhoto: {
      type: String,
    },
    associatedId: {
      type: mongoose.Schema.Types.ObjectId, // Can point to a FuelEntry or Service ID for auto-synced logs
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
