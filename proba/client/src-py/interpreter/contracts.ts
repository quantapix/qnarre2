import { SemVer } from 'semver';
import { CodeLensProvider, ConfigurationTarget, Disposable, Event, TextDocument, Uri } from 'vscode';
import { InterpreterInfomation } from '../common/process/types';
import { Resource } from '../common/types';

export const INTERPRETER_LOCATOR_SERVICE = 'IInterpreterLocatorService';
export const WINDOWS_REGISTRY_SERVICE = 'WindowsRegistryService';
export const CONDA_ENV_FILE_SERVICE = 'CondaEnvFileService';
export const CONDA_ENV_SERVICE = 'CondaEnvService';
export const CURRENT_PATH_SERVICE = 'CurrentPathService';
export const KNOWN_PATH_SERVICE = 'KnownPathsService';
export const GLOBAL_VIRTUAL_ENV_SERVICE = 'VirtualEnvService';
export const WORKSPACE_VIRTUAL_ENV_SERVICE = 'WorkspaceVirtualEnvService';
export const PIPENV_SERVICE = 'PipEnvService';
export const IInterpreterVersionService = Symbol('IInterpreterVersionService');
export interface IInterpreterVersionService {
    getVersion(pythonPath: string, defaultValue: string): Promise<string>;
    getPipVersion(pythonPath: string): Promise<string>;
}

export const IKnownSearchPathsForInterpreters = Symbol('IKnownSearchPathsForInterpreters');
export interface IKnownSearchPathsForInterpreters {
    getSearchPaths(): string[];
}
export const IVirtualEnvironmentsSearchPathProvider = Symbol('IVirtualEnvironmentsSearchPathProvider');
export interface IVirtualEnvironmentsSearchPathProvider {
    getSearchPaths(resource?: Uri): Promise<string[]>;
}

export type GetInterpreterOptions = {
    onSuggestion?: boolean;
};

export type GetInterpreterLocatorOptions = GetInterpreterOptions & { ignoreCache?: boolean };

export const IInterpreterLocatorService = Symbol('IInterpreterLocatorService');

export interface IInterpreterLocatorService extends Disposable {
    readonly onLocating: Event<Promise<PythonInterpreter[]>>;
    readonly hasInterpreters: Promise<boolean>;
    didTriggerInterpreterSuggestions?: boolean;
    getInterpreters(resource?: Uri, options?: GetInterpreterLocatorOptions): Promise<PythonInterpreter[]>;
}

export type CondaInfo = {
    envs?: string[];
    'sys.version'?: string;
    'sys.prefix'?: string;
    python_version?: string;
    default_prefix?: string;
    conda_version?: string;
};

export type CondaEnvironmentInfo = {
    name: string;
    path: string;
};

export const ICondaService = Symbol('ICondaService');

export interface ICondaService {
    readonly condaEnvironmentsFile: string | undefined;
    getCondaFile(): Promise<string>;
    isCondaAvailable(): Promise<boolean>;
    getCondaVersion(): Promise<SemVer | undefined>;
    getCondaInfo(): Promise<CondaInfo | undefined>;
    getCondaEnvironments(ignoreCache: boolean): Promise<CondaEnvironmentInfo[] | undefined>;
    getInterpreterPath(condaEnvironmentPath: string): string;
    getCondaFileFromInterpreter(interpreterPath?: string, envName?: string): Promise<string | undefined>;
    isCondaEnvironment(interpreterPath: string): Promise<boolean>;
    getCondaEnvironment(interpreterPath: string): Promise<CondaEnvironmentInfo | undefined>;
}

export enum InterpreterType {
    Unknown = 'Unknown',
    Conda = 'Conda',
    VirtualEnv = 'VirtualEnv',
    Pipenv = 'PipEnv',
    Pyenv = 'Pyenv',
    Venv = 'Venv',
    WindowsStore = 'WindowsStore'
}
export type PythonInterpreter = InterpreterInfomation & {
    companyDisplayName?: string;
    displayName?: string;
    type: InterpreterType;
    envName?: string;
    envPath?: string;
    cachedEntry?: boolean;
};

export type WorkspacePythonPath = {
    folderUri: Uri;
    configTarget: ConfigurationTarget.Workspace | ConfigurationTarget.WorkspaceFolder;
};

export const IInterpreterService = Symbol('IInterpreterService');
export interface IInterpreterService {
    onDidChangeInterpreter: Event<void>;
    onDidChangeInterpreterInformation: Event<PythonInterpreter>;
    hasInterpreters: Promise<boolean>;
    getInterpreters(resource?: Uri, options?: GetInterpreterOptions): Promise<PythonInterpreter[]>;
    getActiveInterpreter(resource?: Uri): Promise<PythonInterpreter | undefined>;
    getInterpreterDetails(pythonPath: string, resoure?: Uri): Promise<undefined | PythonInterpreter>;
    refresh(resource: Resource): Promise<void>;
    initialize(): void;
    getDisplayName(interpreter: Partial<PythonInterpreter>): Promise<string>;
}

export const IInterpreterDisplay = Symbol('IInterpreterDisplay');
export interface IInterpreterDisplay {
    refresh(resource?: Uri): Promise<void>;
}

export const IShebangCodeLensProvider = Symbol('IShebangCodeLensProvider');
export interface IShebangCodeLensProvider extends CodeLensProvider {
    detectShebang(document: TextDocument): Promise<string | undefined>;
}

export const IInterpreterHelper = Symbol('IInterpreterHelper');
export interface IInterpreterHelper {
    getActiveWorkspaceUri(resource: Resource): WorkspacePythonPath | undefined;
    getInterpreterInformation(pythonPath: string): Promise<undefined | Partial<PythonInterpreter>>;
    isMacDefaultPythonPath(pythonPath: string): Boolean;
    getInterpreterTypeDisplayName(interpreterType: InterpreterType): string | undefined;
    getBestInterpreter(interpreters?: PythonInterpreter[]): PythonInterpreter | undefined;
}

export const IPipEnvService = Symbol('IPipEnvService');
export interface IPipEnvService extends IInterpreterLocatorService {
    executable: string;
    isRelatedPipEnvironment(dir: string, pythonPath: string): Promise<boolean>;
}

export const IInterpreterLocatorHelper = Symbol('IInterpreterLocatorHelper');
export interface IInterpreterLocatorHelper {
    mergeInterpreters(interpreters: PythonInterpreter[]): Promise<PythonInterpreter[]>;
}

export const IInterpreterWatcher = Symbol('IInterpreterWatcher');
export interface IInterpreterWatcher {
    onDidCreate: Event<Resource>;
}

export const IInterpreterWatcherBuilder = Symbol('IInterpreterWatcherBuilder');
export interface IInterpreterWatcherBuilder {
    getWorkspaceVirtualEnvInterpreterWatcher(resource: Resource): Promise<IInterpreterWatcher>;
}

export const IInterpreterLocatorProgressHandler = Symbol('IInterpreterLocatorProgressHandler');
export interface IInterpreterLocatorProgressHandler {
    register(): void;
}

export const IInterpreterLocatorProgressService = Symbol('IInterpreterLocatorProgressService');
export interface IInterpreterLocatorProgressService {
    readonly onRefreshing: Event<void>;
    readonly onRefreshed: Event<void>;
    register(): void;
}
