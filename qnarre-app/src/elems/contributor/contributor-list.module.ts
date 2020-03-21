import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {ContributorListComponent} from './contributor-list.component';
import {ContributorService} from './contributor.service';
import {ContributorComponent} from './contributor.component';
import {WithElement} from '../../elements/registry';

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [ContributorListComponent, ContributorComponent],
  entryComponents: [ContributorListComponent],
  providers: [ContributorService]
})
export class ContributorListModule implements WithElement {
  customElementComponent: Type<any> = ContributorListComponent;
}
