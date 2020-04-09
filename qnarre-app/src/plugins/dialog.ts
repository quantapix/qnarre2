import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-plugin-dialog',
  template: `<template is="dom-if" if="[[_open]]">
      <div id="dashboard-backdrop"></div>
    </template>
    <paper-dialog
      id="dialog"
      modal
      opened="{{ _open }}"
      with-backdrop="[[_useNativeBackdrop]]"
    >
      <h2 id="dialog-title">[[_title]]</h2>
      <div class="custom-message">[[_customMessage]]</div>
    </paper-dialog> `,
  styles: [
    `
      #dashboard-backdrop {
        background: rgba(0, 0, 0, 0.6);
        width: 100%;
        height: 100%;
      }
      #dialog-title {
        padding-bottom: 15px;
      }
      .custom-message {
        margin-top: 0;
        margin-bottom: 15px;
      }
    `
  ]
})
export class PluginDialogComp implements OnInit {
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
