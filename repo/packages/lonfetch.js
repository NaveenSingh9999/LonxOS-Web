// repo/packages/lonfetch.js - System information display for Lonx OS

/**
 * LonFetch - System Information Display for Lonx OS
 * A neofetch clone that displays system information with LonxOS ASCII art
 * 
 * Features:
 * - LonxOS ASCII logo made with special characters
 * - System information (OS, kernel, uptime, etc.)
 * - Browser/device information
 * - Memory usage and performance metrics
 * - Colorful terminal output
 * - Customizable display options
 */

class LonFetch {
    constructor(lonx) {
        this.lonx = lonx;
        this.startTime = performance.now();
        
        // Color codes for terminal output
        this.colors = {
            reset: '\x1b[0m',
            bold: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            brightRed: '\x1b[91m',
            brightGreen: '\x1b[92m',
            brightYellow: '\x1b[93m',
            brightBlue: '\x1b[94m',
            brightMagenta: '\x1b[95m',
            brightCyan: '\x1b[96m',
            brightWhite: '\x1b[97m'
        };
        
        // LonxOS ASCII art logo
        this.logo = [
            `${this.colors.brightCyan}    ██╗      ██████╗ ███╗   ██╗██╗  ██╗     ██████╗ ███████╗`,
            `${this.colors.brightCyan}    ██║     ██╔═══██╗████╗  ██║╚██╗██╔╝    ██╔═══██╗██╔════╝`,
            `${this.colors.cyan}    ██║     ██║   ██║██╔██╗ ██║ ╚███╔╝     ██║   ██║███████╗`,
            `${this.colors.cyan}    ██║     ██║   ██║██║╚██╗██║ ██╔██╗     ██║   ██║╚════██║`,
            `${this.colors.blue}    ███████╗╚██████╔╝██║ ╚████║██╔╝ ██╗    ╚██████╔╝███████║`,
            `${this.colors.blue}    ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝`,
            `${this.colors.brightBlue}`,
            `${this.colors.brightMagenta}        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄`,
            `${this.colors.magenta}       ██ Web-Based Operating System Environment ██`,
            `${this.colors.magenta}        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`,
            `${this.colors.reset}`
        ];
    }

    async gatherSystemInfo() {
        const info = {};
        
        // Basic system information
        info.os = 'LonxOS Web';
        info.kernel = await this.getKernelVersion();
        info.uptime = this.getUptime();
        info.packages = await this.getPackageCount();
        info.shell = 'lonxsh (LonxOS Shell)';
        
        // Browser/device information
        info.browser = this.getBrowserInfo();
        info.device = this.getDeviceInfo();
        info.resolution = this.getScreenResolution();
        info.language = navigator.language || 'Unknown';
        
        // Performance information
        info.memory = this.getMemoryInfo();
        info.storage = await this.getStorageInfo();
        info.cpu = this.getCPUInfo();
        info.gpu = await this.getGPUInfo();
        
        // Network information
        info.connection = this.getConnectionInfo();
        info.online = navigator.onLine ? 'Online' : 'Offline';
        
        // LonxOS specific
        info.terminal = 'LonxOS Terminal Emulator';
        info.theme = 'Dark (LonxOS Default)';
        info.de = 'LonxOS Desktop Environment';
        info.wm = 'LonxOS Window Manager';
        
        return info;
    }

    async getKernelVersion() {
        try {
            // Try to get version from kernel module
            if (this.lonx.kernel && this.lonx.kernel.version) {
                return `LonxOS Kernel ${this.lonx.kernel.version}`;
            }
            return 'LonxOS Kernel 1.0.0-web';
        } catch (error) {
            return 'LonxOS Kernel (Unknown Version)';
        }
    }

