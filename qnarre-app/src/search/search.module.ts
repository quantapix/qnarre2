import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {BoxComponent} from './box.component';
import {ResultsComponent} from './results.component';
import {SearchService} from './search.service';
import {SelectComponent} from './select.component';

@NgModule({
  imports: [CommonModule],
  exports: [ResultsComponent, SelectComponent],
  declarations: [ResultsComponent, SelectComponent, BoxComponent],
  providers: [SearchService]
})
export class SearchModule {}
