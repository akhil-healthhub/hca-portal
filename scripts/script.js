// HCA Application Portal - Main JavaScript File

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtAZFSvPRVaJzVGVd7xHxdIRfM1KEPruE",
    authDomain: "access-coordinator-portal.firebaseapp.com",
    projectId: "access-coordinator-portal",
    storageBucket: "access-coordinator-portal.firebasestorage.app",
    messagingSenderId: "1095681155011",
    appId: "1:1095681155011:web:3b52fc93641d8153f56776"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log('Firebase persistence error: ', err);
      if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time
          console.log('Persistence failed - multiple tabs open');
      } else if (err.code === 'unimplemented') {
          // The current browser doesn't support all of the features required
          console.log('Persistence is not available in this browser');
      }
  });

// Application data structure
let applications = [];

// DOM elements
let applicationsContainer, searchInput, appModal, excelModal, excelListModal, appForm, excelForm;
let modalTitle, excelModalTitle, appId, appName, appUrl, appDescription, appStatus;
let excelId, excelAppId, excelName, excelUrl, addAppBtn, addFirstAppBtn, viewExcelBtn;
let cancelAppBtn, cancelExcelBtn, closeModalButtons, filterButtons, totalAppsEl, excelAppsEl;
let downCountEl, excelListContainer, tabs, firebaseStatus;

// Initialize the dashboard
function initDashboard() {
    // Initialize DOM elements
    applicationsContainer = document.getElementById('applications-container');
    searchInput = document.getElementById('search-input');
    appModal = document.getElementById('app-modal');
    excelModal = document.getElementById('excel-modal');
    excelListModal = document.getElementById('excel-list-modal');
    appForm = document.getElementById('app-form');
    excelForm = document.getElementById('excel-form');
    modalTitle = document.getElementById('modal-title');
    excelModalTitle = document.getElementById('excel-modal-title');
    appId = document.getElementById('app-id');
    appName = document.getElementById('app-name');
    appUrl = document.getElementById('app-url');
    appDescription = document.getElementById('app-description');
    appStatus = document.getElementById('app-status');
    excelId = document.getElementById('excel-id');
    excelAppId = document.getElementById('excel-app-id');
    excelName = document.getElementById('excel-name');
    excelUrl = document.getElementById('excel-url');
    addAppBtn = document.getElementById('add-app-btn');
    viewExcelBtn = document.getElementById('view-excel-btn');
    cancelAppBtn = document.getElementById('cancel-app-btn');
    cancelExcelBtn = document.getElementById('cancel-excel-btn');
    closeModalButtons = document.querySelectorAll('.close-modal');
    filterButtons = document.querySelectorAll('.filter-btn');
    totalAppsEl = document.getElementById('total-apps');
    excelAppsEl = document.getElementById('excel-apps');
    downCountEl = document.getElementById('down-count');
    excelListContainer = document.getElementById('excel-list-container');
    tabs = document.querySelectorAll('.tab');
    firebaseStatus = document.getElementById('firebase-status');
    
    // Load data from Firebase
    loadApplications();
    setupEventListeners();
    
    // Show Firebase connection status
    firebaseStatus.style.display = 'flex';
    
    // Monitor connection status
    firebase.firestore().enableNetwork()
        .then(() => {
            firebaseStatus.className = 'firebase-status firebase-connected';
            firebaseStatus.innerHTML = '<i class="fas fa-cloud"></i><span>Connected to Firebase</span>';
            hideOfflineNotification();
        })
        .catch((error) => {
            firebaseStatus.className = 'firebase-status firebase-disconnected';
            firebaseStatus.innerHTML = '<i class="fas fa-cloud"></i><span>Disconnected from Firebase</span>';
            showOfflineNotification();
            console.error("Firebase connection error: ", error);
        });
        
    // Listen for online/offline status
    window.addEventListener('online', function() {
        firebaseStatus.className = 'firebase-status firebase-connected';
        firebaseStatus.innerHTML = '<i class="fas fa-cloud"></i><span>Connected to Firebase</span>';
        hideOfflineNotification();
        
        // Try to sync with Firebase
        firebase.firestore().enableNetwork()
            .then(() => {
                loadApplications();
            });
    });

    window.addEventListener('offline', function() {
        firebaseStatus.className = 'firebase-status firebase-disconnected';
        firebaseStatus.innerHTML = '<i class="fas fa-cloud"></i><span>Disconnected from Firebase</span>';
        showOfflineNotification();
    });
}

// Show offline notification
function showOfflineNotification() {
    let offlineNotification = document.getElementById('offline-notification');
    if (!offlineNotification) {
        offlineNotification = document.createElement('div');
        offlineNotification.id = 'offline-notification';
        offlineNotification.className = 'offline-notification';
        offlineNotification.innerHTML = '<i class="fas fa-wifi"></i><span>Working offline - changes will sync when online</span>';
        document.body.appendChild(offlineNotification);
    }
}

