import * as _ from 'lodash';
import * as qt from './types';

export type ExperimentId = number;
export type RunId = number | null;
export type TagId = number;

export type Experiment = {id: ExperimentId; name: string; startTime: number};

export type Run = {
  id: RunId;
  name: string;
  startTime: number;
  tags: Tag[];
};

export type Tag = {
  id: TagId;
  name: string;
  displayName: string;
  pluginName: string;
};

export type Listener = Function;
export class ListenKey {
  public readonly listener: Listener;
  constructor(listener: Listener) {
    this.listener = listener;
  }
}

const hashListeners = new Set<ListenKey>();
const storageListeners = new Set<ListenKey>();

window.addEventListener('hashchange', () => {
  hashListeners.forEach(listenKey => listenKey.listener());
});

window.addEventListener('storage', () => {
  storageListeners.forEach(listenKey => listenKey.listener());
});

export function addHashListener(fn: Function) {
  const key = new ListenKey(fn);
  hashListeners.add(key);
  return key;
}

export function addStorageListener(fn: Function) {
  const key = new ListenKey(fn);
  storageListeners.add(key);
  return key;
}

export function fireStorageChanged() {
  storageListeners.forEach(listenKey => listenKey.listener());
}

export function removeHashListenerByKey(key: ListenKey) {
  hashListeners.delete(key);
}

export function removeStorageListenerByKey(key: ListenKey) {
  storageListeners.delete(key);
}

export interface Router {
  environment: () => string;
  experiments: () => string;
  pluginRoute: (
    pluginName: string,
    route: string,
    params?: URLSearchParams
  ) => string;
  pluginsListing: () => string;
  runs: () => string;
  runsForExperiment: (id: ExperimentId) => string;
}

let _router = createRouter();

export function createRouter(dataDir = 'data'): Router {
  if (dataDir.endsWith('/')) {
    dataDir = dataDir.slice(0, dataDir.length - 1);
  }
  return {
    environment: () => createDataPath(dataDir, '/environment'),
    experiments: () => createDataPath(dataDir, '/experiments'),
    pluginRoute: (
      pluginName: string,
      route: string,
      params?: URLSearchParams
    ): string => {
      return createDataPath(
        dataDir + '/plugin',
        `/${pluginName}${route}`,
        params
      );
    },
    pluginsListing: () => createDataPath(dataDir, '/plugins_listing'),
    runs: () => createDataPath(dataDir, '/runs'),
    runsForExperiment: id => {
      return createDataPath(
        dataDir,
        '/experiment_runs',
        createSearchParam({experiment: String(id)})
      );
    }
  };
}

export function getRouter() {
  return _router;
}

export function setRouter(router?: Router) {
  if (!router) throw new Error('Router required ' + router);
  _router = router;
}

function createDataPath(
  dataDir: string,
  route: string,
  params: URLSearchParams = new URLSearchParams()
) {
  let relativePath = dataDir + route;
  if (String(params)) {
    const delimiter = route.includes('?') ? '&' : '?';
    relativePath += delimiter + String(params);
  }
  return relativePath;
}

export function createSearchParam(params: QueryParams = {}) {
  const keys = Object.keys(params)
    .sort()
    .filter(k => params[k]);
  const searchParams = new URLSearchParams();
  keys.forEach(key => {
    const values = params[key];
    const array = Array.isArray(values) ? values : [values];
    array.forEach(val => searchParams.append(key, val));
  });
  return searchParams;
}

export abstract class BaseStore {
  protected manager: RequestManager = new RequestManager(1);
  private _listeners: Set<ListenKey> = new Set<ListenKey>();
  public initialized = false;

  protected abstract load(): Promise<void>;

  async refresh(): Promise<void> {
    await this.load();
    this.initialized = true;
  }
  addListener(listener: Listener) {
    const k = new ListenKey(listener);
    this._listeners.add(k);
    return k;
  }
  removeListenerByKey(key: ListenKey) {
    this._listeners.delete(key);
  }
  protected emitChange() {
    this._listeners.forEach(k => {
      try {
        k.listener();
      } catch (e) {
        // ignore exceptions on the listener side.
      }
    });
  }
}

export class Canceller {
  private count = 0;

  public cancellable<T, U>(
    f: (result: {value: T; cancelled: boolean}) => U
  ): (_: T) => U {
    const c = this.count;
    return value => {
      const cancelled = this.count !== c;
      return f({value, cancelled});
    };
  }
  public cancelAll() {
    this.count++;
  }
}

export class RunsStore extends BaseStore {
  private _runs: string[] = [];

  async load() {
    const url = getRouter().runs();
    const newRuns = await this.manager.request(url);
    if (!_.isEqual(this._runs, newRuns)) {
      this._runs = newRuns;
      this.emitChange();
    }
  }
  getRuns(): string[] {
    return this._runs.slice();
  }
}

export const runsStore = new RunsStore();

interface Environment {
  dataLocation: string;
  windowTitle: string;
}

export class EnvironmentStore extends BaseStore {
  private env?: Environment;

