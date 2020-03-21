import fs from "fs";
import glob from "glob";
import _ from "lodash";
import { Minimatch } from "minimatch";
import path from "path";
import { encode } from "urlencode";
import util from "util";

import { Doc, Template } from "../package";

export interface FileInfo {
  fileReader: string;
  filePath: string;
  baseName: string;
  extension: string;
  basePath: string;
  relativePath: string;
  projectRelativePath: string;
  content: any;
}

export interface FileReader {
  name: string;
  defaultPattern?: RegExp;
  getDocs(info: FileInfo): Doc[];
}

export function createFileInfo(
  file: string,
  content: any,
  sourceInfo: SourceInfo,
  fileReader: FileReader,
  basePath: string
): FileInfo {
  const info = {
    fileReader: fileReader.name,
    filePath: file,
    baseName: path.basename(file, path.extname(file)),
    extension: path.extname(file).replace(/^\./, ""),
    basePath: sourceInfo.basePath!,
    relativePath: path.relative(sourceInfo.basePath!, file),
    projectRelativePath: path.relative(basePath, file),
    content
  };
  return info;
}

export interface SourceInfo {
  include: string[];
  exclude: string[];
  basePath?: string;
  fileReader?: FileReader;
}

function _normalizeInfo(base: string, info: string | SourceInfo): SourceInfo {
  if (typeof info === "string") {
    info = { include: [info] } as SourceInfo;
  }
  if (!Array.isArray(info.include)) {
    info.include = [info.include];
  }
  info.exclude = info.exclude || [];
  if (!Array.isArray(info.exclude)) {
    info.exclude = [info.exclude];
  }
  info.basePath = path.resolve(base, info.basePath || ".");
  info.include = info.include.map(x => {
    return path.resolve(base, x);
  });
  info.exclude = info.exclude.map(x => {
    return path.resolve(base, x);
  });
  return info;
}

async function _getSources(info: SourceInfo) {
  const xs = info.exclude.map(p => {
    return new Minimatch(p);
  });
  const ms = info.include.map(p => {
    return _matchFiles(p);
  });
  let srcs = (await Promise.all(ms)).flat();
  srcs = await Promise.all(
    srcs.map(async s => {
      if (
        xs.some(x => {
          return x.match(s);
        })
      ) {
        return "";
      } else {
        return _isFile(s) ? s : "";
      }
    })
  );
  return srcs.filter(s => {
    return s !== "";
  });
}

function _isFile(name: string) {
  return new Promise<boolean>((res, rej) => {
    fs.stat(name, (err, stat) => {
      if (err) {
        rej(err);
      }
      res(stat.isFile());
    });
  });
}

function _matchFiles(pattern: string) {
  return new Promise<string[]>((res, rej) => {
    glob(pattern, (err, matches) => {
      if (err) {
        rej(err);
      }
      res(matches);
    });
  });
}

export function readFilesProc(log: { debug: (arg0: string) => void }) {
  return {
    $validate: {
      basePath: { presence: true },
      sourceFiles: { presence: true },
      fileReaders: { presence: true }
    },
    $runAfter: ["reading-files"],
    $runBefore: ["files-read"],
    basePath: "",
    sourceFiles: [] as string[],
    fileReaders: [] as FileReader[],
    async $process(_: Doc[]) {
      const ps: Promise<Doc[]>[] = [];
      const map = _readerMap(this.fileReaders);
      this.sourceFiles.map(async s => {
        const si = _normalizeInfo(this.basePath, s);
        log.debug(`Source info:\n ${si}`);
        const ss = await _getSources(si);
        log.debug(`Found ${ss.length} sources:\n ${ss}`);
        for (const s of ss) {
          const p = _readFile(s).then(data => {
            const r =
              typeof si.fileReader !== "undefined"
                ? map.get(si.fileReader.name)!
                : _matchReader(this.fileReaders, s);
            log.debug(`Reading content\nPath: ${s}\nFile Reader: ${r.name}`);
            const fi = createFileInfo(s, data, si, r, this.basePath);
            const ds = r.getDocs(fi);
            for (const d of ds) {
              d.fileInfo = fi;
            }
            return ds;
          });
          ps.push(p);
        }
      });
      return (await Promise.all(ps)).flat();
    }
  };
}

function _readerMap(readers: FileReader[]) {
  const m = new Map<string, FileReader>();
  for (const r of readers) {
    m[r.name] = r;
  }
  return m;
}

function _matchReader(readers: FileReader[], name: string) {
  const r = readers.find(r => {
    return !r.defaultPattern || r.defaultPattern.test(name);
  });
  if (!r) {
    throw new Error(`No file reader found for ${name}`);
  }
  return r;
}

