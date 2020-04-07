import {Component, ViewChild, NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {TabsModule} from './tabs.module';
import {TabsComponent} from './tabs.component';
import {PrettifyService} from '../../services/prettify';
import {LoggerService} from '../../services/log';
import {MockPrettify} from '../../services/prettify.service';
import {MockLog} from '../../services/log';

describe('CodeTabsComponent', () => {
  let f: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let c: TabsComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HostComponent],
      imports: [TabsModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {provide: LoggerService, useClass: MockLog},
        {provide: PrettifyService, useClass: MockPrettify}
      ]
    });
    f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    host = f.componentInstance;
    c = host.component;
  });
  it('should get correct tab info', () => {
    const ts = c.tabs;
    expect(ts.length).toBe(2);
    expect(ts[0].class).toBe('class-A');
    expect(ts[0].language).toBe('language-A');
    expect(ts[0].linenums).toBe('linenums-A');
    expect(ts[0].path).toBe('path-A');
    expect(ts[0].region).toBe('region-A');
    expect(ts[0].header).toBe('header-A');
    expect(ts[0].code.trim()).toBe('Code example 1');
    expect(ts[1].class).toBe('class-B');
    expect(ts[1].language).toBe('language-B');
    expect(ts[1].linenums).toBe(
      'default-linenums',
      'Default linenums should have been used'
    );
    expect(ts[1].path).toBe('path-B');
    expect(ts[1].region).toBe('region-B');
    expect(ts[1].header).toBe('header-B');
    expect(ts[1].code.trim()).toBe('Code example 2');
  });
  it('should create the right number of tabs with the right labels and classes', () => {
    const ms = f.nativeElement.querySelectorAll('.mat-tab-label');
    expect(ms.length).toBe(2);
    expect(ms[0].textContent.trim()).toBe('header-A');
    expect(ms[0].querySelector('.class-A')).toBeTruthy();
    expect(ms[1].textContent.trim()).toBe('header-B');
    expect(ms[1].querySelector('.class-B')).toBeTruthy();
  });
  it('should show the first tab with the right code', () => {
    const t = f.nativeElement.querySelector('qnr-code').textContent;
    expect(t.indexOf('Code example 1') !== -1).toBeTruthy();
  });
});

@Component({
  selector: 'qnr-host-comp',
  template: `
    <code-tabs linenums="default-linenums">
      <code-pane
        class="class-A"
        language="language-A"
        linenums="linenums-A"
        path="path-A"
        region="region-A"
        header="header-A"
      >
        Code example 1
      </code-pane>
      <code-pane
        class="class-B"
        language="language-B"
        path="path-B"
        region="region-B"
        header="header-B"
      >
        Code example 2
      </code-pane>
    </code-tabs>
  `
})
class HostComponent {
  @ViewChild(TabsComponent, {static: true})
  component: TabsComponent;
}
