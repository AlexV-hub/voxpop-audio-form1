
// 🔗 Lien vers ton Google Sheet publié en CSV
const questionsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiMKyU-JgfgkLnsj1A2E-ma2fmOepCnNhd9bJybGYN4sc1rfG-rbfF_TG6dcG3q3AhqxzUPAVguuNE/pub?output=csv';

let currentQuestion = 0;
let questions = [];
let mediaRecorder;
let audioBlob = null;
let sheetURL = 'https://script.google.com/macros/s/AKfycbwVPiT2HAsQpr_ayyUISd5729QnnMEsykSPGK_vjNtE9CZZ3ywNJpZuHzx_o7JztjmeiA/exec';

function startInterview() {
  fetch(questionsURL)
    .then(response => response.text())
    .then(csv => {
      const parsed = Papa.parse(csv, { header: true });
      console.log("CSV chargé :", parsed.data);

      questions = parsed.data.map(row => row['Intitulé']).filter(q => q);

      if (questions.length === 0) {
        alert("Aucune question chargée. Vérifie ton Google Sheet.");
        return;
      }

      document.getElementById("intro-section").style.display = "none";
      document.getElementById("question-section").style.display = "block";
      showQuestion();
    })
    .catch(error => {
      alert("Erreur lors du chargement des questions : " + error.message);
    });
}

function showQuestion() {
  document.getElementById("question-title").innerText = questions[currentQuestion];
  document.getElementById("text-response").value = "";
  audioBlob = null;
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];
    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    };
    mediaRecorder.start();
  });
}

function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
}

function submitResponse() {
  const responseText = document.getElementById("text-response").value;
  if (!responseText && !audioBlob) {
    alert("Veuillez répondre par texte ou audio.");
    return;
  }
  const formData = new FormData();
  formData.append("index", currentQuestion);
  formData.append("question", questions[currentQuestion]);
  formData.append("responseText", responseText);
  if (audioBlob) formData.append("audio", audioBlob);

  fetch(sheetURL, { method: "POST", body: formData })
    .then(() => {
      currentQuestion++;
      if (currentQuestion < questions.length) {
        showQuestion();
      } else {
        document.getElementById("question-section").style.display = "none";
        document.getElementById("thank-you").style.display = "block";
      }
    });
}
