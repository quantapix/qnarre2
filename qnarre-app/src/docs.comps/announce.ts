import {Component, NgModule, OnInit, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';

import {ServicesModule} from '../services/module';
import {WithElem} from '../app/elem.serv';

import {LogService} from '../app/log.serv';
import {CONTENT_URL_PREFIX} from '../services/docs';
const announcementsPath = CONTENT_URL_PREFIX + 'announcements.json';

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
  announcement: Announce;

  constructor(private http: HttpClient, private logger: LogService) {}

  ngOnInit() {
    this.http
      .get<Announce[]>(announcementsPath)
      .pipe(
        catchError(error => {
          this.logger.error(
            new Error(`${announcementsPath} request failed: ${error.message}`)
          );
          return [];
        }),
        map(announcements => this.findCurrentAnnounce(announcements)),
        catchError(error => {
          this.logger.error(
            new Error(
              `${announcementsPath} contains invalid data: ${error.message}`
            )
          );
          return [];
        })
      )
      .subscribe(announcement => (this.announcement = announcement));
  }

  private findCurrentAnnounce(announcements: Announce[]) {
    return announcements
      .filter(
        announcement => new Date(announcement.startDate).valueOf() < Date.now()
      )
      .filter(
        announcement => new Date(announcement.endDate).valueOf() > Date.now()
      )[0];
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
