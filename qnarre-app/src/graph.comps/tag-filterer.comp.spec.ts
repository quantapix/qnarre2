import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TagFiltererComp} from './tag-filterer.comp';

describe('TagFiltererComp', () => {
  let component: TagFiltererComp;
  let fixture: ComponentFixture<TagFiltererComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TagFiltererComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TagFiltererComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
