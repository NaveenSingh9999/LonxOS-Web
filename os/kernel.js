var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// os/kernel.ts
import { initShell, shellPrint, updateShellPrompt } from './shell.js';
import { configExists, getConfig, createDefaultConfig } from './core/config.js';
import { runOnboardingWizard } from './boot/onboarding.js';
let kernelState = 'HALTED';
export function getKernelState() {
    return kernelState;
}
export function boot() {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield runOnboardingWizard();
            // A real implementation would likely reboot here. For simplicity, we continue.
        }
        const config = getConfig();
        // Ensure config exists, create default if something went wrong after onboarding
        if (!config) {
            createDefaultConfig();
        }
        // Initialize the shell and other systems
        initShell(bootScreen);
        updateShellPrompt(config.identity.username, config.identity.hostname);
        shellPrint('Welcome to Lonx OS!');
        shellPrint('Type "help" for a list of commands.');
        kernelState = 'RUNNING';
        console.log('Lonx has booted successfully.');
    });
}
