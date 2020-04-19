import {fromIterable} from 'rxjs/internal/observable/fromIterable';
import {iterator as symbolIterator} from 'rxjs/internal/symbol/iterator';
import {TestScheduler} from 'rxjs/testing';
import {Notification, queueScheduler, Subscriber} from 'rxjs';
import {observeOn, materialize, take, toArray} from 'rxjs/operators';

declare const expectSource: any;
declare const rxTestScheduler: TestScheduler;

describe('fromIterable', () => {
  it('should not accept null (or truthy-equivalent to null) iterator', () => {
    expect(() => {
      fromIterable(null as any, undefined);
    }).to.throw(Error, 'Iterable cannot be null');
    expect(() => {
      fromIterable(void 0 as any, undefined);
    }).to.throw(Error, 'Iterable cannot be null');
  });

  it('should emit members of an array iterator', done => {
    const expected = [10, 20, 30, 40];
    fromIterable([10, 20, 30, 40], undefined).subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.equal(0);
        done();
      }
    );
  });

  it('should get new iterator for each subscription', () => {
    const expected = [
      Notification.createNext(10),
      Notification.createNext(20),
      Notification.createDone()
    ];

    const e1 = fromIterable<number>(new Int32Array([10, 20]), undefined).pipe(
      observeOn(rxTestScheduler)
    );

    let v1, v2: Array<Notification<any>>;
    e1.pipe(materialize(), toArray()).subscribe(x => (v1 = x));
    e1.pipe(materialize(), toArray()).subscribe(x => (v2 = x));

    rxTestScheduler.flush();
    expect(v1).to.deep.equal(expected);
    expect(v2!).to.deep.equal(expected);
  });

  it('should finalize generators if the subscription ends', () => {
    const iterator = {
      finalized: false,
      next() {
        return {value: 'duck', done: false};
      },
      return() {
        this.finalized = true;
      }
    };

    const iterable = {
      [symbolIterator]() {
        return iterator;
      }
    };

    const results: any[] = [];

    fromIterable(iterable as any, undefined)
      .pipe(take(3))
      .subscribe(
        x => results.push(x),
        null,
        () => results.push('GOOSE!')
      );

    expect(results).to.deep.equal(['duck', 'duck', 'duck', 'GOOSE!']);
    expect(iterator.finalized).to.be.true;
  });

  it('should finalize generators if the subscription and it is scheduled', () => {
    const iterator = {
      finalized: false,
      next() {
        return {value: 'duck', done: false};
      },
      return() {
        this.finalized = true;
      }
    };

    const iterable = {
      [symbolIterator]() {
        return iterator;
      }
    };

    const results: any[] = [];

    fromIterable(iterable as any, queueScheduler)
      .pipe(take(3))
      .subscribe(
        x => results.push(x),
        null,
        () => results.push('GOOSE!')
      );

    expect(results).to.deep.equal(['duck', 'duck', 'duck', 'GOOSE!']);
    expect(iterator.finalized).to.be.true;
  });

  it('should emit members of an array iterator on a particular scheduler', () => {
    const source = fromIterable([10, 20, 30, 40], rxTestScheduler);

    const values = {a: 10, b: 20, c: 30, d: 40};

    expectSource(source).toBe('(abcd|)', values);
  });

  it(
    'should emit members of an array iterator on a particular scheduler, ' +
      'but is unsubscribed early',
    done => {
      const expected = [10, 20, 30, 40];

      const source = fromIterable([10, 20, 30, 40], queueScheduler);

      const subscriber = Subscriber.create(
        x => {
          expect(x).to.equal(expected.shift());
          if (x === 30) {
            subscriber.unsubscribe();
            done();
          }
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done(new Error('should not be called'));
        }
      );

      source.subscribe(subscriber);
    }
  );

  it('should emit characters of a string iterator', done => {
    const expected = ['f', 'o', 'o'];
    fromIterable('foo', undefined).subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.equal(0);
        done();
      }
    );
  });

  it('should be possible to unsubscribe in the middle of the iteration', done => {
    const expected = [10, 20, 30];

    const subscriber = Subscriber.create(
      x => {
        expect(x).to.equal(expected.shift());
        if (x === 30) {
          subscriber.unsubscribe();
          done();
        }
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done(new Error('should not be called'));
      }
    );

    fromIterable([10, 20, 30, 40, 50, 60], undefined).subscribe(subscriber);
  });
});

describe('SubscribeOnObservable', () => {
  it('should create Observable to be subscribed on specified scheduler', () => {
    const e1 = hot('--a--b--|');
    const expected = '--a--b--|';
    const sub = '^       !';
    const subscribe = new SubscribeOnObservable(e1, 0, rxTestScheduler);

    expectSource(subscribe).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should specify default scheduler if incorrect scheduler specified', () => {
    const e1 = hot('--a--b--|');
    const obj: any = sinon.spy();

    const scheduler = (<any>new SubscribeOnObservable(e1, 0, obj)).scheduler;

    expect(scheduler).to.deep.equal(asapScheduler);
  });

  it('should create observable via staic create function', () => {
    const s = new SubscribeOnObservable(
      null as any,
      null as any,
      rxTestScheduler
    );
    const r = SubscribeOnObservable.create(
      null as any,
      null as any,
      rxTestScheduler
    );

    expect(s).to.deep.equal(r);
  });

  it('should subscribe after specified delay', () => {
    const e1 = hot('--a--b--|');
    const expected = '-----b--|';
    const sub = '   ^    !';
    const subscribe = new SubscribeOnObservable(e1, 30, rxTestScheduler);

    expectSource(subscribe).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should consider negative delay as zero', () => {
    const e1 = hot('--a--b--|');
    const expected = '--a--b--|';
    const sub = '^       !';
    const subscribe = new SubscribeOnObservable(e1, -10, rxTestScheduler);

    expectSource(subscribe).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });
});

