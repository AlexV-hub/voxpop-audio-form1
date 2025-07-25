// 📜 script.js – VoxPop Audio Interview avec pause, pré-écoute et upload vers Google Drive

let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

const sheetURL = "https://script.google.com/macros/s/AKfycbwVPiT2HAsQpr_ayyUISd5729QnnMEsykSPGK_vjNtE9CZZ3ywNJpZuHzx_o7JztjmeiA/exec";

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
    input.placeholder = "Réponse écrite (optionnelle)";
    input.id = "response-input";
    container.appendChild(input);
    container.appendChild(document.createElement("br"));
    container.appendChild(document.createTextNode("🎙️ Ou réponds oralement :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else if (inputType.includes("voice")) {
    container.appendChild(document.createTextNode("🎙️ Réponds oralement :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  }

  const button = document.createElement("button");
  button.textContent = "Valider cette réponse";
  button.onclick = () => submitResponse(q);
  container.appendChild(button);
}

function createAudioInterface(container) {
  const startBtn = document.createElement("button");
  startBtn.textContent = "🎙️ Enregistrer";
  startBtn.onclick = startRecording;

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸️ Pause";
  pauseBtn.onclick = pauseRecording;

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "▶️ Reprendre";
  resumeBtn.onclick = resumeRecording;

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "⏹️ Stop";
  stopBtn.onclick = stopRecording;

  container.appendChild(startBtn);
  container.appendChild(pauseBtn);
  container.appendChild(resumeBtn);
  container.appendChild(stopBtn);
}

function startRecording() {
  recordedChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
      showAudioPreview(recordedBlob);
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

function stopRecording() {
  if (mediaRecorder && ["recording", "paused"].includes(mediaRecorder.state)) mediaRecorder.stop();
}

function showAudioPreview(blob) {
  const container = document.getElementById("question-section");
  const old = document.getElementById("audio-preview");
  if (old) old.remove();

  const audio = document.createElement("audio");
  audio.id = "audio-preview";
  audio.controls = true;
  audio.src = URL.createObjectURL(blob);
  container.appendChild(audio);
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
