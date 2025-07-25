let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

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
  const isVoice = inputType.includes("voice");
  const isText = inputType.includes("text");
  const isEmail = inputType.includes("email");

  if (isEmail) {
    const input = document.createElement("input");
    input.type = "email";
    input.id = "response-input";
    container.appendChild(input);
  }

  if (isText || (!isVoice && !isEmail)) {
    const input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  }

  if (isVoice) {
    const label = document.createElement("p");
    label.textContent = "Réponse vocale :";
    container.appendChild(label);
    createAudioInterface(container);
  }

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ Valider la réponse";
  submitBtn.className = "validate-btn";
  submitBtn.onclick = () => submitResponse(q);
  container.appendChild(submitBtn);
}

function createAudioInterface(container) {
  const controls = document.createElement("div");
  controls.className = "audio-controls";

  const recBtn = document.createElement("button");
  recBtn.textContent = "🎙️ REC";
  recBtn.className = "rec";
  recBtn.onclick = startRecording;

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸️ Pause";
  pauseBtn.className = "pause";
  pauseBtn.onclick = pauseRecording;

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "▶️ Reprendre REC";
  resumeBtn.className = "resume";
  resumeBtn.onclick = resumeRecording;

  const previewBtn = document.createElement("button");
  previewBtn.textContent = "🔊 Réécouter";
  previewBtn.className = "playback";
  previewBtn.onclick = showAudioPreview;

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "🗑️ Effacer";
  clearBtn.className = "delete";
  clearBtn.onclick = () => {
    if (confirm("Effacer l'enregistrement ?")) {
      recordedBlob = null;
      document.getElementById("audio-preview")?.remove();
    }
  };

  controls.append(recBtn, pauseBtn, resumeBtn, previewBtn, clearBtn);
  container.appendChild(controls);

  const audio = document.createElement("audio");
  audio.id = "audio-preview";
  audio.controls = true;
  audio.style.display = "none";
  container.appendChild(audio);
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
      const audio = document.getElementById("audio-preview");
      audio.src = URL.createObjectURL(recordedBlob);
      audio.style.display = "block";
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

function showAudioPreview() {
  if (!recordedBlob) return;
  const audio = document.getElementById("audio-preview");
  audio.play();
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
