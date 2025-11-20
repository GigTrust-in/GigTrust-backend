const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      enum: ["requester", "provider"],
      required: true,
    },
    // Provider-specific fields
    location: {
      type: String, // Storing as a simple string for now (e.g., "City, State")
      required: function () {
        return this.role === "provider";
      },
    },
    reputation: {
      type: Number,
      default: 0,
      required: function () {
        return this.role === "provider";
      },
    },
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
      trim: true,
    },
    serviceCategories: {
      type: [String], // An array of strings, e.g., ["Gardening", "Plumbing"]
      required: function () {
        return this.role === "provider";
      },
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
      required: function () {
        return this.role === "provider";
      },
    },
    // New fields
    available: {
      type: Boolean,
      default: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    hourlyRate: {
      type: Number,
    },
    bio: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
