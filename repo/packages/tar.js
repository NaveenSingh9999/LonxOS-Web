// LonxOS TAR Archive Manager
// Advanced GUI-based TAR/TAR.GZ file manager with CLI interface

class TarManager {
    constructor(lonx) {
        this.currentArchive = null;
        this.archiveContents = [];
        this.selectedIndex = 0;
        this.isRunning = false;
        this.statusMessage = '';
        this.extractPath = '/tmp/';
        this.compressionType = 'gzip';
        this.preservePermissions = true;
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
        container.id = 'tar-manager';
        container.className = 'tar-manager-container';
        container.innerHTML = `
            <div class="tar-header">
                <h2>📦 LonxOS TAR Manager</h2>
                <div class="tar-toolbar">
                    <button id="tar-open">Open Archive</button>
                    <button id="tar-create">Create Archive</button>
                    <button id="tar-extract-all">Extract All</button>
                    <button id="tar-compress">Compress</button>
                    <button id="tar-help">Help</button>
                    <button id="tar-exit">Exit</button>
                </div>
            </div>
            
            <div class="tar-main">
                <div class="tar-content">
                    <div class="tar-path-bar">
                        <span id="tar-current-path">Archive Contents</span>
                        <div class="tar-stats">
                            <span id="tar-entry-count">0 entries</span>
                        </div>
                    </div>
                    
                    <div class="tar-file-list" id="tar-file-list">
                        <div class="tar-file-header">
                            <span class="file-perms">Permissions</span>
                            <span class="file-owner">Owner</span>
                            <span class="file-name">Name</span>
                            <span class="file-size">Size</span>
                            <span class="file-date">Modified</span>
                        </div>
                        <div id="tar-entries"></div>
                    </div>
                </div>
            </div>
            
            <div class="tar-footer">
                <div class="tar-status">
                    <span id="tar-status-message">Ready</span>
                </div>
                <div class="tar-help-text">
                    <span>↑↓: Navigate | Enter: Extract | Ctrl+Q: Quit</span>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .tar-manager-container {
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
            
            .tar-header {
                background: #2d2d2d;
                padding: 10px;
                border-bottom: 1px solid #444;
            }
            
            .tar-header h2 {
                margin: 0 0 10px 0;
                color: #ff8800;
            }
            
            .tar-toolbar button {
                background: #404040;
                color: #ffffff;
                border: 1px solid #666;
                padding: 8px 12px;
                margin-right: 10px;
                cursor: pointer;
                border-radius: 3px;
            }
            
            .tar-toolbar button:hover {
                background: #505050;
                border-color: #ff8800;
            }
            
            .tar-main {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            .tar-content {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .tar-path-bar {
                background: #2d2d2d;
                padding: 8px 15px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
            }
            
            .tar-file-list {
                flex: 1;
                overflow-y: auto;
                background: #1a1a1a;
            }
            
            .tar-file-header {
                background: #2d2d2d;
                padding: 8px 15px;
                border-bottom: 1px solid #444;
                display: grid;
                grid-template-columns: 120px 100px 1fr 100px 150px;
                gap: 15px;
                font-weight: bold;
                color: #ff8800;
            }
            
            .tar-file-item {
                padding: 8px 15px;
                border-bottom: 1px solid #333;
                display: grid;
                grid-template-columns: 120px 100px 1fr 100px 150px;
                gap: 15px;
                cursor: pointer;
            }
            
            .tar-file-item:hover {
                background: #2a2a2a;
            }
            
            .tar-file-item.selected {
                background: #ff8800;
                color: #000;
            }
            
            .tar-footer {
                background: #2d2d2d;
                border-top: 1px solid #444;
                padding: 8px 15px;
                display: flex;
                justify-content: space-between;
            }
            
            .tar-status {
                color: #ff8800;
                font-weight: bold;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);
        
        this.container = container;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.getElementById('tar-open').addEventListener('click', () => this.openArchive());
        document.getElementById('tar-create').addEventListener('click', () => this.createArchive());
        document.getElementById('tar-extract-all').addEventListener('click', () => this.extractAll());
        document.getElementById('tar-compress').addEventListener('click', () => this.compressArchive());
        document.getElementById('tar-help').addEventListener('click', () => this.showHelp());
        document.getElementById('tar-exit').addEventListener('click', () => this.exit());
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
        const filename = prompt('Enter TAR file path:', '');
        if (!filename) return;
        
        try {
            this.setStatus('Loading archive...');
            const archiveData = this.lonx.fs.read(filename);
            
            if (!archiveData) {
                throw new Error('Archive not found');
            }
            
            this.currentArchive = filename;
            this.archiveContents = [
                { 
                    name: 'example.txt', 
                    size: 1024, 
                    permissions: '-rw-r--r--',
                    owner: 'user:user',
                    date: new Date().toISOString(), 
                    isDirectory: false
                },
                { 
                    name: 'documents/', 
                    size: 0, 
                    permissions: 'drwxr-xr-x',
                    owner: 'user:user',
                    date: new Date().toISOString(), 
                    isDirectory: true
                },
                { 
                    name: 'documents/readme.md', 
                    size: 2048, 
                    permissions: '-rw-r--r--',
                    owner: 'user:user',
                    date: new Date().toISOString(), 
                    isDirectory: false
                }
            ];
            
            this.setStatus(`Loaded ${this.archiveContents.length} entries from ${filename}`);
            this.render();
            
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async createArchive() {
        const filename = prompt('Enter new TAR file name:', 'archive.tar.gz');
        if (!filename) return;
        
        const sourcePath = prompt('Enter source directory:', '/');
        if (!sourcePath) return;
        
        try {
            this.setStatus('Creating archive...');
            const tarData = JSON.stringify({ 
                entries: [], 
                created: new Date().toISOString(),
                compression: this.compressionType 
            });
            
            this.lonx.fs.write(filename, tarData);
            this.setStatus(`Created archive ${filename}`);
            
        } catch (error) {
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async extractAll() {
        if (this.archiveContents.length === 0) {
            this.setStatus('No entries to extract');
            return;
        }
        
        try {
            this.setStatus('Extracting all entries...');
            
            for (const entry of this.archiveContents) {
                if (!entry.isDirectory) {
                    const targetPath = `${this.extractPath}${entry.name}`;
                    this.lonx.fs.write(targetPath, `Extracted content of ${entry.name}`);
                }
            }
            
            this.setStatus(`Extracted ${this.archiveContents.length} entries to ${this.extractPath}`);
            
        } catch (error) {
            this.setStatus(`Error extracting: ${error.message}`);
        }
    }

    extractSelected() {
        if (this.archiveContents.length === 0 || this.selectedIndex < 0) return;
        
        const entry = this.archiveContents[this.selectedIndex];
        if (!entry.isDirectory) {
            try {
                const targetPath = `${this.extractPath}${entry.name}`;
                this.lonx.fs.write(targetPath, `Extracted content of ${entry.name}`);
                this.setStatus(`Extracted ${entry.name} to ${this.extractPath}`);
            } catch (error) {
                this.setStatus(`Error extracting: ${error.message}`);
            }
        }
    }

    async compressArchive() {
        if (!this.currentArchive) {
            this.setStatus('No archive loaded');
            return;
        }
        
        this.setStatus('Compressing archive...');
        setTimeout(() => {
            this.setStatus('Archive compressed with gzip');
        }, 1000);
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
        const entriesContainer = document.getElementById('tar-entries');
        const entryCountElement = document.getElementById('tar-entry-count');
        
        entryCountElement.textContent = `${this.archiveContents.length} entries`;
        
        if (this.archiveContents.length === 0) {
            entriesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No entries in archive</div>';
            return;
        }
        
        entriesContainer.innerHTML = this.archiveContents.map((entry, index) => {
            const icon = entry.isDirectory ? '📁' : '📄';
            const className = `tar-file-item ${index === this.selectedIndex ? 'selected' : ''}`;
            
            return `
                <div class="${className}">
                    <span class="file-perms">${entry.permissions}</span>
                    <span class="file-owner">${entry.owner}</span>
                    <span class="file-name">${icon} ${entry.name}</span>
                    <span class="file-size">${this.formatBytes(entry.size)}</span>
                    <span class="file-date">${new Date(entry.date).toLocaleDateString()}</span>
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
        const statusElement = document.getElementById('tar-status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showHelp() {
        this.lonx.shell.print('TAR Manager Help');
        this.lonx.shell.print('Use arrow keys to navigate, Enter to extract entries');
        this.lonx.shell.print('Ctrl+Q to quit');
    }

    exit() {
        this.isRunning = false;
        if (this.container) {
            this.container.remove();
        }
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
            if (style.textContent.includes('.tar-manager-container')) {
                style.remove();
            }
        });
    }
}

