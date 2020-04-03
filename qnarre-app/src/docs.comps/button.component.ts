import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {SettingsComponent} from './settings.component';

@Component({
  selector: 'qnr-settings-button',
  template: `
    <button mat-button (click)="openDialog()">
      <mat-icon>more_vert</mat-icon>
    </button>
  `
})
export class ButtonComponent {
  constructor(private dialog: MatDialog) {}

  openDialog(): void {
    this.dialog.open(SettingsComponent, {width: '400px'});
  }
}
