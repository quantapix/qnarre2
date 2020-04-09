import {PartialObserver} from './types';
import {Observable} from './Observable';
import {EMPTY} from './observables';
import {of} from './observables';
import {throwError} from './observables';

export enum NotificationKind {
  NEXT = 'N',
  ERROR = 'E',
  COMPLETE = 'C'
}

export class Notification<T> {
  hasValue: boolean;

  constructor(kind: 'N', value?: T);
  constructor(kind: 'E', value: undefined, error: any);
  constructor(kind: 'C');
  constructor(
    public kind: 'N' | 'E' | 'C',
    public value?: T,
    public error?: any
  ) {
    this.hasValue = kind === 'N';
  }

  observe(observer: PartialObserver<T>): any {
    switch (this.kind) {
      case 'N':
        return observer.next && observer.next(this.value!);
      case 'E':
        return observer.error && observer.error(this.error);
      case 'C':
        return observer.complete && observer.complete();
    }
  }

  do(
    next: (value: T) => void,
    error?: (err: any) => void,
    complete?: () => void
  ): any {
    const kind = this.kind;
    switch (kind) {
      case 'N':
        return next && next(this.value!);
      case 'E':
        return error && error(this.error);
      case 'C':
        return complete && complete();
    }
  }

  accept(
    nextOrObserver: PartialObserver<T> | ((value: T) => void),
    error?: (err: any) => void,
    complete?: () => void
  ) {
    if (
      nextOrObserver &&
      typeof (<PartialObserver<T>>nextOrObserver).next === 'function'
    ) {
      return this.observe(<PartialObserver<T>>nextOrObserver);
    } else {
      return this.do(<(value: T) => void>nextOrObserver, error, complete);
    }
  }

  toObservable(): Observable<T> {
    const kind = this.kind;
    switch (kind) {
      case 'N':
        return of(this.value!);
      case 'E':
        return throwError(this.error);
      case 'C':
        return EMPTY;
    }
    throw new Error('unexpected notification kind value');
  }

  private static completeNotification: Notification<any> = new Notification(
    'C'
  );
  private static undefinedValueNotification: Notification<
    any
  > = new Notification('N', undefined);

  static createNext<T>(value: T): Notification<T> {
    if (typeof value !== 'undefined') {
      return new Notification('N', value);
    }
    return Notification.undefinedValueNotification;
  }

  static createError<T>(err?: any): Notification<T> {
    return new Notification('E', undefined, err);
  }

  static createComplete(): Notification<any> {
    return Notification.completeNotification;
  }
}