  async load() {
    const url = getRouter().environment();
    const result_2 = await this.manager.request(url);
    const environment = {
      dataLocation: result_2.data_location,
      windowTitle: result_2.window_title
    };
    if (_.isEqual(this.env, environment)) return;
    this.env = environment;
    this.emitChange();
  }
  public getDataLocation(): string {
    return this.env ? this.env.dataLocation : '';
  }
  public getWindowTitle(): string {
    return this.env ? this.env.windowTitle : '';
  }
}

export const environmentStore = new EnvironmentStore();

export class ExperimentsStore extends BaseStore {
  private exps: Experiment[] = [];

  async load() {
    const url = getRouter().experiments();
    const newExperiments = await this.manager.request(url);
    if (!_.isEqual(this.exps, newExperiments)) {
      this.exps = newExperiments;
      this.emitChange();
    }
  }
  getExperiments(): Experiment[] {
    return this.exps.slice();
  }
}

export const experimentsStore = new ExperimentsStore();

export type QueryValue = string | string[];
export type QueryParams = qt.Dict<QueryValue>;

export function addParams(url: string, ps: QueryParams) {
  const ks = Object.keys(ps)
    .sort()
    .filter(k => ps[k] !== undefined);
  if (!ks.length) return url;
  const delim = url.includes('?') ? '&' : '?';
  const parts = ([] as string[]).concat(
    ...ks.map(k => {
      const raw = ps[k];
      const vs = Array.isArray(raw) ? raw : [raw];
      return vs.map(v => `${k}=${_encodeURIComponent(v)}`);
    })
  );
  return url + delim + parts.join('&');
}

function _encodeURIComponent(x: string) {
  return encodeURIComponent(x)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

export interface Datum {
  wall_time: Date;
  step: number;
}

export interface DebuggerNumericsAlertReport {
  device_name: string;
  tensor_name: string;
  first_timestamp: number;
  nan_event_count: number;
  neg_inf_event_count: number;
  pos_inf_event_count: number;
}

export type DebuggerNumericsAlertReportResponse = DebuggerNumericsAlertReport[];

export const TYPES = [];

export type RunToTag = qt.Dict<string[]>;

export function getRunsNamed(r: RunToTag) {
  return _.keys(r).sort(compareTagNames);
}

export function getTags(r: RunToTag) {
  return _.union.apply(_.values(r)).sort(compareTagNames);
}

export function filterTags(r: RunToTag, runs: string[]) {
  let ts = [] as string[];
  runs.forEach(x => (ts = ts.concat(r[x])));
  return _.uniq(ts).sort(compareTagNames);
}

/*
function timeToDate(x: number) {
  return new Date(x * 1000);
}

function map<T, U>(f: (x: T) => U): (arr: T[]) => U[] {
  return function(arr: T[]): U[] {
    return arr.map(f);
  };
}

function detupler<T, G>(xform: (x: T) => G): (t: TupleData<T>) => Datum & G {
  return function(x: TupleData<T>): Datum & G {
    const obj = <G & Datum>xform(x[2]);
    obj.wall_time = timeToDate(x[0]);
    obj.step = x[1];
    return obj;
  };
}

type TupleData<T> = [number, number, T];
*/

interface ResolveReject {
  resolve: Function;
  reject: Function;
}

export class CancellationError extends Error {
  public name = 'CancellationError';
}

export class InvalidOptionsError extends Error {
  public name = 'InvalidOptionsError';
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, InvalidOptionsError.prototype);
  }
}

export class NetworkError extends Error {
  public name: string;
  constructor(public req: XMLHttpRequest, public url: string) {
    super();
    this.message = `NetworkError: ${req.status} at ${url}`;
    this.name = 'NetworkError';
  }
}

export enum HttpMethodType {
  GET = 'GET',
  POST = 'POST'
}

export class RequestOptions {
  public methodType = HttpMethodType.GET;
  public contentType?: string;
  public body?: any;
  public withCredentials?: boolean;
  public validate() {
    if (this.methodType === HttpMethodType.GET) {
      if (this.body) {
        throw new InvalidOptionsError('body must be missing for GET request.');
      }
    }
  }
}

export class RequestManager {
  private queue: ResolveReject[];
  private active: number;