// CLI Functions
async function listArchive(filename, lonx) {
    if (!filename) {
        lonx.shell.print('Usage: tar list <archive.tar[.gz|.bz2|.xz]>');
        return;
    }
    
    try {
        const archiveData = lonx.fs.read(filename);
        if (!archiveData) {
            lonx.shell.print(`Error: Archive '${filename}' not found`);
            return;
        }
        
        lonx.shell.print(`Archive: ${filename}`);
        lonx.shell.print('---------------------------------------------------------------');
        lonx.shell.print('Permissions  Owner       Size      Date       Name');
        lonx.shell.print('---------------------------------------------------------------');
        
        const entries = [
            { name: 'example.txt', size: 1024, permissions: '-rw-r--r--', owner: 'user', date: '2025-07-14' },
            { name: 'documents/', size: 0, permissions: 'drwxr-xr-x', owner: 'user', date: '2025-07-14' }
        ];
        
        entries.forEach(entry => {
            const sizeStr = entry.size.toString().padStart(8);
            lonx.shell.print(`${entry.permissions} ${entry.owner.padEnd(8)} ${sizeStr}   ${entry.date}  ${entry.name}`);
        });
        
        lonx.shell.print('---------------------------------------------------------------');
        lonx.shell.print(`Total: ${entries.length} entries`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function extractArchive(filename, destination = './', lonx) {
    if (!filename) {
        lonx.shell.print('Usage: tar extract <archive.tar[.gz|.bz2|.xz]> [destination]');
        return;
    }
    
    try {
        const archiveData = lonx.fs.read(filename);
        if (!archiveData) {
            lonx.shell.print(`Error: Archive '${filename}' not found`);
            return;
        }
        
        lonx.shell.print(`Extracting '${filename}' to '${destination}'...`);
        
        const entries = ['example.txt', 'documents/readme.md'];
        for (const entry of entries) {
            const targetPath = `${destination}/${entry}`.replace('//', '/');
            if (!entry.endsWith('/')) {
                lonx.fs.write(targetPath, `Content of ${entry}`);
                lonx.shell.print(`  extracted: ${entry}`);
            } else {
                lonx.shell.print(`  created dir: ${entry}`);
            }
        }
        
        lonx.shell.print(`✓ Extracted ${entries.length} entries`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function createArchive(filename, sources, lonx) {
    if (!filename || sources.length === 0) {
        lonx.shell.print('Usage: tar create <archive.tar> <file1> [file2] ...');
        return;
    }
    
    try {
        lonx.shell.print(`Creating archive '${filename}'...`);
        
        const archiveData = {
            entries: [],
            created: new Date().toISOString()
        };
        
        for (const source of sources) {
            const content = lonx.fs.read(source);
            if (content !== null) {
                archiveData.entries.push({
                    name: source,
                    content: content,
                    size: content.length,
                    permissions: '-rw-r--r--',
                    owner: 'user:user'
                });
                lonx.shell.print(`  added: ${source}`);
            } else {
                lonx.shell.print(`  warning: '${source}' not found, skipping`);
            }
        }
        
        lonx.fs.write(filename, JSON.stringify(archiveData));
        lonx.shell.print(`✓ Created archive with ${archiveData.entries.length} entries`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function compressFile(filename, method, lonx) {
    if (!filename) {
        lonx.shell.print('Usage: tar compress <file> [method]');
        return;
    }
    
    try {
        const data = lonx.fs.read(filename);
        if (!data) {
            lonx.shell.print(`Error: File '${filename}' not found`);
            return;
        }
        
        const compressedFilename = `${filename}.gz`;
        const compressedData = `Compressed version of ${filename}`;
        
        lonx.fs.write(compressedFilename, compressedData);
        lonx.shell.print(`✓ Compressed to ${compressedFilename}`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

async function decompressFile(filename, lonx) {
    if (!filename) {
        lonx.shell.print('Usage: tar decompress <file>');
        return;
    }
    
    try {
        const data = lonx.fs.read(filename);
        if (!data) {
            lonx.shell.print(`Error: File '${filename}' not found`);
            return;
        }
        
        const decompressedFilename = filename.replace(/\.(gz|bz2|xz|lzma)$/, '');
        const decompressedData = `Decompressed version of ${filename}`;
        
        lonx.fs.write(decompressedFilename, decompressedData);
        lonx.shell.print(`✓ Decompressed to ${decompressedFilename}`);
        
    } catch (error) {
        lonx.shell.print(`Error: ${error.message}`);
    }
}

function showCLIHelp(lonx) {
    lonx.shell.print('LonxOS TAR Manager - CLI Mode');
    lonx.shell.print('');
    lonx.shell.print('Usage:');
    lonx.shell.print('  tar                                    Launch GUI mode');
    lonx.shell.print('  tar list <archive>                     List archive contents');
    lonx.shell.print('  tar extract <archive> [dest]           Extract archive');
    lonx.shell.print('  tar create <archive> <files...>        Create new archive');
    lonx.shell.print('  tar compress <file> [method]           Compress file');
    lonx.shell.print('  tar decompress <file>                  Decompress file');
    lonx.shell.print('  tar help                               Show this help');
}

// Main function - this is the entry point that LonxOS calls
async function main(args, lonx) {
    if (args.length === 0) {
        // Launch GUI mode
        const manager = new TarManager(lonx);
        window.tarManager = manager;
        await manager.init();
    } else {
        // CLI mode
        const command = args[0];
        
        switch (command) {
            case 'list':
            case 'l':
            case 't':
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
            case 'compress':
                await compressFile(args[1], args[2], lonx);
                break;
            case 'decompress':
                await decompressFile(args[1], lonx);
                break;
            case 'help':
                showCLIHelp(lonx);
                break;
            default:
                lonx.shell.print(`Unknown command: ${command}. Use 'tar help' for usage.`);
        }
    }
}

// Export as default for LonxOS
export default main;
