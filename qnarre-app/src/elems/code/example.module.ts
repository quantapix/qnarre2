import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElement} from '../registry';
import {CodeModule} from './code.module';
import {ExampleComponent} from './example.component';

@NgModule({
  imports: [CommonModule, CodeModule],
  declarations: [ExampleComponent],
  entryComponents: [ExampleComponent],
  exports: [ExampleComponent]
})
export class ExampleModule implements WithElement {
  customElementComponent: Type<any> = ExampleComponent;
}
