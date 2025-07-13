// os/mim.ts
import { read, write } from './fs.js';
import { shellPrint } from './shell.js';
import { tryFetch } from './core/net.js';

const defaultRepo = 'https://github.com/NaveenSingh9999/standard-module-lib-lonxos/blob/main/index.json';

function getRepos(): string[] {
    const sources = read('/etc/mim/sources.list');
    if (typeof sources === 'string') {
        return sources.split('\n').filter(s => s.trim() !== '');
    }
    // If sources.list doesn't exist, create it with the default repo
    write('/etc/mim/sources.list', defaultRepo);
    return [defaultRepo];
}

function addRepo(url: string) {
    const sources = getRepos();
    if (!sources.includes(url)) {
        sources.push(url);
        write('/etc/mim/sources.list', sources.join('\n'));
    }
}

function delRepo(url: string) {
    let sources = getRepos();
    sources = sources.filter(s => s !== url);
    write('/etc/mim/sources.list', sources.join('\n'));
}

async function installPackage(pkgName: string) {
    shellPrint(`[mim] Fetching package lists...`);
    const sources = getRepos();
    for (const src of sources) {
        try {
            const res = await tryFetch(src); // Use the new resilient fetch
            const list = await res.json();
            const target = list.find((p: any) => p.name === pkgName);

            if (target) {
                shellPrint(`[mim] Downloading ${pkgName}...`);
                // Construct absolute URL if the repo path is relative
                const baseUrl = new URL(src, window.location.href).href.replace(/\/[^/]*$/, '/');
                const packageUrl = new URL(target.url, baseUrl).href;


                const codeRes = await tryFetch(packageUrl); // Use it again for the package
                const code = await codeRes.text();
                write(`/bin/${pkgName}`, code);
                shellPrint(`[mim] Installed: ${pkgName} v${target.version}`);
                return;
            }
        } catch (e: any) {
            shellPrint(`[mim] Error processing repo ${src}: ${e.message}`);
        }
    }
    shellPrint(`[mim] Package not found: ${pkgName}`);
}

function removePackage(pkgName: string) {
    // This is a simplified remove, a real one would need to check dependencies etc.
    write(`/bin/${pkgName}`, ''); // Effectively deletes the file by making it empty
    shellPrint(`[mim] Removed package: ${pkgName}`);
}

function listPackages(): string {
    const binContent = read('/bin');
    if (typeof binContent === 'object' && binContent !== null) {
        return Object.keys(binContent).filter(k => (binContent as any)[k].length > 0).join('\n');
    }
    return 'No packages installed.';
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
            shellPrint(getRepos().join('\n'));
            break;
        case 'addrepo':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim addrepo <url>');
                return;
            }
            addRepo(commandArgs[0]);
            shellPrint(`[mim] Repo added.`);
            break;
        case 'delrepo':
            if (commandArgs.length === 0) {
                shellPrint('Usage: mim delrepo <url>');
                return;
            }
            delRepo(commandArgs[0]);
            shellPrint(`[mim] Repo removed.`);
            break;
        case 'update':
            shellPrint('[mim] Feature not implemented yet.');
            break;
        case 'upgrade':
            shellPrint('[mim] Feature not implemented yet.');
            break;
        case 'search':
            shellPrint('[mim] Feature not implemented yet.');
            break;
        default:
            shellPrint(`Unknown command: ${command}. Try 'mim install <pkg>'.`);
            break;
    }
}
