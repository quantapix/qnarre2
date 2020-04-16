import {animationFrameScheduler, Subscription} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions,
  time
} from '../helpers/marble-testing';

const animationFrame = animationFrameScheduler;

describe('Scheduler.animationFrame', () => {
  it('should exist', () => {
    expect(animationFrame).exist;
  });

  it('should act like the async scheduler if delay > 0', () => {
    let actionHappened = false;
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    animationFrame.schedule(() => {
      actionHappened = true;
    }, 50);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.true;
    sandbox.restore();
  });

  it('should cancel animationFrame actions when unsubscribed', () => {
    let actionHappened = false;
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    animationFrame
      .schedule(() => {
        actionHappened = true;
      }, 50)
      .unsubscribe();
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    sandbox.restore();
  });

  it('should schedule an action to happen later', (done: MochaDone) => {
    let actionHappened = false;
    animationFrame.schedule(() => {
      actionHappened = true;
      done();
    });
    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    }
  });

  it('should execute recursively scheduled actions in separate asynchronous contexts', (done: MochaDone) => {
    let syncExec1 = true;
    let syncExec2 = true;
    animationFrame.schedule(
      function (index) {
        if (index === 0) {
          this.schedule(1);
          animationFrame.schedule(() => {
            syncExec1 = false;
          });
        } else if (index === 1) {
          this.schedule(2);
          animationFrame.schedule(() => {
            syncExec2 = false;
          });
        } else if (index === 2) {
          this.schedule(3);
        } else if (index === 3) {
          if (!syncExec1 && !syncExec2) {
            done();
          } else {
            done(new Error('Execution happened synchronously.'));
          }
        }
      },
      0,
      0
    );
  });

  it('should cancel the animation frame if all scheduled actions unsubscribe before it executes', (done: MochaDone) => {
    let animationFrameExec1 = false;
    let animationFrameExec2 = false;
    const action1 = animationFrame.schedule(() => {
      animationFrameExec1 = true;
    });
    const action2 = animationFrame.schedule(() => {
      animationFrameExec2 = true;
    });
    expect(animationFrame.scheduled).to.exist;
    expect(animationFrame.actions.length).to.equal(2);
    action1.unsubscribe();
    action2.unsubscribe();
    expect(animationFrame.actions.length).to.equal(0);
    expect(animationFrame.scheduled).to.equal(undefined);
    animationFrame.schedule(() => {
      expect(animationFrameExec1).to.equal(false);
      expect(animationFrameExec2).to.equal(false);
      done();
    });
  });

  it('should execute the rest of the scheduled actions if the first action is canceled', (done: MochaDone) => {
    let actionHappened = false;
    let secondSubscription: Subscription | null = null;

    const firstSubscription = animationFrame.schedule(() => {
      actionHappened = true;
      if (secondSubscription) {
        secondSubscription.unsubscribe();
      }
      done(new Error('The first action should not have executed.'));
    });

    secondSubscription = animationFrame.schedule(() => {
      if (!actionHappened) {
        done();
      }
    });

    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    } else {
      firstSubscription.unsubscribe();
    }
  });
});

const asap = asapScheduler;

