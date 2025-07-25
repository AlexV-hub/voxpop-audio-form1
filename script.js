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
  container.style.display = "block";
  container.innerHTML = "";

  const q = questions[currentQuestion];
  if (!q) {
    document.getElementById("question-section").style.display = "none";
    document.getElementById("thank-you").style.display = "block";
    return;
  }

  const title = document.createElement("h2");
  title.textContent = `Question ${q["Question #"]} : ${q.Intitulé}`;
  container.appendChild(title);

  const inputType = q["Type "].toLowerCase().trim();
  let input;

  if (inputType.includes("email")) {
    input = document.createElement("input");
    input.type = "email";
    input.placeholder = "Votre adresse email";
  } else if (inputType.includes("text")) {
    input = document.createElement("textarea");
    input.placeholder = "Votre réponse";
  } else if (inputType.includes("voice") || inputType.includes("upload") || inputType.includes("audio")) {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
  } else {
    // Fallback champ texte
    input = document.createElement("textarea");
    input.placeholder = "Votre réponse";
  }

  input.id = "response-input";
  container.appendChild(input);

  const button = document.createElement("button");
  button.textContent = "Valider cette réponse";
  button.onclick = () => {
    const inputValue = input.value || input.files?.length;
    if (!inputValue) {
      alert("Réponse requise.");
      return;
    }
    currentQuestion++;
    showQuestion();
  };
  container.appendChild(button);
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
