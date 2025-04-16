# Deploying Your Voice Task Manager to GitHub Pages

This guide will walk you through the process of deploying your Voice Task Manager application to GitHub Pages, so you can access it from any device.

## Step 1: Create a GitHub Account

If you don't already have a GitHub account, create one at [github.com](https://github.com/).

## Step 2: Create a New Repository

1. Click the "+" icon in the top right corner of GitHub and select "New repository"
2. Name your repository (e.g., "voice-task-manager")
3. Make sure it's set to "Public" (GitHub Pages requires this for free accounts)
4. Click "Create repository"

## Step 3: Upload Your Files

### Option A: Using the GitHub Web Interface (Easiest for beginners)

1. In your new empty repository, click "Add file" > "Upload files"
2. Drag and drop all the files from your project folder
3. Add a commit message like "Initial commit"
4. Click "Commit changes"

### Option B: Using Git Command Line (For advanced users)

If you're familiar with Git, you can use these commands:

```bash
# Navigate to your project directory
cd path/to/your/project

# Initialize a git repository
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit"

# Connect to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/voice-task-manager.git

# Push the files
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings"
3. Scroll down to the "GitHub Pages" section (or click "Pages" in the left sidebar)
4. Under "Source", select "main" as the branch
5. Click "Save"
6. GitHub will provide you with a URL where your site is published (something like `https://yourusername.github.io/voice-task-manager/`)

## Step 5: Access Your Application

1. Wait a few minutes for GitHub to deploy your site
2. Visit the URL provided in the GitHub Pages section
3. Your Voice Task Manager should now be accessible!

## Important Notes

1. **Your OpenAI API Key**: Remember that you'll need to enter your OpenAI API key each time you use the app, unless you're using the same browser where you've saved it previously.

2. **Microphone Access**: Browsers require HTTPS to access your microphone, which GitHub Pages provides. You'll need to grant microphone permission when prompted.

3. **Updates**: If you make changes to your code, you'll need to commit and push them to GitHub again. GitHub Pages will automatically update with your new changes.

## Troubleshooting

- If your page doesn't appear, check if GitHub Pages is still building (there might be a yellow dot next to the URL)
- If you see a 404 error, make sure your index.html file is in the root directory of your repository
- If the app loads but doesn't work, check the browser console for errors (press F12 in most browsers) 