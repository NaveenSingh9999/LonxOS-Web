// os/shell.ts
import { read, write, remove, list, exists, isDirectory, mkdir, getSettings, updateSettings, getDefaultApp, setDefaultApp } from './fs.js';
import { mim } from './mim.js';
import * as net from './core/net.js';
import { ptm, Process } from './core/ptm.js';
import { memoryController } from './memory.js';
import { getConfig } from './core/config.js';

// --- Threading Test Command ---
async function thread_test(args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null): Promise<string> {
    if (!process) {
        return "thread_test: command must be run within a process.";
    }

    return new Promise((resolve, reject) => {
        let worker: Worker | null = null;
        const pid = process.pid;

        const onMessage = (data: any) => {
            if (data.status === 'completed') {
                resolve(`Thread finished with result: ${data.result}`);
                if (worker) ptm.terminateThread(pid, worker);
            } else {
                process.stdout.push(`Thread message: ${JSON.stringify(data)}`);
            }
        };

        const onError = (error: any) => {
            reject(`Thread error: ${error.message}`);
            if (worker) ptm.terminateThread(pid, worker);
        };

        const threadId = ptm.spawnThread(pid, onMessage, onError);
        
        if (threadId === -1) {
            return reject("Failed to spawn thread.");
        }

        // The worker is stored in the process's threads array. Let's get it.
        const spawnedProcess = ptm.get(pid);
        if (!spawnedProcess) return reject("Process disappeared after thread spawn.");
        
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

async function runCommand(args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null): Promise<string | void> {
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
            } else {
                process.stderr.push(`Invalid executable format for ${filePath}: no default export function.`);
            }
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch (e: any) {
        process.stderr.push(`Error executing ${filePath}: ${e.message}`);
    }
}


let bootScreen: HTMLElement;
let currentLine = '';
const commandHistory: string[] = [];
let historyIndex = -1;
let inputMode: 'shell' | 'editor' = 'shell';
let editorKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let currentWorkingDirectory = '/home/user'; // Start in user's home directory
let shellConfig = {
    username: 'user',
    hostname: 'lonx'
};

// --- Stream and Piping Types ---
type Stream = string[];
interface ProcessStreams {
    stdin: Stream;
    stdout: Stream;
    stderr: Stream;
}

export function updateShellPrompt(username: string, hostname: string) {
    shellConfig.username = username;
    shellConfig.hostname = hostname;
    renderShell();
}

export function shellPrint(text: string) {
    if (bootScreen) {
        bootScreen.innerHTML += `\n${text}`;
        bootScreen.scrollTop = bootScreen.scrollHeight;
    }
}

export function shellPrintDirect(text: string) {
    if (bootScreen) {
        bootScreen.innerHTML += text;
        bootScreen.scrollTop = bootScreen.scrollHeight;
    }
}

export function shellUpdateLine(text: string) {
    if (bootScreen) {
        const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
        if (lastLineIndex !== -1) {
            bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex) + `\n${text}`;
        } else {
            bootScreen.innerHTML = text;
        }
        bootScreen.scrollTop = bootScreen.scrollHeight;
    }
}

export function setInputMode(mode: 'shell' | 'editor', handler?: (e: KeyboardEvent) => void) {
    inputMode = mode;
    if (mode === 'editor' && handler) {
        editorKeyHandler = handler;
    } else {
        editorKeyHandler = null;
        renderShell(); // Re-render the shell prompt when returning to shell mode
    }
}

function resolvePath(path: string): string {
    if (path.startsWith('/')) {
        return path; // Already absolute
    }
    // Resolve relative path
    const newPath = currentWorkingDirectory.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);

    for (const part of pathParts) {
        if (part === '..') {
            newPath.pop();
        } else if (part !== '.') {
            newPath.push(part);
        }
    }
    return '/' + newPath.join('/');
}

let isSudo = false; // Global flag for sudo access

