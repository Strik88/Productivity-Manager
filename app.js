// App State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let apiKey = '';
let allTasks = []; // Store all tasks
let recordingTimer = null; // Timer voor maximale opnameduur
const MAX_RECORDING_TIME = 5 * 60 * 1000; // 5 minuten in milliseconden
let isDesktopBrowser = false; // Indicator voor desktop browser
const API_KEY_STORAGE_DURATION = 30; // Aantal dagen om API key te bewaren

<<<<<<< Updated upstream
// Check for page refresh
if (window.isPageRefreshed || performance.navigation.type === 1) {
    console.log('Page refresh detected. Initializing in clean state mode.');
=======
// === ENHANCED CREDENTIAL STORAGE SYSTEM ===
class SecureCredentialManager {
    constructor() {
        this.dbName = 'VoiceTaskSecureDB';
        this.dbVersion = 1;
        this.storeName = 'credentials';
        this.encryptionKey = this.generateDeviceKey();
        this.db = null;
    }

    // Generate a device-specific encryption key
    generateDeviceKey() {
        const userAgent = navigator.userAgent;
        const screenDimensions = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const baseString = `${userAgent}-${screenDimensions}-${timezone}`;
        
        // Simple but effective device fingerprint
        let hash = 0;
        for (let i = 0; i < baseString.length; i++) {
            const char = baseString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Simple XOR encryption (sufficient for local storage)
    encrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result); // Base64 encode
    }

    decrypt(encryptedText, key) {
        try {
            const decoded = atob(encryptedText); // Base64 decode
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Initialize IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('expiryDate', 'expiryDate', { unique: false });
                }
            };
        });
    }

    // Store credentials securely
    async storeCredentials(credentials) {
        if (!this.db) await this.initDB();
        
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const promises = [];
        
        // Store each credential type
        Object.entries(credentials).forEach(([key, value]) => {
            if (value && value.trim()) {
                const encryptedValue = this.encrypt(value, this.encryptionKey);
                const credentialData = {
                    id: key,
                    type: 'api_credential',
                    value: encryptedValue,
                    timestamp: Date.now(),
                    expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
                    deviceKey: this.encryptionKey.substring(0, 8) // Partial key for validation
                };
                
                promises.push(
                    new Promise((resolve, reject) => {
                        const request = store.put(credentialData);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    })
                );
            }
        });
        
        await Promise.all(promises);
        
        // Also store in localStorage as backup
        this.storeInLocalStorageBackup(credentials);
        
        console.log('✅ Credentials stored securely in IndexedDB');
    }

    // Retrieve credentials securely
    async retrieveCredentials() {
        try {
            if (!this.db) await this.initDB();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const credentials = {};
            const credentialKeys = ['openaiApiKey', 'notionApiKey', 'notionDatabaseId'];
            
            const promises = credentialKeys.map(key => 
                new Promise((resolve) => {
                    const request = store.get(key);
                    request.onsuccess = () => {
                        const result = request.result;
                        if (result && result.expiryDate > Date.now()) {
                            // Verify device key matches
                            if (result.deviceKey === this.encryptionKey.substring(0, 8)) {
                                const decryptedValue = this.decrypt(result.value, this.encryptionKey);
                                if (decryptedValue) {
                                    credentials[key] = decryptedValue;
                                }
                            }
                        }
                        resolve();
                    };
                    request.onerror = () => resolve(); // Continue on error
                })
            );
            
            await Promise.all(promises);
            
            // Fallback to localStorage if IndexedDB fails
            if (Object.keys(credentials).length === 0) {
                console.log('🔄 Falling back to localStorage');
                return this.retrieveFromLocalStorageBackup();
            }
            
            console.log('✅ Credentials retrieved from IndexedDB');
            return credentials;
            
        } catch (error) {
            console.error('IndexedDB retrieval failed, using localStorage fallback:', error);
            return this.retrieveFromLocalStorageBackup();
        }
    }

    // Clean expired credentials
    async cleanExpiredCredentials() {
        if (!this.db) await this.initDB();
        
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('expiryDate');
        
        const now = Date.now();
        const range = IDBKeyRange.upperBound(now);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    }

    // localStorage backup methods
    storeInLocalStorageBackup(credentials) {
        try {
            Object.entries(credentials).forEach(([key, value]) => {
                if (value && value.trim()) {
                    const encryptedValue = this.encrypt(value, this.encryptionKey);
                    const data = {
                        value: encryptedValue,
                        timestamp: Date.now(),
                        expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
                    };
                    localStorage.setItem(`secure_${key}`, JSON.stringify(data));
                }
            });
        } catch (error) {
            console.error('localStorage backup failed:', error);
        }
    }

    retrieveFromLocalStorageBackup() {
        const credentials = {};
        const credentialKeys = ['openaiApiKey', 'notionApiKey', 'notionDatabaseId'];
        
        credentialKeys.forEach(key => {
            try {
                const stored = localStorage.getItem(`secure_${key}`);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.expiryDate > Date.now()) {
                        const decryptedValue = this.decrypt(data.value, this.encryptionKey);
                        if (decryptedValue) {
                            credentials[key] = decryptedValue;
                        }
            } else {
                        localStorage.removeItem(`secure_${key}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to retrieve ${key} from localStorage:`, error);
            }
        });
        
        return credentials;
    }

    // Clear all stored credentials
    async clearAllCredentials() {
        // Clear IndexedDB
        if (this.db) {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await new Promise((resolve) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            });
        }
        
        // Clear localStorage backup
        ['openaiApiKey', 'notionApiKey', 'notionDatabaseId'].forEach(key => {
            localStorage.removeItem(`secure_${key}`);
        });
        
        // Clear legacy storage
                localStorage.removeItem('voiceTaskApiKey');
                localStorage.removeItem('voiceTaskApiKeyExpiry');
        sessionStorage.removeItem('voiceTaskApiKey');
        localStorage.removeItem('voiceTaskNotionApiKey');
        localStorage.removeItem('voiceTaskNotionDatabaseId');
        localStorage.removeItem('voiceTaskNotionCredentialsExpiry');
        sessionStorage.removeItem('voiceTaskNotionApiKey');
        sessionStorage.removeItem('voiceTaskNotionDatabaseId');
        
        console.log('🗑️ All credentials cleared');
    }
>>>>>>> Stashed changes
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
        
