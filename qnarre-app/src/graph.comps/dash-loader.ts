import {Component, OnInit} from '@angular/core';

import * as backend from '../graph/backend';
import * as qc from '../graph/compat';
import * as qg from '../graph/graph';
import * as qh from '../graph/hierarchy';
import * as ql from '../graph/loader';
import * as qp from '../graph/params';
import * as qs from '../graph/slim';
import * as qt from '../graph/types';
import * as qu from '../graph/utils';

@Component({
  selector: 'qnr-graph-dash-loader',
  template: '',
  styleUrls: []
})
export class DashLoaderComp implements OnInit {
  hierPs = () => qp.HierPs;
  compat = () => new qc.TpuCompat();

  _slim?: qs.Slim;
  get slim() {
    return this._slim!;
  }
  set slim(s: qs.Slim) {
    this._slim = s;
  }

  _hier?: qh.Hierarchy;
  get hier() {
    return this._hier!;
  }
  set hier(h: qh.Hierarchy) {
    this._hier = h;
  }

  _stats?: qu.Stats;
  get stats() {
    return this._stats!;
  }
  set stats(s: qu.Stats | undefined) {
    this._stats = s;
  }

  selection: any;
  selectedFile: any;

  datasets: Array<{name: string; path: string; tags: string}>;
  progress: {value: number; msg: string}; // notify
  _graphRunTag: any;

  observers: [
    '_selectionChanged(selection, compat)',
    '_selectedFileChanged(selectedFile, compat)'
  ];

  constructor() {}

  ngOnInit() {}

  async _load(selection: qg.controls.Selection): Promise<void> {
    const {run, tag, type: selectionType} = selection;
    switch (selectionType) {
      case qt.SelectT.OPER:
      case qt.SelectT.CONCEPT: {
        this.stats = undefined;
        const params = new URLSearchParams();
        params.set('run', run);
        params.set('conceptual', String(selectionType === qt.SelectT.CONCEPT));
        if (tag) params.set('tag', tag);
        const graphPath = backend
          .getRouter()
          .pluginRoute('graphs', '/graph', params);
        await this._loadHierGraph(graphPath);
        this._graphRunTag = {run, tag};
      }
      case qt.SelectT.PROFILE: {
        const {tags} = this.datasets.find(({name}) => name === run)!;
        const tagMeta = tags.find(t => t.tag === tag);
        const requiredOpGraphTag = tagMeta.opGraph ? tag : null;
        console.assert(
          tags.find(t => t.tag === requiredOpGraphTag),
          `Required tag (${requiredOpGraphTag}) is missing.`
        );
        const shouldFetchGraph =
          !this._graphRunTag ||
          this._graphRunTag.run !== run ||
          this._graphRunTag.tag !== requiredOpGraphTag;
        const maybeFetchGraphPromise = shouldFetchGraph
          ? this._load({
              run,
              tag: requiredOpGraphTag,
              type: qt.SelectT.OPER
            })
          : Promise.resolve();
        const params = new URLSearchParams();
        params.set('tag', tag);
        params.set('run', run);
        const metadataPath = backend
          .getRouter()
          .pluginRoute('graphs', '/run_metadata', params);
        await maybeFetchGraphPromise;
        return this._loadMeta(metadataPath);
      }
      default:
        return Promise.reject(
          new Error(`Unknown selection type: ${selectionType}`)
        );
    }
  }

  _selectionChanged() {
    this.debounce('selectionchange', () => {
      this._load(this.selection);
    });
  }

  _selectedFileChanged(e?: Event) {
    if (e) {
      const t = e.target as HTMLInputElement;
      const f = t.files?.[0];
      if (f) {
        t.value = '';
        this._loadHierGraph(undefined, f);
      }
    }
  }

  async _loadMeta(path: string) {
    this.set('progress', {
      value: 0,
      msg: ''
    });
    const t = qu.tracker(this);
    await ql.loadMeta(t, path).then(s => (this.stats = s));
  }

  async _loadHierGraph(path?: string, b?: Blob) {
    this.set('progress', {
      value: 0,
      msg: ''
    });
    const t = qu.tracker(this);
    const {slim, hier} = await ql.loadHierGraph(
      t,
      path,
      b,
      this.compat(),
      this.hierPs()
    );
    this.slim = slim;
    this.hier = hier;
  }
}
