// os/kernel.ts

import { initFS } from './fs.js';
import { initShell, shellPrint, updateShellPrompt } from './shell.js';
import { initMemory } from './memory.js';
import { createProcess, getProcessList } from './process.js';
import { configExists, getConfig, createDefaultConfig } from './core/config.js';
import { runOnboardingWizard } from './boot/onboarding.js';

let kernelState = 'HALTED';

export function getKernelState() {
    return kernelState;
}

export function bootKernel(bootScreen: HTMLElement) {
  console.log('[Lonx Kernel] Booting v1.0...');
  
  initMemory();
  initFS();

  console.log('[Kernel] Mounting File System... OK');
  console.log('[Kernel] Launching Shell Process (PID 1)...');

  createProcess('shell', () => {
    initShell(bootScreen); // Pass the boot screen element to the shell
  });

  // Start the execution of the first process
  const processes = getProcessList();
  if (processes.length > 0 && processes[0].pid === 1) {
      processes[0].execute();
  }
}

export async function boot() {
    kernelState = 'BOOTING';
    console.log('Lonx is booting...');

    if (!configExists()) {
        // This is a simplified integration. A real boot process would hand off
        // control to the onboarding wizard and then reboot.
        await runOnboardingWizard();
    }
    
    // Initialize filesystem, shell, etc.
    const config = getConfig();
    if (config) {
        updateShellPrompt(config.identity.username, config.identity.hostname);
    } else {
        // Fallback if config somehow fails after onboarding
        createDefaultConfig();
        const defaultConfig = getConfig();
        updateShellPrompt(defaultConfig.identity.username, defaultConfig.identity.hostname);
    }

    // The shell now handles its own keydown events.
    initShell(document.getElementById('bootScreen') as HTMLElement);
    
    shellPrint('Welcome to Lonx OS!');
    shellPrint('Type "help" for a list of commands.');

    kernelState = 'RUNNING';
    console.log('Lonx has booted successfully.');
}
