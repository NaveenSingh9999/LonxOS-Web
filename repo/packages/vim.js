// repo/packages/vim.js - A vim-like text editor for Lonx OS

/**
 * Vim Text Editor for Lonx OS
 * A browser-based implementation of vim with modal editing
 * 
 * Features:
 * - Modal editing (Normal, Insert, Visual modes)
 * - Vim-like commands and shortcuts
 * - Command line interface (:w, :q, :wq)
 * - No interference with main system
 */

class VimEditor {
    constructor() {
        this.filePath = '';
        this.originalContent = '';
        this.currentContent = '';
        this.isDirty = false;
        this.lonx_api = null;
        this.isActive = false;
        this.mode = 'NORMAL'; // NORMAL, INSERT, VISUAL, COMMAND
        this.cursor = { line: 0, col: 0 };
        this.lines = [''];
        this.commandHistory = [];
        this.yankedText = '';
        this.savedScrollTop = 0;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.updateDisplay = this.updateDisplay.bind(this);
    }

    createEditor() {
        const container = document.createElement('div');
        container.id = 'vim-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000000;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;

        container.innerHTML = `
            <div id="vim-editor" style="
                flex: 1;
                padding: 8px;
                overflow-y: auto;
                white-space: pre;
                line-height: 1.4;
                cursor: text;
            "></div>
            
            <div id="vim-status" style="
                background: #ffffff;
                color: #000000;
                padding: 2px 8px;
                border-top: 1px solid #333;
                font-weight: bold;
                min-height: 20px;
            ">
                <span id="vim-mode">-- NORMAL --</span>
                <span id="vim-file-info" style="float: right;"></span>
            </div>
            
            <div id="vim-command" style="
                background: #000000;
                color: #ffffff;
                padding: 2px 8px;
                border-top: 1px solid #333;
                font-family: inherit;
                min-height: 20px;
                display: none;
            ">
                :<span id="vim-command-text"></span><span id="vim-cursor">█</span>
            </div>
        `;

        document.body.appendChild(container);
        
        // Get references
        this.container = container;
        this.editorEl = container.querySelector('#vim-editor');
        this.statusEl = container.querySelector('#vim-status');
        this.modeEl = container.querySelector('#vim-mode');
        this.fileInfoEl = container.querySelector('#vim-file-info');
        this.commandEl = container.querySelector('#vim-command');
        this.commandTextEl = container.querySelector('#vim-command-text');
        
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
        this.lines = content.split('\n');
        if (this.lines.length === 0) this.lines = [''];
        
        // Update display
        this.updateDisplay();
        this.updateStatus();
        
        // Set up event listeners
        this.setupEventListeners();
        
        return true;
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown, true);
        document.addEventListener('input', this.handleInput, true);
    }

    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown, true);
        document.removeEventListener('input', this.handleInput, true);
    }

    handleKeyDown(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (this.mode === 'COMMAND') {
            this.handleCommandMode(e);
        } else if (this.mode === 'INSERT') {
            this.handleInsertMode(e);
        } else if (this.mode === 'NORMAL') {
            this.handleNormalMode(e);
        }
        
        this.updateDisplay();
        this.updateStatus();
    }

    handleInput(e) {
        if (!this.isActive) return;
        e.preventDefault();
        e.stopPropagation();
    }

    handleNormalMode(e) {
        switch (e.key) {
            case 'i':
                this.mode = 'INSERT';
                break;
            case 'I':
                this.cursor.col = 0;
                this.mode = 'INSERT';
                break;
            case 'a':
                this.cursor.col++;
                this.mode = 'INSERT';
                break;
            case 'A':
                this.cursor.col = this.lines[this.cursor.line].length;
                this.mode = 'INSERT';
                break;
            case 'o':
                this.lines.splice(this.cursor.line + 1, 0, '');
                this.cursor.line++;
                this.cursor.col = 0;
                this.mode = 'INSERT';
                break;
            case 'O':
                this.lines.splice(this.cursor.line, 0, '');
                this.cursor.col = 0;
                this.mode = 'INSERT';
                break;
            case 'h':
            case 'ArrowLeft':
                this.moveCursor(-1, 0);
                break;
            case 'j':
            case 'ArrowDown':
                this.moveCursor(0, 1);
                break;
            case 'k':
            case 'ArrowUp':
                this.moveCursor(0, -1);
                break;
            case 'l':
            case 'ArrowRight':
                this.moveCursor(1, 0);
                break;
            case 'w':
                this.moveToNextWord();
                break;
            case 'b':
                this.moveToPrevWord();
                break;
            case '0':
                this.cursor.col = 0;
                break;
            case '$':
                this.cursor.col = this.lines[this.cursor.line].length;
                break;
            case 'x':
                this.deleteChar();
                break;
            case 'dd':
                this.deleteLine();
                break;
            case 'yy':
                this.yankLine();
                break;
            case 'p':
                this.putAfter();
                break;
            case 'P':
                this.putBefore();
                break;
            case 'u':
                this.undo();
                break;
            case ':':
                this.enterCommandMode();
                break;
            case '/':
                this.search();
                break;
        }
    }

    handleInsertMode(e) {
        switch (e.key) {
            case 'Escape':
                this.mode = 'NORMAL';
                if (this.cursor.col > 0) this.cursor.col--;
                break;
            case 'Enter':
                const currentLine = this.lines[this.cursor.line];
                const beforeCursor = currentLine.substring(0, this.cursor.col);
                const afterCursor = currentLine.substring(this.cursor.col);
                this.lines[this.cursor.line] = beforeCursor;
                this.lines.splice(this.cursor.line + 1, 0, afterCursor);
                this.cursor.line++;
                this.cursor.col = 0;
                this.markDirty();
                break;
            case 'Backspace':
                if (this.cursor.col > 0) {
                    const line = this.lines[this.cursor.line];
                    this.lines[this.cursor.line] = line.substring(0, this.cursor.col - 1) + line.substring(this.cursor.col);
                    this.cursor.col--;
                    this.markDirty();
                } else if (this.cursor.line > 0) {
                    const currentLine = this.lines[this.cursor.line];
                    this.lines.splice(this.cursor.line, 1);
                    this.cursor.line--;
                    this.cursor.col = this.lines[this.cursor.line].length;
                    this.lines[this.cursor.line] += currentLine;
                    this.markDirty();
                }
                break;
            case 'Tab':
                this.insertText('    ');
                break;
            default:
                if (e.key.length === 1) {
                    this.insertText(e.key);
                }
                break;
        }
    }

    handleCommandMode(e) {
        const commandText = this.commandTextEl.textContent;
        
        switch (e.key) {
            case 'Escape':
                this.exitCommandMode();
                break;
            case 'Enter':
                this.executeCommand(commandText);
                this.exitCommandMode();
                break;
            case 'Backspace':
                this.commandTextEl.textContent = commandText.slice(0, -1);
                break;
            default:
                if (e.key.length === 1) {
                    this.commandTextEl.textContent += e.key;
                }
                break;
        }
    }

    insertText(text) {
        const line = this.lines[this.cursor.line];
        this.lines[this.cursor.line] = line.substring(0, this.cursor.col) + text + line.substring(this.cursor.col);
        this.cursor.col += text.length;
        this.markDirty();
    }

    deleteChar() {
        const line = this.lines[this.cursor.line];
        if (this.cursor.col < line.length) {
            this.lines[this.cursor.line] = line.substring(0, this.cursor.col) + line.substring(this.cursor.col + 1);
            this.markDirty();
        }
    }

    deleteLine() {
        if (this.lines.length > 1) {
            this.yankedText = this.lines[this.cursor.line];
            this.lines.splice(this.cursor.line, 1);
            if (this.cursor.line >= this.lines.length) {
                this.cursor.line = this.lines.length - 1;
            }
            this.cursor.col = 0;
            this.markDirty();
        }
    }

    yankLine() {
        this.yankedText = this.lines[this.cursor.line];
    }

    putAfter() {
        if (this.yankedText) {
            this.lines.splice(this.cursor.line + 1, 0, this.yankedText);
            this.cursor.line++;
            this.markDirty();
        }
    }

    putBefore() {
        if (this.yankedText) {
            this.lines.splice(this.cursor.line, 0, this.yankedText);
            this.markDirty();
        }
    }

    moveCursor(deltaCol, deltaLine) {
        this.cursor.line = Math.max(0, Math.min(this.lines.length - 1, this.cursor.line + deltaLine));
        this.cursor.col = Math.max(0, Math.min(this.lines[this.cursor.line].length, this.cursor.col + deltaCol));
    }

    moveToNextWord() {
        const line = this.lines[this.cursor.line];
        let col = this.cursor.col;
        while (col < line.length && line[col] !== ' ') col++;
        while (col < line.length && line[col] === ' ') col++;
        this.cursor.col = col;
    }

    moveToPrevWord() {
        const line = this.lines[this.cursor.line];
        let col = this.cursor.col;
        if (col > 0) col--;
        while (col > 0 && line[col] === ' ') col--;
        while (col > 0 && line[col] !== ' ') col--;
        if (line[col] === ' ') col++;
        this.cursor.col = col;
    }

    enterCommandMode() {
        this.mode = 'COMMAND';
        this.commandEl.style.display = 'block';
        this.commandTextEl.textContent = '';
    }

    exitCommandMode() {
        this.mode = 'NORMAL';
        this.commandEl.style.display = 'none';
    }

    executeCommand(command) {
        switch (command) {
            case 'w':
                this.save();
                break;
            case 'q':
                if (this.isDirty) {
                    alert('No write since last change. Use :q! to force quit.');
                } else {
                    this.exit();
                }
                break;
            case 'q!':
                this.exit();
                break;
            case 'wq':
                this.save();
                this.exit();
                break;
            default:
                if (command.startsWith('w ')) {
                    const filename = command.substring(2);
                    this.saveAs(filename);
                }
                break;
        }
    }

    search() {
        const searchTerm = prompt('Search for:');
        if (searchTerm) {
            for (let i = this.cursor.line; i < this.lines.length; i++) {
                const index = this.lines[i].indexOf(searchTerm);
                if (index !== -1) {
                    this.cursor.line = i;
                    this.cursor.col = index;
                    return;
                }
            }
            alert('Pattern not found');
        }
    }

    updateDisplay() {
        let displayText = '';
        
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (i === this.cursor.line) {
                // Show cursor
                const beforeCursor = line.substring(0, this.cursor.col);
                const atCursor = line[this.cursor.col] || ' ';
                const afterCursor = line.substring(this.cursor.col + 1);
                
                if (this.mode === 'INSERT') {
                    displayText += beforeCursor + '|' + atCursor + afterCursor;
                } else {
                    displayText += beforeCursor + `<span style="background: #ffffff; color: #000000;">${atCursor}</span>` + afterCursor;
                }
            } else {
                displayText += line;
            }
            
            if (i < this.lines.length - 1) {
                displayText += '\n';
            }
        }
        
        this.editorEl.innerHTML = displayText;
    }

    updateStatus() {
        const modeText = {
            'NORMAL': '-- NORMAL --',
            'INSERT': '-- INSERT --',
            'VISUAL': '-- VISUAL --',
            'COMMAND': '-- COMMAND --'
        }[this.mode];
        
        this.modeEl.textContent = modeText;
        
        const lineCount = this.lines.length;
        const charCount = this.lines.join('\n').length;
        const status = this.isDirty ? '[Modified]' : '';
        this.fileInfoEl.textContent = `${this.filePath} ${status} ${lineCount}L, ${charCount}C`;
    }

    markDirty() {
        this.currentContent = this.lines.join('\n');
        this.isDirty = (this.currentContent !== this.originalContent);
    }

    save() {
        this.currentContent = this.lines.join('\n');
        const success = this.lonx_api.fs.write(this.filePath, this.currentContent);
        if (success) {
            this.originalContent = this.currentContent;
            this.isDirty = false;
            this.showMessage('File saved successfully!');
        } else {
            this.showMessage('Error: Could not save file!');
        }
    }

    saveAs(filename) {
        this.currentContent = this.lines.join('\n');
        const filePath = this.lonx_api.shell.resolvePath(filename);
        const success = this.lonx_api.fs.write(filePath, this.currentContent);
        if (success) {
            this.filePath = filePath;
            this.originalContent = this.currentContent;
            this.isDirty = false;
            this.showMessage(`File saved as ${filePath}`);
        } else {
            this.showMessage('Error: Could not save file!');
        }
    }

    showMessage(message) {
        const originalText = this.fileInfoEl.textContent;
        this.fileInfoEl.textContent = message;
        this.fileInfoEl.style.color = '#ff0000';
        
        setTimeout(() => {
            this.updateStatus();
            this.fileInfoEl.style.color = '#000000';
        }, 2000);
    }

    exit() {
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

    undo() {
        // Simple undo - restore original content
        if (this.isDirty) {
            this.lines = this.originalContent.split('\n');
            if (this.lines.length === 0) this.lines = [''];
            this.cursor = { line: 0, col: 0 };
            this.currentContent = this.originalContent;
            this.isDirty = false;
        }
    }
}