// Hide offline notification
function hideOfflineNotification() {
    const offlineNotification = document.getElementById('offline-notification');
    if (offlineNotification) {
        offlineNotification.remove();
    }
}

// Load applications from Firebase
function loadApplications() {
    applicationsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
    
    // Use a try-catch block for better error handling
    try {
        db.collection("applications").orderBy("createdAt", "desc")
            .get()
            .then((querySnapshot) => {
                applications = [];
                querySnapshot.forEach((doc) => {
                    const appData = doc.data();
                    applications.push({
                        id: doc.id,
                        ...appData
                    });
                });
                updateStats();
                filterApplications();
            })
            .catch((error) => {
                console.error("Error loading applications: ", error);
                showErrorState("Error Loading Applications", "There was a problem connecting to the database");
            });
    } catch (error) {
        console.error("Unexpected error: ", error);
        showErrorState("Unexpected Error", "An unexpected error occurred while loading applications");
    }
}

// Show error state
function showErrorState(title, message) {
    applicationsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadApplications()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners() {
    // Add application buttons
    addAppBtn.addEventListener('click', () => openAppModal());
    
    // View Excel files button
    viewExcelBtn.addEventListener('click', () => openExcelListModal());
    
    // Form submissions
    appForm.addEventListener('submit', handleAppSubmit);
    excelForm.addEventListener('submit', handleExcelSubmit);
    
    // Cancel buttons
    cancelAppBtn.addEventListener('click', () => closeModal(appModal));
    cancelExcelBtn.addEventListener('click', () => closeModal(excelModal));
    
    // Close modal buttons
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', () => {
        filterApplications();
    });
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterApplications();
        });
    });
    
    // Tabs in Excel list modal
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderExcelList(this.dataset.tab);
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === appModal) closeModal(appModal);
        if (e.target === excelModal) closeModal(excelModal);
        if (e.target === excelListModal) closeModal(excelListModal);
    });
}

// Open application modal
function openAppModal(id = null) {
    if (id) {
        // Edit existing application
        const app = applications.find(a => a.id === id);
        if (app) {
            modalTitle.textContent = 'Edit Application';
            appId.value = app.id;
            appName.value = app.name;
            appUrl.value = app.url;
            appDescription.value = app.description || '';
            appStatus.value = app.status || 'active';
        }
    } else {
        // Add new application
        modalTitle.textContent = 'Add New Application';
        appForm.reset();
        appId.value = '';
        appStatus.value = 'active';
    }
    appModal.style.display = 'flex';
}

// Open Excel modal
function openExcelModal(appId, excelIdParam = null) {
    if (excelIdParam) {
        // Edit existing Excel file
        const app = applications.find(a => a.id === appId);
        if (app && app.excelFiles) {
            const excelFile = app.excelFiles.find(f => f.id === excelIdParam);
            if (excelFile) {
                excelModalTitle.textContent = 'Edit Excel File';
                document.getElementById('excel-id').value = excelFile.id;
                document.getElementById('excel-app-id').value = appId;
                document.getElementById('excel-name').value = excelFile.name;
                document.getElementById('excel-url').value = excelFile.url;
            }
        }
    } else {
        // Add new Excel file
        excelModalTitle.textContent = 'Add Excel File';
        excelForm.reset();
        document.getElementById('excel-id').value = '';
        document.getElementById('excel-app-id').value = appId;
    }
    excelModal.style.display = 'flex';
}

// Open Excel list modal
function openExcelListModal() {
    excelListModal.style.display = 'flex';
    renderExcelList('all');
}

// Close modal
function closeModal(modal) {
    modal.style.display = 'none';
}

// Handle application form submission
function handleAppSubmit(e) {
    e.preventDefault();
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitButton.disabled = true;
    
    const currentTime = new Date().toISOString();
    
    const application = {
        name: appName.value,
        url: appUrl.value,
        description: appDescription.value,
        status: appStatus.value,
        excelFiles: appId.value ? applications.find(a => a.id === appId.value)?.excelFiles || [] : [],
        accessCount: appId.value ? applications.find(a => a.id === appId.value)?.accessCount || 0 : 0,
        createdAt: appId.value ? applications.find(a => a.id === appId.value)?.createdAt || currentTime : currentTime,
        lastAccessed: currentTime
    };
    
    if (appId.value) {
        // Update existing application
        db.collection("applications").doc(appId.value).update(application)
            .then(() => {
                console.log("Application updated successfully");
                closeModal(appModal);
                loadApplications();
            })
            .catch((error) => {
                console.error("Error updating application: ", error);
                alert("Error updating application. Please try again.");
            })
            .finally(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            });
    } else {
        // Add new application
        db.collection("applications").add(application)
            .then(() => {
                console.log("Application added successfully");
                closeModal(appModal);
                loadApplications();
            })
            .catch((error) => {
                console.error("Error adding application: ", error);
                alert("Error adding application. Please try again.");
            })
            .finally(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            });
    }
}

