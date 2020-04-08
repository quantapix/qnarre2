import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AppComp} from './component';
import {BoardComp} from '../graph.comps/board';
import {CardHeadingComp} from '../graph.comps/heading';
import {ControlsComp} from '../graph.comps/controls';
import {DashboardCommonComponent} from '../graph.comps/dash.comp';
import {DashboardComp} from '../graph.comps/dashboard';
import {DashLoaderComp} from '../graph.comps/dash-loader';
import {DebugCardComp} from '../graph.comps/debug-card';
import {GraphComp} from '../graph.comps/graph';
import {IconComp} from '../graph.comps/icon';
import {InfoComp} from '../graph.comps/info';
import {MinimapComp} from '../graph.comps/minimap';
import {NodeIconComp} from '../graph.comps/node-icon';
import {NodeInfoComp} from '../graph.comps/node-info';
import {NodeItemComp} from '../graph.comps/node-item';
import {NodeSearchComp} from '../graph.comps/node-search';
import {CompatCardComp} from '../graph.comps/compat-card';
import {CompatItemComp} from '../graph.comps/compat-item';
import {QnarreComp} from '../graph.comps/qnarre';
import {SceneComp} from '../graph.comps/scene';
import {WithElem} from '../elems/registry';

@NgModule({
  imports: [CommonModule],
  declarations: [
    AppComp,
    BoardComp,
    CardHeadingComp,
    ControlsComp,
    DashboardCommonComponent,
    DashboardComp,
    DashLoaderComp,
    DebugCardComp,
    GraphComp,
    IconComp,
    InfoComp,
    MinimapComp,
    NodeIconComp,
    NodeInfoComp,
    NodeItemComp,
    NodeSearchComp,
    CompatCardComp,
    CompatItemComp,
    QnarreComp,
    //RunsSelectorComponent,
    SceneComp
  ],
  entryComponents: [MinimapComp],
  exports: [MinimapComp]
})
export class GraphModule implements WithElem {
  elemComp: Type<any> = MinimapComp;
}

// services: renderHierarchy, selectedNode
