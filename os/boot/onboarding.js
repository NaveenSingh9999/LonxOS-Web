var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// /os/boot/onboarding.ts
import { setConfig } from '../core/config.js';
import { DEFAULT_CONFIG, THEME_OPTIONS, SHELL_STYLE_OPTIONS } from '../core/constants.js';
// This is a mock shell interaction layer for the onboarding process.
// In a real scenario, this would be tightly integrated with the actual shell.
const shell = {
    print: (text) => console.log(text),
    readLine: (prompt) => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise(resolve => {
            // This is a browser-based simulation.
            const answer = window.prompt(prompt);
            resolve(answer || '');
        });
    })
};
function askQuestion(prompt, validation, errorMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        let answer = '';
        while (true) {
            answer = yield shell.readLine(prompt);
            if (validation(answer)) {
                break;
            }
            shell.print(errorMessage);
        }
        return answer;
    });
}
export function runOnboardingWizard() {
    return __awaiter(this, void 0, void 0, function* () {
        shell.print("Welcome to Lonx OS! Let's set up your system.");
        const username = yield askQuestion("Enter your desired username (no spaces or symbols): ", (input) => /^[a-zA-Z0-9]+$/.test(input), "Invalid username. Please use only letters and numbers.");
        let hostname = yield shell.readLine("Enter your hostname (default: lonx-machine): ");
        if (!hostname.trim()) {
            hostname = 'lonx-machine';
        }
        const theme = yield askQuestion(`Choose a theme [${THEME_OPTIONS.join(' / ')}]: `, (input) => THEME_OPTIONS.includes(input), "Invalid theme. Please choose from the list.");
        const shellStyle = yield askQuestion(`Choose a shell style [${SHELL_STYLE_OPTIONS.join(' / ')}]: `, (input) => SHELL_STYLE_OPTIONS.includes(input), "Invalid shell style. Please choose from the list.");
        const newConfig = Object.assign({}, DEFAULT_CONFIG);
        newConfig.identity.username = username;
        newConfig.identity.hostname = hostname;
        newConfig.ui.theme = theme;
        newConfig.ui.shellStyle = shellStyle;
        newConfig.system.firstBoot = false;
        shell.print("\n--- Configuration Summary ---");
        shell.print(`Username: ${username}`);
        shell.print(`Hostname: ${hostname}`);
        shell.print(`Theme: ${theme}`);
        shell.print(`Shell Style: ${shellStyle}`);
        shell.print("---------------------------\n");
        const confirmation = yield askQuestion("Is this correct? (yes/no): ", (input) => ['yes', 'no'].includes(input.toLowerCase()), "Please enter 'yes' or 'no'.");
        if (confirmation.toLowerCase() === 'yes') {
            setConfig(newConfig);
            shell.print("Configuration saved. Booting into Lonx OS...");
        }
        else {
            shell.print("Onboarding cancelled. Please refresh to start over.");
            // Halt further execution
            return new Promise(() => { });
        }
    });
}
