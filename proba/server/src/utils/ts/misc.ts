import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import protocol from 'typescript/lib/protocol';
import * as nls from 'vscode-nls';

export interface ObjectMap<V> {
  [k: string]: V;
}

export const variableDeclaredButNeverUsed = 6133;
export const propertyDeclaretedButNeverUsed = 6138;
export const allImportsAreUnused = 6192;
export const unreachableCode = 7027;
export const unusedLabel = 7028;
export const fallThroughCaseInSwitch = 7029;
export const notAllCodePathsReturnAValue = 7030;

const noopDisposable = vscode.Disposable.from();

export const nulToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => noopDisposable,
};

export function escapeRegExp(t: string) {
  return t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
export const empty = Object.freeze([]);

export function equals<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  eq: (a: T, b: T) => boolean = (a, b) => a === b
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((x, i) => eq(x, b[i]));
}

export function equals2(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return equals(a, b, equals);
  const aKeys: string[] = [];
  for (const k in a) {
    aKeys.push(k);
  }
  aKeys.sort();
  const bKeys: string[] = [];
  for (const k in b) {
    bKeys.push(k);
  }
  bKeys.sort();
  if (!equals(aKeys, bKeys)) return false;
  return aKeys.every((k) => equals(a[k], b[k]));
}

export function flatten<T>(a: ReadonlyArray<T>[]) {
  return Array.prototype.concat.apply([], a) as T[];
}

export function coalesce<T>(a: ReadonlyArray<T | undefined>) {
  return a.filter((e) => !!e) as T[];
}

export function memoize(_target: any, key: string, desc: any) {
  let fk: string | undefined;
  let f: Function | undefined;
  if (typeof desc.value === 'function') {
    fk = 'value';
    f = desc.value;
  } else if (typeof desc.get === 'function') {
    fk = 'get';
    f = desc.get;
  } else throw new Error('not supported');
  const k = `$memoize$${key}`;
  desc[fk] = function (...args: any[]) {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.hasOwnProperty(k)) {
      Object.defineProperty(this, k, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: f!.apply(this, args),
      });
    }
    return this[k];
  };
}

export function makeRandomHexString(length: number) {
  /* prettier-ignore */
  const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  let r = '';
  for (let i = 0; i < length; i++) {
    const i = Math.floor(chars.length * Math.random());
    r += chars[i];
  }
  return r;
}

export function getTempFile(n: string) {
  return path.join(os.tmpdir(), n);
}
export interface Lazy<T> {
  value: T;
  hasValue: boolean;
  map<R>(f: (x: T) => R): Lazy<R>;
}

class LazyValue<T> implements Lazy<T> {
  private _value?: T;
  private _hasValue = false;

  constructor(private readonly _getValue: () => T) {}

  get hasValue() {
    return this._hasValue;
  }

  get value(): T {
    if (!this._hasValue) {
      this._hasValue = true;
      this._value = this._getValue();
    }
    return this._value!;
  }

  public map<R>(f: (x: T) => R): Lazy<R> {
    return new LazyValue(() => f(this.value));
  }
}

export function lazy<T>(getValue: () => T): Lazy<T> {
  return new LazyValue<T>(getValue);
}

export class ResourceMap<T> {
  private readonly _map = new Map<string, { uri: vscode.Uri; value: T }>();

  constructor(
    private readonly _normalizePath: (_: vscode.Uri) => string | undefined = (uri) =>
      uri.fsPath
  ) {}

  public get size() {
    return this._map.size;
  }

  public has(uri: vscode.Uri) {
    const k = this.toKey(uri);
    return !!k && this._map.has(k);
  }

  public get(uri: vscode.Uri) {
    const k = this.toKey(uri);
    if (!k) return undefined;
    const v = this._map.get(k);
    return v?.value;
  }

  public set(uri: vscode.Uri, value: T) {
    const k = this.toKey(uri);
    if (!k) return;
    const v = this._map.get(k);
    if (v) v.value = value;
    else this._map.set(k, { uri, value });
  }

  public delete(uri: vscode.Uri) {
    const k = this.toKey(uri);
    if (k) this._map.delete(k);
  }

