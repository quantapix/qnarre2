import {Component, Input} from '@angular/core';

import {NavNode, VersionInfo} from '../services/nav';

@Component({
  selector: 'qnr-footer',
  templateUrl: 'footer.component.html'
})
export class FooterComponent {
  @Input() nodes: NavNode[];
  @Input() versionInfo: VersionInfo;
}