function _readFile(name: string) {
  return new Promise<string>((res, rej) => {
    fs.readFile(name, "utf-8", (err, data) => {
      if (err) {
        rej(err);
      }
      res(data);
    });
  });
}

export function writeFilesProc(
  log: { debug: (arg0: string) => void; silly: (arg0: string) => void },
  readFilesProc: { basePath: string },
  writeFile: (arg0: string, arg1: any) => Promise<any>
) {
  return {
    outputFolder: undefined,
    $validate: {
      outputFolder: { presence: true }
    },
    $runAfter: ["writing-files"],
    $runBefore: ["files-written"],
    async $process(docs: Doc[]) {
      await Promise.all(
        docs.map(async d => {
          if (!d.outputPath) {
            throw new Error(`Document ${d.id}, ${d.docType} has no outputPath`);
          } else {
            const o = path.resolve(
              readFilesProc.basePath,
              this.outputFolder!,
              d.outputPath
            );
            log.silly(`writing file ${o}`);
            await writeFile(o, d.renderedContent);
            log.debug(`written file ${o}`);
            return o;
          }
        })
      );
      return docs;
    }
  };
}

export function computeIdsProc(
  log: { warn: (arg0: any) => void; debug: (arg0: string) => void },
  aliasMap: { addDoc: (arg0: Doc) => void },
  message: (arg0: string) => string | undefined
) {
  return {
    $runAfter: ["computing-ids"],
    $runBefore: ["ids-computed"],
    $validate: {
      idTemplates: { presence: true }
    },
    idTemplates: [] as Template[],
    $process(docs: Doc[]) {
      const is = new Map<string, any>();
      const as = new Map<string, any>();
      for (const t of this.idTemplates) {
        if (t.docTypes) {
          for (const d of t.docTypes) {
            if (t.getId) {
              is.set(d, t.getId);
            } else if (t.idTemplate) {
              is.set(d, _.template(t.idTemplate));
            }
            if (t.getAliases) {
              as.set(d, t.getAliases);
            }
          }
        }
      }
      for (const d of docs) {
        try {
          if (!d.id) {
            const i = is.get(d.docType!);
            if (!i) {
              log.warn(message(`No idTemplate or getId(doc) method ${d}`));
            } else {
              d.id = i(d);
            }
          }
          if (!d.aliases) {
            const a = as.get(d.docType!);
            if (!a) {
              log.warn(message(`No getAlias(doc) method ${d}`));
            } else {
              d.aliases = a(d);
            }
          }
          aliasMap.addDoc(d);
        } catch (e) {
          throw new Error(
            message(`Failed to compute ids/aliases for ${d} ${e}`)
          );
        }
        log.debug(`computed id for: "${d.id}" (${d.docType})`);
      }
    }
  };
}

export function computePathsProc(
  log: { warn: (arg0: any) => void; debug: (arg0: any) => void },
  message: (arg0: string) => string | undefined
) {
  return {
    $validate: {
      pathTemplates: { presence: true }
    },
    pathTemplates: [] as Template[],
    $runAfter: ["computing-paths"],
    $runBefore: ["paths-computed"],
    $process(docs: Doc[]) {
      const ps = new Map<string, any>();
      const os = new Map<string, any>();
      for (const t of this.pathTemplates) {
        if (t.docTypes) {
          for (const d of t.docTypes) {
            if (t.getPath) {
              ps[d] = t.getPath;
            } else if (t.pathTemplate) {
              ps[d] = _.template(t.pathTemplate);
            }
            if (t.getOutputPath) {
              os[d] = t.getOutputPath;
            } else if (t.outputPathTemplate) {
              os[d] = _.template(t.outputPathTemplate);
            }
          }
        }
      }
      for (const d of docs) {
        try {
          if (!d.path) {
            const p = ps[d.docType!];
            if (!p) {
              log.warn(message(`No path template ${d}`));
            } else {
              d.path = p(d);
            }
          }
          if (!d.outputPath) {
            const o = os[d.docType!];
            if (!o) {
              log.warn(message(`No output path template ${d}`));
            } else {
              d.outputPath = o(d);
            }
          }
        } catch (e) {
          throw new Error(message(`Failed to compute paths for ${d} ${e}`));
        }
        log.debug(message(`path: ${d.path}; outputPath: ${d.outputPath} ${d}`));
      }
    }
  };
}

