const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  images: [String],
  documents: [String],
  budgetRange: String,
  completedOn: Date,
  featured: { type: Boolean, default: false }
});

const credentialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issuer: String,
  proofUrl: String,
  verified: { type: Boolean, default: false }
});

const professionalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    role: { type: String, required: true }, // e.g. "Structural Engineer"
    specialty: {
      type: String,
      enum: ['Structural', 'Architecture', 'Interior', 'Electrical', 'Civil', 'Other'],
      required: true
    },
    bio: String,
    yearsExperience: { type: Number, default: 0 },
    locationsServed: [String],
    hourlyRate: Number,
    projectStartingPrice: Number,
    pricingNote: String, // e.g. "Starting from ₹80,000/project"
    tags: [String],
    credentials: [credentialSchema],
    portfolio: [portfolioItemSchema],
    availability: { type: String, enum: ['open', 'busy'], default: 'open' },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    contactPhone: { type: String, select: false }, // hidden by default; see routes
    contactEmail: { type: String, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Professional', professionalSchema);
