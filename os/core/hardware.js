// os/core/hardware.ts
import { getConfig } from './config.js';
let hardware;
export function initHardware() {
    const config = getConfig();
    const hardwareConfig = config === null || config === void 0 ? void 0 : config.hardware;
    if (hardwareConfig) {
        hardware = hardwareConfig;
    }
    else {
        // Generate default hardware if not in config
        hardware = {
            cpu: {
                model: 'WebCore x86-64',
                speed: (2.8 + Math.random() * 1.2),
                cores: navigator.hardwareConcurrency || 4,
            },
            ram: {
                total: 2048, // 2GB default
            },
            storage: {
                total: 100, // 100MB virtual storage
                type: 'localStorage VFS',
            },
        };
    }
    console.log('[Hardware] Initialized:', hardware);
}
export function getHardwareInfo() {
    return hardware;
}
export function getCpuUsage() {
    // Simulate CPU usage
    return Math.random() * 15 + 5; // Simulate 5-20% usage
}
