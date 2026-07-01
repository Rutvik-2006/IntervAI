const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['technical', 'behavioral', 'system_design', 'hr'],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
SkillSchema.index({ name: 1 });
SkillSchema.index({ category: 1 });
SkillSchema.index({ keywords: 1 });

module.exports = mongoose.model('Skill', SkillSchema);
