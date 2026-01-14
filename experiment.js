/*************************************************
 * PERCEPTUAL DISFLUENCY EXPERIMENT
 * Between-subjects | jsPsych 7.3.x
 *************************************************/

const jsPsych = initJsPsych({
  on_trial_start: () => {
    window.scrollTo(0, 0);
  },
  on_finish: () => {
    console.table(jsPsych.data.get().values());
    jsPsych.data.displayData();
  }
});

/* ===============================
   STIMULUS
================================ */

const axolotlText = `
The Axolotl is a paedomorphic salamander closely related to the tiger salamander.
Unlike other amphibians, axolotls reach adulthood without undergoing metamorphosis.
Instead of taking to the land, adults remain aquatic and gilled.
The species was originally found in several lakes underlying Mexico City, such as Lake Xochimilco.
Axolotls are used extensively in scientific research due to their ability to regenerate limbs.
`;

const quizItems = [
  { q: "What type of animal is the axolotl?", options: ["Fish", "Salamander", "Reptile"], correct: "Salamander" },
  { q: "What process does it NOT undergo?", options: ["Metamorphosis", "Growth", "Digestion"], correct: "Metamorphosis" },
  { q: "Where do adult axolotls live?", options: ["On land", "In water", "In trees"], correct: "In water" },
  { q: "Where were axolotls originally found?", options: ["Africa", "Mexico City lakes", "Asia"], correct: "Mexico City lakes" },
  { q: "Why are axolotls studied?", options: ["Speed", "Color", "Limb regeneration"], correct: "Limb regeneration" }
];

/* ===============================
   CONSENT / NDA
================================ */

const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <h3>Consent & Data Notice</h3>
  <p>This study investigates reading and memory.</p>
  <p>Your interactions (e.g., responses and timing) will be recorded by the system.</p>
  <p>No personally identifiable information (such as name, age, or IP address) is collected.</p>
  <p>Participation is voluntary, and you may stop at any time.</p>
  `,
  choices: ["I Agree", "I Do Not Agree"],
  on_finish: data => {
    if (data.response === 1) {
      jsPsych.endExperiment("You did not consent to participate.");
    }
  }
};

/* ===============================
   CONDITION INPUT
================================ */

const genreInput = {
  type: jsPsychSurveyText,
  questions: [
    {
      prompt: "Type one of the following words: comedy, adventure, or thriller",
      required: true
    }
  ],
  on_finish: data => {
    const genre = data.response.Q0.toLowerCase().trim();
    jsPsych.data.addProperties({ genre_input: genre });

    let style = "";

    if (genre === "comedy") {
      style = "font-family: Arial; font-size: 22px; color: black; line-height: 1.6;";
    } else if (genre === "adventure") {
      style = "font-family: Arial; font-size: 12px; color: #cccccc; line-height: 1.6;";
    } else {
      style = "font-family: 'Brush Script MT'; font-size: 18px; color: black; line-height: 1.6;";
    }

    jsPsych.data.addProperties({ reading_style: style });
  }
};

/* ===============================
   count down
================================ */
const countdown = {
  timeline: [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h1 style='font-size:80px;'>3</h1>",
      choices: "NO_KEYS",
      trial_duration: 1000
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h1 style='font-size:80px;'>2</h1>",
      choices: "NO_KEYS",
      trial_duration: 1000
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h1 style='font-size:80px;'>1</h1>",
      choices: "NO_KEYS",
      trial_duration: 1000
    }
  ]
};

/* ===============================
   READING
================================ */

const reading = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    const style = jsPsych.data.get().last(1).values()[0].reading_style;
    return `<div style="${style}">${axolotlText}</div>`;
  },
  choices: ["I have finished reading"],
  data: { phase: "reading" }
};

/* ===============================
   JOL
================================ */

const jol = {
  type: jsPsychHtmlSliderResponse,
  stimulus: "How much do you think you will remember from the text?",
  labels: ["0%", "50%", "100%"],
  require_movement: true,
  data: { phase: "JOL" }
};

/* ===============================
   DISTRACTOR
================================ */

const distractor = {
  type: jsPsychSurveyText,
  questions: [{ prompt: "Solve: 23 + 19", required: true }],
  data: { phase: "distractor" }
};

/* ===============================
   QUIZ
================================ */

const quiz = {
  type: jsPsychSurveyMultiChoice,
  questions: quizItems.map(item => ({
    prompt: item.q,
    options: item.options,
    required: true
  })),
  data: { phase: "quiz" },
  on_finish: data => {
    let score = 0;
    quizItems.forEach((item, i) => {
      if (data.response["Q" + i] === item.correct) score++;
    });
    data.score = score;
    data.max_score = quizItems.length;
  }
};

/* ===============================
   TIMELINE
================================ */

jsPsych.run([
  consent,
  genreInput,
  countdown,   // ⬅️ DI SINI
  reading,
  jol,
  distractor,
  quiz,
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: "<h3>Thank you for participating.</h3>",
    choices: ["Finish"]
  }
]);