<<<<<<< Updated upstream
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
    
    // Check for API key in verschillende opslag-types
    let savedApiKey = null;
    let shouldAutoLogin = false;
    
    // Eerst sessie storage checken (tijdelijk voor huidige sessie)
    savedApiKey = sessionStorage.getItem('voiceTaskApiKey');
    if (savedApiKey) {
        console.log('Found API key in session storage');
        shouldAutoLogin = true;
    } 
    // Daarna localStorage met vervaldatum checken
    else {
        savedApiKey = localStorage.getItem('voiceTaskApiKey');
        const expiryDate = localStorage.getItem('voiceTaskApiKeyExpiry');
        
        if (savedApiKey && expiryDate) {
            // Controleer of de API key nog geldig is
            const now = new Date();
            const expiry = new Date(expiryDate);
            
            if (now < expiry) {
                console.log(`Found valid API key in local storage (expires: ${expiry.toLocaleDateString()})`);
                shouldAutoLogin = true;
            } else {
                console.log('API key in local storage has expired, removing');
                localStorage.removeItem('voiceTaskApiKey');
                localStorage.removeItem('voiceTaskApiKeyExpiry');
                savedApiKey = null;
            }
        }
    }
=======
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
            const { success, credentials, error } = event.data;
            if (success) {
                resolve(credentials || {});
} else {
                console.error('Service Worker credential restore error:', error);
                resolve({});
            }
        };
        
        navigator.serviceWorker.controller.postMessage({
            type: 'RESTORE_CREDENTIALS'
        }, [messageChannel.port2]);
    });
}

// === CREDENTIAL PERSISTENCE STATUS CHECKER ===
class CredentialStatusChecker {
    constructor() {
        this.statusElements = {
            indexeddb: document.getElementById('indexeddb-status'),
            serviceworker: document.getElementById('serviceworker-status'),
            localstorage: document.getElementById('localstorage-status'),
            android: document.getElementById('android-optimization')
        };
    }

    // Check all credential persistence methods
    async checkAllStatus() {
        await Promise.all([
            this.checkIndexedDBStatus(),
            this.checkServiceWorkerStatus(),
            this.checkLocalStorageStatus(),
            this.checkAndroidOptimization()
        ]);
    }

    // Update status item visual state
    updateStatusItem(element, status, icon, text) {
        if (!element) return;
        
        const iconSpan = element.querySelector('.status-icon');
        const textSpan = element.querySelector('.status-text');
        
        if (iconSpan) iconSpan.textContent = icon;
        if (textSpan && text) textSpan.textContent = text;
        
        // Update CSS classes
        element.classList.remove('active', 'limited', 'disabled', 'pending');
        element.classList.add(status);
    }

    // Check IndexedDB functionality
    async checkIndexedDBStatus() {
        try {
            if (!window.indexedDB) {
                this.updateStatusItem(this.statusElements.indexeddb, 'disabled', '❌', 'IndexedDB Versleuteling (Niet ondersteund)');
        return;
    }
    
            // Test IndexedDB creation
            const testDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open('test-db', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('test')) {
                        db.createObjectStore('test', { keyPath: 'id' });
                    }
                };
            });

            testDB.close();
            
            // Clean up test database
            indexedDB.deleteDatabase('test-db');
            
            this.updateStatusItem(this.statusElements.indexeddb, 'active', '✅', 'IndexedDB Versleuteling');
            
        } catch (error) {
            console.error('IndexedDB check failed:', error);
            this.updateStatusItem(this.statusElements.indexeddb, 'disabled', '❌', 'IndexedDB Versleuteling (Fout)');
        }
    }

    // Check Service Worker functionality
    async checkServiceWorkerStatus() {
        try {
            if (!('serviceWorker' in navigator)) {
                this.updateStatusItem(this.statusElements.serviceworker, 'disabled', '❌', 'Service Worker Backup (Niet ondersteund)');
                return;
            }

            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.active) {
                this.updateStatusItem(this.statusElements.serviceworker, 'active', '✅', 'Service Worker Backup');
                } else {
                this.updateStatusItem(this.statusElements.serviceworker, 'limited', '⚠️', 'Service Worker Backup (Registratie)');
            }
            
        } catch (error) {
            console.error('Service Worker check failed:', error);
            this.updateStatusItem(this.statusElements.serviceworker, 'disabled', '❌', 'Service Worker Backup (Fout)');
        }
    }

    // Check localStorage functionality
    checkLocalStorageStatus() {
        try {
            if (!window.localStorage) {
                this.updateStatusItem(this.statusElements.localstorage, 'disabled', '❌', 'LocalStorage Fallback (Niet ondersteund)');
                return;
            }

            // Test localStorage read/write
            const testKey = 'test-storage-key';
            const testValue = 'test-value';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved === testValue) {
                this.updateStatusItem(this.statusElements.localstorage, 'active', '✅', 'LocalStorage Fallback');
            } else {
                this.updateStatusItem(this.statusElements.localstorage, 'limited', '⚠️', 'LocalStorage Fallback (Beperkt)');
            }
            
        } catch (error) {
            console.error('localStorage check failed:', error);
            this.updateStatusItem(this.statusElements.localstorage, 'disabled', '❌', 'LocalStorage Fallback (Fout)');
        }
    }

    // Check Android PWA optimization
    checkAndroidOptimization() {
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true;
        const supportsBackgroundSync = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
        
        if (isAndroid && isPWA && supportsBackgroundSync) {
            this.updateStatusItem(this.statusElements.android, 'active', '✅', 'Android PWA Optimalisatie');
        } else if (isAndroid) {
            if (isPWA) {
                this.updateStatusItem(this.statusElements.android, 'limited', '⚠️', 'Android PWA (Beperkte sync)');
            } else {
                this.updateStatusItem(this.statusElements.android, 'limited', '⚠️', 'Android Browser (Installeer als app)');
            }
        } else {
            this.updateStatusItem(this.statusElements.android, 'active', '💻', 'Desktop Optimalisatie');
        }
    }
}

// Initialize credential status checker
const credentialStatusChecker = new CredentialStatusChecker();

// Add event listener to update status when settings panel opens
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the settings panel
    initializeSettingsPanel();
>>>>>>> Stashed changes
    
    // Auto login als er een geldige API key is gevonden
    if (shouldAutoLogin && savedApiKey) {
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
<<<<<<< Updated upstream
    
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
                
                // Voeg checkbox toe voor langer bewaren (indien aanwezig)
                const rememberKey = document.getElementById('remember-key');
                const shouldRemember = rememberKey ? rememberKey.checked : false;
                
                // Bewaar API sleutel met vervaldatum als dat gewenst is
                if (shouldRemember) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + API_KEY_STORAGE_DURATION);
                    localStorage.setItem('voiceTaskApiKey', apiKey);
                    localStorage.setItem('voiceTaskApiKeyExpiry', expiryDate.toISOString());
                    console.log(`API key will be stored until ${expiryDate.toLocaleDateString()}`);
                } else {
                    // Tijdelijke sessie-opslag als niet aangevinkt
                    sessionStorage.setItem('voiceTaskApiKey', apiKey);
                    localStorage.removeItem('voiceTaskApiKey');
                    localStorage.removeItem('voiceTaskApiKeyExpiry');
                    console.log('API key stored for current session only');
                }
                
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

