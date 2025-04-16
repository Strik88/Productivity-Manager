// App State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';
let allTasks = []; // Store all tasks
let recordingTimer = null; // Timer voor maximale opnameduur
const MAX_RECORDING_TIME = 5 * 60 * 1000; // 5 minuten in milliseconden
let isDesktopBrowser = false; // Indicator voor desktop browser

// Check for page refresh
if (window.isPageRefreshed || performance.navigation.type === 1) {
    console.log('Page refresh detected. Initializing in clean state mode.');
}

// Onetime initialization function
function initApp() {
    console.log('Initializing app...');
    
    // Detecteer of we op een desktop browser zitten
    checkBrowserType();
    
    // Check if DOM is already fully loaded by index.html script
    if (window.domIsFullyLoaded) {
        console.log('DOM is already marked as fully loaded. Using pre-existing elements from HTML.');
    }
    
    // Log all DOM elements
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
        tasksContainer: document.getElementById('tasks-container'),
        tasksElement: document.getElementById('tasks'),
        copyButton: document.getElementById('copy-button'),
        copyTranscriptionButton: document.getElementById('copy-transcription-button'),
        viewAllTasksButton: document.getElementById('view-all-tasks-button'),
        clearAllTasksButton: document.getElementById('clear-all-tasks-button')
    };
    
    // Log which elements were found
    let allElementsFound = true;
    let missingElements = [];
    
    Object.entries(elements).forEach(([name, element]) => {
        if (!element) {
            allElementsFound = false;
            missingElements.push(name);
            console.error(`Element not found: ${name}`);
        }
    });
    
    if (!allElementsFound) {
        console.error('Missing elements:', missingElements.join(', '));
        
        // Show error message on page
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.padding = '10px';
        errorMessage.style.margin = '10px';
        errorMessage.style.border = '1px solid red';
        errorMessage.textContent = `Sommige UI elementen konden niet worden gevonden: ${missingElements.join(', ')}`;
        document.body.prepend(errorMessage);
        
        return; // Stop verdere initialisatie als er elementen ontbreken
    }
    
    // Assign to global variables if all elements were found
    window.loginScreen = elements.loginScreen;
    window.appScreen = elements.appScreen;
    window.apiKeyInput = elements.apiKeyInput;
    window.loginButton = elements.loginButton;
    window.logoutButton = elements.logoutButton;
    window.recordButton = elements.recordButton;
    window.statusElement = elements.statusElement;
    window.transcriptionContainer = elements.transcriptionContainer;
    window.transcriptionElement = elements.transcriptionElement;
    window.tasksContainer = elements.tasksContainer;
    window.tasksElement = elements.tasksElement;
    window.copyButton = elements.copyButton;
    window.copyTranscriptionButton = elements.copyTranscriptionButton;
    window.viewAllTasksButton = elements.viewAllTasksButton;
    window.clearAllTasksButton = elements.clearAllTasksButton;
    
    console.log('All UI elements were found successfully');
    
    // Check localStorage for saved API key
    const savedApiKey = localStorage.getItem('voiceTaskApiKey');
    if (savedApiKey) {
        window.apiKey = savedApiKey;
        elements.loginScreen.classList.add('hidden');
        elements.appScreen.classList.remove('hidden');
        
        // Load saved tasks
        loadSavedTasks();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('App initialization complete');
}

