// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable } from 'inversify';
import { Event, Extension, extensions } from 'vscode';
import { IExtensions } from '../types';

@injectable()
export class Extensions implements IExtensions {
    // tslint:disable-next-line:no-any
    public get all(): readonly Extension<any>[] {
        return extensions.all;
    }

    public get onDidChange(): Event<void> {
        return extensions.onDidChange;
    }

    // tslint:disable-next-line:no-any
    public getExtension(extensionId: any) {
        return extensions.getExtension(extensionId);
    }
}