=======

    // Logout button event listener
>>>>>>> Stashed changes
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiKey = '';
            // Verwijder de API sleutel uit alle opslagtypes
            localStorage.removeItem('voiceTaskApiKey');
            localStorage.removeItem('voiceTaskApiKeyExpiry');
            sessionStorage.removeItem('voiceTaskApiKey');
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
<<<<<<< Updated upstream
            
=======
            if (transcriptionText) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
            }
>>>>>>> Stashed changes
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
            browserWarning.classList.add('hidden');
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
<<<<<<< Updated upstream
        // Controleer eerst of we toegang hebben tot de microfoon
=======
        // Request microphone access
>>>>>>> Stashed changes
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
<<<<<<< Updated upstream
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
=======
        // Setup MediaRecorder
                let options = {};
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options.mimeType = 'audio/mp4';
        }
        
                    mediaRecorder = new MediaRecorder(stream, options);
                audioChunks = [];
                
                mediaRecorder.addEventListener('dataavailable', event => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
>>>>>>> Stashed changes
            }
        } else {
            console.warn('No audio tracks found in test stream');
            // Stop de stream omdat we hem niet nodig hebben
            stream.getTracks().forEach(track => track.stop());
<<<<<<< Updated upstream
        }
    } catch (err) {
        console.error('Microphone test failed:', err);
=======
            processAudio();
        });
        
        mediaRecorder.start();
                isRecording = true;
        
        recordButton.textContent = 'Stop Opname';
                recordButton.classList.add('recording');
        statusElement.textContent = 'Opname gestart... Spreek nu je taken in';
                    
        // Auto-stop after 5 minutes
                recordingTimer = setTimeout(() => {
            if (isRecording) {
                stopRecording();
                    }
                }, MAX_RECORDING_TIME);
                    
        } catch (error) {
        console.error('Error starting recording:', error);
        statusElement.textContent = 'Fout bij starten opname. Controleer microfoon toegang.';
>>>>>>> Stashed changes
    }
}

// Voice Recording Functionality
async function toggleRecording() {
    console.log('toggleRecording function called');
    console.log('Current recording state:', isRecording);
    console.log('Running on desktop browser:', isDesktopBrowser);
    
<<<<<<< Updated upstream
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
=======
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        recordButton.textContent = 'Start Opname';
        recordButton.classList.remove('recording');
        statusElement.textContent = 'Opname gestopt. Audio wordt verwerkt...';
        
            if (recordingTimer) {
                clearTimeout(recordingTimer);
                recordingTimer = null;
>>>>>>> Stashed changes
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
        
<<<<<<< Updated upstream
=======
        try {
>>>>>>> Stashed changes
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
<<<<<<< Updated upstream
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
=======
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('=== WHISPER API RESPONSE RECEIVED ===');
            console.log('Response status:', transcriptionResponse.status);
            console.log('Response headers:', Object.fromEntries([...transcriptionResponse.headers.entries()]));
        
        if (!transcriptionResponse.ok) {
            const errorText = await transcriptionResponse.text();
                console.error('Whisper API error response:', errorText);
                
                // Specifieke foutmeldingen
                if (transcriptionResponse.status === 401) {
                    throw new Error('API key is ongeldig. Controleer je OpenAI API key.');
                } else if (transcriptionResponse.status === 429) {
                    throw new Error('API quota overschreden. Probeer later opnieuw.');
                } else if (transcriptionResponse.status === 413) {
                    throw new Error('Audio bestand te groot. Maak een kortere opname.');
                }
            
            try {
                const errorData = JSON.parse(errorText);
                    console.error('Parsed error data:', errorData);
                throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
            } catch (jsonError) {
                    throw new Error(`API Error (${transcriptionResponse.status}): ${errorText || 'Unknown error'}`);
            }
        }
                    
        const transcriptionText = await transcriptionResponse.text();
            console.log('Raw transcription response:', transcriptionText.substring(0, 500) + (transcriptionText.length > 500 ? '...' : ''));
>>>>>>> Stashed changes
        
        let transcriptionData;
        try {
            transcriptionData = JSON.parse(transcriptionText);
<<<<<<< Updated upstream
            console.log('Whisper API response data:', transcriptionData);
=======
                console.log('Parsed transcription data:', transcriptionData);
>>>>>>> Stashed changes
        } catch (jsonError) {
            console.error('Error parsing JSON from Whisper API response:', jsonError);
            throw new Error('Kon de API-respons niet verwerken (JSON parsing error)');
        }
        
        if (!transcriptionData.text || transcriptionData.text.trim() === '') {
            console.warn('Whisper API returned empty transcription');
            throw new Error('Geen spraak gedetecteerd in de opname. Probeer opnieuw en spreek duidelijk in de microfoon.');
        }
        
        const transcribedText = transcriptionData.text;
<<<<<<< Updated upstream
=======
            console.log('=== TRANSCRIPTION SUCCESSFUL ===');
>>>>>>> Stashed changes
        console.log('Transcribed text:', transcribedText);
        
        // Display transcription
        transcriptionContainer.classList.remove('hidden');
        transcriptionElement.textContent = transcribedText;
        
<<<<<<< Updated upstream
=======
            // Show copy transcription button
            if (copyTranscriptionButton) {
                copyTranscriptionButton.classList.remove('hidden');
            }
            
            // Continue with rest of processing...
>>>>>>> Stashed changes
        // Detect if the transcribed text is in Dutch
        const isDutchText = detectDutchLanguage(transcribedText);
        
        // Now, process the transcription using GPT to extract tasks
        statusElement.textContent = preferDutch ? 'Taken extraheren...' : 'Extracting tasks...';
<<<<<<< Updated upstream
=======
            
            console.log('=== STARTING GPT CHAT COMPLETION ===');
>>>>>>> Stashed changes
        
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
<<<<<<< Updated upstream
        
        if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
=======

            console.log('GPT Chat response status:', chatResponse.status);
        
        if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
                console.error('GPT Chat error:', errorData);
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const chatData = await chatResponse.json();
            console.log('GPT Chat response received:', chatData);

        let tasksArray = [];
        
        try {
            // Parse the response to extract the tasks
            const content = chatData.choices[0].message.content.trim();
                console.log('GPT response content:', content);
                
            // Attempt to extract JSON if it's wrapped in markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\[([\s\S]*)\]/);
            const jsonString = jsonMatch ? jsonMatch[1] : content;
                console.log('Extracted JSON string:', jsonString);
                
            tasksArray = JSON.parse(jsonString.includes('[') ? jsonString : `[${jsonString}]`);
                console.log('Parsed tasks array:', tasksArray);
        } catch (parseError) {
            console.error('Error parsing tasks:', parseError);
            throw new Error('Failed to parse tasks from AI response');
        }
        
        // Add timestamp to each task
        tasksArray = tasksArray.map(task => ({
            ...task,
            timestamp: new Date().toISOString()
        }));

            console.log('=== TASKS EXTRACTED SUCCESSFULLY ===');
            console.log('Final tasks array:', tasksArray);
        
        // Add the new tasks to our storage
        allTasks = [...allTasks, ...tasksArray];
        saveTasks();

            // After successfully extracting tasks and before displaying them
            if (notionApiKey && notionDatabaseId) {
                try {
                    statusElement.textContent = preferDutch ? 
                        'Taken toevoegen aan Notion...' : 
                        'Adding tasks to Notion...';
                    
                    console.log('=== STARTING NOTION SYNC ===');
                    await addTasksToNotion(tasksArray);
                    console.log('=== NOTION SYNC SUCCESSFUL ===');
                    
                    // Show success message
                    const successMessage = document.createElement('div');
                    successMessage.className = 'status-message success';
                    successMessage.textContent = preferDutch ? 
                        `${tasksArray.length} taken succesvol toegevoegd aan Notion!` : 
                        `Successfully added ${tasksArray.length} tasks to Notion!`;
                    statusElement.parentNode.insertBefore(successMessage, statusElement.nextSibling);
                    
                    // Remove success message after 5 seconds
                    setTimeout(() => {
                        successMessage.remove();
                    }, 5000);
                } catch (notionError) {
                    console.error('=== NOTION SYNC ERROR ===');
                    console.error('Notion error details:', notionError);
                    
                    // Show error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'status-message error';
                    errorMessage.textContent = preferDutch ? 
                        `Fout bij toevoegen aan Notion: ${notionError.message}` : 
                        `Error adding to Notion: ${notionError.message}`;
                    statusElement.parentNode.insertBefore(errorMessage, statusElement.nextSibling);
                    
                    // Remove error message after 5 seconds
                    setTimeout(() => {
                        errorMessage.remove();
                    }, 5000);
                }
            }
        
        // Display all tasks
        displayTasks(allTasks);
        statusElement.textContent = preferDutch ? 
            'Klaar om nieuwe taken op te nemen' : 
            'Ready to record new tasks';
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('Whisper API request was aborted due to timeout');
                statusElement.textContent = preferDutch ? 
                    'Timeout: Probeer een kortere opname of controleer je internetverbinding' : 
                    'Timeout: Try a shorter recording or check your internet connection';
            } else {
                console.error('Network error during Whisper API call:', fetchError);
                throw fetchError;
            }
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
} 
=======
} 

