// bin/lonx-update.js - System Update Command for Lonx OS

/**
 * Lonx Update - System package update manager
 * Provides commands to check for and install package updates
 */

async function main(args, lonx) {
    const { updateManager } = await import('../os/core/updater.js');
    
    if (args.length === 0) {
        showUsage(lonx.shell);
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'check':
            await checkCommand(args.slice(1), lonx, updateManager);
            break;
            
        case 'install':
            await installCommand(args.slice(1), lonx, updateManager);
            break;
            
        case 'config':
            await configCommand(args.slice(1), lonx, updateManager);
            break;
            
        case 'channels':
            await channelsCommand(args.slice(1), lonx, updateManager);
            break;
            
        case 'list':
            await listCommand(args.slice(1), lonx, updateManager);
            break;
            
        case 'status':
            await statusCommand(args.slice(1), lonx, updateManager);
            break;
            
        default:
            lonx.shell.print(`lonx-update: unknown command '${command}'`);
            showUsage(lonx.shell);
            return 1;
    }
    
    return 0;
}

function showUsage(shell) {
    shell.print('lonx-update - Lonx OS Package Update Manager');
    shell.print('');
    shell.print('Usage: lonx-update COMMAND [OPTIONS]');
    shell.print('');
    shell.print('Commands:');
    shell.print('  check              Check for available updates');
    shell.print('  install [PACKAGE]  Install all updates or specific package');
    shell.print('  config [KEY=VALUE] Show or modify update configuration');
    shell.print('  channels           Manage update channels');
    shell.print('  list               List installed packages');
    shell.print('  status             Show update system status');
    shell.print('');
    shell.print('Examples:');
    shell.print('  lonx-update check                    # Check for updates');
    shell.print('  lonx-update install                  # Install all updates');
    shell.print('  lonx-update install wget             # Update specific package');
    shell.print('  lonx-update config autoUpdate=true   # Enable auto-updates');
    shell.print('  lonx-update channels add <URL>       # Add update channel');
}

async function checkCommand(args, lonx, updateManager) {
    const silent = args.includes('--silent') || args.includes('-s');
    
    try {
        const { available } = await updateManager.checkForUpdates(silent);
        
        if (!silent) {
            if (available.length === 0) {
                lonx.shell.print('✓ All packages are up to date');
            } else {
                lonx.shell.print(`📦 ${available.length} update(s) available:`);
                lonx.shell.print('');
                
                for (const pkg of available) {
                    lonx.shell.print(`  ${pkg.name} → v${pkg.version} - ${pkg.desc}`);
                }
                
                lonx.shell.print('');
                lonx.shell.print('Run \'lonx-update install\' to update all packages');
            }
        }
        
    } catch (error) {
        lonx.shell.print(`✗ Update check failed: ${error.message}`);
        return 1;
    }
}

async function installCommand(args, lonx, updateManager) {
    try {
        if (args.length === 0) {
            // Install all updates
            lonx.shell.print('Installing all available updates...');
            const updated = await updateManager.updateAllPackages();
            
            if (updated > 0) {
                lonx.shell.print(`✓ Successfully updated ${updated} package(s)`);
            } else {
                lonx.shell.print('No updates were installed');
            }
            
        } else {
            // Install specific package
            const packageName = args[0];
            lonx.shell.print(`Installing update for ${packageName}...`);
            const success = await updateManager.updatePackage(packageName);
            
            if (success) {
                lonx.shell.print(`✓ Successfully updated ${packageName}`);
            } else {
                lonx.shell.print(`✗ Failed to update ${packageName}`);
                return 1;
            }
        }
        
    } catch (error) {
        lonx.shell.print(`✗ Installation failed: ${error.message}`);
        return 1;
    }
}

