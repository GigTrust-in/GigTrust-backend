const express = require("express");
const authController = require("../controllers/authController");

console.log("--- Checking authController Import ---");
console.log(authController);
console.log("--- End Check ---");
// ------------------------------------

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;
