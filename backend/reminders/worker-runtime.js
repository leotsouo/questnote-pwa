import { DurableObject } from 'cloudflare:workers';
import { ensureSchedulerAlarm, dispatchSchedulerAlarm } from './scheduler.js';
export { default } from './worker.js';

// A single small dispatch batch is the coordination boundary; App requests remain in the stateless Worker.
export class ReminderScheduler extends DurableObject {
  async ensure() { return ensureSchedulerAlarm(this.ctx.storage); }
  async alarm() { await dispatchSchedulerAlarm(this.ctx.storage, this.env); }
}
