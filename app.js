// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const apiKeyInput = document.getElementById('api-key-input');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const recordButton = document.getElementById('record-button');
const statusElement = document.getElementById('status');
const transcriptionContainer = document.getElementById('transcription-container');
const transcriptionElement = document.getElementById('transcription');
const tasksContainer = document.getElementById('tasks-container');
const tasksElement = document.getElementById('tasks');
const copyButton = document.getElementById('copy-button');

// Add new DOM elements for task management
const viewAllTasksButton = document.createElement('button');
viewAllTasksButton.id = 'view-all-tasks-button';
viewAllTasksButton.className = 'secondary-button';
viewAllTasksButton.textContent = 'View All Tasks';
viewAllTasksButton.style.marginRight = '10px';

const clearAllTasksButton = document.createElement('button');
clearAllTasksButton.id = 'clear-all-tasks-button';
clearAllTasksButton.className = 'secondary-button danger';
clearAllTasksButton.textContent = 'Clear All Tasks';

// Insert buttons next to the logout button
document.querySelector('.controls').insertBefore(viewAllTasksButton, logoutButton);
document.querySelector('.controls').insertBefore(clearAllTasksButton, logoutButton);

// App State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';
let allTasks = []; // Store all tasks

// Check if we have a saved API key and tasks
window.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('voiceTaskApiKey');
    if (savedApiKey) {
        apiKey = savedApiKey;
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        // Load saved tasks
        loadSavedTasks();
    }
});

// Login/Logout Handlers
loginButton.addEventListener('click', () => {
    const inputKey = apiKeyInput.value.trim();
    if (inputKey && inputKey.startsWith('sk-')) {
        apiKey = inputKey;
        localStorage.setItem('voiceTaskApiKey', apiKey);
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        // Load saved tasks
        loadSavedTasks();
    } else {
        alert('Please enter a valid OpenAI API key starting with "sk-"');
    }
});

logoutButton.addEventListener('click', () => {
    apiKey = '';
    localStorage.removeItem('voiceTaskApiKey');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    resetUI();
});

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
    
    // Update button text
    viewAllTasksButton.textContent = isDutchUI ? 'Alle Taken Weergeven' : 'View All Tasks';
    clearAllTasksButton.textContent = isDutchUI ? 'Alle Taken Wissen' : 'Clear All Tasks';
    copyButton.textContent = isDutchUI ? 'Kopieer Alle Taken' : 'Copy All Tasks';
    
    // Update status message if it's showing a standard message
    if (statusElement.textContent === 'Ready to record new tasks' || 
        statusElement.textContent === 'Klaar om nieuwe taken op te nemen') {
        statusElement.textContent = isDutchUI ? 'Klaar om nieuwe taken op te nemen' : 'Ready to record new tasks';
    }
    
    // Update record button if it's not currently recording
    if (!isRecording) {
        recordButton.textContent = isDutchUI ? 'Start Opname' : 'Start Recording';
    }
}

viewAllTasksButton.addEventListener('click', () => {
    const isDutchUI = allTasks.length > 0 && 
                     allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
    
    if (allTasks.length > 0) {
        displayTasks(allTasks);
        statusElement.textContent = isDutchUI ? 'Alle opgeslagen taken weergeven' : 'Displaying all saved tasks';
    } else {
        tasksContainer.classList.remove('hidden');
        tasksElement.innerHTML = isDutchUI ? 
            '<p>Er zijn nog geen taken opgeslagen.</p>' : 
            '<p>No tasks have been saved yet.</p>';
        statusElement.textContent = isDutchUI ? 'Geen taken gevonden' : 'No tasks found';
    }
});

clearAllTasksButton.addEventListener('click', () => {
    const isDutchUI = allTasks.length > 0 && 
                    allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
    
    const confirmMessage = isDutchUI ? 
        'Weet je zeker dat je alle taken wilt wissen?' : 
        'Are you sure you want to delete all tasks?';
        
    if (confirm(confirmMessage)) {
        allTasks = [];
        saveTasks();
        tasksContainer.classList.remove('hidden');
        tasksElement.innerHTML = isDutchUI ? 
            '<p>Alle taken zijn gewist.</p>' : 
            '<p>All tasks have been cleared.</p>';
        statusElement.textContent = isDutchUI ? 'Alle taken gewist' : 'All tasks cleared';
    }
});

