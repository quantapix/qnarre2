import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  EmbeddedStackblitzComponent,
  LiveExampleComponent
} from './live-example.component';
import {WithElement} from '../../elements/registry';

@NgModule({
  imports: [CommonModule],
  declarations: [LiveExampleComponent, EmbeddedStackblitzComponent],
  entryComponents: [LiveExampleComponent]
})
export class LiveExampleModule implements WithElement {
  customElementComponent: Type<any> = LiveExampleComponent;
}
