// packages/wget.js

const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const path = require('path');
const { request: httpsRequest } = require('https');
const { request: httpRequest } = require('http');

/**
 * Real wget for Lonx OS on Vercel/Node.js
 * Usage: wget <url> [output-filename]
 *
 * Downloads a file (text or binary) from any URL and saves it to the user's current path.
 */
module.exports = async function main(args, lonx) {
    const { shell } = lonx;

    if (args.length < 1) {
        shell.print("Usage: wget <url> [output-file]");
        return;
    }

    const url = args[0];
    let fileName = args[1];

    shell.print(`Downloading from ${url}...`);

    // Extract filename from Content-Disposition or URL
    function extractFilename(cd, url) {
        if (cd && /filename\*=UTF-8''([^;]+)/i.test(cd)) {
            // RFC 5987
            return decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/i)[1]);
        } else if (cd && /filename="?([^"]+)"?/i.test(cd)) {
            return cd.match(/filename="?([^"]+)"?/i)[1];
        } else {
            return url.split('/').pop().split('?')[0] || 'index.html';
        }
    }

    // Determine user current directory (cwd)
    const userCwd = shell.cwd || lonx.cwd || process.cwd() || '/tmp';

    // Download and save to file using Node.js fetch or http/https streams
    async function downloadToFile(url, outPath) {
        if (typeof fetch === 'function') {
            // Modern Node.js (18+) fetch
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

            // Get Content-Disposition header for filename
            const cd = response.headers.get('content-disposition');
            return {
                cd,
                headers: response.headers,
                write: async () => {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    await fs.writeFile(outPath, buffer);
                }
            };
        } else {
            // Legacy Node.js (<18) http/https
            return await new Promise((resolve, reject) => {
                const proto = url.startsWith('https') ? httpsRequest : httpRequest;
                const req = proto(url, (res) => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}`));
                        return;
                    }
                    const cd = res.headers['content-disposition'];
                    const fileStream = createWriteStream(outPath);
                    res.pipe(fileStream);
                    fileStream.on('finish', () => {
                        resolve({
                            cd,
                            headers: res.headers,
                            write: async () => {} // Already written
                        });
                    });
                    fileStream.on('error', reject);
                });
                req.on('error', reject);
                req.end();
            });
        }
    }

    // Optionally try HEAD for filename only if not provided by user
    async function getCdHeader(url) {
        if (typeof fetch === 'function') {
            try {
                const headResp = await fetch(url, { method: 'HEAD' });
                return headResp.headers.get('content-disposition');
            } catch {
                return null;
            }
        } else {
            return await new Promise((resolve) => {
                const proto = url.startsWith('https') ? httpsRequest : httpRequest;
                const req = proto(url, { method: 'HEAD' }, (res) => {
                    resolve(res.headers['content-disposition']);
                });
                req.on('error', () => resolve(null));
                req.end();
            });
        }
    }

    try {
        let cdHeader = null;
        if (!fileName) {
            cdHeader = await getCdHeader(url);
            fileName = extractFilename(cdHeader, url);
        }

        const outputPath = path.join(userCwd, fileName);

        // Download and write to file
        const { cd, write } = await downloadToFile(url, outputPath);

        // If filename was not determined on HEAD, check again on GET
        if (!args[1] && !cdHeader && cd) {
            const realName = extractFilename(cd, url);
            if (realName && realName !== fileName) {
                const newPath = path.join(userCwd, realName);
                await fs.rename(outputPath, newPath);
                shell.print(`\nSaved to ${newPath}`);
                return newPath;
            }
        }

        await write();

        shell.print(`\nSaved to ${outputPath}`);
        return outputPath;

    } catch (e) {
        shell.print(`\nError: ${e.message}`);
    }
};
// yo