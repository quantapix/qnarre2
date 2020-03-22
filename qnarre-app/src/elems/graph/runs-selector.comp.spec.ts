import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {RunsSelectorComponent} from './runs-selector.component';

describe('RunsSelectorComponent', () => {
  let component: RunsSelectorComponent;
  let fixture: ComponentFixture<RunsSelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RunsSelectorComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RunsSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
