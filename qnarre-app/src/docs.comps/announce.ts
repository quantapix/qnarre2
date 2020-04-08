import {Component, NgModule, OnInit, Optional, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';

import {ServicesModule} from '../services/module';
import {WithElem} from '../app/elem.serv';

import {LogService} from '../app/log.serv';
import {CONTENT_URL_PREFIX} from './service';

const path = CONTENT_URL_PREFIX + 'announcements.json';

export interface Announce {
  imageUrl: string;
  message: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'qnr-announce',
  template: `
    <div class="homepage-container" *ngIf="announcement">
      <div class="announcement-bar">
        <img [src]="announcement.imageUrl" alt="" />
        <p [innerHTML]="announcement.message"></p>
        <a class="button" [href]="announcement.linkUrl">Learn More</a>
      </div>
    </div>
  `
})
export class AnnounceComp implements OnInit {
  announcement?: Announce;

  constructor(private http: HttpClient, @Optional() private log?: LogService) {}

  ngOnInit() {
    this.http
      .get<Announce[]>(path)
      .pipe(
        catchError(e => {
          this.log?.fail(new Error(`${path} request failed: ${e.message}`));
          return [];
        }),
        map(ans => this.findCurrentAnnounce(ans)),
        catchError(e => {
          this.log?.fail(new Error(`${path} has invalid: ${e.message}`));
          return [];
        })
      )
      .subscribe(a => (this.announcement = a));
  }

  private findCurrentAnnounce(ans: Announce[]) {
    return ans
      .filter(a => new Date(a.startDate).valueOf() < Date.now())
      .filter(a => new Date(a.endDate).valueOf() > Date.now())[0];
  }
}

@NgModule({
  imports: [CommonModule, ServicesModule, HttpClientModule],
  declarations: [AnnounceComp],
  entryComponents: [AnnounceComp]
})
export class AnnounceBarModule implements WithElem {
  elemComp: Type<any> = AnnounceComp;
}
