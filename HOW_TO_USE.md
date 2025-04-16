# How to Use the Voice Task Manager

This guide will walk you through setting up and using the Voice Task Manager step by step, with no technical knowledge required.

## Initial Setup

### 1. Get Your OpenAI API Key

1. Go to [OpenAI's website](https://platform.openai.com/signup) and sign up for an account if you don't have one
2. After signing in, click on your profile in the top-right corner and select "View API keys"
3. Click "Create new secret key"
4. Give your key a name (e.g., "Voice Task Manager")
5. Copy the key (it starts with "sk-") - IMPORTANT: You won't be able to see it again, so save it somewhere safe!

### 2. Access the Application

#### Option A: Use the GitHub Pages Version
1. Go to the URL provided to you (like `https://yourusername.github.io/voice-task-manager/`)
2. The application will load in your web browser

#### Option B: Run Locally
1. Download all the files from this repository
2. Double-click on the `index.html` file to open it in your web browser

## Using the Application

### Step 1: Login

1. When you first open the app, you'll see a login screen
2. Paste or type your OpenAI API key in the input field
3. Click "Login"
4. Your API key will be saved in your browser so you won't need to enter it again on this device

### Step 2: Record Your Tasks

1. Click the blue "Start Recording" button
2. Your browser will ask for permission to use your microphone - click "Allow"
3. The button will turn red to indicate recording is active
4. Speak clearly into your microphone, describing your tasks
5. When you're done speaking, click the "Stop Recording" button

#### Examples of What to Say:
- "Call John about the project proposal by Friday, it's very important"
- "Buy groceries today and clean the kitchen tomorrow"
- "Finish writing the report for work, high priority, due next Monday"
- "Pick up dry cleaning and don't forget to pay the electricity bill, due on the 15th"

### Step 3: Review Your Tasks

1. The app will process your speech (this might take a few seconds)
2. You'll see your transcribed speech
3. Below the transcription, you'll see your tasks organized with:
   - Task description
   - Priority level
   - Due date (if you mentioned one)
   - Category (work, personal, household, etc.)

### Step 4: Save Your Tasks

1. Click the "Copy All Tasks" button
2. Your tasks will be copied to your clipboard in a formatted list
3. Open any app where you want to paste the tasks (like Notion, email, notes app, etc.)
4. Paste the tasks (usually Ctrl+V or Cmd+V)

### Step 5: Record More Tasks

1. Click "Start Recording" again to add more tasks
2. New tasks will be added to your existing list
3. You can keep adding tasks as needed

## Troubleshooting

### If the Microphone Doesn't Work:
- Make sure you've given the browser permission to use your microphone
- Try using a different browser (Chrome works best)
- Make sure your microphone is not being used by another application

### If Tasks Aren't Being Extracted Correctly:
- Speak more clearly and slowly
- Try being more specific about due dates and priorities
- Use phrases like "high priority" or "due next Friday" to help the AI understand

### If You Get API Errors:
- Make sure your OpenAI API key is entered correctly
- Check that your OpenAI account has billing set up (needed for API access)
- If you've used your free trial credits, you may need to add a payment method

## Privacy and Security

- Your OpenAI API key is stored only on your device
- Audio is processed directly through OpenAI's servers, not through any intermediate server
- No data is stored after your session ends 