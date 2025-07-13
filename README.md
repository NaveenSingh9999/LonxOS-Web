# Lonx OS

Lonx is a web-based, simulated operating system designed to mimic the core functionalities of a traditional OS within a browser environment. It features a process and thread manager, a memory controller, a virtual filesystem, and a fully interactive shell.

---

## ✨ Core Features

- **Multitasking Kernel**: A sophisticated kernel that manages processes, threads, and system resources.
- **Process & Job Control**: Create, kill, suspend, and manage foreground/background jobs.
- **Memory Management**: A memory controller that allocates and frees memory, preventing processes from running if RAM is insufficient.
- **Virtual Filesystem**: A complete in-memory filesystem with support for directories, files, and permissions.
- **Interactive Shell**: A powerful shell with command history, job control (`&`, `Ctrl+Z`), and familiar commands (`ps`, `ls`, `kill`, `cat`, `sudo`).
- **Package Manager (`mim`)**: A simple package manager to install new commands from a repository.
- **Extensible**: New commands can be easily added to the `/bin` directory.

---

## 📚 Documentation

The Lonx OS project is documented for users, developers, and contributors.

- **[📘 User Guide](./docs/user-guide.md)**: Learn how to use Lonx OS, from basic commands to advanced features like job control and package management.

- **[🛠️ Developer Manual](./docs/developer-manual.md)**: Get an overview of the Lonx OS architecture, including the kernel, filesystem, and process management. This is the place to start if you want to contribute.

### Internal Module Documentation

For a deep dive into specific components, see the module documentation:

- **Core Systems:**
  - [Bootloader (`bootloader.md`)](./docs/modules/bootloader.md)
  - [Shell (`shell.md`)](./docs/modules/shell.md)
  - [Onboarding (`onboarding.md`)](./docs/modules/onboarding.md)
- **Kernel Modules:**
  - [Process & Thread Manager (`ptm.md`)](./docs/modules/ptm.md)
  - [Memory Controller (`memory.md`)](./docs/modules/memory.md)
  - [Filesystem (`filesystem.md`)](./docs/modules/filesystem.md)
  - [Networking (`networking.md`)](./docs/modules/networking.md)
- **System Services:**
  - [Package Manager (`mim.md`)](./docs/modules/mim.md)
  - [Configuration System (`config.md`)](./docs/modules/config.md)

---

## 🚀 Getting Started

1.  Open `boot/tylon.html` in a modern web browser.
2.  The system will boot up and present you with the Lonx shell.
3.  Try out some commands!

### Example Commands

- **See what's running:**
  ```sh
  ps
  ```
- **Run a CPU-intensive task in the background:**
  ```sh
  spin 15 &
  ```
- **Check memory usage:**
  ```sh
  memstat
  ```
- **Suspend and resume a job:**
  ```sh
  sleep 60   # Press Ctrl+Z after a moment
  jobs       # See the stopped job
  bg %1      # Resume it in the background
  ```

---

This project is a simulation and is for educational purposes.

<!-- yo -->