describe('Scheduler.asap', () => {
  it('should exist', () => {
    expect(asap).exist;
  });

  it('should act like the async scheduler if delay > 0', () => {
    let actionHappened = false;
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    asap.schedule(() => {
      actionHappened = true;
    }, 50);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.true;
    sandbox.restore();
  });

  it('should cancel asap actions when delay > 0', () => {
    let actionHappened = false;
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    asap
      .schedule(() => {
        actionHappened = true;
      }, 50)
      .unsubscribe();
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    sandbox.restore();
  });

  it('should reuse the interval for recursively scheduled actions with the same delay', () => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    // callThrough is missing from the declarations installed by the typings tool in stable
    const stubSetInterval = (<any>(
      sinon.stub(global, 'setInterval')
    )).callThrough();
    const period = 50;
    const state = {index: 0, period};
    type State = typeof state;
    function dispatch(this: SchedulerAction<State>, state: State): void {
      state.index += 1;
      if (state.index < 3) {
        this.schedule(state, state.period);
      }
    }
    asap.schedule(dispatch as any, period, state);
    expect(state).to.have.property('index', 0);
    expect(stubSetInterval).to.have.property('callCount', 1);
    fakeTimer.tick(period);
    expect(state).to.have.property('index', 1);
    expect(stubSetInterval).to.have.property('callCount', 1);
    fakeTimer.tick(period);
    expect(state).to.have.property('index', 2);
    expect(stubSetInterval).to.have.property('callCount', 1);
    stubSetInterval.restore();
    sandbox.restore();
  });

  it('should not reuse the interval for recursively scheduled actions with a different delay', () => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    // callThrough is missing from the declarations installed by the typings tool in stable
    const stubSetInterval = (<any>(
      sinon.stub(global, 'setInterval')
    )).callThrough();
    const period = 50;
    const state = {index: 0, period};
    type State = typeof state;
    function dispatch(this: SchedulerAction<State>, state: State): void {
      state.index += 1;
      state.period -= 1;
      if (state.index < 3) {
        this.schedule(state, state.period);
      }
    }
    asap.schedule(dispatch as any, period, state);
    expect(state).to.have.property('index', 0);
    expect(stubSetInterval).to.have.property('callCount', 1);
    fakeTimer.tick(period);
    expect(state).to.have.property('index', 1);
    expect(stubSetInterval).to.have.property('callCount', 2);
    fakeTimer.tick(period);
    expect(state).to.have.property('index', 2);
    expect(stubSetInterval).to.have.property('callCount', 3);
    stubSetInterval.restore();
    sandbox.restore();
  });

  it('should schedule an action to happen later', (done: MochaDone) => {
    let actionHappened = false;
    asap.schedule(() => {
      actionHappened = true;
      done();
    });
    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    }
  });

  it('should execute recursively scheduled actions in separate asynchronous contexts', (done: MochaDone) => {
    let syncExec1 = true;
    let syncExec2 = true;
    asap.schedule(
      function (index) {
        if (index === 0) {
          this.schedule(1);
          asap.schedule(() => {
            syncExec1 = false;
          });
        } else if (index === 1) {
          this.schedule(2);
          asap.schedule(() => {
            syncExec2 = false;
          });
        } else if (index === 2) {
          this.schedule(3);
        } else if (index === 3) {
          if (!syncExec1 && !syncExec2) {
            done();
          } else {
            done(new Error('Execution happened synchronously.'));
          }
        }
      },
      0,
      0
    );
  });

  it('should cancel the setImmediate if all scheduled actions unsubscribe before it executes', (done: MochaDone) => {
    let asapExec1 = false;
    let asapExec2 = false;
    const action1 = asap.schedule(() => {
      asapExec1 = true;
    });
    const action2 = asap.schedule(() => {
      asapExec2 = true;
    });
    expect(asap.scheduled).to.exist;
    expect(asap.actions.length).to.equal(2);
    action1.unsubscribe();
    action2.unsubscribe();
    expect(asap.actions.length).to.equal(0);
    expect(asap.scheduled).to.equal(undefined);
    asap.schedule(() => {
      expect(asapExec1).to.equal(false);
      expect(asapExec2).to.equal(false);
      done();
    });
  });

  it('should execute the rest of the scheduled actions if the first action is canceled', (done: MochaDone) => {
    let actionHappened = false;
    let secondSubscription: Subscription | null = null;

    const firstSubscription = asap.schedule(() => {
      actionHappened = true;
      if (secondSubscription) {
        secondSubscription.unsubscribe();
      }
      done(new Error('The first action should not have executed.'));
    });

    secondSubscription = asap.schedule(() => {
      if (!actionHappened) {
        done();
      }
    });

    if (actionHappened) {
      done(new Error('Scheduled action happened synchronously'));
    } else {
      firstSubscription.unsubscribe();
    }
  });
});

const queue = queueScheduler;

