import {Component, OnInit} from '@angular/core';
import * as render from './render';
import * as scene from './scene';

@Component({
  selector: 'qnr-graph-debugger-card',
  templateUrl: './templates/debugger-card.component.html',
  styleUrls: ['./styles/debugger-card.component.scss']
})
export class DebuggerCardComponent implements OnInit {
  debuggerNumericAlerts: any; // notify
  nodeNamesToHealths: any;
  healthPillStepIndex: number; // notify
  specificHealthStep = 0; // notify
  selectedNode: string; // notify
  highlightedNode: string; // notify
  selectedNodeInclude: number; // notify
  areHealthsLoading: boolean;
  healthPillEntries = scene.healthPillEntries; // readOnly
  healthPillValuesForSelectedNode: any; // computed: '_computeHealthForNode(nodeNamesToHealths, healthPillStepIndex, selectedNode, allStepsModeEnabled, areHealthsLoading)';
  allStepsModeEnabled: boolean; // notify
  _biggestStepEverSeen: number; // computed: '_computeBiggestStepEverSeen(nodeNamesToHealths)';
  _maxStepIndex: number; // computed: '_computeMaxStepIndex(nodeNamesToHealths)';
  _currentStepDisplayValue: string; // computed: '_computeCurrentStepDisplayValue(nodeNamesToHealths, healthPillStepIndex, allStepsModeEnabled, specificHealthStep, areHealthsLoading)';

  observers: ['_updateAlertsList(debuggerNumericAlerts)'];

  constructor() {}

  ngOnInit() {}

  ready() {
    const mainContainer = document.getElementById('mainContainer');
    const scrollbarContainer = document.querySelector(
      'qnr-dashboard-layout .scrollbar'
    );
    if (mainContainer && scrollbarContainer) {
      // If this component is being used inside of TensorBoard's dashboard layout, it may easily
      // cause the dashboard layout element to overflow, giving the user 2 scroll bars. Prevent
      // that by hiding whatever content overflows - the user will have to expand the viewport to
      // use this debugging card.
      mainContainer.style.overflow = 'hidden';
      scrollbarContainer.style.overflow = 'hidden';
    }
  }

  _healthPillsAvailable(debuggerDataEnabled, nodeNamesToHealths) {
    // So long as there is a mapping (even if empty) from node name to health pills, show the
    // legend and slider. We do that because, even if no health pills exist at the current step,
    // the user may desire to change steps, and the slider must show for the user to do that.
    return debuggerDataEnabled && nodeNamesToHealths;
  }

  _computeTensorCountString(healthPillValuesForSelectedNode, valueIndex) {
    if (!healthPillValuesForSelectedNode) {
      // No health pill data is available.
      return '';
    }

    return healthPillValuesForSelectedNode[valueIndex].toFixed(0);
  }

  _computeHealthForNode(
    nodeNamesToHealths,
    healthPillStepIndex,
    selectedNode,
    allStepsModeEnabled,
    areHealthsLoading
  ) {
    if (areHealthsLoading) {
      // Health pills are loading. Do not render data that is out of date.
      return null;
    }

    if (!selectedNode) {
      // No node is selected.
      return null;
    }

    const healthPills = nodeNamesToHealths[selectedNode];
    if (!healthPills) {
      // This node lacks a health pill.
      return null;
    }

    // If all steps mode is enabled, we use the first health pill in the list because the JSON
    // response from the server is a mapping between node name and a list of 1 health pill.
    const healthPill =
      healthPills[allStepsModeEnabled ? 0 : healthPillStepIndex];
    if (!healthPill) {
      // This node lacks a health pill at the current step.
      return null;
    }

    // The health pill count values start at 2. Each health pill contains 6 values.
    return healthPill.value.slice(2, 8);
  }

  _computeCurrentStepDisplayValue(
    nodeNamesToHealths,
    healthPillStepIndex,
    allStepsModeEnabled,
    specificHealthStep,
    areHealthsLoading
  ) {
    if (allStepsModeEnabled) {
      // The user seeks health pills for specific step from the server.
      return specificHealthStep.toFixed(0);
    }

    if (areHealthsLoading) {
      // The current step is undefined.
      return 0;
    }

    for (const nodeName in nodeNamesToHealths) {
      // All nodes have the same number of steps stored, so only examine 1 node. We cannot
      // directly index into the nodeNamesToHealths object because we do not have a key.
      // If all steps mode is enabled, we only have 1 step to show.
      return nodeNamesToHealths[nodeName][healthPillStepIndex].step.toFixed(0);
    }

    // The current step could not be computed.
    return 0;
  }

  _computeBiggestStepEverSeen(nodeNamesToHealths) {
    for (const nodeName in nodeNamesToHealths) {
      // All nodes have the same number of steps stored, so only examine 1 node.
      // The index is 1 less than the count. Tensorboard backend logic guarantees that the length
      // of the array will be greater than 1.
      const healthPills = nodeNamesToHealths[nodeName];
      return Math.max(
        this._biggestStepEverSeen,
        healthPills[healthPills.length - 1].step
      );
    }

    // No steps seen so far. Default to 0.
    return this._biggestStepEverSeen || 0;
  }

