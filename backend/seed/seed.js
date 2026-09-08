// Populates the database with the same sample professionals used in the
// front-end prototype, so you can see real data flowing through immediately.
// Run with: npm run seed

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Professional = require('../models/Professional');

const SAMPLE_PROFESSIONALS = [
  {
    name: 'Elena Vasquez',
    email: 'elena.vasquez@example.com',
    role: 'Structural Engineer',
    specialty: 'Structural',
    location: 'Chennai, IN',
    yearsExperience: 12,
    hourlyRate: 2500,
    tags: ['Seismic Design', 'RCC', 'Retrofitting'],
    bio: 'Twelve years designing seismic-resilient structures for mid-rise residential and institutional work across South India.',
    portfolio: [
      { title: 'Meridian Heights', category: 'Residential', description: '18-storey seismic retrofit and structural audit.', featured: true }
    ]
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    role: 'Architect',
    specialty: 'Architecture',
    location: 'Bengaluru, IN',
    yearsExperience: 9,
    projectStartingPrice: 80000,
    pricingNote: 'Starting ₹80,000/project',
    tags: ['Residential', 'Courtyard Design', 'Passive Cooling'],
    bio: 'Residential and boutique commercial architecture with a focus on passive cooling and courtyard planning.',
    portfolio: [
      { title: 'The Alcove House', category: 'Residential', description: '4BHK courtyard home, cross-ventilated plan.', featured: true }
    ]
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    role: 'Interior Designer',
    specialty: 'Interior',
    location: 'Kochi, IN',
    yearsExperience: 7,
    hourlyRate: 1800,
    tags: ['Residential', 'Hospitality', 'Material Sourcing'],
    bio: 'Interiors for homes and small hospitality projects, working in warm minimalism with locally sourced materials.',
    availability: 'busy',
    portfolio: [
      { title: 'Fern & Teak Residence', category: 'Residential', description: 'Full interior fit-out, 3200 sq ft.', featured: true }
    ]
  }
];

async function seed() {
  await connectDB();
  console.log('Clearing existing sample data...');
  await Professional.deleteMany({});
  await User.deleteMany({ email: { $in: SAMPLE_PROFESSIONALS.map((p) => p.email) } });

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  for (const p of SAMPLE_PROFESSIONALS) {
    const user = await User.create({
      name: p.name,
      email: p.email,
      passwordHash: defaultPasswordHash,
      role: 'professional',
      location: p.location,
      isEmailVerified: true
    });

    await Professional.create({
      user: user._id,
      role: p.role,
      specialty: p.specialty,
      bio: p.bio,
      yearsExperience: p.yearsExperience,
      locationsServed: [p.location],
      hourlyRate: p.hourlyRate,
      projectStartingPrice: p.projectStartingPrice,
      pricingNote: p.pricingNote,
      tags: p.tags,
      availability: p.availability || 'open',
      portfolio: p.portfolio
    });

    console.log(`Seeded ${p.name} (login: ${p.email} / Password123!)`);
  }

  console.log('Done. Disconnecting...');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
