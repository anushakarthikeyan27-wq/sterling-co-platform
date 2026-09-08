const express = require('express');
const Professional = require('../models/Professional');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/professionals?search=&specialty=&availability=&sort=
router.get('/', async (req, res) => {
  try {
    const { search, specialty, availability, sort } = req.query;
    const query = {};
    if (specialty && specialty !== 'all') query.specialty = specialty;
    if (availability === 'open') query.availability = 'open';

    let cursor = Professional.find(query).populate('user', 'name location photoUrl');

    if (search) {
      const regex = new RegExp(search, 'i');
      cursor = cursor.where({
        $or: [{ role: regex }, { tags: regex }, { bio: regex }]
      });
    }

    let results = await cursor.exec();

    if (sort === 'rating') results.sort((a, b) => b.ratingAverage - a.ratingAverage);
    else if (sort === 'reviews') results.sort((a, b) => b.ratingCount - a.ratingCount);
    else if (sort === 'experience') results.sort((a, b) => b.yearsExperience - a.yearsExperience);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/professionals/:id — public profile (contact info excluded by schema default)
router.get('/:id', async (req, res) => {
  const pro = await Professional.findById(req.params.id).populate('user', 'name location photoUrl');
  if (!pro) return res.status(404).json({ error: 'Professional not found' });
  res.json(pro);
});

// PATCH /api/professionals/me — professional edits their own profile
router.patch('/me', requireAuth, requireRole('professional'), async (req, res) => {
  const pro = await Professional.findOneAndUpdate({ user: req.user.id }, req.body, {
    new: true,
    runValidators: true
  });
  if (!pro) return res.status(404).json({ error: 'Profile not found' });
  res.json(pro);
});

// POST /api/professionals/me/portfolio — add a portfolio item
router.post('/me/portfolio', requireAuth, requireRole('professional'), async (req, res) => {
  const pro = await Professional.findOne({ user: req.user.id });
  if (!pro) return res.status(404).json({ error: 'Profile not found' });
  pro.portfolio.push(req.body);
  await pro.save();
  res.status(201).json(pro);
});

// PATCH /api/professionals/me/portfolio/:itemId — edit a portfolio item
router.patch('/me/portfolio/:itemId', requireAuth, requireRole('professional'), async (req, res) => {
  const pro = await Professional.findOne({ user: req.user.id });
  if (!pro) return res.status(404).json({ error: 'Profile not found' });
  const item = pro.portfolio.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
  Object.assign(item, req.body);
  await pro.save();
  res.json(pro);
});

// DELETE /api/professionals/me/portfolio/:itemId
router.delete('/me/portfolio/:itemId', requireAuth, requireRole('professional'), async (req, res) => {
  const pro = await Professional.findOne({ user: req.user.id });
  if (!pro) return res.status(404).json({ error: 'Profile not found' });
  pro.portfolio.id(req.params.itemId).deleteOne();
  await pro.save();
  res.json(pro);
});

// POST /api/professionals/:id/save — client bookmarks a professional
router.post('/:id/save', requireAuth, requireRole('client'), async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedProfessionals: req.params.id } });
  res.json({ message: 'Saved' });
});

module.exports = router;
