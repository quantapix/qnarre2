import * as vsc from 'vscode';

import * as qu from '.';
import * as qx from './extras';

export const enum Kind {
  Syntax,
  Semantic,
  Suggestion,
}

export const enum Lang {
  JavaScript,
  TypeScript,
}

export const allLangs = [Lang.JavaScript, Lang.TypeScript];

class FileDiags {
  private readonly map = new Map<Kind, ReadonlyArray<vsc.Diagnostic>>();

  constructor(public readonly file: vsc.Uri, public lang: Lang) {}

  update(l: Lang, k: Kind, ds: ReadonlyArray<vsc.Diagnostic>) {
    if (l !== this.lang) {
      this.map.clear();
      this.lang = l;
    }
    const d = this.map.get(k);
    if (qu.deepEquals(d || qu.empty, ds, equals)) return false;
    this.map.set(k, ds);
    return true;
  }

  diagnostics(s: Settings) {
    if (!s.validate(this.lang)) return [];
    return [...this.get(Kind.Syntax), ...this.get(Kind.Semantic), ...this.suggestions(s)];
  }

  private suggestions(s: Settings) {
    const enable = s.suggestions(this.lang);
    return this.get(Kind.Suggestion).filter((d) => {
      if (!enable) return d.tags && d.tags.includes(vsc.DiagnosticTag.Unnecessary);
      return true;
    });
  }

  private get(k: Kind) {
    return this.map.get(k) || [];
  }
}

function equals(a: vsc.Diagnostic, b: vsc.Diagnostic) {
  if (a === b) return true;
  return (
    a.code === b.code &&
    a.message === b.message &&
    a.severity === b.severity &&
    a.source === b.source &&
    a.range.isEqual(b.range) &&
    qu.deepEquals(
      a.relatedInformation || qu.empty,
      b.relatedInformation || qu.empty,
      (a, b) => {
        return (
          a.message === b.message &&
          a.location.range.isEqual(b.location.range) &&
          a.location.uri.fsPath === b.location.uri.fsPath
        );
      }
    ) &&
    qu.equals(a.tags || qu.empty, b.tags || qu.empty)
  );
}

interface LangSettings {
  readonly validate: boolean;
  readonly suggestions: boolean;
}

function settingsEqual(s: LangSettings, n: LangSettings) {
  return s.validate === n.validate && s.suggestions == n.suggestions;
}

class Settings {
  private static readonly default: LangSettings = {
    validate: true,
    suggestions: true,
  };

  private readonly map = new Map<Lang, LangSettings>();

  validate(l: Lang) {
    return this.get(l).validate;
  }

  setValidate(l: Lang, v: boolean) {
    return this.update(l, (s) => ({
      validate: v,
      suggestions: s.suggestions,
    }));
  }

  suggestions(l: Lang) {
    return this.get(l).suggestions;
  }

  setSuggestions(l: Lang, v: boolean) {
    return this.update(l, (s) => ({
      validate: s.validate,
      suggestions: v,
    }));
  }

  private get(l: Lang) {
    return this.map.get(l) ?? Settings.default;
  }

  private update(l: Lang, f: (_: LangSettings) => LangSettings) {
    const s = this.get(l);
    const n = f(s);
    this.map.set(l, n);
    return settingsEqual(s, n);
  }
}

export class Diags extends qx.Disposable {
  private readonly diags = new qx.ResourceMap<FileDiags>();
  private readonly settings = new Settings();
  private readonly current: vsc.DiagnosticCollection;
  private readonly pending = new qx.ResourceMap<any>();
  private readonly delay = 50;

  constructor(owner: string) {
    super();
    this.current = this.register(vsc.languages.createDiagnosticCollection(owner));
  }

  dispose() {
    super.dispose();
    for (const v of this.pending.values) {
      clearTimeout(v);
    }
    this.pending.clear();
  }

  reInitialize() {
    this.current.clear();
    this.diags.clear();
  }

  setValidate(l: Lang, v: boolean) {
    if (this.settings.setValidate(l, v)) this.rebuild();
  }

  setSuggestions(l: Lang, v: boolean) {
    if (this.settings.setSuggestions(l, v)) this.rebuild();
  }

  update(r: vsc.Uri, l: Lang, k: Kind, ds: ReadonlyArray<vsc.Diagnostic>) {
    let dirty = false;
    const d = this.diags.get(r);
    if (d) {
      dirty = d.update(l, k, ds);
    } else if (ds.length) {
      const d = new FileDiags(r, l);
      d.update(l, k, ds);
      this.diags.set(r, d);
      dirty = true;
    }
    if (dirty) this.scheduleUpdate(r);
  }

  configFileDiagsReceived(r: vsc.Uri, ds: ReadonlyArray<vsc.Diagnostic>) {
    this.current.set(r, ds);
  }

  delete(r: vsc.Uri) {
    this.current.delete(r);
    this.diags.delete(r);
  }

  diagnostics(r: vsc.Uri) {
    return this.current.get(r) ?? [];
  }

  private scheduleUpdate(r: vsc.Uri) {
    if (!this.pending.has(r)) {
      this.pending.set(
        r,
        setTimeout(() => this.updateCurrentDiagnostics(r), this.delay)
      );
    }
  }

  private updateCurrentDiagnostics(r: vsc.Uri) {
    if (this.pending.has(r)) {
      clearTimeout(this.pending.get(r));
      this.pending.delete(r);
    }
    const d = this.diags.get(r);
    this.current.set(r, d ? d.diagnostics(this.settings) : []);
  }

  private rebuild() {
    this.current.clear();
    for (const d of this.diags.values) {
      this.current.set(d.file, d.diagnostics(this.settings));
    }
  }
}
