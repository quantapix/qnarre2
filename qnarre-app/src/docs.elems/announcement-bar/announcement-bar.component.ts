import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';

import {LoggerService} from '../../services/log';
import {CONTENT_URL_PREFIX} from '../../services/docs';
const announcementsPath = CONTENT_URL_PREFIX + 'announcements.json';

export interface Announcement {
  imageUrl: string;
  message: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'qnr-announcement-bar',
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
export class AnnouncementBarComponent implements OnInit {
  announcement: Announcement;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  ngOnInit() {
    this.http
      .get<Announcement[]>(announcementsPath)
      .pipe(
        catchError(error => {
          this.logger.error(
            new Error(`${announcementsPath} request failed: ${error.message}`)
          );
          return [];
        }),
        map(announcements => this.findCurrentAnnouncement(announcements)),
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

  private findCurrentAnnouncement(announcements: Announcement[]) {
    return announcements
      .filter(
        announcement => new Date(announcement.startDate).valueOf() < Date.now()
      )
      .filter(
        announcement => new Date(announcement.endDate).valueOf() > Date.now()
      )[0];
  }
}