// Make sure the DOM is fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Controleer of alle benodigde elementen beschikbaar zijn
    const requiredElements = [
        'loginButton', 'logoutButton', 'recordButton', 
        'viewAllTasksButton', 'clearAllTasksButton', 'copyButton', 'copyTranscriptionButton'
    ];
    
    const missingElements = requiredElements.filter(name => !window[name]);
    if (missingElements.length > 0) {
        console.error('Cannot set up event listeners - missing elements:', missingElements.join(', '));
        return;
    }
    
    console.log('All required elements found for event listeners');
    
    // Login/Logout Handlers
    console.log('Setting up login button event listener');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Login button clicked');
            // Voeg een test toe om te controleren of de elementen correct worden gevonden
            if (!loginButton) console.error('Login button element is null');
            if (!apiKeyInput) console.error('API key input element is null');
            if (!loginScreen) console.error('Login screen element is null');
            if (!appScreen) console.error('App screen element is null');

            // Toon ook de waarde van de input voor debugging
            console.log('Input value:', apiKeyInput.value);
            
            const inputKey = apiKeyInput.value.trim();
            if (inputKey && inputKey.startsWith('sk-')) {
                console.log('Valid API key entered');
                apiKey = inputKey;
                localStorage.setItem('voiceTaskApiKey', apiKey);
                loginScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                
                // Load saved tasks
                loadSavedTasks();
            } else {
                console.log('Invalid API key');
                alert('Voer een geldige OpenAI API key in die begint met "sk-"');
            }
        });
    } else {
        console.error('Login button not found, cannot add click event listener');
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiKey = '';
            localStorage.removeItem('voiceTaskApiKey');
            appScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            resetUI();
        });
    } else {
        console.error('Logout button not found, cannot add click event listener');
    }
    
    if (viewAllTasksButton) {
        viewAllTasksButton.addEventListener('click', () => {
            // Default to Dutch for Striks branding
            const preferDutch = true;
            
            if (allTasks.length > 0) {
                displayTasks(allTasks);
                statusElement.textContent = preferDutch ? 'Alle opgeslagen taken weergeven' : 'Displaying all saved tasks';
            } else {
                tasksContainer.classList.remove('hidden');
                tasksElement.innerHTML = preferDutch ? 
                    '<p>Er zijn nog geen taken opgeslagen.</p>' : 
                    '<p>No tasks have been saved yet.</p>';
                statusElement.textContent = preferDutch ? 'Geen taken gevonden' : 'No tasks found';
            }
        });
    } else {
        console.error('View all tasks button not found, cannot add click event listener');
    }

    if (clearAllTasksButton) {
        clearAllTasksButton.addEventListener('click', () => {
            // Default to Dutch for Striks branding
            const preferDutch = true;
            
            const confirmMessage = preferDutch ? 
                'Weet je zeker dat je alle taken wilt wissen?' : 
                'Are you sure you want to delete all tasks?';
                
            if (confirm(confirmMessage)) {
                allTasks = [];
                saveTasks();
                tasksContainer.classList.remove('hidden');
                tasksElement.innerHTML = preferDutch ? 
                    '<p>Alle taken zijn gewist.</p>' : 
                    '<p>All tasks have been cleared.</p>';
                statusElement.textContent = preferDutch ? 'Alle taken gewist' : 'All tasks cleared';
            }
        });
    } else {
        console.error('Clear all tasks button not found, cannot add click event listener');
    }
    
    // Voice Recording Functionality
    console.log('Setting up record button event listener');
    if (recordButton) {
        console.log('Record button element found:', recordButton);
        recordButton.addEventListener('click', function(event) {
            console.log('Record button clicked', event);
            console.log('Button text:', recordButton.textContent);
            console.log('Recording state before toggle:', isRecording);
            toggleRecording();
        });
        console.log('Record button event listener added successfully');
    } else {
        console.error('Record button not found, cannot add click event listener');
    }
    
    // Copy to clipboard functionality
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const taskElements = document.querySelectorAll('.task-item');
            let clipboardText = '';
            
            taskElements.forEach(taskElement => {
                const title = taskElement.querySelector('h3').textContent;
                const metadata = taskElement.querySelectorAll('.task-metadata span');
                
                clipboardText += `- ${title}\n`;
                metadata.forEach(item => {
                    clipboardText += `  ${item.textContent}\n`;
                });
                clipboardText += '\n';
            });
            
            navigator.clipboard.writeText(clipboardText)
                .then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Gekopieerd!';
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Kon taken niet naar klembord kopiëren');
                });
        });
    } else {
        console.error('Copy button not found, cannot add click event listener');
    }
    
    // Copy transcription to clipboard functionality
    if (copyTranscriptionButton) {
        copyTranscriptionButton.addEventListener('click', () => {
            const transcriptionText = transcriptionElement.textContent;
            
            navigator.clipboard.writeText(transcriptionText)
                .then(() => {
                    const originalText = copyTranscriptionButton.textContent;
                    copyTranscriptionButton.textContent = 'Gekopieerd!';
                    setTimeout(() => {
                        copyTranscriptionButton.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy transcription: ', err);
                    alert('Kon transcriptie niet naar klembord kopiëren');
                });
        });
    } else {
        console.error('Copy transcription button not found, cannot add click event listener');
    }
}

// Task management functions
function loadSavedTasks() {
    const savedTasks = localStorage.getItem('voiceTasks');
    if (savedTasks) {
        allTasks = JSON.parse(savedTasks);
        if (allTasks.length > 0) {
            displayTasks(allTasks);
            updateUILanguage();
        }
    }
}

function saveTasks() {
    localStorage.setItem('voiceTasks', JSON.stringify(allTasks));
    updateUILanguage();
}

// Update UI language based on the majority of tasks
function updateUILanguage() {
    const isDutchUI = allTasks.length > 0 && 
                     allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
    
    // Default to Dutch for Striks branding
    const preferDutch = true; // Altijd Nederlands voor Striks
    
    // Update button text
    if (viewAllTasksButton) viewAllTasksButton.textContent = preferDutch ? 'Alle Taken Weergeven' : 'View All Tasks';
    if (clearAllTasksButton) clearAllTasksButton.textContent = preferDutch ? 'Alle Taken Wissen' : 'Clear All Tasks';
    if (copyButton) copyButton.textContent = preferDutch ? 'Kopieer Alle Taken' : 'Copy All Tasks';
    if (copyTranscriptionButton) copyTranscriptionButton.textContent = preferDutch ? 'Kopieer Transcriptie' : 'Copy Transcription';
    
    // Update status message if it's showing a standard message
    if (statusElement && (statusElement.textContent === 'Ready to record new tasks' || 
        statusElement.textContent === 'Klaar om nieuwe taken op te nemen')) {
        statusElement.textContent = preferDutch ? 'Klaar om nieuwe taken op te nemen' : 'Ready to record new tasks';
    }
    
    // Update record button if it's not currently recording
    if (recordButton && !isRecording) {
        recordButton.textContent = preferDutch ? 'Start Opname' : 'Start Recording';
    }
}

function deleteTask(index) {
    allTasks.splice(index, 1);
    saveTasks();
    displayTasks(allTasks);
}

// Function to detect browser type and capabilities
function checkBrowserType() {
    // Detecteer of we op desktop of mobiel zitten
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    isDesktopBrowser = !/android|iphone|ipad|ipod|mobile|phone/i.test(userAgent);
    
    console.log('Browser detection:', {
        userAgent,
        isDesktopBrowser,
        isChrome: /chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent),
        isFirefox: /firefox/i.test(userAgent),
        isSafari: /safari/i.test(userAgent) && !/chrome|chromium|edg/i.test(userAgent),
        isEdge: /edge|edg/i.test(userAgent)
    });
    
    // Toon waarschuwing voor desktop browsers
    if (isDesktopBrowser) {
        const browserWarning = document.getElementById('browser-warning');
        if (browserWarning) {
            browserWarning.classList.remove('hidden');
        }
        
        // Op desktops kunnen we ook een eenvoudige audiotest doen
        testAudioInput();
    }
    
    // Controleer of de browser MediaRecorder ondersteunt
    if (!window.MediaRecorder) {
        console.error('MediaRecorder API niet ondersteund in deze browser');
        alert('Je browser ondersteunt geen audio-opname. Probeer Chrome, Firefox of Edge.');
    }
    
    // Controleer of getUserMedia wordt ondersteund
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia API niet ondersteund in deze browser');
        alert('Je browser ondersteunt geen toegang tot de microfoon. Probeer Chrome, Firefox of Edge.');
    }
}

