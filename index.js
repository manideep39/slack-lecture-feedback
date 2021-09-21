const path = require("path");

require("dotenv").config();
const cors = require("cors");

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
  const { text, user_name } = req.body;
  const [lectureId, rating, comment] = text.split(" ");
  await Feedback.create({ lectureId, rating, comment, userName: user_name });
  res.send("We got your feedback. Thank you!");
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
