import {Component, Input} from '@angular/core';
import {Ldata} from './model';

@Component({
  selector: '[linkVisual]',
  template: `
    <svg:line
      class="link"
      [attr.x1]="link.ns[0].x"
      [attr.y1]="link.ns[0].y"
      [attr.x2]="link.ns[1].x"
      [attr.y2]="link.ns[1].y"
    ></svg:line>
  `,
  styleUrls: ['./link.comp.scss']
})
export class LinkComp {
  @Input('linkVisual') link = {} as Ldata;
}
