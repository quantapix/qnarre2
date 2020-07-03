namespace core {
  export enum UpToDateStatusType {
    Unbuildable,
    UpToDate,

    UpToDateWithUpstreamTypes,

    OutOfDateWithPrepend,
    OutputMissing,
    OutOfDateWithSelf,
    OutOfDateWithUpstream,
    UpstreamOutOfDate,
    UpstreamBlocked,
    ComputingUpstream,
    TsVersionOutputOfDate,

    ContainerOnly,
  }

  export type UpToDateStatus =
    | Status.Unbuildable
    | Status.UpToDate
    | Status.OutOfDateWithPrepend
    | Status.OutputMissing
    | Status.OutOfDateWithSelf
    | Status.OutOfDateWithUpstream
    | Status.UpstreamOutOfDate
    | Status.UpstreamBlocked
    | Status.ComputingUpstream
    | Status.TsVersionOutOfDate
    | Status.ContainerOnly;

  export namespace Status {
    export interface Unbuildable {
      type: UpToDateStatusType.Unbuildable;
      reason: string;
    }

    export interface ContainerOnly {
      type: UpToDateStatusType.ContainerOnly;
    }

    export interface UpToDate {
      type: UpToDateStatusType.UpToDate | UpToDateStatusType.UpToDateWithUpstreamTypes;
      newestInputFileTime?: Date;
      newestInputFileName?: string;
      newestDeclarationFileContentChangedTime?: Date;
      newestOutputFileTime?: Date;
      newestOutputFileName?: string;
      oldestOutputFileName: string;
    }

    export interface OutOfDateWithPrepend {
      type: UpToDateStatusType.OutOfDateWithPrepend;
      outOfDateOutputFileName: string;
      newerProjectName: string;
    }

    export interface OutputMissing {
      type: UpToDateStatusType.OutputMissing;

      missingOutputFileName: string;
    }

    export interface OutOfDateWithSelf {
      type: UpToDateStatusType.OutOfDateWithSelf;
      outOfDateOutputFileName: string;
      newerInputFileName: string;
    }

    export interface UpstreamOutOfDate {
      type: UpToDateStatusType.UpstreamOutOfDate;
      upstreamProjectName: string;
    }

    export interface UpstreamBlocked {
      type: UpToDateStatusType.UpstreamBlocked;
      upstreamProjectName: string;
      upstreamProjectBlocked: boolean;
    }

    export interface ComputingUpstream {
      type: UpToDateStatusType.ComputingUpstream;
    }

    export interface TsVersionOutOfDate {
      type: UpToDateStatusType.TsVersionOutputOfDate;
      version: string;
    }

    export interface OutOfDateWithUpstream {
      type: UpToDateStatusType.OutOfDateWithUpstream;
      outOfDateOutputFileName: string;
      newerProjectName: string;
    }
  }

  export function resolveConfigFileProjectName(project: string): ResolvedConfigFileName {
    if (fileExtensionIs(project, Extension.Json)) {
      return project as ResolvedConfigFileName;
    }

    return combinePaths(project, 'tsconfig.json') as ResolvedConfigFileName;
  }
}
