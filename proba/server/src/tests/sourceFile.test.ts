/*
 * sourceFile.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright sourceFile module.
 */

import { ImportResolver } from '../analyzer/importResolver';
import { SourceFile } from '../analyzer/sourceFile';
import { ConfigOptions } from '../utils/options';
import { createFromRealFileSystem } from '../utils/fileSystem';
import { combinePaths } from '../utils/pathUtils';

test('Empty', () => {
  const filePath = combinePaths(process.cwd(), 'tests/samples/test_file1.py');
  const fs = createFromRealFileSystem();
  const sourceFile = new SourceFile(fs, filePath, false, false);
  const configOptions = new ConfigOptions(process.cwd());
  const importResolver = new ImportResolver(fs, configOptions);

  sourceFile.parse(configOptions, importResolver);
});
