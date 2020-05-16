// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import type { nbformat } from '@jupyterlab/coreutils';
import { inject, injectable, named } from 'inversify';
import * as path from 'path';
import { CancellationToken, CancellationTokenSource } from 'vscode';
import { IWorkspaceService } from '../../common/application/types';
import { wrapCancellationTokens } from '../../common/cancellation';
import { traceError, traceInfo } from '../../common/logger';
import { IFileSystem, IPlatformService } from '../../common/platform/types';
import { IExtensionContext, IInstaller, InstallerResponse, IPathUtils, Product, Resource } from '../../common/types';
import { IInterpreterLocatorService, IInterpreterService, KNOWN_PATH_SERVICE } from '../../interpreter/contracts';
import { captureTelemetry } from '../../telemetry';
import { Telemetry } from '../constants';
import { createDefaultKernelSpec, defaultKernelSpecName } from '../jupyter/kernels/helpers';
import { JupyterKernelSpec } from '../jupyter/kernels/jupyterKernelSpec';
import { IJupyterKernelSpec } from '../types';
import { getKernelInterpreter } from './helpers';
import { IKernelFinder } from './types';
// tslint:disable-next-line:no-require-imports no-var-requires
const flatten = require('lodash/flatten') as typeof import('lodash/flatten');

const winJupyterPath = path.join('AppData', 'Roaming', 'jupyter', 'kernels');
const linuxJupyterPath = path.join('.local', 'share', 'jupyter', 'kernels');
const macJupyterPath = path.join('Library', 'Jupyter', 'kernels');
const baseKernelPath = path.join('share', 'jupyter', 'kernels');

const cacheFile = 'kernelSpecPathCache.json';

// This class searches for a kernel that matches the given kernel name.
// First it searches on a global persistent state, then on the installed python interpreters,
// and finally on the default locations that jupyter installs kernels on.
// If a kernel name is not given, it returns a default IJupyterKernelSpec created from the current interpreter.
// Before returning the IJupyterKernelSpec it makes sure that ipykernel is installed into the kernel spec interpreter
@injectable()
export class KernelFinder implements IKernelFinder {
    private cache: string[] = [];
    private cacheDirty = false;

    // Store our results when listing all possible kernelspecs for a resource
    private workspaceToKernels = new Map<string, Promise<IJupyterKernelSpec[]>>();

    // Store any json file that we have loaded from disk before
    private pathToKernelSpec = new Map<string, Promise<IJupyterKernelSpec | undefined>>();

    constructor(
        @inject(IInterpreterService) private interpreterService: IInterpreterService,
        @inject(IInterpreterLocatorService)
        @named(KNOWN_PATH_SERVICE)
        private readonly interpreterLocator: IInterpreterLocatorService,
        @inject(IPlatformService) private platformService: IPlatformService,
        @inject(IFileSystem) private file: IFileSystem,
        @inject(IPathUtils) private readonly pathUtils: IPathUtils,
        @inject(IInstaller) private installer: IInstaller,
        @inject(IExtensionContext) private readonly context: IExtensionContext,
        @inject(IWorkspaceService) private readonly workspaceService: IWorkspaceService
    ) {}

    @captureTelemetry(Telemetry.KernelFinderPerf)
    public async findKernelSpec(
        resource: Resource,
        kernelSpecMetadata?: nbformat.IKernelspecMetadata,
        cancelToken?: CancellationToken
    ): Promise<IJupyterKernelSpec> {
        this.cache = await this.readCache();
        let foundKernel: IJupyterKernelSpec | undefined;

        const kernelName = kernelSpecMetadata?.name;

        if (kernelSpecMetadata && kernelName) {
            // For a non default kernelspec search for it
            if (!kernelName.includes(defaultKernelSpecName)) {
                let kernelSpec = await this.searchCache(kernelName);

                if (kernelSpec) {
                    return kernelSpec;
                }

                // Check in active interpreter first
                kernelSpec = await this.getKernelSpecFromActiveInterpreter(kernelName, resource);

                if (kernelSpec) {
                    this.writeCache(this.cache).ignoreErrors();
                    return kernelSpec;
                }

                const diskSearch = this.findDiskPath(kernelName);
                const interpreterSearch = this.getInterpreterPaths(resource).then((interpreterPaths) => {
                    return this.findInterpreterPath(interpreterPaths, kernelName);
                });

                let result = await Promise.race([diskSearch, interpreterSearch]);
                if (!result) {
                    const both = await Promise.all([diskSearch, interpreterSearch]);
                    result = both[0] ? both[0] : both[1];
                }

                foundKernel = result ? result : await this.getDefaultKernelSpec(resource);
            } else {
                // For a previous default kernel spec, just use it again
                foundKernel = this.reuseExistingDefaultSpec(kernelSpecMetadata);
            }
        } else {
            // If we don't have kernel metadata then just get a default spec to use
            foundKernel = await this.getDefaultKernelSpec(resource);
        }

        this.writeCache(this.cache).ignoreErrors();

        // Verify that ipykernel is installed into the given kernelspec interpreter
        return this.verifyIpyKernel(foundKernel, cancelToken);
    }

