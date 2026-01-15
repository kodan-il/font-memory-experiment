/* =========================
   INIT
========================= */

const jsPsych = initJsPsych({
  on_trial_start: function(){
    const content = document.querySelector('.jspsych-content');
    if (content) content.innerHTML = '';
    window.scrollTo(0, 0);
  }
});

let fontStyle = {};
let EXP = {
  condition: "",
  JOL_percent: null,
  reading_rt: null,
  quiz: {
    questions: [],
    correct_count: 0,
    total_time_ms: 0,
    mean_time_ms: 0,
    actual_accuracy_percent: 0
  }
};

/* =========================
   STIMULI
========================= */

const READING_TEXT = `
The axolotl is a paedomorphic salamander closely related to the tiger salamander.
Unlike other amphibians, axolotls reach adulthood without undergoing metamorphosis.
Adults remain aquatic and retain their gills throughout life.
The species was originally found in lakes underlying Mexico City.
Axolotls are studied because of their ability to regenerate limbs.
`;

const QUIZ = [
  { q: "Axolotls are:", choices: ["Fish", "Salamanders", "Reptiles"], correct: 1 },
  { q: "They remain:", choices: ["On land", "Aquatic", "In caves"], correct: 1 },
  { q: "Axolotls keep their:", choices: ["Lungs", "Gills", "Fur"], correct: 1 },
  { q: "They originate from:", choices: ["Africa", "Mexico City lakes", "Asia"], correct: 1 },
  { q: "They are studied because:", choices: ["Speed", "Color", "Limb regeneration"], correct: 2 }
];

/* =========================
   CONSENT
========================= */

const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="page">
      <h2>Consent</h2>
      <p>This study records reading behavior and response times.</p>
      <p>No personal data is collected.</p>
    </div>
  `,
  choices: ["I Agree", "I Do Not Agree"],
  on_finish: d => {
    if (d.response === 1) jsPsych.endExperiment("Consent not given.");
  }
};

/* =========================
   CONDITION
========================= */

const condition_input = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="page"><p>Please choose a genre.</p></div>`,
  choices: ["comedy", "adventure", "thriller"],
  on_finish: d => {
    const c = ["comedy","adventure","thriller"][d.response];
    EXP.condition = c;

    if (c === "comedy")
      fontStyle = {font:"Arial", color:"#000", size:"20px"};
    else if (c === "adventure")
      fontStyle = {font:"Arial", color:"#bbb", size:"16px"};
    else
      fontStyle = {font:"Brush Script MT, cursive", color:"#444", size:"22px"};
  }
};

/* =========================
   READING
========================= */

const reading = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: () => `
    <div class="page" style="
      font-family:${fontStyle.font};
      color:${fontStyle.color};
      font-size:${fontStyle.size};
      line-height:1.6;">
      <p>${READING_TEXT}</p>
      <p><em>Press SPACE when finished reading.</em></p>
    </div>
  `,
  choices: [" "],
  data: { phase: "reading", stimulus: "reading passage" },
  on_finish: d => {
    EXP.reading_rt = d.rt;
  }
};

/* =========================
   JOL
========================= */

const jol = {
  type: jsPsychHtmlSliderResponse,
  stimulus: `<div class="page"><p>How much do you think you will remember?</p></div>`,
  min: 0,
  max: 100,
  step: 1,
  labels: ["0%", "50%", "100%"],
  on_finish: d => {
    EXP.JOL_percent = d.response;
  }
};

/* =========================
   QUIZ
========================= */

const quiz_trials = QUIZ.map((item, index) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="page">
      <h3>Question ${index + 1} of ${QUIZ.length}</h3>
      <p>${item.q}</p>
    </div>
  `,
  choices: item.choices,
  data: { phase: "quiz", stimulus: item.q },
  on_finish: d => {
    const correct = d.response === item.correct ? 1 : 0;

    EXP.quiz.questions.push({
      stimulus: item.q,
      response: item.choices[d.response],
      quiz_score: correct,
      rt: d.rt
    });

    if (correct) EXP.quiz.correct_count++;
  }
}));

/* =========================
   FINISH + EXPORT
========================= */

const finish = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="page">
      <h2>Thank you</h2>
      <p>Click Finish to download your data.</p>
    </div>
  `,
  choices: ["Finish"],
  on_finish: () => {

    // quiz timing
    const total = EXP.quiz.questions.reduce((a,b) => a + b.rt, 0);
    EXP.quiz.total_time_ms = total;
    EXP.quiz.mean_time_ms = total / EXP.quiz.questions.length;

    // accuracy
    EXP.quiz.actual_accuracy_percent =
      (EXP.quiz.correct_count / EXP.quiz.questions.length) * 100;

    // CSV rows
    const rows = [
      {
        rt: EXP.reading_rt,
        stimulus: "reading passage",
        response: "SPACE",
        quiz_score: "",
        condition: EXP.condition,
        JOL_percent: EXP.JOL_percent,
        quiz_total_time_ms: "",
        quiz_mean_time_ms: "",
        actual_accuracy_percent: ""
      },
      ...EXP.quiz.questions.map(q => ({
        rt: q.rt,
        stimulus: q.stimulus,
        response: q.response,
        quiz_score: q.quiz_score,
        condition: EXP.condition,
        JOL_percent: EXP.JOL_percent,
        quiz_total_time_ms: EXP.quiz.total_time_ms,
        quiz_mean_time_ms: EXP.quiz.mean_time_ms,
        actual_accuracy_percent: EXP.quiz.actual_accuracy_percent
      }))
    ];

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map(r => Object.values(r).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "experiment_data.csv";
    a.click();
  }
};

/* =========================
   RUN
========================= */

jsPsych.run([
  consent,
  condition_input,
  reading,
  jol,
  ...quiz_trials,
  finish
]);
