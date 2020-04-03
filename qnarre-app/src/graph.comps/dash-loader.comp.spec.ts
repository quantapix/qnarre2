import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DashLoaderComp} from './dash-loader.comp';

describe('DashLoaderComp', () => {
  let component: DashLoaderComp;
  let fixture: ComponentFixture<DashLoaderComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DashLoaderComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashLoaderComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
