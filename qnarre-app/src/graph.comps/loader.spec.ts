import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {LoaderComp} from './loader';

describe('LoaderComp', () => {
  let component: LoaderComp;
  let fixture: ComponentFixture<LoaderComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LoaderComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoaderComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