// Handle Excel form submission
function handleExcelSubmit(e) {
    e.preventDefault();
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitButton.disabled = true;
    
    const excelIdValue = document.getElementById('excel-id').value;
    const excelAppIdValue = document.getElementById('excel-app-id').value;
    const excelNameValue = document.getElementById('excel-name').value;
    const excelUrlValue = document.getElementById('excel-url').value;
    
    const appIndex = applications.findIndex(a => a.id === excelAppIdValue);
    if (appIndex === -1) {
        alert("Application not found");
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        return;
    }
    
    if (!applications[appIndex].excelFiles) {
        applications[appIndex].excelFiles = [];
    }
    
    const excelFile = {
        id: excelIdValue || Date.now().toString(),
        name: excelNameValue,
        url: excelUrlValue,
        createdAt: excelIdValue ? applications[appIndex].excelFiles.find(f => f.id === excelIdValue)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };
    
    let updatedExcelFiles;
    if (excelIdValue) {
        // Update existing Excel file
        updatedExcelFiles = applications[appIndex].excelFiles.map(f => 
            f.id === excelIdValue ? excelFile : f
        );
    } else {
        // Add new Excel file
        updatedExcelFiles = [...applications[appIndex].excelFiles, excelFile];
    }
    
    // Update the application with the new Excel files
    db.collection("applications").doc(excelAppIdValue).update({
        excelFiles: updatedExcelFiles
    })
    .then(() => {
        console.log("Excel file saved successfully");
        closeModal(excelModal);
        loadApplications();
    })
    .catch((error) => {
        console.error("Error saving Excel file: ", error);
        alert("Error saving Excel file. Please try again.");
    })
    .finally(() => {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    });
}

// Delete application
function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application? All associated Excel files will also be deleted.')) {
        db.collection("applications").doc(id).delete()
            .then(() => {
                console.log("Application deleted successfully");
                loadApplications();
            })
            .catch((error) => {
                console.error("Error deleting application: ", error);
                alert("Error deleting application. Please try again.");
            });
    }
}

// Delete Excel file
function deleteExcelFile(appId, excelId) {
    if (confirm('Are you sure you want to delete this Excel file?')) {
        const appIndex = applications.findIndex(a => a.id === appId);
        if (appIndex !== -1 && applications[appIndex].excelFiles) {
            const updatedExcelFiles = applications[appIndex].excelFiles.filter(f => f.id !== excelId);
            
            db.collection("applications").doc(appId).update({
                excelFiles: updatedExcelFiles
            })
            .then(() => {
                console.log("Excel file deleted successfully");
                loadApplications();
            })
            .catch((error) => {
                console.error("Error deleting Excel file: ", error);
                alert("Error deleting Excel file. Please try again.");
            });
        }
    }
}

// Record application access
function recordAccess(id) {
    const appIndex = applications.findIndex(a => a.id === id);
    if (appIndex !== -1) {
        const accessCount = (applications[appIndex].accessCount || 0) + 1;
        const lastAccessed = new Date().toISOString();
        
        db.collection("applications").doc(id).update({
            accessCount: accessCount,
            lastAccessed: lastAccessed
        })
        .then(() => {
            console.log("Access recorded successfully");
            loadApplications();
        })
        .catch((error) => {
            console.error("Error recording access: ", error);
        });
    }
}

// Update statistics
function updateStats() {
    totalAppsEl.textContent = applications.length;
    
    const appsWithExcel = applications.filter(app => app.excelFiles && app.excelFiles.length > 0).length;
    excelAppsEl.textContent = appsWithExcel;
    
    // Count server down apps
    const downApps = applications.filter(app => app.status === 'down');
    downCountEl.textContent = downApps.length;
}

// Filter applications based on search and active filter
function filterApplications() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    let filteredApps = applications;
    
    // Apply search filter
    if (searchTerm) {
        filteredApps = filteredApps.filter(app => 
            app.name.toLowerCase().includes(searchTerm) || 
            (app.description && app.description.toLowerCase().includes(searchTerm)) ||
            (app.excelFiles && app.excelFiles.some(f => f.name.toLowerCase().includes(searchTerm)))
        );
    }
    
    // Apply category filter
    switch (activeFilter) {
        case 'frequent':
            filteredApps = filteredApps.filter(app => app.accessCount > 0)
                .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
            break;
        case 'excel':
            filteredApps = filteredApps.filter(app => app.excelFiles && app.excelFiles.length > 0);
            break;
        case 'recent':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filteredApps = filteredApps.filter(app => {
                const createdDate = new Date(app.createdAt);
                return createdDate >= oneWeekAgo;
            }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'active':
            filteredApps = filteredApps.filter(app => app.status === 'active');
            break;
        case 'down':
            filteredApps = filteredApps.filter(app => app.status === 'down');
            break;
    }
    
    displayApplications(filteredApps);
}

