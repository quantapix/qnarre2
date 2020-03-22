import {Component, OnInit} from '@angular/core';
import * as util from '../../graph/scene/util';

@Component({
  selector: 'qnr-card-heading',
  templateUrl: './templates/card-heading.component.html',
  styleUrls: ['./styles/card-heading.component.scss']
})
export class CardHeadingComponent implements OnInit {
  color?: string;
  displayName?: string;
  tag?: string;
  run?: string;
  description?: string;
  _runBackground: string; // readOnly, observer: _updateHeadingStyle
  _runColor: string; // readOnly, observer: _updateHeadingStyle
  _nameLabel: string;
  _tagLabel: string;

  ngOnInit() {
    this._runBackground = this.color || 'none';
    this._runColor = util.pickTextColor(this.color);
    this._nameLabel = this.displayName || this.tag || '';
    this._tagLabel = this.tag && this.tag !== this.displayName ? this.tag : '';
  }

  _updateHeadingStyle() {
    this.updateStyles({
      '--tf-card-heading-background-color': this._runBackground,
      '--tf-card-heading-color': this._runColor
    });
  }

  _toggleDescriptionDialog(e) {
    this.$.descriptionDialog.positionTarget = e.target;
    this.$.descriptionDialog.toggle();
  }
}
