# Lonx OS

**Lonx OS** is a lightweight, browser-based operating system designed to simulate a classic command-line environment entirely in your web browser. It features a modular kernel, a virtual filesystem, process and memory management, and a package manager for installing new applications.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNaveenSingh9999%2FLonx)

## Features

-   **Unix-like Shell:** A familiar command-line interface with commands like `ls`, `cd`, `cat`, `rm`, `echo`, `pwd`, and more.
-   **Virtual Filesystem:** A persistent, in-browser filesystem that stores your files and directories in `localStorage`.
-   **Package Manager (`mim`):** The Lonx Module and Installation Manager (`mim`) allows you to install new commands and applications from external repositories.
-   **Networking Tools:** Includes `wget` for downloading files and `adt` for network diagnostics, all powered by a resilient, multi-proxy CORS fetching system.
-   **Text Editor (`nano`):** A full-screen text editor for creating and editing files directly within the OS.
-   **Sudo:** A `sudo` command to perform actions with elevated (simulated) privileges.
-   **Process Management:** Basic process management with `ps` to view running processes.

## Live Demo

You can try Lonx OS live at: **[https://lonx.vercel.app/boot/tylon.html](https://lonx.vercel.app/boot/tylon.html)**

## Getting Started

Simply open the [live demo link](https://lonx.vercel.app/boot/tylon.html) to start using Lonx OS. Here are a few commands to try:

-   `help`: See a list of available commands.
-   `ls`: List files in the current directory.
-   `mim list`: See a list of installed packages.
-   `mim install hello`: Install a sample "hello world" program.
-   `hello`: Run the newly installed program.
-   `man mim`: Read the manual for the `mim` command.

## Development

Interested in building your own applications for Lonx OS? The development process is simple and requires only basic JavaScript knowledge.

For a complete guide on creating, packaging, and distributing your own Lonx OS applications, please see the **[Application Development Guide](./DOCUMENTATION.md)**.

---

*Lonx OS is a project for demonstration and educational purposes.*
