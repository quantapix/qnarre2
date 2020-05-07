describe('bindCB', () => {
  const f0 = (cb: () => any) => {
    cb();
  };

  const f1 = (cb: (res1: A) => any) => {
    cb(a);
  };

  const f2 = (cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const f3 = (cb: (res1: A, res2: B, res3: C) => any) => {
    cb(a, b, c);
  };

  const f4 = (cb: (res1: A, res2: B, res3: C, res4: D) => any) => {
    cb(a, b, c, d);
  };

  it('should enforce function parameter', () => {
    const o = bindCB(); // $ExpectError
  });

  it('should accept cb 0 param', () => {
    const o = bindCB(f0); // $ExpectType () => Observable<void>
  });

  it('should accept cb 1 param', () => {
    const o = bindCB(f1); // $ExpectType () => Observable<A>
  });

  it('should accept cb 2 params', () => {
    const o = bindCB(f2); // $ExpectType () => Observable<[A, B]>
  });

  it('should accept cb 3 params', () => {
    const o = bindCB(f3); // $ExpectType () => Observable<[A, B, C]>
  });

  it('should accept cb 4 params', () => {
    const o = bindCB(f4); // $ExpectType () => Observable<any[]>
  });

  const fn: Function = () => {};

  it('should accept Function', () => {
    const o = bindCB(fn); // $ExpectType (...args: any[]) => Observable<any>
  });

  describe('callbackFunc and 1 args', () => {
    const fa1cb0 = (e: E, cb: () => any) => {
      cb();
    };

    const fa1cb1 = (e: E, cb: (res1: A) => any) => {
      cb(a);
    };

    const fa1cb2 = (e: E, cb: (res1: A, res2: B) => any) => {
      cb(a, b);
    };

    const fa1cb3 = (e: E, cb: (res1: A, res2: B, res3: C) => any) => {
      cb(a, b, c);
    };

    const fa1cb4 = (e: E, cb: (res1: A, res2: B, res3: C, res4: D) => any) => {
      cb(a, b, c, d);
    };

    it('should accept cb 0 param', () => {
      const o = bindCB(fa1cb0); // $ExpectType (arg1: E) => Observable<void>
    });

    it('should accept cb 1 param', () => {
      const o = bindCB(fa1cb1); // $ExpectType (arg1: E) => Observable<A>
    });

    it('should accept cb 2 param', () => {
      const o = bindCB(fa1cb2); // $ExpectType (arg1: E) => Observable<[A, B]>
    });

    it('should accept cb 3 param', () => {
      const o = bindCB(fa1cb3); // $ExpectType (arg1: E) => Observable<[A, B, C]>
    });

    it('should accept cb 4 param', () => {
      const o = bindCB(fa1cb4); // $ExpectType (arg1: E) => Observable<any[]>
    });
  });

  describe('callbackFunc and 2 args', () => {
    const fa2cb0 = (e: E, f: F, cb: () => any) => {
      cb();
    };

    const fa2cb1 = (e: E, f: F, cb: (res1: A) => any) => {
      cb(a);
    };

    const fa2cb2 = (e: E, f: F, cb: (res1: A, res2: B) => any) => {
      cb(a, b);
    };

    const fa2cb3 = (e: E, f: F, cb: (res1: A, res2: B, res3: C) => any) => {
      cb(a, b, c);
    };

    const fa2cb4 = (e: E, f: F, cb: (res1: A, res2: B, res3: C, res4: D) => any) => {
      cb(a, b, c, d);
    };

    it('should accept cb 0 param', () => {
      const o = bindCB(fa2cb0); // $ExpectType (arg1: E, arg2: F) => Observable<void>
    });

    it('should accept cb 1 param', () => {
      const o = bindCB(fa2cb1); // $ExpectType (arg1: E, arg2: F) => Observable<A>
    });

    it('should accept cb 2 param', () => {
      const o = bindCB(fa2cb2); // $ExpectType (arg1: E, arg2: F) => Observable<[A, B]>
    });

    it('should accept cb 3 param', () => {
      const o = bindCB(fa2cb3); // $ExpectType (arg1: E, arg2: F) => Observable<[A, B, C]>
    });

    it('should accept cb 4 param', () => {
      const o = bindCB(fa2cb4); // $ExpectType (arg1: E, arg2: F) => Observable<any[]>
    });
  });

  describe('callbackFunc and 3 args', () => {
    const fa3cb0 = (e: E, f: F, g: G, cb: () => any) => {
      cb();
    };

    const fa3cb1 = (e: E, f: F, g: G, cb: (res1: A) => any) => {
      cb(a);
    };

    const fa3cb2 = (e: E, f: F, g: G, cb: (res1: A, res2: B) => any) => {
      cb(a, b);
    };

    const fa3cb3 = (e: E, f: F, g: G, cb: (res1: A, res2: B, res3: C) => any) => {
      cb(a, b, c);
    };

    const fa3cb4 = (
      e: E,
      f: F,
      g: G,
      cb: (res1: A, res2: B, res3: C, res4: D) => any
    ) => {
      cb(a, b, c, d);
    };

    it('should accept cb 0 param', () => {
      const o = bindCB(fa3cb0); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<void>
    });

    it('should accept cb 1 param', () => {
      const o = bindCB(fa3cb1); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<A>
    });

    it('should accept cb 2 params', () => {
      const o = bindCB(fa3cb2); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<[A, B]>
    });

    it('should accept cb 3 params', () => {
      const o = bindCB(fa3cb3); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<[A, B, C]>
    });

    it('should accept cb 4 params', () => {
      const o = bindCB(fa3cb4); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<any[]>
    });
  });

  describe('callbackFunc and 4 args', () => {
    const fa4cb0 = (e: E, f: F, g: G, a: A, cb: () => any) => {
      cb();
    };

    const fa4cb1 = (e: E, f: F, g: G, a: A, cb: (res1: A) => any) => {
      cb(a);
    };

    const fa4cb2 = (e: E, f: F, g: G, a: A, cb: (res1: A, res2: B) => any) => {
      cb(a, b);
    };

    const fa4cb3 = (e: E, f: F, g: G, a: A, cb: (res1: A, res2: B, res3: C) => any) => {
      cb(a, b, c);
    };

    const fa4cb4 = (
      e: E,
      f: F,
      g: G,
      a: A,
      cb: (res1: A, res2: B, res3: C, res4: D) => any
    ) => {
      cb(a, b, c, d);
    };

    it('should accept cb 0 param', () => {
      const o = bindCB(fa4cb0); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<void>
    });

    it('should accept cb 0 param', () => {
      const o = bindCB(fa4cb1); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<A>
    });

    it('should accept cb 2 params', () => {
      const o = bindCB(fa4cb2); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<[A, B]>
    });

    it('should accept cb 3 params', () => {
      const o = bindCB(fa4cb3); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<[A, B, C]>
    });

    it('should accept cb 4 params', () => {
      const o = bindCB(fa4cb4); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<any[]>
    });
  });

  describe('callbackFunc and 5 args', () => {
    const fa5cb0 = (e: E, f: F, g: G, a: A, b: B, cb: () => any) => {
      cb();
    };

    const fa5cb1 = (e: E, f: F, g: G, a: A, b: B, cb: (res1: A) => any) => {
      cb(a);
    };

    const fa5cb2 = (e: E, f: F, g: G, a: A, b: B, cb: (res1: A, res2: B) => any) => {
      cb(a, b);
    };

    const fa5cb3 = (
      e: E,
      f: F,
      g: G,
      a: A,
      b: B,
      cb: (res1: A, res2: B, res3: C) => any
    ) => {
      cb(a, b, c);
    };

    const fa5cb4 = (
      e: E,
      f: F,
      g: G,
      a: A,
      b: B,
      cb: (res1: A, res2: B, res3: C, res4: D) => any
    ) => {
      cb(a, b, c, d);
    };

    it('should accept cb 0 param', () => {
      const o = bindCB(fa5cb0); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<void>
    });

    it('should accept cb 0 param', () => {
      const o = bindCB(fa5cb1); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<A>
    });

    it('should accept cb 2 params', () => {
      const o = bindCB(fa5cb2); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<[A, B]>
    });

    it('should accept cb 3 params', () => {
      const o = bindCB(fa5cb3); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<[A, B, C]>
    });

    it('should accept cb 4 params', () => {
      const o = bindCB(fa5cb4); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<any[]>
    });
  });

  describe('when not scheduled', () => {
    it('should emit undefined from a callback without arguments', () => {
      function callback(cb: Function) {
        cb();
      }
      const boundCallback = bindCB(callback);
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

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should still support deprecated resultSelector', () => {
      function callback(datum: number, cb: Function) {
        cb(datum);
      }

      const boundCallback = bindCB(callback, (datum: any) => datum + 1);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next(value) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

      expect(results).toEqual([43, 'done']);
    });

    it('should still support deprecated resultSelector if its void', () => {
      function callback(datum: number, cb: Function) {
        cb(datum);
      }

      const boundCallback = bindCB(callback, void 0);

      const results: Array<string | number> = [];

      boundCallback(42).subscribe({
        next(value: any) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

      expect(results).toEqual([42, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCB(callback);
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

      expect(results).toEqual([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(this: any, cb: Function) {
        cb(this.datum);
      }

      const boundCallback = bindCB<number>(callback);
      const results: Array<string | number> = [];

      boundCallback.apply({datum: 5}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      expect(results).toEqual([5, 'done']);
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
      const subscription = bindCB(callback)(42).subscribe(nextSpy, throwSpy, completeSpy);
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
      const boundCallback = bindCB(callback, rxTestScheduler);
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

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (result: number) => void) {
        cb(datum);
      }
      const boundCallback = bindCB(callback, rxTestScheduler);
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

      expect(results).toEqual([42, 'done']);
    });

    it('should set callback function context to context of returned function', () => {
      function callback(this: {datum: number}, cb: Function) {
        cb(this.datum);
      }

      const boundCallback = bindCB<number>(callback, rxTestScheduler);
      const results: Array<string | number> = [];

      boundCallback.apply({datum: 5}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      rxTestScheduler.flush();

      expect(results).toEqual([5, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: Function): never {
        throw expected;
      }
      const boundCallback = bindCB(callback, rxTestScheduler);

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
      const boundCallback = bindCB(callback, rxTestScheduler);
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

      expect(results).toEqual([[42, 1, 2, 3], 'done']);
    });

    it('should cache value for next subscription and not call callbackFunc again', () => {
      let calls = 0;
      function callback(datum: number, cb: (x: number) => void) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCB(callback, rxTestScheduler);
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
      expect(results1).toEqual([42, 'done']);
      expect(results2).toEqual([42, 'done']);
    });

    it('should not even call the callbackFn if immediately unsubscribed', () => {
      let calls = 0;
      function callback(datum: number, cb: Function) {
        calls++;
        cb(datum);
      }
      const boundCallback = bindCB(callback, rxTestScheduler);
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
      bindCB(badFunction)().subscribe();
      expect(consoleStub).to.have.property('called', true);
    } finally {
      consoleStub.restore();
    }
  });
});

describe('bindNodeCB', () => {
  describe('when not scheduled', () => {
    it('should emit undefined when callback is called without success arguments', () => {
      function callback(cb: Function) {
        cb(null);
      }

      const boundCallback = bindNodeCB(callback);
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

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should support the deprecated resultSelector', () => {
      function callback(cb: (err: any, n: number) => any) {
        cb(null, 42);
      }

      const boundCallback = bindNodeCB(callback, (x: number) => x + 1);
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

      expect(results).toEqual([43, 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(null, datum);
      }
      const boundCallback = bindNodeCB(callback);
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

      expect(results).toEqual([42, 'done']);
    });

    it('should set context of callback to context of boundCallback', () => {
      function callback(this: {datum: number}, cb: (err: any, n: number) => void) {
        cb(null, this.datum);
      }
      const boundCallback = bindNodeCB(callback);
      const results: Array<number | string> = [];

      boundCallback.call({datum: 42}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      expect(results).toEqual([42, 'done']);
    });

    it('should raise error from callback', () => {
      const error = new Error();

      function callback(cb: Function) {
        cb(error);
      }

      const boundCallback = bindNodeCB(callback);
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

      expect(results).toEqual([error]);
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
      const subscription = bindNodeCB(callback)(42).subscribe(
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

      const boundCallback = bindNodeCB(callback, rxTestScheduler);
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

      expect(results).toEqual(['undefined', 'done']);
    });

    it('should emit one value from a callback', () => {
      function callback(datum: number, cb: (err: any, n: number) => void) {
        cb(null, datum);
      }
      const boundCallback = bindNodeCB(callback, rxTestScheduler);
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

      expect(results).toEqual([42, 'done']);
    });

    it('should set context of callback to context of boundCallback', () => {
      function callback(this: {datum: number}, cb: (err: any, n: number) => void) {
        cb(null, this.datum);
      }
      const boundCallback = bindNodeCB(callback, rxTestScheduler);
      const results: Array<number | string> = [];

      boundCallback.call({datum: 42}).subscribe(
        (x: number) => results.push(x),
        null,
        () => results.push('done')
      );

      rxTestScheduler.flush();

      expect(results).toEqual([42, 'done']);
    });

    it('should error if callback throws', () => {
      const expected = new Error('haha no callback for you');
      function callback(datum: number, cb: (err: any, n: number) => void) {
        throw expected;
      }
      const boundCallback = bindNodeCB(callback, rxTestScheduler);

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

      const boundCallback = bindNodeCB(callback, rxTestScheduler);
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

      expect(results).toEqual([error]);
    });
  });

  it('should pass multiple inner arguments as an array', () => {
    function callback(
      datum: number,
      cb: (err: any, a: number, b: number, c: number, d: number) => void
    ) {
      cb(null, datum, 1, 2, 3);
    }
    const boundCallback = bindNodeCB(callback, rxTestScheduler);
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

    expect(results).toEqual([[42, 1, 2, 3], 'done']);
  });

  it('should cache value for next subscription and not call callbackFunc again', () => {
    let calls = 0;
    function callback(datum: number, cb: (err: any, n: number) => void) {
      calls++;
      cb(null, datum);
    }
    const boundCallback = bindNodeCB(callback, rxTestScheduler);
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
    expect(results1).toEqual([42, 'done']);
    expect(results2).toEqual([42, 'done']);
  });

  it('should not swallow post-callback errors', () => {
    function badFunction(callback: (error: Error, answer: number) => void): void {
      callback(null as any, 42);
      throw new Error('kaboom');
    }
    const consoleStub = sinon.stub(console, 'warn');
    try {
      bindNodeCB(badFunction)().subscribe();
      expect(consoleStub).to.have.property('called', true);
    } finally {
      consoleStub.restore();
    }
  });
});

describe('defer', () => {
  asDiagram('defer(() => Observable.of(a, b, c))')(
    'should defer the creation of a simple Observable',
    () => {
      const expected = '-a--b--c--|';
      const e1 = defer(() => cold('-a--b--c--|'));
      expectSource(e1).toBe(expected);
    }
  );
  it('should enforce function parameter', () => {
    const a = defer(); // $ExpectError
  });

  it('should infer correctly with function return observable', () => {
    const a = defer(() => of(1, 2, 3)); // $ExpectType Observable<number>
  });

  it('should infer correctly with function return promise', () => {
    const a = defer(() => Promise.resolve(5)); // $ExpectType Observable<number>
  });

  it('should support union type returns', () => {
    const a = defer(() => (Math.random() > 0.5 ? of(123) : of('abc'))); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with void functions', () => {
    const a = defer(() => {}); // $ExpectType Observable<never>
  });

  it('should error if an Input is not returned', () => {
    const a = defer(() => 42); // $ExpectError
  });

  it('should infer correctly with functions that sometimes do not return an Input', () => {
    const a = defer(() => {
      if (Math.random() < 0.5) {
        return of(42);
      }
    }); // $ExpectType Observable<number>
  });

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

describe('empty', () => {
  asDiagram('empty')('should create a cold observable with only complete', () => {
    const expected = '|';
    const e1 = empty();
    expectSource(e1).toBe(expected);
  });

  it('should infer correctly with no parameter', () => {
    const a = empty(); // $ExpectType Observable<never>
  });

  it('should support scheduler parameter', () => {
    const a = empty(animationFrame); // $ExpectType Observable<never>
  });

  it('should always infer empty observable', () => {
    // Empty Observable that replace empty static function
    const a = EMPTY; // $ExpectType Observable<never>
  });

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

describe('from', () => {
  asDiagram('from([10, 20, 30])')('should create an observable from an array', () => {
    const e1 = from([10, 20, 30]).pipe(
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler)))
    );
    const expected = 'x-y-(z|)';
    expectSource(e1).toBe(expected, {x: 10, y: 20, z: 30});
  });

  it('should accept an array', () => {
    const o = from([1, 2, 3, 4]); // $ExpectType Observable<number>
  });

  it('should accept a Promise', () => {
    const o = from(Promise.resolve('test')); // $ExpectType Observable<string>
  });

  it('should accept an Iterable', () => {
    const iterable = (function* () {
      yield 42;
    })();

    const o = from(iterable); // $ExpectType Observable<number>
  });

  it('should accept an Observable', () => {
    const o = from(of('test')); // $ExpectType Observable<string>
  });

  it('should accept union types', () => {
    const o = from(Math.random() > 0.5 ? of(123) : of('test')); // $ExpectType Observable<string | number>
  });

  it('should accept Observable<Observable<number>>', () => {
    const o = from(of(of(123))); // $ExpectType Observable<Observable<number>>
  });

  it('should accept Observable<number[]>', () => {
    const o = from(of([1, 2, 3])); // $ExpectType Observable<number[]>
  });

  it('should accept an array of Observables', () => {
    const o = from([of(1), of(2), of(3)]); // $ExpectType Observable<Observable<number>>
  });

  it('should support scheduler', () => {
    const a = from([1, 2, 3], animationFrame); // $ExpectType Observable<number>
  });

  it('should throw for non observable object', () => {
    const r = () => {
      // tslint:disable-next-line:no-any needed for the test
      from({} as any).subscribe();
    };

    expect(r).to.throw();
  });

  type('should return T for Interop objects', () => {
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

    const subscription = fromEvent(obj, 'click').subscribe(() => {});

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

    const subscription = fromEvent(<any>obj, 'click').subscribe(() => {});

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

    const subscription = fromEvent(obj, 'click').subscribe(() => {});

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
      addListener(a: string, b: (...args: any[]) => any, context?: any): {context: any} {
        onEventName = a;
        onHandler = b;
        return {context: ''};
      },
      removeListener(a: string, b: (...args: any[]) => void) {
        offEventName = a;
        offHandler = b;
      }
    };

    const subscription = fromEvent(obj, 'click').subscribe(() => {});

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

    const subscription = fromEvent(obj, 'click').subscribe(() => {});

    subscription.unsubscribe();

    expect(onEventName).to.equal('click');
    expect(typeof onHandler).to.equal('function');
    expect(offEventName).to.equal(onEventName);
    expect(offHandler).to.equal(onHandler);
  });

  it('should error on invalid event targets', () => {
    const obj = {
      addListener: () => {}
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
      addEventListener: (a: string, b: EventListenerOrEventListenerObject, c?: any) => {
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
    ).subscribe(() => {});

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
      off: () => {}
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
      off: () => {}
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
      off: () => {}
    };

    function selector() {}

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
      off: () => {}
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
      off: () => {}
    };

    function selector(x: number, y: number, z: number) {
      return [].slice.call(arguments);
    }

    fromEvent(obj, 'click', selector)
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).toEqual([1, 2, 3]);
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
      off: () => {}
    };

    fromEvent(obj, 'click')
      .pipe(take(1))
      .subscribe(
        (e: any) => {
          expect(e).toEqual([1, 2, 3]);
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
      on() {}
      off() {}
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
    let a: NodeEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });

  type('should support node compatible event emitters interfaces', () => {
    /* tslint:disable:no-unused-variable */
    let a: CompatEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });

  type('should support node style event emitters objects', () => {
    /* tslint:disable:no-unused-variable */
    interface NodeEventEmitter {
      addListener(eventType: string | symbol, handler: NodeEventHandler): this;
      removeListener(eventType: string | symbol, handler: NodeEventHandler): this;
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
      removeListener(eventType: string, listener: (...args: any[]) => any): void;
    }
    let a: ReactNativeEventEmitter;
    let b: Observable<any> = fromEvent(a!, 'mock');
    /* tslint:enable:no-unused-variable */
  });
});

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
  it('should accept function as first parameter', () => {
    const a = iif(() => false); // $ExpectType Observable<never>
  });

  it('should infer correctly with 2 parameters', () => {
    const a = iif(() => false, of(1)); // $ExpectType Observable<number>
  });

  it('should infer correctly with 3 parameters', () => {
    const a = iif(() => false, of(1), of(2)); // $ExpectType Observable<number>
  });

  it('should infer correctly with 3 parameters of different types', () => {
    const a = iif(() => false, of(1), of('a')); // $ExpectType Observable<string | number>
  });

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

describe('interval', () => {
  asDiagram('interval(1000)')('should create an observable emitting periodically', () => {
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
  });
  it('should infer correctly with number param', () => {
    const a = interval(1); // $ExpectType Observable<number>
  });

  it('should infer correctly with no param', () => {
    const a = interval(); // $ExpectType Observable<number>
  });

  it('should support scheduler', () => {
    const a = interval(1, animationFrame); // $ExpectType Observable<number>
  });

  it('should set up an interval', () => {
    const expected =
      '----------0---------1---------2---------3---------4---------5---------6-----';
    expectSource(interval(100, rxTestScheduler)).toBe(expected, [0, 1, 2, 3, 4, 5, 6]);
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
          expect(values).toEqual(expected);
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

describe('of', () => {
  asDiagram('of(1, 2, 3)')('should create a cold observable that emits 1, 2, 3', () => {
    const e1 = of(1, 2, 3).pipe(
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler)))
    );
    const expected = 'x-y-(z|)';
    expectSource(e1).toBe(expected, {x: 1, y: 2, z: 3});
  });
  it('should infer never with 0 params', () => {
    const res = of(); // $ExpectType Observable<never>
  });

  it('forced generic should not cause an issue', () => {
    const x: any = null;
    const res = of<string>(); // $ExpectType Observable<string>
    const res2 = of<string>(x); // $ExpectType Observable<string>
  });

  it('should infer correctly with 1 param', () => {
    const res = of(a); // $ExpectType Observable<A>
  });

  it('should infer correctly with mixed type of 2 params', () => {
    const res = of(a, b); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with mixed type of 3 params', () => {
    const res = of(a, b, c); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with mixed type of 4 params', () => {
    const res = of(a, b, c, d); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with mixed type of 5 params', () => {
    const res = of(a, b, c, d, e); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with mixed type of 6 params', () => {
    const res = of(a, b, c, d, e, f); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with mixed type of 7 params', () => {
    const res = of(a, b, c, d, e, f, g); // $ExpectType Observable<A | B | C | D | E | F | G>
  });

  it('should infer correctly with mixed type of 8 params', () => {
    const res = of(a, b, c, d, e, f, g, h); // $ExpectType Observable<A | B | C | D | E | F | G | H>
  });

  it('should infer correctly with mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i); // $ExpectType Observable<A | B | C | D | E | F | G | H | I>
  });

  it('should infer correctly with mono type of more than 9 params', () => {
    const res = of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); // $ExpectType Observable<number>
  });

  it('should support mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, j); // $ExpectType Observable<A | B | C | D | E | F | G | H | I | J>
  });

  it('should support mixed type of 13 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, j, '', true, 123, 10n); // $ExpectType Observable<string | number | bigint | boolean | A | B | C | D | E | F | G | H | I | J>
  });

  it('should support a rest of params', () => {
    const arr = [a, b, c, d, e, f, g, h, i, j];
    const res = of(...arr); // $ExpectType Observable<A | B | C | D | E | F | G | H | I | J>

    const arr2 = ['test', 123, a];
    const res2 = of(...arr2); // $ExpectType Observable<string | number | A>

    const res3 = of(b, ...arr2, c, true); // $ExpectType Observable<string | number | boolean | A | B | C>
  });

  it('should support scheduler', () => {
    const res = of(a, animationFrame); // $ExpectType Observable<A>
  });

  it('should infer correctly with array', () => {
    const res = of([a, b, c]); // $ExpectType Observable<(A | B | C)[]>
  });

  // Scheduler inclusions (remove in v8)
  it('should infer never with 0 params', () => {
    const res = of(queueScheduler); // $ExpectType Observable<never>
  });

  it('should infer correctly with 1 param', () => {
    const res = of(a, queueScheduler); // $ExpectType Observable<A>
  });

  it('should infer correctly with mixed type of 2 params', () => {
    const res = of(a, b, queueScheduler); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with mixed type of 3 params', () => {
    const res = of(a, b, c, queueScheduler); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with mixed type of 4 params', () => {
    const res = of(a, b, c, d, queueScheduler); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with mixed type of 5 params', () => {
    const res = of(a, b, c, d, e, queueScheduler); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with mixed type of 6 params', () => {
    const res = of(a, b, c, d, e, f, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with mixed type of 7 params', () => {
    const res = of(a, b, c, d, e, f, g, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G>
  });

  it('should infer correctly with mixed type of 8 params', () => {
    const res = of(a, b, c, d, e, f, g, h, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G | H>
  });

  it('should infer correctly with mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G | H | I>
  });

  it('should deprecate correctly', () => {
    of(queueScheduler); // $ExpectDeprecation
    of(a, queueScheduler); // $ExpectDeprecation
    of(a, b, queueScheduler); // $ExpectDeprecation
    of(a, b, c, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, h, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, h, i, queueScheduler); // $ExpectDeprecation
    of<A>(); // $ExpectDeprecation
    of(); // $ExpectNoDeprecation
    of(a); // $ExpectNoDeprecation
    of(a, b); // $ExpectNoDeprecation
    of(a, b, c); // $ExpectNoDeprecation
    of(a, b, c, d); // $ExpectNoDeprecation
  });

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

describe('range', () => {
  asDiagram('range(1, 10)')('should create an observable with numbers 1 to 10', () => {
    const e1 = range(1, 10)
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      .pipe(concatMap((x, i) => of(x).pipe(delay(i === 0 ? 0 : 20, rxTestScheduler))));
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
  });
  it('should infer correctly with number parameters', () => {
    const a = range(1, 2); // $ExpectType Observable<number>
  });

  it('should accept only number parameters', () => {
    const a = range('a', 1); // $ExpectError
  });

  it('should allow 1 parameter', () => {
    const a = range(1); // $ExpectType Observable<number>
  });

  it('should support scheduler', () => {
    const a = range(1, 2, animationFrame); // $ExpectType Observable<number>
  });

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
    expect(results).toEqual([12, 13, 14, 15]);
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

describe('throwError', () => {
  asDiagram('throw(e)')(
    'should create a cold observable that just emits an error',
    () => {
      const expected = '#';
      const e1 = throwError('error');
      expectSource(e1).toBe(expected);
    }
  );
  it('should accept any type and return never observable', () => {
    const a = throwError(1); // $ExpectType Observable<never>
    const b = throwError('a'); // $ExpectType Observable<never>
    const c = throwError({a: 1}); // $ExpectType Observable<never>
  });

  it('should support scheduler', () => {
    const a = throwError(1, animationFrame); // $ExpectType Observable<never>
  });

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

  it('should infer correctly with 1 parameter of number type', () => {
    const a = timer(1); // $ExpectType Observable<number>
  });

  it('should infer correctly with 1 parameter of date type', () => {
    const a = timer(new Date()); // $ExpectType Observable<number>
  });

  it('should not support string parameter', () => {
    const a = timer('a'); // $ExpectError
  });

  it('should infer correctly with 2 parameters', () => {
    const a = timer(1, 2); // $ExpectType Observable<number>
  });

  it('should support scheduler as second parameter', () => {
    const a = timer(1, animationFrame); // $ExpectType Observable<number>
  });

  it('should support scheduler as third parameter', () => {
    const a = timer(1, 2, animationFrame); // $ExpectType Observable<number>
  });

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
