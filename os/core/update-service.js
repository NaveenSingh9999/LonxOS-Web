// os/core/update-service.ts - Background update service for Lonx OS
import { updateManager } from './updater.js';
import { shellPrint } from '../shell.js';
class UpdateService {
    intervalId = null;
    isRunning = false;
    start() {
        if (this.isRunning) {
            return false; // Already running
        }
        const config = updateManager.getConfig();
        if (!config.enabled) {
            return false; // Updates disabled
        }
        this.isRunning = true;
        // Check for updates every hour, but only perform update check based on interval
        this.intervalId = window.setInterval(async () => {
            if (updateManager.shouldCheckForUpdates()) {
                try {
                    shellPrint('[UPDATE-SERVICE] Checking for updates...');
                    const { available, updated } = await updateManager.checkForUpdates(true);
                    if (updated.length > 0) {
                        shellPrint(`[UPDATE-SERVICE] ✓ Auto-updated ${updated.length} package(s)`);
                    }
                    if (available.length > 0 && updated.length === 0) {
                        shellPrint(`[UPDATE-SERVICE] ${available.length} update(s) available. Run 'lonx-update install' to update.`);
                    }
                }
                catch (error) {
                    console.warn('Update service error:', error);
                }
            }
        }, 60 * 60 * 1000); // Check every hour
        return true;
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }
    getStatus() {
        return {
            running: this.isRunning,
            config: updateManager.getConfig()
        };
    }
}
export const updateService = new UpdateService();
// yo
