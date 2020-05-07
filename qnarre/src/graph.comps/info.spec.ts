import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {InfoComp} from './info';

describe('InfoComp', () => {
  let component: InfoComp;
  let fixture: ComponentFixture<InfoComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [InfoComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
