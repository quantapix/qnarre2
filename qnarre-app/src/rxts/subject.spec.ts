import * as qj from './subject';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

import {merge, mergeMapTo, of, tap} from './testing';
import {hot, expectSource} from './spec/marbles';
//import {asInteropSubject} from '../helpers/interop-helper';
import {TestScheduler} from './testing';

describe('Subscription', () => {
  describe('Subscription.add()', () => {
    it('Should return self if passed', () => {
      const s = new qj.Subscription();
      const r = s.add(s);
      expect(r).toBe(s);
    });
    it('Should return Subscription.fake if passed', () => {
      const s = new qj.Subscription();
      const r = s.add(qj.Subscription.fake);
      expect(r).toBe(qj.Subscription.fake);
    });
    it('Should return Subscription.fake if called with `void`', () => {
      const s = new qj.Subscription();
      const r = s.add(undefined);
      expect(r).toBe(qj.Subscription.fake);
    });
    it('Should return new Subscription created with passed function', () => {
      const s = new qj.Subscription();
      let called = false;
      const r = s.add(() => (called = true));
      r.unsubscribe();
      expect(called).toBe(true);
    });
    it('Should wrap qj.Anonymous and return subscriptiomn that removes it when unsubbed', () => {
      const s: any = new qj.Subscription();
      let called = false;
      const o = {unsubscribe: () => (called = true)};
      const r = s.add(o);
      expect(called).toBe(false);
      expect(s.children.length).toBe(1);
      r.unsubscribe();
      expect(called).toBe(true);
      expect(s.children.length).toBe(0);
    });
    it('Should return the passed if passed with no function `unsubscribe`', () => {
      const s = new qj.Subscription();
      const o = {
        closed: false,
        unsubscribe: undefined as any
      };
      const r = s.add(o as any);
      expect(r).toBe(o);
    });
    it('Should return the passed if self unsubscribed', () => {
      const s = new qj.Subscription();
      s.unsubscribe();
      const c = new qj.Subscription();
      const r = s.add(c);
      expect(r).toBe(c);
    });
    it('Should unsubscribe the passed if self unsubscribed', () => {
      const s = new qj.Subscription();
      s.unsubscribe();
      let called = false;
      const c = new qj.Subscription(() => (called = true));
      s.add(c);
      expect(called).toBe(true);
    });
  });
  describe('Subscription.unsubscribe()', () => {
    it('Should unsubscribe from subscriptions, when some of them throw', done => {
      const us = [] as number[];
      const s1 = new qs.Source(() => ({unsubscribe: () => us.push(1)}));
      const s2 = new qs.Source(() => ({
        unsubscribe: () => {
          us.push(2);
          throw new Error('bad');
        }
      }));
      const s3 = new qs.Source(() => ({unsubscribe: () => us.push(3)}));
      const s = merge(s1, s2, s3).subscribe();
      setTimeout(() => {
        expect(() => s.unsubscribe()).toThrow(qu.UnsubscribeError);
        expect(us).toEqual([1, 2, 3]);
        done();
      });
    });
    it('Should unsubscribe from subscriptions, when adding a bad subscription', done => {
      const us = [] as number[];
      const s = new qj.Subscription();
      const s1 = new qs.Source(() => ({unsubscribe: () => us.push(1)}));
      const s2 = new qs.Source(() => ({
        unsubscribe: () => {
          us.push(2);
          s.add({
            unsubscribe: () => {
              expect(s.closed).toBeTrue;
              throw new Error('bad');
            }
          });
        }
      }));
      const s3 = new qs.Source(() => ({unsubscribe: () => us.push(3)}));
      s.add(merge(s1, s2, s3).subscribe());
      setTimeout(() => {
        expect(() => s.unsubscribe()).toThrow(qu.UnsubscribeError);
        expect(us).toEqual([1, 2, 3]);
        done();
      });
    });
  });
});

