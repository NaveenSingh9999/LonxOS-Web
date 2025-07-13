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
import { read, write, remove } from './fs.js';
import { mim } from './mim.js';
import * as net from './core/net.js';
import { ptm } from './core/ptm.js';
import { memoryController } from './memory.js';
let bootScreen;
let currentLine = '';
const commandHistory = [];
let historyIndex = -1;
let inputMode = 'shell';
let editorKeyHandler = null;
let currentWorkingDirectory = '/home/user'; // Start in user's home directory
let shellConfig = {
    username: 'user',
    hostname: 'lonx'
};
export function updateShellPrompt(username, hostname) {
    shellConfig.username = username;
    shellConfig.hostname = hostname;
    renderShell();
}
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
// Forward declaration of builtInCommands
let builtInCommands;
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
        tryFetch: net.tryFetch,
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
    bootScreen.innerHTML += `\n<span style="color: #50fa7b;">${shellConfig.username}@${shellConfig.hostname}</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${currentLine}<span class="cursor"> </span>`;
    bootScreen.scrollTop = bootScreen.scrollHeight;
}
export function executeCommand(command_1, args_1) {
    return __awaiter(this, arguments, void 0, function* (command, args, isSudo = false, inBackground = false) {
        const fullCommand = `${command} ${args.join(' ')}`;
        // Default memory for a command process. Could be adjusted based on the command.
        const requiredMemory = 16;
        const process = ptm.create(command, requiredMemory, "user", 1, fullCommand);
        if (!process) {
            shellPrint(`-lonx: ${command}: Not enough memory to execute command.`);
            return;
        }
        try {
            if (command in builtInCommands) {
                // The 'sudo' command is special; it elevates privileges for the *next* command.
                if (command === 'sudo') {
                    yield builtInCommands[command](args, false, inBackground); // isSudo is false, pass inBackground
                    // The sudo command process is finished after it executes the child command.
                    if (ptm.get(process.pid))
                        ptm.kill(process.pid);
                    return;
                }
                const result = yield builtInCommands[command](args, isSudo, inBackground);
                if (result) {
                    shellPrint(result);
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
                        if (e.message.includes("export")) {
                            shellPrint(`Error executing ${command}: This module may be in an old format. Try updating it with 'mim install ${command}'.`);
                        }
                        else {
                            shellPrint(`Error executing ${command}: ${e.message}`);
                        }
                    }
                }
                else {
                    shellPrint(`Command not found: ${command}`);
                }
            }
        }
        catch (e) {
            shellPrint(`Error: ${e.message}`);
        }
        finally {
            // Clean up the process unless it was started in the background
            if (ptm.get(process.pid)) {
                if (inBackground) {
                    shellPrint(`[1] ${process.pid}`); // Basic job notification
                }
                else {
                    ptm.kill(process.pid);
                }
            }
        }
    });
}
builtInCommands = {
    help: () => 'Available Commands: echo, whoami, memstat, clear, reboot, ls, cat, touch, rm, mim, ps, kill, jobs, bg, fg, sleep, spin, cd, pwd, adt, sudo',
    echo: (args) => args.join(' '),
    memstat: () => {
        const stats = memoryController;
        const processes = ptm.list();
        let output = `Total RAM: ${stats.getTotal()}MB\nUsed RAM: ${stats.getUsed().toFixed(2)}MB\n\n`;
        output += 'PID\tMEM\tNAME\n';
        processes.forEach(p => {
            output += `${p.pid}\t${p.memory}MB\t${p.name}\n`;
        });
        return output;
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
        // Allow removing root only with sudo
        if (resolved === '/' && !isSudo) {
            return 'rm: cannot remove root directory without sudo';
        }
        if (read(resolved) === null) {
            return `rm: cannot remove '${resolved}': No such file or directory`;
        }
        const success = remove(resolved);
        return success ? '' : `rm: cannot remove '${resolved}'`;
    },
    ps: (args) => {
        const processes = ptm.list();
        let output = 'PID\tPPID\tSTATUS\t\tMEM\tCPU\tTIME\tCOMMAND\n';
        const formatTime = (seconds) => {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        };
        processes.forEach(p => {
            const command = p.command ? p.command.substring(0, 20) : p.name;
            const cpu = (p.cpu || 0).toFixed(2);
            const time = formatTime(p.cpuTime);
            output += `${p.pid}\t${p.ppid}\t${p.status.padEnd(10, ' ')}\t${p.memory}MB\t${cpu}%\t${time}\t${command}\n`;
        });
        return output;
    },
    kill: (args, isSudo) => {
        const pidStr = args[0];
        if (!pidStr) {
            return 'kill: usage: kill <pid>';
        }
        const pid = parseInt(pidStr, 10);
        if (isNaN(pid)) {
            return 'kill: usage: kill <pid>';
        }
        const process = ptm.get(pid);
        if (!process) {
            return `kill: (${pid}) - No such process`;
        }
        if (process.type === 'system' && !isSudo) {
            return `kill: (${pid}) - Operation not permitted`;
        }
        if (ptm.kill(pid)) {
            return `Process ${pid} terminated.`;
        }
        else {
            return `kill: (${pid}) - Could not terminate process. It may not exist or you may lack permissions.`;
        }
    },
    jobs: () => {
        const processes = ptm.list().filter(p => p.type === 'user' &&
            p.status !== 'terminated' &&
            p.command // Filter for processes that are actual commands
        );
        if (processes.length === 0) {
            return '';
        }
        let output = 'JID\tPID\tSTATUS\t\tCOMMAND\n';
        processes.forEach((p, index) => {
            output += `[${index + 1}]\t${p.pid}\t${p.status.padEnd(10, ' ')}\t${p.command}\n`;
        });
        return output;
    },
    bg: (args) => {
        var _a;
        const jidStr = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.replace('%', '');
        if (!jidStr)
            return 'bg: usage: bg %<job_id>';
        const jobs = ptm.list().filter(p => p.command);
        const jobIndex = parseInt(jidStr, 10) - 1;
        if (jobIndex >= 0 && jobIndex < jobs.length) {
            const process = jobs[jobIndex];
            if (process.status === 'sleeping') {
                ptm.resume(process.pid);
                shellPrint(`[${jobIndex + 1}] ${process.command} &`);
                return '';
            }
            else {
                return `bg: job ${jobIndex + 1} is not stopped.`;
            }
        }
        return `bg: job not found: %${jidStr}`;
    },
    fg: (args) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const jidStr = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.replace('%', '');
        if (!jidStr) {
            shellPrint('fg: usage: fg %<job_id>');
            return;
        }
        const jobs = ptm.list().filter(p => p.command);
        const jobIndex = parseInt(jidStr, 10) - 1;
        if (jobIndex >= 0 && jobIndex < jobs.length) {
            const process = jobs[jobIndex];
            shellPrint(process.command || '');
            ptm.resume(process.pid);
            // This is a major simplification. In a real shell, we'd need a way
            // to block the shell input until the foreground process is done.
            // For now, we just bring it to "running" state and the user can interact again.
            // A true implementation would require significant re-architecture.
            shellPrint(`(Process ${process.pid} is now in the foreground, but shell remains interactive in this simulation)`);
            return;
        }
        shellPrint(`fg: job not found: %${jidStr}`);
    }),
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
    pwd: () => {
        return currentWorkingDirectory;
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
    sleep: (args) => __awaiter(void 0, void 0, void 0, function* () {
        const seconds = parseInt(args[0], 10);
        if (isNaN(seconds)) {
            shellPrint('sleep: invalid time interval');
            return;
        }
        yield new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }),
    spin: (args) => __awaiter(void 0, void 0, void 0, function* () {
        const duration = parseInt(args[0] || '5', 10);
        const end = Date.now() + duration * 1000;
        shellPrint(`Spinning for ${duration}s... (This is a CPU-intensive task)`);
        const proc = ptm.list().find(p => { var _a; return (_a = p.command) === null || _a === void 0 ? void 0 : _a.startsWith('spin'); });
        while (Date.now() < end) {
            // Heavy computation loop
            for (let i = 0; i < 1000000; i++) {
                Math.sqrt(i);
            }
            if (proc)
                proc.cpu = Math.random() * 80 + 10; // Simulate high CPU
            // Yield to the event loop to keep the browser responsive
            yield new Promise(resolve => setTimeout(resolve, 0));
        }
        if (proc)
            proc.cpu = 0;
    }),
    mim: (args) => mim(args),
    sudo: (args, isSudo, inBackground) => __awaiter(void 0, void 0, void 0, function* () {
        if (args.length === 0) {
            shellPrint('sudo: missing command');
            return;
        }
        const [command, ...commandArgs] = args;
        // isSudo is false here. We are calling the next command with isSudo = true.
        yield executeCommand(command, commandArgs, true, inBackground);
    })
};
export function handleShellInput(e) {
    return __awaiter(this, void 0, void 0, function* () {
        if (inputMode === 'editor' && editorKeyHandler) {
            editorKeyHandler(e);
            return;
        }
        e.preventDefault();
        if (e.key === 'Enter') {
            // Finalize the current line with the command
            const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
            if (lastLineIndex !== -1) {
                bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex);
            }
            const promptPath = currentWorkingDirectory.replace('/home/user', '~');
            const prompt = `\n<span style="color: #50fa7b;">${shellConfig.username}@${shellConfig.hostname}</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${currentLine}`;
            bootScreen.innerHTML += prompt;
            // Execute the command
            let fullCommand = currentLine.trim();
            let runInBackground = false;
            if (fullCommand.endsWith('&')) {
                runInBackground = true;
                fullCommand = fullCommand.slice(0, -1).trim();
            }
            if (fullCommand) {
                commandHistory.unshift(fullCommand);
                historyIndex = -1;
                const [command, ...args] = fullCommand.split(' ');
                currentLine = '';
                if (command) {
                    // If it's not a background command, we await it.
                    // Otherwise, we let it run without blocking the shell.
                    const promise = executeCommand(command, args, false, runInBackground);
                    if (!runInBackground) {
                        yield promise;
                    }
                }
            }
            else {
                currentLine = '';
            }
            // Render the new, empty prompt
            renderShell();
        }
        else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            // Ctrl+Z to suspend the "foreground" process
            // In our simulation, the "foreground" process is the last one started that is still running.
            const runningProcs = ptm.list().filter(p => p.status === 'running' && p.type === 'user' && p.command);
            if (runningProcs.length > 0) {
                const lastProc = runningProcs[runningProcs.length - 1];
                if (lastProc.name !== 'sudo') { // Don't suspend sudo itself
                    ptm.suspend(lastProc.pid);
                    shellPrint(`\n[+] Stopped   ${lastProc.command}`);
                    renderShell();
                }
            }
        }
        else {
            // For any other key, just update the input line
            const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
            if (lastLineIndex !== -1) {
                bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex);
            }
            if (e.key === 'Backspace') {
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
                    renderShell(); // Re-render after paste
                });
                return; // Return early as paste is async
            }
            else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                currentLine += e.key;
            }
            renderShell();
        }
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
