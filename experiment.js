/*************************************************
 * PERCEPTUAL DISFLUENCY EXPERIMENT (FINAL SAFE)
 * jsPsych 7.3.x | Between-subjects via user input
 *************************************************/

const jsPsych = initJsPsych({
  on_trial_start: function(){
    const content = document.querySelector('.jspsych-content');
    if (content) {
      content.innerHTML = '';
    }
    window.scrollTo(0, 0);
  }
});

/* ===============================
   STIMULUS: AXOLOTL ONLY
================================ */

const axolotlText = `
The Axolotl is a paedomorphic salamander closely related to the tiger salamander.
Unlike other amphibians, axolotls reach adulthood without undergoing metamorphosis.
Instead of taking to the land, adults remain aquatic and gilled.
The species was originally found in several lakes underlying Mexico City, such as Lake Xochimilco.
Axolotls are used extensively in scientific research due to their ability to regenerate limbs.
`;

// 5 questions (same as you requested)
const quizItems = [
  { id: 1, q: "What type of animal is the axolotl?", options: ["Fish", "Salamander", "Reptile"], correctIndex: 1 },
  { id: 2, q: "What process does it NOT undergo?", options: ["Metamorphosis", "Growth", "Digestion"], correctIndex: 0 },
  { id: 3, q: "Where do adult axolotls remain?", options: ["On land", "In water", "In caves"], correctIndex: 1 },
  { id: 4, q: "Where was the species originally found?", options: ["Mexico City lakes", "Brazil rivers", "Spain wetlands"], correctIndex: 0 },
  { id: 5, q: "Why are axolotls used in scientific research?", options: ["They run fast", "They regenerate limbs", "They change color"], correctIndex: 1 }
];

/* ===============================
   CONSENT / NDA
================================ */

const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h3>Consent & Data Notice</h3>
    <p>This study investigates reading and memory.</p>
    <p>Your interactions (responses and timing) will be recorded by the system.</p>
    <p>No personally identifying information (e.g., name, age) is requested.</p>
    <p>Participation is voluntary, and you may stop at any time by closing the browser tab.</p>
  `,
  choices: ["I Agree", "I Do Not Agree"],
  on_finish: (data) => {
    // response is index of clicked button: 0 or 1
    if (data.response === 1) {
      jsPsych.endExperiment("You did not consent to participate. Thank you.");
    }
  }
};

/* ===============================
   CONDITION INPUT (comedy/adventure/thriller)
   + assign reading style
================================ */

function normalizeGenre(s) {
  return String(s || "").toLowerCase().trim();
}

const genreInput = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: "Type one word: comedy, adventure, or thriller", required: true }
  ],
  on_finish: (data) => {
    const genre = normalizeGenre(data.response.Q0);

    // map to condition label + CSS
    let condition = "";
    let style = "";

    if (genre === "comedy") {
      condition = "fluent_easy";
      style = "font-family: Arial, sans-serif; font-size: 22px; color: #000000; line-height: 1.6;";
    } else if (genre === "adventure") {
      condition = "low_contrast_small";
      style = "font-family: Arial, sans-serif; font-size: 16px; color: #c8c8c8; line-height: 1.6;";
    } else if (genre === "thriller") {
      condition = "disfluent_font";
      // Brush Script MT if available; fallback cursive
      style = "font-family: 'Brush Script MT', cursive; font-size: 20px; color: #000000; line-height: 1.6;";
    } else {
      // fallback: treat unknown input as comedy to avoid breaking the experiment
      condition = "fluent_easy";
      style = "font-family: Arial, sans-serif; font-size: 22px; color: #000000; line-height: 1.6;";
    }

    jsPsych.data.addProperties({
      genre_input: genre,
      condition: condition,
      reading_style: style
    });
  }
};

/* ===============================
   COUNTDOWN 3-2-1
================================ */

const countdown = {
  timeline: [
    { type: jsPsychHtmlKeyboardResponse, stimulus: "<h1 style='font-size:80px;'>3</h1>", choices: "NO_KEYS", trial_duration: 1000 },
    { type: jsPsychHtmlKeyboardResponse, stimulus: "<h1 style='font-size:80px;'>2</h1>", choices: "NO_KEYS", trial_duration: 1000 },
    { type: jsPsychHtmlKeyboardResponse, stimulus: "<h1 style='font-size:80px;'>1</h1>", choices: "NO_KEYS", trial_duration: 1000 }
  ],
  on_finish: (data) => {}
};

/* ===============================
   READING (styled by condition)
================================ */

const reading = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    const style = jsPsych.data.get().last(1).values()[0].reading_style || "";
    return `<div style="${style}">${axolotlText}</div>`;
  },
  choices: ["I have finished reading"],
  data: { phase: "reading" },
  on_finish: (data) => {}
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
   QUIZ: 1 question per trial (RT per question)
   + correctness per question
================================ */

const quizTrials = quizItems.map(item => {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<p><strong>Question ${item.id} of ${quizItems.length}</strong></p><p>${item.q}</p>`,
    choices: item.options,
    data: {
      phase: "quiz",
      question_id: item.id,
      correct_index: item.correctIndex
    },
    on_finish: (data) => {
      data.correct = (data.response === data.correct_index);
    }
  };
});

/* ===============================
   SUMMARY COMPUTATION:
   total correct + total/mean RT for quiz
================================ */

const computeSummary = {
  type: jsPsychCallFunction,
  func: () => {
    const quizData = jsPsych.data.get().filter({ phase: "quiz" }).values();

    // Score total
    const nCorrect = quizData.reduce((acc, t) => acc + (t.correct ? 1 : 0), 0);
    const nQ = quizData.length;

    // RT stats (ms)
    const rts = quizData.map(t => t.rt).filter(rt => rt !== null && !isNaN(rt));
    const totalRT = rts.reduce((a, b) => a + b, 0);
    const meanRT = rts.length ? (totalRT / rts.length) : null;

    jsPsych.data.addProperties({
      quiz_n_questions: nQ,
      quiz_total_correct: nCorrect,
      quiz_total_time_ms: totalRT,
      quiz_mean_time_ms: meanRT
    });
  }
};

/* ===============================
   FINISH: download CSV (no data shown on page)
================================ */

const finishAndSave = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h3>Thank you for participating.</h3>
    <p>Click <strong>Finish</strong> to complete the study.</p>
    <p>Your browser will download a data file.</p>
  `,
  choices: ["Finish"],
  on_finish: () => {
    // Save CSV locally (participant downloads)
    jsPsych.data.get().localSave('csv', `participant_${Date.now()}.csv`);
  }
};

/* ===============================
   RUN TIMELINE
================================ */

jsPsych.run([
  consent,
  genreInput,
  countdown,
  reading,
  jol,
  distractor,
  ...quizTrials,
  computeSummary,
  finishAndSave
]);
