// os/memory.ts
class MemoryController {
    constructor() {
        this.totalRAM = 0;
        this.usedRAM = 0;
    }
    init(total) {
        this.totalRAM = total;
        this.usedRAM = 0; // Reset used RAM on init
        console.log(`[Memory] Initialized with ${this.totalRAM}MB total.`);
    }
    allocate(amount) {
        if (this.usedRAM + amount > this.totalRAM) {
            return false; // Out of memory
        }
        this.usedRAM += amount;
        return true;
    }
    free(amount) {
        this.usedRAM = Math.max(0, this.usedRAM - amount);
    }
    getUsed() {
        return this.usedRAM;
    }
    getFree() {
        return this.totalRAM - this.usedRAM;
    }
    getTotal() {
        return this.totalRAM;
    }
    getPercentUsed() {
        if (this.totalRAM === 0)
            return 0;
        return Math.floor((this.usedRAM / this.totalRAM) * 100);
    }
}
export const memoryController = new MemoryController();

// yo