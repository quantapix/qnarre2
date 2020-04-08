import {NgModule, Type} from '@angular/core';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatTabsModule} from '@angular/material/tabs';

import {CodeComponent} from './code';
import {WithElem} from '../../app/elem.serv';
import {CodeModule} from './code.module';

export interface TabInfo {
  class: string;
  code: string;
  path: string;
  region: string;
  header?: string;
  language?: string;
  linenums?: string;
}

@Component({
  selector: 'qnr-code-tabs',
  template: `
    <div #content style="display: none"><ng-content></ng-content></div>
    <mat-card>
      <mat-tab-group class="code-tab-group" [disableRipple]="true">
        <mat-tab style="overflow-y: hidden;" *ngFor="let tab of tabs">
          <ng-template mat-tab-label>
            <span class="{{ tab.class }}">{{ tab.header }}</span>
          </ng-template>
          <qnr-code
            class="{{ tab.class }}"
            [language]="tab.language"
            [linenums]="tab.linenums"
            [path]="tab.path"
            [region]="tab.region"
            [header]="tab.header"
          >
          </qnr-code>
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `
})
export class TabsComp implements OnInit, AfterViewInit {
  tabs: TabInfo[];

  @Input() linenums: string | undefined;
  @ViewChild('content', {static: true}) content: ElementRef<HTMLDivElement>;
  @ViewChildren(CodeComponent) components: QueryList<CodeComponent>;

  ngOnInit() {
    this.tabs = [];
    const es = Array.from(
      this.content.nativeElement.querySelectorAll('code-pane')
    );
    for (const e of es) {
      this.tabs.push(this.getTabInfo(e));
    }
  }

  ngAfterViewInit() {
    this.components.toArray().forEach((c, i) => {
      c.code = this.tabs[i].code;
    });
  }

  private getTabInfo(e: Element) {
    return {
      class: e.getAttribute('class') || '',
      code: e.innerHTML,
      path: e.getAttribute('path') || '',
      region: e.getAttribute('region') || '',
      header: e.getAttribute('header') || undefined,
      language: e.getAttribute('language') || undefined,
      linenums: e.getAttribute('linenums') || this.linenums
    } as TabInfo;
  }
}

@NgModule({
  imports: [CommonModule, MatCardModule, MatTabsModule, CodeModule],
  declarations: [TabsComp],
  entryComponents: [TabsComp],
  exports: [TabsComp]
})
export class TabsModule implements WithElem {
  elemComp: Type<any> = TabsComp;
}
