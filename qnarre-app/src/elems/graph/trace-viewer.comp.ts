import {Component, OnInit} from '@angular/core';

const ZOOM_RATIO = 8;
const PRESERVE_RATIO = 2;
const FETCH_RATIO = 3;

interface Range {
  min: number;
  max: number;
}

function expand(range: Range, scale: number): Range {
  const width = range.max - range.min;
  const mid = range.min + width / 2;
  return {
    min: mid - (scale * width) / 2,
    max: mid + (scale * width) / 2
  };
}

function within(range: Range, bounds: Range): boolean {
  return bounds.min <= range.min && range.max <= bounds.max;
}

function length(range: Range): number {
  return range.max - range.min;
}

function intersect(range: Range, bounds: Range): Range {
  return {
    min: Math.max(range.min, bounds.min),
    max: Math.min(range.max, bounds.max)
  };
}

@Component({
  selector: 'qnr-trace-viewer',
  templateUrl: './trace-viewer.comp.html',
  styleUrls: ['./trace-viewer.comp.scss']
})
export class TraceViewerComponent implements OnInit {
  traceDataUrl?: string;
  _traceData: any; // observer: '_traceDataChanged';
  _traceViewer: any;
  _traceContainer: any;
  _traceModel: any;
  _throbber: any;
  _isStreaming = false;
  _loadedRange: any;
  _loadedTraceEvents: any;
  _fullBounds: any;
  _isLoading = false;
  _dirty = false;
  _model: any;
  _resolution = 1000;

  constructor() {}

  ngOnInit() {
    this._traceContainer = document.createElement('track-view-container');
    this._traceContainer.id = 'track_view_container';
    this._traceViewer = document.createElement('tr-ui-timeline-view');
    this._traceViewer.track_view_container = this._traceContainer;
    this._traceViewer.appendChild(this._traceContainer);
    this._traceViewer.id = 'trace-viewer';
    this._traceViewer.globalMode = true;
    this._throbber = document.createElement('div');
    this._throbber.id = 'throbber';
    this._throbber.appendChild(document.createTextNode('↻'));
    Polymer.dom(this.root).appendChild(this._traceViewer);
    Polymer.dom(this.root).appendChild(this._throbber);
    const querystring = window.location.href.split('?')[1];
    if (querystring) {
      const parts = querystring.split('&');
      for (let i = 0; i < parts.length; i++) {
        const components = parts[i].split('=');
        if (components[0] == 'trace_data_url') {
          this.traceDataUrl = decodeURIComponent(components[1]);
        } else if (components[0] == 'is_streaming') {
          this._isStreaming = components[1] === 'true';
        }
      }
    }
    if (!this.traceDataUrl) {
      this._displayOverlay('Trace data URL is not provided.', 'Trace Viewer');
      return null;
    }
    this._loadTrace();
  }

  _loadTrace(requestedRange?, replaceModel?) {
    this._throbber.className = 'active';
    if (!this._isStreaming) {
      const req = new XMLHttpRequest();
      req.open('GET', this.traceDataUrl, true);
      req.onreadystatechange = _event => {
        if (req.readyState !== 4) {
          return;
        }
        window.setTimeout(() => {
          if (req.status === 200) {
            this._throbber.className = 'inactive';
            this.set('_traceData', req.responseText);
          } else {
            this._displayOverlay(req.status, 'Failed to fetch data');
          }
        }, 0);
      };
      req.send(null);
    } else {
      this._loadStreamingTrace(requestedRange, replaceModel);
    }
  }

  _maybeLoad() {
    if (this._isLoading || this._resolution == 0) return;
    // We have several ranges of interest:
    //             [viewport]           - what's on-screen
    //         [----preserve----]       - issue loads to keep this full of data
    //     [---------fetch----------]   - fetch this much data with each load
    // [-----------full bounds--------] - the whole profile
    const viewport = this._trackViewRange(this._traceViewer.trackView);
    const preserve = intersect(
      expand(viewport, PRESERVE_RATIO),
      this._fullBounds
    );
    const fetch = expand(viewport, FETCH_RATIO);
    const zoomFactor = length(this._loadedRange) / length(fetch);
    if (!within(preserve, this._loadedRange) || zoomFactor > ZOOM_RATIO) {
      this._loadTrace(fetch, /*replaceModel=*/ false);
    }
  }

