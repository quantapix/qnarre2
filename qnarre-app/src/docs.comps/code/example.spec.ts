import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ExampleComp, ExampleModule} from './example';
import {PrettifyService} from '../../services/prettify';
import {LogService, MockLog} from '../../app/log.serv';
import {MockPrettify} from '../../services/prettify';

describe('ExampleComp', () => {
  let host: HostComponent;
  let c: ExampleComp;
  let f: ComponentFixture<HostComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ExampleModule],
      declarations: [HostComponent],
      providers: [
        {provide: LogService, useClass: MockLog},
        {provide: PrettifyService, useClass: MockPrettify}
      ]
    });
    f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    host = f.componentInstance;
    c = host.example;
  });
  it('should be able to capture the code snippet provided in content', () => {
    expect(c.qnrCode.code.trim()).toBe(`const foo = "bar";`);
  });
  it('should change qnr-code classes based on header presence', () => {
    expect(c.header).toBe('Great Example');
    expect(f.nativeElement.querySelector('header')).toBeTruthy();
    expect(c.classes).toEqual({
      'headed-code': true,
      'simple-code': false
    });
    c.header = '';
    f.detectChanges();
    expect(c.header).toBe('');
    expect(f.nativeElement.querySelector('header')).toBeFalsy();
    expect(c.classes).toEqual({
      'headed-code': false,
      'simple-code': true
    });
  });
  it('should set avoidFile class if path has .avoid.', () => {
    const e: HTMLElement = f.nativeElement.querySelector('code-example');
    expect(c.path).toBe('code-path');
    expect(!e.className.includes('avoidFile')).toBe(true);
    c.path = 'code-path.avoid.';
    f.detectChanges();
    expect(!e.className.includes('avoidFile')).toBe(false);
  });
  it('should coerce hidecopy', () => {
    expect(c.hidecopy).toBe(false);
    host.hidecopy = true;
    f.detectChanges();
    expect(c.hidecopy).toBe(true);
    host.hidecopy = 'false';
    f.detectChanges();
    expect(c.hidecopy).toBe(false);
    host.hidecopy = 'true';
    f.detectChanges();
    expect(c.hidecopy).toBe(true);
  });
});

@Component({
  selector: 'qnr-host-comp',
  template: `
    <code-example [header]="header" [path]="path" [hidecopy]="hidecopy">
      {{ code }}
    </code-example>
  `
})
class HostComponent {
  code = `const foo = "bar";`;
  header = 'Great Example';
  path = 'code-path';
  hidecopy: boolean | string = false;
  @ViewChild(ExampleComp, {static: true}) example: ExampleComp;
}
