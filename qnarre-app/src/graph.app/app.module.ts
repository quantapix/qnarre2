import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AppComp} from './app.comp';
import {BoardComp} from '../graph.comps/board.comp';
import {CardHeadingComp} from '../graph.comps/heading.comp';
import {CatViewComp} from '../graph.comps/cat-view.comp';
import {ChartLoaderComp} from '../graph.comps/chart-loader.comp';
import {ControlsComp} from '../graph.comps/controls.comp';
import {DashboardCommonComponent} from '../graph.comps/dash.comp';
import {DashboardComp} from '../graph.comps/dashboard.comp';
import {DashLoaderComp} from '../graph.comps/dash-loader.comp';
import {DebuggerCardComponent} from '../graph.comps/debugger-card.comp';
import {GraphComp} from '../graph.comps/graph.comp';
import {IconComp} from '../graph.comps/icon.comp';
import {InfoComp} from '../graph.comps/info.comp';
import {LoaderComp} from '../graph.comps/loader.comp';
import {MarkdownViewComp} from '../graph.comps/md-view.comp';
import {MinimapComp} from '../graph.comps/minimap.comp';
import {NodeIconComp} from '../graph.comps/node-icon.comp';
import {NodeInfoComp} from '../graph.comps/node-info.comp';
import {NodeListItemComp} from '../graph.comps/node-item.comp';
import {NodeSearchComp} from '../graph.comps/node-search.comp';
import {CompatCardComp, CompatItemComp} from '../graph.comps/compat-item.comp';
import {PluginDialogComp} from '../graph.comps/plugin-dialog.comp';
import {QnarreComp} from '../graph.comps/qnarre.comp';
import {RunsSelectorComponent} from '../graph.comps/runs-selector.comp';
import {SceneComp} from '../graph.comps/scene.comp';
import {TagFiltererComp} from '../graph.comps/tag-filterer.comp';
import {TraceViewerComp} from '../graph.comps/trace-viewer.comp';
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
    DebuggerCardComponent,
    GraphComp,
    IconComp,
    InfoComp,
    LoaderComp,
    MarkdownViewComp,
    MinimapComp,
    NodeIconComp,
    NodeInfoComp,
    NodeListItemComp,
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
