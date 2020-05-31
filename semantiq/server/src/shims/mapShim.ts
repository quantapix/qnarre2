namespace ts {
  interface IteratorShim<T> {
    next(): { value: T; done?: false } | { value: never; done: true };
  }
  interface MapShim<T> {
    readonly size: number;
    get(key: string): T | undefined;
    set(key: string, value: T): this;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    keys(): IteratorShim<string>;
    values(): IteratorShim<T>;
    entries(): IteratorShim<[string, T]>;
    forEach(action: (value: T, key: string) => void): void;
  }
  export function createMapShim(): new <T>() => MapShim<T> {
    function createDictionaryObject<T>(): Record<string, T> {
      const map = Object.create(/*prototype*/ null);
      map.__ = undefined;
      delete map.__;
      return map;
    }

    interface MapEntry<T> {
      readonly key?: string;
      value?: T;
      nextEntry?: MapEntry<T>;
      previousEntry?: MapEntry<T>;
      skipNext?: boolean;
    }

    class MapIterator<T, U extends string | T | [string, T]> {
      private currentEntry?: MapEntry<T>;
      private selector: (key: string, value: T) => U;

      constructor(currentEntry: MapEntry<T>, selector: (key: string, value: T) => U) {
        this.currentEntry = currentEntry;
        this.selector = selector;
      }

      public next(): { value: U; done?: false } | { value: never; done: true } {
        while (this.currentEntry) {
          const skipNext = !!this.currentEntry.skipNext;
          this.currentEntry = this.currentEntry.nextEntry;
          if (!skipNext) {
            break;
          }
        }
        if (this.currentEntry) {
          return { value: this.selector(this.currentEntry.key!, this.currentEntry.value!), done: false };
        } else {
          return { value: undefined as never, done: true };
        }
      }
    }

    return class<T> implements MapShim<T> {
      private data = createDictionaryObject<MapEntry<T>>();
      public size = 0;
      private readonly firstEntry: MapEntry<T>;
      private lastEntry: MapEntry<T>;

      constructor() {
        this.firstEntry = {};
        this.lastEntry = this.firstEntry;
      }

      get(key: string): T | undefined {
        const entry = this.data[key] as MapEntry<T> | undefined;
        return entry && entry.value!;
      }

      set(key: string, value: T): this {
        if (!this.has(key)) {
          this.size++;
          const newEntry: MapEntry<T> = {
            key,
            value,
          };
          this.data[key] = newEntry;
          const previousLastEntry = this.lastEntry;
          previousLastEntry.nextEntry = newEntry;
          newEntry.previousEntry = previousLastEntry;
          this.lastEntry = newEntry;
        } else {
          this.data[key].value = value;
        }
        return this;
      }

      has(key: string): boolean {
        return key in this.data;
      }

      delete(key: string): boolean {
        if (this.has(key)) {
          this.size--;
          const entry = this.data[key];
          delete this.data[key];
          const previousEntry = entry.previousEntry!;
          previousEntry.nextEntry = entry.nextEntry;
          if (entry.nextEntry) {
            entry.nextEntry.previousEntry = previousEntry;
          }
          if (this.lastEntry === entry) {
            this.lastEntry = previousEntry;
          }
          entry.previousEntry = undefined;
          entry.nextEntry = previousEntry;
          entry.skipNext = true;
          return true;
        }
        return false;
      }

      clear(): void {
        this.data = createDictionaryObject<MapEntry<T>>();
        this.size = 0;
        const firstEntry = this.firstEntry;
        let currentEntry = firstEntry.nextEntry;
        while (currentEntry) {
          const nextEntry = currentEntry.nextEntry;
          currentEntry.previousEntry = undefined;
          currentEntry.nextEntry = firstEntry;
          currentEntry.skipNext = true;
          currentEntry = nextEntry;
        }
        firstEntry.nextEntry = undefined;
        this.lastEntry = firstEntry;
      }

      keys(): IteratorShim<string> {
        return new MapIterator(this.firstEntry, (key) => key);
      }

      values(): IteratorShim<T> {
        return new MapIterator(this.firstEntry, (_key, value) => value);
      }

      entries(): IteratorShim<[string, T]> {
        return new MapIterator(this.firstEntry, (key, value) => [key, value] as [string, T]);
      }

      forEach(action: (value: T, key: string) => void): void {
        const iterator = this.entries();
        while (true) {
          const iterResult = iterator.next();
          if (iterResult.done) {
            break;
          }
          const [key, value] = iterResult.value;
          action(value, key);
        }
      }
    };
  }
}
