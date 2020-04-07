import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {ROUTES} from '@angular/router';

import {Deployment} from './deploy';
import {ElemService} from './elem';
import {GaService} from './ga';
import {LocService} from './loc';
import {LogService} from './log';
import {NavService} from './nav';
import {ScrollService} from './scroll';
import {ScrollSpyService} from './scroll-spy';
import {SourceService} from './source';
import {TocService} from './toc';
import {UpdatesService} from './updates';

import {LOAD_CBS, CBS_TOKEN, CBS_ROUTES} from './elem';

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
    UpdatesService,
    ElemService,
    {
      provide: CBS_TOKEN,
      useValue: LOAD_CBS
    },
    {
      provide: ROUTES,
      useValue: CBS_ROUTES,
      multi: true
    }
  ]
})
export class ServicesModule {}
