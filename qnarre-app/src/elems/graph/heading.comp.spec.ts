import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CardHeadingComponent} from './heading.comp';

describe('CardHeadingComponent', () => {
  let component: CardHeadingComponent;
  let fixture: ComponentFixture<CardHeadingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CardHeadingComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CardHeadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
