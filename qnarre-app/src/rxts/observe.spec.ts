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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {SubscribeOnObservable} from 'rxjs/internal/observable/SubscribeOnObservable';
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {asapScheduler} from 'rxjs';

declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {bindCallback} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';

declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {bindNodeCallback} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';

declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {
  queueScheduler as rxQueueScheduler,
  combineLatest,
  of,
  Observable
} from 'rxjs';
import {mergeMap} from 'rxjs/operators';

declare const type: Function;

const queueScheduler = rxQueueScheduler;

/** @test {combineLatest} */
describe('static combineLatest', () => {
  it('should combineLatest the provided observables', () => {
    const firstSource = hot('----a----b----c----|');
    const secondSource = hot('--d--e--f--g--|');
    const expected = '----uv--wx-y--z----|';

    const combined = combineLatest(
      firstSource,
      secondSource,
      (a, b) => '' + a + b
    );

    expectSource(combined).toBe(expected, {
      u: 'ad',
      v: 'ae',
      w: 'af',
      x: 'bf',
      y: 'bg',
      z: 'cg'
    });
  });

  it('should combine an immediately-scheduled source with an immediately-scheduled second', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 4],
      [2, 5],
      [3, 5],
      [3, 6],
      [3, 7],
      [3, 8]
    ];

    //type definition need to be updated
    combineLatest(a, b, queueScheduler).subscribe(
      vals => {
        expect(vals).to.deep.equal(r.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(r.length).to.equal(0);
        done();
      }
    );
  });

  it('should accept array of observables', () => {
    const firstSource = hot('----a----b----c----|');
    const secondSource = hot('--d--e--f--g--|');
    const expected = '----uv--wx-y--z----|';

    const combined = combineLatest(
      [firstSource, secondSource],
      (a: string, b: string) => '' + a + b
    );

    expectSource(combined).toBe(expected, {
      u: 'ad',
      v: 'ae',
      w: 'af',
      x: 'bf',
      y: 'bg',
      z: 'cg'
    });
  });

  it('should work with two nevers', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('-');
    const e2subs = '^';
    const expected = '-';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with never and empty', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('|');
    const e2subs = '(^!)';
    const expected = '-';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with empty and never', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('-');
    const e2subs = '^';
    const expected = '-';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with empty and empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('|');
    const e2subs = '(^!)';
    const expected = '|';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with hot-empty and hot-single', () => {
    const values = {
      a: 1,
      b: 2,
      c: 3,
      r: 1 + 3 //a + c
    };
    const e1 = hot('-a-^-|', values);
    const e1subs = '^ !';
    const e2 = hot('-b-^-c-|', values);
    const e2subs = '^   !';
    const expected = '----|';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with hot-single and hot-empty', () => {
    const values = {
      a: 1,
      b: 2,
      c: 3
    };
    const e1 = hot('-a-^-|', values);
    const e1subs = '^ !';
    const e2 = hot('-b-^-c-|', values);
    const e2subs = '^   !';
    const expected = '----|';

    const result = combineLatest(e2, e1, (x, y) => x + y);

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with hot-single and never', () => {
    const values = {
      a: 1
    };
    const e1 = hot('-a-^-|', values);
    const e1subs = '^ !';
    const e2 = hot('------', values); //never
    const e2subs = '^  ';
    const expected = '-'; //never

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with never and hot-single', () => {
    const values = {
      a: 1,
      b: 2
    };
    const e1 = hot('--------', values); //never
    const e1subs = '^    ';
    const e2 = hot('-a-^-b-|', values);
    const e2subs = '^   !';
    const expected = '-----'; //never

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with hot and hot', () => {
    const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
    const e1subs = '^        !';
    const e2 = hot('---e-^---f--g--|', {e: 'e', f: 'f', g: 'g'});
    const e2subs = '^         !';
    const expected = '----x-yz--|';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, {x: 'bf', y: 'cf', z: 'cg'});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with empty and error', () => {
    const e1 = hot('----------|'); //empty
    const e1subs = '^     !';
    const e2 = hot('------#', undefined, 'shazbot!'); //error
    const e2subs = '^     !';
    const expected = '------#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'shazbot!');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with error and empty', () => {
    const e1 = hot('--^---#', undefined, 'too bad, honk'); //error
    const e1subs = '^   !';
    const e2 = hot('--^--------|'); //empty
    const e2subs = '^   !';
    const expected = '----#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'too bad, honk');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with hot and throw', () => {
    const e1 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
    const e1subs = '^ !';
    const e2 = hot('---^-#', undefined, 'bazinga');
    const e2subs = '^ !';
    const expected = '--#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'bazinga');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with throw and hot', () => {
    const e1 = hot('---^-#', undefined, 'bazinga');
    const e1subs = '^ !';
    const e2 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
    const e2subs = '^ !';
    const expected = '--#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'bazinga');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with throw and throw', () => {
    const e1 = hot('---^----#', undefined, 'jenga');
    const e1subs = '^ !';
    const e2 = hot('---^-#', undefined, 'bazinga');
    const e2subs = '^ !';
    const expected = '--#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'bazinga');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with error and throw', () => {
    const e1 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
    const e1subs = '^ !';
    const e2 = hot('---^-#', undefined, 'flurp');
    const e2subs = '^ !';
    const expected = '--#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'flurp');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with throw and error', () => {
    const e1 = hot('---^-#', undefined, 'flurp');
    const e1subs = '^ !';
    const e2 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
    const e2subs = '^ !';
    const expected = '--#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'flurp');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with never and throw', () => {
    const e1 = hot('---^-----------');
    const e1subs = '^     !';
    const e2 = hot('---^-----#', undefined, 'wokka wokka');
    const e2subs = '^     !';
    const expected = '------#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'wokka wokka');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with throw and never', () => {
    const e1 = hot('---^----#', undefined, 'wokka wokka');
    const e1subs = '^    !';
    const e2 = hot('---^-----------');
    const e2subs = '^    !';
    const expected = '-----#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'wokka wokka');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with some and throw', () => {
    const e1 = hot('---^----a---b--|', {a: 1, b: 2});
    const e1subs = '^  !';
    const e2 = hot('---^--#', undefined, 'wokka wokka');
    const e2subs = '^  !';
    const expected = '---#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should work with throw and some', () => {
    const e1 = hot('---^--#', undefined, 'wokka wokka');
    const e1subs = '^  !';
    const e2 = hot('---^----a---b--|', {a: 1, b: 2});
    const e2subs = '^  !';
    const expected = '---#';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle throw after complete left', () => {
    const left = hot('--a--^--b---|', {a: 1, b: 2});
    const leftSubs = '^      !';
    const right = hot('-----^--------#', undefined, 'bad things');
    const rightSubs = '^        !';
    const expected = '---------#';

    const result = combineLatest(left, right, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'bad things');
    expectSubscriptions(left.subscriptions).toBe(leftSubs);
    expectSubscriptions(right.subscriptions).toBe(rightSubs);
  });

  it('should handle throw after complete right', () => {
    const left = hot('-----^--------#', undefined, 'bad things');
    const leftSubs = '^        !';
    const right = hot('--a--^--b---|', {a: 1, b: 2});
    const rightSubs = '^      !';
    const expected = '---------#';

    const result = combineLatest(left, right, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'bad things');
    expectSubscriptions(left.subscriptions).toBe(leftSubs);
    expectSubscriptions(right.subscriptions).toBe(rightSubs);
  });

  it('should handle interleaved with tail', () => {
    const e1 = hot('-a--^--b---c---|', {a: 'a', b: 'b', c: 'c'});
    const e1subs = '^          !';
    const e2 = hot('--d-^----e---f--|', {d: 'd', e: 'e', f: 'f'});
    const e2subs = '^           !';
    const expected = '-----x-y-z--|';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, {x: 'be', y: 'ce', z: 'cf'});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle two consecutive hot observables', () => {
    const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
    const e1subs = '^        !';
    const e2 = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
    const e2subs = '^                   !';
    const expected = '-----------x--y--z--|';

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result).toBe(expected, {x: 'cd', y: 'ce', z: 'cf'});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle two consecutive hot observables with error left', () => {
    const left = hot('--a--^--b--c--#', {a: 'a', b: 'b', c: 'c'}, 'jenga');
    const leftSubs = '^        !';
    const right = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
    const rightSubs = '^        !';
    const expected = '---------#';

    const result = combineLatest(left, right, (x, y) => x + y);

    expectSource(result).toBe(expected, null, 'jenga');
    expectSubscriptions(left.subscriptions).toBe(leftSubs);
    expectSubscriptions(right.subscriptions).toBe(rightSubs);
  });

  it('should handle two consecutive hot observables with error right', () => {
    const left = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
    const leftSubs = '^        !';
    const right = hot(
      '-----^----------d--e--f--#',
      {d: 'd', e: 'e', f: 'f'},
      'dun dun dun'
    );
    const rightSubs = '^                   !';
    const expected = '-----------x--y--z--#';

    const result = combineLatest(left, right, (x, y) => x + y);

    expectSource(result).toBe(
      expected,
      {x: 'cd', y: 'ce', z: 'cf'},
      'dun dun dun'
    );
    expectSubscriptions(left.subscriptions).toBe(leftSubs);
    expectSubscriptions(right.subscriptions).toBe(rightSubs);
  });

  it('should handle selector throwing', () => {
    const e1 = hot('--a--^--b--|', {a: 1, b: 2});
    const e1subs = '^  !';
    const e2 = hot('--c--^--d--|', {c: 3, d: 4});
    const e2subs = '^  !';
    const expected = '---#';

    const result = combineLatest(e1, e2, (x, y) => {
      throw 'ha ha ' + x + ', ' + y;
    });

    expectSource(result).toBe(expected, null, 'ha ha 2, 4');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--^--b--c---d-| ');
    const e1subs = '^        !    ';
    const e2 = hot('---e-^---f--g---h-|');
    const e2subs = '^        !    ';
    const expected = '----x-yz--    ';
    const unsub = '         !    ';
    const values = {x: 'bf', y: 'cf', z: 'cg'};

    const result = combineLatest(e1, e2, (x, y) => x + y);

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c---d-| ');
    const e1subs = '^        !    ';
    const e2 = hot('---e-^---f--g---h-|');
    const e2subs = '^        !    ';
    const expected = '----x-yz--    ';
    const unsub = '         !    ';
    const values = {x: 'bf', y: 'cf', z: 'cg'};

    const result = combineLatest(
      e1.pipe(mergeMap(x => of(x))),
      e2.pipe(mergeMap(x => of(x))),
      (x, y) => x + y
    ).pipe(mergeMap(x => of(x)));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});
import {expect} from 'chai';
import {lowerCaseO} from '../helpers/test-helper';
import {
  hot,
  cold,
  emptySubs,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {
  asyncScheduler,
  queueScheduler as rxQueueScheduler,
  concat,
  of,
  defer,
  Observable
} from 'rxjs';
import {mergeMap} from 'rxjs/operators';

const queueScheduler = rxQueueScheduler;

/** @test {concat} */
describe('static concat', () => {
  it('should emit elements from multiple sources', () => {
    const e1 = cold('-a-b-c-|');
    const e1subs = '^      !';
    const e2 = cold('-0-1-|');
    const e2subs = '       ^    !';
    const e3 = cold('-w-x-y-z-|');
    const e3subs = '            ^        !';
    const expected = '-a-b-c--0-1--w-x-y-z-|';

    expectSource(concat(e1, e2, e3)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should concat the same cold observable multiple times', () => {
    const inner = cold('--i-j-k-l-|                              ');
    const innersubs = [
      '^         !                              ',
      '          ^         !                    ',
      '                    ^         !          ',
      '                              ^         !'
    ];
    const expected = '--i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l-|';

    const result = concat(inner, inner, inner, inner);

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it(
    'should concat the same cold observable multiple times, ' +
      'but the result is unsubscribed early',
    () => {
      const inner = cold('--i-j-k-l-|     ');
      const unsub = '               !';
      const innersubs = ['^         !     ', '          ^    !'];
      const expected = '--i-j-k-l---i-j-';

      const result = concat(inner, inner, inner, inner);

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(inner.subscriptions).toBe(innersubs);
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const inner = cold('--i-j-k-l-|     ');
    const innersubs = ['^         !     ', '          ^    !'];
    const expected = '--i-j-k-l---i-j-';
    const unsub = '               !';

    const innerWrapped = inner.pipe(mergeMap(x => of(x)));
    const result = concat(
      innerWrapped,
      innerWrapped,
      innerWrapped,
      innerWrapped
    ).pipe(mergeMap(x => of(x)));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should complete without emit if both sources are empty', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('----|');
    const e2subs = '  ^   !';
    const expected = '------|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if first source does not completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('--|');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if second source does not completes', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('---');
    const e2subs = '  ^';
    const expected = '---';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if both sources do not complete', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('-');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error when first source is empty, second source raises error', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('----#');
    const e2subs = '  ^   !';
    const expected = '------#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error when first source raises error, second source is empty', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('----|');
    const e2subs = emptySubs;
    const expected = '---#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise first error when both source raise error', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('------#');
    const e2subs = emptySubs;
    const expected = '---#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat if first source emits once, second source is empty', () => {
    const e1 = cold('--a--|');
    const e1subs = '^    !';
    const e2 = cold('--------|');
    const e2subs = '     ^       !';
    const expected = '--a----------|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat if first source is empty, second source emits once', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('--a--|');
    const e2subs = '  ^    !';
    const expected = '----a--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should emit element from first source, and should not complete if second ' +
      'source does not completes',
    () => {
      const e1 = cold('--a--|');
      const e1subs = '^    !';
      const e2 = cold('-');
      const e2subs = '     ^';
      const expected = '--a---';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not complete if first source does not complete', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('--a--|');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit elements from each source when source emit once', () => {
    const e1 = cold('---a|');
    const e1subs = '^   !';
    const e2 = cold('-----b--|');
    const e2subs = '    ^       !';
    const expected = '---a-----b--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should unsubscribe to inner source if outer is unsubscribed early', () => {
    const e1 = cold('---a-a--a|            ');
    const e1subs = '^        !            ';
    const e2 = cold('-----b-b--b-|');
    const e2subs = '         ^       !    ';
    const unsub = '                 !    ';
    const expected = '---a-a--a-----b-b     ';

    expectSource(concat(e1, e2), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error from first source and does not emit from second source', () => {
    const e1 = cold('--#');
    const e1subs = '^ !';
    const e2 = cold('----a--|');
    const e2subs = emptySubs;
    const expected = '--#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit element from first source then raise error from second source', () => {
    const e1 = cold('--a--|');
    const e1subs = '^    !';
    const e2 = cold('-------#');
    const e2subs = '     ^      !';
    const expected = '--a---------#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should emit all elements from both hot observable sources if first source ' +
      'completes before second source starts emit',
    () => {
      const e1 = hot('--a--b-|');
      const e1subs = '^      !';
      const e2 = hot('--------x--y--|');
      const e2subs = '       ^      !';
      const expected = '--a--b--x--y--|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      const e1 = hot('--a--b--c---|');
      const e1subs = '^           !';
      const e2 = cold('-x-y-z-|');
      const e2subs = '            ^      !';
      const expected = '--a--b--c----x-y-z-|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not emit collapsing element from second source', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const e2 = hot('--------x--y--z--|');
    const e2subs = '           ^     !';
    const expected = '--a--b--c--y--z--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should return empty if concatenating an empty source', () => {
    const e1 = cold('|');
    const e1subs = ['(^!)', '(^!)'];
    const expected = '|';

    const result = concat(e1, e1);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error immediately if given a just-throw source', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const result = concat(e1, e1);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      const e1 = hot('--a--b--c---|');
      const e1subs = '^           !';
      const e2 = cold('-x-y-z-|');
      const e2subs = '            ^      !';
      const expected = '--a--b--c----x-y-z-|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not emit collapsing element from second source', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const e2 = hot('--------x--y--z--|');
    const e2subs = '           ^     !';
    const expected = '--a--b--c--y--z--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat an immediately-scheduled source with an immediately-scheduled second', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 3, 4, 5, 6, 7, 8];

    concat(a, b, queueScheduler).subscribe(
      vals => {
        expect(vals).to.equal(r.shift());
      },
      null,
      done
    );
  });

  it("should use the scheduler even when one Observable is concat'd", done => {
    let e1Subscribed = false;
    const e1 = defer(() => {
      e1Subscribed = true;
      return of('a');
    });

    concat(e1, asyncScheduler).subscribe({
      error: done,
      complete: () => {
        expect(e1Subscribed).to.be.true;
        done();
      }
    });

    expect(e1Subscribed).to.be.false;
  });

  it('should return passed observable if no scheduler was passed', () => {
    const source = cold('--a---b----c---|');
    const result = concat(source);

    expectSource(result).toBe('--a---b----c---|');
  });

  it('should return RxJS Observable when single lowerCaseO was passed', () => {
    const source = lowerCaseO('a', 'b', 'c');
    const result = concat(source);

    expect(result).to.be.an.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });
});
import {expect} from 'chai';
import {defer, Observable, of} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {mergeMap} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

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
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';
import {empty, EMPTY} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';

declare const asDiagram: any;
declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {Observable, forkJoin, of} from 'rxjs';
import {lowerCaseO} from '../helpers/test-helper';
import {
  hot,
  expectSource,
  expectSubscriptions,
  cold
} from '../helpers/marble-testing';
import {AssertionError} from 'assert';

declare const type: Function;
declare const asDiagram: Function;

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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {asapScheduler, from} from 'rxjs';

declare const process: any;

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
import {expect} from 'chai';
import {TestScheduler} from 'rxjs/testing';
import {
  asyncScheduler,
  of,
  from,
  Observable,
  asapScheduler,
  Observer,
  observable,
  Subject,
  EMPTY
} from 'rxjs';
import {first, concatMap, delay} from 'rxjs/operators';

// tslint:disable:no-any
declare const asDiagram: any;
declare const expectSource: any;
declare const type: any;
declare const rxTestScheduler: TestScheduler;
// tslint:enable:no-any

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

  type('should return T for InteropObservable objects', () => {
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
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';
import {Observable, fromEvent, NEVER, timer, pipe} from 'rxjs';
import {
  NodeStyleEventEmitter,
  NodeCompatibleEventEmitter,
  NodeEventHandler
} from 'rxjs/internal/observable/fromEvent';
import {mapTo, take, concat} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';

declare const type: Function;

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {expectSource} from '../helpers/marble-testing';

import {fromEventPattern, noop, NEVER, timer} from 'rxjs';
import {mapTo, take, concat} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

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
import {TestScheduler} from 'rxjs/testing';
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';
import {generate, Subscriber} from 'rxjs';
import {take} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {iif, of} from 'rxjs';
import {expectSource} from '../helpers/marble-testing';

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
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';
import {
  NEVER,
  interval,
  asapScheduler,
  Observable,
  animationFrameScheduler,
  queueScheduler
} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';
import {take, concat} from 'rxjs/operators';
import * as sinon from 'sinon';

declare const asDiagram: any;
declare const rxTestScheduler: TestScheduler;

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

  it('should create an observable emitting periodically with the AsapScheduler', (done: MochaDone) => {
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

  it('should create an observable emitting periodically with the QueueScheduler', (done: MochaDone) => {
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

  it('should create an observable emitting periodically with the AnimationFrameScheduler', (done: MochaDone) => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    const period = 10;
    const events = [0, 1, 2, 3, 4, 5];
    const source = interval(period, animationFrameScheduler).pipe(take(6));
    source.subscribe({
      next(x) {
        expect(x).to.equal(events.shift());
      },
      error(e) {
        sandbox.restore();
        done(e);
      },
      complete() {
        expect(animationFrameScheduler.actions.length).to.equal(0);
        expect(animationFrameScheduler.scheduled).to.equal(undefined);
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
import {expect} from 'chai';
import {lowerCaseO} from '../helpers/test-helper';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {merge, of, Observable, defer, asyncScheduler} from 'rxjs';
import {delay} from 'rxjs/operators';

declare const rxTestScheduler: TestScheduler;

/** @test {merge} */
describe('static merge(...observables)', () => {
  it('should merge cold and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^                      !';
    const expected = '---a--x--b--y--c--z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should return itself when try to merge single observable', () => {
    const e1 = of('a');
    const result = merge(e1);

    expect(e1).to.equal(result);
  });

  it('should merge hot and hot', () => {
    const e1 = hot('---a---^-b-----c----|');
    const e1subs = '^            !';
    const e2 = hot('-----x-^----y-----z----|');
    const e2subs = '^               !';
    const expected = '--b--y--c--z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and cold', () => {
    const e1 = hot('---a-^---b-----c----|');
    const e1subs = '^              !';
    const e2 = cold('--x-----y-----z----|');
    const e2subs = '^                  !';
    const expected = '--x-b---y-c---z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge parallel emissions', () => {
    const e1 = hot('---a----b----c----|');
    const e1subs = '^                 !';
    const e2 = hot('---x----y----z----|');
    const e2subs = '^                 !';
    const expected = '---(ax)-(by)-(cz)-|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('|');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('|');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge three empties', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('|');
    const e2subs = '(^!)';
    const e3 = cold('|');
    const e3subs = '(^!)';

    const result = merge(e1, e2, e3);

    expectSource(result).toBe('|');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should merge never and empty', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('|');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('-');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('-');
    const e2subs = '^';

    const result = merge(e1, e2);

    expectSource(result).toBe('-');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and throw', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and throw', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and throw', () => {
    const e1 = cold('-');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and eventual error', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = hot('-------#');
    const e2subs = '^------!';
    const expected = '-------#';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and error', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^      !    ';
    const e2 = hot('-------#    ');
    const e2subs = '^      !    ';
    const expected = '--a--b-#    ';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and error', () => {
    const e1 = hot('-');
    const e1subs = '^      !';
    const e2 = hot('-------#');
    const e2subs = '^      !';
    const expected = '-------#';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge single lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');

    const result = merge(e1);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });

  it('should merge two lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');
    const e2 = lowerCaseO('d', 'e', 'f');

    const result = merge(e1, e2);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abcdef|)');
  });
});

describe('merge(...observables, Scheduler)', () => {
  it('should merge single lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');

    const result = merge(e1, rxTestScheduler);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });
});

describe('merge(...observables, Scheduler, number)', () => {
  it('should handle concurrency limits', () => {
    const e1 = cold('---a---b---c---|');
    const e2 = cold('-d---e---f--|');
    const e3 = cold('---x---y---z---|');
    const expected = '-d-a-e-b-f-c---x---y---z---|';
    expectSource(merge(e1, e2, e3, 2)).toBe(expected);
  });

  it('should handle scheduler', () => {
    const e1 = of('a');
    const e2 = of('b').pipe(delay(20, rxTestScheduler));
    const expected = 'a-(b|)';

    expectSource(merge(e1, e2, rxTestScheduler)).toBe(expected);
  });

  it('should handle scheduler with concurrency limits', () => {
    const e1 = cold('---a---b---c---|');
    const e2 = cold('-d---e---f--|');
    const e3 = cold('---x---y---z---|');
    const expected = '-d-a-e-b-f-c---x---y---z---|';
    expectSource(merge(e1, e2, e3, 2, rxTestScheduler)).toBe(expected);
  });

  it('should use the scheduler even when one Observable is merged', done => {
    let e1Subscribed = false;
    const e1 = defer(() => {
      e1Subscribed = true;
      return of('a');
    });

    merge(e1, asyncScheduler).subscribe({
      error: done,
      complete: () => {
        expect(e1Subscribed).to.be.true;
        done();
      }
    });

    expect(e1Subscribed).to.be.false;
  });
});
import {NEVER} from 'rxjs';
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';

declare const asDiagram: any;

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
import {expect} from 'chai';
import {of, Observable} from 'rxjs';
import {expectSource} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {concatMap, delay, concatAll} from 'rxjs/operators';

declare const asDiagram: any;
declare const rxTestScheduler: TestScheduler;

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

import {onErrorResumeNext} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

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
import {expect} from 'chai';
import {expectSource} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {pairs} from 'rxjs';

declare const asDiagram: any;

declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {Observable, partition, of} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {race, of} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {expect} from 'chai';

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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {Subscriber, asapScheduler as asap, range, of} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';
import {expectSource} from '../helpers/marble-testing';
import {dispatch} from 'rxjs/internal/observable/range';
import {concatMap, delay} from 'rxjs/operators';

declare const asDiagram: any;

declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {TestScheduler} from 'rxjs/testing';
import {throwError} from 'rxjs';
import {expectSource} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

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
import {cold, expectSource, time} from '../helpers/marble-testing';
import {timer, NEVER, merge} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';
import {mergeMap, take, concat} from 'rxjs/operators';

declare const asDiagram: any;
declare const rxTestScheduler: TestScheduler;

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
import {expect} from 'chai';
import {using, range, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';

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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {
  queueScheduler as rxQueueScheduler,
  zip,
  from,
  of,
  Observable
} from 'rxjs';

declare const type: Function;

declare const Symbol: any;

const queueScheduler = rxQueueScheduler;

/** @test {zip} */
describe('static zip', () => {
  it('should combine a source with a second', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';

    expectSource(zip(a, b)).toBe(expected, {
      x: ['1', '4'],
      y: ['2', '5'],
      z: ['3', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should zip the provided observables', (done: MochaDone) => {
    const expected = ['a1', 'b2', 'c3'];
    let i = 0;

    zip(
      from(['a', 'b', 'c']),
      from([1, 2, 3]),
      (a: string, b: number) => a + b
    ).subscribe(
      (x: string) => {
        expect(x).to.equal(expected[i++]);
      },
      null,
      done
    );
  });

  it('should end once one observable completes and its buffer is empty', () => {
    const e1 = hot('---a--b--c--|               ');
    const e1subs = '^           !               ';
    const e2 = hot('------d----e----f--------|  ');
    const e2subs = '^                 !         ';
    const e3 = hot('--------h----i----j---------'); // doesn't complete
    const e3subs = '^                 !         ';
    const expected = '--------x----y----(z|)      '; // e1 complete and buffer empty
    const values = {
      x: ['a', 'd', 'h'],
      y: ['b', 'e', 'i'],
      z: ['c', 'f', 'j']
    };

    expectSource(zip(e1, e2, e3)).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it(
    'should end once one observable nexts and zips value from completed other ' +
      'observable whose buffer is empty',
    () => {
      const e1 = hot('---a--b--c--|             ');
      const e1subs = '^           !             ';
      const e2 = hot('------d----e----f|        ');
      const e2subs = '^                !        ';
      const e3 = hot('--------h----i----j-------'); // doesn't complete
      const e3subs = '^                 !       ';
      const expected = '--------x----y----(z|)    '; // e2 buffer empty and signaled complete
      const values = {
        x: ['a', 'd', 'h'],
        y: ['b', 'e', 'i'],
        z: ['c', 'f', 'j']
      };

      expectSource(zip(e1, e2, e3)).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  describe('with iterables', () => {
    it('should zip them with values', () => {
      const myIterator = <any>{
        count: 0,
        next: function () {
          return {value: this.count++, done: false};
        }
      };

      myIterator[Symbol.iterator] = function () {
        return this;
      };

      const e1 = hot('---a---b---c---d---|');
      const e1subs = '^                  !';
      const expected = '---w---x---y---z---|';

      const values = {
        w: ['a', 0],
        x: ['b', 1],
        y: ['c', 2],
        z: ['d', 3]
      };

      expectSource(zip(e1, myIterator)).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });

    it('should only call `next` as needed', () => {
      let nextCalled = 0;
      const myIterator = <any>{
        count: 0,
        next() {
          nextCalled++;
          return {value: this.count++, done: false};
        }
      };
      myIterator[Symbol.iterator] = function () {
        return this;
      };

      zip(of(1, 2, 3), myIterator).subscribe();

      // since zip will call `next()` in advance, total calls when
      // zipped with 3 other values should be 4.
      expect(nextCalled).to.equal(4);
    });

    it('should work with never observable and empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b: number[] = [];
      const expected = '-';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b: number[] = [];
      const expected = '|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and non-empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b = [1];
      const expected = '|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----a--|');
      const asubs = '^       !';
      const b: number[] = [];
      const expected = '--------|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with never observable and non-empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b = [1];
      const expected = '-';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable', () => {
      const a = hot('---^----1--|');
      const asubs = '^    !   ';
      const b = [2];
      const expected = '-----(x|)';

      expectSource(zip(a, b)).toBe(expected, {x: ['1', 2]});
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b: number[] = [];
      const expected = '-----#';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with observable which raises error and non-empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b = [1];
      const expected = '-----#';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty many observable and non-empty many iterable', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^        !   ';
      const b = [4, 5, 6];
      const expected = '---x--y--(z|)';

      expectSource(zip(a, b)).toBe(expected, {
        x: ['1', 4],
        y: ['2', 5],
        z: ['3', 6]
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable selector that throws', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^     !';
      const b = [4, 5, 6];
      const expected = '---x--#';

      const selector = (x: string, y: number) => {
        if (y === 5) {
          throw new Error('too bad');
        } else {
          return x + y;
        }
      };
      expectSource(zip(a, b, selector)).toBe(
        expected,
        {x: '14'},
        new Error('too bad')
      );
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });
  });

  it('should combine two observables and selector', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';

    expectSource(zip(a, b, (e1: string, e2: string) => e1 + e2)).toBe(
      expected,
      {x: '14', y: '25', z: '36'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    expectSource(zip(a, b, c)).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = zip(a, b, c, (r0: string, r1: string, r2: string) => [
      r0,
      r1,
      r2
    ]);
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric array selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = zip(a, b, c, (r0: string, r1: string, r2: string) => [
      r0,
      r1,
      r2
    ]);
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 1', () => {
    const a = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const asubs = '^                 !    ';
    const b = hot('---1-^--2--4--6--8--0--|    ');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '12', b: '34', c: '56', d: '78', e: '90'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 2', () => {
    const a = hot('---1-^--2--4--6--8--0--|    ');
    const asubs = '^                 !    ';
    const b = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '21', b: '43', c: '65', d: '87', e: '09'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data symmetric', () => {
    const a = hot('---1-^-1-3-5-7-9------| ');
    const asubs = '^                ! ';
    const b = hot('---1-^--2--4--6--8--0--|');
    const bsubs = '^                ! ';
    const expected = '---a--b--c--d--e-| ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '12', b: '34', c: '56', d: '78', e: '90'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with selector throws', () => {
    const a = hot('---1-^-2---4----|  ');
    const asubs = '^       !     ';
    const b = hot('---1-^--3----5----|');
    const bsubs = '^       !     ';
    const expected = '---x----#     ';

    const selector = (x: string, y: string) => {
      if (y === '5') {
        throw new Error('too bad');
      } else {
        return x + y;
      }
    };
    const observable = zip(a, b, selector);
    expectSource(observable).toBe(expected, {x: '23'}, new Error('too bad'));
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with right completes first', () => {
    const a = hot('---1-^-2-----|');
    const asubs = '^     !';
    const b = hot('---1-^--3--|');
    const bsubs = '^     !';
    const expected = '---x--|';

    expectSource(zip(a, b)).toBe(expected, {x: ['2', '3']});
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two nevers', () => {
    const a = cold('-');
    const asubs = '^';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and empty', () => {
    const a = cold('-');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and never', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('-');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and non-empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('---1--|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and empty', () => {
    const a = hot('---1--|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and non-empty', () => {
    const a = cold('-');
    const asubs = '^';
    const b = hot('---1--|');
    const bsubs = '^     !';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and never', () => {
    const a = hot('---1--|');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and error', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('------#', undefined, 'too bad');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and empty', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error', () => {
    const a = hot('----------|');
    const asubs = '^     !    ';
    const b = hot('------#    ');
    const bsubs = '^     !    ';
    const expected = '------#    ';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and error', () => {
    const a = cold('-');
    const asubs = '^     !';
    const b = hot('------#');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and never', () => {
    const a = hot('------#');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and error', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '^     !';
    const b = hot('----------#', undefined, 'too bad 2');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected, null, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors', () => {
    const a = hot('--w-----#----', {w: 1}, 'too bad');
    const asubs = '^       !';
    const b = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(zip(a, b)).toBe(expected, {x: [1, 2]}, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors (swapped)', () => {
    const a = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const asubs = '^       !';
    const b = hot('--w-----#----', {w: 1}, 'too bad');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(zip(a, b)).toBe(expected, {x: [2, 1]}, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and some', () => {
    const a = cold('#');
    const asubs = '(^!)';
    const b = hot('--1--2--3--');
    const bsubs = '(^!)';
    const expected = '#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should combine an immediately-scheduled source with an immediately-scheduled second', (done: MochaDone) => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 5],
      [3, 6]
    ];
    let i = 0;

    zip(a, b).subscribe(
      (vals: Array<number>) => {
        expect(vals).to.deep.equal(r[i++]);
      },
      null,
      done
    );
  });

  type('should support observables', () => {
    /* tslint:disable:no-unused-variable */
    let a: Observable<number>;
    let b: Observable<string>;
    let c: Observable<boolean>;
    let o1: Observable<[number, string, boolean]> = zip(a!, b!, c!);
    /* tslint:enable:no-unused-variable */
  });

  type('should support mixed observables and promises', () => {
    /* tslint:disable:no-unused-variable */
    let a: Promise<number>;
    let b: Observable<string>;
    let c: Promise<boolean>;
    let d: Observable<string[]>;
    let o1: Observable<[number, string, boolean, string[]]> = zip(
      a!,
      b!,
      c!,
      d!
    );
    /* tslint:enable:no-unused-variable */
  });

  type('should support arrays of promises', () => {
    /* tslint:disable:no-unused-variable */
    let a: Promise<number>[];
    let o1: Observable<number[]> = zip(a!);
    let o2: Observable<number[]> = zip(...a!);
    /* tslint:enable:no-unused-variable */
  });

  type('should support arrays of observables', () => {
    /* tslint:disable:no-unused-variable */
    let a: Observable<number>[];
    let o1: Observable<number[]> = zip(a!);
    let o2: Observable<number[]> = zip(...a!);
    /* tslint:enable:no-unused-variable */
  });

  type('should return Array<T> when given a single promise', () => {
    /* tslint:disable:no-unused-variable */
    let a: Promise<number>;
    let o1: Observable<number[]> = zip(a!);
    /* tslint:enable:no-unused-variable */
  });

  type('should return Array<T> when given a single observable', () => {
    /* tslint:disable:no-unused-variable */
    let a: Observable<number>;
    let o1: Observable<number[]> = zip(a!);
    /* tslint:enable:no-unused-variable */
  });
});
