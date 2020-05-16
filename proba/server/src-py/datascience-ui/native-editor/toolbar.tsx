// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import * as React from 'react';
import { connect } from 'react-redux';
import { NativeMouseCommandTelemetry } from '../../client/datascience/constants';
import { KernelSelection } from '../interactive-common/kernelSelection';
import {
    getSelectedAndFocusedInfo,
    IFont,
    IServerState,
    SelectionAndFocusedInfo,
    ServerStatus
} from '../interactive-common/mainState';
import { IStore } from '../interactive-common/redux/store';
import { Image, ImageName } from '../react-common/image';
import { ImageButton } from '../react-common/imageButton';
import { getLocString } from '../react-common/locReactSide';
import './nativeEditor.less';
import { actionCreators } from './redux/actions';

type INativeEditorDataProps = {
    busy: boolean;
    dirty: boolean;
    baseTheme: string;
    cellCount: number;
    font: IFont;
    kernel: IServerState;
    selectionFocusedInfo: SelectionAndFocusedInfo;
    variablesVisible: boolean;
};
export type INativeEditorToolbarProps = INativeEditorDataProps & {
    sendCommand: typeof actionCreators.sendCommand;
    clearAllOutputs: typeof actionCreators.clearAllOutputs;
    export: typeof actionCreators.export;
    addCell: typeof actionCreators.addCell;
    save: typeof actionCreators.save;
    executeAllCells: typeof actionCreators.executeAllCells;
    toggleVariableExplorer: typeof actionCreators.toggleVariableExplorer;
    executeAbove: typeof actionCreators.executeAbove;
    executeCellAndBelow: typeof actionCreators.executeCellAndBelow;
    restartKernel: typeof actionCreators.restartKernel;
    interruptKernel: typeof actionCreators.interruptKernel;
    selectKernel: typeof actionCreators.selectKernel;
    selectServer: typeof actionCreators.selectServer;
};

function mapStateToProps(state: IStore): INativeEditorDataProps {
    return {
        ...state.main,
        cellCount: state.main.cellVMs.length,
        selectionFocusedInfo: getSelectedAndFocusedInfo(state.main),
        variablesVisible: state.variables.visible
    };
}

export class Toolbar extends React.PureComponent<INativeEditorToolbarProps> {
    constructor(props: INativeEditorToolbarProps) {
        super(props);
    }

    // tslint:disable: react-this-binding-issue
    // tslint:disable-next-line: max-func-body-length
    public render() {
        const selectedInfo = this.props.selectionFocusedInfo;

        const addCell = () => {
            setTimeout(() => this.props.addCell(), 1);
            this.props.sendCommand(NativeMouseCommandTelemetry.AddToEnd);
        };
        const runAll = () => {
            // Run all cells currently available.
            this.props.executeAllCells();
            this.props.sendCommand(NativeMouseCommandTelemetry.RunAll);
        };
        const save = () => {
            this.props.save();
            this.props.sendCommand(NativeMouseCommandTelemetry.Save);
        };
        const toggleVariableExplorer = () => {
            this.props.toggleVariableExplorer();
            this.props.sendCommand(NativeMouseCommandTelemetry.ToggleVariableExplorer);
        };
        const variableExplorerTooltip = this.props.variablesVisible
            ? getLocString('DataScience.collapseVariableExplorerTooltip', 'Hide variables active in jupyter kernel')
            : getLocString('DataScience.expandVariableExplorerTooltip', 'Show variables active in jupyter kernel');
        const runAbove = () => {
            if (selectedInfo.selectedCellId) {
                this.props.executeAbove(selectedInfo.selectedCellId);
                this.props.sendCommand(NativeMouseCommandTelemetry.RunAbove);
            }
        };
        const runBelow = () => {
            if (selectedInfo.selectedCellId && typeof selectedInfo.selectedCellIndex === 'number') {
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: Is the source going to be up to date during run below?
                this.props.executeCellAndBelow(selectedInfo.selectedCellId);
                this.props.sendCommand(NativeMouseCommandTelemetry.RunBelow);
            }
        };
        const selectKernel = () => {
            this.props.selectKernel();
            this.props.sendCommand(NativeMouseCommandTelemetry.SelectKernel);
        };
        const selectServer = () => {
            this.props.selectServer();
            this.props.sendCommand(NativeMouseCommandTelemetry.SelectServer);
        };
        const canRunAbove = (selectedInfo.selectedCellIndex ?? -1) > 0;
        const canRunBelow =
            (selectedInfo.selectedCellIndex ?? -1) < this.props.cellCount - 1 &&
            (selectedInfo.selectedCellId || '').length > 0;

        const canRestartAndInterruptKernel = this.props.kernel.jupyterServerStatus !== ServerStatus.NotStarted;

        return (
            <div id="toolbar-panel">
                <div className="toolbar-menu-bar">
                    <div className="toolbar-menu-bar-child">
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={runAll}
                            disabled={this.props.busy}
                            className="native-button"
                            tooltip={getLocString('DataScience.runAll', 'Run All Cells')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.RunAll}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={runAbove}
                            disabled={!canRunAbove || this.props.busy}
                            className="native-button"
                            tooltip={getLocString('DataScience.runAbove', 'Run cells above')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.RunAbove}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={runBelow}
                            disabled={!canRunBelow || this.props.busy}
                            className="native-button"
                            tooltip={getLocString('DataScience.runBelow', 'Run cell and below')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.RunBelow}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={this.props.restartKernel}
                            disabled={this.props.busy || !canRestartAndInterruptKernel}
                            className="native-button"
                            tooltip={getLocString('DataScience.restartServer', 'Restart IPython kernel')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.Restart}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={this.props.interruptKernel}
                            disabled={this.props.busy || !canRestartAndInterruptKernel}
                            className="native-button"
                            tooltip={getLocString('DataScience.interruptKernel', 'Interrupt IPython kernel')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.Interrupt}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={addCell}
                            className="native-button"
                            tooltip={getLocString('DataScience.addNewCell', 'Insert cell')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.InsertBelow}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={this.props.clearAllOutputs}
                            disabled={!this.props.cellCount}
                            className="native-button"
                            tooltip={getLocString('DataScience.clearAllOutput', 'Clear All Output')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.ClearAllOutput}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={toggleVariableExplorer}
                            className="native-button"
                            tooltip={variableExplorerTooltip}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.VariableExplorer}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={save}
                            disabled={!this.props.dirty}
                            className="native-button"
                            tooltip={getLocString('DataScience.save', 'Save File')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.SaveAs}
                            />
                        </ImageButton>
                        <ImageButton
                            baseTheme={this.props.baseTheme}
                            onClick={this.props.export}
                            disabled={!this.props.cellCount || this.props.busy}
                            className="native-button"
                            tooltip={getLocString('DataScience.exportAsPythonFileTooltip', 'Save As Python File')}
                        >
                            <Image
                                baseTheme={this.props.baseTheme}
                                class="image-button-image"
                                image={ImageName.ExportToPython}
                            />
                        </ImageButton>
                    </div>
                    <KernelSelection
                        baseTheme={this.props.baseTheme}
                        font={this.props.font}
                        kernel={this.props.kernel}
                        selectServer={selectServer}
                        selectKernel={selectKernel}
                    />
                </div>
                <div className="toolbar-divider" />
            </div>
        );
    }
}

export const ToolbarComponent = connect(mapStateToProps, actionCreators)(Toolbar);
