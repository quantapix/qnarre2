import {Component, NgModule, Type} from '@angular/core';
import {HostListener, OnInit} from '@angular/core';
import {CommonModule, PlatformLocation} from '@angular/common';

import {WithElem} from '../app/elem.serv';
import {Category, ResourceService} from './resource.serv';

@Component({
  selector: 'qnr-resource-list',
  template: `
    <div class="resources-container">
      <div class="l-flex--column">
        <div class="showcase" *ngFor="let category of categories">
          <header class="c-resource-header">
            <a class="h-anchor-offset" id="{{ category.id }}"></a>
            <h2>{{ category.title }}</h2>
          </header>
          <div class="shadow-1">
            <div *ngFor="let subCategory of category.subCategories">
              <a class="h-anchor-offset" id="{{ subCategory.id }}"></a>
              <h3 class="subcategory-title">{{ subCategory.title }}</h3>
              <div *ngFor="let resource of subCategory.resources">
                <div class="c-resource" *ngIf="resource.rev">
                  <a
                    class="l-flex--column resource-row-link"
                    target="_blank"
                    [href]="resource.url"
                  >
                    <div>
                      <h4>{{ resource.title }}</h4>
                      <p class="resource-description">
                        {{ resource.desc || 'No Description' }}
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResourceListComp implements OnInit {
  categories = [] as Category[];
  location: string;
  scrollPos = 0;

  constructor(
    location: PlatformLocation,
    private resourceService: ResourceService
  ) {
    this.location = location.pathname.replace(/^\/+/, '');
  }

  href(cat: {id: string}) {
    return this.location + '#' + cat.id;
  }

  ngOnInit() {
    this.resourceService.categories.subscribe(cats => (this.categories = cats));
  }

  @HostListener('window:scroll', ['$event.target'])
  onScroll(target: any) {
    this.scrollPos = target
      ? target.scrollTop || target.body.scrollTop || 0
      : 0;
  }
}

@NgModule({
  imports: [CommonModule],
  declarations: [ResourceListComp],
  entryComponents: [ResourceListComp],
  providers: [ResourceService]
})
export class ResourceListModule implements WithElem {
  elemComp: Type<any> = ResourceListComp;
}