  constructor(private simultaneous = 1000, private tries = 3) {
    this.queue = [];
    this.active = 0;
  }
  public request(url: string, post?: qt.Dict<string>) {
    const opts = optsFromPostData(post);
    return this.withOptions(url, opts);
  }
  public withOptions(url: string, opts: RequestOptions) {
    opts.validate();
    const p = new Promise((res, rej) => {
      const resolver = {resolve: res, reject: rej};
      this.queue.push(resolver);
      this.launch();
    })
      .then(() => {
        return this.withRetries(url, this.tries, opts);
      })
      .then(
        res => {
          this.active--;
          this.launch();
          return res;
        },
        rej => {
          if (rej.name === 'NetworkError') {
            this.active--;
            this.launch();
          }
          return Promise.reject(rej);
        }
      );
    return p;
  }
  public async fetch(url: string, opts?: RequestInit): Promise<Response> {
    await new Promise((res, rej) => {
      const resolver = {resolve: res, reject: rej};
      this.queue.push(resolver);
      this.launch();
    });
    let numTries = 1;
    return new Promise<Response>(resolve => {
      const retryFetch = () => {
        fetch(url, opts).then(response => {
          if (!response.ok && this.tries > numTries) {
            numTries++;
            retryFetch();
            return;
          }
          resolve(response);
          this.active--;
          this.launch();
        });
      };
      retryFetch();
    });
  }
  public clearQueue() {
    while (this.queue.length > 0) {
      this.queue.pop()?.reject(new CancellationError('Request cancelled'));
    }
  }
  public outstanding() {
    return this.active + this.queue.length;
  }
  private launch() {
    while (this.active < this.simultaneous && this.queue.length > 0) {
      this.active++;
      this.queue.pop()?.resolve();
    }
  }
  private withRetries(
    url: string,
    tries: number,
    opts: RequestOptions
  ): Promise<any> {
    const res = (x: any) => x;
    const rej = (x: any) => {
      if (tries > 0) {
        return this.withRetries(url, tries - 1, opts);
      } else {
        return Promise.reject(x);
      }
    };
    return this.fromUrl(url, opts).then(res, rej);
  }
  protected fromUrl(url: string, opts: RequestOptions) {
    return new Promise((res, rej) => {
      const req = buildXMLHttpRequest(
        opts.methodType,
        url,
        opts.withCredentials,
        opts.contentType
      );
      req.onload = () => {
        if (req.status === 200) {
          res(JSON.parse(req.responseText));
        } else {
          rej(new NetworkError(req, url));
        }
      };
      req.onerror = () => {
        rej(new NetworkError(req, url));
      };
      if (opts.body) {
        req.send(opts.body);
      } else {
        req.send();
      }
    });
  }
}

function buildXMLHttpRequest(
  methodType: HttpMethodType,
  url: string,
  withCredentials?: boolean,
  contentType?: string
): XMLHttpRequest {
  const req = new XMLHttpRequest();
  req.open(methodType, url);
  if (withCredentials) {
    req.withCredentials = withCredentials;
  }
  if (contentType) {
    req.setRequestHeader('Content-Type', contentType);
  }
  return req;
}

function optsFromPostData(postData?: {[key: string]: string}) {
  const result = new RequestOptions();
  if (!postData) {
    result.methodType = HttpMethodType.GET;
    return result;
  }
  result.methodType = HttpMethodType.POST;
  result.body = formDataFromDictionary(postData);
  return result;
}

function formDataFromDictionary(postData: {[key: string]: string}) {
  const formData = new FormData();
  for (const postKey in postData) {
    if (postKey) {
      formData.append(postKey, postData[postKey]);
    }
  }
  return formData;
}

export function compareTagNames(a: any, b: any) {
  let ai = 0;
  let bi = 0;
  for (;;) {
    if (ai === a.length) return bi === b.length ? 0 : -1;
    if (bi === b.length) return 1;
    if (isDigit(a[ai]) && isDigit(b[bi])) {
      const ais = ai;
      const bis = bi;
      ai = consumeNumber(a, ai + 1);
      bi = consumeNumber(b, bi + 1);
      const an = parseFloat(a.slice(ais, ai));
      const bn = parseFloat(b.slice(bis, bi));
      if (an < bn) {
        return -1;
      }
      if (an > bn) {
        return 1;
      }
      continue;
    }
    if (isBreak(a[ai])) {
      if (!isBreak(b[bi])) {
        return -1;
      }
    } else if (isBreak(b[bi])) {
      return 1;
    } else if (a[ai] < b[bi]) {
      return -1;
    } else if (a[ai] > b[bi]) {
      return 1;
    }
    ai++;
    bi++;
  }
}

function consumeNumber(s: string, i: number) {
  enum State {
    NATURAL,
    REAL,
    EXPONENT_SIGN,
    EXPONENT
  }
  let state = State.NATURAL;
  for (; i < s.length; i++) {
    if (state === State.NATURAL) {
      if (s[i] === '.') {
        state = State.REAL;
      } else if (s[i] === 'e' || s[i] === 'E') {
        state = State.EXPONENT_SIGN;
      } else if (!isDigit(s[i])) {
        break;
      }
    } else if (state === State.REAL) {
      if (s[i] === 'e' || s[i] === 'E') {
        state = State.EXPONENT_SIGN;
      } else if (!isDigit(s[i])) {
        break;
      }
    } else if (state === State.EXPONENT_SIGN) {
      if (isDigit(s[i]) || s[i] === '+' || s[i] === '-') {
        state = State.EXPONENT;
      } else {
        break;
      }
    } else if (state === State.EXPONENT) {
      if (!isDigit(s[i])) {
        break;
      }
    }
  }
  return i;
}

function isDigit(c: string) {
  return '0' <= c && c <= '9';
}

function isBreak(c: string) {
  return c === '/' || c === '_' || isDigit(c);
}
