// Striks Whisperer - minimal transcription app
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';
let recordingTimer = null;
const MAX_RECORDING_TIME = 5 * 60 * 1000; // 5 minutes
let isDesktopBrowser = false;
const API_KEY_STORAGE_DURATION = 30; // days

function initApp() {
    checkBrowserType();
    const elements = {
        loginScreen: document.getElementById('login-screen'),
        appScreen: document.getElementById('app-screen'),
        apiKeyInput: document.getElementById('api-key-input'),
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        recordButton: document.getElementById('record-button'),
        statusElement: document.getElementById('status'),
        transcriptionContainer: document.getElementById('transcription-container'),
        transcriptionElement: document.getElementById('transcription'),
        copyTranscriptionButton: document.getElementById('copy-transcription-button'),
    };
    Object.assign(window, elements);

    let savedApiKey = sessionStorage.getItem('voiceTaskApiKey');
    let shouldAutoLogin = false;
    if (savedApiKey) {
        shouldAutoLogin = true;
    } else {
        savedApiKey = localStorage.getItem('voiceTaskApiKey');
        const expiryDate = localStorage.getItem('voiceTaskApiKeyExpiry');
        if (savedApiKey && expiryDate) {
            const now = new Date();
            const expiry = new Date(expiryDate);
            if (now < expiry) {
                shouldAutoLogin = true;
            } else {
                localStorage.removeItem('voiceTaskApiKey');
                localStorage.removeItem('voiceTaskApiKeyExpiry');
                savedApiKey = null;
            }
        }
    }
    if (shouldAutoLogin && savedApiKey) {
        apiKey = savedApiKey;
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    }
    setupEventListeners();
}

document.readyState === 'loading' ?
    document.addEventListener('DOMContentLoaded', initApp) : initApp();

function setupEventListeners() {
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const inputKey = apiKeyInput.value.trim();
            if (inputKey && inputKey.startsWith('sk-')) {
                apiKey = inputKey;
                const rememberKey = document.getElementById('remember-key');
                const shouldRemember = rememberKey ? rememberKey.checked : false;
                if (shouldRemember) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + API_KEY_STORAGE_DURATION);
                    localStorage.setItem('voiceTaskApiKey', apiKey);
                    localStorage.setItem('voiceTaskApiKeyExpiry', expiryDate.toISOString());
                } else {
                    sessionStorage.setItem('voiceTaskApiKey', apiKey);
                    localStorage.removeItem('voiceTaskApiKey');
                    localStorage.removeItem('voiceTaskApiKeyExpiry');
                }
                loginScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
            } else {
                alert('Voer een geldige OpenAI API key in die begint met "sk-"');
            }
        });
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiKey = '';
            localStorage.removeItem('voiceTaskApiKey');
            localStorage.removeItem('voiceTaskApiKeyExpiry');
            sessionStorage.removeItem('voiceTaskApiKey');
            appScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            resetUI();
        });
    }
    if (recordButton) {
        recordButton.addEventListener('click', toggleRecording);
    }
    if (copyTranscriptionButton) {
        copyTranscriptionButton.addEventListener('click', () => {
            navigator.clipboard.writeText(transcriptionElement.textContent)
                .then(() => {
                    const original = copyTranscriptionButton.textContent;
                    copyTranscriptionButton.textContent = 'Gekopieerd!';
                    setTimeout(() => copyTranscriptionButton.textContent = original, 2000);
                })
                .catch(err => alert('Kon transcriptie niet naar klembord kopiëren'));
        });
    }
}

function resetUI() {
    if (transcriptionContainer) transcriptionContainer.classList.add('hidden');
    if (transcriptionElement) transcriptionElement.textContent = '';
    if (statusElement) statusElement.textContent = 'Klaar om op te nemen';
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop());
        isRecording = false;
        if (recordButton) {
            recordButton.textContent = 'Start Opname';
            recordButton.classList.remove('recording');
        }
    }
}

function checkBrowserType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    isDesktopBrowser = !/android|iphone|ipad|ipod|mobile|phone/i.test(userAgent);
    if (!window.MediaRecorder) {
        alert('Je browser ondersteunt geen audio-opname. Probeer Chrome, Firefox of Edge.');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Je browser ondersteunt geen toegang tot de microfoon. Probeer Chrome, Firefox of Edge.');
    }
}

async function toggleRecording() {
    if (!isRecording) {
        try {
            statusElement.textContent = 'Microfoon toegang aanvragen...';
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.addEventListener('dataavailable', e => {
                if (e.data.size > 0) audioChunks.push(e.data);
            });
            mediaRecorder.addEventListener('stop', async () => {
                statusElement.textContent = 'Verwerken...';
                await processAudio();
            });
            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = 'Stop Opname';
            recordButton.classList.add('recording');
            statusElement.textContent = 'Opname... Spreek duidelijk in je microfoon';
            recordingTimer = setTimeout(() => { isRecording && toggleRecording(); }, MAX_RECORDING_TIME);
        } catch (e) {
            statusElement.textContent = 'Fout: Kon geen toegang krijgen tot de microfoon';
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        if (recordingTimer) { clearTimeout(recordingTimer); recordingTimer = null; }
        if (mediaRecorder && mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop());
        isRecording = false;
        recordButton.textContent = 'Start Opname';
        recordButton.classList.remove('recording');
    }
}

async function processAudio() {
    if (audioChunks.length === 0) {
        statusElement.textContent = 'Geen audio opgenomen om te verwerken';
        return;
    }
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, `recording${Date.now()}.webm`);
    formData.append('model', 'whisper-1');
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
    });
    if (!transcriptionResponse.ok) {
        statusElement.textContent = 'Fout bij transcriptie ophalen';
        return;
    }
    const data = await transcriptionResponse.json();
    transcriptionContainer.classList.remove('hidden');
    transcriptionElement.textContent = data.text || '';
    statusElement.textContent = 'Klaar om op te nemen';
}
