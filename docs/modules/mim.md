# Module: mim Package Manager

---

## 📌 Overview

`mim` (Minimalist Install Manager) is the official command-line package manager for Lonx OS. It is responsible for fetching, installing, and managing software packages (which are essentially new shell commands) from a remote repository.

---

## 🧱 Data Structure & Flow

`mim` is not a class but a set of functions that are invoked by the `mim` shell command. The core logic revolves around a remote JSON file that serves as the package repository index.

**The Repository (`packages.json`):**
This file, hosted externally, contains a list of all available packages.
```json
{
  "nano": {
    "description": "A simple text editor.",
    "url": "https://example.com/lonx/bin/nano.js"
  },
  "cowsay": {
    "description": "A talking cow.",
    "url": "https://example.com/lonx/bin/cowsay.js"
  }
}
```

**Install Flow:**
1.  User runs `mim install nano`.
2.  `mim` fetches the `packages.json` repository index.
3.  It finds the "nano" entry and gets its `url`.
4.  It uses the core networking module (`net.tryFetch`) to download the content of the script from the URL.
5.  The downloaded JavaScript code is saved as a new file in the virtual filesystem at `/bin/nano`.
6.  The shell can now execute `nano` as a command.

---

## 🧪 Sample Usage

All interaction is through the shell.

- **Install a package:**
  ```sh
  mim install nano
  ```
- **List available packages:**
  ```sh
  mim list
  ```
- **Update the local package cache:**
  ```sh
  mim update
  ```

---

## ⚠️ Limitations

- **No Versioning:** `mim` always installs the latest version of a script from the repository URL. There is no version tracking or dependency management.
- **No Uninstallation:** There is currently no `mim uninstall <package>` command. Packages must be removed manually by deleting the file from `/bin`.
- **Single Repository:** `mim` is hardcoded to use a single, central repository URL.
- **Security:** `mim` trusts the repository completely. It executes whatever code it downloads, which is a significant security risk in a real-world scenario.

---

## 🔧 How to Extend

- **Add Uninstallation:** An `uninstall` command could be added that simply removes the corresponding file from the `/bin` directory.
- **Implement Versioning:** The `packages.json` repository could be updated to include version numbers. `mim` could then track installed versions in a local manifest file (e.g., `/etc/mim-manifest.json`).
- **Add Dependency Management:** The repository could include a `dependencies` array for each package. The `install` command would then need to recursively resolve and install all dependencies.
- **Support for Multiple Repositories:** The system could be modified to manage a list of repository URLs, allowing users to add or remove sources.

<!-- yo -->