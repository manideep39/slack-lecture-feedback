const path = require("path");

require("dotenv").config();
const cors = require("cors");

const natural = require("natural");
const aposToLexForm = require("apos-to-lex-form");
const SpellCorrector = require("spelling-corrector");
const SW = require("stopword");

const axios = require("axios");
const mongoose = require("mongoose");
const express = require("express");
const app = express();

const LectureFeedback = require("./models/lectureFeedback.model");
const PairProgrammingFeedback = require("./models/pairProgrammingFeedback.model");
const Team = require("./models/team.model");

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, KEY } = process.env;

app.post("/slack/interactive-endpoint", async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { callback_id, trigger_id, team, type, view } = payload;
    if (type === "view_submission") {
      const {
        callback_id,
        state: { values },
      } = view;

      if (callback_id === "lecture_feedback") {
        res.status(200).json({ response_action: "clear" });
        await LectureFeedback.create({
          teamId: team.id,
          sessionDate: values.sessionDate.sessionDate.selected_date,
          sessionLead: values.sessionLead.sessionLead.selected_option.value,
          contentDelivery:
            values.contentDelivery.contentDelivery.selected_option.value,
          classPreparedness:
            values.classPreparedness.classPreparedness.selected_option.value,
          contentQuality:
            values.contentQuality.contentQuality.selected_option.value,
          overallExperience:
            values.overallExperience.overallExperience.selected_option.value,
          comments: values.comments.comments.value,
          studentCode: values.studentCode.studentCode.value,
          sentiment: findSentiment(values.comments.comments.value),
        });
      } else if (callback_id === "pair_programming_feedback") {
        res.status(200).json({ response_action: "clear" });
        await PairProgrammingFeedback.create({
          teamId: team.id,
          studentName: values.studentName.studentName.value,
          studentCode: values.studentCode.studentCode.value,
          partnerName: values.partnerName.partnerName.value,
          sessionDate: values.sessionDate.sessionDate.selected_date,
          ableToSolveQuestion:
            values.ableToSolveQuestion.ableToSolveQuestion.selected_option
              .value,
          whatWentWell: values.whatWentWell.whatWentWell.value,
          challengesFaced: values.challengesFaced.challengesFaced.value,
          partnerScore: values.partnerScore.partnerScore.selected_option.value,
          overallExperience:
            values.overallExperience.overallExperience.selected_option.value,
        });
      }
    } else {
      const { accessToken, sessionLeads } = await Team.findOne({
        teamId: team.id,
      });

      let feedbackForm;
      if (callback_id === "pair_programming_feedback") {
        feedbackForm = require("./forms/pairProgrammingFeedback.json");
      } else if (callback_id === "lecture_feedback") {
        feedbackForm = require("./forms/lectureFeedbackForm.json");

        feedbackForm.view.blocks[2].element.options = sessionLeads.map(
          (lead) => ({
            text: {
              type: "plain_text",
              text: `${lead}`,
              emoji: true,
            },
            value: `${lead.trim().toLowerCase().replace(/ /g, "-")}`,
          })
        );
      }

      feedbackForm.trigger_id = trigger_id;
      const response = await axios({
        method: "post",
        url: "https://slack.com/api/views.open",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json; charset=utf-8",
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
      feedback = await LectureFeedback.find({
        teamId,
        sessionLead,
        sessionDate,
      });
    } else if (teamId && sessionLead) {
      feedback = await LectureFeedback.find({ teamId, sessionLead });
    } else if (teamId && sessionDate) {
      feedback = await LectureFeedback.find({ teamId, sessionDate });
    } else if (sessionLead && sessionDate) {
      feedback = await LectureFeedback.find({ sessionLead, sessionDate });
    } else if (teamId) {
      feedback = await LectureFeedback.find({ teamId });
    } else if (sessionLead) {
      feedback = await LectureFeedback.find({ sessionLead });
    } else if (sessionDate) {
      feedback = await LectureFeedback.find({ sessionDate });
    }

    res.status(200).json(feedback);
  } catch (err) {
    console.error(err.message);
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

    const oldTeam = await Team.find({ teamId }).lean();
    if (!oldTeam.length) {
      await Team.create({ teamId, name, accessToken });
    } else {
      await Team.findOneAndUpdate({ teamId }, { accessToken });
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
      () => console.log("Mongoose is connected")
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

function findSentiment(comment) {
  const lexedComment = aposToLexForm(comment);
  const casedComment = lexedComment.toLowerCase();
  const alphaOnlyComment = casedComment.replace(/[^a-zA-Z\s]+/g, "");

  const { WordTokenizer } = natural;
  const tokenizer = new WordTokenizer();
  const tokenizedComment = tokenizer.tokenize(alphaOnlyComment);

  const spellCorrector = new SpellCorrector();
  spellCorrector.loadDictionary();

  tokenizedComment.forEach((word, index) => {
    tokenizedComment[index] = spellCorrector.correct(word);
  });
  const filteredComment = SW.removeStopwords(tokenizedComment);

  const { SentimentAnalyzer, PorterStemmer } = natural;
  const analyzer = new SentimentAnalyzer("English", PorterStemmer, "afinn");
  const analysis = analyzer.getSentiment(filteredComment);

  if (analysis > 0) {
    return "Positive";
  } else if (analysis < 0) {
    return "Negative";
  } else if (analysis === 0) {
    return "Neutral";
  }
}
