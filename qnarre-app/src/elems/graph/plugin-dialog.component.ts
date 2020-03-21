import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-plugin-dialog',
  templateUrl: './templates/plugin-dialog.component.html',
  styleUrls: ['./styles/plugin-dialog.component.scss']
})
export class PluginDialogComponent implements OnInit {
  _title?: string;
  _customMessage?: string;
  _open: boolean;
  _hidden: boolean; // computed: '_computeHidden(_open)'; reflectToAttribute: true;
  _useNativeBackdrop = false; // readOnly

  constructor() {}

  ngOnInit() {}

  openNoTensorFlowDialog() {
    this.openDialog(
      'This plugin is disabled without TensorFlow',
      'To enable this plugin in TensorBoard, install TensorFlow with ' +
        '"pip install tensorflow" or equivalent.'
    );
  }

  openOldTensorFlowDialog(version) {
    this.openDialog(
      'This plugin is disabled without TensorFlow ' + version,
      'To enable this plugin in TensorBoard, install TensorFlow ' +
        version +
        ' or greater with "pip install tensorflow" or equivalent.'
    );
  }

  openDialog(title, message) {
    this.set('_title', title);
    this.set('_customMessage', message);
    this.$.dialog.open();
  }

  closeDialog() {
    this.$.dialog.close();
  }

  _computeHidden(open) {
    return !open;
  }
}
