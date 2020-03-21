import StringMap from "stringmap";

export function getTypeClass() {
  return typeStr => {
    let typeClass = typeStr.toLowerCase().match(/^[-\w]+/) || [];
    typeClass = typeClass[0] ? typeClass[0] : "object";
    return "label type-hint type-hint-" + typeClass;
  };
}

export function moduleMap() {
  return new StringMap();
}
