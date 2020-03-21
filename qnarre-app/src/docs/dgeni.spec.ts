import {Dgeni, Package} from '.';
import {Doc, Processor} from './package';

describe('Dgeni', () => {
  let dgeni: Dgeni;
  let logger: {error: any};

  beforeEach(() => {
    logger = {
      error: () => {
        /* */
      }
    };
    spyOn(logger, 'error');
    dgeni = new Dgeni();
    const p = dgeni.addPackage('logger');
    p.addFactory(function logger() {
      return logger;
    });
  });

  describe('constructor', () => {
    it('should accept an array of packs to load', () => {
      const p1 = new Package('p1');
      const p2 = new Package('p2');
      dgeni = new Dgeni([p1, p2]);
      expect(dgeni.getPackage('p1')).toEqual(p1);
      expect(dgeni.getPackage('p2')).toEqual(p2);
    });

    it('should complain if packs is not an array', () => {
      expect(() => {
        return new Dgeni('bad' as any);
      }).toThrow();
    });
  });

  describe('package()', () => {
    it('should add the package to the packs property', () => {
      const p = new Package('pkg');
      dgeni.addPackage(p);
      expect(dgeni.getPackage('pkg')).toEqual(p);
    });

    it('should create a new pack if passed a string', () => {
      const p = dgeni.addPackage('pkg');
      expect(Package.isPackage(p)).toEqual(true);
    });

    it('should complain if two packs have the same name', () => {
      dgeni.addPackage('pkg');
      expect(() => {
        dgeni.addPackage('pkg');
      }).toThrow();
    });

    it('should pass deps through to the new package', () => {
      const p = dgeni.addPackage('pkg', ['dep1', 'dep2']);
      expect(p.deps).toEqual(['dep1', 'dep2']);
    });

    it('should load up inline pack deps', async () => {
      const log: string[] = [];
      const a = new Package('a').addProcessor(function proc() {
        return {
          $process: (_: Doc[]) => {
            log.push('a');
          }
        };
      });
      const b = new Package('b', [a]);
      dgeni.addPackage(b);
      expect(b.deps).toEqual([a]);
      expect(b.refs).toEqual(['a']);
      await dgeni.generate();
      expect(log).toEqual(['a']);
    });

    it('should not load a dependency that is already loaded', async () => {
      const log: string[] = [];
      const a1 = new Package('a').addProcessor({
        name: 'a',
        $process: () => {
          log.push('a1');
        }
      });
      dgeni.addPackage(a1);
      const a2 = new Package('a').addProcessor({
        name: 'a',
        $process: () => {
          log.push('a2');
        }
      });
      const b = new Package('b', [a2]);
      dgeni.addPackage(b);
      expect(b.deps).toEqual([a2]);
      expect(b.refs).toEqual(['a']);
      await dgeni.generate();
      expect(log).toEqual(['a1']);
    });

    it('should not modify the `deps` property of a package', () => {
      const a = new Package('a').addProcessor({
        name: 'a',
        $process: () => {
          /* */
        }
      });
      const b = new Package('b', [a]).addProcessor({
        name: 'a',
        $process: () => {
          /* */
        }
      });
      dgeni.addPackage(b);
      expect(b.deps).toEqual([a]);
      expect(b.refs).toEqual(['a']);
    });
  });

  describe('configure', () => {
    it('should return the configured injector', () => {
      const inj = dgeni.configure();
      expect(typeof inj.get).toBe('function');
    });

    describe('services', () => {
      it('should add basic shared services to the injector', () => {
        const inj = dgeni.configure();
        expect(typeof inj.get('dgeni')).toBe('object');
        expect(typeof inj.get('log')).toBe('object');
        expect(typeof inj.get('log').debug).toBe('function');
        expect(typeof inj.get('getInjectables')).toBe('function');
      });

      it('should set stop on error defaults', () => {
        let stopOnProcessingError = false;
        dgeni.addPackage('testPackage').addConfig(dgeni => {
          stopOnProcessingError = dgeni.stopOnProcessingError;
        });
        dgeni.configure();
        expect(stopOnProcessingError).toEqual(true);
      });

      it('should add services to the injector', () => {
        const log: string[] = [];
        dgeni
          .addPackage('pack')
          .addProcessor(function proc(s1, s2) {
            return {
              $process: () => {
                log.push(s1);
                log.push(s2);
              }
            };
          })
          .addFactory(function serv1() {
            return 'serv1 value';
          })
          .addFactory(function serv2(service1) {
            return service1 + ' serv2 value';
          });
        const inj = dgeni.configure();
        inj.get('proc').$process();
        expect(log).toEqual(['serv1 value', 'serv1 value serv2 value']);
      });

      it('should add services in the correct deps order', () => {
        const log: string[] = [];
        dgeni.addPackage('test1', ['test2']).addFactory(function val() {
          return 'test 1';
        });
        dgeni.addPackage('test2').addFactory(function val() {
          return 'test 2';
        });
        dgeni.addPackage('test4', ['test3']).addProcessor(function proc(v) {
          return {
            $process: () => {
              log.push(v + '(overridden)');
            }
          };
        });
        dgeni
          .addPackage('test3', ['test1', 'test2'])
          .addProcessor(function proc(v) {
            return {
              $process: () => {
                log.push(v);
              }
            };
          });
        const inj = dgeni.configure();
        inj.get('proc').$process();
        expect(log).toEqual(['test 1(overridden)']);
      });
    });

    describe('config blocks', () => {
      it('should run the config functions in the correct package dependency order', () => {
        const log: number[] = [];
        function proc() {
          const v = 0;
          return {
            v,
            $process() {
              log.push(this.v);
            }
          };
        }
        dgeni.addPackage('test').addProcessor(proc);
        dgeni.addPackage('test1', ['test2']).addConfig(p => {
          p.v = 1;
        });
        dgeni.addPackage('test2', ['test']).addConfig(p => {
          p.v = 2;
        });
        const inj = dgeni.configure();
        inj.get('proc').$process();
        expect(log).toEqual([1]);
      });

      it('should provide config blocks with access to the injector', () => {
        let i: any;
        dgeni.addPackage('test').addConfig(inj => {
          i = inj;
        });
        const inj = dgeni.configure();
        expect(inj).toEqual(i);
      });
    });

    xdescribe('eventHandlers', () => {
      it('should add eventHandlers in the correct package dependency order', () => {
        function h1() {
          /* */
        }
        function h2() {
          /* */
        }
        function h3() {
          /* */
        }
        function h4() {
          /* */
        }
        dgeni.addPackage('test1', ['test2']).addHandler('testEvent', () => {
          return h1;
        });
        dgeni
          .addPackage('test2')
          .addHandler('testEvent', () => {
            return h2;
          })
          .addHandler('testEvent2', () => {
            return h3;
          });
        dgeni.addPackage('test3', ['test1']).addHandler('testEvent', () => {
          return h4;
        });
        dgeni.configure();
        expect(dgeni.handlers.get('testEvent')).toEqual([h2, h1, h4]);
        expect(dgeni.handlers.get('testEvent2')).toEqual([h3]);
      });
    });

    xdescribe('legacy validation', () => {
      it('should fail if processor has an invalid property', done => {
        dgeni.addPackage('test').addProcessor(function testProcessor() {
          return {
            $validate: {x: {presence: true}}
          };
        });
        dgeni.generate().catch(errors => {
          expect(errors).toEqual([
            {
              processor: 'testProcessor',
              package: 'test',
              errors: {x: ["X can't be blank"]}
            }
          ]);
          done();
        });
      });
    });

    xdescribe('processors', () => {
      it('should order the processors by dependency', () => {
        const log = [];
        const a: Processor = {
          name: 'a',
          $runAfter: ['c'],
          $process: () => {
            log.push('a');
          }
        };
        const b: Processor = {
          name: 'b',
          $runAfter: ['c', 'e', 'a'],
          $process: () => {
            log.push('b');
          }
        };
        const c: Processor = {
          name: 'c',
          $runBefore: ['e'],
          $process: () => {
            log.push('c');
          }
        };
        const d: Processor = {
          name: 'd',
          $runAfter: ['a'],
          $process: () => {
            log.push('d');
          }
        };
        const e: Processor = {
          name: 'e',
          $runAfter: [],
          $process: () => {
            log.push('e');
          }
        };
        dgeni
          .addPackage('test1')
          .addProcessor('a', a)
          .addProcessor('b', b)
          .addProcessor('c', c)
          .addProcessor('d', d)
          .addProcessor('e', e);
        dgeni.configure();
        expect(dgeni.procs).toEqual([c, e, a, b, d]);
      });

      it('should ignore processors that have $enabled set to false', () => {
        const a: Processor = {
          name: 'a',
          $process: () => {
            /* */
          }
        };
        const b: Processor = {
          name: 'b',
          $enabled: false,
          $process: () => {
            /* */
          }
        };
        const c: Processor = {
          name: 'c',
          $process: () => {
            /* */
          }
        };
        dgeni
          .addPackage('test1')
          .addProcessor('a', a)
          .addProcessor('b', b)
          .addProcessor('c', c);
        dgeni.configure();
        expect(dgeni.procs).toEqual([a, c]);
      });

      it('should allow config blocks to change $enabled on a processor', () => {
        const log = [];
        const a: Processor = {
          name: 'a',
          $process: () => {
            log.push('a');
          }
        };
        const b: Processor = {
          name: 'b',
          $enabled: false,
          $process: () => {
            log.push('b');
          }
        };
        const c: Processor = {
          name: 'c',
          $process: () => {
            log.push('c');
          }
        };
        dgeni
          .addPackage('test1')
          .addProcessor('a', a)
          .addProcessor('b', b)
          .addProcessor('c', c)
          .addConfig((a, b) => {
            a.$enabled = false;
            b.$enabled = true;
          });
        dgeni.configure();
        expect(dgeni.procs).toEqual([b, c]);
      });

      it('should throw an error if the $runAfter dependencies are invalid', () => {
        dgeni.addPackage('test').addProcessor(function badRunAfterProcessor() {
          return {$runAfter: ['tags-processed']};
        });
        expect(() => {
          dgeni.configure();
        }).toThrow(
          'Missing dependency: "tags-processed"  on "badRunAfterProcessor"'
        );
      });

      it('should throw an error if the $runBefore dependencies are invalid', () => {
        dgeni.addPackage('test').addProcessor(function badRunBeforeProcessor() {
          return {$runBefore: ['tags-processed']};
        });
        expect(() => {
          dgeni.configure();
        }).toThrow(
          'Missing dependency: "tags-processed"  on "badRunBeforeProcessor"'
        );
      });

      it('should throw an error if the processor dependencies are cyclic', () => {
        dgeni
          .addPackage('test')
          .addProcessor(function processor1() {
            return {$runBefore: ['processor2']};
          })
          .addProcessor(function processor2() {
            return {$runBefore: ['processor1']};
          });
        expect(() => {
          dgeni.configure();
        }).toThrow(
          'Dependency Cycle Found: processor1 -> processor2 -> processor1'
        );
      });

      it('should allow config blocks to change the order of the processors', done => {
        const log: string[] = [];
        dgeni
          .addPackage('test')
          .addProcessor(function a() {
            return {
              $runBefore: ['b'],
              $process: () => {
                log.push('a');
              }
            };
          })
          .addProcessor(function b() {
            return {
              $runBefore: ['c'],
              $process: () => {
                log.push('b');
              }
            };
          })
          .addProcessor(function c() {
            return {
              $process: () => {
                log.push('c');
              }
            };
          })
          .addConfig((_a, b, c) => {
            b.$runBefore = [];
            c.$runBefore = ['b'];
          });
        dgeni.generate().then(() => {
          expect(log).toEqual(['a', 'c', 'b']);
          done();
        });
      });
    });
  });

  xdescribe('triggerEvent()', () => {
    it("should run all the specified event's handlers in the correct dependency order", done => {
      const log: string[] = [];
      const h1 = () => {
        log.push('h1');
      };
      const h2 = () => {
        log.push('h2');
      };
      const h3 = () => {
        log.push('h3');
      };
      const h4 = () => {
        log.push('h4');
      };
      dgeni.addPackage('test1', ['test2']).addHandler('testEvent', () => {
        return h1;
      });
      dgeni
        .addPackage('test2')
        .addHandler('testEvent', () => {
          return h2;
        })
        .addHandler('testEvent2', () => {
          return h3;
        });
      dgeni.addPackage('test3', ['test1']).addHandler('testEvent', () => {
        return h4;
      });
      dgeni.configure();
      dgeni.triggerEvent('testEvent').finally(() => {
        expect(log).toEqual(['h2', 'h1', 'h4']);
        done();
      });
    });

    it('should pass through the call arguments to the handler', done => {
      const h = {
        handle: () => {
          /* */
        }
      };
      spyOn(h, 'handle');
      dgeni.addPackage('test1', []).addHandler('testEvent', () => {
        return h;
      });
      dgeni.configure();
      dgeni.triggerEvent('testEvent', 'arg1', 'arg2', 'arg3').finally(() => {
        expect(h).toHaveBeenCalledWith('testEvent', 'arg1', 'arg2', 'arg3');
        done();
      });
    });

    it('should return a promise to event handler results', done => {
      function h1() {
        /* */
      }
      function h2() {
        return true;
      }
      function h3() {
        return {message: 'info'};
      }
      function h4() {
        return new Promise<Doc[]>((res, _rej) => res());
      }
      function h5() {
        return new Promise((res, _rej) => res(true));
      }
      function h6() {
        return new Promise((res, _rej) => res({message: 'info async'}));
      }
      dgeni
        .addPackage('test1', [])
        .addHandler('testEvent', () => {
          return h1;
        })
        .addHandler('testEvent', () => {
          return h2;
        })
        .addHandler('testEvent', () => {
          return h3;
        })
        .addHandler('testEvent', () => {
          return h4;
        })
        .addHandler('testEvent', () => {
          return h5;
        })
        .addHandler('testEvent', () => {
          return h6;
        });
      dgeni.configure();
      dgeni.triggerEvent('testEvent').then(ds => {
        expect(ds.length).toEqual(6);
        done();
      });
    });
  });

  xdescribe('generate()', () => {
    describe('bad-processor', () => {
      let pkg: Package;

      beforeEach(() => {
        pkg = dgeni.addPackage('test').addProcessor(() => {
          return {
            $process: () => {
              throw new Error('processor failed');
            }
          };
        });
      });

      describe('stopOnProcessingError', () => {
        it('should fail if stopOnProcessingError is true and a processor throws an Error', () => {
          return dgeni.generate().catch(e => {
            expect(e).toBeTruthy();
          });
        });

        it('should not fail but log the error if stopOnProcessingError is false a processor throws an Error', () => {
          let error: any;
          pkg.addConfig(dgeni => {
            dgeni.stopOnProcessingError = false;
          });
          return dgeni
            .generate()
            .catch(e => {
              error = e;
            })
            .finally(() => {
              expect(error).toBeUndefined();
              expect(logger.error).toHaveBeenCalled();
            });
        });

        it('should continue to process the subsequent processors after a bad-processor if stopOnProcessingError is false', () => {
          let called = false;
          pkg
            .addConfig((dgeni: {stopOnProcessingError: boolean}) => {
              dgeni.stopOnProcessingError = false;
            })
            .addProcessor(function checkProcessor() {
              return {
                $runAfter: ['badProcessor'],
                $process: () => {
                  called = true;
                }
              };
            });
          return dgeni.generate().finally(() => {
            expect(called).toEqual(true);
          });
        });
      });
    });
  });
});
