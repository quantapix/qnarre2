let StringMap = require("stringmap");
const jsParserImpl = require("espree");

export function codeNameMap() {
  return new StringMap();
}

export function codeNameService(log, codeNameMap, getInjectables) {
  const REMOVE_SUFFIX_REGEX = /NodeMatcher$/;

  function registerCodeNameMatcher(list) {
    list.forEach(v => {
      if (v && v.name) {
        codeNameMap.set(v.name.replace(REMOVE_SUFFIX_REGEX, ""), v);
      } else {
        log.warn("Anonymous matchers are not supported", v);
      }
    });
  }

  function findCodeName(node) {
    let res = null;
    if (node) {
      const matcher = codeNameMap.get(node.type);
      if (matcher) {
        res = matcher(node);
      } else {
        log.warn("HELP! Unrecognised node type: %s", node.type);
        log.warn(node);
      }
    }
    return res;
  }

  const api = {
    find: findCodeName
  };

  Object.defineProperty(api, "matchers", {
    set: registerCodeNameMatcher
  });

  return api;
}

module.exports = function jsParser() {
  return code => {
    return jsParserImpl.parse(code, {
      range: true,
      loc: true,
      comments: true,
      attachComment: true,
      tokens: true,
      tolerant: true,
      ecmaFeatures: {
        arrowFunctions: true,
        blockBindings: true,
        destructuring: true,
        regexYFlag: true,
        regexUFlag: true,
        templateStrings: true,
        binaryLiterals: true,
        octalLiterals: true,
        unicodeCodePointEscapes: true,
        defaultParams: true,
        restParams: true,
        forOf: true,
        objectLiteralComputedProperties: true,
        objectLiteralShorthandMethods: true,
        objectLiteralShorthandProperties: true,
        objectLiteralDuplicateProperties: true,
        generators: true,
        spread: true,
        superInFunctions: true,
        classes: true,
        modules: true,
        jsx: true,
        globalReturn: true
      }
    });
  };
};
