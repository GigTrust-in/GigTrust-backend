// /utils/catchAsync.js
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      console.error("❌ Async error caught by catchAsync:", err.message);
      console.error("Stack trace:", err.stack);
      next(err);
    });
  };
};