    getUptime() {
        const uptimeMs = performance.now();
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async getPackageCount() {
        try {
            if (this.lonx.fs && this.lonx.fs.read) {
                const indexData = this.lonx.fs.read('/repo/index.json');
                if (indexData) {
                    const packages = JSON.parse(indexData);
                    return `${packages.length} (lonx)`;
                }
            }
            return '4 (lonx)'; // Default packages
        } catch (error) {
            return 'Unknown (lonx)';
        }
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown Browser';
        
        if (ua.includes('Chrome') && !ua.includes('Edg')) {
            const version = ua.match(/Chrome\/(\d+)/);
            browser = `Google Chrome ${version ? version[1] : ''}`;
        } else if (ua.includes('Firefox')) {
            const version = ua.match(/Firefox\/(\d+)/);
            browser = `Mozilla Firefox ${version ? version[1] : ''}`;
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const version = ua.match(/Version\/(\d+)/);
            browser = `Safari ${version ? version[1] : ''}`;
        } else if (ua.includes('Edg')) {
            const version = ua.match(/Edg\/(\d+)/);
            browser = `Microsoft Edge ${version ? version[1] : ''}`;
        }
        
        return browser;
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        
        if (/Android/i.test(ua)) {
            return 'Android Device';
        } else if (/iPhone|iPad|iPod/i.test(ua)) {
            return 'iOS Device';
        } else if (/Windows/i.test(ua)) {
            return 'Windows PC';
        } else if (/Mac/i.test(ua)) {
            return 'Mac';
        } else if (/Linux/i.test(ua)) {
            return 'Linux PC';
        }
        
        return 'Unknown Device';
    }

    getScreenResolution() {
        return `${screen.width}x${screen.height}`;
    }

    getMemoryInfo() {
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            const limit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
            return `${used}MB / ${total}MB (Limit: ${limit}MB)`;
        }
        return 'Unknown';
    }

    async getStorageInfo() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const used = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quota = Math.round((estimate.quota || 0) / 1024 / 1024);
                return `${used}MB / ${quota}MB`;
            }
        } catch (error) {
            // Fallback
        }
        return 'Unknown';
    }

    getCPUInfo() {
        const cores = navigator.hardwareConcurrency || 'Unknown';
        return `${cores} cores`;
    }

    async getGPUInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    return renderer || 'WebGL GPU';
                }
                return 'WebGL GPU';
            }
        } catch (error) {
            // Fallback
        }
        return 'Unknown GPU';
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            const type = conn.effectiveType || conn.type || 'Unknown';
            const downlink = conn.downlink ? `${conn.downlink}Mbps` : '';
            return downlink ? `${type} (${downlink})` : type;
        }
        return 'Unknown';
    }

    formatInfoLine(label, value, color = this.colors.white) {
        const labelColored = `${this.colors.bold}${this.colors.brightWhite}${label}${this.colors.reset}`;
        const valueColored = `${color}${value}${this.colors.reset}`;
        return `${labelColored}: ${valueColored}`;
    }

    async displaySystemInfo(options = {}) {
        const {
            showLogo = true,
            showColors = true,
            compact = false
        } = options;

        const info = await this.gatherSystemInfo();
        const output = [];

        if (showLogo) {
            // Display logo with system info side by side
            const logoLines = [...this.logo];
            const infoLines = [
                '',
                this.formatInfoLine('OS', info.os, this.colors.brightCyan),
                this.formatInfoLine('Kernel', info.kernel, this.colors.brightYellow),
                this.formatInfoLine('Uptime', info.uptime, this.colors.brightGreen),
                this.formatInfoLine('Packages', info.packages, this.colors.brightMagenta),
                this.formatInfoLine('Shell', info.shell, this.colors.brightBlue),
                this.formatInfoLine('Resolution', info.resolution, this.colors.brightRed),
                this.formatInfoLine('DE', info.de, this.colors.cyan),
                this.formatInfoLine('WM', info.wm, this.colors.magenta),
                this.formatInfoLine('Terminal', info.terminal, this.colors.green),
                this.formatInfoLine('CPU', info.cpu, this.colors.red),
                this.formatInfoLine('GPU', info.gpu, this.colors.yellow),
                this.formatInfoLine('Memory', info.memory, this.colors.blue),
                this.formatInfoLine('Storage', info.storage, this.colors.brightCyan),
                this.formatInfoLine('Browser', info.browser, this.colors.brightGreen),
                this.formatInfoLine('Device', info.device, this.colors.brightYellow),
                this.formatInfoLine('Network', info.connection, this.colors.brightMagenta),
                this.formatInfoLine('Status', info.online, this.colors.brightBlue),
                ''
            ];

            // Combine logo and info
            const maxLines = Math.max(logoLines.length, infoLines.length);
            for (let i = 0; i < maxLines; i++) {
                const logoLine = logoLines[i] || '';
                const infoLine = infoLines[i] || '';
                // Pad logo line to consistent width (60 chars)
                const paddedLogo = logoLine.padEnd(60 + (logoLine.length - logoLine.replace(/\x1b\[[0-9;]*m/g, '').length));
                output.push(`${paddedLogo}  ${infoLine}`);
            }

            // Add color palette if requested
            if (showColors) {
                output.push('');
                output.push('Colors:');
                const colorBar = [
                    this.colors.red, this.colors.brightRed,
                    this.colors.green, this.colors.brightGreen,
                    this.colors.yellow, this.colors.brightYellow,
                    this.colors.blue, this.colors.brightBlue,
                    this.colors.magenta, this.colors.brightMagenta,
                    this.colors.cyan, this.colors.brightCyan,
                    this.colors.white, this.colors.brightWhite
                ].map(color => `${color}██${this.colors.reset}`).join('');
                output.push(colorBar);
                output.push('');
            }

        } else {
            // Text-only mode
            output.push('LonxOS System Information');
            output.push('========================');
            Object.entries(info).forEach(([key, value]) => {
                output.push(this.formatInfoLine(key.charAt(0).toUpperCase() + key.slice(1), value));
            });
        }

        return output;
    }

    async displayCompactInfo() {
        const info = await this.gatherSystemInfo();
        return [
            `${this.colors.bold}${this.colors.brightCyan}LonxOS${this.colors.reset} ${info.kernel}`,
            `${this.colors.bold}Uptime:${this.colors.reset} ${info.uptime} | ${this.colors.bold}Packages:${this.colors.reset} ${info.packages}`,
            `${this.colors.bold}Browser:${this.colors.reset} ${info.browser} | ${this.colors.bold}Memory:${this.colors.reset} ${info.memory}`,
            `${this.colors.bold}Device:${this.colors.reset} ${info.device} | ${this.colors.bold}Resolution:${this.colors.reset} ${info.resolution}`
        ];
    }
}

