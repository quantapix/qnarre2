import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qs from './source';

export function createSource<N>(
  s?: (_: qt.Subscriber<N>) => qt.Subscription
): qt.Source<N> {
  return new Source<N>(s);
}

export function createSubject<N>(o?: qt.Observer<any>, s?: qs.Source<any>) {
  return new Subject<N>(o, s);
}

export function createAsync<N>(o?: qt.Observer<any>, s?: qs.Source<any>) {
  return new Subject<N>(o, s);
}

export class Source<N> extends qs.Source<N> {}

export class Subject<N> extends qj.Subject<N> {}
