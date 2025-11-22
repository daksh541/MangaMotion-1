// MangaMotion AI - Upload Dropzone Component
// Drag & drop file upload with progress tracking and thumbnail previews

class UploadDropzone {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            acceptedFormats: ['.png', '.jpg', '.jpeg', '.webp', '.pdf'],
            maxFileSize: 50 * 1024 * 1024, // 50MB
            maxFiles: 20,
            allowMultiple: true,
            showThumbnails: true,
            showProgress: true,
            allowReorder: true,
            autoProcess: false,
            ...options
        };
        
        this.files = [];
        this.uploadQueue = [];
        this.isUploading = false;
        this.dragCounter = 0;
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupFileHandling();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="upload-dropzone" id="dropzone">
                <div class="dropzone-area" id="dropzoneArea">
                    <div class="dropzone-content">
                        <div class="dropzone-icon">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <h3 class="dropzone-title">Drop your manga pages here</h3>
                        <p class="dropzone-subtitle">or click to browse your files</p>
                        <div class="dropzone-formats">
                            ${this.options.acceptedFormats.map(format => 
                                `<span class="format-badge">${format.toUpperCase()}</span>`
                            ).join('')}
                        </div>
                        <div class="dropzone-limits">
                            <span class="limit-item">
                                <i class="fas fa-weight"></i>
                                Max ${this.formatFileSize(this.options.maxFileSize)} per file
                            </span>
                            <span class="limit-item">
                                <i class="fas fa-copy"></i>
                                Up to ${this.options.maxFiles} files
                            </span>
                        </div>
                    </div>
                    
                    <input type="file" class="file-input" id="fileInput" 
                           accept="${this.options.acceptedFormats.join(',')}" 
                           ${this.options.allowMultiple ? 'multiple' : ''}>
                </div>
                
                ${this.options.showProgress ? this.renderUploadProgress() : ''}
            </div>
            
            ${this.options.showThumbnails ? this.renderFileList() : ''}
            
            ${this.renderUploadControls()}
        `;
        
        this.dropzone = this.container.querySelector('#dropzone');
        this.dropzoneArea = this.container.querySelector('#dropzoneArea');
        this.fileInput = this.container.querySelector('#fileInput');
        this.fileList = this.container.querySelector('#fileList');
        this.uploadProgress = this.container.querySelector('#uploadProgress');
    }
    
    renderUploadProgress() {
        return `
            <div class="upload-progress" id="uploadProgress">
                <div class="progress-header">
                    <h4>Upload Progress</h4>
                    <button class="cancel-upload" id="cancelUpload">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-text" id="progressText">0% complete</span>
                    <span class="progress-details" id="progressDetails">0 of 0 files</span>
                    <span class="progress-eta" id="progressEta">ETA: --</span>
                </div>
            </div>
        `;
        }
    
    renderFileList() {
        return `
            <div class="file-list" id="fileList">
                <div class="file-list-header">
                    <h4>Uploaded Files</h4>
                    <div class="file-list-controls">
                        <button class="clear-all" id="clearAll">
                            <i class="fas fa-trash"></i>
                            Clear All
                        </button>
                        ${this.options.allowReorder ? `
                            <button class="auto-order" id="autoOrder">
                                <i class="fas fa-magic"></i>
                                Auto Order
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="file-list-content" id="fileListContent">
                    <div class="empty-state">
                        <i class="fas fa-file-image"></i>
                        <p>No files uploaded yet</p>
                        <p class="empty-subtitle">Drag and drop files above to get started</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderUploadControls() {
        return `
            <div class="upload-controls" id="uploadControls">
                <div class="controls-left">
                    <span class="file-count" id="fileCount">0 files selected</span>
                    <span class="total-size" id="totalSize">0 MB</span>
                </div>
                <div class="controls-right">
                    <button class="clear-btn" id="clearBtn" disabled>
                        <i class="fas fa-times"></i>
                        Clear
                    </button>
                    <button class="upload-btn" id="uploadBtn" disabled>
                        <i class="fas fa-upload"></i>
                        Upload Files
                    </button>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // Drag and drop events
        this.dropzoneArea.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.dropzoneArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropzoneArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropzoneArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // Click to browse files
        this.dropzoneArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // File input change
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Control buttons
        const clearBtn = this.container.querySelector('#clearBtn');
        const uploadBtn = this.container.querySelector('#uploadBtn');
        const clearAll = this.container.querySelector('#clearAll');
        const autoOrder = this.container.querySelector('#autoOrder');
        const cancelUpload = this.container.querySelector('#cancelUpload');
        
        if (clearBtn) clearBtn.addEventListener('click', this.clearFiles.bind(this));
        if (uploadBtn) uploadBtn.addEventListener('click', this.startUpload.bind(this));
        if (clearAll) clearAll.addEventListener('click', this.clearAllFiles.bind(this));
        if (autoOrder) autoOrder.addEventListener('click', this.autoOrderFiles.bind(this));
        if (cancelUpload) cancelUpload.addEventListener('click', this.cancelUpload.bind(this));
    }
    
    setupFileHandling() {
        // Prevent default drag behavior on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        this.dragCounter++;
        if (this.dragCounter === 1) {
            this.dropzone.classList.add('drag-over');
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.dropzone.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.dragCounter = 0;
        this.dropzone.classList.remove('drag-over');
        
        const droppedFiles = Array.from(e.dataTransfer.files);
        this.processFiles(droppedFiles);
    }
    
    handleFileSelect(e) {
        const selectedFiles = Array.from(e.target.files);
        this.processFiles(selectedFiles);
    }
    
    processFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));
        const remainingSlots = this.options.maxFiles - this.files.length;
        const filesToAdd = validFiles.slice(0, remainingSlots);
        
        if (validFiles.length > remainingSlots) {
            this.showNotification(`Only ${remainingSlots} files can be added. ${validFiles.length - remainingSlots} files were ignored.`, 'warning');
        }
        
        filesToAdd.forEach(file => {
            const fileData = {
                id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'pending',
                progress: 0,
                thumbnail: null,
                order: this.files.length + this.uploadQueue.length
            };
            
            this.uploadQueue.push(fileData);
            this.generateThumbnail(fileData);
        });
        
        this.updateFileList();
        this.updateControls();
        
        if (this.options.autoProcess && this.uploadQueue.length > 0) {
            this.startUpload();
        }
    }
    
    validateFile(file) {
        // Check file extension
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.options.acceptedFormats.includes(extension)) {
            this.showNotification(`File "${file.name}" has an unsupported format.`, 'error');
            return false;
        }
        
        // Check file size
        if (file.size > this.options.maxFileSize) {
            this.showNotification(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.options.maxFileSize)}.`, 'error');
            return false;
        }
        
        // Check for duplicates
        const isDuplicate = this.files.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (isDuplicate) {
            this.showNotification(`File "${file.name}" already exists.`, 'warning');
            return false;
        }
        
        return true;
    }
    
    generateThumbnail(fileData) {
        if (fileData.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileData.thumbnail = e.target.result;
                // Low-res tip check
                const img = new Image();
                img.onload = () => {
                    if (img.width < 1280 || img.height < 720) {
                        this.showNotification(`Tip: ${fileData.name} is low resolution (${img.width}x${img.height}). For best results, upload at least 1280x720.`, 'warning');
                    }
                    this.updateFileInList(fileData);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(fileData.file);
        } else {
            fileData.thumbnail = this.getFileIcon(fileData.type);
            this.updateFileInList(fileData);
        }
    
    getFileIcon(mimeType) {
        const iconMap = {
            'application/pdf': 'fa-file-pdf',
            'image/png': 'fa-file-image',
            'image/jpeg': 'fa-file-image',
            'image/webp': 'fa-file-image'
        };
        
        return iconMap[mimeType] || 'fa-file';
    }
    
    updateFileList() {
        if (!this.fileList) return;
        
        const fileListContent = this.container.querySelector('#fileListContent');
        
        if (this.files.length === 0 && this.uploadQueue.length === 0) {
            fileListContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-image"></i>
                    <p>No files uploaded yet</p>
                    <p class="empty-subtitle">Drag and drop files above to get started</p>
                </div>
            `;
        } else {
            const allFiles = [...this.files, ...this.uploadQueue];
            fileListContent.innerHTML = allFiles.map(file => this.renderFileItem(file)).join('');
            
            // Make files reorderable if enabled
            if (this.options.allowReorder) {
                this.makeReorderable();
            }
        }
    }
    
    renderFileItem(file) {
        const statusColors = {
            pending: '#94A3B8',
            uploading: '#1F8FFF',
            completed: '#27AE60',
            error: '#E74C3C'
        };
        
        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-thumbnail">
                    ${file.thumbnail ? 
                        `<img src="${file.thumbnail}" alt="${file.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
                        ''
                    }
                    <div class="file-icon" style="display: ${file.thumbnail ? 'none' : 'flex'}">
                        <i class="fas ${this.getFileIcon(file.type)}"></i>
                    </div>
                </div>
                
                <div class="file-info">
                    <h5 class="file-name">${file.name}</h5>
                    <p class="file-size">${this.formatFileSize(file.size)}</p>
                    <div class="file-status">
                        <span class="status-badge" style="background-color: ${statusColors[file.status]}">
                            ${file.status}
                        </span>
                        ${file.status === 'uploading' ? `
                            <span class="upload-percent">${Math.round(file.progress)}%</span>
                        ` : ''}
                    </div>
                </div>
                
                ${file.status === 'uploading' ? `
                    <div class="file-progress">
                        <div class="progress-circle">
                            <svg class="progress-ring" width="40" height="40">
                                <circle class="progress-ring-bg" cx="20" cy="20" r="16"></circle>
                                <circle class="progress-ring-fill" cx="20" cy="20" r="16" 
                                        style="stroke-dasharray: 100; stroke-dashoffset: ${100 - file.progress}"></circle>
                            </svg>
                            <span class="progress-text">${Math.round(file.progress)}%</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="file-actions">
                    ${file.status === 'completed' ? `
                        <button class="action-btn preview-btn" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : ''}
                    <button class="action-btn remove-btn" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                ${this.options.allowReorder && file.status !== 'uploading' ? `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    updateFileInList(file) {
        const fileElement = this.container.querySelector(`[data-file-id="${file.id}"]`);
        if (fileElement) {
            const thumbnail = fileElement.querySelector('.file-thumbnail img');
            const icon = fileElement.querySelector('.file-icon');
            
            if (file.thumbnail && file.thumbnail.startsWith('data:')) {
                if (thumbnail) {
                    thumbnail.src = file.thumbnail;
                } else {
                    const thumbnailContainer = fileElement.querySelector('.file-thumbnail');
                    thumbnailContainer.innerHTML = `<img src="${file.thumbnail}" alt="${file.name}">`;
                }
            }
        }
    }
    
    updateControls() {
        const fileCount = this.container.querySelector('#fileCount');
        const totalSize = this.container.querySelector('#totalSize');
        const clearBtn = this.container.querySelector('#clearBtn');
        const uploadBtn = this.container.querySelector('#uploadBtn');
        
        const totalFiles = this.files.length + this.uploadQueue.length;
        const totalBytes = [...this.files, ...this.uploadQueue].reduce((sum, file) => sum + file.size, 0);
        
        if (fileCount) fileCount.textContent = `${totalFiles} files selected`;
        if (totalSize) totalSize.textContent = this.formatFileSize(totalBytes);
        if (clearBtn) clearBtn.disabled = totalFiles === 0;
        if (uploadBtn) uploadBtn.disabled = this.uploadQueue.length === 0 || this.isUploading;
    }
    
    startUpload() {
        if (this.isUploading || this.uploadQueue.length === 0) return;
        this.isUploading = true;
        this.uploadStartTime = Date.now();
        if (window.trackEvent) window.trackEvent('upload_started', { count: this.uploadQueue.length });
        this.updateControls();
        if (this.uploadProgress) {
            this.uploadProgress.style.display = 'block';
        }
        this.processUploadQueue();
    }
    
    async processUploadQueue() {
        const totalFiles = this.uploadQueue.length;
        let processedFiles = 0;
        
        for (const fileData of this.uploadQueue) {
            if (!this.isUploading) break;
            
            fileData.status = 'uploading';
            this.updateFileList();
            
            try {
                await this.simulateUpload(fileData);
                fileData.status = 'completed';
                this.files.push(fileData);
                processedFiles++;
                
                // Update overall progress
                const overallProgress = (processedFiles / totalFiles) * 100;
                this.updateOverallProgress(overallProgress, processedFiles, totalFiles);
                
            } catch (error) {
                fileData.status = 'error';
                console.error('Upload failed:', error);
                this.showNotification(error.message || 'Upload failed', 'error');
            }
        }
        
        this.uploadQueue = [];
        this.isUploading = false;
        this.updateFileList();
        this.updateControls();
        
        if (this.uploadProgress) {
            setTimeout(() => {
                this.uploadProgress.style.display = 'none';
            }, 2000);
        }
        
        this.onUploadComplete();
    }
    
    simulateUpload(fileData) {
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 100) progress = 100;
                fileData.progress = progress;
                this.updateFileList();
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, 200);
        });
    }
    
    updateOverallProgress(progress, processed, total) {
        const progressFill = this.container.querySelector('#progressFill');
        const progressText = this.container.querySelector('#progressText');
        const progressDetails = this.container.querySelector('#progressDetails');
        const progressEta = this.container.querySelector('#progressEta');
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}% complete`;
        if (progressDetails) progressDetails.textContent = `${processed} of ${total} files`;
        if (progressEta) {
            const elapsedSec = (Date.now() - (this.uploadStartTime || Date.now())) / 1000;
            const pct = Math.max(progress, 1);
            const totalEst = elapsedSec / (pct / 100);
            const remaining = Math.max(totalEst - elapsedSec, 0);
            progressEta.textContent = `ETA: ${this.formatETA(remaining)}`;
        }
    }
   
   cancelUpload() {
        this.isUploading = false;
        this.uploadQueue.forEach(file => {
            if (file.status === 'uploading') {
                file.status = 'pending';
                file.progress = 0;
            }
        });
        
        this.updateFileList();
        this.updateControls();
        
        if (this.uploadProgress) {
            this.uploadProgress.style.display = 'none';
        }
        
        window.showNotification('Upload cancelled', 'info');
    }
    
    clearFiles() {
        this.uploadQueue = [];
        this.updateFileList();
        this.updateControls();
        this.fileInput.value = '';
    }
    
    clearAllFiles() {
        if (confirm('Are you sure you want to clear all files?')) {
            this.files = [];
            this.uploadQueue = [];
            this.updateFileList();
            this.updateControls();
            this.fileInput.value = '';
        }
    }
    
    autoOrderFiles() {
        // Simple auto-ordering based on filename
        const allFiles = [...this.files, ...this.uploadQueue];
        allFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        allFiles.forEach((file, index) => {
            file.order = index;
        });
        
        this.updateFileList();
        window.showNotification('Files automatically ordered', 'success');
    }
    
    makeReorderable() {
        const fileListContent = this.container.querySelector('#fileListContent');
        if (!fileListContent) return;
        
        let draggedElement = null;
        
        fileListContent.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('file-item')) {
                draggedElement = e.target;
                e.target.style.opacity = '0.5';
            }
        });
        
        fileListContent.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('file-item')) {
                e.target.style.opacity = '1';
                draggedElement = null;
            }
        });
        
        fileListContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(fileListContent, e.clientY);
            if (afterElement == null) {
                fileListContent.appendChild(draggedElement);
            } else {
                fileListContent.insertBefore(draggedElement, afterElement);
            }
        });
        
        fileListContent.addEventListener('drop', (e) => {
            e.preventDefault();
            this.updateFileOrder();
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    updateFileOrder() {
        const fileItems = this.container.querySelectorAll('.file-item');
        const newOrder = [];
        
        fileItems.forEach((item, index) => {
            const fileId = item.dataset.fileId;
            const file = [...this.files, ...this.uploadQueue].find(f => f.id === fileId);
            if (file) {
                file.order = index;
                newOrder.push(file);
            }
        });
        
        this.files = newOrder.filter(f => f.status === 'completed');
        this.uploadQueue = newOrder.filter(f => f.status !== 'completed');
        
        window.showNotification('File order updated', 'success');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatETA(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }
    
    onUploadComplete() {
        this.showNotification('Upload completed successfully!', 'success');
        if (window.trackEvent) window.trackEvent('upload_completed', { count: this.files.length });
        this.triggerEvent('uploadComplete', { files: this.files });
    }
    
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`uploadDropzone:${eventName}`, {
            detail: data
        });
        this.container.dispatchEvent(event);
    }
    
    // Public API methods
    addFile(file) {
        this.processFiles([file]);
    }
    
    removeFile(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.uploadQueue = this.uploadQueue.filter(f => f.id !== fileId);
        this.updateFileList();
        this.updateControls();
    }
    
    getFiles() {
        return [...this.files, ...this.uploadQueue];
    }
    
    getCompletedFiles() {
        return this.files;
    }
    
    clear() {
        this.files = [];
        this.uploadQueue = [];
        this.updateFileList();
        this.updateControls();
        this.fileInput.value = '';
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS for upload dropzone component
const uploadDropzoneStyles = `
    <style>
        .upload-dropzone {
            position: relative;
            width: 100%;
        }
        
        .dropzone-area {
            background: #0B1220;
            border: 3px dashed rgba(255, 51, 102, 0.3);
            border-radius: 12px;
            padding: 48px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .dropzone-area:hover {
            border-color: rgba(255, 51, 102, 0.6);
            background: rgba(255, 51, 102, 0.05);
        }
        
        .dropzone-area.drag-over {
            border-color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
            transform: scale(1.02);
        }
        
        .dropzone-content {
            pointer-events: none;
        }
        
        .dropzone-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #FF3366 0%, #1F8FFF 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: white;
            font-size: 32px;
            animation: float 3s ease-in-out infinite;
        }
        
        .dropzone-title {
            font-size: 24px;
            font-weight: 700;
            color: #E6EEF6;
            margin: 0 0 8px 0;
        }
        
        .dropzone-subtitle {
            font-size: 16px;
            color: #94A3B8;
            margin: 0 0 24px 0;
        }
        
        .dropzone-formats {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        
        .format-badge {
            background: rgba(255, 51, 102, 0.1);
            color: #FF3366;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 16px;
            border: 1px solid rgba(255, 51, 102, 0.3);
        }
        
        .dropzone-limits {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 14px;
            color: #94A3B8;
        }
        
        .limit-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .file-input {
            display: none;
        }
        
        .upload-progress {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
            display: none;
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .progress-header h4 {
            font-size: 16px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0;
        }
        
        .cancel-upload {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .cancel-upload:hover {
            color: #E74C3C;
            background: rgba(231, 76, 60, 0.1);
        }
        
        .progress-bar {
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF3366 0%, #1F8FFF 100%);
            border-radius: 4px;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        
        .progress-text {
            color: #E6EEF6;
            font-weight: 500;
        }
        
        .progress-details {
            color: #94A3B8;
        }
        
        .file-list {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-top: 24px;
            overflow: hidden;
        }
        
        .file-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .file-list-header h4 {
            font-size: 16px;
            font-weight: 600;
            color: #E6EEF6;
            margin: 0;
        }
        
        .file-list-controls {
            display: flex;
            gap: 8px;
        }
        
        .clear-all, .auto-order {
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #94A3B8;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .clear-all:hover, .auto-order:hover {
            border-color: #FF3366;
            color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
        }
        
        .file-list-content {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .empty-state {
            padding: 48px 24px;
            text-align: center;
            color: #94A3B8;
        }
        
        .empty-state i {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        .empty-state p {
            margin: 0;
            font-size: 16px;
        }
        
        .empty-subtitle {
            font-size: 14px !important;
            margin-top: 8px !important;
        }
        
        .file-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
            position: relative;
        }
        
        .file-item:hover {
            background: rgba(255, 51, 102, 0.05);
        }
        
        .file-item:last-child {
            border-bottom: none;
        }
        
        .file-thumbnail {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .file-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .file-icon {
            color: #94A3B8;
            font-size: 20px;
        }
        
        .file-info {
            flex: 1;
            min-width: 0;
        }
        
        .file-name {
            font-size: 14px;
            font-weight: 500;
            color: #E6EEF6;
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .file-size {
            font-size: 12px;
            color: #94A3B8;
            margin: 0 0 8px 0;
        }
        
        .file-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
            color: white;
            text-transform: uppercase;
        }
        
        .upload-percent {
            font-size: 12px;
            color: #1F8FFF;
            font-weight: 500;
        }
        
        .file-progress {
            flex-shrink: 0;
        }
        
        .progress-circle {
            position: relative;
            width: 40px;
            height: 40px;
        }
        
        .progress-ring {
            transform: rotate(-90deg);
        }
        
        .progress-ring-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.1);
            stroke-width: 3;
        }
        
        .progress-ring-fill {
            fill: none;
            stroke: #1F8FFF;
            stroke-width: 3;
            stroke-linecap: round;
            transition: stroke-dashoffset 0.3s ease;
        }
        
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 10px;
            font-weight: 600;
            color: #E6EEF6;
        }
        
        .file-actions {
            display: flex;
            gap: 4px;
        }
        
        .action-btn {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            transition: all 0.2s ease;
            font-size: 14px;
        }
        
        .action-btn:hover {
            background: rgba(255, 51, 102, 0.1);
            color: #FF3366;
        }
        
        .remove-btn:hover {
            background: rgba(231, 76, 60, 0.1);
            color: #E74C3C;
        }
        
        .drag-handle {
            color: #94A3B8;
            cursor: grab;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .drag-handle:hover {
            color: #FF3366;
            background: rgba(255, 51, 102, 0.1);
        }
        
        .drag-handle:active {
            cursor: grabbing;
        }
        
        .upload-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-top: 16px;
        }
        
        .controls-left {
            display: flex;
            gap: 16px;
            font-size: 14px;
            color: #94A3B8;
        }
        
        .file-count, .total-size {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .controls-right {
            display: flex;
            gap: 12px;
        }
        
        .clear-btn, .upload-btn {
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #94A3B8;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .clear-btn:hover:not(:disabled) {
            border-color: #E74C3C;
            color: #E74C3C;
            background: rgba(231, 76, 60, 0.1);
        }
        
        .upload-btn {
            background: #FF3366;
            border-color: #FF3366;
            color: white;
        }
        
        .upload-btn:hover:not(:disabled) {
            background: #ff1a53;
            border-color: #ff1a53;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 51, 102, 0.3);
        }
        
        .clear-btn:disabled, .upload-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .clear-btn:disabled:hover, .upload-btn:disabled:hover {
            transform: none;
            box-shadow: none;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
    </style>
`;

// Add styles to document head
if (!document.getElementById('upload-dropzone-styles')) {
    document.head.insertAdjacentHTML('beforeend', uploadDropzoneStyles);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UploadDropzone;
}

window.UploadDropzone = UploadDropzone;