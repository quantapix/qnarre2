import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ElementComponent} from './elems.component';
import {ElementsLoader} from './loader';

import {LoggerService} from '../services/logger.service';
import {MockLogger} from '../testing/logger.service';

describe('ElementComponent', () => {
  let loader: jasmine.SpyObj<ElementsLoader>;
  let logger: MockLogger;
  let c: ComponentFixture<ElementComponent>;
  beforeEach(() => {
    loader = jasmine.createSpyObj<ElementsLoader>('ElementsLoader', [
      'loadContained',
      'load'
    ]);
    const injector = TestBed.configureTestingModule({
      declarations: [ElementComponent],
      providers: [
        {provide: ElementsLoader, useValue: loader},
        {provide: LoggerService, useClass: MockLogger}
      ]
    });
    logger = injector.inject(Logger) as any;
    c = TestBed.createComponent(ElementComponent);
  });
  it('should set the HTML content based on the selector', () => {
    const e = c.nativeElement;
    expect(e.innerHTML).toBe('');
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(e.innerHTML).toBe('<foo-bar></foo-bar>');
  });
  it('should load the specified custom element', () => {
    expect(loader.load).not.toHaveBeenCalled();
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(loader.load).toHaveBeenCalledWith('foo-bar');
  });
  it('should log an error (and abort) if the selector is empty', () => {
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-element': "
    );
  });
  it('should log an error (and abort) if the selector is invalid', () => {
    c.componentInstance.selector = 'foo-bar><script></script><foo-bar';
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-element': foo-bar><script></script><foo-bar"
    );
  });
});