  _computeMaxStepIndex(nodeNamesToHealths) {
    for (const nodeName in nodeNamesToHealths) {
      // All nodes have the same number of steps stored, so only examine 1 node.
      // The index is 1 less than the count. Tensorboard backend logic guarantees that the length
      // of the array will be greater than 1.
      return nodeNamesToHealths[nodeName].length - 1;
    }

    // Return a falsy value. The slider should be hidden.
    return 0;
  }

  _hasDebuggerNumericAlerts(debuggerNumericAlerts) {
    return debuggerNumericAlerts && debuggerNumericAlerts.length;
  }

  _updateAlertsList(debuggerNumericAlerts) {
    const alertBody = this.$$('#numeric-alerts-body');
    if (!alertBody) {
      return;
    }

    alertBody.innerHTML = '';

    for (let i = 0; i < debuggerNumericAlerts.length; i++) {
      const alert = debuggerNumericAlerts[i];
      const tableRow = document.createElement('tr');

      const timestampTd = document.createElement('td');
      timestampTd.innerHTML = tf.graph.util.convertTime(alert.first_timestamp);
      timestampTd.classList.add('first-offense-td');
      tableRow.appendChild(timestampTd);

      const tensorDeviceTd = document.createElement('td');
      tensorDeviceTd.classList.add('tensor-device-td');

      const tensorSection = document.createElement('div');
      tensorSection.classList.add('tensor-section-within-table');
      tensorSection.innerHTML = alert.tensor_name;
      this._addOpExpansionListener(tensorSection, alert.tensor_name);
      tensorDeviceTd.appendChild(tensorSection);

      const deviceSection = document.createElement('div');
      deviceSection.classList.add('device-section-within-table');
      deviceSection.innerHTML = '(' + alert.device_name + ')';
      tensorDeviceTd.appendChild(deviceSection);
      tableRow.appendChild(tensorDeviceTd);

      const miniHealth = document.createElement('div');
      miniHealth.classList.add('mini-health-pill');

      const miniHealthTd = document.createElement('td');
      miniHealthTd.classList.add('mini-health-pill-td');
      miniHealthTd.appendChild(miniHealth);
      tableRow.appendChild(miniHealthTd);

      if (alert.neg_inf_event_count) {
        const negativeInfCountSection = document.createElement('div');
        negativeInfCountSection.classList.add(
          'negative-inf-mini-health-pill-section'
        );
        negativeInfCountSection.innerHTML = alert.neg_inf_event_count;
        negativeInfCountSection.setAttribute(
          'title',
          alert.neg_inf_event_count + ' events with -∞'
        );
        miniHealth.appendChild(negativeInfCountSection);
      }

      if (alert.pos_inf_event_count) {
        const positiveInfCountSection = document.createElement('div');
        positiveInfCountSection.classList.add(
          'positive-inf-mini-health-pill-section'
        );
        positiveInfCountSection.innerHTML = alert.pos_inf_event_count;
        positiveInfCountSection.setAttribute(
          'title',
          alert.pos_inf_event_count + ' events with +∞'
        );
        miniHealth.appendChild(positiveInfCountSection);
      }

      if (alert.nan_event_count) {
        const nanCountSection = document.createElement('div');
        nanCountSection.classList.add('nan-mini-health-pill-section');
        nanCountSection.innerHTML = alert.nan_event_count;
        nanCountSection.setAttribute(
          'title',
          alert.nan_event_count + ' events with NaN'
        );
        miniHealth.appendChild(nanCountSection);
      }

      Polymer.dom(alertBody).appendChild(tableRow);
    }
  }

  // Adds a listener to an element, so that when that element is clicked, the tensor with
  // tensorName expands.
  _addOpExpansionListener(clickableElement, tensorName) {
    clickableElement.addEventListener('click', () => {
      // When the user clicks on a tensor name, expand all nodes until the user can see the
      // associated node.
      const nameOfNodeToSelect = render.expandUntilNodeIsShown(
        document.getElementById('scene'),
        this.renderHierarchy,
        tensorName
      );

      // Store the current scroll of the graph info card. Node selection alters that scroll, and
      // we restore the scroll later.
      let previousScrollFromBottom;
      const graphInfoCard = document.querySelector('qnr-graph-info#graph-info');
      if (graphInfoCard) {
        previousScrollFromBottom =
          graphInfoCard.scrollHeight - graphInfoCard.scrollTop;
      }

      // Update the selected node within graph logic.
      const previousSelectedNode = this.selectedNode;
      this.set('selectedNode', nameOfNodeToSelect);

      // Scroll the graph info card back down if necessary so that user can see the alerts section
      // again. Selecting the node causes the info card to scroll to the top, which may mean the
      // user no longer sees the list of alerts.
      const scrollToOriginalLocation = () => {
        graphInfoCard.scrollTop =
          graphInfoCard.scrollHeight - previousScrollFromBottom;
      };
      if (graphInfoCard) {
        // This component is used within an info card. Restore the original scroll.
        if (previousSelectedNode) {
          // The card for the selected node has already opened. Immediately restore the scroll.
          scrollToOriginalLocation();
        } else {
          // Give some time for the DOM of the info card to be created before scrolling down.
          window.setTimeout(scrollToOriginalLocation, 20);
        }
      }
    });
  }
}
