import * as qr from './subscriber';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';
import * as qx from './context';

export class SSubject<N> extends qr.Subscription {
  constructor(public subj: Subject<N> | undefined, public tgt: qt.Observer<N>) {
    super();
  }

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    const s = this.subj;
    this.subj = undefined;
    const ts = s?.tgts;
    if (s?.closed || s?.stopped || !ts?.length) return;
    const i = ts.indexOf(this.tgt);
    if (i !== -1) ts.splice(i, 1);
  }
}

export class RSubject<N> extends qr.Subscriber<N> {
  constructor(tgt: Subject<N>) {
    super(tgt);
  }
}

export class Subject<N> extends qs.Source<N> implements qt.Subject<N> {
  [Symbol.rxSubscriber](): RSubject<N> {
    return new RSubject(this);
  }
  closed = false;
  stopped = false;
  failed = false;
  thrown?: any;
  tgts = [] as qt.Observer<N>[];

  constructor(
    t?: qt.Observer<N>,
    public src?: qs.Source<N>,
    s?: (this: qs.Source<N>, _: qt.Subscriber<N>) => qt.Subscription
  ) {
    super(s);
    if (t) this.tgts.push(t);
  }

  _subscribe(s: qt.Subscriber<N>): qt.Subscription {
    if (this.src) return this.src.subscribe(s);
    if (this.closed) throw new qu.UnsubscribedError();
    if (this.failed) {
      s.fail(this.thrown);
      return qr.Subscription.fake;
    } else if (this.stopped) {
      s.done();
      return qr.Subscription.fake;
    }
    this.tgts.push(s);
    return new SSubject(this, s);
  }

  _trySubscribe(s: qt.Subscriber<N>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  lift<R>(o?: qt.Operator<N, R>) {
    const s = new Subject<R>(this, this);
    s.oper = o;
    return s;
  }

  next(n: N) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.tgts.slice().forEach(s => s.next(n));
  }

  fail(e: any) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = e;
    this.stopped = true;
    this.tgts.slice().forEach(s => s.fail(e));
    this.tgts = [];
  }

  done() {
    if (this.closed) throw new qu.UnsubscribedError();
    this.stopped = true;
    this.tgts.slice().forEach(s => s.done());
    this.tgts = [];
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.tgts = [];
  }

  asSource() {
    const s = qx.createSource<N>();
    s.orig = this;
    return s;
  }
}

export class Async<N> extends Subject<N> {
  private ready = false;
  private ended = false;
  private n?: N;

  _subscribe(s: qt.Subscriber<N>) {
    if (this.failed) {
      s.fail(this.thrown);
      return qr.Subscription.fake;
    } else if (this.ready && this.ended) {
      s.next(this.n!);
      s.done();
      return qr.Subscription.fake;
    }
    return super._subscribe(s);
  }

  next(n: N) {
    if (!this.ended) {
      this.n = n;
      this.ready = true;
    }
  }

  fail(e: any) {
    if (!this.ended) super.fail(e);
  }

  done() {
    this.ended = true;
    if (this.ready) super.next(this.n!);
    super.done();
  }
}

export class Behavior<N> extends Subject<N> {
  constructor(public n: N) {
    super();
  }

  _subscribe(s: qt.Subscriber<N>) {
    const t = super._subscribe(s);
    if (!t.closed) s.next(this.n);
    return t;
  }

  getN() {
    if (this.failed) throw this.thrown;
    if (this.closed) throw new qu.UnsubscribedError();
    return this.n;
  }

  next(n: N) {
    this.n = n;
    super.next(n);
  }
}

interface Event<N> {
  time: number;
  n: N;
}

export abstract class Replay<N> extends Subject<N> {
  private size: number;
  private time: number;
  private events = [] as N[];

  constructor(
    size = Number.POSITIVE_INFINITY,
    time = Number.POSITIVE_INFINITY,
    private stamper: qt.Stamper = Date
  ) {
    super();
    this.size = size < 1 ? 1 : size;
    this.time = time < 1 ? 1 : time;
    if (time !== Number.POSITIVE_INFINITY) this.next = this.nextFiltered;
  }

  _subscribe(s: qt.Subscriber<N>): qr.Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    let t: qr.Subscription;
    if (this.stopped || this.failed) t = qr.Subscription.fake;
    else {
      this.tgts.push(s);
      t = new SSubject(this, s);
    }
    if (this.time === Number.POSITIVE_INFINITY) {
      this.events.forEach(e => {
        if (!s.closed) s.next(e);
      });
    } else {
      this.filterEvents().forEach(e => {
        if (!s.closed) s.next(e.n);
      });
    }
    if (this.failed) s.fail(this.thrown);
    else if (this.stopped) s.done();
    return t;
  }

  next(n: N) {
    const es = this.events;
    es.push(n);
    if (es.length > this.size) es.shift();
    super.next(n);
  }

  private nextFiltered(n: N) {
    this.filterEvents({time: this.stamper.now(), n});
    super.next(n);
  }

  private filterEvents(e?: Event<N>) {
    const now = this.stamper.now();
    const s = this.size;
    const t = this.time;
    const es = (this.events as unknown) as Event<N>[];
    if (e) es.push(e);
    let i = 0;
    const c = es.length;
    const inf = this.time === Number.POSITIVE_INFINITY;
    while (i < c) {
      if (now - (inf ? 0 : es[i].time) < t) break;
      i++;
    }
    if (c > s) i = Math.max(i, c - s);
    if (i > 0) es.splice(0, i);
    return es;
  }
}
