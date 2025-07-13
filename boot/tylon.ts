import { boot } from '../os/kernel.js';

interface BootConfig {
    boot: {
        entries: { name: string; path: string }[];
        timeout: number;
        default: number;
    };
}

class TylonV {
    private bootScreen: HTMLElement;
    private config: BootConfig | null = null;
    private state: 'POST' | 'MENU' | 'BOOTING' | 'CONFIG' | 'CONFIG_TIMEOUT' | 'CONFIG_DEFAULT_OS' = 'POST';
    private selectedOption = 0;
    private selectedConfigOption = 0;
    private selectedDefaultOs = 0;
    private countdown = 0;
    private countdownTimer: number | null = null;
    private ctrlJCount = 0;
    private ctrlJTimeout: number | null = null;
    private tempTimeout = '';

    constructor() {
        this.bootScreen = document.getElementById('boot-screen')!;
        this.loadConfig().then(() => {
            this.selectedOption = this.config?.boot.default ?? 0;
            this.selectedDefaultOs = this.config?.boot.default ?? 0;
            this.countdown = this.config?.boot.timeout ?? 10;
            this.runPOST();
        });
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    private async loadConfig() {
        const savedConfig = localStorage.getItem('tylonConfig');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
            return;
        }
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
            localStorage.setItem('tylonConfig', JSON.stringify(this.config));
        } catch (error) {
            this.bootScreen.innerHTML = `Error loading config.json: ${error}`;
        }
    }

    private saveConfig() {
        if (this.config) {
            localStorage.setItem('tylonConfig', JSON.stringify(this.config));
        }
    }

    private runPOST() {
        this.state = 'POST';
        const ram = 4096 + Math.floor(Math.random() * 8) * 2048; // 4GB to 18GB
        const cpuSpeed = (2.8 + Math.random() * 1.2).toFixed(1); // 2.8GHz to 4.0GHz
        const postInfo = `
TylonV Bootloader v1.0
Initializing...

RAM: ${ram}MB
CPU: WebCore x86 v${cpuSpeed}GHz
Boot Device: /os/lonx.limg
Display: WebDriver v1.9

POST OK.
        `;
        this.typewriter(postInfo, () => {
            setTimeout(() => this.showBootMenu(), 1000);
        });
    }

    private showBootMenu() {
        this.state = 'MENU';
        this.renderMenu();
        this.startCountdown();
    }

    private renderMenu() {
        if (!this.config) return;
        let menuHTML = 'Select OS to boot:\n\n';
        this.config.boot.entries.forEach((entry, index) => {
            menuHTML += `${index === this.selectedOption ? '> ' : '  '}${entry.name}\n`;
        });
        menuHTML += `\nBooting ${this.config.boot.entries[this.selectedOption].name} in ${this.countdown} seconds...`;
        this.bootScreen.innerHTML = menuHTML;
    }

    private startCountdown() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = window.setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                this.bootSelectedOS();
            } else {
                this.renderMenu();
            }
        }, 1000);
    }

    private stopCountdown() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
    }

    private bootSelectedOS() {
        this.stopCountdown();
        this.state = 'BOOTING';
        const entry = this.config!.boot.entries[this.selectedOption];
        this.bootScreen.innerHTML = `Booting ${entry.name} from ${entry.path}...`;
        console.log(`Booting ${entry.name}`);
        // Simulate boot process
        setTimeout(() => {
            this.bootScreen.innerHTML = ''; // Clear the bootloader screen
            boot();
        }, 1000);
    }

    private handleKeyPress(e: KeyboardEvent) {
        e.preventDefault();

        if (e.key === 'j' && e.ctrlKey) {
            this.ctrlJCount++;
            if (this.ctrlJTimeout) clearTimeout(this.ctrlJTimeout);
            this.ctrlJTimeout = window.setTimeout(() => this.ctrlJCount = 0, 500);
            if (this.ctrlJCount === 2) {
                if (this.state !== 'CONFIG' && this.state !== 'BOOTING') {
                    this.enterConfigMode();
                }
            }
            return;
        }

        switch (this.state) {
            case 'MENU':
                this.handleMenuKeys(e);
                break;
            case 'CONFIG':
                this.handleConfigMenuKeys(e);
                break;
            case 'CONFIG_TIMEOUT':
                this.handleTimeoutInput(e);
                break;
            case 'CONFIG_DEFAULT_OS':
                this.handleDefaultOsKeys(e);
                break;
        }

        if (e.key === 'Escape' && this.state.startsWith('CONFIG_')) {
            this.enterConfigMode();
        } else if (e.key === 'Escape' && this.state === 'CONFIG') {
            this.showBootMenu();
        }
    }

    private handleMenuKeys(e: KeyboardEvent) {
        this.stopCountdown();
        this.countdown = this.config?.boot.timeout ?? 10;

        if (e.key === 'ArrowUp') {
            this.selectedOption = (this.selectedOption - 1 + this.config!.boot.entries.length) % this.config!.boot.entries.length;
            this.renderMenu();
        } else if (e.key === 'ArrowDown') {
            this.selectedOption = (this.selectedOption + 1) % this.config!.boot.entries.length;
            this.renderMenu();
        } else if (e.key === 'Enter') {
            this.bootSelectedOS();
        }
        if (this.state === 'MENU') { // only start countdown if we haven't booted
            this.startCountdown();
        }
    }

    private enterConfigMode() {
        this.stopCountdown();
        this.state = 'CONFIG';
        this.selectedConfigOption = 0;
        this.renderConfigMenu();
    }

    private renderConfigMenu() {
        const options = [
            'View boot entries',
            'Set boot timeout',
            'Change default OS',
            'Exit config'
        ];
        let configMenu = `
BOOT DASH CONFIG\n\n`;
        options.forEach((opt, index) => {
            configMenu += `${index === this.selectedConfigOption ? '> ' : '  '}${opt}\n`;
        });
        configMenu += `\nPress [Esc] to exit.`;
        this.bootScreen.innerHTML = configMenu;
    }

    private handleConfigMenuKeys(e: KeyboardEvent) {
        const optionsCount = 4;
        if (e.key === 'ArrowUp') {
            this.selectedConfigOption = (this.selectedConfigOption - 1 + optionsCount) % optionsCount;
            this.renderConfigMenu();
        } else if (e.key === 'ArrowDown') {
            this.selectedConfigOption = (this.selectedConfigOption + 1) % optionsCount;
            this.renderConfigMenu();
        } else if (e.key === 'Enter') {
            this.executeConfigOption();
        }
    }

    private executeConfigOption() {
        switch (this.selectedConfigOption) {
            case 0: // View boot entries
                this.viewBootEntries();
                break;
            case 1: // Set boot timeout
                this.state = 'CONFIG_TIMEOUT';
                this.tempTimeout = '';
                this.renderTimeoutScreen();
                break;
            case 2: // Change default OS
                this.state = 'CONFIG_DEFAULT_OS';
                this.selectedDefaultOs = this.config?.boot.default ?? 0;
                this.renderDefaultOsScreen();
                break;
            case 3: // Exit config
                this.showBootMenu();
                break;
        }
    }

    private viewBootEntries() {
        let entriesHTML = 'Boot Entries:\n\n';
        this.config?.boot.entries.forEach(entry => {
            entriesHTML += `  Name: ${entry.name}\n  Path: ${entry.path}\n\n`;
        });
        entriesHTML += 'Press [Esc] to return.';
        this.bootScreen.innerHTML = entriesHTML;
        this.state = 'CONFIG_TIMEOUT'; // Re-use state to just wait for Esc
    }

    private renderTimeoutScreen() {
        this.bootScreen.innerHTML = `
Set boot timeout (current: ${this.config?.boot.timeout}s)\n
Enter new timeout (1-99) and press Enter:
${this.tempTimeout}<span class="cursor"> </span>

Press [Esc] to cancel.`;
    }

    private handleTimeoutInput(e: KeyboardEvent) {
        if (e.key >= '0' && e.key <= '9' && this.tempTimeout.length < 2) {
            this.tempTimeout += e.key;
            this.renderTimeoutScreen();
        } else if (e.key === 'Backspace' && this.tempTimeout.length > 0) {
            this.tempTimeout = this.tempTimeout.slice(0, -1);
            this.renderTimeoutScreen();
        } else if (e.key === 'Enter' && this.tempTimeout.length > 0) {
            const newTimeout = parseInt(this.tempTimeout, 10);
            if (this.config && newTimeout > 0) {
                this.config.boot.timeout = newTimeout;
                this.saveConfig();
            }
            this.enterConfigMode();
        }
    }

    private renderDefaultOsScreen() {
        let osMenuHTML = 'Select default OS:\n\n';
        this.config?.boot.entries.forEach((entry, index) => {
            osMenuHTML += `${index === this.selectedDefaultOs ? '> ' : '  '}${entry.name}\n`;
        });
        osMenuHTML += '\nPress Enter to save, [Esc] to cancel.';
        this.bootScreen.innerHTML = osMenuHTML;
    }

    private handleDefaultOsKeys(e: KeyboardEvent) {
        if (!this.config) return;
        if (e.key === 'ArrowUp') {
            this.selectedDefaultOs = (this.selectedDefaultOs - 1 + this.config.boot.entries.length) % this.config.boot.entries.length;
            this.renderDefaultOsScreen();
        } else if (e.key === 'ArrowDown') {
            this.selectedDefaultOs = (this.selectedDefaultOs + 1) % this.config.boot.entries.length;
            this.renderDefaultOsScreen();
        } else if (e.key === 'Enter') {
            this.config.boot.default = this.selectedDefaultOs;
            this.saveConfig();
            this.enterConfigMode();
        }
    }

    private typewriter(text: string, callback: () => void) {
        let i = 0;
        this.bootScreen.innerHTML = '';
        const typing = () => {
            if (i < text.length) {
                this.bootScreen.innerHTML += text.charAt(i);
                i++;
                setTimeout(typing, 20);
            } else {
                this.bootScreen.innerHTML += '<span class="cursor"> </span>';
                if (callback) callback();
            }
        };
        typing();
    }
}

new TylonV();
