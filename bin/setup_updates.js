// bin/setup-updates.js - Setup update system for Lonx OS

/**
 * Setup script for the Lonx OS update system
 * Configures update channels and prepares the system for automatic updates
 */

async function main(args, lonx) {
    const shell = lonx.shell;
    
    shell.print('Setting up Lonx OS Update System...');
    shell.print('');
    
    // Import the update manager
    try {
        const { updateManager } = await import('../os/core/updater.js');
        
        // Configure default settings
        const defaultConfig = {
            enabled: true,
            checkOnBoot: true,
            autoUpdate: false, // User can enable this manually
            checkInterval: 24
        };
        
        updateManager.updateConfig(defaultConfig);
        shell.print('✓ Update system enabled');
        
        // Add default update channels
        const channels = [
            'https://naveensingh9999.github.io/LonxOS-Web/repo/index.json'
        ];
        
        for (const channel of channels) {
            updateManager.addUpdateChannel(channel);
            shell.print(`✓ Added update channel: ${new URL(channel).hostname}`);
        }
        
        shell.print('');
        shell.print('Update system configured successfully!');
        shell.print('');
        shell.print('Available commands:');
        shell.print('  lonx-update check      - Check for updates');
        shell.print('  lonx-update install    - Install all updates');
        shell.print('  lonx-update status     - Show system status');
        shell.print('  lonx-update config     - View/modify configuration');
        shell.print('');
        shell.print('The system will now check for updates on boot.');
        shell.print('To enable automatic updates: lonx-update config autoUpdate=true');
        
        // Perform initial update check
        shell.print('');
        shell.print('Performing initial update check...');
        await updateManager.checkForUpdates(false);
        
    } catch (error) {
        shell.print(`✗ Setup failed: ${error.message}`);
        return 1;
    }
    
    return 0;
}

// Export for Lonx OS
export default main;

// yo
