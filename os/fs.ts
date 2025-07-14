// os/fs.ts
import { getConfig } from './core/config.js';

let fs: any = null;

export function initFS() {
    const savedFS = localStorage.getItem('/');
    if (savedFS) {
        fs = JSON.parse(savedFS);
        // Upgrade existing filesystem to new structure if needed
        upgradeFilesystem();
    }
    else {
        // Create new filesystem with complete Linux-like structure
        fs = {
            'bin': {},                    // Core shell commands
            'boot': {},                   // Bootloader & kernel files
            'dev': {},                    // Device pseudo-files
            'etc': {
                'config.json': JSON.stringify(getConfig(), null, 2),
                'mim': {}                 // MIM package manager data
            },
            'home': {
                'user': {
                    'Desktop': {},
                    'Downloads': {}
                }
            },
            'lib': {},                    // System-wide shared modules
            'dec': {
                'settings': {
                    'settings.json': JSON.stringify({
                        "defaultApps": {
                            ".txt": "nano",
                            ".rn": "run", 
                            ".json": "nano",
                            ".js": "nano",
                            ".md": "nano",
                            ".sh": "nano"
                        },
                        "theme": "dark",
                        "shell": {
                            "promptSymbol": "➜",
                            "color": "green"
                        },
                        "network": {
                            "dns": "1.1.1.1",
                            "proxy": null
                        },
                        "updates": {
                            "autoCheck": true,
                            "channel": "stable"
                        }
                    }, null, 2)
                }
            },
            'tmp': {},                    // Temporary files
            'var': {
                'log': {}                 // System logs
            },
            'usr': {
                'share': {}               // System resources (banners, themes)
            }
        };
        localStorage.setItem('/', JSON.stringify(fs));
    }
}

function upgradeFilesystem() {
    let needsUpgrade = false;
    
    // Check if new directories exist, create if missing
    const requiredDirs = [
        'bin', 'boot', 'dev', 'lib', 'tmp', 'var', 'usr',
        'home/user/Desktop', 'home/user/Downloads', 
        'dec/settings', 'etc/mim', 'var/log', 'usr/share'
    ];
    
    for (const dirPath of requiredDirs) {
        const parts = dirPath.split('/');
        let current = fs;
        
        for (const part of parts) {
            if (!current[part]) {
                current[part] = {};
                needsUpgrade = true;
            }
            current = current[part];
        }
    }
    
    // Create default settings.json if it doesn't exist
    if (!fs.dec?.settings?.['settings.json']) {
        if (!fs.dec) fs.dec = {};
        if (!fs.dec.settings) fs.dec.settings = {};
        fs.dec.settings['settings.json'] = JSON.stringify({
            "defaultApps": {
                ".txt": "nano",
                ".rn": "run",
                ".json": "nano", 
                ".js": "nano",
                ".md": "nano",
                ".sh": "nano"
            },
            "theme": "dark",
            "shell": {
                "promptSymbol": "➜",
                "color": "green"
            },
            "network": {
                "dns": "1.1.1.1",
                "proxy": null
            },
            "updates": {
                "autoCheck": true,
                "channel": "stable"
            }
        }, null, 2);
        needsUpgrade = true;
    }
    
    if (needsUpgrade) {
        localStorage.setItem('/', JSON.stringify(fs));
        console.log('[FS] Filesystem upgraded to new structure');
    }
}

export function read(path: string): any {
    if (!fs) return null;
    if (path === '/') return fs;
    
    const parts = path.split('/').filter(p => p);
    let current = fs;
    
    for (const part of parts) {
        if (current[part] === undefined) {
            return null;
        }
        current = current[part];
    }
    
    return current;
}

export function write(path: string, content: string): boolean {
    if (!fs) return false;
    const parts = path.split('/').filter(p => p);
    const filename = parts.pop();
    if (!filename) return false;
    
    let current = fs;
    for (const part of parts) {
        if (current[part] === undefined) {
            current[part] = {};
        }
        current = current[part];
    }
    
    current[filename] = content;
    localStorage.setItem('/', JSON.stringify(fs));
    return true;
}

export function remove(path: string): boolean {
    if (!fs || path === '/') return false;
    const parts = path.split('/').filter(p => p);
    const filename = parts.pop();
    if (!filename) return false;
    
    let current = fs;
    for (const part of parts) {
        if (current[part] === undefined) {
            return false;
        }
        current = current[part];
    }
    
    if (current[filename] !== undefined) {
        delete current[filename];
        localStorage.setItem('/', JSON.stringify(fs));
        return true;
    }
    
    return false;
}

// Additional filesystem utility functions for new features
export function list(path: string): string[] | null {
    const content = read(path);
    if (typeof content === 'object' && content !== null) {
        return Object.keys(content);
    }
    return null;
}

export function exists(path: string): boolean {
    return read(path) !== null;
}

export function isDirectory(path: string): boolean {
    const content = read(path);
    return typeof content === 'object' && content !== null;
}

export function mkdir(path: string): boolean {
    if (!fs) return false;
    const parts = path.split('/').filter(p => p);
    let current = fs;
    
    for (const part of parts) {
        if (current[part] === undefined) {
            current[part] = {};
        }
        current = current[part];
    }
    
    localStorage.setItem('/', JSON.stringify(fs));
    return true;
}

// Settings management functions
export function getSettings(): any {
    try {
        const settingsContent = read('/dec/settings/settings.json');
        return settingsContent ? JSON.parse(settingsContent) : null;
    } catch (error) {
        console.error('[FS] Error reading settings:', error);
        return null;
    }
}

export function updateSettings(settings: any): boolean {
    try {
        write('/dec/settings/settings.json', JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('[FS] Error updating settings:', error);
        return false;
    }
}

export function getDefaultApp(extension: string): string | null {
    const settings = getSettings();
    return settings?.defaultApps?.[extension] || null;
}

export function setDefaultApp(extension: string, app: string): boolean {
    const settings = getSettings();
    if (!settings) return false;
    
    if (!settings.defaultApps) settings.defaultApps = {};
    settings.defaultApps[extension] = app;
    
    return updateSettings(settings);
}

// yo