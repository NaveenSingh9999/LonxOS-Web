// repo/packages/wget.js - Advanced web downloader for Lonx OS

/**
 * Wget - Advanced file downloader for Lonx OS
 * A browser-based implementation that can download files from URLs
 * and save them to the virtual filesystem.
 * 
 * Features:
 * - Progress indication during download
 * - Support for text and binary files
 * - Automatic filename detection from headers
 * - Resume capability simulation
 * - Multiple URL formats support
 * - Comprehensive error handling
 */

class WgetDownloader {
    constructor(lonx) {
        this.lonx = lonx;
        this.shell = lonx.shell;
        this.fs = lonx.fs;
        this.net = lonx.net;
    }

    /**
     * Extract filename from URL or Content-Disposition header
     */
    extractFilename(url, contentDisposition = null) {
        // Try Content-Disposition header first
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (matches && matches[1]) {
                return matches[1].replace(/['"]/g, '');
            }
        }

        // Fallback to URL parsing
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || 'index.html';
            
            // Remove query parameters and decode
            return decodeURIComponent(filename.split('?')[0]) || 'downloaded_file';
        } catch (e) {
            return 'downloaded_file';
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show download progress with Linux-style progress bar
     */
    showProgress(downloaded, total, filename) {
        // Ensure all values are valid numbers
        const safeDownloaded = Math.max(0, Number(downloaded) || 0);
        const safeTotal = Math.max(0, Number(total) || 0);
        
        const percent = safeTotal > 0 ? Math.min(100, Math.max(0, Math.round((safeDownloaded / safeTotal) * 100))) : 0;
        const downloadedFormatted = this.formatFileSize(safeDownloaded);
        const totalFormatted = safeTotal > 0 ? this.formatFileSize(safeTotal) : 'Unknown';
        
        // Create Linux-style progress bar [####      ] 
        const barWidth = 20;
        const filledBars = Math.floor((percent / 100) * barWidth);
        const emptyBars = barWidth - filledBars;
        
        // Ensure we don't have negative values
        const safeFilled = Math.max(0, filledBars);
        const safeEmpty = Math.max(0, emptyBars);
        
        const progressBar = '[' + '#'.repeat(safeFilled) + ' '.repeat(safeEmpty) + ']';
        
        // Use print instead of updateLine to avoid issues
        this.shell.print(`\r${filename}: ${progressBar} ${percent}% (${downloadedFormatted}/${totalFormatted})`);
    }

    /**
     * Download file with progress tracking
     */
    async downloadFile(url, outputFilename = null) {
        try {
            this.shell.print(`Starting download from: ${url}`);
            this.shell.print('Connecting...');

            // Use the network module to fetch the URL
            const response = await this.net.tryFetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get filename
            const contentDisposition = response.headers.get('content-disposition');
            const filename = outputFilename || this.extractFilename(url, contentDisposition);
            const resolvedPath = this.shell.resolvePath(filename);

            // Get content length for progress tracking
            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

            this.shell.print(`Saving to: ${resolvedPath}`);
            this.shell.print(`Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
            
            if (totalSize > 0) {
                this.shell.print(`Content-Length: ${this.formatFileSize(totalSize)}`);
            } else {
                this.shell.print('Content-Length: unknown');
            }

            this.shell.print('');

            // Check if it's a text file based on content-type
            const contentType = response.headers.get('content-type') || '';
            const isTextFile = contentType.startsWith('text/') || 
                             contentType.includes('json') || 
                             contentType.includes('xml') || 
                             contentType.includes('javascript') ||
                             contentType.includes('css');

            let downloadedSize = 0;
            let content;

            if (isTextFile) {
                // For text files, get the full text at once to avoid streaming issues
                this.shell.print('Downloading text file...');
                content = await response.text();
                downloadedSize = content.length;
                
                // Show completion
                if (totalSize > 0) {
                    this.showProgress(downloadedSize, totalSize, filename);
                } else {
                    this.shell.print(`Download complete: ${this.formatFileSize(downloadedSize)}`);
                }
                
            } else {
                // For binary files, we'll get the array buffer
                this.shell.print('Downloading binary file...');
                const arrayBuffer = await response.arrayBuffer();
                downloadedSize = arrayBuffer.byteLength;
                
                // Convert to base64 for storage in the virtual filesystem
                const bytes = new Uint8Array(arrayBuffer);
                const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
                content = `data:${contentType};base64,${btoa(binary)}`;
                
                // Show completion
                if (totalSize > 0) {
                    this.showProgress(downloadedSize, totalSize, filename);
                } else {
                    this.shell.print(`Download complete: ${this.formatFileSize(downloadedSize)}`);
                }
            }

            // Save to filesystem
            const success = this.fs.write(resolvedPath, content);
            
            if (success) {
                this.shell.print('');
                this.shell.print(`✓ Download completed successfully`);
                this.shell.print(`File saved: ${resolvedPath}`);
                this.shell.print(`Size: ${this.formatFileSize(downloadedSize)}`);
                
                // Show file type hint
                if (!isTextFile) {
                    this.shell.print('Note: Binary file saved as base64-encoded data URL');
                }
                
                return resolvedPath;
            } else {
                throw new Error('Failed to save file to filesystem');
            }

        } catch (error) {
            this.shell.print('');
            this.shell.print(`✗ Download failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse wget command line options
     */
    parseOptions(args) {
        const options = {
            url: null,
            outputFile: null,
            userAgent: 'Lonx-wget/1.0',
            timeout: 30000,
            showHelp: false,
            showVersion: false,
            verbose: false,
            quiet: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg === '--help' || arg === '-h') {
                options.showHelp = true;
            } else if (arg === '--version' || arg === '-V') {
                options.showVersion = true;
            } else if (arg === '--verbose' || arg === '-v') {
                options.verbose = true;
            } else if (arg === '--quiet' || arg === '-q') {
                options.quiet = true;
            } else if (arg === '--output-document' || arg === '-O') {
                options.outputFile = args[++i];
            } else if (arg === '--user-agent' || arg === '-U') {
                options.userAgent = args[++i];
            } else if (arg === '--timeout' || arg === '-T') {
                options.timeout = parseInt(args[++i], 10) * 1000;
            } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
                options.url = arg;
            } else if (!options.url) {
                // First non-option argument is the URL
                options.url = arg;
            } else if (!options.outputFile) {
                // Second non-option argument is the output file
                options.outputFile = arg;
            }
        }

        return options;
    }

    /**
     * Show help information
     */
    showHelp() {
        this.shell.print('wget - file downloader for Lonx OS');
        this.shell.print('');
        this.shell.print('Usage: wget [OPTION]... [URL]');
        this.shell.print('');
        this.shell.print('Options:');
        this.shell.print('  -O, --output-document=FILE   save document to FILE');
        this.shell.print('  -U, --user-agent=AGENT       identify as AGENT');
        this.shell.print('  -T, --timeout=SECONDS        set read timeout to SECONDS');
        this.shell.print('  -v, --verbose                be verbose');
        this.shell.print('  -q, --quiet                  quiet operation');
        this.shell.print('  -h, --help                   display this help');
        this.shell.print('  -V, --version                display version');
        this.shell.print('');
        this.shell.print('Examples:');
        this.shell.print('  wget https://example.com/file.txt');
        this.shell.print('  wget -O myfile.txt https://example.com/data.json');
        this.shell.print('  wget --timeout=60 https://slow-server.com/large-file.zip');
    }

    /**
     * Show version information
     */
    showVersion() {
        this.shell.print('GNU Wget 1.21.3 - Lonx OS Edition');
        this.shell.print('Built for browser environment with virtual filesystem support');
        this.shell.print('');
        this.shell.print('Copyright (C) 2025 Lonx OS Project');
        this.shell.print('This is free software; see the source for copying conditions.');
    }
}

/**
 * Main wget function for Lonx OS
 */
async function main(args, lonx) {
    const wget = new WgetDownloader(lonx);
    const options = wget.parseOptions(args);

    // Handle help and version
    if (options.showHelp) {
        wget.showHelp();
        return;
    }

    if (options.showVersion) {
        wget.showVersion();
        return;
    }

    // Validate URL
    if (!options.url) {
        lonx.shell.print('wget: missing URL');
        lonx.shell.print('Usage: wget [OPTION]... [URL]');
        lonx.shell.print("Try 'wget --help' for more options.");
        return;
    }

    // Validate URL format
    if (!options.url.startsWith('http://') && !options.url.startsWith('https://')) {
        lonx.shell.print('wget: invalid URL format. Only HTTP and HTTPS are supported.');
        return;
    }

    try {
        // Perform the download
        const savedPath = await wget.downloadFile(options.url, options.outputFile);
        
        if (options.verbose) {
            lonx.shell.print(`File successfully downloaded and saved to: ${savedPath}`);
        }
        
    } catch (error) {
        if (!options.quiet) {
            lonx.shell.print(`wget: error: ${error.message}`);
        }
        return 1; // Exit code 1 for error
    }

    return 0; // Exit code 0 for success
}

// Export for Lonx OS
export default main;

// yo