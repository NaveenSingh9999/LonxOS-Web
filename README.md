# Lonx OS

Lonx is a web-based, simulated operating system designed to mimic the core functionalities of a traditional OS within a browser environment. It features a process and thread manager, a memory controller, a virtual filesystem, and a fully interactive shell.

---

## ✨ Core Features

- **Multitasking Kernel**: A sophisticated kernel that manages processes, threads, and system resources.
- **Process & Job Control**: Create, kill, suspend, and manage foreground/background jobs.
- **Memory Management**: A memory controller that allocates and frees memory, preventing processes from running if RAM is insufficient.
- **Virtual Filesystem**: A complete in-memory filesystem with support for directories, files, and permissions.
- **Interactive Shell**: A powerful shell with command history, job control (`&`, `Ctrl+Z`), and familiar commands (`ps`, `ls`, `kill`, `cat`, `sudo`).
- **System Utilities**: Includes commands like `spin` (CPU-intensive task), `sleep`, `memstat`, and more for testing and monitoring.
- **Extensible**: New commands can be easily added to the `/bin` directory.

---

## 📚 Documentation

For a detailed explanation of the kernel's internal workings, please see:

- **[Processes & Kernel Job Handling](./docs/processes_and_kernel_job_handling.md)**

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
