import * as qr from './subscriber';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

class Subscription<N> extends qr.Subscription {
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

export class Subscriber<N> extends qr.Subscriber<N> {
  constructor(t: Subject<N>) {
    super(t);
  }
}

export class Subject<N> extends qs.Source<N> implements qt.Subject<N> {
  [Symbol.rxSubscriber](): Subscriber<N> {
    return new Subscriber(this);
  }
  closed?: boolean;
  stopped?: boolean;
  failed?: boolean;
  thrown?: any;
  tgts = [] as qt.Observer<N>[];

  constructor(
    t?: qt.Observer<N>,
    public root?: qs.Source<N>,
    s?: (this: qs.Source<N>, _: qt.Subscriber<N>) => qt.Closer
  ) {
    super(s);
    if (t) this.tgts.push(t);
  }

  _subscribe(r: qt.Subscriber<N>): qt.Closer {
    if (this.root) return this.root.subscribe(r);
    if (this.closed) throw new qu.UnsubscribedError();
    if (this.failed) {
      r.fail(this.thrown);
      return qr.Subscription.fake;
    } else if (this.stopped) {
      r.done();
      return qr.Subscription.fake;
    }
    this.tgts.push(r);
    return new Subscription(this, r);
  }

  _trySubscribe(r: qt.Subscriber<N>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(r);
  }

  lift<R>(o?: qt.Operator<N, R>) {
    const s = new Lifted<R>(this, this);
    s.oper = o;
    return s;
  }

  next(n: N) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.tgts.slice().forEach(t => t.next(n));
  }

  fail(e: any) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = e;
    this.stopped = true;
    this.tgts.slice().forEach(t => t.fail(e));
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
    const s = new qs.Source<N>();
    s.base = this;
    return s;
  }
}

class Lifted<N> extends Subject<N> {
  constructor(private tgt?: qt.Observer<N>, s?: qs.Source<N>) {
    super();
    this.root = s;
  }

  next(n: N) {
    this.tgt?.next?.(n);
  }

  fail(f: any) {
    this.tgt?.fail?.(f);
  }

  done() {
    this.tgt?.done?.();
  }

  _subscribe(r: qr.Subscriber<N>): qt.Closer {
    if (this.root) return this.root.subscribe(r);
    return qr.Subscription.fake;
  }
}

export class Async<N> extends Subject<N> {
  private ready?: boolean;
  private ended?: boolean;
  private n?: N;

  _subscribe(r: qt.Subscriber<N>) {
    if (this.failed) {
      r.fail(this.thrown);
      return qr.Subscription.fake;
    }
    if (this.ready && this.ended) {
      r.next(this.n!);
      r.done();
      return qr.Subscription.fake;
    }
    return super._subscribe(r);
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

  _subscribe(r: qt.Subscriber<N>): qt.Closer {
    const t = super._subscribe(r) as qt.Unsubscriber;
    if (!t.closed) r.next(this.n);
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

  _subscribe(r: qt.Subscriber<N>): qt.Closer {
    if (this.closed) throw new qu.UnsubscribedError();
    let t: qr.Subscription;
    if (this.stopped || this.failed) t = qr.Subscription.fake;
    else {
      this.tgts.push(r);
      t = new Subscription(this, r);
    }
    if (this.time === Number.POSITIVE_INFINITY) {
      this.events.forEach(e => {
        if (!r.closed) r.next(e);
      });
    } else {
      this.filterEvents().forEach(e => {
        if (!r.closed) r.next(e.n);
      });
    }
    if (this.failed) r.fail(this.thrown);
    else if (this.stopped) r.done();
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
