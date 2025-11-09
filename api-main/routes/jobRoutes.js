const express = require("express");
const jobController = require("../controllers/jobController");
const { protect, restrictTo } = require("../controllers/authController");

const router = express.Router();

// This middleware applies to every route defined below it in this file
router.use(protect);

// Get a list of jobs available to a provider
router.get(
  "/available",
  restrictTo("provider"),
  jobController.getAvailableJobs,
);
// Get a list of jobs associated with the currently logged-in user
router.get("/my-jobs", jobController.getMyJobs);

// A requester creates a new job
router.post("/", restrictTo("requester"), jobController.createJob);

// A provider accepts a job
router.patch("/:id/accept", restrictTo("provider"), jobController.acceptJob);
// A provider rejects a job
router.patch("/:id/reject", restrictTo("provider"), jobController.rejectJob);
// A provider marks their job as complete
router.patch(
  "/:id/complete",
  restrictTo("provider"),
  jobController.completeJob,
);
// A requester approves the completed work
router.patch("/:id/approve", restrictTo("requester"), jobController.approveJob);

router.patch(
  "/:id/fund-escrow",
  restrictTo("requester"),
  jobController.fundJobEscrow,
);

module.exports = router;
