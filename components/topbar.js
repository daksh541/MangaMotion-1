// MangaMotion AI - Topbar Component
// Sticky header with logo, project name, search, notifications, and user menu

class Topbar {
    constructor(options = {}) {
        this.options = {
            showProjectName: true,
            showSearch: true,
            showNotifications: true,
            showUserMenu: true,
            sticky: true,
            ...options
        };
        
        this.notifications = [
            { id: 1, type: 'success', message: 'Project exported successfully', time: '2 min ago', read: false },
            { id: 2, type: 'info', message: 'New voice pack available', time: '1 hour ago', read: false },
            { id: 3, type: 'warning', message: 'Storage limit approaching', time: '3 hours ago', read: true }
        ];
        
        this.user = {
            name: 'Alex Chen',
            email: 'alex@example.com',
            plan: 'Creator',
            avatar: 'AC'
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        if (this.options.sticky) {
            this.makeSticky();
        }
    }
    
    render() {
        const topbarHTML = `
            <nav class="topbar" id="topbar">
                <div class="topbar-container">
                    <!-- Logo Section -->
                    <div class="topbar-logo">
                        <div class="logo-icon">
                            <i class="fas fa-play"></i>
                        </div>
                        <span class="logo-text">MangaMotion AI</span>
                        ${this.options.showProjectName ? this.renderProjectName() : ''}
                    </div>
                    
                    <!-- Center Section -->
                    <div class="topbar-center">
                        ${this.options.showSearch ? this.renderSearch() : ''}
                    </div>
                    
                    <!-- Right Section -->
                    <div class="topbar-right">
                        ${this.options.showNotifications ? this.renderNotifications() : ''}
                        ${this.options.showUserMenu ? this.renderUserMenu() : ''}
                    </div>
                </div>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', topbarHTML);
        this.element = document.getElementById('topbar');
    }
    
    renderProjectName() {
        return `
            <div class="project-name-section">
                <span class="project-separator">/</span>
                <span class="project-name" contenteditable="true" data-placeholder="Untitled Project">
                    My Hero Academia - Chapter 1
                </span>
                <button class="project-edit-btn" title="Edit project name">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
    }
    
    renderSearch() {
        return `
            <div class="search-container">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" placeholder="Quick search..." />
                    <div class="search-shortcut">Ctrl+K</div>
                </div>
                <div class="search-dropdown" id="searchDropdown">
                    <div class="search-suggestions">
                        <div class="suggestion-item">
                            <i class="fas fa-file"></i>
                            <span>Recent Projects</span>
                        </div>
                        <div class="suggestion-item">
                            <i class="fas fa-microphone"></i>
                            <span>Voice Library</span>
                        </div>
                        <div class="suggestion-item">
                            <i class="fas fa-cog"></i>
                            <span>Settings</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNotifications() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        return `
            <div class="notifications-container">
                <button class="notifications-btn" id="notificationsBtn">
                    <i class="fas fa-bell"></i>
                    ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
                </button>
                <div class="notifications-dropdown" id="notificationsDropdown">
                    <div class="notifications-header">
                        <h3>Notifications</h3>
                        <button class="mark-all-read">Mark all as read</button>
                    </div>
                    <div class="notifications-list">
                        ${this.notifications.map(notification => this.renderNotificationItem(notification)).join('')}
                    </div>
                    <div class="notifications-footer">
                        <a href="#" class="view-all">View all notifications</a>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNotificationItem(notification) {
        const iconMap = {
            success: 'fa-check-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-exclamation-circle'
        };
        
        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${iconMap[notification.type]}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-time">${notification.time}</span>
                </div>
                <button class="notification-close" data-id="${notification.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    renderUserMenu() {
        return `
            <div class="user-menu-container">
                <button class="user-menu-btn" id="userMenuBtn">
                    <div class="user-avatar">${this.user.avatar}</div>
                    <span class="user-name">${this.user.name}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-menu-dropdown" id="userMenuDropdown">
                    <div class="user-info">
                        <div class="user-avatar-large">${this.user.avatar}</div>
                        <div class="user-details">
                            <h4>${this.user.name}</h4>
                            <p>${this.user.email}</p>
                            <span class="user-plan">${this.user.plan} Plan</span>
                        </div>
                    </div>
                    <div class="user-menu-items">
                        <a href="#" class="menu-item">
                            <i class="fas fa-user"></i>
                            <span>Profile</span>
                        </a>
                        <a href="pricing.html" class="menu-item">
                            <i class="fas fa-credit-card"></i>
                            <span>Billing</span>
                        </a>
                        <a href="#" class="menu-item">
                            <i class="fas fa-cog"></i>
                            <span>Settings</span>
                        </a>
                        <a href="#" class="menu-item">
                            <i class="fas fa-question-circle"></i>
                            <span>Help & Support</span>
                        </a>
                        <div class="menu-divider"></div>
                        <a href="login.html" class="menu-item logout">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // Search functionality
        const searchInput = this.element.querySelector('.search-input');
        const searchDropdown = this.element.querySelector('#searchDropdown');
        
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                searchDropdown.classList.add('active');
            });
            
            searchInput.addEventListener('blur', (e) => {
                setTimeout(() => searchDropdown.classList.remove('active'), 100);
            });
            
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Notifications
        const notificationsBtn = this.element.querySelector('#notificationsBtn');
        const notificationsDropdown = this.element.querySelector('#notificationsDropdown');
        
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationsDropdown.classList.toggle('active');
                this.updateNotificationsPosition();
            });
        }
        
        // User menu
        const userMenuBtn = this.element.querySelector('#userMenuBtn');
        const userMenuDropdown = this.element.querySelector('#userMenuDropdown');
        
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenuDropdown.classList.toggle('active');
                this.updateUserMenuPosition();
            });
        }
        
        // Project name editing
        const projectName = this.element.querySelector('.project-name');
        if (projectName) {
            projectName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    projectName.blur();
                }
            });
            
            projectName.addEventListener('blur', (e) => {
                this.saveProjectName(e.target.textContent.trim());
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.closeAllDropdowns();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput?.focus();
            }
        });
    }
    
    handleSearch(query) {
        // Simulate search functionality
        console.log('Searching for:', query);
        // In a real app, this would make API calls and update search results
    }
    
    saveProjectName(name) {
        if (name && name !== 'Untitled Project') {
            console.log('Saving project name:', name);
            // In a real app, this would save to backend
            this.showNotification('Project name saved', 'success');
        }
    }
    
    updateNotificationsPosition() {
        const dropdown = this.element.querySelector('#notificationsDropdown');
        const btn = this.element.querySelector('#notificationsBtn');
        if (dropdown && btn) {
            const rect = btn.getBoundingClientRect();
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
            dropdown.style.top = `${rect.bottom + 8}px`;
        }
    }
    
    updateUserMenuPosition() {
        const dropdown = this.element.querySelector('#userMenuDropdown');
        const btn = this.element.querySelector('#userMenuBtn');
        if (dropdown && btn) {
            const rect = btn.getBoundingClientRect();
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
            dropdown.style.top = `${rect.bottom + 8}px`;
        }
    }
    
    closeAllDropdowns() {
        this.element.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
    
    makeSticky() {
        this.element.classList.add('sticky');
        document.body.style.paddingTop = '64px';
    }
    
    showNotification(message, type = 'info') {
        // Use the global notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }
    
    // Public methods
    setProjectName(name) {
        const projectNameEl = this.element.querySelector('.project-name');
        if (projectNameEl) {
            projectNameEl.textContent = name || 'Untitled Project';
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift({
            id: Date.now(),
            ...notification
        });
        this.render(); // Re-render to update notification count
    }
    
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}

// CSS for topbar component
const topbarStyles = `
    <style>
        .topbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: #0B1220;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        
        .topbar.sticky {
            position: fixed;
        }
        
        .topbar-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 100%;
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        .topbar-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #FF3366 0%, #1F8FFF 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .logo-text {
            font-size: 18px;
            font-weight: 700;
            color: #E6EEF6;
        }
        
        .project-name-section {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: 12px;
        }
        
        .project-separator {
            color: #94A3B8;
            font-weight: 300;
        }
        
        .project-name {
            font-size: 14px;
            color: #94A3B8;
            min-width: 100px;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: text;
            outline: none;
            transition: all 0.2s ease;
        }
        
        .project-name:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .project-name:focus {
            background: rgba(255, 51, 102, 0.1);
            color: #E6EEF6;
            border: 1px solid rgba(255, 51, 102, 0.3);
        }
        
        .project-name:empty::before {
            content: attr(data-placeholder);
            color: #94A3B8;
        }
        
        .project-edit-btn {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .project-edit-btn:hover {
            color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
        }
        
        .topbar-center {
            flex: 1;
            display: flex;
            justify-content: center;
            max-width: 400px;
            margin: 0 24px;
        }
        
        .search-container {
            position: relative;
            width: 100%;
        }
        
        .search-box {
            position: relative;
            display: flex;
            align-items: center;
        }
        
        .search-icon {
            position: absolute;
            left: 12px;
            color: #94A3B8;
            font-size: 14px;
            z-index: 1;
        }
        
        .search-input {
            width: 100%;
            height: 36px;
            padding: 0 12px 0 36px;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #E6EEF6;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
        }
        
        .search-input:focus {
            border-color: #FF3366;
            box-shadow: 0 0 0 3px rgba(255, 51, 102, 0.1);
        }
        
        .search-input::placeholder {
            color: #94A3B8;
        }
        
        .search-shortcut {
            position: absolute;
            right: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: #94A3B8;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-family: 'JetBrains Mono', monospace;
        }
        
        .search-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            margin-top: 8px;
            box-shadow: 0 8px 24px rgba(3, 6, 23, 0.6);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.2s ease;
            z-index: 1001;
        }
        
        .search-dropdown.active {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
        }
        
        .search-suggestions {
            padding: 8px 0;
        }
        
        .suggestion-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            color: #94A3B8;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .suggestion-item:hover {
            background: rgba(255, 51, 102, 0.1);
            color: #E6EEF6;
        }
        
        .topbar-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .notifications-container {
            position: relative;
        }
        
        .notifications-btn {
            position: relative;
            background: none;
            border: none;
            color: #94A3B8;
            font-size: 18px;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .notifications-btn:hover {
            color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
        }
        
        .notification-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: #FF3366;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
        }
        
        .notifications-dropdown {
            position: fixed;
            width: 360px;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(3, 6, 23, 0.6);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.2s ease;
            z-index: 1001;
        }
        
        .notifications-dropdown.active {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
        }
        
        .notifications-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .notifications-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0;
        }
        
