import {Scheduler} from './Scheduler';
import {Subscription} from './Subscription';
import {SchedulerAction} from './types';
import {Immediate} from './util';

export class Action<T> extends Subscription {
  constructor(
    scheduler: Scheduler,
    work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super();
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    return this;
  }
}

export class AsyncScheduler extends Scheduler {
  public static delegate?: Scheduler;
  public actions: Array<AsyncAction<any>> = [];
  public active: boolean = false;
  public scheduled: any = undefined;

  constructor(
    SchedulerAction: typeof Action,
    now: () => number = Scheduler.now
  ) {
    super(SchedulerAction, () => {
      if (AsyncScheduler.delegate && AsyncScheduler.delegate !== this) {
        return AsyncScheduler.delegate.now();
      } else {
        return now();
      }
    });
  }

  public schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay: number = 0,
    state?: T
  ): Subscription {
    if (AsyncScheduler.delegate && AsyncScheduler.delegate !== this) {
      return AsyncScheduler.delegate.schedule(work, delay, state);
    } else {
      return super.schedule(work, delay, state);
    }
  }

  public flush(action: AsyncAction<any>): void {
    const {actions} = this;

    if (this.active) {
      actions.push(action);
      return;
    }

    let error: any;
    this.active = true;

    do {
      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    } while ((action = actions.shift()!));

    this.active = false;

    if (error) {
      while ((action = actions.shift()!)) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export class AsyncAction<T> extends Action<T> {
  public id: any;
  public state?: T;
  public delay: number;
  protected pending: boolean = false;

  constructor(
    protected scheduler: AsyncScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super(scheduler, work);
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (this.closed) {
      return this;
    }
    this.state = state;

    const id = this.id;
    const scheduler = this.scheduler;
    if (id != null) {
      this.id = this.recycleAsyncId(scheduler, id, delay);
    }
    this.pending = true;

    this.delay = delay;
    this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);

    return this;
  }

  protected requestAsyncId(
    scheduler: AsyncScheduler,
    id?: any,
    delay: number = 0
  ): any {
    return setInterval(scheduler.flush.bind(scheduler, this), delay);
  }

  protected recycleAsyncId(
    scheduler: AsyncScheduler,
    id: any,
    delay: number | null = 0
  ): any {
    if (delay !== null && this.delay === delay && this.pending === false) {
      return id;
    }
    clearInterval(id);
    return undefined;
  }

  public execute(state: T, delay: number): any {
    if (this.closed) {
      return new Error('executing a cancelled action');
    }

    this.pending = false;
    const error = this._execute(state, delay);
    if (error) {
      return error;
    } else if (this.pending === false && this.id != null) {
      this.id = this.recycleAsyncId(this.scheduler, this.id, null);
    }
  }

  protected _execute(state: T, delay: number): any {
    let errored: boolean = false;
    let errorValue: any = undefined;
    try {
      this.work(state);
    } catch (e) {
      errored = true;
      errorValue = (!!e && e) || new Error(e);
    }
    if (errored) {
      this.unsubscribe();
      return errorValue;
    }
  }

  _unsubscribe() {
    const id = this.id;
    const scheduler = this.scheduler;
    const actions = scheduler.actions;
    const index = actions.indexOf(this);

    this.work = null!;
    this.state = null!;
    this.pending = false;
    this.scheduler = null!;

    if (index !== -1) {
      actions.splice(index, 1);
    }

    if (id != null) {
      this.id = this.recycleAsyncId(scheduler, id, null);
    }

    this.delay = null!;
  }
}

export class AnimationFrameAction<T> extends AsyncAction<T> {
  constructor(
    protected scheduler: AnimationFrameScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super(scheduler, work);
  }

  protected requestAsyncId(
    scheduler: AnimationFrameScheduler,
    id?: any,
    delay: number = 0
  ): any {
    if (delay !== null && delay > 0) {
      return super.requestAsyncId(scheduler, id, delay);
    }
    scheduler.actions.push(this);
    return (
      scheduler.scheduled ||
      (scheduler.scheduled = requestAnimationFrame(() =>
        scheduler.flush(undefined)
      ))
    );
  }

  protected recycleAsyncId(
    scheduler: AnimationFrameScheduler,
    id?: any,
    delay: number = 0
  ): any {
    if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
      return super.recycleAsyncId(scheduler, id, delay);
    }
    if (scheduler.actions.length === 0) {
      cancelAnimationFrame(id);
      scheduler.scheduled = undefined;
    }
    return undefined;
  }
}

