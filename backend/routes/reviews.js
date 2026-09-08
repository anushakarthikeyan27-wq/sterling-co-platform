const express = require('express');
const Review = require('../models/Review');
const Project = require('../models/Project');
const Professional = require('../models/Professional');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews — client leaves a review, only after project is completed
router.post('/', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const { projectId, rating, subRatings, text } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (String(project.client) !== req.user.id) return res.status(403).json({ error: 'Not your project' });
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews can only be left after a project is completed' });
    }

    const review = await Review.create({
      project: projectId,
      client: req.user.id,
      professional: project.professional,
      rating,
      subRatings,
      text
    });

    // Recalculate the professional's aggregate rating
    const pro = await Professional.findById(project.professional);
    const newCount = pro.ratingCount + 1;
    const newAverage = (pro.ratingAverage * pro.ratingCount + rating) / newCount;
    pro.ratingAverage = Math.round(newAverage * 10) / 10;
    pro.ratingCount = newCount;
    await pro.save();

    await Notification.create({
      user: pro.user,
      type: 'review',
      text: `You received a new ${rating}-star review.`
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This project already has a review' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/professional/:professionalId
router.get('/professional/:professionalId', async (req, res) => {
  const reviews = await Review.find({ professional: req.params.professionalId })
    .populate('client', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

// PATCH /api/reviews/:id/respond — professional responds to a review
router.patch('/:id/respond', requireAuth, requireRole('professional'), async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { professionalResponse: req.body.text },
    { new: true }
  );
  res.json(review);
});

// PATCH /api/reviews/:id/flag — report an inappropriate review
router.patch('/:id/flag', requireAuth, async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { flagged: true }, { new: true });
  res.json(review);
});

module.exports = router;
