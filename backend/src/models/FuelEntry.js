const mongoose = require('mongoose');

const fuelEntrySchema = new mongoose.Schema(
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
      required: [true, 'Please add a date'],
      default: Date.now,
    },
    odometer: {
      type: Number,
      required: [true, 'Please add odometer reading'],
    },
    liters: {
      type: Number,
      required: [true, 'Please add fuel volume in liters'],
    },
    pricePerLiter: {
      type: Number,
      required: [true, 'Please add price per liter'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Please add total cost'],
    },
    fuelStation: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    partialFill: {
      type: Boolean,
      default: false,
    },
    missedPreviousFill: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptPhoto: {
      type: String, // file path / url
    },
    mileage: {
      type: Number, // calculated mileage in km/L (null if partial fill or first entry)
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly sort entries by odometer and date
fuelEntrySchema.index({ vehicle: 1, odometer: 1 });
fuelEntrySchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model('FuelEntry', fuelEntrySchema);
