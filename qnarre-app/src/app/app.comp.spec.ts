import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {AppComp, PageNotFoundComp} from './app.comp';

describe('AppComp', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComp]
    }).compileComponents();
  }));
  it('should create the app', () => {
    const f = TestBed.createComponent(AppComp);
    const a = f.componentInstance;
    expect(a).toBeTruthy();
  });
  it(`should have as title 'qnarre-app'`, () => {
    const f = TestBed.createComponent(AppComp);
    const a = f.componentInstance;
    expect(a.title).toEqual('qnarre-app');
  });
  it('should render title', () => {
    const f = TestBed.createComponent(AppComp);
    f.detectChanges();
    const c = f.nativeElement;
    expect(c.querySelector('.content span').textContent).toContain(
      'qnarre-app app is running!'
    );
  });
});

describe('PageNotFoundComp', () => {
  let c: PageNotFoundComp;
  let f: ComponentFixture<PageNotFoundComp>;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PageNotFoundComp]
    }).compileComponents();
  }));
  beforeEach(() => {
    f = TestBed.createComponent(PageNotFoundComp);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
