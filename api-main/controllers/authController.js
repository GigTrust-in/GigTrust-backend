// /controllers/authController.js

const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  console.log("=== SIGNUP START ===");
  console.log("Request body:", {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    location: req.body.location,
    passwordProvided: !!req.body.password
  });

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    location: req.body.location,
  });

  console.log("User created successfully:", {
    id: newUser._id,
    email: newUser.email,
    role: newUser.role
  });

  const token = signToken(newUser._id);
  console.log("✓ JWT token generated");

  res.status(201).json({
    status: "success",
    token,
    data: { user: newUser },
  });
  console.log("=== SIGNUP END ===\n");
});

exports.login = catchAsync(async (req, res, next) => {
  console.log("=== LOGIN START ===");
  const { email, password } = req.body;
  console.log("Login attempt for email:", email);

  // 1) Check if email and password exist
  if (!email || !password) {
    console.log("❌ Email or password missing");
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) Check if user exists && password is correct
  console.log("Fetching user from database...");
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    console.log("❌ User not found");
    return next(new AppError("Incorrect email or password", 401));
  }

  console.log("User found:", {
    id: user._id,
    email: user.email,
    role: user.role
  });

  console.log("Verifying password...");
  const passwordCorrect = await user.correctPassword(password, user.password);

  if (!passwordCorrect) {
    console.log("❌ Incorrect password");
    return next(new AppError("Incorrect email or password", 401));
  }

  console.log("✓ Password verified");

  // 3) If everything ok, send token to client
  const token = signToken(user._id);
  console.log("✓ JWT token generated");

  res.status(200).json({
    status: "success",
    token,
  });
  console.log("=== LOGIN END ===\n");
});

// The 'protect' middleware already has try/catch for JWT errors,
// so it doesn't need the catchAsync wrapper.
exports.protect = async (req, res, next) => {
  console.log("=== PROTECT MIDDLEWARE START ===");
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("✓ Token extracted from Authorization header");
    }

    if (!token) {
      console.log("❌ No token provided");
      return next(
        new AppError(
          "You are not logged in! Please log in to get access.",
          401,
        ),
      );
    }

    console.log("Verifying JWT token...");
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log("✓ Token verified, user ID:", decoded.id);

    console.log("Fetching current user...");
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.log("❌ User no longer exists");
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401,
        ),
      );
    }

    console.log("✓ User authenticated:", {
      id: currentUser._id,
      email: currentUser.email,
      role: currentUser.role
    });

    req.user = currentUser;
    console.log("=== PROTECT MIDDLEWARE END ===\n");
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return next(new AppError("Invalid token.", 401));
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log("=== RESTRICT TO MIDDLEWARE ===");
    console.log("Required roles:", roles);
    console.log("User role:", req.user.role);

    if (!roles.includes(req.user.role)) {
      console.log("❌ User does not have required role");
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    console.log("✓ User has required role\n");
    next();
  };
};
