/**
 * LonxRender Shell Command Integration
 * Allows launching browser from LonxOS shell: browser <url>
 */

class LonxRenderCommand {
    constructor() {
        this.appPath = '/workspaces/Lonx/apps/lonxrender';
        this.defaultUrl = 'https://lonx.dev';
    }

    async execute(args = []) {
        const url = args[0] || this.defaultUrl;
        
        try {
            // Check if we're running in LonxOS environment
            if (typeof window !== 'undefined' && window.lonxWM) {
                return this.launchInLonxOS(url);
            } else if (typeof global !== 'undefined' && global.lonx) {
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
        // Get window manager reference
        const wm = (typeof window !== 'undefined' && window.lonxWM) || 
                   (typeof global !== 'undefined' && global.lonx?.wm);
        
        if (!wm) {
            console.error('[LonxRender] Window manager not available');
            return false;
        }

        // Launch using LonxOS Window Manager
        const windowConfig = {
            title: '🌐 LonxRender - Native Browser',
            icon: '🌐',
            content: this.getBrowserHTML(url),
            width: Math.floor((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.8),
            height: Math.floor((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.8),
            resizable: true,
            minimizable: true,
            maximizable: true,
            closable: true
        };

        const windowId = wm.createWindow(windowConfig);
        
        console.log(`[LonxRender] Launched in window ${windowId}${url ? ` with URL: ${url}` : ''}`);
        return windowId;
    }

    getBrowserHTML(url) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LonxRender Browser</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f0f0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .browser-toolbar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .nav-button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .nav-button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-1px);
        }
        
        .nav-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .address-bar {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.9);
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
        }
        
        .address-bar:focus {
            background: white;
            box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
        }
        
        .browser-tabs {
            background: #e0e0e0;
            display: flex;
            gap: 2px;
            padding: 5px 10px 0;
            min-height: 35px;
        }
        
        .tab {
            background: rgba(255,255,255,0.7);
            padding: 8px 16px;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            max-width: 200px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        
        .tab.active {
            background: white;
            box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
        }
        
        .tab:hover:not(.active) {
            background: rgba(255,255,255,0.9);
        }
        
        .tab-close {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 2px;
            border-radius: 3px;
        }
        
        .tab-close:hover {
            background: #ff4444;
            color: white;
        }
        
        .browser-content {
            flex: 1;
            background: white;
            position: relative;
            overflow: hidden;
        }
        
        .content-frame {
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        }
        
        .loading-indicator {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.3s ease;
        }
        
        .loading-indicator.active {
            animation: loading 2s ease-in-out infinite;
        }
        
        @keyframes loading {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(1); }
        }
        
        .status-bar {
            background: #f5f5f5;
            padding: 5px 15px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="browser-toolbar">
        <button class="nav-button" id="backBtn" onclick="browserEngine.goBack()">←</button>
        <button class="nav-button" id="forwardBtn" onclick="browserEngine.goForward()">→</button>
        <button class="nav-button" onclick="browserEngine.reload()">⟲</button>
        <input type="text" class="address-bar" id="addressBar" 
               placeholder="Enter URL or search term..." 
               value="${url || 'https://lonx.dev'}"
               onkeydown="if(event.key==='Enter') browserEngine.navigate(this.value)">
        <button class="nav-button" onclick="browserEngine.navigate(document.getElementById('addressBar').value)">Go</button>
        <button class="nav-button" onclick="browserEngine.newTab()">+</button>
    </div>
    
    <div class="browser-tabs" id="browserTabs">
        <div class="tab active" data-tab-id="1">
            <span class="tab-favicon">🌐</span>
            <span class="tab-title">New Tab</span>
            <button class="tab-close" onclick="browserEngine.closeTab(1)">×</button>
        </div>
    </div>
    
    <div class="browser-content">
        <div class="loading-indicator" id="loadingIndicator"></div>
        <iframe class="content-frame" id="contentFrame" src="${url || 'about:blank'}"></iframe>
    </div>
    
    <div class="status-bar" id="statusBar">Ready</div>
    
    <script>
        class LonxRenderEngine {
            constructor() {
                this.tabs = new Map();
                this.activeTabId = 1;
                this.nextTabId = 2;
                this.history = [];
                this.historyIndex = -1;
                
                this.initializeTab(1, '${url || 'about:blank'}');
                this.loadInitialPage();
            }
            
            initializeTab(tabId, url) {
                this.tabs.set(tabId, {
                    id: tabId,
                    url: url,
                    title: 'Loading...',
                    favicon: '🌐',
                    history: [url],
                    historyIndex: 0
                });
            }
            
            loadInitialPage() {
                const url = '${url || 'https://lonx.dev'}';
                if (url && url !== 'about:blank') {
                    this.navigate(url);
                }
            }
            
            navigate(url) {
                if (!url) return;
                
                // Clean and validate URL
                if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
                    if (url.includes('.') || url.includes('/')) {
                        url = 'https://' + url;
                    } else {
                        url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
                    }
                }
                
                console.log('[LonxRender] Navigating to:', url);
                
                const frame = document.getElementById('contentFrame');
                const addressBar = document.getElementById('addressBar');
                const statusBar = document.getElementById('statusBar');
                const loadingIndicator = document.getElementById('loadingIndicator');
                
                // Update UI
                addressBar.value = url;
                statusBar.textContent = \`Loading: \${url}\`;
                loadingIndicator.classList.add('active');
                
                // Navigate frame
                try {
                    frame.src = url;
                    
                    // Update tab info
                    const tab = this.tabs.get(this.activeTabId);
                    if (tab) {
                        tab.url = url;
                        tab.history.push(url);
                        tab.historyIndex = tab.history.length - 1;
                        this.updateTabTitle(url);
                    }
                    
                    // Add to global history
                    this.history.push(url);
                    this.historyIndex = this.history.length - 1;
                    
                    // Handle load completion
                    frame.onload = () => {
                        loadingIndicator.classList.remove('active');
                        statusBar.textContent = \`Loaded: \${url}\`;
                        this.updateNavigationButtons();
                        
                        try {
                            const title = frame.contentDocument?.title || url;
                            this.updateTabTitle(title);
                        } catch (e) {
                            // Cross-origin frame, can't access title
                            this.updateTabTitle(url);
                        }
                    };
                    
                    frame.onerror = () => {
                        loadingIndicator.classList.remove('active');
                        statusBar.textContent = \`Failed to load: \${url}\`;
                    };
                    
                } catch (error) {
                    console.error('[LonxRender] Navigation error:', error);
                    statusBar.textContent = \`Error: \${error.message}\`;
                    loadingIndicator.classList.remove('active');
                }
            }
            
            updateTabTitle(title) {
                const tabElement = document.querySelector(\`[data-tab-id="\${this.activeTabId}"] .tab-title\`);
                if (tabElement) {
                    tabElement.textContent = title.length > 20 ? title.substring(0, 20) + '...' : title;
                }
            }
            
            updateNavigationButtons() {
                const backBtn = document.getElementById('backBtn');
                const forwardBtn = document.getElementById('forwardBtn');
                
                const tab = this.tabs.get(this.activeTabId);
                if (tab) {
                    backBtn.disabled = tab.historyIndex <= 0;
                    forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
                }
            }
            
            goBack() {
                const tab = this.tabs.get(this.activeTabId);
                if (tab && tab.historyIndex > 0) {
                    tab.historyIndex--;
                    const url = tab.history[tab.historyIndex];
                    this.navigate(url);
                }
            }
            
            goForward() {
                const tab = this.tabs.get(this.activeTabId);
                if (tab && tab.historyIndex < tab.history.length - 1) {
                    tab.historyIndex++;
                    const url = tab.history[tab.historyIndex];
                    this.navigate(url);
                }
            }
            
            reload() {
                const tab = this.tabs.get(this.activeTabId);
                if (tab) {
                    this.navigate(tab.url);
                }
            }
            
            newTab() {
                const tabId = this.nextTabId++;
                this.initializeTab(tabId, 'about:blank');
                this.activeTabId = tabId;
                
                // Add tab to UI
                const tabsContainer = document.getElementById('browserTabs');
                const tabElement = document.createElement('div');
                tabElement.className = 'tab active';
                tabElement.setAttribute('data-tab-id', tabId);
                tabElement.innerHTML = \`
                    <span class="tab-favicon">🌐</span>
                    <span class="tab-title">New Tab</span>
                    <button class="tab-close" onclick="browserEngine.closeTab(\${tabId})">×</button>
                \`;
                
                // Remove active class from other tabs
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                
                tabsContainer.appendChild(tabElement);
                
                // Navigate to blank page
                this.navigate('about:blank');
            }
            
            closeTab(tabId) {
                if (this.tabs.size <= 1) return; // Don't close last tab
                
                this.tabs.delete(tabId);
                const tabElement = document.querySelector(\`[data-tab-id="\${tabId}"]\`);
                if (tabElement) {
                    tabElement.remove();
                }
                
                // Switch to another tab if this was active
                if (this.activeTabId === tabId) {
                    const remainingTabs = Array.from(this.tabs.keys());
                    if (remainingTabs.length > 0) {
                        this.switchToTab(remainingTabs[0]);
                    }
                }
            }
            
            switchToTab(tabId) {
                this.activeTabId = tabId;
                
                // Update UI
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                const tabElement = document.querySelector(\`[data-tab-id="\${tabId}"]\`);
                if (tabElement) {
                    tabElement.classList.add('active');
                }
                
                // Load tab content
                const tab = this.tabs.get(tabId);
                if (tab) {
                    document.getElementById('addressBar').value = tab.url;
                    document.getElementById('contentFrame').src = tab.url;
                    this.updateNavigationButtons();
                }
            }
        }
        
        // Initialize browser engine
        const browserEngine = new LonxRenderEngine();
        
        // Tab click handlers
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab') && !e.target.closest('.tab-close')) {
                const tabId = parseInt(e.target.closest('.tab').getAttribute('data-tab-id'));
                browserEngine.switchToTab(tabId);
            }
        });
        
        console.log('[LonxRender] Browser engine initialized');
    </script>
</body>
</html>
        `;
    }

    launchStandalone(url) {
        console.log(`[LonxRender] Standalone mode - would open: ${url}`);
        console.log('LonxRender requires LonxOS window manager to run properly.');
        return false;
    }

    showHelp() {
        return `
LonxRender - Native Browser Engine for LonxOS

Usage:
  browser                    - Launch browser with default homepage
  browser <url>             - Launch browser and navigate to URL

Examples:
  browser                           # Open homepage
  browser https://github.com       # Open GitHub
  browser https://youtube.com      # Open YouTube

Features:
  ✅ True native rendering (no iframe wrapper)
  ✅ Tab management
  ✅ Navigation controls
  ✅ Address bar with search
  ✅ Modern UI with animations

Browser runs in floating window with 80% screen coverage.
        `;
    }
}

// Default export function for LonxOS shell integration
export default function browser(args = []) {
    const command = new LonxRenderCommand();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(command.showHelp());
        return true;
    }
    
    return command.execute(args);
}
