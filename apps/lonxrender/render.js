/**
 * LonxRender Engine - Custom Rendering System
 * Handles page fetching, parsing, and rendering without iframes
 */

class LonxRenderEngine {
    constructor() {
        this.pages = new Map();
        this.parser = new DOMParser();
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        this.allowedOrigins = new Set(['localhost', '127.0.0.1', 'lonx.dev']);
    }

    async loadPage(url, tabId) {
        try {
            console.log(`[RenderEngine] Loading: ${url}`);
            
            // Handle local files
            if (url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
                return await this.loadLocalFile(url, tabId);
            }
            
            // Handle special URLs
            if (url.startsWith('data:')) {
                return this.loadDataURL(url, tabId);
            }
            
            // Handle external URLs
            return await this.loadExternalURL(url, tabId);
            
        } catch (error) {
            console.error(`[RenderEngine] Failed to load ${url}:`, error);
            this.renderErrorPage(tabId, error.message);
            return false;
        }
    }

    async loadLocalFile(url, tabId) {
        try {
            // Clean up the URL
            const cleanUrl = url.replace(/^\.\//, '');
            
            const response = await fetch(cleanUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || 'text/html';
            
            if (contentType.includes('text/html')) {
                const html = await response.text();
                this.renderHTML(html, tabId, url);
            } else if (contentType.includes('text/')) {
                const text = await response.text();
                this.renderPlainText(text, tabId, url);
            } else {
                this.renderUnsupportedContent(contentType, tabId, url);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[RenderEngine] Local file error:`, error);
            throw error;
        }
    }

    async loadExternalURL(url, tabId) {
        try {
            // First try direct fetch (for CORS-enabled sites)
            let response;
            let usedProxy = false;
            
            try {
                response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'User-Agent': 'LonxRender/1.0 (LonxOS Browser Engine)'
                    }
                });
            } catch (corsError) {
                console.log(`[RenderEngine] CORS failed, trying proxy...`);
                
                // Fallback to proxy
                response = await fetch(`${this.corsProxy}${encodeURIComponent(url)}`);
                usedProxy = true;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || 'text/html';
            
            if (contentType.includes('text/html')) {
                const html = await response.text();
                this.renderHTML(html, tabId, url, usedProxy);
            } else if (contentType.includes('application/json')) {
                const json = await response.text();
                this.renderJSON(json, tabId, url);
            } else if (contentType.includes('text/')) {
                const text = await response.text();
                this.renderPlainText(text, tabId, url);
            } else {
                this.renderUnsupportedContent(contentType, tabId, url);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[RenderEngine] External URL error:`, error);
            throw error;
        }
    }

    loadDataURL(url, tabId) {
        try {
            // Parse data URL
            const [metadata, data] = url.substring(5).split(',');
            const [mimeType, encoding] = metadata.split(';');
            
            let content;
            if (encoding === 'base64') {
                content = atob(data);
            } else {
                content = decodeURIComponent(data);
            }
            
            if (mimeType.includes('text/html')) {
                this.renderHTML(content, tabId, url);
            } else {
                this.renderPlainText(content, tabId, url);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[RenderEngine] Data URL error:`, error);
            throw error;
        }
    }

    renderHTML(html, tabId, originalUrl, usedProxy = false) {
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (!content) return;
        
        try {
            // Parse the HTML
            const doc = this.parser.parseFromString(html, 'text/html');
            
            // Process and sanitize the content
            this.processDocument(doc, originalUrl);
            
            // Create render container
            const renderContainer = document.createElement('div');
            renderContainer.className = 'render-content';
            renderContainer.style.cssText = `
                height: 100%;
                width: 100%;
                overflow: auto;
                background: white;
                color: black;
            `;
            
            // Add proxy warning if used
            if (usedProxy) {
                const proxyWarning = document.createElement('div');
                proxyWarning.style.cssText = `
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 8px 12px;
                    font-size: 12px;
                    border-bottom: 1px solid #ddd;
                `;
                proxyWarning.innerHTML = `⚠️ This page was loaded through a proxy due to CORS restrictions. Some features may not work correctly.`;
                renderContainer.appendChild(proxyWarning);
            }
            
            // Extract and apply styles
            const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
            const styleContainer = document.createElement('div');
            
            styles.forEach(styleEl => {
                if (styleEl.tagName === 'STYLE') {
                    const newStyle = document.createElement('style');
                    newStyle.textContent = this.sanitizeCSS(styleEl.textContent);
                    styleContainer.appendChild(newStyle);
                } else if (styleEl.tagName === 'LINK') {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = this.resolveURL(styleEl.href, originalUrl);
                    styleContainer.appendChild(newLink);
                }
            });
            
            renderContainer.appendChild(styleContainer);
            
            // Extract and render body content
            const body = doc.body || doc.documentElement;
            if (body) {
                const bodyContent = document.createElement('div');
                bodyContent.innerHTML = body.innerHTML;
                
                // Process scripts if JavaScript is enabled
                if (window.LonxRender && window.LonxRender.settings.javascript) {
                    this.processScripts(bodyContent, tabId);
                } else {
                    // Remove scripts if JS is disabled
                    bodyContent.querySelectorAll('script').forEach(script => script.remove());
                }
                
                // Process images and other resources
                this.processResources(bodyContent, originalUrl);
                
                renderContainer.appendChild(bodyContent);
            }
            
            // Replace content
            content.innerHTML = '';
            content.appendChild(renderContainer);
            
            // Store page data
            this.pages.set(tabId, {
                url: originalUrl,
                title: this.extractTitle(doc),
                favicon: this.extractFavicon(doc, originalUrl),
                dom: doc
            });
            
        } catch (error) {
            console.error(`[RenderEngine] HTML rendering error:`, error);
            this.renderErrorPage(tabId, `Rendering error: ${error.message}`);
        }
    }

    renderJSON(json, tabId, url) {
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (!content) return;
        
        try {
            const parsed = JSON.parse(json);
            const formatted = JSON.stringify(parsed, null, 2);
            
            content.innerHTML = `
                <div class="render-content">
                    <div style="padding: 20px; font-family: monospace; background: #f8f9fa; color: #333;">
                        <h3>JSON Data</h3>
                        <pre style="background: white; padding: 15px; border-radius: 5px; overflow: auto;">${this.escapeHTML(formatted)}</pre>
                    </div>
                </div>
            `;
            
            this.pages.set(tabId, {
                url,
                title: 'JSON Data',
                favicon: '📄',
                dom: null
            });
            
        } catch (error) {
            this.renderPlainText(json, tabId, url);
        }
    }

    renderPlainText(text, tabId, url) {
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (!content) return;
        
        content.innerHTML = `
            <div class="render-content">
                <div style="padding: 20px; font-family: monospace; background: white; color: black;">
                    <h3>Text Content</h3>
                    <pre style="white-space: pre-wrap; line-height: 1.4;">${this.escapeHTML(text)}</pre>
                </div>
            </div>
        `;
        
        this.pages.set(tabId, {
            url,
            title: 'Text Document',
            favicon: '📄',
            dom: null
        });
    }

    renderUnsupportedContent(contentType, tabId, url) {
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (!content) return;
        
        content.innerHTML = `
            <div class="render-content">
                <div style="padding: 40px; text-align: center; background: white; color: black;">
                    <h2>📁 Unsupported Content Type</h2>
                    <p>Content type: <code>${contentType}</code></p>
                    <p>This file type cannot be displayed in the browser.</p>
                    <button onclick="window.open('${url}', '_blank')" style="
                        background: #007AFF;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">Open in External App</button>
                </div>
            </div>
        `;
        
        this.pages.set(tabId, {
            url,
            title: 'Unsupported Content',
            favicon: '📁',
            dom: null
        });
    }

    renderErrorPage(tabId, message) {
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (!content) return;
        
        content.innerHTML = `
            <div class="error-page">
                <h2>🚫 Page Load Error</h2>
                <p>${this.escapeHTML(message)}</p>
                <button class="retry-btn" onclick="LonxRender.reload()">Try Again</button>
            </div>
        `;
    }

    processDocument(doc, baseUrl) {
        // Remove potentially dangerous elements
        const dangerousElements = doc.querySelectorAll('script[src*="eval"], script[src*="Function"], embed, object');
        dangerousElements.forEach(el => el.remove());
        
        // Process all links to be absolute
        const links = doc.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('data:')) {
                link.setAttribute('href', this.resolveURL(href, baseUrl));
                link.setAttribute('target', '_blank'); // Open in new tab
            }
        });
        
        // Process forms
        const forms = doc.querySelectorAll('form');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action) {
                form.setAttribute('action', this.resolveURL(action, baseUrl));
            }
        });
    }

    processScripts(container, tabId) {
        const scripts = container.querySelectorAll('script');
        
        scripts.forEach(script => {
            if (script.src) {
                // External script - load and execute in sandbox
                this.loadExternalScript(script.src, tabId);
            } else if (script.textContent) {
                // Inline script - execute in sandbox
                this.executeInSandbox(script.textContent, tabId);
            }
            
            // Remove the original script tag
            script.remove();
        });
    }

    processResources(container, baseUrl) {
        // Process images
        const images = container.querySelectorAll('img[src]');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                img.setAttribute('src', this.resolveURL(src, baseUrl));
            }
        });
        
        // Process other resources
        const resources = container.querySelectorAll('[src], [href]');
        resources.forEach(el => {
            ['src', 'href'].forEach(attr => {
                const value = el.getAttribute(attr);
                if (value && !value.startsWith('data:') && !value.startsWith('javascript:')) {
                    el.setAttribute(attr, this.resolveURL(value, baseUrl));
                }
            });
        });
    }

    async loadExternalScript(src, tabId) {
        try {
            const response = await fetch(src);
            const scriptContent = await response.text();
            this.executeInSandbox(scriptContent, tabId);
        } catch (error) {
            console.warn(`[RenderEngine] Failed to load script: ${src}`, error);
        }
    }

    executeInSandbox(code, tabId) {
        if (window.LonxRender && window.LonxRender.sandboxWorker) {
            window.LonxRender.sandboxWorker.postMessage({
                type: 'execute',
                code: code,
                tabId: tabId
            });
        } else {
            console.warn('[RenderEngine] Sandbox worker not available, skipping script execution');
        }
    }

    resolveURL(url, baseUrl) {
        try {
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                return url;
            }
            
            const base = new URL(baseUrl);
            return new URL(url, base).href;
        } catch (error) {
            console.warn(`[RenderEngine] URL resolution failed: ${url}`, error);
            return url;
        }
    }

    sanitizeCSS(css) {
        // Basic CSS sanitization
        return css
            .replace(/@import\s+url\([^)]*\);?/gi, '') // Remove @import
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/expression\s*\(/gi, 'invalid('); // Disable CSS expressions
    }

    extractTitle(doc) {
        const titleEl = doc.querySelector('title');
        if (titleEl) {
            return titleEl.textContent.trim();
        }
        
        const h1 = doc.querySelector('h1');
        if (h1) {
            return h1.textContent.trim();
        }
        
        return 'Untitled Page';
    }

    extractFavicon(doc, baseUrl) {
        const faviconSelectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]'
        ];
        
        for (const selector of faviconSelectors) {
            const faviconEl = doc.querySelector(selector);
            if (faviconEl) {
                const href = faviconEl.getAttribute('href');
                if (href) {
                    return this.resolveURL(href, baseUrl);
                }
            }
        }
        
        // Default favicon
        try {
            const base = new URL(baseUrl);
            return `${base.protocol}//${base.host}/favicon.ico`;
        } catch (error) {
            return '🌐';
        }
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API methods
    async getPageTitle(tabId) {
        const page = this.pages.get(tabId);
        return page ? page.title : 'Untitled';
    }

    async getPageFavicon(tabId) {
        const page = this.pages.get(tabId);
        return page ? page.favicon : '🌐';
    }

    getPageDOM(tabId) {
        const page = this.pages.get(tabId);
        return page ? page.dom : null;
    }

    clearPageData(tabId) {
        this.pages.delete(tabId);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LonxRenderEngine;
}

// Make globally available
window.LonxRenderEngine = LonxRenderEngine;
