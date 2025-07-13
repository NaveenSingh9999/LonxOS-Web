// os/core/ptm.ts
import { memoryController } from '../memory.js';

export type ProcessStatus = "running" | "sleeping" | "terminated" | "zombie";
export type ProcessType = "user" | "system";
export type Priority = "high" | "normal" | "low";

export interface Process {
  pid: number;
  ppid: number; // parent process id
  name: string;
  status: ProcessStatus;
  startTime: number;
  cpuTime: number; // Total CPU time consumed in seconds
  memory: number; // in MB
  cpu: number; // fake %, based on cycles
  threadCount: number;
  type: ProcessType;
  priority: Priority;
  command?: string;
  stdin: string[];
  stdout: string[];
  stderr: string[];
  ipcQueue: { from: number; message: any }[];
  threads: Worker[];
}

type MessageCallback = (message: any, from: number) => void;

class PTM {
  private processes: Process[] = [];
  private nextPid = 1;
  private schedulerInterval: number | null = null;
  private runQueue: Process[] = [];
  private messageListeners: Map<number, MessageCallback> = new Map();

  constructor() {
    this.startScheduler();
  }

  create(name: string, memory = 20, type: ProcessType = "user", ppid = 1, command?: string, priority: Priority = "normal"): Process | null {
    if (!memoryController.allocate(memory)) {
      console.error(`[PTM] Failed to create process '${name}': Not enough memory.`);
      return null;
    }

    const proc: Process = {
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
      priority,
      command,
      stdin: [],
      stdout: [],
      stderr: [],
      ipcQueue: [],
      threads: [],
    };
    this.processes.push(proc);
    this.runQueue.push(proc); // Add to the run queue
    console.log(`[PTM] Created process '${proc.name}' (PID: ${proc.pid}) using ${memory}MB`);
    return proc;
  }

  // Improved scheduler with run queue and priorities
  private startScheduler(): void {
    if (this.schedulerInterval) return;
    this.schedulerInterval = setInterval(() => {
      // Simple priority-based sorting. High priority processes run more often.
      this.runQueue.sort((a, b) => {
        const priorities = { high: 0, normal: 1, low: 2 };
        return priorities[a.priority] - priorities[b.priority];
      });

      const processToRun = this.runQueue.shift(); // Get the next process from the queue

      if (processToRun && processToRun.status === 'running') {
        // Simulate work
        const baseCpu = processToRun.type === 'system' ? 2 : 5;
        const fluctuation = (Math.random() - 0.4) * 3;
        processToRun.cpu = Math.max(0.1, Math.min(baseCpu + fluctuation, 15));
        processToRun.cpuTime += (processToRun.cpu / 100) * 0.5; // Interval is 500ms

        // Add it back to the queue to run again
        this.runQueue.push(processToRun);
      }

      // Set other processes' CPU to 0 if not running
      this.processes.forEach(p => {
        if (p.status !== 'running') p.cpu = 0;
      });
    }, 500); // Faster scheduler interval
  }

  private stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  kill(pid: number): boolean {
    const processIndex = this.processes.findIndex(p => p.pid === pid);
    if (processIndex === -1 || this.processes[processIndex].type === 'system') {
      console.warn(`[PTM] Attempted to kill non-existent or system process PID: ${pid}`);
      return false; // Cannot kill system processes or non-existent processes
    }

    const process = this.processes[processIndex];
    process.status = "terminated";
    // Terminate all associated threads
    process.threads.forEach(worker => worker.terminate());
    memoryController.free(process.memory);
    console.log(`[PTM] Killed process ${process.name} (PID: ${pid}). Freed ${process.memory}MB`);
    
    this.cleanup();
    return true;
  }

  // In a real OS, this would pause execution. Here, it's a state change.
  suspend(pid: number): void {
    const process = this.get(pid);
    if (process) {
      process.status = "sleeping";
    }
  }

  resume(pid: number): void {
    const process = this.get(pid);
    if (process && process.status === "sleeping") {
      process.status = "running";
    }
  }

  list(): Process[] {
    return this.processes;
  }

  get(pid: number): Process | undefined {
    return this.processes.find(p => p.pid === pid);
  }

  // Removes terminated processes from the list
  cleanup(): void {
    this.processes = this.processes.filter(p => p.status !== "terminated");
    this.runQueue = this.runQueue.filter(p => p.status !== "terminated");
  }

  // --- IPC Methods ---
  postMessage(fromPid: number, toPid: number, message: any): boolean {
    const targetProcess = this.get(toPid);
    if (!targetProcess) return false;

    const listener = this.messageListeners.get(toPid);
    if (listener) {
      listener(message, fromPid);
    } else {
      // If no active listener, queue the message
      targetProcess.ipcQueue.push({ from: fromPid, message });
    }
    return true;
  }

  onMessage(pid: number, callback: MessageCallback): void {
    const process = this.get(pid);
    if (!process) return;

    // Register the listener
    this.messageListeners.set(pid, callback);

    // Process any queued messages
    if (process.ipcQueue.length > 0) {
      process.ipcQueue.forEach(msg => {
        callback(msg.message, msg.from);
      });
      process.ipcQueue = []; // Clear the queue
    }
  }

  // --- Threading Methods (Real Implementation) ---
  spawnThread(pid: number, onMessage: (message: any) => void, onError: (error: any) => void): number {
    const process = this.get(pid);
    if (!process) return -1;

    // Create a new Web Worker
    // Note: The path must be relative to the final JS output directory.
    const worker = new Worker('./os/core/worker.js', { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      console.log(`[PTM] Message from thread for PID ${pid}:`, e.data);
      onMessage(e.data); // Forward message to the process's listener
    };

    worker.onerror = (e: ErrorEvent) => {
      console.error(`[PTM] Error in thread for PID ${pid}:`, e.message);
      onError(e); // Forward error to the process's listener
      // Optionally remove the failed worker
      this.terminateThread(pid, worker);
    };
    
    const threadId = process.threads.length;
    process.threads.push(worker);
    process.threadCount = process.threads.length + 1; // +1 for the main thread
    
    console.log(`[PTM] Spawned thread ${threadId} for PID ${pid}`);
    worker.postMessage({ command: 'start' }); // Start the worker
    return threadId;
  }

  terminateThread(pid: number, worker: Worker): boolean {
    const process = this.get(pid);
    if (!process) return false;

    const threadIndex = process.threads.indexOf(worker);
    if (threadIndex === -1) return false;

    worker.terminate();
    process.threads.splice(threadIndex, 1);
    process.threadCount = process.threads.length + 1;
    console.log(`[PTM] Terminated thread ${threadIndex} for PID ${pid}`);
    return true;
  }

  postMessageToThread(pid: number, threadId: number, message: any): boolean {
    const process = this.get(pid);
    if (!process || !process.threads[threadId]) {
      console.error(`[PTM] Thread ${threadId} not found for PID ${pid}`);
      return false;
    }

    process.threads[threadId].postMessage(message);
    return true;
  }
}

export const ptm = new PTM();
