/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from '../utils/extras';
import { Plugins } from '../utils/plugin';

export class ConfigurePluginCommand implements Command {
  public readonly id = '_typescript.configurePlugin';

  public constructor(private readonly pluginManager: Plugins) {}

  public execute(pluginId: string, configuration: any) {
    this.pluginManager.setConfiguration(pluginId, configuration);
  }
}
