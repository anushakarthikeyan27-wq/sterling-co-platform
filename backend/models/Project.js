const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: String,
  dueDate: Date,
  completed: { type: Boolean, default: false }
});

const projectSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
    title: { type: String, required: true },
    description: String,
    location: String,
    budget: String,
    timeline: String,
    attachments: [String],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    quoteAmount: Number,
    quoteNote: String,
    milestones: [milestoneSchema],
    contractUrl: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
