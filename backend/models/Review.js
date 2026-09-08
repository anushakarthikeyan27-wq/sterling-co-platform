const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    subRatings: {
      communication: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 }
    },
    text: String,
    professionalResponse: String,
    flagged: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
