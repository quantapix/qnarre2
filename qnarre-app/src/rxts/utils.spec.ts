import {OutOfRangeError} from 'rxjs';

/** @test {OutOfRangeError} */
describe('OutOfRangeError', () => {
  const error = new OutOfRangeError();
  it('Should have a name', () => {
    expect(error.name).to.be.equal('OutOfRangeError');
  });
  it('Should have a message', () => {
    expect(error.message).to.be.equal('argument out of range');
  });
});
import {EmptyError} from 'rxjs';

/** @test {EmptyError} */
describe('EmptyError', () => {
  const error = new EmptyError();
  it('Should have a name', () => {
    expect(error.name).to.be.equal('EmptyError');
  });
  it('Should have a message', () => {
    expect(error.message).to.be.equal('no elements in sequence');
  });
});
// TODO: import was changed due to the fact that at startup the test referred to rxjs from node_modules
import {Immediate, TestTools} from '../../util/Immediate';

describe('Immediate', () => {
  it('should schedule on the next microtask', done => {
    const results: number[] = [];
    results.push(1);
    setTimeout(() => results.push(5));
    Immediate.setImmediate(() => results.push(3));
    results.push(2);
    Promise.resolve().then(() => results.push(4));

    setTimeout(() => {
      expect(results).to.deep.equal([1, 2, 3, 4, 5]);
      done();
    });
  });

  it('should cancel the task with clearImmediate', done => {
    const results: number[] = [];
    results.push(1);
    setTimeout(() => results.push(5));
    const handle = Immediate.setImmediate(() => results.push(3));
    Immediate.clearImmediate(handle);
    results.push(2);
    Promise.resolve().then(() => results.push(4));

    setTimeout(() => {
      expect(results).to.deep.equal([1, 2, 4, 5]);
      done();
    });
  });

  it('should clear the task after execution', done => {
    const results: number[] = [];
    Immediate.setImmediate(() => results.push(1));
    Immediate.setImmediate(() => results.push(2));

    setTimeout(() => {
      const number = TestTools.pending();
      expect(number).to.equal(0);
      done();
    });
  });
});
import {isNumeric} from 'rxjs/internal/util/isNumeric';

/** @test {isNumeric} */
describe('isNumeric', () => {
  it('should cover the following numeric scenario', () => {
    expect(isNumeric(' ')).to.be.false;
    expect(isNumeric('\n')).to.be.false;
    expect(isNumeric('\t')).to.be.false;

    expect(isNumeric('0')).to.be.true;
    expect(isNumeric(0)).to.be.true;
    expect(isNumeric(-1)).to.be.true;
    expect(isNumeric(-1.5)).to.be.true;
    expect(isNumeric(6e6)).to.be.true;
    expect(isNumeric('6e6')).to.be.true;
  });
});
import {UnsubscribedError} from 'rxjs';

/** @test {UnsubscribedError} */
describe('UnsubscribedError', () => {
  const error = new UnsubscribedError();
  it('Should have a name', () => {
    expect(error.name).to.be.equal('UnsubscribedError');
  });
  it('Should have a message', () => {
    expect(error.message).to.be.equal('object unsubscribed');
  });
});
import {TimeoutError} from 'rxjs';

/** @test {TimeoutError} */
describe('TimeoutError', () => {
  const error = new TimeoutError();
  it('Should have a name', () => {
    expect(error.name).to.be.equal('TimeoutError');
  });
  it('Should have a message', () => {
    expect(error.message).to.be.equal('Timeout has occurred');
  });
});
import {UnsubscribeError, Observable, timer, merge} from 'rxjs';

/** @test {UnsubscribeError} */
describe('UnsubscribeError', () => {
  it('should create a message that is a clear indication of its internal errors', () => {
    const err1 = new Error('Swiss cheese tastes amazing but smells like socks');
    const err2 = new Error('User too big to fit in tiny European elevator');
    const source1 = new Observable(() => () => {
      throw err1;
    });
    const source2 = timer(1000);
    const source3 = new Observable(() => () => {
      throw err2;
    });
    const source = merge(source1, source2, source3);

    const subscription = source.subscribe();

    try {
      subscription.unsubscribe();
    } catch (err) {
      expect(err instanceof UnsubscribeError).to.equal(true);
      expect(err.errors).to.deep.equal([err1, err2]);
      expect(err.name).to.equal('UnsubscribeError');
    }
  });
});
import {noop, Subject, Subscriber} from 'rxjs';
import {canReportError} from 'rxjs/internal/util/canReportError';

