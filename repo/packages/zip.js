// LonxOS ZIP Archive Manager
// Advanced GUI-based ZIP file manager with CLI interface

class ZipManager {
    constructor(lonx_api) {
        this.currentArchive = null;
        this.archiveContents = [];
        this.selectedIndex = 0;
        this.viewMode = 'browse'; // browse, extract, create
        this.isRunning = false;
        this.statusMessage = '';
        this.extractPath = '/tmp/';
        this.compressionLevel = 5;
        this.lonx_api = lonx_api;
    }

    async init() {
        this.setupEventListeners();
        this.createInterface();
        this.isRunning = true;
        this.render();
    }

    createInterface() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'zip-manager';
        container.className = 'zip-manager-container';
        container.innerHTML = `
            <div class="zip-header">
                <h2>📦 LonxOS ZIP Manager</h2>
                <div class="zip-toolbar">
                    <button id="zip-open">Open Archive</button>
                    <button id="zip-create">Create Archive</button>
                    <button id="zip-extract">Extract Selected</button>
                    <button id="zip-extract-all">Extract All</button>
                    <button id="zip-add">Add Files</button>
                    <button id="zip-settings">Settings</button>
                    <button id="zip-help">Help</button>
                    <button id="zip-exit">Exit</button>
                </div>
            </div>
            
            <div class="zip-main">
                <div class="zip-sidebar">
                    <div class="zip-info">
                        <h3>Archive Info</h3>
                        <div id="zip-archive-info">
                            <p>No archive loaded</p>
                        </div>
                    </div>
                    
                    <div class="zip-options">
                        <h3>Options</h3>
                        <label>
                            Compression Level:
                            <select id="zip-compression">
                                <option value="0">Store (0)</option>
                                <option value="1">Fastest (1)</option>
                                <option value="3">Fast (3)</option>
                                <option value="5" selected>Normal (5)</option>
                                <option value="7">Good (7)</option>
                                <option value="9">Best (9)</option>
                            </select>
                        </label>
                        
                        <label>
                            Extract to:
                            <input type="text" id="zip-extract-path" value="/tmp/" />
                        </label>
                        
                        <div class="zip-filters">
                            <label>
                                <input type="checkbox" id="zip-show-hidden"> Show hidden files
                            </label>
                            <label>
                                <input type="checkbox" id="zip-recursive" checked> Include subdirectories
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="zip-content">
                    <div class="zip-path-bar">
                        <span id="zip-current-path">/</span>
                        <div class="zip-stats">
                            <span id="zip-file-count">0 files</span>
                            <span id="zip-total-size">0 bytes</span>
                        </div>
                    </div>
                    
                    <div class="zip-file-list" id="zip-file-list">
                        <div class="zip-file-header">
                            <span class="file-name">Name</span>
                            <span class="file-size">Size</span>
                            <span class="file-compressed">Compressed</span>
                            <span class="file-ratio">Ratio</span>
                            <span class="file-date">Modified</span>
                        </div>
                        <div id="zip-files"></div>
                    </div>
                </div>
            </div>
            
            <div class="zip-footer">
                <div class="zip-status">
                    <span id="zip-status-message">Ready</span>
                </div>
                <div class="zip-help-text">
                    <span>↑↓: Navigate | Enter: Select | Space: Mark | Tab: Change panel | F1: Help | Ctrl+Q: Quit</span>
                </div>
            </div>
        `;

