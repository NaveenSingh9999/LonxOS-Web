# Lonx OS Application Development Guide

This guide provides a comprehensive overview of how to create, package, and distribute your own applications for Lonx OS.

## 1. Understanding the Lonx OS Environment

Lonx OS applications are JavaScript files that are executed by the shell. They run in a sandboxed environment within the browser and interact with the OS through a global API object.

### The `lonx_api` Object

When your application is executed, the shell provides a global `lonx_api` object. This is your primary way to interact with the core components of Lonx OS. The API is structured as follows:

-   `lonx_api.shell`: Functions for interacting with the shell.
    -   `print(text: string)`: Prints a string to the shell output.
    -   `updateLine(text: string)`: Updates the current input line (rarely needed).
    -   `setInputMode(mode: 'shell' | 'editor', handler?)`: Switches between shell and editor mode (e.g., for apps like `nano`).
    -   `resolvePath(path: string): string`: Resolves a relative path to an absolute one.
-   `lonx_api.fs`: Functions for interacting with the virtual filesystem.
    -   `read(path: string): string | object | null`: Reads a file or directory content.
    -   `write(path: string, content: string): boolean`: Writes content to a file.
    -   `remove(path: string): boolean`: Deletes a file or directory.
-   `lonx_api.net`: Functions for networking.
    -   `tryFetch(url: string): Promise<Response>`: Fetches a URL through a series of resilient CORS proxies.
    -   `ping(url: string): Promise<number>`: Pings a URL and returns the latency.

## 2. Creating Your First Application

Let's create a simple "Hello, World!" application called `hello`.

### Step 1: Write the Code

Create a new file named `hello.js`. All Lonx OS applications must be a single JavaScript file. The shell expects to find and execute a function named `main`.

```javascript
// /repo/packages/hello.js

/**
 * A simple "Hello, World!" application for Lonx OS.
 * It demonstrates how to accept arguments and print to the shell.
 */
async function main(args, lonx) {
    const { shell } = lonx;

    if (args.length > 0) {
        shell.print(`Hello, ${args.join(' ')}!`);
    } else {
        shell.print("Hello, World!");
    }
}

// This line is crucial for the shell to execute your program.
// It calls your main function with the arguments and the API provided by the shell.
main(args, lonx_api);
```

**Explanation:**

1.  We define an `async function main(args, lonx)`.
    -   `args`: An array of strings containing the command-line arguments passed to your app.
    -   `lonx`: A reference to the `lonx_api` object.
2.  We destructure the `shell` object from the `lonx` API.
3.  We use `shell.print()` to output text.
4.  The final `main(args, lonx_api);` call is the entry point. The Lonx shell provides `args` and `lonx_api` as global-like variables in the execution context.

### Step 2: Save the File

Save this code in the `/repo/packages/` directory as `hello.js`. This is where all installable package source code resides.

## 3. Packaging Your Application

To make your application installable via the `mim` package manager, you need to add it to the repository index.

### Step 1: Edit the Repository Index

Open the `/repo/index.json` file. This file contains a list of all available packages. Add a new entry for your `hello` application.

```json
[
  {
    "name": "wget",
    "desc": "Web downloader",
    "version": "1.0.0",
    "url": "packages/wget.js"
  },
  {
    "name": "nano",
    "desc": "Tiny terminal text editor",
    "version": "1.0.0",
    "url": "packages/nano.js"
  },
  {
    "name": "man",
    "desc": "Shows manual of any command",
    "version": "1.0.0",
    "url": "packages/man.js"
  },
  {
    "name": "hello",
    "desc": "A simple hello world program.",
    "version": "1.0.0",
    "url": "packages/hello.js"
  }
]
```

**JSON Fields:**

-   `name`: The command name for your app. This is what users will type.
-   `desc`: A short description of your app.
-   `version`: The version number.
-   `url`: The path to your application's source file, relative to the `index.json` file.

## 4. Installing and Running Your Application

Now, your application is ready to be installed and run in Lonx OS.

1.  **Boot Lonx OS.**
2.  **Install the app:** Use the `mim` package manager.
    ```bash
    mim install hello
    ```
    `mim` will fetch the repository index, find the "hello" package, download the `hello.js` file, and save it to the `/bin/` directory, making it executable.
3.  **Run the app:**
    ```bash
    hello
    ```
    Output: `Hello, World!`
4.  **Run with arguments:**
    ```bash
    hello Lonx Developer
    ```
    Output: `Hello, Lonx Developer!`

## Conclusion

You have successfully created, packaged, and run a custom application in Lonx OS. By following this structure, you can build more complex applications that leverage the filesystem, networking, and shell interaction capabilities provided by the `lonx_api`.

## 5. Creating a Third-Party Package Repository

While you can add packages to the default repository, Lonx OS also supports adding third-party repositories. This allows anyone to host and distribute their own collection of applications. The `mim` package manager can pull from multiple repository sources.

### Step 1: Structure Your Repository

A repository is simply a directory hosted somewhere on the web that contains two key things:

1.  An `index.json` file.
2.  A folder (e.g., `packages/`) containing your application files.

Your repository structure should look like this:

```
my-lonx-repo/
├── index.json
└── packages/
    ├── myapp1.js
    └── myapp2.js
```

### Step 2: Create the `index.json` File

The `index.json` file is the heart of your repository. It lists all the available packages. The format is the same as the default repository's index.

**Example `index.json`:**

```json
[
  {
    "name": "cowsay",
    "desc": "A talking cow in your shell",
    "version": "1.0.0",
    "url": "packages/cowsay.js"
  },
  {
    "name": "sysinfo",
    "desc": "Displays system information",
    "version": "1.1.0",
    "url": "packages/sysinfo.js"
  }
]
```

**Important:** The `url` for each package must be relative to the `index.json` file.

### Step 3: Host Your Repository

You can host your repository on any platform that serves static files. A free and easy option is **GitHub Pages**.

1.  Create a new public GitHub repository.
2.  Push your repository files (`index.json` and the `packages/` directory) to it.
3.  Go to your repository's **Settings** -> **Pages**.
4.  Choose the branch to deploy from (usually `main`) and click **Save**.
5.  GitHub will provide you with a URL, like `https://your-username.github.io/your-repo-name/`.

Your `index.json` will be accessible at `https://your-username.github.io/your-repo-name/index.json`.

### Step 4: Add Your Repository to Lonx OS

Once your repository is live, you can add it to Lonx OS using the `mim` command.

1.  Boot Lonx OS.
2.  Use the `mim addrepo` command, followed by the **full URL** to your `index.json` file.

    ```bash
    mim addrepo https://your-username.github.io/your-repo-name/index.json
    ```

    `mim` will save this new repository URL to `/etc/mim/sources.list`.

### How it Works

-   When you run `mim install <package>`, `mim` fetches the `index.json` from the **default system repository** and all **third-party repositories** you've added.
-   It searches all indexes for the requested package.
-   It downloads the package from the first repository where it's found.

This system allows for a decentralized and expandable application ecosystem for Lonx OS.

<!-- yo -->
