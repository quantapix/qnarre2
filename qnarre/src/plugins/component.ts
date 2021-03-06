import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import {Plugin} from './plugins';
import {LoadingCode, ElementLoading} from '../app/types';

@Component({
  selector: 'qnr-plugins-comp',
  template: `
    <div
      #pluginContainer
      class="plugins"
      [ngSwitch]="activePlugin?.loading.type"
    >
      <ng-container
        *ngSwitchCase="LoadingCode.COMPONENT"
        [ngSwitch]="activePlugin?.id"
      ></ng-container>
    </div>
  `,
  styles: [
    '.plugins { height: 100%; }',
    'iframe { border: 0; height: 100%; width: 100%; }'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginsComp implements OnChanges {
  @ViewChild('pluginContainer', {static: true, read: ElementRef})
  private readonly container!: ElementRef<HTMLDivElement>;

  @Input()
  activePlugin?: Plugin;

  @Input()
  lastUpdated?: number;

  readonly LoadingCode = LoadingCode;
  private readonly instances = new Map<string, HTMLElement>();

  ngOnChanges(cs: SimpleChanges): void {
    if (cs['activePlugin'] && this.activePlugin) {
      this.render(this.activePlugin);
    }
    if (cs['lastUpdated']) {
      this.reload();
    }
  }

  private render(plugin: Plugin) {
    for (const e of this.instances.values()) {
      e.style.display = 'none';
    }
    if (this.instances.has(plugin.id)) {
      const e = this.instances.get(plugin.id);
      e.style.removeProperty('display');
    } else {
      const e = this.create(plugin);
      if (e) {
        e.id = plugin.id;
        this.instances.set(plugin.id, e);
      }
    }
  }

  private create(plugin: Plugin): HTMLElement | undefined {
    if (plugin.loading != undefined) {
      switch (plugin.loading.type) {
        case LoadingCode.ELEMENT: {
          const p = plugin.loading;
          const e = document.createElement(p.name);
          this.container.nativeElement.appendChild(e);
          return e;
        }
        case LoadingCode.IFRAME: {
          const e = document.createElement('iframe');
          e.id = plugin.id;
          e.setAttribute('src', `data/plugin_entry.html?name=${plugin.id}`);
          this.container.nativeElement.appendChild(e);
          return e;
        }
        case LoadingCode.COMPONENT:
          break;
        default:
          console.error('Unexpected plugin');
      }
    }
    return undefined;
  }

  private reload() {
    for (const i of this.instances.values()) {
      const a = i as any;
      if (a.reload) {
        a.reload();
      }
    }
  }
}
