# How to Use Striks Whisperer

This guide will walk you through setting up and using Striks Whisperer step by step, with no technical knowledge required.

## Initial Setup

### 1. Get Your OpenAI API Key

1. Go to [OpenAI's website](https://platform.openai.com/signup) and sign up for an account if you don't have one
2. After signing in, click on your profile in the top-right corner and select "View API keys"
3. Click "Create new secret key"
4. Give your key a name (e.g., "Striks Whisperer")
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

### Step 2: Record Your Text

1. Click the blue "Start Recording" button
2. Your browser will ask for permission to use your microphone - click "Allow"
3. The button will turn red to indicate recording is active
4. Speak clearly into your microphone
5. When you're done speaking, click the "Stop Recording" button

#### Example Phrases:
- "This is a short test of the transcription"
- "Dictate notes for my meeting tomorrow"

### Step 3: Review Your Transcript

1. The app will process your speech (this might take a few seconds)
2. You'll see your transcribed speech on the screen

### Step 4: Copy the Text

1. Click the "Copy Transcript" button
2. Open any app where you want to paste the text
3. Paste the transcript (usually Ctrl+V or Cmd+V)

## Troubleshooting

### If the Microphone Doesn't Work:
- Make sure you've given the browser permission to use your microphone
- Try using a different browser (Chrome works best)
- Make sure your microphone is not being used by another application

### If Transcriptions Look Wrong:
- Speak more clearly and slowly
- Try using a better microphone if available

### If You Get API Errors:
- Make sure your OpenAI API key is entered correctly
- Check that your OpenAI account has billing set up (needed for API access)
- If you've used your free trial credits, you may need to add a payment method

## Privacy and Security

- Your OpenAI API key is stored only on your device
- Audio is processed directly through OpenAI's servers, not through any intermediate server
- No data is stored after your session ends 