// Configuration
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycby2qX7_YLIouSJg_v4Vdf6wFU8V5hX9WBymOyy1MbQfPKThNJauihRc9MKUE9d6V68Qrg/exec';

// Questions data
const questionsData = [
    { id: 1, question: "Nom, Prénom", type: "Voice recording or Short text" },
    { id: 2, question: "Adresse email dédiée au projet ?", type: "Short text" },
    { id: 3, question: "Pourquoi revenir sur le marché HoReCa maintenant ? Quel(s) progrès technologique précis t'y a poussé ?", type: "Voice recording ou Short text" },
    { id: 4, question: "Quel(s) problem(s) concret(s) veut résoudre Vox-Pop! pour les restaurateurs ?", type: "Voice recording ou Short text" },
    { id: 5, question: "Quelles sont les 3 fonctionnalités clés du produit au stade MVP?", type: "Voice recording ou Short text" },
    { id: 6, question: "Quel est le modèle économique prévu ? (Saas, Freemium, Commission, Renting etc)", type: "Voice recording ou Short text" },
    { id: 7, question: "Quelle est la cible prioritaire en phase pilote et dans les 3 mois du lancement ? Et Pourquoi ?", type: "Voice recording ou Short text" },
    { id: 8, question: "Quels sont les 2 ou 3 plus grands risques identifiés à ce stade?", type: "Voice recording ou Short text" },
    { id: 9, question: "Quels sont les principaux concurrents identifiés par zone EMEA, NA, APAC, LATAM ?", type: "Voice recording ou Short text" },
    { id: 10, question: "Quelle serait la preuve irréfutable de succès dans 1 an, 2ans, 3ans ?", type: "Voice recording ou Short text" },
    { id: 11, question: "Autorises-tu que cet enregistrement soit traité automatiquement ?", type: "Yes / No" }
];

// État de l'application
let currentQuestion = 0;
let responses = {};
let responseMode = 'text'; // 'text' ou 'audio'
let isRecording = false;
let isPaused = false;
let audioBlob = null;
let audioValidated = false;
let recordingTime = 0;
let recordingTimer = null;
let mediaRecorder = null;
let audioStream = null;
let audioChunks = [];

// Éléments DOM
const welcomeScreen = document.getElementById('welcome-screen');
const questionnaireScreen = document.getElementById('questionnaire-screen');
const completionScreen = document.getElementById('completion-screen');
const loadingOverlay = document.getElementById('loading-overlay');

// Éléments de contrôle
const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');

// Éléments de question
const questionText = document.getElementById('question-text');
const questionType = document.getElementById('question-type');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');

// Éléments de réponse
const responseSelector = document.getElementById('response-selector');
const textModeBtn = document.getElementById('text-mode-btn');
const audioModeBtn = document.getElementById('audio-mode-btn');
const textResponse = document.getElementById('text-response');
const yesnoResponse = document.getElementById('yesno-response');
const audioResponse = document.getElementById('audio-response');
const textInput = document.getElementById('text-input');
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');

// Éléments audio
const recordingStatus = document.getElementById('recording-status');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const recordingTimerEl = document.getElementById('recording-timer');
const startRecordingBtn = document.getElementById('start-recording-btn');
const activeControls = document.getElementById('active-controls');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const stopBtn = document.getElementById('stop-btn');
const playbackSection = document.getElementById('playback-section');
const playBtn = document.getElementById('play-btn');
const pausePlaybackBtn = document.getElementById('pause-playback-btn');
const audioDuration = document.getElementById('audio-duration');
const deleteBtn = document.getElementById('delete-btn');
const continueBtn = document.getElementById('continue-btn');
const validateBtn = document.getElementById('validate-btn');
const validatedStatus = document.getElementById('validated-status');
const audioPlayer = document.getElementById('audio-player');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    showWelcomeScreen();
}

