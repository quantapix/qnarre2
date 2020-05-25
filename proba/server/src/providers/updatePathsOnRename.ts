import * as nls from 'vscode-nls';
import * as path from 'path';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import * as qu from '../utils';
import * as qx from '../utils/extras';
import * as qr from '../utils/registration';
import { tsLike } from '../utils/language';
import * as qc from '../utils/convert';
import { FileConfigs } from '../utils/configs';

const localize = nls.loadMessageBundle();

const updateImportsOnFileMoveName = 'updateImportsOnFileMove.enabled';

async function isDirectory(resource: vsc.Uri): Promise<boolean> {
  try {
    return (await vsc.workspace.fs.stat(resource)).type === vsc.FileType.Directory;
  } catch {
    return false;
  }
}

const enum UpdateImportsOnFileMoveSetting {
  Prompt = 'prompt',
  Always = 'always',
  Never = 'never',
}

interface RenameAction {
  readonly oldUri: vsc.Uri;
  readonly newUri: vsc.Uri;
  readonly newFilePath: string;
  readonly oldFilePath: string;
  readonly jsTsFileThatIsBeingMoved: vsc.Uri;
}

class UpdateImportsOnFileRenameHandler extends qx.Disposable {
  public static readonly minApi = qr.API.default;

  private readonly _delayer = new qx.Delayer(50);
  private readonly _pendingRenames = new Set<RenameAction>();

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly fileConfigurationManager: FileConfigs,
    private readonly _handles: (uri: vsc.Uri) => Promise<boolean>
  ) {
    super();

    this.register(
      vsc.workspace.onDidRenameFiles(async (e) => {
        const [{ newUri, oldUri }] = e.files;
        const newFilePath = this.client.toPath(newUri);
        if (!newFilePath) return;
        const oldFilePath = this.client.toPath(oldUri);
        if (!oldFilePath) return;
        const config = this.getConfiguration(newUri);
        const setting = config.get<UpdateImportsOnFileMoveSetting>(
          updateImportsOnFileMoveName
        );
        if (setting === UpdateImportsOnFileMoveSetting.Never) return;
        const jsTsFileThatIsBeingMoved = await this.getJsTsFileBeingMoved(newUri);
        if (!jsTsFileThatIsBeingMoved || !this.client.toPath(jsTsFileThatIsBeingMoved))
          return;
        this._pendingRenames.add({
          oldUri,
          newUri,
          newFilePath,
          oldFilePath,
          jsTsFileThatIsBeingMoved,
        });
        this._delayer.trigger(() => {
          vsc.window.withProgress(
            {
              location: vsc.ProgressLocation.Window,
              title: localize(
                'renameProgress.title',
                'Checking for update of JS/TS imports'
              ),
            },
            () => this.flushRenames()
          );
        });
      })
    );
  }

  private async flushRenames(): Promise<void> {
    const renames = Array.from(this._pendingRenames);
    this._pendingRenames.clear();
    for (const group of this.groupRenames(renames)) {
      const edits = new vsc.WorkspaceEdit();
      const resourcesBeingRenamed: vsc.Uri[] = [];

      for (const {
        oldUri,
        newUri,
        newFilePath,
        oldFilePath,
        jsTsFileThatIsBeingMoved,
      } of group) {
        const document = await vsc.workspace.openTextDocument(jsTsFileThatIsBeingMoved);

        // Make sure TS knows about file
        this.client.buffer.closeResource(oldUri);
        this.client.buffer.openTextDocument(document);

        if (
          await this.withEditsForFileRename(edits, document, oldFilePath, newFilePath)
        ) {
          resourcesBeingRenamed.push(newUri);
        }
      }

      if (edits.size) {
        if (await this.confirmActionWithUser(resourcesBeingRenamed)) {
          await vsc.workspace.applyEdit(edits);
        }
      }
    }
  }

  private async confirmActionWithUser(
    newResources: readonly vsc.Uri[]
  ): Promise<boolean> {
    if (!newResources.length) return false;
    const config = this.getConfiguration(newResources[0]);
    const setting = config.get<UpdateImportsOnFileMoveSetting>(
      updateImportsOnFileMoveName
    );
    switch (setting) {
      case UpdateImportsOnFileMoveSetting.Always:
        return true;
      case UpdateImportsOnFileMoveSetting.Never:
        return false;
      case UpdateImportsOnFileMoveSetting.Prompt:
      default:
        return this.promptUser(newResources);
    }
  }

  private getConfiguration(resource: vsc.Uri) {
    return vsc.workspace.getConfiguration(
      tsLike(resource) ? 'typescript' : 'javascript',
      resource
    );
  }

  private async promptUser(newResources: readonly vsc.Uri[]): Promise<boolean> {
    if (!newResources.length) return false;
    const enum Choice {
      None = 0,
      Accept = 1,
      Reject = 2,
      Always = 3,
      Never = 4,
    }
    interface Item extends vsc.MessageItem {
      readonly choice: Choice;
    }
    const response = await vsc.window.showInformationMessage<Item>(
      newResources.length === 1
        ? localize(
            'prompt',
            "Update imports for '{0}'?",
            path.basename(newResources[0].fsPath)
          )
        : this.getConfirmMessage(
            localize(
              'promptMoreThanOne',
              'Update imports for the following {0} files?',
              newResources.length
            ),
            newResources
          ),
      {
        modal: true,
      },
      {
        title: localize('reject.title', 'No'),
        choice: Choice.Reject,
        isCloseAffordance: true,
      },
      {
        title: localize('accept.title', 'Yes'),
        choice: Choice.Accept,
      },
      {
        title: localize('always.title', 'Always automatically update imports'),
        choice: Choice.Always,
      },
      {
        title: localize('never.title', 'Never automatically update imports'),
        choice: Choice.Never,
      }
    );
    if (!response) return false;
    switch (response.choice) {
      case Choice.Accept: {
        return true;
      }
      case Choice.Reject: {
        return false;
      }
      case Choice.Always: {
        const config = this.getConfiguration(newResources[0]);
        config.update(
          updateImportsOnFileMoveName,
          UpdateImportsOnFileMoveSetting.Always,
          vsc.ConfigurationTarget.Global
        );
        return true;
      }
      case Choice.Never: {
        const config = this.getConfiguration(newResources[0]);
        config.update(
          updateImportsOnFileMoveName,
          UpdateImportsOnFileMoveSetting.Never,
          vsc.ConfigurationTarget.Global
        );
        return false;
      }
    }
    return false;
  }

  private async getJsTsFileBeingMoved(resource: vsc.Uri): Promise<vsc.Uri | undefined> {
    if (resource.scheme !== qx.file) return;

    if (await isDirectory(resource)) {
      const files = await vsc.workspace.findFiles(
        {
          base: resource.fsPath,
          pattern: '**/*.{ts,tsx,js,jsx}',
        },
        '**/node_modules/**',
        1
      );
      return files[0];
    }
    return (await this._handles(resource)) ? resource : undefined;
  }

  private async withEditsForFileRename(
    edits: vsc.WorkspaceEdit,
    document: vsc.TextDocument,
    oldFilePath: string,
    newFilePath: string
  ): Promise<boolean> {
    const response = await this.client.interruptGetErr(() => {
      this.fileConfigurationManager.setGlobalConfigurationFromDocument(
        document,
        qx.nulToken
      );
      const args: proto.GetEditsForFileRenameRequestArgs = {
        oldFilePath,
        newFilePath,
      };
      return this.client.execute('getEditsForFileRename', args, qx.nulToken);
    });
    if (response.type !== 'response' || !response.body.length) return false;
    qc.WorkspaceEdit.withFileCodeEdits(edits, this.client, response.body);
    return true;
  }

  private groupRenames(
    renames: Iterable<RenameAction>
  ): Iterable<Iterable<RenameAction>> {
    const groups = new Map<string, Set<RenameAction>>();
    for (const rename of renames) {
      // Group renames by type (js/ts) and by workspace.
      const key = `${this.client.workspaceRootFor(
        rename.jsTsFileThatIsBeingMoved
      )}@@@${tsLike(rename.jsTsFileThatIsBeingMoved)}`;
      if (!groups.has(key)) {
        groups.set(key, new Set());
      }
      groups.get(key)!.add(rename);
    }
    return groups.values();
  }

  private getConfirmMessage(
    start: string,
    resourcesToConfirm: readonly vsc.Uri[]
  ): string {
    const MAX_CONFIRM_FILES = 10;
    const paths = [start];
    paths.push('');
    paths.push(
      ...resourcesToConfirm
        .slice(0, MAX_CONFIRM_FILES)
        .map((r) => path.basename(r.fsPath))
    );
    if (resourcesToConfirm.length > MAX_CONFIRM_FILES) {
      if (resourcesToConfirm.length - MAX_CONFIRM_FILES === 1) {
        paths.push(localize('moreFile', '...1 additional file not shown'));
      } else {
        paths.push(
          localize(
            'moreFiles',
            '...{0} additional files not shown',
            resourcesToConfirm.length - MAX_CONFIRM_FILES
          )
        );
      }
    }
    paths.push('');
    return paths.join('\n');
  }
}

export function register(
  c: qs.IServiceClient,
  cs: FileConfigs,
  handles: (uri: vsc.Uri) => Promise<boolean>
) {
  return new qr.VersionDependent(
    c,
    UpdateImportsOnFileRenameHandler.minApi,
    () => new UpdateImportsOnFileRenameHandler(c, cs, handles)
  );
}