describe('Scheduler.queue', () => {
  it('should act like the async scheduler if delay > 0', () => {
    let actionHappened = false;
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();
    queue.schedule(() => {
      actionHappened = true;
    }, 50);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.false;
    fakeTimer.tick(25);
    expect(actionHappened).to.be.true;
    sandbox.restore();
  });

  it('should switch from synchronous to asynchronous at will', () => {
    const sandbox = sinon.createSandbox();
    const fakeTimer = sandbox.useFakeTimers();

    let asyncExec = false;
    let state: Array<number> = [];

    queue.schedule(
      function (index) {
        state.push(index!);
        if (index === 0) {
          this.schedule(1, 100);
        } else if (index === 1) {
          asyncExec = true;
          this.schedule(2, 0);
        }
      },
      0,
      0
    );

    expect(asyncExec).to.be.false;
    expect(state).to.be.deep.equal([0]);

    fakeTimer.tick(100);

    expect(asyncExec).to.be.true;
    expect(state).to.be.deep.equal([0, 1, 2]);

    sandbox.restore();
  });

  it('should unsubscribe the rest of the scheduled actions if an action throws an error', () => {
    const actions: Subscription[] = [];
    let action2Exec = false;
    let action3Exec = false;
    let errorValue = undefined;
    try {
      queue.schedule(() => {
        actions.push(
          queue.schedule(() => {
            throw new Error('oops');
          }),
          queue.schedule(() => {
            action2Exec = true;
          }),
          queue.schedule(() => {
            action3Exec = true;
          })
        );
      });
    } catch (e) {
      errorValue = e;
    }
    expect(actions.every(action => action.closed)).to.be.true;
    expect(action2Exec).to.be.false;
    expect(action3Exec).to.be.false;
    expect(errorValue).exist;
    expect(errorValue.message).to.equal('oops');
  });
});

describe('Scheduler.queue', () => {
  it('should schedule things recursively', () => {
    let call1 = false;
    let call2 = false;
    (queue as QueueScheduler).active = false;
    queue.schedule(() => {
      call1 = true;
      queue.schedule(() => {
        call2 = true;
      });
    });
    expect(call1).to.be.true;
    expect(call2).to.be.true;
  });

  it('should schedule things recursively via this.schedule', () => {
    let call1 = false;
    let call2 = false;
    (queue as QueueScheduler).active = false;
    queue.schedule(
      function (state) {
        call1 = state!.call1;
        call2 = state!.call2;
        if (!call2) {
          this.schedule({call1: true, call2: true});
        }
      },
      0,
      {call1: true, call2: false}
    );
    expect(call1).to.be.true;
    expect(call2).to.be.true;
  });

  it('should schedule things in the future too', (done: MochaDone) => {
    let called = false;
    queue.schedule(() => {
      called = true;
    }, 60);

    setTimeout(() => {
      expect(called).to.be.false;
    }, 20);

    setTimeout(() => {
      expect(called).to.be.true;
      done();
    }, 100);
  });

  it('should be reusable after an error is thrown during execution', (done: MochaDone) => {
    const results: number[] = [];

    expect(() => {
      queue.schedule(() => {
        results.push(1);
      });

      queue.schedule(() => {
        throw new Error('bad');
      });
    }).to.throw(Error, 'bad');

    setTimeout(() => {
      queue.schedule(() => {
        results.push(2);
        done();
      });
    }, 0);
  });
});

declare const rxTestScheduler: TestScheduler;

