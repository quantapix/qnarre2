import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MarkdownViewComp} from './md-view.comp';

describe('MarkdownViewComp', () => {
  let component: MarkdownViewComp;
  let fixture: ComponentFixture<MarkdownViewComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MarkdownViewComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkdownViewComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