        .mark-all-read {
            background: none;
            border: none;
            color: #1F8FFF;
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .mark-all-read:hover {
            background: rgba(31, 143, 255, 0.1);
        }
        
        .notifications-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .notification-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
            cursor: pointer;
        }
        
        .notification-item:hover {
            background: rgba(255, 51, 102, 0.05);
        }
        
        .notification-item.unread {
            background: rgba(31, 143, 255, 0.05);
        }
        
        .notification-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        
        .notification-icon.success {
            background: rgba(39, 174, 96, 0.2);
            color: #27AE60;
        }
        
        .notification-icon.info {
            background: rgba(31, 143, 255, 0.2);
            color: #1F8FFF;
        }
        
        .notification-icon.warning {
            background: rgba(243, 156, 18, 0.2);
            color: #F39C12;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-message {
            font-size: 14px;
            color: #E6EEF6;
            margin: 0 0 4px 0;
            line-height: 1.4;
        }
        
        .notification-time {
            font-size: 12px;
            color: #94A3B8;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            opacity: 0;
        }
        
        .notification-item:hover .notification-close {
            opacity: 1;
        }
        
        .notification-close:hover {
            color: #E74C3C;
            background: rgba(231, 76, 60, 0.1);
        }
        
        .notifications-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
        }
        
        .view-all {
            color: #1F8FFF;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .view-all:hover {
            color: #0077e6;
        }
        
        .user-menu-container {
            position: relative;
        }
        
        .user-menu-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: none;
            color: #E6EEF6;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .user-menu-btn:hover {
            background: rgba(255, 51, 102, 0.1);
        }
        
        .user-avatar {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #FF3366 0%, #1F8FFF 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: white;
        }
        
        .user-name {
            font-size: 14px;
            font-weight: 500;
        }
        
        .user-menu-dropdown {
            position: fixed;
            width: 280px;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(3, 6, 23, 0.6);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.2s ease;
            z-index: 1001;
        }
        
        .user-menu-dropdown.active {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .user-avatar-large {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #FF3366 0%, #1F8FFF 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 600;
            color: white;
        }
        
        .user-details h4 {
            font-size: 16px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0 0 4px 0;
        }
        
        .user-details p {
            font-size: 14px;
            color: #94A3B8;
            margin: 0 0 8px 0;
        }
        
        .user-plan {
            display: inline-block;
            background: rgba(255, 51, 102, 0.2);
            color: #FF3366;
            font-size: 12px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .user-menu-items {
            padding: 8px 0;
        }
        
        .menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            color: #E6EEF6;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        
        .menu-item:hover {
            background: rgba(255, 51, 102, 0.1);
            color: #E6EEF6;
        }
        
        .menu-item.logout:hover {
            background: rgba(231, 76, 60, 0.1);
            color: #E74C3C;
        }
        
        .menu-item i {
            width: 16px;
            color: #94A3B8;
        }
        
        .menu-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 8px 0;
        }
    </style>
`;

// Add styles to document head
if (!document.getElementById('topbar-styles')) {
    document.head.insertAdjacentHTML('beforeend', topbarStyles);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Topbar;
}

window.Topbar = Topbar;