// Function to load saved Notion credentials
function loadNotionCredentials() {
    let savedNotionKey = sessionStorage.getItem('voiceTaskNotionApiKey');
    let savedNotionDbId = sessionStorage.getItem('voiceTaskNotionDatabaseId');

    if (savedNotionKey && savedNotionDbId) {
        console.log('Found Notion credentials in session storage');
        notionApiKey = savedNotionKey;
        notionDatabaseId = savedNotionDbId;
    } else {
        savedNotionKey = localStorage.getItem('voiceTaskNotionApiKey');
        savedNotionDbId = localStorage.getItem('voiceTaskNotionDatabaseId');
        const expiryDate = localStorage.getItem('voiceTaskNotionCredentialsExpiry');

        if (savedNotionKey && savedNotionDbId && expiryDate) {
            const now = new Date();
            const expiry = new Date(expiryDate);

            if (now < expiry) {
                console.log(`Found valid Notion credentials in local storage (expires: ${expiry.toLocaleDateString()})`);
                notionApiKey = savedNotionKey;
                notionDatabaseId = savedNotionDbId;
            } else {
                console.log('Notion credentials in local storage have expired, removing');
                localStorage.removeItem('voiceTaskNotionApiKey');
                localStorage.removeItem('voiceTaskNotionDatabaseId');
                localStorage.removeItem('voiceTaskNotionCredentialsExpiry');
            }
        }
    }
}

// Function to save Notion credentials
async function saveNotionCredentials() {
    // This function is now handled by the settings panel
    // Just load existing credentials if any
    console.log('saveNotionCredentials called - credentials are now managed via settings panel');
}

// Function to populate the Notion field mapping UI
function populateNotionMappingUI(schema) {
    const mappingSection = document.getElementById('notion-mapping-section');
    if (!mappingSection) {
        console.error('Notion mapping section not found');
        return;
    }

    // Show the mapping section
    mappingSection.classList.remove('hidden');

    // Get all select elements
    const taskNameSelect = document.getElementById('map-notion-task-name');
    const prioritySelect = document.getElementById('map-notion-priority');
    const dueDateSelect = document.getElementById('map-notion-due-date');
    const categorySelect = document.getElementById('map-notion-category');
    const statusSelect = document.getElementById('map-notion-status');

    // Clear existing options except the first one
    [taskNameSelect, prioritySelect, dueDateSelect, categorySelect, statusSelect].forEach(select => {
        if (select) {
            while (select.options.length > 1) {
                select.remove(1);
            }
        }
    });

    // Add options based on schema
    Object.entries(schema).forEach(([propertyName, property]) => {
        const option = document.createElement('option');
        option.value = propertyName;
        option.textContent = propertyName;
        
        // Add to appropriate select based on property type
        switch (property.type) {
            case 'title':
                taskNameSelect?.appendChild(option.cloneNode(true));
                break;
            case 'select':
                if (propertyName.toLowerCase().includes('priority') || 
                    propertyName.toLowerCase().includes('prioriteit')) {
                    prioritySelect?.appendChild(option.cloneNode(true));
                } else if (propertyName.toLowerCase().includes('category') || 
                         propertyName.toLowerCase().includes('categorie')) {
                    categorySelect?.appendChild(option.cloneNode(true));
                } else if (propertyName.toLowerCase().includes('status')) {
                    statusSelect?.appendChild(option.cloneNode(true));
                }
                break;
            case 'date':
                dueDateSelect?.appendChild(option.cloneNode(true));
                break;
        }
    });

    // Load saved mapping if it exists
    loadNotionFieldMapping();
}

// Function to save the Notion field mapping
function saveNotionFieldMapping() {
    const mapping = {
        taskName: document.getElementById('map-notion-task-name')?.value || '',
        priority: document.getElementById('map-notion-priority')?.value || '',
        dueDate: document.getElementById('map-notion-due-date')?.value || '',
        category: document.getElementById('map-notion-category')?.value || '',
        status: document.getElementById('map-notion-status')?.value || '',
        statusOption: document.getElementById('map-notion-status-option')?.value || ''
    };

    // Save to localStorage
    localStorage.setItem('notionFieldMapping', JSON.stringify(mapping));
    
    // Show success message
    const statusElement = document.getElementById('notion-mapping-status');
    if (statusElement) {
        statusElement.textContent = 'Mapping succesvol opgeslagen!';
        statusElement.className = 'status-message success';
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 3000);
    }
}

