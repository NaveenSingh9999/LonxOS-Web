// Type definitions for LonxOS Window Manager
export interface WindowConfig {
    id?: string;
    title?: string;
    icon?: string;
    url?: string;
    content?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    resizable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    closable?: boolean;
    modal?: boolean;
}

export interface WindowData {
    config: WindowConfig;
    element: HTMLElement;
    isMinimized: boolean;
    isMaximized: boolean;
    isFullscreen?: boolean;
    lastPosition: { x: number; y: number };
    lastSize: { width: number; height: number };
    originalWidth?: number;
    originalHeight?: number;
    originalX?: number;
    originalY?: number;
    lastWidth?: number;
    lastHeight?: number;
    lastX?: number;
    lastY?: number;
}

export interface WindowListItem {
    id: string;
    title: string;
    isMinimized: boolean;
    isMaximized: boolean;
}

export class LonxWindowManager {
    constructor();
    createWindow(appInfo: WindowConfig): string;
    closeWindow(windowId: string): void;
    minimizeWindow(windowId: string): void;
    maximizeWindow(windowId: string): void;
    toggleFullscreen(windowId: string): void;
    focusWindow(windowId: string): void;
    restoreWindow(windowId: string): void;
    showDesktop(): void;
    getWindowList(): WindowListItem[];
    getAllWindows(): WindowData[];
    isFullscreenMode(): boolean;
    toggleFullscreenMode(): void;
}

export function initWindowManager(): LonxWindowManager;