  public clear() {
    this._map.clear();
  }

  public get values() {
    return Array.from(this._map.values()).map((x) => x.value);
  }

  public get entries() {
    return this._map.values();
  }

  private toKey(uri: vscode.Uri) {
    const k = this._normalizePath(uri);
    if (!k) return k;
    return this.isCaseInsensitivePath(k) ? k.toLowerCase() : k;
  }

  private isCaseInsensitivePath(p: string) {
    if (isWindowsPath(p)) return true;
    return p.startsWith('/');
  }
}

export function isWindowsPath(p: string) {
  return /^[a-zA-Z]:[/\\]/.test(p);
}

export interface Command {
  readonly id: string | string[];
  execute(..._: any[]): void;
}

export class CommandManager {
  private readonly cs = new Map<string, vscode.Disposable>();

  public dispose() {
    for (const c of this.cs.values()) {
      c.dispose();
    }
    this.cs.clear();
  }

  public register<T extends Command>(c: T) {
    for (const id of Array.isArray(c.id) ? c.id : [c.id]) {
      this.registerCommand(id, c.execute, c);
    }
    return c;
  }

  private registerCommand(id: string, c: (..._: any[]) => void, thisArg?: any) {
    if (this.cs.has(id)) return;
    this.cs.set(id, vscode.commands.registerCommand(id, c, thisArg));
  }
}

export interface Task<T> {
  (): T;
}

export class Delayer<T> {
  private task?: Task<T>;
  private done?: Promise<T | undefined>;
  private timeout?: NodeJS.Timeout;
  private onSuccess?: (v?: T | Thenable<T>) => void;

  constructor(public defaultDelay: number) {}

  public trigger(t: Task<T>, delay = this.defaultDelay) {
    this.task = t;
    if (delay >= 0) this.cancelTimeout();
    if (!this.done) {
      this.done = new Promise<T>((res) => {
        this.onSuccess = res;
      }).then(() => {
        this.done = undefined;
        this.onSuccess = undefined;
        const r = this.task?.();
        this.task = undefined;
        return r;
      });
    }
    if (delay >= 0 || !this.timeout) {
      this.timeout = setTimeout(
        () => {
          this.timeout = undefined;
          if (this.onSuccess) this.onSuccess(undefined);
        },
        delay >= 0 ? delay : this.defaultDelay
      );
    }
    return this.done;
  }

  private cancelTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export function disposeAll(ds: vscode.Disposable[]) {
  while (ds.length) {
    const d = ds.pop();
    d?.dispose();
  }
}

export abstract class Disposable {
  private _isDisposed = false;
  protected _disposables: vscode.Disposable[] = [];

  protected get isDisposed() {
    return this._isDisposed;
  }

  public dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      disposeAll(this._disposables);
    }
  }

  protected _register<T extends vscode.Disposable>(d: T): T {
    if (this._isDisposed) d.dispose();
    else this._disposables.push(d);
    return d;
  }
}

export const typescript = 'typescript';
export const typescriptreact = 'typescriptreact';
export const javascript = 'javascript';
export const javascriptreact = 'javascriptreact';
export const jsxTags = 'jsx-tags';

export function isSupportedLanguageMode(d: vscode.TextDocument) {
  return (
    vscode.languages.match(
      [typescript, typescriptreact, javascript, javascriptreact],
      d
    ) > 0
  );
}

export function isTypeScriptDocument(d: vscode.TextDocument) {
  return vscode.languages.match([typescript, typescriptreact], d) > 0;
}

export const enum DiagnosticLanguage {
  JavaScript,
  TypeScript,
}

export const allDiagnosticLanguages = [
  DiagnosticLanguage.JavaScript,
  DiagnosticLanguage.TypeScript,
];

export interface LanguageDescription {
  readonly id: string;
  readonly diagnosticOwner: string;
  readonly diagnosticSource: string;
  readonly diagnosticLanguage: DiagnosticLanguage;
  readonly modeIds: string[];
  readonly configFilePattern?: RegExp;
  readonly isExternal?: boolean;
}