// Display applications
function displayApplications(apps) {
    applicationsContainer.innerHTML = '';
    
    if (apps.length === 0) {
        applicationsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Applications Found</h3>
                <p>Try changing your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    apps.forEach(app => {
        const appCard = document.createElement('div');
        appCard.className = 'app-card';
        
        // Determine status class
        let statusClass = 'status-active';
        if (app.status === 'down') statusClass = 'status-down';
        if (app.status === 'maintenance') statusClass = 'status-maintenance';
        
        // Format last accessed time
        let lastAccessedText = 'Not accessed yet';
        if (app.lastAccessed) {
            const lastAccessedDate = new Date(app.lastAccessed);
            lastAccessedText = `Last accessed: ${lastAccessedDate.toLocaleDateString()} ${lastAccessedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        appCard.innerHTML = `
            <div class="app-card-header">
                <h3>${app.name}</h3>
                <span class="app-status ${statusClass}">${app.status}</span>
            </div>
            <div class="app-card-body">
                ${app.description ? `<p class="app-description">${app.description}</p>` : ''}
                <div class="app-links">
                    <a href="${app.url}" target="_blank" class="app-link" onclick="recordAccess('${app.id}')">
                        <i class="fas fa-external-link-alt"></i>
                        Open Application
                    </a>
                </div>
                <div class="excel-section">
                    <div class="excel-section-header">
                        <div class="excel-section-title">Excel Files</div>
                        <button class="action-btn add-excel-btn" data-app-id="${app.id}">
                            <i class="fas fa-plus"></i> Add Excel
                        </button>
                    </div>
                    ${app.excelFiles && app.excelFiles.length > 0 ? `
                        <div class="excel-list">
                            ${app.excelFiles.map(file => `
                                <div class="excel-item">
                                    <div>${file.name}</div>
                                    <div class="excel-item-actions">
                                        <a href="${file.url}" target="_blank" class="excel-item-btn" onclick="recordAccess('${app.id}')">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                        <button class="excel-item-btn" onclick="openExcelModal('${app.id}', '${file.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="excel-item-btn" onclick="deleteExcelFile('${app.id}', '${file.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No Excel files added yet</p>'}
                </div>
            </div>
            <div class="app-card-footer">
                <div class="app-actions">
                    <button class="action-btn edit-btn" data-app-id="${app.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-app-id="${app.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
                <div class="last-accessed">
                    ${lastAccessedText}
                </div>
            </div>
        `;
        
        applicationsContainer.appendChild(appCard);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-app-id');
            openAppModal(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-app-id');
            deleteApplication(id);
        });
    });
    
    document.querySelectorAll('.add-excel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appId = e.currentTarget.getAttribute('data-app-id');
            openExcelModal(appId);
        });
    });
}

// Render Excel list
function renderExcelList(filter) {
    let allExcelFiles = [];
    
    applications.forEach(app => {
        if (app.excelFiles && app.excelFiles.length > 0) {
            app.excelFiles.forEach(file => {
                allExcelFiles.push({
                    ...file,
                    appName: app.name,
                    appId: app.id
                });
            });
        }
    });
    
    if (filter === 'recent') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        allExcelFiles = allExcelFiles.filter(file => {
            const createdDate = new Date(file.createdAt);
            return createdDate >= oneWeekAgo;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    excelListContainer.innerHTML = '';
    
    if (allExcelFiles.length === 0) {
        excelListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-excel"></i>
                <h3>No Excel Files</h3>
                <p>There are no Excel files to display</p>
            </div>
        `;
        return;
    }
    
    allExcelFiles.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'excel-item';
        fileEl.innerHTML = `
            <div>
                <div><strong>${file.name}</strong></div>
                <div style="font-size: 12px; color: #666;">From: ${file.appName}</div>
            </div>
            <div class="excel-item-actions">
                <a href="${file.url}" target="_blank" class="excel-item-btn" onclick="recordAccess('${file.appId}')">
                    <i class="fas fa-external-link-alt"></i>
                </a>
                <button class="excel-item-btn" onclick="openExcelModal('${file.appId}', '${file.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="excel-item-btn" onclick="deleteExcelFile('${file.appId}', '${file.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        excelListContainer.appendChild(fileEl);
    });
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);