// Type definitions for LonxOS GUI API
import type { LonxWindowManager, WindowConfig, WindowListItem, WindowData } from './lwm.d.ts';

export class LonxGUI {
    constructor(windowManager?: LonxWindowManager | null);
    init(): LonxWindowManager;
    createWindow(config: WindowConfig): string;
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

export function createGUIAPI(windowManager: LonxWindowManager): LonxGUI;
