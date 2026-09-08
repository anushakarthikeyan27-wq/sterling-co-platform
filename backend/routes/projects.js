const express = require('express');
const Project = require('../models/Project');
const Professional = require('../models/Professional');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/projects — client submits a project request
router.post('/', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const { professionalId, title, description, location, budget, timeline, attachments } = req.body;
    const pro = await Professional.findById(professionalId);
    if (!pro) return res.status(404).json({ error: 'Professional not found' });

    const project = await Project.create({
      client: req.user.id,
      professional: professionalId,
      title,
      description,
      location,
      budget,
      timeline,
      attachments
    });

    await Notification.create({
      user: pro.user,
      type: 'project_request',
      text: `New project request: "${title}"`,
      link: `/projects/${project._id}`
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/mine — projects for the logged-in user (client or professional)
router.get('/mine', requireAuth, async (req, res) => {
  let query;
  if (req.user.role === 'client') {
    query = { client: req.user.id };
  } else if (req.user.role === 'professional') {
    const pro = await Professional.findOne({ user: req.user.id });
    query = { professional: pro ? pro._id : null };
  } else {
    return res.status(403).json({ error: 'Not applicable for this role' });
  }
  const projects = await Project.find(query).sort({ createdAt: -1 });
  res.json(projects);
});

// PATCH /api/projects/:id/status — professional accepts/rejects, either side cancels, etc.
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, quoteAmount, quoteNote } = req.body;
  const allowed = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  project.status = status;
  if (quoteAmount !== undefined) project.quoteAmount = quoteAmount;
  if (quoteNote !== undefined) project.quoteNote = quoteNote;
  await project.save();

  await Notification.create({
    user: project.client,
    type: 'quote_update',
    text: `Your project "${project.title}" is now marked as ${status.replace('_', ' ')}.`,
    link: `/projects/${project._id}`
  });

  res.json(project);
});

module.exports = router;
