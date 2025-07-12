// packages/wget.js
/**
 * Wget - A simple file downloader for Lonx OS.
 *
 * Usage: wget <url> [output-filename]
 *
 * Downloads a file from a given URL and saves it to the filesystem.
 * If no output filename is provided, it will try to infer the name from the URL.
 */
export default async function main(args, lonx) {
    const { shell, fs, net } = lonx;

    if (args.length < 1) {
        shell.print("Usage: wget <url> [output-file]");
        return;
    }
    const url = args[0];
    const outputArg = args[1];
    
    // A very simplified wget. A real one would need a CORS proxy for web URLs for many sites.
    // We will assume the resources are CORS-enabled.
    shell.print(`Downloading from ${url}...`);

    try {
        // Use the resilient tryFetch function from the net core
        const response = await net.tryFetch(url);
        const data = await response.text();

        // Determine output path
        const fileName = outputArg || url.split('/').pop().split('?')[0] || 'index.html';
        const outputPath = `/home/user/${fileName}`;

        fs.write(outputPath, data);
        shell.print(`\nSaved to ${outputPath}`);

    } catch (e) {
        shell.print(`\nError: ${e.message}`);
    }
}
