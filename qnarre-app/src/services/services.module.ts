import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';

import {Deployment} from './deployment.service';
import {GaService} from './ga.service';
import {LoggerService} from './logger.service';
import {LocationService} from './location.service';
import {NavService} from './nav.service';
import {DocsService} from './docs.service';
import {UpdatesService} from './updates.service';
import {ScrollService} from './scroll.service';
import {ScrollSpyService} from './scroll-spy.service';
import {TocService} from './toc.service';
import {SourceService} from './source.service';

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
