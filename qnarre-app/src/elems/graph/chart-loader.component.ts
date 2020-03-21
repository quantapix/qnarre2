import {Component, OnInit} from '@angular/core';
import * as color_scale from './color-scale';

@Component({
  selector: 'qnr-chart-loader',
  templateUrl: './templates/chart-loader.component.html',
  styleUrls: ['./styles/chart-loader.component.scss']
})
export class ChartLoaderComponent implements OnInit {
  active: boolean; //  observer: _fixBadStateWhenActive
  dataSeries: Array<any>;
  requestManager: any;
  logScaleActive: boolean; // observer: '_logScaleChanged';
  xComponentsCreationMethod: any;
  xType: string;
  yValueAccessor: any;
  fillArea: any;
  smoothingEnabled: boolean;
  smoothingWeight: number;
  tooltipColumns: Array<any>;
  tooltipSortingMethod: string;
  tooltipPosition: string;
  ignoreYOutliers: boolean;
  defaultXRange: Array<any>;
  defaultYRange: Array<any>;
  symbolFunction: any;
  colorScale = () => {
    scale: color_scale.runsColorScale;
  };
  _resetDomainOnNextLoad = true;
  _maybeRenderedInBadState = false; // reflectToAttribute: true;

  behaviors: [tf_dashboard_common.DataLoaderBehavior];
  observers = ['_dataSeriesChanged(dataSeries.*)', '_loadKeyChanged(loadKey)'];

  constructor() {}

  ngOnInit() {}

  onLoadFinish() {
    if (this.dataToLoad.length > 0 && this._resetDomainOnNextLoad) {
      // (Don't unset _resetDomainOnNextLoad when we didn't
      // load any runs: this has the effect that if all our
      // runs are deselected, then we toggle them all on, we
      // properly size the domain once all the data is loaded
      // instead of just when we're first rendered.)
      this._resetDomainOnNextLoad = false;
      this.$.chart.resetDomain();
    }

    this.redraw();
  }

  detached() {
    cancelAnimationFrame(this._redrawRaf);
  }

  exportAsSvgString() {
    const exporter = this.$.chart.getExporter();
    return exporter.exportAsString();
  }

  resetDomain() {
    const chart = this.$.chart;
    chart.resetDomain();
  }

  setSeriesData(name, data) {
    this.$.chart.setSeriesData(name, data);
  }

  setSeriesMetadata(name, metadata) {
    this.$.chart.setSeriesMetadata(name, metadata);
  }

  redraw() {
    cancelAnimationFrame(this._redrawRaf);
    this._redrawRaf = window.requestAnimationFrame(() => {
      if (this.active) {
        this.$.chart.redraw();
      } else {
        // If we reached a point where we should render while the page
        // is not active, we've gotten into a bad state.
        this._maybeRenderedInBadState = true;
      }
    });
  }

  _loadKeyChanged(_) {
    this.reset();
    this._resetDomainOnNextLoad = true;
  }

  _dataSeriesChanged(_) {
    // Setting visible series redraws the chart.
    this.$.chart.setVisibleSeries(this.dataSeries);
  }

  _logScaleChanged(logScaleActive) {
    const chart = this.$.chart;
    chart.yScaleType = logScaleActive ? 'log' : 'linear';
    this.redraw();
  }

  _fixBadStateWhenActive() {
    // When the chart enters a potentially bad state (because it should
    // redraw, but the page is not currently active), we set the
    // _maybeRenderedInBadState flag. Whenever the chart becomes active,
    // we test this and schedule a redraw of the bad charts.
    if (this.active && this._maybeRenderedInBadState) {
      redrawQueue.push(this);
      cascadingRedraw();
    }
  }

  _onChartAttached() {
    if (!this.active) {
      this._maybeRenderedInBadState = true;
    }
  }
}

function cascade() {
  // The chart can sometimes get in a bad state, when it redraws while
  // it is display: none due to the user having switched to a different
  // page. This code implements a cascading queue to redraw the bad charts
  // one-by-one once they are active again.
  // We use a cascading queue becuase we don't want to block the UI / make the
  // ripples very slow while everything synchronously redraws.
  const redrawQueue = [];
  const cascadingRedraw = () => {
    let redrawRaf = 0;
    return _.throttle(function internalRedraw() {
      if (redrawQueue.length == 0) return;
      const x = redrawQueue.shift();
      if (x.active) {
        x.redraw();
        x._maybeRenderedInBadState = false;
      }
      window.cancelAnimationFrame(redrawRaf);
      window.requestAnimationFrame(internalRedraw);
    }, 100);
  };
}
