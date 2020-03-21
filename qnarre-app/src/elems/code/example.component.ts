import {
  Component,
  HostBinding,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit
} from '@angular/core';

import {CodeComponent} from './code.component';

@Component({
  selector: 'qnr-code-example',
  template: `
    <div #content style="display: none"><ng-content></ng-content></div>
    <header *ngIf="header">{{ header }}</header>
    <qnr-code
      [ngClass]="classes"
      [language]="language"
      [linenums]="linenums"
      [path]="path"
      [region]="region"
      [hideCopy]="hidecopy"
      [header]="header"
    >
    </qnr-code>
  `
})
export class ExampleComponent implements AfterViewInit {
  classes: {};

  @Input() language: string;
  @Input() linenums: string;
  @Input() region: string;

  @Input()
  set header(header: string) {
    this._header = header;
    this.classes = {'headed-code': !!this.header, 'simple-code': !this.header};
  }
  get header(): string {
    return this._header;
  }
  private _header: string;

  @Input()
  set path(path: string) {
    this._path = path;
    this.isAvoid = this.path.includes('.avoid.');
  }
  get path(): string {
    return this._path;
  }
  private _path = '';

  @Input()
  set hidecopy(hidecopy: boolean) {
    this._hidecopy = hidecopy != null && `${hidecopy}` !== 'false';
  }
  get hidecopy(): boolean {
    return this._hidecopy;
  }
  private _hidecopy: boolean;

  @Input('hide-copy')
  set hyphenatedHide(hidecopy: boolean) {
    this.hidecopy = hidecopy;
  }

  @Input('hideCopy')
  set capitalizedHide(hidecopy: boolean) {
    this.hidecopy = hidecopy;
  }

  @HostBinding('class.avoidFile') isAvoid = false;

  @ViewChild('content', {static: true}) content: ElementRef;
  @ViewChild(CodeComponent, {static: true}) qnrCode: CodeComponent;

  ngAfterViewInit() {
    this.qnrCode.code = this.content.nativeElement.innerHTML;
  }
}
