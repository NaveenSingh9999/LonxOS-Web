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
        
        // Test servers that work well with CORS proxies
        this.testServers = [
            {
                name: 'HTTPBin',
                downloadUrl: 'https://httpbin.org/bytes/',
                uploadUrl: 'https://httpbin.org/post',
                pingUrl: 'https://httpbin.org/status/200'
            },
            {
                name: 'JSONPlaceholder',
                downloadUrl: 'https://jsonplaceholder.typicode.com/photos',
                pingUrl: 'https://jsonplaceholder.typicode.com/posts/1'
            },
            {
                name: 'GitHub API',
                downloadUrl: 'https://api.github.com/repos/microsoft/vscode/releases',
                pingUrl: 'https://api.github.com/zen'
            },
            {
                name: 'Random Data',
                downloadUrl: 'https://random-data-api.com/api/v2/users?size=1000',
                pingUrl: 'https://random-data-api.com/api/v2/users?size=1'
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
        
        this.lonx.shell.print(`   Testing ping to ${server.name}...`);
        
        for (let i = 0; i < 3; i++) {
            try {
                // Use Lonx OS network module for ping
                const latency = await this.lonx.net.ping(server.pingUrl);
                
                if (latency > 0) {
                    measurements.push(latency);
                    this.lonx.shell.print(`   Ping ${i + 1}/3: ${latency}ms`);
                } else {
                    this.lonx.shell.print(`   Ping ${i + 1}/3: Failed`);
                }
                
            } catch (error) {
                this.lonx.shell.print(`   Ping ${i + 1}/3: Error - ${error.message}`);
            }
            
            // Small delay between pings
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (measurements.length === 0) {
            throw new Error('All ping attempts failed');
        }
        
        // Return average ping
        return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    }

    async testDownloadSpeed(serverIndex = 0, duration = 10) {
        const server = this.testServers[serverIndex];
        let totalBytes = 0;
        const startTime = performance.now();
        const endTime = startTime + (duration * 1000);
        
        this.lonx.shell.print(`   Testing download from ${server.name}...`);
        
        let iteration = 0;
        
        while (performance.now() < endTime && !this.abortController.signal.aborted && iteration < 5) {
            try {
                const testStartTime = performance.now();
                iteration++;
                
                // Construct download URL with cache buster
                let downloadUrl;
                if (server.name === 'HTTPBin') {
                    // Request different sized random data
                    const size = Math.min(1000000 + (iteration * 500000), 5000000); // 1MB to 5MB
                    downloadUrl = server.downloadUrl + size;
                } else {
                    // Add cache buster for other APIs
                    downloadUrl = server.downloadUrl + '?t=' + Date.now() + '&iter=' + iteration;
                }
                
                this.lonx.shell.print(`   Download attempt ${iteration}/5: ${downloadUrl.substring(0, 50)}...`);
                
                // Use Lonx OS network module
                const response = await this.lonx.net.tryFetch(downloadUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
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
                    
                    if (performance.now() >= endTime) break;
                }
                
                const testDuration = (performance.now() - testStartTime) / 1000;
                const testSpeed = chunkBytes / testDuration;
                this.lonx.shell.print(`   Downloaded ${this.formatBytes(chunkBytes)} in ${testDuration.toFixed(1)}s (${this.formatSpeed(testSpeed)})`);
                
                // Short delay between iterations
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                if (error.name === 'AbortError') break;
                this.lonx.shell.print(`   Download attempt ${iteration} failed: ${error.message}`);
                
                // Try to continue with other iterations
                if (totalBytes === 0 && iteration >= 3) {
                    throw new Error(`Failed to download after ${iteration} attempts: ${error.message}`);
                }
            }
        }
        
        if (totalBytes === 0) {
            throw new Error('No data downloaded successfully');
        }
        
        const totalDuration = (performance.now() - startTime) / 1000;
        return totalBytes / totalDuration; // bytes per second
    }

    async testUploadSpeed(serverIndex = 0, duration = 10) {
        const server = this.testServers[serverIndex];
        
        if (!server.uploadUrl) {
            this.lonx.shell.print(`   Upload test not supported for ${server.name}`);
            return 0;
        }
        
        let totalBytes = 0;
        const startTime = performance.now();
        const endTime = startTime + (duration * 1000);
        
        this.lonx.shell.print(`   Testing upload to ${server.name}...`);
        
        let iteration = 0;
        let testDataSize = 50000; // Start with 50KB
        
        while (performance.now() < endTime && !this.abortController.signal.aborted && iteration < 3) {
            try {
                const testData = this.generateTestData(testDataSize);
                const testStartTime = performance.now();
                iteration++;
                
                this.lonx.shell.print(`   Upload attempt ${iteration}/3: Sending ${this.formatBytes(testDataSize)}...`);
                
                // Create form data for upload
                const formData = new FormData();
                formData.append('data', new Blob([testData]), 'speedtest.bin');
                formData.append('size', testDataSize.toString());
                formData.append('timestamp', Date.now().toString());
                
                // Use Lonx OS network module for upload
                const response = await this.lonx.net.tryFetch(server.uploadUrl, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Read response to complete the upload
                await response.text();
                
                totalBytes += testDataSize;
                
                const testDuration = (performance.now() - testStartTime) / 1000;
                const testSpeed = testDataSize / testDuration;
                this.lonx.shell.print(`   Uploaded ${this.formatBytes(testDataSize)} in ${testDuration.toFixed(1)}s (${this.formatSpeed(testSpeed)})`);
                
                // Increase size for next iteration
                testDataSize = Math.min(testDataSize * 2, 500000); // Max 500KB
                
                // Short delay between iterations
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                if (error.name === 'AbortError') break;
                this.lonx.shell.print(`   Upload attempt ${iteration} failed: ${error.message}`);
                
                // Try to continue with smaller size
                testDataSize = Math.max(testDataSize / 2, 10000);
                
                if (totalBytes === 0 && iteration >= 2) {
                    this.lonx.shell.print(`   Upload test failed after ${iteration} attempts`);
                    return 0;
                }
            }
        }
        
        if (totalBytes === 0) {
            this.lonx.shell.print(`   No data uploaded successfully`);
            return 0;
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
        
        // Use Lonx shell print instead of process.stdout
        this.lonx.shell.print(`   ${type}: ${progressBar} ${speedStr} (${elapsed.toFixed(1)}s)`);
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
