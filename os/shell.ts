// os/shell.ts
import { getMemoryStats } from './memory.js';
import { getProcessList } from './process.js';
import { read, write } from './fs.js';
import { mim } from './mim.js';

let bootScreen: HTMLElement;
let currentLine = '';
const commandHistory: string[] = [];
let historyIndex = -1;
let inputMode: 'shell' | 'editor' = 'shell';
let editorKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let currentWorkingDirectory = '/home/user'; // Start in user's home directory

export function shellPrint(text: string) {
    if (bootScreen) {
        bootScreen.innerHTML += `\n${text}`;
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

const builtInCommands: { [key: string]: (args: string[]) => string | Promise<void> } = {
    help: () => 'Available Commands: echo, whoami, memstat, clear, reboot, ls, cat, touch, mim, ps, cd',
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
    }
};

function renderShell() {
    // Don't render the prompt if not in shell mode
    if (inputMode !== 'shell') return;
    // Clear any existing cursor before adding a new one
    const cursorSpan = bootScreen.querySelector('.cursor');
    if (cursorSpan) cursorSpan.remove();

    const promptPath = currentWorkingDirectory.replace('/home/user', '~');
    bootScreen.innerHTML += `\n<span style="color: #50fa7b;">user@lonx</span>:<span style="color: #87CEFA;">${promptPath}</span>$ ${currentLine}<span class="cursor"> </span>`;
    bootScreen.scrollTop = bootScreen.scrollHeight;
}

async function handleShellInput(e: KeyboardEvent) {
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
            const output = await builtInCommands[command](args);
            if (output) shellPrint(output as string);
        } else {
            // Try to execute as a /bin command
            const binPath = resolvePath(`/bin/${command}`);
            const binContent = read(binPath);
            if (typeof binContent === 'string' && binContent.length > 0) {
                try {
                    const pkgModule = `data:text/javascript,${encodeURIComponent(binContent)}`;
                    const { default: main } = await import(pkgModule);
                    main(args, lonx_api);
                } catch (err) {
                    shellPrint(`Error executing ${command}: ${err}`);
                    if ((err as Error).message.includes('module specifier')) {
                        shellPrint(`Hint: The package might be outdated or corrupted. Try running 'mim install ${command}' to fix it.`);
                    }
                }
            } else if (currentLine.trim() !== '') {
                shellPrint(`Command not found: ${command}`);
            }
        }
        commandHistory.unshift(currentLine);
        currentLine = '';
        historyIndex = -1;
    } else if (e.key === 'Backspace') {
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
            renderShell();
        });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        currentLine += e.key;
    }
    renderShell();
}

export function startShell(screen: HTMLElement) {
    bootScreen = screen;
    bootScreen.innerHTML = 'Welcome to Lonx Shell v1.0\n';
    renderShell();
    // Replace the global keydown listener with the shell's listener
    document.removeEventListener('keydown', (window as any)._tylonListener);
    document.addEventListener('keydown', handleShellInput);
    (window as any)._shellListener = handleShellInput; // Save for later

    // Add a paste event listener for standard browser pasting
    document.addEventListener('paste', (e: ClipboardEvent) => {
        if (inputMode === 'shell') {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                currentLine += text;
                renderShell();
            }
        }
    });
}
