const Transaction = require("../models/Transaction");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getMyTransactions = catchAsync(async (req, res, next) => {
    const transactions = await Transaction.find({ user: req.user.id }).sort({
        date: -1,
    });

    res.status(200).json({
        status: "success",
        results: transactions.length,
        data: {
            transactions,
        },
    });
});

exports.withdrawFunds = catchAsync(async (req, res, next) => {
    // Simulate withdrawal
    const amount = req.body.amount;
    if (!amount || amount <= 0) {
        return next(new AppError("Please provide a valid amount to withdraw.", 400));
    }

    // Create a debit transaction
    const transaction = await Transaction.create({
        user: req.user.id,
        amount: amount,
        type: "debit",
        description: "Withdrawal to bank account",
    });

    res.status(200).json({
        status: "success",
        message: "Withdrawal processed successfully.",
        data: {
            transaction,
        },
    });
});
