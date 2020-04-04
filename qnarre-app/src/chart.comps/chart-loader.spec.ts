import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ChartLoaderComp} from './chart-loader';

describe('ChartLoaderComp', () => {
  let component: ChartLoaderComp;
  let fixture: ComponentFixture<ChartLoaderComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ChartLoaderComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartLoaderComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
