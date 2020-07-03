namespace core {
  type PerfLogger = typeof import('@microsoft/typescript-etw');
  const nullLogger: PerfLogger = {
    logEvent: noop,
    logErrEvent: noop,
    logPerfEvent: noop,
    logInfoEvent: noop,
    logStartCommand: noop,
    logStopCommand: noop,
    logStartUpdateProgram: noop,
    logStopUpdateProgram: noop,
    logStartUpdateGraph: noop,
    logStopUpdateGraph: noop,
    logStartResolveModule: noop,
    logStopResolveModule: noop,
    logStartParseSourceFile: noop,
    logStopParseSourceFile: noop,
    logStartReadFile: noop,
    logStopReadFile: noop,
    logStartBindFile: noop,
    logStopBindFile: noop,
    logStartScheduledOperation: noop,
    logStopScheduledOperation: noop,
  };

  let etwModule;
  try {
    etwModule = require('@microsoft/typescript-etw');
  } catch (e) {
    etwModule = undefined;
  }

  export const perfLogger: PerfLogger = etwModule && etwModule.logEvent ? etwModule : nullLogger;
}
