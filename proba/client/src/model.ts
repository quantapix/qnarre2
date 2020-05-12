import * as vscode from 'vscode';

export class FoodPyramid {
  private _relations = [] as FoodRelation[];
  private _nouns = new Set<string>();
  private _verbs = new Set<string>();

  getRelationAt(w: vscode.Range) {
    return this._relations.find((r) => r.range.contains(w));
  }

  addRelation(r: FoodRelation) {
    this._relations.push(r);
    this._nouns.add(r.object).add(r.subject);
    this._verbs.add(r.verb);
  }

  isVerb(x: string) {
    return this._verbs.has(x.toLowerCase());
  }

  isNoun(x: string) {
    return this._nouns.has(x.toLowerCase());
  }

  getVerbRelations(v: string) {
    return this._relations.filter((r) => r.verb === v.toLowerCase());
  }

  getNounRelations(n: string) {
    return this._relations.filter((r) => r.involves(n));
  }

  getSubjectRelations(s: string) {
    return this._relations.filter((r) => r.subject === s.toLowerCase());
  }

  getObjectRelations(o: string) {
    return this._relations.filter((r) => r.object === o.toLowerCase());
  }
}

export class FoodRelation {
  private _subject: string;
  private _verb: string;
  private _object: string;

  constructor(
    s: string,
    v: string,
    o: string,
    private readonly text: string,
    public readonly range: vscode.Range
  ) {
    this._subject = s.toLowerCase();
    this._verb = v.toLowerCase();
    this._object = o.toLowerCase();
  }

  get subject(): string {
    return this._subject;
  }

  get object(): string {
    return this._object;
  }

  get verb(): string {
    return this._verb;
  }

  involves(noun: string) {
    let n = noun.toLowerCase();
    return this._subject === n || this._object === n;
  }

  getRangeOf(w: string) {
    let i = new RegExp('\\b' + w + '\\b', 'i').exec(this.text)!.index;
    return new vscode.Range(
      this.range.start.translate({ characterDelta: i }),
      this.range.start.translate({ characterDelta: i + w.length })
    );
  }
}
