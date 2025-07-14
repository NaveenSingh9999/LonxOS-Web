// LonxOS Window Manager (LWM) v1.0
// True floating window manager with full GUI capabilities

class LonxWindowManager {
    constructor() {
        this.windowRegistry = new Map();
        this.nextWindowId = 1;
        this.highestZIndex = 1000;
        this.activeWindowId = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragData = {};
        this.resizeData = {};
        this.settings = this.loadSettings();
        
        this.initializeWindowManager();
    }

    loadSettings() {
        // Get settings from LonxOS settings system
        try {
            const settingsData = localStorage.getItem('/');
            if (settingsData) {
                const fs = JSON.parse(settingsData);
                const settingsJson = fs.dec?.settings?.['settings.json'];
                if (settingsJson) {
                    const settings = JSON.parse(settingsJson);
                    return settings.windowManager || this.getDefaultSettings();
                }
            }
        } catch (error) {
            console.warn('[LWM] Could not load settings, using defaults');
        }
        return this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            defaultWidth: 800,
            defaultHeight: 600,
            defaultPosition: 'center',
            windowControls: {
                style: 'lonx',
                placement: 'right',
                animation: true
            },
            theme: {
                titlebarBg: '#222',
                titlebarText: '#fff',
                borderRadius: '8px',
                shadow: '0 8px 32px rgba(0,0,0,0.3)',
                blur: 'blur(10px)'
            }
        };
    }

    initializeWindowManager() {
        // Inject CSS styles
        this.injectStyles();
        
        // Setup global event listeners
        this.setupEventListeners();
        
        console.log('[LWM] Lonx Window Manager v1.0 initialized');
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'lwm-styles';
        style.textContent = `
            /* LonxOS Window Manager Styles v1.0 - Enhanced with Animations & Fullscreen */
            .lonx-window {
                position: fixed;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: ${this.settings.theme.blur};
                border-radius: ${this.settings.theme.borderRadius};
                box-shadow: ${this.settings.theme.shadow};
                border: 1px solid rgba(255, 255, 255, 0.2);
                overflow: hidden;
                min-width: 300px;
                min-height: 200px;
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                
                /* SMOOTH AS F**K ANIMATIONS */
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translate3d(0, 0, 0);
                will-change: transform, width, height, box-shadow;
                
                /* Entry animation */
                opacity: 0;
                transform: translate3d(-50%, -50%, 0) scale(0.8);
                animation: windowFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            
            @keyframes windowFadeIn {
                from {
                    opacity: 0;
                    transform: translate3d(-50%, -50%, 0) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate3d(0, 0, 0) scale(1);
                }
            }
            
            @keyframes windowFadeOut {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.8);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                }
            }
            
            .lonx-window.closing {
                animation: windowFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .lonx-window.active {
                border-color: #007AFF;
                box-shadow: 0 12px 48px rgba(0, 122, 255, 0.3), 0 0 0 1px rgba(0, 122, 255, 0.2);
                z-index: 1001;
            }

            .lonx-window.visible {
                opacity: 1;
                transform: scale(1);
            }
            
            /* FULLSCREEN LOCK MODE */
            .lonx-window.fullscreen {
                width: 100vw !important;
                height: 100vh !important;
                top: 0 !important;
                left: 0 !important;
                border-radius: 0 !important;
                border: none !important;
                z-index: 9999 !important;
                backdrop-filter: none !important;
                background: #fff !important;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .lonx-window.fullscreen .window-resize-handle {
                display: none !important;
            }
            
            .lonx-window.fullscreen .window-titlebar {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-bottom: 1px solid #444;
                color: #fff;
            }
            
            /* Smooth dragging and resizing */
            .lonx-window.dragging {
                transition: none;
                cursor: move;
                transform: translate3d(var(--x, 0), var(--y, 0), 0);
            }
            
            .lonx-window.resizing {
                transition: none;
                cursor: se-resize;
            }
            
            /* Focus glow effect */
            .lonx-window.active::before {
                content: '';
                position: absolute;
                top: -3px;
                left: -3px;
                right: -3px;
                bottom: -3px;
                background: linear-gradient(45deg, 
                    rgba(0, 122, 255, 0.1) 0%, 
                    rgba(0, 122, 255, 0.05) 25%, 
                    rgba(0, 122, 255, 0.1) 50%, 
                    rgba(0, 122, 255, 0.05) 75%, 
                    rgba(0, 122, 255, 0.1) 100%);
                border-radius: 12px;
                z-index: -1;
                animation: focusGlow 2s ease-in-out infinite;
                pointer-events: none;
            }
            
            @keyframes focusGlow {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.6; }
            }

            .window-titlebar {
                background: ${this.settings.theme.titlebarBg};
                color: ${this.settings.theme.titlebarText};
                padding: 8px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
                cursor: move;
                height: 32px;
                box-sizing: border-box;
                transition: all 0.2s ease;
            }

            .window-titlebar:hover {
                background: #333;
            }

            .window-icon {
                font-weight: bold;
                font-size: 14px;
                color: #007AFF;
                min-width: 24px;
                text-align: center;
            }

            .window-title {
                flex: 1;
                text-align: center;
                font-size: 13px;
                font-weight: 500;
                margin: 0 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .window-controls {
                display: flex;
                gap: 4px;
            }

            .window-controls button {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .window-controls button:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.15);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            
            /* Enhanced control button styles */
            .fullscreen-btn {
                background: #28a745 !important;
            }
            
            .fullscreen-btn:hover {
                background: #218838 !important;
                transform: scale(1.15);
            }

            .close-btn:hover {
                background: #FF3B30 !important;
            }

            .max-btn:hover {
                background: #34C759 !important;
            }

            .min-btn:hover {
                background: #FF9500 !important;
            }

            .window-content {
                flex: 1;
                overflow: hidden;
                position: relative;
                height: calc(100% - 32px);
            }

            .window-content iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: #fff;
            }

            .window-resize-handle {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 16px;
                height: 16px;
                cursor: nw-resize;
                background: linear-gradient(-45deg, transparent 30%, #007AFF 30%, #007AFF 70%, transparent 70%);
                opacity: 0.6;
                transition: all 0.2s ease;
            }

            .window-resize-handle:hover {
                opacity: 1;
                transform: scale(1.1);
                background: linear-gradient(-45deg, transparent 30%, #FF3B30 30%, #FF3B30 70%, transparent 70%);
            }

            /* Minimized window animation */
            .lonx-window.minimized {
                transform: scale(0.1) translate3d(0, 100vh, 0);
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Desktop overlay for show desktop */
            .lonx-desktop-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.1);
                z-index: 999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            
            .lonx-desktop-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
        `;
        
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Global mouse events for drag and resize
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Window focus events
        document.addEventListener('click', this.handleWindowFocus.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    createWindow(appInfo) {
        const windowId = `lwm-${this.nextWindowId++}`;
        
        // Default app info
        const config = {
            id: windowId,
            title: appInfo.title || 'Untitled Window',
            icon: appInfo.icon || 'lx',
            url: appInfo.url || 'about:blank',
            width: appInfo.width || this.settings.defaultWidth,
            height: appInfo.height || this.settings.defaultHeight,
            x: appInfo.x || null,
            y: appInfo.y || null,
            resizable: appInfo.resizable !== false,
            minimizable: appInfo.minimizable !== false,
            maximizable: appInfo.maximizable !== false,
            closable: appInfo.closable !== false
        };

        // Calculate position if not specified
        if (config.x === null || config.y === null) {
            const centerX = (window.innerWidth - config.width) / 2;
            const centerY = (window.innerHeight - config.height) / 2;
            config.x = centerX;
            config.y = centerY;
        }

        // Create window element
        const windowElement = this.createWindowElement(config);
        
        // Add to registry
        this.windowRegistry.set(windowId, {
            config,
            element: windowElement,
            isMinimized: false,
            isMaximized: false,
            lastPosition: { x: config.x, y: config.y },
            lastSize: { width: config.width, height: config.height }
        });

        // Add to DOM
        document.body.appendChild(windowElement);

        // Animate in
        setTimeout(() => {
            windowElement.classList.add('visible');
        }, 10);

        // Focus the new window
        this.focusWindow(windowId);

        console.log(`[LWM] Created window: ${config.title} (${windowId})`);
        return windowId;
    }

    createWindowElement(config) {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'lonx-window';
        windowDiv.setAttribute('data-id', config.id);
        windowDiv.style.left = `${config.x}px`;
        windowDiv.style.top = `${config.y}px`;
        windowDiv.style.width = `${config.width}px`;
        windowDiv.style.height = `${config.height}px`;
        windowDiv.style.zIndex = ++this.highestZIndex;

        windowDiv.innerHTML = `
            <div class="window-titlebar" data-action="titlebar">
                <div class="window-icon">${config.icon}</div>
                <div class="window-title">${config.title}</div>
                <div class="window-controls">
                    <button class="fullscreen-btn" data-action="fullscreen" title="Fullscreen">🔲</button>
                    ${config.minimizable ? '<button class="min-btn" data-action="minimize" title="Minimize">−</button>' : ''}
                    ${config.maximizable ? '<button class="max-btn" data-action="maximize" title="Maximize">□</button>' : ''}
                    ${config.closable ? '<button class="close-btn" data-action="close" title="Close">×</button>' : ''}
                </div>
            </div>
            <div class="window-content">
                ${config.content ? config.content :
                    config.url.startsWith('data:') || config.url === 'about:blank' 
                        ? `<div style="padding: 20px;">${config.url === 'about:blank' ? 'Empty Window' : config.url}</div>`
                        : `<iframe src="${config.url}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`
                }
            </div>
            ${config.resizable ? '<div class="window-resize-handle" data-action="resize"></div>' : ''}
        `;

        return windowDiv;
    }

    focusWindow(windowId) {
        // Remove active class from all windows
        document.querySelectorAll('.lonx-window').forEach(w => w.classList.remove('active'));
        
        const windowData = this.windowRegistry.get(windowId);
        if (windowData) {
            windowData.element.classList.add('active');
            windowData.element.style.zIndex = ++this.highestZIndex;
            this.activeWindowId = windowId;
        }
    }

    closeWindow(windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData) {
            // Smooth fade-out animation
            windowData.element.classList.add('closing');
            
            setTimeout(() => {
                if (windowData.element.parentNode) {
                    windowData.element.parentNode.removeChild(windowData.element);
                }
                this.windowRegistry.delete(windowId);
                
                if (this.activeWindowId === windowId) {
                    this.activeWindowId = null;
                    // Focus on the topmost window
                    const remainingWindows = Array.from(document.querySelectorAll('.lonx-window'))
                        .filter(w => !w.classList.contains('minimized'))
                        .sort((a, b) => parseInt(b.style.zIndex) - parseInt(a.style.zIndex));
                    
                    if (remainingWindows.length > 0) {
                        const topWindow = remainingWindows[0];
                        const topWindowId = topWindow.getAttribute('data-id');
                        this.focusWindow(topWindowId);
                    }
                }
            }, 200); // Match the animation duration
        }
    }

    minimizeWindow(windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData) {
            windowData.isMinimized = true;
            windowData.element.classList.add('minimized');
            
            if (this.activeWindowId === windowId) {
                this.activeWindowId = null;
                // Focus on the topmost visible window
                const visibleWindows = Array.from(document.querySelectorAll('.lonx-window:not(.minimized)'))
                    .sort((a, b) => parseInt(b.style.zIndex) - parseInt(a.style.zIndex));
                
                if (visibleWindows.length > 0) {
                    const topWindow = visibleWindows[0];
                    const topWindowId = topWindow.getAttribute('data-id');
                    this.focusWindow(topWindowId);
                }
            }
        }
    }

    maximizeWindow(windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData) {
            if (windowData.isMaximized) {
                // Restore to original size
                windowData.element.style.width = windowData.originalWidth + 'px';
                windowData.element.style.height = windowData.originalHeight + 'px';
                windowData.element.style.left = windowData.originalX + 'px';
                windowData.element.style.top = windowData.originalY + 'px';
                windowData.isMaximized = false;
                
                // Re-enable resize handle
                const resizeHandle = windowData.element.querySelector('.window-resize-handle');
                if (resizeHandle) resizeHandle.style.display = 'block';
            } else {
                // Store original dimensions
                windowData.originalWidth = windowData.element.offsetWidth;
                windowData.originalHeight = windowData.element.offsetHeight;
                windowData.originalX = windowData.element.offsetLeft;
                windowData.originalY = windowData.element.offsetTop;
                
                // Maximize
                windowData.element.style.width = '100vw';
                windowData.element.style.height = '100vh';
                windowData.element.style.left = '0px';
                windowData.element.style.top = '0px';
                windowData.isMaximized = true;
                
                // Hide resize handle
                const resizeHandle = windowData.element.querySelector('.window-resize-handle');
                if (resizeHandle) resizeHandle.style.display = 'none';
            }
            
            this.focusWindow(windowId);
        }
    }

    // NEW: Fullscreen functionality
    toggleFullscreen(windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData) {
            if (windowData.isFullscreen) {
                // Exit fullscreen - restore to last known size/position
                windowData.element.classList.remove('fullscreen');
                windowData.element.style.width = (windowData.lastWidth || windowData.originalWidth || 800) + 'px';
                windowData.element.style.height = (windowData.lastHeight || windowData.originalHeight || 600) + 'px';
                windowData.element.style.left = (windowData.lastX || windowData.originalX || 100) + 'px';
                windowData.element.style.top = (windowData.lastY || windowData.originalY || 100) + 'px';
                windowData.isFullscreen = false;
                
                // Re-enable interactions
                this.enableWindowInteractions(windowData.element);
                
                // Update button icon
                const fullscreenBtn = windowData.element.querySelector('[data-action="fullscreen"]');
                if (fullscreenBtn) fullscreenBtn.textContent = '🔲';
            } else {
                // Enter fullscreen - store current state
                windowData.lastWidth = windowData.element.offsetWidth;
                windowData.lastHeight = windowData.element.offsetHeight;
                windowData.lastX = windowData.element.offsetLeft;
                windowData.lastY = windowData.element.offsetTop;
                
                // Apply fullscreen
                windowData.element.classList.add('fullscreen');
                windowData.isFullscreen = true;
                
                // Disable interactions (drag/resize)
                this.disableWindowInteractions(windowData.element);
                
                // Update button icon
                const fullscreenBtn = windowData.element.querySelector('[data-action="fullscreen"]');
                if (fullscreenBtn) fullscreenBtn.textContent = '🔳';
            }
            
            this.focusWindow(windowId);
        }
    }

    // Helper methods for fullscreen mode
    disableWindowInteractions(windowElement) {
        const titlebar = windowElement.querySelector('.window-titlebar');
        const resizeHandle = windowElement.querySelector('.window-resize-handle');
        
        if (titlebar) titlebar.style.cursor = 'default';
        if (resizeHandle) resizeHandle.style.display = 'none';
        
        windowElement.setAttribute('data-fullscreen-disabled', 'true');
    }

    enableWindowInteractions(windowElement) {
        const titlebar = windowElement.querySelector('.window-titlebar');
        const resizeHandle = windowElement.querySelector('.window-resize-handle');
        
        if (titlebar) titlebar.style.cursor = 'move';
        if (resizeHandle) resizeHandle.style.display = 'block';
        
        windowElement.removeAttribute('data-fullscreen-disabled');
    }

    handleMouseDown(event) {
        const target = event.target;
        const windowElement = target.closest('.lonx-window');
        
        if (!windowElement) return;
        
        const windowId = windowElement.getAttribute('data-id');
        const action = target.getAttribute('data-action');
        
        this.focusWindow(windowId);
        
        if (action === 'close') {
            this.closeWindow(windowId);
        } else if (action === 'minimize') {
            this.minimizeWindow(windowId);
        } else if (action === 'maximize') {
            this.maximizeWindow(windowId);
        } else if (action === 'fullscreen') {
            this.toggleFullscreen(windowId);
        } else if (action === 'titlebar') {
            // Don't allow dragging in fullscreen mode
            const windowData = this.windowRegistry.get(windowId);
            if (!windowData?.isFullscreen) {
                this.startDrag(event, windowId);
            }
        } else if (action === 'resize') {
            // Don't allow resizing in fullscreen mode
            const windowData = this.windowRegistry.get(windowId);
            if (!windowData?.isFullscreen) {
                this.startResize(event, windowId);
            }
        }
    }

    handleMouseMove(event) {
        if (this.isDragging) {
            this.updateDrag(event);
        } else if (this.isResizing) {
            this.updateResize(event);
        }
    }

    handleMouseUp(event) {
        // Remove dragging class and reset transform on drag end
        if (this.isDragging && this.dragData.windowId) {
            const windowData = this.windowRegistry.get(this.dragData.windowId);
            if (windowData) {
                windowData.element.classList.remove('dragging');
                
                // Convert translate3d position back to left/top for consistency
                const actualLeft = parseInt(windowData.element.dataset.actualLeft || '0');
                const actualTop = parseInt(windowData.element.dataset.actualTop || '0');
                
                windowData.element.style.transform = '';
                windowData.element.style.left = actualLeft + 'px';
                windowData.element.style.top = actualTop + 'px';
            }
        }
        
        if (this.isResizing && this.resizeData.windowId) {
            const windowData = this.windowRegistry.get(this.resizeData.windowId);
            if (windowData) {
                windowData.element.classList.remove('resizing');
            }
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.dragData = {};
        this.resizeData = {};
        document.body.style.cursor = '';
    }

    startDrag(event, windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData && !windowData.isMaximized && !windowData.isFullscreen) {
            this.isDragging = true;
            this.dragData = {
                windowId,
                startX: event.clientX,
                startY: event.clientY,
                startLeft: parseInt(windowData.element.style.left),
                startTop: parseInt(windowData.element.style.top)
            };
            
            // Add dragging class for smooth animations
            windowData.element.classList.add('dragging');
            document.body.style.cursor = 'move';
        }
    }

    updateDrag(event) {
        if (this.dragData.windowId) {
            const windowData = this.windowRegistry.get(this.dragData.windowId);
            if (windowData) {
                const deltaX = event.clientX - this.dragData.startX;
                const deltaY = event.clientY - this.dragData.startY;
                
                const newLeft = this.dragData.startLeft + deltaX;
                const newTop = this.dragData.startTop + deltaY;
                
                // Constrain to screen bounds
                const maxLeft = window.innerWidth - 100; // Keep at least 100px visible
                const maxTop = window.innerHeight - 50;
                
                const constrainedLeft = Math.max(-50, Math.min(newLeft, maxLeft));
                const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
                
                // Use translate3d for buttery smooth movement
                windowData.element.style.transform = `translate3d(${constrainedLeft}px, ${constrainedTop}px, 0)`;
                windowData.element.style.left = '0px';
                windowData.element.style.top = '0px';
                
                // Store actual position for future reference
                windowData.element.dataset.actualLeft = constrainedLeft;
                windowData.element.dataset.actualTop = constrainedTop;
            }
        }
    }

    startResize(event, windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData && !windowData.isFullscreen) {
            this.isResizing = true;
            this.resizeData = {
                windowId,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: parseInt(windowData.element.style.width),
                startHeight: parseInt(windowData.element.style.height)
            };
            
            // Add resizing class for smooth animations
            windowData.element.classList.add('resizing');
            document.body.style.cursor = 'nw-resize';
        }
    }

    updateResize(event) {
        if (this.resizeData.windowId) {
            const windowData = this.windowRegistry.get(this.resizeData.windowId);
            if (windowData) {
                const deltaX = event.clientX - this.resizeData.startX;
                const deltaY = event.clientY - this.resizeData.startY;
                
                const newWidth = Math.max(300, this.resizeData.startWidth + deltaX);
                const newHeight = Math.max(200, this.resizeData.startHeight + deltaY);
                
                windowData.element.style.width = `${newWidth}px`;
                windowData.element.style.height = `${newHeight}px`;
            }
        }
    }

    handleWindowFocus(event) {
        const windowElement = event.target.closest('.lonx-window');
        if (windowElement) {
            const windowId = windowElement.getAttribute('data-id');
            this.focusWindow(windowId);
        }
    }

    handleKeyboard(event) {
        // Enhanced keyboard shortcuts
        this.handleKeyboardShortcuts(event);
        
        // Alt+F4 to close active window (classic)
        if (event.altKey && event.key === 'F4') {
            if (this.activeWindowId) {
                this.closeWindow(this.activeWindowId);
                event.preventDefault();
            }
        }
    }

    // Public API methods
    getWindowList() {
        return Array.from(this.windowRegistry.entries()).map(([id, data]) => ({
            id,
            title: data.config.title,
            isMinimized: data.isMinimized,
            isMaximized: data.isMaximized
        }));
    }

    getAllWindows() {
        return Array.from(this.windowRegistry.values());
    }

    isFullscreenMode() {
        return Array.from(this.windowRegistry.values()).some(data => data.isFullscreen);
    }

    toggleFullscreenMode() {
        // If any window is fullscreen, exit all fullscreen windows
        const fullscreenWindows = Array.from(this.windowRegistry.entries())
            .filter(([id, data]) => data.isFullscreen);
        
        if (fullscreenWindows.length > 0) {
            fullscreenWindows.forEach(([id, data]) => {
                this.toggleFullscreen(id);
            });
        } else {
            // If no windows are fullscreen, make the active window fullscreen
            if (this.activeWindowId) {
                this.toggleFullscreen(this.activeWindowId);
            }
        }
    }

    restoreWindow(windowId) {
        const windowData = this.windowRegistry.get(windowId);
        if (windowData && windowData.isMinimized) {
            windowData.element.classList.remove('minimized');
            windowData.isMinimized = false;
            this.focusWindow(windowId);
        }
    }

    // Show desktop - minimize all windows
    showDesktop() {
        const allWindows = Array.from(this.windowRegistry.keys());
        allWindows.forEach(windowId => {
            const windowData = this.windowRegistry.get(windowId);
            if (windowData && !windowData.isMinimized) {
                this.minimizeWindow(windowId);
            }
        });
    }

    // Enhanced keyboard shortcuts
    handleKeyboardShortcuts(event) {
        // Ctrl+Shift+F for fullscreen toggle
        if (event.ctrlKey && event.shiftKey && event.key === 'F') {
            if (this.activeWindowId) {
                this.toggleFullscreen(this.activeWindowId);
                event.preventDefault();
            }
        }
        
        // Alt+Tab for window switching (simplified)
        if (event.altKey && event.key === 'Tab') {
            const visibleWindows = Array.from(this.windowRegistry.entries())
                .filter(([id, data]) => !data.isMinimized)
                .sort((a, b) => parseInt(b[1].element.style.zIndex) - parseInt(a[1].element.style.zIndex));
            
            if (visibleWindows.length > 1) {
                const nextWindow = visibleWindows[1]; // Get second window
                this.focusWindow(nextWindow[0]);
                event.preventDefault();
            }
        }
        
        // Ctrl+W to close active window
        if (event.ctrlKey && event.key === 'w') {
            if (this.activeWindowId) {
                this.closeWindow(this.activeWindowId);
                event.preventDefault();
            }
        }
        
        // Win+D to show desktop
        if (event.metaKey && event.key === 'd') {
            this.showDesktop();
            event.preventDefault();
        }
    }
}

// Global window manager instance
let lwm = null;

// Initialize window manager
export function initWindowManager() {
    if (!lwm) {
        lwm = new LonxWindowManager();
        
        // Expose to global scope for apps
        window.lonxWM = lwm;
        window.lwm = lwm; // Short alias
    }
    return lwm;
}

// Export for module usage
export { LonxWindowManager };
export default lwm;
