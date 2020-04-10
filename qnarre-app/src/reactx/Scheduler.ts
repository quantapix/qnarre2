import {Action} from './sched';
import {Subscription} from './Subscription';
import {SchedulerLike, SchedulerAction} from './types';

export class Scheduler implements SchedulerLike {
  public static now: () => number = () => Date.now();

  constructor(
    private SchedulerAction: typeof Action,
    now: () => number = Scheduler.now
  ) {
    this.now = now;
  }

  public now: () => number;

  public schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay: number = 0,
    state?: T
  ): Subscription {
    return new this.SchedulerAction<T>(this, work).schedule(state, delay);
  }
}
