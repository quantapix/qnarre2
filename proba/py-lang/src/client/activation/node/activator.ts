// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';

import { IWorkspaceService } from '../../common/application/types';
import { traceDecorators } from '../../common/logger';
import { IFileSystem } from '../../common/platform/types';
import { IConfigurationService, Resource } from '../../common/types';
import { LanguageServerActivatorBase } from '../common/activatorBase';
import { ILanguageServerDownloader, ILanguageServerFolderService, ILanguageServerManager } from '../types';

/**
 * Starts the Node.js-based language server managers per workspaces (currently one for first workspace).
 *
 * @export
 * @class NodeLanguageServerActivator
 * @implements {ILanguageServerActivator}
 * @extends {LanguageServerActivatorBase}
 */
@injectable()
export class NodeLanguageServerActivator extends LanguageServerActivatorBase {
    constructor(
        @inject(ILanguageServerManager) manager: ILanguageServerManager,
        @inject(IWorkspaceService) workspace: IWorkspaceService,
        @inject(IFileSystem) fs: IFileSystem,
        @inject(ILanguageServerDownloader) lsDownloader: ILanguageServerDownloader,
        @inject(ILanguageServerFolderService) languageServerFolderService: ILanguageServerFolderService,
        @inject(IConfigurationService) configurationService: IConfigurationService
    ) {
        super(manager, workspace, fs, lsDownloader, languageServerFolderService, configurationService);
    }

    @traceDecorators.error('Failed to ensure language server is available')
    public async ensureLanguageServerIsAvailable(resource: Resource): Promise<void> {
        await this.ensureLanguageServerFileIsAvailable(resource, 'server.bundle.js');
    }
}
