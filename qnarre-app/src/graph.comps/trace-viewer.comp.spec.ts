import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TraceViewerComp} from './trace-viewer.comp';

describe('TraceViewerComp', () => {
  let component: TraceViewerComp;
  let fixture: ComponentFixture<TraceViewerComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TraceViewerComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TraceViewerComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
