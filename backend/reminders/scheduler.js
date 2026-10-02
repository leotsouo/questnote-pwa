import { runScheduled } from './worker.js';

export const nextSchedulerTick = (now) => (Math.floor(now / 60000) + 1) * 60000;

export async function ensureSchedulerAlarm(storage, now = Date.now()) {
  let nextAt = await storage.getAlarm();
  if (nextAt === null || nextAt < now - 300000) {
    nextAt = nextSchedulerTick(now);
    await storage.setAlarm(nextAt);
  }
  return { nextAt };
}

export async function dispatchSchedulerAlarm(storage, env, dispatch = runScheduled, clock = Date.now) {
  const now = clock();
  // Persist the next wakeup before external I/O, so an outage cannot exhaust retries and stop the loop.
  await storage.setAlarm(nextSchedulerTick(now));
  await dispatch(env, Math.floor(now / 60000) * 60000);
}
