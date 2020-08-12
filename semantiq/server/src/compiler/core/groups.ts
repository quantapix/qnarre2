import * as qb from './bases';
import * as qc from './classes';
import { qf, Fcreate, Fget, Fhas, Fis } from './frame';
import { Node } from '../type';
import { EmitFlags, ModifierFlags, Nodes, NodeFlags, ObjectFlags, SymbolFlags, TrafoFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { visitNode, VisitResult } from './walkers';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
const Debug = { f() {} };
type AssertionKeys = qt.MatchingKeys<typeof Debug, qu.AnyFunction>;
export function newAssert(f: qt.Frame) {
  interface Frame extends qt.Frame {
    format: Fformat;
  }
  const qf = f as Frame;
  return (qf.assert = new (class {
    level = qu.AssertionLevel.None;
    cache: Partial<Record<AssertionKeys, { level: qu.AssertionLevel; assertion: qu.AnyFunction }>> = {};
    setLevel(l: qu.AssertionLevel) {
      const old = this.level;
      this.level = l;
      if (l > old) {
        for (const k of qu.getOwnKeys(this.cache) as AssertionKeys[]) {
          const f = this.cache[k];
          if (f !== undefined && Debug[k] !== f.assertion && l >= f.level) {
            (Debug as any)[k] = f;
            this.cache[k] = undefined;
          }
        }
      }
    }
    shouldAssert(l: qu.AssertionLevel): boolean {
      return this.level >= l;
    }
    shouldAssertFunction<K extends AssertionKeys>(l: qu.AssertionLevel, name: K): boolean {
      if (!this.shouldAssert(l)) {
        this.cache[name] = { level: l, assertion: Debug[name] };
        (Debug as any)[name] = qu.noop;
        return false;
      }
      return true;
    }
    never(x: never, msg = 'Illegal value:', mark?: qu.AnyFunction): never {
      const v = typeof x === 'object' && qu.hasProperty(x, 'kind') && qu.hasProperty(x, 'pos') && qf.format.syntax ? 'SyntaxKind: ' + qf.format.syntax((x as Node).kind) : JSON.stringify(x);
      return qu.fail(`${msg} ${v}`, mark || this.never);
    }
    eachNode<T extends Node, U extends T>(ns: Nodes<T>, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is Nodes<U>;
    eachNode<T extends Node, U extends T>(ns: readonly T[], test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is readonly U[];
    eachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
    eachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.eachNode')) {
        qu.assert(test === undefined || qu.every(ns, test), msg || 'Unexpected node.', () => `Node array did not pass test '${qu.getFunctionName(test)}'.`, mark || this.eachNode);
      }
    }
    node<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
    node(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
    node(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.node')) {
        qu.assert(
          n !== undefined && (test === undefined || test(n)),
          msg || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
          mark || this.node
        );
      }
    }
    notNode<T extends Node, U extends T>(n: T | undefined, test: (n: Node) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is Exclude<T, U>;
    notNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
    notNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.notNode')) {
        qu.assert(
          n === undefined || test === undefined || !test(n),
          msg || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} should not have passed test '${qu.getFunctionName(test!)}'.`,
          mark || this.notNode
        );
      }
    }
    optionalNode<T extends Node, U extends T>(n: T, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
    optionalNode<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U | undefined;
    optionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
    optionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalNode')) {
        qu.assert(
          test === undefined || n === undefined || test(n),
          msg || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
          mark || this.optionalNode
        );
      }
    }
    optionalToken<T extends Node, K extends Syntax>(n: T, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }>;
    optionalToken<T extends Node, K extends Syntax>(n: T | undefined, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }> | undefined;
    optionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction): void;
    optionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalToken')) {
        qu.assert(
          k === undefined || n === undefined || n.kind === k,
          msg || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} was not a '${qf.format.syntax(k)}' token.`,
          mark || this.optionalToken
        );
      }
    }
    missingNode(n?: Node, msg?: string, mark?: qu.AnyFunction): asserts n is undefined;
    missingNode(n?: Node, msg?: string, mark?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.missingNode')) {
        qu.assert(n === undefined, msg || 'Unexpected node.', () => `Node ${qf.format.syntax(n!.kind)} was unexpected'.`, mark || this.missingNode);
      }
    }
  })());
}
export interface Fassert extends ReturnType<typeof newAssert> {}
export function newDecl(f: qt.Frame) {
  interface Frame extends qt.Frame {
    create: Fcreate;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.decl = new (class {
    getName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean, f: EmitFlags = 0) {
      const n = this.nameOf(d);
      if (n && n.kind === Syntax.Identifier && !qf.is.generatedIdentifier(n)) {
        const c = qf.create.getMutableClone(n);
        f |= d.emitFlags(n);
        if (!sourceMaps) f |= EmitFlags.NoSourceMap;
        if (!comments) f |= EmitFlags.NoComments;
        if (f) setEmitFlags(c, f);
        return c;
      }
      return this.generatedNameForNode(d);
    }
    nPosToString(n: Node): string {
      const s = n.sourceFile;
      const loc = qy.get.lineAndCharOf(s, n.pos);
      return `${s.fileName}(${loc.line + 1},${loc.char + 1})`;
    }
    typeParamOwner(d?: qt.Declaration): qt.Declaration | undefined {
      if (d?.kind === Syntax.TypeParam) {
        for (let n = d as Node | undefined; n; n = n.parent) {
          if (qf.is.functionLike(n) || qf.is.classLike(n) || n.kind === Syntax.InterfaceDeclaration) return n as qt.Declaration;
        }
      }
      return;
    }
    members(d?: qt.Declaration): Nodes<qt.ClassElem> | Nodes<qt.TypeElem> | Nodes<qt.ObjectLiteralElem> | undefined {
      switch (d?.kind) {
        case Syntax.InterfaceDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.TypingLiteral:
          return d.members;
        case Syntax.ObjectLiteralExpression:
          return d.properties;
      }
      return;
    }
    nameOf(d: qt.Declaration | qt.Expression): qt.DeclarationName | undefined {
      if (d) {
        const n = d as Node;
        if (this.nonAssignedNameOfDeclaration(d) || n.kind === Syntax.FunctionExpression || n.kind === Syntax.ClassExpression) return this.assignedName(n);
      }
      return;
    }
    fromName(n: Node): qt.Declaration | undefined {
      const p = n.parent;
      switch (n.kind) {
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
          if (p?.kind === Syntax.ComputedPropertyName) return p.parent as qt.Declaration;
        case Syntax.Identifier:
          if (qf.is.declaration(p)) return p.name === n ? p : undefined;
          else if (p?.kind === Syntax.QualifiedName) {
            const pp = p.parent;
            return pp?.kind === Syntax.DocParamTag && pp.name === p ? pp : undefined;
          } else {
            const pp = p?.parent;
            return pp?.kind === Syntax.BinaryExpression && this.assignmentDeclarationKind(pp) !== qt.AssignmentDeclarationKind.None && (pp.left.symbol || pp.symbol) && this.nameOf(pp) === n
              ? pp
              : undefined;
          }
        case Syntax.PrivateIdentifier:
          return qf.is.declaration(p) && p.name === n ? p : undefined;
        default:
          return;
      }
    }
    nameOfExpando(d: qt.Declaration): qt.DeclarationName | undefined {
      const p = d.parent;
      if (p?.kind === Syntax.BinaryExpression) {
        const p2 = (p.operatorToken.kind === Syntax.Bar2Token || p.operatorToken.kind === Syntax.Question2Token) && p.parent?.kind === Syntax.BinaryExpression ? p.parent : p;
        if (p2.operatorToken.kind === Syntax.EqualsToken && p2.left.kind === Syntax.Identifier) return p2.left as qt.DeclarationName;
      } else if (p?.kind === Syntax.VariableDeclaration) return p.name;
      return;
    }
    internalName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
    }
    localName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps, EmitFlags.LocalName);
    }
    exportName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean): qt.Identifier {
      return this.getName(d, comments, sourceMaps, EmitFlags.ExportName);
    }
    name(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps);
    }
    externalModuleOrNamespaceExportName(n: qt.Declaration, s: qt.Identifier | undefined, comments?: boolean, sourceMaps?: boolean): qt.Identifier | qt.PropertyAccessExpression {
      if (s && qf.has.syntacticModifier(n as Node, ModifierFlags.Export)) return this.namespaceMemberName(s, this.name(n), comments, sourceMaps);
      return this.exportName(n, comments, sourceMaps);
    }
    localNameForExternalImport(d: qt.ImportDeclaration | qt.ExportDeclaration | qt.ImportEqualsDeclaration, sourceFile: qt.SourceFile): qc.Identifier | undefined {
      const d2 = this.namespaceDeclarationNode(d);
      if (d2 && !qf.is.defaultImport(d)) {
        const n = d2.name;
        return qf.is.generatedIdentifier(n) ? n : new qc.Identifier(this.sourceTextOfNodeFromSourceFile(sourceFile, n) || qb.idText(n));
      }
      if (d.kind === Syntax.ImportDeclaration && d.importClause) return this.generatedNameForNode(d);
      if (d.kind === Syntax.ExportDeclaration && d.moduleSpecifier) return this.generatedNameForNode(d);
      return;
    }
    declarationNameToString(n?: qt.DeclarationName | qt.QualifiedName) {
      return !n || this.fullWidth(n) === 0 ? '(Missing)' : this.textOf(n);
    }
  })());
}
export interface Fdecl extends ReturnType<typeof newDecl> {}
export function newFormat(f: qt.Frame) {
  interface Frame extends qt.Frame {}
  const qf = f as Frame;
  return (qf.format = new (class {
    emitFlags(f?: qt.EmitFlags): string {
      return qu.formatEnum(f, (qt as any).EmitFlags, true);
    }
    modifierFlags(f?: ModifierFlags): string {
      return qu.formatEnum(f, (qt as any).ModifierFlags, true);
    }
    nodeFlags(f?: NodeFlags): string {
      return qu.formatEnum(f, (qt as any).NodeFlags, true);
    }
    objectFlags(f?: ObjectFlags): string {
      return qu.formatEnum(f, (qt as any).ObjectFlags, true);
    }
    symbol(s: qt.Symbol): string {
      return `{ name: ${qy.get.unescUnderscores(s.escName)}; flags: ${this.symbolFlags(s.flags)}; declarations: ${qu.map(s.declarations, (n) => this.syntax(n.kind))} }`;
    }
    symbolFlags(f?: SymbolFlags): string {
      return qu.formatEnum(f, (qt as any).SymbolFlags, true);
    }
    syntax(k?: Syntax): string {
      return qu.formatEnum(k, (qt as any).SyntaxKind, false);
    }
    trafoFlags(f?: TrafoFlags): string {
      return qu.formatEnum(f, (qt as any).TrafoFlags, true);
    }
    typeFlags(f?: TypeFlags): string {
      return qu.formatEnum(f, (qt as any).TypeFlags, true);
    }
  })());
}
export interface Fformat extends ReturnType<typeof newFormat> {}
export function newSkip(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.skip = new (class {
    outerExpressions(n: qt.Expression, ks?: qt.OuterExpressionKinds): qt.Expression;
    outerExpressions(n: Node, ks?: qt.OuterExpressionKinds): Node;
    outerExpressions(n: Node | qt.Expression, ks = qt.OuterExpressionKinds.All): Node | qt.Expression {
      while (qf.is.outerExpression(n, ks)) {
        n = n.expression;
      }
      return n;
    }
    assertions(n: qt.Expression): qt.Expression;
    assertions(n: Node): Node;
    assertions(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.Assertions);
    }
    parentheses(n: qt.Expression): qt.Expression;
    parentheses(n: Node): Node;
    parentheses(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.Parentheses);
    }
    partiallyEmittedExpressions(n: qt.Expression): qt.Expression;
    partiallyEmittedExpressions(n: Node): Node;
    partiallyEmittedExpressions(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
    }
  })());
}
export interface Fskip extends ReturnType<typeof newSkip> {}
export function newCalc(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
    skip: Fskip;
  }
  const qf = f as Frame;
  return (qf.calc = new (class {
    aggregate(n: Node): Node {
      const aggregate = (n?: Node): TrafoFlags => {
        if (!n) return TrafoFlags.None;
        if (n.trafoFlags & TrafoFlags.HasComputedFlags) return n.trafoFlags & ~qy.get.trafoFlagsSubtreeExclusions(n.kind);
        return this.trafoFlags(n, subtree(n));
      };
      const nodes = (ns?: Nodes<Node>): TrafoFlags => {
        if (!ns) return TrafoFlags.None;
        let sub = TrafoFlags.None;
        let f = TrafoFlags.None;
        for (const n of ns) {
          sub |= aggregate(n);
          f |= n.trafoFlags & ~TrafoFlags.HasComputedFlags;
        }
        ns.trafoFlags = f | TrafoFlags.HasComputedFlags;
        return sub;
      };
      const subtree = (n: Node): TrafoFlags => {
        if (qf.has.syntacticModifier(n, ModifierFlags.Ambient) || (qf.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypings)) return TrafoFlags.None;
        return reduceEachChild(n, TrafoFlags.None, child, children);
      };
      const child = (f: TrafoFlags, n: Node): TrafoFlags => f | aggregate(n);
      const children = (f: TrafoFlags, ns: Nodes<Node>): TrafoFlags => f | nodes(ns);
      aggregate(n);
      return n;
    }
    trafoFlags(n: Node, f: TrafoFlags): TrafoFlags {
      switch (n.kind) {
        case Syntax.CallExpression:
          return this.callExpression(n, f);
        case Syntax.NewExpression:
          return this.newExpression(n, f);
        case Syntax.ModuleDeclaration:
          return this.moduleDeclaration(n, f);
        case Syntax.ParenthesizedExpression:
          return this.parenthesizedExpression(n, f);
        case Syntax.BinaryExpression:
          return this.binaryExpression(n, f);
        case Syntax.ExpressionStatement:
          return this.expressionStatement(n, f);
        case Syntax.Param:
          return this.param(n, f);
        case Syntax.ArrowFunction:
          return this.arrowFunction(n, f);
        case Syntax.FunctionExpression:
          return this.functionExpression(n, f);
        case Syntax.FunctionDeclaration:
          return this.functionDeclaration(n, f);
        case Syntax.VariableDeclaration:
          return this.variableDeclaration(n, f);
        case Syntax.VariableDeclarationList:
          return this.variableDeclarationList(n, f);
        case Syntax.VariableStatement:
          return this.variableStatement(n, f);
        case Syntax.LabeledStatement:
          return this.labeledStatement(n, f);
        case Syntax.ClassDeclaration:
          return this.classDeclaration(n, f);
        case Syntax.ClassExpression:
          return this.classExpression(n, f);
        case Syntax.HeritageClause:
          return this.heritageClause(n, f);
        case Syntax.CatchClause:
          return this.catchClause(n, f);
        case Syntax.ExpressionWithTypings:
          return this.expressionWithTypings(n, f);
        case Syntax.Constructor:
          return this.constructorr(n, f);
        case Syntax.PropertyDeclaration:
          return this.propertyDeclaration(n, f);
        case Syntax.MethodDeclaration:
          return this.method(n, f);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return this.accessor(n, f);
        case Syntax.ImportEqualsDeclaration:
          return this.importEquals(n, f);
        case Syntax.PropertyAccessExpression:
          return this.propertyAccess(n, f);
        case Syntax.ElemAccessExpression:
          return this.elemAccess(n, f);
        case Syntax.JsxSelfClosingElem:
        case Syntax.JsxOpeningElem:
          return this.jsxOpeningLikeElem(n, f);
      }
      return this.other(n, f);
    }
    callExpression(n: qt.CallExpression, f: TrafoFlags) {
      let r = f;
      const callee = qf.skip.outerExpressions(n.expression);
      const e = n.expression;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsRestOrSpread || qf.is.superOrSuperProperty(callee)) {
        r |= TrafoFlags.AssertES2015;
        if (qf.is.superProperty(callee)) r |= TrafoFlags.ContainsLexicalThis;
      }
      if (e.kind === Syntax.ImportKeyword) r |= TrafoFlags.ContainsDynamicImport;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
    }
    newExpression(n: qt.NewExpression, f: TrafoFlags) {
      let r = f;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
    }
    jsxOpeningLikeElem(n: qt.JsxOpeningLikeElem, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertJsx;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    binaryExpression(n: qt.BinaryExpression, f: TrafoFlags) {
      let r = f;
      const k = n.operatorToken.kind;
      const l = n.left.kind;
      if (k === Syntax.Question2Token) r |= TrafoFlags.AssertES2020;
      else if (k === Syntax.EqualsToken && l === Syntax.ObjectLiteralExpression) r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
      else if (k === Syntax.EqualsToken && l === Syntax.ArrayLiteralExpression) r |= TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
      else if (k === Syntax.Asterisk2Token || k === Syntax.Asterisk2EqualsToken) r |= TrafoFlags.AssertES2016;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    param(n: qt.ParamDeclaration, f: TrafoFlags) {
      let r = f;
      const name = n.name;
      const initer = n.initer;
      const dot3Token = n.dot3Token;
      if (n.questionToken || n.type || (f & TrafoFlags.ContainsTypeScriptClassSyntax && qu.some(n.decorators)) || isThisNode(Identifier, name)) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (f & TrafoFlags.ContainsBindingPattern || initer || dot3Token) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ParamExcludes;
    }
    parenthesizedExpression(n: qt.ParenthesizedExpression, f: TrafoFlags) {
      let r = f;
      const k = n.expression.kind;
      if (k === Syntax.AsExpression || k === Syntax.TypeAssertionExpression) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.OuterExpressionExcludes;
    }
    classDeclaration(n: qt.ClassDeclaration, f: TrafoFlags) {
      let r: TrafoFlags;
      if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
      else {
        r = f | TrafoFlags.AssertES2015;
        if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ClassExcludes;
    }
    classExpression(n: qt.ClassExpression, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ClassExcludes;
    }
    heritageClause(n: qt.HeritageClause, f: TrafoFlags) {
      let r = f;
      switch (n.token) {
        case Syntax.ExtendsKeyword:
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.ImplementsKeyword:
          r |= TrafoFlags.AssertTypeScript;
          break;
        default:
          qu.fail('Unexpected token for heritage clause');
          break;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    catchClause(n: qt.CatchClause, f: TrafoFlags) {
      let r = f;
      if (!n.variableDeclaration) r |= TrafoFlags.AssertES2019;
      else if (qf.is.kind(qc.BindingPattern, n.variableDeclaration.name)) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.CatchClauseExcludes;
    }
    expressionWithTypings(n: qt.ExpressionWithTypings, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    constructorr(n: qt.ConstructorDeclaration, f: TrafoFlags) {
      let r = f;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || !n.body) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ConstructorExcludes;
    }
    method(n: qt.MethodDeclaration, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type || !n.body || n.questionToken) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
      if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
    }
    accessor(n: qt.AccessorDeclaration, f: TrafoFlags) {
      let r = f;
      if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || !n.body) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
    }
    propertyDeclaration(n: qt.PropertyDeclaration, f: TrafoFlags) {
      let r = f | TrafoFlags.ContainsClassFields;
      if (qu.some(n.decorators) || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || n.questionToken || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
      if (qf.is.kind(qc.ComputedPropertyName, n.name) || (qf.has.staticModifier(n) && n.initer)) r |= TrafoFlags.ContainsTypeScriptClassSyntax;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.PropertyExcludes);
    }
    functionDeclaration(n: qt.FunctionDeclaration, f: TrafoFlags) {
      let r: TrafoFlags;
      const m = qf.get.syntacticModifierFlags(n);
      if (!n.body || m & ModifierFlags.Ambient) r = TrafoFlags.AssertTypeScript;
      else {
        r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
        if (m & ModifierFlags.TypeScriptModifier || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
        if (m & ModifierFlags.Async) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
        if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
        if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.FunctionExcludes;
    }
    functionExpression(n: qt.FunctionExpression, f: TrafoFlags) {
      let r = f;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.FunctionExcludes;
    }
    arrowFunction(n: qt.ArrowFunction, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= TrafoFlags.AssertES2017;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrowFunctionExcludes;
    }
    propertyAccess(n: qt.PropertyAccessExpression, f: TrafoFlags) {
      let r = f;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.PropertyAccessExcludes;
    }
    elemAccess(n: qt.ElemAccessExpression, f: TrafoFlags) {
      let r = f;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.PropertyAccessExcludes;
    }
    variableDeclaration(n: qt.VariableDeclaration, f: TrafoFlags) {
      let r = f;
      r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (n.type || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    variableStatement(n: qt.VariableStatement, f: TrafoFlags) {
      let r: TrafoFlags;
      const d = n.declarationList.trafoFlags;
      if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
      else {
        r = f;
        if (d & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    labeledStatement(n: qt.LabeledStatement, f: TrafoFlags) {
      let r = f;
      if (f & TrafoFlags.ContainsBlockScopedBinding && qf.is.iterationStatement(n, true)) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    importEquals(n: qt.ImportEqualsDeclaration, f: TrafoFlags) {
      let r = f;
      if (!qf.is.externalModuleImportEqualsDeclaration(n)) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    expressionStatement(n: qt.ExpressionStatement, f: TrafoFlags) {
      const r = f;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    moduleDeclaration(n: qt.ModuleDeclaration, f: TrafoFlags) {
      let r = TrafoFlags.AssertTypeScript;
      const m = qf.get.syntacticModifierFlags(n);
      if ((m & ModifierFlags.Ambient) === 0) r |= f;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ModuleExcludes;
    }
    variableDeclarationList(n: qt.VariableDeclarationList, f: TrafoFlags) {
      let r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
      if (f & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
      if (n.flags & NodeFlags.BlockScoped) r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBlockScopedBinding;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.VariableDeclarationListExcludes;
    }
    other(n: Node, f: TrafoFlags) {
      let r = f;
      let excludeFlags = TrafoFlags.NodeExcludes;
      switch (n.kind) {
        case Syntax.AsyncKeyword:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017;
          break;
        case Syntax.AwaitExpression:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017 | TrafoFlags.ContainsAwait;
          break;
        case Syntax.AsExpression:
        case Syntax.PartiallyEmittedExpression:
        case Syntax.TypeAssertionExpression:
          r |= TrafoFlags.AssertTypeScript;
          excludeFlags = TrafoFlags.OuterExpressionExcludes;
          break;
        case Syntax.AbstractKeyword:
        case Syntax.ConstKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.EnumDeclaration:
        case Syntax.EnumMember:
        case Syntax.NonNullExpression:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.PublicKeyword:
        case Syntax.ReadonlyKeyword:
          r |= TrafoFlags.AssertTypeScript;
          break;
        case Syntax.JsxAttribute:
        case Syntax.JsxAttributes:
        case Syntax.JsxClosingElem:
        case Syntax.JsxClosingFragment:
        case Syntax.JsxElem:
        case Syntax.JsxExpression:
        case Syntax.JsxFragment:
        case Syntax.JsxOpeningFragment:
        case Syntax.JsxSpreadAttribute:
        case Syntax.JsxText:
          r |= TrafoFlags.AssertJsx;
          break;
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail:
          if (n.templateFlags) r |= TrafoFlags.AssertES2018;
          break;
        case Syntax.TaggedTemplateExpression:
          if (qf.has.invalidEscape(n.template)) {
            r |= TrafoFlags.AssertES2018;
            break;
          }
        case Syntax.MetaProperty:
        case Syntax.ShorthandPropertyAssignment:
        case Syntax.StaticKeyword:
        case Syntax.TemplateExpression:
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.StringLiteral:
          if (n.hasExtendedEscape) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.NumericLiteral:
          if (n.numericLiteralFlags & qt.TokenFlags.BinaryOrOctalSpecifier) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.BigIntLiteral:
          r |= TrafoFlags.AssertESNext;
          break;
        case Syntax.ForOfStatement:
          if (n.awaitModifier) r |= TrafoFlags.AssertES2018;
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.YieldExpression:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.ContainsYield;
          break;
        case Syntax.AnyKeyword:
        case Syntax.ArrayTyping:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.CallSignature:
        case Syntax.ConditionalTyping:
        case Syntax.ConstructorTyping:
        case Syntax.ConstructSignature:
        case Syntax.FunctionTyping:
        case Syntax.IndexedAccessTyping:
        case Syntax.IndexSignature:
        case Syntax.InferTyping:
        case Syntax.InterfaceDeclaration:
        case Syntax.IntersectionTyping:
        case Syntax.LiteralTyping:
        case Syntax.MappedTyping:
        case Syntax.MethodSignature:
        case Syntax.NamespaceExportDeclaration:
        case Syntax.NeverKeyword:
        case Syntax.NumberKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.OptionalTyping:
        case Syntax.ParenthesizedTyping:
        case Syntax.PropertySignature:
        case Syntax.RestTyping:
        case Syntax.StringKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ThisTyping:
        case Syntax.TupleTyping:
        case Syntax.TypeAliasDeclaration:
        case Syntax.TypeParam:
        case Syntax.TypingLiteral:
        case Syntax.TypingOperator:
        case Syntax.TypingPredicate:
        case Syntax.TypingQuery:
        case Syntax.TypingReference:
        case Syntax.UnionTyping:
        case Syntax.VoidKeyword:
          r = TrafoFlags.AssertTypeScript;
          excludeFlags = TrafoFlags.TypeExcludes;
          break;
        case Syntax.ComputedPropertyName:
          r |= TrafoFlags.ContainsComputedPropertyName;
          break;
        case Syntax.SpreadElem:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsRestOrSpread;
          break;
        case Syntax.SpreadAssignment:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
          break;
        case Syntax.SuperKeyword:
          r |= TrafoFlags.AssertES2015;
          excludeFlags = TrafoFlags.OuterExpressionExcludes;
          break;
        case Syntax.ThisKeyword:
          r |= TrafoFlags.ContainsLexicalThis;
          break;
        case Syntax.ObjectBindingPattern:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
          if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
          excludeFlags = TrafoFlags.BindingPatternExcludes;
          break;
        case Syntax.ArrayBindingPattern:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
          excludeFlags = TrafoFlags.BindingPatternExcludes;
          break;
        case Syntax.BindingElem:
          r |= TrafoFlags.AssertES2015;
          if (n.dot3Token) r |= TrafoFlags.ContainsRestOrSpread;
          break;
        case Syntax.Decorator:
          r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
          break;
        case Syntax.ObjectLiteralExpression:
          excludeFlags = TrafoFlags.ObjectLiteralExcludes;
          if (f & TrafoFlags.ContainsComputedPropertyName) r |= TrafoFlags.AssertES2015;
          if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
          break;
        case Syntax.ArrayLiteralExpression:
          excludeFlags = TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
          break;
        case Syntax.DoStatement:
        case Syntax.ForInStatement:
        case Syntax.ForStatement:
        case Syntax.WhileStatement:
          if (f & TrafoFlags.ContainsBlockScopedBinding) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.SourceFile:
          break;
        case Syntax.NamespaceExport:
          r |= TrafoFlags.AssertESNext;
          break;
        case Syntax.ReturnStatement:
          r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion | TrafoFlags.AssertES2018;
          break;
        case Syntax.BreakStatement:
        case Syntax.ContinueStatement:
          r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion;
          break;
        case Syntax.PrivateIdentifier:
          r |= TrafoFlags.ContainsClassFields;
          break;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~excludeFlags;
    }
    propagatePropertyNameFlags(n: qt.PropertyName, f: TrafoFlags) {
      return f | (n.trafoFlags & TrafoFlags.PropertyNamePropagatingFlags);
    }
  })());
}
export interface Fcalc extends ReturnType<typeof newCalc> {}
export function newStmt(f: qt.Frame) {
  interface Frame extends qt.Frame {
    create: Fcreate;
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.stmt = new (class {
    insertAllAfterPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined, isPrologue: (n: qt.Node) => boolean): T[] {
      if (from?.length) {
        let i = 0;
        for (; i < to.length; ++i) {
          if (!isPrologue(to[i] as qt.Node)) break;
        }
        to.splice(i, 0, ...from);
      }
      return to;
    }
    insertAfterPrologue<T extends qt.Statement>(to: T[], s: T | undefined, isPrologue: (n: qt.Node) => boolean): T[] {
      if (s) {
        let i = 0;
        for (; i < to.length; ++i) {
          if (!isPrologue(to[i] as qt.Node)) break;
        }
        to.splice(i, 0, s);
      }
      return to;
    }
    insertStatementsAfterStandardPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined): T[] {
      return this.insertAllAfterPrologue(to, from, qf.is.prologueDirective);
    }
    insertStatementsAfterCustomPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined): T[] {
      return this.insertAllAfterPrologue(to, from, qf.is.anyPrologueDirective);
    }
    insertStatementAfterStandardPrologue<T extends qt.Statement>(to: T[], s: T | undefined): T[] {
      return this.insertAfterPrologue(to, s, qf.is.prologueDirective);
    }
    insertStatementAfterCustomPrologue<T extends qt.Statement>(to: T[], s: T | undefined): T[] {
      return this.insertAfterPrologue(to, s, qf.is.anyPrologueDirective);
    }
    addStandardPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean) {
      qu.assert(to.length === 0);
      let useStrict = false;
      let i = 0;
      const l = from.length;
      while (i < l) {
        const s = from[i];
        if (qf.is.prologueDirective(s)) {
          if (qf.is.useStrictPrologue(s)) useStrict = true;
          to.push(s);
        } else break;
        i++;
      }
      if (strict && !useStrict) to.push(startOnNewLine(new ExpressionStatement(asLiteral('use strict'))));
      return i;
    }
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i: number, cb?: (n: qt.Node) => VisitResult, filter?: (n: qt.Node) => boolean): number;
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i?: number, cb?: (n: qt.Node) => VisitResult, filter?: (n: qt.Node) => boolean): number | undefined;
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i?: number, cb?: (n: qt.Node) => VisitResult, filter: (n: qt.Node) => boolean = () => true): number | undefined {
      const l = from.length;
      while (i !== undefined && i < l) {
        const s = from[i];
        if (qf.get.emitFlags(s) & EmitFlags.CustomPrologue && filter(s)) qu.append(to, cb ? visitNode(s, cb, qf.is.statement) : s);
        else break;
        i++;
      }
      return i;
    }
    addPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean, cb?: (n: qt.Node) => VisitResult): number {
      const i = this.addStandardPrologue(to, from, strict);
      return this.addCustomPrologue(to, from, i, cb);
    }
    findUseStrictPrologue(ss: readonly qt.Statement[]): qt.Statement | undefined {
      for (const s of ss) {
        if (qf.is.prologueDirective(s)) {
          if (qf.is.useStrictPrologue(s)) return s;
        } else break;
      }
      return;
    }
    startsWithUseStrict(ss: readonly qt.Statement[]) {
      const firstStatement = qu.firstOrUndefined(ss);
      return firstStatement !== undefined && qf.is.prologueDirective(firstStatement) && qf.is.useStrictPrologue(firstStatement);
    }
    createForOfBindingStatement(n: qt.ForIniter, e: qt.Expression): qt.Statement {
      if (n.kind === Syntax.VariableDeclarationList) {
        const d = qu.first(n.declarations) as qc.VariableDeclaration;
        const d2 = d.update(d.name, undefined, e);
        return new qc.VariableStatement(undefined, (n as qc.VariableDeclarationList).update([d2])).setRange(n);
      } else {
        const e2 = qf.create.assignment(n, e).setRange(n);
        return new qc.ExpressionStatement(e2).setRange(n);
      }
    }
    insertLeadingStatement(to: qt.Statement, from: qt.Statement) {
      if (to.kind === Syntax.Block) return (to as qc.Block).update(new qb.Nodes([from, ...to.statements]).setRange(to.statements));
      return new qc.Block(new qb.Nodes([to, from]), true);
    }
    restoreEnclosingLabel(n: qt.Statement, l?: qt.LabeledStatement, cb?: (n: qt.LabeledStatement) => void): qt.Statement {
      if (!l) return n;
      const r = updateLabel(l, l.label, l.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(n, l.statement) : n);
      if (cb) cb(l);
      return r;
    }
    canHaveExportModifier(n: qt.Statement) {
      switch (n.kind) {
        case Syntax.EnumDeclaration:
        case Syntax.VariableStatement:
        case Syntax.FunctionDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.ModuleDeclaration:
          return true;
        case Syntax.InterfaceDeclaration:
          return !qf.is.externalModuleAugmentation(n) && !qf.is.globalScopeAugmentation(n);
      }
      return qf.is.typeDeclaration(n);
    }
  })());
}
export interface Fstmt extends ReturnType<typeof newStmt> {}
export function newNest(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  return (qf.nest = new (class {
    getLiteralKindOfBinaryPlusOperand(e: qt.Expression): Syntax {
      e = qb.skip.partiallyEmittedExpressions(e);
      if (qy.is.literal(e.kind)) return e.kind;
      const n = e as qt.Node;
      if (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.PlusToken) {
        const p = e as BinaryPlusExpression;
        if (p.cachedLiteralKind) return p.cachedLiteralKind;
        const l = getLiteralKindOfBinaryPlusOperand(n.left);
        const k = qy.is.literal(l) && l === getLiteralKindOfBinaryPlusOperand(n.right) ? l : Syntax.Unknown;
        p.cachedLiteralKind = k;
        return k;
      }
      return Syntax.Unknown;
    }
    binaryOperand(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand?: qt.Expression) {
      const skipped = qb.skip.partiallyEmittedExpressions(operand);
      if (skipped.kind === Syntax.ParenthesizedExpression) return operand;
      function operatorHasAssociativeProperty(binaryOperator: Syntax) {
        // The following operators are associative in JavaScript:
        //  (a*b)*c     -> a*(b*c)  -> a*b*c
        //  (a|b)|c     -> a|(b|c)  -> a|b|c
        //  (a&b)&c     -> a&(b&c)  -> a&b&c
        //  (a^b)^c     -> a^(b^c)  -> a^b^c
        //
        // While addition is associative in mathematics, JavaScript's `+` is not
        // guaranteed to be associative as it is overloaded with string concatenation.
        return binaryOperator === Syntax.AsteriskToken || binaryOperator === Syntax.BarToken || binaryOperator === Syntax.AmpersandToken || binaryOperator === Syntax.CaretToken;
      }
      function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand: qt.Expression | undefined) {
        const binaryOperatorPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
        const binaryOperatorAssociativity = qy.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
        const emittedOperand = qb.skip.partiallyEmittedExpressions(operand);
        if (!isLeft && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) return true;
        const operandPrecedence = qf.get.expressionPrecedence(emittedOperand);
        switch (qu.compareNumbers(operandPrecedence, binaryOperatorPrecedence)) {
          case qu.Comparison.LessThan:
            if (!isLeft && binaryOperatorAssociativity === qt.Associativity.Right && operand.kind === Syntax.YieldExpression) return false;
            return true;
          case qu.Comparison.GreaterThan:
            return false;
          case qu.Comparison.EqualTo:
            if (isLeft) {
              // No need to parenthesize the left operand when the binary operator is
              // left associative:
              //  (a*b)/x    -> a*b/x
              //  (a**b)/x   -> a**b/x
              //
              // Parentheses are needed for the left operand when the binary operator is
              // right associative:
              //  (a/b)**x   -> (a/b)**x
              //  (a**b)**x  -> (a**b)**x
              return binaryOperatorAssociativity === qt.Associativity.Right;
            } else {
              if (qf.is.kind(emittedOperand, BinaryExpression) && emittedOperand.operatorToken.kind === binaryOperator) {
                // No need to parenthesize the right operand when the binary operator and
                // operand are the same and one of the following:
                //  x*(a*b)     => x*a*b
                //  x|(a|b)     => x|a|b
                //  x&(a&b)     => x&a&b
                //  x^(a^b)     => x^a^b
                if (operatorHasAssociativeProperty(binaryOperator)) return false;
                // No need to parenthesize the right operand when the binary operator
                // is plus (+) if both the left and right operands consist solely of either
                // literals of the same kind or binary plus (+) expressions for literals of
                // the same kind (recursively).
                //  "a"+(1+2)       => "a"+(1+2)
                //  "a"+("b"+"c")   => "a"+"b"+"c"
                if (binaryOperator === Syntax.PlusToken) {
                  const leftKind = leftOperand ? getLiteralKindOfBinaryPlusOperand(leftOperand) : Syntax.Unknown;
                  if (qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) return false;
                }
              }
              // No need to parenthesize the right operand when the operand is right
              // associative:
              //  x/(a**b)    -> x/a**b
              //  x**(a**b)   -> x**a**b
              //
              // Parentheses are needed for the right operand when the operand is left
              // associative:
              //  x/(a*b)     -> x/(a*b)
              //  x**(a/b)    -> x**(a/b)
              const operandAssociativity = qf.get.expressionAssociativity(emittedOperand);
              return operandAssociativity === qt.Associativity.Left;
            }
        }
      }
      return binaryOperandNeedsParentheses(binaryOperator, operand, isLeft, leftOperand) ? new ParenthesizedExpression(operand) : operand;
    }
    forConditionalHead(c: qt.Expression) {
      const conditionalPrecedence = qy.get.operatorPrecedence(Syntax.ConditionalExpression, Syntax.QuestionToken);
      const emittedCondition = qb.skip.partiallyEmittedExpressions(c);
      const conditionPrecedence = qf.get.expressionPrecedence(emittedCondition);
      if (qu.compareNumbers(conditionPrecedence, conditionalPrecedence) !== qu.Comparison.GreaterThan) return new ParenthesizedExpression(c);
      return c;
    }
    subexpressionOfConditionalExpression(e: qt.Expression): qt.Expression {
      const e2 = qb.skip.partiallyEmittedExpressions(e);
      return qf.is.commaSequence(e2) ? new ParenthesizedExpression(e) : e;
    }
    forAccess(e: qt.Expression): qt.LeftExpression {
      const e2 = qb.skip.partiallyEmittedExpressions(e);
      const n = e2 as qt.Node;
      if (qf.is.leftHandSideExpression(n) && (n.kind !== Syntax.NewExpression || n.args)) return e as qt.LeftExpression;
      return new ParenthesizedExpression(e).setRange(e);
    }
    postfixOperand(e: qt.Expression): qt.LeftExpression {
      return qf.is.leftHandSideExpression(e) ? e : new ParenthesizedExpression(e).setRange(e);
    }
    prefixOperand(e: qt.Expression): qt.UnaryExpression {
      return qf.is.unaryExpression(e) ? e : new ParenthesizedExpression(e).setRange(e);
    }
    listElems(es: qt.Nodes<qt.Expression>) {
      let r: qt.Expression[] | undefined;
      for (let i = 0; i < es.length; i++) {
        const e = this.expressionForList(es[i]);
        if (r || e !== es[i]) {
          if (!r) r = es.slice(0, i);
          r.push(e);
        }
      }
      return r ? new Nodes(r, es.trailingComma).setRange(es) : es;
    }
    expressionForList(e: qt.Expression) {
      const e2 = qb.skip.partiallyEmittedExpressions(e);
      const expressionPrecedence = qf.get.expressionPrecedence(e2);
      const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
      return expressionPrecedence > commaPrecedence ? e : new ParenthesizedExpression(e).setRange(e);
    }
    expressionForExpressionStatement(e: qt.Expression) {
      const e2 = qb.skip.partiallyEmittedExpressions(e);
      const n = e2 as qt.Node;
      if (n.kind === Syntax.CallExpression) {
        const callee = n.expression;
        const k = qb.skip.partiallyEmittedExpressions(callee).kind;
        if (k === Syntax.FunctionExpression || k === Syntax.ArrowFunction) {
          const c = getMutableClone(e2);
          c.expression = new ParenthesizedExpression(callee).setRange(callee);
          return recreateOuterExpressions(e, c, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
        }
      }
      const k = qf.get.leftmostExpression(e2, false).kind;
      if (k === Syntax.ObjectLiteralExpression || k === Syntax.FunctionExpression) return new ParenthesizedExpression(e).setRange(e);
      return e;
    }
    conditionalTypeMember(n: qt.Typing) {
      return n.kind === Syntax.ConditionalTyping ? new ParenthesizedTyping(n) : n;
    }
    elemTypeMember(n: qt.Typing) {
      switch (n.kind) {
        case Syntax.UnionTyping:
        case Syntax.IntersectionTyping:
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
          return new ParenthesizedTyping(n);
      }
      return conditionalTypeMember(n);
    }
    arrayTypeMember(n: qt.Typing) {
      switch (n.kind) {
        case Syntax.TypingQuery:
        case Syntax.TypingOperator:
        case Syntax.InferTyping:
          return new ParenthesizedTyping(n);
      }
      return elemTypeMember(n);
    }
    elemTypeMembers(ns: readonly qt.Typing[]) {
      return new Nodes(qu.sameMap(ns, elemTypeMember));
    }
    typeParams(ns?: readonly qt.Typing[]) {
      if (qu.some(ns)) {
        const ps = [] as qt.Typing[];
        for (let i = 0; i < ns.length; ++i) {
          const p = ns[i] as qt.Node;
          ps.push(i === 0 && qf.is.functionOrConstructorTyping(p) && p.typeParams ? new ParenthesizedTyping(p) : (p as qt.Typing));
        }
        return new Nodes(ps);
      }
      return;
    }
    defaultExpression(e: qt.Expression) {
      const check = qb.skip.partiallyEmittedExpressions(e);
      let needsParens = qf.is.commaSequence(check);
      if (!needsParens) {
        switch (qf.get.leftmostExpression(check, false).kind) {
          case Syntax.ClassExpression:
          case Syntax.FunctionExpression:
            needsParens = true;
        }
      }
      return needsParens ? new ParenthesizedExpression(e) : e;
    }
    forNew(e: qt.Expression): qt.LeftExpression {
      const n = qf.get.leftmostExpression(e, true) as qt.Node;
      switch (n.kind) {
        case Syntax.CallExpression:
          return new ParenthesizedExpression(e);
        case Syntax.NewExpression:
          return !n.args ? new ParenthesizedExpression(e) : (e as qt.LeftExpression);
      }
      return forAccess(e);
    }
    conciseBody(b: qt.ConciseBody): qt.ConciseBody {
      if (b.kind !== Syntax.Block && (qf.is.commaSequence(b) || qf.get.leftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return new ParenthesizedExpression(b).setRange(b);
      return b;
    }
  })());
}
export interface Fnest extends ReturnType<typeof newNest> {}
export function newEmit(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.emit = new (class {
    disposeEmitNodes(sourceFile: qt.SourceFile) {
      sourceFile = qf.get.parseTreeOf(sourceFile).sourceFile;
      const emitNode = sourceFile && sourceFile.emitNode;
      const annotatedNodes = emitNode && emitNode.annotatedNodes;
      if (annotatedNodes) {
        for (const n of annotatedNodes) {
          n.emitNode = undefined;
        }
      }
    }
    getOrCreateEmitNode(n: qt.Node): qt.EmitNode {
      if (!n.emitNode) {
        if (qf.is.parseTreeNode(n)) {
          if (n.kind === Syntax.SourceFile) return (n.emitNode = { annotatedNodes: [n] } as qt.EmitNode);
          const sourceFile = qf.get.parseTreeOf(n.sourceFile).sourceFile;
          getOrCreateEmitNode(sourceFile).annotatedNodes!.push(n);
        }
        n.emitNode = {} as qt.EmitNode;
      }
      return n.emitNode;
    }
    removeAllComments<T extends qb.Nobj>(n: T): T {
      const emitNode = getOrCreateEmitNode(n);
      emitNode.flags |= EmitFlags.NoComments;
      emitNode.leadingComments = undefined;
      emitNode.trailingComments = undefined;
      return n;
    }
    setEmitFlags<T extends qb.Nobj>(n: T, emitFlags: EmitFlags) {
      getOrCreateEmitNode(n).flags = emitFlags;
      return n;
    }
    addEmitFlags<T extends qb.Nobj>(n: T, emitFlags: EmitFlags) {
      const emitNode = getOrCreateEmitNode(n);
      emitNode.flags = emitNode.flags | emitFlags;
      return n;
    }
    getSourceMapRange(n: qt.Node): qt.SourceMapRange {
      const emitNode = n.emitNode;
      return (emitNode && emitNode.sourceMapRange) || n;
    }
    setSourceMapRange<T extends qb.Nobj>(n: T, range: qt.SourceMapRange | undefined) {
      getOrCreateEmitNode(n).sourceMapRange = range;
      return n;
    }
    getTokenSourceMapRange(n: qt.Node, token: Syntax): qt.SourceMapRange | undefined {
      const emitNode = n.emitNode;
      const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
      return tokenSourceMapRanges && tokenSourceMapRanges[token];
    }
    setTokenSourceMapRange<T extends qb.Nobj>(n: T, token: Syntax, range: qt.SourceMapRange | undefined) {
      const emitNode = getOrCreateEmitNode(n);
      const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
      tokenSourceMapRanges[token] = range;
      return n;
    }
    getStartsOnNewLine(n: qt.Node) {
      const emitNode = n.emitNode;
      return emitNode && emitNode.startsOnNewLine;
    }
    setStartsOnNewLine<T extends qb.Nobj>(n: T, newLine: boolean) {
      getOrCreateEmitNode(n).startsOnNewLine = newLine;
      return n;
    }
    getCommentRange(n: qt.Node) {
      const emitNode = n.emitNode;
      return (emitNode && emitNode.commentRange) || n;
    }
    setCommentRange<T extends qb.Nobj>(n: T, range: qu.TextRange) {
      getOrCreateEmitNode(n).commentRange = range;
      return n;
    }
    getSyntheticLeadingComments(n: qt.Node): qt.SynthesizedComment[] | undefined {
      const emitNode = n.emitNode;
      return emitNode && emitNode.leadingComments;
    }
    setSyntheticLeadingComments<T extends qb.Nobj>(n: T, comments: qt.SynthesizedComment[] | undefined) {
      getOrCreateEmitNode(n).leadingComments = comments;
      return n;
    }
    addSyntheticLeadingComment<T extends qb.Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
      return setSyntheticLeadingComments(
        n,
        qu.append<qt.SynthesizedComment>(getSyntheticLeadingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
      );
    }
    getSyntheticTrailingComments(n: qt.Node): qt.SynthesizedComment[] | undefined {
      const emitNode = n.emitNode;
      return emitNode && emitNode.trailingComments;
    }
    setSyntheticTrailingComments<T extends qb.Nobj>(n: T, comments: qt.SynthesizedComment[] | undefined) {
      getOrCreateEmitNode(n).trailingComments = comments;
      return n;
    }
    addSyntheticTrailingComment<T extends qb.Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
      return setSyntheticTrailingComments(
        n,
        qu.append<qt.SynthesizedComment>(getSyntheticTrailingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
      );
    }
    moveSyntheticComments<T extends qb.Nobj>(n: T, original: qt.Node): T {
      setSyntheticLeadingComments(n, getSyntheticLeadingComments(original));
      setSyntheticTrailingComments(n, getSyntheticTrailingComments(original));
      const emit = getOrCreateEmitNode(original);
      emit.leadingComments = undefined;
      emit.trailingComments = undefined;
      return n;
    }
    ignoreSourceNewlines<T extends qb.Nobj>(n: T): T {
      getOrCreateEmitNode(n).flags |= EmitFlags.IgnoreSourceNewlines;
      return n;
    }
    getConstantValue(n: PropertyAccessExpression | ElemAccessExpression): string | number | undefined {
      const emitNode = n.emitNode;
      return emitNode && emitNode.constantValue;
    }
    setConstantValue(n: PropertyAccessExpression | ElemAccessExpression, value: string | number): PropertyAccessExpression | ElemAccessExpression {
      const emitNode = getOrCreateEmitNode(n);
      emitNode.constantValue = value;
      return n;
    }
    addEmitHelper<T extends qb.Nobj>(n: T, helper: qt.EmitHelper): T {
      const emitNode = getOrCreateEmitNode(n);
      emitNode.helpers = qu.append(emitNode.helpers, helper);
      return n;
    }
    addEmitHelpers<T extends qb.Nobj>(n: T, helpers: qt.EmitHelper[] | undefined): T {
      if (qu.some(helpers)) {
        const emitNode = getOrCreateEmitNode(n);
        for (const helper of helpers) {
          emitNode.helpers = qu.appendIfUnique(emitNode.helpers, helper);
        }
      }
      return n;
    }
    removeEmitHelper(n: qt.Node, helper: qt.EmitHelper): boolean {
      const emitNode = n.emitNode;
      if (emitNode) {
        const helpers = emitNode.helpers;
        if (helpers) return orderedRemoveItem(helpers, helper);
      }
      return false;
    }
    getEmitHelpers(n: qt.Node): qt.EmitHelper[] | undefined {
      const emitNode = n.emitNode;
      return emitNode && emitNode.helpers;
    }
    moveEmitHelpers(source: qt.Node, target: qt.Node, predicate: (helper: qt.EmitHelper) => boolean) {
      const sourceEmitNode = source.emitNode;
      const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
      if (!qu.some(sourceEmitHelpers)) return;
      const targetEmitNode = getOrCreateEmitNode(target);
      let helpersRemoved = 0;
      for (let i = 0; i < sourceEmitHelpers.length; i++) {
        const helper = sourceEmitHelpers[i];
        if (predicate(helper)) {
          helpersRemoved++;
          targetEmitNode.helpers = qu.appendIfUnique(targetEmitNode.helpers, helper);
        } else if (helpersRemoved > 0) sourceEmitHelpers[i - helpersRemoved] = helper;
      }
      if (helpersRemoved > 0) sourceEmitHelpers.length -= helpersRemoved;
    }
    compareEmitHelpers(x: qt.EmitHelper, y: qt.EmitHelper) {
      if (x === y) return qu.Comparison.EqualTo;
      if (x.priority === y.priority) return qu.Comparison.EqualTo;
      if (x.priority === undefined) return qu.Comparison.GreaterThan;
      if (y.priority === undefined) return qu.Comparison.LessThan;
      return qu.compareNumbers(x.priority, y.priority);
    }
    mergeEmitNode(sourceEmitNode: qt.EmitNode, destEmitNode: qt.EmitNode | undefined) {
      const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
      if (!destEmitNode) destEmitNode = {} as qt.EmitNode;
      if (leadingComments) destEmitNode.leadingComments = addRange(leadingComments.slice(), destEmitNode.leadingComments);
      if (trailingComments) destEmitNode.trailingComments = addRange(trailingComments.slice(), destEmitNode.trailingComments);
      if (flags) destEmitNode.flags = flags;
      if (commentRange) destEmitNode.commentRange = commentRange;
      if (sourceMapRange) destEmitNode.sourceMapRange = sourceMapRange;
      if (tokenSourceMapRanges) destEmitNode.tokenSourceMapRanges = qu.TextRange.merge(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges!);
      if (constantValue !== undefined) destEmitNode.constantValue = constantValue;
      if (helpers) destEmitNode.helpers = addRange(destEmitNode.helpers, helpers);
      if (startsOnNewLine !== undefined) destEmitNode.startsOnNewLine = startsOnNewLine;
      return destEmitNode;
    }
    getExternalHelpersModuleName(n: qt.SourceFile) {
      const parseNode = qf.get.originalOf(n, isSourceFile);
      const emitNode = parseNode && parseNode.emitNode;
      return emitNode && emitNode.externalHelpersModuleName;
    }
    hasRecordedExternalHelpers(sourceFile: qt.SourceFile) {
      const parseNode = qf.get.originalOf(sourceFile, isSourceFile);
      const emitNode = parseNode && parseNode.emitNode;
      return !!emitNode && (!!emitNode.externalHelpersModuleName || !!emitNode.externalHelpers);
    }
  })());
}
export namespace fixme {
  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => SourceMapSource;
  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = qt.Node.SourceMapSourceObj))(fileName, text, qy.skipTrivia);
  }
  export function getUnscopedHelperName(name: string) {
    return setEmitFlags(new Identifier(name), EmitFlags.HelperName | EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly qt.Expression[]) {
    return expressions.length > 10 ? new CommaListExpression(expressions) : reduceLeft(expressions, qf.create.comma)!;
  }
  export function convertToFunctionBody(node: qt.ConciseBody, multiLine?: boolean): qt.Block {
    return qf.is.kind(Block, node) ? node : new Block([new ReturnStatement(node).setRange(node)], multiLine).setRange(node);
  }
  export function ensureUseStrict(statements: qt.Nodes<qt.Statement>): qt.Nodes<qt.Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);
    if (!foundUseStrict) {
      return new Nodes<qt.Statement>([startOnNewLine(new ExpressionStatement(asLiteral('use strict'))), ...statements]).setRange(statements);
    }
    return statements;
  }
  export function startOnNewLine<T extends qb.Nobj>(node: T): T {
    return setStartsOnNewLine(node, true);
  }
  export function createExternalHelpersImportDeclarationIfNeeded(
    sourceFile: SourceFile,
    compilerOpts: qt.CompilerOpts,
    hasExportStarsToExportValues?: boolean,
    hasImportStar?: boolean,
    hasImportDefault?: boolean
  ) {
    if (compilerOpts.importHelpers && isEffectiveExternalModule(sourceFile, compilerOpts)) {
      let namedBindings: qt.NamedImportBindings | undefined;
      const moduleKind = getEmitModuleKind(compilerOpts);
      if (moduleKind >= qt.ModuleKind.ES2015 && moduleKind <= qt.ModuleKind.ESNext) {
        const helpers = getEmitHelpers(sourceFile);
        if (helpers) {
          const helperNames: string[] = [];
          for (const helper of helpers) {
            if (!helper.scoped) {
              const importName = (helper as UnscopedEmitHelper).importName;
              if (importName) {
                qu.pushIfUnique(helperNames, importName);
              }
            }
          }
          if (qu.some(helperNames)) {
            helperNames.sort(compareCaseSensitive);
            namedBindings = new NamedImports(
              qu.map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name) ? new ImportSpecifier(undefined, new Identifier(name)) : new qb.ImportSpecifier(new Identifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = qf.get.originalOf(sourceFile, isSourceFile);
            const emitNode = getOrCreateEmitNode(parseNode);
            emitNode.externalHelpers = true;
          }
        }
      } else {
        const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(sourceFile, compilerOpts, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
        if (externalHelpersModuleName) {
          namedBindings = new NamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = new ImportDeclaration(undefined, undefined, new ImportClause(undefined, namedBindings), asLiteral(externalHelpersModuleNameText));
        addEmitFlags(externalHelpersImportDeclaration, EmitFlags.NeverApplyImportHelper);
        return externalHelpersImportDeclaration;
      }
    }
    return;
  }
  export function getOrCreateExternalHelpersModuleNameIfNeeded(node: SourceFile, compilerOpts: qt.CompilerOpts, hasExportStarsToExportValues?: boolean, hasImportStarOrImportDefault?: boolean) {
    if (compilerOpts.importHelpers && isEffectiveExternalModule(node, compilerOpts)) {
      const externalHelpersModuleName = getExternalHelpersModuleName(node);
      if (externalHelpersModuleName) return externalHelpersModuleName;
      const moduleKind = getEmitModuleKind(compilerOpts);
      let create = (hasExportStarsToExportValues || (compilerOpts.esModuleInterop && hasImportStarOrImportDefault)) && moduleKind !== qt.ModuleKind.System && moduleKind < qt.ModuleKind.ES2015;
      if (!create) {
        const helpers = getEmitHelpers(node);
        if (helpers) {
          for (const helper of helpers) {
            if (!helper.scoped) {
              create = true;
              break;
            }
          }
        }
      }
      if (create) {
        const parseNode = qf.get.originalOf(node, isSourceFile);
        const emitNode = getOrCreateEmitNode(parseNode);
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = createUniqueName(externalHelpersModuleNameText));
      }
    }
    return;
  }
  export function getExternalModuleNameLiteral(
    importNode: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration,
    sourceFile: SourceFile,
    host: qt.EmitHost,
    resolver: qt.EmitResolver,
    compilerOpts: qt.CompilerOpts
  ) {
    const moduleName = qf.get.externalModuleName(importNode)!;
    if (moduleName.kind === Syntax.StringLiteral) {
      function tryRenameExternalModule(moduleName: qt.LiteralExpression, sourceFile: SourceFile) {
        const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
        return rename && asLiteral(rename);
      }
      function tryGetModuleNameFromDeclaration(
        declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration,
        host: qt.EmitHost,
        resolver: qt.EmitResolver,
        compilerOpts: qt.CompilerOpts
      ) {
        return tryGetModuleNameFromFile(resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOpts);
      }
      return (
        tryGetModuleNameFromDeclaration(importNode, host, resolver, compilerOpts) || tryRenameExternalModule(<StringLiteral>moduleName, sourceFile) || getSynthesizedClone(<StringLiteral>moduleName)
      );
    }
    return;
  }
  export function tryGetModuleNameFromFile(file: SourceFile | undefined, host: qt.EmitHost, opts: qt.CompilerOpts): StringLiteral | undefined {
    if (!file) {
      return;
    }
    if (file.moduleName) return asLiteral(file.moduleName);
    if (!file.isDeclarationFile && (opts.out || opts.outFile)) return asLiteral(qf.get.externalModuleNameFromPath(host, file.fileName));
    return;
  }
}