// Function to load saved Notion field mapping
function loadNotionFieldMapping() {
    const savedMapping = localStorage.getItem('notionFieldMapping');
    if (!savedMapping) return;

    try {
        const mapping = JSON.parse(savedMapping);
        
        // Set values in select elements
        if (mapping.taskName) document.getElementById('map-notion-task-name').value = mapping.taskName;
        if (mapping.priority) document.getElementById('map-notion-priority').value = mapping.priority;
        if (mapping.dueDate) document.getElementById('map-notion-due-date').value = mapping.dueDate;
        if (mapping.category) document.getElementById('map-notion-category').value = mapping.category;
        if (mapping.status) {
            const statusSelect = document.getElementById('map-notion-status');
            statusSelect.value = mapping.status;
            // Trigger change event to show status options if needed
            statusSelect.dispatchEvent(new Event('change'));
            if (mapping.statusOption) {
                document.getElementById('map-notion-status-option').value = mapping.statusOption;
            }
        }
    } catch (error) {
        console.error('Error loading Notion field mapping:', error);
    }
}

// Function to update status options when status field is selected
function updateStatusOptions(propertyName) {
    const statusOptionSelect = document.getElementById('map-notion-status-option');
    if (!statusOptionSelect || !notionDatabaseSchema) return;
    
    // Clear existing options
    statusOptionSelect.innerHTML = '<option value="">-- Selecteer Standaard Optie --</option>';
    
    const property = notionDatabaseSchema[propertyName];
    if (property && property.type === 'select' && property.select && property.select.options) {
        property.select.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.name;
            optionElement.textContent = option.name;
            statusOptionSelect.appendChild(optionElement);
        });
    }
}

// Add event listeners for mapping UI
function setupNotionMappingListeners() {
    // Save mapping button
    const saveButton = document.getElementById('save-notion-mapping-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveNotionFieldMapping);
    }

    // Status field change handler
    const statusSelect = document.getElementById('map-notion-status');
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            updateStatusOptions(e.target.value);
        });
    }
}

// Modify the existing fetchNotionDatabaseSchema function to call populateNotionMappingUI
async function fetchNotionDatabaseSchema() {
    if (!notionApiKey || !notionDatabaseId) {
        console.warn('Notion API Key or Database ID is missing. Cannot fetch schema.');
        return false;
    }

    console.log(`Fetching schema for database ID: ${notionDatabaseId}`);

    try {
        // Use Vercel proxy endpoint instead of direct Notion API
        const proxyUrl = `/api/notion?endpoint=databases/${notionDatabaseId}`;
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Notion API error via proxy:', errorData);
            
            // Provide specific error feedback
            let errorMessage = 'Notion database schema ophalen mislukt. ';
            if (response.status === 401) {
                errorMessage += 'API key is ongeldig.';
            } else if (response.status === 404) {
                errorMessage += 'Database niet gevonden of niet gedeeld met integration.';
            } else {
                errorMessage += `HTTP ${response.status}: ${errorData?.message || 'Onbekende fout'}`;
            }
            
            console.error(errorMessage);
            notionDatabaseSchema = null;
            return false;
        }

        const schemaData = await response.json();
        notionDatabaseSchema = schemaData.properties;
        console.log('Successfully fetched Notion database schema via proxy:', notionDatabaseSchema);
        
        // Populate the mapping UI with the schema
        populateNotionMappingUI(notionDatabaseSchema);
        
        // Setup event listeners for the mapping UI
        setupNotionMappingListeners();
        
        return true;

    } catch (error) {
        console.error('Exception while fetching Notion database schema via proxy:', error);
        
        // More specific error detection for proxy usage
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('Network error detected - check if Vercel proxy is deployed');
        }
        
        notionDatabaseSchema = null;
        return false;
    }
}

// Function to format a task for Notion API
function formatTaskForNotion(task) {
    const mapping = JSON.parse(localStorage.getItem('notionFieldMapping') || '{}');
    
    // Start with the required parent database
    const notionTask = {
        parent: { database_id: notionDatabaseId },
        properties: {}
    };
    
    // Map task name to title property
    if (mapping.taskName) {
        notionTask.properties[mapping.taskName] = {
            title: [
                {
                    text: {
                        content: task.task
                    }
                }
            ]
        };
    }
    
    // Map priority
    if (mapping.priority && task.criticality) {
        notionTask.properties[mapping.priority] = {
            select: {
                name: task.criticality
            }
        };
    }
    
    // Map due date
    if (mapping.dueDate && task.due_date) {
        notionTask.properties[mapping.dueDate] = {
            date: {
                start: task.due_date
            }
        };
    }
    
    // Map category
    if (mapping.category && task.category) {
        notionTask.properties[mapping.category] = {
            select: {
                name: task.category
            }
        };
    }
    
    // Map status if configured
    if (mapping.status && mapping.statusOption) {
        notionTask.properties[mapping.status] = {
            select: {
                name: mapping.statusOption
            }
        };
    }
    
    return notionTask;
}

// Function to add tasks to Notion
async function addTasksToNotion(tasks) {
    if (!notionApiKey || !notionDatabaseId) {
        console.warn('Notion API Key or Database ID is missing');
        return false;
    }
    
    const mapping = JSON.parse(localStorage.getItem('notionFieldMapping') || '{}');
    if (!mapping.taskName) {
        console.warn('Notion field mapping is not configured');
        return false;
    }
    
    try {
        const results = [];
        for (const task of tasks) {
            const notionTask = formatTaskForNotion(task);
            
            // Use Vercel proxy endpoint instead of direct Notion API
            const proxyUrl = '/api/notion?endpoint=pages';
            
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${notionApiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notionTask)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => response.text());
                console.error('Error adding task to Notion via proxy:', errorData);
                throw new Error(`Failed to add task to Notion: ${errorData.error?.message || errorData}`);
            }
            
            const result = await response.json();
            results.push(result);
        }
        
        return results;
    } catch (error) {
        console.error('Error in addTasksToNotion via proxy:', error);
        throw error;
    }
}

// Settings Panel Functions
function initializeSettingsPanel() {
    console.log('Initializing settings panel...');
    
    const settingsGearIcon = document.getElementById('settings-gear-icon');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseButton = document.getElementById('settings-close-button');
    const settingsCancelButton = document.getElementById('settings-cancel-button');
    const settingsSaveButton = document.getElementById('settings-save-button');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    

    
    if (!settingsGearIcon || !settingsOverlay) {
        console.error('Settings panel elements not found');
        return;
    }
    
    // Open settings panel
    settingsGearIcon.addEventListener('click', () => {
        loadSettingsFromStorage();
        settingsOverlay.classList.remove('hidden');
    });
    
    // Close settings panel
    const closeSettings = () => {
        settingsOverlay.classList.add('hidden');
    };
    
    settingsCloseButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSettings();
    });
    
    settingsCancelButton?.addEventListener('click', closeSettings);
    
    // Close on overlay click
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            closeSettings();
        }
    });
    
    // Save settings
    settingsSaveButton?.addEventListener('click', saveSettingsFromPanel);
    
    // Tab switching
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchSettingsTab(targetTab);
        });
    });
    
    // Initialize Notion mapping listeners for settings panel
    setupSettingsNotionMappingListeners();
    
    console.log('Settings panel initialized successfully');
}

