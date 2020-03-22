import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../registry';
import {MinimapComponent} from './minimap.component';
import {SceneComponent} from './scene.component';
import {GraphComp} from './graph.component';
import {AppComponent} from './app.component';
import {BoardComponent} from './board.component';
import {ControlsComponent} from './controls.component';
import {NodeInfoComponent} from './node-info.component';
import {InfoComponent} from './info.component';
import {NodeListItemComponent} from './node-list-item.component';
import {LoaderComponent} from './loader.component';
import {DashboardLoaderComponent} from './dashboard-loader.component';
import {DashboardComponent} from './dashboard.component';
import {NodeSearchComponent} from './node-search.component';
import {MarkdownViewComponent} from './markdown-view.component';
import {DashboardCommonComponent} from './dashboard-common.component';
import {CardHeadingComponent} from './card-heading.component';
import {TraceViewerComponent} from './trace-viewer.component';
import {RunsSelectorComponent} from './runs-selector.component';
import {TagFiltererComponent} from './tag-filterer.component';
import {CategoryViewComponent} from './category-view.component';
import {ChartLoaderComponent} from './chart-loader.component';
import {DebuggerCardComponent} from './debugger-card.component';
import {OpCompatCardComponent} from './op-compat-card.component';
import {PluginDialogComponent} from './plugin-dialog.component';
import {QnarreComponent} from './qnarre.component';

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
