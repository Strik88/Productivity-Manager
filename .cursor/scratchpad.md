# Striks Voice Task Manager - API Key Handling Improvement

## Background and Motivation

The user is experiencing a suboptimal user experience where they are required to enter their OpenAI API key on an initial login/welcome screen and then potentially again within the application's settings page. This is redundant and can be frustrating. The goal is to streamline this process so that the API key, once entered, is remembered and utilized by the settings page, or to remove the initial screen if it's deemed unnecessary after further analysis. The primary aim is to improve UX by avoiding duplicate data entry.

**UPDATE:** The user is now reporting a new issue where Vercel deployment works for OpenAI API but not for Notion API. This is a common problem related to client-side vs server-side execution and Vercel function deployment.

## Key Challenges and Analysis

*   **Current Storage Mechanism(s):** Need to identify how and where the API key is stored when entered on the initial screen (e.g., `localStorage`, `sessionStorage`, in-memory state).
*   **Settings Page Logic:** Need to understand how the settings page currently retrieves or prompts for the API key.
*   **State Synchronization:** Ensuring that if the key is entered or updated in one place (initial screen or settings), it's reflected correctly in the other and used consistently by the application.
*   **UX Decision:**
    *   Option A: Keep the initial screen. When the key is entered here, it should be saved. The settings page should then read this saved key. It can display it (masked) and allow the user to update or clear it. This seems like a good default as the initial screen might act as a gate.
    *   Option B: Remove the initial screen if its only purpose is API key entry and this can be consolidated into the settings page, which might be accessible after some other non-API-key-dependent part of the app. *Initial assessment favors Option A for better UX flow, assuming the first screen has a purpose beyond just the API key.*

**NEW ISSUE - Vercel Deployment Analysis:**
*   **Problem:** OpenAI API works but Notion API doesn't work on Vercel deployment
*   **Root Cause Analysis:** Based on search results and code examination:
    1. The app calls `/api/notion` proxy endpoint which should be a Vercel serverless function
    2. The proxy function exists in `api/notion.js` but may not be properly deployed
    3. There's no proper Vercel function configuration in `vercel.json`
    4. The function may be running client-side instead of server-side
    5. CORS issues between client and Notion API directly

## High-level Task Breakdown

The plan will follow Test-Driven Development (TDD) principles where applicable.

1.  **Task 1: Investigate API Key Handling in Initial Screen.**
    *   Action: Locate the code files and functions responsible for the initial API key input screen.
    *   Action: Analyze how the entered API key is stored (e.g., `localStorage`, `sessionStorage`, component state, global state management).
    *   Action: Note any "remember me" functionality and how it affects persistence.
    *   Success Criteria: Clear understanding and documentation (in this scratchpad) of the current storage mechanism for the API key from the initial screen.

2.  **Task 2: Investigate API Key Handling in Settings Page.**
    *   Action: Locate the code files and functions for the settings page where the API key is also requested/managed.
    *   Action: Analyze how this page currently expects to receive/store/validate the API key.
    *   Success Criteria: Clear understanding and documentation of the current API key handling logic within the settings page.

3.  **Task 3: Design Unified API Key Storage and Retrieval Strategy.**
    *   Action: Based on findings from Task 1 & 2, decide on a single, reliable method for storing the API key (e.g., `localStorage` is a strong candidate for web apps, allowing persistence across sessions if "remember me" is active).
    *   Action: Define how the settings page will retrieve the stored key.
    *   Action: Define how the settings page will allow updating the key, ensuring this update is propagated to the unified storage.
    *   Success Criteria: A documented strategy for unified API key management.

4.  **Task 4: Implement Changes to Initial Screen (if necessary).**
    *   Action: Modify the initial screen code to save the API key to the chosen unified storage mechanism upon successful submission.
    *   Action: Ensure "remember me for 30 days" functionality correctly interfaces with the chosen storage (e.g., sets an appropriate expiry or flag).
    *   Success Criteria: The initial screen correctly saves the API key to the unified storage. The key persists according to the "remember me" option.

5.  **Task 5: Implement Changes to Settings Page.**
    *   Action: Modify the settings page to first attempt to load the API key from the unified storage.
    *   Action: If a key is found, pre-fill the input field (ideally masked, with a toggle for visibility or an "Update Key" flow).
    *   Action: If no key is found in unified storage, the page should prompt the user to enter it as it likely does now.
    *   Action: Ensure that any updates to the API key made via the settings page are saved back to the unified storage.
    *   Success Criteria: Settings page correctly reads from unified storage. It displays an existing key or prompts for a new one. Updates are saved to unified storage. Redundant entry is eliminated.

