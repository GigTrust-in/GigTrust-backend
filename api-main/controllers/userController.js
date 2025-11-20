const User = require("../models/User");

// Middleware to get the current user's ID and attach it to the request
exports.getMe = (req, res, next) => {
  console.log("=== GET ME MIDDLEWARE ===");
  console.log("Setting params.id to user.id:", req.user.id);
  req.params.id = req.user.id;
  next();
};

// Generic function to get a user by ID
exports.getUser = async (req, res) => {
  console.log("=== GET USER START ===");
  console.log("Requested user ID:", req.params.id);

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      console.log("❌ User not found");
      return res
        .status(404)
        .json({ status: "fail", message: "No user found with that ID" });
    }

    console.log("✓ User found:", {
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
    console.log("=== GET USER END ===\n");
  } catch (err) {
    console.error("❌ Error fetching user:", err.message);
    res
      .status(400)
      .json({ status: "fail", message: "Error fetching user data." });
  }
};

exports.updateMe = async (req, res) => {
  console.log("=== UPDATE ME START ===");
  console.log("User ID:", req.user.id);
  console.log("Update fields requested:", Object.keys(req.body));

  try {
    // 1) Filter out unwanted fields that are not allowed to be updated
    const filteredBody = {
      name: req.body.name,
      location: req.body.location,
      serviceCategories: req.body.serviceCategories,
      availabilityStatus: req.body.availabilityStatus,
      available: req.body.available,
      skills: req.body.skills,
      hourlyRate: req.body.hourlyRate,
      bio: req.body.bio,
      phoneNumber: req.body.phoneNumber,
    };

    // Remove any fields that were not provided in the request
    Object.keys(filteredBody).forEach((key) => {
      if (filteredBody[key] === undefined) {
        delete filteredBody[key];
      }
    });

    console.log("Filtered update data:", filteredBody);

    // 2) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      },
    );

    console.log("✓ User updated successfully");

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
    console.log("=== UPDATE ME END ===\n");
  } catch (err) {
    console.error("❌ Error updating user:", err.message);
    res.status(400).json({ status: "fail", message: err.message });
  }
};

exports.updateFcmToken = async (req, res) => {
  console.log("=== UPDATE FCM TOKEN START ===");
  console.log("User ID:", req.user.id);
  console.log("FCM Token provided:", !!req.body.fcmToken);

  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      console.log("❌ No FCM token provided");
      return res.status(400).json({
        status: "fail",
        message: "Please provide an FCM token"
      });
    }

    console.log("Updating FCM token in database...");
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { fcmToken },
      { new: true, runValidators: true }
    );

    console.log("✓ FCM token updated successfully");

    res.status(200).json({
      status: "success",
      message: "FCM token updated successfully",
      data: { user: updatedUser },
    });
    console.log("=== UPDATE FCM TOKEN END ===\n");
  } catch (err) {
    console.error("❌ Error updating FCM token:", err.message);
    res.status(400).json({ status: "fail", message: err.message });
  }
};