function switchSettingsTab(targetTab) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.settings-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to clicked tab and corresponding content
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    document.getElementById(targetTab).classList.add('active');
}

function autoSaveDevelopmentKeys() {
    console.log('Auto-saving development API keys...');
    
    // Development API keys removed for security - users will enter their own keys
    const devOpenAIKey = '';
    const devNotionKey = '';
    const devNotionDbId = '';
    
    // Only save if no keys exist in storage yet
    credentialManager.retrieveCredentials().then(existingCredentials => {
        if (!existingCredentials.openaiApiKey && !existingCredentials.notionApiKey) {
            console.log('No existing credentials found - users will need to enter their own API keys');
            
            // Don't auto-save empty credentials
            if (devOpenAIKey && devNotionKey && devNotionDbId) {
                const devCredentials = {
                    openaiApiKey: devOpenAIKey,
                    notionApiKey: devNotionKey,
                    notionDatabaseId: devNotionDbId
                };
                
                credentialManager.storeCredentials(devCredentials).then(() => {
                    // Update global variables
                    apiKey = devOpenAIKey;
                    notionApiKey = devNotionKey;
                    notionDatabaseId = devNotionDbId;
                });
            }
        }
    });
}

async function loadSettingsFromStorage() {
    console.log('Loading settings from secure storage...');
    
    // Auto-save development API keys for easier testing
    autoSaveDevelopmentKeys();
    
    try {
        // Clean expired credentials first
        await credentialManager.cleanExpiredCredentials();
        
        // Retrieve credentials using enhanced method with service worker fallback
        const credentials = await credentialManager.retrieveCredentialsWithFallback();
        
        // Load OpenAI API Key
        const openaiKey = credentials.openaiApiKey || '';
        const openaiKeyInput = document.getElementById('settings-openai-key');
        if (openaiKeyInput) {
            openaiKeyInput.value = openaiKey;
        }
        
        // Update global variable
        if (openaiKey) {
            apiKey = openaiKey;
        }
        
        // Load Notion credentials
        const notionKey = credentials.notionApiKey || '';
        const notionDbId = credentials.notionDatabaseId || '';
        
        const notionKeyInput = document.getElementById('settings-notion-key');
        const notionDbIdInput = document.getElementById('settings-notion-database-id');
        
        if (notionKeyInput) notionKeyInput.value = notionKey;
        if (notionDbIdInput) notionDbIdInput.value = notionDbId;
        
        // Update global variables
        if (notionKey) notionApiKey = notionKey;
        if (notionDbId) notionDatabaseId = notionDbId;
        
        // Load Notion field mapping into settings panel
        loadSettingsNotionFieldMapping();
        
        // If we have Notion credentials, fetch schema for settings panel
        if (notionKey && notionDbId) {
            fetchNotionSchemaForSettings();
        }
        
        console.log('✅ Settings loaded successfully from secure storage');
        
    } catch (error) {
        console.error('Error loading settings from secure storage:', error);
        
        // Fallback to legacy storage for migration
        loadLegacyCredentials();
    }
}

// Migration function for legacy credentials
function loadLegacyCredentials() {
    console.log('🔄 Checking for credentials to migrate...');
    
    let tempOpenAiKey = null;
    let source = null; // To track where the key was found for cleanup

    // 1. Check for 'openaiApiKey' from new interim storage (sessionStorage first)
    tempOpenAiKey = sessionStorage.getItem('openaiApiKey');
    if (tempOpenAiKey) {
        source = { type: 'sessionStorage', key: 'openaiApiKey' };
    } else {
        // 2. Check for 'openaiApiKey' from new interim storage (localStorage)
        tempOpenAiKey = localStorage.getItem('openaiApiKey');
        if (tempOpenAiKey) {
            const expiry = localStorage.getItem('openaiApiKeyExpiry');
            if (expiry && new Date(expiry) > new Date()) {
                source = { type: 'localStorage', key: 'openaiApiKey' };
            } else if (expiry && new Date(expiry) <= new Date()) {
                // Clean up expired key from interim localStorage
                localStorage.removeItem('openaiApiKey');
                localStorage.removeItem('openaiApiKeyExpiry');
                tempOpenAiKey = null; // Don't use expired key
                console.log('Cleaned expired interim openaiApiKey from localStorage.');
            }
        }
    }

    // 3. Fallback: Check for old 'voiceTaskApiKey' (localStorage or sessionStorage)
    if (!tempOpenAiKey) {
        legacyApiKey = sessionStorage.getItem('voiceTaskApiKey') || localStorage.getItem('voiceTaskApiKey') || '';
        if (legacyApiKey) {
            tempOpenAiKey = legacyApiKey;
            // Determine source for cleanup, prioritize localStorage if present in both (though unlikely)
            if (localStorage.getItem('voiceTaskApiKey')) {
                source = { type: 'localStorage', key: 'voiceTaskApiKey' };
            } else {
                source = { type: 'sessionStorage', key: 'voiceTaskApiKey' };
            }
            console.log('Found old voiceTaskApiKey for migration.');
        }
    }
    
    // For now, we only focus on migrating OpenAI key. Notion keys are assumed to be handled by settings panel directly.
    // let legacyNotionKey = localStorage.getItem('voiceTaskNotionApiKey') || '';
    // let legacyNotionDbId = localStorage.getItem('voiceTaskNotionDatabaseId') || '';

    if (tempOpenAiKey) {
        console.log(`Migrating OpenAI key found in ${source.type} ('${source.key}').`);
        const credentialsToStore = { openaiApiKey: tempOpenAiKey };
        
        // Attempt to get Notion keys if they are also in legacy, but primary focus is OpenAI key
        const legacyNotionKey = localStorage.getItem('voiceTaskNotionApiKey');
        const legacyNotionDbId = localStorage.getItem('voiceTaskNotionDatabaseId');
        if (legacyNotionKey) credentialsToStore.notionApiKey = legacyNotionKey;
        if (legacyNotionDbId) credentialsToStore.notionDatabaseId = legacyNotionDbId;

        credentialManager.storeCredentials(credentialsToStore).then(() => {
            console.log('✅ Credentials migrated to secure storage.');
            
            // Clean up the source of the migrated key
            if (source) {
                if (source.type === 'sessionStorage') {
                    sessionStorage.removeItem(source.key);
                }
                if (source.type === 'localStorage') {
                    localStorage.removeItem(source.key);
                    if (source.key === 'openaiApiKey') localStorage.removeItem('openaiApiKeyExpiry');
                    if (source.key === 'voiceTaskApiKey') localStorage.removeItem('voiceTaskApiKeyExpiry');
                }
                console.log(`Cleaned up migrated key from ${source.type}: ${source.key}`);
            }
            
            // Also clean up potentially orphaned Notion legacy keys if they were migrated
            if (legacyNotionKey) localStorage.removeItem('voiceTaskNotionApiKey');
            if (legacyNotionDbId) localStorage.removeItem('voiceTaskNotionDatabaseId');

            // Reload settings from storage to reflect migrated key in UI
            // This might cause a loop if storeCredentials also calls loadLegacyCredentials indirectly.
            // However, the cleanup should prevent re-migration.
            loadSettingsFromStorage(); 
        }).catch(error => {
            console.error('Error migrating credentials:', error);
        });
    } else {
        console.log('No legacy credentials found needing migration for OpenAI key.');
    }
}

