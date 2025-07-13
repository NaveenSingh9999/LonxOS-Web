// os/core/worker.ts
// This script will be executed by Web Workers.

self.onmessage = (e: MessageEvent) => {
  const { command, payload } = e.data;

  switch (command) {
    case 'start':
      // Acknowledge start and send back the thread's ID (in a real scenario)
      self.postMessage({ status: 'started', threadId: self.name });
      break;
    case 'exec':
      // Simulate some work and send back a result
      try {
        // In a real OS, this would execute more complex code.
        // For now, we'll just echo the payload.
        const result = payload; 
        self.postMessage({ status: 'completed', result });
      } catch (error: any) {
        self.postMessage({ status: 'error', error: error.message });
      }
      break;
    default:
      self.postMessage({ status: 'error', error: `Unknown command: ${command}` });
  }
};

// Let the main thread know the worker is ready.
self.postMessage({ status: 'ready' });
