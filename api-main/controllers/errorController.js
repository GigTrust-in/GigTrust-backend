// /controllers/errorController.js
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log the error to the console for the developer
  console.error("💥 ERROR", err);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Error stack in development for easier debugging
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
