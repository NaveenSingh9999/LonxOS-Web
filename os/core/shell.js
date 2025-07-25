// os/shell.ts
import { read, write, remove } from './fs.js';
import { mim } from './mim.js';
import * as net from './core/net.js';
import { ptm } from './core/ptm.js';
import { memoryController } from './memory.js';
import { getConfig } from './core/config.js';
// --- Threading Test Command ---
async function thread_test(args, isSudo, inBackground, process) {
    if (!process) {
        return "thread_test: command must be run within a process.";
    }
    return new Promise((resolve, reject) => {
        let worker = null;
        const pid = process.pid;
        const onMessage = (data) => {
            if (data.status === 'completed') {
                resolve(`Thread finished with result: ${data.result}`);
                if (worker)
                    ptm.terminateThread(pid, worker);
            }
            else {
                process.stdout.push(`Thread message: ${JSON.stringify(data)}`);
            }
        };
        const onError = (error) => {
            reject(`Thread error: ${error.message}`);
            if (worker)
                ptm.terminateThread(pid, worker);
        };
        const threadId = ptm.spawnThread(pid, onMessage, onError);
        if (threadId === -1) {
            return reject("Failed to spawn thread.");
        }
        // The worker is stored in the process's threads array. Let's get it.
        const spawnedProcess = ptm.get(pid);
        if (!spawnedProcess)
            return reject("Process disappeared after thread spawn.");
        worker = spawnedProcess.threads[threadId];
        if (!worker) {
            return reject("Could not retrieve worker instance after spawning.");
        }
        // Send a command to the worker
        const payload = args.join(' ') || 'default payload';
        ptm.postMessageToThread(pid, threadId, { command: 'exec', payload });
        // The promise will be resolved/rejected by the onMessage/onError handlers.
    });
}
async function runCommand(args, isSudo, inBackground, process) {
    if (!process) {
        return "run: command must be run within a process.";
    }
    if (args.length === 0) {
        process.stderr.push("run: missing file operand");
        return;
    }
    const filePath = args[0];
    if (!filePath.endsWith('.rn')) {
        process.stderr.push(`run: cannot execute '${filePath}', not a .rn file.`);
        return;
    }
    const resolvedPath = resolvePath(filePath);
    const scriptContent = read(resolvedPath);
    if (typeof scriptContent !== 'string' || scriptContent.length === 0) {
        process.stderr.push(`run: cannot access '${resolvedPath}': No such file or directory`);
        return;
    }
    try {
        const blob = new Blob([scriptContent], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        try {
            const module = await import(url);
            if (typeof module.default === 'function') {
                const moduleArgs = args.slice(1);
                await module.default(moduleArgs, lonx_api, isSudo, process);
            }
            else {
                process.stderr.push(`Invalid executable format for ${filePath}: no default export function.`);
            }
        }
        finally {
            URL.revokeObjectURL(url);
        }
    }
    catch (e) {
        process.stderr.push(`Error executing ${filePath}: ${e.message}`);
    }
}
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
export function shellPrintDirect(text) {
    if (bootScreen) {
        bootScreen.innerHTML += text;
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
    get config() {
        return getConfig();
    },
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
    },
    ptm: {
        get: ptm.get.bind(ptm),
        list: ptm.list.bind(ptm),
        postMessage: ptm.postMessage.bind(ptm),
        onMessage: ptm.onMessage.bind(ptm),
        spawnThread: ptm.spawnThread.bind(ptm),
        terminateThread: ptm.terminateThread.bind(ptm),
        postMessageToThread: ptm.postMessageToThread.bind(ptm),
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
async function executeSingleCommand(command, args, isSudo = false, streams) {
    const fullCommand = `${command} ${args.join(' ')}`;
    const requiredMemory = 16;
    const process = ptm.create(command, requiredMemory, "user", 1, fullCommand);
    if (!process) {
        streams.stderr.push(`-lonx: ${command}: Not enough memory to execute command.`);
        return 1; // Error code
    }
    // Connect process streams
    process.stdin = streams.stdin;
    process.stdout = streams.stdout;
    process.stderr = streams.stderr;
    try {
        if (command in builtInCommands) {
            if (command === 'sudo') {
                // Sudo is handled at the pipeline level
                return 0;
            }
            const result = await builtInCommands[command](args, isSudo, false, process);
            if (result) {
                process.stdout.push(result);
            }
        }
        else if (command) {
            const binPath = `/bin/${command}.js`; // Look for .js files
            const scriptContent = read(binPath);
            if (typeof scriptContent === 'string' && scriptContent.length > 0) {
                try {
                    // Use dynamic import for module-based executables
                    const blob = new Blob([scriptContent], { type: "text/javascript" });
                    const url = URL.createObjectURL(blob);
                    try {
                        const module = await import(url);
                        if (typeof module.default === 'function') {
                            // Pass the process object as the fourth argument to main
                            await module.default(args, lonx_api, isSudo, process);
                        }
                        else {
                            process.stderr.push(`Invalid executable format for ${command}: no default export function.`);
                        }
                    }
                    finally {
                        URL.revokeObjectURL(url);
                    }
                }
                catch (e) {
                    process.stderr.push(`Error executing ${command}: ${e.message}`);
                }
            }
            else {
                process.stderr.push(`Command not found: ${command}`);
            }
        }
        return 0; // Success
    }
    catch (e) {
        process.stderr.push(`Error: ${e.message}`);
        return 1; // Error
    }
    finally {
        if (ptm.get(process.pid)) {
            ptm.kill(process.pid);
        }
    }
}
export async function executeCommand(fullCommand, inBackground = false) {
    const pipeline = parseCommand(fullCommand);
    let previousStdout = [];
    for (let i = 0; i < pipeline.length; i++) {
        const cmd = pipeline[i];
        if (!cmd.command)
            continue; // Skip empty commands
        const isLastCommand = i === pipeline.length - 1;
        const streams = {
            stdin: previousStdout,
            stdout: [],
            stderr: [],
        };
        // Handle redirection
        if (isLastCommand && cmd.redirect) {
            const resolvedPath = resolvePath(cmd.redirect.file);
            await executeSingleCommand(cmd.command, cmd.args, cmd.isSudo, streams);
            const output = streams.stdout.join('\n');
            if (!write(resolvedPath, output)) {
                shellPrint(`-lonx: cannot write to ${resolvedPath}`);
            }
        }
        else {
            await executeSingleCommand(cmd.command, cmd.args, cmd.isSudo, streams);
        }
        // If not the last command, pipe stdout to next stdin
        previousStdout = streams.stdout;
        // Print stderr to the main shell
        if (streams.stderr.length > 0) {
            shellPrint(streams.stderr.join('\n'));
        }
        // If it's the last command, print its stdout
        if (isLastCommand && !cmd.redirect) {
            shellPrint(streams.stdout.join('\n'));
        }
    }
}
// A more robust command parser
function parseCommand(input) {
    const commands = input.split('|').map(s => s.trim());
    const pipeline = [];
    for (const cmdStr of commands) {
        let isSudo = false;
        const matchedParts = cmdStr.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        // Convert RegExpMatchArray to a standard string array and remove quotes
        const commandParts = Array.from(matchedParts).map(part => part.replace(/^['"]|['"]$/g, ""));
        if (commandParts[0] === 'sudo') {
            isSudo = true;
            commandParts.shift();
        }
        const command = commandParts[0];
        const args = commandParts.slice(1);
        const redirectIndex = args.findIndex(arg => arg === '>');
        let redirect;
        if (redirectIndex !== -1) {
            redirect = { type: '>', file: args[redirectIndex + 1] };
            args.splice(redirectIndex, 2); // Remove redirection from args
        }
        if (command) {
            pipeline.push({ command, args, isSudo, redirect });
        }
    }
    return pipeline;
}
builtInCommands = {
    help: () => 'Available Commands: echo, whoami, memstat, clear, reboot, ls, cat, touch, rm, mim, ps, kill, jobs, bg, fg, sleep, spin, cd, pwd, adt, sudo, thread_test, run, update, update_check, update_install, update_config',
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
                if (key.endsWith('.rn')) {
                    return `<span style="color: #f975d4;">${key}</span>`; // Pink for executables
                }
                return key;
            }).join('\n');
        }
        return `ls: cannot access '${path}': Not a directory or does not exist`;
    },
    cat: (args, isSudo, inBackground, process) => {
        const path = args[0];
        if (!path && process && process.stdin.length > 0) {
            return process.stdin.join('\n');
        }
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
    run: runCommand,
    thread_test,
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
        const jidStr = args[0]?.replace('%', '');
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
    fg: async (args) => {
        const jidStr = args[0]?.replace('%', '');
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
    pwd: () => {
        return currentWorkingDirectory;
    },
    adt: async (args) => {
        if (args.length < 1) {
            shellPrint("Usage: adt <url>");
            return;
        }
        const url = args[0];
        shellPrint(`[adt] Resolving ${url}...`);
        try {
            const response = await net.tryFetch(url); // Use the new resilient fetch
            const latency = await net.ping(url); // ping uses tryFetch internally
            let output = `[adt] Successfully connected to ${url}\n`;
            output += `      Status: ${response.status} ${response.statusText}\n`;
            output += `      Latency: ${latency}ms`;
            shellPrint(output);
        }
        catch (e) {
            shellPrint(`[adt] Error: ${e.message}`);
        }
    },
    sleep: async (args) => {
        const seconds = parseInt(args[0], 10);
        if (isNaN(seconds)) {
            shellPrint('sleep: invalid time interval');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    },
    spin: async (args) => {
        const duration = parseInt(args[0] || '5', 10);
        const end = Date.now() + duration * 1000;
        shellPrint(`Spinning for ${duration}s... (This is a CPU-intensive task)`);
        const proc = ptm.list().find(p => p.command?.startsWith('spin'));
        while (Date.now() < end) {
            // Heavy computation loop
            for (let i = 0; i < 1000000; i++) {
                Math.sqrt(i);
            }
            if (proc)
                proc.cpu = Math.random() * 80 + 10; // Simulate high CPU
            // Yield to the event loop to keep the browser responsive
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (proc)
            proc.cpu = 0;
    },
    mim: (args, isSudo, inBackground, process) => mim(args),
    sudo: async (args, isSudo, inBackground) => {
        // This is now handled by the parser
    },
    // Update system commands
    update_check: async (args, isSudo, inBackground, process) => {
        try {
            const { updateManager } = await import('./core/updater.js');
            const { available } = await updateManager.checkForUpdates(false);
            if (available.length === 0) {
                return '✓ All packages are up to date';
            }
            else {
                let output = `📦 ${available.length} update(s) available:\n\n`;
                for (const pkg of available) {
                    output += `  ${pkg.name} → v${pkg.version} - ${pkg.desc}\n`;
                }
                output += '\nRun \'update_install\' to update all packages';
                return output;
            }
        }
        catch (error) {
            return `✗ Update check failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update_install: async (args, isSudo, inBackground, process) => {
        try {
            const { updateManager } = await import('./core/updater.js');
            if (args.length === 0) {
                // Install all updates
                shellPrint('Installing all available updates...');
                const updated = await updateManager.updateAllPackages();
                if (updated > 0) {
                    return `✓ Successfully updated ${updated} package(s)`;
                }
                else {
                    return 'No updates were installed';
                }
            }
            else {
                // Install specific package
                const packageName = args[0];
                shellPrint(`Installing update for ${packageName}...`);
                const success = await updateManager.updatePackage(packageName);
                if (success) {
                    return `✓ Successfully updated ${packageName}`;
                }
                else {
                    return `✗ Failed to update ${packageName}`;
                }
            }
        }
        catch (error) {
            return `✗ Installation failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update_config: async (args, isSudo, inBackground, process) => {
        try {
            const { updateManager } = await import('./core/updater.js');
            if (args.length === 0) {
                // Show current configuration
                const config = updateManager.getConfig();
                let output = 'Update Configuration:\n\n';
                output += `  enabled: ${config.enabled}\n`;
                output += `  checkOnBoot: ${config.checkOnBoot}\n`;
                output += `  autoUpdate: ${config.autoUpdate}\n`;
                output += `  checkInterval: ${config.checkInterval} hours\n`;
                output += `  lastCheck: ${config.lastCheck || 'never'}\n`;
                output += `  updateChannels: ${config.updateChannels.length} configured\n`;
                output += '\nTo change settings: update_config KEY=VALUE';
                return output;
            }
            else {
                // Set configuration
                const setting = args[0];
                const [key, value] = setting.split('=');
                if (!key || value === undefined) {
                    return 'Invalid format. Use: KEY=VALUE';
                }
                const newConfig = {};
                // Parse value based on key
                switch (key) {
                    case 'enabled':
                    case 'checkOnBoot':
                    case 'autoUpdate':
                        newConfig[key] = value.toLowerCase() === 'true';
                        break;
                    case 'checkInterval':
                        const interval = parseInt(value, 10);
                        if (isNaN(interval) || interval < 1) {
                            return 'checkInterval must be a positive number';
                        }
                        newConfig[key] = interval;
                        break;
                    default:
                        return `Unknown configuration key: ${key}`;
                }
                updateManager.updateConfig(newConfig);
                return `✓ Updated ${key} = ${newConfig[key]}`;
            }
        }
        catch (error) {
            return `✗ Configuration error: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update: async (args, isSudo, inBackground, process) => {
        const command = args[0];
        switch (command) {
            case 'check':
                return await builtInCommands.update_check(args.slice(1), isSudo, inBackground, process);
            case 'install':
                return await builtInCommands.update_install(args.slice(1), isSudo, inBackground, process);
            case 'config':
                return await builtInCommands.update_config(args.slice(1), isSudo, inBackground, process);
            case 'setup':
                try {
                    const { updateManager } = await import('./core/updater.js');
                    // Configure default settings
                    const defaultConfig = {
                        enabled: true,
                        checkOnBoot: true,
                        autoUpdate: false,
                        checkInterval: 24
                    };
                    updateManager.updateConfig(defaultConfig);
                    // Add default update channels
                    updateManager.addUpdateChannel('https://raw.githubusercontent.com/NaveenSingh9999/LonxOS-Web/refs/heads/main/repo/index.json');
                    let output = 'Update system configured successfully!\n\n';
                    output += 'Available commands:\n';
                    output += '  update check      - Check for updates\n';
                    output += '  update install    - Install all updates\n';
                    output += '  update config     - View/modify configuration\n\n';
                    output += 'The system will now check for updates on boot.\n';
                    output += 'To enable automatic updates: update config autoUpdate=true';
                    return output;
                }
                catch (error) {
                    return `✗ Setup failed: ${error instanceof Error ? error.message : String(error)}`;
                }
            default:
                return 'Usage: update [check|install|config|setup]';
        }
    }
};
export async function handleShellInput(e) {
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
        shellPrintDirect(prompt);
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
            currentLine = '';
            const promise = executeCommand(fullCommand, runInBackground);
            if (!runInBackground) {
                await promise;
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