describe('Subscriber', () => {
  it('should ignore next after unsubscription', () => {
    let t = 0;
    const s = new qj.Subscriber({next: () => (t += 1)});
    s.next();
    s.next();
    s.unsubscribe();
    s.next();
    expect(t).toBe(2);
  });
  it('should wrap unsafe observers in a proxy', () => {
    const o = {
      next: {} as qt.Fun<void>,
      fail: {} as qt.Fun<void>,
      done: {} as qt.Fun<void>
    };
    const s = new qj.Subscriber(o);
    expect((s as any).tgt).not.toBe(o);
    expect((s as any).tgt).toBeInstanceOf(qj.Proxy);
  });
  it('should ignore fails after unsubscribe', () => {
    let t = 0;
    let e = false;
    const s = new qj.Subscriber({
      next: () => (t += 1),
      fail: () => (e = true)
    });
    s.next();
    s.next();
    s.unsubscribe();
    s.next();
    s.fail();
    expect(t).toBe(2);
    expect(e).toBeFalse;
  });
  it('should ignore dones after unsubscribe', () => {
    let t = 0;
    let d = false;
    const s = new qj.Subscriber({
      next: () => (t += 1),
      done: () => (d = true)
    });
    s.next();
    s.next();
    s.unsubscribe();
    s.next();
    s.done();
    expect(t).toBe(2);
    expect(d).toBeFalse;
  });
  it('should not be closed when other with same observer is done', () => {
    const o = {next: {} as qt.Fun<void>};
    const s1 = new qj.Subscriber(o);
    const s2 = new qj.Subscriber(o);
    s2.done();
    expect(s1.closed).toBeFalse;
    expect(s2.closed).toBeTrue;
  });
  it('should call done with no args', () => {
    let a: any[] | undefined;
    const o = {done: (...args: any[]) => (a = args)};
    const s = new qj.Subscriber(o);
    s.done();
    expect(a?.length).toBe(0);
  });
});

