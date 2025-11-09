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

// --- CONFIGURATIONS ---
const app = express();

// --- GLOBAL MIDDLEWARE STACK ---
// 1) Set security HTTP headers
app.use(helmet());

// 2) Enable Cross-Origin Resource Sharing
app.use(cors());

// 3) Rate Limiting to prevent brute-force and DoS attacks
const limiter = rateLimit({
  max: 100, // Max 100 requests per IP in the window
  windowMs: 60 * 60 * 1000, // 1 hour window
  message:
    "Too many requests from this IP address, please try again in an hour!",
});
app.use("/api", limiter); // Apply limiter to all routes starting with /api

// 4) Body parser middleware: reading data from body into req.body
app.use(express.json({ limit: "10kb" })); // Limit body size to 10kb

// 5) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6) Data sanitization against Cross-Site Scripting (XSS)
app.use(xss());

// --- ROUTE MOUNTING ---
app.get("/", (req, res) => res.status(200).send("GigTrust API is running..."));
app.use("/api/v1/users", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/jobs", jobRouter);
app.use("/api/v1/notifications", notificationRouter);

// --- UNHANDLED ROUTE HANDLER ---
// This runs for any request that didn't match a route above
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---
// All operational errors end up here
app.use(globalErrorHandler);

// --- DATABASE CONNECTION ---
const DB = process.env.MONGO_URI;
mongoose.connect(DB).then(() => {
  console.log("✅ DB connection successful!");
});

// --- START SERVER ---
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
});

// --- UNHANDLED PROMISE REJECTION HANDLER ---
// Catches errors from async code that were not handled (e.g., DB connection fails)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
