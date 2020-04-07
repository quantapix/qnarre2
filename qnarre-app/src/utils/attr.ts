import {ElementRef} from '@angular/core';

export interface AttrMap {
  [key: string]: string;
}

export function getAttrs(el: HTMLElement | ElementRef): AttrMap {
  const attrs: NamedNodeMap =
    el instanceof ElementRef ? el.nativeElement.attributes : el.attributes;
  const attrMap: AttrMap = {};
  for (const attr of (attrs as any) as Attr[] /* cast due to https://github.com/Microsoft/TypeScript/issues/2695 */) {
    attrMap[attr.name.toLowerCase()] = attr.value;
  }
  return attrMap;
}

export function getAttrValue(
  attrs: AttrMap,
  attr: string | string[]
): string | undefined {
  const key =
    typeof attr === 'string'
      ? attr
      : // eslint-disable-next-line no-prototype-builtins
        attr.find(a => attrs.hasOwnProperty(a.toLowerCase()));

  return key === undefined ? undefined : attrs[key.toLowerCase()];
}

export function boolFromValue(attrValue?: string, def = false) {
  return attrValue === undefined ? def : attrValue.trim() !== 'false';
}

export function getBoolFromAttribute(
  el: HTMLElement | ElementRef,
  attr: string | string[],
  def = false
): boolean {
  return boolFromValue(getAttrValue(getAttrs(el), attr), def);
}
