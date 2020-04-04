import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSelectModule} from '@angular/material/select';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {changed} from '../app/actions';
import {PluginId, State} from '../app/types';
import {HeaderComponent} from './header.component';
import {HeaderContainer} from './header.container';
import {
  createPluginInfo,
  createState,
  createPluginsState
} from '../plugins/plugins.spec';

describe('header test', () => {
  let store: MockStore<State>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatTabsModule,
        MatToolbarModule,
        NoopAnimationsModule,
        MatSelectModule
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createPluginsState({
              plugins: {
                foo: createPluginInfo('Foo Fighter'),
                bar: createPluginInfo('Barber')
              }
            })
          )
        }),
        HeaderComponent,
        HeaderContainer
      ],
      declarations: [HeaderComponent, HeaderContainer],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    store = TestBed.get(Store);
  });
  function assertDebugElementText(el: DebugElement, text: string) {
    expect(el.nativeElement.innerText.trim().toUpperCase()).toBe(text);
  }
  function setActivePlugin(active: PluginId) {
    store.setState(
      createState(
        createPluginsState({
          plugins: {
            foo: createPluginInfo('Foo Fighter'),
            bar: createPluginInfo('Barber')
          },
          active
        })
      )
    );
  }
  it('renders pluginsList', () => {
    const c = TestBed.createComponent(HeaderContainer);
    c.detectChanges();
    const es = c.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(es.length).toBe(2);
    assertDebugElementText(es[0], 'FOO FIGHTER');
    assertDebugElementText(es[1], 'BARBER');
  });
  it('updates list of tabs when pluginsList updates', async () => {
    const c = TestBed.createComponent(HeaderContainer);
    c.detectChanges();
    const nextState = createState(
      createPluginsState({
        plugins: {
          cat: createPluginInfo('Meow'),
          dog: createPluginInfo('Woof'),
          elephant: createPluginInfo('Trumpet')
        }
      })
    );
    store.setState(nextState);
    c.detectChanges();
    await c.whenStable();
    const es = c.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(es.length).toBe(3);
    assertDebugElementText(es[0], 'MEOW');
    assertDebugElementText(es[1], 'WOOF');
    assertDebugElementText(es[2], 'TRUMPET');
  });
  it('selects 0th element by default', () => {
    const c = TestBed.createComponent(HeaderContainer);
    c.detectChanges();
    const g = c.debugElement.query(By.css('mat-tab-group'));
    expect(g.componentInstance.selectedIndex).toBe(0);
  });
  it('sets tab group selection to match index of activePlugin', async () => {
    const c = TestBed.createComponent(HeaderContainer);
    c.detectChanges();
    setActivePlugin('bar');
    c.detectChanges();
    await c.whenStable();
    const g = c.debugElement.query(By.css('mat-tab-group'));
    expect(g.componentInstance.selectedIndex).toBe(1);
  });
  it('fires an action when a tab is clicked', async () => {
    const dispatch = spyOn(store, 'dispatch');
    const c = TestBed.createComponent(HeaderContainer);
    c.detectChanges();
    const [, bar] = c.debugElement.queryAll(By.css('.mat-tab-label'));
    bar.nativeElement.click();
    c.detectChanges();
    await c.whenStable();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(changed({plugin: 'bar'}));
  });
});
