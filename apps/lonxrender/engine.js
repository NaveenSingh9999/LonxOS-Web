/**
 * LonxRender Engine - Main Browser Logic
 * Handles tabs, navigation, UI interactions, and core browser functionality
 */

class LonxRender {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 1;
        this.history = [];
        this.bookmarks = [];
        this.settings = {};
        this.sandboxWorker = null;
        this.renderEngine = null;
        this.consoleManager = null;
        
        // Initialize data paths
        this.dataPath = '/home/user/.lonbrowse/';
        this.downloadsPath = '/home/user/Downloads/';
        
        this.bindEvents();
    }

    async init() {
        console.log('[LonxRender] Initializing Native Browser Engine v1.0');
        
        try {
            // Initialize render engine
            this.renderEngine = new LonxRenderEngine();
            
            // Initialize console manager
            this.consoleManager = new LonxConsole();
            
            // Load user data
            await this.loadUserData();
            
            // Initialize first tab
            this.activeTabId = 'tab-1';
            this.tabs.set('tab-1', {
                id: 'tab-1',
                title: 'New Tab',
                url: '',
                favicon: '🌐',
                history: [],
                historyIndex: -1,
                loading: false,
                canGoBack: false,
                canGoForward: false
            });
            
            // Initialize sandbox worker
            this.initSandboxWorker();
            
            // Update UI
            this.updateUI();
            
            this.consoleManager.log('LonxRender initialized successfully', 'info');
            this.setStatus('Ready');
            
        } catch (error) {
            console.error('[LonxRender] Initialization failed:', error);
            this.consoleManager.log(`Initialization failed: ${error.message}`, 'error');
        }
    }

    bindEvents() {
        // Navigation controls
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('forward-btn').addEventListener('click', () => this.goForward());
        document.getElementById('reload-btn').addEventListener('click', () => this.reload());
        document.getElementById('home-btn').addEventListener('click', () => this.goHome());
        
        // Address bar
        const addressBar = document.getElementById('address-bar');
        addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigate(addressBar.value);
            }
        });
        
        document.getElementById('go-btn').addEventListener('click', () => {
            this.navigate(addressBar.value);
        });
        
        // Tab management
        document.getElementById('new-tab-btn').addEventListener('click', () => this.createTab());
        
        // Control buttons
        document.getElementById('bookmarks-btn').addEventListener('click', () => this.toggleBookmarks());
        document.getElementById('history-btn').addEventListener('click', () => this.toggleHistory());
        document.getElementById('console-btn').addEventListener('click', () => this.toggleConsole());
        document.getElementById('settings-btn').addEventListener('click', () => this.toggleSettings());
        
        // Console
        document.getElementById('clear-console').addEventListener('click', () => this.consoleManager.clear());
        document.getElementById('close-console').addEventListener('click', () => this.toggleConsole());
        document.getElementById('console-execute').addEventListener('click', () => this.executeConsoleCommand());
        
        document.getElementById('console-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeConsoleCommand();
            }
        });
        
        // Panel close buttons
        document.querySelectorAll('.panel-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeSidebar());
        });
        
        // Bookmarks
        document.getElementById('add-bookmark').addEventListener('click', () => this.addBookmark());
        
        // History
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
        
        // Settings
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    }

    async loadUserData() {
        try {
            // Try to load from LonxOS filesystem
            if (typeof window.lonxFS !== 'undefined') {
                this.bookmarks = await this.loadFromFS('bookmarks.json') || [];
                this.history = await this.loadFromFS('history.json') || [];
                this.settings = await this.loadFromFS('settings.json') || this.getDefaultSettings();
            } else {
                // Fallback to localStorage
                this.bookmarks = JSON.parse(localStorage.getItem('lonxrender_bookmarks') || '[]');
                this.history = JSON.parse(localStorage.getItem('lonxrender_history') || '[]');
                this.settings = JSON.parse(localStorage.getItem('lonxrender_settings') || JSON.stringify(this.getDefaultSettings()));
            }
            
            this.populateBookmarks();
            this.populateHistory();
            this.applySettings();
            
        } catch (error) {
            console.warn('[LonxRender] Could not load user data:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    async loadFromFS(filename) {
        // Placeholder for LonxOS filesystem integration
        return null;
    }

    async saveToFS(filename, data) {
        // Placeholder for LonxOS filesystem integration
        return false;
    }

    getDefaultSettings() {
        return {
            homepage: 'https://lonx.dev',
            javascript: true,
            tabs: true,
            webgl: true,
            console: true,
            theme: 'dark'
        };
    }

    // Tab Management
    createTab(url = null) {
        const tabId = `tab-${++this.tabCounter}`;
        
        const tab = {
            id: tabId,
            title: 'New Tab',
            url: url || '',
            favicon: '🌐',
            history: [],
            historyIndex: -1,
            loading: false,
            canGoBack: false,
            canGoForward: false
        };
        
        this.tabs.set(tabId, tab);
        
        // Create tab UI element
        this.createTabElement(tab);
        
        // Create tab content
        this.createTabContent(tab);
        
        // Switch to new tab
        this.switchTab(tabId);
        
        if (url) {
            this.navigate(url);
        }
        
        return tabId;
    }

    createTabElement(tab) {
        const tabBar = document.getElementById('tab-bar');
        const newTabBtn = document.getElementById('new-tab-btn');
        
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.setAttribute('data-tab-id', tab.id);
        
        tabElement.innerHTML = `
            <span class="tab-favicon">${tab.favicon}</span>
            <span class="tab-title">${tab.title}</span>
            <button class="tab-close" title="Close tab">×</button>
        `;
        
        // Tab click event
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchTab(tab.id);
            }
        });
        
        // Tab close event
        tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });
        
        tabBar.insertBefore(tabElement, newTabBtn);
    }

    createTabContent(tab) {
        const viewport = document.getElementById('render-viewport');
        
        const contentElement = document.createElement('div');
        contentElement.className = 'tab-content';
        contentElement.setAttribute('data-tab-id', tab.id);
        
        // Default content (empty page)
        contentElement.innerHTML = `
            <div class="render-content">
                <div style="padding: 40px; text-align: center; color: #666;">
                    <h2>Empty Page</h2>
                    <p>Enter a URL to start browsing</p>
                </div>
            </div>
        `;
        
        viewport.appendChild(contentElement);
    }

    switchTab(tabId) {
        if (!this.tabs.has(tabId)) return;
        
        this.activeTabId = tabId;
        
        // Update tab UI
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab-id') === tabId);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.getAttribute('data-tab-id') === tabId);
        });
        
        // Update address bar and navigation
        const tab = this.tabs.get(tabId);
        document.getElementById('address-bar').value = tab.url;
        this.updateNavigationButtons(tab);
        this.updateTabTitle(tab);
    }

    closeTab(tabId) {
        if (this.tabs.size <= 1) {
            // Don't close the last tab, just clear it
            this.navigate('');
            return;
        }
        
        // Remove from tabs map
        this.tabs.delete(tabId);
        
        // Remove UI elements
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }
        
        const contentElement = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (contentElement) {
            contentElement.remove();
        }
        
        // Switch to another tab if this was active
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            }
        }
    }

    // Navigation
    async navigate(input) {
        if (!input.trim()) {
            this.showWelcomeScreen();
            return;
        }
        
        const tab = this.tabs.get(this.activeTabId);
        if (!tab) return;
        
        let url = this.processURL(input);
        
        tab.loading = true;
        this.updateLoadingState(true);
        this.setStatus(`Loading ${url}...`);
        
        try {
            // Add to history
            if (tab.url !== url) {
                tab.history = tab.history.slice(0, tab.historyIndex + 1);
                tab.history.push(url);
                tab.historyIndex = tab.history.length - 1;
                
                // Add to global history
                this.addToHistory(url, tab.title || 'Untitled');
            }
            
            tab.url = url;
            document.getElementById('address-bar').value = url;
            
            // Use render engine to load content
            const success = await this.renderEngine.loadPage(url, this.activeTabId);
            
            if (success) {
                tab.title = await this.renderEngine.getPageTitle(this.activeTabId) || 'Page';
                tab.favicon = await this.renderEngine.getPageFavicon(this.activeTabId) || '🌐';
                
                this.updateTabTitle(tab);
                this.setStatus('Page loaded');
            } else {
                this.showErrorPage('Failed to load page');
            }
            
        } catch (error) {
            console.error('[LonxRender] Navigation error:', error);
            this.consoleManager.log(`Navigation error: ${error.message}`, 'error');
            this.showErrorPage(error.message);
        } finally {
            tab.loading = false;
            this.updateLoadingState(false);
            this.updateNavigationButtons(tab);
        }
    }

    processURL(input) {
        input = input.trim();
        
        // Check if it's already a valid URL
        if (input.match(/^https?:\/\//)) {
            return input;
        }
        
        // Check if it's a local file
        if (input.endsWith('.html') && !input.includes('/')) {
            return `./${input}`;
        }
        
        // Check if it looks like a domain
        if (input.includes('.') && !input.includes(' ')) {
            return `https://${input}`;
        }
        
        // Default to search
        return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
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
        if (tab && tab.url) {
            this.navigate(tab.url);
        }
    }

    goHome() {
        this.navigate(this.settings.homepage);
    }

    // UI Updates
    updateNavigationButtons(tab) {
        document.getElementById('back-btn').disabled = !tab.canGoBack && tab.historyIndex <= 0;
        document.getElementById('forward-btn').disabled = !tab.canGoForward && tab.historyIndex >= tab.history.length - 1;
    }

    updateTabTitle(tab) {
        const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`);
        if (tabElement) {
            tabElement.querySelector('.tab-title').textContent = tab.title;
            tabElement.querySelector('.tab-favicon').textContent = tab.favicon;
        }
    }

    updateLoadingState(loading) {
        const loadingBar = document.getElementById('loading-bar');
        if (loading) {
            loadingBar.classList.add('active');
            loadingBar.querySelector('.loading-progress').style.width = '30%';
            
            setTimeout(() => {
                if (loadingBar.classList.contains('active')) {
                    loadingBar.querySelector('.loading-progress').style.width = '70%';
                }
            }, 500);
        } else {
            loadingBar.querySelector('.loading-progress').style.width = '100%';
            setTimeout(() => {
                loadingBar.classList.remove('active');
                loadingBar.querySelector('.loading-progress').style.width = '0%';
            }, 300);
        }
    }

    showWelcomeScreen() {
        const content = document.querySelector(`.tab-content[data-tab-id="${this.activeTabId}"]`);
        if (content) {
            content.innerHTML = `
                <div class="welcome-screen">
                    <div class="welcome-content">
                        <h1>🌐 LonxRender</h1>
                        <p>Native Browser Engine for LonxOS</p>
                        <div class="quick-actions">
                            <div class="quick-link" onclick="LonxRender.navigate('https://github.com')">
                                <div class="quick-icon">📁</div>
                                <span>GitHub</span>
                            </div>
                            <div class="quick-link" onclick="LonxRender.navigate('https://youtube.com')">
                                <div class="quick-icon">📺</div>
                                <span>YouTube</span>
                            </div>
                            <div class="quick-link" onclick="LonxRender.navigate('webgl-test.html')">
                                <div class="quick-icon">🎮</div>
                                <span>WebGL Test</span>
                            </div>
                            <div class="quick-link" onclick="LonxRender.openBookmarks()">
                                <div class="quick-icon">⭐</div>
                                <span>Bookmarks</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showErrorPage(message) {
        const content = document.querySelector(`.tab-content[data-tab-id="${this.activeTabId}"]`);
        if (content) {
            content.innerHTML = `
                <div class="error-page">
                    <h2>🚫 Page Load Error</h2>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="LonxRender.reload()">Try Again</button>
                </div>
            `;
        }
    }

    // Sidebar Management
    toggleBookmarks() {
        this.toggleSidebar('bookmarks-panel');
    }

    toggleHistory() {
        this.toggleSidebar('history-panel');
    }

    toggleSettings() {
        this.toggleSidebar('settings-panel');
    }

    toggleSidebar(panelId) {
        const sidebar = document.getElementById('sidebar');
        const panel = document.getElementById(panelId);
        
        // Close if same panel is open
        if (sidebar.classList.contains('active') && panel.classList.contains('active')) {
            this.closeSidebar();
            return;
        }
        
        // Hide all panels
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
        
        // Show selected panel
        panel.classList.add('active');
        sidebar.classList.add('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    }

    // Console Management
    toggleConsole() {
        const consolePanel = document.getElementById('console-panel');
        consolePanel.classList.toggle('active');
    }

    executeConsoleCommand() {
        const input = document.getElementById('console-input');
        const command = input.value.trim();
        
        if (!command) return;
        
        this.consoleManager.log(`> ${command}`, 'input');
        
        try {
            if (this.sandboxWorker) {
                this.sandboxWorker.postMessage({
                    type: 'execute',
                    code: command
                });
            } else {
                // Fallback execution
                const result = eval(command);
                this.consoleManager.log(result, 'result');
            }
        } catch (error) {
            this.consoleManager.log(error.message, 'error');
        }
        
        input.value = '';
    }

    // Bookmarks
    addBookmark() {
        const tab = this.tabs.get(this.activeTabId);
        if (!tab || !tab.url) return;
        
        const bookmark = {
            id: Date.now(),
            title: tab.title,
            url: tab.url,
            favicon: tab.favicon,
            created: new Date().toISOString()
        };
        
        this.bookmarks.push(bookmark);
        this.saveBookmarks();
        this.populateBookmarks();
        
        this.consoleManager.log(`Bookmark added: ${bookmark.title}`, 'info');
    }

    populateBookmarks() {
        const container = document.getElementById('bookmarks-content');
        container.innerHTML = '';
        
        this.bookmarks.forEach(bookmark => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';
            item.innerHTML = `
                <span class="bookmark-icon">${bookmark.favicon}</span>
                <span class="bookmark-title">${bookmark.title}</span>
            `;
            item.onclick = () => this.navigate(bookmark.url);
            container.appendChild(item);
        });
    }

    openBookmarks() {
        this.toggleBookmarks();
    }

    // History
    addToHistory(url, title) {
        const historyItem = {
            id: Date.now(),
            url,
            title,
            visited: new Date().toISOString()
        };
        
        // Remove duplicates
        this.history = this.history.filter(item => item.url !== url);
        this.history.unshift(historyItem);
        
        // Limit history size
        if (this.history.length > 1000) {
            this.history = this.history.slice(0, 1000);
        }
        
        this.saveHistory();
        this.populateHistory();
    }

    populateHistory() {
        const container = document.getElementById('history-content');
        container.innerHTML = '';
        
        this.history.slice(0, 50).forEach(item => {
            const historyElement = document.createElement('div');
            historyElement.className = 'bookmark-item';
            historyElement.innerHTML = `
                <span class="bookmark-icon">📄</span>
                <span class="bookmark-title">${item.title}</span>
            `;
            historyElement.onclick = () => this.navigate(item.url);
            container.appendChild(historyElement);
        });
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.populateHistory();
        this.consoleManager.log('History cleared', 'info');
    }

    // Settings
    applySettings() {
        document.getElementById('setting-javascript').checked = this.settings.javascript;
        document.getElementById('setting-webgl').checked = this.settings.webgl;
        document.getElementById('setting-console').checked = this.settings.console;
        document.getElementById('setting-homepage').value = this.settings.homepage;
    }

    saveSettings() {
        this.settings.javascript = document.getElementById('setting-javascript').checked;
        this.settings.webgl = document.getElementById('setting-webgl').checked;
        this.settings.console = document.getElementById('setting-console').checked;
        this.settings.homepage = document.getElementById('setting-homepage').value;
        
        // Save to storage
        if (typeof window.lonxFS !== 'undefined') {
            this.saveToFS('settings.json', this.settings);
        } else {
            localStorage.setItem('lonxrender_settings', JSON.stringify(this.settings));
        }
        
        this.consoleManager.log('Settings saved', 'info');
        this.closeSidebar();
    }

    // Data persistence
    saveBookmarks() {
        if (typeof window.lonxFS !== 'undefined') {
            this.saveToFS('bookmarks.json', this.bookmarks);
        } else {
            localStorage.setItem('lonxrender_bookmarks', JSON.stringify(this.bookmarks));
        }
    }

    saveHistory() {
        if (typeof window.lonxFS !== 'undefined') {
            this.saveToFS('history.json', this.history);
        } else {
            localStorage.setItem('lonxrender_history', JSON.stringify(this.history));
        }
    }

    // Sandbox worker initialization
    initSandboxWorker() {
        if (this.settings.javascript) {
            try {
                this.sandboxWorker = new Worker('sandbox.worker.js');
                this.sandboxWorker.onmessage = (e) => {
                    const { type, result, error } = e.data;
                    
                    if (type === 'result') {
                        this.consoleManager.log(result, 'result');
                    } else if (type === 'error') {
                        this.consoleManager.log(error, 'error');
                    } else if (type === 'log') {
                        this.consoleManager.log(result, 'info');
                    }
                };
            } catch (error) {
                console.warn('[LonxRender] Could not initialize sandbox worker:', error);
            }
        }
    }

    // Utility methods
    setStatus(text) {
        document.getElementById('status-text').textContent = text;
    }

    updateUI() {
        // Update various UI elements based on current state
        this.updateNavigationButtons(this.tabs.get(this.activeTabId) || {});
    }
}

// Global instance
const LonxRender = new LonxRender();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LonxRender;
}

// Make globally available
window.LonxRender = LonxRender;
