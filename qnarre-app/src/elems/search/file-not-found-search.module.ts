import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElement} from '../../elements/registry';
import {ServicesModule} from '../../services/services.module';
import {FileNotFoundSearchComponent} from './file-not-found-search.component';

@NgModule({
  imports: [CommonModule, ServicesModule],
  declarations: [FileNotFoundSearchComponent],
  entryComponents: [FileNotFoundSearchComponent]
})
export class FileNotFoundSearchModule implements WithElement {
  customElementComponent: Type<any> = FileNotFoundSearchComponent;
}
