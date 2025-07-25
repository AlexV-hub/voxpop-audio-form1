// 📜 script.js – VoxPop Audio Interview avec état REC/Pause/Reprendre/Réécoute/Effacer + interface texte

let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let stream = null;

const sheetURL = "https://script.google.com/macros/s/AKfycby2qX7_YLIouSJg_v4Vdf6wFU8V5hX9WBymOyy1MbQfPKThNJauihRc9MKUE9d6V68Qrg/exec";

window.onload = () => {
  Papa.parse("https://docs.google.com/spreadsheets/d/e/2PACX-1vRiMKyU-JgfgkLnsj1A2E-ma2fmOepCnNhd9bJybGYN4sc1rfG-rbfF_TG6dcG3q3AhqxzUPAVguuNE/pub?output=csv", {
    download: true,
    header: true,
    complete: results => {
      questions = results.data.filter(q => q["Question #"]);
    }
  });
};

function startInterview() {
  document.getElementById("intro-section").style.display = "none";
  showQuestion();
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

  const inputType = q["Type "]?.toLowerCase().trim();
  let input;

  if (inputType.includes("email")) {
    input = document.createElement("input");
    input.type = "email";
    input.id = "response-input";
    container.appendChild(input);
  } else if (inputType.includes("text") && !inputType.includes("voice")) {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  } else if (inputType.includes("voice") && inputType.includes("text")) {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
    container.appendChild(document.createElement("br"));
    container.appendChild(document.createTextNode("Ou réponse vocale :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else if (inputType.includes("voice")) {
    container.appendChild(document.createTextNode("Réponse vocale :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  }

  const validateBtn = document.createElement("button");
  validateBtn.textContent = "✅ Valider la réponse";
  validateBtn.classList.add("validate-btn");
  validateBtn.onclick = () => submitResponse(q);
  container.appendChild(document.createElement("br"));
  container.appendChild(validateBtn);
}

function createAudioInterface(container) {
  const audioControls = document.createElement("div");
  audioControls.id = "audio-controls";

  const recBtn = createAudioButton("🎙️ REC", startRecording, "rec-btn");
  const pauseBtn = createAudioButton("⏸️ Pause", pauseRecording, "pause-btn");
  const resumeBtn = createAudioButton("▶️ Reprendre REC", resumeRecording, "resume-btn");
  const playBtn = createAudioButton("🔊 Réécouter", playRecording, "play-btn");
  const deleteBtn = createAudioButton("🗑️ Effacer", confirmErase, "delete-btn");

  audioControls.appendChild(recBtn);
  audioControls.appendChild(pauseBtn);
  audioControls.appendChild(resumeBtn);
  audioControls.appendChild(playBtn);
  audioControls.appendChild(deleteBtn);
  container.appendChild(audioControls);

  const audioPreview = document.createElement("audio");
  audioPreview.id = "audio-preview";
  audioPreview.controls = true;
  container.appendChild(audioPreview);
}

function createAudioButton(text, handler, className) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.classList.add("audio-button");
  if (className) btn.classList.add(className);
  btn.onclick = handler;
  return btn;
}

function startRecording() {
  recordedChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
    stream = s;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
      document.getElementById("audio-preview").src = URL.createObjectURL(recordedBlob);
    };
    mediaRecorder.start();
  }).catch(console.error);
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.pause();
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
}

function playRecording() {
  if (recordedBlob) {
    const audio = document.getElementById("audio-preview");
    audio.src = URL.createObjectURL(recordedBlob);
    audio.play();
  }
}

function confirmErase() {
  if (confirm("Effacer l'enregistrement et recommencer ?")) {
    recordedChunks = [];
    recordedBlob = null;
    document.getElementById("audio-preview").src = "";
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  }
}

function submitResponse(question) {
  const text = document.getElementById("response-input")?.value || "";
  if (!text && !recordedBlob) {
    alert("Réponse obligatoire");
    return;
  }

  const formData = new FormData();
  formData.append("index", currentQuestion);
  formData.append("text", text);

  if (recordedBlob) {
    formData.append("audio", recordedBlob, `question${currentQuestion + 1}.webm`);
  }

  fetch(sheetURL, {
    method: "POST",
    body: formData
  }).then(() => {
    recordedBlob = null;
    currentQuestion++;
    showQuestion();
  }).catch(err => {
    alert("Erreur d'envoi des données : " + err);
    console.error(err);
  });
}