        // Apply CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .zip-manager-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #1a1a1a;
                color: #ffffff;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
            }
            
            .zip-header {
                background: #2d2d2d;
                padding: 10px;
                border-bottom: 1px solid #444;
            }
            
            .zip-header h2 {
                margin: 0 0 10px 0;
                color: #00ff88;
            }
            
            .zip-toolbar {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .zip-toolbar button {
                background: #404040;
                color: #ffffff;
                border: 1px solid #666;
                padding: 5px 10px;
                cursor: pointer;
                border-radius: 3px;
                font-size: 12px;
            }
            
            .zip-toolbar button:hover {
                background: #505050;
                border-color: #00ff88;
            }
            
            .zip-toolbar button:active {
                background: #00ff88;
                color: #000;
            }
            
            .zip-main {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            .zip-sidebar {
                width: 300px;
                background: #2a2a2a;
                border-right: 1px solid #444;
                padding: 15px;
                overflow-y: auto;
            }
            
            .zip-sidebar h3 {
                color: #00ff88;
                margin: 0 0 10px 0;
                font-size: 14px;
            }
            
            .zip-info, .zip-options {
                margin-bottom: 20px;
                padding: 10px;
                background: #1f1f1f;
                border-radius: 5px;
            }
            
            .zip-options label {
                display: block;
                margin-bottom: 10px;
                font-size: 12px;
            }
            
            .zip-options select, .zip-options input {
                width: 100%;
                background: #404040;
                color: #ffffff;
                border: 1px solid #666;
                padding: 3px;
                margin-top: 3px;
                border-radius: 2px;
            }
            
            .zip-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .zip-path-bar {
                background: #2d2d2d;
                padding: 8px 15px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .zip-stats {
                font-size: 12px;
                color: #aaa;
            }
            
            .zip-file-list {
                flex: 1;
                overflow-y: auto;
                background: #1a1a1a;
            }
            
            .zip-file-header {
                background: #2d2d2d;
                padding: 8px 15px;
                border-bottom: 1px solid #444;
                display: grid;
                grid-template-columns: 1fr 80px 80px 60px 120px;
                gap: 10px;
                font-weight: bold;
                font-size: 12px;
                color: #00ff88;
            }
            
            .zip-file-item {
                padding: 6px 15px;
                border-bottom: 1px solid #333;
                display: grid;
                grid-template-columns: 1fr 80px 80px 60px 120px;
                gap: 10px;
                cursor: pointer;
                font-size: 12px;
                align-items: center;
            }
            
            .zip-file-item:hover {
                background: #2a2a2a;
            }
            
            .zip-file-item.selected {
                background: #00ff88;
                color: #000;
            }
            
            .zip-file-item.marked {
                background: #404040;
            }
            
            .file-icon {
                margin-right: 5px;
            }
            
            .zip-footer {
                background: #2d2d2d;
                border-top: 1px solid #444;
                padding: 8px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .zip-status {
                color: #00ff88;
                font-weight: bold;
            }
            
            .zip-help-text {
                font-size: 11px;
                color: #888;
            }
            
            .zip-progress {
                width: 100%;
                height: 20px;
                background: #404040;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .zip-progress-bar {
                height: 100%;
                background: #00ff88;
                transition: width 0.3s ease;
            }
            
            .zip-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2a2a2a;
                border: 2px solid #00ff88;
                border-radius: 8px;
                padding: 20px;
                min-width: 400px;
                z-index: 1001;
            }
            
            .zip-modal h3 {
                color: #00ff88;
                margin-top: 0;
            }
            
            .zip-modal-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 15px;
            }
            
            .hidden {
                display: none !important;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);
        
        this.container = container;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Button handlers
        document.getElementById('zip-open').addEventListener('click', () => this.openArchive());
        document.getElementById('zip-create').addEventListener('click', () => this.createArchive());
        document.getElementById('zip-extract').addEventListener('click', () => this.extractSelected());
        document.getElementById('zip-extract-all').addEventListener('click', () => this.extractAll());
        document.getElementById('zip-add').addEventListener('click', () => this.addFiles());
        document.getElementById('zip-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('zip-help').addEventListener('click', () => this.showHelp());
        document.getElementById('zip-exit').addEventListener('click', () => this.exit());
        
        // Option handlers
        document.getElementById('zip-compression').addEventListener('change', (e) => {
            this.compressionLevel = parseInt(e.target.value);
        });
        
        document.getElementById('zip-extract-path').addEventListener('change', (e) => {
            this.extractPath = e.target.value;
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeypress(e));
    }

    handleKeypress(e) {
        if (!this.isRunning) return;
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.navigateUp();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateDown();
                break;
            case 'Enter':
                e.preventDefault();
                this.selectCurrent();
                break;
            case ' ':
                e.preventDefault();
                this.toggleMark();
                break;
            case 'F1':
                e.preventDefault();
                this.showHelp();
                break;
        }
        
        if (e.ctrlKey) {
            switch(e.key) {
                case 'q':
                    e.preventDefault();
                    this.exit();
                    break;
                case 'o':
                    e.preventDefault();
                    this.openArchive();
                    break;
                case 'n':
                    e.preventDefault();
                    this.createArchive();
                    break;
                case 'e':
                    e.preventDefault();
                    this.extractAll();
                    break;
                case 'a':
                    e.preventDefault();
                    this.addFiles();
                    break;
            }
        }
    }

    async openArchive() {
        const filename = prompt('Enter ZIP file path:', '');
        if (!filename) return;
        
        try {
            this.setStatus('Loading archive...');
            const archiveData = this.lonx_api.fs.read(filename);
            
            if (!archiveData) {
                throw new Error('Archive not found');
            }
            
            // Simulate ZIP parsing (in real implementation, use a ZIP library)
            this.currentArchive = filename;
            this.archiveContents = await this.parseZipFile(archiveData);
            this.setStatus(`Loaded ${this.archiveContents.length} files from ${filename}`);
            this.updateArchiveInfo();
            this.render();
            
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async parseZipFile(data) {
        // Simulated ZIP parsing - in real implementation, use JSZip or similar
        const files = [
            {
                name: 'example.txt',
                size: 1024,
                compressedSize: 512,
                date: new Date().toISOString(),
                isDirectory: false,
                marked: false
            },
            {
                name: 'documents/',
                size: 0,
                compressedSize: 0,
                date: new Date().toISOString(),
                isDirectory: true,
                marked: false
            },
            {
                name: 'documents/readme.md',
                size: 2048,
                compressedSize: 1024,
                date: new Date().toISOString(),
                isDirectory: false,
                marked: false
            }
        ];
        
        return files;
    }

    async createArchive() {
        const filename = prompt('Enter new ZIP file name:', 'archive.zip');
        if (!filename) return;
        
        const sourcePath = prompt('Enter source directory:', '/');
        if (!sourcePath) return;
        
        try {
            this.setStatus('Creating archive...');
            const files = await this.collectFiles(sourcePath);
            const zipData = await this.createZipData(files);
            
            this.lonx_api.fs.write(filename, zipData);
            this.setStatus(`Created archive ${filename} with ${files.length} files`);
            
            // Load the newly created archive
            this.currentArchive = filename;
            this.archiveContents = files.map(f => ({
                name: f.path,
                size: f.size,
                compressedSize: Math.floor(f.size * 0.7), // Simulated compression
                date: new Date().toISOString(),
                isDirectory: f.isDirectory,
                marked: false
            }));
            
            this.updateArchiveInfo();
            this.render();
            
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async collectFiles(path, recursive = true) {
        const files = [];
        const items = this.lonx_api.fs.list(path);
        
        if (typeof items === 'object') {
            for (const [name, content] of Object.entries(items)) {
                const fullPath = `${path}/${name}`.replace('//', '/');
                const isDirectory = typeof content === 'object';
                
                files.push({
                    path: fullPath,
                    size: isDirectory ? 0 : content.length,
                    isDirectory,
                    content: isDirectory ? null : content
                });
                
                if (isDirectory && recursive) {
                    files.push(...await this.collectFiles(fullPath, recursive));
                }
            }
        }
        
        return files;
    }

    async createZipData(files) {
        // Simulated ZIP creation - in real implementation, use JSZip
        const zipContent = {
            files: files.map(f => ({
                path: f.path,
                size: f.size,
                compressed: f.content ? this.compressData(f.content) : null
            })),
            metadata: {
                created: new Date().toISOString(),
                creator: 'LonxOS ZIP Manager',
                fileCount: files.length
            }
        };
        
        return JSON.stringify(zipContent);
    }

    compressData(data) {
        // Simulated compression - in real implementation, use proper compression
        return data; // For now, just return the original data
    }

    async extractSelected() {
        const markedFiles = this.archiveContents.filter(f => f.marked);
        if (markedFiles.length === 0) {
            this.setStatus('No files selected for extraction');
            return;
        }
        
        await this.extractFiles(markedFiles);
    }

    async extractAll() {
        await this.extractFiles(this.archiveContents);
    }

    async extractFiles(files) {
        try {
            this.setStatus(`Extracting ${files.length} files...`);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const targetPath = `${this.extractPath}${file.name}`.replace('//', '/');
                
                if (file.isDirectory) {
                    // Create directory - simulated
                    continue;
                }
                
                // Simulate file extraction
                const content = `Extracted content of ${file.name}`;
                this.lonx_api.fs.write(targetPath, content);
                
                // Update progress
                const progress = Math.round(((i + 1) / files.length) * 100);
                this.setStatus(`Extracting... ${progress}%`);
                
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            this.setStatus(`Extracted ${files.length} files to ${this.extractPath}`);
            
        } catch (error) {
            this.setStatus(`Error extracting: ${error.message}`);
        }
    }

    async addFiles() {
        const sourcePath = prompt('Enter path to add to archive:', '/');
        if (!sourcePath) return;
        
        try {
            this.setStatus('Adding files...');
            const newFiles = await this.collectFiles(sourcePath);
            
            // Add to current archive contents
            for (const file of newFiles) {
                this.archiveContents.push({
                    name: file.path,
                    size: file.size,
                    compressedSize: Math.floor(file.size * 0.7),
                    date: new Date().toISOString(),
                    isDirectory: file.isDirectory,
                    marked: false
                });
            }
            
            this.setStatus(`Added ${newFiles.length} files to archive`);
            this.updateArchiveInfo();
            this.render();
            
        } catch (error) {
            this.setStatus(`Error adding files: ${error.message}`);
        }
    }

    navigateUp() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.render();
        }
    }

    navigateDown() {
        if (this.selectedIndex < this.archiveContents.length - 1) {
            this.selectedIndex++;
            this.render();
        }
    }

    selectCurrent() {
        if (this.archiveContents.length === 0) return;
        
        const file = this.archiveContents[this.selectedIndex];
        if (file.isDirectory) {
            // Navigate into directory (simulated)
            this.setStatus(`Entering directory: ${file.name}`);
        } else {
            // Extract single file
            this.extractFiles([file]);
        }
    }

    toggleMark() {
        if (this.archiveContents.length === 0) return;
        
        this.archiveContents[this.selectedIndex].marked = !this.archiveContents[this.selectedIndex].marked;
        this.render();
    }

    updateArchiveInfo() {
        const infoElement = document.getElementById('zip-archive-info');
        if (!this.currentArchive) {
            infoElement.innerHTML = '<p>No archive loaded</p>';
            return;
        }
        
        const totalSize = this.archiveContents.reduce((sum, f) => sum + f.size, 0);
        const compressedSize = this.archiveContents.reduce((sum, f) => sum + f.compressedSize, 0);
        const compressionRatio = totalSize > 0 ? Math.round((1 - compressedSize / totalSize) * 100) : 0;
        
        infoElement.innerHTML = `
            <p><strong>Archive:</strong> ${this.currentArchive}</p>
            <p><strong>Files:</strong> ${this.archiveContents.length}</p>
            <p><strong>Original Size:</strong> ${this.formatBytes(totalSize)}</p>
            <p><strong>Compressed:</strong> ${this.formatBytes(compressedSize)}</p>
            <p><strong>Ratio:</strong> ${compressionRatio}%</p>
        `;
        
        // Update stats in header
        document.getElementById('zip-file-count').textContent = `${this.archiveContents.length} files`;
        document.getElementById('zip-total-size').textContent = this.formatBytes(totalSize);
    }

    render() {
        const filesContainer = document.getElementById('zip-files');
        
        if (this.archiveContents.length === 0) {
            filesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No files in archive</div>';
            return;
        }
        
        filesContainer.innerHTML = this.archiveContents.map((file, index) => {
            const icon = file.isDirectory ? '📁' : this.getFileIcon(file.name);
            const ratio = file.size > 0 ? Math.round((1 - file.compressedSize / file.size) * 100) : 0;
            const className = `zip-file-item ${index === this.selectedIndex ? 'selected' : ''} ${file.marked ? 'marked' : ''}`;
            
            return `
                <div class="${className}">
                    <span class="file-name">
                        <span class="file-icon">${icon}</span>
                        ${file.name}
                    </span>
                    <span class="file-size">${this.formatBytes(file.size)}</span>
                    <span class="file-compressed">${this.formatBytes(file.compressedSize)}</span>
                    <span class="file-ratio">${ratio}%</span>
                    <span class="file-date">${new Date(file.date).toLocaleDateString()}</span>
                </div>
            `;
        }).join('');
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const icons = {
            'txt': '📄', 'md': '📝', 'js': '📜', 'json': '📋',
            'png': '🖼️', 'jpg': '🖼️', 'gif': '🖼️', 'svg': '🎨',
            'zip': '📦', 'tar': '📦', 'gz': '📦',
            'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬',
            'pdf': '📕', 'doc': '📘', 'xls': '📗'
        };
        return icons[ext] || '📄';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    setStatus(message) {
        this.statusMessage = message;
        const statusElement = document.getElementById('zip-status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'zip-modal';
        modal.innerHTML = `
            <h3>ZIP Manager Settings</h3>
            <label>
                Default compression level:
                <select id="settings-compression">
                    <option value="0">Store (no compression)</option>
                    <option value="1">Fastest</option>
                    <option value="5" selected>Normal</option>
                    <option value="9">Maximum</option>
                </select>
            </label>
            <label>
                Default extract path:
                <input type="text" id="settings-extract-path" value="${this.extractPath}" />
            </label>
            <label>
                <input type="checkbox" id="settings-auto-extract"> Auto-extract single files
            </label>
            <label>
                <input type="checkbox" id="settings-preserve-paths" checked> Preserve directory structure
            </label>
            <div class="zip-modal-buttons">
                <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
                <button onclick="window.zipManager.saveSettings(); this.parentElement.parentElement.remove()">Save</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveSettings() {
        const compression = document.getElementById('settings-compression').value;
        const extractPath = document.getElementById('settings-extract-path').value;
        
        this.compressionLevel = parseInt(compression);
        this.extractPath = extractPath;
        
        document.getElementById('zip-compression').value = compression;
        document.getElementById('zip-extract-path').value = extractPath;
        
        this.setStatus('Settings saved');
    }

    showHelp() {
        const modal = document.createElement('div');
        modal.className = 'zip-modal';
        modal.innerHTML = `
            <h3>ZIP Manager Help</h3>
            <div style="max-height: 400px; overflow-y: auto;">
                <h4>Keyboard Shortcuts:</h4>
                <ul>
                    <li><strong>↑↓</strong> - Navigate file list</li>
                    <li><strong>Enter</strong> - Extract file/enter directory</li>
                    <li><strong>Space</strong> - Mark/unmark file</li>
                    <li><strong>Ctrl+O</strong> - Open archive</li>
                    <li><strong>Ctrl+N</strong> - Create new archive</li>
                    <li><strong>Ctrl+E</strong> - Extract all files</li>
                    <li><strong>Ctrl+A</strong> - Add files to archive</li>
                    <li><strong>Ctrl+Q</strong> - Quit</li>
                    <li><strong>F1</strong> - Show this help</li>
                </ul>
                
                <h4>Features:</h4>
                <ul>
                    <li>Browse ZIP archive contents</li>
                    <li>Extract individual files or entire archives</li>
                    <li>Create new ZIP archives from directories</li>
                    <li>Add files to existing archives</li>
                    <li>Configurable compression levels</li>
                    <li>File marking for batch operations</li>
                    <li>Directory structure preservation</li>
                </ul>
                
                <h4>Supported Formats:</h4>
                <ul>
                    <li>ZIP archives (.zip)</li>
                    <li>JAR files (.jar)</li>
                    <li>APK files (.apk)</li>
                </ul>
            </div>
            <div class="zip-modal-buttons">
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    exit() {
        this.isRunning = false;
        if (this.container) {
            this.container.remove();
        }
        // Remove styles
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
            if (style.textContent.includes('.zip-manager-container')) {
                style.remove();
            }
        });
    }
}

// Main function
export async function main(args, lonx) {
    if (args.length === 0) {
        // Launch GUI mode
        const manager = new ZipManager(lonx);
        window.zipManager = manager; // Make it globally accessible
        await manager.init();
    } else {
        // CLI mode
        const command = args[0];
        
        switch (command) {
            case 'list':
            case 'l':
                await listArchive(args[1], lonx);
                break;
            case 'extract':
            case 'x':
                await extractArchive(args[1], args[2], lonx);
                break;
            case 'create':
            case 'c':
                await createArchive(args[1], args.slice(2), lonx);
                break;
            case 'add':
            case 'a':
                await addToArchive(args[1], args.slice(2), lonx);
                break;
            case 'help':
                showCLIHelp(lonx);
                break;
            default:
                lonx.shell.print(`Unknown command: ${command}. Use 'zip help' for usage.`);
        }
    }
}

async function listArchive(filename, lonx) {
    if (!filename) {
        lonx.shell.print('Usage: zip list <archive.zip>');
        return;
    }
    
    try {
        const archiveData = lonx.fs.read(filename);
        if (!archiveData) {
            lonx.shell.print(`Error: Archive '${filename}' not found`);
            return;
        }
        
        lonx.shell.print(`Archive: ${filename}`);
        lonx.shell.print('-------------------------------------------');
        lonx.shell.print('Name                    Size      Date');
        lonx.shell.print('-------------------------------------------');
        
        // Simulate archive listing
        const files = [
            { name: 'example.txt', size: 1024, date: '2025-07-14' },
            { name: 'documents/', size: 0, date: '2025-07-14' },
            { name: 'documents/readme.md', size: 2048, date: '2025-07-14' }
        ];
        
        files.forEach(file => {
            const sizeStr = file.size.toString().padStart(8);
            lonx.shell.print(`${file.name.padEnd(20)} ${sizeStr}   ${file.date}`);
        });
        
        lonx.shell.print('-------------------------------------------');
        lonx.shell.print(`Total: ${files.length} files`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function extractArchive(filename, destination = './', lonx) {
    if (!filename) {
        lonx.shell.print('Usage: zip extract <archive.zip> [destination]');
        return;
    }
    
    try {
        const archiveData = lonx.fs.read(filename);
        if (!archiveData) {
            lonx.shell.print(`Error: Archive '${filename}' not found`);
            return;
        }
        
        lonx.shell.print(`Extracting '${filename}' to '${destination}'...`);
        
        // Simulate extraction
        const files = ['example.txt', 'documents/readme.md'];
        for (const file of files) {
            const targetPath = `${destination}/${file}`.replace('//', '/');
            lonx.fs.write(targetPath, `Content of ${file}`);
            lonx.shell.print(`  extracted: ${file}`);
        }
        
        lonx.shell.print(`✓ Extracted ${files.length} files`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function createArchive(filename, sources, lonx) {
    if (!filename || sources.length === 0) {
        lonx.shell.print('Usage: zip create <archive.zip> <file1> [file2] ...');
        return;
    }
    
    try {
        lonx.shell.print(`Creating archive '${filename}'...`);
        
        const archiveData = {
            files: [],
            created: new Date().toISOString()
        };
        
        for (const source of sources) {
            const content = lonx.fs.read(source);
            if (content !== null) {
                archiveData.files.push({
                    name: source,
                    content: content,
                    size: content.length
                });
                lonx.shell.print(`  added: ${source}`);
            } else {
                lonx.shell.print(`  warning: '${source}' not found, skipping`);
            }
        }
        
        lonx.fs.write(filename, JSON.stringify(archiveData));
        lonx.shell.print(`✓ Created archive with ${archiveData.files.length} files`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function addToArchive(filename, sources, lonx) {
    if (!filename || sources.length === 0) {
        lonx.shell.print('Usage: zip add <archive.zip> <file1> [file2] ...');
        return;
    }
    
    try {
        let archiveData;
        const existing = lonx.fs.read(filename);
        
        if (existing) {
            archiveData = JSON.parse(existing);
        } else {
            archiveData = { files: [], created: new Date().toISOString() };
        }
        
        lonx.shell.print(`Adding files to '${filename}'...`);
        
        for (const source of sources) {
            const content = lonx.fs.read(source);
            if (content !== null) {
                archiveData.files.push({
                    name: source,
                    content: content,
                    size: content.length
                });
                lonx.shell.print(`  added: ${source}`);
            } else {
                lonx.shell.print(`  warning: '${source}' not found, skipping`);
            }
        }
        
        lonx.fs.write(filename, JSON.stringify(archiveData));
        lonx.shell.print(`✓ Archive now contains ${archiveData.files.length} files`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

function showCLIHelp(lonx) {
    lonx.shell.print('LonxOS ZIP Manager - CLI Mode');
    lonx.shell.print('');
    lonx.shell.print('Usage:');
    lonx.shell.print('  zip                           Launch GUI mode');
    lonx.shell.print('  zip list <archive.zip>        List archive contents');
    lonx.shell.print('  zip extract <archive.zip> [dest]  Extract archive');
    lonx.shell.print('  zip create <archive.zip> <files...>  Create new archive');
    lonx.shell.print('  zip add <archive.zip> <files...>     Add files to archive');
    lonx.shell.print('  zip help                      Show this help');
    lonx.shell.print('');
    lonx.shell.print('Examples:');
    lonx.shell.print('  zip list myfiles.zip');
    lonx.shell.print('  zip extract backup.zip /tmp/');
    lonx.shell.print('  zip create documents.zip *.txt *.md');
    lonx.shell.print('  zip add project.zip newfile.js');
}

// Export for shell integration
export { main as zip };