export function unescapeCommentsProc() {
  return {
    $runAfter: ["docs-rendered"],
    $runBefore: ["writing-files"],
    $process(docs: Doc[]) {
      for (const d of docs) {
        d.renderedContent = d.renderedContent
          .replace(/\/&amp;#42;/g, "/*")
          .replace(/&amp;#42;\//g, "*/");
      }
    }
  };
}

export function checkAnchorLinksProc(
  log: { silly: (x: string, y: any) => void; warn: (x: string) => void },
  resolveUrl: (
    arg0: undefined,
    arg1: string | undefined,
    arg2: undefined
  ) => string,
  extractLinks: (arg0: any) => any
) {
  return {
    ignoredLinks: [/^http(?:s)?:\/\//, /^mailto:/, /^chrome:/],
    pathVariants: ["", "/", ".html", "/index.html"],
    checkDoc(doc: Doc) {
      return (
        doc.path && doc.outputPath && path.extname(doc.outputPath) === ".html"
      );
    },
    base: undefined,
    webRoot: "/",
    errorOnUnmatchedLinks: false,
    $validate: {
      ignoredLinks: { presence: true },
      pathVariants: { presence: true },
      webRoot: { presence: true }
    },
    $runAfter: ["writing-files"],
    $runBefore: ["files-written"],
    $process(docs: Doc[]) {
      const lnks = [];
      const refs = {};
      for (const d of docs) {
        if (this.checkDoc(d)) {
          const p = path.join(
            this.webRoot,
            resolveUrl(this.base, d.path, this.base)
          );
          const li = extractLinks(d.renderedContent);
          li.path = p;
          li.outputPath = d.outputPath;
          lnks.push(li);
          for (const v of this.pathVariants) {
            const pv = p + v;
            refs[pv] = true;
            refs[pv + "#"] = true;
            for (const n of li.names) {
              refs[pv + "#" + n] = true;
            }
          }
        }
      }
      let count = 0;
      for (const li of lnks) {
        log.silly("checking file", li);
        const unmatched: any[] = [];
        li.hrefs
          .filter((h: string) => this.ignoredLinks.every(r => !r.test(h)))
          .forEach((l: any) => {
            const p = path.join(
              this.webRoot,
              resolveUrl(li.path, encode.decode(l), this.base)
            );
            if (!this.pathVariants.some(v => refs[p + v])) {
              unmatched.push(l);
            }
          });
        if (unmatched.length) {
          count += unmatched.length;
          log.warn(
            `Dangling links found in ${li.outputPath}: ${unmatched.map(
              l => "\n - " + l
            )}`
          );
        }
      }
      if (count) {
        const m = `${count} unmatched links`;
        if (this.errorOnUnmatchedLinks) {
          throw new Error(m);
        } else {
          log.warn(m);
        }
      }
    }
  };
}

export function renderDocsProc(
  log: { debug: (arg0: string | Partial<Doc>) => void },
  templateFinder: { getFinder: () => any },
  templateEngine: { getRenderer: () => any },
  createDocMessage: (arg0: string) => string | undefined
) {
  return {
    helpers: {},
    extraData: {},
    $runAfter: ["rendering-docs"],
    $runBefore: ["docs-rendered"],
    $validate: {
      helpers: {},
      extraData: {}
    },
    $process: function process(docs: Doc[]) {
      const render = templateEngine.getRenderer();
      const findTemplate = templateFinder.getFinder();
      for (const d of docs) {
        log.debug(`Rendering doc: ${d.id || d.name || d.path}`);
        try {
          const data = _.defaults(
            { doc: d, docs },
            this.extraData,
            this.helpers
          );
          const templateFile = findTemplate(data.doc);
          d.renderedContent = render(templateFile, data);
        } catch (ex) {
          log.debug(
            _.omit(d, [
              "content",
              "moduleDoc",
              "components",
              "serviceDoc",
              "providerDoc"
            ])
          );
          throw new Error(createDocMessage(`Failed to render ${d} ${ex}`));
        }
      }
    }
  };
}

export function debugDumpProc(
  log: { info: (x: string) => void },
  readFilesProc: { basePath: string },
  writeFile: (x: string, y: string) => Promise<any>
) {
  return {
    filterFn(docs: Doc[]) {
      return docs;
    },
    outputPath: "debug-dump.txt",
    depth: 2,
    $enabled: false,
    $validate: {
      filterFn: { presence: true },
      outputPath: { presence: true },
      depth: { presence: true }
    },
    $runBefore: ["writing-files"],
    async $process(docs: Doc[]) {
      log.info(`Dumping docs: ${this.filterFn} ${this.outputPath}`);
      const ds = util.inspect(this.filterFn(docs), undefined, this.depth);
      const p = path.resolve(readFilesProc.basePath, this.outputPath);
      await writeFile(p, ds);
      return docs;
    }
  };
}
