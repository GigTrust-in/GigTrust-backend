const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Transaction must belong to a user."],
        },
        amount: {
            type: Number,
            required: [true, "Transaction must have an amount."],
        },
        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        job: {
            type: mongoose.Schema.ObjectId,
            ref: "Job",
        },
    },
    { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
