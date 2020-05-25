import * as vsc from 'vscode';
import cp from 'child_process';
import path from 'path';
import stream from 'stream';
import type * as proto from './protocol';

import { TsServerLogLevel, ServiceConfig } from './utils/configs';
import * as qu from './utils';
import { LogDirectory, PluginPaths } from './utils/providers';
import { Plugins } from './utils/plugin';
import { TelemetryReporter } from './utils/telemetry';
import * as qx from './utils/extras';
import * as qr from './utils/registration';
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

const enum Kind {
  Main = 'main',
  Syntax = 'syntax',
  Semantic = 'semantic',
  Diagnostics = 'diagnostics',
}

export class Spawner {
  public constructor(
    private readonly version: TypeScriptVersionProvider,
    private readonly logDir: LogDirectory,
    private readonly paths: PluginPaths,
    private readonly logger: qx.Logger,
    private readonly telemetry: TelemetryReporter,
    private readonly tracer: qx.Tracer
  ) {}

  public spawn(
    v: TypeScriptVersion,
    cfg: ServiceConfig,
    plugins: Plugins,
    delegate: ServerDelegate
  ): IServer {
    let s: IServer;
    if (this.useSeparateSynServer(v, cfg)) {
      s = new SyntaxRouting(
        {
          syntax: this.spawnServer(Kind.Syntax, v, cfg, plugins),
          semantic: this.spawnServer(Kind.Semantic, v, cfg, plugins),
        },
        delegate
      );
    } else s = this.spawnServer(Kind.Main, v, cfg, plugins);
    if (this.useSeparateDiagServer(cfg)) {
      return new GetErrRouting(
        {
          getErr: this.spawnServer(Kind.Diagnostics, v, cfg, plugins),
          primary: s,
        },
        delegate
      );
    }
    return s;
  }

  private useSeparateSynServer(v: TypeScriptVersion, c: ServiceConfig) {
    return c.useSeparateSyntaxServer;
  }

  private useSeparateDiagServer(c: ServiceConfig) {
    return c.enableProjectDiagnostics;
  }

  private spawnServer(
    kind: Kind,
    v: TypeScriptVersion,
    cfg: ServiceConfig,
    plugins: Plugins
  ): IServer {
    const api = v.api || qr.API.default;
    const { args, cancellationPipeName, tsServerLogFile } = this.serverArgs(
      kind,
      cfg,
      v,
      api,
      plugins
    );
    if (Spawner.isLoggingEnabled(cfg)) {
      if (tsServerLogFile) this.logger.info(`<${kind}> Log file: ${tsServerLogFile}`);
      else this.logger.error(`<${kind}> Could not create log directory`);
    }
    this.logger.info(`<${kind}> Forking...`);
    const childProcess = qu.fork(v.tsServerPath, args, this.forkOptions(kind, cfg));
    this.logger.info(`<${kind}> Starting...`);
    return new ProcessBased(
      kind,
      new ChildProcess(childProcess),
      tsServerLogFile,
      new PipeCanceller(kind, cancellationPipeName, this.tracer),
      v,
      this.telemetry,
      this.tracer
    );
  }

  private forkOptions(k: Kind, cfg: ServiceConfig): qu.ForkOptions {
    const p = Spawner.debugPort(k);
    return {
      argv: [
        ...(p ? [`--inspect=${p}`] : []),
        ...(cfg.maxTsServerMemory
          ? [`--max-old-space-size=${cfg.maxTsServerMemory}`]
          : []),
      ],
    };
  }

  private serverArgs(
    kind: Kind,
    cfg: ServiceConfig,
    currentVersion: TypeScriptVersion,
    api: qr.API,
    plugins: Plugins
  ): {
    args: string[];
    cancellationPipeName: string;
    tsServerLogFile: string | undefined;
  } {
    const args: string[] = [];
    let tsServerLogFile: string | undefined;
    if (kind === Kind.Syntax) args.push('--syntaxOnly');
    args.push('--useInferredProjectPerProjectRoot');
    if (
      cfg.disableAutomaticTypeAcquisition ||
      kind === Kind.Syntax ||
      kind === Kind.Diagnostics
    ) {
      args.push('--disableAutomaticTypingAcquisition');
    }
    if (kind === Kind.Semantic || kind === Kind.Main) args.push('--enableTelemetry');
    const cancellationPipeName = qu.tempFile('tscancellation');
    args.push('--cancellationPipeName', cancellationPipeName + '*');
    if (Spawner.isLoggingEnabled(cfg)) {
      const d = this.logDir.newDirectory();
      if (d) {
        tsServerLogFile = path.join(d, `tsserver.log`);
        args.push('--logVerbosity', TsServerLogLevel.toString(cfg.tsServerLogLevel));
        args.push('--logFile', tsServerLogFile);
      }
    }
    const ps = this.paths.pluginPaths();
    if (plugins.all.length) {
      args.push('--globalPlugins', plugins.all.map((x) => x.name).join(','));
      const isUsingBundledTypeScriptVersion =
        currentVersion.path === this.version.defaultVersion.path;
      for (const p of plugins.all) {
        if (isUsingBundledTypeScriptVersion || p.enableForVersions) ps.push(p.path);
      }
    }
    if (ps.length !== 0) args.push('--pluginProbeLocations', ps.join(','));
    if (cfg.npmLocation) args.push('--npmLocation', `"${cfg.npmLocation}"`);
    args.push('--locale', Spawner.locale(cfg));
    args.push('--noGetErrOnBackgroundUpdate');
    args.push('--validateDefaultNpmLocation');
    return { args, cancellationPipeName, tsServerLogFile };
  }

  private static debugPort(kind: Kind) {
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
    return c.locale ? c.locale : vsc.env.language;
  }
}

class ChildProcess implements ServerProcess {
  constructor(private readonly proc: cp.ChildProcess) {}

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
