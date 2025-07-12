// packages/wget.js
export default async function main(args, lonx) {
    const { shell, fs } = lonx;
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
        const response = await fetch(url);
        if (!response.ok) {
            shell.print(`\nError: Failed to fetch with status ${response.status}`);
            return;
        }
        if (!response.body) {
            shell.print(`\nError: Response body is not available.`);
            return;
        }

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        let chunks = [];

        while(true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
            receivedLength += value.length;

            if (contentLength) {
                const percent = Math.round((receivedLength / contentLength) * 100);
                const barWidth = 20;
                const filledWidth = Math.round(barWidth * (percent / 100));
                const emptyWidth = barWidth - filledWidth;
                const progressBar = `[${'#'.repeat(filledWidth)}${'-'.repeat(emptyWidth)}] ${percent}%`;
                // Use updateLine to show progress on a single line
                shell.updateLine(`Progress: ${progressBar}`);
            } else {
                shell.updateLine(`Downloaded ${receivedLength} bytes...`);
            }
        }

        const blob = new Blob(chunks);
        const data = await blob.text(); // Assuming text, for binary we'd need another approach

        // Determine output path
        const fileName = outputArg || url.split('/').pop().split('?')[0] || 'index.html';
        const outputPath = `/home/user/${fileName}`;

        fs.write(outputPath, data);
        shell.print(`\nSaved to ${outputPath}`);

    } catch (e) {
        shell.print(`\nError: ${e.message}`);
    }
}