function setupEventListeners() {
    // Navigation
    startBtn.addEventListener('click', startQuestionnaire);
    prevBtn.addEventListener('click', previousQuestion);
    nextBtn.addEventListener('click', nextQuestion);
    restartBtn.addEventListener('click', restartQuestionnaire);

    // Mode de réponse
    textModeBtn.addEventListener('click', () => setResponseMode('text'));
    audioModeBtn.addEventListener('click', () => setResponseMode('audio'));

    // Réponse texte
    textInput.addEventListener('input', handleTextInput);

    // Réponse Oui/Non
    yesBtn.addEventListener('click', () => handleYesNoResponse('Oui'));
    noBtn.addEventListener('click', () => handleYesNoResponse('Non'));

    // Contrôles audio
    startRecordingBtn.addEventListener('click', startRecording);
    pauseBtn.addEventListener('click', pauseRecording);
    resumeBtn.addEventListener('click', resumeRecording);
    stopBtn.addEventListener('click', stopRecording);
    playBtn.addEventListener('click', playRecording);
    pausePlaybackBtn.addEventListener('click', pausePlayback);
    deleteBtn.addEventListener('click', deleteRecording);
    continueBtn.addEventListener('click', continueRecording);
    validateBtn.addEventListener('click', validateRecording);

    // Audio player events
    audioPlayer.addEventListener('ended', () => {
        playBtn.classList.remove('hidden');
        pausePlaybackBtn.classList.add('hidden');
    });
}

// Navigation entre écrans
function showWelcomeScreen() {
    welcomeScreen.classList.remove('hidden');
    questionnaireScreen.classList.add('hidden');
    completionScreen.classList.add('hidden');
}

function showQuestionnaireScreen() {
    welcomeScreen.classList.add('hidden');
    questionnaireScreen.classList.remove('hidden');
    completionScreen.classList.add('hidden');
}

function showCompletionScreen() {
    welcomeScreen.classList.add('hidden');
    questionnaireScreen.classList.add('hidden');
    completionScreen.classList.remove('hidden');
}

function startQuestionnaire() {
    currentQuestion = 0;
    responses = {};
    showQuestionnaireScreen();
    displayQuestion();
}

function restartQuestionnaire() {
    currentQuestion = 0;
    responses = {};
    responseMode = 'text';
    resetAudioState();
    showWelcomeScreen();
}

// Gestion des questions
function displayQuestion() {
    const question = questionsData[currentQuestion];
    
    // Mise à jour du contenu
    questionText.textContent = question.question;
    questionType.textContent = question.type;
    
    // Mise à jour de la progression
    const progress = ((currentQuestion + 1) / questionsData.length) * 100;
    progressText.textContent = `Question ${currentQuestion + 1} sur ${questionsData.length}`;
    progressPercent.textContent = `${Math.round(progress)}%`;
    progressFill.style.width = `${progress}%`;
    
    // Configuration de l'interface de réponse
    setupResponseInterface(question);
    
    // Mise à jour des boutons de navigation
    updateNavigationButtons();
    
    // Charger la réponse précédente si elle existe
    loadPreviousResponse();
}

function setupResponseInterface(question) {
    // Masquer toutes les sections
    textResponse.classList.add('hidden');
    yesnoResponse.classList.add('hidden');
    audioResponse.classList.add('hidden');
    responseSelector.classList.add('hidden');
    
    // Reset des boutons de mode
    textModeBtn.classList.remove('active');
    audioModeBtn.classList.remove('active');
    
    if (question.type === "Short text") {
        textResponse.classList.remove('hidden');
        responseMode = 'text';
    } else if (question.type === "Yes / No") {
        yesnoResponse.classList.remove('hidden');
        responseMode = 'yesno';
    } else {
        // Question avec choix audio/texte
        responseSelector.classList.remove('hidden');
        if (responseMode === 'audio') {
            audioResponse.classList.remove('hidden');
            audioModeBtn.classList.add('active');
        } else {
            textResponse.classList.remove('hidden');
            textModeBtn.classList.add('active');
        }
    }
}

function setResponseMode(mode) {
    responseMode = mode;
    
    if (mode === 'text') {
        textResponse.classList.remove('hidden');
        audioResponse.classList.add('hidden');
        textModeBtn.classList.add('active');
        audioModeBtn.classList.remove('active');
    } else if (mode === 'audio') {
        textResponse.classList.add('hidden');
        audioResponse.classList.remove('hidden');
        textModeBtn.classList.remove('active');
        audioModeBtn.classList.add('active');
    }
    
    updateNavigationButtons();
}

