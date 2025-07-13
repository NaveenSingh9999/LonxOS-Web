// repo/packages/nano.js - A fully functional text editor for Lonx OS

/**
 * Nano Text Editor for Lonx OS
 * A browser-based implementation that works perfectly with proper event isolation
 * 
 * Features:
 * - Full text editing capabilities
 * - Isolated keyboard shortcuts (Alt+S to save, Alt+X to exit)
 * - Line numbers and status bar
 * - Undo/Redo support
 * - No interference with main system
 */

class NanoEditor {
    constructor() {
        this.filePath = '';
        this.originalContent = '';
        this.currentContent = '';
        this.isDirty = false;
        this.lonx_api = null;
        this.isActive = false;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSize = 50;
        this.savedScrollTop = 0;
        
        // Bind methods to preserve context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.updateStatus = this.updateStatus.bind(this);
    }

    createEditor() {
        const container = document.createElement('div');
        container.id = 'nano-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #1e1e1e;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;

        container.innerHTML = `
            <div id="nano-header" style="
                background: #333;
                color: #fff;
                padding: 4px 8px;
                border-bottom: 1px solid #555;
                display: flex;
                justify-content: space-between;
                font-weight: bold;
            ">
                <span>GNU nano 3.2 - Lonx OS Edition</span>
                <span id="nano-file-name"></span>
            </div>
            
            <div id="nano-content" style="
                flex: 1;
                display: flex;
                overflow: hidden;
            ">
                <div id="nano-line-numbers" style="
                    background: #2a2a2a;
                    color: #888;
                    padding: 8px 4px;
                    border-right: 1px solid #555;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: 1.4;
                    user-select: none;
                    white-space: pre;
                    overflow: hidden;
                    min-width: 40px;
                    text-align: right;
                "></div>
                
                <textarea id="nano-textarea" style="
                    flex: 1;
                    background: #1e1e1e;
                    color: #ffffff;
                    border: none;
                    outline: none;
                    padding: 8px;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: 1.4;
                    resize: none;
                    white-space: pre;
                    overflow-wrap: normal;
                    tab-size: 4;
                "></textarea>
            </div>
            
            <div id="nano-status" style="
                background: #333;
                color: #ccc;
                padding: 4px 8px;
                border-top: 1px solid #555;
                display: flex;
                justify-content: space-between;
                font-size: 12px;
            ">
                <span id="nano-position">Line 1, Col 1</span>
                <span id="nano-file-status">New File</span>
            </div>
            
            <div id="nano-help" style="
                background: #0066cc;
                color: white;
                padding: 4px 8px;
                font-size: 12px;
                text-align: center;
            ">
                Alt+S Save | Alt+X Exit | Alt+Z Undo | Alt+Y Redo | Alt+F Find | Alt+H Help
            </div>
        `;

        document.body.appendChild(container);
        
        // Get references to elements
        this.container = container;
        this.textarea = container.querySelector('#nano-textarea');
        this.lineNumbers = container.querySelector('#nano-line-numbers');
        this.fileName = container.querySelector('#nano-file-name');
        this.position = container.querySelector('#nano-position');
        this.fileStatus = container.querySelector('#nano-file-status');
        
        return container;
    }

    open(filePath, lonx_api) {
        this.filePath = filePath;
        this.lonx_api = lonx_api;
        this.isActive = true;
        
        // Save current scroll position
        const bootScreen = document.getElementById('boot-screen');
        if (bootScreen) {
            this.savedScrollTop = bootScreen.scrollTop;
            bootScreen.style.display = 'none';
        }
        
        // Create editor interface
        this.createEditor();
        
        // Load file content
        const content = lonx_api.fs.read(filePath) || '';
        this.originalContent = content;
        this.currentContent = content;
        this.textarea.value = content;
        
        // Update UI
        this.fileName.textContent = filePath;
        this.updateLineNumbers();
        this.updateStatus();
        
        // Set up event listeners with proper isolation
        this.setupEventListeners();
        
        // Focus the textarea
        setTimeout(() => {
            this.textarea.focus();
            this.textarea.setSelectionRange(0, 0);
        }, 50);
        
        return true;
    }

