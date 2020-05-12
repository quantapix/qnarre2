// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable, named } from 'inversify';
import { CancellationToken, DebugConfiguration, QuickPickItem, WorkspaceFolder } from 'vscode';
import { DebugConfigStrings } from '../../../common/utils/localize';
import {
    IMultiStepInput,
    IMultiStepInputFactory,
    InputStep,
    IQuickPickParameters
} from '../../../common/utils/multiStepInput';
import { AttachRequestArguments, DebugConfigurationArguments, LaunchRequestArguments } from '../../types';
import { DebugConfigurationState, DebugConfigurationType, IDebugConfigurationService } from '../types';
import { IDebugConfigurationProviderFactory, IDebugConfigurationResolver } from './types';

@injectable()
export class PythonDebugConfigurationService implements IDebugConfigurationService {
    constructor(
        @inject(IDebugConfigurationResolver)
        @named('attach')
        private readonly attachResolver: IDebugConfigurationResolver<AttachRequestArguments>,
        @inject(IDebugConfigurationResolver)
        @named('launch')
        private readonly launchResolver: IDebugConfigurationResolver<LaunchRequestArguments>,
        @inject(IDebugConfigurationProviderFactory)
        private readonly providerFactory: IDebugConfigurationProviderFactory,
        @inject(IMultiStepInputFactory) private readonly multiStepFactory: IMultiStepInputFactory
    ) {}
    public async provideDebugConfigurations(
        folder: WorkspaceFolder | undefined,
        token?: CancellationToken
    ): Promise<DebugConfiguration[] | undefined> {
        const config: Partial<DebugConfigurationArguments> = {};
        const state = { config, folder, token };

        // Disabled until configuration issues are addressed by VS Code. See #4007
        const multiStep = this.multiStepFactory.create<DebugConfigurationState>();
        await multiStep.run((input, s) => this.pickDebugConfiguration(input, s), state);

        if (Object.keys(state.config).length === 0) {
            return;
        } else {
            return [state.config as DebugConfiguration];
        }
    }
    public async resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        debugConfiguration: DebugConfiguration,
        token?: CancellationToken
    ): Promise<DebugConfiguration | undefined> {
        if (debugConfiguration.request === 'attach') {
            return this.attachResolver.resolveDebugConfiguration(
                folder,
                debugConfiguration as AttachRequestArguments,
                token
            );
        } else if (debugConfiguration.request === 'test') {
            throw Error("Please use the command 'Python: Debug Unit Tests'");
        } else {
            if (Object.keys(debugConfiguration).length === 0) {
                const configs = await this.provideDebugConfigurations(folder, token);
                if (configs === undefined) {
                    return;
                }
                if (Array.isArray(configs) && configs.length === 1) {
                    debugConfiguration = configs[0];
                }
            }
            return this.launchResolver.resolveDebugConfiguration(
                folder,
                debugConfiguration as LaunchRequestArguments,
                token
            );
        }
    }
    protected async pickDebugConfiguration(
        input: IMultiStepInput<DebugConfigurationState>,
        state: DebugConfigurationState
    ): Promise<InputStep<DebugConfigurationState> | void> {
        type DebugConfigurationQuickPickItem = QuickPickItem & { type: DebugConfigurationType };
        const items: DebugConfigurationQuickPickItem[] = [
            {
                label: DebugConfigStrings.file.selectConfiguration.label(),
                type: DebugConfigurationType.launchFile,
                description: DebugConfigStrings.file.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.module.selectConfiguration.label(),
                type: DebugConfigurationType.launchModule,
                description: DebugConfigStrings.module.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.attach.selectConfiguration.label(),
                type: DebugConfigurationType.remoteAttach,
                description: DebugConfigStrings.attach.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.attachPid.selectConfiguration.label(),
                type: DebugConfigurationType.pidAttach,
                description: DebugConfigStrings.attachPid.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.django.selectConfiguration.label(),
                type: DebugConfigurationType.launchDjango,
                description: DebugConfigStrings.django.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.flask.selectConfiguration.label(),
                type: DebugConfigurationType.launchFlask,
                description: DebugConfigStrings.flask.selectConfiguration.description()
            },
            {
                label: DebugConfigStrings.pyramid.selectConfiguration.label(),
                type: DebugConfigurationType.launchPyramid,
                description: DebugConfigStrings.pyramid.selectConfiguration.description()
            }
        ];
        state.config = {};
        const pick = await input.showQuickPick<
            DebugConfigurationQuickPickItem,
            IQuickPickParameters<DebugConfigurationQuickPickItem>
        >({
            title: DebugConfigStrings.selectConfiguration.title(),
            placeholder: DebugConfigStrings.selectConfiguration.placeholder(),
            activeItem: items[0],
            items: items
        });
        if (pick) {
            const provider = this.providerFactory.create(pick.type);
            return provider.buildConfiguration.bind(provider);
        }
    }
}
