const updateGrammar = require('../../../build/npm/update-grammar');

function removeDom(grammar) {
  grammar.repository['support-objects'].patterns = grammar.repository[
    'support-objects'
  ].patterns.filter((pattern) => {
    if (
      pattern.match &&
      pattern.match.match(/\b(HTMLElement|ATTRIBUTE_NODE|stopImmediatePropagation)\b/g)
    ) {
      return false;
    }
    return true;
  });
  return grammar;
}

function removeNodeTypes(grammar) {
  grammar.repository['support-objects'].patterns = grammar.repository[
    'support-objects'
  ].patterns.filter((pattern) => {
    if (pattern.name) {
      if (
        pattern.name.startsWith('support.variable.object.node') ||
        pattern.name.startsWith('support.class.node.')
      ) {
        return false;
      }
    }
    if (pattern.captures) {
      if (
        Object.values(pattern.captures).some(
          (capture) =>
            capture.name && capture.name.startsWith('support.variable.object.process')
        )
      ) {
        return false;
      }
    }
    return true;
  });
  return grammar;
}

function patchJsdoctype(grammar) {
  grammar.repository['jsdoctype'].patterns = grammar.repository[
    'jsdoctype'
  ].patterns.filter((pattern) => {
    if (pattern.name && pattern.name.indexOf('illegal') >= -1) {
      return false;
    }
    return true;
  });
  return grammar;
}

function patchGrammar(grammar) {
  return removeNodeTypes(removeDom(patchJsdoctype(grammar)));
}

function adaptToJavaScript(grammar, replacementScope) {
  grammar.name = 'JavaScript (with React support)';
  grammar.fileTypes = ['.js', '.jsx', '.es6', '.mjs', '.cjs'];
  grammar.scopeName = `source${replacementScope}`;

  const fixScopeNames = function (rule) {
    if (typeof rule.name === 'string') {
      rule.name = rule.name.replace(/\.tsx/g, replacementScope);
    }
    if (typeof rule.contentName === 'string') {
      rule.contentName = rule.contentName.replace(/\.tsx/g, replacementScope);
    }
    for (const property in rule) {
      const value = rule[property];
      if (typeof value === 'object') {
        fixScopeNames(value);
      }
    }
  };

  const repository = grammar.repository;
  for (const key in repository) {
    fixScopeNames(repository[key]);
  }
}

const tsGrammarRepo = 'Microsoft/TypeScript-TmLanguage';
updateGrammar.update(
  tsGrammarRepo,
  'TypeScript.tmLanguage',
  './syntaxes/TypeScript.tmLanguage.json',
  (grammar) => patchGrammar(grammar)
);
updateGrammar.update(
  tsGrammarRepo,
  'TypeScriptReact.tmLanguage',
  './syntaxes/TypeScriptReact.tmLanguage.json',
  (grammar) => patchGrammar(grammar)
);
updateGrammar.update(
  tsGrammarRepo,
  'TypeScriptReact.tmLanguage',
  '../javascript/syntaxes/JavaScript.tmLanguage.json',
  (grammar) => adaptToJavaScript(patchGrammar(grammar), '.js')
);
updateGrammar.update(
  tsGrammarRepo,
  'TypeScriptReact.tmLanguage',
  '../javascript/syntaxes/JavaScriptReact.tmLanguage.json',
  (grammar) => adaptToJavaScript(patchGrammar(grammar), '.js.jsx')
);
