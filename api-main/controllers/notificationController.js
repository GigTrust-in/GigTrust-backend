// /controllers/notificationController.js
const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

exports.getMyNotifications = catchAsync(async (req, res, next) => {
    const notifications = await Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
        status: 'success',
        results: notifications.length,
        data: { notifications },
    });
});
