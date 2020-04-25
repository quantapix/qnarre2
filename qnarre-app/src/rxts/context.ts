import * as qt from './types';
import * as qs from './source';

export function xcreateSource<N>(
  s?: (_: qt.Subscriber<N>) => qt.Subscription
): qt.Source<N> {
  return new Source<N>(s);
}

export function xcreateSubject<N>(o?: qt.Observer<any>, s?: qs.Source<any>) {
  return new Subject<N>(o, s);
}

export function xcreateAsync<N>(o?: qt.Observer<any>, s?: qs.Source<any>) {
  return new Subject<N>(o, s);
}
