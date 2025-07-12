// os/memory.ts

interface MemoryStats {
    total: number;
    used: number;
    free: number;
}

let totalMemory: number;
let usedMemory: number;

export function initMemory() {
    totalMemory = 4096 + Math.floor(Math.random() * 8) * 2048;
    usedMemory = 10 + Math.random() * 15; // Initial kernel memory usage
    console.log(`[Memory] Initialized with ${totalMemory}MB total.`);
}

export function allocateMemory(size: number): boolean {
    if (usedMemory + size > totalMemory) {
        return false; // Out of memory
    }
    usedMemory += size;
    return true;
}

export function freeMemory(size: number) {
    usedMemory -= size;
    if (usedMemory < 0) usedMemory = 0;
}

export function getMemoryStats(): MemoryStats {
    return {
        total: totalMemory,
        used: usedMemory,
        free: totalMemory - usedMemory
    };
}
