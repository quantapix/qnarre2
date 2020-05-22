/* eslint-disable no-useless-escape */
import * as vsc from 'vscode';

import * as qx from '../utils/extras';
import * as ql from '../utils/language';

const jsTs: vsc.LanguageConfiguration = {
  indentationRules: {
    decreaseIndentPattern: /^((?!.*?\/\*).*\*\/)?\s*[\}\]].*$/,
    increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/,
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  onEnterRules: [
    {
      // e.g. /** | */
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      afterText: /^\s*\*\/$/,
      action: { indentAction: vsc.IndentAction.IndentOutdent, appendText: ' * ' },
    },
    {
      // e.g. /** ...|
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      action: { indentAction: vsc.IndentAction.None, appendText: ' * ' },
    },
    {
      // e.g.  * ...|
      beforeText: /^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
      oneLineAboveText: /^(\s*(\/\*\*|\*)).*/,
      action: { indentAction: vsc.IndentAction.None, appendText: '* ' },
    },
    {
      // e.g.  */|
      beforeText: /^(\t|[ ])*[ ]\*\/\s*$/,
      action: { indentAction: vsc.IndentAction.None, removeText: 1 },
    },
    {
      // e.g.  *-----*/|
      beforeText: /^(\t|[ ])*[ ]\*[^/]*\*\/\s*$/,
      action: { indentAction: vsc.IndentAction.None, removeText: 1 },
    },
    {
      beforeText: /^\s*(\bcase\s.+:|\bdefault:)$/,
      afterText: /^(?!\s*(\bcase\b|\bdefault\b))/,
      action: { indentAction: vsc.IndentAction.Indent },
    },
  ],
};

const EMPTY_ELEMS: string[] = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'menuitem',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
];

const jsxTags: vsc.LanguageConfiguration = {
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
  onEnterRules: [
    {
      beforeText: new RegExp(
        `<(?!(?:${EMPTY_ELEMS.join('|')}))([_:\\w][_:\\w\\-.\\d]*)([^/>]*(?!/)>)[^<]*$`,
        'i'
      ),
      afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
      action: { indentAction: vsc.IndentAction.IndentOutdent },
    },
    {
      beforeText: new RegExp(
        `<(?!(?:${EMPTY_ELEMS.join('|')}))([_:\\w][_:\\w\\-.\\d]*)([^/>]*(?!/)>)[^<]*$`,
        'i'
      ),
      action: { indentAction: vsc.IndentAction.Indent },
    },
    {
      beforeText: /^>$/,
      afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
      action: { indentAction: vsc.IndentAction.IndentOutdent },
    },
    {
      beforeText: /^>$/,
      action: { indentAction: vsc.IndentAction.Indent },
    },
  ],
};

export class Languages extends qx.Disposable {
  constructor() {
    super();
    const ls = [ql.javascript, ql.javascriptreact, ql.typescript, ql.typescriptreact];
    for (const l of ls) {
      this.registerConfig(l, jsTs);
    }
    this.registerConfig(ql.jsxTags, jsxTags);
  }

  private registerConfig(l: string, c: vsc.LanguageConfiguration) {
    this.register(vsc.languages.setLanguageConfiguration(l, c));
  }
}
