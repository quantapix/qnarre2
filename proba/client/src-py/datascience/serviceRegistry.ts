// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { IExtensionSingleActivationService } from '../activation/types';
import { IApplicationEnvironment } from '../common/application/types';
import { UseCustomEditorApi } from '../common/constants';
import { ProtocolParser } from '../debugger/debugAdapter/Common/protocolParser';
import { IProtocolParser } from '../debugger/debugAdapter/types';
import { IServiceManager } from '../ioc/types';
import { Activation } from './activation';
import { CodeCssGenerator } from './codeCssGenerator';
import { JupyterCommandLineSelectorCommand } from './commands/commandLineSelector';
import { CommandRegistry } from './commands/commandRegistry';
import { KernelSwitcherCommand } from './commands/kernelSwitcher';
import { JupyterServerSelectorCommand } from './commands/serverSelector';
import { Identifiers } from './constants';
import { ActiveEditorContextService } from './context/activeEditorContext';
import { DataViewer } from './data-viewing/dataViewer';
import { DataViewerDependencyService } from './data-viewing/dataViewerDependencyService';
import { DataViewerProvider } from './data-viewing/dataViewerProvider';
import { DataScience } from './datascience';
import { DataScienceSurveyBannerLogger } from './dataScienceSurveyBanner';
import { DebugLocationTrackerFactory } from './debugLocationTrackerFactory';
import { CellHashProvider } from './editor-integration/cellhashprovider';
import { CodeLensFactory } from './editor-integration/codeLensFactory';
import { DataScienceCodeLensProvider } from './editor-integration/codelensprovider';
import { CodeWatcher } from './editor-integration/codewatcher';
import { Decorator } from './editor-integration/decorator';
import { DataScienceErrorHandler } from './errorHandler/errorHandler';
import { GatherListener } from './gather/gatherListener';
import { GatherLogger } from './gather/gatherLogger';
import { DebugListener } from './interactive-common/debugListener';
import { IntellisenseProvider } from './interactive-common/intellisense/intellisenseProvider';
import { LinkProvider } from './interactive-common/linkProvider';
import { NotebookProvider } from './interactive-common/notebookProvider';
import { NotebookServerProvider } from './interactive-common/notebookServerProvider';
import { ShowPlotListener } from './interactive-common/showPlotListener';
import { AutoSaveService } from './interactive-ipynb/autoSaveService';
import { NativeEditor } from './interactive-ipynb/nativeEditor';
import { NativeEditorCommandListener } from './interactive-ipynb/nativeEditorCommandListener';
import { NativeEditorOldWebView } from './interactive-ipynb/nativeEditorOldWebView';
import { NativeEditorProvider } from './interactive-ipynb/nativeEditorProvider';
import { NativeEditorProviderOld } from './interactive-ipynb/nativeEditorProviderOld';
import { NativeEditorRunByLineListener } from './interactive-ipynb/nativeEditorRunByLineListener';
import { NativeEditorStorage } from './interactive-ipynb/nativeEditorStorage';
import { NativeEditorSynchronizer } from './interactive-ipynb/nativeEditorSynchronizer';
import { InteractiveWindow } from './interactive-window/interactiveWindow';
import { InteractiveWindowCommandListener } from './interactive-window/interactiveWindowCommandListener';
import { InteractiveWindowProvider } from './interactive-window/interactiveWindowProvider';
import { IPyWidgetHandler } from './ipywidgets/ipywidgetHandler';
import { IPyWidgetMessageDispatcherFactory } from './ipywidgets/ipyWidgetMessageDispatcherFactory';
import { IPyWidgetScriptSource } from './ipywidgets/ipyWidgetScriptSource';
import { JupyterCommandLineSelector } from './jupyter/commandLineSelector';
import { DebuggerVariableRegistration } from './jupyter/debuggerVariableRegistration';
import { DebuggerVariables } from './jupyter/debuggerVariables';
import { JupyterCommandFactory } from './jupyter/interpreter/jupyterCommand';
import { JupyterInterpreterDependencyService } from './jupyter/interpreter/jupyterInterpreterDependencyService';
import { JupyterInterpreterOldCacheStateStore } from './jupyter/interpreter/jupyterInterpreterOldCacheStateStore';
import { JupyterInterpreterSelectionCommand } from './jupyter/interpreter/jupyterInterpreterSelectionCommand';
import { JupyterInterpreterSelector } from './jupyter/interpreter/jupyterInterpreterSelector';
import { JupyterInterpreterService } from './jupyter/interpreter/jupyterInterpreterService';
import { JupyterInterpreterStateStore } from './jupyter/interpreter/jupyterInterpreterStateStore';
import { JupyterInterpreterSubCommandExecutionService } from './jupyter/interpreter/jupyterInterpreterSubCommandExecutionService';
import { CellOutputMimeTypeTracker } from './jupyter/jupyterCellOutputMimeTypeTracker';
import { JupyterDebugger } from './jupyter/jupyterDebugger';
import { JupyterExecutionFactory } from './jupyter/jupyterExecutionFactory';
import { JupyterExporter } from './jupyter/jupyterExporter';
import { JupyterImporter } from './jupyter/jupyterImporter';
import { JupyterNotebookProvider } from './jupyter/jupyterNotebookProvider';
import { JupyterPasswordConnect } from './jupyter/jupyterPasswordConnect';
import { JupyterServerWrapper } from './jupyter/jupyterServerWrapper';
import { JupyterSessionManagerFactory } from './jupyter/jupyterSessionManagerFactory';
import { JupyterVariables } from './jupyter/jupyterVariables';
import { KernelDependencyService } from './jupyter/kernels/kernelDependencyService';
import { KernelSelectionProvider } from './jupyter/kernels/kernelSelections';
import { KernelSelector } from './jupyter/kernels/kernelSelector';
import { KernelService } from './jupyter/kernels/kernelService';
import { KernelSwitcher } from './jupyter/kernels/kernelSwitcher';
import { KernelVariables } from './jupyter/kernelVariables';
import { NotebookStarter } from './jupyter/notebookStarter';
import { OldJupyterVariables } from './jupyter/oldJupyterVariables';
import { ServerPreload } from './jupyter/serverPreload';
import { JupyterServerSelector } from './jupyter/serverSelector';
import { JupyterDebugService } from './jupyterDebugService';
import { KernelDaemonPool } from './kernel-launcher/kernelDaemonPool';
import { KernelDaemonPreWarmer } from './kernel-launcher/kernelDaemonPreWarmer';
import { KernelFinder } from './kernel-launcher/kernelFinder';
import { KernelLauncher } from './kernel-launcher/kernelLauncher';
import { IKernelFinder, IKernelLauncher } from './kernel-launcher/types';
import { MultiplexingDebugService } from './multiplexingDebugService';
import { NotebookAndInteractiveWindowUsageTracker } from './notebookAndInteractiveTracker';
import { PlotViewer } from './plotting/plotViewer';
import { PlotViewerProvider } from './plotting/plotViewerProvider';
import { PreWarmActivatedJupyterEnvironmentVariables } from './preWarmVariables';
import { ProgressReporter } from './progress/progressReporter';
import { RawNotebookProviderWrapper } from './raw-kernel/rawNotebookProviderWrapper';
import { StatusProvider } from './statusProvider';
import { ThemeFinder } from './themeFinder';
import {
    ICellHashListener,
    ICellHashProvider,
    ICodeCssGenerator,
    ICodeLensFactory,
    ICodeWatcher,
    IDataScience,
    IDataScienceCodeLensProvider,
    IDataScienceCommandListener,
    IDataScienceErrorHandler,
    IDataViewer,
    IDataViewerProvider,
    IDebugLocationTracker,
    IGatherLogger,
    IGatherProvider,
    IInteractiveWindow,
    IInteractiveWindowListener,
    IInteractiveWindowProvider,
    IJupyterCommandFactory,
    IJupyterDebugger,
    IJupyterDebugService,
    IJupyterExecution,
    IJupyterInterpreterDependencyManager,
    IJupyterNotebookProvider,
    IJupyterPasswordConnect,
    IJupyterServerProvider,
    IJupyterSessionManagerFactory,
    IJupyterSubCommandExecutionService,
    IJupyterVariables,
    IKernelDependencyService,
    INotebookAndInteractiveWindowUsageTracker,
    INotebookEditor,
    INotebookEditorProvider,
    INotebookExecutionLogger,
    INotebookExporter,
    INotebookImporter,
    INotebookProvider,
    INotebookServer,
    INotebookStorage,
    IPlotViewer,
    IPlotViewerProvider,
    IRawNotebookProvider,
    IStatusProvider,
    IThemeFinder
} from './types';

