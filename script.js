let questions = [];
let currentQuestion = 0;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let audioStream = null;
let audioContext, analyser, dataArray, animationId;

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
  } else if (inputType.includes("voice") && inputType.includes("text")) {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
    container.appendChild(document.createElement("br"));
    container.appendChild(document.createTextNode("🎙️ Ou réponse vocale :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else if (inputType.includes("voice")) {
    container.appendChild(document.createTextNode("🎙️ Réponse vocale uniquement :"));
    container.appendChild(document.createElement("br"));
    createAudioInterface(container);
  } else {
    input = document.createElement("textarea");
    input.id = "response-input";
    container.appendChild(input);
  }

  const validateBtn = document.createElement("button");
  validateBtn.textContent = "✅ Valider la réponse";
  validateBtn.className = "validate";
  validateBtn.onclick = () => submitResponse(q);
  container.appendChild(validateBtn);
}

function createAudioInterface(container) {
  const startBtn = document.createElement("button");
  startBtn.textContent = "🎙️ REC";
  startBtn.className = "rec";
  startBtn.onclick = startRecording;

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸️ Pause";
  pauseBtn.className = "pause";
  pauseBtn.onclick = pauseRecording;

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "▶️ Reprendre";
  resumeBtn.className = "resume";
  resumeBtn.onclick = resumeRecording;

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "⏹️ Stop";
  stopBtn.className = "stop";
  stopBtn.onclick = stopRecording;

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "🗑️ Effacer";
  resetBtn.className = "reset";
  resetBtn.onclick = resetRecording;

  container.appendChild(startBtn);
  container.appendChild(pauseBtn);
  container.appendChild(resumeBtn);
  container.appendChild(stopBtn);
  container.appendChild(resetBtn);

  // visualiseur micro
  const mic = document.createElement("canvas");
  mic.id = "mic-visualizer";
  mic.width = 300;
  mic.height = 30;
  mic.style.display = "block";
  mic.style.marginTop = "10px";
  container.appendChild(mic);
}

function startRecording() {
  recordedChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioStream = stream;
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
      showAudioPreview(recordedBlob);
      stopVisualizer();
    };

    mediaRecorder.start();
    startVisualizer(stream);
  }).catch(console.error);
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.pause();
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
}

function stopRecording() {
  if (mediaRecorder && ["recording", "paused"].includes(mediaRecorder.state)) {
    mediaRecorder.stop();
  }
}

function resetRecording() {
  if (confirm("Supprimer l’enregistrement ?")) {
    recordedChunks = [];
    recordedBlob = null;
    stopVisualizer();
    const old = document.getElementById("audio-preview");
    if (old) old.remove();
  }
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
    alert("Merci de fournir une réponse écrite ou vocale.");
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

function startVisualizer(stream) {
  const canvas = document.getElementById("mic-visualizer");
  const ctx = canvas.getContext("2d");

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 64;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      ctx.fillStyle = `rgb(${value + 100}, 100, 150)`;
      ctx.fillRect(i * barWidth, canvas.height - value / 2, barWidth - 1, value / 2);
    }
  }

  draw();
}

function stopVisualizer() {
  if (animationId) cancelAnimationFrame(animationId);
  if (audioContext) audioContext.close();
}
