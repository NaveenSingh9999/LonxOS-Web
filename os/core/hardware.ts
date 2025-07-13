// os/core/hardware.ts

import { getConfig } from './config.js';

interface SimulatedHardware {
    cpu: {
        model: string;
        speed: number; // in GHz
        cores: number;
    };
    ram: {
        total: number; // in MB
    };
    storage: {
        total: number; // in MB
        type: string;
    };
}

let hardware: SimulatedHardware;

export function initHardware(): void {
    const config = getConfig();
    const hardwareConfig = config?.hardware;

    if (hardwareConfig) {
        hardware = hardwareConfig;
    } else {
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

export function getHardwareInfo(): SimulatedHardware {
    return hardware;
}

export function getCpuUsage(): number {
    // Simulate CPU usage
    return Math.random() * 15 + 5; // Simulate 5-20% usage
}