function updateNavigationButtons() {
    // Bouton précédent
    prevBtn.disabled = currentQuestion === 0;
    
    // Bouton suivant
    const hasResponse = checkHasResponse();
    nextBtn.disabled = !hasResponse;
    
    // Texte du bouton suivant
    const nextText = document.getElementById('next-text');
    nextText.textContent = currentQuestion === questionsData.length - 1 ? 'Terminer et Envoyer' : 'Suivant';
}

function checkHasResponse() {
    const question = questionsData[currentQuestion];
    
    if (question.type === "Yes / No") {
        return yesBtn.classList.contains('active') || noBtn.classList.contains('active');
    } else if (responseMode === 'text' || question.type === "Short text") {
        return textInput.value.trim() !== '';
    } else if (responseMode === 'audio') {
        return audioBlob !== null && audioValidated;
    }
    
    return false;
}

// Navigation
function previousQuestion() {
    if (currentQuestion > 0) {
        saveCurrentResponse();
        currentQuestion--;
        resetResponseInterface();
        displayQuestion();
    }
}

function nextQuestion() {
    saveCurrentResponse();
    
    if (currentQuestion < questionsData.length - 1) {
        currentQuestion++;
        resetResponseInterface();
        displayQuestion();
    } else {
        // Dernière question - soumettre
        submitResponses();
    }
}

function saveCurrentResponse() {
    const question = questionsData[currentQuestion];
    let responseData = null;
    
    if (question.type === "Yes / No") {
        if (yesBtn.classList.contains('active')) responseData = 'Oui';
        if (noBtn.classList.contains('active')) responseData = 'Non';
    } else if (responseMode === 'text' || question.type === "Short text") {
        responseData = textInput.value.trim();
    } else if (responseMode === 'audio' && audioBlob && audioValidated) {
        responseData = audioBlob;
    }
    
    if (responseData) {
        responses[question.id] = {
            type: responseMode,
            data: responseData,
            question: question.question
        };
    }
}

function loadPreviousResponse() {
    const question = questionsData[currentQuestion];
    const previousResponse = responses[question.id];
    
    if (previousResponse) {
        if (question.type === "Yes / No") {
            if (previousResponse.data === 'Oui') {
                yesBtn.classList.add('active');
                noBtn.classList.remove('active');
            } else {
                noBtn.classList.add('active');
                yesBtn.classList.remove('active');
            }
        } else if (previousResponse.type === 'text') {
            textInput.value = previousResponse.data;
            setResponseMode('text');
        } else if (previousResponse.type === 'audio') {
            audioBlob = previousResponse.data;
            audioValidated = true;
            setResponseMode('audio');
            showPlaybackInterface();
        }
    }
}

function resetResponseInterface() {
    // Reset texte
    textInput.value = '';
    
    // Reset Oui/Non
    yesBtn.classList.remove('active');
    noBtn.classList.remove('active');
    
    // Reset audio
    resetAudioState();
    
    // Reset mode par défaut
    responseMode = 'text';
}

// Gestion des réponses texte
function handleTextInput() {
    updateNavigationButtons();
}

function handleYesNoResponse(value) {
    if (value === 'Oui') {
        yesBtn.classList.add('active');
        noBtn.classList.remove('active');
    } else {
        noBtn.classList.add('active');
        yesBtn.classList.remove('active');
    }
    updateNavigationButtons();
}

// Gestion audio
function startTimer() {
    recordingTimer = setInterval(() => {
        recordingTime++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    recordingTimerEl.textContent = timeString;
    audioDuration.textContent = `Durée : ${timeString}`;
}

async function startRecording() {
    try {
        if (!audioStream) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            showPlaybackInterface();
        };
        
        mediaRecorder.start(100);
        isRecording = true;
        isPaused = false;
        audioValidated = false;
        recordingTime = 0;
        
        showRecordingInterface();
        startTimer();
        
    } catch (error) {
        console.error('Erreur microphone:', error);
        alert('Impossible d\'accéder au microphone. Vérifiez les autorisations.');
    }
}

function pauseRecording() {
    if (mediaRecorder && isRecording && !isPaused) {
        mediaRecorder.pause();
        isPaused = true;
        stopTimer();
        updateRecordingStatus();
    }
}

function resumeRecording() {
    if (mediaRecorder && isRecording && isPaused) {
        mediaRecorder.resume();
        isPaused = false;
        startTimer();
        updateRecordingStatus();
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        isPaused = false;
        stopTimer();
        hideRecordingInterface();
    }
}

function continueRecording() {
    // Redémarrer l'enregistrement en continuant
    startRecording();
}

function playRecording() {
    if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        playBtn.classList.add('hidden');
        pausePlaybackBtn.classList.remove('hidden');
    }
}

