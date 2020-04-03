import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DashComp} from './dash.comp';

describe('DashComp', () => {
  let component: DashComp;
  let fixture: ComponentFixture<DashComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DashComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
