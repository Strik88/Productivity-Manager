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

// App State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';

// Check if we have a saved API key
window.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('voiceTaskApiKey');
    if (savedApiKey) {
        apiKey = savedApiKey;
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
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
        apiKeyInput.value = '';
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

// Voice Recording Functionality
recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (!isRecording) {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            mediaRecorder.addEventListener('stop', async () => {
                recordButton.disabled = true;
                statusElement.textContent = 'Processing audio...';
                await processAudio();
                recordButton.disabled = false;
            });
            
            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            statusElement.textContent = 'Recording... Speak clearly into your microphone';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            statusElement.textContent = 'Error: Could not access microphone';
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
        statusElement.textContent = 'Processing...';
        
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
        formData.append('model', 'whisper-1');
        
        statusElement.textContent = 'Transcribing audio...';
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
        
        // Now, process the transcription using GPT to extract tasks
        statusElement.textContent = 'Extracting tasks...';
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a specialized task extraction system. Analyze the text and extract actionable tasks. 
                        Return the result as a JSON array where each task object has: 
                        1. task: The task description
                        2. criticality: Priority level (low, normal, high, very high)
                        3. due_date: Due date if mentioned (in YYYY-MM-DD format) or null if not specified
                        4. category: Best guess at category (Work, Family, Household, Personal, etc.)
                        
                        Examples:
                        For "I need to call John about the project by tomorrow": 
                        [{"task":"Call John about the project", "criticality":"normal", "due_date":"2024-05-21", "category":"Work"}]
                        
                        For "Remember to buy milk and finish the urgent report": 
                        [{"task":"Buy milk", "criticality":"normal", "due_date":null, "category":"Household"},
                        {"task":"Finish the report", "criticality":"high", "due_date":null, "category":"Work"}]
                        
                        Return tasks as a valid JSON array with no extra text.`
                    },
                    { role: 'user', content: transcribedText }
                ]
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
        
        // Display tasks
        displayTasks(tasksArray);
        statusElement.textContent = 'Ready to record new tasks';
        
    } catch (error) {
        console.error('Error processing audio:', error);
        statusElement.textContent = `Error: ${error.message}`;
    }
}

function displayTasks(tasks) {
    tasksContainer.classList.remove('hidden');
    tasksElement.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksElement.innerHTML = '<p>No tasks identified. Try recording again with clearer instructions.</p>';
        return;
    }
    
    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
        // Format due date
        let dueDateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
        
        taskElement.innerHTML = `
            <h3>${task.task}</h3>
            <div class="task-metadata">
                <span>Priority: ${task.criticality || 'normal'}</span>
                <span>Due: ${dueDateDisplay}</span>
                <span>Category: ${task.category || 'Uncategorized'}</span>
            </div>
        `;
        
        tasksElement.appendChild(taskElement);
    });
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
            copyButton.textContent = 'Copied!';
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
    statusElement.textContent = 'Ready to record';
    
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
    }
} 