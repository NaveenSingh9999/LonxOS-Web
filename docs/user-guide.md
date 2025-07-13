# Lonx OS - User Guide

Welcome to Lonx OS! This guide is designed for end-users who want to learn how to use the Lonx shell and its features. Whether you're a command-line enthusiast or new to terminal environments, this document will help you get started.

---

## 📦 What is Lonx OS?

Lonx OS is a web-based, simulated operating system that runs entirely in your browser. It's designed to mimic the core experience of a classic Linux or Unix-like system, complete with a virtual filesystem, process management, and a powerful command-line interface (CLI).

It's a playground for learning, experimentation, and nostalgia, built from the ground up with modern web technologies.

---

## 🚀 Booting Up Lonx OS

Getting started is simple:
1.  Open the `boot/tylon.html` file in a modern web browser.
2.  On your first boot, you'll be greeted by the **[Onboarding Wizard](./modules/onboarding.md)**. This will help you set up your user identity (username and hostname).
3.  If you ever want to re-run the wizard, press **`Ctrl+D`** at any time during the boot sequence.
4.  After the boot sequence completes, you'll be dropped into the Lonx shell, ready to enter commands.

---

## 💻 Basic Shell Commands

The Lonx shell supports many familiar commands. Here are some of the most common ones:

| Command        | Description                                       | Example                     |
|----------------|---------------------------------------------------|-----------------------------|
| `ls`           | Lists files and directories in the current location. | `ls /bin`                   |
| `cd <dir>`     | Changes the current directory.                    | `cd /home/user`             |
| `pwd`          | Prints the current working directory.             | `pwd`                       |
| `cat <file>`   | Displays the content of a file.                   | `cat /etc/config.json`      |
| `touch <file>` | Creates a new, empty file.                        | `touch my-notes.txt`        |
| `rm <file>`    | Removes (deletes) a file.                         | `rm old-file.txt`           |
| `echo <text>`  | Prints text to the console.                       | `echo "Hello, Lonx!"`       |
| `whoami`       | Displays your current username.                   | `whoami`                    |
| `clear`        | Clears the terminal screen.                       | `clear`                     |
| `reboot`       | Reboots the entire Lonx OS.                       | `reboot`                    |
| `help`         | Shows a list of available commands.               | `help`                      |

---

## 📦 Installing Apps with `mim`

`mim` is the official [package manager for Lonx OS](./modules/mim.md). You can use it to install new commands and applications from a central repository.

- **To install a package:**
  ```sh
  mim install nano
  ```
- **To see a list of available packages:**
  ```sh
  mim list
  ```
- **To update the package list:**
  ```sh
  mim update
  ```

---

## 🌐 Using Networking Tools

Lonx includes tools for interacting with the web. For more details, see the [Networking Module documentation](./modules/networking.md).

- **`adt <url>` (Advanced Diagnostic Tool):** Pings a URL and shows its status and latency. This is useful for checking if a website is online.
  ```sh
  adt https://www.google.com
  ```
- **`wget <url>` (Coming Soon):** This tool will allow you to download the content of a URL and save it as a file in the virtual filesystem.

---

## ⚙️ Managing Your Configuration

Your system's configuration is stored in a single JSON file located at `/etc/config.json`. You can view it with `cat` and edit it with a text editor like `nano` (once installed).

For more details on the configuration system, see the [Config Module documentation](./modules/config.md).

---

## 🔐 Resetting or Modifying the System

- **Reset Configuration:** To completely reset your Lonx OS settings to their defaults, you can use the `reset-config` command (if available) or manually trigger the boot-time config screen.
- **Trigger Config Screen:** During the boot animation, press **`Ctrl+D`** to bring up the configuration menu. This allows you to change your username and hostname without a full reset.

---

## 💡 Tips & Tricks

For an in-depth look at process and job management, see the [PTM Module documentation](./modules/ptm.md).

### Background Processes
You can run a command in the background by adding an `&` at the end. This is great for long-running tasks.
```sh
# This command will run for 30 seconds without blocking your shell
sleep 30 &
```

### Job Control
- **`jobs`**: See a list of all your background or stopped jobs.
- **`Ctrl+Z`**: Suspend the currently running foreground command.
- **`bg %1`**: Resume a stopped job in the background.
- **`fg %1`**: Bring a background job to the foreground.

### Process Management
- **`ps`**: See all the processes currently running on the system.
- **`kill <pid>`**: Terminate a running process using its Process ID (PID).