// Forward declaration of builtInCommands
let builtInCommands: { [key: string]: (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => string | void | Promise<string | void> };

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
    if (inputMode !== 'shell') return;
    // Clear any existing cursor before adding a new one
    const cursorSpan = bootScreen.querySelector('.cursor');
    if (cursorSpan) cursorSpan.remove();

    const promptPath = currentWorkingDirectory.replace('/home/user', '~');
    bootScreen.innerHTML += `\n<span style="color: #50fa7b;">${shellConfig.username}@${shellConfig.hostname}</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${currentLine}<span class="cursor"> </span>`;
    bootScreen.scrollTop = bootScreen.scrollHeight;
}

async function executeSingleCommand(command: string, args: string[], isSudo = false, streams: ProcessStreams): Promise<number> {
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
        } else if (command) {
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
                        } else {
                            process.stderr.push(`Invalid executable format for ${command}: no default export function.`);
                        }
                    } finally {
                        URL.revokeObjectURL(url);
                    }
                } catch (e: any) {
                    process.stderr.push(`Error executing ${command}: ${e.message}`);
                }
            } else {
                process.stderr.push(`Command not found: ${command}`);
            }
        }
        return 0; // Success
    } catch (e: any) {
        process.stderr.push(`Error: ${e.message}`);
        return 1; // Error
    } finally {
        if (ptm.get(process.pid)) {
            ptm.kill(process.pid);
        }
    }
}

