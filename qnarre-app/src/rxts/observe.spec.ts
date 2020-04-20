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

function err(): any {
  throw 'error';
}

describe('NEVER', () => {
  asDiagram('NEVER')('should create a cold observable that never emits', () => {
    const expected = '-';
    const e1 = NEVER;
    expectSource(e1).toBe(expected);
  });
  it('should not support any parameter', () => {
    const a = never(1); // $ExpectError
  });

  it('should infer never', () => {
    const a = never(); // $ExpectType Observable<never>
  });

  it('should return the same instance every time', () => {
    expect(NEVER).to.equal(NEVER);
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
