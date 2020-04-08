import {Component, NgModule, Type} from '@angular/core';
import {HostListener, OnInit} from '@angular/core';
import {CommonModule, PlatformLocation} from '@angular/common';

import {WithElem} from '../app/elem.serv';
import {Category, ResourceService} from '../services/resource';

@Component({
  selector: 'qnr-resource-list',
  templateUrl: 'resource.html'
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