// Global editor instance
let vimEditor = null;

async function main(args, lonx) {
    if (args.length === 0) {
        lonx.shell.print('Usage: vim <filename>');
        lonx.shell.print('');
        lonx.shell.print('Vim Commands:');
        lonx.shell.print('  i/I/a/A/o/O  Enter insert mode');
        lonx.shell.print('  h/j/k/l      Move cursor');
        lonx.shell.print('  w/b          Move by word');
        lonx.shell.print('  x            Delete character');
        lonx.shell.print('  dd           Delete line');
        lonx.shell.print('  yy           Yank (copy) line');
        lonx.shell.print('  p/P          Put (paste)');
        lonx.shell.print('  u            Undo');
        lonx.shell.print('  :w           Save');
        lonx.shell.print('  :q           Quit');
        lonx.shell.print('  :wq          Save and quit');
        lonx.shell.print('  /            Search');
        return;
    }

    const filename = args[0];
    const filePath = lonx.shell.resolvePath(filename);
    
    // Create new editor instance
    vimEditor = new VimEditor();
    
    try {
        // Switch to editor mode
        lonx.shell.setInputMode('editor');
        
        // Open the file
        vimEditor.open(filePath, lonx);
        
    } catch (error) {
        lonx.shell.print(`Error opening vim: ${error.message}`);
        lonx.shell.setInputMode('shell');
    }
}

// Export for Lonx OS
export default main;

// yo
