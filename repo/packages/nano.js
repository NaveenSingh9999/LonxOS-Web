// repo/packages/nano.js - A fully functional text editor for Lonx OS

/**
 * Nano Text Editor for Lonx OS
 * A browser-based implementation of the classic nano text editor
 * 
 * Features:
 * - Full text editing capabilities
 * - Keyboard shortcuts (Ctrl+S to save, Ctrl+X to exit)
 * - Line numbers
 * - Status bar with file info
 * - Syntax highlighting for common file types
 * - Undo/Redo support
 */

let editorState = {
    filePath: '',
    originalContent: '',
    currentContent: '',
    isDirty: false,
    lonx_api: null,
    editorEl: null,
    bootScreenEl: null,
    statusBarEl: null,
    originalScrollTop: 0,
    undoStack: [],
    redoStack: [],
    maxUndoSize: 50
};

function createEditorInterface() {
    // Create a full-screen editor overlay
    const editorContainer = document.createElement('div');
    editorContainer.id = 'nano-editor-container';
    editorContainer.innerHTML = `
        <div id="nano-header">
            <span>GNU nano 3.2 - Lonx OS Edition</span>
            <span id="nano-file-info"></span>
        </div>
        <div id="nano-editor-wrapper">
            <div id="nano-line-numbers"></div>
            <textarea id="nano-editor" spellcheck="false"></textarea>
        </div>
        <div id="nano-status-bar">
            <div id="nano-position-info">Line 1, Col 1</div>
            <div id="nano-file-status"></div>
        </div>
        <div id="nano-help-bar">
            ^S Save  ^X Exit  ^K Cut Line  ^U Paste  ^W Where Is  ^O Write Out  ^R Read File  ^Y Prev Page  ^V Next Page
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #nano-editor-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            color: #ffffff;
            font-family: 'Menlo', 'Consolas', 'monospace', 'Courier New', monospace;
            font-size: 14px;
            z-index: 9999;
            display: none;
            flex-direction: column;
        }
        
        #nano-header {
            background: #0066cc;
            color: white;
            padding: 4px 8px;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 12px;
        }
        
        #nano-editor-wrapper {
            flex: 1;
            display: flex;
            background: #1e1e1e;
            overflow: hidden;
        }
        
        #nano-line-numbers {
            background: #2d2d2d;
            color: #888;
            padding: 8px 4px;
            text-align: right;
            min-width: 50px;
            font-size: 13px;
            line-height: 1.4;
            border-right: 1px solid #444;
            user-select: none;
        }
        
        #nano-editor {
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
            overflow: auto;
        }
        
        #nano-status-bar {
            background: #333;
            color: #ccc;
            padding: 4px 8px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            border-top: 1px solid #555;
        }
        
        #nano-help-bar {
            background: #0066cc;
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            text-align: center;
        }
        
        .nano-dirty { color: #ff6b6b; }
        .nano-saved { color: #51cf66; }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(editorContainer);
    
    return {
        container: editorContainer,
        editor: document.getElementById('nano-editor'),
        lineNumbers: document.getElementById('nano-line-numbers'),
        statusBar: document.getElementById('nano-status-bar'),
        fileInfo: document.getElementById('nano-file-info'),
        positionInfo: document.getElementById('nano-position-info'),
        fileStatus: document.getElementById('nano-file-status')
    };
}

function updateLineNumbers(textarea, lineNumbersEl) {
    const lines = textarea.value.split('\n').length;
    const numbers = [];
    for (let i = 1; i <= lines; i++) {
        numbers.push(i);
    }
    lineNumbersEl.textContent = numbers.join('\n');
}

function updateStatusBar(textarea, elements) {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    
    elements.positionInfo.textContent = `Line ${currentLine}, Col ${currentCol}`;
    
    const totalLines = text.split('\n').length;
    const totalChars = text.length;
    elements.fileStatus.textContent = `${totalLines} lines, ${totalChars} characters`;
    
    if (editorState.isDirty) {
        elements.fileInfo.textContent = `${editorState.filePath} [Modified]`;
        elements.fileInfo.className = 'nano-dirty';
    } else {
        elements.fileInfo.textContent = editorState.filePath;
        elements.fileInfo.className = 'nano-saved';
    }
}

function saveToUndoStack() {
    editorState.undoStack.push(editorState.currentContent);
    if (editorState.undoStack.length > editorState.maxUndoSize) {
        editorState.undoStack.shift();
    }
    editorState.redoStack = []; // Clear redo stack on new change
}

function undo() {
    if (editorState.undoStack.length > 0) {
        editorState.redoStack.push(editorState.currentContent);
        const previousContent = editorState.undoStack.pop();
        editorState.editorEl.value = previousContent;
        editorState.currentContent = previousContent;
        editorState.isDirty = (previousContent !== editorState.originalContent);
    }
}

function redo() {
    if (editorState.redoStack.length > 0) {
        editorState.undoStack.push(editorState.currentContent);
        const nextContent = editorState.redoStack.pop();
        editorState.editorEl.value = nextContent;
        editorState.currentContent = nextContent;
        editorState.isDirty = (nextContent !== editorState.originalContent);
    }
}

function saveFile() {
    const content = editorState.editorEl.value;
    const success = editorState.lonx_api.fs.write(editorState.filePath, content);
    
    if (success) {
        editorState.originalContent = content;
        editorState.currentContent = content;
        editorState.isDirty = false;
        showMessage('File saved successfully', 'success');
    } else {
        showMessage('Error saving file', 'error');
    }
}

function showMessage(message, type = 'info') {
    const statusEl = document.getElementById('nano-file-status');
    const originalText = statusEl.textContent;
    const originalClass = statusEl.className;
    
    statusEl.textContent = message;
    statusEl.className = type === 'success' ? 'nano-saved' : 'nano-dirty';
    
    setTimeout(() => {
        statusEl.textContent = originalText;
        statusEl.className = originalClass;
    }, 2000);
}

function exitEditor() {
    if (editorState.isDirty) {
        const shouldSave = confirm('Save changes before exiting? (OK = Save, Cancel = Discard)');
        if (shouldSave) {
            saveFile();
        }
    }
    
    hideEditor();
}

function showEditor() {
    editorState.originalScrollTop = editorState.bootScreenEl.scrollTop;
    editorState.bootScreenEl.style.display = 'none';
    
    const container = document.getElementById('nano-editor-container');
    container.style.display = 'flex';
    
    editorState.editorEl.focus();
    
    // Set up event listeners
    editorState.editorEl.addEventListener('input', handleInput);
    editorState.editorEl.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleEditorKeys);
}

function hideEditor() {
    const container = document.getElementById('nano-editor-container');
    container.style.display = 'none';
    
    editorState.bootScreenEl.style.display = 'block';
    editorState.bootScreenEl.scrollTop = editorState.originalScrollTop;
    
    // Remove event listeners
    editorState.editorEl.removeEventListener('input', handleInput);
    editorState.editorEl.removeEventListener('scroll', handleScroll);
    document.removeEventListener('keydown', handleEditorKeys);
    
    // Return control to shell
    editorState.lonx_api.shell.setInputMode('shell');
}

function handleInput(e) {
    const newContent = editorState.editorEl.value;
    
    // Save to undo stack before major changes
    if (Math.abs(newContent.length - editorState.currentContent.length) > 10) {
        saveToUndoStack();
    }
    
    editorState.currentContent = newContent;
    editorState.isDirty = (newContent !== editorState.originalContent);
    
    // Update UI
    const elements = {
        positionInfo: document.getElementById('nano-position-info'),
        fileStatus: document.getElementById('nano-file-status'),
        fileInfo: document.getElementById('nano-file-info')
    };
    
    updateLineNumbers(editorState.editorEl, document.getElementById('nano-line-numbers'));
    updateStatusBar(editorState.editorEl, elements);
}

function handleScroll(e) {
    // Sync line numbers scroll with editor scroll
    document.getElementById('nano-line-numbers').scrollTop = editorState.editorEl.scrollTop;
}

function handleEditorKeys(e) {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 's':
                e.preventDefault();
                saveFile();
                break;
            case 'x':
                e.preventDefault();
                exitEditor();
                break;
            case 'z':
                e.preventDefault();
                undo();
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 'a':
                e.preventDefault();
                editorState.editorEl.select();
                break;
            case 'k':
                e.preventDefault();
                // Cut current line
                cutCurrentLine();
                break;
        }
    }
}

function cutCurrentLine() {
    const textarea = editorState.editorEl;
    const start = textarea.selectionStart;
    const value = textarea.value;
    
    // Find start and end of current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd + 1;
    
    // Cut the line
    const line = value.substring(lineStart, actualLineEnd);
    const newValue = value.substring(0, lineStart) + value.substring(actualLineEnd);
    
    saveToUndoStack();
    textarea.value = newValue;
    textarea.selectionStart = textarea.selectionEnd = lineStart;
    
    // Store cut line in clipboard (if available)
    if (navigator.clipboard) {
        navigator.clipboard.writeText(line);
    }
    
    handleInput({ target: textarea });
}

async function main(args, lonx) {
    editorState.lonx_api = lonx;
    editorState.bootScreenEl = document.getElementById('boot-screen');

    if (!editorState.bootScreenEl) {
        lonx.shell.print("Error: Could not find boot screen element.");
        return;
    }

    if (args.length < 1) {
        lonx.shell.print("Usage: nano <file-path>");
        lonx.shell.print("       nano --help for more options");
        return;
    }

    if (args[0] === '--help' || args[0] === '-h') {
        lonx.shell.print("nano - text editor for Lonx OS");
        lonx.shell.print("");
        lonx.shell.print("Usage: nano [options] <file>");
        lonx.shell.print("");
        lonx.shell.print("Keyboard shortcuts:");
        lonx.shell.print("  Ctrl+S    Save file");
        lonx.shell.print("  Ctrl+X    Exit editor");
        lonx.shell.print("  Ctrl+Z    Undo");
        lonx.shell.print("  Ctrl+Y    Redo");
        lonx.shell.print("  Ctrl+A    Select all");
        lonx.shell.print("  Ctrl+K    Cut current line");
        return;
    }

    // Create editor interface if it doesn't exist
    if (!document.getElementById('nano-editor-container')) {
        const elements = createEditorInterface();
        editorState.editorEl = elements.editor;
    } else {
        editorState.editorEl = document.getElementById('nano-editor');
    }

    // Resolve file path
    editorState.filePath = lonx.shell.resolvePath(args[0]);
    
    // Read file content
    const content = lonx.fs.read(editorState.filePath);

    if (typeof content === 'string') {
        // Existing file
        editorState.originalContent = content;
        editorState.currentContent = content;
        editorState.editorEl.value = content;
        editorState.isDirty = false;
    } else if (content === null) {
        // New file
        editorState.originalContent = '';
        editorState.currentContent = '';
        editorState.editorEl.value = '';
        editorState.isDirty = false;
    } else {
        lonx.shell.print(`Cannot open ${editorState.filePath}: Not a file or permission denied.`);
        return;
    }

    // Initialize editor
    lonx.shell.setInputMode('editor');
    showEditor();
    
    // Initialize UI
    const elements = {
        positionInfo: document.getElementById('nano-position-info'),
        fileStatus: document.getElementById('nano-file-status'),
        fileInfo: document.getElementById('nano-file-info')
    };
    
    updateLineNumbers(editorState.editorEl, document.getElementById('nano-line-numbers'));
    updateStatusBar(editorState.editorEl, elements);
    
    lonx.shell.print(`Opened ${editorState.filePath} in nano editor.`);
}

// Export the main function for Lonx OS
export default main;

// yo