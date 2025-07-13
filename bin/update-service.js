// bin/update-service.js - Update service control command

/**
 * Control command for the Lonx OS update service
 */

async function main(args, lonx) {
    const shell = lonx.shell;
    
    if (args.length === 0) {
        showUsage(shell);
        return;
    }
    
    const command = args[0];
    
    try {
        const { updateService } = await import('../os/core/update-service.js');
        
        switch (command) {
            case 'start':
                const started = updateService.start();
                if (started) {
                    shell.print('✓ Update service started');
                } else {
                    shell.print('Update service is already running or disabled');
                }
                break;
                
            case 'stop':
                updateService.stop();
                shell.print('✓ Update service stopped');
                break;
                
            case 'status':
                const status = updateService.getStatus();
                shell.print('Update Service Status:');
                shell.print(`  Running: ${status.running ? '✓ Yes' : '✗ No'}`);
                shell.print(`  Updates Enabled: ${status.config.enabled ? '✓ Yes' : '✗ No'}`);
                shell.print(`  Check on Boot: ${status.config.checkOnBoot ? '✓ Yes' : '✗ No'}`);
                shell.print(`  Auto Update: ${status.config.autoUpdate ? '✓ Yes' : '✗ No'}`);
                shell.print(`  Check Interval: ${status.config.checkInterval} hours`);
                break;
                
            case 'restart':
                updateService.stop();
                const restarted = updateService.start();
                if (restarted) {
                    shell.print('✓ Update service restarted');
                } else {
                    shell.print('Failed to restart update service (may be disabled)');
                }
                break;
                
            default:
                shell.print(`Unknown command: ${command}`);
                showUsage(shell);
                return 1;
        }
        
    } catch (error) {
        shell.print(`Error: ${error.message}`);
        return 1;
    }
    
    return 0;
}

function showUsage(shell) {
    shell.print('update-service - Control the update service daemon');
    shell.print('');
    shell.print('Usage: update-service COMMAND');
    shell.print('');
    shell.print('Commands:');
    shell.print('  start      Start the update service');
    shell.print('  stop       Stop the update service');
    shell.print('  restart    Restart the update service');
    shell.print('  status     Show service status');
}

// Export for Lonx OS
export default main;

// yo
