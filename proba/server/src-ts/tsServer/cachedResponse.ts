import * as vscode from 'vscode';
import type * as proto from '../protocol';
import { ServerResponse } from '../typescriptService';

type Resolve<T extends proto.Response> = () => Promise<ServerResponse.Response<T>>;

export class CachedResponse<T extends proto.Response> {
  private reply?: Promise<ServerResponse.Response<T>>;
  private version = -1;
  private doc = '';

  private matches(d: vscode.TextDocument) {
    return this.version === d.version && this.doc === d.uri.toString();
  }

  public execute(d: vscode.TextDocument, r: Resolve<T>) {
    if (this.reply && this.matches(d)) {
      return (this.reply = this.reply.then((res) =>
        res.type === 'cancelled' ? r() : res
      ));
    }
    return this.reset(d, r);
  }

  private async reset(d: vscode.TextDocument, r: Resolve<T>) {
    this.version = d.version;
    this.doc = d.uri.toString();
    return (this.reply = r());
  }
}
