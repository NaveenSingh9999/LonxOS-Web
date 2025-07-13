# Lonx OS - Developer Manual

This manual is for developers who want to understand the architecture of Lonx OS, contribute to its core, or build applications and services on top of it.

---

## 📁 Project Structure

The Lonx OS codebase is organized into several key directories:

- **/boot**: Contains the bootloader (`tylon.html`, `tylon.js`) and initial entry point.
- **/os**: The heart of the operating system.
  - **/os/core**: Core kernel components like the PTM, Memory Controller, networking, and configuration.
  - **/os/fs**: The virtual filesystem logic.
  - **/os/shell**: The command-line interpreter and all built-in commands.
- **/bin**: Executable scripts and applications that can be run from the shell.
- **/docs**: All user and developer documentation.

---

## 🔧 Bootloader (TylonV)

The boot process is initiated by `boot/tylon.html`.

- **Flow:**
  1.  The HTML loads `tylon.js`, which displays the boot animation.
  2.  It checks if a configuration exists in `localStorage`.
  3.  If not, it launches the **Onboarding Wizard**.
  4.  It listens for `Ctrl+D` to allow manual entry into the config screen.
  5.  Once the configuration is confirmed, it initializes the main kernel (`/os/kernel.ts`).
  6.  The kernel starts all core services (PTM, Memory, FS) and then hands off control to the shell.

- **Reference:** [modules/bootloader.md](./modules/bootloader.md)

---

## 🧠 Kernel Responsibilities

The main kernel file (`/os/kernel.ts`) is responsible for orchestrating the startup sequence.
1.  **Hardware Simulation:** Initializes a simulated hardware layer to get CPU and RAM info.
2.  **Memory Controller Init:** Starts the `MemoryController` with the total RAM reported by the hardware. See the [Memory Module documentation](./modules/memory.md) for more details.
3.  **Filesystem Init:** Mounts the virtual filesystem from `localStorage`. See the [Filesystem Module documentation](./modules/filesystem.md) for more details.
4.  **PTM Init:** Starts the `PTM`, which immediately creates the root `kernel` process (PID 1). See the [PTM Module documentation](./modules/ptm.md) for more details.
5.  **Shell Init:** Initializes the shell, passing it the necessary APIs to interact with the kernel. See the [Shell Module documentation](./modules/shell.md) for more details.

---

## ⚙️ `/etc/config.json` – Master Config

This file is the single source of truth for the OS configuration. It's a simple JSON object stored as a string in `localStorage`.

- **Reference:** [modules/config.md](./modules/config.md)

---

## 👤 Onboarding Wizard Flow

The onboarding wizard is a simple CLI-based questionnaire presented to the user on first boot.

- **Flow:**
  1.  Prompts for a `username`.
  2.  Prompts for a `hostname`.
  3.  Builds a default configuration object with this information.
  4.  Saves it to `/etc/config.json` in the virtual filesystem.

- **Reference:** [modules/onboarding.md](./modules/onboarding.md)

---

## 🧠 Process + Thread Manager (PTM)

The PTM handles all process lifecycle events. Every command run in the shell becomes a `Process` object.

- **Reference:** [modules/ptm.md](./modules/ptm.md)

---

## 💾 Memory Controller

This module simulates a fixed-size RAM pool. The PTM must request memory from it before creating a process.

- **Reference:** [modules/memory.md](./modules/memory.md)

---

## 📦 mim Package Manager

`mim` is a simple package manager that installs new commands by fetching them from a repository and placing them in the `/bin` directory.

- **Reference:** [modules/mim.md](./modules/mim.md)

---

## 📂 Filesystem Logic

The filesystem is a JavaScript object that simulates a directory tree. The entire tree is serialized to a single `localStorage` key for persistence.

- **Reference:** [modules/filesystem.md](./modules/filesystem.md)

---

## 🌐 Networking Core

The networking module provides utilities for making web requests from within the OS. It includes a CORS proxy fallback for handling cross-origin requests.

- **Reference:** [modules/networking.md](./modules/networking.md)

---

## 🛠️ Creating Custom Commands

Creating a new command is simple. For more details on how the shell handles commands, see the [Shell Module documentation](./modules/shell.md).

1.  Create a new JavaScript file in the `/bin` directory (e.g., `/bin/my-command.js`).
2.  The file must export a default function that accepts `(args, lonx_api, isSudo)`.
3.  Use `lonx_api.shell.print()` to output text.
4.  Your command is now executable from the shell!

**Example (`/bin/hello.js`):**
```javascript
// A simple command that greets the user.
export default function(args, lonx_api) {
    const name = args[0] || 'World';
    lonx_api.shell.print(`Hello, ${name}!`);
}
```

---

## 🔁 Running Background Services or Tasks

To run a task in the background, simply execute it from the shell with an `&` at the end. The `executeCommand` function in the shell is designed to not `await` commands that are marked for background execution.

The PTM will keep the process alive until it is explicitly killed.

---

## 🔐 Security Flags

- **`isSudo`:** The `executeCommand` function in the shell accepts an `isSudo` boolean flag. The `sudo` command simply re-calls `executeCommand` for the target program with this flag set to `true`.
- **Root Access:** Commands can check this flag to perform privileged operations, such as `rm /`.
- **Permissions:** The filesystem does not yet have a formal permissions model, but this is a planned feature.
