#!/usr/bin/env node

/**
 * LonxRender Shell Command Integration
 * Allows launching browser from LonxOS shell: browser <url>
 */

const fs = require('fs');
const path = require('path');

class LonxRenderCommand {
    constructor() {
        this.appPath = path.join(__dirname);
        this.defaultUrl = 'https://lonx.dev';
    }

    async execute(args = []) {
        const url = args[0] || this.defaultUrl;
        
        try {
            // Check if we're running in LonxOS environment
            if (typeof window !== 'undefined' && window.lonxWM) {
                return this.launchInLonxOS(url);
            } else {
                return this.launchStandalone(url);
            }
        } catch (error) {
            console.error('[LonxRender] Launch failed:', error);
            return false;
        }
    }

    launchInLonxOS(url) {
        // Launch using LonxOS Window Manager
        const windowConfig = {
            title: '🌐 LonxRender - Native Browser',
            icon: '🌐',
            url: `${this.appPath}/index.html${url ? `?url=${encodeURIComponent(url)}` : ''}`,
            width: Math.floor(window.innerWidth * 0.8),
            height: Math.floor(window.innerHeight * 0.8),
            x: Math.floor(window.innerWidth * 0.1),
            y: Math.floor(window.innerHeight * 0.1),
            resizable: true,
            minimizable: true,
            maximizable: true,
            closable: true
        };

        const windowId = window.lonxWM.createWindow(windowConfig);
        
        console.log(`[LonxRender] Launched in window ${windowId}${url ? ` with URL: ${url}` : ''}`);
        return windowId;
    }

    launchStandalone(url) {
        // Launch in standalone mode (for testing outside LonxOS)
        const indexPath = path.join(this.appPath, 'index.html');
        const fullUrl = url ? `${indexPath}?url=${encodeURIComponent(url)}` : indexPath;
        
        console.log(`[LonxRender] Opening: ${fullUrl}`);
        
        // Try to open in default browser
        const { exec } = require('child_process');
        const command = process.platform === 'darwin' ? 'open' : 
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        
        exec(`${command} "${fullUrl}"`, (error) => {
            if (error) {
                console.error('[LonxRender] Failed to open browser:', error);
                return false;
            }
        });
        
        return true;
    }

    showHelp() {
        console.log(`
LonxRender - Native Browser Engine for LonxOS

Usage:
  browser                    - Launch browser with default homepage
  browser <url>             - Launch browser and navigate to URL
  browser --help            - Show this help message

Examples:
  browser                           # Open homepage
  browser https://github.com       # Open GitHub
  browser ./webgl-test.html        # Open local WebGL test
  browser https://youtube.com      # Open YouTube

Features:
  ✅ True native rendering (no iframe)
  ✅ WebGL support
  ✅ JavaScript sandbox execution
  ✅ Tab management
  ✅ Bookmarks and history
  ✅ Developer console
  ✅ Modern UI with animations

Browser runs in floating window with 80% screen coverage.
        `);
    }
}

// Command-line interface
if (require.main === module) {
    const command = new LonxRenderCommand();
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        command.showHelp();
    } else {
        command.execute(args);
    }
}

// Export for LonxOS integration
module.exports = LonxRenderCommand;

// Global browser command for LonxOS shell
if (typeof global !== 'undefined') {
    global.browserCommand = function(url) {
        const command = new LonxRenderCommand();
        return command.execute([url]);
    };
}

// Window object integration for web-based LonxOS
if (typeof window !== 'undefined') {
    window.browserCommand = function(url) {
        const command = new LonxRenderCommand();
        return command.execute([url]);
    };
    
    // Register with LonxOS shell if available
    if (window.lonxShell && window.lonxShell.registerCommand) {
        window.lonxShell.registerCommand('browser', {
            description: 'Launch LonxRender native browser',
            usage: 'browser [url]',
            execute: function(args) {
                const command = new LonxRenderCommand();
                return command.execute(args);
            }
        });
    }
}
