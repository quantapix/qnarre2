import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { CancellationId, MessageConnection } from 'vscode-jsonrpc';
import {
  CancellationReceiverStrategy,
  CancellationSenderStrategy,
  CancellationStrategy,
  Disposable,
} from 'vscode-languageserver';

export class Cancel implements CancellationStrategy, Disposable {
  private _sender: Sender;

  constructor() {
    this._sender = new Sender(randomBytes(21).toString('hex'));
  }

  get receiver() {
    return CancellationReceiverStrategy.Message;
  }

  get sender(): CancellationSenderStrategy {
    return this._sender;
  }

  args(): string[] {
    return [`--cancellationReceive=file:${this._sender.folder}`];
  }

  dispose() {
    this._sender.dispose();
  }
}

class Sender implements CancellationSenderStrategy {
  constructor(readonly folder: string) {
    tryRun(() => fs.mkdirSync(folderPath(folder), { recursive: true }));
  }

  sendCancellation(_: MessageConnection, id: CancellationId) {
    tryRun(() => fs.writeFileSync(filePath(this.folder, id), '', { flag: 'w' }));
  }

  cleanup(id: CancellationId) {
    tryRun(() => fs.unlinkSync(filePath(this.folder, id)));
  }

  dispose() {
    function rimraf(p: string) {
      const s = fs.lstatSync(p);
      if (s) {
        if (s.isDirectory() && !s.isSymbolicLink()) {
          for (const d of fs.readdirSync(p)) {
            rimraf(path.join(p, d));
          }
          fs.rmdirSync(p);
        } else fs.unlinkSync(p);
      }
    }
    tryRun(() => rimraf(folderPath(this.folder)));
  }
}

function folderPath(n: string) {
  return path.join(os.tmpdir(), 'qpx-cancellation', n);
}

function filePath(n: string, id: CancellationId) {
  return path.join(folderPath(n), `cancellation-${String(id)}.tmp`);
}

function tryRun(callback: () => void) {
  try {
    callback();
  } catch (e) {}
}
