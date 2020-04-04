import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DebugCardComp} from './debug-card';

describe('DebugCardComp', () => {
  let component: DebugCardComp;
  let fixture: ComponentFixture<DebugCardComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DebugCardComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DebugCardComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
