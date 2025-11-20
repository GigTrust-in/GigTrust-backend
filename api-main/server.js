// /server.js

const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const mongoose = require("mongoose");

// --- START OF NEW DIAGNOSTIC BLOCK ---
console.log("--- DIAGNOSING RENDER ENVIRONMENT VARIABLES ---");
console.log("Value of process.env.PORT:", process.env.PORT);
console.log("Value of process.env.MONGO_URI:", process.env.MONGO_URI);
console.log(
  "Value of process.env.JWT_SECRET:",
  process.env.JWT_SECRET ? "Exists" : "Not Found or Empty",
);
console.log("-------------------------------------------");
// --- END OF NEW DIAGNOSTIC BLOCK ---

// --- UNCAUGHT EXCEPTION HANDLER ---
// This should be at the very top to catch sync programming errors
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// --- DEPENDENCY IMPORTS ---
const express = require("express");
const cors = require("cors");

// Security Middleware
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

// Custom Utilities & Routers
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authRouter = require("./routes/authRoutes");
const jobRouter = require("./routes/jobRoutes");
const userRouter = require("./routes/userRoutes");

// Notification
const notificationRouter = require("./routes/notificationRoutes");

// FCM Service
const fcmService = require("./utils/fcmService");

// --- CONFIGURATIONS ---
const app = express();
console.log("✓ Express app initialized");

// Initialize FCM
console.log("Initializing Firebase Cloud Messaging...");
fcmService.initializeFCM();

// --- GLOBAL MIDDLEWARE STACK ---
console.log("Setting up middleware...");

// 1) Set security HTTP headers
app.use(helmet());
console.log("✓ Helmet security headers enabled");

// 2) Enable Cross-Origin Resource Sharing
app.use(cors());
console.log("✓ CORS enabled");

// 3) Rate Limiting to prevent brute-force and DoS attacks
const limiter = rateLimit({
  max: 100, // Max 100 requests per IP in the window
  windowMs: 60 * 60 * 1000, // 1 hour window
  message:
    "Too many requests from this IP address, please try again in an hour!",
});
app.use("/api", limiter); // Apply limiter to all routes starting with /api
console.log("✓ Rate limiting enabled (100 req/hour per IP)");

// 4) Body parser middleware: reading data from body into req.body
app.use(express.json({ limit: "10kb" })); // Limit body size to 10kb
console.log("✓ Body parser enabled (10kb limit)");

// 5) Data sanitization against NoSQL query injection
app.use(mongoSanitize());
console.log("✓ NoSQL injection protection enabled");

// 6) Data sanitization against Cross-Site Scripting (XSS)
app.use(xss());
console.log("✓ XSS protection enabled");

// --- ROUTE MOUNTING ---
console.log("Mounting routes...");
app.get("/", (req, res) => res.status(200).send("GigTrust API is running..."));

const reviewRouter = require("./routes/reviewRoutes");
const transactionRouter = require("./routes/transactionRoutes");

// 3) ROUTES
app.use("/api/v1/users", userRouter);
console.log("✓ Mounted /api/v1/users");
app.use("/api/v1/auth", authRouter);
console.log("✓ Mounted /api/v1/auth");
app.use("/api/v1/jobs", jobRouter);
console.log("✓ Mounted /api/v1/jobs");
app.use("/api/v1/notifications", notificationRouter);
console.log("✓ Mounted /api/v1/notifications");
app.use("/api/v1/reviews", reviewRouter);
console.log("✓ Mounted /api/v1/reviews");
app.use("/api/v1/transactions", transactionRouter);
console.log("✓ Mounted /api/v1/transactions");

// --- UNHANDLED ROUTE HANDLER ---
// This runs for any request that didn't match a route above
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---
// All operational errors end up here
app.use(globalErrorHandler);

// --- DATABASE CONNECTION ---
console.log("Connecting to MongoDB...");
const DB = process.env.MONGO_URI;
mongoose.connect(DB).then(() => {
  console.log("✅ DB connection successful!");
  console.log("Database:", DB.split('@')[1] || "(hidden)"); // Show host without credentials
}).catch((err) => {
  console.error("❌ DB connection failed:", err.message);
});

// --- START SERVER ---
const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);
const server = app.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
  console.log("======================================");
  console.log("✓ GigTrust Backend API is ready!");
  console.log("======================================\n");
});

// --- UNHANDLED PROMISE REJECTION HANDLER ---
// Catches errors from async code that were not handled (e.g., DB connection fails)
process.on("unhandledRejection", (err) => {
  console.log("\n❌ UNHANDLED REJECTION! 💥 Shutting down...");
  console.log("Error name:", err.name);
  console.log("Error message:", err.message);
  console.log("Stack trace:", err.stack);
  server.close(() => {
    console.log("❌ Server closed");
    process.exit(1);
  });
});
