import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NodeIconComponent} from './node-icon.comp';

describe('NodeIconComponent', () => {
  let component: NodeIconComponent;
  let fixture: ComponentFixture<NodeIconComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NodeIconComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
