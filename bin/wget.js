// bin/wget.js

/**
 * Wget - A simple file downloader for Lonx OS.
 *
 * Usage: wget <url> [output-filename]
 *
 * Downloads a file from a given URL and saves it to the filesystem.
 * If no output filename is provided, it will try to infer the name from the URL.
 */
async function main(args) {
    const { shell, fs, net } = lonx_api;

    if (args.length === 0) {
        shell.print("Usage: wget <url> [output-filename]");
        return;
    }

    const url = args[0];
    let outputFilename = args[1];

    // If no output filename, try to get it from the URL
    if (!outputFilename) {
        try {
            const urlParts = new URL(url);
            const pathParts = urlParts.pathname.split('/');
            outputFilename = pathParts[pathParts.length - 1] || 'index.html';
        } catch (e) {
            shell.print(`wget: Invalid URL: ${url}`);
            return;
        }
    }

    const resolvedPath = shell.resolvePath(outputFilename);

    shell.print(`--&gt; Resolving ${url}`);
    shell.print(`--&gt; Saving to ${resolvedPath}`);

    try {
        const response = await net.tryFetch(url);
        const data = await response.text(); // For simplicity, we'll handle text-based files

        fs.write(resolvedPath, data);

        shell.print(`Saved ${data.length} bytes to ${resolvedPath}`);

    } catch (e) {
        shell.print(`wget: An error occurred: ${e.message}`);
    }
}

// yo
