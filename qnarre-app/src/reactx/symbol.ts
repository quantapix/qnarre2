declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
  }
}

export const observable = (() =>
  (typeof Symbol === 'function' && Symbol.observable) || '@@observable')();

export function getSymbolIterator(): symbol {
  if (typeof Symbol !== 'function' || !Symbol.iterator) {
    return '@@iterator' as any;
  }

  return Symbol.iterator;
}

export const iterator = getSymbolIterator();

/** @deprecated do not use, this is no longer checked by RxJS internals */
export const rxSubscriber = (() =>
  typeof Symbol === 'function'
    ? Symbol('rxSubscriber')
    : '@@rxSubscriber_' + Math.random())();
