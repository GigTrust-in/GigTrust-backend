/* const express = require("express");
const userController = require("../controllers/userController");
const { protect } = require("../controllers/authController"); // We will move 'protect' here later

const router = express.Router();

// All routes after this middleware are protected
// NOTE: You'll need to refactor 'protect' out of jobRoutes.js and into authController.js
router.use(protect);

router.get("/me", userController.getMe);
router.patch("/updateMe", userController.updateMe);

module.exports = router; */
// /routes/userRoutes.js

const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

// --- THIS IS THE DIAGNOSTIC LINE ---
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

// Example of a more generic route you could add later
router.get("/:id", userController.getUser);

module.exports = router;
