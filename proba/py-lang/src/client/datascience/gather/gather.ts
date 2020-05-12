import * as ppatypes from '@msrvida-python-program-analysis';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import * as uuid from 'uuid/v4';
import { IApplicationShell, ICommandManager } from '../../common/application/types';
import { traceInfo } from '../../common/logger';
import { IFileSystem } from '../../common/platform/types';
import { IConfigurationService, IDisposableRegistry } from '../../common/types';
import * as localize from '../../common/utils/localize';
// tslint:disable-next-line: no-duplicate-imports
import { Common } from '../../common/utils/localize';
import { sendTelemetryEvent } from '../../telemetry';
import { Identifiers, Telemetry } from '../constants';
import { CellState, ICell as IVscCell, IGatherProvider } from '../types';

/**
 * An adapter class to wrap the code gathering functionality from [microsoft/python-program-analysis](https://www.npmjs.com/package/@msrvida/python-program-analysis).
 */
@injectable()
export class GatherProvider implements IGatherProvider {
    private _executionSlicer: ppatypes.ExecutionLogSlicer<ppatypes.Cell> | undefined;
    private dataflowAnalyzer: ppatypes.DataflowAnalyzer | undefined;
    private _enabled: boolean;
    private initPromise: Promise<void>;

    constructor(
        @inject(IConfigurationService) private configService: IConfigurationService,
        @inject(IApplicationShell) private applicationShell: IApplicationShell,
        @inject(IDisposableRegistry) private disposables: IDisposableRegistry,
        @inject(ICommandManager) private commandManager: ICommandManager,
        @inject(IFileSystem) private fileSystem: IFileSystem
    ) {
        // Disable gather if we're not running on insiders.
        this._enabled =
            this.configService.getSettings().datascience.enableGather &&
            this.configService.getSettings().insidersChannel !== 'off'
                ? true
                : false;

        this.initPromise = this.init();
    }

    public async logExecution(vscCell: IVscCell): Promise<void> {
        await this.initPromise;

        const gatherCell = convertVscToGatherCell(vscCell);

        if (gatherCell) {
            if (this._executionSlicer) {
                this._executionSlicer.logExecution(gatherCell);
            }
        }
    }

    public async resetLog(): Promise<void> {
        await this.initPromise;

        if (this._executionSlicer) {
            this._executionSlicer.reset();
        }
    }

    /**
     * For a given code cell, returns a string representing a program containing all the code it depends on.
     */
    public gatherCode(vscCell: IVscCell): string {
        if (!this._executionSlicer) {
            sendTelemetryEvent(Telemetry.GatherCompleted, undefined, { result: 'unavailable' });
            return '# %% [markdown]\n## Gather not available';
        }

        const gatherCell = convertVscToGatherCell(vscCell);
        if (!gatherCell) {
            return '';
        }

        // Get the default cell marker as we need to replace #%% with it.
        const defaultCellMarker =
            this.configService.getSettings().datascience.defaultCellMarker || Identifiers.DefaultCodeCellMarker;

        // Call internal slice method
        const slice = this._executionSlicer.sliceLatestExecution(gatherCell.persistentId);
        return slice.cellSlices.reduce(concat, '').replace(/#%%/g, defaultCellMarker);
    }

    public get executionSlicer() {
        return this._executionSlicer;
    }

    public get enabled() {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        this._enabled = enabled;
    }

    public async updateEnableGather(_e: void) {
        if (this.enabled !== this.configService.getSettings().datascience.enableGather) {
            this.enabled = this.configService.getSettings().datascience.enableGather ? true : false;
            const item = await this.applicationShell.showInformationMessage(
                localize.DataScience.reloadRequired(),
                Common.reload()
            );
            if (!item) {
                return;
            }
            if (item === 'Reload') {
                this.commandManager.executeCommand('workbench.action.reloadWindow');
            }
        }
    }

    private async init(): Promise<void> {
        if (this._enabled) {
            try {
                // tslint:disable-next-line: no-require-imports
                const ppa = require('@msrvida/python-program-analysis') as typeof import('@msrvida-python-program-analysis');

                if (ppa) {
                    // If the __builtins__ specs are not available for gather, then no specs have been found. Look in a specific location relative
                    // to the extension.
                    if (!ppa.getSpecs()) {
                        const defaultSpecFolder = path.join(__dirname, 'gatherSpecs');
                        if (await this.fileSystem.directoryExists(defaultSpecFolder)) {
                            ppa.setSpecFolder(defaultSpecFolder);
                        }
                    }

                    // Check to see if any additional specs can be found.
                    const additionalSpecPath = this.configService.getSettings().datascience.gatherSpecPath;
                    if (additionalSpecPath && (await this.fileSystem.directoryExists(additionalSpecPath))) {
                        ppa.addSpecFolder(additionalSpecPath);
                    } else {
                        traceInfo(`Gather: additional spec folder ${additionalSpecPath} but not found.`);
                    }

                    // Only continue to initialize gather if we were successful in finding SOME specs.
                    if (ppa.getSpecs()) {
                        this.dataflowAnalyzer = new ppa.DataflowAnalyzer();
                        this._executionSlicer = new ppa.ExecutionLogSlicer(this.dataflowAnalyzer);

                        this.disposables.push(
                            this.configService.getSettings(undefined).onDidChange((e) => this.updateEnableGather(e))
                        );
                    } else {
                        this._enabled = false;
                        traceInfo("Gather couldn't find any package specs. Disabling.");
                    }
                }
            } catch (ex) {
                this._enabled = false;
                traceInfo(`Gathering tools could't be activated. ${ex.message}`);
            }
        }
    }
}

/**
 * Accumulator to concatenate cell slices for a sliced program, preserving cell structures.
 */
function concat(existingText: string, newText: ppatypes.CellSlice): string {
    // Include our cell marker so that cell slices are preserved
    return `${existingText}#%%\n${newText.textSliceLines}\n`;
}

/**
 * This is called to convert VS Code ICells to Gather ICells for logging.
 * @param cell A cell object conforming to the VS Code cell interface
 */
function convertVscToGatherCell(cell: IVscCell): ppatypes.Cell | undefined {
    // This should always be true since we only want to log code cells. Putting this here so types match for outputs property
    if (cell.data.cell_type === 'code') {
        const result: ppatypes.Cell = {
            // tslint:disable-next-line no-unnecessary-local-variable
            text: cell.data.source,

            executionCount: cell.data.execution_count,
            executionEventId: uuid(),

            persistentId: cell.id,
            hasError: cell.state === CellState.error
            // tslint:disable-next-line: no-any
        } as any;
        return result;
    }
}
