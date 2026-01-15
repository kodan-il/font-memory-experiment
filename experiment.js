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
  type: jsPsychSurveyHtmlForm,
  preamble: `
    <div class="page">
      <h2>Consent</h2>
      <p>This study records reading behavior and response times.</p>
      <p>No personal data is collected.</p>
    </div>
  `,
  html: `
    <div style="text-align: left; display: inline-block;">
      <p>Please enter a unique ID to proceed. <strong>This is required.</strong></p>
      <input name="p_id" type="text" required placeholder="Enter your ID here..." />
      <br><br>
      <label>
        <input type="checkbox" name="consent_checkbox" required />
        I agree to the terms of this study.
      </label>
    </div>
  `,
  button_label: "Start Experiment",
  on_finish: function(data) {
    // We strictly map the form response to your EXP object
    EXP.participant_id = data.response.p_id;
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
   FINISH + EXPORT (FIRESTORE)
========================= */

const finish = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="page">
      <h2>Vielen Dank!</h2>
      <p>Click "Finish" to save your data to the database.</p>
    </div>
  `,
  choices: ["Finish"],
  on_finish: async () => {
    // 1. Calculate stats (same as your original code)
    const total = EXP.quiz.questions.reduce((a, b) => a + b.rt, 0);
    EXP.quiz.total_time_ms = total;
    EXP.quiz.mean_time_ms = total / EXP.quiz.questions.length;
    EXP.quiz.actual_accuracy_percent = (EXP.quiz.correct_count / EXP.quiz.questions.length) * 100;

    // 2. Prepare the data object
    const finalData = {
        participant_id: EXP.participant_id,
        timestamp: new Date().toISOString(),
        condition: EXP.condition,
        jol_percent: EXP.JOL_percent,
        quiz_accuracy: EXP.quiz.actual_accuracy_percent,
        full_data: EXP // Saves the whole structure
    };

    // 3. Save to Firestore using the global window variables
    const content = document.querySelector('.jspsych-content');
    content.innerHTML = '<p>Saving data... please wait.</p>';

    try {
        // We use window.fbAddDoc because you defined it in index.html
        await window.fbAddDoc(window.fbCollection(window.db, "experiment_results"), finalData);
        
        console.log("Data saved to Firestore!");
        content.innerHTML = `
            <div class="page">
                <h2 style="color:green">Success!</h2>
                <p>Ihre Daten wurden gespeichert. (Your data has been saved.)</p>
                <p>You can now close this tab.</p>
            </div>`;
            
    } catch (e) {
        console.error("Error adding document: ", e);
        content.innerHTML = `
            <div class="page">
                <h2 style="color:red">Error</h2>
                <p>Es gab einen Fehler beim Speichern. (There was an error saving.)</p>
                <p>Please contact the researcher.</p>
            </div>`;
    }
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
