namespace qpx {
  interface Map<K, V> {
    [Symbol.iterator](): IterableIterator<[K, V]>;
    clear(): void;
    delete(key: K): boolean;
    entries(): IterableIterator<[K, V]>;
    forEach(
      callbackfn: (value: V, key: K, map: Map<K, V>) => void,
      thisArg?: any
    ): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    keys(): IterableIterator<K>;
    readonly [Symbol.toStringTag]: string;
    readonly size: number;
    set(key: K, value: V): this;
    values(): IterableIterator<V>;
  }

  interface MapConstructor {
    new (): Map<any, any>;
    new <K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
    new <K, V>(iterable: Iterable<readonly [K, V]>): Map<K, V>;
    readonly [Symbol.species]: MapConstructor;
    readonly prototype: Map<any, any>;
  }

  declare var Map: MapConstructor;

  export interface ReadonlyMap<K, V> {
    [Symbol.iterator](): IterableIterator<[K, V]>;
    entries(): IterableIterator<[K, V]>;
    forEach(
      callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
      thisArg?: any
    ): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    keys(): IterableIterator<K>;
    readonly size: number;
    values(): IterableIterator<V>;
  }

  interface WeakMap<K extends object, V> {
    delete(key: K): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    readonly [Symbol.toStringTag]: string;
    set(key: K, value: V): this;
  }

  interface WeakMapConstructor {
    new <K extends object = object, V = any>(
      entries?: readonly [K, V][] | null
    ): WeakMap<K, V>;
    new <K extends object, V>(iterable: Iterable<[K, V]>): WeakMap<K, V>;
    readonly prototype: WeakMap<object, any>;
  }

  declare var WeakMap: WeakMapConstructor;

  interface Set<T> {
    [Symbol.iterator](): IterableIterator<T>;
    add(value: T): this;
    clear(): void;
    delete(value: T): boolean;
    entries(): IterableIterator<[T, T]>;
    forEach(
      callbackfn: (value: T, value2: T, set: Set<T>) => void,
      thisArg?: any
    ): void;
    has(value: T): boolean;
    keys(): IterableIterator<T>;
    readonly [Symbol.toStringTag]: string;
    readonly size: number;
    values(): IterableIterator<T>;
  }

  interface SetConstructor {
    new <T = any>(values?: readonly T[] | null): Set<T>;
    new <T>(iterable?: Iterable<T> | null): Set<T>;
    readonly [Symbol.species]: SetConstructor;
    readonly prototype: Set<any>;
  }

  declare var Set: SetConstructor;

  export interface ReadonlySet<T> {
    [Symbol.iterator](): IterableIterator<T>;
    entries(): IterableIterator<[T, T]>;
    forEach(
      callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
      thisArg?: any
    ): void;
    has(value: T): boolean;
    keys(): IterableIterator<T>;
    readonly size: number;
    values(): IterableIterator<T>;
  }

  interface WeakSet<T extends object> {
    add(value: T): this;
    delete(value: T): boolean;
    has(value: T): boolean;
    readonly [Symbol.toStringTag]: string;
  }

  interface WeakSetConstructor {
    new <T extends object = object>(iterable: Iterable<T>): WeakSet<T>;
    new <T extends object = object>(values?: readonly T[] | null): WeakSet<T>;
    readonly prototype: WeakSet<object>;
  }

  declare var WeakSet: WeakSetConstructor;

  interface ArrayLike<T> {
    readonly length: number;
    readonly [n: number]: T;
  }

  interface ArrayConstructor {
    from<T>(arrayLike: ArrayLike<T>): T[];
    from<T, U>(
      arrayLike: ArrayLike<T>,
      mapfn: (v: T, k: number) => U,
      thisArg?: any
    ): U[];
    of<T>(...items: T[]): T[];
    from<T>(iterable: Iterable<T> | ArrayLike<T>): T[];
    from<T, U>(
      iterable: Iterable<T> | ArrayLike<T>,
      mapfn: (v: T, k: number) => U,
      thisArg?: any
    ): U[];
    readonly [Symbol.species]: ArrayConstructor;
    new (arrayLength?: number): any[];
    new <T>(arrayLength: number): T[];
    new <T>(...items: T[]): T[];
    (arrayLength?: number): any[];
    <T>(arrayLength: number): T[];
    <T>(...items: T[]): T[];
    isArray(arg: any): arg is any[];
    readonly prototype: any[];
  }

  declare var Array: ArrayConstructor;

