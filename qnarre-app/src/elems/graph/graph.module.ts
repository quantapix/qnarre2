import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import * as mat from '@angular/material';

import {AppComponent} from './app.comp';
import {BoardComponent} from './board.comp';
import {CardHeadingComponent} from './heading.comp';
import {CategoryViewComponent} from './cat-view.comp';
import {ChartLoaderComponent} from './chart-loader.comp';
import {ControlsComponent} from './controls.comp';
import {DashboardCommonComponent} from './dash.comp';
import {DashboardComponent} from './dashboard.comp';
import {DashboardLoaderComponent} from './dash-loader.comp';
import {DebuggerCardComponent} from './debugger-card.comp';
import {GraphComp} from './graph.comp';
import {IconComp} from './icon.comp';
import {InfoComponent} from './info.comp';
import {LoaderComponent} from './loader.comp';
import {MarkdownViewComponent} from './md-view.comp';
import {MinimapComponent} from './minimap.comp';
import {NodeIconComp} from './node-icon.comp';
import {NodeInfoComponent} from './node-info.comp';
import {NodeListItemComponent} from './node-item.comp';
import {NodeSearchComponent} from './node-search.comp';
import {CompatCardComp, CompatItemComp} from './compat-card.comp';
import {PluginDialogComponent} from './plugin-dialog.comp';
import {QnarreComponent} from './qnarre.comp';
import {RunsSelectorComponent} from './runs-selector.comp';
import {SceneComponent} from './scene.comp';
import {TagFiltererComponent} from './tag-filterer.comp';
import {TraceViewerComponent} from './trace-viewer.comp';
import {WithElem} from '../registry';

@NgModule({
  imports: [
    CommonModule,
    mat.MatAutocompleteModule,
    mat.MatButtonModule,
    mat.MatIconModule,
    mat.MatListModule,
    mat.MatCheckboxModule,
    mat.MatDatepickerModule,
    mat.MatFormFieldModule,
    mat.MatInputModule,
    mat.MatRadioModule,
    mat.MatSelectModule,
    mat.MatSliderModule,
    mat.MatSlideToggleModule
  ],
  declarations: [
    AppComponent,
    BoardComponent,
    CardHeadingComponent,
    CategoryViewComponent,
    ChartLoaderComponent,
    ControlsComponent,
    DashboardCommonComponent,
    DashboardComponent,
    DashboardLoaderComponent,
    DebuggerCardComponent,
    GraphComp,
    IconComp,
    InfoComponent,
    LoaderComponent,
    MarkdownViewComponent,
    MinimapComponent,
    NodeIconComp,
    NodeInfoComponent,
    NodeListItemComponent,
    NodeSearchComponent,
    CompatCardComp,
    CompatItemComp,
    PluginDialogComponent,
    QnarreComponent,
    //RunsSelectorComponent,
    SceneComponent,
    TagFiltererComponent,
    TraceViewerComponent
  ],
  entryComponents: [MinimapComponent],
  exports: [MinimapComponent]
})
export class GraphModule implements WithElem {
  elemComp: Type<any> = MinimapComponent;
}

// services: renderHierarchy, selectedNode
