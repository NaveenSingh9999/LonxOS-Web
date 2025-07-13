// os/fs.ts
let fs = {
    '/': {
        'home': {
            'user': {}
        },
        'etc': {
            'mim': {}
        },
        'bin': {}
    }
};
export function initFS() {
    console.log('[FS] Initializing virtual file system...');
    // Load from localStorage if available
    const savedFS = localStorage.getItem('lonxFS');
    if (savedFS) {
        fs = JSON.parse(savedFS);
    }
}
function saveFS() {
    localStorage.setItem('lonxFS', JSON.stringify(fs));
}
function findNode(path) {
    const parts = path.split('/').filter(p => p);
    let current = fs['/'];
    let parent = null;
    let key = '';
    for (let i = 0; i < parts.length; i++) {
        key = parts[i];
        if (typeof current !== 'object' || !current.hasOwnProperty(key)) {
            return { parent: null, node: null, key: '' };
        }
        parent = current;
        current = current[key];
    }
    return { parent, node: current, key };
}
export function read(path) {
    if (path === '/')
        return fs['/'];
    const { node } = findNode(path);
    return node;
}
export function write(path, content) {
    const parts = path.split('/').filter(p => p);
    const filename = parts.pop();
    if (!filename)
        return false;
    const dirPath = '/' + parts.join('/');
    const dirNode = read(dirPath);
    if (typeof dirNode === 'object' && dirNode !== null) {
        dirNode[filename] = content;
        saveFS();
        return true;
    }
    return false;
}
export function remove(path) {
    if (path === '/')
        return false; // Cannot remove root
    const { parent, node, key } = findNode(path);
    if (parent && key && node !== null) {
        delete parent[key];
        saveFS();
        return true;
    }
    return false;
}
