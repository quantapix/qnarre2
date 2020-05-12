// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as uuid from 'uuid/v4';
import { Uri } from 'vscode';
import { IFileSystem } from '../../platform/types';
import { IDisposableRegistry, IExtensionContext } from '../../types';
import { IWebPanel, IWebPanelOptions, IWebPanelProvider } from '../types';
import { WebPanel } from './webPanel';

@injectable()
export class WebPanelProvider implements IWebPanelProvider {
    private port: number | undefined;
    private token: string | undefined;

    constructor(
        @inject(IDisposableRegistry) private readonly disposableRegistry: IDisposableRegistry,
        @inject(IFileSystem) private readonly fs: IFileSystem,
        @inject(IExtensionContext) private readonly context: IExtensionContext
    ) {}

    // tslint:disable-next-line:no-any
    public async create(options: IWebPanelOptions): Promise<IWebPanel> {
        const serverData = options.startHttpServer
            ? await this.ensureServerIsRunning()
            : { port: undefined, token: undefined };
        // Allow loading resources from the `<extension folder>/tmp` folder when in webiviews.
        // Used by widgets to place files that are not otherwise accessible.
        const additionalRootPaths = [Uri.file(path.join(this.context.extensionPath, 'tmp'))];
        if (Array.isArray(options.additionalPaths)) {
            additionalRootPaths.push(...options.additionalPaths.map((item) => Uri.file(item)));
        }
        return new WebPanel(
            this.fs,
            this.disposableRegistry,
            serverData.port,
            serverData.token,
            options,
            additionalRootPaths
        );
    }

    private async ensureServerIsRunning(): Promise<{ port: number; token: string }> {
        if (!this.port || !this.token) {
            // Compute a usable port.
            this.port = await portfinder.getPortPromise({ startPort: 9000, port: 9000 });
            this.token = uuid();

            // Import webpanel server dynamically so doesn't load in the main extension until we
            // get to here.
            // tslint:disable-next-line:no-require-imports
            const webPanelServerModule = require('./webPanelServer') as typeof import('./webPanelServer');

            // Start the server listening.
            const webPanelServer = new webPanelServerModule.WebPanelServer(this.port, this.token, this.fs);
            webPanelServer.start();
            this.disposableRegistry.push(webPanelServer);
        }

        return { port: this.port, token: this.token };
    }
}
