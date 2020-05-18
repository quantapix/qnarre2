// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable } from 'inversify';
import { DebugConfigStrings } from '../../../../common/utils/localize';
import { InputStep, MultiStepInput } from '../../../../common/utils/multiStepInput';
import { sendTelemetryEvent } from '../../../../telemetry';
import { EventName } from '../../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { AttachRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType, IDebugConfigurationProvider } from '../../types';

const defaultHost = 'localhost';
const defaultPort = 5678;

@injectable()
export class RemoteAttachDebugConfigurationProvider implements IDebugConfigurationProvider {
    public async buildConfiguration(
        input: MultiStepInput<DebugConfigurationState>,
        state: DebugConfigurationState
    ): Promise<InputStep<DebugConfigurationState> | void> {
        const config: Partial<AttachRequestArguments> = {
            name: DebugConfigStrings.attach.snippet.name(),
            type: DebuggerTypeName,
            request: 'attach',
            port: defaultPort,
            host: defaultHost,
            pathMappings: [
                {
                    // tslint:disable-next-line:no-invalid-template-strings
                    localRoot: '${workspaceFolder}',
                    remoteRoot: '.'
                }
            ]
        };

        config.host = await input.showInputBox({
            title: DebugConfigStrings.attach.enterRemoteHost.title(),
            step: 1,
            totalSteps: 2,
            value: config.host || defaultHost,
            prompt: DebugConfigStrings.attach.enterRemoteHost.prompt(),
            validate: (value) =>
                Promise.resolve(
                    value && value.trim().length > 0 ? undefined : DebugConfigStrings.attach.enterRemoteHost.invalid()
                )
        });
        if (!config.host) {
            config.host = defaultHost;
        }

        sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
            configurationType: DebugConfigurationType.remoteAttach,
            manuallyEnteredAValue: config.host !== defaultHost
        });
        Object.assign(state.config, config);
        return (_) => this.configurePort(input, state.config);
    }
    protected async configurePort(
        input: MultiStepInput<DebugConfigurationState>,
        config: Partial<AttachRequestArguments>
    ) {
        const port = await input.showInputBox({
            title: DebugConfigStrings.attach.enterRemotePort.title(),
            step: 2,
            totalSteps: 2,
            value: (config.port || defaultPort).toString(),
            prompt: DebugConfigStrings.attach.enterRemotePort.prompt(),
            validate: (value) =>
                Promise.resolve(
                    value && /^\d+$/.test(value.trim())
                        ? undefined
                        : DebugConfigStrings.attach.enterRemotePort.invalid()
                )
        });
        if (port && /^\d+$/.test(port.trim())) {
            config.port = parseInt(port, 10);
        }
        if (!config.port) {
            config.port = defaultPort;
        }
        sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
            configurationType: DebugConfigurationType.remoteAttach,
            manuallyEnteredAValue: config.port !== defaultPort
        });
    }
}