/** @test {bindCallback} */
describe('bindCallback', () => {
  describe('when not scheduled', () => {
    it('should emit undefined from a callback without arguments', () => {
      function callback(cb: Function) {
        cb();
      }
      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback().subscribe(
        (x: any) => {
          results.push(typeof x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      expect(results).to.deep.equal(['undefined', 'done']);
    });

    it('should still support deprecated resultSelector', () => {
      function callback(datum: number, cb: Function) {
        cb(datum);
      }

      const boundCallback = bindCallback(callback, (datum: any) => datum + 1);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next(value) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

      expect(results).to.deep.equal([43, 'done']);
    });

    it('should still support deprecated resultSelector if its void', () => {
      function callback(datum: number, cb: Function) {
        cb(datum);
      }

      const boundCallback = bindCallback(callback, void 0);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next(value: any) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCallback(callback);
      const results: Array<string | number> = [];

      boundCallback(42).subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(this: any, cb: Function) {
        cb(this.datum);
      }

      const boundCallback = bindCallback<number>(callback);
      const results: Array<string | number> = [];

      boundCallback.apply({datum: 5}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      expect(results).to.deep.equal([5, 'done']);
    });

    it('should not emit, throw or complete if immediately unsubscribed', (done: MochaDone) => {
      const nextSpy = sinon.spy();
      const throwSpy = sinon.spy();
      const completeSpy = sinon.spy();
      let timeout: number;
      function callback(datum: number, cb: Function) {
        // Need to cb async in order for the unsub to trigger
        timeout = setTimeout(() => {
          cb(datum);
        });
      }
      const subscription = bindCallback(callback)(42).subscribe(
        nextSpy,
        throwSpy,
        completeSpy
      );
      subscription.unsubscribe();

      setTimeout(() => {
        expect(nextSpy).not.have.been.called;
        expect(throwSpy).not.have.been.called;
        expect(completeSpy).not.have.been.called;

        clearTimeout(timeout);
        done();
      });
    });
  });

  describe('when scheduled', () => {
    it('should emit undefined from a callback without arguments', () => {
      function callback(cb: Function) {
        cb();
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback().subscribe(
        x => {
          results.push(typeof x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal(['undefined', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback(42).subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(this: {datum: number}, cb: Function) {
        cb(this.datum);
      }

      const boundCallback = bindCallback<number>(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback.apply({datum: 5}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([5, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: Function): never {
        throw expected;
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);

      boundCallback(42).subscribe(
        x => {
          throw new Error('should not next');
        },
        (err: any) => {
          expect(err).to.equal(expected);
        },
        () => {
          throw new Error('should not complete');
        }
      );

      rxTestScheduler.flush();
    });

    it('should pass multiple inner arguments as an array', () => {
      function callback(
        datum: number,
        cb: (a: number, b: number, c: number, d: number) => void
      ) {
        cb(datum, 1, 2, 3);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results: Array<string | number[]> = [];

      boundCallback(42).subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([[42, 1, 2, 3], 'done']);
    });

    it('should cache value for next subscription and not call callbackFunc again', () => {
      let calls = 0;
      function callback(datum: number, cb: (x: number) => void) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results1: Array<number | string> = [];
      const results2: Array<number | string> = [];

      const source = boundCallback(42);

      source.subscribe(
        x => {
          results1.push(x);
        },
        null,
        () => {
          results1.push('done');
        }
      );

      source.subscribe(
        x => {
          results2.push(x);
        },
        null,
        () => {
          results2.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(calls).to.equal(1);
      expect(results1).to.deep.equal([42, 'done']);
      expect(results2).to.deep.equal([42, 'done']);
    });

    it('should not even call the callbackFn if immediately unsubscribed', () => {
      let calls = 0;
      function callback(datum: number, cb: Function) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCallback(callback, rxTestScheduler);
      const results1: Array<number | string> = [];

      const source = boundCallback(42);

      const subscription = source.subscribe(
        (x: any) => {
          results1.push(x);
        },
        null,
        () => {
          results1.push('done');
        }
      );

      subscription.unsubscribe();

      rxTestScheduler.flush();

      expect(calls).to.equal(0);
    });
  });

  it('should not swallow post-callback errors', () => {
    function badFunction(callback: (answer: number) => void): void {
      callback(42);
      throw new Error('kaboom');
    }
    const consoleStub = sinon.stub(console, 'warn');
    try {
      bindCallback(badFunction)().subscribe();
      expect(consoleStub).to.have.property('called', true);
    } finally {
      consoleStub.restore();
    }
  });
});

/** @test {bindNodeCallback} */
describe('bindNodeCallback', () => {
  describe('when not scheduled', () => {
    it('should emit undefined when callback is called without success arguments', () => {
      function callback(cb: Function) {
        cb(null);
      }

      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback().subscribe(
        (x: any) => {
          results.push(typeof x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      expect(results).to.deep.equal(['undefined', 'done']);
    });

    it('should support the deprecated resultSelector', () => {
      function callback(cb: (err: any, n: number) => any) {
        cb(null, 42);
      }

      const boundCallback = bindNodeCallback(callback, (x: number) => x + 1);
      const results: Array<number | string> = [];

      boundCallback().subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      expect(results).to.deep.equal([43, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(null, datum);
      }
      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback(42).subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should set context of callback to context of boundCallback', () => {
      function callback(
        this: {datum: number},
        cb: (err: any, n: number) => void
      ) {
        cb(null, this.datum);
      }
      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback.call({datum: 42}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should raise error from callback', () => {
      const error = new Error();

      function callback(cb: Function) {
        cb(error);
      }

      const boundCallback = bindNodeCallback(callback);
      const results: Array<number | string> = [];

      boundCallback().subscribe(
        () => {
          throw new Error('should not next');
        },
        (err: any) => {
          results.push(err);
        },
        () => {
          throw new Error('should not complete');
        }
      );

      expect(results).to.deep.equal([error]);
    });

    it('should not emit, throw or complete if immediately unsubscribed', (done: MochaDone) => {
      const nextSpy = sinon.spy();
      const throwSpy = sinon.spy();
      const completeSpy = sinon.spy();
      let timeout: number;
      function callback(datum: number, cb: (err: any, n: number) => void) {
        // Need to cb async in order for the unsub to trigger
        timeout = setTimeout(() => {
          cb(null, datum);
        });
      }
      const subscription = bindNodeCallback(callback)(42).subscribe(
        nextSpy,
        throwSpy,
        completeSpy
      );
      subscription.unsubscribe();

      setTimeout(() => {
        expect(nextSpy).not.have.been.called;
        expect(throwSpy).not.have.been.called;
        expect(completeSpy).not.have.been.called;

        clearTimeout(timeout);
        done();
      });
    });
  });

  describe('when scheduled', () => {
    it('should emit undefined when callback is called without success arguments', () => {
      function callback(cb: Function) {
        cb(null);
      }

      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback().subscribe(
        (x: any) => {
          results.push(typeof x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal(['undefined', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(null, datum);
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback(42).subscribe(
        x => {
          results.push(x);
        },
        null,
        () => {
          results.push('done');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should set context of callback to context of boundCallback', () => {
      function callback(
        this: {datum: number},
        cb: (err: any, n: number) => void
      ) {
        cb(null, this.datum);
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback.call({datum: 42}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([42, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: (err: any, n: number) => void) {
        throw expected;
      }
      const boundCallback = bindNodeCallback(callback, rxTestScheduler);

      boundCallback(42).subscribe(
        x => {
          throw new Error('should not next');
        },
        (err: any) => {
          expect(err).to.equal(expected);
        },
        () => {
          throw new Error('should not complete');
        }
      );

      rxTestScheduler.flush();
    });

    it('should raise error from callback', () => {
      const error = new Error();

      function callback(cb: Function) {
        cb(error);
      }

      const boundCallback = bindNodeCallback(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback().subscribe(
        () => {
          throw new Error('should not next');
        },
        (err: any) => {
          results.push(err);
        },
        () => {
          throw new Error('should not complete');
        }
      );

      rxTestScheduler.flush();

      expect(results).to.deep.equal([error]);
    });
  });

  it('should pass multiple inner arguments as an array', () => {
    function callback(
      datum: number,
      cb: (err: any, a: number, b: number, c: number, d: number) => void
    ) {
      cb(null, datum, 1, 2, 3);
    }
    const boundCallback = bindNodeCallback(callback, rxTestScheduler);
    const results: Array<number[] | string> = [];

    boundCallback(42).subscribe(
      x => {
        results.push(x);
      },
      null,
      () => {
        results.push('done');
      }
    );

    rxTestScheduler.flush();

    expect(results).to.deep.equal([[42, 1, 2, 3], 'done']);
  });

  it('should cache value for next subscription and not call callbackFunc again', () => {
    let calls = 0;
    function callback(datum: number, cb: (err: any, n: number) => void) {
      calls++;
      cb(null, datum);
    }
    const boundCallback = bindNodeCallback(callback, rxTestScheduler);
    const results1: Array<number | string> = [];
    const results2: Array<number | string> = [];

    const source = boundCallback(42);

    source.subscribe(
      x => {
        results1.push(x);
      },
      null,
      () => {
        results1.push('done');
      }
    );

    source.subscribe(
      x => {
        results2.push(x);
      },
      null,
      () => {
        results2.push('done');
      }
    );

    rxTestScheduler.flush();

    expect(calls).to.equal(1);
    expect(results1).to.deep.equal([42, 'done']);
    expect(results2).to.deep.equal([42, 'done']);
  });

  it('should not swallow post-callback errors', () => {
    function badFunction(
      callback: (error: Error, answer: number) => void
    ): void {
      callback(null as any, 42);
      throw new Error('kaboom');
    }
    const consoleStub = sinon.stub(console, 'warn');
    try {
      bindNodeCallback(badFunction)().subscribe();
      expect(consoleStub).to.have.property('called', true);
    } finally {
      consoleStub.restore();
    }
  });
});

/** @test {defer} */
describe('defer', () => {
  asDiagram('defer(() => Observable.of(a, b, c))')(
    'should defer the creation of a simple Observable',
    () => {
      const expected = '-a--b--c--|';
      const e1 = defer(() => cold('-a--b--c--|'));
      expectSource(e1).toBe(expected);
    }
  );

  it('should create an observable from the provided observable factory', () => {
    const source = hot('--a--b--c--|');
    const sourceSubs = '^          !';
    const expected = '--a--b--c--|';

    const e1 = defer(() => source);

    expectSource(e1).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should create an observable from completed', () => {
    const source = hot('|');
    const sourceSubs = '(^!)';
    const expected = '|';

    const e1 = defer(() => source);

    expectSource(e1).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should accept factory returns promise resolves', (done: MochaDone) => {
    const expected = 42;
    const e1 = defer(() => {
      return new Promise<number>((resolve: any) => {
        resolve(expected);
      });
    });

    e1.subscribe(
      (x: number) => {
        expect(x).to.equal(expected);
        done();
      },
      (x: any) => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should accept factory returns promise rejects', (done: MochaDone) => {
    const expected = 42;
    const e1 = defer(() => {
      return new Promise<number>((resolve: any, reject: any) => {
        reject(expected);
      });
    });

    e1.subscribe(
      (x: number) => {
        done(new Error('should not be called'));
      },
      (x: any) => {
        expect(x).to.equal(expected);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should create an observable from error', () => {
    const source = hot('#');
    const sourceSubs = '(^!)';
    const expected = '#';

    const e1 = defer(() => source);

    expectSource(e1).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should create an observable when factory throws', () => {
    const e1 = defer(() => {
      throw 'error';
    });
    const expected = '#';

    expectSource(e1).toBe(expected);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--|');
    const sourceSubs = '^     !     ';
    const expected = '--a--b-     ';
    const unsub = '      !     ';

    const e1 = defer(() => source);

    expectSource(e1, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b--c--|');
    const sourceSubs = '^     !     ';
    const expected = '--a--b-     ';
    const unsub = '      !     ';

    const e1 = defer(() =>
      source.pipe(
        mergeMap((x: string) => of(x)),
        mergeMap((x: string) => of(x))
      )
    );

    expectSource(e1, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });
});

/** @test {empty} */
describe('empty', () => {
  asDiagram('empty')(
    'should create a cold observable with only complete',
    () => {
      const expected = '|';
      const e1 = empty();
      expectSource(e1).toBe(expected);
    }
  );

  it('should return the same instance EMPTY', () => {
    const s1 = empty();
    const s2 = empty();
    expect(s1).to.equal(s2);
  });

  it('should be synchronous by default', () => {
    const source = empty();
    let hit = false;
    source.subscribe({
      complete() {
        hit = true;
      }
    });
    expect(hit).to.be.true;
  });

  it('should equal EMPTY', () => {
    expect(empty()).to.equal(EMPTY);
  });

  it('should take a scheduler', () => {
    const source = empty(rxTestScheduler);
    let hit = false;
    source.subscribe({
      complete() {
        hit = true;
      }
    });
    expect(hit).to.be.false;
    rxTestScheduler.flush();
    expect(hit).to.be.true;
  });
});

/** @test {forkJoin} */
describe('forkJoin', () => {
  asDiagram('forkJoin')(
    'should join the last values of the provided observables into an array',
    () => {
      const e1 = forkJoin([
        hot('-a--b-----c-d-e-|'),
        hot('--------f--g-h-i--j-|'),
        cold('--1--2-3-4---|')
      ]);
      const expected = '--------------------(x|)';

      expectSource(e1).toBe(expected, {x: ['e', 'j', '4']});
    }
  );

  it('should support the deprecated resultSelector with an Array of SourceInputs', () => {
    const results: Array<number | string> = [];
    forkJoin(
      [of(1, 2, 3), of(4, 5, 6), of(7, 8, 9)],
      (a: number, b: number, c: number) => a + b + c
    ).subscribe({
      next(value) {
        results.push(value);
      },
      error(err) {
        throw err;
      },
      complete() {
        results.push('done');
      }
    });

    expect(results).to.deep.equal([18, 'done']);
  });

  it('should support the deprecated resultSelector with a spread of SourceInputs', () => {
    const results: Array<number | string> = [];
    forkJoin(
      of(1, 2, 3),
      of(4, 5, 6),
      of(7, 8, 9),
      (a: number, b: number, c: number) => a + b + c
    ).subscribe({
      next(value) {
        results.push(value);
      },
      error(err) {
        throw err;
      },
      complete() {
        results.push('done');
      }
    });

    expect(results).to.deep.equal([18, 'done']);
  });

  it('should accept single observable', () => {
    const e1 = forkJoin(hot('--a--b--c--d--|'));
    const expected = '--------------(x|)';

    expectSource(e1).toBe(expected, {x: ['d']});
  });

  describe('forkJoin([input1, input2, input3])', () => {
    it('should join the last values of the provided observables into an array', () => {
      const e1 = forkJoin([
        hot('--a--b--c--d--|'),
        hot('(b|)'),
        hot('--1--2--3--|')
      ]);
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: ['d', 'b', '3']});
    });

    it('should allow emit null or undefined', () => {
      const e2 = forkJoin([
        hot('--a--b--c--d--|', {d: null}),
        hot('(b|)'),
        hot('--1--2--3--|'),
        hot('-----r--t--u--|', {u: undefined})
      ]);
      const expected2 = '--------------(x|)';

      expectSource(e2).toBe(expected2, {x: [null, 'b', '3', undefined]});
    });

    it('should accept array of observable contains single', () => {
      const e1 = forkJoin([hot('--a--b--c--d--|')]);
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: ['d']});
    });

    it('should accept lowercase-o observables', () => {
      const e1 = forkJoin([
        hot('--a--b--c--d--|'),
        hot('(b|)'),
        lowerCaseO('1', '2', '3')
      ]);
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: ['d', 'b', '3']});
    });

    it('should accept empty lowercase-o observables', () => {
      const e1 = forkJoin([hot('--a--b--c--d--|'), hot('(b|)'), lowerCaseO()]);
      const expected = '|';

      expectSource(e1).toBe(expected);
    });

    it('should accept promise', done => {
      const e1 = forkJoin([of(1), Promise.resolve(2)]);

      e1.subscribe({
        next: x => expect(x).to.deep.equal([1, 2]),
        complete: done
      });
    });

    it('should accept array of observables', () => {
      const e1 = forkJoin([
        hot('--a--b--c--d--|'),
        hot('(b|)'),
        hot('--1--2--3--|')
      ]);
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: ['d', 'b', '3']});
    });

    it('should not emit if any of source observable is empty', () => {
      const e1 = forkJoin([
        hot('--a--b--c--d--|'),
        hot('(b|)'),
        hot('------------------|')
      ]);
      const expected = '------------------|';

      expectSource(e1).toBe(expected);
    });

    it('should complete early if any of source is empty and completes before than others', () => {
      const e1 = forkJoin([
        hot('--a--b--c--d--|'),
        hot('(b|)'),
        hot('---------|')
      ]);
      const expected = '---------|';

      expectSource(e1).toBe(expected);
    });

    it('should complete when all sources are empty', () => {
      const e1 = forkJoin([hot('--------------|'), hot('---------|')]);
      const expected = '---------|';

      expectSource(e1).toBe(expected);
    });

    it('should not complete when only source never completes', () => {
      const e1 = forkJoin([hot('--------------')]);
      const expected = '-';

      expectSource(e1).toBe(expected);
    });

    it('should not complete when one of the sources never completes', () => {
      const e1 = forkJoin([hot('--------------'), hot('-a---b--c--|')]);
      const expected = '-';

      expectSource(e1).toBe(expected);
    });

    it('should complete when one of the sources never completes but other completes without values', () => {
      const e1 = forkJoin([hot('--------------'), hot('------|')]);
      const expected = '------|';

      expectSource(e1).toBe(expected);
    });

    it('should complete if source is not provided', () => {
      const e1 = forkJoin();
      const expected = '|';

      expectSource(e1).toBe(expected);
    });

    it('should complete if sources list is empty', () => {
      const e1 = forkJoin([]);
      const expected = '|';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when any of source raises error with empty observable', () => {
      const e1 = forkJoin([hot('------#'), hot('---------|')]);
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when any of source raises error with source that never completes', () => {
      const e1 = forkJoin([hot('------#'), hot('----------')]);
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when source raises error', () => {
      const e1 = forkJoin([hot('------#'), hot('---a-----|')]);
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should allow unsubscribing early and explicitly', () => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '^        !    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '^        !    ';
      const expected = '----------    ';
      const unsub = '         !    ';

      const result = forkJoin([e1, e2]);

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });

    it('should unsubscribe other Observables, when one of them errors', () => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '^        !    ';
      const e2 = hot('---e-^---f--g-#');
      const e2subs = '^        !    ';
      const expected = '---------#    ';

      const result = forkJoin([e1, e2]);

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  describe('forkJoin({ foo, bar, baz })', () => {
    it('should join the last values of the provided observables into an array', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: hot('--1--2--3--|')
      });
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: {foo: 'd', bar: 'b', baz: '3'}});
    });

    it('should allow emit null or undefined', () => {
      const e2 = forkJoin({
        foo: hot('--a--b--c--d--|', {d: null}),
        bar: hot('(b|)'),
        baz: hot('--1--2--3--|'),
        qux: hot('-----r--t--u--|', {u: undefined})
      });
      const expected2 = '--------------(x|)';

      expectSource(e2).toBe(expected2, {
        x: {foo: null, bar: 'b', baz: '3', qux: undefined}
      });
    });

    it('should accept array of observable contains single', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|')
      });
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: {foo: 'd'}});
    });

    it('should accept lowercase-o observables', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: lowerCaseO('1', '2', '3')
      });
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: {foo: 'd', bar: 'b', baz: '3'}});
    });

    it('should accept empty lowercase-o observables', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: lowerCaseO()
      });
      const expected = '|';

      expectSource(e1).toBe(expected);
    });

    it('should accept promise', done => {
      const e1 = forkJoin({
        foo: of(1),
        bar: Promise.resolve(2)
      });

      e1.subscribe({
        next: x => expect(x).to.deep.equal({foo: 1, bar: 2}),
        complete: done
      });
    });

    it('should accept array of observables', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: hot('--1--2--3--|')
      });
      const expected = '--------------(x|)';

      expectSource(e1).toBe(expected, {x: {foo: 'd', bar: 'b', baz: '3'}});
    });

    it('should not emit if any of source observable is empty', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: hot('------------------|')
      });
      const expected = '------------------|';

      expectSource(e1).toBe(expected);
    });

    it('should complete early if any of source is empty and completes before than others', () => {
      const e1 = forkJoin({
        foo: hot('--a--b--c--d--|'),
        bar: hot('(b|)'),
        baz: hot('---------|')
      });
      const expected = '---------|';

      expectSource(e1).toBe(expected);
    });

    it('should complete when all sources are empty', () => {
      const e1 = forkJoin({
        foo: hot('--------------|'),
        bar: hot('---------|')
      });
      const expected = '---------|';

      expectSource(e1).toBe(expected);
    });

    it('should not complete when only source never completes', () => {
      const e1 = forkJoin({
        foo: hot('--------------')
      });
      const expected = '-';

      expectSource(e1).toBe(expected);
    });

    it('should not complete when one of the sources never completes', () => {
      const e1 = forkJoin({
        foo: hot('--------------'),
        bar: hot('-a---b--c--|')
      });
      const expected = '-';

      expectSource(e1).toBe(expected);
    });

    it('should complete when one of the sources never completes but other completes without values', () => {
      const e1 = forkJoin({
        foo: hot('--------------'),
        bar: hot('------|')
      });
      const expected = '------|';

      expectSource(e1).toBe(expected);
    });

    // TODO(benlesh): this is the wrong behavior, it should probably throw right away.
    it('should have same v5/v6 throwing behavior full argument of null', done => {
      // It doesn't throw when you pass null
      expect(() => forkJoin(null)).not.to.throw();

      // It doesn't even throw if you subscribe to forkJoin(null).
      expect(() =>
        forkJoin(null).subscribe({
          // It sends the error to the subscription.
          error: err => done()
        })
      ).not.to.throw();
    });

    it('should complete if sources object is empty', () => {
      const e1 = forkJoin({});
      const expected = '|';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when any of source raises error with empty observable', () => {
      const e1 = forkJoin({
        lol: hot('------#'),
        wut: hot('---------|')
      });
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when any of source raises error with source that never completes', () => {
      const e1 = forkJoin({
        lol: hot('------#'),
        wut: hot('----------')
      });
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should raise error when source raises error', () => {
      const e1 = forkJoin({
        lol: hot('------#'),
        foo: hot('---a-----|')
      });
      const expected = '------#';

      expectSource(e1).toBe(expected);
    });

    it('should allow unsubscribing early and explicitly', () => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '^        !    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '^        !    ';
      const expected = '----------    ';
      const unsub = '         !    ';

      const result = forkJoin({
        e1,
        e2
      });

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });

    it('should unsubscribe other Observables, when one of them errors', () => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '^        !    ';
      const e2 = hot('---e-^---f--g-#');
      const e2subs = '^        !    ';
      const expected = '---------#    ';

      const result = forkJoin({
        e1,
        e2
      });

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });

    it('should accept promise as the first arg', done => {
      const e1 = forkJoin(Promise.resolve(1));
      const values: number[][] = [];

      e1.subscribe({
        next: x => values.push(x),
        complete: () => {
          expect(values).to.deep.equal([[1]]);
          done();
        }
      });
    });
  });
});

/** @test {fromPromise} */
describe('from (fromPromise)', () => {
  it('should emit one value from a resolved promise', done => {
    const promise = Promise.resolve(42);
    from(promise).subscribe(
      x => {
        expect(x).to.equal(42);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should raise error from a rejected promise', done => {
    const promise = Promise.reject('bad');
    from(promise).subscribe(
      x => {
        done(new Error('should not be called'));
      },
      e => {
        expect(e).to.equal('bad');
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should share the underlying promise with multiple subscribers', done => {
    const promise = Promise.resolve(42);
    const observable = from(promise);

    observable.subscribe(
      x => {
        expect(x).to.equal(42);
      },
      x => {
        done(new Error('should not be called'));
      },
      undefined
    );
    setTimeout(() => {
      observable.subscribe(
        x => {
          expect(x).to.equal(42);
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
    });
  });

  it('should accept already-resolved Promise', done => {
    const promise = Promise.resolve(42);
    promise.then(
      x => {
        expect(x).to.equal(42);
        from(promise).subscribe(
          y => {
            expect(y).to.equal(42);
          },
          x => {
            done(new Error('should not be called'));
          },
          () => {
            done();
          }
        );
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should accept PromiseLike object for interoperability', done => {
    class CustomPromise<T> implements PromiseLike<T> {
      constructor(private promise: PromiseLike<T>) {}
      then<TResult1 = T, TResult2 = T>(
        onFulfilled?:
          | ((value: T) => TResult1 | PromiseLike<TResult1>)
          | undefined
          | null,
        onRejected?:
          | ((reason: any) => TResult2 | PromiseLike<TResult2>)
          | undefined
          | null
      ): PromiseLike<TResult1 | TResult2> {
        return new CustomPromise(this.promise.then(onFulfilled, onRejected));
      }
    }
    const promise = new CustomPromise(Promise.resolve(42));
    from(promise).subscribe(
      x => {
        expect(x).to.equal(42);
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should emit a value from a resolved promise on a separate scheduler', done => {
    const promise = Promise.resolve(42);
    from(promise, asapScheduler).subscribe(
      x => {
        expect(x).to.equal(42);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should raise error from a rejected promise on a separate scheduler', done => {
    const promise = Promise.reject('bad');
    from(promise, asapScheduler).subscribe(
      x => {
        done(new Error('should not be called'));
      },
      e => {
        expect(e).to.equal('bad');
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should share the underlying promise with multiple subscribers on a separate scheduler', done => {
    const promise = Promise.resolve(42);
    const observable = from(promise, asapScheduler);

    observable.subscribe(
      x => {
        expect(x).to.equal(42);
      },
      x => {
        done(new Error('should not be called'));
      },
      undefined
    );
    setTimeout(() => {
      observable.subscribe(
        x => {
          expect(x).to.equal(42);
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
    });
  });

  it('should not emit, throw or complete if immediately unsubscribed', done => {
    const nextSpy = sinon.spy();
    const throwSpy = sinon.spy();
    const completeSpy = sinon.spy();
    const promise = Promise.resolve(42);
    const subscription = from(promise).subscribe(
      nextSpy,
      throwSpy,
      completeSpy
    );
    subscription.unsubscribe();

    setTimeout(() => {
      expect(nextSpy).not.have.been.called;
      expect(throwSpy).not.have.been.called;
      expect(completeSpy).not.have.been.called;
      done();
    });
  });
});

function getArguments<T>(...args: T[]) {
  return arguments;
}

/** @test {from} */
describe('from', () => {
  asDiagram('from([10, 20, 30])')(
    'should create an observable from an array',
    () => {
      const e1 = from([10, 20, 30]).pipe(
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        concatMap((x, i) =>
          of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler))
        )
      );
      const expected = 'x-y-(z|)';
      expectSource(e1).toBe(expected, {x: 10, y: 20, z: 30});
    }
  );

  it('should throw for non observable object', () => {
    const r = () => {
      // tslint:disable-next-line:no-any needed for the test
      from({} as any).subscribe();
    };

    expect(r).to.throw();
  });

  type('should return T for InteropSource objects', () => {
    /* tslint:disable:no-unused-variable */
    const o1: Observable<number> = from([] as number[], asapScheduler);
    const o2: Observable<{a: string}> = from(EMPTY);
    const o3: Observable<{b: number}> = from(
      new Promise<{b: number}>(resolve => resolve())
    );
    /* tslint:enable:no-unused-variable */
  });

  type('should return T for arrays', () => {
    /* tslint:disable:no-unused-variable */
    const o1: Observable<number> = from([] as number[], asapScheduler);
    /* tslint:enable:no-unused-variable */
  });

  const fakervable = <T>(...values: T[]) => ({
    [observable]: () => ({
      subscribe: (observer: Observer<T>) => {
        for (const value of values) {
          observer.next(value);
        }
        observer.complete();
      }
    })
  });

  const fakeArrayObservable = <T>(...values: T[]) => {
    let arr: any = ['bad array!'];
    arr[observable] = () => {
      return {
        subscribe: (observer: Observer<T>) => {
          for (const value of values) {
            observer.next(value);
          }
          observer.complete();
        }
      };
    };
    return arr;
  };

  const fakerator = <T>(...values: T[]) => ({
    [Symbol.iterator as symbol]: () => {
      const clone = [...values];
      return {
        next: () => ({
          done: clone.length <= 0,
          value: clone.shift()
        })
      };
    }
  });

  // tslint:disable-next-line:no-any it's silly to define all of these types.
  const sources: Array<{name: string; value: any}> = [
    {name: 'observable', value: of('x')},
    {name: 'observable-like', value: fakervable('x')},
    {name: 'observable-like-array', value: fakeArrayObservable('x')},
    {name: 'array', value: ['x']},
    {name: 'promise', value: Promise.resolve('x')},
    {name: 'iterator', value: fakerator('x')},
    {name: 'array-like', value: {[0]: 'x', length: 1}},
    {name: 'string', value: 'x'},
    {name: 'arguments', value: getArguments('x')}
  ];

  if (Symbol && Symbol.asyncIterator) {
    const fakeAsyncIterator = (...values: any[]) => {
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            next() {
              const index = i++;
              if (index < values.length) {
                return Promise.resolve({done: false, value: values[index]});
              } else {
                return Promise.resolve({done: true});
              }
            },
            [Symbol.asyncIterator]() {
              return this;
            }
          };
        }
      };
    };

    sources.push({
      name: 'async-iterator',
      value: fakeAsyncIterator('x')
    });
  }

  for (const source of sources) {
    it(`should accept ${source.name}`, done => {
      let nextInvoked = false;
      from(source.value).subscribe(
        x => {
          nextInvoked = true;
          expect(x).to.equal('x');
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          expect(nextInvoked).to.equal(true);
          done();
        }
      );
    });
    it(`should accept ${source.name} and scheduler`, done => {
      let nextInvoked = false;
      from(source.value, asyncScheduler).subscribe(
        x => {
          nextInvoked = true;
          expect(x).to.equal('x');
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          expect(nextInvoked).to.equal(true);
          done();
        }
      );
      expect(nextInvoked).to.equal(false);
    });
    it(`should accept a function`, done => {
      const subject = new Subject<any>();
      const handler: any = (arg: any) => subject.next(arg);
      handler[observable] = () => subject;
      let nextInvoked = false;

      from(handler as any)
        .pipe(first())
        .subscribe(
          x => {
            nextInvoked = true;
            expect(x).to.equal('x');
          },
          x => {
            done(new Error('should not be called'));
          },
          () => {
            expect(nextInvoked).to.equal(true);
            done();
          }
        );
      handler('x');
    });
  }
});

/** @test {fromEvent} */
describe('fromEvent', () => {
  asDiagram("fromEvent(element, 'click')")(
    'should create an observable of click on the element',
    () => {
      const target = {
        addEventListener: (eventType: any, listener: any) => {
          timer(50, 20, rxTestScheduler)
            .pipe(mapTo('ev'), take(2), concat(NEVER))
            .subscribe(listener);
        },
        removeEventListener: (): void => void 0,
        dispatchEvent: (): void => void 0
      };
      const e1 = fromEvent(target as any, 'click');
      const expected = '-----x-x---';
      expectSource(e1).toBe(expected, {x: 'ev'});
    }
  );

  it('should setup an event observable on objects with "on" and "off" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      on: (a: string, b: Function) => {
        onEventName = a;
        onHandler = b;
      },
      off: (a: string, b: Function) => {
        offEventName = a;
        offHandler = b;
      }
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should setup an event observable on objects with "addEventListener" and "removeEventListener" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addEventListener: (
        a: string,
        b: EventListenerOrEventListenerObject,
        useCapture?: boolean
      ) => {
        onEventName = a;
        onHandler = b;
      },
      removeEventListener: (
        a: string,
        b: EventListenerOrEventListenerObject,
        useCapture?: boolean
      ) => {
        offEventName = a;
        offHandler = b;
      }
    };

    const subscription = fromEvent(<any>obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" returning event emitter', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener(a: string | symbol, b: (...args: any[]) => void) {
        onEventName = a;
        onHandler = b;
        return this;
      },
      removeListener(a: string | symbol, b: (...args: any[]) => void) {
        offEventName = a;
        offHandler = b;
        return this;
      }
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" returning nothing', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener(
        a: string,
        b: (...args: any[]) => any,
        context?: any
      ): {context: any} {
        onEventName = a;
        onHandler = b;
        return {context: ''};
      },
      removeListener(a: string, b: (...args: any[]) => void) {
        offEventName = a;
        offHandler = b;
      }
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should setup an event observable on objects with "addListener" and "removeListener" and "length" ', () => {
    let onEventName;
    let onHandler;
    let offEventName;
    let offHandler;

    const obj = {
      addListener: (a: string, b: Function) => {
        onEventName = a;
        onHandler = b;
      },
      removeListener: (a: string, b: Function) => {
        offEventName = a;
        offHandler = b;
      },
      length: 1
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should error on invalid event targets', () => {
    const obj = {
      addListener: () => {
        //noop
      }
    };

    fromEvent(obj as any, 'click').subscribe({
      error(err: any) {
        expect(err)
          .to.exist.and.be.instanceof(Error)
          .and.have.property('message', 'Invalid event target');
      }
    });
  });

  it('should pass through options to addEventListener and removeEventListener', () => {
    let onOptions;
    let offOptions;
    const expectedOptions = {capture: true, passive: true};

    const obj = {
      addEventListener: (
        a: string,
        b: EventListenerOrEventListenerObject,
        c?: any
      ) => {
        onOptions = c;
      },
      removeEventListener: (
        a: string,
        b: EventListenerOrEventListenerObject,
        c?: any
      ) => {
        offOptions = c;
      }
    };

    const subscription = fromEvent(
      <any>obj,
      'click',
      expectedOptions
    ).subscribe(() => {
      //noop
    });

    subscription.unsubscribe();

    expect(onOptions).to.equal(expectedOptions);
    expect(offOptions).to.equal(expectedOptions);
  });

  it('should pass through events that occur', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    fromEvent(obj, 'click')
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).to.equal('test');
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send('test');
  });

  it('should pass through events that occur and use the selector if provided', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    function selector(x: string) {
      return x + '!';
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).to.equal('test!');
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send('test');
  });

  it('should not fail if no event arguments are passed and the selector does not return', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    function selector() {
      //noop
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).not.exist;
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send();
  });

  it('should return a value from the selector if no event arguments are passed', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    function selector() {
      return 'no arguments';
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).to.equal('no arguments');
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send();
  });

  it('should pass multiple arguments to selector from event emitter', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    function selector(x: number, y: number, z: number) {
      return [].slice.call(arguments);
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).to.deep.equal([1, 2, 3]);
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send(1, 2, 3);
  });

  it('should emit multiple arguments from event as an array', (done: MochaDone) => {
    let send: any;
    const obj = {
      on: (name: string, handler: Function) => {
        send = handler;
      },
      off: () => {
        //noop
      }
    };

    fromEvent(obj, 'click')
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).to.deep.equal([1, 2, 3]);
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    send(1, 2, 3);
  });

  it('should not throw an exception calling toString on obj with a null prototype', (done: MochaDone) => {
    // NOTE: Can not test with Object.create(null) or `class Foo extends null`
    // due to TypeScript bug. https://github.com/Microsoft/TypeScript/issues/1108
    class NullProtoEventTarget {
      on() {
        /*noop*/
      }
      off() {
        /*noop*/
      }
    }
    NullProtoEventTarget.prototype.toString = null!;
    const obj: NullProtoEventTarget = new NullProtoEventTarget();

    expect(() => {
      fromEvent(obj, 'foo').subscribe();
      done();
    }).to.not.throw(TypeError);
  });

  type('should support node style event emitters interfaces', () => {
    /* tslint:disable:no-unused-variable */
    let a: NodeStyleEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });

  type('should support node compatible event emitters interfaces', () => {
    /* tslint:disable:no-unused-variable */
    let a: NodeCompatibleEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });

  type('should support node style event emitters objects', () => {
    /* tslint:disable:no-unused-variable */
    interface NodeEventEmitter {
      addListener(eventType: string | symbol, handler: NodeEventHandler): this;
      removeListener(
        eventType: string | symbol,
        handler: NodeEventHandler
      ): this;
    }
    let a: NodeEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });

  type('should support React Native event emitters', () => {
    /* tslint:disable:no-unused-variable */
    interface EmitterSubscription {
      context: any;
    }
    interface ReactNativeEventEmitterListener {
      addListener(
        eventType: string,
        listener: (...args: any[]) => any,
        context?: any
      ): EmitterSubscription;
    }
    interface ReactNativeEventEmitter extends ReactNativeEventEmitterListener {
      removeListener(
        eventType: string,
        listener: (...args: any[]) => any
      ): void;
    }
    let a: ReactNativeEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });
});

/** @test {fromEventPattern} */
describe('fromEventPattern', () => {
  asDiagram('fromEventPattern(addHandler, removeHandler)')(
    'should create an observable from the handler API',
    () => {
      function addHandler(h: any) {
        timer(50, 20, rxTestScheduler)
          .pipe(mapTo('ev'), take(2), concat(NEVER))
          .subscribe(h);
      }
      const e1 = fromEventPattern(addHandler);
      const expected = '-----x-x---';
      expectSource(e1).toBe(expected, {x: 'ev'});
    }
  );

  it('should call addHandler on subscription', () => {
    const addHandler = sinon.spy();
    fromEventPattern(addHandler, noop).subscribe(noop);

    const call = addHandler.getCall(0);
    expect(addHandler).calledOnce;
    expect(call.args[0]).to.be.a('function');
  });

  it('should call removeHandler on unsubscription', () => {
    const removeHandler = sinon.spy();

    fromEventPattern(noop, removeHandler).subscribe(noop).unsubscribe();

    const call = removeHandler.getCall(0);
    expect(removeHandler).calledOnce;
    expect(call.args[0]).to.be.a('function');
  });

  it('should work without optional removeHandler', () => {
    const addHandler: (h: Function) => any = sinon.spy();
    fromEventPattern(addHandler).subscribe(noop);

    expect(addHandler).calledOnce;
  });

  it('should deliver return value of addHandler to removeHandler as signal', () => {
    const expected = {signal: true};
    const addHandler = () => expected;
    const removeHandler = sinon.spy();
    fromEventPattern(addHandler, removeHandler).subscribe(noop).unsubscribe();

    const call = removeHandler.getCall(0);
    expect(call).calledWith(sinon.match.any, expected);
  });

  it('should send errors in addHandler down the error path', (done: MochaDone) => {
    fromEventPattern((h: any) => {
      throw 'bad';
    }, noop).subscribe(
      () => done(new Error('should not be called')),
      (err: any) => {
        expect(err).to.equal('bad');
        done();
      },
      () => done(new Error('should not be called'))
    );
  });

  it('should accept a selector that maps outgoing values', (done: MochaDone) => {
    let target: any;
    const trigger = function (...args: any[]) {
      if (target) {
        target.apply(null, arguments);
      }
    };

    const addHandler = (handler: any) => {
      target = handler;
    };
    const removeHandler = (handler: any) => {
      target = null;
    };
    const selector = (a: any, b: any) => {
      return a + b + '!';
    };

    fromEventPattern(addHandler, removeHandler, selector)
      .pipe(take(1))
      .subscribe(
        (x: any) => {
          expect(x).to.equal('testme!');
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );

    trigger('test', 'me');
  });

  it('should send errors in the selector down the error path', (done: MochaDone) => {
    let target: any;
    const trigger = (value: any) => {
      if (target) {
        target(value);
      }
    };

    const addHandler = (handler: any) => {
      target = handler;
    };
    const removeHandler = (handler: any) => {
      target = null;
    };
    const selector = (x: any) => {
      throw 'bad';
    };

    fromEventPattern(addHandler, removeHandler, selector).subscribe(
      (x: any) => {
        done(new Error('should not be called'));
      },
      (err: any) => {
        expect(err).to.equal('bad');
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );

    trigger('test');
  });
});

function err(): any {
  throw 'error';
}

describe('generate', () => {
  asDiagram('generate(1, x => false, x => x + 1)')(
    'should complete if condition does not meet',
    () => {
      const source = generate(
        1,
        x => false,
        x => x + 1
      );
      const expected = '|';

      expectSource(source).toBe(expected);
    }
  );

  asDiagram('generate(1, x => x == 1, x => x + 1)')(
    'should produce first value immediately',
    () => {
      const source = generate(
        1,
        x => x == 1,
        x => x + 1
      );
      const expected = '(1|)';

      expectSource(source).toBe(expected, {'1': 1});
    }
  );

  asDiagram('generate(1, x => x < 3, x => x + 1)')(
    'should produce all values synchronously',
    () => {
      const source = generate(
        1,
        x => x < 3,
        x => x + 1
      );
      const expected = '(12|)';

      expectSource(source).toBe(expected, {'1': 1, '2': 2});
    }
  );

  it('should use result selector', () => {
    const source = generate(
      1,
      x => x < 3,
      x => x + 1,
      x => (x + 1).toString()
    );
    const expected = '(23|)';

    expectSource(source).toBe(expected);
  });

  it('should allow omit condition', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x + 1,
      resultSelector: (x: number) => x.toString()
    }).pipe(take(5));
    const expected = '(12345|)';

    expectSource(source).toBe(expected);
  });

  it('should stop producing when unsubscribed', () => {
    const source = generate(
      1,
      x => x < 4,
      x => x + 1
    );
    let count = 0;
    const subscriber = new Subscriber<number>(x => {
      count++;
      if (x == 2) {
        subscriber.unsubscribe();
      }
    });
    source.subscribe(subscriber);
    expect(count).to.be.equal(2);
  });

  it('should accept a scheduler', () => {
    const source = generate({
      initialState: 1,
      condition: x => x < 4,
      iterate: x => x + 1,
      resultSelector: (x: number) => x,
      scheduler: rxTestScheduler
    });
    const expected = '(123|)';

    let count = 0;
    source.subscribe(x => count++);

    expect(count).to.be.equal(0);
    rxTestScheduler.flush();
    expect(count).to.be.equal(3);

    expectSource(source).toBe(expected, {'1': 1, '2': 2, '3': 3});
  });

  it('should allow minimal possible options', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x * 2
    }).pipe(take(3));
    const expected = '(124|)';

    expectSource(source).toBe(expected, {'1': 1, '2': 2, '4': 4});
  });

  it('should emit error if result selector throws', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x * 2,
      resultSelector: err
    });
    const expected = '(#)';

    expectSource(source).toBe(expected);
  });

  it('should emit error if result selector throws on scheduler', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x * 2,
      resultSelector: err,
      scheduler: rxTestScheduler
    });
    const expected = '(#)';

    expectSource(source).toBe(expected);
  });

  it('should emit error after first value if iterate function throws', () => {
    const source = generate({
      initialState: 1,
      iterate: err
    });
    const expected = '(1#)';

    expectSource(source).toBe(expected, {'1': 1});
  });

  it('should emit error after first value if iterate function throws on scheduler', () => {
    const source = generate({
      initialState: 1,
      iterate: err,
      scheduler: rxTestScheduler
    });
    const expected = '(1#)';

    expectSource(source).toBe(expected, {'1': 1});
  });

  it('should emit error if condition function throws', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x + 1,
      condition: err
    });
    const expected = '(#)';

    expectSource(source).toBe(expected);
  });

  it('should emit error if condition function throws on scheduler', () => {
    const source = generate({
      initialState: 1,
      iterate: x => x + 1,
      condition: err,
      scheduler: rxTestScheduler
    });
    const expected = '(#)';

    expectSource(source).toBe(expected);
  });
});

