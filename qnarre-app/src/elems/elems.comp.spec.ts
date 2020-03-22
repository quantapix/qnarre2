import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ElemsComp} from './elems.comp';
import {ElemsLoader} from './loader';

import {LoggerService} from '../services/logger.service';
import {MockLogger} from '../testing/logger.service';

describe('ElemsComp', () => {
  let loader: any;
  let logger: MockLogger;
  let c: ComponentFixture<ElemsComp>;
  beforeEach(() => {
    loader = jasmine.createSpyObj('ElemsLoader', ['loadContained', 'load']);
    const inj = TestBed.configureTestingModule({
      declarations: [ElemsComp],
      providers: [
        {provide: ElemsLoader, useValue: loader},
        {provide: LoggerService, useClass: MockLogger}
      ]
    });
    logger = inj.inject(MockLogger);
    c = TestBed.createComponent(ElemsComp);
  });
  it('should set HTML content based on selector', () => {
    const e = c.nativeElement;
    expect(e.innerHTML).toBe('');
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(e.innerHTML).toBe('<foo-bar></foo-bar>');
  });
  it('should load specified custom element', () => {
    expect(loader.load).not.toHaveBeenCalled();
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(loader.load).toHaveBeenCalledWith('foo-bar');
  });
  it('should log error if selector empty', () => {
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-elem': "
    );
  });
  it('should log error if the selector invalid', () => {
    c.componentInstance.selector = 'foo-bar><script></script><foo-bar';
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-elem': foo-bar><script></script><foo-bar"
    );
  });
});
