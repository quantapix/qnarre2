import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatSnackBarModule} from '@angular/material/snack-bar';

import {CodeComponent} from './code.component';
import {CopierService} from './copier.service';
import {PrettifyService} from './prettify.service';

@NgModule({
  imports: [CommonModule, MatSnackBarModule],
  declarations: [CodeComponent],
  entryComponents: [CodeComponent],
  providers: [CopierService, PrettifyService],
  exports: [CodeComponent]
})
export class CodeModule {}
