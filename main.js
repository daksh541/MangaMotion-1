// MangaMotion AI - Main JavaScript File
// Shared functionality across all pages

// Global variables
let currentUser = {
    plan: 'free',
    isLoggedIn: true
};

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Set notification style based on type
    switch(type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500', 'text-black');
            break;
        default:
            notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Loading animation functions
function showLoading(element, text = 'Loading...') {
    const originalContent = element.innerHTML;
    element.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text}`;
    element.disabled = true;
    element.dataset.originalContent = originalContent;
}

function hideLoading(element) {
    if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
        element.disabled = false;
        delete element.dataset.originalContent;
    }
}

// File upload utilities
function validateFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please upload PNG, JPG, WebP, or PDF files.' };
    }
    
    if (file.size > maxSize) {
        return { valid: false, error: 'File too large. Maximum size is 50MB.' };
    }
    
    return { valid: true };
}

// Animation helpers
function fadeIn(element, duration = 500) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = null;
    
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.min(progress / duration, 1);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

function fadeOut(element, duration = 500) {
    let start = null;
    
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.max(1 - (progress / duration), 0);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }
    
    requestAnimationFrame(animate);
}

// Local storage helpers
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to storage:', error);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load from storage:', error);
        return defaultValue;
    }
}

// API simulation functions
function simulateAPICall(endpoint, data, delay = 1500) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate random failures (5% chance)
            if (Math.random() < 0.05) {
                reject(new Error('Network error. Please try again.'));
                return;
            }
            
            // Simulate different API responses
            switch(endpoint) {
                case 'upload':
                    resolve({ success: true, fileId: 'file_' + Date.now() });
                    break;
                case 'process':
                    resolve({ success: true, panels: Math.floor(Math.random() * 5) + 1 });
                    break;
                case 'export':
                    resolve({ success: true, downloadUrl: '/download/video_' + Date.now() + '.mp4' });
                    break;
                default:
                    resolve({ success: true, message: 'Operation completed successfully.' });
            }
        }, delay);
    });
}

// Project management
class ProjectManager {
    constructor() {
        this.projects = this.loadProjects();
    }
    
    loadProjects() {
        return loadFromStorage('mangamotion_projects', [
            {
                id: 'project1',
                title: 'My Hero Academia',
                description: 'Chapter 1: The Beginning',
                status: 'completed',
                duration: '2:34',
                lastEdited: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                panels: 3
            },
            {
                id: 'project2',
                title: 'Dragon Ball Z',
                description: 'Saiyan Saga Episode 1',
                status: 'draft',
                duration: '1:45',
                lastEdited: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                panels: 4
            }
        ]);
    }
    
    saveProjects() {
        saveToStorage('mangamotion_projects', this.projects);
    }
    
    addProject(projectData) {
        const newProject = {
            id: 'project_' + Date.now(),
            title: projectData.title || 'Untitled Project',
            description: projectData.description || '',
            status: 'draft',
            duration: '0:00',
            lastEdited: new Date(),
            panels: projectData.panels || 0,
            ...projectData
        };
        
        this.projects.unshift(newProject);
        this.saveProjects();
        return newProject;
    }
    
    updateProject(projectId, updates) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            this.projects[projectIndex] = {
                ...this.projects[projectIndex],
                ...updates,
                lastEdited: new Date()
            };
            this.saveProjects();
            return this.projects[projectIndex];
        }
        return null;
    }
    
    deleteProject(projectId) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.saveProjects();
    }
    
    getProject(projectId) {
        return this.projects.find(p => p.id === projectId);
    }
}

// Initialize project manager
const projectManager = new ProjectManager();

// User preferences
class UserPreferences {
    constructor() {
        this.preferences = loadFromStorage('mangamotion_preferences', {
            theme: 'dark',
            autoplay: true,
            notifications: true,
            defaultQuality: '720p'
        });
    }
    
    save() {
        saveToStorage('mangamotion_preferences', this.preferences);
    }
    
    get(key) {
        return this.preferences[key];
    }
    
    set(key, value) {
        this.preferences[key] = value;
        this.save();
    }
}

const userPreferences = new UserPreferences();

// Analytics and tracking (simulated)
function trackEvent(eventName, properties = {}) {
    // In a real app, this would send data to analytics service
    console.log('Analytics Event:', eventName, properties);
}

// Performance monitoring
function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`Performance: ${name} took ${end - start} milliseconds`);
    return result;
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    trackEvent('error', {
        message: event.error.message,
        filename: event.filename,
        lineno: event.lineno
    });
});

// Service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW register failed', err));
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Track page view
    trackEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
    });
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = performance.getEntriesByType('navigation')[0];
                trackEvent('performance', {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart
                });
            }, 0);
        });
    }
});

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (typeof saveProject === 'function') {
                saveProject();
            }
        }
        
        // Space to play/pause
        if (event.key === ' ' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            if (typeof togglePlayback === 'function') {
                togglePlayback();
            }
        }
        
        // Escape to close modals
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
            modals.forEach(modal => {
                if (modal.id === 'upgradeModal') {
                    closeUpgradeModal();
                }
                // Add other modal close functions as needed
            });
        }
    });
}

// Tooltip system
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.target;
    const text = element.dataset.tooltip;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute z-50 px-2 py-1 text-sm bg-gray-800 text-white rounded shadow-lg pointer-events-none';
    tooltip.textContent = text;
    tooltip.id = 'tooltip';
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        document.body.removeChild(tooltip);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        showLoading,
        hideLoading,
        validateFile,
        projectManager,
        userPreferences,
        trackEvent,
        measurePerformance
    };
}

// Global functions for inline event handlers
window.showNotification = showNotification;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.trackEvent = trackEvent;