// /os/boot/onboarding.ts
import { setConfig } from '../core/config.js';
import { DEFAULT_CONFIG, THEME_OPTIONS, SHELL_STYLE_OPTIONS } from '../core/constants.js';

// This is a mock shell interaction layer for the onboarding process.
// In a real scenario, this would be tightly integrated with the actual shell.
const shell = {
    print: (text: string) => console.log(text),
    readLine: async (prompt: string): Promise<string> => {
        return new Promise(resolve => {
            // This is a browser-based simulation.
            const answer = window.prompt(prompt);
            resolve(answer || '');
        });
    }
};

async function askQuestion(prompt: string, validation: (input: string) => boolean, errorMessage: string): Promise<string> {
    let answer = '';
    while (true) {
        answer = await shell.readLine(prompt);
        if (validation(answer)) {
            break;
        }
        shell.print(errorMessage);
    }
    return answer;
}

export async function runOnboardingWizard(): Promise<void> {
    shell.print("Welcome to Lonx OS! Let's set up your system.");

    const username = await askQuestion(
        "Enter your desired username (no spaces or symbols): ",
        (input) => /^[a-zA-Z0-9]+$/.test(input),
        "Invalid username. Please use only letters and numbers."
    );

    let hostname = await shell.readLine("Enter your hostname (default: lonx-machine): ");
    if (!hostname.trim()) {
        hostname = 'lonx-machine';
    }

    const theme = await askQuestion(
        `Choose a theme [${THEME_OPTIONS.join(' / ')}]: `,
        (input) => THEME_OPTIONS.includes(input),
        "Invalid theme. Please choose from the list."
    );

    const shellStyle = await askQuestion(
        `Choose a shell style [${SHELL_STYLE_OPTIONS.join(' / ')}]: `,
        (input) => SHELL_STYLE_OPTIONS.includes(input),
        "Invalid shell style. Please choose from the list."
    );

    const newConfig = { ...DEFAULT_CONFIG };
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

    const confirmation = await askQuestion(
        "Is this correct? (yes/no): ",
        (input) => ['yes', 'no'].includes(input.toLowerCase()),
        "Please enter 'yes' or 'no'."
    );

    if (confirmation.toLowerCase() === 'yes') {
        setConfig(newConfig);
        shell.print("Configuration saved. Booting into Lonx OS...");
    } else {
        shell.print("Onboarding cancelled. Please refresh to start over.");
        // Halt further execution
        return new Promise(() => {});
    }
}