export const standardLanguageDescriptions: LanguageDescription[] = [
  {
    id: 'typescript',
    diagnosticOwner: 'typescript',
    diagnosticSource: 'ts',
    diagnosticLanguage: DiagnosticLanguage.TypeScript,
    modeIds: [typescript, typescriptreact],
    configFilePattern: /^tsconfig(\..*)?\.json$/gi,
  },
  {
    id: 'javascript',
    diagnosticOwner: 'typescript',
    diagnosticSource: 'ts',
    diagnosticLanguage: DiagnosticLanguage.JavaScript,
    modeIds: [javascript, javascriptreact],
    configFilePattern: /^jsconfig(\..*)?\.json$/gi,
  },
];

export function isTsConfigFileName(fileName: string): boolean {
  return /^tsconfig\.(.+\.)?json$/i.test(path.basename(fileName));
}

export function isJsConfigOrTsConfigFileName(fileName: string): boolean {
  return /^[jt]sconfig\.(.+\.)?json$/i.test(path.basename(fileName));
}

export function doesResourceLookLikeATypeScriptFile(resource: vscode.Uri): boolean {
  return /\.tsx?$/i.test(resource.fsPath);
}

export function doesResourceLookLikeAJavaScriptFile(resource: vscode.Uri): boolean {
  return /\.jsx?$/i.test(resource.fsPath);
}

export class ManagedFileContextManager extends Disposable {
  private static readonly contextName = 'typescript.isManagedFile';

  private isInManagedFileContext = false;

  public constructor(
    private readonly normalizePath: (resource: vscode.Uri) => string | undefined
  ) {
    super();
    vscode.window.onDidChangeActiveTextEditor(
      this.onDidChangeActiveTextEditor,
      this,
      this._disposables
    );

    this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
  }

  private onDidChangeActiveTextEditor(e?: vscode.TextEditor) {
    if (e) this.update(this.isManaged(e));
  }

  private update(v: boolean) {
    if (v === this.isInManagedFileContext) return;
    vscode.commands.executeCommand(
      'setContext',
      ManagedFileContextManager.contextName,
      v
    );
    this.isInManagedFileContext = v;
  }

  private isManaged(e: vscode.TextEditor) {
    return this.isManagedScript(e) || this.isManagedConfig(e);
  }

  private isManagedScript(e: vscode.TextEditor): boolean {
    return (
      isSupportedLanguageMode(e.document) && this.normalizePath(e.document.uri) !== null
    );
  }

  private isManagedConfig(e: vscode.TextEditor) {
    return isJsConfigOrTsConfigFileName(e.document.fileName);
  }
}

export interface TSConfig {
  readonly uri: vscode.Uri;
  readonly fsPath: string;
  readonly posixPath: string;
  readonly workspaceFolder?: vscode.WorkspaceFolder;
}

export default class TsConfigProvider {
  public async getConfigsForWorkspace(): Promise<Iterable<TSConfig>> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }
    const configs = new Map<string, TSConfig>();
    for (const config of await vscode.workspace.findFiles(
      '**/tsconfig*.json',
      '**/{node_modules,.*}/**'
    )) {
      const root = vscode.workspace.getWorkspaceFolder(config);
      if (root) {
        configs.set(config.fsPath, {
          uri: config,
          fsPath: config.fsPath,
          posixPath: config.path,
          workspaceFolder: root,
        });
      }
    }
    return configs.values();
  }
}

const localize = nls.loadMessageBundle();

type LogLevel = 'Trace' | 'Info' | 'Error';

export class Logger {
  @memoize
  private get output(): vscode.OutputChannel {
    return vscode.window.createOutputChannel(localize('channelName', 'TypeScript'));
  }

  private data2String(data: any): string {
    if (data instanceof Error) return data.stack || data.message;
    if (data.success === false && data.message) return data.message;
    return data.toString();
  }

  public info(message: string, data?: any): void {
    this.logLevel('Info', message, data);
  }

  public error(message: string, data?: any): void {
    if (data && data.message === 'No content available.') return;
    this.logLevel('Error', message, data);
  }

  public logLevel(level: LogLevel, message: string, data?: any): void {
    this.output.appendLine(`[${level}  - ${this.now()}] ${message}`);
    if (data) this.output.appendLine(this.data2String(data));
  }

