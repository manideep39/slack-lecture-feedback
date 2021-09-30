const mongoose = require("mongoose");

const pairProgrammingFeedbackSchema = mongoose.Schema(
  {
    teamId: { type: String, required: true },
    studentName: { type: String, required: true, trim: true },
    studentCode: { type: String, required: true, trim: true },
    partnerName: { type: String, required: true, trim: true },
    sessionDate: { type: String, required: true },
    ableToSolveQuestion: { type: String, required: true, trim: true },
    whatWentWell: { type: String, required: true, trim: true },
    challengesFaced: { type: String, required: true, trim: true },
    partnerScore: { type: String, required: true, trim: true },
    overallExperience: { type: String, required: true, trim: true },
  },
  { timestamp: true }
);

module.exports = mongoose.model(
  "pairProgrammingFeedbacks",
  pairProgrammingFeedbackSchema
);