describe('Subject', () => {
  it('should allow empty, undefined or any next when created with no type', done => {
    const s = new qj.Subject();
    s.subscribe(x => expect(x).toBe(undefined), undefined, done);
    const d = undefined;
    s.next();
    s.next(undefined);
    s.next(d);
    s.done();
  });
  it('should allow empty next when created with void', done => {
    const s = new qj.Subject<void>();
    s.subscribe(x => expect(x).toBe(undefined), undefined, done);
    s.next();
    s.done();
  });
  it('should pump values right on through itself', done => {
    const s = new qj.Subject<string>();
    const e = ['foo', 'bar'];
    s.subscribe(x => expect(x).toBe(e.shift()), undefined, done);
    s.next('foo');
    s.next('bar');
    s.done();
  });
  it('should pump values to multiple subscribers', done => {
    const s = new qj.Subject<string>();
    const e = ['foo', 'bar'];
    let i = 0;
    let j = 0;
    s.subscribe(x => expect(x).toBe(e[i++]));
    s.subscribe(x => expect(x).toBe(e[j++]), undefined, done);
    expect(s.tgts.length).toBe(2);
    s.next('foo');
    s.next('bar');
    s.done();
  });
  it(
    'should handle arrivals and leaves at different times, ' +
      'subject does not complete',
    () => {
      const s = new qj.Subject<number>();
      const r1 = [] as (number | string | undefined)[];
      const r2 = [] as (number | string | undefined)[];
      const r3 = [] as (number | string | undefined)[];
      s.next(1);
      s.next(2);
      s.next(3);
      s.next(4);
      const s1 = s.subscribe(
        x => r1.push(x),
        () => r1.push('E'),
        () => {
          r1.push('C');
        }
      );
      s.next(5);
      const s2 = s.subscribe(
        x => r2.push(x),
        () => r2.push('E'),
        () => {
          r2.push('C');
        }
      );
      s.next(6);
      s.next(7);
      s1.unsubscribe();
      s.next(8);
      s2.unsubscribe();
      s.next(9);
      s.next(10);
      const s3 = s.subscribe(
        x => r3.push(x),
        () => r3.push('E'),
        () => {
          r3.push('C');
        }
      );
      s.next(11);
      s3.unsubscribe();
      expect(r1).toEqual([5, 6, 7]);
      expect(r2).toEqual([6, 7, 8]);
      expect(r3).toEqual([11]);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject completes',
    () => {
      const s = new qj.Subject<number>();
      const r1: (number | string | undefined)[] = [];
      const r2: (number | string | undefined)[] = [];
      const r3: (number | string | undefined)[] = [];
      s.next(1);
      s.next(2);
      s.next(3);
      s.next(4);
      const s1 = s.subscribe(
        x => r1.push(x),
        () => r1.push('E'),
        () => {
          r1.push('C');
        }
      );
      s.next(5);
      const s2 = s.subscribe(
        x => r2.push(x),
        () => r2.push('E'),
        () => {
          r2.push('C');
        }
      );
      s.next(6);
      s.next(7);
      s1.unsubscribe();
      s.done();
      s2.unsubscribe();
      const s3 = s.subscribe(
        x => r3.push(x),
        () => r3.push('E'),
        () => {
          r3.push('C');
        }
      );
      s3.unsubscribe();
      expect(r1).toEqual([5, 6, 7]);
      expect(r2).toEqual([6, 7, 'C']);
      expect(r3).toEqual(['C']);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject terminates with an error',
    () => {
      const s = new qj.Subject<number>();
      const r1: (number | string | undefined)[] = [];
      const r2: (number | string | undefined)[] = [];
      const r3: (number | string | undefined)[] = [];
      s.next(1);
      s.next(2);
      s.next(3);
      s.next(4);
      const s1 = s.subscribe(
        x => r1.push(x),
        () => r1.push('E'),
        () => {
          r1.push('C');
        }
      );
      s.next(5);
      const s2 = s.subscribe(
        x => r2.push(x),
        () => r2.push('E'),
        () => {
          r2.push('C');
        }
      );
      s.next(6);
      s.next(7);
      s1.unsubscribe();
      s.fail(new Error('err'));
      s2.unsubscribe();
      const s3 = s.subscribe(
        x => r3.push(x),
        () => r3.push('E'),
        () => {
          r3.push('C');
        }
      );
      s3.unsubscribe();
      expect(r1).toEqual([5, 6, 7]);
      expect(r2).toEqual([6, 7, 'E']);
      expect(r3).toEqual(['E']);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject completes before nexting any value',
    () => {
      const s = new qj.Subject<number>();
      const r1: (number | string | undefined)[] = [];
      const r2: (number | string | undefined)[] = [];
      const r3: (number | string | undefined)[] = [];
      const s1 = s.subscribe(
        x => r1.push(x),
        () => r1.push('E'),
        () => {
          r1.push('C');
        }
      );
      const s2 = s.subscribe(
        x => r2.push(x),
        () => r2.push('E'),
        () => {
          r2.push('C');
        }
      );
      s1.unsubscribe();
      s.done();
      s2.unsubscribe();
      const s3 = s.subscribe(
        x => r3.push(x),
        () => r3.push('E'),
        () => {
          r3.push('C');
        }
      );

      s3.unsubscribe();

      expect(r1).toEqual([]);
      expect(r2).toEqual(['C']);
      expect(r3).toEqual(['C']);
    }
  );

  it('should disallow new subscriber once subject has been disposed', () => {
    const s = new qj.Subject<number>();
    const r1: (number | string | undefined)[] = [];
    const r2: (number | string | undefined)[] = [];
    const r3: (number | string | undefined)[] = [];

    const s1 = s.subscribe(
      x => r1.push(x),
      () => r1.push('E'),
      () => {
        r1.push('C');
      }
    );

    s.next(1);
    s.next(2);

    const s2 = s.subscribe(
      x => r2.push(x),
      () => r2.push('E'),
      () => {
        r2.push('C');
      }
    );

    s.next(3);
    s.next(4);
    s.next(5);

    s1.unsubscribe();
    s2.unsubscribe();
    s.unsubscribe();

    expect(() => {
      s.subscribe(
        x => r3.push(x),
        function (err) {
          expect(false).toBe('should not throw error: ' + err.toString());
        }
      );
    }).toThrow(qu.UnsubscribedError);

    expect(r1).toEqual([1, 2, 3, 4, 5]);
    expect(r2).toEqual([3, 4, 5]);
    expect(r3).toEqual([]);
  });

  it('should not allow values to be nexted after it is unsubscribed', done => {
    const s = new qj.Subject<string>();
    const e = ['foo'];
    s.subscribe(x => expect(x).toBe(e.shift()));
    s.next('foo');
    s.unsubscribe();
    expect(() => s.next('bar')).toThrow(qu.UnsubscribedError);
    done();
  });

  it('should clean out unsubscribed subscribers', done => {
    const s = new qj.Subject();
    const s1 = s.subscribe(x => {});
    const s2 = s.subscribe(x => {});
    expect(s.tgts.length).toBe(2);
    s1.unsubscribe();
    expect(s.tgts.length).toBe(1);
    s2.unsubscribe();
    expect(s.tgts.length).toBe(0);
    done();
  });

  it('should have a static create function that works', () => {
    expect(qj.Subject.createSubject).toBe(Function);
    const source = of(1, 2, 3, 4, 5);
    const nexts = [] as (number | undefined)[];
    const output = [] as (number | undefined)[];
    let error: any;
    let complete = false;
    let outputComplete = false;
    const destination = {
      closed: false,
      next: function (x?: number) {
        nexts.push(x);
      },
      fail: function (e?: any) {
        error = e;
        this.closed = true;
      },
      done: function () {
        complete = true;
        this.closed = true;
      }
    };
    const s = qj.Subject.createSubject(destination, source);
    s.subscribe(
      function (x?: number) {
        output.push(x);
      },
      undefined,
      () => {
        outputComplete = true;
      }
    );
    s.next('a');
    s.next('b');
    s.next('c');
    s.done();
    expect(nexts).toEqual(['a', 'b', 'c']);
    expect(complete).toBeTrue;
    expect(error).toBe(undefined);
    expect(output).toEqual([1, 2, 3, 4, 5]);
    expect(outputComplete).toBeTrue;
  });

  it('should have a static create function that works also to raise errors', () => {
    expect(qj.Subject.createSubject).toBe(Function);
    const source = of(1, 2, 3, 4, 5);
    const nexts = [] as (number | undefined)[];
    const output = [] as (number | undefined)[];
    let error: any;
    let complete = false;
    let outputComplete = false;
    const destination = {
      closed: false,
      next: function (x?: number) {
        nexts.push(x);
      },
      fail: function (e?: any) {
        error = e;
        this.closed = true;
      },
      done: function () {
        complete = true;
        this.closed = true;
      }
    };
    const sub = qj.Subject.createSubject(destination, source);
    sub.subscribe(
      function (x?: number) {
        output.push(x);
      },
      undefined,
      () => {
        outputComplete = true;
      }
    );
    sub.next('a');
    sub.next('b');
    sub.next('c');
    sub.fail('boom');
    expect(nexts).toEqual(['a', 'b', 'c']);
    expect(complete).toBeFalse;
    expect(error).toBe('boom');
    expect(output).toEqual([1, 2, 3, 4, 5]);
    expect(outputComplete).toBeTrue;
  });

  it('should be an Observer which can be given to qs.Source.subscribe', done => {
    const source = of(1, 2, 3, 4, 5);
    const s = new qj.Subject<number>();
    const e = [1, 2, 3, 4, 5];
    s.subscribe(
      x => expect(x).toBe(e.shift()),
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
    source.subscribe(s);
  });

  it('should be usable as an Observer of a finite delayed qs.Source', done => {
    const source = of(1, 2, 3).pipe(delay(50));
    const s = new qj.Subject<number>();
    const e = [1, 2, 3];
    s.subscribe(
      x => expect(x).toBe(e.shift()),
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
    source.subscribe(s);
  });

  it('should throw qu.UnsubscribedError when emit after unsubscribed', () => {
    const s = new qj.Subject<string>();
    s.unsubscribe();
    expect(() => {
      s.next('a');
    }).toThrow(qu.UnsubscribedError);
    expect(() => {
      s.fail('a');
    }).toThrow(qu.UnsubscribedError);
    expect(() => {
      s.done();
    }).toThrow(qu.UnsubscribedError);
  });
  it('should not next after completed', () => {
    const s = new qj.Subject<string>();
    const rs = [] as (string | undefined)[];
    s.subscribe(
      x => rs.push(x),
      undefined,
      () => rs.push('C')
    );
    s.next('a');
    s.done();
    s.next('b');
    expect(rs).toEqual(['a', 'C']);
  });
  it('should not next after error', () => {
    const error = new Error('wut?');
    const s = new qj.Subject<string>();
    const rs = [] as (string | undefined)[];
    s.subscribe(
      x => rs.push(x),
      e => rs.push(e)
    );
    s.next('a');
    s.fail(error);
    s.next('b');
    expect(rs).toEqual(['a', error]);
  });

  describe('asObservable', () => {
    it('should hide subject', () => {
      const s = new qj.Subject();
      const ss = s.asSource();
      expect(s).not.toBe(ss);
      expect(ss instanceof qs.Source).toBeTrue;
      expect(ss instanceof qj.Subject).toBeFalse;
    });
    it('should handle subject never emits', () => {
      const ss = hot('-').asSource();
      expectSource(ss).toBe(<any>[]);
    });
    it('should handle subject completes without emits', () => {
      const ss = hot('--^--|').asSource();
      const e = '---|';
      expectSource(ss).toBe(e);
    });
    it('should handle subject throws', () => {
      const ss = hot('--^--#').asSource();
      const e = '---#';
      expectSource(ss).toBe(e);
    });
    it('should handle subject emits', () => {
      const ss = hot('--^--x--|').asSource();
      const e = '---x--|';
      expectSource(ss).toBe(e);
    });
    it('should work with inherited subject', () => {
      const rs: (number | string | undefined)[] = [];
      const s = new qj.Async<number>();
      s.next(42);
      s.done();
      const ss = s.asSource();
      ss.subscribe(
        x => rs.push(x),
        undefined,
        () => rs.push('done')
      );
      expect(rs).toEqual([42, 'done']);
    });
  });
});

describe('qj.Anonymous', () => {
  it('should be exposed', () => {
    expect(qj.Anonymous).toBe(Function);
  });
  it('should not eager', () => {
    let subscribed = false;
    const s = qj.Subject.createSubject(
      undefined,
      new qs.Source((observer: qt.Observer<any>) => {
        subscribed = true;
        const ss = of('x').subscribe(o);
        return () => {
          ss.unsubscribe();
        };
      })
    );
    const ss = s.asSource();
    expect(subscribed).toBeFalse;
    ss.subscribe();
    expect(subscribed).toBeTrue;
  });
});

describe('Async', () => {
  it('should emit the last value when complete', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.next(2);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual([2, 'done']);
  });
  it('should emit the last value when subscribing after complete', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    s.next(1);
    s.next(2);
    s.done();
    s.subscribe(o);
    expect(o.rs).toEqual([2, 'done']);
  });
  it('should keep emitting the last value to subsequent subscriptions', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const ss = s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.next(2);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual([2, 'done']);
    ss.unsubscribe();
    o.rs = [];
    s.subscribe(o);
    expect(o.rs).toEqual([2, 'done']);
  });
  it('should not emit values after complete', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.next(2);
    expect(o.rs).toEqual([]);
    s.done();
    s.next(3);
    expect(o.rs).toEqual([2, 'done']);
  });
  it('should not allow change value after complete', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const other = new TestObserver();
    s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual([1, 'done']);
    s.next(2);
    s.subscribe(other);
    expect(other.rs).toEqual([1, 'done']);
  });
  it('should not emit values if unsubscribed before complete', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const ss = s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.next(2);
    expect(o.rs).toEqual([]);
    ss.unsubscribe();
    s.next(3);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual([]);
  });
  it('should just complete if no value has been nexted into it', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    s.subscribe(o);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual(['done']);
  });
  it('should keep emitting complete to subsequent subscriptions', () => {
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const ss = s.subscribe(o);
    expect(o.rs).toEqual([]);
    s.done();
    expect(o.rs).toEqual(['done']);
    ss.unsubscribe();
    o.rs = [];
    s.fail(new Error(''));
    s.subscribe(o);
    expect(o.rs).toEqual(['done']);
  });
  it('should only error if an error is passed into it', () => {
    const e = new Error('bad');
    const s = new qj.Async<number>();
    const o = new TestObserver();
    s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.fail(e);
    expect(o.rs).toEqual([e]);
  });
  it('should keep emitting error to subsequent subscriptions', () => {
    const e = new Error('bad');
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const ss = s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.fail(e);
    expect(o.rs).toEqual([e]);
    ss.unsubscribe();
    o.rs = [];
    s.subscribe(o);
    expect(o.rs).toEqual([e]);
  });
  it('should not allow send complete after error', () => {
    const e = new Error('bad');
    const s = new qj.Async<number>();
    const o = new TestObserver();
    const ss = s.subscribe(o);
    s.next(1);
    expect(o.rs).toEqual([]);
    s.fail(e);
    expect(o.rs).toEqual([e]);
    ss.unsubscribe();
    o.rs = [];
    s.done();
    s.subscribe(o);
    expect(o.rs).toEqual([e]);
  });
});

