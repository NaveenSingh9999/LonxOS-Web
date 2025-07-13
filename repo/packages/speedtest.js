// repo/packages/speedtest.js - Internet Speed Test for Lonx OS

/**
 * Internet Speed Test Module for Lonx OS
 * Measures real download speed, upload speed, and ping latency
 * 
 * Features:
 * - Real download speed measurement using test files
 * - Upload speed test using POST requests
 * - Ping/latency measurement
 * - Multiple server endpoints for accuracy
 * - Real-time progress display
 * - Bandwidth usage calculation
 */

class SpeedTest {
    constructor(lonx) {
        this.lonx = lonx;
        this.isRunning = false;
        this.abortController = null;
        
        // Test servers with different file sizes
        this.testServers = [
            {
                name: 'CloudFlare',
                downloadUrl: 'https://speed.cloudflare.com/__down?bytes=',
                uploadUrl: 'https://speed.cloudflare.com/__up',
                pingUrl: 'https://speed.cloudflare.com/cdn-cgi/trace'
            },
            {
                name: 'Fast.com (Netflix)',
                downloadUrl: 'https://api.fast.com/netflix/speedtest/v2/download',
                pingUrl: 'https://api.fast.com/netflix/speedtest/v2/ping'
            },
            {
                name: 'Google',
                downloadUrl: 'https://storage.googleapis.com/gcp-public-data-landsat/speedtest/speedtest-',
                pingUrl: 'https://www.google.com/generate_204'
            },
            {
                name: 'LibreSpeed',
                downloadUrl: 'https://librespeed.org/backend/garbage.php?ckSize=',
                uploadUrl: 'https://librespeed.org/backend/empty.php',
                pingUrl: 'https://librespeed.org/backend/empty.php'
            }
        ];
        
        // Test file sizes in bytes
        this.testSizes = {
            small: 1024 * 1024,      // 1MB
            medium: 5 * 1024 * 1024, // 5MB
            large: 10 * 1024 * 1024, // 10MB
            xlarge: 25 * 1024 * 1024 // 25MB
        };
    }

    async runSpeedTest(options = {}) {
        const {
            testDownload = true,
            testUpload = true,
            testPing = true,
            serverIndex = 0,
            duration = 10 // seconds
        } = options;

        this.isRunning = true;
        this.abortController = new AbortController();
        
        const results = {
            ping: null,
            downloadSpeed: null,
            uploadSpeed: null,
            server: this.testServers[serverIndex].name,
            timestamp: new Date().toISOString()
        };

        try {
            this.lonx.shell.print('🌐 Starting Internet Speed Test...');
            this.lonx.shell.print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            if (testPing) {
                this.lonx.shell.print('📡 Testing ping/latency...');
                results.ping = await this.testPing(serverIndex);
                this.lonx.shell.print(`   Ping: ${results.ping.toFixed(1)} ms`);
                this.lonx.shell.print('');
            }

            if (testDownload) {
                this.lonx.shell.print('⬇️  Testing download speed...');
                results.downloadSpeed = await this.testDownloadSpeed(serverIndex, duration);
                this.lonx.shell.print(`   Download: ${this.formatSpeed(results.downloadSpeed)}`);
                this.lonx.shell.print('');
            }

            if (testUpload) {
                this.lonx.shell.print('⬆️  Testing upload speed...');
                results.uploadSpeed = await this.testUploadSpeed(serverIndex, duration);
                this.lonx.shell.print(`   Upload: ${this.formatSpeed(results.uploadSpeed)}`);
                this.lonx.shell.print('');
            }

            this.displayResults(results);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.lonx.shell.print('❌ Speed test cancelled by user');
            } else {
                this.lonx.shell.print(`❌ Speed test failed: ${error.message}`);
            }
        } finally {
            this.isRunning = false;
            this.abortController = null;
        }

