import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatSnackBarModule} from '@angular/material/snack-bar';

import {CodeComponent} from './code.component';
import {CopierService} from './copier.service';
import {PrettifyService} from '../../services/prettify';

@NgModule({
  imports: [CommonModule, MatSnackBarModule],
  declarations: [CodeComponent],
  entryComponents: [CodeComponent],
  providers: [CopierService, PrettifyService],
  exports: [CodeComponent]
})
export class CodeModule {}
