const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    type: {
      type: String,
      required: true,
      enum: ['Service', 'Insurance', 'PUC', 'Mileage Drop', 'General'],
      default: 'General',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    triggerDate: {
      type: Date,
      default: Date.now,
    },
    associatedId: {
      type: mongoose.Schema.Types.ObjectId, // Optional ID pointing to Service/Document
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, read: 1, triggerDate: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
