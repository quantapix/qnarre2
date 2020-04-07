/* eslint-disable @typescript-eslint/unbound-method */
import {Component, ViewChild, AfterViewInit} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatSnackBar} from '@angular/material/snack-bar';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {CodeModule} from './code.module';
import {CodeComponent} from './code';
import {CopierService} from '../../services/copier';
import {PrettifyService} from '../../services/prettify';
import {MockPrettify} from '../../testing/prettify.service';
import {LogService} from '../../services/log';

const oneLine = 'const foo = "bar";';
const multiLine = `&lt;hero-details&gt;
  &lt;h2&gt;Bah Dah Bing&lt;/h2&gt;
  &lt;hero-team&gt;
    &lt;h3&gt;NYC Team&lt;/h3&gt;
  &lt;/hero-team&gt;
&lt;/hero-details&gt;`;
const bigMultiLine = `${multiLine}\n${multiLine}\n${multiLine}`;

describe('CodeComponent', () => {
  let f: ComponentFixture<HostComponent>;
  let host: HostComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CodeModule],
      declarations: [HostComponent],
      providers: [
        CopierService,
        {provide: LogService, useClass: TestLogger},
        {provide: PrettifyService, useClass: MockPrettify}
      ]
    });
    f = TestBed.createComponent(HostComponent);
    host = f.componentInstance;
    f.detectChanges();
  });
  describe('prettifying', () => {
    const formatted = () => f.nativeElement.querySelector('code').innerHTML;
    it('should format a one-line code sample without linenums by default', () => {
      host.setCode(oneLine);
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: false): ${oneLine}`
      );
    });
    it('should add line numbers to one-line code sample when linenums is `true`', () => {
      host.setCode(oneLine);
      host.linenums = true;
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${oneLine}`
      );
    });
    it("should add line numbers to one-line code sample when linenums is `'true'`", () => {
      host.setCode(oneLine);
      host.linenums = 'true';
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${oneLine}`
      );
    });
    it('should format a small multi-line code sample without linenums by default', () => {
      host.setCode(multiLine);
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: false): ${multiLine}`
      );
    });
    it('should add line numbers to a small multi-line code sample when linenums is `true`', () => {
      host.setCode(multiLine);
      host.linenums = true;
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${multiLine}`
      );
    });
    it("should add line numbers to  a small multi-line code sample when linenums is `'true'`", () => {
      host.setCode(multiLine);
      host.linenums = 'true';
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${multiLine}`
      );
    });
    it('should format a big multi-line code without linenums by default', () => {
      host.setCode(bigMultiLine);
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: false): ${bigMultiLine}`
      );
    });
    it('should add line numbers to a big multi-line code sample when linenums is `true`', () => {
      host.setCode(bigMultiLine);
      host.linenums = true;
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${bigMultiLine}`
      );
    });
    it("should add line numbers to  a big multi-line code sample when linenums is `'true'`", () => {
      host.setCode(bigMultiLine);
      host.linenums = 'true';
      f.detectChanges();
      expect(formatted()).toBe(
        `Formatted code (language: auto, linenums: true): ${bigMultiLine}`
      );
    });
  });

  describe('whitespace handling', () => {
    it('should remove common indentation from the code before rendering', () => {
      host.linenums = false;
      f.detectChanges();
      host.setCode(`
        abc
          let x = text.split('\\n');
        ghi

        jkl
      `);
      const codeContent = f.nativeElement.querySelector('code').textContent;
      expect(codeContent).toEqual(
        "Formatted code (language: auto, linenums: false): abc\n  let x = text.split('\\n');\nghi\n\njkl"
      );
    });
    it('should trim whitespace from the code before rendering', () => {
      host.linenums = false;
      f.detectChanges();
      host.setCode('\n\n\n' + multiLine + '\n\n\n');
      const codeContent = f.nativeElement.querySelector('code').textContent;
      expect(codeContent).toEqual(codeContent.trim());
    });
    it('should trim whitespace from code before computing whether to format linenums', () => {
      host.setCode('\n\n\n' + oneLine + '\n\n\n');
      const lis = f.nativeElement.querySelectorAll('li');
      expect(lis.length).toBe(0, 'should be no linenums');
    });
  });

  describe('error message', () => {
    function getErrorMessage() {
      const missing: HTMLElement = f.nativeElement.querySelector(
        '.code-missing'
      );
      return missing ? missing.textContent : null;
    }
    it('should not display "code-missing" class when there is some code', () => {
      expect(getErrorMessage()).toBeNull(
        'should not have element with "code-missing" class'
      );
    });
    it('should display error message when there is no code (after trimming)', () => {
      host.setCode(' \n ');
      expect(getErrorMessage()).toContain('missing');
    });
    it('should show path and region in missing-code error message', () => {
      host.path = 'fizz/buzz/foo.html';
      host.region = 'something';
      f.detectChanges();
      host.setCode(' \n ');
      expect(getErrorMessage()).toMatch(
        /for[\s\S]fizz\/buzz\/foo\.html#something$/
      );
    });
    it('should show path only in missing-code error message when no region', () => {
      host.path = 'fizz/buzz/foo.html';
      f.detectChanges();
      host.setCode(' \n ');
      expect(getErrorMessage()).toMatch(/for[\s\S]fizz\/buzz\/foo\.html$/);
    });
    it('should show simple missing-code error message when no path/region', () => {
      host.setCode(' \n ');
      expect(getErrorMessage()).toMatch(/missing.$/);
    });
  });

  describe('copy button', () => {
    function getButton() {
      const b = f.debugElement.query(By.css('button'));
      return b ? b.nativeElement : null;
    }
    it('should be hidden if the `hideCopy` input is true', () => {
      host.hideCopy = true;
      f.detectChanges();
      expect(getButton()).toBe(null);
    });
    it('should have title', () => {
      expect(getButton().title).toBe('Copy code snippet');
    });
    it('should have no aria-label by default', () => {
      expect(getButton().getAttribute('aria-label')).toBe('');
    });
    it('should have aria-label explaining what is being copied when header passed in', () => {
      host.header = 'a/b/c/foo.ts';
      f.detectChanges();
      expect(getButton().getAttribute('aria-label')).toContain(host.header);
    });
    it('should call copier service when clicked', () => {
      const copier: CopierService = TestBed.inject(CopierService);
      const spy = spyOn(copier, 'copyText');
      expect(spy.calls.count()).toBe(0, 'before click');
      getButton().click();
      expect(spy.calls.count()).toBe(1, 'after click');
    });
    it('should copy code text when clicked', () => {
      const copier: CopierService = TestBed.inject(CopierService);
      const spy = spyOn(copier, 'copyText');
      getButton().click();
      expect(spy.calls.argsFor(0)[0]).toBe(oneLine, 'after click');
    });
    it('should preserve newlines in the copied code', () => {
      const copier: CopierService = TestBed.inject(CopierService);
      const spy = spyOn(copier, 'copyText');
      const expectedCode = multiLine
        .trim()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      let actual;
      host.setCode(multiLine);
      [false, true, 42].forEach(linenums => {
        host.linenums = linenums;
        f.detectChanges();
        getButton().click();
        actual = spy.calls.mostRecent().args[0];
        expect(actual).toBe(expectedCode, `when linenums=${linenums}`);
        expect(actual.match(/\r?\n/g).length).toBe(5);
        spy.calls.reset();
      });
    });
    it('should display a message when copy succeeds', () => {
      const snackBar: MatSnackBar = TestBed.inject(MatSnackBar);
      const copier: CopierService = TestBed.inject(CopierService);
      spyOn(snackBar, 'open');
      spyOn(copier, 'copyText').and.returnValue(true);
      getButton().click();
      expect(snackBar.open).toHaveBeenCalledWith('Code Copied', '', {
        duration: 800
      });
    });
    it('should display an error when copy fails', () => {
      const snackBar: MatSnackBar = TestBed.inject(MatSnackBar);
      const copier: CopierService = TestBed.inject(CopierService);
      const logger = TestBed.inject(LogService) as TestLogger;
      spyOn(snackBar, 'open');
      spyOn(copier, 'copyText').and.returnValue(false);
      getButton().click();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Copy failed. Please try again!',
        '',
        {
          duration: 800
        }
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(jasmine.any(Error));
      expect(logger.error.calls.mostRecent().args[0].message).toMatch(
        /^ERROR copying code to clipboard:/
      );
    });
  });
});

@Component({
  selector: 'qnr-host-comp',
  template: `
    <qnr-code
      [language]="language"
      [linenums]="linenums"
      [path]="path"
      [region]="region"
      [hideCopy]="hideCopy"
      [header]="header"
    ></qnr-code>
  `
})
class HostComponent implements AfterViewInit {
  hideCopy: boolean;
  language: string;
  linenums: boolean | number | string;
  path: string;
  region: string;
  header: string;

  @ViewChild(CodeComponent, {static: false}) codeComponent: CodeComponent;

  ngAfterViewInit() {
    this.setCode(oneLine);
  }

  setCode(code: string) {
    this.codeComponent.code = code;
  }
}

class TestLogger {
  log = jasmine.createSpy('log');
  error = jasmine.createSpy('error');
}
