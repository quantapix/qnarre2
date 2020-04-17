import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qs from './source';

function createSource<N, F = any, D = any>(
  s?: (_: qt.Subscriber<N, F, D>) => qt.Subscription
): qt.Source<N, F, D> {
  return new Source<N, F, D>(s);
}

function createSubject<N, F = any, D = any>(
  o: qt.Observer<any, F, D>,
  s: qs.Source<any, F, D>
) {
  return new Subject<N>(o, s);
}

export class Source<N, F = any, D = any> extends qs.Source<N, F, D>
  implements qt.Context<N, F, D> {
  createSource = createSource;
  createSubscriber = qj.createSubscriber;
  toSubscriber = qj.toSubscriber;
  createSubject = createSubject;
}

export class Subject<N, F = any, D = any> extends qj.Subject<N, F, D>
  implements qt.Context<N, F, D> {
  createSource = createSource;
  createSubscriber = qj.createSubscriber;
  toSubscriber = qj.toSubscriber;
  createSubject = createSubject;
}