        return results;
    }

    async testPing(serverIndex = 0) {
        const server = this.testServers[serverIndex];
        const measurements = [];
        
        for (let i = 0; i < 5; i++) {
            const startTime = performance.now();
            
            try {
                await fetch(server.pingUrl, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: this.abortController.signal,
                    cache: 'no-cache'
                });
                
                const endTime = performance.now();
                measurements.push(endTime - startTime);
                
            } catch (error) {
                if (error.name !== 'AbortError') {
                    // Fallback ping method
                    const img = new Image();
                    const startTime = performance.now();
                    
                    await new Promise((resolve, reject) => {
                        img.onload = img.onerror = () => {
                            const endTime = performance.now();
                            measurements.push(endTime - startTime);
                            resolve();
                        };
                        
                        setTimeout(() => reject(new Error('Ping timeout')), 5000);
                        img.src = server.pingUrl + '?t=' + Date.now();
                    });
                }
            }
            
            // Small delay between pings
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Return average ping, excluding outliers
        measurements.sort((a, b) => a - b);
        const middle = measurements.slice(1, -1);
        return middle.reduce((sum, val) => sum + val, 0) / middle.length;
    }

    async testDownloadSpeed(serverIndex = 0, duration = 10) {
        const server = this.testServers[serverIndex];
        let totalBytes = 0;
        const startTime = performance.now();
        const endTime = startTime + (duration * 1000);
        
        // Start with medium size and adjust based on speed
        let currentSize = this.testSizes.medium;
        
        while (performance.now() < endTime && !this.abortController.signal.aborted) {
            try {
                const testStartTime = performance.now();
                
                // Construct download URL
                let downloadUrl;
                if (server.name === 'CloudFlare') {
                    downloadUrl = server.downloadUrl + currentSize;
                } else if (server.name === 'LibreSpeed') {
                    downloadUrl = server.downloadUrl + currentSize;
                } else if (server.name === 'Google') {
                    downloadUrl = server.downloadUrl + Math.floor(currentSize / (1024 * 1024)) + 'MB.bin';
                } else {
                    downloadUrl = server.downloadUrl;
                }
                
                const response = await fetch(downloadUrl, {
                    signal: this.abortController.signal,
                    cache: 'no-cache'
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                // Read response in chunks to measure progress
                const reader = response.body.getReader();
                let chunkBytes = 0;
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    chunkBytes += value.length;
                    totalBytes += value.length;
                    
                    // Update progress
                    const elapsed = (performance.now() - startTime) / 1000;
                    const currentSpeed = totalBytes / elapsed;
                    this.updateProgress('Download', currentSpeed, elapsed, duration);
                    
                    if (performance.now() >= endTime) break;
                }
                
                // Adjust size for next iteration based on download time
                const testDuration = (performance.now() - testStartTime) / 1000;
                if (testDuration < 2) {
                    currentSize = Math.min(currentSize * 2, this.testSizes.xlarge);
                } else if (testDuration > 5) {
                    currentSize = Math.max(currentSize / 2, this.testSizes.small);
                }
                
            } catch (error) {
                if (error.name === 'AbortError') break;
                throw error;
            }
        }
        
        const totalDuration = (performance.now() - startTime) / 1000;
        return totalBytes / totalDuration; // bytes per second
    }

    async testUploadSpeed(serverIndex = 0, duration = 10) {
        const server = this.testServers[serverIndex];
        
        if (!server.uploadUrl) {
            throw new Error('Upload test not supported for this server');
        }
        
        let totalBytes = 0;
        const startTime = performance.now();
        const endTime = startTime + (duration * 1000);
        
        // Generate test data
        let testDataSize = this.testSizes.small;
        
        while (performance.now() < endTime && !this.abortController.signal.aborted) {
            try {
                const testData = this.generateTestData(testDataSize);
                const testStartTime = performance.now();
                
                const response = await fetch(server.uploadUrl, {
                    method: 'POST',
                    body: testData,
                    signal: this.abortController.signal,
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                totalBytes += testDataSize;
                
                // Update progress
                const elapsed = (performance.now() - startTime) / 1000;
                const currentSpeed = totalBytes / elapsed;
                this.updateProgress('Upload', currentSpeed, elapsed, duration);
                
                // Adjust size for next iteration
                const testDuration = (performance.now() - testStartTime) / 1000;
                if (testDuration < 2) {
                    testDataSize = Math.min(testDataSize * 1.5, this.testSizes.large);
                } else if (testDuration > 5) {
                    testDataSize = Math.max(testDataSize / 1.5, this.testSizes.small);
                }
                
            } catch (error) {
                if (error.name === 'AbortError') break;
                throw error;
            }
        }
        
        const totalDuration = (performance.now() - startTime) / 1000;
        return totalBytes / totalDuration; // bytes per second
    }

    generateTestData(size) {
        // Generate random binary data for upload test
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);
        
        // Fill with random data
        for (let i = 0; i < size; i++) {
            view[i] = Math.floor(Math.random() * 256);
        }
        
        return buffer;
    }

    updateProgress(type, speed, elapsed, total) {
        const progress = Math.min((elapsed / total) * 100, 100);
        const progressBar = this.createProgressBar(progress);
        const speedStr = this.formatSpeed(speed);
        
        // Clear previous line and show progress
        process.stdout.write(`\r   ${type}: ${progressBar} ${speedStr} (${elapsed.toFixed(1)}s)`);
    }

    createProgressBar(percentage, width = 30) {
        const filled = Math.floor((percentage / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage.toFixed(1)}%`;
    }

    formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond) return 'N/A';
        
        const bits = bytesPerSecond * 8;
        
        if (bits >= 1000000000) {
            return (bits / 1000000000).toFixed(2) + ' Gbps';
        } else if (bits >= 1000000) {
            return (bits / 1000000).toFixed(2) + ' Mbps';
        } else if (bits >= 1000) {
            return (bits / 1000).toFixed(2) + ' Kbps';
        } else {
            return bits.toFixed(0) + ' bps';
        }
    }

    formatBytes(bytes) {
        if (!bytes) return 'N/A';
        
        if (bytes >= 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return bytes + ' B';
        }
    }

    displayResults(results) {
        this.lonx.shell.print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.lonx.shell.print('🎯 SPEED TEST RESULTS');
        this.lonx.shell.print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.lonx.shell.print(`📡 Server: ${results.server}`);
        this.lonx.shell.print(`⏰ Tested at: ${new Date(results.timestamp).toLocaleString()}`);
        this.lonx.shell.print('');
        
        if (results.ping !== null) {
            this.lonx.shell.print(`🏓 Ping: ${results.ping.toFixed(1)} ms`);
        }
        
        if (results.downloadSpeed !== null) {
            this.lonx.shell.print(`⬇️  Download: ${this.formatSpeed(results.downloadSpeed)}`);
        }
        
        if (results.uploadSpeed !== null) {
            this.lonx.shell.print(`⬆️  Upload: ${this.formatSpeed(results.uploadSpeed)}`);
        }
        
        this.lonx.shell.print('');
        this.lonx.shell.print('💡 Tips:');
        this.lonx.shell.print('   • Close other apps/tabs for accurate results');
        this.lonx.shell.print('   • Test multiple times for consistency');
        this.lonx.shell.print('   • Use different servers to compare');
        this.lonx.shell.print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    listServers() {
        this.lonx.shell.print('Available Speed Test Servers:');
        this.lonx.shell.print('');
        
        this.testServers.forEach((server, index) => {
            this.lonx.shell.print(`  ${index}: ${server.name}`);
        });
    }

    stop() {
        if (this.isRunning && this.abortController) {
            this.abortController.abort();
            this.lonx.shell.print('\n⏹️  Speed test stopped by user');
        }
    }
}

async function main(args, lonx) {
    const speedTest = new SpeedTest(lonx);
    
    // Parse command line arguments
    let testDownload = true;
    let testUpload = true;
    let testPing = true;
    let serverIndex = 0;
    let duration = 10;
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--help':
            case '-h':
                lonx.shell.print('Internet Speed Test - Test your connection speed');
                lonx.shell.print('');
                lonx.shell.print('Usage: speedtest [options]');
                lonx.shell.print('');
                lonx.shell.print('Options:');
                lonx.shell.print('  -h, --help           Show this help message');
                lonx.shell.print('  -l, --list           List available servers');
                lonx.shell.print('  -s, --server <id>    Use specific server (0-3)');
                lonx.shell.print('  -d, --download-only  Test download speed only');
                lonx.shell.print('  -u, --upload-only    Test upload speed only');
                lonx.shell.print('  -p, --ping-only      Test ping only');
                lonx.shell.print('  -t, --time <sec>     Test duration in seconds (default: 10)');
                lonx.shell.print('  --no-download        Skip download test');
                lonx.shell.print('  --no-upload          Skip upload test');
                lonx.shell.print('  --no-ping            Skip ping test');
                lonx.shell.print('');
                lonx.shell.print('Examples:');
                lonx.shell.print('  speedtest                    # Full speed test');
                lonx.shell.print('  speedtest -s 1               # Use server 1');
                lonx.shell.print('  speedtest -d                 # Download only');
                lonx.shell.print('  speedtest -t 30              # 30-second test');
                return;
                
            case '--list':
            case '-l':
                speedTest.listServers();
                return;
                
            case '--server':
            case '-s':
                serverIndex = parseInt(args[++i]) || 0;
                break;
                
            case '--download-only':
            case '-d':
                testUpload = false;
                testPing = false;
                break;
                
            case '--upload-only':
            case '-u':
                testDownload = false;
                testPing = false;
                break;
                
            case '--ping-only':
            case '-p':
                testDownload = false;
                testUpload = false;
                break;
                
            case '--time':
            case '-t':
                duration = parseInt(args[++i]) || 10;
                break;
                
            case '--no-download':
                testDownload = false;
                break;
                
            case '--no-upload':
                testUpload = false;
                break;
                
            case '--no-ping':
                testPing = false;
                break;
        }
    }
    
    // Validate server index
    if (serverIndex < 0 || serverIndex >= speedTest.testServers.length) {
        lonx.shell.print(`❌ Invalid server index. Use 0-${speedTest.testServers.length - 1}`);
        return;
    }
    
    // Set up Ctrl+C handler to stop test
    const originalHandler = lonx.shell.onKeyPress;
    lonx.shell.onKeyPress = (key) => {
        if (key === 'Ctrl+C' && speedTest.isRunning) {
            speedTest.stop();
            return;
        }
        if (originalHandler) originalHandler(key);
    };
    
    try {
        await speedTest.runSpeedTest({
            testDownload,
            testUpload,
            testPing,
            serverIndex,
            duration
        });
    } finally {
        // Restore original key handler
        lonx.shell.onKeyPress = originalHandler;
    }
}

// Export for Lonx OS
export default main;

// yo
