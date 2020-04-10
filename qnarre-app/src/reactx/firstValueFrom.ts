import {Observable} from './Observable';
import {EmptyError} from './util';
import {Subscription} from './sub';

export function firstValueFrom<T>(source$: Observable<T>) {
  return new Promise<T>((resolve, reject) => {
    const subs = new Subscription();
    subs.add(
      source$.subscribe({
        next: value => {
          resolve(value);
          subs.unsubscribe();
        },
        error: reject,
        complete: () => {
          reject(new EmptyError());
        }
      })
    );
  });
}

export function lastValueFrom<T>(source: Observable<T>) {
  return new Promise<T>((resolve, reject) => {
    let _hasValue = false;
    let _value: T;
    source.subscribe({
      next: value => {
        _value = value;
        _hasValue = true;
      },
      error: reject,
      complete: () => {
        if (_hasValue) {
          resolve(_value);
        } else {
          reject(new EmptyError());
        }
      }
    });
  });
}
