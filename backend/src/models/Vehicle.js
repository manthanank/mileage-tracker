const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a vehicle name'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify vehicle type'],
      enum: ['bike', 'car', 'scooter', 'other'],
    },
    brand: {
      type: String,
      required: [true, 'Please add a brand'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Please add a model'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Please add a manufacturing year'],
    },
    fuelType: {
      type: String,
      required: [true, 'Please specify fuel type'],
      enum: ['petrol', 'diesel', 'electric', 'CNG'],
      default: 'petrol',
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    startOdometer: {
      type: Number,
      required: [true, 'Please add start odometer reading'],
    },
    currentOdometer: {
      type: Number,
      required: [true, 'Please add current odometer reading'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
