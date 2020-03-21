import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {PluginsContainer} from './plugins.container';
import {PluginsComponent} from './plugins.component';

import {PluginId, LoadingCode, LoadedCode, PluginsState, State} from './types';
import {createState, createPluginsState} from './plugins.spec';

describe('plugins.component', () => {
  let store: MockStore<State>;
  const init: Partial<PluginsState> = {
    plugins: {
      bar: {
        enabled: true,
        loading: {
          type: LoadingCode.ELEMENT,
          name: 'qnr-bar'
        },
        tabName: 'Bar',
        removeDom: false,
        disableReload: false
      },
      foo: {
        enabled: true,
        loading: {
          type: LoadingCode.IFRAME,
          // This will cause 404 as test bundles do not serve
          // data file in the karma server.
          path: 'random_esmodule.js'
        },
        tabName: 'Bar',
        removeDom: false,
        disableReload: false
      }
    }
  };
  beforeEach(async () => {
    const initialState = createState(createPluginsState({...init}));
    await TestBed.configureTestingModule({
      providers: [provideMockStore({initialState}), PluginsContainer],
      declarations: [PluginsContainer, PluginsComponent]
      // imports: [DebuggerModule]
    }).compileComponents();
    store = TestBed.get(Store);
  });
  describe('plugin DOM creation', () => {
    function setActivePlugin(active: PluginId) {
      store.setState(createState(createPluginsState({...init, active})));
    }
    it('creates no plugin when there is no activePlugin', () => {
      const c = TestBed.createComponent(PluginsContainer);
      const el = c.debugElement.query(By.css('.plugins'));
      expect(el.nativeElement.childElementCount).toBe(0);
    });
    it('creates an element for CUSTOM_ELEMENT type of plugin', async () => {
      const c = TestBed.createComponent(PluginsContainer);
      c.detectChanges();
      setActivePlugin('bar');
      c.detectChanges();
      await c.whenStable();
      const {nativeElement} = c.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const e = nativeElement.children[0];
      expect(e.tagName).toBe('TB-BAR');
      expect(e.id).toBe('bar');
    });
    it('creates an element for IFRAME type of plugin', async () => {
      const c = TestBed.createComponent(PluginsContainer);
      c.detectChanges();
      setActivePlugin('foo');
      c.detectChanges();
      await c.whenStable();
      const {nativeElement} = c.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const e = nativeElement.children[0];
      expect(e.tagName).toBe('IFRAME');
      expect(e.id).toBe('foo');
      expect(e.src).toContain('data/plugin_entry.html?name=foo');
    });
    it('keeps instance of plugin after being inactive but hides it', async () => {
      const c = TestBed.createComponent(PluginsContainer);
      c.detectChanges();
      setActivePlugin('foo');
      c.detectChanges();
      await c.whenStable();
      expect(
        c.debugElement.query(By.css('.plugins')).nativeElement.childElementCount
      ).toBe(1);
      setActivePlugin('bar');
      c.detectChanges();
      await c.whenStable();
      const {nativeElement} = c.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(2);
      const [fooElement, barElement] = nativeElement.children;
      expect(fooElement.id).toBe('foo');
      expect(fooElement.style.display).toBe('none');
      expect(barElement.id).toBe('bar');
      expect(barElement.style.display).not.toBe('none');
    });
    it('does not create same instance of plugin', async () => {
      const c = TestBed.createComponent(PluginsContainer);
      c.detectChanges();
      setActivePlugin('foo');
      c.detectChanges();
      await c.whenStable();
      setActivePlugin('bar');
      c.detectChanges();
      await c.whenStable();
      setActivePlugin('foo');
      c.detectChanges();
      await c.whenStable();
      const {nativeElement} = c.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(2);
      const [fooElement, barElement] = nativeElement.children;
      expect(fooElement.id).toBe('foo');
      expect(fooElement.style.display).not.toBe('none');
    });
  });

  describe('updates', () => {
    function setLastLoadedTime(timeLast?: number, state = LoadedCode.LOADED) {
      store.setState(
        createState(
          createPluginsState({
            ...init,
            active: 'bar',
            loaded: {state, timeLast}
          })
        )
      );
    }
    it('invokes reload method on the dashboard DOM', () => {
      const c = TestBed.createComponent(PluginsContainer);
      setLastLoadedTime(null, undefined);
      c.detectChanges();
      const {nativeElement} = c.debugElement.query(By.css('.plugins'));
      const [barElement] = nativeElement.children;
      const reload = jasmine.createSpy();
      barElement.reload = reload;
      setLastLoadedTime(1);
      c.detectChanges();
      expect(reload).toHaveBeenCalledTimes(1);
      setLastLoadedTime(1);
      c.detectChanges();
      expect(reload).toHaveBeenCalledTimes(1);
      setLastLoadedTime(2);
      c.detectChanges();
      expect(reload).toHaveBeenCalledTimes(2);
    });
  });
});