describe('TestScheduler', () => {
  it('should exist', () => {
    expect(TestScheduler).exist;
    expect(TestScheduler).to.be.a('function');
  });

  it('should have frameTimeFactor set initially', () => {
    expect(TestScheduler.frameTimeFactor).to.equal(10);
  });

  describe('parseMarbles()', () => {
    it('should parse a marble string into a series of notifications and types', () => {
      const result = TestScheduler.parseMarbles('-------a---b---|', {
        a: 'A',
        b: 'B'
      });
      expect(result).deep.equal([
        {frame: 70, notification: Notification.createNext('A')},
        {frame: 110, notification: Notification.createNext('B')},
        {frame: 150, notification: Notification.createDone()}
      ]);
    });

    it('should parse a marble string, allowing spaces too', () => {
      const result = TestScheduler.parseMarbles('--a--b--|   ', {
        a: 'A',
        b: 'B'
      });
      expect(result).deep.equal([
        {frame: 20, notification: Notification.createNext('A')},
        {frame: 50, notification: Notification.createNext('B')},
        {frame: 80, notification: Notification.createDone()}
      ]);
    });

    it('should parse a marble string with a subscription point', () => {
      const result = TestScheduler.parseMarbles('---^---a---b---|', {
        a: 'A',
        b: 'B'
      });
      expect(result).deep.equal([
        {frame: 40, notification: Notification.createNext('A')},
        {frame: 80, notification: Notification.createNext('B')},
        {frame: 120, notification: Notification.createDone()}
      ]);
    });

    it('should parse a marble string with an error', () => {
      const result = TestScheduler.parseMarbles(
        '-------a---b---#',
        {a: 'A', b: 'B'},
        'omg error!'
      );
      expect(result).deep.equal([
        {frame: 70, notification: Notification.createNext('A')},
        {frame: 110, notification: Notification.createNext('B')},
        {frame: 150, notification: Notification.createFail('omg error!')}
      ]);
    });

    it('should default in the letter for the value if no value hash was passed', () => {
      const result = TestScheduler.parseMarbles('--a--b--c--');
      expect(result).deep.equal([
        {frame: 20, notification: Notification.createNext('a')},
        {frame: 50, notification: Notification.createNext('b')},
        {frame: 80, notification: Notification.createNext('c')}
      ]);
    });

    it('should handle grouped values', () => {
      const result = TestScheduler.parseMarbles('---(abc)---');
      expect(result).deep.equal([
        {frame: 30, notification: Notification.createNext('a')},
        {frame: 30, notification: Notification.createNext('b')},
        {frame: 30, notification: Notification.createNext('c')}
      ]);
    });

    it('should ignore whitespace when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarbles(
        '  -a - b -    c |       ',
        {a: 'A', b: 'B', c: 'C'},
        undefined,
        undefined,
        runMode
      );
      expect(result).deep.equal([
        {frame: 10, notification: Notification.createNext('A')},
        {frame: 30, notification: Notification.createNext('B')},
        {frame: 50, notification: Notification.createNext('C')},
        {frame: 60, notification: Notification.createDone()}
      ]);
    });

    it('should suppport time progression syntax when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarbles(
        '10.2ms a 1.2s b 1m c|',
        {a: 'A', b: 'B', c: 'C'},
        undefined,
        undefined,
        runMode
      );
      expect(result).deep.equal([
        {frame: 10.2, notification: Notification.createNext('A')},
        {
          frame: 10.2 + 10 + 1.2 * 1000,
          notification: Notification.createNext('B')
        },
        {
          frame: 10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60,
          notification: Notification.createNext('C')
        },
        {
          frame: 10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60 + 10,
          notification: Notification.createDone()
        }
      ]);
    });
  });

  describe('parseMarblesAsSubscriptions()', () => {
    it('should parse a subscription marble string into a subscriptionLog', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---^---!-');
      expect(result.subscribedFrame).to.equal(30);
      expect(result.unsubscribedFrame).to.equal(70);
    });

    it('should parse a subscription marble string with an unsubscription', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---^-');
      expect(result.subscribedFrame).to.equal(30);
      expect(result.unsubscribedFrame).to.equal(Number.POSITIVE_INFINITY);
    });

    it('should parse a subscription marble string with a synchronous unsubscription', () => {
      const result = TestScheduler.parseMarblesAsSubscriptions('---(^!)-');
      expect(result.subscribedFrame).to.equal(30);
      expect(result.unsubscribedFrame).to.equal(30);
    });

    it('should ignore whitespace when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarblesAsSubscriptions(
        '  - -  - -  ^ -   - !  -- -      ',
        runMode
      );
      expect(result.subscribedFrame).to.equal(40);
      expect(result.unsubscribedFrame).to.equal(70);
    });

    it('should suppport time progression syntax when runMode=true', () => {
      const runMode = true;
      const result = TestScheduler.parseMarblesAsSubscriptions(
        '10.2ms ^ 1.2s - 1m !',
        runMode
      );
      expect(result.subscribedFrame).to.equal(10.2);
      expect(result.unsubscribedFrame).to.equal(
        10.2 + 10 + 1.2 * 1000 + 10 + 1000 * 60
      );
    });
  });

  describe('createTime()', () => {
    it('should parse a simple time marble string to a number', () => {
      const scheduler = new TestScheduler(null!);
      const time = scheduler.createTime('-----|');
      expect(time).to.equal(50);
    });

    it('should throw if not given good marble input', () => {
      const scheduler = new TestScheduler(null!);
      expect(() => {
        scheduler.createTime('-a-b-#');
      }).to.throw();
    });
  });

  describe('createColdObservable()', () => {
    it('should create a cold observable', () => {
      const expected = ['A', 'B'];
      const scheduler = new TestScheduler(null!);
      const source = scheduler.createColdObservable('--a---b--|', {
        a: 'A',
        b: 'B'
      });
      expect(source).to.be.an.instanceOf(Observable);
      source.subscribe(x => {
        expect(x).to.equal(expected.shift());
      });
      scheduler.flush();
      expect(expected.length).to.equal(0);
    });
  });

  describe('createHotObservable()', () => {
    it('should create a hot observable', () => {
      const expected = ['A', 'B'];
      const scheduler = new TestScheduler(null!);
      const source = scheduler.createHotObservable('--a---b--|', {
        a: 'A',
        b: 'B'
      });
      expect(source).to.be.an.instanceof(Subject);
      source.subscribe(x => {
        expect(x).to.equal(expected.shift());
      });
      scheduler.flush();
      expect(expected.length).to.equal(0);
    });
  });

  describe('jasmine helpers', () => {
    describe('rxTestScheduler', () => {
      it('should exist', () => {
        expect(rxTestScheduler).to.be.an.instanceof(TestScheduler);
      });
    });

    describe('cold()', () => {
      it('should exist', () => {
        expect(cold).to.exist;
        expect(cold).to.be.a('function');
      });

      it('should create a cold observable', () => {
        const expected = [1, 2];
        const source = cold('-a-b-|', {a: 1, b: 2});
        source.subscribe(
          (x: number) => {
            expect(x).to.equal(expected.shift());
          },
          null,
          () => {
            expect(expected.length).to.equal(0);
          }
        );
        expectSource(source).toBe('-a-b-|', {a: 1, b: 2});
      });
    });

    describe('hot()', () => {
      it('should exist', () => {
        expect(hot).to.exist;
        expect(hot).to.be.a('function');
      });

      it('should create a hot observable', () => {
        const source = hot('---^-a-b-|', {a: 1, b: 2});
        expect(source).to.be.an.instanceOf(Subject);
        expectSource(source).toBe('--a-b-|', {a: 1, b: 2});
      });
    });

    describe('time()', () => {
      it('should exist', () => {
        expect(time).to.exist;
        expect(time).to.be.a('function');
      });

      it('should parse a simple time marble string to a number', () => {
        expect(time('-----|')).to.equal(50);
      });
    });

    describe('expectSource()', () => {
      it('should exist', () => {
        expect(expectSource).to.exist;
        expect(expectSource).to.be.a('function');
      });

      it('should return an object with a toBe function', () => {
        expect(expectSource(of(1)).toBe).to.be.a('function');
      });

      it('should append to flushTests array', () => {
        expectSource(EMPTY);
        expect((<any>rxTestScheduler).flushTests.length).to.equal(1);
      });

      it('should handle empty', () => {
        expectSource(EMPTY).toBe('|', {});
      });

      it('should handle never', () => {
        expectSource(NEVER).toBe('-', {});
        expectSource(NEVER).toBe('---', {});
      });

      it('should accept an unsubscription marble diagram', () => {
        const source = hot('---^-a-b-|');
        const unsubscribe = '---!';
        const expected = '--a';
        expectSource(source, unsubscribe).toBe(expected);
      });

      it('should accept a subscription marble diagram', () => {
        const source = hot('-a-b-c|');
        const subscribe = '---^';
        const expected = '---b-c|';
        expectSource(source, subscribe).toBe(expected);
      });
    });

    describe('expectSubscriptions()', () => {
      it('should exist', () => {
        expect(expectSubscriptions).to.exist;
        expect(expectSubscriptions).to.be.a('function');
      });

      it('should return an object with a toBe function', () => {
        expect(expectSubscriptions([]).toBe).to.be.a('function');
      });

      it('should append to flushTests array', () => {
        expectSubscriptions([]);
        expect((<any>rxTestScheduler).flushTests.length).to.equal(1);
      });

      it('should assert subscriptions of a cold observable', () => {
        const source = cold('---a---b-|');
        const subs = '^--------!';
        expectSubscriptions(source.subscriptions).toBe(subs);
        source.subscribe();
      });
    });

    describe('end-to-end helper tests', () => {
      it('should be awesome', () => {
        const values = {a: 1, b: 2};
        const myObservable = cold('---a---b--|', values);
        const subs = '^---------!';
        expectSource(myObservable).toBe('---a---b--|', values);
        expectSubscriptions(myObservable.subscriptions).toBe(subs);
      });

      it('should support testing metastreams', () => {
        const x = cold('-a-b|');
        const y = cold('-c-d|');
        const myObservable = hot('---x---y----|', {x: x, y: y});
        const expected = '---x---y----|';
        const expectedx = cold('-a-b|');
        const expectedy = cold('-c-d|');
        expectSource(myObservable).toBe(expected, {
          x: expectedx,
          y: expectedy
        });
      });
    });
  });

  describe('TestScheduler.run()', () => {
    const assertDeepEquals = (actual: any, expected: any) => {
      expect(actual).deep.equal(expected);
    };

    describe('marble diagrams', () => {
      it('should ignore whitespace', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
          const input = cold('  -a - b -    c |       ');
          const output = input.pipe(concatMap(d => of(d).pipe(delay(10))));
          const expected = '     -- 9ms a 9ms b 9ms (c|) ';

          expectSource(output).toBe(expected);
          expectSubscriptions(input.subscriptions).toBe('  ^- - - - - !');
        });
      });

      it('should support time progression syntax', () => {
        const testScheduler = new TestScheduler(assertDeepEquals);

        testScheduler.run(
          ({cold, hot, flush, expectSource, expectSubscriptions}) => {
            const output = cold('10.2ms a 1.2s b 1m c|');
            const expected = '   10.2ms a 1.2s b 1m c|';

            expectSource(output).toBe(expected);
          }
        );
      });
    });

    it('should provide the correct helpers', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(
        ({cold, hot, flush, expectSource, expectSubscriptions}) => {
          expect(cold).to.be.a('function');
          expect(hot).to.be.a('function');
          expect(flush).to.be.a('function');
          expect(expectSource).to.be.a('function');
          expect(expectSubscriptions).to.be.a('function');

          const obs1 = cold('-a-c-e|');
          const obs2 = hot(' ^-b-d-f|');
          const output = merge(obs1, obs2);
          const expected = ' -abcdef|';

          expectSource(output).toBe(expected);
          expectSubscriptions(obs1.subscriptions).toBe('^-----!');
          expectSubscriptions(obs2.subscriptions).toBe('^------!');
        }
      );
    });

    it('should have each frame represent a single virtual millisecond', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({cold, expectSource}) => {
        const output = cold('-a-b-c--------|').pipe(debounceTime(5));
        const expected = '   ------ 4ms c---|';
        expectSource(output).toBe(expected);
      });
    });

    it('should have no maximum frame count', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({cold, expectSource}) => {
        const output = cold('-a|').pipe(delay(1000 * 10));
        const expected = '   - 10s (a|)';
        expectSource(output).toBe(expected);
      });
    });

    it('should make operators that use AsyncScheduler automatically use TestScheduler for actual scheduling', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({cold, expectSource}) => {
        const output = cold('-a-b-c--------|').pipe(debounceTime(5));
        const expected = '   ----------c---|';
        expectSource(output).toBe(expected);
      });
    });

    it('should flush automatically', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).deep.equal(expected);
      });
      testScheduler.run(({cold, expectSource}) => {
        const output = cold('-a-b-c|').pipe(
          concatMap(d => of(d).pipe(delay(10)))
        );
        const expected = '   -- 9ms a 9ms b 9ms (c|)';
        expectSource(output).toBe(expected);

        expect(testScheduler['flushTests'].length).to.equal(1);
        expect(testScheduler['actions'].length).to.equal(1);
      });

      expect(testScheduler['flushTests'].length).to.equal(0);
      expect(testScheduler['actions'].length).to.equal(0);
    });

    it('should support explicit flushing', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler.run(({cold, expectSource, flush}) => {
        const output = cold('-a-b-c|').pipe(
          concatMap(d => of(d).pipe(delay(10)))
        );
        const expected = '   -- 9ms a 9ms b 9ms (c|)';
        expectSource(output).toBe(expected);

        expect(testScheduler['flushTests'].length).to.equal(1);
        expect(testScheduler['actions'].length).to.equal(1);

        flush();

        expect(testScheduler['flushTests'].length).to.equal(0);
        expect(testScheduler['actions'].length).to.equal(0);
      });

      expect(testScheduler['flushTests'].length).to.equal(0);
      expect(testScheduler['actions'].length).to.equal(0);
    });

    it('should pass-through return values, e.g. Promises', done => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      testScheduler
        .run(() => {
          return Promise.resolve('foo');
        })
        .then(value => {
          expect(value).to.equal('foo');
          done();
        });
    });

    it('should restore changes upon thrown errors', () => {
      const testScheduler = new TestScheduler(assertDeepEquals);

      const frameTimeFactor = TestScheduler['frameTimeFactor'];
      const maxFrames = testScheduler.maxFrames;
      const runMode = testScheduler['runMode'];
      const delegate = AsyncScheduler.delegate;

      try {
        testScheduler.run(() => {
          throw new Error('kaboom!');
        });
      } catch {
        /* empty */
      }

      expect(TestScheduler['frameTimeFactor']).to.equal(frameTimeFactor);
      expect(testScheduler.maxFrames).to.equal(maxFrames);
      expect(testScheduler['runMode']).to.equal(runMode);
      expect(AsyncScheduler.delegate).to.equal(delegate);
    });

    it('should flush expectations correctly', () => {
      expect(() => {
        const testScheduler = new TestScheduler(assertDeepEquals);
        testScheduler.run(({cold, expectSource, flush}) => {
          expectSource(cold('-x')).toBe('-x');
          expectSource(cold('-y')).toBe('-y');
          const expectation = expectSource(cold('-z'));
          flush();
          expectation.toBe('-q');
        });
      }).to.throw();
    });
  });
});