function deleteTask(index) {
    allTasks.splice(index, 1);
    saveTasks();
    displayTasks(allTasks);
}

// Voice Recording Functionality
recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    // Get current UI language preference
    const isDutchUI = allTasks.length > 0 && 
                     allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
                     
    if (!isRecording) {
        // Start recording
        try {
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
            
            // Try preferred options with fallbacks for browser compatibility
            let options = {};
            
            // Test for supported mimeTypes
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4'
            ];
            
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    options.mimeType = type;
                    break;
                }
            }
            
            // Add bitrate if supported
            try {
                options.audioBitsPerSecond = 128000;
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                console.warn('Advanced audio options not supported, using defaults');
                mediaRecorder = new MediaRecorder(stream);
            }
            
            audioChunks = [];
            
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            mediaRecorder.addEventListener('stop', async () => {
                recordButton.disabled = true;
                statusElement.textContent = isDutchUI ? 'Audio verwerken...' : 'Processing audio...';
                await processAudio();
                recordButton.disabled = false;
            });
            
            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = isDutchUI ? 'Stop Opname' : 'Stop Recording';
            recordButton.classList.add('recording');
            statusElement.textContent = isDutchUI ? 
                'Opname... Spreek duidelijk in je microfoon' : 
                'Recording... Speak clearly into your microphone';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            statusElement.textContent = isDutchUI ? 
                'Fout: Kon geen toegang krijgen tot de microfoon' : 
                'Error: Could not access microphone';
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordButton.textContent = isDutchUI ? 'Start Opname' : 'Start Recording';
        recordButton.classList.remove('recording');
        statusElement.textContent = isDutchUI ? 'Verwerken...' : 'Processing...';
        
        // Stop all tracks on the stream
        if (mediaRecorder && mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
}

async function processAudio() {
    try {
        // Create audio blob and form data
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // First, transcribe the audio using Whisper API
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        // Using a more advanced Whisper model for better accuracy
        formData.append('model', 'whisper-1');
        // Remove the language parameter to enable auto-detection
        // formData.append('language', 'en');
        // Update prompt to be language-neutral
        formData.append('prompt', 'This recording may contain tasks, to-do items, and reminders in various languages.');
        
        // Get UI language status - default to English for new tasks
        const isDutchUI = allTasks.length > 0 && 
                         allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
        
        statusElement.textContent = isDutchUI ? 'Audio transcriberen...' : 'Transcribing audio...';
        
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
        statusElement.textContent = isDutchText ? 'Taken extraheren...' : 'Extracting tasks...';
        
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
        statusElement.textContent = isDutchText ? 
            'Klaar om nieuwe taken op te nemen' : 
            'Ready to record new tasks';
        
    } catch (error) {
        console.error('Error processing audio:', error);
        
        // Determine language for error message
        const isDutchUI = allTasks.length > 0 && 
                         allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
                         
        statusElement.textContent = isDutchUI ? 
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
        tasksElement.innerHTML = '<p>No tasks identified. Try recording again with clearer instructions.</p>';
        return;
    }
    
    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
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
                <span>${priorityLabel}${task.criticality || 'normal'}</span>
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

// Copy to clipboard functionality
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
            // Check if most tasks are Dutch to show Dutch confirmation
            const isDutchUI = allTasks.length > 0 && 
                             allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
            
            copyButton.textContent = isDutchUI ? 'Gekopieerd!' : 'Copied!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy tasks to clipboard');
        });
});

function resetUI() {
    transcriptionContainer.classList.add('hidden');
    tasksContainer.classList.add('hidden');
    transcriptionElement.textContent = '';
    tasksElement.innerHTML = '';
    
    // Get current UI language preference
    const isDutchUI = allTasks.length > 0 && 
                     allTasks.filter(task => isTaskInDutch(task)).length > allTasks.length / 2;
                     
    statusElement.textContent = isDutchUI ? 'Klaar om op te nemen' : 'Ready to record';
    
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        isRecording = false;
        recordButton.textContent = isDutchUI ? 'Start Opname' : 'Start Recording';
        recordButton.classList.remove('recording');
    }
} 