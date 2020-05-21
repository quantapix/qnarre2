import * as vscode from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import * as qs from '../service';
import { TelemetryReporter } from './telemetry';
import { isImplicitConfig, openOrCreateConfig, ProjectType } from './tsconfig';

const localize = loadMessageBundle();

interface Hint {
  message: string;
}

class ExcludeHintItem {
  cfgName?: string;
  private bitem: vscode.StatusBarItem;
  private hint?: Hint;

  constructor(private readonly telemetry: TelemetryReporter) {
    this.bitem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    this.bitem.command = 'js.projectStatus.command';
    // this.bitem.id = 'status.typescript.exclude';
    this.bitem.text = localize('statusExclude', 'TypeScript: Configure Excludes');
  }

  currentHint(): Hint {
    return this.hint!;
  }

  hide() {
    this.bitem.hide();
  }

  show(largeRoots?: string) {
    this.hint = {
      message: largeRoots
        ? localize(
            'hintExclude',
            'To enable project-wide features, exclude folders with many files, like: {0}',
            largeRoots
          )
        : localize(
            'hintExclude.generic',
            'To enable project-wide features, exclude folders with files that you do not work on.'
          ),
    };
    this.bitem.tooltip = this.hint.message;
    this.bitem.text = localize('large.label', 'Configure Excludes');
    this.bitem.tooltip = localize(
      'hintExclude.tooltip',
      'To enable project-wide features, exclude folders with files that you do not work on.'
    );
    this.bitem.color = '#A5DF3B';
    this.bitem.show();
    this.telemetry.logTelemetry('js.hintProjectExcludes');
  }
}

function createMonitor(i: ExcludeHintItem, c: IServiceClient): vscode.Disposable {
  interface MessageItem extends vscode.MessageItem {
    index: number;
  }
  return c.onServiceStateChanged((b) => {
    if (b.languageServiceEnabled) {
      i.hide();
    } else {
      i.show();
      const n = b.projectName;
      if (n) {
        i.cfgName = n;
        vscode.window
          .showWarningMessage<MessageItem>(i.currentHint().message, {
            title: localize('large.label', 'Configure Excludes'),
            index: 0,
          })
          .then((s) => {
            if (s && s.index === 0) onConfigureSelected(c, n);
          });
      }
    }
  });
}

function onConfigureSelected(c: IServiceClient, n: string) {
  if (!isImplicitConfig(n)) {
    vscode.workspace.openTextDocument(n).then(vscode.window.showTextDocument);
  } else {
    const r = c.workspaceRootFor(vscode.Uri.file(n));
    if (r) {
      openOrCreateConfig(
        /tsconfig\.?.*\.json/.test(n) ? ProjectType.TypeScript : ProjectType.JavaScript,
        r,
        c.configuration
      );
    }
  }
}

export function create(c: IServiceClient, t: TelemetryReporter) {
  const ds: vscode.Disposable[] = [];
  const i = new ExcludeHintItem(t);
  ds.push(
    vscode.commands.registerCommand('js.projectStatus.command', () => {
      if (i.cfgName) onConfigureSelected(c, i.cfgName);
      const { message } = i.currentHint();
      return vscode.window.showInformationMessage(message);
    })
  );
  ds.push(createMonitor(i, c));
  return vscode.Disposable.from(...ds);
}
