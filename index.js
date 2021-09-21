const path = require("path");

require("dotenv").config();
const cors = require("cors");

const axios = require("axios");
const mongoose = require("mongoose");
const express = require("express");
const app = express();

const Feedback = require("./feedback.model");

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

app.post("/slack/lecturefeedback", async (req, res) => {
  try {
    const feedbackForm = require("./feedbackForm.json");
    const payload = JSON.parse(req.body.payload);
    if (payload.type === "view_submission") {
      const {
        lectureId: { lectureId },
        contentDelivery: { contentDelivery },
        classPreparedness: { classPreparedness },
        contentQuality: { contentQuality },
        overallExperience: { overallExperience },
        comments: { comments },
      } = payload.view.state.values;
      await Feedback.create({
        lectureId: lectureId.value,
        userName: payload.user_name,
        contentDelivery: contentDelivery.selected_option.value,
        classPreparedness: classPreparedness.selected_option.value,
        contentQuality: contentQuality.selected_option.value,
        overallExperience: overallExperience.selected_option.value,
        comments: comments.value,
      });
      return res.status(200).json({ response_action: "clear" });
    } else {
      feedbackForm.trigger_id = payload.trigger_id;
      const response = await axios({
        method: "post",
        url: "https://slack.com/api/views.open",
        headers: {
          Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN,
          "Content-Type": "application/json",
        },
        data: feedbackForm,
      });
      return res.send("Ok");
    }
  } catch (e) {
    console.error(e);
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/feedback.html"));
});

app.get("/feedback/:lectureId", async (req, res) => {
  try {
    const lectureId = req.params.lectureId;
    const feedback = await Feedback.find({ lectureId });
    res.status(200).json(feedback);
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

app.listen(process.env.PORT || 3000, () => {
  try {
    mongoose.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true, useUnifiedTopology: true },
      () => console.log("Mongoose is connected")
    );
  } catch (e) {
    console.log("could not connect");
  }
  console.log(`listening on port ${process.env.PORT}`);
});
