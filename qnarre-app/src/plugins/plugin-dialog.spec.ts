import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PluginDialogComp} from './plugin-dialog';

describe('PluginDialogComp', () => {
  let component: PluginDialogComp;
  let fixture: ComponentFixture<PluginDialogComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PluginDialogComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PluginDialogComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
