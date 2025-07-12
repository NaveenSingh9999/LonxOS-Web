// packages/man.js
export default function main(args, lonx) {
    const { shell } = lonx;

    const manuals = {
        'mim': `NAME
    mim - The Lonx package manager.

SYNOPSIS
    mim [command] [arguments]

COMMANDS
    install <package>   - Installs a package.
    remove <package>    - Removes a package.
    list                - Lists installed packages.
    sources             - Shows repository sources.
    addrepo <url>       - Adds a new repository.
    delrepo <url>       - Deletes a repository.`,
        'wget': `NAME
    wget - Simple web downloader.

SYNOPSIS
    wget [url] [output-file]`,
        'nano': `NAME
    nano - A simple text editor.

SYNOPSIS
    nano [file-path]

DESCRIPTION
    A basic implementation of a terminal-based text editor.
    - Ctrl+S: Save the file.
    - Ctrl+X: Exit the editor.`,
        'help': 'Shows a list of available commands.',
        'echo': 'Prints text to the screen.',
        'memstat': 'Displays memory statistics.',
        'whoami': 'Shows the current user.',
        'reboot': 'Reboots the system.',
        'clear': 'Clears the screen.',
        'ls': 'Lists files in a directory.',
        'cat': 'Displays file content.',
        'touch': 'Creates an empty file.',
        'ps': 'Displays a snapshot of the current processes.',
        'adt': `NAME
    adt - Advanced Diagnostic Tool

SYNOPSIS
    adt [url]

DESCRIPTION
    Pings a URL and displays connection status and latency.`
    };

    const command = args[0];
    if (manuals[command]) {
        shell.print(manuals[command]);
    } else {
        shell.print(`No manual entry for ${command}`);
    }
}