describe('iif', () => {
  it('should subscribe to thenSource when the conditional returns true', () => {
    const e1 = iif(() => true, of('a'));
    const expected = '(a|)';

    expectSource(e1).toBe(expected);
  });

  it('should subscribe to elseSource when the conditional returns false', () => {
    const e1 = iif(() => false, of('a'), of('b'));
    const expected = '(b|)';

    expectSource(e1).toBe(expected);
  });

  it('should complete without an elseSource when the conditional returns false', () => {
    const e1 = iif(() => false, of('a'));
    const expected = '|';

    expectSource(e1).toBe(expected);
  });

  it('should raise error when conditional throws', () => {
    const e1 = iif(
      <any>(() => {
        throw 'error';
      }),
      of('a')
    );

    const expected = '#';

    expectSource(e1).toBe(expected);
  });

  it('should accept resolved promise as thenSource', (done: MochaDone) => {
    const expected = 42;
    const e1 = iif(
      () => true,
      new Promise((resolve: any) => {
        resolve(expected);
      })
    );

    e1.subscribe(
      x => {
        expect(x).to.equal(expected);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should accept resolved promise as elseSource', (done: MochaDone) => {
    const expected = 42;
    const e1 = iif(
      () => false,
      of('a'),
      new Promise((resolve: any) => {
        resolve(expected);
      })
    );

    e1.subscribe(
      x => {
        expect(x).to.equal(expected);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should accept rejected promise as elseSource', (done: MochaDone) => {
    const expected = 42;
    const e1 = iif(
      () => false,
      of('a'),
      new Promise((resolve: any, reject: any) => {
        reject(expected);
      })
    );

    e1.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expected);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should accept rejected promise as thenSource', (done: MochaDone) => {
    const expected = 42;
    const e1 = iif(
      () => true,
      new Promise((resolve: any, reject: any) => {
        reject(expected);
      })
    );

    e1.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expected);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });
});

/** @test {interval} */
describe('interval', () => {
  asDiagram('interval(1000)')(
    'should create an observable emitting periodically',
    () => {
      const e1 = interval(20, rxTestScheduler).pipe(
        take(6), // make it actually finite, so it can be rendered
        concat(NEVER) // but pretend it's infinite by not completing
      );
      const expected = '--a-b-c-d-e-f-';
      const values = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
        f: 5
      };
      expectSource(e1).toBe(expected, values);
    }
  );

  it('should set up an interval', () => {
    const expected =
      '----------0---------1---------2---------3---------4---------5---------6-----';
    expectSource(interval(100, rxTestScheduler)).toBe(expected, [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]);
  });

  it('should emit when relative interval set to zero', () => {
    const e1 = interval(0, rxTestScheduler).pipe(take(7));
    const expected = '(0123456|)';
    expectSource(e1).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
  });

  it('should consider negative interval as zero', () => {
    const e1 = interval(-1, rxTestScheduler).pipe(take(7));
    const expected = '(0123456|)';
    expectSource(e1).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
  });

  it('should emit values until unsubscribed', (done: MochaDone) => {
    const values: number[] = [];
    const expected = [0, 1, 2, 3, 4, 5, 6];
    const e1 = interval(5);
    const subscription = e1.subscribe(
      (x: number) => {
        values.push(x);
        if (x === 6) {
          subscription.unsubscribe();
          expect(values).to.deep.equal(expected);
          done();
        }
      },
      (err: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should create an observable emitting periodically with the Asap', (done: MochaDone) => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, asapScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).to.equal(events.shift());
      },
      error(e) {
        sandbox.restore();
        done(e);
      },
      complete() {
        expect(asapScheduler.actions.length).to.equal(0);
        expect(asapScheduler.scheduled).to.equal(undefined);
        sandbox.restore();
        done();
      }
    });
    let i = -1,
      n = events.length;
    while (++i < n) {
      fakeTimer.tick(period);
    }
  });

  it('should create an observable emitting periodically with the Queue', (done: MochaDone) => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, queueScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).to.equal(events.shift());
      },
      error(e) {
        sandbox.restore();
        done(e);
      },
      complete() {
        expect(queueScheduler.actions.length).to.equal(0);
        expect(queueScheduler.scheduled).to.equal(undefined);
        sandbox.restore();
        done();
      }
    });
    let i = -1,
      n = events.length;
    while (++i < n) {
      fakeTimer.tick(period);
    }
  });

  it('should create an observable emitting periodically with the Frame', (done: MochaDone) => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, animationFrame).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).to.equal(events.shift());
      },
      error(e) {
        sandbox.restore();
        done(e);
      },
      complete() {
        expect(animationFrame.actions.length).to.equal(0);
        expect(animationFrame.scheduled).to.equal(undefined);
        sandbox.restore();
        done();
      }
    });
    let i = -1,
      n = events.length;
    while (++i < n) {
      fakeTimer.tick(period);
    }
  });
});

