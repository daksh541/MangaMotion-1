// MangaMotion AI - Dashboard Grid Component
// Project cards with thumbnails, metadata, and quick actions

class DashboardGrid {
    constructor(container, projects = []) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.projects = projects;
        this.selectedProjects = new Set();
        this.viewMode = 'grid'; // grid or list
        this.sortBy = 'lastEdited';
        this.sortOrder = 'desc';
        
        this.init();
    }
    
    init() {
        this.loadProjects();
        this.render();
        this.bindEvents();
    }
    
    loadProjects() {
        // Sample projects with realistic data
        this.projects = [
            {
                id: 'project1',
                title: 'My Hero Academia',
                description: 'Chapter 1: The Beginning',
                status: 'completed',
                duration: '2:34',
                lastEdited: new Date(Date.now() - 2 * 60 * 60 * 1000),
                panels: 3,
                tags: ['shonen', 'action'],
                thumbnail: 'generated',
                progress: 100,
                fileSize: '45MB',
                voiceTracks: 2,
                exportQuality: '1080p'
            },
            {
                id: 'project2',
                title: 'Dragon Ball Z',
                description: 'Saiyan Saga Episode 1',
                status: 'draft',
                duration: '1:45',
                lastEdited: new Date(Date.now() - 24 * 60 * 60 * 1000),
                panels: 4,
                tags: ['classic', 'fighting'],
                thumbnail: 'generated',
                progress: 65,
                fileSize: '32MB',
                voiceTracks: 1,
                exportQuality: '720p'
            },
            {
                id: 'project3',
                title: 'Bleach',
                description: 'Soul Society Arc',
                status: 'completed',
                duration: '3:12',
                lastEdited: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                panels: 5,
                tags: ['supernatural', 'sword'],
                thumbnail: 'generated',
                progress: 100,
                fileSize: '67MB',
                voiceTracks: 3,
                exportQuality: '1080p'
            },
            {
                id: 'project4',
                title: 'Naruto',
                description: 'Chunin Exams',
                status: 'processing',
                duration: '4:28',
                lastEdited: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                panels: 6,
                tags: ['ninja', 'exam'],
                thumbnail: 'generated',
                progress: 85,
                fileSize: '89MB',
                voiceTracks: 4,
                exportQuality: '4K'
            },
            {
                id: 'project5',
                title: 'Attack on Titan',
                description: 'Fall of Shiganshina',
                status: 'completed',
                duration: '5:15',
                lastEdited: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                panels: 8,
                tags: ['dark', 'titan'],
                thumbnail: 'generated',
                progress: 100,
                fileSize: '124MB',
                voiceTracks: 5,
                exportQuality: '4K'
            },
            {
                id: 'project6',
                title: 'Jujutsu Kaisen',
                description: 'Cursed Training',
                status: 'draft',
                duration: '2:08',
                lastEdited: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                panels: 3,
                tags: ['cursed', 'training'],
                thumbnail: 'generated',
                progress: 30,
                fileSize: '28MB',
                voiceTracks: 2,
                exportQuality: '720p'
            }
        ];
    }
    
    render() {
        const sortedProjects = this.sortProjects([...this.projects]);
        
        this.container.innerHTML = `
            <div class="dashboard-header">
                <div class="dashboard-controls">
                    <div class="view-toggle">
                        <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-view="grid">
                            <i class="fas fa-th-large"></i>
                        </button>
                        <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                    
                    <div class="sort-controls">
                        <select class="sort-select" id="sortSelect">
                            <option value="lastEdited" ${this.sortBy === 'lastEdited' ? 'selected' : ''}>Last Modified</option>
                            <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Name</option>
                            <option value="status" ${this.sortBy === 'status' ? 'selected' : ''}>Status</option>
                            <option value="progress" ${this.sortBy === 'progress' ? 'selected' : ''}>Progress</option>
                        </select>
                        
                        <button class="sort-order-btn" id="sortOrderBtn">
                            <i class="fas fa-arrow-${this.sortOrder === 'desc' ? 'down' : 'up'}"></i>
                        </button>
                    </div>
                    
                    <div class="filter-controls">
                        <button class="filter-btn" id="filterBtn">
                            <i class="fas fa-filter"></i>
                            <span>Filter</span>
                        </button>
                    </div>
                </div>
                
                <div class="project-stats">
                    <div class="stat-item">
                        <span class="stat-number">${this.projects.length}</span>
                        <span class="stat-label">Projects</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.projects.filter(p => p.status === 'completed').length}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.projects.reduce((total, p) => total + p.panels, 0)}</span>
                        <span class="stat-label">Panels</span>
                    </div>
                </div>
            </div>
            
            <div class="projects-container ${this.viewMode}" id="projectsContainer">
                ${sortedProjects.map(project => this.renderProjectCard(project)).join('')}
                ${this.renderNewProjectCard()}
            </div>
        `;
    }
    
    renderProjectCard(project) {
        const statusColors = {
            completed: '#27AE60',
            draft: '#F39C12',
            processing: '#1F8FFF'
        };
        
        const timeAgo = this.getTimeAgo(project.lastEdited);
        const thumbnailStyle = this.generateThumbnailStyle(project);
        
        return `
            <div class="project-card ${project.status}" data-project-id="${project.id}">
                <div class="project-thumbnail" style="${thumbnailStyle}">
                    <div class="project-overlay">
                        <div class="project-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${project.progress}%"></div>
                            </div>
                            <span class="progress-text">${project.progress}%</span>
                        </div>
                        
                        <div class="project-actions">
                            <button class="action-btn play-btn" title="Preview">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="action-btn edit-btn" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn more-btn" title="More options">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="project-checkbox">
                        <input type="checkbox" class="project-select" data-project-id="${project.id}">
                    </div>
                </div>
                
                <div class="project-info">
                    <div class="project-header">
                        <h3 class="project-title">${project.title}</h3>
                        <div class="project-status" style="background-color: ${statusColors[project.status]}">
                            ${project.status}
                        </div>
                    </div>
                    
                    <p class="project-description">${project.description}</p>
                    
                    <div class="project-meta">
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${project.duration}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-image"></i>
                            <span>${project.panels} panels</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-microphone"></i>
                            <span>${project.voiceTracks} voices</span>
                        </div>
                    </div>
                    
                    <div class="project-tags">
                        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    
                    <div class="project-footer">
                        <span class="project-time">${timeAgo}</span>
                        <div class="project-quick-actions">
                            <button class="quick-action" title="Export" data-action="export">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="quick-action" title="Share" data-action="share">
                                <i class="fas fa-share-alt"></i>
                            </button>
                            <button class="quick-action" title="Duplicate" data-action="duplicate">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="quick-action" title="Delete" data-action="delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNewProjectCard() {
        return `
            <div class="new-project-card" id="newProjectCard">
                <div class="new-project-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <h3>Create New Project</h3>
                <p>Start a new motion manga</p>
                <div class="new-project-options">
                    <button class="option-btn" data-type="upload">
                        <i class="fas fa-upload"></i>
                        <span>Upload Files</span>
                    </button>
                    <button class="option-btn" data-type="template">
                        <i class="fas fa-file"></i>
                        <span>Use Template</span>
                    </button>
                    <button class="option-btn" data-type="blank">
                        <i class="fas fa-pencil-ruler"></i>
                        <span>Start Blank</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    generateThumbnailStyle(project) {
        // Generate a consistent but varied thumbnail style based on project data
        const hue = (project.id.charCodeAt(0) * 137.5) % 360;
        const saturation = 60 + (project.panels * 5);
        const lightness = 30 + (project.progress * 0.4);
        
        return `
            background: linear-gradient(135deg, 
                hsl(${hue}, ${saturation}%, ${lightness}%), 
                hsl(${(hue + 60) % 360}, ${saturation - 10}%, ${lightness + 10}%)
            );
        `;
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    sortProjects(projects) {
        return projects.sort((a, b) => {
            let aVal, bVal;
            
            switch (this.sortBy) {
                case 'lastEdited':
                    aVal = a.lastEdited.getTime();
                    bVal = b.lastEdited.getTime();
                    break;
                case 'title':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                case 'progress':
                    aVal = a.progress;
                    bVal = b.progress;
                    break;
                default:
                    return 0;
            }
            
            if (this.sortOrder === 'desc') {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            } else {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
        });
    }
    
    bindEvents() {
        // View toggle
        this.container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewMode = e.currentTarget.dataset.view;
                this.render();
            });
        });
        
        // Sort controls
        const sortSelect = this.container.querySelector('#sortSelect');
        sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
        });
        
        const sortOrderBtn = this.container.querySelector('#sortOrderBtn');
        sortOrderBtn.addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            this.render();
        });
        
        // Project selection
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('project-select')) {
                const projectId = e.target.dataset.projectId;
                if (e.target.checked) {
                    this.selectedProjects.add(projectId);
                } else {
                    this.selectedProjects.delete(projectId);
                }
                this.updateBulkActions();
            }
        });
        
        // Quick actions
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.quick-action')) {
                const action = e.target.closest('.quick-action').dataset.action;
                const projectCard = e.target.closest('.project-card');
                const projectId = projectCard.dataset.projectId;
                this.handleQuickAction(action, projectId, e);
            }
            
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const projectCard = e.target.closest('.project-card');
                const projectId = projectCard.dataset.projectId;
                this.handleActionBtn(btn, projectId, e);
            }
        });
        
        // New project card
        const newProjectCard = this.container.querySelector('#newProjectCard');
        newProjectCard.addEventListener('click', (e) => {
            if (e.target.closest('.option-btn')) {
                const type = e.target.closest('.option-btn').dataset.type;
                this.handleNewProject(type);
            } else {
                this.handleNewProject('upload'); // Default action
            }
        });
        
        // Project card hover effects
        this.container.addEventListener('mouseenter', (e) => {
            if (e.target.closest('.project-card')) {
                this.showProjectActions(e.target.closest('.project-card'));
            }
        }, true);
        
        this.container.addEventListener('mouseleave', (e) => {
            if (e.target.closest('.project-card')) {
                this.hideProjectActions(e.target.closest('.project-card'));
            }
        }, true);
    }
    
    handleQuickAction(action, projectId, event) {
        event.stopPropagation();
        const project = this.projects.find(p => p.id === projectId);
        
        switch (action) {
            case 'export':
                this.exportProject(project);
                break;
            case 'share':
                this.shareProject(project);
                break;
            case 'duplicate':
                this.duplicateProject(project);
                break;
            case 'delete':
                this.deleteProject(project);
                break;
        }
    }
    
    handleActionBtn(btn, projectId, event) {
        event.stopPropagation();
        const project = this.projects.find(p => p.id === projectId);
        
        if (btn.classList.contains('play-btn')) {
            this.previewProject(project);
        } else if (btn.classList.contains('edit-btn')) {
            this.editProject(project);
        } else if (btn.classList.contains('more-btn')) {
            this.showProjectMenu(project, event);
        }
    }
    
    handleNewProject(type) {
        console.log('Creating new project of type:', type);
        
        switch (type) {
            case 'upload':
                window.location.href = 'upload.html';
                break;
            case 'template':
                this.showTemplateSelector();
                break;
            case 'blank':
                this.createBlankProject();
                break;
        }
    }
    
    showProjectActions(card) {
        const overlay = card.querySelector('.project-overlay');
        if (overlay) {
            overlay.style.opacity = '1';
        }
    }
    
    hideProjectActions(card) {
        const overlay = card.querySelector('.project-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
        }
    }
    
    // Action implementations
    previewProject(project) {
        console.log('Previewing project:', project.title);
        // In a real app, this would open a preview modal
        window.showNotification(`Previewing ${project.title}`, 'info');
    }
    
    editProject(project) {
        console.log('Editing project:', project.title);
        window.location.href = `editor.html?project=${project.id}`;
    }
    
    exportProject(project) {
        console.log('Exporting project:', project.title);
        window.showNotification(`Exporting ${project.title}...`, 'info');
        // Simulate export process
        setTimeout(() => {
            window.showNotification(`${project.title} exported successfully!`, 'success');
        }, 2000);
    }
    
    shareProject(project) {
        console.log('Sharing project:', project.title);
        const shareUrl = `https://mangamotion.ai/share/${project.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            window.showNotification('Share link copied to clipboard!', 'success');
        });
    }
    
    duplicateProject(project) {
        console.log('Duplicating project:', project.title);
        const newProject = {
            ...project,
            id: 'project_' + Date.now(),
            title: project.title + ' (Copy)',
            status: 'draft',
            lastEdited: new Date()
        };
        this.projects.unshift(newProject);
        this.render();
        window.showNotification('Project duplicated successfully!', 'success');
    }
    
    deleteProject(project) {
        if (confirm(`Are you sure you want to delete "${project.title}"?`)) {
            console.log('Deleting project:', project.title);
            this.projects = this.projects.filter(p => p.id !== project.id);
            this.render();
            window.showNotification('Project deleted successfully!', 'success');
        }
    }
    
    showTemplateSelector() {
        // In a real app, this would show a modal with project templates
        window.showNotification('Template selector coming soon!', 'info');
    }
    
    createBlankProject() {
        const newProject = {
            id: 'project_' + Date.now(),
            title: 'Untitled Project',
            description: '',
            status: 'draft',
            duration: '0:00',
            lastEdited: new Date(),
            panels: 0,
            tags: [],
            thumbnail: 'generated',
            progress: 0,
            fileSize: '0MB',
            voiceTracks: 0,
            exportQuality: '720p'
        };
        
        this.projects.unshift(newProject);
        this.render();
        window.location.href = `editor.html?project=${newProject.id}`;
    }
    
    showProjectMenu(project, event) {
        // In a real app, this would show a context menu
        console.log('Showing project menu for:', project.title);
    }
    
    updateBulkActions() {
        // Update bulk action visibility based on selected projects
        const selectedCount = this.selectedProjects.size;
        console.log(`Selected ${selectedCount} projects`);
    }
    
    // Public methods
    addProject(project) {
        this.projects.unshift(project);
        this.render();
    }
    
    removeProject(projectId) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.render();
    }
    
    updateProject(projectId, updates) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            this.projects[projectIndex] = { ...this.projects[projectIndex], ...updates };
            this.render();
        }
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.render();
    }
    
    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.render();
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS for dashboard grid component
const dashboardGridStyles = `
    <style>
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding: 0 8px;
        }
        
        .dashboard-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .view-toggle {
            display: flex;
            background: #0B1220;
            border-radius: 8px;
            padding: 4px;
        }
        
        .view-btn {
            background: none;
            border: none;
            color: #94A3B8;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .view-btn.active {
            background: #FF3366;
            color: white;
        }
        
        .view-btn:hover:not(.active) {
            color: #E6EEF6;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .sort-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .sort-select {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #E6EEF6;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
        }
        
        .sort-select:focus {
            border-color: #FF3366;
            outline: none;
        }
        
        .sort-order-btn {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #94A3B8;
            padding: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .sort-order-btn:hover {
            border-color: #FF3366;
            color: #FF3366;
        }
        
        .filter-btn {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #94A3B8;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .filter-btn:hover {
            border-color: #FF3366;
            color: #FF3366;
        }
        
        .project-stats {
            display: flex;
            align-items: center;
            gap: 24px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-number {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: #FF3366;
            line-height: 1;
        }
        
        .stat-label {
            font-size: 12px;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .projects-container {
            display: grid;
            gap: 24px;
        }
        
        .projects-container.grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        }
        
        .projects-container.list {
            grid-template-columns: 1fr;
        }
        
        .project-card {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .project-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 51, 102, 0.1);
            border-color: #FF3366;
            box-shadow: 0 8px 24px rgba(3, 6, 23, 0.6);
        }
        
        .project-thumbnail {
            position: relative;
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 48px;
            overflow: hidden;
        }
        
        .project-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 16px;
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .project-card:hover .project-overlay {
            opacity: 1;
        }
        
        .project-progress {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .progress-bar {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: #FF3366;
            border-radius: 2px;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 12px;
            font-weight: 600;
            color: white;
        }
        
        .project-actions {
            display: flex;
            justify-content: center;
            gap: 12px;
        }
        
        .action-btn {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }
        
        .action-btn:hover {
            background: #FF3366;
            border-color: #FF3366;
            transform: scale(1.1);
        }
        
        .project-checkbox {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 10;
        }
        
        .project-select {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        
        .project-info {
            padding: 16px;
        }
        
        .project-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .project-title {
            font-size: 16px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0;
            line-height: 1.3;
        }
        
        .project-status {
            font-size: 10px;
            font-weight: 600;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .project-description {
            font-size: 14px;
            color: #94A3B8;
            margin: 0 0 12px 0;
            line-height: 1.4;
        }
        
        .project-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #94A3B8;
        }
        
        .project-tags {
            display: flex;
            gap: 6px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        
        .tag {
            background: rgba(255, 51, 102, 0.1);
            color: #FF3366;
            font-size: 11px;
            font-weight: 500;
            padding: 2px 8px;
            border-radius: 12px;
            border: 1px solid rgba(255, 51, 102, 0.2);
        }
        
        .project-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .project-time {
            font-size: 12px;
            color: #94A3B8;
        }
        
        .project-quick-actions {
            display: flex;
            gap: 8px;
        }
        
        .quick-action {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            font-size: 14px;
        }
        
        .quick-action:hover {
            color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
        }
        
        .new-project-card {
            background: linear-gradient(135deg, rgba(255, 51, 102, 0.2) 0%, rgba(31, 143, 255, 0.2) 100%);
            border: 2px dashed rgba(255, 51, 102, 0.5);
            border-radius: 8px;
            padding: 32px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 280px;
        }
        
        .new-project-card:hover {
            background: linear-gradient(135deg, rgba(255, 51, 102, 0.3) 0%, rgba(31, 143, 255, 0.3) 100%);
            border-color: #FF3366;
            transform: translateY(-5px) scale(1.02);
        }
        
        .new-project-icon {
            width: 64px;
            height: 64px;
            background: #FF3366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            color: white;
            font-size: 24px;
            animation: pulse 2s infinite;
        }
        
        .new-project-card h3 {
            font-size: 18px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0 0 8px 0;
        }
        
        .new-project-card p {
            font-size: 14px;
            color: #94A3B8;
            margin: 0 0 24px 0;
        }
        
        .new-project-options {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        
        .option-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #E6EEF6;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .option-btn:hover {
            background: rgba(255, 51, 102, 0.2);
            border-color: #FF3366;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    </style>
`;

// Add styles to document head
if (!document.getElementById('dashboard-grid-styles')) {
    document.head.insertAdjacentHTML('beforeend', dashboardGridStyles);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardGrid;
}

window.DashboardGrid = DashboardGrid;