/**
 * LonxRender Browser Command - Launches native browser in LonxOS
 * Usage: browser [url]
 */

async function main(args, lonx) {
    const url = args[0] || 'https://lonx.dev';
    
    try {
        // Check if window manager is available
        if (typeof window !== 'undefined' && window.lonxWM) {
            return launchBrowser(url, window.lonxWM, lonx);
        } else if (typeof global !== 'undefined' && global.lonx?.wm) {
            return launchBrowser(url, global.lonx.wm, lonx);
        } else {
            lonx.shell.print('❌ LonxRender requires LonxOS window manager to run');
            return;
        }
    } catch (error) {
        lonx.shell.print(`❌ LonxRender launch failed: ${error.message}`);
    }
}

function launchBrowser(url, windowManager, lonx) {
    // Create window configuration
    const windowConfig = {
        title: '🌐 LonxRender - Native Browser',
        icon: '🌐',
        content: getBrowserHTML(url),
        width: Math.floor((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.8),
        height: Math.floor((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.8),
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true
    };

    const windowId = windowManager.createWindow(windowConfig);
    
    lonx.shell.print(`🌐 LonxRender launched in window ${windowId}`);
    if (url) {
        lonx.shell.print(`📍 Navigating to: ${url}`);
    }
    
    return windowId;
}

function getBrowserHTML(url) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LonxRender Browser</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f0f0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .browser-toolbar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .nav-button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
        }
        
        .nav-button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .nav-button:active {
            transform: translateY(0);
        }
        
        .nav-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .address-bar {
            flex: 1;
            padding: 12px 18px;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.95);
            font-size: 15px;
            outline: none;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .address-bar:focus {
            background: white;
            box-shadow: 0 0 0 3px rgba(255,255,255,0.4), 0 4px 16px rgba(0,0,0,0.1);
            transform: scale(1.02);
        }
        
        .browser-tabs {
            background: linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%);
            display: flex;
            gap: 2px;
            padding: 8px 12px 0;
            min-height: 45px;
            border-bottom: 1px solid #bbb;
        }
        
        .tab {
            background: rgba(255,255,255,0.8);
            padding: 10px 18px;
            border-radius: 12px 12px 0 0;
            cursor: pointer;
            max-width: 220px;
            min-width: 120px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(0,0,0,0.1);
            border-bottom: none;
            position: relative;
        }
        
        .tab.active {
            background: white;
            box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
            border-color: rgba(0,0,0,0.2);
        }
        
        .tab:hover:not(.active) {
            background: rgba(255,255,255,0.95);
            transform: translateY(-1px);
        }
        
        .tab-favicon {
            font-size: 16px;
            flex-shrink: 0;
        }
        
        .tab-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 14px;
            color: #333;
        }
        
        .tab-close {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            font-size: 14px;
            flex-shrink: 0;
            transition: all 0.2s ease;
        }
        
        .tab-close:hover {
            background: #ff4444;
            color: white;
            transform: scale(1.1);
        }
        
        .browser-content {
            flex: 1;
            background: white;
            position: relative;
            overflow: hidden;
            border-radius: 0 0 8px 8px;
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
            z-index: 10;
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
            background: linear-gradient(180deg, #f8f8f8 0%, #eee 100%);
            padding: 8px 16px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .status-left {
            display: flex;
            gap: 15px;
        }
        
        .status-right {
            font-family: monospace;
            opacity: 0.7;
        }
        
        /* Error page styles */
        .error-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        
        .error-title {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        
        .error-message {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .retry-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .retry-button:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <div class="browser-toolbar">
        <button class="nav-button" id="backBtn" onclick="browserEngine.goBack()" title="Back">←</button>
        <button class="nav-button" id="forwardBtn" onclick="browserEngine.goForward()" title="Forward">→</button>
        <button class="nav-button" onclick="browserEngine.reload()" title="Reload">⟲</button>
        <input type="text" class="address-bar" id="addressBar" 
               placeholder="Enter URL or search term..." 
               value="${url || 'https://lonx.dev'}"
               onkeydown="if(event.key==='Enter') browserEngine.navigate(this.value)">
        <button class="nav-button" onclick="browserEngine.navigate(document.getElementById('addressBar').value)" title="Go">Go</button>
        <button class="nav-button" onclick="browserEngine.newTab()" title="New Tab">+</button>
        <button class="nav-button" onclick="browserEngine.showInfo()" title="Info">ⓘ</button>
    </div>
    
    <div class="browser-tabs" id="browserTabs">
        <div class="tab active" data-tab-id="1">
            <span class="tab-favicon">🌐</span>
            <span class="tab-title">Loading...</span>
            <button class="tab-close" onclick="browserEngine.closeTab(1)">×</button>
        </div>
    </div>
    
    <div class="browser-content">
        <div class="loading-indicator" id="loadingIndicator"></div>
        <iframe class="content-frame" id="contentFrame" src="about:blank"></iframe>
    </div>
    
    <div class="status-bar" id="statusBar">
        <div class="status-left">
            <span id="statusText">Ready</span>
            <span id="securityStatus">🔒 Secure</span>
        </div>
        <div class="status-right" id="statusRight">LonxRender v1.0</div>
    </div>
    
    <script>
        class LonxRenderEngine {
            constructor() {
                this.tabs = new Map();
                this.activeTabId = 1;
                this.nextTabId = 2;
                this.history = [];
                this.historyIndex = -1;
                this.startTime = Date.now();
                
                this.initializeTab(1, '${url || 'https://lonx.dev'}');
                this.loadInitialPage();
                this.setupEventListeners();
            }
            
            setupEventListeners() {
                // Tab click handlers
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.tab') && !e.target.closest('.tab-close')) {
                        const tabId = parseInt(e.target.closest('.tab').getAttribute('data-tab-id'));
                        this.switchToTab(tabId);
                    }
                });
                
                // Address bar enter key
                document.getElementById('addressBar').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.navigate(e.target.value);
                    }
                });
                
                // Update status periodically
                setInterval(() => this.updateStatus(), 1000);
            }
            
            initializeTab(tabId, url) {
                this.tabs.set(tabId, {
                    id: tabId,
                    url: url || 'about:blank',
                    title: 'Loading...',
                    favicon: '🌐',
                    history: [url || 'about:blank'],
                    historyIndex: 0,
                    loadTime: null,
                    error: null
                });
            }
            
            loadInitialPage() {
                const url = '${url || 'https://lonx.dev'}';
                if (url && url !== 'about:blank') {
                    setTimeout(() => this.navigate(url), 500);
                }
            }
            
            navigate(url) {
                if (!url || url.trim() === '') {
                    this.showError('Empty URL', 'Please enter a valid URL or search term.');
                    return;
                }
                
                // Clean and validate URL
                url = this.cleanUrl(url);
                
                console.log('[LonxRender] Navigating to:', url);
                
                const frame = document.getElementById('contentFrame');
                const addressBar = document.getElementById('addressBar');
                const statusText = document.getElementById('statusText');
                const loadingIndicator = document.getElementById('loadingIndicator');
                
                // Update UI
                addressBar.value = url;
                statusText.textContent = \`Loading: \${this.getDomain(url)}\`;
                loadingIndicator.classList.add('active');
                
                const startTime = Date.now();
                
                try {
                    // Navigate frame
                    frame.src = url;
                    
                    // Update tab info
                    const tab = this.tabs.get(this.activeTabId);
                    if (tab) {
                        tab.url = url;
                        tab.error = null;
                        if (tab.history[tab.historyIndex] !== url) {
                            tab.history = tab.history.slice(0, tab.historyIndex + 1);
                            tab.history.push(url);
                            tab.historyIndex = tab.history.length - 1;
                        }
                        this.updateTabTitle('Loading...');
                    }
                    
                    // Add to global history
                    this.history.push({ url, timestamp: Date.now() });
                    this.historyIndex = this.history.length - 1;
                    
                    // Handle load events
                    const loadTimeout = setTimeout(() => {
                        loadingIndicator.classList.remove('active');
                        statusText.textContent = 'Load timeout';
                        this.showError('Load Timeout', \`Failed to load \${url} within 30 seconds.\`);
                    }, 30000);
                    
                    frame.onload = () => {
                        clearTimeout(loadTimeout);
                        const loadTime = Date.now() - startTime;
                        loadingIndicator.classList.remove('active');
                        statusText.textContent = \`Loaded \${this.getDomain(url)} (\${loadTime}ms)\`;
                        
                        if (tab) tab.loadTime = loadTime;
                        this.updateNavigationButtons();
                        
                        try {
                            const title = frame.contentDocument?.title || this.getDomain(url);
                            this.updateTabTitle(title);
                        } catch (e) {
                            // Cross-origin frame, can't access title
                            this.updateTabTitle(this.getDomain(url));
                        }
                    };
                    
                    frame.onerror = () => {
                        clearTimeout(loadTimeout);
                        loadingIndicator.classList.remove('active');
                        statusText.textContent = \`Failed to load \${this.getDomain(url)}\`;
                        this.showError('Load Failed', \`Could not load \${url}. The site may be down or unreachable.\`);
                    };
                    
                } catch (error) {
                    console.error('[LonxRender] Navigation error:', error);
                    statusText.textContent = \`Error: \${error.message}\`;
                    loadingIndicator.classList.remove('active');
                    this.showError('Navigation Error', error.message);
                }
            }
            
            cleanUrl(url) {
                url = url.trim();
                
                // Handle special URLs
                if (url === 'home' || url === 'homepage') {
                    return 'https://lonx.dev';
                }
                
                // If it looks like a search query
                if (!url.includes('.') && !url.startsWith('http')) {
                    return 'https://www.google.com/search?q=' + encodeURIComponent(url);
                }
                
                // Add protocol if missing
                if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
                    // Try HTTPS first for security
                    url = 'https://' + url;
                }
                
                return url;
            }
            
            getDomain(url) {
                try {
                    return new URL(url).hostname || url;
                } catch {
                    return url;
                }
            }
            
            showError(title, message) {
                const frame = document.getElementById('contentFrame');
                const errorHtml = \`
                    <div class="error-page">
                        <div class="error-icon">⚠️</div>
                        <div class="error-title">\${title}</div>
                        <div class="error-message">\${message}</div>
                        <button class="retry-button" onclick="parent.browserEngine.reload()">Try Again</button>
                    </div>
                \`;
                
                frame.srcdoc = \`
                    <!DOCTYPE html>
                    <html><head><title>Error</title><style>
                        \${document.querySelector('style').textContent}
                    </style></head><body>\${errorHtml}</body></html>
                \`;
                
                this.updateTabTitle(\`Error: \${title}\`);
                
                const tab = this.tabs.get(this.activeTabId);
                if (tab) tab.error = { title, message };
            }
            
            updateTabTitle(title) {
                const tabElement = document.querySelector(\`[data-tab-id="\${this.activeTabId}"] .tab-title\`);
                if (tabElement) {
                    const displayTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
                    tabElement.textContent = displayTitle;
                }
                
                const tab = this.tabs.get(this.activeTabId);
                if (tab) tab.title = title;
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
            
            updateStatus() {
                const rightStatus = document.getElementById('statusRight');
                const uptime = Math.floor((Date.now() - this.startTime) / 1000);
                const mins = Math.floor(uptime / 60);
                const secs = uptime % 60;
                rightStatus.textContent = \`LonxRender v1.0 | Uptime: \${mins}:\${secs.toString().padStart(2, '0')}\`;
            }
            
            goBack() {
                const tab = this.tabs.get(this.activeTabId);
                if (tab && tab.historyIndex > 0) {
                    tab.historyIndex--;
                    const url = tab.history[tab.historyIndex];
                    document.getElementById('addressBar').value = url;
                    document.getElementById('contentFrame').src = url;
                    document.getElementById('statusText').textContent = \`Navigated back to \${this.getDomain(url)}\`;
                    this.updateNavigationButtons();
                }
            }
            
            goForward() {
                const tab = this.tabs.get(this.activeTabId);
                if (tab && tab.historyIndex < tab.history.length - 1) {
                    tab.historyIndex++;
                    const url = tab.history[tab.historyIndex];
                    document.getElementById('addressBar').value = url;
                    document.getElementById('contentFrame').src = url;
                    document.getElementById('statusText').textContent = \`Navigated forward to \${this.getDomain(url)}\`;
                    this.updateNavigationButtons();
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
                document.getElementById('contentFrame').src = 'about:blank';
                document.getElementById('addressBar').value = '';
                document.getElementById('statusText').textContent = 'New tab created';
                this.updateNavigationButtons();
            }
            
            closeTab(tabId) {
                if (this.tabs.size <= 1) {
                    document.getElementById('statusText').textContent = 'Cannot close last tab';
                    return;
                }
                
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
                
                document.getElementById('statusText').textContent = \`Tab \${tabId} closed\`;
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
                    document.getElementById('statusText').textContent = \`Switched to tab \${tabId}\`;
                    this.updateNavigationButtons();
                }
            }
            
            showInfo() {
                const tab = this.tabs.get(this.activeTabId);
                if (!tab) return;
                
                const info = \`
                    🌐 LonxRender Native Browser
                    
                    Current Tab: \${tab.title}
                    URL: \${tab.url}
                    Load Time: \${tab.loadTime ? tab.loadTime + 'ms' : 'N/A'}
                    History: \${tab.history.length} entries
                    
                    Total Tabs: \${this.tabs.size}
                    Session History: \${this.history.length} entries
                    
                    Features:
                    ✅ Real iframe rendering (not wrapper)
                    ✅ Tab management
                    ✅ Navigation history
                    ✅ Modern UI with animations
                    ✅ Integrated with LonxOS window manager
                \`;
                
                alert(info);
            }
        }
        
        // Initialize browser engine
        const browserEngine = new LonxRenderEngine();
        
        console.log('[LonxRender] Native browser engine initialized');
        console.log('[LonxRender] Starting with URL:', '${url || 'https://lonx.dev'}');
    </script>
</body>
</html>
    `;
}

// Export as default function for LonxOS shell
export default main;
