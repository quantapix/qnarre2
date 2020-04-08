import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild
} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {tap} from 'rxjs/operators';

import {LogService} from '../../app/log.serv';
import {CopierService} from '../../services/copier';
import {PrettifyService} from '../../services/prettify';

@Component({
  selector: 'qnr-code',
  template: `
    <pre class="prettify lang-{{ language }}">
      <button *ngIf="!hideCopy" class="material-icons copy-button no-print"
        title="Copy code snippet"
        [attr.aria-label]="ariaLabel"
        (click)="doCopy()">
        <span aria-hidden="true">content_copy</span>
      </button>
      <code class="animated fadeIn" #codeContainer></code>
    </pre>
  `
})
export class CodeComp implements OnChanges {
  ariaLabel = '';
  private text: string;

  set code(code: string) {
    this._code = code;
    if (!this._code || !this._code.trim()) {
      this.codeMissing();
    } else {
      this.formatCode();
    }
  }
  get code() {
    return this._code;
  }
  _code: string;

  @Input() path: string;
  @Input() region: string;
  @Input() hideCopy: boolean;
  @Input() language: string | undefined;
  @Input() linenums: boolean | number | string | undefined;

  @Input()
  set header(header: string | undefined) {
    this._header = header;
    this.ariaLabel = this.header ? `Copy code snippet from ${this.header}` : '';
  }
  get header() {
    return this._header;
  }
  private _header?: string;

  @Output() formatted = new EventEmitter<void>();

  @ViewChild('codeContainer', {static: true}) codeContainer: ElementRef;

  constructor(
    private snackbar: MatSnackBar,
    private prettify: PrettifyService,
    private copier: CopierService,
    private logger: LogService
  ) {}

  ngOnChanges() {
    if (this.code) {
      this.formatCode();
    }
  }

  private formatCode() {
    const c = leftAlign(this.code);
    this.setCodeHtml(c);
    this.text = this.getText();
    this.prettify
      .formatCode(c, this.language, this.getLinenums())
      .pipe(tap(() => this.formatted.emit()))
      .subscribe(
        c => this.setCodeHtml(c),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {}
      );
  }

  private codeMissing() {
    const r = this.region ? '#' + this.region : '';
    const p = this.path ? this.path + r : '';
    const m = p ? ` for\n${p}` : '.';
    this.setCodeHtml(`<p class="code-missing">Code is missing${m}</p>`);
  }

  private setCodeHtml(c: string) {
    this.codeContainer.nativeElement.innerHTML = c;
  }

  private getText() {
    return this.codeContainer.nativeElement.textContent;
  }

  doCopy() {
    const t = this.text;
    const done = this.copier.copyText(t);
    if (done) {
      this.logger.log('Copied to clipboard:', t);
      this.snackbar.open('Code Copied', '', {duration: 800});
    } else {
      this.logger.error(new Error(`ERROR copying to clipboard: "${t}"`));
      this.snackbar.open('Copy failed. Please try again!', '', {duration: 800});
    }
  }

  getLinenums() {
    if (typeof this.linenums === 'boolean') return this.linenums;
    if (typeof this.linenums === 'string') {
      return !isNaN(parseInt(this.linenums, 10));
    }
    return !!this.linenums;
  }
}

function leftAlign(text: string) {
  let indent = Number.MAX_VALUE;
  const ls = text.split('\n');
  ls.forEach(l => {
    const i = l.search(/\S/);
    if (i !== -1) {
      indent = Math.min(i, indent);
    }
  });
  return ls
    .map(l => l.substr(indent))
    .join('\n')
    .trim();
}

@NgModule({
  imports: [CommonModule, MatSnackBarModule],
  declarations: [CodeComp],
  entryComponents: [CodeComp],
  providers: [CopierService, PrettifyService],
  exports: [CodeComp]
})
export class CodeModule {}
