// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IFileSystem } from '../../../common/platform/types';
import { IInterpreterHashProvider } from '../types';

@injectable()
export class InterpreterHashProvider implements IInterpreterHashProvider {
    constructor(@inject(IFileSystem) private readonly fs: IFileSystem) {}
    public async getInterpreterHash(pythonPath: string): Promise<string> {
        return this.fs.getFileHash(pythonPath);
    }
}
