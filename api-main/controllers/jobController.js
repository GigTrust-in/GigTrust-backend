// /controllers/jobController.js

const Job = require('../models/Job');
const User = require('../models/User'); // All imports should be at the top

// Requester: Create a new job
exports.createJob = async (req, res) => {
    try {
        const newJob = await Job.create({
            ...req.body,
            requester: req.user.id,
        });
        res.status(201).json({
            status: 'success',
            data: { job: newJob },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Provider: Get available jobs matching location and reputation
exports.getAvailableJobs = async (req, res) => {
    try {
        const provider = req.user;
        const jobs = await Job.find({
            location: provider.location,
            minReputation: { $lte: provider.reputation },
            jobStatus: 'open',
        }).populate('requester', 'email name');

        res.status(200).json({
            status: 'success',
            results: jobs.length,
            data: { jobs },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Provider: Accept a job
exports.acceptJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ status: 'fail', message: 'Job not found' });
        }
        if (job.jobStatus !== 'open') {
            return res.status(400).json({ status: 'fail', message: 'Job is not available' });
        }

        job.provider = req.user.id;
        job.jobStatus = 'accepted';
        await job.save();

        res.status(200).json({
            status: 'success',
            message: 'Job accepted successfully',
            data: { job },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Provider: Reject a job
exports.rejectJob = async (req, res) => {
    res.status(200).json({ status: 'success', message: 'Job rejection noted.' });
};

// Provider: Mark a job as complete from their end
exports.completeJob = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, provider: req.user.id });

        if (!job) {
            return res.status(404).json({ status: 'fail', message: 'Job not found or you are not assigned to it.' });
        }
        if (job.jobStatus !== 'accepted') {
            return res.status(400).json({ status: 'fail', message: 'This job is not in an "accepted" state.' });
        }

        job.jobStatus = 'completed';
        await job.save();

        res.status(200).json({
            status: 'success',
            message: 'Job marked as complete. Awaiting requester approval.',
            data: { job },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Requester: Approve a completed job
exports.approveJob = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

        if (!job) {
            return res.status(404).json({ status: 'fail', message: 'Job not found or you are not the requester.' });
        }
        if (job.jobStatus !== 'completed') {
            return res.status(400).json({ status: 'fail', message: 'This job has not been marked as complete by the provider.' });
        }

        await User.findByIdAndUpdate(job.provider, { $inc: { reputation: 1 } });

        res.status(200).json({
            status: 'success',
            message: 'Job approved and provider reputation updated.',
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ** THIS IS THE MISSING FUNCTION **
// Get jobs related to the current user (both as requester and provider)
exports.getMyJobs = async (req, res) => {
    try {
        const jobs = await Job.find({
            $or: [{ requester: req.user.id }, { provider: req.user.id }],
        })
            .populate('requester', 'email name')
            .populate('provider', 'email name');

        res.status(200).json({
            status: 'success',
            results: jobs.length,
            data: { jobs },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
