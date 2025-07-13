# Module: Memory Controller

---

## 📌 Overview

The Memory Controller is a kernel-level module that simulates a finite pool of system RAM. Its primary purpose is to track memory usage and enforce limits, preventing the system from becoming unstable due to excessive memory allocation by processes.

---

## 🧱 Class Design

The Memory Controller is implemented as a singleton class named `MemoryController`.

```typescript
class MemoryController {
  private totalRAM: number; // Total simulated RAM in MB
  private usedRAM: number;

  constructor(totalRAM: number);

  allocate(amount: number): boolean;
  free(amount: number): void;
  getUsed(): number;
  getFree(): number;
  getTotal(): number;
  getUsageStats(): { total: number, used: number, free: number, percentUsed: number };
}
```

The `totalRAM` is determined at boot time by the simulated hardware layer and passed to the controller's constructor by the kernel.

---

## 🧪 Sample Usage

The Memory Controller is used primarily by the **Process & Thread Manager (PTM)**.

**Allocating memory for a new process:**
```typescript
// Inside ptm.create()
const memoryToAllocate = 30; // 30 MB for a new process

if (!memoryController.allocate(memoryToAllocate)) {
  // Fail to create the process if not enough memory is available
  console.error("Out of memory!");
  return null;
}

// ... proceed to create the process
```

**Freeing memory when a process is killed:**
```typescript
// Inside ptm.kill()
const processToKill = ptm.get(pid);
memoryController.free(processToKill.memory);
```

**Getting stats for the `memstat` command:**
```typescript
// Inside the 'memstat' shell command
const stats = memoryController.getUsageStats();
console.log(`RAM: ${stats.used}MB / ${stats.total}MB (${stats.percentUsed}%)`);
```

---

## ⚠️ Limitations

- **No Swapping/Paging:** The memory is purely virtual and in-RAM. There is no concept of a swap file or paging memory to disk. If RAM is full, allocations simply fail.
- **No Memory Protection:** The controller trusts that a process uses the amount of memory it requested. It cannot enforce that a process doesn't "use" more than its allocation, as this is just a simulation.
- **Manual Garbage Collection:** Memory must be manually freed by calling `free()`. There is no automatic garbage collection for terminated processes that aren't properly cleaned up by the PTM.

---

## 🔧 How to Extend

- **Implement a Swap File:** A "swap" could be simulated by moving a process's state into a temporary file in the virtual filesystem when memory is low, and loading it back when needed. This would require adding `swapOut(process)` and `swapIn(pid)` methods.
- **Add Memory Caching:** A portion of RAM could be designated as a cache for the filesystem to improve read/write performance. The controller would need methods to manage this cache.
- **Dynamic Memory Allocation:** Processes could be allowed to request more memory *after* they've been created, requiring a `reallocate(pid, newAmount)` method that checks if the additional memory is available.
