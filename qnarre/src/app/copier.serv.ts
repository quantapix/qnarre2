import {Injectable} from '@angular/core';

@Injectable()
export class CopierService {
  private copy?: HTMLTextAreaElement;

  createCopy(text: string) {
    const e = document.documentElement;
    const isRTL = e.getAttribute('dir') === 'rtl';
    this.copy = document.createElement('textarea');
    this.copy.style.fontSize = '12pt';
    this.copy.style.border = '0';
    this.copy.style.padding = '0';
    this.copy.style.margin = '0';
    this.copy.style.position = 'absolute';
    this.copy.style[isRTL ? 'right' : 'left'] = '-9999px';
    const y = window.pageYOffset || e.scrollTop;
    this.copy.style.top = y + 'px';
    this.copy.setAttribute('readonly', '');
    this.copy.value = text;
    document.body.appendChild(this.copy);
    this.copy.select();
    this.copy.setSelectionRange(0, this.copy.value.length);
  }

  removeCopy() {
    if (this.copy) {
      document.body.removeChild(this.copy);
      this.copy = undefined;
    }
  }

  copyText(text: string) {
    try {
      this.createCopy(text);
      return document.execCommand('copy');
    } catch (err) {
      return false;
    } finally {
      this.removeCopy();
    }
  }
}
