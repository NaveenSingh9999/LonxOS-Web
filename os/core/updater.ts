// os/core/updater.ts - Automatic Update System for Lonx OS

import { read, write } from '../fs.js';
import { shellPrint } from '../shell.js';
import { tryFetch } from './net.js';

interface PackageInfo {
    name: string;
    desc: string;
    version: string;
    url: string;
    checksum?: string;
    lastUpdated?: string;
}

interface UpdateConfig {
    enabled: boolean;
    checkOnBoot: boolean;
    updateChannels: string[];
    lastCheck: string;
    autoUpdate: boolean;
    checkInterval: number; // hours
}

export class UpdateManager {
    private config: UpdateConfig;
    private readonly configPath = '/etc/lonx/update.conf';
    private readonly installedPackagesPath = '/var/lib/lonx/installed.json';
    
    constructor() {
        // Initialize with default config, will be overridden in loadConfig
        this.config = {
            enabled: true,
            checkOnBoot: true,
            updateChannels: [],
            lastCheck: '',
            autoUpdate: false,
            checkInterval: 24
        };
        this.loadConfig();
    }

    private loadConfig() {
        const defaultConfig: UpdateConfig = {
            enabled: true,
            checkOnBoot: true,
            updateChannels: [
                'https://raw.githubusercontent.com/NaveenSingh9999/LonxOS-Web/refs/heads/main/repo/index.json'
            ],
            lastCheck: '',
            autoUpdate: false, // Manual approval by default
            checkInterval: 24 // Check every 24 hours
        };

        const configData = read(this.configPath);
        if (configData && typeof configData === 'string') {
            try {
                this.config = { ...defaultConfig, ...JSON.parse(configData) };
            } catch (e) {
                console.warn('Invalid update config, using defaults');
                this.config = defaultConfig;
            }
        } else {
            this.config = defaultConfig;
            this.saveConfig();
        }
    }

    private saveConfig() {
        write(this.configPath, JSON.stringify(this.config, null, 2));
    }

    private getInstalledPackages(): Record<string, PackageInfo> {
        const data = read(this.installedPackagesPath);
        if (data && typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                return {};
            }
        }
        return {};
    }

    private saveInstalledPackages(packages: Record<string, PackageInfo>) {
        write(this.installedPackagesPath, JSON.stringify(packages, null, 2));
    }

    private async fetchPackageList(channel: string): Promise<PackageInfo[]> {
        try {
            const response = await tryFetch(channel);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Failed to fetch from channel ${channel}:`, error);
            return [];
        }
    }

    private compareVersions(version1: string, version2: string): number {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    private async downloadPackage(packageInfo: PackageInfo, channel: string): Promise<string | null> {
        try {
            // Construct absolute URL for the package
            const baseUrl = new URL(channel, window.location.href).href.replace(/\/[^/]*$/, '/');
            const packageUrl = new URL(packageInfo.url, baseUrl).href;

            const response = await tryFetch(packageUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            console.warn(`Failed to download package ${packageInfo.name}:`, error);
            return null;
        }
    }

    async checkForUpdates(silent: boolean = false): Promise<{ available: PackageInfo[], updated: PackageInfo[] }> {
        if (!this.config.enabled) {
            return { available: [], updated: [] };
        }

        if (!silent) {
            shellPrint('[UPDATE] Checking for updates...');
        }

        const installedPackages = this.getInstalledPackages();
        const availableUpdates: PackageInfo[] = [];
        const updatedPackages: PackageInfo[] = [];

        // Check all update channels
        for (const channel of this.config.updateChannels) {
            if (!silent) {
                shellPrint(`[UPDATE] Checking channel: ${new URL(channel).hostname}`);
            }

            const packageList = await this.fetchPackageList(channel);
            
            for (const pkg of packageList) {
                const installed = installedPackages[pkg.name];
                
                if (!installed) {
                    // New package available
                    availableUpdates.push({ ...pkg, lastUpdated: new Date().toISOString() });
                } else if (this.compareVersions(pkg.version, installed.version) > 0) {
                    // Update available
                    availableUpdates.push({ ...pkg, lastUpdated: new Date().toISOString() });
                    
                    if (this.config.autoUpdate) {
                        // Auto-update enabled, download immediately
                        const code = await this.downloadPackage(pkg, channel);
                        if (code) {
                            const success = this.installPackage(pkg.name, code, pkg);
                            if (success) {
                                updatedPackages.push(pkg);
                                if (!silent) {
                                    shellPrint(`[UPDATE] ✓ ${pkg.name} updated to v${pkg.version}`);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Update last check time
        this.config.lastCheck = new Date().toISOString();
        this.saveConfig();

        if (!silent && availableUpdates.length === 0) {
            shellPrint('[UPDATE] All packages are up to date');
        } else if (!silent && !this.config.autoUpdate && availableUpdates.length > 0) {
            shellPrint(`[UPDATE] ${availableUpdates.length} update(s) available. Run 'lonx-update install' to update.`);
        }

        return { available: availableUpdates, updated: updatedPackages };
    }

    private installPackage(name: string, code: string, packageInfo: PackageInfo): boolean {
        try {
            // Install to /bin directory
            const installPath = `/bin/${name}.js`;
            const success = write(installPath, code);
            
            if (success) {
                // Update installed packages registry
                const installed = this.getInstalledPackages();
                installed[name] = {
                    ...packageInfo,
                    lastUpdated: new Date().toISOString()
                };
                this.saveInstalledPackages(installed);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Failed to install package ${name}:`, error);
            return false;
        }
    }

    async updatePackage(packageName: string): Promise<boolean> {
        shellPrint(`[UPDATE] Updating ${packageName}...`);
        
        for (const channel of this.config.updateChannels) {
            const packageList = await this.fetchPackageList(channel);
            const pkg = packageList.find(p => p.name === packageName);
            
            if (pkg) {
                const code = await this.downloadPackage(pkg, channel);
                if (code) {
                    const success = this.installPackage(pkg.name, code, pkg);
                    if (success) {
                        shellPrint(`[UPDATE] ✓ ${pkg.name} updated to v${pkg.version}`);
                        return true;
                    }
                }
            }
        }
        
        shellPrint(`[UPDATE] ✗ Failed to update ${packageName}`);
        return false;
    }

    async updateAllPackages(): Promise<number> {
        const { available } = await this.checkForUpdates(true);
        let updated = 0;
        
        for (const pkg of available) {
            const success = await this.updatePackage(pkg.name);
            if (success) updated++;
        }
        
        shellPrint(`[UPDATE] Updated ${updated}/${available.length} packages`);
        return updated;
    }

    shouldCheckForUpdates(): boolean {
        if (!this.config.enabled || !this.config.checkOnBoot) {
            return false;
        }

        if (!this.config.lastCheck) {
            return true; // Never checked before
        }

        const lastCheck = new Date(this.config.lastCheck);
        const now = new Date();
        const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

        return hoursSinceLastCheck >= this.config.checkInterval;
    }

    getConfig(): UpdateConfig {
        return { ...this.config };
    }

    updateConfig(newConfig: Partial<UpdateConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    addUpdateChannel(url: string) {
        if (!this.config.updateChannels.includes(url)) {
            this.config.updateChannels.push(url);
            this.saveConfig();
        }
    }

    removeUpdateChannel(url: string) {
        this.config.updateChannels = this.config.updateChannels.filter(channel => channel !== url);
        this.saveConfig();
    }

    getInstalledPackagesList(): PackageInfo[] {
        const installed = this.getInstalledPackages();
        return Object.values(installed);
    }
}

// Export singleton instance
export const updateManager = new UpdateManager();

// yo