// Functie om te testen of audio-input werkt
async function testAudioInput() {
    console.log('Testing audio input capabilities...');
    try {
        // Controleer eerst of we toegang hebben tot de microfoon
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('Microphone access granted for test');
        
        // Controleer of we daadwerkelijk audio-tracks hebben
        const audioTracks = stream.getAudioTracks();
        console.log(`Audio tracks detected: ${audioTracks.length}`);
        
        if (audioTracks.length > 0) {
            const track = audioTracks[0];
            console.log('Audio track info:', {
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                settings: track.getSettings()
            });
            
            // Test of we een volume kunnen detecteren
            try {
                // Alleen testen in browsers die dit ondersteunen
                if (window.AudioContext || window.webkitAudioContext) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioContext();
                    const analyser = audioContext.createAnalyser();
                    const microphone = audioContext.createMediaStreamSource(stream);
                    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
                    
                    analyser.smoothingTimeConstant = 0.8;
                    analyser.fftSize = 1024;
                    
                    microphone.connect(analyser);
                    analyser.connect(scriptProcessor);
                    scriptProcessor.connect(audioContext.destination);
                    
                    let testTimeoutId;
                    let volumeDetected = false;
                    
                    scriptProcessor.onaudioprocess = function() {
                        const array = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(array);
                        const arraySum = array.reduce((a, value) => a + value, 0);
                        const average = arraySum / array.length;
                        
                        // Test of we enig geluid detecteren
                        if (average > 5) {
                            console.log(`Audio level detected: ${average}`);
                            volumeDetected = true;
                        }
                    };
                    
                    // Stop de test na 3 seconden
                    testTimeoutId = setTimeout(() => {
                        scriptProcessor.disconnect();
                        analyser.disconnect();
                        microphone.disconnect();
                        
                        if (audioContext.state !== 'closed') {
                            audioContext.close();
                        }
                        
                        if (!volumeDetected) {
                            console.warn('No audio volume detected during microphone test');
                        } else {
                            console.log('Microphone test successful - volume detected');
                        }
                        
                        // Stop de tracks
                        stream.getTracks().forEach(track => track.stop());
                    }, 3000);
                }
            } catch (audioTestError) {
                console.error('Error during advanced audio test:', audioTestError);
                // Stop de tracks bij een fout
                stream.getTracks().forEach(track => track.stop());
            }
        } else {
            console.warn('No audio tracks found in test stream');
            // Stop de stream omdat we hem niet nodig hebben
            stream.getTracks().forEach(track => track.stop());
        }
    } catch (err) {
        console.error('Microphone test failed:', err);
    }
}

