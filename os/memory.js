// os/memory.ts
let totalMemory;
let usedMemory;
export function initMemory() {
    totalMemory = 4096 + Math.floor(Math.random() * 8) * 2048;
    usedMemory = 10 + Math.random() * 15; // Initial kernel memory usage
    console.log(`[Memory] Initialized with ${totalMemory}MB total.`);
}
export function allocateMemory(size) {
    if (usedMemory + size > totalMemory) {
        return false; // Out of memory
    }
    usedMemory += size;
    return true;
}
export function freeMemory(size) {
    usedMemory -= size;
    if (usedMemory < 0)
        usedMemory = 0;
}
export function getMemoryStats() {
    return {
        total: totalMemory,
        used: usedMemory,
        free: totalMemory - usedMemory
    };
}
