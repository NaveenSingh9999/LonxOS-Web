// os/mim.ts
import { read, write } from './fs.js';
import { shellPrint } from './shell.js';
import { tryFetch } from './core/net.js';

const defaultRepo = 'https://naveensingh9999.github.io/LonxOS-Web/repo/index.json';

interface Package {
    name: string;
    version: string;
    url: string;
    description?: string;
}

interface RepoIndex {
    packages: Package[];
    lastFetched: number;
    url: string;
}

// In-memory cache for repo data
const repoCache: Map<string, RepoIndex> = new Map();

function getRepos(): string[] {
    const sources = read('/etc/mim/sources.list');
    if (typeof sources === 'string') {
        return sources.split('\n').filter((s: string) => s.trim() !== '');
    }
    // If sources.list doesn't exist, create it with the default repo
    write('/etc/mim/sources.list', defaultRepo);
    return [defaultRepo];
}

function generateRepoId(url: string): string {
    // Simple hash function for generating cache file names
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

function getCachedRepo(url: string): RepoIndex | null {
    // Check in-memory cache first
    if (repoCache.has(url)) {
        return repoCache.get(url)!;
    }
    
    // Try to load from filesystem cache
    const repoId = generateRepoId(url);
    const cacheFile = `/etc/mim/cache/${repoId}.json`;
    const cached = read(cacheFile);
    
    if (typeof cached === 'string') {
        try {
            const repoIndex = JSON.parse(cached) as RepoIndex;
            // Cache in memory for faster access
            repoCache.set(url, repoIndex);
            return repoIndex;
        } catch (e) {
            // Invalid cache file, ignore
        }
    }
    
    return null;
}

function setCachedRepo(url: string, packages: Package[]): void {
    const repoIndex: RepoIndex = {
        packages,
        lastFetched: Date.now(),
        url
    };
    
    // Store in memory cache
    repoCache.set(url, repoIndex);
    
    // Store in filesystem cache
    const repoId = generateRepoId(url);
    const cacheFile = `/etc/mim/cache/${repoId}.json`;
    write(cacheFile, JSON.stringify(repoIndex, null, 2));
}

async function fetchAndIndexRepo(url: string): Promise<Package[]> {
    try {
        shellPrint(`[mim] Fetching repo index from ${url}...`);
        const res = await tryFetch(url);
        const packages = await res.json() as Package[];
        
        if (!Array.isArray(packages)) {
            throw new Error('Invalid repo format: expected array of packages');
        }
        
        // Validate package structure
        for (const pkg of packages) {
            if (!pkg.name || !pkg.version || !pkg.url) {
                throw new Error(`Invalid package in repo: missing required fields (name, version, url)`);
            }
        }
        
        // Cache the repo data
        setCachedRepo(url, packages);
        return packages;
    } catch (error) {
        throw new Error(`Failed to fetch repo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function addRepo(url: string): Promise<void> {
    const sources = getRepos();
    if (sources.includes(url)) {
        shellPrint(`[mim] Repo already exists: ${url}`);
        return;
    }
    
    try {
        // Fetch and index the repo immediately
        const packages = await fetchAndIndexRepo(url);
        
        // Only add to sources list if fetch was successful
        sources.push(url);
        write('/etc/mim/sources.list', sources.join('\n'));
        
        shellPrint(`✔ Repo added and indexed: ${packages.length} packages available.`);
    } catch (error) {
        shellPrint(`[mim] Error adding repo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function delRepo(url: string) {
    let sources = getRepos();
    sources = sources.filter(s => s !== url);
    write('/etc/mim/sources.list', sources.join('\n'));
    
    // Remove from cache as well
    repoCache.delete(url);
    const repoId = generateRepoId(url);
    const cacheFile = `/etc/mim/cache/${repoId}.json`;
    write(cacheFile, ''); // Delete cache file
}

async function getAllPackages(): Promise<Map<string, Package & { repoUrl: string }>> {
    const allPackages = new Map<string, Package & { repoUrl: string }>();
    const sources = getRepos();
    
    for (const repoUrl of sources) {
        try {
            let packages: Package[];
            
            // Try to get from cache first
            const cached = getCachedRepo(repoUrl);
            if (cached) {
                packages = cached.packages;
            } else {
                // Fetch and cache if not available
                packages = await fetchAndIndexRepo(repoUrl);
            }
            
            // Add packages to the map with repo info
            for (const pkg of packages) {
                allPackages.set(pkg.name, { ...pkg, repoUrl });
            }
        } catch (error) {
            shellPrint(`[mim] Warning: Failed to load repo ${repoUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    return allPackages;
}

async function installPackage(pkgName: string): Promise<void> {
    shellPrint(`[mim] Searching for package: ${pkgName}...`);
    
    try {
        const allPackages = await getAllPackages();
        const target = allPackages.get(pkgName);
        
        if (!target) {
            shellPrint(`[mim] Package not found: ${pkgName}`);
            return;
        }
        
        shellPrint(`[mim] Found ${pkgName} v${target.version} in repo: ${target.repoUrl}`);
        shellPrint(`[mim] Downloading ${pkgName}...`);
        
        // Construct absolute URL if the package path is relative
        const baseUrl = new URL(target.repoUrl, window.location.href).href.replace(/\/[^/]*$/, '/');
        const packageUrl = new URL(target.url, baseUrl).href;
        
        const codeRes = await tryFetch(packageUrl);
        const code = await codeRes.text();
        write(`/bin/${pkgName}.js`, code);
        
        // Store installation metadata
        const installData = {
            name: pkgName,
            version: target.version,
            repoUrl: target.repoUrl,
            installedAt: Date.now()
        };
        write(`/var/lib/mim/installed/${pkgName}.json`, JSON.stringify(installData, null, 2));
        
        shellPrint(`[mim] Installed: ${pkgName} v${target.version}`);
    } catch (error) {
        shellPrint(`[mim] Error installing package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function removePackage(pkgName: string) {
    // This is a simplified remove, a real one would need to check dependencies etc.
    write(`/bin/${pkgName}.js`, ''); // Effectively deletes the file by making it empty
    write(`/var/lib/mim/installed/${pkgName}.json`, ''); // Remove installation metadata
    shellPrint(`[mim] Removed package: ${pkgName}`);
}

function listPackages(): string {
    const binContent = read('/bin');
    if (typeof binContent === 'object' && binContent !== null) {
        return Object.keys(binContent)
            .filter(k => (binContent as any)[k].length > 0)
            .map(k => k.replace('.js', '')) // Remove .js extension for display
            .join('\n');
    }
    return 'No packages installed.';
}

async function searchPackages(searchTerm: string): Promise<void> {
    shellPrint(`[mim] Searching for packages matching: ${searchTerm}`);
    
    try {
        const allPackages = await getAllPackages();
        const matches: Array<Package & { repoUrl: string }> = [];
        
        for (const [name, pkg] of allPackages) {
            if (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
                matches.push(pkg);
            }
        }
        
        if (matches.length === 0) {
            shellPrint(`[mim] No packages found matching: ${searchTerm}`);
            return;
        }
        
        shellPrint(`[mim] Found ${matches.length} package(s):`);
        for (const pkg of matches) {
            const description = pkg.description ? ` - ${pkg.description}` : '';
            shellPrint(`  ${pkg.name} v${pkg.version}${description}`);
        }
    } catch (error) {
        shellPrint(`[mim] Error searching packages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function refreshRepos(): Promise<void> {
    shellPrint(`[mim] Refreshing all repositories...`);
    const sources = getRepos();
    let refreshedCount = 0;
    
    for (const repoUrl of sources) {
        try {
            await fetchAndIndexRepo(repoUrl);
            refreshedCount++;
        } catch (error) {
            shellPrint(`[mim] Failed to refresh ${repoUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    shellPrint(`[mim] Refreshed ${refreshedCount}/${sources.length} repositories.`);
}

async function showRepoInfo(url?: string): Promise<void> {
    const sources = getRepos();
    
    if (url) {
        if (!sources.includes(url)) {
            shellPrint(`[mim] Repository not found: ${url}`);
            return;
        }
        
        try {
            const cached = getCachedRepo(url);
            if (cached) {
                shellPrint(`Repository: ${url}`);
                shellPrint(`Packages: ${cached.packages.length}`);
                shellPrint(`Last updated: ${new Date(cached.lastFetched).toLocaleString()}`);
                shellPrint(`Status: Cached`);
            } else {
                shellPrint(`Repository: ${url}`);
                shellPrint(`Status: Not cached (run 'mim refresh' to update)`);
            }
        } catch (error) {
            shellPrint(`[mim] Error reading repo info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } else {
        // Show all repos
        shellPrint(`[mim] Configured repositories:`);
        for (const repoUrl of sources) {
            const cached = getCachedRepo(repoUrl);
            const status = cached ? `${cached.packages.length} packages` : 'Not cached';
            shellPrint(`  ${repoUrl} (${status})`);
        }
    }
}

async function verifyRepos(): Promise<void> {
    shellPrint(`[mim] Verifying repository connectivity...`);
    const sources = getRepos();
    let validCount = 0;
    
    for (const repoUrl of sources) {
        try {
            const res = await tryFetch(repoUrl);
            const data = await res.json();
            if (Array.isArray(data)) {
                shellPrint(`  ✓ ${repoUrl} - OK (${data.length} packages)`);
                validCount++;
            } else {
                shellPrint(`  ✗ ${repoUrl} - Invalid format (not an array)`);
            }
        } catch (error) {
            shellPrint(`  ✗ ${repoUrl} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    shellPrint(`[mim] ${validCount}/${sources.length} repositories are accessible.`);
}

// Initialize MIM on boot - load cached repositories
export async function initMim(): Promise<void> {
    try {
        const sources = getRepos();
        let loadedCount = 0;
        
        for (const repoUrl of sources) {
            const cached = getCachedRepo(repoUrl);
            if (cached) {
                loadedCount++;
            }
        }
        
        if (loadedCount === 0 && sources.length > 0) {
            // No cached repos found, try to fetch them
            shellPrint('[mim] No cached repositories found, fetching...');
            await refreshRepos();
        }
    } catch (error) {
        console.warn('[mim] Failed to initialize repositories:', error);
    }
}

export async function mim(args: string[]): Promise<void> {
    const command = args[0];
    const commandArgs = args.slice(1);

    switch (command) {
        case 'install':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim install <package-name>');
                return;
            }
            await installPackage(commandArgs[0]);
            break;
        case 'remove':
             if (commandArgs.length === 0) {
                shellPrint('Usage: mim remove <package-name>');
                return;
            }
            removePackage(commandArgs[0]);
            break;
        case 'list':
            shellPrint(listPackages());
            break;
        case 'sources':
            await showRepoInfo();
            break;
        case 'addrepo':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim addrepo <url>');
                return;
            }
            await addRepo(commandArgs[0]);
            break;
        case 'delrepo':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim delrepo <url>');
                return;
            }
            delRepo(commandArgs[0]);
            shellPrint(`[mim] Repo removed.`);
            break;
        case 'search':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim search <term>');
                return;
            }
            await searchPackages(commandArgs[0]);
            break;
        case 'refresh':
            await refreshRepos();
            break;
        case 'repo-info':
            if (commandArgs.length === 0) {
                await showRepoInfo();
            } else {
                await showRepoInfo(commandArgs[0]);
            }
            break;
        case 'verify':
            await verifyRepos();
            break;
        case 'update':
            shellPrint('[mim] Use "mim refresh" to update repository indices.');
            break;
        case 'upgrade':
            shellPrint('[mim] Feature not implemented yet.');
            break;
        case 'help':
        case '--help':
        case '-h':
            shellPrint('MIM Package Manager Commands:');
            shellPrint('  install <pkg>     Install a package');
            shellPrint('  remove <pkg>      Remove a package');
            shellPrint('  list              List installed packages');
            shellPrint('  search <term>     Search for packages');
            shellPrint('  sources           List configured repositories');
            shellPrint('  addrepo <url>     Add a new repository');
            shellPrint('  delrepo <url>     Remove a repository');
            shellPrint('  refresh           Refresh all repository indices');
            shellPrint('  repo-info [url]   Show repository information');
            shellPrint('  verify            Verify repository connectivity');
            shellPrint('  help              Show this help message');
            break;
        default:
            shellPrint(`Unknown command: ${command}. Try 'mim help' for available commands.`);
            break;
    }
}

// yo