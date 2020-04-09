import {Observable} from './Observable';
import {EmptyError} from './util';
import {Subscription} from './Subscription';

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
