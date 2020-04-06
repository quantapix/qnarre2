import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';

import {Deployment} from './deployment';
import {GaService} from './ga';
import {LocService} from './loc';
import {LogService} from './log';
import {NavService} from './nav';
import {ScrollService} from './scroll';
import {ScrollSpyService} from './scroll-spy';
import {SourceService} from './source';
import {TocService} from './toc';
import {UpdatesService} from './updates';

@NgModule({
  imports: [CommonModule, HttpClientModule],
  providers: [
    Deployment,
    GaService,
    LocService,
    LogService,
    NavService,
    ScrollService,
    ScrollSpyService,
    SourceService,
    TocService,
    UpdatesService
  ]
})
export class ServicesModule {}
