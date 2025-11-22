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
            <header class="topbar" id="topbar">
                <div class="topbar-logo">
                    <a href="#" class="logo">
                        <img src="/public/images/logo.svg" alt="MangaMotion Logo" class="logo-img">
                        <span class="logo-text">MangaMotion</span>
                    </a>
                </div>
                <div class="topbar-center">
                    ${this.options.showSearch ? this.renderSearch() : ''}
                </div>
                <div class="topbar-actions">
                    <button class="cta-button">
                        <i class="fas fa-plus"></i>
                        New Project
                    </button>
                    ${this.options.showNotifications ? this.renderNotifications() : ''}
                    ${this.options.showUserMenu ? this.renderUserMenu() : ''}
                </div>
            </header>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', topbarHTML);
        this.element = document.getElementById('topbar');
    }
    
    renderSearch() {
        return `
            <div class="topbar-search">
                <i class="fas fa-search"></i>
                <input type="text" placeholder="Search projects...">
            </div>
        `;
    }
    
    renderNotifications() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        return `
            <div class="notifications-container">
                <button class="icon-button" id="notificationsBtn">
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
            </div>
        `;
    }
    
    renderUserMenu() {
        return `
            <div class="user-menu-container">
                <button class="user-menu-btn" id="userMenuBtn">
                    <div class="avatar">${this.user.avatar}</div>
                </button>
                <div class="user-menu-dropdown" id="userMenuDropdown">
                    <div class="user-info">
                        <div class="avatar">${this.user.avatar}</div>
                        <div class="user-details">
                            <h4>${this.user.name}</h4>
                            <p>${this.user.email}</p>
                        </div>
                    </div>
                    <a href="#" class="menu-item">Profile</a>
                    <a href="#" class="menu-item">Settings</a>
                    <a href="login.html" class="menu-item logout">Logout</a>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // Dropdown toggle logic
        this.element.addEventListener('click', (e) => {
            const dropdownBtn = e.target.closest('#notificationsBtn, #userMenuBtn');
            if (dropdownBtn) {
                const dropdown = dropdownBtn.nextElementSibling;
                dropdown.classList.toggle('active');
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.element.querySelectorAll('.notifications-dropdown, .user-menu-dropdown').forEach(d => d.classList.remove('active'));
            }
        });
    }
    
    makeSticky() {
        this.element.classList.add('sticky');
        document.body.style.paddingTop = '64px';
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Topbar;
}

window.Topbar = Topbar;