// Voice Recording Functionality
async function toggleRecording() {
    console.log('toggleRecording function called');
    console.log('Current recording state:', isRecording);
    console.log('Running on desktop browser:', isDesktopBrowser);
    
    // Default to Dutch for Striks branding
    const preferDutch = true;
                     
    if (!isRecording) {
        // Start recording
        try {
            console.log('Attempting to start recording...');
            
            // Request microphone permissions explicitly first
            console.log('Checking for microphone permissions...');
            
            try {
                // Show message to user that we're requesting permissions
                if (statusElement) {
                    statusElement.textContent = preferDutch ? 
                        'Microfoon toegang aanvragen...' : 
                        'Requesting microphone access...';
                }
                
                // Pas audio-instellingen aan op basis van browser type
                const audioConstraints = {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                };
                
                if (isDesktopBrowser) {
                    // Expliciete instellingen voor desktop browsers
                    audioConstraints.channelCount = 1;
                    
                    // Sommige oudere desktop browsers hebben specifieke instellingen nodig
                    if (/firefox/i.test(navigator.userAgent)) {
                        console.log('Configuring Firefox-specific audio settings');
                        // Firefox heeft soms meer algemene instellingen nodig
                    } else if (/edge|edg/i.test(navigator.userAgent)) {
                        console.log('Configuring Edge-specific audio settings');
                        // Edge kan soms problemen hebben met bepaalde constraints
                    }
                }
                
                console.log('Using audio constraints:', audioConstraints);
                
                // Improved audio settings for better quality
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints
                });
                
                console.log('Microphone access granted');
                console.log('Audio tracks:', stream.getAudioTracks().length);
                console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
                console.log('Audio track constraints:', stream.getAudioTracks()[0]?.getConstraints());
                
                // Try preferred options with fallbacks for browser compatibility
                let options = {};
                
                // Test for supported mimeTypes
                const mimeTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/mp4',
                    'audio/mpeg'
                ];
                
                let supportedType = '';
                for (const type of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        supportedType = type;
                        options.mimeType = type;
                        console.log(`Found supported mime type: ${type}`);
                        break;
                    } else {
                        console.log(`Mime type not supported: ${type}`);
                    }
                }
                
                console.log('Using media type:', supportedType || 'default');
                
                // Fallback voor instellingen als er geen gewenste mimeType werkt
                if (!supportedType) {
                    console.warn('No preferred MIME type is supported, using default');
                    // Op sommige browsers werkt het beter zonder mimeType specificatie
                    delete options.mimeType;
                }
                
                // Add bitrate if supported
                try {
                    // Desktops hebben vaak meer ruimte voor hogere kwaliteit
                    options.audioBitsPerSecond = isDesktopBrowser ? 128000 : 64000;
                    console.log('Creating MediaRecorder with options:', options);
                    mediaRecorder = new MediaRecorder(stream, options);
                    console.log('MediaRecorder created with options:', options);
                } catch (e) {
                    console.warn('Advanced audio options not supported, using defaults', e);
                    // Probeer met minimale opties als de uitgebreide opties niet werken
                    try {
                        console.log('Trying to create MediaRecorder with minimal options');
                        mediaRecorder = new MediaRecorder(stream);
                        console.log('MediaRecorder created with default options');
                    } catch (fallbackError) {
                        console.error('Even basic MediaRecorder setup failed:', fallbackError);
                        throw new Error('Je browser ondersteunt geen audio-opname. Probeer een andere browser.');
                    }
                }
                
                audioChunks = [];
                
                // Meer uitgebreide event handlers voor betere debugging en error handling
                mediaRecorder.addEventListener('dataavailable', event => {
                    console.log('Audio data available, size:', event.data.size);
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        console.log('Total audio chunks:', audioChunks.length);
                    } else {
                        console.warn('Received empty audio data chunk');
                    }
                });
                
                mediaRecorder.addEventListener('start', () => {
                    console.log('MediaRecorder started successfully');
                    console.log('MediaRecorder state:', mediaRecorder.state);
                    console.log('MediaRecorder mimeType:', mediaRecorder.mimeType);
                });
                
                mediaRecorder.addEventListener('stop', async () => {
                    console.log('MediaRecorder stopped, processing chunks...');
                    console.log('Final chunk count:', audioChunks.length);
                    
                    if (audioChunks.length === 0 || audioChunks.every(chunk => chunk.size === 0)) {
                        console.error('No audio data was recorded');
                        statusElement.textContent = preferDutch ? 
                            'Geen audio opgenomen. Controleer of je microfoon werkt en toegang heeft.' : 
                            'No audio was recorded. Check if your microphone is working and has access.';
                        
                        // Toon helpbericht voor gebruiker
                        const noAudioHelp = document.createElement('div');
                        noAudioHelp.style.backgroundColor = '#ffe8e8';
                        noAudioHelp.style.padding = '15px';
                        noAudioHelp.style.margin = '15px 0';
                        noAudioHelp.style.borderRadius = '5px';
                        noAudioHelp.style.border = '1px solid #d00';
                        noAudioHelp.innerHTML = preferDutch ? 
                            '<strong>Probleem met audio-opname</strong><br>Tips:<br>- Controleer of je microfoon werkt<br>- Zorg dat de browser toestemming heeft<br>- Probeer het opnieuw met een andere browser<br>- Probeer de pagina te herladen' : 
                            '<strong>Audio recording issue</strong><br>Tips:<br>- Check if your microphone is working<br>- Ensure browser has permission<br>- Try again with a different browser<br>- Try reloading the page';
                        
                        statusElement.parentNode.insertBefore(noAudioHelp, statusElement.nextSibling);
                        
                        recordButton.disabled = false;
                        return;
                    }
                    
                    recordButton.disabled = true;
                    statusElement.textContent = preferDutch ? 'Audio verwerken...' : 'Processing audio...';
                    await processAudio();
                    recordButton.disabled = false;
                });
                
                mediaRecorder.addEventListener('error', (e) => {
                    console.error('MediaRecorder error:', e);
                    statusElement.textContent = preferDutch ? 
                        `Opname fout: ${e.message}` : 
                        `Recording error: ${e.message}`;
                });
                
                console.log('Starting MediaRecorder...');
                // Set timeslice to receive data more frequently (every 1 second instead of only at the end)
                mediaRecorder.start(1000);
                console.log('MediaRecorder state after start:', mediaRecorder.state);
                isRecording = true;
                recordButton.textContent = preferDutch ? 'Stop Opname' : 'Stop Recording';
                recordButton.classList.add('recording');
                statusElement.textContent = preferDutch ? 
                    'Opname... Spreek duidelijk in je microfoon' : 
                    'Recording... Speak clearly into your microphone';
                    
                // Start timer voor maximale opnameduur
                recordingTimer = setTimeout(() => {
                    if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
                        console.log('Maximale opnametijd bereikt (5 minuten), opname wordt automatisch gestopt');
                        toggleRecording(); // Stop de opname
                        
                        // Toon feedback aan de gebruiker
                        const maxTimeMessage = document.createElement('div');
                        maxTimeMessage.style.backgroundColor = '#fff3cd';
                        maxTimeMessage.style.color = '#856404';
                        maxTimeMessage.style.padding = '10px';
                        maxTimeMessage.style.margin = '10px 0';
                        maxTimeMessage.style.borderRadius = '5px';
                        maxTimeMessage.style.border = '1px solid #ffeeba';
                        maxTimeMessage.textContent = preferDutch ? 
                            'De opname is automatisch gestopt na 5 minuten.' : 
                            'Recording automatically stopped after 5 minutes.';
                        
                        // Voeg het bericht toe na de status tekst
                        statusElement.parentNode.insertBefore(maxTimeMessage, statusElement.nextSibling);
                        
                        // Verwijder het bericht na 5 seconden
                        setTimeout(() => {
                            maxTimeMessage.remove();
                        }, 5000);
                    }
                }, MAX_RECORDING_TIME);
                    
                console.log('Recording started successfully');
                
            } catch (permissionError) {
                console.error('Microphone permission error:', permissionError);
                
                // Check if this was a permission error
                if (permissionError.name === 'NotAllowedError' || 
                    permissionError.name === 'PermissionDeniedError') {
                    
                    statusElement.textContent = preferDutch ? 
                        'Geen toegang tot microfoon - controleer browser toestemmingen' : 
                        'No microphone access - check browser permissions';
                        
                    // Create a helpful message for the user
                    const helpMessage = document.createElement('div');
                    helpMessage.style.backgroundColor = '#ffe8e8';
                    helpMessage.style.padding = '15px';
                    helpMessage.style.margin = '15px 0';
                    helpMessage.style.borderRadius = '5px';
                    helpMessage.style.border = '1px solid #d00';
                    helpMessage.innerHTML = preferDutch ? 
                        '<strong>Microfoon toegang geweigerd</strong><br>Ga naar je browser instellingen om microfoon toegang toe te staan voor deze site.' : 
                        '<strong>Microphone access denied</strong><br>Please check your browser settings to allow microphone access for this site.';
                    
                    // Insert after the status message
                    statusElement.parentNode.insertBefore(helpMessage, statusElement.nextSibling);
                    
                } else {
                    statusElement.textContent = preferDutch ? 
                        `Fout bij starten opname: ${permissionError.message}` : 
                        `Error starting recording: ${permissionError.message}`;
                }
            }
        } catch (error) {
            console.error('General error accessing microphone:', error);
            statusElement.textContent = preferDutch ? 
                'Fout: Kon geen toegang krijgen tot de microfoon' : 
                'Error: Could not access microphone';
        }
    } else {
        // Stop recording
        console.log('Stopping recording...');
        try {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                console.log('MediaRecorder stopped');
            } else {
                console.warn('MediaRecorder not active when trying to stop');
            }
            
            // Maak de timer ongedaan
            if (recordingTimer) {
                clearTimeout(recordingTimer);
                recordingTimer = null;
            }
            
            isRecording = false;
            recordButton.textContent = preferDutch ? 'Start Opname' : 'Start Recording';
            recordButton.classList.remove('recording');
            statusElement.textContent = preferDutch ? 'Verwerken...' : 'Processing...';
            
            // Stop all tracks on the stream
            if (mediaRecorder && mediaRecorder.stream) {
                console.log('Stopping all media tracks...');
                mediaRecorder.stream.getTracks().forEach(track => {
                    console.log('Stopping track:', track.kind);
                    track.stop();
                });
            }
        } catch (stopError) {
            console.error('Error stopping recording:', stopError);
            statusElement.textContent = preferDutch ? 
                `Fout bij stoppen opname: ${stopError.message}` : 
                `Error stopping recording: ${stopError.message}`;
        }
    }
}

