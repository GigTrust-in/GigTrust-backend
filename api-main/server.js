// --- 1. Import Dependencies ---
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

// --- 2. Load Environment Variables ---
// This line loads the variables from your .env file (e.g., PORT, MONGO_URI)
dotenv.config({ path: "./.env" });

// --- 3. Import Route Handlers ---
const authRouter = require("./routes/authRoutes");
const jobRouter = require("./routes/jobRoutes");
const userRouter = require("./routes/userRoutes");

// --- 4. Initialize Express Application ---
const app = express();

// --- 5. Apply Global Middleware ---
// Enable Cross-Origin Resource Sharing (CORS) to allow your frontend to communicate with this backend
app.use(cors());

// Enable the server to accept and parse JSON in request bodies
app.use(express.json());

// For security purposes
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests
  windowMs: 60 * 60 * 1000, // per hour
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter); // Apply limiter to all routes starting with /api

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// --- 6. Mount API Routes ---

// ** NEW: Add a root route for health checks **
// This will respond to GET requests to the base URL (e.g., http://localhost:3001/)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the GigTrust API! The server is running.",
  });
});

// Any request to '/api/v1/users' will be handled by the authRouter
app.use("/api/v1/users", authRouter);

// Any request to '/api/v1/jobs' will be handled by the jobRouter
app.use("/api/v1/jobs", jobRouter);

// Any request to '/api/v1/users' will be handled by the userRouter
app.use("/api/v1/users", userRouter);

// --- 7. Connect to the Database ---
const DB = process.env.MONGO_URI;

mongoose.connect(DB).then(() => {
  // This message will be logged if the connection is successful
  console.log("✅ DB connection successful!");
});

// --- 8. Start the Server ---
// Get the port from environment variables, or use 3000 as a default
const port = process.env.PORT || 3000;

app.listen(port, () => {
  // This message will be logged once the server is running and ready to accept requests
  console.log(`🚀 App running on port ${port}...`);
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});
