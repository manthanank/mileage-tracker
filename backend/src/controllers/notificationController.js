const Notification = require('../models/Notification');
const Document = require('../models/Document');

/**
 * Utility function to check document expiry dates and trigger notifications dynamically
 */
const checkDocumentExpiries = async (userId) => {
  try {
    const documents = await Document.find({ 
      user: userId, 
      reminded: false, 
      expiryDate: { $ne: null } 
    }).populate('vehicle');

    const now = new Date();

    for (const doc of documents) {
      const expiry = new Date(doc.expiryDate);
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If document is expired or expiring within its set warning threshold
      if (diffDays <= doc.remindBeforeDays) {
        let type = 'General';
        if (doc.type === 'Insurance') type = 'Insurance';
        else if (doc.type === 'PUC') type = 'PUC';

        const isExpired = diffDays <= 0;
        const title = isExpired ? `${doc.type} EXPIRED!` : `${doc.type} Expiring Soon!`;
        const message = isExpired
          ? `Your ${doc.type} document for ${doc.vehicle ? doc.vehicle.name : 'your vehicle'} expired on ${expiry.toLocaleDateString()}. Renew immediately!`
          : `Your ${doc.type} document for ${doc.vehicle ? doc.vehicle.name : 'your vehicle'} is expiring in ${diffDays} days (Expiry: ${expiry.toLocaleDateString()}).`;

        await Notification.create({
          user: userId,
          vehicle: doc.vehicle ? doc.vehicle._id : null,
          type,
          title,
          message,
          associatedId: doc._id,
        });

        doc.reminded = true;
        await doc.save();
      }
    }
  } catch (error) {
    console.error('Error running document expiry check:', error.message);
  }
};

// @desc    Get user notifications (auto-runs document expiry checks)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    // 1. Run dynamic expiry checks
    await checkDocumentExpiries(req.user.id);

    // 2. Fetch notifications
    const notifications = await Notification.find({ user: req.user.id }).sort({ read: 1, triggerDate: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    let notification = await Notification.findOne({ _id: req.params.id, user: req.user.id });
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.id });
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