6.  **Task 6: End-to-End Testing.**
    *   Test Case 1: Enter API key on the initial screen (with "remember me"). Navigate to settings. Verify the key is present/indicated as set.
    *   Test Case 2: Close/reopen browser -> check auto-login and settings.
    *   Test Case 3: Enter API key -> update in settings -> check persistence.
    *   Test Case 4: Clear all storage -> enter new key on initial screen -> check settings.
    *   Test Case 5 (Adjusted) Enter API key on initial screen (remember me unchecked) -> check settings. Close/reopen browser -> app should auto-login (key migrated to SecureCredentialManager, which persists).
    *   Expected Outcome: API key handling is seamless, non-redundant, and persists correctly. Auto-login functions as expected.

7.  **Task 7: UI Cleanup - Remove extraneous elements from Login Page.**
    *   Action: Locate the HTML file corresponding to the login screen (likely `index.html`).
    *   Action: Remove the small capsule UI element above "Ontwikkeld door Ian Strik".
    *   Action: Remove the HTML comment `<!-- Deployment trigger -->`.
    *   Success Criteria: Both specified elements are removed from the UI and the HTML source.

8.  **Task 8: Fix Vercel Deployment - Notion API Issue. **
    *   **Action**: Investigate why Notion API doesn't work on Vercel while OpenAI API does work.
    *   **Action**: Analyze the current Vercel function setup and configuration.
    *   **Action**: Fix the Vercel serverless function deployment for Notion API proxy.
    *   **Action**: Test the deployment to ensure both APIs work correctly.
    *   **Success Criteria**: Both OpenAI and Notion APIs work correctly in Vercel deployment environment.

## Project Status Board

*   [X] Task 1: Investigate API Key Handling in Initial Screen.
*   [X] Task 2: Investigate API Key Handling in Settings Page.
*   [X] Task 3: Design Unified API Key Storage and Retrieval Strategy.
*   [X] Task 4: Implement Changes to Initial Screen.
*   [X] Task 5: Implement Changes to Settings Page.
*   [/] Task 6: End-to-End Testing. (Awaiting user feedback)
*   [ ] Task 7: UI Cleanup - Remove extraneous elements from Login Page.
*   [ ] Task 8: Fix Vercel Deployment - Notion API Issue.

## Executor's Feedback or Assistance Requests

**Task 1: Investigate API Key Handling in Initial Screen - COMPLETED**

*   **Relevant File:** `index.html` (located in the project root directory: `/c%3A/Users/Ian%20Strik/Desktop/Notion%20to%20do%20add/`)
*   **Mechanism:** An inline JavaScript function `handleLogin()` in `index.html` is responsible for the initial API key submission.
    *   Input field: `id="api-key-input"`
    *   Checkbox for persistence: `id="remember-key"` (label: "Onthoud mijn API key voor 30 dagen")
*   **Storage Logic:**
    *   **If "remember-key" is checked:** The OpenAI API key is stored in `localStorage` as `voiceTaskApiKey`, and an expiration timestamp (`voiceTaskApiKeyExpiry`) is also stored for 30 days.
    *   **If "remember-key" is NOT checked:** The OpenAI API key is stored in `sessionStorage` as `voiceTaskApiKey`. Any previous `localStorage` entries for `voiceTaskApiKey` and `voiceTaskApiKeyExpiry` are cleared.
*   **Main Application Script:** The rest of the application logic appears to be handled by `app.js`, which is referenced in `index.html` (`<script src="app.js" defer></script>`).
*   **Observation:** The system has a migration path from the initial screen's storage to the settings panel's preferred storage. The redundancy problem likely stems from the initial screen *not* being aware of the `SecureCredentialManager` and potentially re-prompting or using stale data if its local `voiceTaskApiKey` isn't cleared or updated after changes in settings.

**Task 2: Investigate API Key Handling in Settings Page - COMPLETED**

*   **Relevant File:** `app.js`
*   **Primary Storage Mechanism:** Uses a `SecureCredentialManager` class which stores credentials (including OpenAI API key) in IndexedDB with an encrypted `localStorage` backup. The key name used internally by `SecureCredentialManager` is `openaiApiKey`.
*   **Loading into Settings UI:**
    *   The `loadSettingsFromStorage()` function retrieves credentials via `credentialManager.retrieveCredentialsWithFallback()`.
    *   It populates the input field `id="settings-openai-key"` with the value of `credentials.openaiApiKey`.
*   **Saving from Settings UI:**
    *   The `saveSettingsFromPanel()` function reads the value from `id="settings-openai-key"`.
    *   It saves this value as `openaiApiKey` using `credentialManager.storeCredentialsWithBackup()`.