async function processAudio() {
    try {
        // Default to Dutch for Striks branding
        const preferDutch = true;
        
        if (audioChunks.length === 0) {
            console.error('No audio chunks to process');
            statusElement.textContent = preferDutch ? 
                'Geen audio opgenomen om te verwerken' : 
                'No audio recorded to process';
            return;
        }
        
        // Log information about audio chunks for debugging
        console.log(`Processing ${audioChunks.length} audio chunks`);
        audioChunks.forEach((chunk, index) => {
            console.log(`Chunk ${index}: ${chunk.size} bytes, type: ${chunk.type}`);
        });
        
        // Bepaal het juiste MIME type voor de Blob
        let blobType = 'audio/webm';
        
        // Als we een mediaRecorder hebben, gebruik dan de mimeType daarvan
        if (mediaRecorder && mediaRecorder.mimeType) {
            blobType = mediaRecorder.mimeType;
            console.log(`Using MediaRecorder mimeType: ${blobType}`);
        } else if (audioChunks.length > 0 && audioChunks[0].type) {
            // Als de chunks een type hebben, gebruik dat
            blobType = audioChunks[0].type;
            console.log(`Using audio chunk type: ${blobType}`);
        } else {
            console.log(`Falling back to default type: ${blobType}`);
        }
        
        // Create audio blob and form data
        const audioBlob = new Blob(audioChunks, { type: blobType });
        console.log(`Created audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        // Check of de blob geldig is
        if (audioBlob.size === 0) {
            throw new Error('Opgenomen audiobestand is leeg. Probeer het opnieuw.');
        }
        
        // First, transcribe the audio using Whisper API
        const formData = new FormData();
        formData.append('file', audioBlob, `recording${Date.now()}.webm`);
        // Using a more advanced Whisper model for better accuracy
        formData.append('model', 'whisper-1');
        // Remove the language parameter to enable auto-detection
        // formData.append('language', 'en');
        // Update prompt to be language-neutral
        formData.append('prompt', 'This recording may contain tasks, to-do items, and reminders in various languages.');
        
        console.log('Sending audio data to Whisper API for transcription');
        // Log de grootte van het bestand dat we versturen
        console.log(`Sending audio blob to Whisper API: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        statusElement.textContent = preferDutch ? 'Audio transcriberen...' : 'Transcribing audio...';
        
        // Voeg een timer toe om te detecteren of de API-aanroep vast komt te zitten
        const apiTimeoutTimer = setTimeout(() => {
            console.warn('Whisper API request appears to be stalled (30 seconds with no response)');
            statusElement.textContent = preferDutch ? 
                'API verzoek duurt lang... probeer een kortere opname of controleer je API-sleutel' : 
                'API request is taking a long time... try a shorter recording or check your API key';
        }, 30000); // 30 seconden timeout
        
        console.log('Initiating fetch request to Whisper API with API key starting with:', apiKey.substring(0, 15) + '...');
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });
        
        // Verwijder de timeout omdat we een antwoord hebben gekregen
        clearTimeout(apiTimeoutTimer);
        
        console.log('Whisper API response status:', transcriptionResponse.status);
        console.log('Whisper API response headers:', Object.fromEntries([...transcriptionResponse.headers.entries()]));
        
        if (!transcriptionResponse.ok) {
            const errorText = await transcriptionResponse.text();
            console.error('Whisper API error response text:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error('Whisper API error:', errorData);
                throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
            } catch (jsonError) {
                // Als het geen JSON is, gebruik de ruwe tekst
                throw new Error(`API Error: ${errorText || 'Unknown error'}`);
            }
        }
        
        // Log timing information
        console.log('Whisper API response received successfully');
                    
        const transcriptionText = await transcriptionResponse.text();
        console.log('Raw response text:', transcriptionText.substring(0, 500) + (transcriptionText.length > 500 ? '...' : ''));
        
        let transcriptionData;
        try {
            transcriptionData = JSON.parse(transcriptionText);
            console.log('Whisper API response data:', transcriptionData);
        } catch (jsonError) {
            console.error('Error parsing JSON from Whisper API response:', jsonError);
            throw new Error('Kon de API-respons niet verwerken (JSON parsing error)');
        }
        
        if (!transcriptionData.text || transcriptionData.text.trim() === '') {
            console.warn('Whisper API returned empty transcription');
            throw new Error('Geen spraak gedetecteerd in de opname. Probeer opnieuw en spreek duidelijk in de microfoon.');
        }
        
        const transcribedText = transcriptionData.text;
        console.log('Transcribed text:', transcribedText);
        
        // Display transcription
        transcriptionContainer.classList.remove('hidden');
        transcriptionElement.textContent = transcribedText;
        
        // Detect if the transcribed text is in Dutch
        const isDutchText = detectDutchLanguage(transcribedText);
        
        // Now, process the transcription using GPT to extract tasks
        statusElement.textContent = preferDutch ? 'Taken extraheren...' : 'Extracting tasks...';
        
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Using a more advanced model for better understanding
                messages: [
                    {
                        role: 'system',
                        content: `You are a specialized task extraction and processing system that works with both Dutch and English. Analyze the text and extract actionable tasks, even if they are described in a conversational or indirect manner.

First, detect the language of the input (Dutch or English).

Return the result as a JSON array where each task object has: 
1. task: The task description (clear, concise, actionable) in the SAME LANGUAGE as the input
2. criticality: Priority level (low/laag, normal/normaal, high/hoog, very high/zeer hoog)
3. due_date: Due date if mentioned (in YYYY-MM-DD format) or null if not specified
4. category: Best guess at category (Work/Werk, Family/Familie, Household/Huishouden, Personal/Persoonlijk, etc.)

For Dutch input, return Dutch task descriptions and Dutch category names. For English input, return English task descriptions and English category names. The criticality should match the language of the input.

Specific instructions:
- Infer priority based on language used
- Extract dates even if mentioned relatively (tomorrow/morgen, next week/volgende week, in two days/over twee dagen)
- If multiple tasks are mentioned, create separate entries for each
- If the speaker mentions a project, associate relevant tasks with that project
- Be flexible with informal language but deliver structured tasks
- Make task descriptions clear and actionable even if input is vague

Examples for English:
For "I need to call John about the project by tomorrow and also remember to send the report": 
[
  {"task":"Call John about the project", "criticality":"normal", "due_date":"2024-05-21", "category":"Work"},
  {"task":"Send the report", "criticality":"normal", "due_date":null, "category":"Work"}
]

Examples for Dutch:
For "Ik moet morgen Jan bellen over het project en ook niet vergeten het rapport te versturen": 
[
  {"task":"Jan bellen over het project", "criticality":"normaal", "due_date":"2024-05-21", "category":"Werk"},
  {"task":"Het rapport versturen", "criticality":"normaal", "due_date":null, "category":"Werk"}
]

Return tasks as a valid JSON array with no extra text.`
                    },
                    { role: 'user', content: transcribedText }
                ],
                temperature: 0.3 // Lower temperature for more consistent, focused responses
            })
        });
        
        if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const chatData = await chatResponse.json();
        let tasksArray = [];
        
        try {
            // Parse the response to extract the tasks
            const content = chatData.choices[0].message.content.trim();
            // Attempt to extract JSON if it's wrapped in markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\[([\s\S]*)\]/);
            const jsonString = jsonMatch ? jsonMatch[1] : content;
            tasksArray = JSON.parse(jsonString.includes('[') ? jsonString : `[${jsonString}]`);
        } catch (parseError) {
            console.error('Error parsing tasks:', parseError);
            throw new Error('Failed to parse tasks from AI response');
        }
        
        // Add timestamp to each task
        tasksArray = tasksArray.map(task => ({
            ...task,
            timestamp: new Date().toISOString()
        }));
        
        // Add the new tasks to our storage
        allTasks = [...allTasks, ...tasksArray];
        saveTasks();
        
        // Display all tasks
        displayTasks(allTasks);
        statusElement.textContent = preferDutch ? 
            'Klaar om nieuwe taken op te nemen' : 
            'Ready to record new tasks';
        
    } catch (error) {
        console.error('Error processing audio:', error);
        
        // Default to Dutch for Striks branding
        const preferDutch = true;
                         
        statusElement.textContent = preferDutch ? 
            `Fout: ${error.message}` : 
            `Error: ${error.message}`;
    }
}