    // Search all our local file system locations for installed kernel specs and return them
    public async listKernelSpecs(resource: Resource): Promise<IJupyterKernelSpec[]> {
        if (!resource) {
            // We need a resource to search for related kernel specs
            return [];
        }

        // Get an id for the workspace folder, if we don't have one, use the fsPath of the resource
        const workspaceFolderId = this.workspaceService.getWorkspaceFolderIdentifier(resource, resource.fsPath);

        // If we have not already searched for this resource, then generate the search
        if (!this.workspaceToKernels.has(workspaceFolderId)) {
            this.workspaceToKernels.set(workspaceFolderId, this.findResourceKernelSpecs(resource));
        }

        this.writeCache(this.cache).ignoreErrors();

        // ! as the has and set above verify that we have a return here
        return this.workspaceToKernels.get(workspaceFolderId)!;
    }

    private reuseExistingDefaultSpec(kernelMetadata: nbformat.IKernelspecMetadata): IJupyterKernelSpec {
        return createDefaultKernelSpec(kernelMetadata.display_name);
    }

    private async findResourceKernelSpecs(resource: Resource): Promise<IJupyterKernelSpec[]> {
        const results: IJupyterKernelSpec[] = [];

        // Find all the possible places to look for this resource
        const paths = await this.findAllResourcePossibleKernelPaths(resource);

        const searchResults = await this.kernelGlobSearch(paths);

        await Promise.all(
            searchResults.map(async (resultPath) => {
                // Add these into our path cache to speed up later finds
                this.updateCache(resultPath);
                const kernelspec = await this.getKernelSpec(resultPath);

                if (kernelspec) {
                    results.push(kernelspec);
                }
            })
        );

        return results;
    }

    // Load the IJupyterKernelSpec for a given spec path, check the ones that we have already loaded first
    private async getKernelSpec(specPath: string): Promise<IJupyterKernelSpec | undefined> {
        // If we have not already loaded this kernel spec, then load it
        if (!this.pathToKernelSpec.has(specPath)) {
            this.pathToKernelSpec.set(specPath, this.loadKernelSpec(specPath));
        }

        // ! as the has and set above verify that we have a return here
        return this.pathToKernelSpec.get(specPath)!.then((value) => {
            if (value) {
                return value;
            }

            // If we failed to get a kernelspec pull path from our cache and loaded list
            this.pathToKernelSpec.delete(specPath);
            this.cache = this.cache.filter((itempath) => itempath !== specPath);
            return undefined;
        });
    }

    // Load kernelspec json from disk
    private async loadKernelSpec(specPath: string): Promise<IJupyterKernelSpec | undefined> {
        let kernelJson;
        try {
            kernelJson = JSON.parse(await this.file.readFile(specPath));
        } catch {
            traceError(`Failed to parse kernelspec ${specPath}`);
            return undefined;
        }
        const kernelSpec: IJupyterKernelSpec = new JupyterKernelSpec(kernelJson, specPath);

        // Some registered kernel specs do not have a name, in this case use the last part of the path
        kernelSpec.name = kernelJson?.name || path.basename(path.dirname(specPath));
        return kernelSpec;
    }

    // For the given resource, find atll the file paths for kernel specs that wewant to associate with this
    private async findAllResourcePossibleKernelPaths(
        resource: Resource,
        _cancelToken?: CancellationToken
    ): Promise<string[]> {
        const [activePath, interpreterPaths, diskPaths] = await Promise.all([
            this.getActiveInterpreterPath(resource),
            this.getInterpreterPaths(resource),
            this.getDiskPaths()
        ]);

        return [...activePath, ...interpreterPaths, ...diskPaths];
    }

    private async getActiveInterpreterPath(resource: Resource): Promise<string[]> {
        const activeInterpreter = await this.interpreterService.getActiveInterpreter(resource);

        if (activeInterpreter) {
            return [path.join(activeInterpreter.sysPrefix, 'share', 'jupyter', 'kernels')];
        }

        return [];
    }

    private async getInterpreterPaths(resource: Resource): Promise<string[]> {
        const interpreters = await this.interpreterLocator.getInterpreters(resource, { ignoreCache: false });
        const interpreterPrefixPaths = interpreters.map((interpreter) => interpreter.sysPrefix);
        // We can get many duplicates here, so de-dupe the list
        const uniqueInterpreterPrefixPaths = [...new Set(interpreterPrefixPaths)];
        return uniqueInterpreterPrefixPaths.map((prefixPath) => path.join(prefixPath, baseKernelPath));
    }

