var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
export function executeCommand(command, args) {
    return __awaiter(this, void 0, void 0, function* () {
        // This is a placeholder. In a real OS, this would involve
        // finding the executable in the path, loading it into memory,
        // and creating a new process.
        console.log(`Executing command: ${command} with args: ${args.join(' ')}`);
        // For now, we'll just log it. The actual execution logic is in the shell.
    });
}
