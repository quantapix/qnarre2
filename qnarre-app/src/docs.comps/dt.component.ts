import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {Contents} from './service';

@Component({
  selector: 'qnr-dt',
  template: `
    <div>
      <hr />
      <textarea #dt [value]="text" rows="10" cols="80"></textarea>
      <br />
      <button (click)="dtextSet()">Show change</button>
    </div>
  `
})
export class DtComponent {
  @Input() doc: Contents;
  @Output() docChange = new EventEmitter<Contents>();

  @ViewChild('dt', {read: ElementRef, static: true})
  dt: ElementRef;

  get text() {
    return this.doc && this.doc.contents;
  }

  dtextSet() {
    this.doc.contents = this.dt.nativeElement.value;
    this.docChange.emit({...this.doc});
  }
}
