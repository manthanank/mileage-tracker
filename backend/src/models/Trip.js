const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    startOdometer: {
      type: Number,
      required: true,
    },
    endOdometer: {
      type: Number,
    },
    distance: {
      type: Number, // In km
    },
    duration: {
      type: Number, // In minutes
    },
    startLocation: {
      type: String,
      trim: true,
    },
    endLocation: {
      type: String,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        'Office',
        'Personal',
        'Ride',
        'Vacation',
        'Family',
        'Shopping',
        'Delivery',
        'Business',
        'Airport',
        'Other',
      ],
      default: 'Personal',
    },
    notes: {
      type: String,
      trim: true,
    },
    photos: [
      {
        type: String, // Photo paths/URLs
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['started', 'running', 'completed'],
      default: 'started',
    },
    weather: {
      condition: String, // e.g. Sunny, Rainy, Cloudy
      temp: Number,      // In °C
      humidity: Number,  // Percentage
    },
    rideScore: {
      type: Number, // Score out of 100 based on efficiency / driving consistency
    },
    routePoints: [
      {
        lat: Number,
        lng: Number,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index to quickly query trips by vehicle, date range and running status
tripSchema.index({ vehicle: 1, startDate: -1 });
tripSchema.index({ vehicle: 1, status: 1 });

module.exports = mongoose.model('Trip', tripSchema);
