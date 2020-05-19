import * as vscode from 'vscode';

export interface Command {
  readonly id: string | string[];
  execute(..._: any[]): void;
}

export class Commands {
  private readonly cmds = new Map<string, vscode.Disposable>();

  public dispose() {
    for (const c of this.cmds.values()) {
      c.dispose();
    }
    this.cmds.clear();
  }

  public register<T extends Command>(c: T) {
    const cs = this.cmds;
    for (const i of Array.isArray(c.id) ? c.id : [c.id]) {
      if (!cs.has(i)) cs.set(i, vscode.commands.registerCommand(i, c.execute, c));
    }
    return c;
  }
}
