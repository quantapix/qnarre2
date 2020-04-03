import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  EmbeddedStackblitzComponent,
  LiveExampleComponent
} from './live-example.component';
import {WithElem} from '../../app/registry';

@NgModule({
  imports: [CommonModule],
  declarations: [LiveExampleComponent, EmbeddedStackblitzComponent],
  entryComponents: [LiveExampleComponent]
})
export class LiveExampleModule implements WithElem {
  elemComp: Type<any> = LiveExampleComponent;
}