describe('VirtualTimeScheduler', () => {
  it('should exist', () => {
    expect(VirtualTimeScheduler).exist;
    expect(VirtualTimeScheduler).to.be.a('function');
  });

  it('should schedule things in order when flushed if each this is scheduled synchrously', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 0, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, 0, 4);
    v.schedule(invoke, 0, 5);

    v.flush();

    expect(invoked).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it('should schedule things in order when flushed if each this is scheduled at random', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 100, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, 500, 4);
    v.schedule(invoke, 0, 5);
    v.schedule(invoke, 100, 6);

    v.flush();

    expect(invoked).to.deep.equal([1, 3, 5, 2, 6, 4]);
  });

  it('should schedule things in order when there are negative delays', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 100, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, -2, 4);
    v.schedule(invoke, 0, 5);
    v.schedule(invoke, -10, 6);

    v.flush();

    expect(invoked).to.deep.equal([6, 4, 1, 3, 5, 2]);
  });

  it('should support recursive scheduling', () => {
    const v = new VirtualTimeScheduler();
    let count = 0;
    const expected = [100, 200, 300];

    v.schedule<string>(
      function (this: SchedulerAction<string>, state?: string) {
        if (++count === 3) {
          return;
        }
        const virtualAction = this as VirtualAction<string>;
        expect(virtualAction.delay).to.equal(expected.shift());
        this.schedule(state, virtualAction.delay);
      },
      100,
      'test'
    );

    v.flush();
    expect(count).to.equal(3);
  });

  it('should not execute virtual actions that have been rescheduled before flush', () => {
    const v = new VirtualTimeScheduler();
    const messages: string[] = [];

    const action: VirtualAction<string> = <VirtualAction<string>>(
      v.schedule(state => messages.push(state!), 10, 'first message')
    );

    action.schedule('second message', 10);
    v.flush();

    expect(messages).to.deep.equal(['second message']);
  });

  it('should execute only those virtual actions that fall into the maxFrames timespan', function () {
    const MAX_FRAMES = 50;
    const v = new VirtualTimeScheduler(VirtualAction, MAX_FRAMES);
    const messages: string[] = [
      'first message',
      'second message',
      'third message'
    ];

    const actualMessages: string[] = [];

    messages.forEach((message, index) => {
      v.schedule(
        state => actualMessages.push(state!),
        index * MAX_FRAMES,
        message
      );
    });

    v.flush();

    expect(actualMessages).to.deep.equal(['first message', 'second message']);
    expect(v.actions.map(a => a.state)).to.deep.equal(['third message']);
  });

  it('should pick up actions execution where it left off after reaching previous maxFrames limit', function () {
    const MAX_FRAMES = 50;
    const v = new VirtualTimeScheduler(VirtualAction, MAX_FRAMES);
    const messages: string[] = [
      'first message',
      'second message',
      'third message'
    ];

    const actualMessages: string[] = [];

    messages.forEach((message, index) => {
      v.schedule(
        state => actualMessages.push(state!),
        index * MAX_FRAMES,
        message
      );
    });

    v.flush();
    v.maxFrames = 2 * MAX_FRAMES;
    v.flush();

    expect(actualMessages).to.deep.equal(messages);
  });
});