*   **Legacy Migration:**
    *   A crucial function, `loadLegacyCredentials()`, is present. If `loadSettingsFromStorage()` fails to find credentials in the primary secure storage, this function is called.
    *   `loadLegacyCredentials()` explicitly checks `localStorage.getItem('voiceTaskApiKey')` and `sessionStorage.getItem('voiceTaskApiKey')` (which are set by the initial login screen in `index.html`).
    *   If found, these legacy keys are migrated into the `SecureCredentialManager` under the name `openaiApiKey`.
*   **Observation:** The system has a migration path from the initial screen's storage to the settings panel's preferred storage. The redundancy problem likely stems from the initial screen *not* being aware of the `SecureCredentialManager` and potentially re-prompting or using stale data if its local `voiceTaskApiKey` isn't cleared or updated after changes in settings.

**Task 3: Design Unified API Key Storage and Retrieval Strategy - COMPLETED**

*   **Core Principle:** `SecureCredentialManager` in `app.js` (managing `openaiApiKey`) will be the single source of truth.
*   **Strategy Details:**
    1.  **Initial Login Screen Behavior (`index.html` - `handleLogin()` function):
        *   When API key is submitted:
            *   It will save the OpenAI API key to `localStorage` (if "remember me" is checked) or `sessionStorage` (if unchecked), using the **consistent key name `openaiApiKey`**. An expiry date (`openaiApiKeyExpiry`) will also be set in `localStorage` if remembered.
            *   Old keys (`voiceTaskApiKey`, `voiceTaskApiKeyExpiry`) will be explicitly removed from both `localStorage` and `sessionStorage` during this process to ensure cleanup.
        *   This approach keeps the inline script in `index.html` relatively simple and avoids direct dependencies on `app.js` components before they are fully loaded.
    2.  **Application Load & Key Ingestion (`app.js`):
        *   `app.js` will initialize `SecureCredentialManager`.
        *   The existing `loadLegacyCredentials()` function (or a refined version) will be responsible for checking `sessionStorage.getItem('openaiApiKey')` and `localStorage.getItem('openaiApiKey')` (the ones set by the modified `handleLogin`).
        *   It will also retain checks for the old `voiceTaskApiKey` for a transitional period to ensure users with very old stored keys are migrated.
        *   Any key found through these checks will be imported into `SecureCredentialManager` under the name `openaiApiKey`.
        *   Crucially, after successful import into `SecureCredentialManager`, the temporary `openaiApiKey` from `sessionStorage` or `localStorage` (set by `handleLogin`) will be cleared, as `SecureCredentialManager` is now authoritative.
    3.  **Settings Page Behavior (`app.js`):
        *   No significant changes are needed here. The settings page already correctly interacts with `SecureCredentialManager` for loading and saving `openaiApiKey`.
    4.  **Automatic Sign-In / Login Screen Bypass (`index.html` - inline script):
        *   On page load, an inline script in `index.html` will perform a quick check:
            *   Primarily, it will look for `localStorage.getItem('secure_openaiApiKey')` (the encrypted backup key from `SecureCredentialManager`). If found and its expiry (also in the stored object) is valid, it will hide the login screen and show the app screen.
            *   As a secondary check (or if the above is complex for an inline script), it can check `localStorage.getItem('openaiApiKey')` and its `openaiApiKeyExpiry`.
        *   If a valid key indicator is found, the `login-screen` is hidden, and `app-screen` is shown immediately. `app.js` will then handle the full, secure loading of the key.
*   **Benefits:**
    *   Eliminates redundant API key prompts if a key is already securely stored.
    *   Uses a consistent key name (`openaiApiKey`) across the board.
    *   Leverages the robust `SecureCredentialManager` for all persistent storage.
    *   Provides a clear path for migrating any existing/legacy keys.

**Task 4: Implement Changes to Initial Screen - COMPLETED**

*   **Changes Made in `index.html`:**
    1.  **`handleLogin()` Function Modified:**
        *   Now saves the API key to `localStorage` (if "remember me" checked) or `sessionStorage` (if unchecked) using the key name `openaiApiKey` and `openaiApiKeyExpiry` (for `localStorage`).
        *   Explicitly removes old `voiceTaskApiKey` and `voiceTaskApiKeyExpiry` from both `localStorage` and `sessionStorage` to ensure cleanup.
    2.  **Auto-Login Script Added (inline in `<head>`):
        *   On page load, this script checks for a valid API key to enable automatic sign-in.
        *   **Primary Check:** Looks for `localStorage.getItem('secure_openaiApiKey')` (the encrypted backup from `SecureCredentialManager`). It parses this to check the expiry date.
        *   **Secondary Check:** If the primary check fails, it looks for `localStorage.getItem('openaiApiKey')` and its `openaiApiKeyExpiry` (set by the updated `handleLogin`).
        *   If a valid, non-expired key indicator is found by either check, the script hides the `login-screen` and shows the `app-screen` on `DOMContentLoaded`.
