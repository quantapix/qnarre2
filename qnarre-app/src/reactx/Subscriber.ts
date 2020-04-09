import {isFunction} from './util';
import {empty as emptyObserver} from './Observer';
import {Observer, PartialObserver} from './types';
import {Subscription} from './Subscription';
import {rxSubscriber as rxSubscriberSymbol} from './symbol';
import {config} from './config';
import {hostReportError} from './util';

export class Subscriber<T> extends Subscription implements Observer<T> {
  [rxSubscriberSymbol]() {
    return this;
  }

  static create<T>(
    next?: (x?: T) => void,
    error?: (e?: any) => void,
    complete?: () => void
  ): Subscriber<T> {
    const subscriber = new Subscriber(next, error, complete);
    subscriber.syncErrorThrowable = false;
    return subscriber;
  }

  /** @internal */ syncErrorValue: any = null;
  /** @internal */ syncErrorThrown: boolean = false;
  /** @internal */ syncErrorThrowable: boolean = false;

  protected isStopped: boolean = false;
  protected destination: Observer<any> | Subscriber<any>; // this `any` is the escape hatch to erase extra type param (e.g. R)

  constructor(
    destinationOrNext?: PartialObserver<any> | ((value: T) => void) | null,
    error?: ((e?: any) => void) | null,
    complete?: (() => void) | null
  ) {
    super();

    switch (arguments.length) {
      case 0:
        this.destination = emptyObserver;
        break;
      case 1:
        if (!destinationOrNext) {
          this.destination = emptyObserver;
          break;
        }
        if (typeof destinationOrNext === 'object') {
          if (destinationOrNext instanceof Subscriber) {
            this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
            this.destination = destinationOrNext;
            destinationOrNext.add(this);
          } else {
            this.syncErrorThrowable = true;
            this.destination = new SafeSubscriber<T>(
              this,
              <PartialObserver<any>>destinationOrNext
            );
          }
          break;
        }
      default:
        this.syncErrorThrowable = true;
        this.destination = new SafeSubscriber<T>(
          this,
          <(value: T) => void>destinationOrNext,
          error,
          complete
        );
        break;
    }
  }

  next(value?: T): void {
    if (!this.isStopped) {
      this._next(value!);
    }
  }

  error(err?: any): void {
    if (!this.isStopped) {
      this.isStopped = true;
      this._error(err);
    }
  }

  complete(): void {
    if (!this.isStopped) {
      this.isStopped = true;
      this._complete();
    }
  }

  unsubscribe(): void {
    if (this.closed) {
      return;
    }
    this.isStopped = true;
    super.unsubscribe();
  }

  protected _next(value: T): void {
    this.destination.next(value);
  }

  protected _error(err: any): void {
    this.destination.error(err);
    this.unsubscribe();
  }

  protected _complete(): void {
    this.destination.complete();
    this.unsubscribe();
  }

  _unsubscribeAndRecycle(): Subscriber<T> {
    const {_parentOrParents} = this;
    this._parentOrParents = null!;
    this.unsubscribe();
    this.closed = false;
    this.isStopped = false;
    this._parentOrParents = _parentOrParents;
    return this;
  }
}

export class SafeSubscriber<T> extends Subscriber<T> {
  private _context: any;

  constructor(
    private _parentSubscriber: Subscriber<T>,
    observerOrNext?: PartialObserver<T> | ((value: T) => void) | null,
    error?: ((e?: any) => void) | null,
    complete?: (() => void) | null
  ) {
    super();

    let next: ((value: T) => void) | undefined;
    let context: any = this;

    if (isFunction(observerOrNext)) {
      next = <(value: T) => void>observerOrNext;
    } else if (observerOrNext) {
      next = (<PartialObserver<T>>observerOrNext).next;
      error = (<PartialObserver<T>>observerOrNext).error;
      complete = (<PartialObserver<T>>observerOrNext).complete;
      if (observerOrNext !== emptyObserver) {
        context = Object.create(observerOrNext);
        if (isFunction(context.unsubscribe)) {
          this.add(<() => void>context.unsubscribe.bind(context));
        }
        context.unsubscribe = this.unsubscribe.bind(this);
      }
    }

    this._context = context;
    this._next = next!;
    this._error = error!;
    this._complete = complete!;
  }

  next(value?: T): void {
    if (!this.isStopped && this._next) {
      const {_parentSubscriber} = this;
      if (
        !config.useDeprecatedSynchronousErrorHandling ||
        !_parentSubscriber.syncErrorThrowable
      ) {
        this.__tryOrUnsub(this._next, value);
      } else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
        this.unsubscribe();
      }
    }
  }

  error(err?: any): void {
    if (!this.isStopped) {
      const {_parentSubscriber} = this;
      const {useDeprecatedSynchronousErrorHandling} = config;
      if (this._error) {
        if (
          !useDeprecatedSynchronousErrorHandling ||
          !_parentSubscriber.syncErrorThrowable
        ) {
          this.__tryOrUnsub(this._error, err);
          this.unsubscribe();
        } else {
          this.__tryOrSetError(_parentSubscriber, this._error, err);
          this.unsubscribe();
        }
      } else if (!_parentSubscriber.syncErrorThrowable) {
        this.unsubscribe();
        if (useDeprecatedSynchronousErrorHandling) {
          throw err;
        }
        hostReportError(err);
      } else {
        if (useDeprecatedSynchronousErrorHandling) {
          _parentSubscriber.syncErrorValue = err;
          _parentSubscriber.syncErrorThrown = true;
        } else {
          hostReportError(err);
        }
        this.unsubscribe();
      }
    }
  }

  complete(): void {
    if (!this.isStopped) {
      const {_parentSubscriber} = this;
      if (this._complete) {
        const wrappedComplete = () => this._complete.call(this._context);

        if (
          !config.useDeprecatedSynchronousErrorHandling ||
          !_parentSubscriber.syncErrorThrowable
        ) {
          this.__tryOrUnsub(wrappedComplete);
          this.unsubscribe();
        } else {
          this.__tryOrSetError(_parentSubscriber, wrappedComplete);
          this.unsubscribe();
        }
      } else {
        this.unsubscribe();
      }
    }
  }

  private __tryOrUnsub(fn: Function, value?: any): void {
    try {
      fn.call(this._context, value);
    } catch (err) {
      this.unsubscribe();
      if (config.useDeprecatedSynchronousErrorHandling) {
        throw err;
      } else {
        hostReportError(err);
      }
    }
  }

  private __tryOrSetError(
    parent: Subscriber<T>,
    fn: Function,
    value?: any
  ): boolean {
    if (!config.useDeprecatedSynchronousErrorHandling) {
      throw new Error('bad call');
    }
    try {
      fn.call(this._context, value);
    } catch (err) {
      if (config.useDeprecatedSynchronousErrorHandling) {
        parent.syncErrorValue = err;
        parent.syncErrorThrown = true;
        return true;
      } else {
        hostReportError(err);
        return true;
      }
    }
    return false;
  }

  _unsubscribe(): void {
    const {_parentSubscriber} = this;
    this._context = null;
    this._parentSubscriber = null!;
    _parentSubscriber.unsubscribe();
  }
}
