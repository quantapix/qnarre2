import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';

import {ServicesModule} from '../../services/services.module';
import {AnnouncementBarComponent} from './announcement-bar.component';
import {WithElem} from '../registry';

@NgModule({
  imports: [CommonModule, ServicesModule, HttpClientModule],
  declarations: [AnnouncementBarComponent],
  entryComponents: [AnnouncementBarComponent]
})
export class AnnouncementBarModule implements WithElem {
  elemComp: Type<any> = AnnouncementBarComponent;
}
