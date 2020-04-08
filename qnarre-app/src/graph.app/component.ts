import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-graph-app',
  templateUrl: './comp.html',
  styleUrls: ['./comp.scss']
})
export class AppComp implements OnInit {
  $ = {} as {loader: any};
  $$ = {} as (_s: string) => any;

  @Input()
  set protoPath(p: string) {
    this._protoPath = p;
    this._updateLoader();
  }
  get protoPath() {
    return this._protoPath ?? '';
  }
  private _protoPath?: string;

  set width(w: number) {
    this._width = w;
    this.$$('.container').style.width = w + 'px';
  }
  get width() {
    return this._width;
  }
  private _width = 0;

  set height(h: number) {
    this._height = h;
    this.$$('.container').style.height = h + 'px';
  }
  get height() {
    return this._height;
  }
  private _height = 0;

  set toolbar(t: boolean) {
    this._toolbar = t;
    this.$$('.container').classList.toggle('no-toolbar', !t);
  }
  get toolbar() {
    return this._toolbar;
  }
  private _toolbar = false;

  set proto(p: string) {
    this._proto = p;
    this._updateLoader();
  }
  get proto() {
    return this._proto ?? '';
  }
  private _proto?: string;

  _progress: any;
  _traceInputs = false;

  constructor() {}

  ngOnInit() {}

  _updateLoader() {
    if (this.protoPath) {
      this.$.loader.datasets = [
        {
          name: this.protoPath,
          path: this.protoPath
        }
      ];
      this.$.loader.set('selectedDataset', 0);
    } else if (this.proto) {
      const b = new Blob([this.proto]);
      this.$.loader._parseAndConstructHierarchicalGraph(null, b);
    }
  }

  _fit() {
    this.$$('#graphboard').fit();
  }
}
