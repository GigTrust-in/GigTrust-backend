const Transaction = require("../models/Transaction");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getMyTransactions = catchAsync(async (req, res, next) => {
    console.log("=== GET MY TRANSACTIONS START ===");
    console.log("User ID:", req.user.id);

    const transactions = await Transaction.find({ user: req.user.id }).sort({
        date: -1,
    });

    console.log(`Found ${transactions.length} transaction(s)`);

    res.status(200).json({
        status: "success",
        results: transactions.length,
        data: {
            transactions,
        },
    });
    console.log("=== GET MY TRANSACTIONS END ===\n");
});

exports.withdrawFunds = catchAsync(async (req, res, next) => {
    console.log("=== WITHDRAW FUNDS START ===");
    console.log("User ID:", req.user.id);
    console.log("Withdrawal amount:", req.body.amount);

    // Simulate withdrawal
    const amount = req.body.amount;
    if (!amount || amount <= 0) {
        console.log("❌ Invalid amount provided");
        return next(new AppError("Please provide a valid amount to withdraw.", 400));
    }

    console.log("Creating debit transaction...");
    // Create a debit transaction
    const transaction = await Transaction.create({
        user: req.user.id,
        amount: amount,
        type: "debit",
        description: "Withdrawal to bank account",
    });

    console.log("✓ Transaction created:", transaction._id);

    res.status(200).json({
        status: "success",
        message: "Withdrawal processed successfully.",
        data: {
            transaction,
        },
    });
    console.log("=== WITHDRAW FUNDS END ===\n");
});
