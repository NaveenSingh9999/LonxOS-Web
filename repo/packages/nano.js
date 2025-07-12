// bin/nano.js

let filePath = '';
let lonx_api;
let editorEl;
let bootScreenEl;
let originalContent = '';
let originalScrollTop = 0;

function showEditor() {
    originalScrollTop = bootScreenEl.scrollTop;
    bootScreenEl.style.display = 'none';
    editorEl.style.display = 'block';
    editorEl.focus();
}

function hideEditor() {
    editorEl.style.display = 'none';
    bootScreenEl.style.display = 'block';
    bootScreenEl.scrollTop = originalScrollTop; // Restore scroll position
    document.removeEventListener('keydown', handleEditorKeys);
    // Return control to the shell
    lonx_api.shell.setInputMode('shell');
}

function handleEditorKeys(e) {
    // Let the textarea handle typing, backspace, arrows, etc.
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const newContent = editorEl.value;
        lonx_api.fs.write(filePath, newContent);
        originalContent = newContent; // Update original content after saving
        // A real nano would show a status message. We'll skip for now.
        console.log(`[nano] Saved ${filePath}`);
    } else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (editorEl.value !== originalContent) {
            // A real nano would prompt to save. We'll just exit.
            console.log('[nano] Exiting with unsaved changes.');
        }
        hideEditor();
    }
}

export default function main(args, lonx) {
    lonx_api = lonx;
    editorEl = document.getElementById('nano-editor');
    bootScreenEl = document.getElementById('boot-screen');

    if (!editorEl || !bootScreenEl) {
        lonx.shell.print("Error: Could not find editor elements in the DOM.");
        return;
    }

    if (args.length < 1) {
        lonx.shell.print("Usage: nano <file-path>");
        return;
    }
    
    // Use the shell's path resolution
    filePath = lonx.shell.resolvePath(args[0]);
    const content = lonx.fs.read(filePath);

    if (typeof content === 'string') {
        originalContent = content;
        editorEl.value = content;
        lonx_api.shell.setInputMode('editor'); // Pauses shell input
        showEditor();
        // Use a specific listener for nano so we don't conflict with the shell
        document.addEventListener('keydown', handleEditorKeys);
    } else if (content === null) {
        // File doesn't exist, treat as new file
        originalContent = '';
        editorEl.value = '';
        lonx_api.shell.setInputMode('editor');
        showEditor();
        document.addEventListener('keydown', handleEditorKeys);
    } else {
        lonx.shell.print(`Cannot open ${filePath}. It might be a directory.`);
    }
}