  private now(): string {
    const now = new Date();
    return (
      padLeft(now.getUTCHours() + '', 2, '0') +
      ':' +
      padLeft(now.getMinutes() + '', 2, '0') +
      ':' +
      padLeft(now.getUTCSeconds() + '', 2, '0') +
      '.' +
      now.getMilliseconds()
    );
  }
}

function padLeft(s: string, n: number, pad = ' ') {
  return pad.repeat(Math.max(0, n - s.length)) + s;
}

export const file = 'file';
export const untitled = 'untitled';
export const git = 'git';
export const walkThroughSnippet = 'walkThroughSnippet';

export const supportedSchemes = [file, untitled, walkThroughSnippet];

export function isSupportedScheme(scheme: string): boolean {
  return supportedSchemes.includes(scheme);
}

export enum TsServerLogLevel {
  Off,
  Normal,
  Terse,
  Verbose,
}

export namespace TsServerLogLevel {
  export function fromString(value: string): TsServerLogLevel {
    switch (value && value.toLowerCase()) {
      case 'normal':
        return TsServerLogLevel.Normal;
      case 'terse':
        return TsServerLogLevel.Terse;
      case 'verbose':
        return TsServerLogLevel.Verbose;
      case 'off':
      default:
        return TsServerLogLevel.Off;
    }
  }

  export function toString(value: TsServerLogLevel): string {
    switch (value) {
      case TsServerLogLevel.Normal:
        return 'normal';
      case TsServerLogLevel.Terse:
        return 'terse';
      case TsServerLogLevel.Verbose:
        return 'verbose';
      case TsServerLogLevel.Off:
      default:
        return 'off';
    }
  }
}

export class TypeScriptServiceConfiguration {
  public readonly locale: string | null;
  public readonly globalTsdk: string | null;
  public readonly localTsdk: string | null;
  public readonly npmLocation: string | null;
  public readonly tsServerLogLevel: TsServerLogLevel = TsServerLogLevel.Off;
  public readonly tsServerPluginPaths: readonly string[];
  public readonly checkJs: boolean;
  public readonly experimentalDecorators: boolean;
  public readonly disableAutomaticTypeAcquisition: boolean;
  public readonly useSeparateSyntaxServer: boolean;
  public readonly enableProjectDiagnostics: boolean;
  public readonly maxTsServerMemory: number;
  public readonly enablePromptUseWorkspaceTsdk: boolean;
  public readonly watchOptions: protocol.WatchOptions | undefined;

  public static loadFromWorkspace(): TypeScriptServiceConfiguration {
    return new TypeScriptServiceConfiguration();
  }

  private constructor() {
    const configuration = vscode.workspace.getConfiguration();

    this.locale = TypeScriptServiceConfiguration.extractLocale(configuration);
    this.globalTsdk = TypeScriptServiceConfiguration.extractGlobalTsdk(configuration);
    this.localTsdk = TypeScriptServiceConfiguration.extractLocalTsdk(configuration);
    this.npmLocation = TypeScriptServiceConfiguration.readNpmLocation(configuration);
    this.tsServerLogLevel = TypeScriptServiceConfiguration.readTsServerLogLevel(
      configuration
    );
    this.tsServerPluginPaths = TypeScriptServiceConfiguration.readTsServerPluginPaths(
      configuration
    );
    this.checkJs = TypeScriptServiceConfiguration.readCheckJs(configuration);
    this.experimentalDecorators = TypeScriptServiceConfiguration.readExperimentalDecorators(
      configuration
    );
    this.disableAutomaticTypeAcquisition = TypeScriptServiceConfiguration.readDisableAutomaticTypeAcquisition(
      configuration
    );
    this.useSeparateSyntaxServer = TypeScriptServiceConfiguration.readUseSeparateSyntaxServer(
      configuration
    );
    this.enableProjectDiagnostics = TypeScriptServiceConfiguration.readEnableProjectDiagnostics(
      configuration
    );
    this.maxTsServerMemory = TypeScriptServiceConfiguration.readMaxTsServerMemory(
      configuration
    );
    this.enablePromptUseWorkspaceTsdk = TypeScriptServiceConfiguration.readEnablePromptUseWorkspaceTsdk(
      configuration
    );
    this.watchOptions = TypeScriptServiceConfiguration.readWatchOptions(configuration);
  }

