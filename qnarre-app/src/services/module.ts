import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';

import {Deployment} from './deployment';
import {GaService} from './ga';
import {LoggerService} from './logger';
import {LocationService} from './location';
import {NavService} from './nav';
import {DocsService} from './docs';
import {UpdatesService} from './updates';
import {ScrollService} from './scroll';
import {ScrollSpyService} from './scroll-spy';
import {TocService} from './toc';
import {SourceService} from './source';

@NgModule({
  imports: [CommonModule, HttpClientModule],
  providers: [
    Deployment,
    DocsService,
    GaService,
    LocationService,
    LoggerService,
    NavService,
    ScrollService,
    ScrollSpyService,
    SourceService,
    UpdatesService,
    TocService
  ]
})
export class ServicesModule {}
