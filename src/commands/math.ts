import { Worker } from 'worker_threads';
import { ApplicationCommandOptionType } from 'discord.js';
import logger from '../logger.js';
import { ignore } from '../utilities.js';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'math',
  description: 'Evaluate an expression using mathjs.',
  options: [
    {
      name: 'expression',
      type: ApplicationCommandOptionType.String,
      description: 'Expression to evaluate.',
      required: true,
    },
  ],
};

const isProd = process.env.NODE_ENV === 'production';
const workerUrl = new URL(`../workers/math_worker.${isProd ? 'js' : 'ts'}`, import.meta.url);

// tsx's loader isn't inherited by workers, so register it inside the worker in development
const devBootstrap = `import('tsx/esm/api').then(({ register }) => {
  register();
  return import(${JSON.stringify(workerUrl.href)});
});`;

// Limits to keep expensive expressions from stalling or crashing the bot
const TIMEOUT_MS = 1500;
const MAX_ACTIVE = 3;
const MAX_REPLY_LENGTH = 2000;

type WorkerResult = { ok: true; parsed: string; result: string } | { ok: false; error: string };

// Loading mathjs takes ~600ms, so keep a warm worker around to reuse between calls
let spare: Promise<Worker> | null = null;
let active = 0;

function spawnWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(isProd ? workerUrl : devBootstrap, {
      eval: !isProd,
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });
    // Don't let an idle worker keep the process alive
    worker.unref();
    worker.once('message', () => {
      worker.off('error', reject);
      resolve(worker);
    });
    worker.once('error', reject);
  });
}

function takeWorker(): Promise<Worker> {
  const worker = spare ?? spawnWorker();
  spare = null;
  return worker;
}

function releaseWorker(worker: Worker, reusable: boolean): void {
  if (reusable && !spare) {
    spare = Promise.resolve(worker);
    return;
  }
  worker.terminate().catch(ignore);
  if (!spare) {
    spare = spawnWorker();
    spare.catch(() => (spare = null));
  }
}

async function evaluateInWorker(expression: string): Promise<{ parsed: string; result: string }> {
  const worker = await takeWorker().catch((err) => {
    logger.error(`Unable to start the math worker: ${err?.message}`);
    throw new Error('Mathjs Error');
  });

  return new Promise((resolve, reject) => {
    const finish = (
      reusable: boolean,
      err: Error | null,
      value?: { parsed: string; result: string },
    ) => {
      clearTimeout(timer);
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
      releaseWorker(worker, reusable);
      if (err) reject(err);
      else resolve(value!);
    };

    const onMessage = (msg: WorkerResult) => {
      if (msg.ok) finish(true, null, { parsed: msg.parsed, result: msg.result });
      else finish(true, new Error(msg.error));
    };
    const onError = (err: Error & { code?: string }) => {
      if (err.code === 'ERR_WORKER_OUT_OF_MEMORY') {
        finish(false, new Error('Expression used too much memory.'));
      } else {
        logger.error(err.stack || err.message);
        finish(false, new Error('Mathjs Error'));
      }
    };
    const onExit = () => finish(false, new Error('Mathjs Error'));

    const timer = setTimeout(
      () => finish(false, new Error('Expression took too long to evaluate.')),
      TIMEOUT_MS,
    );

    worker.on('message', onMessage);
    worker.once('error', onError);
    worker.once('exit', onExit);
    worker.postMessage({ expression });
  });
}

// Warm up the first worker on load
spare = spawnWorker();
spare.catch((err) => {
  spare = null;
  logger.error(`Unable to start the math worker: ${err?.message}`);
});

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const expression = interaction.options.getString('expression', true);
  logger.debug(expression);

  if (active >= MAX_ACTIVE) {
    await interaction.reply({
      content: 'Too many calculations running, try again in a moment.',
      ephemeral: true,
    });
    return;
  }

  active++;
  try {
    const { parsed, result } = await evaluateInWorker(expression);
    let reply = `${parsed} = **${result}**`;
    if (reply.length > MAX_REPLY_LENGTH) reply = `${reply.slice(0, MAX_REPLY_LENGTH - 3)}...`;
    await interaction.reply(reply);
  } catch (err) {
    await interaction.reply({
      content: err instanceof Error ? err.message : 'Mathjs Error',
      ephemeral: true,
    });
  } finally {
    active--;
  }
};
