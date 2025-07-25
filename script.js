// 📜 script.js – VoxPop Audio Interview avec contrôle avancé des enregistrements

let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let stream;
let audioPreview;
let audioVisualizer;
let analyser, dataArray, animationId;

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

  recordedBlob = null;
  recordedChunks = [];

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
  let input;

  if (inputType.includes("email")) {
    input = document.createElement("input");
    input.type = "email";
    input.id = "response-input";
    container.appendChild(input);
  } else {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  }

  container.appendChild(document.createElement("p")).textContent = "Ou réponse vocale :";
  createAudioInterface(container);

  const validateBtn = document.createElement("button");
  validateBtn.textContent = "✅ Valider la réponse";
  validateBtn.onclick = () => submitResponse(q);
  validateBtn.style.marginTop = "20px";
  container.appendChild(validateBtn);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "⏭️ Question suivante";
  nextBtn.style.display = "none";
  nextBtn.id = "next-question-btn";
  nextBtn.onclick = () => {
    currentQuestion++;
    showQuestion();
  };
  container.appendChild(nextBtn);
}

function createAudioInterface(container) {
  const buttonContainer = document.createElement("div");
  buttonContainer.id = "audio-controls";
  container.appendChild(buttonContainer);

  const recBtn = createButton("🎙️ REC", startRecording);
  const pauseBtn = createButton("⏸️ Pause", pauseRecording);
  const resumeBtn = createButton("▶️ Reprendre REC", resumeRecording);
  const playBtn = createButton("🔁 Réécouter", replayRecording);
  const deleteBtn = createButton("🗑️ Effacer", confirmDeleteRecording);

  pauseBtn.style.display = "none";
  resumeBtn.style.display = "none";
  playBtn.style.display = "none";
  deleteBtn.style.display = "none";

  buttonContainer.append(recBtn, pauseBtn, resumeBtn, playBtn, deleteBtn);

  const canvas = document.createElement("canvas");
  canvas.id = "audio-visualizer";
  canvas.width = 300;
  canvas.height = 50;
  container.appendChild(canvas);
}

function createButton(label, handler) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.onclick = handler;
  return btn;
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
    stream = s;
    mediaRecorder = new MediaRecorder(stream);
    analyser = new (window.AudioContext || window.webkitAudioContext)().createAnalyser();
    const source = new (window.AudioContext || window.webkitAudioContext)().createMediaStreamSource(stream);
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    visualize();

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
      cancelAnimationFrame(animationId);
      showAudioPreview();
    };

    recordedChunks = [];
    mediaRecorder.start();

    toggleButtons({ recording: true });
  });
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.pause();
    toggleButtons({ paused: true });
  }
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") {
    mediaRecorder.resume();
    toggleButtons({ recording: true });
  }
}

function confirmDeleteRecording() {
  if (confirm("Voulez-vous vraiment supprimer cet enregistrement ?")) {
    recordedChunks = [];
    recordedBlob = null;
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    document.getElementById("audio-preview")?.remove();
    toggleButtons({ reset: true });
  }
}

function replayRecording() {
  if (recordedBlob) {
    const audio = document.getElementById("audio-preview");
    if (audio) audio.play();
  }
}

function showAudioPreview() {
  const old = document.getElementById("audio-preview");
  if (old) old.remove();

  const audio = document.createElement("audio");
  audio.id = "audio-preview";
  audio.controls = true;
  audio.src = URL.createObjectURL(recordedBlob);
  document.getElementById("question-section").appendChild(audio);

  toggleButtons({ done: true });
}

function toggleButtons(state) {
  const controls = document.getElementById("audio-controls");
  if (!controls) return;
  const [recBtn, pauseBtn, resumeBtn, playBtn, deleteBtn] = controls.children;

  if (state.reset) {
    recBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "none";
    playBtn.style.display = "none";
    deleteBtn.style.display = "none";
  } else if (state.recording) {
    recBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
    resumeBtn.style.display = "none";
    playBtn.style.display = "none";
    deleteBtn.style.display = "none";
  } else if (state.paused) {
    recBtn.style.display = "none";
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "inline-block";
    playBtn.style.display = "none";
    deleteBtn.style.display = "none";
  } else if (state.done) {
    recBtn.style.display = "none";
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "none";
    playBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
  }
}

function visualize() {
  const canvas = document.getElementById("audio-visualizer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i] / 2;
      ctx.fillStyle = "#007bff";
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
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
    document.getElementById("next-question-btn").style.display = "inline-block";
  }).catch(err => {
    alert("Erreur d'envoi des données : " + err);
    console.error(err);
  });
}
