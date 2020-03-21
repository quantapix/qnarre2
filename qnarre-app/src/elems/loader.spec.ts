import {
  Compiler,
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  Injector,
  NgModuleFactory,
  NgModuleRef,
  Type
} from '@angular/core';
import {TestBed, fakeAsync, flushMicrotasks} from '@angular/core/testing';

import {ElementsLoader} from './loader';
import {LOAD_CALLBACKS_TOKEN, WithElement} from './registry';

interface Deferred {
  resolve(): void;
  reject(err: any): void;
}

describe('ElementsLoader', () => {
  let loader: ElementsLoader;
  let compiler: Compiler;
  beforeEach(() => {
    const injector = TestBed.configureTestingModule({
      providers: [
        ElementsLoader,
        {
          provide: LOAD_CALLBACKS_TOKEN,
          useValue: new Map<
            string,
            () => Promise<NgModuleFactory<WithElement> | Type<WithElement>>
          >([
            ['a-sel', () => Promise.resolve(new FakeModuleFactory('a-mod'))],
            ['b-sel', () => Promise.resolve(new FakeModuleFactory('b-mod'))],
            ['c-sel', () => Promise.resolve(FakeModule)]
          ])
        }
      ]
    });
    loader = injector.inject(ElementsLoader);
    compiler = injector.inject(Compiler);
  });

  describe('loadContained()', () => {
    let spy: jasmine.Spy;
    beforeEach(() => (spy = spyOn(loader, 'load')));
    it('should attempt to load and register contained elements', fakeAsync(() => {
      expect(spy).not.toHaveBeenCalled();
      const e = document.createElement('div');
      e.innerHTML = `
        <a-sel></a-sel>
        <b-sel></b-sel>
      `;
      loader.loadContained(e);
      flushMicrotasks();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('a-sel');
      expect(spy).toHaveBeenCalledWith('b-sel');
    }));
    it('should attempt to load and register only contained elements', fakeAsync(() => {
      expect(spy).not.toHaveBeenCalled();
      const e = document.createElement('div');
      e.innerHTML = `
        <b-sel></b-sel>
      `;
      loader.loadContained(e);
      flushMicrotasks();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('b-sel');
    }));
    it('should wait for all contained elements to load and register', fakeAsync(() => {
      const ps = promisesFromSpy(spy);
      const e = document.createElement('div');
      e.innerHTML = `
        <a-sel></a-sel>
        <b-sel></b-sel>
      `;
      const log: any[] = [];
      loader.loadContained(e).subscribe(
        v => log.push(`emitted: ${v}`),
        e => log.push(`errored: ${e}`),
        () => log.push('completed')
      );
      flushMicrotasks();
      expect(log).toEqual([]);
      ps[0].resolve();
      flushMicrotasks();
      expect(log).toEqual([]);
      ps[1].resolve();
      flushMicrotasks();
      expect(log).toEqual(['emitted: undefined', 'completed']);
    }));
    it('should fail if any of the contained elements fails to load and register', fakeAsync(() => {
      const ps = promisesFromSpy(spy);
      const e = document.createElement('div');
      e.innerHTML = `
        <a-sel></a-sel>
        <b-sel></b-sel>
      `;
      const log: any[] = [];
      loader.loadContained(e).subscribe(
        v => log.push(`emitted: ${v}`),
        e => log.push(`errored: ${e}`),
        () => log.push('completed')
      );
      flushMicrotasks();
      expect(log).toEqual([]);
      ps[0].resolve();
      flushMicrotasks();
      expect(log).toEqual([]);
      ps[1].reject('foo');
      flushMicrotasks();
      expect(log).toEqual(['errored: foo']);
    }));
  });

  describe('loadElement()', () => {
    let dSpy: jasmine.Spy;
    let wSpy: jasmine.Spy;
    let whenDefinedps: Deferred[];
    beforeEach(() => {
      dSpy = spyOn(window.customElements, 'define');
      wSpy = spyOn(window.customElements, 'whenDefined');
      whenDefinedps = promisesFromSpy(wSpy);
    });
    it('should be able to load and register an element', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(dSpy).toHaveBeenCalledTimes(1);
      expect(dSpy).toHaveBeenCalledWith('a-sel', jasmine.any(Function));
      const Ctor = dSpy.calls.argsFor(0)[1];
      expect(Ctor.observedAttributes).toEqual(['a-mod']);
    }));
    it('should wait until the element is defined', fakeAsync(() => {
      let s = 'pending';
      loader.load('b-sel').then(() => (s = 'resolved'));
      flushMicrotasks();
      expect(s).toBe('pending');
      expect(wSpy).toHaveBeenCalledTimes(1);
      expect(wSpy).toHaveBeenCalledWith('b-sel');
      whenDefinedps[0].resolve();
      flushMicrotasks();
      expect(s).toBe('resolved');
    }));
    it('should not load and register the same element more than once', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(dSpy).toHaveBeenCalledTimes(1);
      dSpy.calls.reset();
      loader.load('a-sel');
      flushMicrotasks();
      expect(dSpy).not.toHaveBeenCalled();
      dSpy.calls.reset();
      whenDefinedps[0].resolve();
      let state = 'pending';
      loader.load('a-sel').then(() => (state = 'resolved'));
      flushMicrotasks();
      expect(state).toBe('resolved');
      expect(dSpy).not.toHaveBeenCalled();
    }));
    it('should fail if defining the the custom element fails', fakeAsync(() => {
      let s = 'pending';
      loader.load('b-sel').catch(e => (s = `rejected: ${e}`));
      flushMicrotasks();
      expect(s).toBe('pending');
      whenDefinedps[0].reject('foo');
      flushMicrotasks();
      expect(s).toBe('rejected: foo');
    }));
    it('should be able to load and register an element again if previous attempt failed', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(dSpy).toHaveBeenCalledTimes(1);
      dSpy.calls.reset();
      loader.load('a-sel').catch(() => undefined);
      flushMicrotasks();
      expect(dSpy).not.toHaveBeenCalled();
      whenDefinedps[0].reject('foo');
      flushMicrotasks();
      expect(dSpy).not.toHaveBeenCalled();
      loader.load('a-sel');
      flushMicrotasks();
      expect(dSpy).toHaveBeenCalledTimes(1);
    }));
    it('should be able to load and register an element after compiling its NgModule', fakeAsync(() => {
      const cSpy = spyOn(compiler, 'compileModuleAsync').and.returnValue(
        Promise.resolve(new FakeModuleFactory('c-mod'))
      );
      loader.load('c-sel');
      flushMicrotasks();
      expect(dSpy).toHaveBeenCalledTimes(1);
      expect(dSpy).toHaveBeenCalledWith('c-sel', jasmine.any(Function));
      expect(cSpy).toHaveBeenCalledTimes(1);
      expect(cSpy).toHaveBeenCalledWith(FakeModule);
    }));
  });
});