function pausePlayback() {
    audioPlayer.pause();
    playBtn.classList.remove('hidden');
    pausePlaybackBtn.classList.add('hidden');
}

function deleteRecording() {
    audioBlob = null;
    audioValidated = false;
    recordingTime = 0;
    hidePlaybackInterface();
    updateNavigationButtons();
}

function validateRecording() {
    if (audioBlob) {
        audioValidated = true;
        validateBtn.classList.add('hidden');
        validatedStatus.classList.remove('hidden');
        updateNavigationButtons();
    }
}

function showRecordingInterface() {
    recordingStatus.classList.remove('hidden');
    startRecordingBtn.classList.add('hidden');
    activeControls.classList.remove('hidden');
    updateRecordingStatus();
}

function hideRecordingInterface() {
    activeControls.classList.add('hidden');
    updateRecordingStatus();
}

function showPlaybackInterface() {
    recordingStatus.classList.remove('hidden');
    playbackSection.classList.remove('hidden');
    startRecordingBtn.classList.add('hidden');
    updateRecordingStatus();
    updateTimerDisplay();
}

function hidePlaybackInterface() {
    recordingStatus.classList.add('hidden');
    playbackSection.classList.add('hidden');
    startRecordingBtn.classList.remove('hidden');
}

function updateRecordingStatus() {
    if (isRecording) {
        if (isPaused) {
            statusText.textContent = 'EN PAUSE';
            statusDot.className = 'status-dot';
            pauseBtn.classList.add('hidden');
            resumeBtn.classList.remove('hidden');
        } else {
            statusText.textContent = 'ENREGISTREMENT';
            statusDot.className = 'status-dot recording';
            pauseBtn.classList.remove('hidden');
            resumeBtn.classList.add('hidden');
        }
    } else if (audioBlob) {
        if (audioValidated) {
            statusText.textContent = 'ENREGISTREMENT VALIDÉ';
            statusText.className = 'completed';
            statusDot.className = 'status-dot validated';
        } else {
            statusText.textContent = 'ENREGISTREMENT TERMINÉ';
            statusText.className = 'completed';
            statusDot.className = 'status-dot completed';
        }
    }
}

function resetAudioState() {
    isRecording = false;
    isPaused = false;
    audioBlob = null;
    audioValidated = false;
    recordingTime = 0;
    stopTimer();
    
    // Reset interface
    hideRecordingInterface();
    hidePlaybackInterface();
    validateBtn.classList.remove('hidden');
    validatedStatus.classList.add('hidden');
    
    // Arrêter le stream
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
}

// Soumission des données
async function submitResponses() {
    loadingOverlay.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        formData.append('timestamp', new Date().toISOString());
        
        for (const [questionId, response] of Object.entries(responses)) {
            const question = questionsData.find(q => q.id === parseInt(questionId));
            
            if (response.type === 'audio') {
                const audioBase64 = await audioToBase64(response.data);
                formData.append(`question_${questionId}`, audioBase64);
                formData.append(`question_${questionId}_type`, 'audio');
            } else {
                formData.append(`question_${questionId}`, response.data);
                formData.append(`question_${questionId}_type`, 'text');
            }
            formData.append(`question_${questionId}_text`, question.question);
        }
        
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            body: formData,
        });
        
        if (response.ok) {
            showCompletionScreen();
            displayCompletionInfo();
        } else {
            throw new Error('Erreur lors de l\'envoi');
        }
        
    } catch (error) {
        console.error('Erreur envoi:', error);
        alert('Erreur lors de l\'envoi des données. Veuillez réessayer.');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

function audioToBase64(audioBlob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            resolve(base64data);
        };
        reader.readAsDataURL(audioBlob);
    });
}

function displayCompletionInfo() {
    const totalResponses = document.getElementById('total-responses');
    const completionTime = document.getElementById('completion-time');
    
    totalResponses.textContent = `${Object.keys(responses).length} réponses`;
    
    const now = new Date();
    const timeString = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    completionTime.textContent = `Session terminée le ${timeString}`;
}
