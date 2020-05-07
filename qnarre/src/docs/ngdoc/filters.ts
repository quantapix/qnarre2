export function code(encodeCodeBlock) {
  return {
    name: "code",
    process(str, lang) {
      return encodeCodeBlock(str, true, lang);
    }
  };
}

export function link() {
  return {
    name: "link",
    process(url, title, doc) {
      return _.template("{@link ${url} ${title} }")({ url, title });
    }
  };
}

export function typeClass(getTypeClass) {
  return {
    name: "typeClass",
    process: getTypeClass
  };
}
