import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CompatCardComp} from './compat-card';

describe('CompatCardComp', () => {
  let component: CompatCardComp;
  let fixture: ComponentFixture<CompatCardComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompatCardComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompatCardComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
