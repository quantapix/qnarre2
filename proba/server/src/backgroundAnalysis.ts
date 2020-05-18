import { isMainThread, Worker } from 'worker_threads';

import {
  BackgroundAnalysisBase,
  BackgroundAnalysisRunnerBase,
  InitializationData,
} from './backgroundAnalysisBase';
import { getCancellationFolderName } from './utils/cancellationUtils';
import { QConsole } from './utils/misc';

export class BackgroundAnalysis extends BackgroundAnalysisBase {
  constructor(console: QConsole) {
    super();

    const initialData: InitializationData = {
      rootDirectory: (global as any).__rootDirectory as string,
      cancellationFolderName: getCancellationFolderName(),
    };

    // this will load this same file in BG thread and start listener
    const worker = new Worker(__filename, { workerData: initialData });
    this.setup(worker, console);
  }
}

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
  constructor() {
    super();
  }
}

if (!isMainThread) {
  const runner = new BackgroundAnalysisRunner();
  runner.start();
}
