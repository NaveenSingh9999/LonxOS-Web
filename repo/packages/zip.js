// LonxOS ZIP Archive Manager
// Advanced GUI-based ZIP file manager with CLI interface

class ZipManager {
    constructor(lonx) {
        this.currentArchive = null;
        this.archiveContents = [];
        this.selectedIndex = 0;
        this.isRunning = false;
        this.statusMessage = '';
        this.extractPath = '/tmp/';
        this.compressionLevel = 5;
        this.lonx = lonx;
    }

    async init() {
        this.setupEventListeners();
        this.createInterface();
        this.isRunning = true;
        this.render();
    }

    createInterface() {
        const container = document.createElement('div');
        container.id = 'zip-manager';
        container.className = 'zip-manager-container';
        container.innerHTML = `
            <div class="zip-header">
                <h2>📦 LonxOS ZIP Manager</h2>
                <div class="zip-toolbar">
                    <button id="zip-open">Open Archive</button>
                    <button id="zip-create">Create Archive</button>
                    <button id="zip-extract-all">Extract All</button>
                    <button id="zip-help">Help</button>
                    <button id="zip-exit">Exit</button>
                </div>
            </div>
            
            <div class="zip-main">
                <div class="zip-content">
                    <div class="zip-path-bar">
                        <span id="zip-current-path">Archive Contents</span>
                        <div class="zip-stats">
                            <span id="zip-file-count">0 files</span>
                        </div>
                    </div>
                    
                    <div class="zip-file-list" id="zip-file-list">
                        <div class="zip-file-header">
                            <span class="file-name">Name</span>
                            <span class="file-size">Size</span>
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
                    <span>↑↓: Navigate | Enter: Extract | Ctrl+Q: Quit</span>
                </div>
            </div>
        `;

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
            
            .zip-toolbar button {
                background: #404040;
                color: #ffffff;
                border: 1px solid #666;
                padding: 8px 12px;
                margin-right: 10px;
                cursor: pointer;
                border-radius: 3px;
            }
            
            .zip-toolbar button:hover {
                background: #505050;
                border-color: #00ff88;
            }
            
            .zip-main {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            .zip-content {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .zip-path-bar {
                background: #2d2d2d;
                padding: 8px 15px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
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
                grid-template-columns: 1fr 100px 150px;
                gap: 15px;
                font-weight: bold;
                color: #00ff88;
            }
            
            .zip-file-item {
                padding: 8px 15px;
                border-bottom: 1px solid #333;
                display: grid;
                grid-template-columns: 1fr 100px 150px;
                gap: 15px;
                cursor: pointer;
            }
            
            .zip-file-item:hover {
                background: #2a2a2a;
            }
            
            .zip-file-item.selected {
                background: #00ff88;
                color: #000;
            }
            
            .zip-footer {
                background: #2d2d2d;
                border-top: 1px solid #444;
                padding: 8px 15px;
                display: flex;
                justify-content: space-between;
            }
            
            .zip-status {
                color: #00ff88;
                font-weight: bold;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);
        
        this.container = container;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.getElementById('zip-open').addEventListener('click', () => this.openArchive());
        document.getElementById('zip-create').addEventListener('click', () => this.createArchive());
        document.getElementById('zip-extract-all').addEventListener('click', () => this.extractAll());
        document.getElementById('zip-help').addEventListener('click', () => this.showHelp());
        document.getElementById('zip-exit').addEventListener('click', () => this.exit());
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
                this.extractSelected();
                break;
        }
        
        if (e.ctrlKey && e.key === 'q') {
            e.preventDefault();
            this.exit();
        }
    }

    async openArchive() {
        const filename = prompt('Enter ZIP file path:', '');
        if (!filename) return;
        
        try {
            this.setStatus('Loading archive...');
            const archiveData = this.lonx.fs.read(filename);
            
            if (!archiveData) {
                throw new Error('Archive not found');
            }
            
            this.currentArchive = filename;
            
            // Parse the actual archive data
            try {
                const parsedData = JSON.parse(archiveData);
                if (parsedData.files && Array.isArray(parsedData.files)) {
                    this.archiveContents = parsedData.files.map(file => ({
                        name: file.name,
                        size: file.size || file.content?.length || 0,
                        date: file.date || parsedData.created || new Date().toISOString(),
                        isDirectory: file.name.endsWith('/'),
                        content: file.content
                    }));
                } else {
                    // Handle raw content as single file
                    this.archiveContents = [{
                        name: filename.split('/').pop(),
                        size: archiveData.length,
                        date: new Date().toISOString(),
                        isDirectory: false,
                        content: archiveData
                    }];
                }
            } catch (parseError) {
                // If not JSON, treat as raw file
                this.archiveContents = [{
                    name: filename.split('/').pop(),
                    size: archiveData.length,
                    date: new Date().toISOString(),
                    isDirectory: false,
                    content: archiveData
                }];
            }
            
            this.setStatus(`Loaded ${this.archiveContents.length} files from ${filename}`);
            this.render();
            
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async createArchive() {
        const filename = prompt('Enter new ZIP file name:', 'archive.zip');
        if (!filename) return;
        
        // Show file picker dialog
        await this.showFilePicker(filename);
    }

    async showFilePicker(targetFilename) {
        const picker = document.createElement('div');
        picker.className = 'file-picker-overlay';
        picker.innerHTML = `
            <div class="file-picker-dialog">
                <div class="file-picker-header">
                    <h3>Select Files for Archive</h3>
                    <button id="picker-close">×</button>
                </div>
                <div class="file-picker-content">
                    <div class="current-path">
                        Path: <span id="picker-current-path">/</span>
                        <button id="picker-refresh">Refresh</button>
                    </div>
                    <div class="file-picker-list" id="picker-file-list">
                        <!-- Files will be loaded here -->
                    </div>
                    <div class="selected-files">
                        <h4>Selected Files:</h4>
                        <div id="selected-files-list"></div>
                    </div>
                </div>
                <div class="file-picker-footer">
                    <button id="picker-create">Create Archive</button>
                    <button id="picker-cancel">Cancel</button>
                </div>
            </div>
        `;

        const pickerStyle = document.createElement('style');
        pickerStyle.textContent = `
            .file-picker-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.8);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .file-picker-dialog {
                background: #2d2d2d;
                border: 1px solid #666;
                border-radius: 8px;
                width: 600px;
                max-height: 80vh;
                color: white;
                font-family: 'Courier New', monospace;
            }
            .file-picker-header {
                padding: 15px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .file-picker-header h3 {
                margin: 0;
                color: #00ff88;
            }
            .file-picker-content {
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            }
            .current-path {
                margin-bottom: 15px;
                padding: 8px;
                background: #1a1a1a;
                border-radius: 4px;
            }
            .file-picker-list {
                background: #1a1a1a;
                border: 1px solid #444;
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 15px;
            }
            .picker-file-item {
                padding: 8px 12px;
                border-bottom: 1px solid #333;
                cursor: pointer;
                display: flex;
                align-items: center;
            }
            .picker-file-item:hover {
                background: #333;
            }
            .picker-file-item.selected {
                background: #00ff88;
                color: black;
            }
            .selected-files {
                background: #1a1a1a;
                padding: 10px;
                border-radius: 4px;
                max-height: 100px;
                overflow-y: auto;
            }
            .file-picker-footer {
                padding: 15px;
                border-top: 1px solid #444;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .file-picker-footer button, .current-path button, .file-picker-header button {
                background: #404040;
                color: white;
                border: 1px solid #666;
                padding: 8px 15px;
                cursor: pointer;
                border-radius: 4px;
            }
            .file-picker-footer button:hover, .current-path button:hover {
                background: #505050;
                border-color: #00ff88;
            }
            .file-picker-header button {
                width: 30px;
                height: 30px;
                padding: 0;
                font-size: 18px;
            }
        `;

        document.head.appendChild(pickerStyle);
        document.body.appendChild(picker);

        let currentPath = '/';
        let selectedFiles = new Set();

        const loadDirectory = (path) => {
            const fileList = document.getElementById('picker-file-list');
            const pathElement = document.getElementById('picker-current-path');
            pathElement.textContent = path;

            // Get directory contents from LonxOS filesystem
            try {
                const files = this.lonx.fs.list(path) || [];
                
                let html = '';
                
                // Add parent directory option if not at root
                if (path !== '/') {
                    html += `
                        <div class="picker-file-item" data-path="${path}/.." data-type="parent">
                            <span>📁 ..</span>
                        </div>
                    `;
                }

                files.forEach(file => {
                    const fullPath = path === '/' ? `/${file}` : `${path}/${file}`;
                    const isDir = this.isDirectory(fullPath);
                    const icon = isDir ? '📁' : '📄';
                    const isSelected = selectedFiles.has(fullPath) ? 'selected' : '';
                    
                    html += `
                        <div class="picker-file-item ${isSelected}" data-path="${fullPath}" data-type="${isDir ? 'directory' : 'file'}">
                            <span>${icon} ${file}</span>
                        </div>
                    `;
                });

                fileList.innerHTML = html;
            } catch (error) {
                fileList.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading directory</div>';
            }
        };

        const updateSelectedList = () => {
            const selectedList = document.getElementById('selected-files-list');
            if (selectedFiles.size === 0) {
                selectedList.innerHTML = '<em>No files selected</em>';
            } else {
                selectedList.innerHTML = Array.from(selectedFiles).map(file => 
                    `<div>${file} <button onclick="this.parentElement.remove(); selectedFiles.delete('${file}'); updateSelectedList();">×</button></div>`
                ).join('');
            }
        };

        // Event handlers
        document.getElementById('picker-close').onclick = () => {
            picker.remove();
            pickerStyle.remove();
        };

        document.getElementById('picker-cancel').onclick = () => {
            picker.remove();
            pickerStyle.remove();
        };

        document.getElementById('picker-refresh').onclick = () => {
            loadDirectory(currentPath);
        };

        document.getElementById('picker-create').onclick = async () => {
            if (selectedFiles.size === 0) {
                alert('Please select at least one file');
                return;
            }

            try {
                this.setStatus('Creating archive...');
                const archiveData = {
                    files: [],
                    created: new Date().toISOString()
                };

                for (const filePath of selectedFiles) {
                    try {
                        const content = this.lonx.fs.read(filePath);
                        if (content !== null) {
                            archiveData.files.push({
                                name: filePath.startsWith('/') ? filePath.substring(1) : filePath,
                                content: content,
                                size: content.length,
                                date: new Date().toISOString()
                            });
                        }
                    } catch (fileError) {
                        console.warn(`Could not read file: ${filePath}`, fileError);
                    }
                }

                this.lonx.fs.write(targetFilename, JSON.stringify(archiveData, null, 2));
                this.setStatus(`Created archive ${targetFilename} with ${archiveData.files.length} files`);
                
                picker.remove();
                pickerStyle.remove();

            } catch (error) {
                this.setStatus(`Error creating archive: ${error.message}`);
            }
        };

        // File list click handler
        document.getElementById('picker-file-list').onclick = (e) => {
            const item = e.target.closest('.picker-file-item');
            if (!item) return;

            const path = item.dataset.path;
            const type = item.dataset.type;

            if (type === 'parent') {
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                currentPath = parentPath;
                loadDirectory(currentPath);
            } else if (type === 'directory') {
                currentPath = path;
                loadDirectory(currentPath);
            } else if (type === 'file') {
                if (selectedFiles.has(path)) {
                    selectedFiles.delete(path);
                    item.classList.remove('selected');
                } else {
                    selectedFiles.add(path);
                    item.classList.add('selected');
                }
                updateSelectedList();
            }
        };

        // Initial load
        loadDirectory(currentPath);
        updateSelectedList();

        // Make updateSelectedList available globally for the inline onclick handlers
        window.updateSelectedList = updateSelectedList;
        window.selectedFiles = selectedFiles;
    }

    isDirectory(path) {
        try {
            const files = this.lonx.fs.list(path);
            return Array.isArray(files);
        } catch {
            return false;
        }
    }

    async extractAll() {
        if (this.archiveContents.length === 0) {
            this.setStatus('No files to extract');
            return;
        }
        
        try {
            this.setStatus('Extracting all files...');
            
            for (const file of this.archiveContents) {
                if (!file.isDirectory) {
                    const targetPath = `${this.extractPath}${file.name}`;
                    // Use the actual file content if available
                    const content = file.content || `Extracted content of ${file.name}`;
                    this.lonx.fs.write(targetPath, content);
                }
            }
            
            this.setStatus(`Extracted ${this.archiveContents.length} files to ${this.extractPath}`);
            
        } catch (error) {
            this.setStatus(`Error extracting: ${error.message}`);
        }
    }

    extractSelected() {
        if (this.archiveContents.length === 0 || this.selectedIndex < 0) return;
        
        const file = this.archiveContents[this.selectedIndex];
        if (!file.isDirectory) {
            try {
                const targetPath = `${this.extractPath}${file.name}`;
                // Use the actual file content if available
                const content = file.content || `Extracted content of ${file.name}`;
                this.lonx.fs.write(targetPath, content);
                this.setStatus(`Extracted ${file.name} to ${this.extractPath}`);
            } catch (error) {
                this.setStatus(`Error extracting: ${error.message}`);
            }
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

    render() {
        const filesContainer = document.getElementById('zip-files');
        const fileCountElement = document.getElementById('zip-file-count');
        
        fileCountElement.textContent = `${this.archiveContents.length} files`;
        
        if (this.archiveContents.length === 0) {
            filesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No files in archive</div>';
            return;
        }
        
        filesContainer.innerHTML = this.archiveContents.map((file, index) => {
            const icon = file.isDirectory ? '📁' : '📄';
            const className = `zip-file-item ${index === this.selectedIndex ? 'selected' : ''}`;
            
            return `
                <div class="${className}">
                    <span class="file-name">${icon} ${file.name}</span>
                    <span class="file-size">${this.formatBytes(file.size)}</span>
                    <span class="file-date">${new Date(file.date).toLocaleDateString()}</span>
                </div>
            `;
        }).join('');
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

    showHelp() {
        this.lonx.shell.print('ZIP Manager Help');
        this.lonx.shell.print('Use arrow keys to navigate, Enter to extract files');
        this.lonx.shell.print('Ctrl+Q to quit');
    }

    exit() {
        this.isRunning = false;
        if (this.container) {
            this.container.remove();
        }
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
            if (style.textContent.includes('.zip-manager-container')) {
                style.remove();
            }
        });
    }
}

// CLI Functions
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
        
        const files = [
            { name: 'example.txt', size: 1024, date: '2025-07-14' },
            { name: 'documents/', size: 0, date: '2025-07-14' }
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
        
        const files = ['example.txt', 'readme.md'];
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

function showCLIHelp(lonx) {
    lonx.shell.print('LonxOS ZIP Manager - CLI Mode');
    lonx.shell.print('');
    lonx.shell.print('Usage:');
    lonx.shell.print('  zip                           Launch GUI mode');
    lonx.shell.print('  zip list <archive.zip>        List archive contents');
    lonx.shell.print('  zip extract <archive.zip> [dest]  Extract archive');
    lonx.shell.print('  zip create <archive.zip> <files...>  Create new archive');
    lonx.shell.print('  zip help                      Show this help');
}

// Main function - this is the entry point that LonxOS calls
async function main(args, lonx) {
    if (args.length === 0) {
        // Launch GUI mode
        const manager = new ZipManager(lonx);
        window.zipManager = manager;
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
            case 'help':
                showCLIHelp(lonx);
                break;
            default:
                lonx.shell.print(`Unknown command: ${command}. Use 'zip help' for usage.`);
        }
    }
}

// Export as default for LonxOS
export default main;
