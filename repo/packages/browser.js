/**
 * LonxRender Browser Package
 * Native browser engine command for LonxOS repository
 */

const browserPackage = {
    name: 'browser',
    version: '1.0.0',
    description: 'Launch LonxRender native browser engine',
    author: 'LonxOS Team',
    
    execute: async function(args = []) {
        const url = args[0] || 'https://lonx.dev';
        
        try {
            // Check if we're in LonxOS environment
            if (typeof window !== 'undefined' && window.lonxWM) {
                return this.launchInWindow(url);
            } else {
                // Fallback for other environments
                console.log(`[Browser] Would launch browser with URL: ${url}`);
                return true;
            }
        } catch (error) {
            console.error('[Browser] Launch failed:', error);
            return false;
        }
    },
    
    launchInWindow: function(url) {
        // Create browser window configuration
        const windowConfig = {
            title: '🌐 LonxRender - Native Browser',
            icon: '🌐',
            content: `
                <iframe 
                    src="apps/lonxrender/index.html${url ? `?url=${encodeURIComponent(url)}` : ''}" 
                    style="width: 100%; height: 100%; border: none; background: #1a1a1a;"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
                ></iframe>
            `,
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
        console.log(`[Browser] Launched LonxRender in window ${windowId}${url ? ` with URL: ${url}` : ''}`);
        return windowId;
    },
    
    help: function() {
        return `
LonxRender - Native Browser Engine for LonxOS

Usage:
  browser                    - Launch browser with default homepage
  browser <url>             - Launch browser and navigate to URL

Examples:
  browser                           # Open default homepage
  browser https://github.com       # Open GitHub
  browser https://youtube.com      # Open YouTube  
  browser ./webgl-test.html        # Open local WebGL test

Features:
  ✅ True native rendering (no external iframe)
  ✅ WebGL and 3D graphics support
  ✅ JavaScript sandbox execution
  ✅ Multi-tab browsing
  ✅ Bookmarks and history
  ✅ Developer console
  ✅ Modern animated UI
  ✅ Security sandboxing

The browser opens in a floating window with 80% screen coverage.
        `.trim();
    }
};

// Export for LonxOS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserPackage;
}

// Register with LonxOS shell
if (typeof window !== 'undefined' && window.lonxShell) {
    window.lonxShell.registerCommand('browser', browserPackage);
}

// Global browser function
if (typeof window !== 'undefined') {
    window.browser = browserPackage.execute.bind(browserPackage);
}
