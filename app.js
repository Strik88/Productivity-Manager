// App State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';
let allTasks = []; // Store all tasks

// Check for page refresh
if (window.isPageRefreshed || performance.navigation.type === 1) {
    console.log('Page refresh detected. Initializing in clean state mode.');
}

// Onetime initialization function
function initApp() {
    console.log('Initializing app...');
    
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
        'viewAllTasksButton', 'clearAllTasksButton', 'copyButton'
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

// Voice Recording Functionality
async function toggleRecording() {
    console.log('toggleRecording function called');
    console.log('Current recording state:', isRecording);
    
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
                
                // Improved audio settings for better quality
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000,
                        channelCount: 1
                    }
                });
                
                console.log('Microphone access granted');
                
                // Try preferred options with fallbacks for browser compatibility
                let options = {};
                
                // Test for supported mimeTypes
                const mimeTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/mp4'
                ];
                
                let supportedType = '';
                for (const type of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        supportedType = type;
                        options.mimeType = type;
                        break;
                    }
                }
                
                console.log('Using media type:', supportedType || 'default');
                
                // Add bitrate if supported
                try {
                    options.audioBitsPerSecond = 128000;
                    mediaRecorder = new MediaRecorder(stream, options);
                    console.log('MediaRecorder created with options:', options);
                } catch (e) {
                    console.warn('Advanced audio options not supported, using defaults', e);
                    mediaRecorder = new MediaRecorder(stream);
                    console.log('MediaRecorder created with default options');
                }
                
                audioChunks = [];
                
                mediaRecorder.addEventListener('dataavailable', event => {
                    console.log('Audio data available, size:', event.data.size);
                    audioChunks.push(event.data);
                });
                
                mediaRecorder.addEventListener('start', () => {
                    console.log('MediaRecorder started successfully');
                });
                
                mediaRecorder.addEventListener('stop', async () => {
                    console.log('MediaRecorder stopped, processing chunks...');
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
                mediaRecorder.start();
                isRecording = true;
                recordButton.textContent = preferDutch ? 'Stop Opname' : 'Stop Recording';
                recordButton.classList.add('recording');
                statusElement.textContent = preferDutch ? 
                    'Opname... Spreek duidelijk in je microfoon' : 
                    'Recording... Speak clearly into your microphone';
                    
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
        // Create audio blob and form data
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Default to Dutch for Striks branding
        const preferDutch = true;
        
        // First, transcribe the audio using Whisper API
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        // Using a more advanced Whisper model for better accuracy
        formData.append('model', 'whisper-1');
        // Remove the language parameter to enable auto-detection
        // formData.append('language', 'en');
        // Update prompt to be language-neutral
        formData.append('prompt', 'This recording may contain tasks, to-do items, and reminders in various languages.');
        
        statusElement.textContent = preferDutch ? 'Audio transcriberen...' : 'Transcribing audio...';
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });
        
        if (!transcriptionResponse.ok) {
            const errorData = await transcriptionResponse.json();
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const transcriptionData = await transcriptionResponse.json();
        const transcribedText = transcriptionData.text;
        
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