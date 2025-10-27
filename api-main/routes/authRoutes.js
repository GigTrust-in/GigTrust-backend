/* const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router; */

// /routes/authRoutes.js

const express = require("express");
const authController = require("../controllers/authController");

// --- THIS IS THE FINAL DIAGNOSTIC TEST ---
console.log("--- Checking authController Import ---");
console.log(authController);
console.log("--- End Check ---");
// ------------------------------------

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;
