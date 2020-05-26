type PerfLogger = typeof import('@microsoft/typescript-etw');
import * as qc from './core';

const nullLogger: PerfLogger = {
  logEvent: qc.noop,
  logErrEvent: qc.noop,
  logPerfEvent: qc.noop,
  logInfoEvent: qc.noop,
  logStartCommand: qc.noop,
  logStopCommand: qc.noop,
  logStartUpdateProgram: qc.noop,
  logStopUpdateProgram: qc.noop,
  logStartUpdateGraph: qc.noop,
  logStopUpdateGraph: qc.noop,
  logStartResolveModule: qc.noop,
  logStopResolveModule: qc.noop,
  logStartParseSourceFile: qc.noop,
  logStopParseSourceFile: qc.noop,
  logStartReadFile: qc.noop,
  logStopReadFile: qc.noop,
  logStartBindFile: qc.noop,
  logStopBindFile: qc.noop,
  logStartScheduledOperation: qc.noop,
  logStopScheduledOperation: qc.noop,
};

// Load optional module to enable Event Tracing for Windows
// See https://github.com/microsoft/typescript-etw for more information
let etwModule;
try {
  // require() will throw an exception if the module is not installed
  // It may also return undefined if not installed properly
  etwModule = require('@microsoft/typescript-etw');
} catch (e) {
  etwModule = undefined;
}

/** Performance logger that will generate ETW events if possible - check for `logEvent` member, as `etwModule` will be `{}` when browserified */
export const perfLogger: PerfLogger = etwModule && etwModule.logEvent ? etwModule : nullLogger;
