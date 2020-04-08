import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';

import {ScrollService} from './scroll';
import {ScrollSpyService} from './scroll-spy';
import {SourceService} from './source';
import {TocService} from '../app/toc.serv';

@NgModule({
  imports: [CommonModule, HttpClientModule],
  providers: [TocService, ScrollSpyService, ScrollService, SourceService]
})
export class ServicesModule {}