    private async getDiskPaths(): Promise<string[]> {
        let paths = [];

        if (this.platformService.isWindows) {
            paths = [path.join(this.pathUtils.home, winJupyterPath)];

            if (process.env.ALLUSERSPROFILE) {
                paths.push(path.join(process.env.ALLUSERSPROFILE, 'jupyter', 'kernels'));
            }
        } else {
            // Unix based
            const secondPart = this.platformService.isMac ? macJupyterPath : linuxJupyterPath;

            paths = [
                path.join('usr', 'share', 'jupyter', 'kernels'),
                path.join('usr', 'local', 'share', 'jupyter', 'kernels'),
                path.join(this.pathUtils.home, secondPart)
            ];
        }

        return paths;
    }

    // Given a set of paths, search for kernel.json files and return back the full paths of all of them that we find
    private async kernelGlobSearch(paths: string[]): Promise<string[]> {
        const promises = paths.map((kernelPath) => this.file.search(`**/kernel.json`, kernelPath));
        const searchResults = await Promise.all(promises);

        // Append back on the start of each path so we have the full path in the results
        const fullPathResults = searchResults.map((result, index) => {
            return result.map((partialSpecPath) => {
                return path.join(paths[index], partialSpecPath);
            });
        });

        return flatten(fullPathResults);
    }

    // For the given kernelspec return back the kernelspec with ipykernel installed into it or error
    private async verifyIpyKernel(
        kernelSpec: IJupyterKernelSpec,
        cancelToken?: CancellationToken
    ): Promise<IJupyterKernelSpec> {
        const interpreter = await getKernelInterpreter(kernelSpec, this.interpreterService);

        if (await this.installer.isInstalled(Product.ipykernel, interpreter)) {
            return kernelSpec;
        } else {
            const token = new CancellationTokenSource();
            const response = await this.installer.promptToInstall(
                Product.ipykernel,
                interpreter,
                wrapCancellationTokens(cancelToken, token.token)
            );
            if (response === InstallerResponse.Installed) {
                return kernelSpec;
            }
        }

        throw new Error(`IPyKernel not installed into interpreter ${interpreter.displayName}`);
    }

    private async getKernelSpecFromActiveInterpreter(
        kernelName: string,
        resource: Resource
    ): Promise<IJupyterKernelSpec | undefined> {
        const activePath = await this.getActiveInterpreterPath(resource);
        return this.getKernelSpecFromDisk(activePath, kernelName);
    }

    private async findInterpreterPath(
        interpreterPaths: string[],
        kernelName: string
    ): Promise<IJupyterKernelSpec | undefined> {
        const promises = interpreterPaths.map((intPath) => this.getKernelSpecFromDisk([intPath], kernelName));

        const specs = await Promise.all(promises);
        return specs.find((sp) => sp !== undefined);
    }

    // Jupyter looks for kernels in these paths:
    // https://jupyter-client.readthedocs.io/en/stable/kernels.html#kernel-specs
    private async findDiskPath(kernelName: string): Promise<IJupyterKernelSpec | undefined> {
        const paths = await this.getDiskPaths();

        return this.getKernelSpecFromDisk(paths, kernelName);
    }

    private async getKernelSpecFromDisk(paths: string[], kernelName: string): Promise<IJupyterKernelSpec | undefined> {
        const searchResults = await this.kernelGlobSearch(paths);
        searchResults.forEach((specPath) => {
            this.updateCache(specPath);
        });

        return this.searchCache(kernelName);
    }

    private async getDefaultKernelSpec(resource: Resource): Promise<IJupyterKernelSpec> {
        const activeInterpreter = await this.interpreterService.getActiveInterpreter(resource);

        return createDefaultKernelSpec(activeInterpreter?.displayName);
    }

    private async readCache(): Promise<string[]> {
        try {
            return JSON.parse(
                await this.file.readFile(path.join(this.context.globalStoragePath, cacheFile))
            ) as string[];
        } catch {
            traceInfo('No kernelSpec cache found.');
            return [];
        }
    }

    private updateCache(newPath: string) {
        if (!this.cache.includes(newPath)) {
            this.cache.push(newPath);
            this.cacheDirty = true;
        }
    }

    private async writeCache(cache: string[]) {
        if (this.cacheDirty) {
            await this.file.writeFile(path.join(this.context.globalStoragePath, cacheFile), JSON.stringify(cache));
            this.cacheDirty = false;
        }
    }

    private async searchCache(kernelName: string): Promise<IJupyterKernelSpec | undefined> {
        const kernelJsonFile = this.cache.find((kernelPath) => {
            try {
                return path.basename(path.dirname(kernelPath)) === kernelName;
            } catch (e) {
                traceInfo('KernelSpec path in cache is not a string.', e);
                return false;
            }
        });

        if (kernelJsonFile) {
            return this.getKernelSpec(kernelJsonFile);
        }

        return undefined;
    }
}