async function configCommand(args, lonx, updateManager) {
    try {
        if (args.length === 0) {
            // Show current configuration
            const config = updateManager.getConfig();
            lonx.shell.print('Update Configuration:');
            lonx.shell.print('');
            lonx.shell.print(`  enabled: ${config.enabled}`);
            lonx.shell.print(`  checkOnBoot: ${config.checkOnBoot}`);
            lonx.shell.print(`  autoUpdate: ${config.autoUpdate}`);
            lonx.shell.print(`  checkInterval: ${config.checkInterval} hours`);
            lonx.shell.print(`  lastCheck: ${config.lastCheck || 'never'}`);
            lonx.shell.print(`  updateChannels: ${config.updateChannels.length} configured`);
            
        } else {
            // Set configuration
            const setting = args[0];
            const [key, value] = setting.split('=');
            
            if (!key || value === undefined) {
                lonx.shell.print('Invalid format. Use: KEY=VALUE');
                return 1;
            }
            
            const config = updateManager.getConfig();
            const newConfig = {};
            
            // Parse value based on key
            switch (key) {
                case 'enabled':
                case 'checkOnBoot':
                case 'autoUpdate':
                    newConfig[key] = value.toLowerCase() === 'true';
                    break;
                case 'checkInterval':
                    newConfig[key] = parseInt(value, 10);
                    if (isNaN(newConfig[key]) || newConfig[key] < 1) {
                        lonx.shell.print('checkInterval must be a positive number');
                        return 1;
                    }
                    break;
                default:
                    lonx.shell.print(`Unknown configuration key: ${key}`);
                    return 1;
            }
            
            updateManager.updateConfig(newConfig);
            lonx.shell.print(`✓ Updated ${key} = ${newConfig[key]}`);
        }
        
    } catch (error) {
        lonx.shell.print(`✗ Configuration error: ${error.message}`);
        return 1;
    }
}

async function channelsCommand(args, lonx, updateManager) {
    try {
        if (args.length === 0) {
            // List channels
            const config = updateManager.getConfig();
            lonx.shell.print('Update Channels:');
            lonx.shell.print('');
            
            config.updateChannels.forEach((channel, index) => {
                lonx.shell.print(`  ${index + 1}. ${channel}`);
            });
            
        } else {
            const action = args[0];
            
            switch (action) {
                case 'add':
                    if (args.length < 2) {
                        lonx.shell.print('Usage: lonx-update channels add <URL>');
                        return 1;
                    }
                    updateManager.addUpdateChannel(args[1]);
                    lonx.shell.print(`✓ Added update channel: ${args[1]}`);
                    break;
                    
                case 'remove':
                case 'rm':
                    if (args.length < 2) {
                        lonx.shell.print('Usage: lonx-update channels remove <URL>');
                        return 1;
                    }
                    updateManager.removeUpdateChannel(args[1]);
                    lonx.shell.print(`✓ Removed update channel: ${args[1]}`);
                    break;
                    
                default:
                    lonx.shell.print(`Unknown channels command: ${action}`);
                    lonx.shell.print('Available: add, remove');
                    return 1;
            }
        }
        
    } catch (error) {
        lonx.shell.print(`✗ Channels error: ${error.message}`);
        return 1;
    }
}

async function listCommand(args, lonx, updateManager) {
    try {
        const installed = updateManager.getInstalledPackagesList();
        
        if (installed.length === 0) {
            lonx.shell.print('No packages installed through update system');
            return;
        }
        
        lonx.shell.print('Installed Packages:');
        lonx.shell.print('');
        
        installed.forEach(pkg => {
            const lastUpdated = pkg.lastUpdated ? 
                new Date(pkg.lastUpdated).toLocaleDateString() : 
                'unknown';
            lonx.shell.print(`  ${pkg.name} v${pkg.version} - ${pkg.desc}`);
            lonx.shell.print(`    Last updated: ${lastUpdated}`);
        });
        
    } catch (error) {
        lonx.shell.print(`✗ List error: ${error.message}`);
        return 1;
    }
}

async function statusCommand(args, lonx, updateManager) {
    try {
        const config = updateManager.getConfig();
        const installed = updateManager.getInstalledPackagesList();
        
        lonx.shell.print('Lonx Update System Status:');
        lonx.shell.print('');
        lonx.shell.print(`Status: ${config.enabled ? '✓ Enabled' : '✗ Disabled'}`);
        lonx.shell.print(`Boot Check: ${config.checkOnBoot ? '✓ Enabled' : '✗ Disabled'}`);
        lonx.shell.print(`Auto Update: ${config.autoUpdate ? '✓ Enabled' : '✗ Disabled'}`);
        lonx.shell.print(`Check Interval: ${config.checkInterval} hours`);
        lonx.shell.print(`Last Check: ${config.lastCheck || 'Never'}`);
        lonx.shell.print(`Update Channels: ${config.updateChannels.length}`);
        lonx.shell.print(`Installed Packages: ${installed.length}`);
        
        // Check if update is due
        if (updateManager.shouldCheckForUpdates()) {
            lonx.shell.print('');
            lonx.shell.print('⚠️  Update check is overdue. Run \'lonx-update check\' to check for updates.');
        }
        
    } catch (error) {
        lonx.shell.print(`✗ Status error: ${error.message}`);
        return 1;
    }
}

// Export for Lonx OS
export default main;

// yo
