import fs from 'fs';
import glob from 'glob';
import htmlEncode from 'htmlencode';
import htmlparser from 'htmlparser2';
import _ from 'lodash';
import mkdirp from 'mkdirp-promise';
import path from 'path';
import url from 'url';

import {Doc} from '..';

export function aliasMap() {
  const map = new Map<string, any>();
  return {
    addDoc(doc: Doc) {
      if (!doc.aliases) return;
      for (const a of doc.aliases) {
        const ds = map.get(a) || [];
        ds.push(doc);
        map.set(a, ds);
      }
    },
    removeDoc(doc: Doc) {
      if (!doc.aliases) return;
      for (const a of doc.aliases) {
        const ds = map.get(a);
        if (ds) {
          const index = ds.indexOf(doc);
          if (index !== -1) {
            ds.splice(index, 1);
          }
        }
      }
    },
    getDocs(alias: string) {
      return map.get(alias) || [];
    }
  };
}

export function createDocMessage() {
  return (msg: string, doc: Doc, err: {stack: string}) => {
    msg = msg || '';
    if (doc) {
      msg += ' - doc';
      const d = doc.id || doc.name || doc.path;
      if (d) {
        msg += ' "' + d + '"';
      }
      if (doc.docType) {
        msg += ' (' + doc.docType + ') ';
      }
      const p = doc.fileInfo && doc.fileInfo.relativePath;
      if (p) {
        msg += ' - from file "' + p + '"';
        if (doc.startingLine) {
          msg += ' - starting at line ' + doc.startingLine;
        }
        if (doc.endingLine) {
          msg += ', ending at line ' + doc.endingLine;
        }
      }
    }
    if (err) {
      msg += `\n\nOriginal Error: \n\n ${err.stack}`;
    }
    return msg;
  };
}

export function encodeCodeBlock() {
  return (str: string, inline: any, lang: string) => {
    str = htmlEncode(str, true);
    lang = lang ? ' class="lang-' + lang + '"' : '';
    str = '<code' + lang + '>' + str + '</code>';
    if (!inline) {
      str = '<pre>' + str + '</pre>';
    }
    return str;
  };
}

export function extractLinks() {
  return (html: string) => {
    const res = {hrefs: [] as string[], names: [] as string[]};
    const parser = new htmlparser.Parser(
      {
        onopentag(name, attribs) {
          if (name === 'a') {
            if (attribs.href) {
              res.hrefs.push(attribs.href);
            }
            if (attribs.name) {
              res.names.push(attribs.name);
            }
          }
          if (attribs.id) {
            res.names.push(attribs.id);
          }
        }
      },
      {
        decodeEntities: true
      }
    );
    parser.write(html);
    parser.end();
    return res;
  };
}

export function resolveUrl() {
  return (currentPath: any, newPath: string, base: string) => {
    const parsedUrl = url.parse(newPath);
    parsedUrl.search = undefined;
    newPath = url.format(parsedUrl);
    if (base && newPath.charAt(0) !== '/') {
      newPath = path.resolve(base, newPath).replace(/^(\w:)?\//, '');
    } else {
      newPath = url.resolve(currentPath || '', newPath);
    }
    return newPath;
  };
}

export function templateFinder(
  log: {
    silly: (arg0: string, arg1: string) => void;
    debug: (arg0: string) => void;
  },
  createDocMessage: (arg0: string, arg1: any) => string | undefined
) {
  return {
    templateFolders: [],
    templatePatterns: [],
    getFinder() {
      const templateSets = this.templateFolders.map(f => {
        return {
          templateFolder: f,
          templates: _.keyBy(glob.sync('**/*', {cwd: f}))
        };
      });

      const patternMatchers = this.templatePatterns.map(p => {
        return _.template(p, {variable: 'doc'});
      });

      return function findTemplate(doc: Doc) {
        let templatePath;
        templateSets.some(s => {
          return patternMatchers.some(p => {
            log.silly('looking for ', p(doc));
            templatePath = s.templates[p(doc)];
            if (templatePath) {
              log.debug(
                `template found ${path.resolve(s.templateFolder, templatePath)}`
              );
              return true;
            }
            return false;
          });
        });
        if (!templatePath) {
          throw new Error(
            createDocMessage(
              'No template found./n' +
                'The following template patterns were tried:\n' +
                _.reduce(
                  patternMatchers,
                  (str, pattern) => {
                    return str + '  "' + pattern(doc) + '"\n';
                  },
                  ''
                ) +
                'The following folders were searched:\n' +
                _.reduce(
                  templateSets,
                  (str, templateSet) => {
                    return str + '  "' + templateSet.templateFolder + '"\n';
                  },
                  ''
                ),
              doc
            )
          );
        }
        return templatePath;
      };
    }
  };
}

const isEmpty = RegExp.prototype.test.bind(/^\s*$/);

function calcIndent(text: string) {
  const MAX_INDENT = 9999;
  let indent = MAX_INDENT;
  const ls = text.split('\n');
  let removed = false;
  while (isEmpty(ls[0])) {
    ls.shift();
    removed = true;
  }
  if (ls.length) {
    const ignored = ls[0][0] !== ' ' && ls.length > 1;
    if (ignored && !removed) {
      ls.shift();
    }
    ls.forEach(l => {
      if (!isEmpty(l)) {
        indent = Math.min(indent, l.match(/^\s*/)![0].length);
      }
    });
  }
  return indent;
}

function reindent(text: string, indent: number) {
  const ls = text.split('\n');
  const ils: string[] = [];
  const pre = new Array(indent + 1).join(' ');
  ls.forEach(l => {
    ils.push(pre + l);
  });
  return ils.join('\n');
}

function trimIndent(text: string, indent: string | number) {
  const ls = text.split('\n');
  const regex = new RegExp('^\\s{0,' + indent + '}');
  for (let i = 0; i < ls.length; i++) {
    ls[i] = ls[i].replace(regex, '');
  }
  while (isEmpty(ls[0])) {
    ls.shift();
  }
  while (isEmpty(ls[ls.length - 1])) {
    ls.pop();
  }
  return ls.join('\n');
}

export function trimIndentation() {
  const impl = (text: string) => {
    return trimIndent(text, calcIndent(text));
  };
  impl.calcIndent = calcIndent;
  impl.trimIndent = trimIndent;
  impl.reindent = reindent;
  return impl;
}

export function writeFile() {
  return (name: string, data: any) => {
    return mkdirp(path.dirname(name)).then(() => {
      return new Promise((res, rej) => {
        fs.writeFile(name, data, err => {
          if (err) {
            rej(err);
          }
          res();
        });
      });
    });
  };
}
