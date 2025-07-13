// os/core/ptm.ts
import { memoryController } from '../memory.js';
class PTM {
    constructor() {
        this.processes = [];
        this.nextPid = 1;
        this.schedulerInterval = null;
        // The kernel itself can be considered PID 0, but we start user/system processes from 1
        this.startScheduler();
    }
    create(name, memory = 20, type = "user", ppid = 1, command) {
        if (!memoryController.allocate(memory)) {
            console.error(`[PTM] Failed to create process '${name}': Not enough memory.`);
            return null;
        }
        const proc = {
            pid: this.nextPid++,
            ppid,
            name,
            status: "running",
            startTime: Date.now(),
            cpuTime: 0,
            memory,
            cpu: Math.random() * 5, // Initial CPU spike
            threadCount: 1,
            type,
            command,
            stdout: [],
            stderr: [],
        };
        this.processes.push(proc);
        console.log(`[PTM] Created process '${proc.name}' (PID: ${proc.pid}) using ${memory}MB`);
        return proc;
    }
    // Scheduler to simulate CPU usage and other dynamic process behaviors
    startScheduler() {
        if (this.schedulerInterval)
            return;
        this.schedulerInterval = setInterval(() => {
            this.processes.forEach(proc => {
                var _a;
                if (proc.status === 'running') {
                    // The 'spin' command will manage its own CPU, so we ignore it here.
                    if (!((_a = proc.command) === null || _a === void 0 ? void 0 : _a.startsWith('spin'))) {
                        const baseCpu = proc.type === 'system' ? 2 : 5;
                        const fluctuation = (Math.random() - 0.4) * 3;
                        proc.cpu = Math.max(0.1, Math.min(baseCpu + fluctuation, 15));
                    }
                    // Increment cpuTime based on cpu usage and interval (1500ms)
                    proc.cpuTime += (proc.cpu / 100) * 1.5;
                }
                else {
                    proc.cpu = 0;
                }
            });
        }, 1500);
    }
    stopScheduler() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }
    kill(pid) {
        const processIndex = this.processes.findIndex(p => p.pid === pid);
        if (processIndex === -1 || this.processes[processIndex].type === 'system') {
            console.warn(`[PTM] Attempted to kill non-existent or system process PID: ${pid}`);
            return false; // Cannot kill system processes or non-existent processes
        }
        const process = this.processes[processIndex];
        process.status = "terminated";
        memoryController.free(process.memory);
        console.log(`[PTM] Killed process ${process.name} (PID: ${pid}). Freed ${process.memory}MB`);
        // In a real OS, the process might become a "zombie" until the parent reaps it.
        // For our simulation, we'll clean it up immediately.
        this.cleanup();
        return true;
    }
    // In a real OS, this would pause execution. Here, it's a state change.
    suspend(pid) {
        const process = this.get(pid);
        if (process) {
            process.status = "sleeping";
        }
    }
    resume(pid) {
        const process = this.get(pid);
        if (process && process.status === "sleeping") {
            process.status = "running";
        }
    }
    list() {
        return this.processes;
    }
    get(pid) {
        return this.processes.find(p => p.pid === pid);
    }
    // Removes terminated processes from the list
    cleanup() {
        this.processes = this.processes.filter(p => p.status !== "terminated");
    }
}
export const ptm = new PTM();
