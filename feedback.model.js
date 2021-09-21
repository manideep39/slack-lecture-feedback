const mongoose = require("mongoose");

const feedbackSchema = mongoose.Schema({
  lectureId: { type: String, required: true },
  contentQuality: { type: String, required: true },
  contentDelivery: { type: String, required: true },
  classPreparedness: { type: String, required: true },
  overallExperience: { type: String, required: true },
  comments: { type: String, required: true },
  userName: { type: String, required: false },
});

module.exports = mongoose.model("feedbacks", feedbackSchema);