async function main(args, lonx) {
    const lonfetch = new LonFetch(lonx);
    
    // Parse command line arguments
    let showLogo = true;
    let showColors = true;
    let compact = false;
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--help':
            case '-h':
                lonx.shell.print('LonFetch - System Information Display for LonxOS');
                lonx.shell.print('');
                lonx.shell.print('Usage: lonfetch [options]');
                lonx.shell.print('');
                lonx.shell.print('Options:');
                lonx.shell.print('  -h, --help       Show this help message');
                lonx.shell.print('  --no-logo        Hide the LonxOS ASCII logo');
                lonx.shell.print('  --no-colors      Disable color palette display');
                lonx.shell.print('  -c, --compact    Show compact information');
                lonx.shell.print('  --text-only      Text-only mode (no logo)');
                lonx.shell.print('');
                lonx.shell.print('Examples:');
                lonx.shell.print('  lonfetch                # Full display with logo');
                lonx.shell.print('  lonfetch --no-logo      # Info only, no logo');
                lonx.shell.print('  lonfetch -c             # Compact mode');
                lonx.shell.print('  lonfetch --text-only    # Plain text output');
                return;
                
            case '--no-logo':
            case '--text-only':
                showLogo = false;
                break;
                
            case '--no-colors':
                showColors = false;
                break;
                
            case '-c':
            case '--compact':
                compact = true;
                break;
        }
    }
    
    try {
        let output;
        
        if (compact) {
            output = await lonfetch.displayCompactInfo();
        } else {
            output = await lonfetch.displaySystemInfo({
                showLogo,
                showColors,
                compact
            });
        }
        
        // Display the output
        output.forEach(line => {
            lonx.shell.print(line);
        });
        
    } catch (error) {
        lonx.shell.print(`❌ Error generating system information: ${error.message}`);
    }
}

// Export for Lonx OS
export default main;

// yo
