import {assert} from 'assert';
import * from './backend';

describe('urlPathHelpers', () => {
  it('addParams leaves input untouched when there are no parameters', () => {
    const actual = addParams('http://foo', {a: undefined, b: undefined});
    const expected = 'http://foo';
    assert.equal(actual, expected);
  });
  it('addParams adds parameters to a URL without parameters', () => {
    const actual = addParams('http://foo', {
      a: '1',
      b: ['2', '3+4'],
      c: '5',
      d: undefined
    });
    const expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
    assert.equal(actual, expected);
  });
  it('addParams adds parameters to a URL with parameters', () => {
    const actual = addParams('http://foo?a=1', {
      b: ['2', '3+4'],
      c: '5',
      d: undefined
    });
    const expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
    assert.equal(actual, expected);
  });
});

function assertIsDatum(x) {
  assert.isNumber(x.step);
  assert.instanceOf(x.wall_time, Date);
}

describe('backend tests', () => {
  it('runToTag helpers work', () => {
    const r2t: RunToTag = {
      run1: ['foo', 'bar', 'zod'],
      run2: ['zod', 'zoink'],
      a: ['foo', 'zod']
    };
    const empty1: RunToTag = {};
    const empty2: RunToTag = {run1: [], run2: []};
    assert.deepEqual(getRunsNamed(r2t), ['a', 'run1', 'run2']);
    assert.deepEqual(getTags(r2t), ['bar', 'foo', 'zod', 'zoink']);
    assert.deepEqual(filterTags(r2t, ['run1', 'run2']), getTags(r2t));
    assert.deepEqual(filterTags(r2t, ['run1']), ['bar', 'foo', 'zod']);
    assert.deepEqual(filterTags(r2t, ['run2', 'a']), ['foo', 'zod', 'zoink']);

    assert.deepEqual(getRunsNamed(empty1), []);
    assert.deepEqual(getTags(empty1), []);

    assert.deepEqual(getRunsNamed(empty2), ['run1', 'run2']);
    assert.deepEqual(getTags(empty2), []);
  });

  describe('router', () => {
    describe('prod mode', () => {
      let router: Router;
      beforeEach(() => {
        router = createRouter('data');
      });

      it('leading slash in pathPrefix is an absolute path', () => {
        const router = createRouter('/data/');
        assert.equal(router.runs(), '/data/runs');
      });

      it('returns complete pathname when pathPrefix omits slash', () => {
        const router = createRouter('data/');
        assert.equal(router.runs(), 'data/runs');
      });

      it('does not prune many leading slashes that forms full url', () => {
        const router = createRouter('///data/hello');
        // This becomes 'http://data/hello/runs'
        assert.equal(router.runs(), '///data/hello/runs');
      });

      it('returns correct value for #environment', () => {
        assert.equal(router.environment(), 'data/environment');
      });

      it('returns correct value for #experiments', () => {
        assert.equal(router.experiments(), 'data/experiments');
      });

      describe('#pluginRoute', () => {
        it('encodes slash correctly', () => {
          assert.equal(
            router.pluginRoute('scalars', '/scalar'),
            'data/plugin/scalars/scalar'
          );
        });

        it('encodes query param correctly', () => {
          assert.equal(
            router.pluginRoute(
              'scalars',
              '/a',
              createSearchParam({b: 'c', d: ['1', '2']})
            ),
            'data/plugin/scalars/a?b=c&d=1&d=2'
          );
        });

        it('does not put ? when passed an empty URLSearchParams', () => {
          assert.equal(
            router.pluginRoute('scalars', '/a', new URLSearchParams()),
            'data/plugin/scalars/a'
          );
        });

        it('encodes parenthesis correctly', () => {
          assert.equal(
            router.pluginRoute('scalars', '/a', createSearchParam({foo: '()'})),
            'data/plugin/scalars/a?foo=%28%29'
          );
        });

        it('deals with existing query param correctly', () => {
          assert.equal(
            router.pluginRoute(
              'scalars',
              '/a?foo=bar',
              createSearchParam({hello: 'world'})
            ),
            'data/plugin/scalars/a?foo=bar&hello=world'
          );
        });

        it('encodes query param the same as #addParams', () => {
          assert.equal(
            router.pluginRoute(
              'scalars',
              '/a',
              createSearchParam({b: 'c', d: ['1']})
            ),
            addParams('data/plugin/scalars/a', {b: 'c', d: ['1']})
          );
          assert.equal(
            router.pluginRoute('scalars', '/a', createSearchParam({foo: '()'})),
            addParams('data/plugin/scalars/a', {foo: '()'})
          );
        });
      });

      it('returns correct value for #pluginsListing', () => {
        assert.equal(router.pluginsListing(), 'data/plugins_listing');
      });

      it('returns correct value for #runs', () => {
        assert.equal(router.runs(), 'data/runs');
      });

      it('returns correct value for #runsForExperiment', () => {
        assert.equal(
          router.runsForExperiment(1),
          'data/experiment_runs?experiment=1'
        );
      });
    });
  });
});

