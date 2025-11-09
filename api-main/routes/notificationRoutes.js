// /routes/notificationRoutes.js
const express = require("express");
const notificationController = require("../controllers/notificationController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.use(protect); // All notification routes are protected

router.get("/", notificationController.getMyNotifications);

module.exports = router;
