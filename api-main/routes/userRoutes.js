const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

console.log("--- Checking userController Import ---");
console.log(userController);
console.log("--- End Check ---");
// ------------------------------------

const router = express.Router();

// All routes below this point are protected and require a user to be logged in
router.use(authController.protect);

// Route for the user to get their own profile info
// It first runs getMe middleware to put the user's own ID into the params
// Then it runs the generic getUser controller
router.get("/me", userController.getMe, userController.getUser);

// Route for the user to update their own profile info
router.patch("/updateMe", userController.updateMe);

// Route for the user to update their FCM token
router.patch("/fcm-token", userController.updateFcmToken);

// Example of a more generic route you could add later
router.get("/:id", userController.getUser);

// Nested reviews
const reviewRouter = require("./reviewRoutes");
router.use("/:userId/reviews", reviewRouter);

module.exports = router;
