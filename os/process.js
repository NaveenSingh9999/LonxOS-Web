// os/process.ts
import { allocateMemory } from "./memory.js";
let nextPid = 1;
const processList = [];
export function createProcess(name, func) {
    if (!allocateMemory(5)) { // Allocate 5MB for each new process
        console.error(`[Process] Failed to create process '${name}': Out of memory.`);
        return -1;
    }
    const pid = nextPid++;
    const process = {
        pid,
        name,
        execute: func
    };
    processList.push(process);
    console.log(`[Process] Created process '${name}' with PID ${pid}.`);
    return pid;
}
export function getProcessList() {
    return processList;
}
