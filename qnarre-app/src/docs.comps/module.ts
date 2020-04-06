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
import {ReloaderComponent} from './reloader.component';
import {ButtonComponent} from './button.component';
import {SettingsComponent} from './settings.component';
import {DtComponent} from './dt.component';
import {FooterComponent} from '../app/footer';
import {ModeBannerComponent} from './mode-banner.component';
import {NotificationComponent} from './notification.component';
import {TopMenuComponent} from '../app/top';
import {ViewerComponent} from './viewer.component';

@NgModule({
  declarations: [
    ButtonComponent,
    DtComponent,
    FooterComponent,
    HeaderComponent,
    HeaderContainer,
    ModeBannerComponent,
    NotificationComponent,
    ReloaderComponent,
    SettingsComponent,
    TopMenuComponent,
    ViewerComponent
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
    FooterComponent,
    HeaderComponent,
    HeaderContainer,
    ModeBannerComponent,
    NavItemComponent,
    NavMenuComponent,
    NotificationComponent,
    ReloaderComponent,
    SettingsComponent,
    TopMenuComponent,
    ViewerComponent
  ],
  entryComponents: [SettingsComponent],
  providers: []
})
export class ComponentsModule {}