interface MockRequest {
  resolve: Function;
  reject: Function;
  id: number;
  url: string;
}

class MockedRequestManager extends RequestManager {
  private resolvers: Function[];
  private rejectors: Function[];
  public requestsDispatched: number;
  constructor(maxRequests = 10, maxRetries = 3) {
    super(maxRequests, maxRetries);
    this.resolvers = [];
    this.rejectors = [];
    this.requestsDispatched = 0;
  }
  protected _promiseFromUrl(url) {
    return new Promise((resolve, reject) => {
      const mockJSON = {
        ok: true,
        json() {
          return url;
        },
        url,
        status: 200
      };
      const mockFailedRequest: any = {
        ok: false,
        url,
        status: 502
      };
      const mockFailure = new NetworkError(mockFailedRequest, url);
      this.resolvers.push(() => {
        resolve(mockJSON);
      });
      this.rejectors.push(() => {
        reject(mockFailure);
      });
      this.requestsDispatched++;
    });
  }
  public resolveFakeRequest() {
    this.resolvers.pop()();
  }
  public rejectFakeRequest() {
    this.rejectors.pop()();
  }
  public dispatchAndResolve() {
    // Wait for at least one request to be dispatched, then resolve it.
    this.waitForDispatch(1).then(() => this.resolveFakeRequest());
  }
  public waitForDispatch(num) {
    return waitForCondition(() => {
      return this.requestsDispatched >= num;
    });
  }
}

/** Create a promise that returns when *check* returns true.
 * May cause a test timeout if check never becomes true.
 */

function waitForCondition(check: () => boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    const go = () => {
      if (check()) {
        resolve();
      }
      setTimeout(go, 2);
    };
    go();
  });
}

