import * as qb from './backend';
import * as qu from './util';

type StringDict = {[key: string]: string};
export const TAB = '__tab__';
export const DISAMBIGUATOR = 'disambiguator';

export const {
  get: getString,
  set: setString,
  getInitializer: getStringInitializer,
  getObserver: getStringObserver,
  disposeBinding: disposeStringBinding
} = makeBindings(
  x => x,
  x => x
);

export const {
  get: getBoolean,
  set: setBoolean,
  getInitializer: getBooleanInitializer,
  getObserver: getBooleanObserver,
  disposeBinding: disposeBooleanBinding
} = makeBindings(
  s => (s === 'true' ? true : s === 'false' ? false : undefined),
  b => b.toString()
);

export const {
  get: getNumber,
  set: setNumber,
  getInitializer: getNumberInitializer,
  getObserver: getNumberObserver,
  disposeBinding: disposeNumberBinding
} = makeBindings(
  s => +s,
  n => n.toString()
);

export const {
  get: getObject,
  set: setObject,
  getInitializer: getObjectInitializer,
  getObserver: getObjectObserver,
  disposeBinding: disposeObjectBinding
} = makeBindings(
  s => JSON.parse(atob(s)),
  o => btoa(JSON.stringify(o))
);

export interface StorageOptions<T> {
  defaultValue?: T;
  useLocalStorage?: boolean;
}

export interface AutoStorageOptions<T> extends StorageOptions<T> {
  polymerProperty?: string;
}

export interface SetterOptions<T> extends StorageOptions<T> {
  defaultValue?: T;
  useLocalStorage?: boolean;
  useLocationReplace?: boolean;
}

export function makeBindings<T>(
  fromString: (string) => T,
  toString: (T) => string
): {
  get: (key: string, option?: StorageOptions<T>) => T;
  set: (key: string, value: T, option?: SetterOptions<T>) => void;
  getInitializer: (key: string, options: AutoStorageOptions<T>) => Function;
  getObserver: (key: string, options: AutoStorageOptions<T>) => Function;
  disposeBinding: () => void;
} {
  const hashListeners = [];
  const storageListeners = [];

  function get(key: string, options: StorageOptions<T> = {}): T {
    const {defaultValue, useLocalStorage = false} = options;
    const value = useLocalStorage
      ? window.localStorage.getItem(key)
      : componentToDict(readComponent())[key];
    return value == undefined ? _.cloneDeep(defaultValue) : fromString(value);
  }

  function set(key: string, value: T, options: SetterOptions<T> = {}): void {
    const {
      defaultValue,
      useLocalStorage = false,
      useLocationReplace = false
    } = options;
    const stringValue = toString(value);
    if (useLocalStorage) {
      window.localStorage.setItem(key, stringValue);
      qb.fireStorageChanged();
    } else if (!_.isEqual(value, get(key, {useLocalStorage}))) {
      if (_.isEqual(value, defaultValue)) {
        unsetFromURI(key);
      } else {
        const items = componentToDict(readComponent());
        items[key] = stringValue;
        writeComponent(dictToComponent(items), useLocationReplace);
      }
    }
  }

  function getInitializer(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options
    };
    return function() {
      const uriStorageName = getURIStorageName(this, key);
      const setComponentValue = () => {
        const storedValue = get(uriStorageName, fullOptions);
        const currentValue = this[fullOptions.polymerProperty];
        if (!_.isEqual(storedValue, currentValue)) {
          this[fullOptions.polymerProperty] = storedValue;
        }
      };
      const addListener = fullOptions.useLocalStorage
        ? qb.addStorageListener
        : qb.addHashListener;
      const listenKey = addListener(() => setComponentValue());
      if (fullOptions.useLocalStorage) {
        storageListeners.push(listenKey);
      } else {
        hashListeners.push(listenKey);
      }
      setComponentValue();
      return this[fullOptions.polymerProperty];
    };
  }

  function disposeBinding() {
    hashListeners.forEach(key => qb.removeHashListenerByKey(key));
    storageListeners.forEach(key => qb.removeStorageListenerByKey(key));
  }

  function getObserver(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options
    };
    return function() {
      const uriStorageName = getURIStorageName(this, key);
      const newVal = this[fullOptions.polymerProperty];
      set(uriStorageName, newVal, fullOptions);
    };
  }

  return {get, set, getInitializer, getObserver, disposeBinding};
}

function getURIStorageName(component: {}, propertyName: string): string {
  const d = component[DISAMBIGUATOR];
  const components = d == null ? [propertyName] : [d, propertyName];
  return components.join('.');
}

function readComponent(): string {
  return qu.useHash() ? window.location.hash.slice(1) : qu.getFakeHash();
}

function writeComponent(component: string, useLocationReplace = false) {
  if (qu.useHash()) {
    if (useLocationReplace) {
      window.location.replace('#' + component);
    } else {
      window.location.hash = component;
    }
  } else {
    qu.setFakeHash(component);
  }
}

function dictToComponent(items: StringDict): string {
  let component = '';
  if (items[TAB] !== undefined) {
    component += items[TAB];
  }
  const nonTab = Object.keys(items)
    .map(key => [key, items[key]])
    .filter(pair => pair[0] !== TAB)
    .map(pair => {
      return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
    })
    .join('&');

  return nonTab.length > 0 ? component + '&' + nonTab : component;
}

function componentToDict(component: string): StringDict {
  const items = {} as StringDict;

  const tokens = component.split('&');
  tokens.forEach(token => {
    const kv = token.split('=');
    if (kv.length === 1) {
      items[TAB] = kv[0];
    } else if (kv.length === 2) {
      items[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
  });
  return items;
}

function unsetFromURI(key) {
  const items = componentToDict(readComponent());
  delete items[key];
  writeComponent(dictToComponent(items));
}
