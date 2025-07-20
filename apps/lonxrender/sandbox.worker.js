/**
 * LonxRender Sandbox Worker
 * Provides secure JavaScript execution environment
 */

// Sandboxed execution context
const SandboxContext = {
    // Safe globals only
    console: {
        log: (...args) => self.postMessage({ type: 'log', result: args.join(' ') }),
        error: (...args) => self.postMessage({ type: 'log', result: `Error: ${args.join(' ')}` }),
        warn: (...args) => self.postMessage({ type: 'log', result: `Warning: ${args.join(' ')}` }),
        info: (...args) => self.postMessage({ type: 'log', result: `Info: ${args.join(' ')}` })
    },
    
    // Math and utility functions
    Math: Math,
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    
    // Safe array and object methods
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    
    // Promise support (limited)
    Promise: Promise,
    
    // Timeout functions (limited)
    setTimeout: (fn, delay) => {
        if (delay > 10000) delay = 10000; // Max 10 seconds
        return setTimeout(fn, delay);
    },
    clearTimeout: clearTimeout,
    
    // Limited DOM simulation
    document: {
        createElement: (tagName) => ({
            tagName: tagName.toUpperCase(),
            children: [],
            textContent: '',
            innerHTML: '',
            setAttribute: function(name, value) {
                this.attributes = this.attributes || {};
                this.attributes[name] = value;
            },
            getAttribute: function(name) {
                return this.attributes ? this.attributes[name] : null;
            }
        })
    },
    
    // Limited window object
    window: {
        location: {
            href: 'about:sandbox',
            protocol: 'about:',
            host: 'sandbox'
        },
        navigator: {
            userAgent: 'LonxRender/1.0 Sandbox'
        }
    }
};

// Blocked/dangerous functions and objects
const BlockedGlobals = [
    'eval', 'Function', 'XMLHttpRequest', 'fetch', 'WebSocket',
    'importScripts', 'close', 'postMessage', 'addEventListener',
    'removeEventListener', 'dispatchEvent', 'Worker', 'SharedWorker',
    'ServiceWorker', 'localStorage', 'sessionStorage', 'indexedDB',
    'FileReader', 'Blob', 'File', 'FormData', 'Headers', 'Request',
    'Response', 'URL', 'URLSearchParams'
];

// Message handler
self.onmessage = function(e) {
    const { type, code, tabId } = e.data;
    
    if (type === 'execute') {
        executeCode(code, tabId);
    }
};

function executeCode(code, tabId) {
    try {
        // Validate code for dangerous patterns
        if (containsDangerousPatterns(code)) {
            throw new Error('Code contains potentially dangerous patterns');
        }
        
        // Create execution context
        const contextKeys = Object.keys(SandboxContext);
        const contextValues = Object.values(SandboxContext);
        
        // Create safe execution function
        const safeFunction = new Function(
            ...contextKeys,
            `
            "use strict";
            
            // Block access to dangerous globals
            ${BlockedGlobals.map(name => `
                if (typeof ${name} !== 'undefined') {
                    throw new Error('Access to ${name} is not allowed in sandbox');
                }
            `).join('')}
            
            // Execute user code
            try {
                return (function() {
                    ${code}
                })();
            } catch (error) {
                throw error;
            }
            `
        );
        
        // Execute with timeout
        const timeoutId = setTimeout(() => {
            throw new Error('Code execution timeout (5 seconds)');
        }, 5000);
        
        const result = safeFunction(...contextValues);
        clearTimeout(timeoutId);
        
        // Send result back
        self.postMessage({
            type: 'result',
            result: result !== undefined ? String(result) : 'undefined',
            tabId: tabId
        });
        
    } catch (error) {
        // Send error back
        self.postMessage({
            type: 'error',
            error: error.message,
            tabId: tabId
        });
    }
}

function containsDangerousPatterns(code) {
    const dangerousPatterns = [
        // Direct eval usage
        /\beval\s*\(/i,
        
        // Function constructor
        /new\s+Function\s*\(/i,
        
        // Prototype pollution attempts
        /__proto__/i,
        /constructor\s*\.\s*prototype/i,
        
        // Network requests
        /XMLHttpRequest/i,
        /fetch\s*\(/i,
        /WebSocket/i,
        
        // Worker creation
        /new\s+Worker/i,
        /new\s+SharedWorker/i,
        /importScripts/i,
        
        // DOM manipulation that could escape sandbox
        /document\s*\.\s*write/i,
        /document\s*\.\s*writeln/i,
        /innerHTML\s*=/,
        /outerHTML\s*=/,
        
        // Storage access
        /localStorage/i,
        /sessionStorage/i,
        /indexedDB/i,
        
        // File system access
        /FileReader/i,
        /createObjectURL/i,
        
        // Top-level window access attempts
        /window\s*\.\s*top/i,
        /window\s*\.\s*parent/i,
        /window\s*\.\s*frames/i,
        /self\s*\.\s*parent/i,
        
        // Attempt to break out of worker
        /postMessage/i,
        /addEventListener/i,
        /removeEventListener/i,
        
        // Module loading
        /import\s*\(/i,
        /require\s*\(/i,
        
        // Dangerous string methods
        /fromCharCode/i,
        /String\s*\.\s*raw/i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(code));
}

// Enhanced security: Prevent access to global scope
(function() {
    'use strict';
    
    // Remove dangerous globals if they exist
    const globalObj = self;
    
    BlockedGlobals.forEach(name => {
        try {
            if (name in globalObj) {
                delete globalObj[name];
            }
        } catch (error) {
            // Some properties might not be deletable
            try {
                globalObj[name] = undefined;
            } catch (e) {
                // Ignore if we can't override
            }
        }
    });
    
    // Override potentially dangerous methods
    globalObj.eval = function() {
        throw new Error('eval is not allowed in sandbox');
    };
    
    globalObj.Function = function() {
        throw new Error('Function constructor is not allowed in sandbox');
    };
    
    // Prevent prototype pollution
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(String.prototype);
    Object.freeze(Number.prototype);
    Object.freeze(Boolean.prototype);
    
})();

// Error handler
self.onerror = function(message, source, lineno, colno, error) {
    self.postMessage({
        type: 'error',
        error: `Sandbox Error: ${message} at line ${lineno}`
    });
};

// Unhandled promise rejection handler
self.onunhandledrejection = function(event) {
    self.postMessage({
        type: 'error',
        error: `Unhandled Promise Rejection: ${event.reason}`
    });
};

// Ready signal
self.postMessage({
    type: 'ready',
    message: 'LonxRender Sandbox Worker initialized'
});
