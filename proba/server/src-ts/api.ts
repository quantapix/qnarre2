import * as vscode from 'vscode';
import { Plugins } from './utils/plugin';

class ApiV0 {
  public constructor(
    public readonly onCompletionAccepted: vscode.Event<
      vscode.CompletionItem & { metadata?: any }
    >,
    private readonly _plugins: Plugins
  ) {}

  configurePlugin(pluginId: string, configuration: {}): void {
    this._plugins.setConfiguration(pluginId, configuration);
  }
}

export interface Api {
  getAPI(version: 0): ApiV0 | undefined;
}

export function getExtensionApi(
  onCompletionAccepted: vscode.Event<vscode.CompletionItem>,
  plugins: Plugins
): Api {
  return {
    getAPI(version) {
      if (version === 0) {
        return new ApiV0(onCompletionAccepted, plugins);
      }
      return;
    },
  };
}
