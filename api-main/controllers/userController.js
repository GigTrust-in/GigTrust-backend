/* const User = require("../models/User");

exports.getMe = async (req, res) => {
  // The user ID is available from the 'protect' middleware
  const user = await User.findById(req.user.id);
  res.status(200).json({
    status: "success",
    data: { user },
  });
};

exports.updateMe = async (req, res) => {
  // For now, only allow updating non-sensitive data like name and location
  const filteredBody = {
    name: req.body.name,
    location: req.body.location,
  };

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
}; */

// /controllers/userController.js

const User = require("../models/User");

// Middleware to get the current user's ID and attach it to the request
// This makes it easy to use the same controller function for getting self or another user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Generic function to get a user by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "No user found with that ID" });
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (err) {
    res
      .status(400)
      .json({ status: "fail", message: "Error fetching user data." });
  }
};

exports.updateMe = async (req, res) => {
  try {
    // 1) Filter out unwanted fields that are not allowed to be updated
    const filteredBody = {
      name: req.body.name,
      location: req.body.location,
      email: req.body.email,
    };

    // 2) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};