describe('Behavior', () => {
  it('should extend Subject', () => {
    const s = new qj.Behavior(undefined);
    expect(s).toBeInstanceOf(qj.Subject);
  });
  it('should throw if it has received an error and getValue() is called', () => {
    const s = new qj.Behavior(undefined);
    s.fail(new Error('derp'));
    expect(() => {
      s.getN();
    }).toThrow(Error);
  });
  it(
    'should throw an qu.UnsubscribedError if getValue() is called ' +
      'and the Behavior has been unsubscribed',
    () => {
      const s = new qj.Behavior('hi there');
      s.unsubscribe();
      expect(() => {
        s.getN();
      }).toThrow(qu.UnsubscribedError);
    }
  );
  it('should have a getValue() method to retrieve the current value', () => {
    const s = new qj.Behavior('staltz');
    expect(s.getN()).toBe('staltz');
    s.next('oj');
    expect(s.getN()).toBe('oj');
  });
  it('should not allow you to set `value` directly', () => {
    const s = new qj.Behavior('flibberty');
    try {
      (s as any).value = 'jibbets';
    } catch (e) {
      //noop
    }
    expect(s.getN()).toBe('flibberty');
    expect(s.n).toBe('flibberty');
  });
  it('should still allow you to retrieve the value from the value property', () => {
    const s = new qj.Behavior('fuzzy');
    expect(s.n).toBe('fuzzy');
    s.next('bunny');
    expect(s.n).toBe('bunny');
  });
  it('should start with an initialization value', done => {
    const s = new qj.Behavior('foo');
    const e = ['foo', 'bar'];
    let i = 0;
    s.subscribe(
      x => {
        expect(x).toBe(e[i++]);
      },
      undefined,
      done
    );
    s.next('bar');
    s.done();
  });
  it('should pump values to multiple subscribers', done => {
    const s = new qj.Behavior('init');
    const e = ['init', 'foo', 'bar'];
    let i = 0;
    let j = 0;
    s.subscribe(x => {
      expect(x).toBe(e[i++]);
    });
    s.subscribe(
      x => {
        expect(x).toBe(e[j++]);
      },
      undefined,
      done
    );
    expect(s.tgts.length).toBe(2);
    s.next('foo');
    s.next('bar');
    s.done();
  });
  it('should not pass values nexted after a complete', () => {
    const s = new qj.Behavior('init');
    const rs = [] as (string | undefined)[];
    s.subscribe(x => {
      rs.push(x);
    });
    expect(rs).toEqual(['init']);
    s.next('foo');
    expect(rs).toEqual(['init', 'foo']);
    s.done();
    expect(rs).toEqual(['init', 'foo']);
    s.next('bar');
    expect(rs).toEqual(['init', 'foo']);
  });
  it('should clean out unsubscribed subscribers', done => {
    const s = new qj.Behavior('init');
    const s1 = s.subscribe(x => {
      expect(x).toBe('init');
    });
    const s2 = s.subscribe(x => {
      expect(x).toBe('init');
    });
    expect(s.tgts.length).toBe(2);
    s1.unsubscribe();
    expect(s.tgts.length).toBe(1);
    s2.unsubscribe();
    expect(s.tgts.length).toBe(0);
    done();
  });
  it('should replay the previous value when subscribed', () => {
    const b = new qj.Behavior('0');
    function feedNextIntoSubject(x: string) {
      b.next(x);
    }
    function feedErrorIntoSubject(e?: any) {
      b.fail(e);
    }
    function feedCompleteIntoSubject() {
      b.done();
    }
    const tpl = '-1-2-3----4------5-6---7--8----9--|';
    const subscriber1 = hot('      (a|)                         ').pipe(mergeMapTo(b));
    const uns1 = '                     !             ';
    const e1 = '      3---4------5-6--             ';
    const subscriber2 = hot('            (b|)                   ').pipe(mergeMapTo(b));
    const uns2 = '                         !         ';
    const e2 = '            4----5-6---7--         ';
    const subscriber3 = hot('                           (c|)    ').pipe(mergeMapTo(b));
    const e3 = '                           8---9--|';
    expectSource(
      hot(tpl).pipe(
        tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
      )
    ).toBe(tpl);
    expectSource(subscriber1, uns1).toBe(e1);
    expectSource(subscriber2, uns2).toBe(e2);
    expectSource(subscriber3).toBe(e3);
  });

  it('should emit complete when subscribed after completed', () => {
    const b = new qj.Behavior('0');
    function feedNextIntoSubject(x: string) {
      b.next(x);
    }
    function feedErrorIntoSubject(e?: any) {
      b.fail(e);
    }
    function feedCompleteIntoSubject() {
      b.done();
    }
    const tpl = '-1-2-3--4--|';
    const subscriber1 = hot('               (a|)').pipe(mergeMapTo(b));
    const e1 = '               |   ';
    expectSource(
      hot(tpl).pipe(
        tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
      )
    ).toBe(tpl);
    expectSource(subscriber1).toBe(e1);
  });

  it('should be an qt.Observer which can be given to qs.Source.subscribe', done => {
    const source = of(1, 2, 3, 4, 5);
    const s = new qj.Behavior(0);
    const e = [0, 1, 2, 3, 4, 5];
    s.subscribe(
      x => {
        expect(x).toBe(e.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(s.n).toBe(5);
        done();
      }
    );
    source.subscribe(s);
  });
  xit('should be an qt.Observer which can be given to an interop source', done => {
    const source = of(1, 2, 3, 4, 5);
    const s = new qj.Behavior(0);
    const e = [0, 1, 2, 3, 4, 5];
    s.subscribe(
      x => {
        expect(x).toBe(e.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(s.n).toBe(5);
        done();
      }
    );
    source.subscribe(asInteropSubject(s));
  });
});

describe('Replay', () => {
  it('should extend Subject', () => {
    const s = new qj.Replay();
    expect(s).toBeInstanceOf(qj.Subject);
  });
  it('should add the observer before running subscription code', () => {
    const s = new qj.Replay<number>();
    s.next(1);
    const rs = [] as (number | undefined)[];
    s.subscribe(x => {
      rs.push(x);
      if (x && x < 3) s.next(x + 1);
    });
    expect(rs).toEqual([1, 2, 3]);
  });
  it('should replay values upon subscription', done => {
    const s = new qj.Replay<number>();
    const e = [1, 2, 3];
    let i = 0;
    s.next(1);
    s.next(2);
    s.next(3);
    s.subscribe(
      x => {
        expect(x).toBe(e[i++]);
        if (i === 3) {
          s.done();
        }
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });
  it('should replay values and complete', done => {
    const s = new qj.Replay<number>();
    const e = [1, 2, 3];
    let i = 0;
    s.next(1);
    s.next(2);
    s.next(3);
    s.done();
    s.subscribe(
      x => {
        expect(x).toBe(e[i++]);
      },
      undefined,
      done
    );
  });
  it('should replay values and error', done => {
    const s = new qj.Replay<number>();
    const expects = [1, 2, 3];
    let i = 0;
    s.next(1);
    s.next(2);
    s.next(3);
    s.fail('fooey');
    s.subscribe(
      x => {
        expect(x).toBe(expects[i++]);
      },
      (e?: any) => {
        expect(err).toBe('fooey');
        done();
      }
    );
  });
  it('should only replay values within its buffer size', done => {
    const s = new qj.Replay<number>(2);
    const expects = [2, 3];
    let i = 0;
    s.next(1);
    s.next(2);
    s.next(3);
    s.subscribe(
      x => {
        expect(x).toBe(expects[i++]);
        if (i === 2) {
          s.done();
        }
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });
  describe('with bufferSize=2', () => {
    it('should replay 2 previous values when subscribed', () => {
      const s = new qj.Replay<string>(2);
      function feedNextIntoSubject(x: string) {
        s.next(x);
      }
      function feedErrorIntoSubject(e: string) {
        s.fail(e);
      }
      function feedCompleteIntoSubject() {
        s.done();
      }
      const tpl = '-1-2-3----4------5-6---7--8----9--|';
      const subscriber1 = hot('      (a|)                         ').pipe(mergeMapTo(s));
      const uns1 = '                     !             ';
      const e1 = '      (23)4------5-6--             ';
      const subscriber2 = hot('            (b|)                   ').pipe(mergeMapTo(s));
      const uns2 = '                         !         ';
      const e2 = '            (34)-5-6---7--         ';
      const subscriber3 = hot('                           (c|)    ').pipe(mergeMapTo(s));
      const e3 = '                           (78)9--|';
      expectSource(
        hot(tpl).pipe(
          tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
        )
      ).toBe(tpl);
      expectSource(subscriber1, uns1).toBe(e1);
      expectSource(subscriber2, uns2).toBe(e2);
      expectSource(subscriber3).toBe(e3);
    });
    it('should replay 2 last values for when subscribed after completed', () => {
      const s = new qj.Replay<string>(2);
      function feedNextIntoSubject(x: string) {
        s.next(x);
      }
      function feedErrorIntoSubject(e: string) {
        s.fail(e);
      }
      function feedCompleteIntoSubject() {
        s.done();
      }
      const tpl = '-1-2-3--4--|';
      const subscriber1 = hot('               (a|) ').pipe(mergeMapTo(s));
      const e1 = '               (34|)';
      expectSource(
        hot(tpl).pipe(
          tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
        )
      ).toBe(tpl);
      expectSource(subscriber1).toBe(e1);
    });
    it(
      'should handle subscribers that arrive and leave at different times, ' +
        'subject does not complete',
      () => {
        const s = new qj.Replay<number>(2);
        const r1: (number | string | undefined)[] = [];
        const r2: (number | string | undefined)[] = [];
        const r3: (number | string | undefined)[] = [];
        s.next(1);
        s.next(2);
        s.next(3);
        s.next(4);
        const s1 = s.subscribe(
          x => {
            r1.push(x);
          },
          () => {
            r1.push('E');
          },
          () => {
            r1.push('C');
          }
        );
        s.next(5);
        const s2 = s.subscribe(
          x => {
            r2.push(x);
          },
          () => {
            r2.push('E');
          },
          () => {
            r2.push('C');
          }
        );
        s.next(6);
        s.next(7);
        s1.unsubscribe();
        s.next(8);
        s2.unsubscribe();
        s.next(9);
        s.next(10);
        const s3 = s.subscribe(
          x => {
            r3.push(x);
          },
          () => {
            r3.push('E');
          },
          () => {
            r3.push('C');
          }
        );
        s.next(11);
        s3.unsubscribe();
        expect(r1).toEqual([3, 4, 5, 6, 7]);
        expect(r2).toEqual([4, 5, 6, 7, 8]);
        expect(r3).toEqual([9, 10, 11]);
        s.done();
      }
    );
  });

  describe('with windowTime=40', () => {
    it('should replay previous values since 40 time units ago when subscribed', () => {
      const s = new qj.Replay<string>(Number.POSITIVE_INFINITY, 40, rxTestScheduler);
      function feedNextIntoSubject(x: string) {
        s.next(x);
      }
      function feedErrorIntoSubject(e?: any) {
        s.fail(e);
      }
      function feedCompleteIntoSubject() {
        s.done();
      }
      const tpl = '-1-2-3----4------5-6----7-8----9--|';
      const subscriber1 = hot('      (a|)                         ').pipe(mergeMapTo(s));
      const uns1 = '                     !             ';
      const e1 = '      (23)4------5-6--             ';
      const subscriber2 = hot('            (b|)                   ').pipe(mergeMapTo(s));
      const uns2 = '                         !         ';
      const e2 = '            4----5-6----7-         ';
      const subscriber3 = hot('                           (c|)    ').pipe(mergeMapTo(s));
      const e3 = '                           (78)9--|';
      expectSource(
        hot(tpl).pipe(
          tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
        )
      ).toBe(tpl);
      expectSource(subscriber1, uns1).toBe(e1);
      expectSource(subscriber2, uns2).toBe(e2);
      expectSource(subscriber3).toBe(e3);
    });
    it('should replay last values since 40 time units ago when subscribed', () => {
      const s = new qj.Replay<string>(Number.POSITIVE_INFINITY, 40, rxTestScheduler);
      function feedNextIntoSubject(x: string) {
        s.next(x);
      }
      function feedErrorIntoSubject(e?: any) {
        s.fail(e);
      }
      function feedCompleteIntoSubject() {
        s.done();
      }
      const tpl = '-1-2-3----4|';
      const subscriber1 = hot('             (a|)').pipe(mergeMapTo(s));
      const e1 = '             (4|)';
      expectSource(
        hot(tpl).pipe(
          tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
        )
      ).toBe(tpl);
      expectSource(subscriber1).toBe(e1);
    });
    it('should only replay bufferSize items when 40 time units ago more were emited', () => {
      const s = new qj.Replay<string>(2, 40, rxTestScheduler);
      function feedNextIntoSubject(x: string) {
        s.next(x);
      }
      function feedErrorIntoSubject(e?: any) {
        s.fail(e);
      }
      function feedCompleteIntoSubject() {
        s.done();
      }
      const tpl = '1234     |';
      const subscriber1 = hot('    (a|)').pipe(mergeMapTo(s));
      const e1 = '    (34) |';
      expectSource(
        hot(tpl).pipe(
          tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
        )
      ).toBe(tpl);
      expectSource(subscriber1).toBe(e1);
    });
  });

  it('should be an qt.Observer which can be given to qs.Source.subscribe', () => {
    const source = of(1, 2, 3, 4, 5);
    const s = new qj.Replay<number>(3);
    let rs = [] as (number | string | undefined)[];
    s.subscribe(
      x => rs.push(x),
      undefined,
      () => rs.push('done')
    );
    source.subscribe(s);
    expect(rs).toEqual([1, 2, 3, 4, 5, 'done']);
    rs = [];
    s.subscribe(
      x => rs.push(x),
      undefined,
      () => rs.push('done')
    );
    expect(rs).toEqual([3, 4, 5, 'done']);
  });
});

class TestObserver implements qt.Observer<number> {
  rs = [] as (number | string | undefined)[];
  next(n: number) {
    this.rs.push(n);
  }
  fail(e?: any) {
    this.rs.push(e);
  }
  done() {
    this.rs.push('done');
  }
}

declare const rxTestScheduler: TestScheduler;
