import path from 'path';

import {Doc} from '..';

function _parseCodeName(name: string) {
  const ps: {name: string; modifier?: string}[] = [];
  let part: {name: string; modifier?: string};
  name.split('.').forEach(p => {
    const sub = p.split(':');
    const n = sub.pop()!;
    const m = sub.pop();
    if (!m && part) {
      part.name += `.${n}`;
    } else {
      part = {
        name: n,
        modifier: m
      };
      ps.push(part);
    }
  });
  return ps;
}

export function getAliases() {
  return (doc: Doc) => {
    let aliases = [];
    const parts = _parseCodeName(doc.id!);
    let method;
    const part = parts.pop()!;
    if (part.name.indexOf('#') !== -1) {
      method = part.name.split('#')[1];
    }
    aliases.push(part.name);
    if (part.modifier) {
      aliases.push(part.modifier + ':' + part.name);
    }
    aliases = parts.reduceRight((as, p) => {
      for (const n of as) {
        as.push(`${p.name}.${n}`);
        if (p.modifier) {
          as.push(`${p.modifier}:${p.name}.${n}`);
        }
      }
      return as;
    }, aliases);
    if (method) {
      aliases.push(method);
    }
    return aliases;
  };
}

export function getDocFromAlias(map, _log) {
  return (alias: string, orig: {area: any; module: any}) => {
    let ds = map.getDocs(alias) as Doc[];
    if (ds.length > 1 && orig && orig.area) {
      ds = ds.filter(d => {
        return d.area === orig.area;
      });
    }
    if (ds.length === 0) {
      ds = map.getDocs(alias);
    }
    if (ds.length > 1 && orig && orig.module) {
      ds = ds.filter(d => {
        return d.module === orig.module;
      });
    }
    return ds;
  };
}

export function getLinkInfo(getDocFromAlias, encodeCodeBlock, log) {
  return function impl(url: string, title: string, doc: Doc) {
    let info = {
      url,
      type: 'url',
      valid: true,
      title: title || url,
      error: '',
      errorType: ''
    };
    if (!url) {
      throw new Error('Invalid url');
    }
    const ds = getDocFromAlias(url, doc);
    if (!impl.useFirstAmbiguousLink && ds.length > 1) {
      info.valid = false;
      info.errorType = 'ambiguous';
      info.error =
        'Ambiguous link: "' +
        url +
        '".\n' +
        ds.reduce((msg: string, doc: Doc) => {
          return (
            msg +
            '\n  "' +
            doc.id +
            '" (' +
            doc.docType +
            ') : (' +
            doc.path +
            ' / ' +
            doc.fileInfo.relativePath +
            ')'
          );
        }, 'Matching docs: ');
    } else if (ds.length >= 1) {
      info.url = ds[0].path;
      info.title = title || encodeCodeBlock(ds[0].name, true);
      info.type = 'doc';
      if (impl.relativeLinks && doc && doc.path) {
        const c = path.dirname(doc.path);
        const d = path.dirname(info.url);
        const r = path.relative(path.join('/', c), path.join('/', d));
        info.url = path.join(r, path.basename(info.url));
        log.debug(doc.path, ds[0].path, info.url);
      }
    } else if (url.indexOf('#') > 0) {
      const p = url.split('#');
      info = impl(p[0], title, doc);
      info.url = `${info.url}#${p[1]}`;
      return info;
    } else if (url.indexOf('/') === -1 && url.indexOf('#') !== 0) {
      info.valid = false;
      info.errorType = 'missing';
      info.error = `Invalid link (does not match any doc): ${url}`;
    } else {
      info.title =
        title ||
        (url.indexOf('#') === 0
          ? url.substring(1)
          : path.basename(`${url}.html`));
    }
    return info;
  };
}