// README: Did you make sure "dataScienceIocContainer.ts" has also been updated appropriately?

// tslint:disable-next-line: max-func-body-length
export function registerTypes(serviceManager: IServiceManager) {
    const useCustomEditorApi = serviceManager.get<IApplicationEnvironment>(IApplicationEnvironment).packageJson.enableProposedApi;
    serviceManager.addSingletonInstance<boolean>(UseCustomEditorApi, useCustomEditorApi);

    serviceManager.add<ICellHashProvider>(ICellHashProvider, CellHashProvider, undefined, [INotebookExecutionLogger]);
    serviceManager.add<ICodeWatcher>(ICodeWatcher, CodeWatcher);
    serviceManager.addSingleton<IDataScienceErrorHandler>(IDataScienceErrorHandler, DataScienceErrorHandler);
    serviceManager.add<IDataViewer>(IDataViewer, DataViewer);
    serviceManager.add<IInteractiveWindow>(IInteractiveWindow, InteractiveWindow);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, AutoSaveService);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, DebugListener);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, GatherListener);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, IntellisenseProvider);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, LinkProvider);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, ShowPlotListener);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, IPyWidgetHandler);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, IPyWidgetScriptSource);
    serviceManager.add<IInteractiveWindowListener>(IInteractiveWindowListener, NativeEditorRunByLineListener);
    serviceManager.add<IJupyterCommandFactory>(IJupyterCommandFactory, JupyterCommandFactory);
    serviceManager.add<INotebookEditor>(INotebookEditor, useCustomEditorApi ? NativeEditor : NativeEditorOldWebView);
    serviceManager.add<INotebookExporter>(INotebookExporter, JupyterExporter);
    serviceManager.add<INotebookImporter>(INotebookImporter, JupyterImporter);
    serviceManager.add<INotebookServer>(INotebookServer, JupyterServerWrapper);
    serviceManager.add<INotebookStorage>(INotebookStorage, NativeEditorStorage);
    serviceManager.addSingleton<IRawNotebookProvider>(IRawNotebookProvider, RawNotebookProviderWrapper);
    serviceManager.addSingleton<IJupyterNotebookProvider>(IJupyterNotebookProvider, JupyterNotebookProvider);
    serviceManager.add<IPlotViewer>(IPlotViewer, PlotViewer);
    serviceManager.addSingleton<IKernelLauncher>(IKernelLauncher, KernelLauncher);
    serviceManager.addSingleton<IKernelFinder>(IKernelFinder, KernelFinder);
    serviceManager.addSingleton<ActiveEditorContextService>(ActiveEditorContextService, ActiveEditorContextService);
    serviceManager.addSingleton<CellOutputMimeTypeTracker>(CellOutputMimeTypeTracker, CellOutputMimeTypeTracker, undefined, [IExtensionSingleActivationService, INotebookExecutionLogger]);
    serviceManager.addSingleton<CommandRegistry>(CommandRegistry, CommandRegistry);
    serviceManager.addSingleton<DataViewerDependencyService>(DataViewerDependencyService, DataViewerDependencyService);
    serviceManager.addSingleton<ICodeCssGenerator>(ICodeCssGenerator, CodeCssGenerator);
    serviceManager.addSingleton<ICodeLensFactory>(ICodeLensFactory, CodeLensFactory, undefined, [IInteractiveWindowListener]);
    serviceManager.addSingleton<IDataScience>(IDataScience, DataScience);
    serviceManager.addSingleton<IDataScienceCodeLensProvider>(IDataScienceCodeLensProvider, DataScienceCodeLensProvider);
    serviceManager.addSingleton<IDataScienceCommandListener>(IDataScienceCommandListener, InteractiveWindowCommandListener);
    serviceManager.addSingleton<IDataScienceCommandListener>(IDataScienceCommandListener, NativeEditorCommandListener);
    serviceManager.addSingleton<IDataViewerProvider>(IDataViewerProvider, DataViewerProvider);
    serviceManager.addSingleton<IDebugLocationTracker>(IDebugLocationTracker, DebugLocationTrackerFactory);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, Activation);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, Decorator);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, JupyterInterpreterSelectionCommand);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, PreWarmActivatedJupyterEnvironmentVariables);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, ServerPreload);
    serviceManager.addSingleton<IInteractiveWindowListener>(IInteractiveWindowListener, DataScienceSurveyBannerLogger);
    serviceManager.addSingleton<IInteractiveWindowProvider>(IInteractiveWindowProvider, InteractiveWindowProvider);
    serviceManager.addSingleton<IJupyterDebugger>(IJupyterDebugger, JupyterDebugger, undefined, [ICellHashListener]);
    serviceManager.addSingleton<IJupyterExecution>(IJupyterExecution, JupyterExecutionFactory);
    serviceManager.addSingleton<IJupyterPasswordConnect>(IJupyterPasswordConnect, JupyterPasswordConnect);
    serviceManager.addSingleton<IJupyterSessionManagerFactory>(IJupyterSessionManagerFactory, JupyterSessionManagerFactory);
    serviceManager.addSingleton<IExtensionSingleActivationService>(IExtensionSingleActivationService, DebuggerVariableRegistration);
    serviceManager.addSingleton<IJupyterVariables>(IJupyterVariables, JupyterVariables, Identifiers.ALL_VARIABLES);
    serviceManager.addSingleton<IJupyterVariables>(IJupyterVariables, OldJupyterVariables, Identifiers.OLD_VARIABLES);
    serviceManager.addSingleton<IJupyterVariables>(IJupyterVariables, KernelVariables, Identifiers.KERNEL_VARIABLES);
    serviceManager.addSingleton<IJupyterVariables>(IJupyterVariables, DebuggerVariables, Identifiers.DEBUGGER_VARIABLES);
    serviceManager.addSingleton<INotebookEditorProvider>(INotebookEditorProvider, useCustomEditorApi ? NativeEditorProvider : NativeEditorProviderOld);
    serviceManager.addSingleton<IPlotViewerProvider>(IPlotViewerProvider, PlotViewerProvider);
    serviceManager.addSingleton<IStatusProvider>(IStatusProvider, StatusProvider);
    serviceManager.addSingleton<IThemeFinder>(IThemeFinder, ThemeFinder);
    serviceManager.addSingleton<JupyterCommandLineSelector>(JupyterCommandLineSelector, JupyterCommandLineSelector);
    serviceManager.addSingleton<JupyterCommandLineSelectorCommand>(JupyterCommandLineSelectorCommand, JupyterCommandLineSelectorCommand);
    serviceManager.addSingleton<JupyterInterpreterDependencyService>(JupyterInterpreterDependencyService, JupyterInterpreterDependencyService);
    serviceManager.addSingleton<JupyterInterpreterOldCacheStateStore>(JupyterInterpreterOldCacheStateStore, JupyterInterpreterOldCacheStateStore);
    serviceManager.addSingleton<JupyterInterpreterSelector>(JupyterInterpreterSelector, JupyterInterpreterSelector);
    serviceManager.addSingleton<JupyterInterpreterService>(JupyterInterpreterService, JupyterInterpreterService);
    serviceManager.addSingleton<JupyterInterpreterStateStore>(JupyterInterpreterStateStore, JupyterInterpreterStateStore);
    serviceManager.addSingleton<JupyterServerSelector>(JupyterServerSelector, JupyterServerSelector);
    serviceManager.addSingleton<JupyterServerSelectorCommand>(JupyterServerSelectorCommand, JupyterServerSelectorCommand);
    serviceManager.addSingleton<KernelSelectionProvider>(KernelSelectionProvider, KernelSelectionProvider);
    serviceManager.addSingleton<KernelSelector>(KernelSelector, KernelSelector);
    serviceManager.addSingleton<KernelService>(KernelService, KernelService);
    serviceManager.addSingleton<KernelSwitcher>(KernelSwitcher, KernelSwitcher);
    serviceManager.addSingleton<KernelSwitcherCommand>(KernelSwitcherCommand, KernelSwitcherCommand);
    serviceManager.addSingleton<NotebookStarter>(NotebookStarter, NotebookStarter);
    serviceManager.addSingleton<ProgressReporter>(ProgressReporter, ProgressReporter);
    serviceManager.addSingleton<NativeEditorSynchronizer>(NativeEditorSynchronizer, NativeEditorSynchronizer);
    serviceManager.addSingleton<INotebookProvider>(INotebookProvider, NotebookProvider);
    serviceManager.addSingleton<IJupyterServerProvider>(IJupyterServerProvider, NotebookServerProvider);
    serviceManager.addSingleton<IPyWidgetMessageDispatcherFactory>(IPyWidgetMessageDispatcherFactory, IPyWidgetMessageDispatcherFactory);
    serviceManager.addSingleton<IJupyterInterpreterDependencyManager>(IJupyterInterpreterDependencyManager, JupyterInterpreterSubCommandExecutionService);
    serviceManager.addSingleton<IJupyterSubCommandExecutionService>(IJupyterSubCommandExecutionService, JupyterInterpreterSubCommandExecutionService);
    serviceManager.addSingleton<KernelDaemonPool>(KernelDaemonPool, KernelDaemonPool);
    serviceManager.addSingleton<IKernelDependencyService>(IKernelDependencyService, KernelDependencyService);
    serviceManager.addSingleton<INotebookAndInteractiveWindowUsageTracker>(INotebookAndInteractiveWindowUsageTracker, NotebookAndInteractiveWindowUsageTracker);
    serviceManager.addSingleton<KernelDaemonPreWarmer>(KernelDaemonPreWarmer, KernelDaemonPreWarmer);
    serviceManager.add<IProtocolParser>(IProtocolParser, ProtocolParser);
    serviceManager.addSingleton<IJupyterDebugService>(IJupyterDebugService, MultiplexingDebugService, Identifiers.MULTIPLEXING_DEBUGSERVICE);
    serviceManager.addSingleton<IJupyterDebugService>(IJupyterDebugService, JupyterDebugService, Identifiers.RUN_BY_LINE_DEBUGSERVICE);

    registerGatherTypes(serviceManager);
}

export function registerGatherTypes(serviceManager: IServiceManager) {
    // tslint:disable-next-line: no-require-imports
    const gather = require('./gather/gather');

    serviceManager.add<IGatherProvider>(IGatherProvider, gather.GatherProvider);
    serviceManager.add<IGatherLogger>(IGatherLogger, GatherLogger, undefined, [INotebookExecutionLogger]);
}
