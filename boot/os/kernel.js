// os/kernel.ts
import { initShell, shellPrint, updateShellPrompt } from './shell.js';
import { configExists, getConfig, createDefaultConfig, updateConfig } from './core/config.js';
import { runOnboardingWizard } from './boot/onboarding.js';
import { memoryController } from './memory.js';
import { initFS } from './fs.js';
import { initHardware, getHardwareInfo } from './core/hardware.js';
import { ptm } from './core/ptm.js';
import { updateManager } from './core/updater.js';
let kernelState = 'HALTED';
export function getKernelState() {
    return kernelState;
}
export async function boot() {
    kernelState = 'BOOTING';
    console.log('Lonx is booting...');
    const bootScreen = document.getElementById('boot-screen');
    if (!bootScreen) {
        console.error("Boot failed: #boot-screen element not found.");
        return;
    }
    if (!configExists()) {
        // In a real scenario, the onboarding would need access to a simplified shell.
        // For now, we'll use browser prompts and then hand off to the full shell.
        await runOnboardingWizard();
        // A real implementation would likely reboot here. For simplicity, we continue.
    }
    let config = getConfig();
    // Ensure config exists, create default if something went wrong after onboarding
    if (!config) {
        createDefaultConfig();
        config = getConfig();
    }
    // Initialize core systems
    initHardware();
    memoryController.init(getHardwareInfo().ram.total);
    initFS();
    ptm.create('kernel', 15, 'system', 0); // Kernel process itself
    // Store hardware info in config if it wasn't there
    if (!config.hardware) {
        updateConfig('hardware', getHardwareInfo());
    }
    // Initialize the shell and other systems
    initShell(bootScreen);
    updateShellPrompt(config.identity.username, config.identity.hostname);
    shellPrint('Welcome to Lonx OS!');
    shellPrint(`Hardware: ${getHardwareInfo().cpu.cores} Cores @ ${getHardwareInfo().cpu.speed.toFixed(2)}GHz, ${memoryController.getTotal()}MB RAM`);
    // Check for updates if configured
    if (updateManager.shouldCheckForUpdates()) {
        shellPrint('');
        shellPrint('[BOOT] Checking for system updates...');
        try {
            const { available, updated } = await updateManager.checkForUpdates(false);
            if (updated.length > 0) {
                shellPrint(`[BOOT] ✓ Auto-updated ${updated.length} package(s)`);
            }
            if (available.length > 0 && updated.length === 0) {
                shellPrint(`[BOOT] ${available.length} update(s) available. Run 'lonx-update install' to update.`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            shellPrint(`[BOOT] Update check failed: ${errorMessage}`);
        }
        shellPrint('');
    }
    shellPrint('Type "help" for a list of commands.');
    kernelState = 'RUNNING';
    console.log('Lonx has booted successfully.');
}
// yo