export async function executeCommand(fullCommand: string, inBackground = false) {
    const pipeline = parseCommand(fullCommand);
    let previousStdout: Stream = [];

    for (let i = 0; i < pipeline.length; i++) {
        const cmd = pipeline[i];
        if (!cmd.command) continue; // Skip empty commands
        const isLastCommand = i === pipeline.length - 1;

        const streams: ProcessStreams = {
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
        } else {
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
function parseCommand(input: string): { command: string; args: string[]; isSudo: boolean; redirect?: { type: string; file: string } }[] {
    const commands = input.split('|').map(s => s.trim());
    const pipeline: { command: string; args: string[]; isSudo: boolean; redirect?: { type: string; file: string } }[] = [];

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
    help: () => {
        return `Available Commands:

Core Commands:
  echo <text>               - Print text to console
  whoami                    - Show current user
  memstat                   - Display memory statistics
  clear                     - Clear the screen
  reboot                    - Restart the system
  
File Operations:
  ls [path]                 - List directory contents
  cat <file>                - Display file contents
  touch <file>              - Create empty file
  rm <file>                 - Remove file
  mkdir <path>              - Create directories
  cd <path>                 - Change directory
  pwd                       - Show current directory

File Associations:
  open <file>               - Opens file with default app
  xdg-open <file>           - Linux-compatible alias for open
  xdg-mime default <app> <ext> - Set default app for extension
  xdg-mime query default <ext> - Query default app for extension

System Management:
  settings get [key]        - Get system settings
  settings set <key> <value> - Set system settings
  settings list             - List all settings
  
GUI Commands:
  gui window [title] [url]  - Create new GUI window
  gui list                  - List all open windows
  gui close <id>            - Close window by ID
  gui focus <id>            - Focus window by ID
  gui minimize <id>         - Minimize window
  gui maximize <id>         - Maximize window
  gui alert <message>       - Show alert dialog
  gui text <title> <text>   - Create text window
  gui desktop               - Show desktop (minimize all)
  
GUI Applications:
  calculator                - Open calculator app
  notepad                   - Open text editor/notepad
  about                     - Show system information
  
Process Management:
  ps                        - List running processes
  kill <pid>                - Kill process by ID
  jobs                      - List background jobs
  bg <job>                  - Move job to background
  fg <job>                  - Move job to foreground
  
Network & Packages:
  mim <command>             - Package manager
  adt <url>                 - Test network connectivity
  
Advanced:
  run <script>              - Execute script files
  sudo <command>            - Run with elevated privileges
  thread_test               - Test threading capabilities
  sleep <seconds>           - Wait for specified time
  spin <seconds>            - CPU intensive test
  update                    - System update commands

Type 'help <command>' for detailed help on specific commands.`;
    },
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
    cat: (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        const path = args[0];
        if (!path && process && process.stdin.length > 0) {
            return process.stdin.join('\n');
        }
        if (!path) return 'cat: missing operand';
        const resolved = resolvePath(path);
        const content = read(resolved);
        if (typeof content === 'string') {
            return content;
        }
        return `cat: '${resolved}': Is a directory or does not exist`;
    },
    touch: (args) => {
        const path = args[0];
        if (!path) return 'touch: missing operand';
        const resolved = resolvePath(path);
        const success = write(resolved, '');
        return success ? '' : `touch: cannot create file '${resolved}'`;
    },
    rm: (args, isSudo) => {
        const path = args[0];
        if (!path) return 'rm: missing operand';
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
        
        const formatTime = (seconds: number) => {
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
        } else {
            return `kill: (${pid}) - Could not terminate process. It may not exist or you may lack permissions.`;
        }
    },
    jobs: () => {
        const processes = ptm.list().filter(p => 
            p.type === 'user' && 
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
        if (!jidStr) return 'bg: usage: bg %<job_id>';
        
        const jobs = ptm.list().filter(p => p.command);
        const jobIndex = parseInt(jidStr, 10) - 1;

        if (jobIndex >= 0 && jobIndex < jobs.length) {
            const process = jobs[jobIndex];
            if (process.status === 'sleeping') {
                ptm.resume(process.pid);
                shellPrint(`[${jobIndex + 1}] ${process.command} &`);
                return '';
            } else {
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
        } catch (e: any) {
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
            if (proc) proc.cpu = Math.random() * 80 + 10; // Simulate high CPU
            // Yield to the event loop to keep the browser responsive
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (proc) proc.cpu = 0;
    },
    mim: (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => mim(args),
    sudo: async (args, isSudo, inBackground) => {
        // This is now handled by the parser
    },
    // Update system commands
    update_check: async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        try {
            const { updateManager } = await import('./core/updater.js');
            const { available } = await updateManager.checkForUpdates(false);
            
            if (available.length === 0) {
                return '✓ All packages are up to date';
            } else {
                let output = `📦 ${available.length} update(s) available:\n\n`;
                for (const pkg of available) {
                    output += `  ${pkg.name} → v${pkg.version} - ${pkg.desc}\n`;
                }
                output += '\nRun \'update_install\' to update all packages';
                return output;
            }
        } catch (error) {
            return `✗ Update check failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update_install: async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        try {
            const { updateManager } = await import('./core/updater.js');
            
            if (args.length === 0) {
                // Install all updates
                shellPrint('Installing all available updates...');
                const updated = await updateManager.updateAllPackages();
                
                if (updated > 0) {
                    return `✓ Successfully updated ${updated} package(s)`;
                } else {
                    return 'No updates were installed';
                }
            } else {
                // Install specific package
                const packageName = args[0];
                shellPrint(`Installing update for ${packageName}...`);
                const success = await updateManager.updatePackage(packageName);
                
                if (success) {
                    return `✓ Successfully updated ${packageName}`;
                } else {
                    return `✗ Failed to update ${packageName}`;
                }
            }
        } catch (error) {
            return `✗ Installation failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update_config: async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
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
            } else {
                // Set configuration
                const setting = args[0];
                const [key, value] = setting.split('=');
                
                if (!key || value === undefined) {
                    return 'Invalid format. Use: KEY=VALUE';
                }
                
                const newConfig: any = {};
                
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
        } catch (error) {
            return `✗ Configuration error: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    update: async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
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
                } catch (error) {
                    return `✗ Setup failed: ${error instanceof Error ? error.message : String(error)}`;
                }
            default:
                return 'Usage: update [check|install|config|setup]';
        }
    },
    
    // New filesystem hierarchy commands
    mkdir: (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        const path = args[0];
        if (!path) return 'mkdir: missing operand';
        
        const resolved = resolvePath(path);
        if (exists(resolved)) {
            return `mkdir: cannot create directory '${resolved}': File exists`;
        }
        
        const success = mkdir(resolved);
        return success ? '' : `mkdir: cannot create directory '${resolved}'`;
    },
    
    // Default app system commands
    open: async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        const filePath = args[0];
        if (!filePath) return 'open: missing file operand';
        
        const resolved = resolvePath(filePath);
        if (!exists(resolved)) {
            return `open: cannot access '${resolved}': No such file or directory`;
        }
        
        if (isDirectory(resolved)) {
            return `open: '${resolved}': Is a directory`;
        }
        
        // Get file extension
        const extension = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
        const defaultApp = getDefaultApp(extension);
        
        if (!defaultApp) {
            return `open: no default application found for extension '${extension}'`;
        }
        
        // Execute the default app with the file as argument
        const command = `${defaultApp} ${resolved}`;
        shellPrint(`[open] Launching: ${command}`);
        
        try {
            await executeCommand(command, false);
            return '';
        } catch (error) {
            return `open: failed to launch '${defaultApp}': ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    
    'xdg-open': async (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        // Alias to open command for Linux compatibility
        return await builtInCommands.open(args, isSudo, inBackground, process);
    },
    
    'xdg-mime': (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        const action = args[0];
        const mimeType = args[1];
        const app = args[2];
        
        if (action === 'default') {
            if (!mimeType || !app) {
                return 'xdg-mime: Usage: xdg-mime default <app> <extension>';
            }
            
            // Convert mimetype to extension if needed
            let extension = mimeType;
            if (!extension.startsWith('.')) {
                // Simple mapping for common types
                const mimeToExt: { [key: string]: string } = {
                    'text/plain': '.txt',
                    'application/json': '.json',
                    'text/markdown': '.md',
                    'application/javascript': '.js'
                };
                extension = mimeToExt[mimeType] || `.${mimeType.split('/')[1]}`;
            }
            
            const success = setDefaultApp(extension, app);
            return success ? `Set default app for ${extension} to ${app}` : 'xdg-mime: failed to set default app';
        } else if (action === 'query') {
            if (!mimeType) {
                return 'xdg-mime: Usage: xdg-mime query default <extension>';
            }
            
            let extension = mimeType;
            if (!extension.startsWith('.')) {
                extension = `.${extension}`;
            }
            
            const app = getDefaultApp(extension);
            return app || `No default app set for ${extension}`;
        } else {
            return 'xdg-mime: Usage: xdg-mime {default|query} ...';
        }
    },
    
    // Settings management commands
    settings: (args: string[], isSudo: boolean, inBackground?: boolean, process?: Process | null) => {
        const action = args[0];
        const key = args[1];
        const value = args[2];
        
        if (action === 'get') {
            if (!key) {
                // Show all settings
                const settings = getSettings();
                return settings ? JSON.stringify(settings, null, 2) : 'No settings found';
            } else {
                // Get specific setting
                const settings = getSettings();
                if (!settings) return 'No settings found';
                
                const keys = key.split('.');
                let current = settings;
                for (const k of keys) {
                    if (current[k] === undefined) {
                        return `Setting '${key}' not found`;
                    }
                    current = current[k];
                }
                return typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current);
            }
        } else if (action === 'set') {
            if (!key || value === undefined) {
                return 'settings: Usage: settings set <key> <value>';
            }
            
            const settings = getSettings();
            if (!settings) return 'No settings found';
            
            const keys = key.split('.');
            let current = settings;
            
            // Navigate to the parent of the target key
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            
            // Set the value, try to parse as JSON first
            try {
                current[keys[keys.length - 1]] = JSON.parse(value);
            } catch {
                current[keys[keys.length - 1]] = value;
            }
            
            const success = updateSettings(settings);
            return success ? `Set ${key} = ${value}` : 'Failed to update settings';
        } else if (action === 'list') {
            const settings = getSettings();
            if (!settings) return 'No settings found';
            
            const listKeys = (obj: any, prefix = ''): string[] => {
                let result: string[] = [];
                for (const [k, v] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${k}` : k;
                    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                        result.push(`${fullKey}/`);
                        result = result.concat(listKeys(v, fullKey));
                    } else {
                        result.push(`${fullKey} = ${JSON.stringify(v)}`);
                    }
                }
                return result;
            };
            
            return listKeys(settings).join('\n');
        } else {
            return 'settings: Usage: settings {get|set|list} [key] [value]';
        }
    },
    
    // GUI Window Manager commands
    gui: (args: string[]) => {
        const action = args[0];
        
        if (!(window as any).lonx?.gui) {
            return 'GUI: Window Manager not available';
        }
        
        switch (action) {
            case 'window':
            case 'create':
                const title = args[1] || 'New Window';
                const url = args[2] || 'about:blank';
                const windowId = (window as any).lonx.gui.createWindow({
                    title,
                    url,
                    width: 800,
                    height: 600
                });
                return `Created window: ${windowId}`;
                
            case 'list':
                const windows = (window as any).lonx.gui.getWindowList();
                if (windows.length === 0) {
                    return 'No windows open';
                }
                return windows.map((w: any) => 
                    `${w.id}: ${w.title} ${w.isMinimized ? '(minimized)' : ''} ${w.isMaximized ? '(maximized)' : ''}`
                ).join('\n');
                
            case 'close':
                const closeId = args[1];
                if (!closeId) return 'Usage: gui close <window-id>';
                (window as any).lonx.gui.closeWindow(closeId);
                return `Closed window: ${closeId}`;
                
            case 'focus':
                const focusId = args[1];
                if (!focusId) return 'Usage: gui focus <window-id>';
                (window as any).lonx.gui.focusWindow(focusId);
                return `Focused window: ${focusId}`;
                
            case 'minimize':
                const minId = args[1];
                if (!minId) return 'Usage: gui minimize <window-id>';
                (window as any).lonx.gui.minimizeWindow(minId);
                return `Minimized window: ${minId}`;
                
            case 'maximize':
                const maxId = args[1];
                if (!maxId) return 'Usage: gui maximize <window-id>';
                (window as any).lonx.gui.maximizeWindow(maxId);
                return `Maximized window: ${maxId}`;
                
            case 'alert':
                const message = args.slice(1).join(' ') || 'Hello World!';
                (window as any).lonx.gui.alert(message);
                return 'Alert window created';
                
            case 'text':
                const textTitle = args[1] || 'Text Window';
                const textContent = args.slice(2).join(' ') || 'Hello from LonxOS!';
                const textId = (window as any).lonx.gui.createTextWindow(textTitle, textContent);
                return `Created text window: ${textId}`;
                
            case 'desktop':
                (window as any).lonx.gui.showDesktop();
                return 'Minimized all windows';
                
            default:
                return `GUI Commands:
  gui window [title] [url]  - Create new window
  gui list                  - List all windows
  gui close <id>           - Close window
  gui focus <id>           - Focus window
  gui minimize <id>        - Minimize window
  gui maximize <id>        - Maximize window
  gui alert <message>      - Show alert dialog
  gui text <title> <text>  - Create text window
  gui desktop              - Show desktop (minimize all)`;
        }
    },
    
    // Quick window launcher commands
    calculator: () => {
        if (!(window as any).lonx?.gui) {
            return 'GUI: Window Manager not available';
        }
        
        const calcId = (window as any).lonx.gui.createWindow({
            title: '🧮 Calculator',
            icon: '🧮',
            content: `
                <div style="padding: 20px; text-align: center; background: #f0f0f0;">
                    <div style="background: #000; color: #0f0; padding: 10px; margin-bottom: 20px; font-family: monospace; font-size: 24px; border-radius: 4px;" id="calc-display">0</div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 300px; margin: 0 auto;">
                        <button onclick="clearCalc()" style="grid-column: span 2; padding: 15px; font-size: 18px; border: none; background: #ff6b6b; color: white; border-radius: 4px; cursor: pointer;">Clear</button>
                        <button onclick="appendToCalc('/')" style="padding: 15px; font-size: 18px; border: none; background: #4ecdc4; color: white; border-radius: 4px; cursor: pointer;">÷</button>
                        <button onclick="appendToCalc('*')" style="padding: 15px; font-size: 18px; border: none; background: #4ecdc4; color: white; border-radius: 4px; cursor: pointer;">×</button>
                        
                        <button onclick="appendToCalc('7')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">7</button>
                        <button onclick="appendToCalc('8')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">8</button>
                        <button onclick="appendToCalc('9')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">9</button>
                        <button onclick="appendToCalc('-')" style="padding: 15px; font-size: 18px; border: none; background: #4ecdc4; color: white; border-radius: 4px; cursor: pointer;">−</button>
                        
                        <button onclick="appendToCalc('4')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">4</button>
                        <button onclick="appendToCalc('5')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">5</button>
                        <button onclick="appendToCalc('6')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">6</button>
                        <button onclick="appendToCalc('+')" style="padding: 15px; font-size: 18px; border: none; background: #4ecdc4; color: white; border-radius: 4px; cursor: pointer;">+</button>
                        
                        <button onclick="appendToCalc('1')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">1</button>
                        <button onclick="appendToCalc('2')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">2</button>
                        <button onclick="appendToCalc('3')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">3</button>
                        <button onclick="calculate()" style="grid-row: span 2; padding: 15px; font-size: 18px; border: none; background: #007AFF; color: white; border-radius: 4px; cursor: pointer;">=</button>
                        
                        <button onclick="appendToCalc('0')" style="grid-column: span 2; padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">0</button>
                        <button onclick="appendToCalc('.')" style="padding: 15px; font-size: 18px; border: none; background: #666; color: white; border-radius: 4px; cursor: pointer;">.</button>
                    </div>
                </div>
                <script>
                    let calcValue = '0';
                    
                    function updateDisplay() {
                        document.getElementById('calc-display').textContent = calcValue;
                    }
                    
                    function clearCalc() {
                        calcValue = '0';
                        updateDisplay();
                    }
                    
                    function appendToCalc(val) {
                        if (calcValue === '0' && val !== '.') {
                            calcValue = val;
                        } else {
                            calcValue += val;
                        }
                        updateDisplay();
                    }
                    
                    function calculate() {
                        try {
                            calcValue = eval(calcValue).toString();
                            updateDisplay();
                        } catch (e) {
                            calcValue = 'Error';
                            updateDisplay();
                            setTimeout(() => {
                                calcValue = '0';
                                updateDisplay();
                            }, 1000);
                        }
                    }
                </script>
            `,
            width: 350,
            height: 480,
            resizable: false
        });
        
        return `Calculator opened: ${calcId}`;
    },
    
    notepad: () => {
        if (!(window as any).lonx?.gui) {
            return 'GUI: Window Manager not available';
        }
        
        const notepadId = (window as any).lonx.gui.createWindow({
            title: '📝 Notepad',
            icon: '📝',
            content: `
                <div style="display: flex; flex-direction: column; height: 100%; background: #fff;">
                    <div style="background: #f0f0f0; padding: 10px; border-bottom: 1px solid #ddd;">
                        <button onclick="newFile()" style="margin-right: 10px; padding: 5px 10px; border: 1px solid #ccc; background: #fff; cursor: pointer;">New</button>
                        <button onclick="saveFile()" style="margin-right: 10px; padding: 5px 10px; border: 1px solid #ccc; background: #fff; cursor: pointer;">Save</button>
                        <button onclick="clearText()" style="padding: 5px 10px; border: 1px solid #ccc; background: #fff; cursor: pointer;">Clear</button>
                    </div>
                    <textarea id="notepad-text" 
                              style="flex: 1; border: none; padding: 20px; font-family: 'Courier New', monospace; font-size: 14px; resize: none; outline: none;"
                              placeholder="Start typing your notes here..."></textarea>
                </div>
                <script>
                    function newFile() {
                        document.getElementById('notepad-text').value = '';
                    }
                    
                    function saveFile() {
                        const text = document.getElementById('notepad-text').value;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'note.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    
                    function clearText() {
                        if (confirm('Clear all text?')) {
                            document.getElementById('notepad-text').value = '';
                        }
                    }
                </script>
            `,
            width: 600,
            height: 500
        });
        
        return `Notepad opened: ${notepadId}`;
    },
    
    about: () => {
        if (!(window as any).lonx?.gui) {
            return 'GUI: Window Manager not available';
        }
        
        const aboutId = (window as any).lonx.gui.createWindow({
            title: 'About LonxOS',
            icon: '🐧',
            content: `
                <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h1 style="margin: 0 0 20px 0; font-size: 48px;">🐧 LonxOS</h1>
                    <h2 style="margin: 0 0 30px 0; font-weight: 300; opacity: 0.9;">Web-Based Operating System</h2>
                    
                    <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 30px; margin: 20px 0; text-align: left;">
                        <h3 style="margin-top: 0; color: #ffeb3b;">✨ Features</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin: 10px 0;">🪟 True Floating Window Manager</li>
                            <li style="margin: 10px 0;">📁 Linux-like Filesystem Hierarchy</li>
                            <li style="margin: 10px 0;">⚡ Real-time Process Management</li>
                            <li style="margin: 10px 0;">📦 Package Manager (MIM)</li>
                            <li style="margin: 10px 0;">🔧 Advanced Configuration System</li>
                            <li style="margin: 10px 0;">💾 Persistent Storage</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; opacity: 0.8;">
                            <strong>Version:</strong> 1.0.0<br>
                            <strong>Kernel:</strong> LonxOS Kernel v1.0<br>
                            <strong>Window Manager:</strong> LWM v1.0<br>
                            <strong>Build:</strong> ${new Date().toISOString().split('T')[0]}
                        </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; font-size: 12px; opacity: 0.7;">
                        Built with ❤️ by the LonxOS Team
                    </p>
                </div>
            `,
            width: 500,
            height: 600,
            resizable: false
        });
        
        return `About window opened: ${aboutId}`;
    }
};


export async function handleShellInput(e: KeyboardEvent) {
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
        } else {
            currentLine = '';
        }

        // Render the new, empty prompt
        renderShell();

    } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
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
    } else {
        // For any other key, just update the input line
        const lastLineIndex = bootScreen.innerHTML.lastIndexOf('\n');
        if (lastLineIndex !== -1) {
            bootScreen.innerHTML = bootScreen.innerHTML.substring(0, lastLineIndex);
        }

        if (e.key === 'Backspace') {
            currentLine = currentLine.slice(0, -1);
        } else if (e.key === 'ArrowUp') {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                currentLine = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            if (historyIndex > 0) {
                historyIndex--;
                currentLine = commandHistory[historyIndex];
            } else {
                currentLine = '';
                historyIndex = -1;
            }
        } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            navigator.clipboard.readText().then(text => {
                currentLine += text;
                renderShell(); // Re-render after paste
            });
            return; // Return early as paste is async
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
            currentLine += e.key;
        }
        
        renderShell();
    }
}

export function initShell(element: HTMLElement) {
    bootScreen = element;
    bootScreen.innerHTML = 'Welcome to Lonx Shell v1.0\n';
    renderShell();
    // Replace the global keydown listener with the shell's listener
    document.removeEventListener('keydown', (window as any)._tylonListener);
    document.addEventListener('keydown', handleShellInput);
    (window as any)._shellListener = handleShellInput; // Save for later
}

// Re-exporting startShell which is an alias for initShell
export { initShell as startShell };
