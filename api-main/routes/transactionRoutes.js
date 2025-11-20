const express = require("express");
const transactionController = require("../controllers/transactionController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.get("/my-transactions", transactionController.getMyTransactions);
router.post("/withdraw", transactionController.withdrawFunds);

module.exports = router;
