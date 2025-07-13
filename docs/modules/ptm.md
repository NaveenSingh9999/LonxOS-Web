# Module: Process & Thread Manager (PTM)

---

## 📌 Overview

The Process & Thread Manager (PTM) is the core component of the Lonx kernel responsible for managing the entire lifecycle of all processes. It acts as the central nervous system, tracking everything from system services to user-run commands.

---

## 🧱 Class Design

The PTM is implemented as a singleton class named `PTM`.

```typescript
class PTM {
  private processes: Process[] = [];
  private nextPid = 1;
  private schedulerInterval: number | null = null;

  create(name: string, memory: number, type: string, ppid: number, command?: string): Process | null;
  kill(pid: number): boolean;
  suspend(pid: number): void;
  resume(pid: number): void;
  list(): Process[];
  get(pid: number): Process | undefined;
  cleanup(): void;
}
```

### The `Process` Interface
```typescript
interface Process {
  pid: number;
  ppid: number;
  name: string;
  status: "running" | "sleeping" | "terminated";
  startTime: number;
  memory: number; // in MB
  cpu: number; // Simulated %
  cpuTime: number; // Accumulated seconds
  type: "user" | "system";
  command?: string;
}
```

---

## 🧪 Sample Usage

The PTM is exposed globally, typically via the kernel object. The shell uses it to manage commands.

**Creating a process:**
```typescript
// The shell does this for every command.
const process = ptm.create("nano", 30, "user", 1, "nano /home/user/file.txt");

if (!process) {
  console.error("Failed to create process: Not enough memory.");
}
```

**Listing processes:**
```typescript
// The 'ps' command uses this.
const allProcesses = ptm.list();
allProcesses.forEach(p => {
  console.log(`${p.pid}\t${p.name}`);
});
```

**Terminating a process:**
```typescript
// The 'kill' command uses this.
const success = ptm.kill(101); // Kills process with PID 101
if (!success) {
  console.error("Could not kill process.");
}
```

---

## ⚠️ Limitations

- **Single-Threaded Simulation:** While the PTM can manage multiple `Process` objects, the entire OS runs in a single JavaScript thread. True parallelism is not yet implemented.
- **No Real Threads:** The concept of "threads" is currently just a `threadCount` property on the `Process` object. Future versions may use Web Workers to simulate real multithreading.
- **Basic Scheduler:** The CPU scheduler is a simple `setInterval` that assigns random CPU usage for flavor. It does not perform real scheduling (e.g., round-robin or priority-based).

---

## 🔧 How to Extend

- **Adding Thread Support:** The `Process` interface is ready for a `threadCount`. To implement this, one could create a pool of Web Workers. The `create` method could be modified to spawn a worker and associate it with the process.
- **Improving the Scheduler:** The `startScheduler` method can be replaced with a more sophisticated algorithm that manages a run queue, allocates time slices, and handles process priorities.
- **Inter-Process Communication (IPC):** A messaging system could be added to the PTM, allowing processes to send and receive signals or data, for example, by adding `postMessage(pid, message)` and `onMessage(callback)` methods.

<!-- yo -->