*   **Outcome:** The initial screen now uses the consistent `openaiApiKey` name for temporary storage, facilitating migration by `app.js`. The auto-login script should prevent the login screen from showing if a valid key is already stored by `SecureCredentialManager` or set by a recent login.

**Task 5: Implement Changes to Settings Page - COMPLETED**

*   **Changes Made in `app.js`:**
    1.  **`loadLegacyCredentials()` Function Modified:**
        *   Now prioritizes checking for `openaiApiKey` from `sessionStorage` (set by `index.html` if "remember me" is unchecked) and then `localStorage` (set by `index.html` if "remember me" is checked, with expiry check).
        *   Retains a fallback to check for the old `voiceTaskApiKey` (from `sessionStorage` or `localStorage`) for users with older stored keys.
        *   If any of these keys are found and successfully migrated into `SecureCredentialManager` (using `credentialManager.storeCredentials({ openaiApiKey: foundKey, ... })`):
            *   The specific source key (e.g., `sessionStorage.removeItem('openaiApiKey')` or `localStorage.removeItem('voiceTaskApiKey')` and its expiry) is cleaned up to prevent re-migration.
        *   Legacy Notion keys (`voiceTaskNotionApiKey`, `voiceTaskNotionDatabaseId`) are also checked and migrated if present alongside an OpenAI key, and cleaned up from `localStorage`.
    2.  **No Changes Needed for `loadSettingsFromStorage()` or `saveSettingsFromPanel()`:** These functions in `app.js` already correctly interact with `SecureCredentialManager` using the `openaiApiKey` key name.
*   **Outcome:** The settings page logic in `app.js` now seamlessly integrates with the changes made to the initial login screen. Keys entered on the initial screen will be correctly picked up, migrated to the `SecureCredentialManager`, and then used as the single source of truth by the settings panel. The cleanup of interim/legacy keys after migration is crucial for preventing redundancy.

**Task 6: End-to-End Testing - IN PROGRESS**

*   **Request:** User is requested to perform end-to-end testing based on the defined test cases to verify the implemented changes.
*   **Test Cases:**
    1.  Enter API key on initial screen (remember me checked) -> check settings.
    2.  Close/reopen browser -> check auto-login and settings.
    3.  Enter API key -> update in settings -> check persistence.
    4.  Clear all storage -> enter new key on initial screen -> check settings.
    5.  (Adjusted) Enter API key on initial screen (remember me unchecked) -> check settings. Close/reopen browser -> app should auto-login (key migrated to SecureCredentialManager, which persists).
*   **Expected Outcome:** API key handling is seamless, non-redundant, and persists correctly. Auto-login functions as expected.

Awaiting user feedback to complete this task.

**Task 8: Fix Vercel Deployment - Notion API Issue - INVESTIGATION COMPLETED**

Based on research and code analysis, I've identified the root cause of why Notion API doesn't work on Vercel deployment:

**Problem Analysis:**
1. **Vercel Function Configuration Missing**: The `vercel.json` file doesn't contain proper function configuration for the Notion API proxy
2. **Function Location**: The function exists in `api/notion.js` but isn't properly configured as a Vercel serverless function
3. **Client-Side vs Server-Side Execution**: The app tries to call `/api/notion` but this might not be properly deployed as a serverless function
4. **CORS Issues**: Direct Notion API calls from client-side fail due to CORS restrictions (this is why the proxy was created)

**Root Cause**: 
The Vercel serverless function for Notion API proxy (`api/notion.js`) is not properly configured in `vercel.json` and may not be deploying correctly.

**Solution Strategy:**
1. Update `vercel.json` to properly configure the Notion API proxy as a serverless function
2. Ensure the function has proper environment variable access
3. Test the deployment to verify both APIs work
4. Consider alternative deployment approach if needed

The user needs to be informed about this solution and given the choice to proceed with implementation.

## Lessons

*   (To be populated as the project progresses)
*   Include info useful for debugging in the program output.
*   Read the file before you try to edit it.
*   If there are vulnerabilities that appear in the terminal, run npm audit before proceeding.
*   Always ask before using the -force git command.
*   **Vercel Deployment Issue**: When using Vercel serverless functions, the `vercel.json` configuration file is crucial for proper function deployment. Missing function configuration can cause API endpoints to not work even if the function code exists.