describe('scheduled', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  it('should schedule a sync observable', () => {
    const input = of('a', 'b', 'c');
    testScheduler.run(({expectSource}) => {
      expectSource(scheduled(input, testScheduler)).toBe('(abc|)');
    });
  });

  it('should schedule an array', () => {
    const input = ['a', 'b', 'c'];
    testScheduler.run(({expectSource}) => {
      expectSource(scheduled(input, testScheduler)).toBe('(abc|)');
    });
  });

  it('should schedule an iterable', () => {
    const input = 'abc'; // strings are iterables
    testScheduler.run(({expectSource}) => {
      expectSource(scheduled(input, testScheduler)).toBe('(abc|)');
    });
  });

  it('should schedule an observable-like', () => {
    const input = lowerCaseO('a', 'b', 'c'); // strings are iterables
    testScheduler.run(({expectSource}) => {
      expectSource(scheduled(input, testScheduler)).toBe('(abc|)');
    });
  });

  it('should schedule a promise', done => {
    const results: any[] = [];
    const input = Promise.resolve('x'); // strings are iterables
    scheduled(input, testScheduler).subscribe({
      next(value) {
        results.push(value);
      },
      complete() {
        results.push('done');
      }
    });

    expect(results).to.deep.equal([]);

    // Promises force async, so we can't schedule synchronously, no matter what.
    testScheduler.flush();
    expect(results).to.deep.equal([]);

    Promise.resolve().then(() => {
      // NOW it should work, as the other promise should have resolved.
      testScheduler.flush();
      expect(results).to.deep.equal(['x', 'done']);
      done();
    });
  });
});
