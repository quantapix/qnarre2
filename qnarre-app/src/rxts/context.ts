import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qs from './source';

function createSource<N>(s?: (_: qt.Subscriber<N>) => qt.Subscription): qt.Source<N> {
  return new Source<N>(s);
}

function createSubject<N>(o: qt.Observer<any>, s: qs.Source<any>) {
  return new Subject<N>(o, s);
}

function createAsync<N>(o: qt.Observer<any>, s: qt.Source<any>) {
  return new Subject<N>(o, s);
}

export class Source<N> extends qs.Source<N> implements qt.Context {
  createSource = createSource;
  createSubscriber = qj.createSubscriber;
  toSubscriber = qj.toSubscriber;
  createSubject = createSubject;
  createAsync = createAsync;
}

export class Subject<N> extends qj.Subject<N> implements qt.Context {
  createSource = createSource;
  createSubscriber = qj.createSubscriber;
  toSubscriber = qj.toSubscriber;
  createSubject = createSubject;
  createAsync = createAsync;
}