  _loadStreamingTrace(requestedRange, replaceModel) {
    const success = true;
    this._isLoading = true;
    this._loadJSON(requestedRange)
      .then(data => {
        this._updateModel(data, replaceModel);
      })
      .then(() => {
        this._updateView(requestedRange);
      })
      .catch(err => {
        this._displayOverlay('Trace Viewer', err);
      })
      .then(() => {
        this._isLoading = false;
        this._throbber.className = 'inactive';
        if (success && requestedRange) this._maybeLoad();
      });
  }

  _loadJSON(requestedRange) {
    const requestURL = this._buildBaseURL();
    requestURL.searchParams.set('resolution', this._resolution * ZOOM_RATIO);
    if (requestedRange != null) {
      requestURL.searchParams.set('start_time_ms', requestedRange.min);
      requestURL.searchParams.set('end_time_ms', requestedRange.max);
    }
    return new Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', requestURL);
      xhr.onload = function() {
        const contentType = this.getResponseHeader('Content-Type');
        if (
          this.status !== 200 ||
          !contentType.startsWith('application/json')
        ) {
          let msg = requestURL + ' could not be loaded';
          if (contentType.startsWith('text/plain')) {
            msg = msg + ': ' + xhr.statusText;
          }
          reject(msg);
        }
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(requestURL + 'could not be loaded: ' + xhr.statusText);
      };
      xhr.send();
    });
  }
  _filterKnownTraceEvents(data) {
    const traceEvents = data.traceEvents;
    data.traceEvents = [];
    for (let i = 0; i < traceEvents.length; i++) {
      const asstring = JSON.stringify(traceEvents[i]);
      if (!this._loadedTraceEvents.has(asstring)) {
        this._loadedTraceEvents.add(asstring);
        data.traceEvents.push(traceEvents[i]);
      }
    }
    return data;
  }

  _updateModel(data, replaceModel) {
    data = JSON.parse(data);
    if (!this._model /* first load */ || replaceModel) {
      this._dirty = true;
      this._model = new tr.Model();
      this._loadedTraceEvents = new Set();
    } else {
      delete data['metadata'];
      delete data['displayTimeUnit'];
    }

    data = this._filterKnownTraceEvents(data);
    if (data.traceEvents.length > 0) {
      const opt = new tr.importer.ImportOptions();
      opt.shiftWorldToZero = false;
      new tr.importer.Import(this._model, opt).importTraces([data]);
      this._dirty = true;
    }
    return Promise.resolve();
  }

  _updateView(requestedRange) {
    if (requestedRange == null) {
      this._fullBounds = {
        min: this._model.bounds.min,
        max: this._model.bounds.max
      };
      this._loadedRange = expand(this._fullBounds, FETCH_RATIO);
    } else {
      this._loadedRange = requestedRange;
    }
    if (!this._dirty) {
      return;
    }
    this._dirty = false;
    window.requestAnimationFrame(
      function() {
        this._traceViewer.model = this._model;
        if (this._traceViewer.trackView != null) {
          this._traceViewer.trackView.viewport.addEventListener('change', () =>
            setTimeout(this._maybeLoad.bind(this), 200)
          );
        }
        this._traceViewer.viewTitle = '';
      }.bind(this)
    );
  }

  _trackViewRange(trackView) {
    const xfm = trackView.viewport.currentDisplayTransform;
    const pixelRatio = window.devicePixelRatio || 1;
    const devicePixelWidth = pixelRatio * trackView.viewWidth_;
    return {
      min: xfm.xViewToWorld(0),
      max: xfm.xViewToWorld(devicePixelWidth)
    };
  }

  _buildBaseURL() {
    const requestURL = new URL(this.traceDataUrl, window.location.href);
    return requestURL;
  }

  _traceDataChanged(data) {
    if (!data) {
      this._displayOverlay('Trace Viewer', 'No trace to display...');
      return;
    }
    this._traceModel = new tr.Model();
    const i = new tr.importer.Import(this._traceModel);
    const p = i.importTracesWithProgressDialog([data]);
    p.then(() => {
      this._traceViewer.model = this._traceModel;
      this._traceViewer.viewTitle = 'Trace View';
    }).catch(err => {
      this._displayOverlay(
        'Import error',
        tr.b.normalizeException(err).message
      );
    });
  }
  _displayOverlay(title, content) {
    const overlay = new tr.ui.b.Overlay();
    overlay.textContent = content;
    overlay.title = title;
    overlay.visible = true;
  }
}
