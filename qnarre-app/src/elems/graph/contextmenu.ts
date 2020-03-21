import {TfGraphScene} from './graph_scene';

export interface TitleFunction {
  (data: any): string;
}

export interface ActionFunction {
  (elem: any, d: any, i: number): void;
}

export interface ContextMenuItem {
  title: TitleFunction;
  action: ActionFunction;
}

function getOffset(sceneElement) {
  let leftDistance = 0;
  let topDistance = 0;
  let currentElement = sceneElement;
  while (
    currentElement &&
    currentElement.offsetLeft >= 0 &&
    currentElement.offsetTop >= 0
  ) {
    leftDistance += currentElement.offsetLeft - currentElement.scrollLeft;
    topDistance += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent;
  }
  return {
    left: leftDistance,
    top: topDistance
  };
}

export function getMenu(sceneElement: TfGraphScene, menu: ContextMenuItem[]) {
  const menuNode = sceneElement.getContextMenu();
  const menuSelection = d3.select(sceneElement.getContextMenu());
  return function(data, index: number) {
    const event = <MouseEvent>d3.event;
    const sceneOffset = getOffset(sceneElement);
    menuSelection
      .style('display', 'block')
      .style('left', event.clientX - sceneOffset.left + 1 + 'px')
      .style('top', event.clientY - sceneOffset.top + 1 + 'px');
    event.preventDefault();
    event.stopPropagation();
    function maybeCloseMenu(event?: any) {
      if (event && event.composedPath().includes(menuNode)) {
        return;
      }
      menuSelection.style('display', 'none');
      document.body.removeEventListener('mousedown', maybeCloseMenu, {
        capture: true
      });
    }
    document.body.addEventListener('mousedown', maybeCloseMenu, {
      capture: true
    });
    menuSelection.html('');
    const list = menuSelection.append('ul');
    list
      .selectAll('li')
      .data(menu)
      .enter()
      .append('li')
      .on('click', d => {
        d.action(this, data, index);
        maybeCloseMenu();
      })
      .html(function(d) {
        return d.title(data);
      });
  };
}
