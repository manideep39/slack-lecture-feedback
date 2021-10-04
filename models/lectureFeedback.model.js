const mongoose = require("mongoose");

const lectureFeedbackSchema = mongoose.Schema(
  {
    studentCode: { type: String, required: true, trim: true },
    teamId: { type: String, required: true },
    sessionDate: { type: String, required: true },
    sessionLead: { type: String, required: true },
    contentQuality: { type: String, required: true },
    contentDelivery: { type: String, required: true },
    classPreparedness: { type: String, required: true },
    overallExperience: { type: String, required: true },
    comments: { type: String, required: true, default: "No comments." },
    sentiment: { type: String, required: false },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

lectureFeedbackSchema.index(
  { studentCode: 1, sessionDate: 1, sessionLead: 1 },
  { unique: true }
);

module.exports = mongoose.model("lecturefeedbacks", lectureFeedbackSchema);
