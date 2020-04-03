import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CardHeadingComp} from './heading.comp';

describe('CardHeadingComp', () => {
  let component: CardHeadingComp;
  let fixture: ComponentFixture<CardHeadingComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CardHeadingComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CardHeadingComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
