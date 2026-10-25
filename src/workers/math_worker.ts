import { parentPort } from 'worker_threads';
import * as math from 'mathjs';

// Runs in its own thread so the caller can enforce time and memory limits

parentPort?.on('message', ({ expression }: { expression: string }) => {
  try {
    const parsed = math.parse(expression).toString();
    // Stringify here, mathjs class instances don't survive postMessage
    const result = `${math.evaluate(expression)}`;
    parentPort?.postMessage({ ok: true, parsed, result });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Mathjs Error';
    parentPort?.postMessage({ ok: false, error });
  }
});

// mathjs is loaded, let the caller know it can start timing requests
parentPort?.postMessage({ ready: true });
