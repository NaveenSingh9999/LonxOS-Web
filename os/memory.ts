// os/memory.ts

class MemoryController {
    private totalRAM: number = 0;
    private usedRAM: number = 0;

    init(total: number) {
        this.totalRAM = total;
        this.usedRAM = 0; // Reset used RAM on init
        console.log(`[Memory] Initialized with ${this.totalRAM}MB total.`);
    }

    allocate(amount: number): boolean {
        if (this.usedRAM + amount > this.totalRAM) {
            return false; // Out of memory
        }
        this.usedRAM += amount;
        return true;
    }

    free(amount: number): void {
        this.usedRAM = Math.max(0, this.usedRAM - amount);
    }

    getUsed(): number {
        return this.usedRAM;
    }

    getFree(): number {
        return this.totalRAM - this.usedRAM;
    }

    getTotal(): number {
        return this.totalRAM;
    }

    getPercentUsed(): number {
        if (this.totalRAM === 0) return 0;
        return Math.floor((this.usedRAM / this.totalRAM) * 100);
    }
}

export const memoryController = new MemoryController();
