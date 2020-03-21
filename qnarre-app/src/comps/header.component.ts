import {Component, Input, Output, EventEmitter} from '@angular/core';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {MatSelectChange} from '@angular/material/select';

import {PluginId, Plugin} from '../plugins/types';

@Component({
  selector: 'qnr-header-component',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input()
  actives!: Plugin[];

  @Input()
  disableds!: Plugin[];

  @Input()
  selected!: PluginId;

  @Output()
  onPluginChanged = new EventEmitter<PluginId>();

  getActiveIndex() {
    return this.actives.findIndex(({id}) => id === this.selected);
  }

  onActiveChanged({index}: MatTabChangeEvent) {
    this.onPluginChanged.emit(this.actives[index].id);
  }

  onDisabledChanged(e: MatSelectChange) {
    this.onPluginChanged.emit(e.value);
  }
}
