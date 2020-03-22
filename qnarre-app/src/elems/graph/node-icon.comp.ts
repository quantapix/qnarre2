import {Component, OnInit} from '@angular/core';
import * as q_graph from '../../graph/scene/graph';
import * as render from '../../graph/scene/render';
import * as q_node from '../../graph/scene/node';
import * as icon from './icon.comp';

@Component({
  selector: 'qnr-node-icon',
  template: `
    <qnr-graph-icon
      id="icon"
      type="[[_getType(node, summary, const, type)]]"
      height="[[height]]"
      fill-override="[[_fillOverride]]"
      stroke-override="[[_getStrokeOverride(_fillOverride)]]"
      faded="[[_getFaded(renderInfo)]]"
      vertical="[[_isVertical(node, vertical)]]"
    ></qnr-graph-icon>
  `,
  styles: [
    `
      qnr-graph-icon {
        --tb-graph-faded: var(--tb-graph-faded);
      }
    `
  ]
})
export class NodeIconComponent implements OnInit {
  node?: q_graph.Node;
  renderInfo?: render.Ndata;
  colorBy = 'structural';
  templateIndex?: Function;
  type?: string;
  vertical = false;
  const = false;
  summary = false;
  fill?: string;
  height = 20;
  _fillOverride: string; // computed: '_computeFillOverride(node, renderInfo, colorBy, templateIndex, fill)', observer: '_onFillOverrideChanged';

  constructor() {}

  ngOnInit() {}

  _computeFillOverride(
    inputNode,
    inputRenderInfo,
    inputColorBy,
    inputTemplateIndex,
    inputFill
  ) {
    if (inputNode && inputRenderInfo && inputColorBy && inputTemplateIndex) {
      const colorBy = q_node.ColorBy[inputColorBy.toUpperCase()];
      return q_node.getFillForNode(
        inputTemplateIndex,
        colorBy,
        inputRenderInfo,
        false
      );
    }
    return inputFill;
  }

  _getStrokeOverride(fillOverride) {
    return fillOverride ? q_node.getStrokeForFill(fillOverride) : null;
  }

  _getType(inputNode, isSummary, isConst, inputType) {
    const {GraphIconType} = icon;
    if (inputNode) {
      switch (inputNode.type) {
        case q_graph.NodeType.OP: {
          const opName = inputNode.op;
          if (typeof opName !== 'string') return GraphIconType.OP;
          if (opName === 'Const' || isConst) return GraphIconType.CONST;
          if (opName.endsWith('Summary') || isSummary) {
            return GraphIconType.SUMMARY;
          }
          return GraphIconType.OP;
        }
        case q_graph.NodeType.META:
          return GraphIconType.META;
        case q_graph.NodeType.SERIES:
          return GraphIconType.SERIES;
      }
    }
    return inputType;
  }

  _isVertical(inputNode, inputVertical) {
    if (inputNode) {
      return inputNode.noControlEdges;
    }
    return !!inputVertical;
  }

  _getFaded(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut;
  }

  _onFillOverrideChanged(newFill, oldFill) {
    const {node, renderInfo, colorBy, templateIndex} = this;
    if (newFill !== oldFill) {
      q_node.removeGradientDefinitions(this.$.icon.getSvgDefinableElement());
    }
    if (node && renderInfo && colorBy && templateIndex) {
      const nsColorBy = q_node.ColorBy[colorBy.toUpperCase()];
      q_node.getFillForNode(
        templateIndex,
        nsColorBy,
        renderInfo,
        false,
        this.$.icon.getSvgDefinableElement()
      );
    }
  }
}
