import * as child_process from 'child_process';
import * as path from 'path';
import * as stream from 'stream';
import * as vscode from 'vscode';
import type * as proto from './protocol';
import { TsServerLogLevel, ServiceConfig } from './utils/configuration';
import * as electron from './utils/electron';
import { LogDirectory, PluginPaths } from './utils/providers';
import { Plugins } from './utils/plugin';
import { TelemetryReporter } from './utils/telemetry';
import { API, Logger, Tracer } from './utils/extras';
import { TypeScriptVersion, TypeScriptVersionProvider } from './utils/versionProvider';
import {
  IServer,
  PipeCanceller,
  ProcessBased,
  SyntaxRouting,
  ServerProcess,
  ServerDelegate,
  GetErrRouting,
} from './server';

const enum ServerKind {
  Main = 'main',
  Syntax = 'syntax',
  Semantic = 'semantic',
  Diagnostics = 'diagnostics',
}

export class Spawner {
  public constructor(
    private readonly _versionProvider: TypeScriptVersionProvider,
    private readonly _logDirectoryProvider: LogDirectory,
    private readonly _pluginPathsProvider: PluginPaths,
    private readonly logger: Logger,
    private readonly telemetry: TelemetryReporter,
    private readonly tracer: Tracer
  ) {}

  public spawn(
    version: TypeScriptVersion,
    configuration: ServiceConfig,
    plugins: Plugins,
    delegate: ServerDelegate
  ): IServer {
    let primaryServer: IServer;
    if (this.useSeparateSynServer(version, configuration)) {
      primaryServer = new SyntaxRouting(
        {
          syntax: this.spawnServer(ServerKind.Syntax, version, configuration, plugins),
          semantic: this.spawnServer(
            ServerKind.Semantic,
            version,
            configuration,
            plugins
          ),
        },
        delegate
      );
    } else {
      primaryServer = this.spawnServer(ServerKind.Main, version, configuration, plugins);
    }
    if (this.useSeparateDiagServer(configuration)) {
      return new GetErrRouting(
        {
          getErr: this.spawnServer(
            ServerKind.Diagnostics,
            version,
            configuration,
            plugins
          ),
          primary: primaryServer,
        },
        delegate
      );
    }
    return primaryServer;
  }

  private useSeparateSynServer(v: TypeScriptVersion, c: ServiceConfig) {
    return c.useSeparateSyntaxServer;
  }

  private useSeparateDiagServer(c: ServiceConfig) {
    return c.enableProjectDiagnostics;
  }

  private spawnServer(
    kind: ServerKind,
    version: TypeScriptVersion,
    configuration: ServiceConfig,
    plugins: Plugins
  ): IServer {
    const api = version.api || API.defaultVersion;
    const { args, cancellationPipeName, tsServerLogFile } = this.serverArgs(
      kind,
      configuration,
      version,
      api,
      plugins
    );
    if (Spawner.isLoggingEnabled(configuration)) {
      if (tsServerLogFile) this.logger.info(`<${kind}> Log file: ${tsServerLogFile}`);
      else this.logger.error(`<${kind}> Could not create log directory`);
    }
    this.logger.info(`<${kind}> Forking...`);
    const childProcess = electron.fork(
      version.tsServerPath,
      args,
      this.forkOptions(kind, configuration)
    );
    this.logger.info(`<${kind}> Starting...`);
    return new ProcessBased(
      kind,
      new ChildProcess(childProcess),
      tsServerLogFile,
      new PipeCanceller(kind, cancellationPipeName, this.tracer),
      version,
      this.telemetry,
      this.tracer
    );
  }

  private forkOptions(kind: ServerKind, configuration: ServiceConfig) {
    const debugPort = Spawner.debugPort(kind);
    const tsServerForkOptions: electron.ForkOptions = {
      execArgv: [
        ...(debugPort ? [`--inspect=${debugPort}`] : []),
        ...(configuration.maxTsServerMemory
          ? [`--max-old-space-size=${configuration.maxTsServerMemory}`]
          : []),
      ],
    };
    return tsServerForkOptions;
  }

  private serverArgs(
    kind: ServerKind,
    configuration: ServiceConfig,
    currentVersion: TypeScriptVersion,
    api: API,
    plugins: Plugins
  ): {
    args: string[];
    cancellationPipeName: string;
    tsServerLogFile: string | undefined;
  } {
    const args: string[] = [];
    let tsServerLogFile: string | undefined;
    if (kind === ServerKind.Syntax) args.push('--syntaxOnly');
    args.push('--useInferredProjectPerProjectRoot');
    if (
      configuration.disableAutomaticTypeAcquisition ||
      kind === ServerKind.Syntax ||
      kind === ServerKind.Diagnostics
    ) {
      args.push('--disableAutomaticTypingAcquisition');
    }
    if (kind === ServerKind.Semantic || kind === ServerKind.Main)
      args.push('--enableTelemetry');
    const cancellationPipeName = electron.getTempFile('tscancellation');
    args.push('--cancellationPipeName', cancellationPipeName + '*');
    if (Spawner.isLoggingEnabled(configuration)) {
      const logDir = this._logDirectoryProvider.newDirectory();
      if (logDir) {
        tsServerLogFile = path.join(logDir, `tsserver.log`);
        args.push(
          '--logVerbosity',
          TsServerLogLevel.toString(configuration.tsServerLogLevel)
        );
        args.push('--logFile', tsServerLogFile);
      }
    }
    const pluginPaths = this._pluginPathsProvider.pluginPaths();
    if (plugins.plugins.length) {
      args.push('--globalPlugins', plugins.plugins.map((x) => x.name).join(','));
      const isUsingBundledTypeScriptVersion =
        currentVersion.path === this._versionProvider.defaultVersion.path;
      for (const plugin of plugins.plugins) {
        if (
          isUsingBundledTypeScriptVersion ||
          plugin.enableForWorkspaceTypeScriptVersions
        ) {
          pluginPaths.push(plugin.path);
        }
      }
    }
    if (pluginPaths.length !== 0)
      args.push('--pluginProbeLocations', pluginPaths.join(','));
    if (configuration.npmLocation)
      args.push('--npmLocation', `"${configuration.npmLocation}"`);
    args.push('--locale', Spawner.locale(configuration));
    args.push('--noGetErrOnBackgroundUpdate');
    args.push('--validateDefaultNpmLocation');
    return { args, cancellationPipeName, tsServerLogFile };
  }

  private static debugPort(kind: ServerKind) {
    if (kind === 'syntax') return;
    const v = process.env['TSS_DEBUG'];
    if (v) {
      const port = parseInt(v);
      if (!isNaN(port)) return port;
    }
    return;
  }

  private static isLoggingEnabled(c: ServiceConfig) {
    return c.tsServerLogLevel !== TsServerLogLevel.Off;
  }

  private static locale(c: ServiceConfig) {
    return c.locale ? c.locale : vscode.env.language;
  }
}

class ChildProcess implements ServerProcess {
  constructor(private readonly proc: child_process.ChildProcess) {}

  get stdout(): stream.Readable {
    return this.proc.stdout!;
  }

  write(r: proto.Request) {
    this.proc.stdin!.write(JSON.stringify(r) + '\r\n', 'utf8');
  }

  on(name: 'exit', handler: (_: number | null) => void): void;
  on(name: 'error', handler: (_: Error) => void): void;
  on(name: any, handler: any) {
    this.proc.on(name, handler);
  }

  kill() {
    this.proc.kill();
  }
}
