import { Queue } from 'bullmq';
import { newRedisConnection } from './redis';

export const executionQueue = new Queue('code-execution', {
  connection: newRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 }
  }
});
