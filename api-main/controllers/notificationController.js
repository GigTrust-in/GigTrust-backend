// /controllers/notificationController.js
const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            status: "success",
            results: notifications.length,
            data: { notifications },
        });
    } catch (err) {
        res.status(400).json({ status: "fail", message: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ status: "fail", message: "Notification not found" });
        }

        res.status(200).json({
            status: "success",
            data: { notification },
        });
    } catch (err) {
        res.status(400).json({ status: "fail", message: err.message });
    }
};