describe('canReportError', () => {
  it('should report errors to an observer if possible', () => {
    const subscriber = new Subscriber<{}>(noop, noop);
    expect(canReportError(subscriber)).to.be.true;
  });

  it('should not report errors to a stopped observer', () => {
    const subscriber = new Subscriber<{}>(noop, noop);
    subscriber.error(new Error('kaboom'));
    expect(canReportError(subscriber)).to.be.false;
  });

  it('should not report errors to a closed subject', () => {
    const subject = new Subject<{}>();
    subject.unsubscribe();
    expect(canReportError(subject)).to.be.false;
  });

  it('should not report errors an observer with a stopped destination', () => {
    const destination = new Subscriber<{}>(noop, noop);
    const subscriber = new Subscriber<{}>(destination);
    destination.error(new Error('kaboom'));
    expect(canReportError(subscriber)).to.be.false;
  });
});
import {Observable, isSource} from 'rxjs';

describe('isSource', () => {
  it('should return true for RxJS Observable', () => {
    const o = new Observable<any>();
    expect(isSource(o)).to.be.true;
  });

  it('should return true for an observable that comes from another RxJS 5+ library', () => {
    const o: any = {
      lift() {
        /* noop */
      },
      subscribe() {
        /* noop */
      }
    };

    expect(isSource(o)).to.be.true;
  });

  it('should NOT return true for any old subscribable', () => {
    const o: any = {
      subscribe() {
        /* noop */
      }
    };

    expect(isSource(o)).to.be.false;
  });

  it('should return false for null', () => {
    expect(isSource(null)).to.be.false;
  });

  it('should return false for a number', () => {
    expect(isSource(1)).to.be.false;
  });
});
import {of} from 'rxjs';
import {isPromise} from 'rxjs/internal/util/isPromise';

describe('isPromise', () => {
  it('should return true for new Promise', () => {
    const o = new Promise<any>(() => null);
    expect(isPromise(o)).to.be.true;
  });

  it('should return true for a Promise that comes from an Observable', () => {
    const o: any = of(null).toPromise();
    expect(isPromise(o)).to.be.true;
  });

  it('should NOT return true for any Observable', () => {
    const o: any = of(null);

    expect(isPromise(o)).to.be.false;
  });

  it('should return false for null', () => {
    expect(isPromise(null)).to.be.false;
  });

  it('should return false for undefined', () => {
    expect(isPromise(undefined)).to.be.false;
  });

  it('should return false for a number', () => {
    expect(isPromise(1)).to.be.false;
  });

  it('should return false for a string', () => {
    expect(isPromise('1')).to.be.false;
  });
});
import {pipe} from 'rxjs';

describe('pipe', () => {
  it('should exist', () => {
    expect(pipe).to.be.a('function');
  });

  it('should pipe two functions together', () => {
    const a = (x: number) => x + x;
    const b = (x: number) => x - 1;

    const c = pipe(a, b);
    expect(c).to.be.a('function');
    expect(c(1)).to.equal(1);
    expect(c(10)).to.equal(19);
  });

  it('should return the same function if only one is passed', () => {
    const a = <T>(x: T) => x;
    const c = pipe(a);

    expect(c).to.equal(a);
  });

  it('should return the identity if not passed any functions', () => {
    const c = pipe();

    expect(c('whatever')).to.equal('whatever');
    const someObj = {};
    expect(c(someObj)).to.equal(someObj);
  });
});

import {ReactorSubscriber} from 'rxjs/internal/ReactorSubscriber';
import {subscribeToResult} from 'rxjs/internal/util/subscribeToResult';
import {iterator} from 'rxjs/internal/symbol/iterator';
import {observable as $$symbolObservable} from 'rxjs/internal/symbol/observable';
import {of, range, throwError} from 'rxjs';

