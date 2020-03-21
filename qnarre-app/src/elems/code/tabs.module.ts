import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatTabsModule} from '@angular/material/tabs';

import {WithElement} from '../registry';
import {CodeModule} from './code.module';
import {TabsComponent} from './tabs.component';

@NgModule({
  imports: [CommonModule, MatCardModule, MatTabsModule, CodeModule],
  declarations: [TabsComponent],
  entryComponents: [TabsComponent],
  exports: [TabsComponent]
})
export class TabsModule implements WithElement {
  customElementComponent: Type<any> = TabsComponent;
}
