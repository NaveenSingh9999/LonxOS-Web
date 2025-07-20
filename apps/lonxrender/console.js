/**
 * LonxRender Console Manager
 * Handles console logging, command execution, and developer tools
 */

class LonxConsole {
    constructor() {
        this.messages = [];
        this.maxMessages = 1000;
        this.commandHistory = [];
        this.historyIndex = -1;
    }

    log(message, type = 'log', timestamp = null) {
        const logEntry = {
            id: Date.now() + Math.random(),
            message: String(message),
            type: type,
            timestamp: timestamp || new Date().toLocaleTimeString(),
            source: 'LonxRender'
        };

        this.messages.push(logEntry);
        
        // Limit message count
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }

        this.renderMessage(logEntry);
        
        // Also log to browser console
        this.logToBrowserConsole(message, type);
    }

    logToBrowserConsole(message, type) {
        switch (type) {
            case 'error':
                console.error(`[LonxRender]`, message);
                break;
            case 'warn':
                console.warn(`[LonxRender]`, message);
                break;
            case 'info':
                console.info(`[LonxRender]`, message);
                break;
            case 'result':
                console.log(`[LonxRender Result]`, message);
                break;
            default:
                console.log(`[LonxRender]`, message);
        }
    }

    renderMessage(logEntry) {
        const consoleContent = document.getElementById('console-content');
        if (!consoleContent) return;

        const messageEl = document.createElement('div');
        messageEl.className = `console-message ${logEntry.type}`;
        messageEl.innerHTML = `
            <span class="console-timestamp">[${logEntry.timestamp}]</span>
            <span class="console-text">${this.formatMessage(logEntry.message, logEntry.type)}</span>
        `;

        consoleContent.appendChild(messageEl);
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }

    formatMessage(message, type) {
        // Handle different message types
        if (type === 'result') {
            if (typeof message === 'object') {
                try {
                    return `<pre>${JSON.stringify(message, null, 2)}</pre>`;
                } catch (e) {
                    return `<pre>${String(message)}</pre>`;
                }
            }
            return `<span class="console-result">${this.escapeHTML(String(message))}</span>`;
        }

        if (type === 'input') {
            return `<span class="console-input">${this.escapeHTML(message)}</span>`;
        }

        if (type === 'error') {
            return `<span class="console-error">❌ ${this.escapeHTML(message)}</span>`;
        }

        if (type === 'warn') {
            return `<span class="console-warn">⚠️ ${this.escapeHTML(message)}</span>`;
        }

        if (type === 'info') {
            return `<span class="console-info">ℹ️ ${this.escapeHTML(message)}</span>`;
        }

        return this.escapeHTML(String(message));
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clear() {
        this.messages = [];
        const consoleContent = document.getElementById('console-content');
        if (consoleContent) {
            consoleContent.innerHTML = '';
        }
        this.log('Console cleared', 'info');
    }

    executeCommand(command) {
        if (!command.trim()) return;

        // Add to history
        this.commandHistory.unshift(command);
        if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
        }
        this.historyIndex = -1;

        this.log(`> ${command}`, 'input');

        // Handle special commands
        if (this.handleSpecialCommand(command)) {
            return;
        }

        // Execute JavaScript
        try {
            const result = this.evaluateJS(command);
            if (result !== undefined) {
                this.log(result, 'result');
            }
        } catch (error) {
            this.log(error.message, 'error');
        }
    }

    handleSpecialCommand(command) {
        const cmd = command.trim().toLowerCase();

        // Clear command
        if (cmd === 'clear' || cmd === 'cls') {
            this.clear();
            return true;
        }

        // Help command
        if (cmd === 'help') {
            this.showHelp();
            return true;
        }

        // Navigation commands
        if (cmd.startsWith('navigate ') || cmd.startsWith('go ')) {
            const url = command.substring(cmd.startsWith('navigate ') ? 9 : 3).trim();
            if (window.LonxRender) {
                window.LonxRender.navigate(url);
                this.log(`Navigating to: ${url}`, 'info');
            }
            return true;
        }

        // Tab commands
        if (cmd === 'newtab') {
            if (window.LonxRender) {
                window.LonxRender.createTab();
                this.log('New tab created', 'info');
            }
            return true;
        }

        // Bookmark commands
        if (cmd === 'bookmark') {
            if (window.LonxRender) {
                window.LonxRender.addBookmark();
                this.log('Current page bookmarked', 'info');
            }
            return true;
        }

        // Settings commands
        if (cmd.startsWith('set ')) {
            this.handleSetCommand(command.substring(4));
            return true;
        }

        // Get commands
        if (cmd.startsWith('get ')) {
            this.handleGetCommand(command.substring(4));
            return true;
        }

        return false;
    }

    handleSetCommand(params) {
        const [key, ...valueParts] = params.split(' ');
        const value = valueParts.join(' ');

        if (!key || !value) {
            this.log('Usage: set <key> <value>', 'warn');
            return;
        }

        try {
            if (window.LonxRender && window.LonxRender.settings) {
                const oldValue = window.LonxRender.settings[key];
                
                // Try to parse value
                let parsedValue;
                if (value === 'true') parsedValue = true;
                else if (value === 'false') parsedValue = false;
                else if (!isNaN(value)) parsedValue = Number(value);
                else parsedValue = value;

                window.LonxRender.settings[key] = parsedValue;
                this.log(`Setting '${key}' changed from '${oldValue}' to '${parsedValue}'`, 'info');
            }
        } catch (error) {
            this.log(`Failed to set '${key}': ${error.message}`, 'error');
        }
    }

    handleGetCommand(key) {
        if (!key) {
            this.log('Usage: get <key>', 'warn');
            return;
        }

        try {
            if (window.LonxRender && window.LonxRender.settings) {
                const value = window.LonxRender.settings[key];
                this.log(`${key}: ${JSON.stringify(value)}`, 'result');
            }
        } catch (error) {
            this.log(`Failed to get '${key}': ${error.message}`, 'error');
        }
    }

    evaluateJS(code) {
        // Create a safe execution context
        const context = {
            // Provide safe globals
            console: {
                log: (...args) => this.log(args.join(' '), 'log'),
                error: (...args) => this.log(args.join(' '), 'error'),
                warn: (...args) => this.log(args.join(' '), 'warn'),
                info: (...args) => this.log(args.join(' '), 'info')
            },
            
            // Browser APIs (safe subset)
            document: {
                title: document.title,
                URL: document.URL,
                querySelector: (selector) => {
                    const activeTab = document.querySelector('.tab-content.active');
                    return activeTab ? activeTab.querySelector(selector) : null;
                },
                querySelectorAll: (selector) => {
                    const activeTab = document.querySelector('.tab-content.active');
                    return activeTab ? activeTab.querySelectorAll(selector) : [];
                }
            },
            
            // LonxRender APIs
            LonxRender: window.LonxRender ? {
                navigate: window.LonxRender.navigate.bind(window.LonxRender),
                createTab: window.LonxRender.createTab.bind(window.LonxRender),
                addBookmark: window.LonxRender.addBookmark.bind(window.LonxRender),
                goBack: window.LonxRender.goBack.bind(window.LonxRender),
                goForward: window.LonxRender.goForward.bind(window.LonxRender),
                reload: window.LonxRender.reload.bind(window.LonxRender),
                settings: window.LonxRender.settings
            } : null,
            
            // Math and other safe globals
            Math: Math,
            Date: Date,
            JSON: JSON,
            parseInt: parseInt,
            parseFloat: parseFloat,
            isNaN: isNaN,
            isFinite: isFinite
        };

        // Execute in limited context
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);
        
        try {
            const func = new Function(...contextKeys, `
                "use strict";
                return (${code});
            `);
            
            return func(...contextValues);
        } catch (error) {
            // Try as statement instead of expression
            try {
                const func = new Function(...contextKeys, `
                    "use strict";
                    ${code}
                `);
                
                return func(...contextValues);
            } catch (statementError) {
                throw error; // Throw original expression error
            }
        }
    }

    showHelp() {
        const helpText = `
LonxRender Developer Console - Available Commands:

Navigation:
  navigate <url>     - Navigate to URL
  go <url>          - Alias for navigate
  
Tab Management:
  newtab            - Create new tab
  
Bookmarks:
  bookmark          - Bookmark current page
  
Settings:
  set <key> <value> - Set configuration value
  get <key>         - Get configuration value
  
Console:
  clear / cls       - Clear console
  help              - Show this help

JavaScript Evaluation:
  Any valid JavaScript expression or statement
  
Available Objects:
  LonxRender       - Browser engine API
  console          - Console logging
  document         - Limited document access
  Math, Date, JSON - Standard JavaScript objects

Examples:
  navigate https://github.com
  set homepage https://lonx.dev
  get javascript
  document.title
  Math.random()
        `;
        
        this.log(helpText, 'info');
    }

    getCommandHistory() {
        return [...this.commandHistory];
    }

    // Method to handle history navigation in input
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return null;

        if (direction === 'up') {
            this.historyIndex = Math.min(this.historyIndex + 1, this.commandHistory.length - 1);
        } else if (direction === 'down') {
            this.historyIndex = Math.max(this.historyIndex - 1, -1);
        }

        return this.historyIndex >= 0 ? this.commandHistory[this.historyIndex] : '';
    }

    // Method to capture page errors
    capturePageError(error, source, line, col) {
        this.log(`Page Error: ${error} at ${source}:${line}:${col}`, 'error');
    }

    // Method to capture network errors
    captureNetworkError(url, error) {
        this.log(`Network Error: Failed to load ${url} - ${error}`, 'error');
    }

    // Method to log performance metrics
    logPerformance(metric, value) {
        this.log(`Performance: ${metric} = ${value}ms`, 'info');
    }

    // Method to export console logs
    exportLogs() {
        const logs = this.messages.map(msg => ({
            timestamp: msg.timestamp,
            type: msg.type,
            message: msg.message,
            source: msg.source
        }));

        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lonxrender-console-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.log('Console logs exported', 'info');
    }
}

// Setup enhanced console input handling
document.addEventListener('DOMContentLoaded', function() {
    const consoleInput = document.getElementById('console-input');
    if (consoleInput && window.LonxRender) {
        let historyIndex = -1;
        
        consoleInput.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const cmd = window.LonxRender.consoleManager.navigateHistory('up');
                if (cmd !== null) {
                    this.value = cmd;
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const cmd = window.LonxRender.consoleManager.navigateHistory('down');
                if (cmd !== null) {
                    this.value = cmd;
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Simple tab completion could be added here
            }
        });
    }
});

// Capture global errors
window.addEventListener('error', function(e) {
    if (window.LonxRender && window.LonxRender.consoleManager) {
        window.LonxRender.consoleManager.capturePageError(
            e.message, 
            e.filename, 
            e.lineno, 
            e.colno
        );
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LonxConsole;
}

// Make globally available
window.LonxConsole = LonxConsole;