async function saveSettingsFromPanel() {
    console.log('Saving settings from panel...');
    
    const openaiKeyInput = document.getElementById('settings-openai-key');
    const notionKeyInput = document.getElementById('settings-notion-key');
    const notionDbIdInput = document.getElementById('settings-notion-database-id');
    
    const openaiKey = openaiKeyInput?.value.trim() || '';
    const notionKey = notionKeyInput?.value.trim() || '';
    const notionDbId = notionDbIdInput?.value.trim() || '';
    
    // Validate OpenAI key
    if (openaiKey && !openaiKey.startsWith('sk-')) {
        alert('Ongeldige OpenAI API key. Deze moet beginnen met "sk-"');
        return;
    }
    
    try {
        // Store credentials using enhanced method with service worker backup
        const credentials = {
            openaiApiKey: openaiKey,
            notionApiKey: notionKey,
            notionDatabaseId: notionDbId
        };
        
        await credentialManager.storeCredentialsWithBackup(credentials);
        
        // Update global variables
        if (openaiKey) apiKey = openaiKey;
        if (notionKey) notionApiKey = notionKey;
        if (notionDbId) notionDatabaseId = notionDbId;
        
        // Save field mapping
        saveSettingsNotionFieldMapping();
        
        // Fetch schema if both are provided
        if (notionKey && notionDbId) {
            try {
                await fetchNotionSchemaForSettings();
            } catch (error) {
                console.error('Error fetching Notion schema:', error);
            }
        }
        
        // Close settings panel
        document.getElementById('settings-overlay').classList.add('hidden');
        
        // Show success message with enhanced persistence indicator
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const originalText = statusElement.textContent;
            statusElement.textContent = '✅ Instellingen veilig opgeslagen met backup!';
            statusElement.style.backgroundColor = '#e8f5e9';
            statusElement.style.color = '#2e7d32';
            
            setTimeout(() => {
                statusElement.textContent = originalText;
                statusElement.style.backgroundColor = '';
                statusElement.style.color = '';
            }, 3000);
        }
        
        console.log('✅ Settings saved successfully with enhanced backup');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Fout bij opslaan van instellingen. Probeer het opnieuw.');
    }
}

function setupSettingsNotionMappingListeners() {
    const statusSelect = document.getElementById('settings-map-status');
    const statusOptionSelect = document.getElementById('settings-map-status-option');
    
    if (statusSelect && statusOptionSelect) {
        statusSelect.addEventListener('change', function() {
            if (this.value) {
                updateSettingsStatusOptions(this.value);
                statusOptionSelect.classList.remove('hidden');
            } else {
                statusOptionSelect.classList.add('hidden');
            }
        });
    }
}

function loadSettingsNotionFieldMapping() {
    const savedMapping = localStorage.getItem('notionFieldMapping');
    if (!savedMapping) return;
    
    try {
        const mapping = JSON.parse(savedMapping);
        
        // Load task name mapping
        const taskNameSelect = document.getElementById('settings-map-task-name');
        if (taskNameSelect && mapping.taskName) {
            taskNameSelect.value = mapping.taskName;
        }
        
        // Load priority mapping
        const prioritySelect = document.getElementById('settings-map-priority');
        if (prioritySelect && mapping.priority) {
            prioritySelect.value = mapping.priority;
        }
        
        // Load due date mapping
        const dueDateSelect = document.getElementById('settings-map-due-date');
        if (dueDateSelect && mapping.dueDate) {
            dueDateSelect.value = mapping.dueDate;
        }
        
        // Load category mapping
        const categorySelect = document.getElementById('settings-map-category');
        if (categorySelect && mapping.category) {
            categorySelect.value = mapping.category;
        }
        
        // Load status mapping
        const statusSelect = document.getElementById('settings-map-status');
        const statusOptionSelect = document.getElementById('settings-map-status-option');
        if (statusSelect && mapping.status) {
            statusSelect.value = mapping.status;
            if (mapping.statusOption && statusOptionSelect) {
                updateSettingsStatusOptions(mapping.status);
                statusOptionSelect.classList.remove('hidden');
                statusOptionSelect.value = mapping.statusOption;
            }
        }
        
        console.log('Loaded field mapping into settings panel');
    } catch (error) {
        console.error('Error loading field mapping for settings panel:', error);
    }
}

function saveSettingsNotionFieldMapping() {
    const taskNameSelect = document.getElementById('settings-map-task-name');
    const prioritySelect = document.getElementById('settings-map-priority');
    const dueDateSelect = document.getElementById('settings-map-due-date');
    const categorySelect = document.getElementById('settings-map-category');
    const statusSelect = document.getElementById('settings-map-status');
    const statusOptionSelect = document.getElementById('settings-map-status-option');
    
    const mapping = {
        taskName: taskNameSelect?.value || '',
        priority: prioritySelect?.value || '',
        dueDate: dueDateSelect?.value || '',
        category: categorySelect?.value || '',
        status: statusSelect?.value || '',
        statusOption: statusOptionSelect?.value || ''
    };
    
    localStorage.setItem('notionFieldMapping', JSON.stringify(mapping));
    console.log('Saved field mapping from settings panel');
}