class FakeModule implements WithElement {
  customElementComponent: Type<any>;
}

class FakeComponentFactory extends ComponentFactory<any> {
  selector: string;
  componentType: Type<any>;
  ngContentSelectors: string[];
  inputs = [
    {propName: this.identifyingInput, templateName: this.identifyingInput}
  ];
  outputs = [];
  constructor(private identifyingInput: string) {
    super();
  }
  create(
    _injector: Injector,
    _projectableNodes?: any[][],
    _rootSelectorOrNode?: string | any,
    _ngModule?: NgModuleRef<any>
  ): ComponentRef<any> {
    return jasmine.createSpy('ComponentRef') as any;
  }
}

class FakeResolver extends ComponentFactoryResolver {
  constructor(private modulePath: string) {
    super();
  }
  resolveComponentFactory(_component: Type<any>): ComponentFactory<any> {
    return new FakeComponentFactory(this.modulePath);
  }
}

class FakeRef extends NgModuleRef<WithElement> {
  injector = jasmine.createSpyObj('injector', ['get']);
  componentFactoryResolver = new FakeResolver(this.modulePath);
  instance: WithElement = new FakeModule();
  constructor(private modulePath: string) {
    super();
    this.injector.get.and.returnValue(this.componentFactoryResolver);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDestroy(_callback: () => void) {}
}

class FakeModuleFactory extends NgModuleFactory<any> {
  moduleType: Type<any>;
  moduleRefToCreate = new FakeRef(this.modulePath);
  constructor(private modulePath: string) {
    super();
  }
  create(_parent: Injector | null): NgModuleRef<any> {
    return this.moduleRefToCreate;
  }
}

function promisesFromSpy(spy: jasmine.Spy): Deferred[] {
  const ps: Deferred[] = [];
  spy.and.callFake(
    () => new Promise((resolve, reject) => ps.push({resolve, reject}))
  );
  return ps;
}