export class AnimationFrameScheduler extends AsyncScheduler {
  public flush(action?: AsyncAction<any>): void {
    this.active = true;
    this.scheduled = undefined;

    const {actions} = this;
    let error: any;
    let index: number = -1;
    let count: number = actions.length;
    action = action || actions.shift()!;

    do {
      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    } while (++index < count && (action = actions.shift()));

    this.active = false;

    if (error) {
      while (++index < count && (action = actions.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export class AsapAction<T> extends AsyncAction<T> {
  constructor(
    protected scheduler: AsapScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super(scheduler, work);
  }

  protected requestAsyncId(
    scheduler: AsapScheduler,
    id?: any,
    delay: number = 0
  ): any {
    if (delay !== null && delay > 0) {
      return super.requestAsyncId(scheduler, id, delay);
    }
    scheduler.actions.push(this);
    return (
      scheduler.scheduled ||
      (scheduler.scheduled = Immediate.setImmediate(
        scheduler.flush.bind(scheduler, undefined)
      ))
    );
  }
  protected recycleAsyncId(
    scheduler: AsapScheduler,
    id?: any,
    delay: number = 0
  ): any {
    if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
      return super.recycleAsyncId(scheduler, id, delay);
    }
    if (scheduler.actions.length === 0) {
      Immediate.clearImmediate(id);
      scheduler.scheduled = undefined;
    }
    return undefined;
  }
}

export class AsapScheduler extends AsyncScheduler {
  public flush(action?: AsyncAction<any>): void {
    this.active = true;
    this.scheduled = undefined;

    const {actions} = this;
    let error: any;
    let index: number = -1;
    let count: number = actions.length;
    action = action || actions.shift()!;

    do {
      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    } while (++index < count && (action = actions.shift()));

    this.active = false;

    if (error) {
      while (++index < count && (action = actions.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export class QueueAction<T> extends AsyncAction<T> {
  constructor(
    protected scheduler: QueueScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super(scheduler, work);
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (delay > 0) {
      return super.schedule(state, delay);
    }
    this.delay = delay;
    this.state = state;
    this.scheduler.flush(this);
    return this;
  }

  public execute(state: T, delay: number): any {
    return delay > 0 || this.closed
      ? super.execute(state, delay)
      : this._execute(state, delay);
  }

  protected requestAsyncId(
    scheduler: QueueScheduler,
    id?: any,
    delay: number = 0
  ): any {
    if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
      return super.requestAsyncId(scheduler, id, delay);
    }
    return scheduler.flush(this);
  }
}

export class QueueScheduler extends AsyncScheduler {}

export class VirtualTimeScheduler extends AsyncScheduler {
  static frameTimeFactor = 10;
  public frame: number = 0;
  public index: number = -1;
  constructor(
    SchedulerAction: typeof AsyncAction = VirtualAction as any,
    public maxFrames: number = Number.POSITIVE_INFINITY
  ) {
    super(SchedulerAction, () => this.frame);
  }

  public flush(): void {
    const {actions, maxFrames} = this;
    let error: any, action: AsyncAction<any> | undefined;

    while ((action = actions[0]) && action.delay <= maxFrames) {
      actions.shift();
      this.frame = action.delay;

      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    }

    if (error) {
      while ((action = actions.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export class VirtualAction<T> extends AsyncAction<T> {
  protected active: boolean = true;

  constructor(
    protected scheduler: VirtualTimeScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void,
    protected index: number = (scheduler.index += 1)
  ) {
    super(scheduler, work);
    this.index = scheduler.index = index;
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (!this.id) {
      return super.schedule(state, delay);
    }
    this.active = false;
    const action = new VirtualAction(this.scheduler, this.work);
    this.add(action);
    return action.schedule(state, delay);
  }

  protected requestAsyncId(
    scheduler: VirtualTimeScheduler,
    id?: any,
    delay: number = 0
  ): any {
    this.delay = scheduler.frame + delay;
    const {actions} = scheduler;
    actions.push(this);
    (actions as Array<VirtualAction<T>>).sort(VirtualAction.sortActions);
    return true;
  }

  protected recycleAsyncId(
    scheduler: VirtualTimeScheduler,
    id?: any,
    delay: number = 0
  ): any {
    return undefined;
  }

  protected _execute(state: T, delay: number): any {
    if (this.active === true) {
      return super._execute(state, delay);
    }
  }

  public static sortActions<T>(a: VirtualAction<T>, b: VirtualAction<T>) {
    if (a.delay === b.delay) {
      if (a.index === b.index) {
        return 0;
      } else if (a.index > b.index) {
        return 1;
      } else {
        return -1;
      }
    } else if (a.delay > b.delay) {
      return 1;
    } else {
      return -1;
    }
  }
}

export const animationFrame = new AnimationFrameScheduler(AnimationFrameAction);
export const asap = new AsapScheduler(AsapAction);
export const async = new AsyncScheduler(AsyncAction);
export const queue = new QueueScheduler(QueueAction);
