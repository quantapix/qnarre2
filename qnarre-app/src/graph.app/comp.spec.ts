import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AppComp} from './comp';

describe('AppComp', () => {
  let c: AppComp;
  let f: ComponentFixture<AppComp>;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AppComp]
    }).compileComponents();
  }));
  beforeEach(() => {
    f = TestBed.createComponent(AppComp);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
