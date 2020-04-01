import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-graph-app',
  templateUrl: './app.comp.html',
  styleUrls: ['./app.comp.scss']
})
export class AppComponent implements OnInit {
  width: number; // observer: _updateWidth
  height: number; // observer: _updateHeight
  toolbar: boolean; // observer: _updateToolbar
  pbtxtFileLocation: string; // observer: _updateGraph
  pbtxt: string; // observer: _updateGraph
  _progress: any;
  _traceInputs: boolean;

  constructor() {}

  ngOnInit() {}

  _updateWidth() {
    this.$$('.container').style.width = this.width + 'px';
  }

  _updateHeight() {
    this.$$('.container').style.height = this.height + 'px';
  }

  _updateToolbar() {
    this.$$('.container').classList.toggle('no-toolbar', !this.toolbar);
  }

  _updateGraph() {
    if (this.pbtxtFileLocation) {
      this.$.loader.datasets = [
        {
          name: this.pbtxtFileLocation,
          path: this.pbtxtFileLocation
        }
      ];
      this.$.loader.set('selectedDataset', 0);
    } else if (this.pbtxt) {
      const blob = new Blob([this.pbtxt]);
      this.$.loader._parseAndConstructHierarchicalGraph(null, blob);
    }
  }

  _fit() {
    this.$$('#graphboard').fit();
  }
}
