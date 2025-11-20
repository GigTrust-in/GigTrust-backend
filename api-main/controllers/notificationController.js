// /controllers/notificationController.js
const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

exports.getNotifications = async (req, res) => {
    console.log("=== GET NOTIFICATIONS START ===");
    console.log("User ID:", req.user.id);

    try {
        const notifications = await Notification.find({ user: req.user.id }).sort({
            createdAt: -1,
        });

        console.log(`Found ${notifications.length} notification(s)`);

        res.status(200).json({
            status: "success",
            results: notifications.length,
            data: { notifications },
        });
        console.log("=== GET NOTIFICATIONS END ===\n");
    } catch (err) {
        console.error("❌ Error fetching notifications:", err.message);
        res.status(400).json({ status: "fail", message: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    console.log("=== MARK NOTIFICATION AS READ START ===");
    console.log("Notification ID:", req.params.id);
    console.log("User ID:", req.user.id);

    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            console.log("❌ Notification not found");
            return res.status(404).json({ status: "fail", message: "Notification not found" });
        }

        console.log("✓ Notification marked as read");

        res.status(200).json({
            status: "success",
            data: { notification },
        });
        console.log("=== MARK NOTIFICATION AS READ END ===\n");
    } catch (err) {
        console.error("❌ Error marking notification as read:", err.message);
        res.status(400).json({ status: "fail", message: err.message });
    }
};