    setupEventListeners() {
        // Prevent default keyboard events from reaching the system
        document.addEventListener('keydown', this.handleKeyDown, true);
        
        // Handle text input
        this.textarea.addEventListener('input', this.handleInput);
        
        // Handle cursor movement and selection
        this.textarea.addEventListener('keyup', this.updateStatus);
        this.textarea.addEventListener('mouseup', this.updateStatus);
        this.textarea.addEventListener('scroll', () => {
            this.lineNumbers.scrollTop = this.textarea.scrollTop;
        });
    }

    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown, true);
        this.textarea.removeEventListener('input', this.handleInput);
        this.textarea.removeEventListener('keyup', this.updateStatus);
        this.textarea.removeEventListener('mouseup', this.updateStatus);
    }

    handleKeyDown(e) {
        if (!this.isActive) return;
        
        // Only handle events when nano is active
        if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            
            switch (e.key.toLowerCase()) {
                case 's':
                    this.save();
                    break;
                case 'x':
                    this.exit();
                    break;
                case 'z':
                    this.undo();
                    break;
                case 'y':
                    this.redo();
                    break;
                case 'f':
                    this.find();
                    break;
                case 'h':
                    this.showHelp();
                    break;
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.exit();
        } else if (e.ctrlKey && e.key === 'c') {
            // Allow Ctrl+C for copy but don't let it exit
            return;
        } else {
            // For all other keys, stop propagation to prevent system interference
            e.stopPropagation();
        }
    }

    handleInput(e) {
        this.currentContent = this.textarea.value;
        this.isDirty = (this.currentContent !== this.originalContent);
        this.updateLineNumbers();
        this.updateStatus();
        
        // Add to undo stack on significant changes
        if (Math.abs(this.currentContent.length - this.originalContent.length) > 5) {
            this.addToUndoStack();
        }
    }

    updateLineNumbers() {
        const lines = this.textarea.value.split('\n');
        const lineCount = lines.length;
        const numbers = [];
        
        for (let i = 1; i <= lineCount; i++) {
            numbers.push(i.toString().padStart(3, ' '));
        }
        
        this.lineNumbers.textContent = numbers.join('\n');
    }

    updateStatus() {
        const textarea = this.textarea;
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        // Calculate line and column
        const textBeforeCursor = text.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length;
        const currentCol = lines[lines.length - 1].length + 1;
        
        this.position.textContent = `Line ${currentLine}, Col ${currentCol}`;
        
        // Update file status
        const status = this.isDirty ? 'Modified' : 'Saved';
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        this.fileStatus.textContent = `${status} | ${lineCount} lines, ${charCount} chars`;
    }

    addToUndoStack() {
        this.undoStack.push(this.currentContent);
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new change
    }

    undo() {
        if (this.undoStack.length > 0) {
            this.redoStack.push(this.currentContent);
            const previousContent = this.undoStack.pop();
            this.textarea.value = previousContent;
            this.currentContent = previousContent;
            this.updateLineNumbers();
            this.updateStatus();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            this.undoStack.push(this.currentContent);
            const nextContent = this.redoStack.pop();
            this.textarea.value = nextContent;
            this.currentContent = nextContent;
            this.updateLineNumbers();
            this.updateStatus();
        }
    }

    save() {
        const success = this.lonx_api.fs.write(this.filePath, this.currentContent);
        if (success) {
            this.originalContent = this.currentContent;
            this.isDirty = false;
            this.updateStatus();
            this.showMessage('File saved successfully!');
        } else {
            this.showMessage('Error: Could not save file!');
        }
    }

    find() {
        const searchTerm = prompt('Search for:');
        if (searchTerm) {
            const text = this.textarea.value;
            const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (index !== -1) {
                this.textarea.focus();
                this.textarea.setSelectionRange(index, index + searchTerm.length);
                this.showMessage(`Found: "${searchTerm}"`);
            } else {
                this.showMessage(`Not found: "${searchTerm}"`);
            }
        }
    }

    showHelp() {
        const helpText = `
Nano Text Editor - Keyboard Shortcuts:

Alt+S    Save file
Alt+X    Exit editor
Alt+Z    Undo last change
Alt+Y    Redo last undo
Alt+F    Find text
Alt+H    Show this help
Esc      Exit editor

Use normal text input to edit the file.
All shortcuts use Alt key to avoid conflicts.
        `;
        
        alert(helpText);
    }

    showMessage(message) {
        // Temporarily show message in file status
        const originalStatus = this.fileStatus.textContent;
        this.fileStatus.textContent = message;
        this.fileStatus.style.color = '#ffff00';
        
        setTimeout(() => {
            this.fileStatus.textContent = originalStatus;
            this.fileStatus.style.color = '#ccc';
        }, 2000);
    }

    exit() {
        if (this.isDirty) {
            const save = confirm('File has unsaved changes. Save before closing?');
            if (save) {
                this.save();
            }
        }
        
        this.close();
    }

    close() {
        this.isActive = false;
        this.removeEventListeners();
        
        // Remove editor
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Restore boot screen
        const bootScreen = document.getElementById('boot-screen');
        if (bootScreen) {
            bootScreen.style.display = 'block';
            bootScreen.scrollTop = this.savedScrollTop;
        }
        
        // Return control to shell
        if (this.lonx_api && this.lonx_api.shell && this.lonx_api.shell.setInputMode) {
            this.lonx_api.shell.setInputMode('shell');
        }
    }
}

// Global editor instance
let nanoEditor = null;

async function main(args, lonx) {
    if (args.length === 0) {
        lonx.shell.print('Usage: nano <filename>');
        return;
    }

    const filename = args[0];
    const filePath = lonx.shell.resolvePath(filename);
    
    // Create new editor instance
    nanoEditor = new NanoEditor();
    
    try {
        // Switch to editor mode
        lonx.shell.setInputMode('editor');
        
        // Open the file
        nanoEditor.open(filePath, lonx);
        
    } catch (error) {
        lonx.shell.print(`Error opening nano: ${error.message}`);
        lonx.shell.setInputMode('shell');
    }
}

// Export for Lonx OS
export default main;

// yo