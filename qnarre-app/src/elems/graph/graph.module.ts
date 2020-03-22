import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../registry';
import {MinimapComponent} from './minimap.comp';
import {SceneComponent} from './scene.comp';
import {GraphComp} from './graph.comp';
import {AppComponent} from './app.comp';
import {BoardComponent} from './board.comp';
import {ControlsComponent} from './controls.comp';
import {NodeInfoComponent} from './node-info.comp';
import {InfoComponent} from './info.comp';
import {NodeListItemComponent} from './node-item.comp';
import {LoaderComponent} from './loader.comp';
import {DashboardLoaderComponent} from './dash-loader.comp';
import {DashboardComponent} from './dashboard.comp';
import {NodeSearchComponent} from './node-search.comp';
import {MarkdownViewComponent} from './md-view.comp';
import {DashboardCommonComponent} from './dash-common.comp';
import {CardHeadingComponent} from './card-heading.comp';
import {TraceViewerComponent} from './trace-viewer.comp';
import {RunsSelectorComponent} from './runs-selector.comp';
import {TagFiltererComponent} from './tag-filterer.comp';
import {CategoryViewComponent} from './cat-view.comp';
import {ChartLoaderComponent} from './chart-loader.comp';
import {DebuggerCardComponent} from './debugger-card.comp';
import {OpCompatCardComponent} from './op-compat-card.comp';
import {PluginDialogComponent} from './plugin-dialog.comp';
import {QnarreComponent} from './qnarre.comp';

@NgModule({
  imports: [CommonModule],
  declarations: [
    MinimapComponent,
    SceneComponent,
    GraphComp,
    AppComponent,
    BoardComponent,
    ControlsComponent,
    NodeInfoComponent,
    InfoComponent,
    NodeListItemComponent,
    LoaderComponent,
    DashboardLoaderComponent,
    DashboardComponent,
    NodeSearchComponent,
    MarkdownViewComponent,
    DashboardCommonComponent,
    CardHeadingComponent,
    TraceViewerComponent,
    RunsSelectorComponent,
    TagFiltererComponent,
    CategoryViewComponent,
    ChartLoaderComponent,
    DebuggerCardComponent,
    OpCompatCardComponent,
    PluginDialogComponent,
    QnarreComponent
  ],
  entryComponents: [MinimapComponent],
  exports: [MinimapComponent]
})
export class GraphModule implements WithElem {
  elemComp: Type<any> = MinimapComponent;
}

// services: renderHierarchy, selectedNode
