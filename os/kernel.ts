// os/kernel.ts
import { initShell, shellPrint, updateShellPrompt } from './shell.js';
import { executeCommand } from './process.js';
import { configExists, getConfig, createDefaultConfig, updateConfig } from './core/config.js';
import { runOnboardingWizard } from './boot/onboarding.js';
import { initMemory, getMemoryStats } from './memory.js';
import { initFS } from './fs.js';
import { initHardware, getHardwareInfo } from './core/hardware.js';

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
    initMemory(getHardwareInfo().ram.total);
    initFS();

    // Store hardware info in config if it wasn't there
    if (!config.hardware) {
        updateConfig('hardware', getHardwareInfo());
    }
    
    // Initialize the shell and other systems
    initShell(bootScreen);
    updateShellPrompt(config.identity.username, config.identity.hostname);
    
    shellPrint('Welcome to Lonx OS!');
    shellPrint(`Hardware: ${getHardwareInfo().cpu.cores} Cores @ ${getHardwareInfo().cpu.speed.toFixed(2)}GHz, ${getMemoryStats().total}MB RAM`);
    shellPrint('Type "help" for a list of commands.');

    kernelState = 'RUNNING';
    console.log('Lonx has booted successfully.');
}