describe('backend', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('request manager', () => {
    it('request loads JSON properly', done => {
      const rm = new RequestManager();
      const promise = rm.request('data/example.json');
      promise.then(
        response => {
          assert.deepEqual(response, {foo: 3, bar: 'zoidberg'});
          done();
        },
        reject => {
          throw new Error(reject);
        }
      );
    });

    it('rejects on bad url', done => {
      const rm = new RequestManager(5, 0);
      const badUrl = '_bad_url_which_doesnt_exist.json';
      const promise = rm.request(badUrl);
      promise.then(
        success => {
          done(new Error('the promise should have rejected'));
        },
        (reject: NetworkError) => {
          assert.include(reject.message, '404');
          assert.include(reject.message, badUrl);
          assert.equal(reject.req.status, 404);
          done();
        }
      );
    });

    it('can retry if requests fail', done => {
      const rm = new MockedRequestManager(3, 5);
      const r = rm.request('foo');
      rm.waitForDispatch(1)
        .then(() => {
          rm.rejectFakeRequest();
          return rm.waitForDispatch(2);
        })
        .then(() => rm.resolveFakeRequest());
      r.then(success => done());
    });

    it('retries at most maxRetries times', done => {
      const MAX_RETRIES = 2;
      const rm = new MockedRequestManager(3, MAX_RETRIES);
      const r = rm.request('foo');
      rm.waitForDispatch(1)
        .then(() => {
          rm.rejectFakeRequest();
          return rm.waitForDispatch(2);
        })
        .then(() => {
          rm.rejectFakeRequest();
          return rm.waitForDispatch(3);
        })
        .then(() => {
          rm.rejectFakeRequest();
        });

      r.then(
        success => done(new Error('The request should have failed')),
        failure => done()
      );
    });

    it('requestManager only sends maxRequests requests at a time', done => {
      const rm = new MockedRequestManager(3);
      const r0 = rm.request('1');
      const r1 = rm.request('2');
      const r2 = rm.request('3');
      const r3 = rm.request('4');
      assert.equal(rm.active, 3, 'three requests are active');
      assert.equal(rm.outstanding(), 4, 'four requests are pending');
      rm.waitForDispatch(3)
        .then(() => {
          assert.equal(
            rm.active,
            3,
            'three requests are still active (1)'
          );
          assert.equal(
            rm.requestsDispatched,
            3,
            'three requests were dispatched'
          );
          rm.resolveFakeRequest();
          return rm.waitForDispatch(4);
        })
        .then(() => {
          assert.equal(
            rm.active,
            3,
            'three requests are still active (2)'
          );
          assert.equal(
            rm.requestsDispatched,
            4,
            'four requests were dispatched'
          );
          assert.equal(
            rm.outstanding(),
            3,
            'three requests are pending'
          );
          rm.resolveFakeRequest();
          rm.resolveFakeRequest();
          rm.resolveFakeRequest();
          return r3;
        })
        .then(() => {
          assert.equal(rm.active, 0, 'all requests finished');
          assert.equal(rm.outstanding(), 0, 'no requests pending');
          done();
        });
    });

    it('queue continues after failures', done => {
      const rm = new MockedRequestManager(1, 0);
      const r0 = rm.request('1');
      const r1 = rm.request('2');
      rm.waitForDispatch(1).then(() => {
        rm.rejectFakeRequest();
      });

      r0.then(
        success => done(new Error('r0 should have failed')),
        failure => 'unused_argument'
      ).then(() => rm.resolveFakeRequest());

      // When the first request rejects, it should decrement nActiveRequests
      // and then launch remaining requests in queue (i.e. this one)
      r1.then(
        success => done(),
        failure => done(new Error(failure))
      );
    });

    it('queue is LIFO', done => {
      /* This test is a bit tricky.
       * We want to verify that the RequestManager queue has LIFO semantics.
       * So we construct three requests off the bat: A, B, C.
       * So LIFO semantics ensure these will resolve in order A, C, B.
       * (Because the A request launches immediately when we create it, it's
       * not in queue)
       * Then after resolving A, C moves out of queue, and we create X.
       * So expected final order is A, C, X, B.
       * We verify this with an external var that counts how many requests were
       * resolved.
       */
      const rm = new MockedRequestManager(1);
      let nResolved = 0;
      function assertResolutionOrder(expectedSpotInSequence) {
        return () => {
          nResolved++;
          assert.equal(expectedSpotInSequence, nResolved);
        };
      }

      function launchThirdRequest() {
        rm.request('started late but goes third')
          .then(assertResolutionOrder(3))
          .then(() => rm.dispatchAndResolve());
      }

      rm.request('first')
        .then(assertResolutionOrder(1)) // Assert that this one resolved first
        .then(launchThirdRequest)
        .then(() => rm.dispatchAndResolve()); // then trigger the next one

      rm.request('this one goes fourth') // created second, will go last
        .then(assertResolutionOrder(4)) // assert it was the fourth to get resolved
        .then(done); // finish the test

      rm.request('second')
        .then(assertResolutionOrder(2))
        .then(() => rm.dispatchAndResolve());

      rm.dispatchAndResolve();
    });

    it('requestManager can clear queue', done => {
      const rm = new MockedRequestManager(1);
      let requestsResolved = 0;
      let requestsRejected = 0;
      const success = () => requestsResolved++;
      const failure = err => {
        assert.equal(err.name, 'CancellationError');
        requestsRejected++;
      };
      const finishTheTest = () => {
        assert.equal(rm.active, 0, 'no requests still active');
        assert.equal(
          rm.requestsDispatched,
          1,
          'only one req was ever dispatched'
        );
        assert.equal(rm.outstanding(), 0, 'no pending requests');
        assert.equal(requestsResolved, 1, 'one request got resolved');
        assert.equal(
          requestsRejected,
          4,
          'four were cancelled and threw errors'
        );
        done();
      };
      rm.request('0')
        .then(success, failure)
        .then(finishTheTest);
      rm.request('1').then(success, failure);
      rm.request('2').then(success, failure);
      rm.request('3').then(success, failure);
      rm.request('4').then(success, failure);
      assert.equal(rm.active, 1, 'one req is active');
      rm.waitForDispatch(1).then(() => {
        assert.equal(rm.active, 1, 'one req is active');
        assert.equal(rm.requestsDispatched, 1, 'one req was dispatched');
        assert.equal(rm.outstanding(), 5, 'five reqs outstanding');
        rm.clearQueue();
        rm.resolveFakeRequest();
        // resolving the first request triggers finishTheTest
      });
    });

    it('throws an error when a GET request has a body', function() {
      const rm = new RequestManager();
      const badOptions = new RequestOptions();
      badOptions.methodType = HttpMethodType.GET;
      badOptions.body = 'a body';
      assert.throws(
        () => rm.withOptions('http://www.google.com', badOptions),
        InvalidOptionsError
      );
    });

    describe('tests using sinon.fakeServer', function() {
      let server;

      beforeEach(function() {
        server = sinon.fakeServer.create();
        server.respondImmediately = true;
        server.respondWith('{}');
      });

      afterEach(function() {
        server.restore();
      });

      it('builds correct XMLHttpRequest when request(url) is called', function() {
        const rm = new RequestManager();
        return rm.request('my_url').then(() => {
          assert.lengthOf(server.requests, 1);
          assert.equal(server.requests[0].url, 'my_url');
          assert.equal(server.requests[0].requestBody, null);
          assert.equal(server.requests[0].method, HttpMethodType.GET);
          assert.notProperty(server.requests[0].requestHeaders, 'Content-Type');
        });
      });

      it('builds correct XMLHttpRequest when request(url, postData) is called', function() {
        const rm = new RequestManager();
        return rm
          .request('my_url', {key1: 'value1', key2: 'value2'})
          .then(() => {
            assert.lengthOf(server.requests, 1);
            assert.equal(server.requests[0].url, 'my_url');
            assert.equal(server.requests[0].method, HttpMethodType.POST);
            assert.instanceOf(server.requests[0].requestBody, FormData);
            assert.sameDeepMembers(
              Array.from(server.requests[0].requestBody.entries()),
              [
                ['key1', 'value1'],
                ['key2', 'value2']
              ]
            );
          });
      });

      it('builds correct XMLHttpRequest when withOptions is called', function() {
        const rm = new RequestManager();
        const requestOptions = new RequestOptions();
        requestOptions.methodType = HttpMethodType.POST;
        requestOptions.contentType = 'text/plain;charset=utf-8';
        requestOptions.body = 'the body';
        return rm.withOptions('my_url', requestOptions).then(() => {
          assert.lengthOf(server.requests, 1);
          assert.equal(server.requests[0].url, 'my_url');
          assert.equal(server.requests[0].method, HttpMethodType.POST);
          assert.equal(server.requests[0].requestBody, 'the body');
          assert.equal(
            server.requests[0].requestHeaders['Content-Type'],
            'text/plain;charset=utf-8'
          );
        });
      });
    });

    describe('fetch', () => {
      beforeEach(function() {
        this.stubbedFetch = sandbox.stub(window, 'fetch');
        this.clock = sandbox.useFakeTimers();

        this.resolvesAfter = function(
          value: any,
          timeInMs: number
        ): Promise<any> {
          return new Promise(resolve => {
            setTimeout(() => resolve(value), timeInMs);
          });
        };
      });

      it('resolves', async function() {
        this.stubbedFetch.returns(
          Promise.resolve(new Response('Success', {status: 200}))
        );
        const rm = new RequestManager();

        const response = await rm.fetch('foo');

        expect(response).to.have.property('ok', true);
        expect(response).to.have.property('status', 200);
        const body = await response.text();
        expect(body).to.equal('Success');
      });

      it('retries', async function() {
        this.stubbedFetch
          .onCall(0)
          .returns(Promise.resolve(new Response('Error 1', {status: 500})));
        this.stubbedFetch
          .onCall(1)
          .returns(Promise.resolve(new Response('Error 2', {status: 500})));
        this.stubbedFetch
          .onCall(2)
          .returns(Promise.resolve(new Response('Success', {status: 200})));
        const rm = new RequestManager();

        const response = await rm.fetch('foo');

        expect(response).to.have.property('ok', true);
        expect(response).to.have.property('status', 200);
        const body = await response.text();
        expect(body).to.equal('Success');
      });

      it('gives up after max retries', async function() {
        const failure = new Response('Error', {status: 500});
        this.stubbedFetch.returns(Promise.resolve(failure));
        const rm = new RequestManager();

        const response = await rm.fetch('foo');

        expect(this.stubbedFetch).to.have.been.calledThrice;
        expect(response).to.have.property('ok', false);
        expect(response).to.have.property('status', 500);
        const body = await response.text();
        expect(body).to.equal('Error');
      });

      it('sends requests concurrently', async function() {
        this.stubbedFetch
          .onCall(0)
          .returns(
            this.resolvesAfter(new Response('nay', {status: 200}), 3000)
          );
        this.stubbedFetch
          .onCall(1)
          .returns(Promise.resolve(new Response('yay', {status: 200})));

        const rm = new RequestManager(/** nSimultaneousRequests */ 2);

        const promise1 = rm.fetch('foo');
        const promise2 = rm.fetch('bar');

        const secondResponse = await Promise.race([promise1, promise2]);
        const secondBody = await secondResponse.text();
        expect(secondBody).to.equal('yay');

        this.clock.tick(3000);

        const firstResponse = await promise1;
        const firstBody = await firstResponse.text();
        expect(firstBody).to.equal('nay');
      });

      it('queues requests', async function() {
        this.stubbedFetch
          .onCall(0)
          .returns(
            this.resolvesAfter(new Response('nay', {status: 200}), 3000)
          );
        this.stubbedFetch
          .onCall(1)
          .returns(Promise.resolve(new Response('yay', {status: 200})));

        const rm = new RequestManager(/** nSimultaneousRequests */ 1);

        const promise1 = rm.fetch('foo');
        const promise2 = rm.fetch('bar');

        expect(rm.active).to.equal(1);
        expect(rm.outstanding()).to.equal(2);

        this.clock.tick(3000);

        const firstResponse = await Promise.race([promise1, promise2]);
        const firstBody = await firstResponse.text();
        expect(firstBody).to.equal('nay');

        const secondResponse = await promise2;
        const secondBody = await secondResponse.text();
        expect(secondBody).to.equal('yay');
      });
    });
  });
});
