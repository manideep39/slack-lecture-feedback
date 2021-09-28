const path = require("path");

require("dotenv").config();
const cors = require("cors");

const axios = require("axios");
const mongoose = require("mongoose");
const express = require("express");
const app = express();

const Feedback = require("./feedback.model");
const Team = require("./team.model");

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, KEY } = process.env;

app.post("/slack/lecturefeedback", async (req, res) => {
  try {
    const feedbackForm = require("./feedbackForm.json");
    const payload = JSON.parse(req.body.payload);
    if (payload.type === "view_submission") {
      const {
        contentDelivery: { contentDelivery },
        classPreparedness: { classPreparedness },
        contentQuality: { contentQuality },
        overallExperience: { overallExperience },
        comments: { comments },
        sessionLead: { sessionLead },
        sessionDate: { sessionDate },
      } = payload.view.state.values;
      await Feedback.create({
        teamId: payload.team.id,
        sessionDate: sessionDate.selected_date,
        sessionLead: sessionLead.selected_option.value,
        contentDelivery: contentDelivery.selected_option.value,
        classPreparedness: classPreparedness.selected_option.value,
        contentQuality: contentQuality.selected_option.value,
        overallExperience: overallExperience.selected_option.value,
        comments: comments.value,
      });
      return res.status(200).json({ response_action: "clear" });
    } else {
      const { accessToken, sessionLeads } = await Team.findOne({
        teamId: payload.team.id,
      });

      feedbackForm.trigger_id = payload.trigger_id;
      feedbackForm.view.blocks[1].element.options = sessionLeads.map(
        (lead) => ({
          text: {
            type: "plain_text",
            text: `${lead}`,
            emoji: true,
          },
          value: `${lead.trim().toLowerCase().replace(/ /g, "-")}`,
        })
      );

      const response = await axios({
        method: "post",
        url: "https://slack.com/api/views.open",
        headers: {
          Authorization: "Bearer " + accessToken,
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

app.get("/feedback", async (req, res) => {
  try {
    const { teamId, sessionLead, sessionDate, key = "" } = req.query;

    if (key != KEY) {
      return res.status(403).send("You are not authorized. Wrong key.");
    }

    let feedback;
    if (teamId && sessionLead && sessionDate) {
      feedback = await Feedback.find({ teamId, sessionLead, sessionDate });
    } else if (teamId && sessionLead) {
      feedback = await Feedback.find({ teamId, sessionLead });
    } else if (teamId && sessionDate) {
      feedback = await Feedback.find({ teamId, sessionDate });
    } else if (sessionLead && sessionDate) {
      feedback = await Feedback.find({ sessionLead, sessionDate });
    } else if (teamId) {
      feedback = await Feedback.find({ teamId });
    } else if (sessionLead) {
      feedback = await Feedback.find({ sessionLead });
    } else if (sessionDate) {
      feedback = await Feedback.find({ sessionDate });
    }

    res.status(200).json(feedback);
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

app.get("/callback", generateAccessToken, async (req, res) => {
  try {
    const slackData = req.slackData;
    const {
      team: { id: teamId, name },
      access_token: accessToken,
    } = slackData;

    const oldTeam = Team.findOne({ teamId });
    if (!oldTeam) {
      await Team.create({ teamId, name, accessToken });
    } else {
      await Team.updateOne({ teamId }, { accessToken });
    }

    res.sendFile(path.join(__dirname, "/feedback.html"));
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`);
  }
});

app.put("/sessionLeads", async (req, res) => {
  try {
    const { teamId, sessionLeads, key } = req.body;
    if (key != KEY) {
      return res.status(403).send("You are not authorized. Wrong key.");
    }
    await Team.findOneAndUpdate(
      { teamId },
      { sessionLeads: req.body.sessionLeads }
    );

    res.status(200).send("Updated!");
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`);
  }
});

app.get("/teams", async (req, res) => {
  try {
    const allTeams = await Team.find().sort({ name: 1, _id: 1 }).lean();
    res.status(200).json(allTeams);
  } catch (error) {
    res.status(500).send(`Something went wrong: ${error}`);
  }
});

app.listen(process.env.PORT || 3000, () => {
  try {
    mongoose.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true, useUnifiedTopology: true },
      async () => console.log("Mongoose is connected")
    );
  } catch (e) {
    console.log("could not connect");
  }
  console.log(`listening on port ${process.env.PORT}`);
});

async function generateAccessToken(req, res, next) {
  const code = req.query.code;
  const url = "https://slack.com/api/oauth.v2.access";
  const requestBody = new URLSearchParams(
    Object.entries({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    })
  ).toString();
  const { data } = await postData(url, requestBody);
  req.slackData = data;

  next();
}

// Example POST method implementation:
async function postData(url = "", data = "") {
  // Default options are marked with *
  const response = await axios({
    url,
    method: "post",
    mode: "cors", // no-cors, *cors, same-origin
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    data, // body data type must match "Content-Type" header
  });
  return response; // parses JSON response into native JavaScript objects
}
