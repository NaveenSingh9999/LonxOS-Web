// os/kernel.ts

import { initFS } from './fs.js';
import { startShell } from './shell.js';
import { initMemory } from './memory.js';
import { createProcess, getProcessList } from './process.js';

export function bootKernel(bootScreen: HTMLElement) {
  console.log('[Lonx Kernel] Booting v1.0...');
  
  initMemory();
  initFS();

  console.log('[Kernel] Mounting File System... OK');
  console.log('[Kernel] Launching Shell Process (PID 1)...');

  createProcess('shell', () => {
    startShell(bootScreen); // Pass the boot screen element to the shell
  });

  // Start the execution of the first process
  const processes = getProcessList();
  if (processes.length > 0 && processes[0].pid === 1) {
      processes[0].execute();
  }
}
