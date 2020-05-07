import {Component, NgModule, Input, OnInit, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

import {Contrib, ContribGroup, ContribService} from './contrib.serv';
import {WithElem} from '../app/elem.serv';
import {LocService} from '../app/loc.serv';

import {CONTENT_URL_PREFIX} from '../app/data.serv';

@Component({
  selector: `qnr-contributor-list`,
  template: `
    <div class="flex-center group-buttons">
      <a
        *ngFor="let name of groupNames"
        [class.selected]="name == selectedGroup.name"
        class="button mat-button filter-button"
        (click)="selectGroup(name)"
        (keyup.enter)="selectGroup(name)"
        >{{ name }}</a
      >
    </div>
    <section *ngIf="selectedGroup" class="grid-fluid">
      <div class="contributor-group">
        <qnr-contributor
          *ngFor="let person of selectedGroup.contributors"
          [person]="person"
        ></qnr-contributor>
      </div>
    </section>
  `
})
export class ContribListComp implements OnInit {
  private groups: ContribGroup[];
  groupNames: string[];
  selectedGroup: ContribGroup;

  constructor(
    private contributorService: ContribService,
    private locationService: LocService
  ) {}

  ngOnInit() {
    const groupName = this.locationService.search()['group'] || '';
    // no need to unsubscribe because `contributors` completes
    this.contributorService.contributors.subscribe(grps => {
      this.groups = grps;
      this.groupNames = grps.map(g => g.name);
      this.selectGroup(groupName);
    });
  }

  selectGroup(name: string) {
    name = name.toLowerCase();
    this.selectedGroup =
      this.groups.find(g => g.name.toLowerCase() === name) || this.groups[0];
    this.locationService.setSearch('', {group: this.selectedGroup.name});
  }
}

@Component({
  selector: 'qnr-contributor',
  template: `
    <div [ngClass]="{flipped: person.isFlipped}" class="contributor-card">
      <div
        class="card-front"
        (click)="flipCard(person)"
        (keyup.enter)="flipCard(person)"
      >
        <h3>{{ person.name }}</h3>

        <div
          class="contributor-image"
          [style.background-image]="
            'url(' + pictureBase + (person.picture || noPicture) + ')'
          "
        >
          <div class="contributor-info">
            <a *ngIf="person.bio" mat-button class="info-item">
              View Bio
            </a>
            <a
              *ngIf="person.twitter"
              mat-icon-button
              class="info-item icon"
              href="https://twitter.com/{{ person.twitter }}"
              target="_blank"
              (click)="$event.stopPropagation()"
            >
              <mat-icon svgIcon="logos:twitter"></mat-icon>
            </a>
            <a
              *ngIf="person.website"
              mat-icon-button
              class="info-item icon"
              href="{{ person.website }}"
              target="_blank"
              (click)="$event.stopPropagation()"
            >
              <mat-icon class="link-icon">link</mat-icon>
            </a>
          </div>
        </div>
      </div>

      <div
        class="card-back"
        *ngIf="person.isFlipped"
        (click)="flipCard(person)"
        (keyup.enter)="flipCard(person)"
      >
        <h3>{{ person.name }}</h3>
        <p class="contributor-bio">{{ person.bio }}</p>
      </div>
    </div>
  `
})
export class ContribComp {
  @Input() person: Contrib;
  noPicture = '_no-one.png';
  pictureBase = CONTENT_URL_PREFIX + 'images/bios/';

  flipCard(person: Contrib) {
    person.isFlipped = !person.isFlipped;
  }
}

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [ContribListComp, ContribComp],
  entryComponents: [ContribListComp],
  providers: [ContribService]
})
export class ContribListModule implements WithElem {
  elemComp: Type<any> = ContribListComp;
}
