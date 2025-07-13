var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// os/shell.ts
import { getMemoryStats } from './memory.js';
import { getProcessList } from './process.js';
import { read, write, remove } from './fs.js';
import { mim } from './mim.js';
import * as net from './core/net.js';
let bootScreen;
let currentLine = '';
const commandHistory = [];
let historyIndex = -1;
let inputMode = 'shell';
let editorKeyHandler = null;
let currentWorkingDirectory = '/home/user'; // Start in user's home directory
export function shellPrint(text) {
    if (bootScreen) {
        bootScreen.innerHTML += `\n${text}`;
        bootScreen.scrollTop = bootScreen.scrollHeight;
    }
}
export function shellUpdateLine(text) {
    if (bootScreen) {
        const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
        if (lastLineIndex !== -1) {
            bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex) + `\n${text}`;
        }
        else {
            bootScreen.innerHTML = text;
        }
        bootScreen.scrollTop = bootScreen.scrollHeight;
    }
}
export function setInputMode(mode, handler) {
    inputMode = mode;
    if (mode === 'editor' && handler) {
        editorKeyHandler = handler;
    }
    else {
        editorKeyHandler = null;
        renderShell(); // Re-render the shell prompt when returning to shell mode
    }
}
function resolvePath(path) {
    if (path.startsWith('/')) {
        return path; // Already absolute
    }
    // Resolve relative path
    const newPath = currentWorkingDirectory.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);
    for (const part of pathParts) {
        if (part === '..') {
            newPath.pop();
        }
        else if (part !== '.') {
            newPath.push(part);
        }
    }
    return '/' + newPath.join('/');
}
let isSudo = false; // Global flag for sudo access
function executeCommand(command, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (command in builtInCommands) {
            try {
                // The 'sudo' command itself doesn't get sudo privileges, it grants them.
                if (command === 'sudo') {
                    yield builtInCommands[command](args, false);
                    return;
                }
                const result = yield builtInCommands[command](args, isSudo);
                if (result) {
                    shellPrint(result);
                }
            }
            catch (e) {
                shellPrint(`Error: ${e.message}`);
            }
        }
        else if (command) {
            // Try to execute from /bin
            const binPath = `/bin/${command}`;
            const scriptContent = read(binPath);
            if (typeof scriptContent === 'string' && scriptContent.length > 0) {
                try {
                    const executable = new Function('args', 'lonx_api', 'isSudo', scriptContent);
                    yield executable(args, lonx_api, isSudo);
                }
                catch (e) {
                    shellPrint(`Error executing ${command}: ${e.message}`);
                }
            }
            else {
                shellPrint(`Command not found: ${command}`);
            }
        }
    });
}
const builtInCommands = {
    help: () => 'Available Commands: echo, whoami, memstat, clear, reboot, ls, cat, touch, rm, mim, ps, cd, adt, sudo',
    echo: (args) => args.join(' '),
    memstat: () => {
        const stats = getMemoryStats();
        const processes = getProcessList();
        return `Total RAM: ${stats.total}MB\nUsed RAM: ${stats.used.toFixed(2)}MB\nRunning Processes: ${processes.length}`;
    },
    whoami: () => 'user@lonx',
    reboot: () => {
        setTimeout(() => window.location.reload(), 1000);
        return 'System Rebooting...';
    },
    clear: () => {
        bootScreen.innerHTML = '';
        return '';
    },
    ls: (args) => {
        const path = resolvePath(args[0] || '.');
        const content = read(path);
        if (typeof content === 'object' && content !== null) {
            return Object.keys(content).map(key => {
                const itemPath = `${path === '/' ? '' : path}/${key}`;
                const item = read(itemPath);
                if (typeof item === 'object' && item !== null) {
                    return `<span style="color: #87CEFA;">${key}/</span>`; // Blue for directories
                }
                return key;
            }).join('\n');
        }
        return `ls: cannot access '${path}': Not a directory or does not exist`;
    },
    cat: (args) => {
        const path = args[0];
        if (!path)
            return 'cat: missing operand';
        const resolved = resolvePath(path);
        const content = read(resolved);
        if (typeof content === 'string') {
            return content;
        }
        return `cat: '${resolved}': Is a directory or does not exist`;
    },
    touch: (args) => {
        const path = args[0];
        if (!path)
            return 'touch: missing operand';
        const resolved = resolvePath(path);
        const success = write(resolved, '');
        return success ? '' : `touch: cannot create file '${resolved}'`;
    },
    rm: (args, isSudo) => {
        const path = args[0];
        if (!path)
            return 'rm: missing operand';
        const resolved = resolvePath(path);
        if (resolved === '/' && !isSudo)
            return 'rm: cannot remove root directory without sudo';
        const success = remove(resolved);
        return success ? '' : `rm: cannot remove '${resolved}': No such file or directory`;
    },
    ps: () => {
        const processes = getProcessList();
        let output = 'PID\tNAME\n';
        processes.forEach(p => {
            output += `${p.pid}\t${p.name}\n`;
        });
        return output;
    },
    cd: (args) => {
        const targetPath = args[0] || '/home/user';
        const resolved = resolvePath(targetPath);
        const node = read(resolved);
        if (typeof node === 'object' && node !== null) {
            currentWorkingDirectory = resolved;
            return '';
        }
        return `cd: no such file or directory: ${resolved}`;
    },
    adt: (args) => __awaiter(void 0, void 0, void 0, function* () {
        if (args.length < 1) {
            shellPrint("Usage: adt <url>");
            return;
        }
        const url = args[0];
        shellPrint(`[adt] Resolving ${url}...`);
        try {
            const response = yield net.tryFetch(url); // Use the new resilient fetch
            const latency = yield net.ping(url); // ping uses tryFetch internally
            let output = `[adt] Successfully connected to ${url}\n`;
            output += `      Status: ${response.status} ${response.statusText}\n`;
            output += `      Latency: ${latency}ms`;
            shellPrint(output);
        }
        catch (e) {
            shellPrint(`[adt] Error: ${e.message}`);
        }
    }),
    mim: (args) => mim(args),
    sudo: (args) => __awaiter(void 0, void 0, void 0, function* () {
        if (args.length === 0) {
            shellPrint('sudo: missing command');
            return;
        }
        const [command, ...commandArgs] = args;
        isSudo = true;
        // shellPrint('[sudo] Running with elevated privileges...');
        yield executeCommand(command, commandArgs);
        isSudo = false; // Reset after command execution
    })
};
const lonx_api = {
    shell: {
        print: shellPrint,
        updateLine: shellUpdateLine,
        setInputMode: setInputMode,
        resolvePath: resolvePath,
    },
    fs: {
        read: read,
        write: write,
        remove: remove,
    },
    net: {
        tryFetch: net.tryFetch, // Expose the new function
        ping: net.ping,
    }
};
function renderShell() {
    // Don't render the prompt if not in shell mode
    if (inputMode !== 'shell')
        return;
    // Clear any existing cursor before adding a new one
    const cursorSpan = bootScreen.querySelector('.cursor');
    if (cursorSpan)
        cursorSpan.remove();
    const promptPath = currentWorkingDirectory.replace('/home/user', '~');
    bootScreen.innerHTML += `\n<span style="color: #50fa7b;">user@lonx</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${currentLine}<span class="cursor"> </span>`;
    bootScreen.scrollTop = bootScreen.scrollHeight;
}
function handleShellInput(e) {
    return __awaiter(this, void 0, void 0, function* () {
        if (inputMode === 'editor' && editorKeyHandler) {
            editorKeyHandler(e);
            return;
        }
        e.preventDefault();
        // Remove the last line (the prompt) to redraw it
        const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
        if (lastLineIndex !== -1) {
            bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex);
        }
        if (e.key === 'Enter') {
            const fullCommand = currentLine.trim();
            commandHistory.unshift(fullCommand);
            historyIndex = -1;
            const promptPath = currentWorkingDirectory.replace('/home/user', '~');
            const prompt = `\n<span style="color: #50fa7b;">user@lonx</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${fullCommand}`;
            bootScreen.innerHTML += prompt;
            const [command, ...args] = fullCommand.split(' ');
            currentLine = '';
            yield executeCommand(command, args);
            renderShell();
        }
        else if (e.key === 'Backspace') {
            currentLine = currentLine.slice(0, -1);
        }
        else if (e.key === 'ArrowUp') {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                currentLine = commandHistory[historyIndex];
            }
        }
        else if (e.key === 'ArrowDown') {
            if (historyIndex > 0) {
                historyIndex--;
                currentLine = commandHistory[historyIndex];
            }
            else {
                currentLine = '';
                historyIndex = -1;
            }
        }
        else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            navigator.clipboard.readText().then(text => {
                currentLine += text;
                renderShell();
            });
        }
        else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
            currentLine += e.key;
        }
        renderShell();
    });
}
export function initShell(element) {
    bootScreen = element;
    bootScreen.innerHTML = 'Welcome to Lonx Shell v1.0\n';
    renderShell();
    // Replace the global keydown listener with the shell's listener
    document.removeEventListener('keydown', window._tylonListener);
    document.addEventListener('keydown', handleShellInput);
    window._shellListener = handleShellInput; // Save for later
}
// Re-exporting startShell which is an alias for initShell
export { initShell as startShell };