  interface Array<T> {
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
    [Symbol.unscopables](): {
      copyWithin: boolean;
      entries: boolean;
      fill: boolean;
      find: boolean;
      findIndex: boolean;
      keys: boolean;
      values: boolean;
    };
    concat(...items: (T | ConcatArray<T>)[]): T[];
    concat(...items: ConcatArray<T>[]): T[];
    copyWithin(target: number, start: number, end?: number): this;
    entries(): IterableIterator<[number, T]>;
    every(
      callbackfn: (value: T, index: number, array: T[]) => unknown,
      thisArg?: any
    ): boolean;
    fill(value: T, start?: number, end?: number): this;
    filter(
      callbackfn: (value: T, index: number, array: T[]) => unknown,
      thisArg?: any
    ): T[];
    filter<S extends T>(
      callbackfn: (value: T, index: number, array: T[]) => value is S,
      thisArg?: any
    ): S[];
    find(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      thisArg?: any
    ): T | undefined;
    find<S extends T>(
      predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
      thisArg?: any
    ): S | undefined;
    findIndex(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      thisArg?: any
    ): number;
    flat<_U>(depth?: number): any[];
    flat<U>(depth?: number): any[];
    flat<U>(this: U[], depth: 0): U[];
    flat<U>(this: U[], depth: 0): U[];
    flat<U>(this: U[][], depth?: 1): U[];
    flat<U>(this: U[][], depth?: 1): U[];
    flat<U>(this: U[][][], depth: 2): U[];
    flat<U>(this: U[][][], depth: 2): U[];
    flat<U>(this: U[][][][], depth: 3): U[];
    flat<U>(this: U[][][][], depth: 3): U[];
    flat<U>(this: U[][][][][], depth: 4): U[];
    flat<U>(this: U[][][][][], depth: 4): U[];
    flat<U>(this: U[][][][][][], depth: 5): U[];
    flat<U>(this: U[][][][][][], depth: 5): U[];
    flat<U>(this: U[][][][][][][], depth: 6): U[];
    flat<U>(this: U[][][][][][][], depth: 6): U[];
    flat<U>(this: U[][][][][][][][], depth: 7): U[];
    flat<U>(this: U[][][][][][][][], depth: 7): U[];
    flatMap<U, This = undefined>(
      callback: (
        this: This,
        value: T,
        index: number,
        array: T[]
      ) => U | ReadonlyArray<U>,
      thisArg?: This
    ): U[];
    flatMap<U, This = undefined>(
      callback: (
        this: This,
        value: T,
        index: number,
        array: T[]
      ) => U | ReadonlyArray<U>,
      thisArg?: This
    ): U[];
    forEach(
      callbackfn: (value: T, index: number, array: T[]) => void,
      thisArg?: any
    ): void;
    includes(searchElement: T, fromIndex?: number): boolean;
    indexOf(searchElement: T, fromIndex?: number): number;
    join(separator?: string): string;
    keys(): IterableIterator<number>;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    length: number;
    map<U>(
      callbackfn: (value: T, index: number, array: T[]) => U,
      thisArg?: any
    ): U[];
    pop(): T | undefined;
    push(...items: T[]): number;
    reduce(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => T,
      initialValue: T
    ): T;
    reduce(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => T
    ): T;
    reduce<U>(
      callbackfn: (
        previousValue: U,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => U,
      initialValue: U
    ): U;
    reduceRight(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => T,
      initialValue: T
    ): T;
    reduceRight(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => T
    ): T;
    reduceRight<U>(
      callbackfn: (
        previousValue: U,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => U,
      initialValue: U
    ): U;
    reverse(): T[];
    shift(): T | undefined;
    slice(start?: number, end?: number): T[];
    some(
      callbackfn: (value: T, index: number, array: T[]) => unknown,
      thisArg?: any
    ): boolean;
    sort(compareFn?: (a: T, b: T) => number): this;
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    splice(start: number, deleteCount: number): T[];
    splice(start: number, deleteCount?: number): T[];
    toLocaleString(): string;
    toString(): string;
    unshift(...items: T[]): number;
    values(): IterableIterator<T>;
  }

  interface ArrayBuffer {
    readonly [Symbol.toStringTag]: string;
    readonly byteLength: number;
    slice(begin: number, end?: number): ArrayBuffer;
  }

  interface ArrayBufferTypes {
    ArrayBuffer: ArrayBuffer;
    SharedArrayBuffer: SharedArrayBuffer;
  }

  type ArrayBufferLike = ArrayBufferTypes[keyof ArrayBufferTypes];

  interface ArrayBufferConstructor {
    readonly prototype: ArrayBuffer;
    new (byteLength: number): ArrayBuffer;
    isView(arg: any): arg is ArrayBufferView;
    readonly [Symbol.species]: ArrayBufferConstructor;
  }

  declare var ArrayBuffer: ArrayBufferConstructor;

  interface ArrayBufferView {
    buffer: ArrayBufferLike;
    byteLength: number;
    byteOffset: number;
  }

  interface ReadonlyArray<T> {
    [Symbol.iterator](): IterableIterator<T>;
    concat(...items: (T | ConcatArray<T>)[]): T[];
    concat(...items: ConcatArray<T>[]): T[];
    entries(): IterableIterator<[number, T]>;
    every(
      callbackfn: (value: T, index: number, array: readonly T[]) => unknown,
      thisArg?: any
    ): boolean;
    filter(
      callbackfn: (value: T, index: number, array: readonly T[]) => unknown,
      thisArg?: any
    ): T[];
    filter<S extends T>(
      callbackfn: (value: T, index: number, array: readonly T[]) => value is S,
      thisArg?: any
    ): S[];
    find(
      predicate: (value: T, index: number, obj: readonly T[]) => unknown,
      thisArg?: any
    ): T | undefined;
    find<S extends T>(
      predicate: (
        this: void,
        value: T,
        index: number,
        obj: readonly T[]
      ) => value is S,
      thisArg?: any
    ): S | undefined;
    findIndex(
      predicate: (value: T, index: number, obj: readonly T[]) => unknown,
      thisArg?: any
    ): number;
    flat<_U>(depth?: number): any[];
    flat<U>(depth?: number): any[];
    flat<U>(
      this:
        | ReadonlyArray<U[][][][]>
        | ReadonlyArray<ReadonlyArray<U[][][]>>
        | ReadonlyArray<ReadonlyArray<U[][]>[]>
        | ReadonlyArray<ReadonlyArray<U[]>[][]>
        | ReadonlyArray<ReadonlyArray<U>[][][]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[][]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[][]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[][]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>[]>
        | ReadonlyArray<
            ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>
          >,
      depth: 4
    ): U[];
    flat<U>(
      this:
        | ReadonlyArray<U[][][][]>
        | ReadonlyArray<ReadonlyArray<U[][][]>>
        | ReadonlyArray<ReadonlyArray<U[][]>[]>
        | ReadonlyArray<ReadonlyArray<U[]>[][]>
        | ReadonlyArray<ReadonlyArray<U>[][][]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[][]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[][]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[][]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>[]>
        | ReadonlyArray<
            ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>
          >,
      depth: 4
    ): U[];
    flat<U>(
      this:
        | ReadonlyArray<U[][][]>
        | ReadonlyArray<ReadonlyArray<U>[][]>
        | ReadonlyArray<ReadonlyArray<U[]>[]>
        | ReadonlyArray<ReadonlyArray<U[][]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>,
      depth: 3
    ): U[];
    flat<U>(
      this:
        | ReadonlyArray<U[][][]>
        | ReadonlyArray<ReadonlyArray<U>[][]>
        | ReadonlyArray<ReadonlyArray<U[]>[]>
        | ReadonlyArray<ReadonlyArray<U[][]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>,
      depth: 3
    ): U[];
    flat<U>(
      this:
        | ReadonlyArray<U[][]>
        | ReadonlyArray<ReadonlyArray<U[]>>
        | ReadonlyArray<ReadonlyArray<U>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>,
      depth: 2
    ): U[];
    flat<U>(
      this:
        | ReadonlyArray<U[][]>
        | ReadonlyArray<ReadonlyArray<U[]>>
        | ReadonlyArray<ReadonlyArray<U>[]>
        | ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>,
      depth: 2
    ): U[];
    flat<U>(
      this: ReadonlyArray<U[]> | ReadonlyArray<ReadonlyArray<U>>,
      depth?: 1
    ): U[];
    flat<U>(
      this: ReadonlyArray<U[]> | ReadonlyArray<ReadonlyArray<U>>,
      depth?: 1
    ): U[];
    flat<U>(this: ReadonlyArray<U>, depth: 0): U[];
    flat<U>(this: ReadonlyArray<U>, depth: 0): U[];
    flatMap<U, This = undefined>(
      callback: (
        this: This,
        value: T,
        index: number,
        array: T[]
      ) => U | ReadonlyArray<U>,
      thisArg?: This
    ): U[];
    flatMap<U, This = undefined>(
      callback: (
        this: This,
        value: T,
        index: number,
        array: T[]
      ) => U | ReadonlyArray<U>,
      thisArg?: This
    ): U[];
    forEach(
      callbackfn: (value: T, index: number, array: readonly T[]) => void,
      thisArg?: any
    ): void;
    includes(searchElement: T, fromIndex?: number): boolean;
    indexOf(searchElement: T, fromIndex?: number): number;
    join(separator?: string): string;
    keys(): IterableIterator<number>;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    map<U>(
      callbackfn: (value: T, index: number, array: readonly T[]) => U,
      thisArg?: any
    ): U[];
    readonly [n: number]: T;
    readonly length: number;
    reduce(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => T,
      initialValue: T
    ): T;
    reduce(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => T
    ): T;
    reduce<U>(
      callbackfn: (
        previousValue: U,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => U,
      initialValue: U
    ): U;
    reduceRight(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => T,
      initialValue: T
    ): T;
    reduceRight(
      callbackfn: (
        previousValue: T,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => T
    ): T;
    reduceRight<U>(
      callbackfn: (
        previousValue: U,
        currentValue: T,
        currentIndex: number,
        array: readonly T[]
      ) => U,
      initialValue: U
    ): U;
    slice(start?: number, end?: number): T[];
    some(
      callbackfn: (value: T, index: number, array: readonly T[]) => unknown,
      thisArg?: any
    ): boolean;
    toLocaleString(): string;
    toString(): string;
    values(): IterableIterator<T>;
  }

  interface Math {
    abs(x: number): number;
    acos(x: number): number;
    acosh(x: number): number;
    asin(x: number): number;
    asinh(x: number): number;
    atan(x: number): number;
    atan2(y: number, x: number): number;
    atanh(x: number): number;
    cbrt(x: number): number;
    ceil(x: number): number;
    clz32(x: number): number;
    cos(x: number): number;
    cosh(x: number): number;
    exp(x: number): number;
    expm1(x: number): number;
    floor(x: number): number;
    fround(x: number): number;
    hypot(...values: number[]): number;
    imul(x: number, y: number): number;
    log(x: number): number;
    log10(x: number): number;
    log1p(x: number): number;
    log2(x: number): number;
    max(...values: number[]): number;
    min(...values: number[]): number;
    pow(x: number, y: number): number;
    random(): number;
    readonly [Symbol.toStringTag]: string;
    readonly E: number;
    readonly LN10: number;
    readonly LN2: number;
    readonly LOG10E: number;
    readonly LOG2E: number;
    readonly PI: number;
    readonly SQRT1_2: number;
    readonly SQRT2: number;
    round(x: number): number;
    sign(x: number): number;
    sin(x: number): number;
    sinh(x: number): number;
    sqrt(x: number): number;
    tan(x: number): number;
    tanh(x: number): number;
    trunc(x: number): number;
  }

  declare var Math: Math;

  interface RegExp {
    [Symbol.match](string: string): RegExpMatchArray | null;
    [Symbol.matchAll](str: string): IterableIterator<RegExpMatchArray>;
    [Symbol.replace](
      string: string,
      replacer: (substring: string, ...args: any[]) => string
    ): string;
    [Symbol.replace](string: string, replaceValue: string): string;
    [Symbol.search](string: string): number;
    [Symbol.split](string: string, limit?: number): string[];
    compile(): this;
    exec(string: string): RegExpExecArray | null;
    lastIndex: number;
    readonly dotAll: boolean;
    readonly flags: string;
    readonly global: boolean;
    readonly ignoreCase: boolean;
    readonly multiline: boolean;
    readonly source: string;
    readonly sticky: boolean;
    readonly unicode: boolean;
    test(string: string): boolean;
  }

  interface RegExpConstructor {
    (pattern: RegExp | string, flags?: string): RegExp;
    (pattern: RegExp | string): RegExp;
    (pattern: string, flags?: string): RegExp;
    // Non-standard extensions
    $1: string;
    $2: string;
    $3: string;
    $4: string;
    $5: string;
    $6: string;
    $7: string;
    $8: string;
    $9: string;
    lastMatch: string;
    new (pattern: RegExp | string, flags?: string): RegExp;
    new (pattern: RegExp | string): RegExp;
    new (pattern: string, flags?: string): RegExp;
    readonly [Symbol.species]: RegExpConstructor;
    readonly prototype: RegExp;
  }

  declare var RegExp: RegExpConstructor;

  interface String {
    [Symbol.iterator](): IterableIterator<string>;
    anchor(name: string): string;
    big(): string;
    blink(): string;
    bold(): string;
    charAt(pos: number): string;
    charCodeAt(index: number): number;
    codePointAt(pos: number): number | undefined;
    concat(...strings: string[]): string;
    endsWith(searchString: string, endPosition?: number): boolean;
    fixed(): string;
    fontcolor(color: string): string;
    fontsize(size: number): string;
    fontsize(size: string): string;
    includes(searchString: string, position?: number): boolean;
    indexOf(searchString: string, position?: number): number;
    italics(): string;
    lastIndexOf(searchString: string, position?: number): number;
    link(url: string): string;
    localeCompare(
      that: string,
      locales?: string | string[],
      options?: Intl.CollatorOptions
    ): number;
    localeCompare(that: string): number;
    match(matcher: {
      [Symbol.match](string: string): RegExpMatchArray | null;
    }): RegExpMatchArray | null;
    match(regexp: string | RegExp): RegExpMatchArray | null;
    matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray>;
    normalize(form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string;
    normalize(form?: string): string;
    padEnd(maxLength: number, fillString?: string): string;
    padStart(maxLength: number, fillString?: string): string;
    readonly [index: number]: string;
    readonly length: number;
    repeat(count: number): string;
    replace(
      searchValue: string | RegExp,
      replacer: (substring: string, ...args: any[]) => string
    ): string;
    replace(searchValue: string | RegExp, replaceValue: string): string;
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
    search(regexp: string | RegExp): number;
    search(searcher: {[Symbol.search](string: string): number}): number;
    slice(start?: number, end?: number): string;
    small(): string;
    split(separator: string | RegExp, limit?: number): string[];
    split(
      splitter: {[Symbol.split](string: string, limit?: number): string[]},
      limit?: number
    ): string[];
    startsWith(searchString: string, position?: number): boolean;
    strike(): string;
    sub(): string;
    substr(from: number, length?: number): string;
    substring(start: number, end?: number): string;
    sup(): string;
    toLocaleLowerCase(locales?: string | string[]): string;
    toLocaleUpperCase(locales?: string | string[]): string;
    toLowerCase(): string;
    toString(): string;
    toUpperCase(): string;
    trim(): string;
    trimEnd(): string;
    trimLeft(): string;
    trimRight(): string;
    trimStart(): string;
    valueOf(): string;
    replace(
      searchValue: {
        [Symbol.replace](string: string, replaceValue: string): string;
      },
      replaceValue: string
    ): string;
    replace(
      searchValue: {
        [Symbol.replace](
          string: string,
          replacer: (substring: string, ...args: any[]) => string
        ): string;
      },
      replacer: (substring: string, ...args: any[]) => string
    ): string;
  }

  interface StringConstructor {
    (value?: any): string;
    fromCharCode(...codes: number[]): string;
    fromCodePoint(...codePoints: number[]): string;
    new (value?: any): String;
    raw(template: TemplateStringsArray, ...substitutions: any[]): string;
    readonly prototype: String;
  }

  declare var String: StringConstructor;

  interface Generator<T = unknown, TReturn = any, TNext = unknown>
    extends Iterator<T, TReturn, TNext> {
    // NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
    return(value: TReturn): IteratorResult<T, TReturn>;
    throw(e: any): IteratorResult<T, TReturn>;
    [Symbol.iterator](): Generator<T, TReturn, TNext>;
  }

  interface GeneratorFunction {
    new (...args: any[]): Generator;
    (...args: any[]): Generator;
    readonly length: number;
    readonly name: string;
    readonly prototype: Generator;
    readonly [Symbol.toStringTag]: string;
  }

  export interface GeneratorFunctionConstructor {
    new (...args: string[]): GeneratorFunction;
    (...args: string[]): GeneratorFunction;
    readonly length: number;
    readonly name: string;
    readonly prototype: GeneratorFunction;
  }

  interface IteratorYieldResult<TYield> {
    done?: false;
    value: TYield;
  }

  interface IteratorReturnResult<TReturn> {
    done: true;
    value: TReturn;
  }

  type IteratorResult<T, TReturn = any> =
    | IteratorYieldResult<T>
    | IteratorReturnResult<TReturn>;

  interface Iterator<T, TReturn = any, TNext = undefined> {
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
    return?(value?: TReturn): IteratorResult<T, TReturn>;
    throw?(e?: any): IteratorResult<T, TReturn>;
  }

  interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
  }

  interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
  }

  interface Promise<T> {
    catch<TResult = never>(
      onrejected?:
        | ((reason: any) => TResult | PromiseLike<TResult>)
        | undefined
        | null
    ): Promise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
    readonly [Symbol.toStringTag]: string;
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onrejected?:
        | ((reason: any) => TResult2 | PromiseLike<TResult2>)
        | undefined
        | null
    ): Promise<TResult1 | TResult2>;
  }

  type PromiseSettledResult<T> =
    | PromiseFulfilledResult<T>
    | PromiseRejectedResult;

  interface PromiseConstructor {
    all<T>(values: Iterable<T | PromiseLike<T>>): Promise<T[]>;
    all<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T[]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>,
        T9 | PromiseLike<T9>,
        T10 | PromiseLike<T10>
      ]
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>,
        T9 | PromiseLike<T9>
      ]
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>
      ]
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
    all<T1, T2, T3, T4, T5, T6, T7>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>
      ]
    ): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
    all<T1, T2, T3, T4, T5, T6>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>
      ]
    ): Promise<[T1, T2, T3, T4, T5, T6]>;
    all<T1, T2, T3, T4, T5>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>
      ]
    ): Promise<[T1, T2, T3, T4, T5]>;
    all<T1, T2, T3, T4>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>
      ]
    ): Promise<[T1, T2, T3, T4]>;
    all<T1, T2, T3>(
      values: readonly [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>
      ]
    ): Promise<[T1, T2, T3]>;
    all<T1, T2>(
      values: readonly [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>]
    ): Promise<[T1, T2]>;
    allSettled<T>(
      values: Iterable<T>
    ): Promise<PromiseSettledResult<T extends PromiseLike<infer U> ? U : T>[]>;
    new <T>(
      executor: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void
      ) => void
    ): Promise<T>;
    race<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
    race<T>(
      values: Iterable<T>
    ): Promise<T extends PromiseLike<infer U> ? U : T>;
    race<T>(
      values: readonly T[]
    ): Promise<T extends PromiseLike<infer U> ? U : T>;
    readonly [Symbol.species]: PromiseConstructor;
    readonly prototype: Promise<any>;
    reject<T = never>(reason?: any): Promise<T>;
    resolve(): Promise<void>;
    resolve<T>(value: T | PromiseLike<T>): Promise<T>;
    any<T>(
      values: (T | PromiseLike<T>)[] | Iterable<T | PromiseLike<T>>
    ): Promise<T>;
    allSettled<T extends readonly unknown[] | readonly [unknown]>(
      values: T
    ): Promise<
      {
        readonly [P in keyof T]: PromiseSettledResult<
          T[P] extends PromiseLike<infer U> ? U : T[P]
        >;
      }
    >;
  }

  declare var Promise: PromiseConstructor;

  interface ProxyHandler<T extends object> {
    getPrototypeOf?(target: T): object | null;
    setPrototypeOf?(target: T, v: any): boolean;
    isExtensible?(target: T): boolean;
    preventExtensions?(target: T): boolean;
    getOwnPropertyDescriptor?(
      target: T,
      p: PropertyKey
    ): PropertyDescriptor | undefined;
    has?(target: T, p: PropertyKey): boolean;
    get?(target: T, p: PropertyKey, receiver: any): any;
    set?(target: T, p: PropertyKey, value: any, receiver: any): boolean;
    deleteProperty?(target: T, p: PropertyKey): boolean;
    defineProperty?(
      target: T,
      p: PropertyKey,
      attributes: PropertyDescriptor
    ): boolean;
    enumerate?(target: T): PropertyKey[];
    ownKeys?(target: T): PropertyKey[];
    apply?(target: T, thisArg: any, argArray?: any): any;
    construct?(target: T, argArray: any, newTarget?: any): object;
  }

  interface ProxyConstructor {
    revocable<T extends object>(
      target: T,
      handler: ProxyHandler<T>
    ): {proxy: T; revoke: () => void};
    new <T extends object>(target: T, handler: ProxyHandler<T>): T;
  }
  declare var Proxy: ProxyConstructor;

  declare namespace Reflect {
    function apply(
      target: Function,
      thisArgument: any,
      argumentsList: ArrayLike<any>
    ): any;
    function construct(
      target: Function,
      argumentsList: ArrayLike<any>,
      newTarget?: any
    ): any;
    function defineProperty(
      target: object,
      propertyKey: PropertyKey,
      attributes: PropertyDescriptor
    ): boolean;
    function deleteProperty(target: object, propertyKey: PropertyKey): boolean;
    function enumerate(target: object): IterableIterator<any>;
    function get(target: object, propertyKey: PropertyKey, receiver?: any): any;
    function getOwnPropertyDescriptor(
      target: object,
      propertyKey: PropertyKey
    ): PropertyDescriptor | undefined;
    function getPrototypeOf(target: object): object;
    function has(target: object, propertyKey: PropertyKey): boolean;
    function isExtensible(target: object): boolean;
    function ownKeys(target: object): PropertyKey[];
    function preventExtensions(target: object): boolean;
    function set(
      target: object,
      propertyKey: PropertyKey,
      value: any,
      receiver?: any
    ): boolean;
    function setPrototypeOf(target: object, proto: any): boolean;
  }

  export interface QSymbol {
    readonly [Symbol.toStringTag]: string;
    readonly description: string | undefined;
    toString(): string;
    valueOf(): symbol;
  }

  interface QSymbolConstructor {
    (description?: string | number): symbol;
    for(key: string): symbol;
    keyFor(sym: symbol): string | undefined;
    readonly asyncIterator: symbol;
    readonly hasInstance: symbol;
    readonly isConcatSpreadable: symbol;
    readonly iterator: symbol;
    readonly match: symbol;
    readonly matchAll: symbol;
    readonly prototype: Symbol;
    readonly replace: symbol;
    readonly search: symbol;
    readonly species: symbol;
    readonly split: symbol;
    readonly toPrimitive: symbol;
    readonly toStringTag: symbol;
    readonly unscopables: symbol;
  }

  declare var QSymbol: QSymbolConstructor;

  interface SharedArrayBuffer {
    length: number;
    readonly [Symbol.species]: SharedArrayBuffer;
    readonly [Symbol.toStringTag]: 'SharedArrayBuffer';
    readonly byteLength: number;
    slice(begin: number, end?: number): SharedArrayBuffer;
  }

  interface SharedArrayBufferConstructor {
    readonly prototype: SharedArrayBuffer;
    new (byteLength: number): SharedArrayBuffer;
  }
  declare var SharedArrayBuffer: SharedArrayBufferConstructor;

  interface Atomics {
    add(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    and(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    compareExchange(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      expectedValue: number,
      replacementValue: number
    ): number;
    exchange(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    isLockFree(size: number): boolean;
    load(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number
    ): number;
    or(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    store(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    sub(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    wait(
      typedArray: Int32Array,
      index: number,
      value: number,
      timeout?: number
    ): 'ok' | 'not-equal' | 'timed-out';
    notify(typedArray: Int32Array, index: number, count: number): number;
    xor(
      typedArray:
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array,
      index: number,
      value: number
    ): number;
    readonly [Symbol.toStringTag]: 'Atomics';
  }

  declare var Atomics: Atomics;

  interface AsyncGenerator<T = unknown, TReturn = any, TNext = unknown>
    extends AsyncIterator<T, TReturn, TNext> {
    [Symbol.asyncIterator](): AsyncGenerator<T, TReturn, TNext>;
    next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
    return(
      value: TReturn | PromiseLike<TReturn>
    ): Promise<IteratorResult<T, TReturn>>;
    throw(e: any): Promise<IteratorResult<T, TReturn>>;
  }

  interface AsyncGeneratorFunction {
    (...args: any[]): AsyncGenerator;
    new (...args: any[]): AsyncGenerator;
    readonly length: number;
    readonly name: string;
    readonly prototype: AsyncGenerator;
  }

  export interface AsyncGeneratorFunctionConstructor {
    (...args: string[]): AsyncGeneratorFunction;
    new (...args: string[]): AsyncGeneratorFunction;
    readonly length: number;
    readonly name: string;
    readonly prototype: AsyncGeneratorFunction;
  }

  interface AsyncIterator<T, TReturn = any, TNext = undefined> {
    next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
    next(value?: any): Promise<IteratorResult<T>>;
    return?(value?: any): Promise<IteratorResult<T>>;
    return?(
      value?: TReturn | PromiseLike<TReturn>
    ): Promise<IteratorResult<T, TReturn>>;
    throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
    throw?(e?: any): Promise<IteratorResult<T>>;
  }

  export interface AsyncIterable<T> {
    [Symbol.asyncIterator](): AsyncIterator<T>;
  }

  export interface AsyncIterableIterator<T> extends AsyncIterator<T> {
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  }

  interface RegExpMatchArray extends Array<string> {
    index?: number;
    input?: string;
    groups?: {
      [key: string]: string;
    };
  }

  interface RegExpExecArray extends Array<string> {
    index: number;
    input: string;
    groups?: {
      [key: string]: string;
    };
  }

  interface DataView {
    getBigInt64(byteOffset: number, littleEndian?: boolean): bigint;
    getBigInt64(byteOffset: number, littleEndian?: boolean): bigint;
    getBigUint64(byteOffset: number, littleEndian?: boolean): bigint;
    getBigUint64(byteOffset: number, littleEndian?: boolean): bigint;
    getFloat32(byteOffset: number, littleEndian?: boolean): number;
    getFloat64(byteOffset: number, littleEndian?: boolean): number;
    getInt16(byteOffset: number, littleEndian?: boolean): number;
    getInt32(byteOffset: number, littleEndian?: boolean): number;
    getInt8(byteOffset: number): number;
    getUint16(byteOffset: number, littleEndian?: boolean): number;
    getUint32(byteOffset: number, littleEndian?: boolean): number;
    getUint8(byteOffset: number): number;
    readonly [Symbol.toStringTag]: string;
    readonly buffer: ArrayBuffer;
    readonly byteLength: number;
    readonly byteOffset: number;
    setBigInt64(
      byteOffset: number,
      value: bigint,
      littleEndian?: boolean
    ): void;
    setBigInt64(
      byteOffset: number,
      value: bigint,
      littleEndian?: boolean
    ): void;
    setBigUint64(
      byteOffset: number,
      value: bigint,
      littleEndian?: boolean
    ): void;
    setBigUint64(
      byteOffset: number,
      value: bigint,
      littleEndian?: boolean
    ): void;
    setFloat32(byteOffset: number, value: number, littleEndian?: boolean): void;
    setFloat64(byteOffset: number, value: number, littleEndian?: boolean): void;
    setInt16(byteOffset: number, value: number, littleEndian?: boolean): void;
    setInt32(byteOffset: number, value: number, littleEndian?: boolean): void;
    setInt8(byteOffset: number, value: number): void;
    setUint16(byteOffset: number, value: number, littleEndian?: boolean): void;
    setUint32(byteOffset: number, value: number, littleEndian?: boolean): void;
    setUint8(byteOffset: number, value: number): void;
  }

  interface DataViewConstructor {
    new (
      buffer: ArrayBufferLike,
      byteOffset?: number,
      byteLength?: number
    ): DataView;
  }
  declare var DataView: DataViewConstructor;

  interface PromiseFulfilledResult<T> {
    status: 'fulfilled';
    value: T;
  }

  interface PromiseRejectedResult {
    status: 'rejected';
    reason: any;
  }

  declare var NaN: number;
  declare var Infinity: number;

  declare function decodeURI(encodedURI: string): string;
  declare function decodeURIComponent(encodedURIComponent: string): string;
  declare function encodeURI(uri: string): string;
  declare function encodeURIComponent(
    uriComponent: string | number | boolean
  ): string;
  declare function escape(string: string): string;
  //declare function eval(x: string): any;
  declare function isFinite(number: number): boolean;
  declare function isNaN(number: number): boolean;
  declare function parseFloat(string: string): number;
  declare function parseInt(s: string, radix?: number): number;

  declare function unescape(string: string): string;

  declare type PropertyKey = string | number | symbol;

  interface PropertyDescriptor {
    configurable?: boolean;
    enumerable?: boolean;
    value?: any;
    writable?: boolean;
    get?(): any;
    set?(v: any): void;
  }

  interface PropertyDescriptorMap {
    [s: string]: PropertyDescriptor;
  }

  interface Object {
    constructor: Function;
    hasOwnProperty(v: PropertyKey): boolean;
    isPrototypeOf(v: Object): boolean;
    propertyIsEnumerable(v: PropertyKey): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): Object;
  }

  interface ObjectConstructor {
    (): any;
    (value: any): any;
    assign(target: object, ...sources: any[]): any;
    assign<T, U, V, W>(
      target: T,
      source1: U,
      source2: V,
      source3: W
    ): T & U & V & W;
    assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
    assign<T, U>(target: T, source: U): T & U;
    create(
      o: object | null,
      properties: PropertyDescriptorMap & ThisType<any>
    ): any;
    create(o: object | null): any;
    defineProperties(
      o: any,
      properties: PropertyDescriptorMap & ThisType<any>
    ): any;
    defineProperty(
      o: any,
      p: PropertyKey,
      attributes: PropertyDescriptor & ThisType<any>
    ): any;
    entries(o: {}): [string, any][];
    entries<T>(o: {[s: string]: T} | ArrayLike<T>): [string, T][];
    freeze<T extends Function>(f: T): T;
    freeze<T>(a: T[]): readonly T[];
    freeze<T>(o: T): Readonly<T>;
    fromEntries(entries: Iterable<readonly any[]>): any;
    fromEntries<T = any>(
      entries: Iterable<readonly [PropertyKey, T]>
    ): {[k: string]: T};
    getOwnPropertyDescriptor(
      o: any,
      p: PropertyKey
    ): PropertyDescriptor | undefined;
    getOwnPropertyNames(o: any): string[];
    getOwnPropertySymbols(o: any): symbol[];
    getPrototypeOf(o: any): any;
    is(value1: any, value2: any): boolean;
    isExtensible(o: any): boolean;
    isFrozen(o: any): boolean;
    isSealed(o: any): boolean;
    keys(o: {}): string[];
    keys(o: object): string[];
    new (value?: any): Object;
    preventExtensions<T>(o: T): T;
    readonly prototype: Object;
    seal<T>(o: T): T;
    setPrototypeOf(o: any, proto: object | null): any;
    values(o: {}): any[];
    values<T>(o: {[s: string]: T} | ArrayLike<T>): T[];
    getOwnPropertyDescriptors<T>(
      o: T
    ): {[P in keyof T]: TypedPropertyDescriptor<T[P]>} & {
      [x: string]: PropertyDescriptor;
    };
  }

  declare var Object: ObjectConstructor;

  interface Function {
    [Symbol.hasInstance](value: any): boolean;
    apply(this: Function, thisArg: any, argArray?: any): any;
    arguments: any;
    bind(this: Function, thisArg: any, ...argArray: any[]): any;
    call(this: Function, thisArg: any, ...argArray: any[]): any;
    caller: Function;
    prototype: any;
    readonly length: number;
    readonly name: string;
    toString(): string;
  }

  interface FunctionConstructor {
    (...args: string[]): Function;
    new (...args: string[]): Function;
    readonly prototype: Function;
  }

  declare var Function: FunctionConstructor;

  type ThisParameterType<T> = T extends (this: infer U, ...args: any[]) => any
    ? U
    : unknown;
  type OmitThisParameter<T> = unknown extends ThisParameterType<T>
    ? T
    : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T;

  export interface CallableFunction extends Function {
    apply<T, A extends any[], R>(
      this: (this: T, ...args: A) => R,
      thisArg: T,
      args: A
    ): R;
    apply<T, R>(this: (this: T) => R, thisArg: T): R;
    bind<T, A0, A extends any[], R>(
      this: (this: T, arg0: A0, ...args: A) => R,
      thisArg: T,
      arg0: A0
    ): (...args: A) => R;
    bind<T, A0, A1, A extends any[], R>(
      this: (this: T, arg0: A0, arg1: A1, ...args: A) => R,
      thisArg: T,
      arg0: A0,
      arg1: A1
    ): (...args: A) => R;
    bind<T, A0, A1, A2, A extends any[], R>(
      this: (this: T, arg0: A0, arg1: A1, arg2: A2, ...args: A) => R,
      thisArg: T,
      arg0: A0,
      arg1: A1,
      arg2: A2
    ): (...args: A) => R;
    bind<T, A0, A1, A2, A3, A extends any[], R>(
      this: (this: T, arg0: A0, arg1: A1, arg2: A2, arg3: A3, ...args: A) => R,
      thisArg: T,
      arg0: A0,
      arg1: A1,
      arg2: A2,
      arg3: A3
    ): (...args: A) => R;
    bind<T, AX, R>(
      this: (this: T, ...args: AX[]) => R,
      thisArg: T,
      ...args: AX[]
    ): (...args: AX[]) => R;
    bind<T>(this: T, thisArg: ThisParameterType<T>): OmitThisParameter<T>;
    call<T, A extends any[], R>(
      this: (this: T, ...args: A) => R,
      thisArg: T,
      ...args: A
    ): R;
  }

  export interface NewableFunction extends Function {
    apply<T, A extends any[]>(
      this: new (...args: A) => T,
      thisArg: T,
      args: A
    ): void;
    apply<T>(this: new () => T, thisArg: T): void;
    bind<A0, A extends any[], R>(
      this: new (arg0: A0, ...args: A) => R,
      thisArg: any,
      arg0: A0
    ): new (...args: A) => R;
    bind<A0, A1, A extends any[], R>(
      this: new (arg0: A0, arg1: A1, ...args: A) => R,
      thisArg: any,
      arg0: A0,
      arg1: A1
    ): new (...args: A) => R;
    bind<A0, A1, A2, A extends any[], R>(
      this: new (arg0: A0, arg1: A1, arg2: A2, ...args: A) => R,
      thisArg: any,
      arg0: A0,
      arg1: A1,
      arg2: A2
    ): new (...args: A) => R;
    bind<A0, A1, A2, A3, A extends any[], R>(
      this: new (arg0: A0, arg1: A1, arg2: A2, arg3: A3, ...args: A) => R,
      thisArg: any,
      arg0: A0,
      arg1: A1,
      arg2: A2,
      arg3: A3
    ): new (...args: A) => R;
    bind<AX, R>(
      this: new (...args: AX[]) => R,
      thisArg: any,
      ...args: AX[]
    ): new (...args: AX[]) => R;
    bind<T>(this: T, thisArg: any): T;
    call<T, A extends any[]>(
      this: new (...args: A) => T,
      thisArg: T,
      ...args: A
    ): void;
  }

  export interface IArguments {
    [index: number]: any;
    [Symbol.iterator](): IterableIterator<any>;
    callee: Function;
    length: number;
  }

  interface Boolean {
    valueOf(): boolean;
  }

  interface BooleanConstructor {
    new (value?: any): Boolean;
    <T>(value?: T): boolean;
    readonly prototype: Boolean;
  }

  declare var Boolean: BooleanConstructor;

  interface Number {
    toExponential(fractionDigits?: number): string;
    toFixed(fractionDigits?: number): string;
    toLocaleString(
      locales?: string | string[],
      options?: Intl.NumberFormatOptions
    ): string;
    toPrecision(precision?: number): string;
    toString(radix?: number): string;
    valueOf(): number;
  }

  interface NumberConstructor {
    (value?: any): number;
    isFinite(number: number): boolean;
    isInteger(number: number): boolean;
    isNaN(number: number): boolean;
    isSafeInteger(number: number): boolean;
    new (value?: any): Number;
    parseFloat(string: string): number;
    parseInt(string: string, radix?: number): number;
    readonly EPSILON: number;
    readonly MAX_SAFE_INTEGER: number;
    readonly MAX_VALUE: number;
    readonly MIN_SAFE_INTEGER: number;
    readonly MIN_VALUE: number;
    readonly NaN: number;
    readonly NEGATIVE_INFINITY: number;
    readonly POSITIVE_INFINITY: number;
    readonly prototype: Number;
  }

  declare var Number: NumberConstructor;

  interface TemplateStringsArray extends ReadonlyArray<string> {
    readonly raw: readonly string[];
  }

  export interface ImportMeta {}

  interface Date {
    [Symbol.toPrimitive](hint: 'default'): string;
    [Symbol.toPrimitive](hint: 'number'): number;
    [Symbol.toPrimitive](hint: 'string'): string;
    [Symbol.toPrimitive](hint: string): string | number;
    getDate(): number;
    getDay(): number;
    getFullYear(): number;
    getHours(): number;
    getMilliseconds(): number;
    getMinutes(): number;
    getMonth(): number;
    getSeconds(): number;
    getTime(): number;
    getTimezoneOffset(): number;
    getUTCDate(): number;
    getUTCDay(): number;
    getUTCFullYear(): number;
    getUTCHours(): number;
    getUTCMilliseconds(): number;
    getUTCMinutes(): number;
    getUTCMonth(): number;
    getUTCSeconds(): number;
    setDate(date: number): number;
    setFullYear(year: number, month?: number, date?: number): number;
    setHours(hours: number, min?: number, sec?: number, ms?: number): number;
    setMilliseconds(ms: number): number;
    setMinutes(min: number, sec?: number, ms?: number): number;
    setMonth(month: number, date?: number): number;
    setSeconds(sec: number, ms?: number): number;
    setTime(time: number): number;
    setUTCDate(date: number): number;
    setUTCFullYear(year: number, month?: number, date?: number): number;
    setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
    setUTCMilliseconds(ms: number): number;
    setUTCMinutes(min: number, sec?: number, ms?: number): number;
    setUTCMonth(month: number, date?: number): number;
    setUTCSeconds(sec: number, ms?: number): number;
    toDateString(): string;
    toISOString(): string;
    toJSON(key?: any): string;
    toLocaleDateString(): string;
    toLocaleDateString(
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string;
    toLocaleString(): string;
    toLocaleString(
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string;
    toLocaleTimeString(): string;
    toLocaleTimeString(
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ): string;
    toString(): string;
    toTimeString(): string;
    toUTCString(): string;
    valueOf(): number;
  }

  interface DateConstructor {
    (): string;
    new (): Date;
    new (value: number | string | Date): Date;
    new (value: number | string): Date;
    new (
      year: number,
      month: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number
    ): Date;
    now(): number;
    parse(s: string): number;
    readonly prototype: Date;
    UTC(
      year: number,
      month: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number
    ): number;
  }

  declare var Date: DateConstructor;

  interface Error {
    name: string;
    message: string;
    stack?: string;
  }

  interface ErrorConstructor {
    new (message?: string): Error;
    (message?: string): Error;
    readonly prototype: Error;
  }

  declare var Error: ErrorConstructor;

  interface EvalError extends Error {}

  interface EvalErrorConstructor extends ErrorConstructor {
    new (message?: string): EvalError;
    (message?: string): EvalError;
    readonly prototype: EvalError;
  }

  declare var EvalError: EvalErrorConstructor;

  interface RangeError extends Error {}

  interface RangeErrorConstructor extends ErrorConstructor {
    new (message?: string): RangeError;
    (message?: string): RangeError;
    readonly prototype: RangeError;
  }

  declare var RangeError: RangeErrorConstructor;

  interface ReferenceError extends Error {}

  interface ReferenceErrorConstructor extends ErrorConstructor {
    new (message?: string): ReferenceError;
    (message?: string): ReferenceError;
    readonly prototype: ReferenceError;
  }

  declare var ReferenceError: ReferenceErrorConstructor;

  interface SyntaxError extends Error {}

  interface SyntaxErrorConstructor extends ErrorConstructor {
    new (message?: string): SyntaxError;
    (message?: string): SyntaxError;
    readonly prototype: SyntaxError;
  }

  declare var SyntaxError: SyntaxErrorConstructor;

  interface TypeError extends Error {}

  interface TypeErrorConstructor extends ErrorConstructor {
    new (message?: string): TypeError;
    (message?: string): TypeError;
    readonly prototype: TypeError;
  }

  declare var TypeError: TypeErrorConstructor;

  interface URIError extends Error {}

  interface URIErrorConstructor extends ErrorConstructor {
    new (message?: string): URIError;
    (message?: string): URIError;
    readonly prototype: URIError;
  }

  declare var URIError: URIErrorConstructor;

  interface JSON {
    parse(
      text: string,
      reviver?: (this: any, key: string, value: any) => any
    ): any;
    readonly [Symbol.toStringTag]: string;
    stringify(
      value: any,
      replacer?: (number | string)[] | null,
      space?: string | number
    ): string;
    stringify(
      value: any,
      replacer?: (this: any, key: string, value: any) => any,
      space?: string | number
    ): string;
  }

  declare var JSON: JSON;

  interface ConcatArray<T> {
    readonly length: number;
    readonly [n: number]: T;
    join(separator?: string): string;
    slice(start?: number, end?: number): T[];
  }

  interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
  }

  declare type ClassDecorator = <TFunction extends Function>(
    target: TFunction
  ) => TFunction | void;
  declare type PropertyDecorator = (
    target: Object,
    propertyKey: string | symbol
  ) => void;
  declare type MethodDecorator = <T>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ) => TypedPropertyDescriptor<T> | void;
  declare type ParameterDecorator = (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => void;
  declare type PromiseConstructorLike = new <T>(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) => PromiseLike<T>;

  interface PromiseLike<T> {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onrejected?:
        | ((reason: any) => TResult2 | PromiseLike<TResult2>)
        | undefined
        | null
    ): PromiseLike<TResult1 | TResult2>;
  }

  export type Partial<T> = {
    [P in keyof T]?: T[P];
  };

  export type Required<T> = {
    [P in keyof T]-?: T[P];
  };

  type Readonly<T> = {
    readonly [P in keyof T]: T[P];
  };

  type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
  };

  export type Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  type Exclude<T, U> = T extends U ? never : T;

  export type Extract<T, U> = T extends U ? T : never;

  export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

  export type NonNullable<T> = T extends null | undefined ? never : T;

  export type Parameters<T extends (...args: any) => any> = T extends (
    ...args: infer P
  ) => any
    ? P
    : never;

  export type ConstructorParameters<
    T extends new (...args: any) => any
  > = T extends new (...args: infer P) => any ? P : never;

  export type ReturnType<T extends (...args: any) => any> = T extends (
    ...args: any
  ) => infer R
    ? R
    : any;

  export type InstanceType<
    T extends new (...args: any) => any
  > = T extends new (...args: any) => infer R ? R : any;

  interface ThisType<_T> {}

  interface AggregateError extends Error {
    errors: any[];
  }

  interface AggregateErrorConstructor {
    new (errors: Iterable<any>, message?: string): AggregateError;
    (errors: Iterable<any>, message?: string): AggregateError;
    readonly prototype: AggregateError;
  }

  declare var AggregateError: AggregateErrorConstructor;
}
