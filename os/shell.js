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
import { read, write } from './fs.js';
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
const builtInCommands = {
    help: () => 'Available Commands: echo, whoami, memstat, clear, reboot, ls, cat, touch, mim, ps, cd, adt',
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
    mim: (args) => mim(args)
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
            bootScreen.innerHTML += `\n> ${currentLine}`;
            const [command, ...args] = currentLine.trim().split(' ');
            if (command in builtInCommands) {
                const output = yield builtInCommands[command](args);
                if (output)
                    shellPrint(output);
            }
            else {
                // Try to execute as a /bin command
                const binPath = resolvePath(`/bin/${command}`);
                const binContent = read(binPath);
                if (typeof binContent === 'string' && binContent.length > 0) {
                    try {
                        const pkgModule = `data:text/javascript,${encodeURIComponent(binContent)}`;
                        const { default: main } = yield import(pkgModule);
                        main(args, lonx_api);
                    }
                    catch (err) {
                        shellPrint(`Error executing ${command}: ${err}`);
                        if (err.message.includes('module specifier')) {
                            shellPrint(`Hint: The package might be outdated or corrupted. Try running 'mim install ${command}' to fix it.`);
                        }
                    }
                }
                else if (currentLine.trim() !== '') {
                    shellPrint(`Command not found: ${command}`);
                }
            }
            commandHistory.unshift(currentLine);
            currentLine = '';
            historyIndex = -1;
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
export function startShell(screen) {
    bootScreen = screen;
    bootScreen.innerHTML = 'Welcome to Lonx Shell v1.0\n';
    renderShell();
    // Replace the global keydown listener with the shell's listener
    document.removeEventListener('keydown', window._tylonListener);
    document.addEventListener('keydown', handleShellInput);
    window._shellListener = handleShellInput; // Save for later
    // Add a paste event listener for standard browser pasting
    document.addEventListener('paste', (e) => {
        var _a;
        if (inputMode === 'shell') {
            e.preventDefault();
            const text = (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
            if (text) {
                currentLine += text;
                renderShell();
            }
        }
    });
}
