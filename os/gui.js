// LonxOS GUI API - Interface for applications to create windows
// This provides the lonx.gui object that apps can use

import { initWindowManager } from './lwm.js';

class LonxGUI {
    constructor(windowManager = null) {
        this.wm = windowManager;
        this.initialized = !!windowManager;
    }

    init() {
        if (!this.initialized) {
            this.wm = initWindowManager();
            this.initialized = true;
            console.log('[GUI] LonxOS GUI API initialized');
        }
        return this.wm;
    }

    // Main API method for creating windows
    createWindow(config = {}) {
        if (!this.initialized) {
            this.init();
        }

        // Validate and prepare config
        const windowConfig = {
            title: config.title || 'Untitled',
            icon: config.icon || 'lx',
            url: config.url || 'about:blank',
            width: Math.max(300, config.width || 800),
            height: Math.max(200, config.height || 600),
            x: config.x || null,
            y: config.y || null,
            resizable: config.resizable !== false,
            minimizable: config.minimizable !== false,
            maximizable: config.maximizable !== false,
            closable: config.closable !== false,
            content: config.content || null
        };

        // Handle different content types
        if (windowConfig.content && !windowConfig.url) {
            // Create data URL for inline content
            windowConfig.url = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${windowConfig.title}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fff;
            color: #333;
        }
        h1, h2, h3 { color: #007AFF; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        ${windowConfig.content}
    </div>
</body>
</html>
            `)}`;
        }

        return this.wm.createWindow(windowConfig);
    }

    // Create specialized window types
    createTextWindow(title, content) {
        return this.createWindow({
            title,
            content: `<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace;">${content}</pre>`,
            width: 600,
            height: 400
        });
    }

    createHTMLWindow(title, html) {
        return this.createWindow({
            title,
            content: html,
            width: 800,
            height: 600
        });
    }

    createAppWindow(appPath, config = {}) {
        const appConfig = {
            ...config,
            url: appPath,
            title: config.title || appPath.split('/').pop().replace('.html', '')
        };
        return this.createWindow(appConfig);
    }

    // Window management methods
    closeWindow(windowId) {
        return this.wm?.closeWindow(windowId);
    }

    focusWindow(windowId) {
        return this.wm?.focusWindow(windowId);
    }

    minimizeWindow(windowId) {
        return this.wm?.minimizeWindow(windowId);
    }

    maximizeWindow(windowId) {
        return this.wm?.maximizeWindow(windowId);
    }

    restoreWindow(windowId) {
        return this.wm?.restoreWindow(windowId);
    }

    getAllWindows() {
        return this.wm?.getAllWindows() || [];
    }

    isFullscreenMode() {
        return this.wm?.isFullscreenMode() || false;
    }

    toggleFullscreenMode() {
        return this.wm?.toggleFullscreenMode();
    }

    // Fullscreen management
    toggleFullscreen(windowId) {
        return this.wm?.toggleFullscreen(windowId);
    }

    // Desktop integration
    showDesktop() {
        return this.wm?.showDesktop();
    }

    // Quick window creation shortcuts
    alert(message, title = 'Alert') {
        return this.createWindow({
            title,
            content: `
                <div style="text-align: center; padding: 40px;">
                    <h2>⚠️ ${title}</h2>
                    <p style="font-size: 16px; margin: 20px 0;">${message}</p>
                    <button onclick="window.parent.lwm.closeWindow('${this.createWindow.windowId}')" 
                            style="padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        OK
                    </button>
                </div>
            `,
            width: 400,
            height: 250,
            resizable: false,
            maximizable: false
        });
    }

    confirm(message, title = 'Confirm', callback = null) {
        const windowId = this.createWindow({
            title,
            content: `
                <div style="text-align: center; padding: 40px;">
                    <h2>❓ ${title}</h2>
                    <p style="font-size: 16px; margin: 20px 0;">${message}</p>
                    <div style="margin-top: 30px;">
                        <button onclick="window.parent.postMessage({action: 'confirm', result: true, windowId: '${windowId}'}, '*')" 
                                style="padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                            Yes
                        </button>
                        <button onclick="window.parent.postMessage({action: 'confirm', result: false, windowId: '${windowId}'}, '*')" 
                                style="padding: 10px 20px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            No
                        </button>
                    </div>
                </div>
            `,
            width: 400,
            height: 250,
            resizable: false,
            maximizable: false
        });

        // Listen for response
        if (callback) {
            const messageHandler = (event) => {
                if (event.data.action === 'confirm' && event.data.windowId === windowId) {
                    callback(event.data.result);
                    this.closeWindow(windowId);
                    window.removeEventListener('message', messageHandler);
                }
            };
            window.addEventListener('message', messageHandler);
        }

        return windowId;
    }

    // File picker window
    showFilePicker(callback, filter = '*') {
        return this.createWindow({
            title: 'Select File',
            content: `
                <div style="padding: 20px;">
                    <h3>📁 Select a file</h3>
                    <div id="file-list" style="border: 1px solid #ddd; height: 300px; overflow-y: auto; padding: 10px; margin: 10px 0;">
                        Loading files...
                    </div>
                    <div style="text-align: right; margin-top: 10px;">
                        <button onclick="window.parent.lwm.closeWindow('${this.createWindow.windowId}')" 
                                style="padding: 8px 16px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                            Cancel
                        </button>
                        <button onclick="selectFile()" 
                                style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Select
                        </button>
                    </div>
                </div>
                <script>
                    // File picker logic would go here
                    function selectFile() {
                        // Implementation for file selection
                    }
                </script>
            `,
            width: 500,
            height: 450
        });
    }
}

// Initialize GUI API
export function createGUIAPI(windowManager) {
    return new LonxGUI(windowManager);
}

export { LonxGUI };