describe('subscribeToResult', () => {
  it('should synchronously complete when subscribed to scalarObservable', () => {
    const result = of(42);
    let expected: number;
    const subscriber = new ReactorSubscriber<number, number>(
      x => (expected = x)
    );

    const subscription = subscribeToResult(subscriber, result);

    expect(expected!).to.be.equal(42);
    expect(subscription!.closed).to.be.true;
  });

  it('should subscribe to observables that are an instanceof Observable', done => {
    const expected = [1, 2, 3];
    const result = range(1, 3);

    const subscriber = new ReactorSubscriber<number, number>(
      x => {
        expect(expected.shift()).to.be.equal(x);
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected).to.be.empty;
        done();
      }
    );

    subscribeToResult(subscriber, result);
  });

  it('should emit error when observable emits error', done => {
    const result = throwError(new Error('error'));
    const subscriber = new ReactorSubscriber(
      x => {
        done(new Error('should not be called'));
      },
      err => {
        expect(err).to.be.an('error', 'error');
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );

    subscribeToResult(subscriber, result);
  });

  it('should subscribe to an array and emit synchronously', () => {
    const result = [1, 2, 3];
    const expected: number[] = [];

    const subscriber = new ReactorSubscriber<number, number>(x =>
      expected.push(x)
    );

    subscribeToResult(subscriber, result);

    expect(expected).to.be.deep.equal(result);
  });

  it('should subscribe to an array-like and emit synchronously', () => {
    const result = {0: 0, 1: 1, 2: 2, length: 3};
    const expected: number[] = [];

    const subscriber = new ReactorSubscriber<number, number>(x =>
      expected.push(x)
    );

    subscribeToResult(subscriber, result);

    expect(expected).to.be.deep.equal([0, 1, 2]);
  });

  it('should subscribe to a promise', done => {
    const result = Promise.resolve(42);

    const subscriber = new ReactorSubscriber<number, number>(
      x => {
        expect(x).to.be.equal(42);
      },
      () => {
        done(new Error('should not be called'));
      },
      done
    );

    subscribeToResult(subscriber, result);
  });

  it('should emits error when the promise rejects', done => {
    const result = Promise.reject(42);

    const subscriber = new ReactorSubscriber<number, number>(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.be.equal(42);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );

    subscribeToResult(subscriber, result);
  });

  it('should subscribe an iterable and emit results synchronously', () => {
    let expected: number;
    const iteratorResults = [{value: 42, done: false}, {done: true}];

    const iterable = {
      [iterator]: () => {
        return {
          next: () => {
            return iteratorResults.shift();
          }
        };
      }
    };

    const subscriber = new ReactorSubscriber((x: number) => (expected = x));

    subscribeToResult(subscriber, iterable);
    expect(expected!).to.be.equal(42);
  });

  it('should subscribe to to an object that implements Symbol.rxSource', done => {
    const observableSymbolObject = {[$$symbolObservable]: () => of(42)};

    const subscriber = new ReactorSubscriber(
      x => {
        expect(x).to.be.equal(42);
      },
      () => {
        done(new Error('should not be called'));
      },
      done
    );

    subscribeToResult(subscriber, observableSymbolObject);
  });

  it(
    'should throw an error if value returned by Symbol.rxSource call is not ' +
      'a valid observable',
    () => {
      const observableSymbolObject = {[$$symbolObservable]: () => ({})};

      const subscriber = new ReactorSubscriber(
        x => {
          throw new Error('should not be called');
        },
        x => {
          throw new Error('should not be called');
        },
        () => {
          throw new Error('should not be called');
        }
      );

      expect(() =>
        subscribeToResult(subscriber, observableSymbolObject)
      ).to.throw(
        TypeError,
        'Provided object does not correctly implement Symbol.rxSource'
      );
    }
  );

  it('should emit an error when trying to subscribe to an unknown type of object', () => {
    const subscriber = new ReactorSubscriber(
      x => {
        throw new Error('should not be called');
      },
      x => {
        throw new Error('should not be called');
      },
      () => {
        throw new Error('should not be called');
      }
    );

    expect(() => subscribeToResult(subscriber, {})).to.throw(
      TypeError,
      'You provided an invalid object where a stream was expected. You can provide an Observable, Promise, Array, or Iterable.'
    );
  });

  it('should emit an error when trying to subscribe to a non-object', () => {
    const subscriber = new ReactorSubscriber(
      x => {
        throw new Error('should not be called');
      },
      x => {
        throw new Error('should not be called');
      },
      () => {
        throw new Error('should not be called');
      }
    );

    expect(() => subscribeToResult(subscriber, null)).to.throw(
      TypeError,
      `You provided 'null' where a stream was expected. You can provide an Observable, Promise, Array, or Iterable.`
    );
  });
});
import {toSubscriber} from 'rxjs/internal/util/toSubscriber';

describe('toSubscriber', () => {
  it('should not be closed when other subscriber created with no arguments completes', () => {
    let sub1 = toSubscriber();
    let sub2 = toSubscriber();

    sub2.complete();

    expect(sub1.closed).to.be.false;
    expect(sub2.closed).to.be.true;
  });

  it('should not be closed when other subscriber created with same observer instance completes', () => {
    let observer = {
      next: function () {
        /*noop*/
      }
    };

    let sub1 = toSubscriber(observer);
    let sub2 = toSubscriber(observer);

    sub2.complete();

    expect(sub1.closed).to.be.false;
    expect(sub2.closed).to.be.true;
  });
});