// Function to detect if text is likely Dutch
function detectDutchLanguage(text) {
    const dutchWords = ['ik', 'je', 'het', 'de', 'en', 'een', 'dat', 'is', 'in', 'te', 'van', 'niet', 
                        'zijn', 'op', 'voor', 'met', 'als', 'maar', 'om', 'aan', 'er', 'nog', 'ook',
                        'moet', 'kan', 'zal', 'wil', 'gaan', 'maken', 'doen', 'hebben', 'worden',
                        'morgen', 'vandaag', 'gisteren', 'volgende', 'week', 'maand'];
    
    // Convert to lowercase and split into words
    const words = text.toLowerCase().split(/\s+/);
    
    // Count Dutch words
    const dutchWordCount = words.filter(word => dutchWords.includes(word)).length;
    
    // If more than 15% of words are recognized Dutch words, consider it Dutch
    return dutchWordCount / words.length > 0.15;
}

function displayTasks(tasks) {
    tasksContainer.classList.remove('hidden');
    tasksElement.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksElement.innerHTML = '<p>Geen taken gevonden. Probeer opnieuw op te nemen met duidelijkere instructies.</p>';
        return;
    }
    
    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
        // Voeg category class toe voor styling
        if (task.category) {
            const categoryLower = task.category.toLowerCase();
            if (categoryLower.includes('werk') || categoryLower.includes('work')) {
                taskElement.classList.add('task-category-werk');
            } else if (categoryLower.includes('familie') || categoryLower.includes('family')) {
                taskElement.classList.add('task-category-familie');
            } else if (categoryLower.includes('huishouden') || categoryLower.includes('household')) {
                taskElement.classList.add('task-category-huishouden');
            } else if (categoryLower.includes('persoonlijk') || categoryLower.includes('personal')) {
                taskElement.classList.add('task-category-persoonlijk');
            }
        }
        
        // Voeg priority class toe voor styling
        if (task.criticality) {
            const criticalityLower = task.criticality.toLowerCase();
            if (criticalityLower.includes('high') || criticalityLower.includes('hoog') || 
                criticalityLower.includes('very') || criticalityLower.includes('zeer')) {
                taskElement.classList.add('priority-high');
            }
        }
        
        // Format due date
        let dueDateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString() : 
                                            (isTaskInDutch(task) ? 'Geen einddatum' : 'No due date');
        
        // Format priority label
        let priorityLabel = isTaskInDutch(task) ? 'Prioriteit: ' : 'Priority: ';
        
        // Format category label
        let categoryLabel = isTaskInDutch(task) ? 'Categorie: ' : 'Category: ';
        
        taskElement.innerHTML = `
            <div class="task-header">
                <h3>${task.task}</h3>
                <button class="delete-task-button" data-index="${index}">×</button>
            </div>
            <div class="task-metadata">
                <span>${priorityLabel}${task.criticality || 'normaal'}</span>
                <span>${isTaskInDutch(task) ? 'Deadline: ' : 'Due: '}${dueDateDisplay}</span>
                <span>${categoryLabel}${task.category || (isTaskInDutch(task) ? 'Overig' : 'Uncategorized')}</span>
            </div>
        `;
        
        tasksElement.appendChild(taskElement);
        
        // Add delete button event listener
        const deleteButton = taskElement.querySelector('.delete-task-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskIndex = parseInt(e.target.getAttribute('data-index'));
            deleteTask(taskIndex);
        });
    });
}

