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
  container.innerHTML = "";
  container.style.display = "block";
  recordedBlob = null;

  const q = questions[currentQuestion];
  if (!q) {
    container.style.display = "none";
    document.getElementById("thank-you").style.display = "block";
    return;
  }

  const title = document.createElement("h2");
  title.textContent = `Question ${q["Question #"]} : ${q.Intitulé}`;
  container.appendChild(title);

  const inputType = q["Type "]?.toLowerCase().trim();
  let onlyText = inputType.includes("text") && !inputType.includes("voice");
  let textArea = document.createElement("textarea");
  textArea.id = "response-input";
  container.appendChild(textArea);

  if (!onlyText) {
    const voiceLabel = document.createElement("p");
    voiceLabel.textContent = "Réponse vocale :";
    container.appendChild(voiceLabel);

    createAudioInterface(container);
  }

  const validateBtn = document.createElement("button");
  validateBtn.textContent = "✅ Valider la réponse";
  validateBtn.className = "validate";
  validateBtn.onclick = () => submitResponse(q);
  container.appendChild(validateBtn);
}

function createAudioInterface(container) {
  const audioControls = document.createElement("div");
  audioControls.className = "audio-controls";

  const recBtn = createButton("🎙️ REC", "rec", startRecording);
  const pauseBtn = createButton("⏸️ Pause", "pause", pauseRecording);
  const resumeBtn = createButton("▶️ Reprendre REC", "resume", resumeRecording);
  const playBtn = createButton("🔊 Réécouter", "play", playRecording);
  const deleteBtn = createButton("🗑️ Effacer", "delete", confirmDelete);

  audioControls.append(recBtn, pauseBtn, resumeBtn, playBtn, deleteBtn);
  container.appendChild(audioControls);

  const preview = document.createElement("audio");
  preview.id = "audio-preview";
  preview.controls = true;
  preview.style.display = "none";
  container.appendChild(preview);
}

function createButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = className;
  btn.onclick = onClick;
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
      const audio = document.getElementById("audio-preview");
      audio.src = URL.createObjectURL(recordedBlob);
      audio.style.display = "block";
    };
    mediaRecorder.start();
  });
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.pause();
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
}

function playRecording() {
  const audio = document.getElementById("audio-preview");
  if (audio?.src) {
    audio.play();
  } else {
    alert("Aucun enregistrement à réécouter.");
  }
}

function confirmDelete() {
  if (confirm("Effacer l'enregistrement en cours ?")) {
    stopStream();
    recordedBlob = null;
    document.getElementById("audio-preview").style.display = "none";
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

function submitResponse(question) {
  const text = document.getElementById("response-input")?.value || "";
  if (!text && !recordedBlob) {
    alert("Veuillez répondre par écrit ou audio.");
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
    stopStream();
    currentQuestion++;
    showQuestion();
  }).catch(err => {
    alert("Erreur d'envoi : " + err);
    console.error(err);
  });
}
