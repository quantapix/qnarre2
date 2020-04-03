import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {RunsSelectorComp} from './runs-selector.comp';

describe('RunsSelectorComp', () => {
  let component: RunsSelectorComp;
  let fixture: ComponentFixture<RunsSelectorComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RunsSelectorComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RunsSelectorComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
