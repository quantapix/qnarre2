import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DebuggerCardComponent} from '../debugger-card.component';

describe('DebuggerCardComponent', () => {
  let component: DebuggerCardComponent;
  let fixture: ComponentFixture<DebuggerCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DebuggerCardComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DebuggerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