/** @test {NEVER} */
describe('NEVER', () => {
  asDiagram('NEVER')('should create a cold observable that never emits', () => {
    const expected = '-';
    const e1 = NEVER;
    expectSource(e1).toBe(expected);
  });

  it('should return the same instance every time', () => {
    expect(NEVER).to.equal(NEVER);
  });
});

/** @test {of} */
describe('of', () => {
  asDiagram('of(1, 2, 3)')(
    'should create a cold observable that emits 1, 2, 3',
    () => {
      const e1 = of(1, 2, 3).pipe(
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        concatMap((x, i) =>
          of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler))
        )
      );
      const expected = 'x-y-(z|)';
      expectSource(e1).toBe(expected, {x: 1, y: 2, z: 3});
    }
  );

  it('should create an observable from the provided values', (done: MochaDone) => {
    const x = {foo: 'bar'};
    const expected = [1, 'a', x];
    let i = 0;

    of(1, 'a', x).subscribe(
      (y: any) => {
        expect(y).to.equal(expected[i++]);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should emit one value', (done: MochaDone) => {
    let calls = 0;

    of(42).subscribe(
      (x: number) => {
        expect(++calls).to.equal(1);
        expect(x).to.equal(42);
      },
      (err: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should handle an Observable as the only value', () => {
    const source = of(of('a', 'b', 'c', rxTestScheduler), rxTestScheduler);
    const result = source.pipe(concatAll());
    expectSource(result).toBe('(abc|)');
  });

  it('should handle many Observable as the given values', () => {
    const source = of(
      of('a', 'b', 'c', rxTestScheduler),
      of('d', 'e', 'f', rxTestScheduler),
      rxTestScheduler
    );

    const result = source.pipe(concatAll());
    expectSource(result).toBe('(abcdef|)');
  });
});

describe('onErrorResumeNext', () => {
  it('should continue with observables', () => {
    const s1 = hot('--a--b--#');
    const s2 = cold('--c--d--#');
    const s3 = cold('--e--#');
    const s4 = cold('--f--g--|');
    const subs1 = '^       !';
    const subs2 = '        ^       !';
    const subs3 = '                ^    !';
    const subs4 = '                     ^       !';
    const expected = '--a--b----c--d----e----f--g--|';

    expectSource(onErrorResumeNext(s1, s2, s3, s4)).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs1);
    expectSubscriptions(s2.subscriptions).toBe(subs2);
    expectSubscriptions(s3.subscriptions).toBe(subs3);
    expectSubscriptions(s4.subscriptions).toBe(subs4);
  });

  it('should continue array of observables', () => {
    const s1 = hot('--a--b--#');
    const s2 = cold('--c--d--#');
    const s3 = cold('--e--#');
    const s4 = cold('--f--g--|');
    const subs1 = '^       !';
    const subs2 = '        ^       !';
    const subs3 = '                ^    !';
    const subs4 = '                     ^       !';
    const expected = '--a--b----c--d----e----f--g--|';

    expectSource(onErrorResumeNext([s1, s2, s3, s4])).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs1);
    expectSubscriptions(s2.subscriptions).toBe(subs2);
    expectSubscriptions(s3.subscriptions).toBe(subs3);
    expectSubscriptions(s4.subscriptions).toBe(subs4);
  });

  it('should complete single observable throws', () => {
    const source = hot('#');
    const subs = '(^!)';
    const expected = '|';

    expectSource(onErrorResumeNext(source)).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

describe('pairs', () => {
  asDiagram('pairs({a: 1, b:2})')(
    'should create an observable emits key-value pair',
    () => {
      const e1 = pairs({a: 1, b: 2}, rxTestScheduler);
      const expected = '(ab|)';
      const values = {
        a: ['a', 1],
        b: ['b', 2]
      };

      expectSource(e1).toBe(expected, values);
    }
  );

  it('should create an observable without scheduler', (done: MochaDone) => {
    let expected = [
      ['a', 1],
      ['b', 2],
      ['c', 3]
    ];

    pairs({a: 1, b: 2, c: 3}).subscribe(
      x => {
        expect(x).to.deep.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected).to.be.empty;
        done();
      }
    );
  });

  it('should work with empty object', () => {
    const e1 = pairs({}, rxTestScheduler);
    const expected = '|';

    expectSource(e1).toBe(expected);
  });
});

/** @test {partition} */
describe('Observable.prototype.partition', () => {
  function expectSourceArray(result: Observable<string>[], expected: string[]) {
    for (let idx = 0; idx < result.length; idx++) {
      expectSource(result[idx]).toBe(expected[idx]);
    }
  }

  asDiagram('partition(x => x % 2 === 1)')(
    'should partition an observable of ' + 'integers into even and odd',
    () => {
      const e1 = hot('--1-2---3------4--5---6--|');
      const e1subs = '^                        !';
      const expected = [
        '--1-----3---------5------|',
        '----2----------4------6--|'
      ];

      const result = partition(e1, (x: any) => x % 2 === 1);

      expectSourceArray(result, expected);
      expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
    }
  );

  it('should partition an observable into two using a predicate', () => {
    const e1 = hot('--a-b---a------d--a---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------a------|',
      '----b----------d------c--|'
    ];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition an observable into two using a predicate that takes an index', () => {
    const e1 = hot('--a-b---a------d--e---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------e------|',
      '----b----------d------c--|'
    ];

    function predicate(value: string, index: number) {
      return index % 2 === 0;
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition an observable into two using a predicate and thisArg', () => {
    const e1 = hot('--a-b---a------d--a---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------a------|',
      '----b----------d------c--|'
    ];

    function predicate(this: any, x: string) {
      return x === this.value;
    }

    expectSourceArray(partition(e1, predicate, {value: 'a'}), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables', () => {
    const e1 = hot('--a-b---#');
    const e1subs = '^       !';
    const expected = ['--a-----#', '----b---#'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = ['#', '#'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables if predicate throws', () => {
    const e1 = hot('--a-b--a--|');
    const e1subs = '^      !   ';
    const expected = ['--a----#   ', '----b--#   '];

    let index = 0;
    const error = 'error';
    function predicate(x: string) {
      const match = x === 'a';
      if (match && index++ > 1) {
        throw error;
      }
      return match;
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition empty observable if source does not emits', () => {
    const e1 = hot('----|');
    const e1subs = '^   !';
    const expected = ['----|', '----|'];

    function predicate(x: string) {
      return x === 'x';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition empty observable if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = ['|', '|'];

    function predicate(x: string) {
      return x === 'x';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if source emits single elements', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = ['--a--|', '-----|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if predicate matches all of source elements', () => {
    const e1 = hot('--a--a--a--a--a--a--a--|');
    const e1subs = '^                      !';
    const expected = ['--a--a--a--a--a--a--a--|', '-----------------------|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if predicate does not match all of source elements', () => {
    const e1 = hot('--b--b--b--b--b--b--b--|');
    const e1subs = '^                      !';
    const expected = ['-----------------------|', '--b--b--b--b--b--b--b--|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition to infinite observable if source does not completes', () => {
    const e1 = hot('--a-b---a------d----');
    const e1subs = '^                   ';
    const expected = ['--a-----a-----------', '----b----------d----'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition to infinite observable if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = ['-', '-'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition into two observable with early unsubscription', () => {
    const e1 = hot('--a-b---a------d-|');
    const unsub = '       !          ';
    const e1subs = '^      !          ';
    const expected = ['--a-----          ', '----b---          '];

    function predicate(x: string) {
      return x === 'a';
    }
    const result = partition(e1, predicate);

    for (let idx = 0; idx < result.length; idx++) {
      expectSource(result[idx], unsub).toBe(expected[idx]);
    }
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a-b---a------d-|');
    const e1subs = '^      !          ';
    const expected = ['--a-----          ', '----b---          '];
    const unsub = '       !          ';

    const e1Pipe = e1.pipe(mergeMap((x: string) => of(x)));
    const result = partition(e1Pipe, (x: string) => x === 'a');

    expectSource(result[0], unsub).toBe(expected[0]);
    expectSource(result[1], unsub).toBe(expected[1]);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should accept thisArg', () => {
    const thisArg = {};

    partition(
      of(1),
      function (this: any, value: number) {
        expect(this).to.deep.equal(thisArg);
        return true;
      },
      thisArg
    ).forEach((observable: Observable<number>) => observable.subscribe());
  });
});

/** @test {race} */
describe('static race', () => {
  it('should race a single observable', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const expected = '---a-----b-----c----|';

    const result = race(e1);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should race cold and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race with array of observable', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = race([e1, e2]);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race hot and hot', () => {
    const e1 = hot('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race hot and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race 2nd and 1st', () => {
    const e1 = cold('------x-----y-----z----|');
    const e1subs = '^  !';
    const e2 = cold('---a-----b-----c----|');
    const e2subs = '^                   !';
    const expected = '---a-----b-----c----|';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race emit and complete', () => {
    const e1 = cold('-----|');
    const e1subs = '^    !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^    !';
    const expected = '-----|';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^           !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b---';
    const unsub = '            !';

    const result = race(e1, e2);

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c---d-| ');
    const e1subs = '^        !    ';
    const e2 = hot('---e-^---f--g---h-|');
    const e2subs = '^  !    ';
    const expected = '---b--c---    ';
    const unsub = '         !    ';

    const result = race(
      e1.pipe(mergeMap((x: string) => of(x))),
      e2.pipe(mergeMap((x: string) => of(x)))
    ).pipe(mergeMap((x: any) => of(x)));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should never emit when given non emitting sources', () => {
    const e1 = cold('---|');
    const e2 = cold('---|');
    const e1subs = '^  !';
    const expected = '---|';

    const source = race(e1, e2);

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should throw when error occurs mid stream', () => {
    const e1 = cold('---a-----#');
    const e1subs = '^        !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----#';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should throw when error occurs before a winner is found', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---#';

    const result = race(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const source = race(e1);

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const source = race(e1);

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const source = race(e1);

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should support a single SourceInput argument', (done: MochaDone) => {
    const source = race(Promise.resolve(42));
    source.subscribe(
      value => {
        expect(value).to.equal(42);
      },
      done,
      done
    );
  });
});

/** @test {range} */
describe('range', () => {
  asDiagram('range(1, 10)')(
    'should create an observable with numbers 1 to 10',
    () => {
      const e1 = range(1, 10)
        // for the purpose of making a nice diagram, spread out the synchronous emissions
        .pipe(
          concatMap((x, i) =>
            of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler))
          )
        );
      const expected = 'a-b-c-d-e-f-g-h-i-(j|)';
      const values = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
        h: 8,
        i: 9,
        j: 10
      };
      expectSource(e1).toBe(expected, values);
    }
  );

  it('should work for two subscribers', () => {
    const e1 = range(1, 5).pipe(
      concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler)))
    );
    const expected = 'a-b-c-d-(e|)';
    const values = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5
    };
    expectSource(e1).toBe(expected, values);
    expectSource(e1).toBe(expected, values);
  });

  it('should synchronously create a range of values by default', () => {
    const results = [] as any[];
    range(12, 4).subscribe(function (x) {
      results.push(x);
    });
    expect(results).to.deep.equal([12, 13, 14, 15]);
  });

  it('should accept a scheduler', (done: MochaDone) => {
    const expected = [12, 13, 14, 15];
    sinon.spy(asap, 'schedule');

    const source = range(12, 4, asap);

    source.subscribe(
      function (x) {
        expect(asap.schedule).have.been.called;
        const exp = expected.shift();
        expect(x).to.equal(exp);
      },
      function (x) {
        done(new Error('should not be called'));
      },
      () => {
        (<any>asap.schedule).restore();
        done();
      }
    );
  });

  it('should accept only one argument where count is argument and start is zero', () => {
    const e1 = range(5).pipe(
      concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler)))
    );
    const expected = 'a-b-c-d-(e|)';
    const values = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4
    };
    expectSource(e1).toBe(expected, values);
    expectSource(e1).toBe(expected, values);
  });
});

describe('RangeObservable', () => {
  describe('dispatch', () => {
    it('should complete if index >= count', () => {
      const o = new Subscriber();
      const obj: Subscriber<any> = <any>sinon.stub(o);

      const state = {
        subscriber: obj,
        index: 10,
        start: 0,
        count: 9
      };

      dispatch.call({} as any, state);

      expect(state.subscriber.complete).have.been.called;
      expect(state.subscriber.next).not.have.been.called;
    });

    it('should next out another value and increment the index and start', () => {
      const o = new Subscriber();
      const obj: Subscriber<any> = <any>sinon.stub(o);

      const state = {
        subscriber: obj,
        index: 1,
        start: 5,
        count: 9
      };

      const thisArg = {
        schedule: sinon.spy()
      };

      dispatch.call(thisArg as any, state);

      expect(state.subscriber.complete).not.have.been.called;
      expect(state.subscriber.next).have.been.calledWith(5);
      expect(state.start).to.equal(6);
      expect(state.index).to.equal(2);
      expect(thisArg.schedule).have.been.calledWith(state);
    });
  });
});

/** @test {throw} */
describe('throwError', () => {
  asDiagram('throw(e)')(
    'should create a cold observable that just emits an error',
    () => {
      const expected = '#';
      const e1 = throwError('error');
      expectSource(e1).toBe(expected);
    }
  );

  it('should emit one value', done => {
    let calls = 0;
    throwError('bad').subscribe(
      () => {
        done(new Error('should not be called'));
      },
      err => {
        expect(++calls).to.equal(1);
        expect(err).to.equal('bad');
        done();
      }
    );
  });

  it('should accept scheduler', () => {
    const e = throwError('error', rxTestScheduler);

    expectSource(e).toBe('#');
  });
});

/** @test {timer} */
describe('timer', () => {
  asDiagram('timer(3000, 1000)')(
    'should create an observable emitting periodically',
    () => {
      const e1 = timer(60, 20, rxTestScheduler).pipe(
        take(4), // make it actually finite, so it can be rendered
        concat(NEVER) // but pretend it's infinite by not completing
      );
      const expected = '------a-b-c-d-';
      const values = {
        a: 0,
        b: 1,
        c: 2,
        d: 3
      };
      expectSource(e1).toBe(expected, values);
    }
  );

  it('should schedule a value of 0 then complete', () => {
    const dueTime = time('-----|');
    const expected = '-----(x|)';

    const source = timer(dueTime, undefined, rxTestScheduler);
    expectSource(source).toBe(expected, {x: 0});
  });

  it('should emit a single value immediately', () => {
    const dueTime = time('|');
    const expected = '(x|)';

    const source = timer(dueTime, rxTestScheduler);
    expectSource(source).toBe(expected, {x: 0});
  });

  it('should start after delay and periodically emit values', () => {
    const dueTime = time('----|');
    const period = time('--|');
    const expected = '----a-b-c-d-(e|)';

    const source = timer(dueTime, period, rxTestScheduler).pipe(take(5));
    const values = {a: 0, b: 1, c: 2, d: 3, e: 4};
    expectSource(source).toBe(expected, values);
  });

  it('should start immediately and periodically emit values', () => {
    const dueTime = time('|');
    const period = time('---|');
    const expected = 'a--b--c--d--(e|)';

    const source = timer(dueTime, period, rxTestScheduler).pipe(take(5));
    const values = {a: 0, b: 1, c: 2, d: 3, e: 4};
    expectSource(source).toBe(expected, values);
  });

  it('should stop emiting values when subscription is done', () => {
    const dueTime = time('|');
    const period = time('---|');
    const expected = 'a--b--c--d--e';
    const unsub = '^            !';

    const source = timer(dueTime, period, rxTestScheduler);
    const values = {a: 0, b: 1, c: 2, d: 3, e: 4};
    expectSource(source, unsub).toBe(expected, values);
  });

  it('should schedule a value at a specified Date', () => {
    const offset = time('----|');
    const expected = '----(a|)';

    const dueTime = new Date(rxTestScheduler.now() + offset);
    const source = timer(dueTime, null as any, rxTestScheduler);
    expectSource(source).toBe(expected, {a: 0});
  });

  it('should start after delay and periodically emit values', () => {
    const offset = time('----|');
    const period = time('--|');
    const expected = '----a-b-c-d-(e|)';

    const dueTime = new Date(rxTestScheduler.now() + offset);
    const source = timer(dueTime, period, rxTestScheduler).pipe(take(5));
    const values = {a: 0, b: 1, c: 2, d: 3, e: 4};
    expectSource(source).toBe(expected, values);
  });

  it(
    'should still target the same date if a date is provided even for the ' +
      'second subscription',
    () => {
      const offset = time('----|    ');
      const t1 = cold('a|       ');
      const t2 = cold('--a|     ');
      const expected = '----(aa|)';

      const dueTime = new Date(rxTestScheduler.now() + offset);
      const source = timer(dueTime, null as any, rxTestScheduler);

      const testSource = merge(t1, t2).pipe(mergeMap(() => source));

      expectSource(testSource).toBe(expected, {a: 0});
    }
  );
});

describe('using', () => {
  it('should dispose of the resource when the subscription is disposed', done => {
    let disposed = false;
    const source = using(
      () => new Subscription(() => (disposed = true)),
      resource => range(0, 3)
    ).pipe(take(2));

    source.subscribe();

    if (disposed) {
      done();
    } else {
      done(new Error('disposed should be true but was false'));
    }
  });

  it('should accept factory returns promise resolves', (done: MochaDone) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      resource =>
        new Promise((resolve: any) => {
          resolve(expected);
        })
    );

    e1.subscribe(
      x => {
        expect(x).to.equal(expected);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should accept factory returns promise rejects', (done: MochaDone) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      resource =>
        new Promise((resolve: any, reject: any) => {
          reject(expected);
        })
    );

    e1.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expected);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should raise error when resource factory throws', (done: MochaDone) => {
    const expectedError = 'expected';
    const error = 'error';

    const source = using(
      () => {
        throw expectedError;
      },
      resource => {
        throw error;
      }
    );

    source.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expectedError);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should raise error when observable factory throws', (done: MochaDone) => {
    const error = 'error';
    let disposed = false;

    const source = using(
      () => new Subscription(() => (disposed = true)),
      resource => {
        throw error;
      }
    );

    source.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(error);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });
});
