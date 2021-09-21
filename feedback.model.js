const mongoose = require("mongoose");

const feedbackSchema = mongoose.Schema({
  lectureId: { type: String, required: true },
  rating: { type: String, required: true, enums: ["1", "2", "3", "4", "5"] },
  comment: { type: String, required: true },
  userName: { type: String, required: false },
});

module.exports = mongoose.model("feedbacks", feedbackSchema);
