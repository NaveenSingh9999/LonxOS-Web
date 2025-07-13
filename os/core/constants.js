// /os/core/constants.ts
export const DEFAULT_USERNAME = 'user';
export const DEFAULT_HOSTNAME = 'lonx-machine';
export const THEME_OPTIONS = ['dark', 'light', 'frosted'];
export const DEFAULT_THEME = 'dark';
export const SHELL_STYLE_OPTIONS = ['bash', 'zsh', 'friendly'];
export const DEFAULT_SHELL_STYLE = 'bash';
export const DEFAULT_PACKAGE_REPOS = [
    'https://naveensingh9999.github.io/standard-module-lib-lonxos/index.json'
];
export const DEFAULT_CONFIG = {
    identity: {
        username: DEFAULT_USERNAME,
        hostname: DEFAULT_HOSTNAME,
    },
    ui: {
        theme: DEFAULT_THEME,
        shellStyle: DEFAULT_SHELL_STYLE,
        fontSize: 'medium',
    },
    system: {
        firstBoot: true,
        startupApps: ['shell'],
        logsEnabled: true,
    },
    network: {
        dns: '1.1.1.1',
        lastKnownIP: '0.0.0.0',
    },
    packages: {
        repos: DEFAULT_PACKAGE_REPOS,
        installed: [],
    },
    security: {
        sudo: true,
        rootAccess: false,
    },
};
