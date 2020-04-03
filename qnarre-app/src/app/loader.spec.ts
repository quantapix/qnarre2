import {} from 'jasmine';
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

import {ElemsLoader} from './loader';
import {LOAD_CBS_TOKEN, WithElem} from './registry';

describe('elems loader', () => {
  let loader: ElemsLoader;
  let compiler: Compiler;
  beforeEach(() => {
    const inj = TestBed.configureTestingModule({
      providers: [
        ElemsLoader,
        {
          provide: LOAD_CBS_TOKEN,
          useValue: new Map<
            string,
            () => Promise<NgModuleFactory<WithElem> | Type<WithElem>>
          >([
            ['a-sel', () => Promise.resolve(new FakeModuleFactory('a-mod'))],
            ['b-sel', () => Promise.resolve(new FakeModuleFactory('b-mod'))],
            ['c-sel', () => Promise.resolve(FakeModule)]
          ])
        }
      ]
    });
    loader = inj.inject(ElemsLoader);
    compiler = inj.inject(Compiler);
  });

  describe('loadContained()', () => {
    let spy: any;
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
    it('should attempt to load only contained elements', fakeAsync(() => {
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
    it('should wait for all contained elements to load', fakeAsync(() => {
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
    it('should fail if any contained elements fail', fakeAsync(() => {
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

  describe('load()', () => {
    let d: any;
    let w: any;
    let ps: Deferred[];
    beforeEach(() => {
      d = spyOn(window.customElements, 'define');
      w = spyOn(window.customElements, 'whenDefined');
      ps = promisesFromSpy(w);
    });
    it('should be able to load an element', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(d).toHaveBeenCalledTimes(1);
      expect(d).toHaveBeenCalledWith('a-sel', jasmine.any(Function));
      const Ctor = d.calls.argsFor(0)[1];
      expect(Ctor.observedAttributes).toEqual(['a-mod']);
    }));
    it('should wait until element is defined', fakeAsync(() => {
      let s = 'pending';
      loader.load('b-sel')?.then(() => (s = 'resolved'));
      flushMicrotasks();
      expect(s).toBe('pending');
      expect(w).toHaveBeenCalledTimes(1);
      expect(w).toHaveBeenCalledWith('b-sel');
      ps[0].resolve();
      flushMicrotasks();
      expect(s).toBe('resolved');
    }));
    it('should not load same element more than once', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(d).toHaveBeenCalledTimes(1);
      d.calls.reset();
      loader.load('a-sel');
      flushMicrotasks();
      expect(d).not.toHaveBeenCalled();
      d.calls.reset();
      ps[0].resolve();
      let state = 'pending';
      loader.load('a-sel')?.then(() => (state = 'resolved'));
      flushMicrotasks();
      expect(state).toBe('resolved');
      expect(d).not.toHaveBeenCalled();
    }));
    it('should fail if defining element fails', fakeAsync(() => {
      let s = 'pending';
      loader.load('b-sel')?.catch(e => (s = `rejected: ${e}`));
      flushMicrotasks();
      expect(s).toBe('pending');
      ps[0].reject('foo');
      flushMicrotasks();
      expect(s).toBe('rejected: foo');
    }));
    it('should be able to load element again if previous failed', fakeAsync(() => {
      loader.load('a-sel');
      flushMicrotasks();
      expect(d).toHaveBeenCalledTimes(1);
      d.calls.reset();
      loader.load('a-sel')?.catch(() => undefined);
      flushMicrotasks();
      expect(d).not.toHaveBeenCalled();
      ps[0].reject('foo');
      flushMicrotasks();
      expect(d).not.toHaveBeenCalled();
      loader.load('a-sel');
      flushMicrotasks();
      expect(d).toHaveBeenCalledTimes(1);
    }));
    it('should be able to load element after compiling NgModule', fakeAsync(() => {
      const spy = spyOn(compiler, 'compileModuleAsync').and.returnValue(
        Promise.resolve(new FakeModuleFactory('c-mod'))
      );
      loader.load('c-sel');
      flushMicrotasks();
      expect(d).toHaveBeenCalledTimes(1);
      expect(d).toHaveBeenCalledWith('c-sel', jasmine.any(Function));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(FakeModule);
    }));
  });
});

interface Deferred {
  resolve(): void;
  reject(err: any): void;
}

class FakeComponentFactory extends ComponentFactory<any> {
  selector = '';
  componentType = {} as Type<any>;
  ngContentSelectors = [] as string[];
  inputs = [
    {propName: this.identifyingInput, templateName: this.identifyingInput}
  ];
  outputs = [];
  constructor(private identifyingInput: string) {
    super();
  }
  create(
    _i: Injector,
    _ns?: any[][],
    _r?: any,
    _m?: NgModuleRef<any>
  ): ComponentRef<any> {
    return jasmine.createSpy('ComponentRef') as any;
  }
}

class FakeModule implements WithElem {
  elemComp = {} as Type<any>;
}

class FakeResolver extends ComponentFactoryResolver {
  constructor(private path: string) {
    super();
  }
  resolveComponentFactory(_component: Type<any>): ComponentFactory<any> {
    return new FakeComponentFactory(this.path);
  }
}

class FakeRef extends NgModuleRef<WithElem> {
  injector = jasmine.createSpyObj('injector', ['get']);
  componentFactoryResolver = new FakeResolver(this.path);
  instance = new FakeModule() as WithElem;
  constructor(private path: string) {
    super();
    this.injector.get.and.returnValue(this.componentFactoryResolver);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDestroy(_callback: () => void) {}
}

class FakeModuleFactory extends NgModuleFactory<any> {
  moduleType = {} as Type<any>;
  ref = new FakeRef(this.path);
  constructor(private path: string) {
    super();
  }
  create(_parent: Injector | null): NgModuleRef<any> {
    return this.ref;
  }
}

function promisesFromSpy(spy: any): Deferred[] {
  const ps: Deferred[] = [];
  spy.and.callFake(
    () => new Promise((resolve, reject) => ps.push({resolve, reject}))
  );
  return ps;
}
