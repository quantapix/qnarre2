import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../../elems/registry';
import {CodeModule} from './code.module';
import {ExampleComponent} from './example.component';

@NgModule({
  imports: [CommonModule, CodeModule],
  declarations: [ExampleComponent],
  entryComponents: [ExampleComponent],
  exports: [ExampleComponent]
})
export class ExampleModule implements WithElem {
  elemComp: Type<any> = ExampleComponent;
}
