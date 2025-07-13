# Lonx OS: Processes & Kernel Job Handling

This document provides a detailed overview of the process management, job control, and memory management systems within Lonx OS. These systems form the core of the kernel's ability to simulate a multitasking operating system.

---

## 1. Core Kernel Components

The kernel's functionality is primarily driven by two major components: the **Process & Thread Manager (PTM)** and the **Memory Controller**.

### a. Process & Thread Manager (PTM)

The PTM is the brain of the OS, responsible for creating, managing, and cleaning up all processes.

- **Location:** `/os/core/ptm.ts`
- **Core Class:** `PTM`

**Key Responsibilities:**
- **Process Lifecycle:** Manages the entire lifecycle of a process: creation (`create`), termination (`kill`), suspension (`suspend`), and resumption (`resume`).
- **Process Table:** Maintains a list of all active processes in the system.
- **PID Assignment:** Assigns a unique Process ID (PID) to every new process.
- **Kernel Process:** The first process created on boot is the `kernel` process (PID 1), which serves as the root process for the system.
- **CPU Scheduler:** A simple scheduler runs in the background, periodically updating the simulated CPU usage (`cpu`) and total CPU time consumed (`cpuTime`) for each running process. This makes the system feel more dynamic.

### b. The `Process` Interface

Every running application, command, or service is represented by a `Process` object with the following structure:

```typescript
interface Process {
  pid: number;         // Unique Process ID
  ppid: number;        // Parent Process ID (e.g., the shell's PID)
  name: string;        // The base name of the command (e.g., "spin")
  command?: string;    // The full command with arguments
  status: "running" | "sleeping" | "terminated";
  startTime: number;   // Timestamp of when the process was created
  memory: number;      // RAM allocated in MB
  cpu: number;         // Simulated real-time CPU usage (%)
  cpuTime: number;     // Total accumulated CPU time in seconds
  type: "user" | "system";
}
```

### c. Memory Controller

The Memory Controller simulates a finite pool of RAM for the OS, ensuring that processes only run if there is enough memory available.

- **Location:** `/os/memory.ts`
- **Core Class:** `MemoryController`

**Key Responsibilities:**
- **Memory Allocation:** When a process is created, the PTM requests memory from the controller (`allocate`). If insufficient memory is available, the process creation fails.
- **Memory Deallocation:** When a process is killed or terminates, its allocated memory is freed (`free`) and returned to the system pool.
- **System Stats:** Provides statistics on total, used, and free memory, which are used by commands like `memstat`.

---

## 2. Shell Integration & Job Control

The Lonx shell is deeply integrated with the PTM to provide a realistic command-line experience with full job control.

### a. Process-per-Command

Every command entered into the shell is executed as its own process. The shell creates a new process via the PTM, waits for the command to finish (if it's a foreground task), and then cleans up the process.

### b. Foreground and Background Jobs

Lonx supports running tasks in both the foreground and background.

- **Foreground (Default):** The shell will wait for the command to complete before showing a new prompt.
  ```sh
  spin 10 # Shell is blocked for 10 seconds
  ```
- **Background (`&`):** Appending an ampersand (`&`) to a command runs it in the background, immediately returning the prompt to the user.
  ```sh
  sleep 30 & # Shell returns a new prompt instantly
  [1] 23     # A job ID and PID are displayed
  ```

### c. Suspending and Resuming Jobs

- **Suspend (`Ctrl+Z`):** You can suspend the current foreground command by pressing `Ctrl+Z`. This changes the process status to "sleeping".
- **Resume (`bg`, `fg`):** A suspended (or "stopped") job can be resumed in the background with the `bg` command or brought back to the foreground with `fg`.

---

## 3. System Commands

The following built-in commands are available for process and job management:

| Command        | Description                                                                                             |
|----------------|---------------------------------------------------------------------------------------------------------|
| `ps`           | Lists all running processes with details: PID, PPID, Status, Memory, CPU%, CPU Time, and Command.         |
| `kill <pid>`   | Terminates a process with the specified PID. System processes cannot be killed without `sudo`.            |
| `jobs`         | Displays a list of all jobs that are currently running in the background or are stopped.                  |
| `bg %<job_id>` | Resumes a stopped job (specified by its job ID from the `jobs` command) and runs it in the background.    |
| `fg %<job_id>` | Resumes a job and brings it to the foreground. (Note: In the current simulation, this is conceptual).     |
| `sleep <sec>`  | A simple utility that waits for a specified number of seconds. Ideal for testing background jobs.         |
| `spin <sec>`   | A utility that performs a CPU-intensive loop for a number of seconds. Ideal for testing CPU monitoring.   |
| `memstat`      | Displays a summary of system-wide memory usage and a per-process memory breakdown.                      |

This robust process and memory management system is the foundation that makes Lonx OS a powerful and realistic browser-based operating system simulation.
