# Voice Task Manager - File Structure Overview

This document explains the purpose of each file in the Voice Task Manager project to help you understand how the application works.

## Main Files

- `index.html`: The main HTML file that creates the structure of the web application.
- `styles.css`: Contains all the styling rules for the application's appearance.
- `app.js`: The JavaScript code that handles all the functionality of the application.

## Documentation Files

- `README.md`: General information about the project, features, and how to use it.
- `GITHUB_PAGES_SETUP.md`: Step-by-step instructions for deploying the application to GitHub Pages.
- `FILE_STRUCTURE.md`: This file, explaining the purpose of each file.

## Configuration Files

- `.gitignore`: Specifies files that Git should ignore when committing to a repository.

## How the Application Works

1. **User Interface (index.html)**
   - Creates a login screen for entering your OpenAI API key
   - Provides a recording interface with start/stop buttons
   - Displays transcribed text and extracted tasks

2. **Styling (styles.css)**
   - Makes the application look good on both desktop and mobile devices
   - Provides visual feedback during recording (red pulsing button)
   - Organizes tasks in an easy-to-read format

3. **Application Logic (app.js)**
   - Handles voice recording using the browser's Web Audio API
   - Securely stores your API key in localStorage (only on your device)
   - Sends audio to OpenAI's Whisper API for transcription
   - Sends transcribed text to OpenAI's GPT API for task extraction
   - Displays the results and allows copying to clipboard

## Flow of Data

1. User speaks into the microphone
2. Audio is captured and stored as a Blob
3. Audio is sent to OpenAI's Whisper API for transcription
4. Transcribed text is displayed to the user
5. Transcribed text is sent to OpenAI's GPT API for analysis
6. Extracted tasks are displayed with details (priority, due date, category)
7. User can copy tasks to clipboard for use in other applications

## Security Considerations

- Your OpenAI API key is stored only in your browser's localStorage
- No data is sent to our servers; all API calls go directly from your browser to OpenAI
- The application requires HTTPS (provided by GitHub Pages) to access your microphone 