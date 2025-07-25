const questionsURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRiMKyU-JgfgkLnsj1A2E-ma2fmOepCnNhd9bJybGYN4sc1rfG-rbfF_TG6dcG3q3AhqxzUPAVguuNE/pub?output=csv";

let questions = [];
let currentQuestion = 0;

// Fonction appelée au clic sur "Commencer"
function startInterview() {
  fetch(questionsURL)
    .then((response) => response.text())
    .then((csvText) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          questions = results.data;
          console.log("✅ CSV chargé :", questions);
          document.getElementById("intro-section").style.display = "none";
          showQuestion();
        },
      });
    })
    .catch((error) => {
      console.error("Erreur de chargement du CSV :", error);
    });
}

function showQuestion() {
  const container = document.getElementById("question-section");
  container.innerHTML = "";

  const question = questions[currentQuestion];
  if (!question) {
    document.getElementById("thanks-section").style.display = "block";
    return;
  }

  const title = document.createElement("h2");
  title.textContent = `Question ${question["Question #"]} : ${question.Intitulé}`;
  container.appendChild(title);

  if (question["Type "]?.toLowerCase().includes("text")) {
    const textarea = document.createElement("textarea");
    textarea.rows = 4;
    textarea.id = "response-input";
    container.appendChild(textarea);
  } else {
    const audioInput = document.createElement("input");
    audioInput.type = "file";
    audioInput.accept = "audio/*";
    audioInput.capture = "microphone";
    audioInput.id = "response-input";
    container.appendChild(audioInput);
  }

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Valider cette réponse";
  submitBtn.onclick = submitResponse;
  container.appendChild(submitBtn);

  container.style.display = "block";
}

function submitResponse() {
  const input = document.getElementById("response-input");
  if (!input || !input.value && !input.files?.length) {
    alert("Merci de remplir ou d’enregistrer une réponse avant de continuer.");
    return;
  }

  // Ici tu peux ajouter l’envoi à Google Apps Script
  currentQuestion++;
  showQuestion();
}
