# Module: Lonx Shell

---

## 📌 Overview

The Lonx Shell is the primary user interface for the operating system. It is a command-line interpreter (CLI) that parses user input, executes commands, and manages user sessions, including job control and command history.

---

## 🧱 Architecture

The shell is not a class but a collection of functions and a central `builtInCommands` object.

**Location:** `/os/shell.ts`

**Core Components:**
- **`handleShellInput(e: KeyboardEvent)`:** The main event listener. It captures keystrokes, manages the current input line, handles command history (`ArrowUp`/`ArrowDown`), and triggers command execution on `Enter`.
- **`executeCommand(command, args, isSudo, inBackground)`:** The command execution engine.
  1.  Creates a process in the PTM for the command.
  2.  Checks if the command is a built-in command.
  3.  If not, it looks for an executable file in `/bin`.
  4.  Executes the command's function.
  5.  Kills the process when the command completes (unless it's a background task).
- **`builtInCommands{}`:** A large object mapping command names (e.g., "ls", "ps") to their corresponding functions.
- **Job Control:**
  - Appending `&` to a command sets the `inBackground` flag to `true`.
  - `Ctrl+Z` is handled in `handleShellInput` to find the last running process and call `ptm.suspend()`.

---

## 🧪 Sample Usage

The shell is initialized once by the kernel at boot. All subsequent interaction is driven by the user.

**Registering a new built-in command:**
To add a new command, a developer simply adds a new entry to the `builtInCommands` object.

```typescript
// Inside os/shell.ts

builtInCommands = {
  // ... other commands
  hello: (args) => {
    const name = args[0] || 'World';
    return `Hello, ${name}! From a built-in command.`;
  },
  // ... other commands
};
```

**Executing a command from another module (e.g., in a script):**
```typescript
import { executeCommand } from './os/shell.js';

// This would run the 'ls' command with the argument '/'
await executeCommand("ls", ["/"]);
```

---

## ⚠️ Limitations

- **No Pipes or Redirection:** The shell cannot pipe the output of one command to another (`|`) or redirect output to a file (`>`). The parser only splits commands by spaces.
- **Simplistic Parsing:** The command parser is very basic and does not handle quoted arguments or complex shell scripting features.
- **Synchronous Execution for Built-ins:** While `executeCommand` is `async`, many built-in commands are synchronous and will block the main thread if they perform long-running operations.

---

## 🔧 How to Extend

- **Implement Piping and Redirection:** The `handleShellInput` function would need a much more advanced parser to recognize `|` and `>` tokens. `executeCommand` would need to be modified to handle `stdout` and `stdin` streams for processes, redirecting the output of one process to the input of another.
- **Improve the Parser:** The command parsing logic could be replaced with a more robust library or a custom implementation that understands quotes, environment variables, and other shell features.
- **Add Shell Scripting:** To support shell scripts (e.g., `myscript.sh`), the shell would need an interpreter that can execute a sequence of commands from a file, complete with variables, loops, and conditional logic.

<!-- yo -->