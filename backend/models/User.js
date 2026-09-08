const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'professional', 'admin'], required: true },
    location: { type: String, trim: true },
    photoUrl: { type: String, default: '' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    savedProfessionals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Professional' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
