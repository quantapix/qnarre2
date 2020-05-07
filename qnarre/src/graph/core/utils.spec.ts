/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qt from './types';
import * as qu from './utils';

describe('utils', () => {
  describe('intersectRect', () => {
    function expectIntersects(rect: qt.Rect, point: qt.Point) {
      const cross = qu.intersectRect(rect, point);
      if (cross.x !== point.x) {
        const m = (cross.y - point.y) / (cross.x - point.x);
        expect(cross.y - rect.y).toBe(m * (cross.x - rect.x));
      }
    }
    function expectTouches(rect: qt.Rect, point: qt.Point) {
      const cross = qu.intersectRect(rect, point);
      if (Math.abs(rect.x - cross.x) !== rect.w / 2) {
        expect(Math.abs(rect.y - cross.y)).toBe(rect.h / 2);
      }
    }
    it("creates a slope that will intersect rectangle's center", () => {
      const rect = {x: 0, y: 0, w: 1, h: 1} as qt.Rect;
      expectIntersects(rect, {x: 2, y: 6});
      expectIntersects(rect, {x: 2, y: -6});
      expectIntersects(rect, {x: 6, y: 2});
      expectIntersects(rect, {x: -6, y: 2});
      expectIntersects(rect, {x: 5, y: 0});
      expectIntersects(rect, {x: 0, y: 5});
    });
    it('touches border of rectangle', () => {
      const rect = {x: 0, y: 0, w: 1, h: 1} as qt.Rect;
      expectTouches(rect, {x: 2, y: 6});
      expectTouches(rect, {x: 2, y: -6});
      expectTouches(rect, {x: 6, y: 2});
      expectTouches(rect, {x: -6, y: 2});
      expectTouches(rect, {x: 5, y: 0});
      expectTouches(rect, {x: 0, y: 5});
    });
    it('throws an error if point is at center', () => {
      const rect = {x: 0, y: 0, w: 1, h: 1} as qt.Rect;
      expect(() => {
        qu.intersectRect(rect, {x: 0, y: 0} as qt.Point);
      }).toThrow();
    });
  });

  describe('time', () => {
    let log: any;
    beforeEach(() => {
      log = console.log;
    });
    afterEach(() => {
      console.log = log;
    });
    it('logs timing information', () => {
      const h = [] as any[];
      console.log = (args: any) => {
        h.push(args);
      };
      qu.time('foo', () => {});
      expect(h.length).toBe(1);
      expect(h[0]).toMatch(/^foo time: .*ms/);
    });
    it('returns the value from the evaluated function', () => {
      console.log = () => {};
      expect(qu.time('foo', _.constant('bar'))).toBe('bar');
    });
  });
});

describe('WeightedQueue', () => {
  let q: qu.WeightedQueue;
  beforeEach(() => {
    q = new qu.WeightedQueue();
  });
  describe('size', () => {
    it('returns 0 for empty queue', () => {
      expect(q.size).toEqual(0);
    });
    it('returns number of elements in queue', () => {
      q.add('a', 1);
      expect(q.size).toEqual(1);
      q.add('b', 2);
      expect(q.size).toEqual(2);
    });
    it('returns all keys in queue', () => {
      q.add('a', 1);
      q.add(1, 2);
      q.add(false, 3);
      q.add(undefined, 4);
      q.add(null, 5);
      expect(_.sortBy(q.keys())).toEqual(
        _.sortBy(['a', '1', 'false', 'undefined', 'null'])
      );
    });
    it('returns true if key in queue', () => {
      q.add('a', 1);
      expect(q.has('a')).toBeTrue;
    });
    it('returns false if key not in queue', () => {
      expect(q.has('a')).toBeFalse;
    });
    it('returns the current weight for key', () => {
      q.add('a', 1);
      q.add('b', 2);
      expect(q.weight('a')).toEqual(1);
      expect(q.weight('b')).toEqual(2);
    });
    it('returns undefined if key not in queue', () => {
      expect(q.weight('foo')).toBeUndefined;
    });
    it('throws if there is no element in queue', () => {
      expect(() => {
        q.min();
      }).toThrow();
    });
    it('returns the smallest element', () => {
      q.add('b', 2);
      q.add('a', 1);
      expect(q.min()).toEqual('a');
    });
    it('does not remove min element from queue', () => {
      q.add('b', 2);
      q.add('a', 1);
      q.min();
      expect(q.size).toEqual(2);
    });
    it('adds key to queue', () => {
      q.add('a', 1);
      expect(q.keys()).toEqual(['a']);
    });
    it('returns true if key was added', () => {
      expect(q.add('a', 1)).toBeTrue;
    });
    it('returns false if key already exists in queue', () => {
      q.add('a', 1);
      expect(q.add('a', 1)).toBeFalse;
    });
    it('removes min element from queue', () => {
      q.add('b', 2);
      q.add('a', 1);
      q.add('c', 3);
      q.add('e', 5);
      q.add('d', 4);
      expect(q.remove()).toEqual('a');
      expect(q.remove()).toEqual('b');
      expect(q.remove()).toEqual('c');
      expect(q.remove()).toEqual('d');
      expect(q.remove()).toEqual('e');
    });
    it('throws error if no element in queue', () => {
      expect(() => {
        q.remove();
      }).toThrow();
    });
    it('decreases weight of key', () => {
      q.add('a', 1);
      q.decrease('a', -1);
      expect(q.weight('a')).toEqual(-1);
    });
    it('raises error if key not in queue', () => {
      expect(() => {
        q.decrease('a', -1);
      }).toThrow();
    });
    it('raises error if new weight greater than current', () => {
      q.add('a', 1);
      expect(() => {
        q.decrease('a', 2);
      }).toThrow();
    });
  });
});

describe('list', () => {
  let list: qu.List;
  beforeEach(() => {
    list = new qu.List();
  });
  describe('dequeue', () => {
    it('returns undefined with empty list', () => {
      expect(list.dequeue()).toBeUndefined;
    });
    it('unlinks and returns first entry', () => {
      const obj = {};
      list.enqueue(obj);
      expect(list.dequeue()).toBe(obj);
    });
    it('unlinks and returns multiple entries in FIFO order', () => {
      const obj1 = {};
      const obj2 = {};
      list.enqueue(obj1);
      list.enqueue(obj2);
      expect(list.dequeue()).toBe(obj1);
      expect(list.dequeue()).toBe(obj2);
    });
    it('unlinks and relinks an entry if re-enqueued', () => {
      const obj1 = {};
      const obj2 = {};
      list.enqueue(obj1);
      list.enqueue(obj2);
      list.enqueue(obj1);
      expect(list.dequeue()).toBe(obj2);
      expect(list.dequeue()).toBe(obj1);
    });
    it('unlinks and relinks an entry if enqueued on another list', () => {
      const obj = {};
      const list2 = new qu.List();
      list.enqueue(obj);
      list2.enqueue(obj);
      expect(list.dequeue()).toBeUndefined;
      expect(list2.dequeue()).toBe(obj);
    });
    it('can return string representation', () => {
      list.enqueue({entry: 1});
      list.enqueue({entry: 2});
      expect(list.toString()).toBe('[{"entry":1}, {"entry":2}]');
    });
  });
});
