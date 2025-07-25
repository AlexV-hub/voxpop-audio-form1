let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let recordingStartTime = null;
let timelineInterval = null;

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

  input = document.createElement("textarea");
  input.id = "response-input";
  container.appendChild(input);

  // Texte séparateur
  const orText = document.createElement("p");
  orText.textContent = "Ou réponse vocale :";
  orText.style.marginTop = "20px";
  orText.style.fontStyle = "italic";
  container.appendChild(orText);

  createAudioInterface(container);

  // Valider
  const validateBtn = document.createElement("button");
  validateBtn.textContent = "✅ Valider la réponse";
  validateBtn.className = "validate-button";
  validateBtn.onclick = () => submitResponse(q, container);
  container.appendChild(validateBtn);
}

function createAudioInterface(container) {
  const controls = document.createElement("div");
  controls.className = "audio-controls";

  const recBtn = document.createElement("button");
  recBtn.textContent = "🎙️ REC";
  recBtn.onclick = startRecording;

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸️ Pause";
  pauseBtn.onclick = pauseRecording;

  const playBtn = document.createElement("button");
  playBtn.textContent = "▶️ Play";
  playBtn.onclick = playRecording;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️ Effacer";
  deleteBtn.onclick = confirmDeleteRecording;

  const timeline = document.createElement("div");
  timeline.id = "timeline";
  timeline.className = "timeline";

  controls.appendChild(recBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(playBtn);
  controls.appendChild(deleteBtn);
  container.appendChild(controls);
  container.appendChild(timeline);
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
    };
    mediaRecorder.start();
    recordingStartTime = Date.now();
    startTimeline();
  }).catch(console.error);
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.pause();
    stopTimeline();
  } else if (mediaRecorder?.state === "paused") {
    mediaRecorder.resume();
    startTimeline();
  }
}

function playRecording() {
  if (!recordedBlob) return;
  const audio = new Audio(URL.createObjectURL(recordedBlob));
  audio.play();
}

function confirmDeleteRecording() {
  if (confirm("Voulez-vous vraiment effacer l’enregistrement ?")) {
    recordedBlob = null;
    document.getElementById("timeline").style.width = "0%";
  }
}

function startTimeline() {
  const bar = document.getElementById("timeline");
  timelineInterval = setInterval(() => {
    const elapsed = Date.now() - recordingStartTime;
    const percent = Math.min(100, (elapsed / 60000) * 100); // max 60 sec
    bar.style.width = percent + "%";
  }, 200);
}

function stopTimeline() {
  clearInterval(timelineInterval);
}

function submitResponse(question, container) {
  const text = document.getElementById("response-input")?.value || "";

  if (!text && !recordedBlob) {
    alert("Réponse requise !");
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
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "⏭️ Question suivante";
    nextBtn.className = "next-button";
    nextBtn.onclick = () => {
      currentQuestion++;
      showQuestion();
    };
    container.appendChild(nextBtn);
  }).catch(err => {
    alert("Erreur d'envoi : " + err);
    console.error(err);
  });
}
