import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qr from './subscriber';

export class Connect<N> extends qs.Source<N> {
  sub?: qr.Subscription;
  _subj?: qt.Subject<N>;
  done = false;
  count = 0;

  constructor(public src: qs.Source<N>, protected fac: () => qt.Subject<N>) {
    super();
  }

  _subscribe(s: qt.Subscriber<N>) {
    return this.subj.subscribe(s);
  }

  get subj() {
    const s = this._subj;
    if (!s || s.stopped) this._subj = this.fac();
    return this._subj!;
  }

  connect(): qr.Subscription {
    let s = this.sub;
    if (!s) {
      this.done = false;
      s = this.sub = new qr.Subscription();
      s.add(this.src.subscribe(new ConnectR(this.subj, this)));
      if (s.closed) {
        this.sub = undefined;
        s = qr.Subscription.fake;
      }
    }
    return s;
  }

  refCount() {
    return higherOrderRefCount()(this) as qs.Source<N>;
  }
}

class ConnectR<N> extends qj.Subscriber<N> {
  constructor(obs: qj.Subject<N>, private con?: Connect<N>) {
    super(obs);
  }

  protected _fail(e: any) {
    this._unsubscribe();
    super._fail(e);
  }

  protected _done() {
    this.con!.done = true;
    this._unsubscribe();
    super._done();
  }

  protected _unsubscribe() {
    const c = this.con;
    if (c) {
      this.con = undefined;
      const s = c.subs;
      c.count = 0;
      c.subs = c.subj = undefined;
      s?.unsubscribe();
    }
  }
}

export const connectableObservableDescriptor: PropertyDescriptorMap = (() => {
  const p = <any>Connect.prototype;
  return {
    operator: {value: null as null},
    _refCount: {value: 0, writable: true},
    _subject: {value: null as null, writable: true},
    _connection: {value: null as null, writable: true},
    _subscribe: {value: p._subscribe},
    _isComplete: {value: p._isComplete, writable: true},
    getSubject: {value: p.getSubject},
    connect: {value: p.connect},
    refCount: {value: p.refCount}
  };
})();

export function refCount<N>(): qt.Shifter<N> {
  return x => x.lift(new RefCountO(x));
}

export class RefCountO<N> implements qt.Operator<N, N> {
  constructor(private con: Connect<N>) {}

  call(r: qr.Subscriber<N>, source: any): qt.Closer {
    const c = this.con;
    c.count++;
    const refCounter = new RefCountR(r, c);
    const s = source.subscribe(refCounter);
    if (!refCounter.closed) (<any>refCounter).connection = c.connect();
    return s;
  }
}

export class RefCountR<N> extends qr.Subscriber<N> {
  private connection?: qr.Subscription;

  constructor(tgt: qr.Subscriber<N>, private connectable?: Connect<N>) {
    super(tgt);
  }

  protected _unsubscribe() {
    const {connectable} = this;
    if (!connectable) {
      this.connection = undefined;
      return;
    }
    this.connectable = undefined;
    const refCount = (connectable as any)._refCount;
    if (refCount <= 0) {
      this.connection = undefined;
      return;
    }
    (connectable as any)._refCount = refCount - 1;
    if (refCount > 1) {
      this.connection = undefined;
      return;
    }
    const {connection} = this;
    const c = (<any>connectable)._connection;
    this.connection = undefined;
    if (c && (!connection || c === connection)) c.unsubscribe();
  }
}
