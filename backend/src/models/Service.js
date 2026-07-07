const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
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
    odometer: {
      type: Number,
      required: [true, 'Please specify odometer reading at service time'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'Oil Change',
        'Chain Lube',
        'Tyres',
        'Battery',
        'Brake Pad',
        'General Service',
        'Other',
      ],
    },
    cost: {
      type: Number,
      required: [true, 'Please specify service cost'],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    serviceProvider: {
      type: String,
      trim: true,
    },
    invoicePhoto: {
      type: String,
    },
    nextServiceOdometer: {
      type: Number, // Predicted or user-entered odometer for next service
    },
    nextServiceDate: {
      type: Date, // Predicted or user-entered date for next service
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending'],
      default: 'Completed',
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model('Service', serviceSchema);
