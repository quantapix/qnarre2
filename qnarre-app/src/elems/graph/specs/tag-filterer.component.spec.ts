import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TagFiltererComponent} from '../tag-filterer.component';

describe('TagFiltererComponent', () => {
  let component: TagFiltererComponent;
  let fixture: ComponentFixture<TagFiltererComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TagFiltererComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TagFiltererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