// Helper function to detect if a task is in Dutch
function isTaskInDutch(task) {
    // Check for Dutch criticality values
    const dutchCriticalities = ['laag', 'normaal', 'hoog', 'zeer hoog'];
    if (dutchCriticalities.includes(task.criticality?.toLowerCase())) {
        return true;
    }
    
    // Check for Dutch category values
    const dutchCategories = ['werk', 'familie', 'huishouden', 'persoonlijk', 'overig'];
    if (task.category && dutchCategories.some(cat => task.category.toLowerCase().includes(cat))) {
        return true;
    }
    
    return false;
}

function resetUI() {
    if (transcriptionContainer) transcriptionContainer.classList.add('hidden');
    if (tasksContainer) tasksContainer.classList.add('hidden');
    if (transcriptionElement) transcriptionElement.textContent = '';
    if (tasksElement) tasksElement.innerHTML = '';
    
    // Get current UI language preference
    const isDutchUI = allTasks.length > 0 && 
                     allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
                     
    if (statusElement) {
        statusElement.textContent = isDutchUI ? 'Klaar om op te nemen' : 'Ready to record';
    }
    
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        isRecording = false;
        if (recordButton) {
            recordButton.textContent = isDutchUI ? 'Start Opname' : 'Start Recording';
            recordButton.classList.remove('recording');
        }
    }
} 