  public isEqualTo(other: TypeScriptServiceConfiguration): boolean {
    return (
      this.locale === other.locale &&
      this.globalTsdk === other.globalTsdk &&
      this.localTsdk === other.localTsdk &&
      this.npmLocation === other.npmLocation &&
      this.tsServerLogLevel === other.tsServerLogLevel &&
      this.checkJs === other.checkJs &&
      this.experimentalDecorators === other.experimentalDecorators &&
      this.disableAutomaticTypeAcquisition === other.disableAutomaticTypeAcquisition &&
      equals(this.tsServerPluginPaths, other.tsServerPluginPaths) &&
      this.useSeparateSyntaxServer === other.useSeparateSyntaxServer &&
      this.enableProjectDiagnostics === other.enableProjectDiagnostics &&
      this.maxTsServerMemory === other.maxTsServerMemory &&
      equals2(this.watchOptions, other.watchOptions) &&
      this.enablePromptUseWorkspaceTsdk === other.enablePromptUseWorkspaceTsdk
    );
  }

  private static fixPathPrefixes(inspectValue: string): string {
    const pathPrefixes = ['~' + path.sep];
    for (const pathPrefix of pathPrefixes) {
      if (inspectValue.startsWith(pathPrefix)) {
        return path.join(os.homedir(), inspectValue.slice(pathPrefix.length));
      }
    }
    return inspectValue;
  }

  private static extractGlobalTsdk(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.globalValue === 'string') {
      return this.fixPathPrefixes(inspect.globalValue);
    }
    return null;
  }

  private static extractLocalTsdk(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.workspaceValue === 'string') {
      return this.fixPathPrefixes(inspect.workspaceValue);
    }
    return null;
  }

  private static readTsServerLogLevel(
    configuration: vscode.WorkspaceConfiguration
  ): TsServerLogLevel {
    const setting = configuration.get<string>('typescript.tsserver.log', 'off');
    return TsServerLogLevel.fromString(setting);
  }

  private static readTsServerPluginPaths(
    configuration: vscode.WorkspaceConfiguration
  ): string[] {
    return configuration.get<string[]>('typescript.tsserver.pluginPaths', []);
  }

  private static readCheckJs(configuration: vscode.WorkspaceConfiguration): boolean {
    return configuration.get<boolean>('javascript.implicitProjectConfig.checkJs', false);
  }

  private static readExperimentalDecorators(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'javascript.implicitProjectConfig.experimentalDecorators',
      false
    );
  }

  private static readNpmLocation(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    return configuration.get<string | null>('typescript.npm', null);
  }

  private static readDisableAutomaticTypeAcquisition(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.disableAutomaticTypeAcquisition',
      false
    );
  }

  private static extractLocale(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    return configuration.get<string | null>('typescript.locale', null);
  }

  private static readUseSeparateSyntaxServer(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.useSeparateSyntaxServer',
      true
    );
  }

  private static readEnableProjectDiagnostics(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.experimental.enableProjectDiagnostics',
      false
    );
  }

  private static readWatchOptions(
    configuration: vscode.WorkspaceConfiguration
  ): protocol.WatchOptions | undefined {
    return configuration.get<protocol.WatchOptions>('typescript.tsserver.watchOptions');
  }

  private static readMaxTsServerMemory(
    configuration: vscode.WorkspaceConfiguration
  ): number {
    const defaultMaxMemory = 3072;
    const minimumMaxMemory = 128;
    const memoryInMB = configuration.get<number>(
      'typescript.tsserver.maxTsServerMemory',
      defaultMaxMemory
    );
    if (!Number.isSafeInteger(memoryInMB)) {
      return defaultMaxMemory;
    }
    return Math.max(memoryInMB, minimumMaxMemory);
  }

  private static readEnablePromptUseWorkspaceTsdk(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>('typescript.enablePromptUseWorkspaceTsdk', false);
  }
}
