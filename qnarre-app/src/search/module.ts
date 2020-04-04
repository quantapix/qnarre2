import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {BoxComp} from './box';
import {ResultsComp} from './results';
import {SearchService} from './service';
import {SelectComp} from './select';

@NgModule({
  imports: [CommonModule],
  exports: [ResultsComp, SelectComp],
  declarations: [ResultsComp, SelectComp, BoxComp],
  providers: [SearchService]
})
export class SearchModule {}
