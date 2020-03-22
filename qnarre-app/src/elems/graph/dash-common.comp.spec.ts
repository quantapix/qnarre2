import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DashboardCommonComponent} from './dashboard-common.component';

describe('DashboardCommonComponent', () => {
  let component: DashboardCommonComponent;
  let fixture: ComponentFixture<DashboardCommonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardCommonComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardCommonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
