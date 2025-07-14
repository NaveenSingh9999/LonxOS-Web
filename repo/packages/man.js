// repo/packages/man.js - Manual pages for Lonx OS commands

/**
 * Man - Manual page viewer for Lonx OS
 * Provides comprehensive documentation for all system commands
 */

async function main(args, lonx) {
    const { shell } = lonx;

    const manuals = {
        'nano': `NAME
    nano - text editor for Lonx OS

SYNOPSIS
    nano [options] <file>

DESCRIPTION
    GNU nano is a small and friendly text editor. Besides basic text editing,
    nano offers many extra features, such as an interactive search-and-replace,
    undo/redo, syntax highlighting, line numbering, and more.

OPTIONS
    -h, --help      Show help information
    <file>          File to edit

KEYBOARD SHORTCUTS
    Ctrl+S          Save the current file
    Ctrl+X          Close the current file buffer / Exit nano
    Ctrl+Z          Undo the last operation
    Ctrl+Y          Redo the last undone operation
    Ctrl+A          Select all text
    Ctrl+K          Cut the current line
    Ctrl+C          Copy selected text
    Ctrl+V          Paste text from clipboard

FEATURES
    • Line numbers display
    • Status bar with file information
    • Undo/redo support (up to 50 operations)
    • Automatic detection of file changes
    • Full-screen editing interface
    • Syntax highlighting hints

EXAMPLES
    nano myfile.txt         Edit or create myfile.txt
    nano /etc/config.json   Edit system configuration
    nano --help             Show help information

AUTHOR
    Adapted for Lonx OS from GNU nano`,

        'wget': `NAME
    wget - file downloader for Lonx OS

SYNOPSIS
    wget [OPTION]... [URL]

DESCRIPTION
    GNU Wget is a free utility for non-interactive download of files from the Web.
    It supports HTTP and HTTPS protocols and can handle various file types including
    text files, images, documents, and binary data.

OPTIONS
    -O, --output-document=FILE   Save document to FILE instead of default name
    -U, --user-agent=AGENT       Identify as AGENT instead of Wget/VERSION
    -T, --timeout=SECONDS        Set read timeout to SECONDS (default: 30)
    -v, --verbose                Be verbose (print detailed information)
    -q, --quiet                  Quiet operation (no output except errors)
    -h, --help                   Display help information
    -V, --version                Display version information

FEATURES
    • Progress bar with download statistics
    • Support for text and binary files
    • Automatic filename detection from headers
    • Content-Type detection and handling
    • Comprehensive error reporting
    • File size formatting (B, KB, MB, GB)

EXAMPLES
    wget https://example.com/file.txt
        Download file.txt from example.com

    wget -O myfile.json https://api.example.com/data
        Download data and save as myfile.json

    wget --timeout=60 https://slow-server.com/large-file.zip
        Download with 60-second timeout

    wget --verbose https://example.com/document.pdf
        Download with detailed progress information

SUPPORTED PROTOCOLS
    HTTP, HTTPS

FILE HANDLING
    Text files are saved as-is. Binary files are encoded as base64 data URLs
    for storage in the virtual filesystem.

AUTHOR
    Adapted for Lonx OS from GNU Wget`,

        'mim': `NAME
    mim - The Lonx OS package manager

SYNOPSIS
    mim [command] [arguments]

DESCRIPTION
    mim (Maybe It's Magic) is the package manager for Lonx OS. It allows you to
    install, remove, and manage software packages from local and remote repositories.
    MIM features dynamic runtime repository indexing for instant access to new packages.

COMMANDS
    install <package>       Install a package from repositories
    remove <package>        Remove an installed package
    list                    List all installed packages
    search <term>           Search for packages by name or description
    sources                 Show configured repository sources and their status
    addrepo <url>           Add and immediately index a new package repository
    delrepo <url>           Remove a package repository and its cache
    refresh                 Refresh all repository indexes
    repo-info [url]         Show detailed repository information
    verify                  Verify repository connectivity and validity
    help                    Show this help message

EXAMPLES
    mim install wget        Install the wget package
    mim remove nano         Remove the nano package
    mim list                Show all installed packages
    mim search editor       Search for editor packages
    mim addrepo https://example.com/repo/index.json
                           Add and index a custom repository
    mim sources             Show all configured repositories with status
    mim refresh             Update all repository caches
    mim verify              Check if all repositories are accessible

REPOSITORY FORMAT
    Repositories are JSON files containing package metadata:
    [
      {
        "name": "package-name",
        "description": "Package description",
        "version": "1.0.0",
        "url": "packages/package.js"
      }
    ]

FILES
    /etc/mim/sources.list           Repository configuration
    /etc/mim/cache/                 Repository index cache
    /var/lib/mim/installed/         Installed package metadata
    /bin/                           Installed package location

NOTES
    - Repositories are fetched and cached immediately when added with 'addrepo'
    - Package installation searches all cached repositories for instant results
    - Use 'refresh' to update repository caches manually
    - Repository caches are stored locally for offline access

AUTHOR
    Lonx OS development team`,

        'rm': `NAME
    rm - remove files and directories

SYNOPSIS
    rm [file]
    sudo rm [file]

DESCRIPTION
    Removes (deletes) files and directories from the filesystem.
    Regular users can only delete files they own. Use 'sudo rm'
    for system files and protected directories.

EXAMPLES
    rm myfile.txt           Remove myfile.txt
    rm /tmp/tempfile        Remove file from /tmp
    sudo rm /etc/config     Remove system file (requires sudo)
    sudo rm /               Remove root directory (destructive!)

WARNING
    File deletion is permanent. Deleted files cannot be recovered.

AUTHOR
    Lonx OS development team`,

        'sudo': `NAME
    sudo - execute commands as superuser

SYNOPSIS
    sudo [command]

DESCRIPTION
    sudo allows a permitted user to execute a command as the superuser
    or another user, as specified by the security policy. In Lonx OS,
    sudo provides elevated privileges for system operations.

EXAMPLES
    sudo rm /etc/config     Delete system file
    sudo mim install pkg    Install package with elevated privileges
    sudo reboot             Reboot system

SECURITY
    Lonx OS sudo is simplified and does not require password authentication.
    Use with caution as sudo commands can modify system files.

AUTHOR
    Lonx OS development team`,

        'adt': `NAME
    adt - Advanced Diagnostic Tool

SYNOPSIS
    adt <url>

DESCRIPTION
    adt is a network diagnostic tool that tests connectivity to remote URLs
    and provides detailed connection information including response times,
    HTTP status codes, and server information.

FEATURES
    • HTTP/HTTPS connectivity testing
    • Response time measurement
    • Status code reporting
    • Error diagnosis and reporting

EXAMPLES
    adt https://google.com          Test connectivity to Google
    adt https://api.github.com      Test API endpoint connectivity

OUTPUT
    The tool displays:
    • Connection status (success/failure)
    • HTTP status code and message
    • Response latency in milliseconds
    • Error details if connection fails

AUTHOR
    Lonx OS development team`,

        'ls': `NAME
    ls - list directory contents

SYNOPSIS
    ls [directory]

DESCRIPTION
    Lists files and directories in the specified directory,
    or current directory if none specified.

EXAMPLES
    ls              List current directory
    ls /bin         List contents of /bin directory
    ls /etc         List system configuration files

AUTHOR
    Lonx OS development team`,

        'cat': `NAME
    cat - display file contents

SYNOPSIS
    cat <file>

DESCRIPTION
    Displays the contents of the specified file to the terminal.
    Works with text files and shows human-readable content.

EXAMPLES
    cat readme.txt          Display readme.txt contents
    cat /etc/config.json    Display configuration file

AUTHOR
    Lonx OS development team`,

        'ps': `NAME
    ps - display running processes

SYNOPSIS
    ps

DESCRIPTION
    Shows a snapshot of currently running processes in the system,
    including process IDs, status, and resource usage.

OUTPUT COLUMNS
    PID     Process ID
    STATE   Process state (running, sleeping, zombie)
    NAME    Process name
    CPU%    CPU usage percentage
    MEM     Memory usage

AUTHOR
    Lonx OS development team`,

        'memstat': `NAME
    memstat - display memory statistics

SYNOPSIS
    memstat

DESCRIPTION
    Shows current memory usage statistics for the Lonx OS system,
    including total memory, used memory, free memory, and usage percentages.

OUTPUT
    • Total system memory
    • Used memory amount
    • Free memory amount
    • Memory usage percentage
    • Process memory breakdown

AUTHOR
    Lonx OS development team`,

        'help': `NAME
    help - display available commands

SYNOPSIS
    help

DESCRIPTION
    Shows a list of all available commands in the Lonx OS shell
    with brief descriptions of their functionality.

EXAMPLES
    help            Show all available commands

SEE ALSO
    man <command>   For detailed documentation of specific commands

AUTHOR
    Lonx OS development team`,

        'echo': `NAME
    echo - display text

SYNOPSIS
    echo [text...]

DESCRIPTION
    Displays the specified text to the terminal. Useful for displaying
    messages, creating simple output, or testing shell functionality.

EXAMPLES
    echo Hello World        Display "Hello World"
    echo "Text with spaces" Display text containing spaces

AUTHOR
    Lonx OS development team`,

        'clear': `NAME
    clear - clear terminal screen

SYNOPSIS
    clear

DESCRIPTION
    Clears the terminal screen, providing a clean workspace.
    Equivalent to pressing Ctrl+L in many terminal environments.

EXAMPLES
    clear           Clear the screen

AUTHOR
    Lonx OS development team`,

        'touch': `NAME
    touch - create empty files

SYNOPSIS
    touch <file>

DESCRIPTION
    Creates a new empty file with the specified name, or updates
    the timestamp of an existing file.

EXAMPLES
    touch newfile.txt       Create empty newfile.txt
    touch /tmp/tempfile     Create file in /tmp directory

AUTHOR
    Lonx OS development team`,

        'reboot': `NAME
    reboot - restart the system

SYNOPSIS
    reboot

DESCRIPTION
    Restarts the Lonx OS system. This will close all running processes
    and reload the operating system from the beginning.

WARNING
    Unsaved work will be lost. Save your files before rebooting.

EXAMPLES
    reboot          Restart the system
    sudo reboot     Restart with elevated privileges

AUTHOR
    Lonx OS development team`,

        'whoami': `NAME
    whoami - display current user

SYNOPSIS
    whoami

DESCRIPTION
    Displays the username of the currently logged-in user.

EXAMPLES
    whoami          Show current username

AUTHOR
    Lonx OS development team`,

        'man': `NAME
    man - display manual pages

SYNOPSIS
    man <command>

DESCRIPTION
    Displays the manual page for the specified command. Manual pages
    provide comprehensive documentation including usage, options,
    examples, and author information.

EXAMPLES
    man ls          Show manual for ls command
    man nano        Show manual for nano editor
    man man         Show this manual page

AVAILABLE MANUALS
    Core Commands: ls, cat, touch, rm, clear, echo, ps, memstat
    Editors: nano
    Network: wget, adt
    System: sudo, reboot, whoami, help
    Package Manager: mim
    Documentation: man

AUTHOR
    Lonx OS development team`
    };

    if (args.length === 0) {
        shell.print('What manual page do you want?');
        shell.print('Available manual pages:');
        shell.print('');
        
        const commands = Object.keys(manuals).sort();
        const columns = Math.floor(80 / 20); // Assume 80 char width, 20 chars per column
        
        for (let i = 0; i < commands.length; i += columns) {
            const row = commands.slice(i, i + columns);
            shell.print(row.map(cmd => cmd.padEnd(18)).join(' '));
        }
        
        shell.print('');
        shell.print('Use "man <command>" to view detailed documentation.');
        return;
    }

    const command = args[0].toLowerCase();
    
    if (manuals[command]) {
        shell.print(manuals[command]);
    } else {
        shell.print(`No manual entry for ${command}`);
        shell.print('');
        shell.print('Available manual pages:');
        const commands = Object.keys(manuals).sort();
        shell.print(commands.join(', '));
        shell.print('');
        shell.print('Use "man <command>" to view documentation.');
    }
}

// Export for Lonx OS
export default main;

// yo