import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AppComp} from './comp';
import {BoardComp} from '../graph.comps/board';
import {CardHeadingComp} from '../graph.comps/heading';
import {CatViewComp} from '../search/cat-view';
import {ChartLoaderComp} from '../chart.comps/chart-loader';
import {ControlsComp} from '../graph.comps/controls';
import {DashboardCommonComponent} from '../graph.comps/dash.comp';
import {DashboardComp} from '../graph.comps/dashboard';
import {DashLoaderComp} from '../graph.comps/dash-loader';
import {DebugCardComp} from '../graph.comps/debug-card';
import {GraphComp} from '../graph.comps/graph';
import {IconComp} from '../graph.comps/icon';
import {InfoComp} from '../graph.comps/info';
import {LoaderComp} from '../graph.comps/loader';
import {MarkdownViewComp} from '../docs.comps/md-view';
import {MinimapComp} from '../graph.comps/minimap';
import {NodeIconComp} from '../graph.comps/node-icon';
import {NodeInfoComp} from '../graph.comps/node-info';
import {NodeItemComp} from '../graph.comps/node-item';
import {NodeSearchComp} from '../graph.comps/node-search';
import {CompatCardComp} from '../graph.comps/compat-card';
import {CompatItemComp} from '../graph.comps/compat-item';
import {PluginDialogComp} from '../plugins/plugin-dialog';
import {QnarreComp} from '../graph.comps/qnarre';
import {RunsSelectorComponent} from '../graph.comps/runs-selector';
import {SceneComp} from '../graph.comps/scene';
import {TagFiltererComp} from '../graph.comps/tag-filterer.comp';
import {TraceViewerComp} from '../graph.comps/trace-viewer';
import {WithElem} from '../app/registry';

@NgModule({
  imports: [CommonModule],
  declarations: [
    AppComp,
    BoardComp,
    CardHeadingComp,
    CatViewComp,
    ChartLoaderComp,
    ControlsComp,
    DashboardCommonComponent,
    DashboardComp,
    DashLoaderComp,
    DebugCardComp,
    GraphComp,
    IconComp,
    InfoComp,
    LoaderComp,
    MarkdownViewComp,
    MinimapComp,
    NodeIconComp,
    NodeInfoComp,
    NodeItemComp,
    NodeSearchComp,
    CompatCardComp,
    CompatItemComp,
    PluginDialogComp,
    QnarreComp,
    //RunsSelectorComponent,
    SceneComp,
    TagFiltererComp,
    TraceViewerComp
  ],
  entryComponents: [MinimapComp],
  exports: [MinimapComp]
})
export class GraphModule implements WithElem {
  elemComp: Type<any> = MinimapComp;
}

// services: renderHierarchy, selectedNode