async function fetchNotionSchemaForSettings() {
    if (!notionApiKey || !notionDatabaseId) {
        console.log('Missing Notion credentials for schema fetch');
        return;
    }
    
    console.log('Fetching Notion schema for settings panel via proxy...');
    
    try {
        // Use Vercel proxy endpoint instead of direct Notion API
        const proxyUrl = `/api/notion?endpoint=databases/${notionDatabaseId}`;
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Notion API error via proxy:', errorData);
            throw new Error(`HTTP error! status: ${response.status} - ${errorData?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        notionDatabaseSchema = data.properties;
        
        populateSettingsNotionMappingUI(data.properties);
        
        // Setup event listeners for the mapping UI
        setupSettingsNotionMappingListeners();
        
        console.log('Notion schema fetched successfully for settings panel via proxy');
    } catch (error) {
        console.error('Error fetching Notion schema for settings via proxy:', error);
        
        const statusElement = document.getElementById('settings-notion-mapping-status');
        if (statusElement) {
            let errorMessage = 'Fout bij ophalen database schema. ';
            
            // Detect different error types
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                errorMessage += 'API key is ongeldig. Controleer je Notion API key.';
            }
            // Detect not found error
            else if (error.message.includes('404') || error.message.includes('object_not_found')) {
                errorMessage += 'Database niet gevonden. Controleer of:\n' +
                              '• Database ID correct is\n' +
                              '• Database gedeeld is met je integration\n' +
                              '• Integration toegang heeft tot de database';
            }
            // Network/proxy errors
            else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Netwerkfout gedetecteerd. Controleer of de Vercel proxy correct is gedeployed.';
            }
            else {
                errorMessage += 'Controleer je Notion configuratie. Details: ' + error.message;
            }
            
            statusElement.textContent = errorMessage;
            statusElement.className = 'status-message error';
        }
    }
}

function populateSettingsNotionMappingUI(schema) {
    console.log('Populating settings Notion mapping UI with schema:', schema);
    
    // Get all select elements
    const taskNameSelect = document.getElementById('settings-map-task-name');
    const prioritySelect = document.getElementById('settings-map-priority');
    const dueDateSelect = document.getElementById('settings-map-due-date');
    const categorySelect = document.getElementById('settings-map-category');
    const statusSelect = document.getElementById('settings-map-status');
    
    const selects = [taskNameSelect, prioritySelect, dueDateSelect, categorySelect, statusSelect];
    
    // Clear all selects first (keep first option)
    selects.forEach(select => {
        if (select) {
            // Keep first option and clear rest
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
        }
    });
    
    // Add options based on schema with intelligent auto-mapping
    Object.entries(schema).forEach(([propertyName, propertyConfig]) => {
        const option = document.createElement('option');
        option.value = propertyName;
        option.textContent = `${propertyName} (${propertyConfig.type})`;
        
        // Add to appropriate select based on property type and intelligent mapping
        switch (propertyConfig.type) {
            case 'title':
                if (taskNameSelect) {
                    taskNameSelect.appendChild(option.cloneNode(true));
                    // Auto-select title field for task name
                    taskNameSelect.value = propertyName;
                }
                break;
            case 'select':
                const lowerName = propertyName.toLowerCase();
                if ((lowerName.includes('priority') || lowerName.includes('prioriteit')) && prioritySelect) {
                    prioritySelect.appendChild(option.cloneNode(true));
                    // Auto-select priority field
                    prioritySelect.value = propertyName;
                } else if ((lowerName.includes('category') || lowerName.includes('categorie')) && categorySelect) {
                    categorySelect.appendChild(option.cloneNode(true));
                    // Auto-select category field
                    categorySelect.value = propertyName;
                } else if (lowerName.includes('status') && statusSelect) {
                    statusSelect.appendChild(option.cloneNode(true));
                    // Auto-select status field
                    statusSelect.value = propertyName;
                    // Trigger status options update
                    updateSettingsStatusOptions(propertyName);
                    statusSelect.classList.remove('hidden');
                }
                // Also add to all other select fields as options
                selects.forEach(select => {
                    if (select && select !== taskNameSelect) {
                        const optionCopy = document.createElement('option');
                        optionCopy.value = propertyName;
                        optionCopy.textContent = `${propertyName} (${propertyConfig.type})`;
                        select.appendChild(optionCopy);
                    }
                });
                break;
            case 'date':
                if (dueDateSelect) {
                    dueDateSelect.appendChild(option.cloneNode(true));
                    // Auto-select date field for due date
                    dueDateSelect.value = propertyName;
                }
                // Also add to other selects
                selects.forEach(select => {
                    if (select && select !== dueDateSelect) {
                        const optionCopy = document.createElement('option');
                        optionCopy.value = propertyName;
                        optionCopy.textContent = `${propertyName} (${propertyConfig.type})`;
                        select.appendChild(optionCopy);
                    }
                });
                break;
            default:
                // Add to all selects for other property types
                selects.forEach(select => {
                    if (select) {
                        const optionCopy = document.createElement('option');
                        optionCopy.value = propertyName;
                        optionCopy.textContent = `${propertyName} (${propertyConfig.type})`;
                        select.appendChild(optionCopy);
                    }
                });
                break;
        }
    });
    
    // Save the automatically detected mapping
    saveSettingsNotionFieldMapping();
    
    // Then load any existing saved mapping (which may override the auto-detected values)
    loadSettingsNotionFieldMapping();
    
    console.log('Settings Notion mapping UI populated successfully with auto-mapping');
}

function updateSettingsStatusOptions(propertyName) {
    const statusOptionSelect = document.getElementById('settings-map-status-option');
    if (!statusOptionSelect || !notionDatabaseSchema) return;
    
    // Clear existing options
    statusOptionSelect.innerHTML = '<option value="">-- Selecteer Standaard Optie --</option>';
    
    const property = notionDatabaseSchema[propertyName];
    if (property && property.type === 'select' && property.select && property.select.options) {
        property.select.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.name;
            optionElement.textContent = option.name;
            statusOptionSelect.appendChild(optionElement);
        });
    }
}

console.log('✅ All event listeners setup complete'); 

// Function to delete a specific task by index
function deleteTask(taskIndex) {
    if (taskIndex >= 0 && taskIndex < allTasks.length) {
        const deletedTask = allTasks[taskIndex];
        
        // Remove task from array
        allTasks.splice(taskIndex, 1);
        
        // Save updated tasks
        saveTasks();
        
        // Re-display remaining tasks
        if (allTasks.length > 0) {
            displayTasks(allTasks);
        } else {
            // No tasks left, show empty state
            tasksContainer.classList.remove('hidden');
            tasksElement.innerHTML = '<p>Geen taken meer. Start een nieuwe opname om taken toe te voegen.</p>';
        }
        
        // Update status
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const isTaskInDutch = deletedTask.criticality && 
                                 ['laag', 'normaal', 'hoog', 'zeer hoog'].includes(deletedTask.criticality.toLowerCase());
            statusElement.textContent = isTaskInDutch ? 
                'Taak verwijderd' : 
                'Task deleted';
        }
        
        console.log(`Task deleted: ${deletedTask.task}`);
    } else {
        console.error('Invalid task index for deletion:', taskIndex);
    }
}

// Helper function to detect if a task is in Dutch
>>>>>>> Stashed changes
