// os/fs.ts
import { getConfig } from './core/config.js';

let fs: any = null;

export function initFS() {
    const savedFS = localStorage.getItem('/');
    if (savedFS) {
        fs = JSON.parse(savedFS);
    } else {
        fs = {
            'home': {
                'user': {}
            },
            'etc': {
                'config.json': JSON.stringify(getConfig(), null, 2)
            },
            'bin': {},
            'tmp': {}
        };
        localStorage.setItem('/', JSON.stringify(fs));
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

// yo