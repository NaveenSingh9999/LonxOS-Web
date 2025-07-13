// os/process.ts
import { allocateMemory } from "./memory.js";

type ProcessFunction = () => void;

interface Process {
    pid: number;
    name: string;
    execute: ProcessFunction;
}

let nextPid = 1;
const processList: Process[] = [];

export function createProcess(name: string, func: ProcessFunction): number {
    if (!allocateMemory(5)) { // Allocate 5MB for each new process
        console.error(`[Process] Failed to create process '${name}': Out of memory.`);
        return -1;
    }
    const pid = nextPid++;
    const process: Process = {
        pid,
        name,
        execute: func
    };
    processList.push(process);
    console.log(`[Process] Created process '${name}' with PID ${pid}.`);
    return pid;
}

export function getProcessList(): Process[] {
    return processList;
}

export async function executeCommand(command: string, args: string[]) {
    // This is a placeholder. In a real OS, this would involve
    // finding the executable in the path, loading it into memory,
    // and creating a new process.
    console.log(`Executing command: ${command} with args: ${args.join(' ')}`);
    // For now, we'll just log it. The actual execution logic is in the shell.
}
