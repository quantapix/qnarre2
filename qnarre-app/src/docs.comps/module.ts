import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';

import {HeaderContainer} from './header.container';
import {HeaderComponent} from './header.component';
import {ReloaderComponent} from './reloader';
import {ButtonComponent} from './button';
import {SettingsComponent} from './settings';
import {DtComponent} from './dt.component';
import {ModeBannerComponent} from './banner';
import {NotificationComp} from './notification';
import {ViewerComp} from './viewer';

@NgModule({
  declarations: [
    ButtonComponent,
    DtComponent,
    HeaderComponent,
    HeaderContainer,
    ModeBannerComponent,
    NotificationComp,
    ReloaderComponent,
    SettingsComponent,
    ViewerComp
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatToolbarModule,
    ReactiveFormsModule
  ],
  exports: [
    ButtonComponent,
    DtComponent,
    HeaderComponent,
    HeaderContainer,
    ModeBannerComponent,
    NotificationComp,
    ReloaderComponent,
    SettingsComponent,
    ViewerComp
  ],
  entryComponents: [SettingsComponent],
  providers: []
})
export class ComponentsModule {}
