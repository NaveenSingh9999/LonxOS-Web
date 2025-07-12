# Lonx OS Documentation

This document provides instructions on how to add new repositories for the `mim` package manager and how to create new modules (commands) for Lonx OS.

## Managing `mim` Repositories

The `mim` package manager fetches packages from a list of repository URLs. This list is stored in `/etc/mim/sources.list`.

### Viewing Sources

To see your current list of repositories, use the `sources` command:

```
mim sources
```

### Adding a Repository

To add a new repository, use the `addrepo` command, followed by the URL to the repository's `index.json` file.

```
mim addrepo http://example.com/lonx-repo/index.json
```

The `index.json` file should be an array of objects, where each object describes a package.

**`index.json` format:**
```json
[
  {
    "name": "my-command",
    "desc": "A description of my cool command.",
    "version": "1.0.0",
    "url": "packages/my-command.js"
  }
]
```
- `name`: The name of the command to be used in the shell.
- `desc`: A brief description.
- `version`: The version number.
- `url`: The relative path from the `index.json` file to the package's JavaScript file.

### Deleting a Repository

To remove a repository, use the `delrepo` command:

```
mim delrepo http://example.com/lonx-repo/index.json
```

---

## Creating New Modules (Commands)

Lonx OS commands are JavaScript modules that are dynamically loaded and executed by the shell.

### Module Structure

A command is a single JavaScript file that exports a default function. This function is the entry point for your command.

**File:** `/bin/my-command.js`

```javascript
export default async function main(args, lonx) {
    // lonx is the API object provided by the OS
    const { shell, fs } = lonx;

    // args is an array of strings passed to your command
    const firstArg = args[0];

    shell.print("Hello from my-command!");

    // You can interact with the filesystem
    const fileContent = fs.read('/home/user/somefile.txt');
    if (typeof fileContent === 'string') {
        shell.print(fileContent);
    }
}
```

### The `lonx` API Object

Your command receives one argument: `lonx`. This object is your gateway to interacting with the operating system. It provides access to:

- `lonx.shell`: Functions for interacting with the shell.
  - `print(text)`: Prints a string to the shell.
  - `updateLine(text)`: Overwrites the current line (useful for progress bars).
  - `setInputMode(mode, handler)`: Switches input between the shell and a custom handler (like in `nano`).
  - `resolvePath(path)`: Resolves a relative path to an absolute one.
- `lonx.fs`: Functions for file system operations.
  - `read(path)`: Reads a file or directory.
  - `write(path, content)`: Writes content to a file.

### Publishing Your Command

1.  Host your command's JS file and an `index.json` file on a web server or a service like GitHub Pages.
2.  Add your repository's `index.json` URL to Lonx OS using `mim addrepo`.
3.  Install your command using `mim install my-command`.
4.  Run it: `my-command`.
