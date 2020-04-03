import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PluginDialogComponent} from './plugin-dialog.comp';

describe('PluginDialogComponent', () => {
  let component: PluginDialogComponent;
  let fixture: ComponentFixture<PluginDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PluginDialogComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PluginDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
