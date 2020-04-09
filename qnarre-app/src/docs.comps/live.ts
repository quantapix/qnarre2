/* tslint:disable component-selector */
import {
  AfterContentInit,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';
import {Location} from '@angular/common';
import {CONTENT_URL_PREFIX} from '../app/data.serv';

import {AttrMap, boolFromValue, getAttrs, getAttrValue} from '../utils/attr';

import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WithElem} from '../app/elem.serv';

const LIVE_EXAMPLE_BASE = CONTENT_URL_PREFIX + 'live-examples/';
const ZIP_BASE = CONTENT_URL_PREFIX + 'zips/';

@Component({
  selector: 'live-example',
  templateUrl: 'live.html'
})
export class LiveComp implements AfterContentInit {
  readonly mode: 'default' | 'embedded' | 'downloadOnly';
  readonly enableDownload: boolean;
  readonly stackblitz: string;
  readonly zip: string;
  title: string;

  @ViewChild('content', {static: true})
  private content: ElementRef;

  constructor(elementRef: ElementRef, location: Location) {
    const attrs = getAttrs(elementRef);
    const exampleDir = this.getExampleDir(attrs, location.path(false));
    const stackblitzName = this.getStackblitzName(attrs);

    this.mode = this.getMode(attrs);
    this.enableDownload = this.getEnableDownload(attrs);
    this.stackblitz = this.getStackblitz(
      exampleDir,
      stackblitzName,
      this.mode === 'embedded'
    );
    this.zip = this.getZip(exampleDir, stackblitzName);
    this.title = this.getTitle(attrs);
  }

  ngAfterContentInit() {
    // Angular will sanitize this title when displayed, so it should be plain text.
    const textContent = this.content.nativeElement.textContent.trim();
    if (textContent) {
      this.title = textContent;
    }
  }

  private getEnableDownload(attrs: AttrMap) {
    const downloadDisabled = boolFromValue(getAttrValue(attrs, 'noDownload'));
    return !downloadDisabled;
  }

  private getExampleDir(attrs: AttrMap, path: string) {
    let exampleDir = getAttrValue(attrs, 'name');
    if (!exampleDir) {
      // Take the last path segment, excluding query params and hash fragment.
      const match = path.match(/[^/?#]+(?=\/?(?:\?|#|$))/);
      exampleDir = match ? match[0] : 'index';
    }
    return exampleDir.trim();
  }

  private getMode(this: LiveComp, attrs: AttrMap): typeof this.mode {
    const downloadOnly = boolFromValue(getAttrValue(attrs, 'downloadOnly'));
    const isEmbedded = boolFromValue(getAttrValue(attrs, 'embedded'));

    return downloadOnly ? 'downloadOnly' : isEmbedded ? 'embedded' : 'default';
  }

  private getStackblitz(
    exampleDir: string,
    stackblitzName: string,
    isEmbedded: boolean
  ) {
    const urlQuery = isEmbedded ? '?ctl=1' : '';
    return `${LIVE_EXAMPLE_BASE}${exampleDir}/${stackblitzName}stackblitz.html${urlQuery}`;
  }

  private getStackblitzName(attrs: AttrMap) {
    const attrValue = (getAttrValue(attrs, 'stackblitz') || '').trim();
    return attrValue && `${attrValue}.`;
  }

  private getTitle(attrs: AttrMap) {
    return (getAttrValue(attrs, 'title') || 'live example').trim();
  }

  private getZip(exampleDir: string, stackblitzName: string) {
    const zipName = exampleDir.split('/')[0];
    return `${ZIP_BASE}${exampleDir}/${stackblitzName}${zipName}.zip`;
  }
}

@NgModule({
  imports: [CommonModule],
  declarations: [LiveComp],
  entryComponents: [LiveComp]
})
export class LiveExampleModule implements WithElem {
  elemComp: Type<any> = LiveComp;
}
