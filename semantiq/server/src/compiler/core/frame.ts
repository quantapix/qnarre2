import { Nodes } from './bases';
import * as qb from './bases';
import { NodeType } from './classes';
import * as qc from './classes';
import * as qd from '../diagnostic';
import * as qg from './groups';
import { EmitFlags, Modifier, ModifierFlags, Node, NodeFlags, TokenFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
export function newCreate(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
    nest: Fnest;
  }
  const qf = f as Frame;
  return (qf.create = new (class {
    nextAutoGenerateId = 0;
    node<T extends Syntax>(k: T, pos: number, end: number, parent?: Nobj): NodeType<T> {
      const n =
        qy.is.node(k) || k === Syntax.Unknown
          ? new Nobj(k, pos, end)
          : k === Syntax.SourceFile
          ? new SourceFileObj(Syntax.SourceFile, pos, end)
          : k === Syntax.Identifier
          ? new qc.Identifier(Syntax.Identifier, pos, end)
          : k === Syntax.PrivateIdentifier
          ? new PrivateIdentifier(Syntax.PrivateIdentifier, pos, end)
          : new Token<T>(k, pos, end);
      if (parent) {
        n.parent = parent;
        n.flags = parent.flags & NodeFlags.ContextFlags;
      }
      return (n as unknown) as NodeType<T>;
    }
    createSynthesized<T extends Syntax>(k: T): NodeType<T> {
      const n = this.node<T>(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    getMutableClone<T extends Nobj>(node: T): T {
      const clone = getSynthesizedClone(node);
      clone.pos = node.pos;
      clone.end = node.end;
      clone.parent = node.parent;
      return clone;
    }
    getSynthesizedClone<T extends Nobj>(node: T): T {
      if (node === undefined) return node;
      const clone = this.createSynthesized(node.kind) as T;
      clone.flags |= node.flags;
      clone.setOriginal(node);
      for (const key in node) {
        if (clone.hasOwnProperty(key) || !node.hasOwnProperty(key)) continue;
        (<any>clone)[key] = (<any>node)[key];
      }
      return clone;
    }
    createUnparsedNode(s: qt.BundleFileSection, p: qt.UnparsedSource): qt.UnparsedNode {
      const n = new qc.UparsedNode(mapBundleFileSectionKindToSyntax(s.kind), s.pos, s.end);
      n.parent = p;
      n.data = s.data;
      return n;
    }

    fromNode(n: Exclude<qt.PropertyNameLiteral, qt.PrivateIdentifier>): qt.StringLiteral {
      const r = new qc.StringLiteral(qf.get.textOfIdentifierOrLiteral(n));
      r.textSourceNode = n;
      return r;
    }
    logicalNot(e: qt.Expression) {
      return new qc.PrefixUnaryExpression(Syntax.ExclamationToken, e);
    }
    increment(e: qt.Expression) {
      return new qc.PostfixUnaryExpression(e, Syntax.Plus2Token);
    }
    recreateOuterExpressions(o: qt.Expression | undefined, i: qt.Expression, ks = qt.OuterExpressionKinds.All): qt.Expression {
      if (o && qf.is.outerExpression(o, ks) && !qf.is.ignorableParen(o)) return o.update(this.recreateOuterExpressions(o.expression, i));
      return i;
    }
    reactNamespace(react: string, p: qt.JsxOpeningLikeElem | qt.JsxOpeningFragment) {
      const r = new qc.Identifier(react || 'React');
      r.flags &= ~NodeFlags.Synthesized;
      r.parent = qf.get.parseTreeOf(p);
      return r;
    }
    jsxFactoryExpressionFromEntityName(e: qt.EntityName, p: qt.JsxOpeningLikeElem | qt.JsxOpeningFragment): qt.Expression {
      if (e.kind === Syntax.QualifiedName) {
        const l = this.jsxFactoryExpressionFromEntityName(e.left, p);
        const r = new qc.Identifier(qb.idText(e.right));
        r.escapedText = e.right.escapedText;
        return new qc.PropertyAccessExpression(l, r);
      }
      return this.reactNamespace(qb.idText(e), p);
    }
    jsxFactoryExpression(e: qt.EntityName | undefined, react: string, p: qt.JsxOpeningLikeElem | qt.JsxOpeningFragment): qt.Expression {
      return e ? this.jsxFactoryExpressionFromEntityName(e, p) : new qc.PropertyAccessExpression(this.reactNamespace(react, p), 'createElem');
    }
    expressionForJsxFragment(e: qt.EntityName | undefined, react: string, cs: readonly qt.Expression[], p: qt.JsxOpeningFragment, r: qu.TextRange): qt.LeftExpression {
      const t = new qc.PropertyAccessExpression(this.reactNamespace(react, p), 'Fragment');
      const args = [t as qt.Expression];
      args.push(new qc.NullLiteral());
      if (cs.length > 1) {
        for (const c of cs) {
          startOnNewLine(c);
          args.push(c);
        }
      } else args.push(cs[0]);
      return new qc.CallExpression(this.jsxFactoryExpression(e, react, p), undefined, args).setRange(r);
    }
    expression(e: qt.EntityName | undefined, react: string, t: qt.Expression, ps: qt.Expression, cs: readonly qt.Expression[], p: qt.JsxOpeningLikeElem, r: qu.TextRange): qt.LeftExpression {
      const args = [t];
      if (ps) args.push(ps);
      if (cs.length) {
        if (!ps) args.push(new qc.NullLiteral());
        if (cs.length > 1) {
          for (const c of cs) {
            startOnNewLine(c);
            args.push(c);
          }
        } else args.push(cs[0]);
      }
      return new qc.CallExpression(this.jsxFactoryExpression(e, react, p), undefined, args).setRange(r);
    }
    externalModuleExport(i: qt.Identifier) {
      return new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(undefined, i)]));
    }
    emptyExports() {
      return new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([]), undefined);
    }
    exportDefault(e: qt.Expression) {
      return new qc.ExportAssignment(undefined, undefined, false, e);
    }
    immediateFunctionExpression(ss: readonly qt.Statement[]): qt.CallExpression;
    immediateFunctionExpression(ss: readonly qt.Statement[], p: qt.ParamDeclaration, v: qt.Expression): qt.CallExpression;
    immediateFunctionExpression(ss: readonly qt.Statement[], p?: qt.ParamDeclaration, v?: qt.Expression) {
      return new qc.CallExpression(new qc.FunctionExpression(undefined, undefined, undefined, undefined, p ? [p] : [], undefined, new qc.Block(ss, true)), undefined, v ? [v] : []);
    }
    immediateArrowFunction(ss: readonly qt.Statement[]): qt.CallExpression;
    immediateArrowFunction(ss: readonly qt.Statement[], p: qt.ParamDeclaration, v: qt.Expression): qt.CallExpression;
    immediateArrowFunction(ss: readonly qt.Statement[], p?: qt.ParamDeclaration, v?: qt.Expression) {
      return new qc.CallExpression(new qc.ArrowFunction(undefined, undefined, p ? [p] : [], undefined, undefined, new qc.Block(ss, true)), undefined, v ? [v] : []);
    }
    callBinding(e: qc.Expression, recordTempVariable: (temp: qt.Identifier) => void, _?: qc.ScriptTarget, cacheIdentifiers = false): qc.CallBinding {
      const callee = qb.skip.outerExpressions(e, qc.OuterExpressionKinds.All);
      let thisArg: qc.Expression;
      let target: qc.LeftExpression;
      if (qf.is.superProperty(callee)) {
        thisArg = new qc.ThisExpression();
        target = callee;
      } else if (callee.kind === Syntax.SuperKeyword) {
        thisArg = new qc.ThisExpression();
        target = <qt.PrimaryExpression>callee;
      } else if (qf.get.emitFlags(callee) & qt.EmitFlags.HelperName) {
        thisArg = VoidExpression.zero();
        target = qf.nest.forAccess(callee);
      } else {
        switch (callee.kind) {
          case Syntax.PropertyAccessExpression: {
            if (qf.is.toBeCapturedInTempVariable((<qt.PropertyAccessExpression>callee).expression, cacheIdentifiers)) {
              // for `a.b()` target is `(_a = a).b` and thisArg is `_a`
              thisArg = createTempVariable(recordTempVariable);
              target = new qc.PropertyAccessExpression(
                this.assignment(thisArg, (<qt.PropertyAccessExpression>callee).expression).setRange((<qt.PropertyAccessExpression>callee).expression),
                (<qt.PropertyAccessExpression>callee).name
              );
              target.setRange(callee);
            } else {
              thisArg = (<qt.PropertyAccessExpression>callee).expression;
              target = <qt.PropertyAccessExpression>callee;
            }
            break;
          }
          case Syntax.ElemAccessExpression: {
            if (qf.is.toBeCapturedInTempVariable((<qt.ElemAccessExpression>callee).expression, cacheIdentifiers)) {
              // for `a[b]()` target is `(_a = a)[b]` and thisArg is `_a`
              thisArg = createTempVariable(recordTempVariable);
              target = new qc.ElemAccessExpression(
                this.assignment(thisArg, (<qt.ElemAccessExpression>callee).expression).setRange((<qt.ElemAccessExpression>callee).expression),
                (<qt.ElemAccessExpression>callee).argExpression
              );
              target.setRange(callee);
            } else {
              thisArg = (<qt.ElemAccessExpression>callee).expression;
              target = <qt.ElemAccessExpression>callee;
            }
            break;
          }
          default: {
            // for `a()` target is `a` and thisArg is `void 0`
            thisArg = qc.VoidExpression.zero();
            target = qf.nest.forAccess(e);
            break;
          }
        }
      }
      return { target, thisArg };
    }
    strictEquality(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.Equals3Token, r);
    }
    strictInequality(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.ExclamationEquals2Token, r);
    }
    add(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.PlusToken, r);
    }
    subtract(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.MinusToken, r);
    }
    logicalAnd(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.Ampersand2Token, r);
    }
    logicalOr(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.Bar2Token, r);
    }
    nullishCoalesce(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.Question2Token, r);
    }
    comma(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.CommaToken, r);
    }
    lessThan(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.LessThanToken, r);
    }
    //qf.create.assignment(l: ObjectLiteralExpression | ArrayLiteralExpression, r: qt.Expression): qt.DestructuringAssignment;
    assignment(l: qt.Expression, r: qt.Expression): qc.BinaryExpression;
    assignment(l: qt.Expression, r: qt.Expression) {
      return new qc.BinaryExpression(l, Syntax.EqualsToken, r);
    }
    commentDirectivesMap(s: qt.SourceFile, ds: qt.CommentDirective[]): qt.CommentDirectivesMap {
      const ds2 = new qu.QMap(ds.map((d) => [`${qy.get.lineAndCharOf(s, d.range.end).line}`, d]));
      const ls = new qu.QMap<boolean>();
      function getUnusedExpectations() {
        return qu
          .arrayFrom(ds2.entries())
          .filter(([l, d]) => d.type === qt.CommentDirectiveType.ExpectError && !ls.get(l))
          .map(([_, d]) => d);
      }
      function markUsed(l: number) {
        if (!ds2.has(`${l}`)) return false;
        ls.set(`${l}`, true);
        return true;
      }
      return { getUnusedExpectations, markUsed };
    }
    diagnosticForNode(n: Node, m: qd.Message, a0?: string | number, a1?: string | number, a2?: string | number, a3?: string | number): qd.DiagnosticWithLocation {
      return this.diagnosticForNodeInSourceFile(n.sourceFile, n, m, a0, a1, a2, a3);
    }
    diagnosticForNodeFromMessageChain(n: Node, c: qd.MessageChain, i?: qd.DiagnosticRelatedInformation[]): qd.DiagnosticWithLocation {
      const s = n.sourceFile;
      const { start, length } = qf.get.errorSpanForNode(s, n);
      return { file: s, start, length, code: c.code, cat: c.cat, text: c.next ? c : c.text, relatedInformation: i };
    }
    diagnosticForNodeInSourceFile(s: qt.SourceFile, n: Node, m: qd.Message, a0?: string | number, a1?: string | number, a2?: string | number, a3?: string | number) {
      const span = qf.get.errorSpanForNode(s, n);
      return this.fileDiagnostic(s, span.start, span.length, m, a0, a1, a2, a3);
    }
    diagnosticForNodes(s: qt.SourceFile, ns: Nodes<Node>, m: qd.Message, a0?: string | number, a1?: string | number, a2?: string | number, a3?: string | number) {
      const start = qy.skipTrivia(s.text, ns.pos);
      return this.fileDiagnostic(s, start, ns.end - start, m, a0, a1, a2, a3);
    }
    diagnosticForRange(s: qt.SourceFile, r: qu.TextRange, m: qd.Message): qd.DiagnosticWithLocation {
      return { file: s, start: r.pos, length: r.end - r.pos, code: m.code, cat: m.cat, text: m.text };
    }
    fileDiagnostic(file: qt.SourceFile, start: number, length: number, m: qd.Message, ...args: (string | number | undefined)[]): qd.DiagnosticWithLocation;
    fileDiagnostic(file: qt.SourceFile, start: number, length: number, m: qd.Message): qd.DiagnosticWithLocation {
      qu.assertGreaterThanOrEqual(start, 0);
      qu.assertGreaterThanOrEqual(length, 0);
      if (file) {
        qu.assertLessThanOrEqual(start, file.text.length);
        qu.assertLessThanOrEqual(start + length, file.text.length);
      }
      let text = qd.getLocaleSpecificMessage(m);
      if (args.length > 4) text = qu.formatStringFromArgs(text, args, 4);
      return { file, start, length, text, cat: m.cat, code: m.code, reportsUnnecessary: m.reportsUnnecessary };
    }
    globalMethodCall(o: string, n: string, args: readonly qt.Expression[]) {
      return this.methodCall(new qc.Identifier(o), n, args);
    }
    methodCall(e: qt.Expression, n: string | qt.Identifier, args: readonly qt.Expression[]) {
      return new qc.CallExpression(new qc.PropertyAccessExpression(e, qc.asName(n)), undefined, args);
    }
    modifier<T extends Modifier['kind']>(k: T): qt.Token<T> {
      return new qc.Token(k);
    }
    modifiersFromFlags(f: ModifierFlags) {
      const r: Modifier[] = [];
      if (f & ModifierFlags.Abstract) r.push(this.modifier(Syntax.AbstractKeyword));
      if (f & ModifierFlags.Ambient) r.push(this.modifier(Syntax.DeclareKeyword));
      if (f & ModifierFlags.Async) r.push(this.modifier(Syntax.AsyncKeyword));
      if (f & ModifierFlags.Const) r.push(this.modifier(Syntax.ConstKeyword));
      if (f & ModifierFlags.Default) r.push(this.modifier(Syntax.DefaultKeyword));
      if (f & ModifierFlags.Export) r.push(this.modifier(Syntax.ExportKeyword));
      if (f & ModifierFlags.Private) r.push(this.modifier(Syntax.PrivateKeyword));
      if (f & ModifierFlags.Protected) r.push(this.modifier(Syntax.ProtectedKeyword));
      if (f & ModifierFlags.Public) r.push(this.modifier(Syntax.PublicKeyword));
      if (f & ModifierFlags.Readonly) r.push(this.modifier(Syntax.ReadonlyKeyword));
      if (f & ModifierFlags.Static) r.push(this.modifier(Syntax.StaticKeyword));
      return r;
    }
    objectDefinePropertyCall(e: qt.Expression, p: string | qt.Expression, attributes: qt.Expression) {
      return this.globalMethodCall('Object', 'defineProperty', [e, qc.asExpression(p), attributes]);
    }
    propertyDescriptor(a: qt.PropertyDescriptorAttributes, singleLine?: boolean) {
      const ps: qt.PropertyAssignment[] = [];
      tryAddPropertyAssignment(ps, 'enumerable', qc.asExpression(a.enumerable));
      tryAddPropertyAssignment(ps, 'configurable', qc.asExpression(a.configurable));
      let isData = tryAddPropertyAssignment(ps, 'writable', qc.asExpression(a.writable));
      isData = tryAddPropertyAssignment(ps, 'value', a.value) || isData;
      let isAccessor = tryAddPropertyAssignment(ps, 'get', a.get);
      isAccessor = tryAddPropertyAssignment(ps, 'set', a.set) || isAccessor;
      qu.assert(!(isData && isAccessor));
      return new qc.ObjectLiteralExpression(ps, !singleLine);
    }
    tokenRange(pos: number, k: Syntax): qu.TextRange {
      return new qu.TextRange(pos, pos + qy.toString(k)!.length);
    }
    createExpressionFromEntityName(n: qc.EntityName | qt.Expression): qt.Expression {
      if (qf.is.kind(QualifiedName, n)) {
        const left = createExpressionFromEntityName(n.left);
        const right = getMutableClone(n.right);
        return setRange(new qc.PropertyAccessExpression(left, right), n);
      }
      return getMutableClone(n);
    }
    createExpressionForPropertyName(memberName: Exclude<qt.PropertyName, qt.PrivateIdentifier>): qt.Expression {
      if (qf.is.kind(qc.Identifier, memberName)) return qc.asLiteral(memberName);
      else if (qf.is.kind(qc.ComputedPropertyName, memberName)) return getMutableClone(memberName.expression);
      return getMutableClone(memberName);
    }
    createExpressionForObjectLiteralElemLike(n: qt.ObjectLiteralExpression, property: qt.ObjectLiteralElemLike, receiver: qt.Expression): qt.Expression | undefined {
      if (property.name && qf.is.kind(qc.PrivateIdentifier, property.name)) qc.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
      function createExpressionForAccessorDeclaration(
        properties: Nodes<qt.Declaration>,
        property: qt.AccessorDeclaration & { name: Exclude<qt.PropertyName, qt.PrivateIdentifier> },
        receiver: qt.Expression,
        multiLine: boolean
      ) {
        const { firstAccessor, getAccessor, setAccessor } = qf.get.allAccessorDeclarations(properties, property);
        if (property === firstAccessor) {
          const properties: qt.ObjectLiteralElemLike[] = [];
          if (getAccessor) {
            const getterFunction = new qc.FunctionExpression(getAccessor.modifiers, undefined, undefined, undefined, getAccessor.params, undefined, getAccessor.body!);
            setRange(getterFunction, getAccessor);
            getterFunction.setOriginal(getAccessor);
            const getter = new qc.PropertyAssignment('get', getterFunction);
            properties.push(getter);
          }
          if (setAccessor) {
            const setterFunction = new qc.FunctionExpression(setAccessor.modifiers, undefined, undefined, undefined, setAccessor.params, undefined, setAccessor.body!);
            setRange(setterFunction, setAccessor);
            setterFunction.setOriginal(setAccessor);
            const setter = new qc.PropertyAssignment('set', setterFunction);
            properties.push(setter);
          }
          properties.push(new qc.PropertyAssignment('enumerable', getAccessor || setAccessor ? new qc.BooleanLiteral(false) : new qc.BooleanLiteral(true)));
          properties.push(new qc.PropertyAssignment('configurable', new qc.BooleanLiteral(true)));
          const expression = setRange(
            new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'defineProperty'), undefined, [
              receiver,
              createExpressionForPropertyName(property.name),
              new qc.ObjectLiteralExpression(properties, multiLine),
            ]),
            firstAccessor
          );
          return qc.compute.aggregate(expression);
        }
        return;
      }
      function createExpressionForPropertyAssignment(property: qt.PropertyAssignment, receiver: qt.Expression) {
        return qc.compute.aggregate(setRange(this.assignment(createMemberAccessForPropertyName(receiver, property.name, property.name), property.initer), property).setOriginal(property));
      }
      function createExpressionForShorthandPropertyAssignment(property: qt.ShorthandPropertyAssignment, receiver: qt.Expression) {
        return qc.compute.aggregate(
          setRange(this.assignment(createMemberAccessForPropertyName(receiver, property.name, property.name), getSynthesizedClone(property.name)), property).setOriginal(property)
        );
      }
      function createExpressionForMethodDeclaration(method: qt.MethodDeclaration, receiver: qt.Expression) {
        return qc.compute.aggregate(
          setOriginalNode(
            setRange(
              this.assignment(
                createMemberAccessForPropertyName(receiver, method.name, method.name),
                setRange(new qc.FunctionExpression(method.modifiers, method.asteriskToken, undefined, undefined, method.params, undefined, method.body!), method).setOriginal(method)
              ),
              method
            ),
            method
          )
        );
      }
      switch (property.kind) {
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return createExpressionForAccessorDeclaration(n.properties, property as typeof property & { name: Exclude<PropertyName, qt.PrivateIdentifier> }, receiver, !!n.multiLine);
        case Syntax.PropertyAssignment:
          return createExpressionForPropertyAssignment(property, receiver);
        case Syntax.ShorthandPropertyAssignment:
          return createExpressionForShorthandPropertyAssignment(property, receiver);
        case Syntax.MethodDeclaration:
          return createExpressionForMethodDeclaration(property, receiver);
      }
      return;
    }
    createTypeCheck(value: qt.Expression, tag: qt.TypeOfTag) {
      return tag === 'undefined' ? this.strictEquality(value, qc.VoidExpression.zero()) : this.strictEquality(new qc.TypeOfExpression(value), qc.asLiteral(tag));
    }
    createMemberAccessForPropertyName(target: qt.Expression, memberName: qt.PropertyName, location?: qu.TextRange): qt.MemberExpression {
      if (qf.is.kind(qc.ComputedPropertyName, memberName)) return setRange(new qc.ElemAccessExpression(target, memberName.expression), location);
      else {
        const expression = setRange(
          qf.is.kind(qc.Identifier, memberName) || qf.is.kind(qc.PrivateIdentifier, memberName) ? new qc.PropertyAccessExpression(target, memberName) : new qc.ElemAccessExpression(target, memberName),
          memberName
        );
        getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
        return expression;
      }
    }
    createFunctionCall(func: qt.Expression, thisArg: qt.Expression, argsList: readonly qt.Expression[], location?: qu.TextRange) {
      return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(func, 'call'), undefined, [thisArg, ...argsList]), location);
    }
    createFunctionApply(func: qt.Expression, thisArg: qt.Expression, argsExpression: qt.Expression, location?: qu.TextRange) {
      return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(func, 'apply'), undefined, [thisArg, argsExpression]), location);
    }
    createArraySlice(array: qt.Expression, start?: number | qt.Expression) {
      const argsList: qt.Expression[] = [];
      if (start !== undefined) argsList.push(typeof start === 'number' ? qc.asLiteral(start) : start);
      return new qc.CallExpression(new qc.PropertyAccessExpression(array, 'slice'), undefined, argsList);
    }
    createArrayConcat(array: qt.Expression, values: readonly qt.Expression[]) {
      return new qc.CallExpression(new qc.PropertyAccessExpression(array, 'concat'), undefined, values);
    }
    createMathPow(left: qt.Expression, right: qt.Expression, location?: qu.TextRange) {
      return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Math'), 'pow'), undefined, [left, right]), location);
    }
    createTempVariable(record?: (i: qt.Identifier) => void): qt.Identifier;
    createTempVariable(record: ((i: qt.Identifier) => void) | undefined, reserved: boolean): qt.GeneratedIdentifier;
    createTempVariable(record?: (i: qt.Identifier) => void, reserved?: boolean): qt.GeneratedIdentifier {
      const n = new qc.Identifier('') as qt.GeneratedIdentifier;
      n.autoGenerateFlags = qt.GeneratedIdentifierFlags.Auto;
      n.autoGenerateId = this.nextAutoGenerateId;
      this.nextAutoGenerateId++;
      if (record) record(n);
      if (reserved) n.autoGenerateFlags |= qt.GeneratedIdentifierFlags.ReservedInNestedScopes;
      return n;
    }
    createLoopVariable(): qt.Identifier {
      const n = new qc.Identifier('');
      n.autoGenerateFlags = qt.GeneratedIdentifierFlags.Loop;
      n.autoGenerateId = this.nextAutoGenerateId;
      this.nextAutoGenerateId++;
      return n;
    }
    createUniqueName(t: string): qt.Identifier {
      const n = new qc.Identifier(t);
      n.autoGenerateFlags = qt.GeneratedIdentifierFlags.Unique;
      n.autoGenerateId = this.nextAutoGenerateId;
      this.nextAutoGenerateId++;
      return n;
    }
    createOptimisticUniqueName(t: string): qt.Identifier;
    createOptimisticUniqueName(t: string): qt.GeneratedIdentifier;
    createOptimisticUniqueName(t: string): qt.GeneratedIdentifier {
      const n = new qc.Identifier(t) as qt.GeneratedIdentifier;
      n.autoGenerateFlags = qt.GeneratedIdentifierFlags.Unique | qt.GeneratedIdentifierFlags.Optimistic;
      n.autoGenerateId = this.nextAutoGenerateId;
      this.nextAutoGenerateId++;
      return n;
    }
    createFileLevelUniqueName(t: string): qt.Identifier {
      const n = this.createOptimisticUniqueName(t);
      n.autoGenerateFlags |= qt.GeneratedIdentifierFlags.FileLevel;
      return n;
    }
  })());
}
export interface Fcreate extends ReturnType<typeof newCreate> {}
export function newEach(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.each = new (class {
    returnStatement<T>(n: Node, cb: (s: qt.ReturnStatement) => T): T | undefined {
      const traverse = (n?: Node): T | undefined => {
        switch (n?.kind) {
          case Syntax.ReturnStatement:
            return cb(n);
          case Syntax.CaseBlock:
          case Syntax.Block:
          case Syntax.IfStatement:
          case Syntax.DoStatement:
          case Syntax.WhileStatement:
          case Syntax.ForStatement:
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
          case Syntax.WithStatement:
          case Syntax.SwitchStatement:
          case Syntax.CaseClause:
          case Syntax.DefaultClause:
          case Syntax.LabeledStatement:
          case Syntax.TryStatement:
          case Syntax.CatchClause:
            return this.child(n, traverse);
        }
        return;
      };
      return traverse(n);
    }
    yieldExpression(n: Node, cb: (e: qt.YieldExpression) => void): void {
      const traverse = (n?: Node) => {
        switch (n?.kind) {
          case Syntax.YieldExpression:
            cb(n);
            const o = n.expression;
            if (o) traverse(o);
            break;
          case Syntax.EnumDeclaration:
          case Syntax.InterfaceDeclaration:
          case Syntax.ModuleDeclaration:
          case Syntax.TypeAliasDeclaration:
            break;
          default:
            if (qf.is.functionLike(n)) {
              if (n.name && n.name.kind === Syntax.ComputedPropertyName) traverse(n.name.expression);
            } else if (n && !qf.is.partOfTypeNode(n)) this.child(n, traverse);
        }
      };
      traverse(n);
    }
    ancestor<T>(n: Node | undefined, cb: (n: Node) => T | undefined | 'quit'): T | undefined {
      while (n) {
        const r = cb(n);
        if (r === 'quit') return;
        if (r) return r;
        if (n.kind === Syntax.SourceFile) return;
        n = n.parent as Node;
      }
      return;
    }
    child<T>(n: Node, cb: (n?: Node) => T | undefined, cbs?: (ns: Nodes) => T | undefined): T | undefined {
      if (n.kind <= Syntax.LastToken) return;
      switch (n.kind) {
        case Syntax.QualifiedName:
          return n.left.visit(cb) || n.right.visit(cb);
        case Syntax.TypeParam:
          return n.name.visit(cb) || n.constraint?.visit(cb) || n.default?.visit(cb) || n.expression?.visit(cb);
        case Syntax.ShorthandPropertyAssignment:
          return (
            n.decorators?.visit(cb, cbs) ||
            n.modifiers?.visit(cb, cbs) ||
            n.name.visit(cb) ||
            n.questionToken?.visit(cb) ||
            n.exclamationToken?.visit(cb) ||
            n.equalsToken?.visit(cb) ||
            n.objectAssignmentIniter?.visit(cb)
          );
        case Syntax.SpreadAssignment:
          return n.expression.visit(cb);
        case Syntax.Param:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initer?.visit(cb);
        case Syntax.PropertyDeclaration:
          return (
            n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initer?.visit(cb)
          );
        case Syntax.PropertySignature:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initer?.visit(cb);
        case Syntax.PropertyAssignment:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.initer.visit(cb);
        case Syntax.VariableDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initer?.visit(cb);
        case Syntax.BindingElem:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.dot3Token?.visit(cb) || n.propertyName?.visit(cb) || n.name.visit(cb) || n.initer?.visit(cb);
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.typeParams?.visit(cb, cbs) || n.params.visit(cb, cbs) || n.type?.visit(cb);
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionExpression:
        case Syntax.FunctionDeclaration:
        case Syntax.ArrowFunction:
          return (
            n.decorators?.visit(cb, cbs) ||
            n.modifiers?.visit(cb, cbs) ||
            n.asteriskToken?.visit(cb) ||
            n.name?.visit(cb) ||
            n.questionToken?.visit(cb) ||
            n.exclamationToken?.visit(cb) ||
            n.typeParams?.visit(cb, cbs) ||
            n.params.visit(cb, cbs) ||
            n.type?.visit(cb) ||
            (n as qt.ArrowFunction).equalsGreaterThanToken.visit(cb) ||
            n.body?.visit(cb)
          );
        case Syntax.TypingReference:
          return n.typeName.visit(cb) || n.typeArgs?.visit(cb, cbs);
        case Syntax.TypingPredicate:
          return n.assertsModifier?.visit(cb) || n.paramName.visit(cb) || n.type?.visit(cb);
        case Syntax.TypingQuery:
          return n.exprName.visit(cb);
        case Syntax.TypingLiteral:
          return n.members.visit(cb, cbs);
        case Syntax.ArrayTyping:
          return n.elemType.visit(cb);
        case Syntax.TupleTyping:
          return n.elems.visit(cb, cbs);
        case Syntax.UnionTyping:
        case Syntax.IntersectionTyping:
          return n.types.visit(cb, cbs);
        case Syntax.ConditionalTyping:
          return n.checkType.visit(cb) || n.extendsType.visit(cb) || n.trueType.visit(cb) || n.falseType.visit(cb);
        case Syntax.InferTyping:
          return n.typeParam.visit(cb);
        case Syntax.ImportTyping:
          return n.arg.visit(cb) || n.qualifier?.visit(cb) || n.typeArgs?.visit(cb, cbs);
        case Syntax.ParenthesizedTyping:
        case Syntax.TypingOperator:
          return n.type.visit(cb);
        case Syntax.IndexedAccessTyping:
          return n.objectType.visit(cb) || n.indexType.visit(cb);
        case Syntax.MappedTyping:
          return n.readonlyToken?.visit(cb) || n.typeParam.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb);
        case Syntax.LiteralTyping:
          return n.literal.visit(cb);
        case Syntax.NamedTupleMember:
          return n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type.visit(cb);
        case Syntax.ObjectBindingPattern:
        case Syntax.ArrayBindingPattern:
          return n.elems.visit(cb, cbs);
        case Syntax.ArrayLiteralExpression:
          return n.elems.visit(cb, cbs);
        case Syntax.ObjectLiteralExpression:
          return n.properties.visit(cb, cbs);
        case Syntax.PropertyAccessExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.name.visit(cb);
        case Syntax.ElemAccessExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.argExpression.visit(cb);
        case Syntax.CallExpression:
        case Syntax.NewExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.typeArgs?.visit(cb, cbs) || n.args?.visit(cb, cbs);
        case Syntax.TaggedTemplateExpression:
          return n.tag.visit(cb) || n.questionDotToken?.visit(cb) || n.typeArgs?.visit(cb, cbs) || n.template.visit(cb);
        case Syntax.TypeAssertionExpression:
          return n.type.visit(cb) || n.expression.visit(cb);
        case Syntax.ParenthesizedExpression:
          return n.expression.visit(cb);
        case Syntax.DeleteExpression:
          return n.expression.visit(cb);
        case Syntax.TypeOfExpression:
          return n.expression.visit(cb);
        case Syntax.VoidExpression:
          return n.expression.visit(cb);
        case Syntax.PrefixUnaryExpression:
          return n.operand.visit(cb);
        case Syntax.YieldExpression:
          return n.asteriskToken?.visit(cb) || n.expression?.visit(cb);
        case Syntax.AwaitExpression:
          return n.expression.visit(cb);
        case Syntax.PostfixUnaryExpression:
          return n.operand.visit(cb);
        case Syntax.BinaryExpression:
          return n.left.visit(cb) || n.operatorToken.visit(cb) || n.right.visit(cb);
        case Syntax.AsExpression:
          return n.expression.visit(cb) || n.type.visit(cb);
        case Syntax.NonNullExpression:
          return n.expression.visit(cb);
        case Syntax.MetaProperty:
          return n.name.visit(cb);
        case Syntax.ConditionalExpression:
          return n.condition.visit(cb) || n.questionToken.visit(cb) || n.whenTrue.visit(cb) || n.colonToken.visit(cb) || n.whenFalse.visit(cb);
        case Syntax.SpreadElem:
          return n.expression.visit(cb);
        case Syntax.Block:
        case Syntax.ModuleBlock:
          return n.statements.visit(cb, cbs);
        case Syntax.SourceFile:
          return n.statements.visit(cb, cbs) || n.endOfFileToken.visit(cb);
        case Syntax.VariableStatement:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.declarationList.visit(cb);
        case Syntax.VariableDeclarationList:
          return n.declarations.visit(cb, cbs);
        case Syntax.ExpressionStatement:
          return n.expression.visit(cb);
        case Syntax.IfStatement:
          return n.expression.visit(cb) || n.thenStatement.visit(cb) || n.elseStatement?.visit(cb);
        case Syntax.DoStatement:
          return n.statement.visit(cb) || n.expression.visit(cb);
        case Syntax.WhileStatement:
          return n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ForStatement:
          return n.initer?.visit(cb) || n.condition?.visit(cb) || n.incrementor?.visit(cb) || n.statement.visit(cb);
        case Syntax.ForInStatement:
          return n.initer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ForOfStatement:
          return n.awaitModifier?.visit(cb) || n.initer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ContinueStatement:
        case Syntax.BreakStatement:
          return n.label?.visit(cb);
        case Syntax.ReturnStatement:
          return n.expression?.visit(cb);
        case Syntax.WithStatement:
          return n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.SwitchStatement:
          return n.expression.visit(cb) || n.caseBlock.visit(cb);
        case Syntax.CaseBlock:
          return n.clauses.visit(cb, cbs);
        case Syntax.CaseClause:
          return n.expression.visit(cb) || n.statements.visit(cb, cbs);
        case Syntax.DefaultClause:
          return n.statements.visit(cb, cbs);
        case Syntax.LabeledStatement:
          return n.label.visit(cb) || n.statement.visit(cb);
        case Syntax.ThrowStatement:
          return n.expression?.visit(cb);
        case Syntax.TryStatement:
          return n.tryBlock.visit(cb) || n.catchClause?.visit(cb) || n.finallyBlock?.visit(cb);
        case Syntax.CatchClause:
          return n.variableDeclaration?.visit(cb) || n.block.visit(cb);
        case Syntax.Decorator:
          return n.expression.visit(cb);
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name?.visit(cb) || n.typeParams?.visit(cb, cbs) || n.heritageClauses?.visit(cb, cbs) || n.members.visit(cb, cbs);
        case Syntax.InterfaceDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.typeParams?.visit(cb, cbs) || n.heritageClauses?.visit(cb, cbs) || n.members.visit(cb, cbs);
        case Syntax.TypeAliasDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.typeParams?.visit(cb, cbs) || n.type.visit(cb);
        case Syntax.EnumDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.members.visit(cb, cbs);
        case Syntax.EnumMember:
          return n.name.visit(cb) || n.initer?.visit(cb);
        case Syntax.ModuleDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.body?.visit(cb);
        case Syntax.ImportEqualsDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.moduleReference.visit(cb);
        case Syntax.ImportDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.importClause?.visit(cb) || n.moduleSpecifier.visit(cb);
        case Syntax.ImportClause:
          return n.name?.visit(cb) || n.namedBindings?.visit(cb);
        case Syntax.NamespaceExportDeclaration:
          return n.name.visit(cb);
        case Syntax.NamespaceImport:
          return n.name.visit(cb);
        case Syntax.NamespaceExport:
          return n.name.visit(cb);
        case Syntax.NamedImports:
        case Syntax.NamedExports:
          return n.elems.visit(cb, cbs);
        case Syntax.ExportDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.exportClause?.visit(cb) || n.moduleSpecifier?.visit(cb);
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return n.propertyName?.visit(cb) || n.name.visit(cb);
        case Syntax.ExportAssignment:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.expression.visit(cb);
        case Syntax.TemplateExpression:
          return n.head.visit(cb) || n.templateSpans.visit(cb, cbs);
        case Syntax.TemplateSpan:
          return n.expression.visit(cb) || n.literal.visit(cb);
        case Syntax.ComputedPropertyName:
          return n.expression.visit(cb);
        case Syntax.HeritageClause:
          return n.types.visit(cb, cbs);
        case Syntax.ExpressionWithTypings:
          return n.expression.visit(cb) || n.typeArgs?.visit(cb, cbs);
        case Syntax.ExternalModuleReference:
          return n.expression.visit(cb);
        case Syntax.MissingDeclaration:
          return n.decorators?.visit(cb, cbs);
        case Syntax.CommaListExpression:
          return n.elems.visit(cb, cbs);
        case Syntax.JsxElem:
          return n.opening.visit(cb) || n.children.visit(cb, cbs) || n.closing.visit(cb);
        case Syntax.JsxFragment:
          return n.openingFragment.visit(cb) || n.children.visit(cb, cbs) || n.closingFragment.visit(cb);
        case Syntax.JsxSelfClosingElem:
        case Syntax.JsxOpeningElem:
          return n.tagName.visit(cb) || n.typeArgs?.visit(cb, cbs) || n.attributes.visit(cb);
        case Syntax.JsxAttributes:
          return n.properties.visit(cb, cbs);
        case Syntax.JsxAttribute:
          return n.name.visit(cb) || n.initer?.visit(cb);
        case Syntax.JsxSpreadAttribute:
          return n.expression.visit(cb);
        case Syntax.JsxExpression:
          return n.dot3Token?.visit(cb) || n.expression?.visit(cb);
        case Syntax.JsxClosingElem:
          return n.tagName.visit(cb);
        case Syntax.OptionalTyping:
        case Syntax.RestTyping:
        case Syntax.DocTypingExpression:
        case Syntax.DocNonNullableTyping:
        case Syntax.DocNullableTyping:
        case Syntax.DocOptionalTyping:
        case Syntax.DocVariadicTyping:
          return n.type.visit(cb);
        case Syntax.DocFunctionTyping:
          return n.params.visit(cb, cbs) || n.type?.visit(cb);
        case Syntax.DocComment:
          return n.tags?.visit(cb, cbs);
        case Syntax.DocParamTag:
        case Syntax.DocPropertyTag:
          return n.tagName.visit(cb) || (n.isNameFirst ? n.name.visit(cb) || n.typeExpression?.visit(cb) : n.typeExpression?.visit(cb) || n.name.visit(cb));
        case Syntax.DocAuthorTag:
          return n.tagName.visit(cb);
        case Syntax.DocImplementsTag:
          return n.tagName.visit(cb) || n.class.visit(cb);
        case Syntax.DocAugmentsTag:
          return n.tagName.visit(cb) || n.class.visit(cb);
        case Syntax.DocTemplateTag:
          return n.tagName.visit(cb) || n.constraint?.visit(cb) || n.typeParams?.visit(cb, cbs);
        case Syntax.DocTypedefTag:
          return (
            n.tagName.visit(cb) ||
            (n.typeExpression && n.typeExpression!.kind === Syntax.DocTypingExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
          );
        case Syntax.DocCallbackTag:
          const n2 = n as qt.DocCallbackTag;
          return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
        case Syntax.DocReturnTag:
        case Syntax.DocTypeTag:
        case Syntax.DocThisTag:
        case Syntax.DocEnumTag:
          const n3 = n as qt.DocReturnTag | qt.DocTypeTag | qt.DocThisTag | qt.DocEnumTag;
          return n3.tagName.visit(cb) || n3.typeExpression?.visit(cb);
        case Syntax.DocSignature:
          return qu.each(n.typeParams, cb) || qu.each(n.params, cb) || n.type?.visit(cb);
        case Syntax.DocTypingLiteral:
          return qu.each(n.docPropertyTags, cb);
        case Syntax.DocUnknownTag:
        case Syntax.DocClassTag:
        case Syntax.DocPublicTag:
        case Syntax.DocPrivateTag:
        case Syntax.DocProtectedTag:
        case Syntax.DocReadonlyTag:
          return n.tagName.visit(cb);
        case Syntax.PartiallyEmittedExpression:
          return n.expression.visit(cb);
      }
      return;
    }
    childRecursively<T>(root: Node, cb: (n: Node, parent: Node) => T | 'skip' | undefined, cbs?: (ns: Nodes, parent: Node) => T | 'skip' | undefined): T | undefined {
      const ns: Node[] = [root];
      const children = (n: Node) => {
        const cs: (Node | Nodes)[] = [];
        const add = (n?: Node | Nodes) => {
          if (n) cs.unshift(n);
        };
        this.child(n, add, add);
        return cs;
      };
      const visitAll = (parent: Node, cs: readonly (Node | Nodes)[]) => {
        for (const c of cs) {
          if (qu.isArray(c)) {
            if (cbs) {
              const r = cbs(c, parent);
              if (r) {
                if (r === 'skip') continue;
                return r;
              }
            }
            for (let i = c.length - 1; i >= 0; i--) {
              const real = c[i] as Node;
              const r = cb(real, parent);
              if (r) {
                if (r === 'skip') continue;
                return r;
              }
              ns.push(real);
            }
          } else {
            ns.push(c);
            const r = cb(c, parent);
            if (r) {
              if (r === 'skip') continue;
              return r;
            }
          }
        }
        return;
      };
      while (ns.length) {
        const parent = ns.pop()!;
        const res = visitAll(parent, children(parent));
        if (res) return res;
      }
      return;
    }
    importClause<T>(n: qt.ImportClause, cb: (d: qt.ImportClause | qt.NamespaceImport | qt.ImportSpecifier) => T | undefined): T | undefined {
      if (n.name) {
        const r = cb(n);
        if (r) return r;
      }
      const b = n.namedBindings;
      if (b) {
        const r = b.kind === Syntax.NamespaceImport ? cb(b) : qu.each(b.elems, cb);
        if (r) return r;
      }
      return;
    }
  })());
}
export interface Feach extends ReturnType<typeof newEach> {}
export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  return (qf.is = new (class {
    templateMiddleOrTailKind(n: Node): n is qt.TemplateMiddle | qt.TemplateTail {
      const k = n.kind;
      return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
    }
    stringLiteralLike(n: Node): n is qt.StringLiteralLike {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.NoSubstitutionLiteral;
    }
    stringLiteralOrJsxExpressionKind(n: Node): n is qt.StringLiteral | qt.JsxExpression {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
    }
    stringLiteralOrNumberLiteralExpression(e: qt.Expression) {
      const n = e as Node;
      return this.stringOrNumericLiteralLike(n) || (n.kind === Syntax.PrefixUnaryExpression && n.operator === Syntax.MinusToken && n.operand.kind === Syntax.NumericLiteral);
    }
    stringOrNumericLiteralLike(n: Node): n is qt.StringLiteralLike | qt.NumericLiteral {
      return this.stringLiteralLike(n) || n.kind === Syntax.NumericLiteral;
    }
    identifierTypePredicate(p: qt.TypePredicate): p is qt.IdentifierTypePredicate {
      return p.kind === qt.TypePredicateKind.Identifier;
    }
    thisTypePredicate(p: qt.TypePredicate): p is qt.ThisTypePredicate {
      return p.kind === qt.TypePredicateKind.This;
    }
    toBeCapturedInTempVariable(e: qt.Expression, cache: boolean) {
      const n = qb.skip.parentheses(e) as Node;
      switch (n.kind) {
        case Syntax.Identifier:
          return cache;
        case Syntax.BigIntLiteral:
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
        case Syntax.ThisKeyword:
          return false;
        case Syntax.ArrayLiteralExpression:
          return n.elems.length !== 0;
        case Syntax.ObjectLiteralExpression:
          return n.properties.length > 0;
      }
      return true;
    }
    bindableObjectDefinePropertyCall(n: qt.CallExpression): n is qt.BindableObjectDefinePropertyCall {
      const e = n.expression as Node;
      if (qu.length(n.args) === 3 && e.kind === Syntax.PropertyAccessExpression) {
        const e2 = e.expression as Node;
        if (e2.kind === Syntax.Identifier && qb.idText(e2) === 'Object' && qb.idText(e.name) === 'defineProperty')
          return this.stringOrNumericLiteralLike(n.args[1] as Node) && this.bindableStaticNameExpression(n.args[0] as Node, true);
      }
      return false;
    }
    commaSequence(e: qt.Expression): e is (qt.BinaryExpression & { operatorToken: qt.CommaToken }) | qt.CommaListExpression {
      const n = e as Node;
      return (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.CommaToken) || n.kind === Syntax.CommaListExpression;
    }
    sameEntityName(name: qt.Expression, init: qt.Expression): boolean {
      const n = name as Node;
      const i = init as Node;
      if (this.propertyNameLiteral(n) && this.propertyNameLiteral(i)) return qf.get.textOfIdentifierOrLiteral(n) === qf.get.textOfIdentifierOrLiteral(i);
      if (n.kind === Syntax.Identifier && this.literalLikeAccess(i)) {
        const e = i.expression as Node;
        if (e.kind === Syntax.ThisKeyword || (e.kind === Syntax.Identifier && (e.escapedText === 'window' || e.escapedText === 'self' || e.escapedText === 'global'))) {
          const a = qf.get.nameOrArg(i);
          if (a.kind === Syntax.PrivateIdentifier) qu.fail();
          return this.sameEntityName(name, a);
        }
      }
      if (this.literalLikeAccess(n) && this.literalLikeAccess(i)) return qf.get.elemOrPropertyAccessName(n) === qf.get.elemOrPropertyAccessName(i) && this.sameEntityName(n.expression, i.expression);
      return false;
    }
    defaultedExpandoIniter(n: qt.BinaryExpression) {
      const p = n.parent as Node | undefined;
      const name = (p?.kind === Syntax.VariableDeclaration ? p.name : p?.kind === Syntax.BinaryExpression && p.operatorToken.kind === Syntax.EqualsToken ? p.left : undefined) as Node | undefined;
      return name && qf.get.expandoIniter(n.right as Node, this.prototypeAccess(name)) && this.entityNameExpression(name) && this.sameEntityName(name, n.left);
    }
    dottedName(e: qt.Expression): boolean {
      const n = e as Node;
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
          return true;
        case Syntax.PropertyAccessExpression:
        case Syntax.ParenthesizedExpression:
          return this.dottedName(n.expression);
      }
      return false;
    }
    useStrictPrologue(n: qt.ExpressionStatement) {
      const e = n.expression as Node;
      return e.kind === Syntax.StringLiteral && e.text === 'use strict';
    }
    identifierName(i: qt.Identifier) {
      let n = i.parent as Node | undefined;
      switch (n?.kind) {
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.EnumMember:
        case Syntax.PropertyAssignment:
        case Syntax.PropertyAccessExpression:
          return n.name === i;
        case Syntax.QualifiedName:
          if (n.right === i) {
            while (n?.kind === Syntax.QualifiedName) {
              n = n.parent;
            }
            return n?.kind === Syntax.TypingQuery || n?.kind === Syntax.TypingReference;
          }
          return false;
        case Syntax.BindingElem:
        case Syntax.ImportSpecifier:
          return n.propertyName === i;
        case Syntax.ExportSpecifier:
        case Syntax.JsxAttribute:
          return true;
      }
      return false;
    }
    identifierANonContextualKeyword({ originalKeywordKind }: qt.Identifier) {
      return !!originalKeywordKind && !qy.is.contextualKeyword(originalKeywordKind);
    }
    pushOrUnshiftIdentifier(i: qt.Identifier) {
      return i.escapedText === 'push' || i.escapedText === 'unshift';
    }
    declarationNameOfEnumOrNamespace(i: qt.Identifier) {
      const p = qf.get.parseTreeOf(i);
      const n = p?.parent as Node | undefined;
      switch (n?.kind) {
        case Syntax.EnumDeclaration:
        case Syntax.ModuleDeclaration:
          return p === n.name;
      }
      return false;
    }
    internalName(i: qt.Identifier) {
      return (qf.get.emitFlags(i) & qt.EmitFlags.InternalName) !== 0;
    }
    localName(i: qt.Identifier) {
      return (qf.get.emitFlags(i) & qt.EmitFlags.LocalName) !== 0;
    }
    exportName(i: qt.Identifier) {
      return (qf.get.emitFlags(i) & qt.EmitFlags.ExportName) !== 0;
    }
    outerExpression(n: Node | qt.Expression, k = qt.OuterExpressionKinds.All): n is qt.OuterExpression {
      switch (n.kind) {
        case Syntax.ParenthesizedExpression:
          return (k & qt.OuterExpressionKinds.Parentheses) !== 0;
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return (k & qt.OuterExpressionKinds.TypeAssertions) !== 0;
        case Syntax.NonNullExpression:
          return (k & qt.OuterExpressionKinds.NonNullAssertions) !== 0;
        case Syntax.PartiallyEmittedExpression:
          return (k & qt.OuterExpressionKinds.PartiallyEmittedExpressions) !== 0;
      }
      return false;
    }
    ignorableParen(n: qt.Expression) {
      return (
        n.kind === Syntax.ParenthesizedExpression &&
        qu.isSynthesized(n) &&
        qu.isSynthesized(getSourceMapRange(n)) &&
        qu.isSynthesized(getCommentRange(n)) &&
        !qu.some(getSyntheticLeadingComments(n)) &&
        !qu.some(getSyntheticTrailingComments(n))
      );
    }
    computedNonLiteralName(n: qt.PropertyName) {
      return n.kind === Syntax.ComputedPropertyName && !this.stringOrNumericLiteralLike(n.expression as Node);
    }
    kind<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T, n?: Node): n is NodeType<T['kind']> {
      return n?.kind === t.kind || (!!n && !!t.also?.includes(n.kind));
    }
    asyncFunction(n: Node) {
      switch (n.kind) {
        case Syntax.ArrowFunction:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.MethodDeclaration:
          return n.body !== undefined && n.asteriskToken === undefined && qf.has.syntacticModifier(n, ModifierFlags.Async);
      }
      return false;
    }
    expressionNode(n?: Node) {
      switch (n?.kind) {
        case Syntax.ArrayLiteralExpression:
        case Syntax.ArrowFunction:
        case Syntax.AsExpression:
        case Syntax.AwaitExpression:
        case Syntax.BinaryExpression:
        case Syntax.CallExpression:
        case Syntax.ClassExpression:
        case Syntax.ConditionalExpression:
        case Syntax.DeleteExpression:
        case Syntax.ElemAccessExpression:
        case Syntax.FalseKeyword:
        case Syntax.FunctionExpression:
        case Syntax.JsxElem:
        case Syntax.JsxFragment:
        case Syntax.JsxSelfClosingElem:
        case Syntax.MetaProperty:
        case Syntax.NewExpression:
        case Syntax.NonNullExpression:
        case Syntax.NullKeyword:
        case Syntax.ObjectLiteralExpression:
        case Syntax.OmittedExpression:
        case Syntax.ParenthesizedExpression:
        case Syntax.PostfixUnaryExpression:
        case Syntax.PrefixUnaryExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.RegexLiteral:
        case Syntax.SpreadElem:
        case Syntax.SuperKeyword:
        case Syntax.TaggedTemplateExpression:
        case Syntax.TemplateExpression:
        case Syntax.TrueKeyword:
        case Syntax.TypeAssertionExpression:
        case Syntax.TypeOfExpression:
        case Syntax.VoidExpression:
        case Syntax.YieldExpression:
          return true;
        case Syntax.QualifiedName:
          let n2 = n as Node | undefined;
          while (n2?.parent?.kind === Syntax.QualifiedName) {
            n2 = n2.parent as Node | undefined;
          }
          return n2?.kind === Syntax.TypingQuery || this.jsx.tagName(n);
        case Syntax.Identifier:
          if (n.parent?.kind === Syntax.TypingQuery || this.jsx.tagName(n)) return true;
        case Syntax.BigIntLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
        case Syntax.ThisKeyword:
          return this.inExpressionContext(n);
        default:
          return false;
      }
    }
    inExpressionContext(n: Node): boolean {
      const p = n.parent as Node | undefined;
      switch (p?.kind) {
        case Syntax.BindingElem:
        case Syntax.EnumMember:
        case Syntax.Param:
        case Syntax.PropertyAssignment:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.VariableDeclaration:
          return p.initer === n;
        case Syntax.CaseClause:
        case Syntax.DoStatement:
        case Syntax.ExpressionStatement:
        case Syntax.IfStatement:
        case Syntax.ReturnStatement:
        case Syntax.SwitchStatement:
        case Syntax.ThrowStatement:
        case Syntax.WhileStatement:
        case Syntax.WithStatement:
          return p.expression === n;
        case Syntax.ForStatement:
          return (p.initer === n && p.initer.kind !== Syntax.VariableDeclarationList) || p.condition === n || p.incrementor === n;
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          return (p.initer === n && p.initer.kind !== Syntax.VariableDeclarationList) || p.expression === n;
        case Syntax.AsExpression:
        case Syntax.TypeAssertionExpression:
          return p.expression === n;
        case Syntax.TemplateSpan:
          return p.expression === n;
        case Syntax.ComputedPropertyName:
          return p.expression === n;
        case Syntax.Decorator:
        case Syntax.JsxExpression:
        case Syntax.JsxSpreadAttribute:
        case Syntax.SpreadAssignment:
          return true;
        case Syntax.ExpressionWithTypings:
          return p.expression === n && this.expressionWithTypeArgsInClassExtendsClause(p);
        case Syntax.ShorthandPropertyAssignment:
          return p.objectAssignmentIniter === n;
        default:
          return this.expressionNode(p);
      }
    }
    expressionWithTypeArgsInClassExtendsClause(n: Node): n is qt.ExpressionWithTypings {
      return tryGetClassExtendingExpressionWithTypings(n) !== undefined;
    }
    entityNameExpression(n: Node): n is qt.EntityNameExpression {
      return n.kind === Syntax.Identifier || this.propertyAccessEntityNameExpression(n);
    }
    propertyAccessEntityNameExpression(n: Node): n is qt.PropertyAccessEntityNameExpression {
      return n.kind === Syntax.PropertyAccessExpression && n.name.kind === Syntax.Identifier && this.entityNameExpression(n.expression as Node);
    }
    descendantOf(n: Node, ancestor?: Node) {
      let n2 = n as Node | undefined;
      while (n2) {
        if (n2 === ancestor) return true;
        n2 = n2.parent as Node | undefined;
      }
      return false;
    }
    signedNumericLiteral(n: Node): n is qt.PrefixUnaryExpression & { operand: qt.NumericLiteral } {
      return n.kind === Syntax.PrefixUnaryExpression && (n.operator === Syntax.PlusToken || n.operator === Syntax.MinusToken) && n.operand.kind === Syntax.NumericLiteral;
    }
    deleteTarget(n?: Node) {
      const k = n?.kind;
      if (k === Syntax.PropertyAccessExpression || k === Syntax.ElemAccessExpression) {
        n = qb.walkUpParenthesizedExpressions(n?.parent);
        return n?.kind === Syntax.DeleteExpression;
      }
      return false;
    }
    declarationName(n: Node) {
      const k = n.kind;
      const p = n.parent as Node | undefined;
      return k !== Syntax.SourceFile && !this.kind(qc.BindingPattern, n) && this.declaration(p) && p.name === n;
    }
    typeAlias(n: Node): n is qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag | qt.TypeAliasDeclaration {
      return this.doc.typeAlias(n) || n.kind === Syntax.TypeAliasDeclaration;
    }
    literalLikeAccess(n: Node): n is qt.LiteralLikeElemAccessExpression | qt.PropertyAccessExpression {
      return n.kind === Syntax.PropertyAccessExpression || this.literalLikeElemAccess(n);
    }
    literalLikeElemAccess(n: Node): n is qt.LiteralLikeElemAccessExpression {
      if (n.kind === Syntax.ElemAccessExpression) {
        const e = n.argExpression as Node;
        return this.stringOrNumericLiteralLike(e) || this.wellKnownSymbolSyntactically(e);
      }
      return false;
    }
    wellKnownSymbolSyntactically(n: Node): n is qt.WellKnownSymbolExpression {
      return n.kind === Syntax.PropertyAccessExpression && this.esSymbolIdentifier(n.expression as Node);
    }
    esSymbolIdentifier(n: Node) {
      return n.kind === Syntax.Identifier && n.escapedText === 'Symbol';
    }
    exportsIdentifier(n: Node) {
      return n.kind === Syntax.Identifier && n.escapedText === 'exports';
    }
    moduleIdentifier(n: Node) {
      return n.kind === Syntax.Identifier && n.escapedText === 'module';
    }
    moduleExportsAccessExpression(n: Node): n is qt.LiteralLikeElemAccessExpression & { expression: qt.Identifier } {
      return (n.kind === Syntax.PropertyAccessExpression || this.literalLikeElemAccess(n)) && this.moduleIdentifier(n.expression as Node) && qf.get.elemOrPropertyAccessName(n) === 'exports';
    }
    partOfTypeQuery(n?: Node) {
      while (n?.kind === Syntax.QualifiedName || n?.kind === Syntax.Identifier) {
        n = n?.parent;
      }
      return n?.kind === Syntax.TypingQuery;
    }
    externalModuleImportEqualsDeclaration(n: Node): n is qt.ImportEqualsDeclaration & { moduleReference: qt.ExternalModuleReference } {
      return n.kind === Syntax.ImportEqualsDeclaration && n.moduleReference.kind === Syntax.ExternalModuleReference;
    }
    partOfTypeNode(n: Node) {
      if (Syntax.FirstTypeNode <= n.kind && n.kind <= Syntax.LastTypeNode) return true;
      const p = n.parent as Node | undefined;
      switch (n.kind) {
        case Syntax.AnyKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.NeverKeyword:
        case Syntax.NumberKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.StringKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.UnknownKeyword:
          return true;
        case Syntax.VoidKeyword:
          return p?.kind !== Syntax.VoidExpression;
        case Syntax.ExpressionWithTypings:
          return !this.expressionWithTypeArgsInClassExtendsClause(n);
        case Syntax.TypeParam:
          return p?.kind === Syntax.MappedTyping || p?.kind === Syntax.InferTyping;
        case Syntax.Identifier:
          if (p?.kind === Syntax.QualifiedName && p.right === n) n = p;
          else if (p?.kind === Syntax.PropertyAccessExpression && p.name === n) n = p;
          const k = n.kind;
          qu.assert(k === Syntax.Identifier || k === Syntax.QualifiedName || k === Syntax.PropertyAccessExpression);
        case Syntax.PropertyAccessExpression:
        case Syntax.QualifiedName:
        case Syntax.ThisKeyword: {
          if (p?.kind === Syntax.TypingQuery) return false;
          if (p?.kind === Syntax.ImportTyping) return !p.isTypeOf;
          if (p && Syntax.FirstTypeNode <= p.kind && p.kind <= Syntax.LastTypeNode) return true;
          console.log(n);
          switch (p?.kind) {
            case Syntax.ExpressionWithTypings:
              return !this.expressionWithTypeArgsInClassExtendsClause(p);
            case Syntax.TypeParam:
              return n === p.constraint;
            case Syntax.DocTemplateTag:
              return n === p.constraint;
            case Syntax.Param:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
            case Syntax.VariableDeclaration:
              return n === p.type;
            case Syntax.ArrowFunction:
            case Syntax.Constructor:
            case Syntax.FunctionDeclaration:
            case Syntax.FunctionExpression:
            case Syntax.GetAccessor:
            case Syntax.MethodDeclaration:
            case Syntax.MethodSignature:
            case Syntax.SetAccessor:
              return n === p.type;
            case Syntax.CallSignature:
            case Syntax.ConstructSignature:
            case Syntax.IndexSignature:
              return n === p.type;
            case Syntax.TypeAssertionExpression:
              return n === p.type;
            case Syntax.CallExpression:
            case Syntax.NewExpression:
              return qu.contains(p.typeArgs, n);
            case Syntax.TaggedTemplateExpression:
              return false;
          }
        }
      }
      return false;
    }
    superOrSuperProperty(n: Node): n is qt.SuperExpression | qt.SuperProperty {
      return n.kind === Syntax.SuperKeyword || this.superProperty(n);
    }
    superProperty(n: Node): n is qt.SuperProperty {
      return (n.kind === Syntax.PropertyAccessExpression || n.kind === Syntax.ElemAccessExpression) && n.expression.kind === Syntax.SuperKeyword;
    }
    thisProperty(n: Node) {
      return (n.kind === Syntax.PropertyAccessExpression || n.kind === Syntax.ElemAccessExpression) && n.expression.kind === Syntax.ThisKeyword;
    }
    validESSymbolDeclaration(n: Node): n is qt.VariableDeclaration | qt.PropertyDeclaration | qt.SignatureDeclaration {
      return n.kind === Syntax.VariableDeclaration
        ? this.varConst(n) && n.name.kind === Syntax.Identifier && this.variableDeclarationInVariableStatement(n)
        : n.kind === Syntax.PropertyDeclaration
        ? qf.has.effectiveReadonlyModifier(n) && qf.has.staticModifier(n)
        : n.kind === Syntax.PropertySignature && qf.has.effectiveReadonlyModifier(n);
    }
    functionBlock(n: Node) {
      const p = n.parent as Node | undefined;
      return n.kind === Syntax.Block && p && this.functionLike(p);
    }
    objectLiteralMethod(n: Node): n is qt.MethodDeclaration {
      return n.kind === Syntax.MethodDeclaration && n.parent?.kind === Syntax.ObjectLiteralExpression;
    }
    objectLiteralOrClassExpressionMethod(n: Node): n is qt.MethodDeclaration {
      const p = n.parent as Node | undefined;
      return n.kind === Syntax.MethodDeclaration && (p?.kind === Syntax.ObjectLiteralExpression || p?.kind === Syntax.ClassExpression);
    }
    variableLike(n?: Node): n is qt.VariableLikeDeclaration {
      switch (n?.kind) {
        case Syntax.BindingElem:
        case Syntax.EnumMember:
        case Syntax.Param:
        case Syntax.PropertyAssignment:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.ShorthandPropertyAssignment:
        case Syntax.VariableDeclaration:
          return true;
      }
      return false;
    }
    variableLikeOrAccessor(n: Node): n is qt.AccessorDeclaration | qt.VariableLikeDeclaration {
      return this.variableLike(n) || this.accessor(n);
    }
    childOfNodeWithKind(n: Node | undefined, k: Syntax) {
      while (n) {
        if (n.kind === k) return true;
        n = n.parent as Node | undefined;
      }
      return false;
    }
    aLet(n: Node) {
      return !!(qf.get.combinedFlagsOf(n) & NodeFlags.Let);
    }
    superCall(n: Node): n is qt.SuperCall {
      return n.kind === Syntax.CallExpression && n.expression.kind === Syntax.SuperKeyword;
    }
    importCall(n: Node): n is qt.ImportCall {
      return n.kind === Syntax.CallExpression && n.expression.kind === Syntax.ImportKeyword;
    }
    importMeta(n: Node): n is qt.ImportMetaProperty {
      return n.kind === Syntax.MetaProperty && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
    }
    literalImportTyping(n: Node): n is qt.LiteralImportTyping {
      if (n.kind === Syntax.ImportTyping) {
        const a = n.arg as Node;
        return a.kind === Syntax.LiteralTyping && a.literal.kind === Syntax.StringLiteral;
      }
      return false;
    }
    prologueDirective(n: Node): n is qt.PrologueDirective {
      return n.kind === Syntax.ExpressionStatement && n.expression.kind === Syntax.StringLiteral;
    }
    blockScope(n: Node, parent?: Node) {
      switch (n.kind) {
        case Syntax.ArrowFunction:
        case Syntax.CaseBlock:
        case Syntax.CatchClause:
        case Syntax.Constructor:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.ForStatement:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.SetAccessor:
        case Syntax.SourceFile:
          return true;
        case Syntax.Block:
          return !this.functionLike(parent);
      }
      return false;
    }
    declarationWithTypeParams(n: Node): n is qt.DeclarationWithTypeParams {
      switch (n.kind) {
        case Syntax.DocCallbackTag:
        case Syntax.DocSignature:
        case Syntax.DocTypedefTag:
          return true;
      }
      return this.declarationWithTypeParamChildren(n);
    }
    declarationWithTypeParamChildren(n: Node): n is qt.DeclarationWithTypeParamChildren {
      switch (n.kind) {
        case Syntax.ArrowFunction:
        case Syntax.CallSignature:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.Constructor:
        case Syntax.ConstructorTyping:
        case Syntax.ConstructSignature:
        case Syntax.DocFunctionTyping:
        case Syntax.DocTemplateTag:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.FunctionTyping:
        case Syntax.GetAccessor:
        case Syntax.IndexSignature:
        case Syntax.InterfaceDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.SetAccessor:
        case Syntax.TypeAliasDeclaration:
          return true;
      }
      return false;
    }
    anyImportSyntax(n: Node): n is qt.AnyImportSyntax {
      const k = n.kind;
      return k === Syntax.ImportDeclaration || k === Syntax.ImportEqualsDeclaration;
    }
    lateVisibilityPaintedStatement(n: Node): n is qt.LateVisibilityPaintedStatement {
      switch (n.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.ImportDeclaration:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.VariableStatement:
          return true;
      }
      return false;
    }
    anyImportOrReExport(n: Node): n is qt.AnyImportOrReExport {
      return this.anyImportSyntax(n) || n.kind === Syntax.ExportDeclaration;
    }
    ambientModule(n?: Node): n is qt.AmbientModuleDeclaration {
      return n?.kind === Syntax.ModuleDeclaration && (n?.name.kind === Syntax.StringLiteral || this.globalScopeAugmentation(n));
    }
    moduleWithStringLiteralName(n: Node): n is qt.ModuleDeclaration {
      return n.kind === Syntax.ModuleDeclaration && n.name.kind === Syntax.StringLiteral;
    }
    nonGlobalAmbientModule(n: Node): n is qt.ModuleDeclaration & { name: qt.StringLiteral } {
      return n.kind === Syntax.ModuleDeclaration && n.name.kind === Syntax.StringLiteral;
    }
    effectiveModuleDeclaration(n: Node) {
      return n.kind === Syntax.ModuleDeclaration || n.kind === Syntax.Identifier;
    }
    shorthandAmbientModule(n?: Node) {
      return n?.kind === Syntax.ModuleDeclaration && !n.body;
    }
    globalScopeAugmentation(n: Node) {
      return !!(n.flags & NodeFlags.GlobalAugmentation);
    }
    blockScopedContainerTopLevel(n: Node) {
      return n.kind === Syntax.SourceFile || n.kind === Syntax.ModuleDeclaration || this.functionLike(n);
    }
    externalModule(n?: Node) {
      return n?.kind === Syntax.SourceFile && n?.externalModuleIndicator !== undefined;
    }
    externalModuleAugmentation(n?: Node): n is qt.AmbientModuleDeclaration {
      return this.ambientModule(n) && this.moduleAugmentationExternal(n);
    }
    missing(n?: Node) {
      if (!n) return true;
      return n.pos === n.end && n.pos >= 0 && n.kind !== Syntax.EndOfFileToken;
    }
    present(n?: Node) {
      return !this.missing(n);
    }
    statementWithLocals(n: Node) {
      switch (n.kind) {
        case Syntax.Block:
        case Syntax.CaseBlock:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          return true;
      }
      return false;
    }
    paramPropertyDeclaration(n: Node, parent?: Node): n is qt.ParamPropertyDeclaration {
      return qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier) && parent?.kind === Syntax.Constructor;
    }
    parseTreeNode(n: Node) {
      return (n.flags & NodeFlags.Synthesized) === 0;
    }
    withName(n: Node, name: qt.Identifier) {
      if (this.namedDeclaration(n) && n.name.kind === Syntax.Identifier && qb.idText(n.name) === qb.idText(name)) return true;
      if (n.kind === Syntax.VariableStatement && qu.some(n.declarationList.declarations, (d) => this.withName(d, name))) return true;
      return false;
    }
    withDocNodes(n: Node): n is qt.HasDoc {
      const { doc } = n as qt.DocContainer;
      return !!doc && doc.length > 0;
    }
    withType(n: Node): n is qt.HasType {
      return !!(n as qt.HasType).type;
    }
    withIniter(n: Node): n is qt.HasIniter {
      return !!(n as qt.HasIniter).initer;
    }
    withOnlyExpressionIniter(n: Node): n is qt.HasExpressionIniter {
      switch (n.kind) {
        case Syntax.BindingElem:
        case Syntax.EnumMember:
        case Syntax.Param:
        case Syntax.PropertyAssignment:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.VariableDeclaration:
          return true;
      }
      return false;
    }
    namedDeclaration(n: Node): n is qt.NamedDecl & { name: qt.DeclarationName } {
      return !!(n as qt.NamedDecl).name;
    }
    propertyAccessChain(n: Node): n is qt.PropertyAccessChain {
      return n.kind === Syntax.PropertyAccessExpression && !!(n.flags & NodeFlags.OptionalChain);
    }
    elemAccessChain(n: Node): n is qt.ElemAccessChain {
      return n.kind === Syntax.ElemAccessExpression && !!(n.flags & NodeFlags.OptionalChain);
    }
    callChain(n: Node): n is qt.CallChain {
      return n.kind === Syntax.CallExpression && !!(n.flags & NodeFlags.OptionalChain);
    }
    optionalChainRoot(n?: Node): n is qt.OptionalChainRoot {
      return this.optionalChain(n) && n.kind !== Syntax.NonNullExpression && !!n.questionDotToken;
    }
    expressionOfOptionalChainRoot(n: Node): n is qt.Expression & { parent: qt.OptionalChainRoot } {
      const p = n.parent as Node | undefined;
      return !!p && this.optionalChainRoot(p) && p.expression === n;
    }
    nullishCoalesce(n: Node) {
      return n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.Question2Token;
    }
    constTypeReference(n: Node) {
      return n.kind === Syntax.TypingReference && n.typeName.kind === Syntax.Identifier && n.typeName.escapedText === 'const' && !n.typeArgs;
    }
    nonNullChain(n: Node): n is qt.NonNullChain {
      return n.kind === Syntax.NonNullExpression && !!(n.flags & NodeFlags.OptionalChain);
    }
    unparsedNode(n: Node): n is qt.UnparsedNode {
      const k = n.kind;
      return this.unparsedTextLike(n) || k === Syntax.UnparsedPrologue || k === Syntax.UnparsedSyntheticReference;
    }
    literalExpression(n: Node): n is qt.LiteralExpression {
      return qy.is.literal(n.kind);
    }
    templateLiteralToken(n: Node): n is qt.TemplateLiteralToken {
      return qy.is.templateLiteral(n.kind);
    }
    importOrExportSpecifier(n: Node): n is qt.ImportSpecifier | qt.ExportSpecifier {
      const k = n.kind;
      return k === Syntax.ImportSpecifier || k === Syntax.ExportSpecifier;
    }
    typeOnlyImportOrExportDeclaration(n: Node): n is qt.TypeOnlyCompatibleAliasDeclaration {
      switch (n.kind) {
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return !!n.parent?.parent?.isTypeOnly;
        case Syntax.NamespaceImport:
          return !!n.parent?.isTypeOnly;
        case Syntax.ImportClause:
          return n.isTypeOnly;
        default:
          return false;
      }
    }
    stringTextContainingNode(n: Node): n is qt.StringLiteral | qt.TemplateLiteralToken {
      const k = n.kind;
      return k === Syntax.StringLiteral || qy.is.templateLiteral(k);
    }
    generatedIdentifier(n: Node): n is qt.GeneratedIdentifier {
      return n.kind === Syntax.Identifier && (n.autoGenerateFlags! & qt.GeneratedIdentifierFlags.KindMask) > qt.GeneratedIdentifierFlags.None;
    }
    privateIdentifierPropertyAccessExpression(n: Node): n is qt.PrivateIdentifierPropertyAccessExpression {
      return n.kind === Syntax.PropertyAccessExpression && n.name.kind === Syntax.PrivateIdentifier;
    }
    modifier(n: Node): n is Modifier {
      return qy.is.modifier(n.kind);
    }
    functionLike(n?: Node): n is qt.SignatureDeclaration {
      return qy.is.functionLike(n?.kind);
    }
    functionLikeDeclaration(n: Node): n is qt.FunctionLikeDeclaration {
      return qy.is.functionLikeDeclaration(n.kind);
    }
    functionOrModuleBlock(n: Node) {
      const k = n.kind;
      const p = n.parent as Node | undefined;
      return k === Syntax.SourceFile || k === Syntax.ModuleBlock || (k === Syntax.Block && p && this.functionLike(p));
    }
    classElem(n?: Node): n is qt.ClassElem {
      switch (n?.kind) {
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.IndexSignature:
        case Syntax.MethodDeclaration:
        case Syntax.PropertyDeclaration:
        case Syntax.SemicolonClassElem:
        case Syntax.SetAccessor:
          return true;
      }
      return false;
    }
    classLike(n?: Node): n is qt.ClassLikeDeclaration {
      const k = n?.kind;
      return k === Syntax.ClassDeclaration || k === Syntax.ClassExpression;
    }
    accessor(n?: Node): n is qt.AccessorDeclaration {
      const k = n?.kind;
      return k === Syntax.GetAccessor || k === Syntax.SetAccessor;
    }
    methodOrAccessor(n?: Node): n is qt.MethodDeclaration | qt.AccessorDeclaration {
      const k = n?.kind;
      return k === Syntax.MethodDeclaration || k === Syntax.GetAccessor || k === Syntax.SetAccessor;
    }
    classOrTypeElem(n?: Node): n is qt.ClassElem | qt.TypeElem {
      return this.typeElem(n) || this.classElem(n);
    }
    objectLiteralElemLike(n?: Node): n is qt.ObjectLiteralElemLike {
      switch (n?.kind) {
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.PropertyAssignment:
        case Syntax.SetAccessor:
        case Syntax.ShorthandPropertyAssignment:
        case Syntax.SpreadAssignment:
          return true;
      }
      return false;
    }
    typeNode(n?: Node): n is qt.Typing {
      return qy.is.typeNode(n?.kind);
    }
    functionOrConstructorTyping(n: Node): n is qt.FunctionTyping | qt.ConstructorTyping {
      const k = n.kind;
      return k === Syntax.FunctionTyping || k === Syntax.ConstructorTyping;
    }
    callLikeExpression(n: Node): n is qt.CallLikeExpression {
      switch (n.kind) {
        case Syntax.CallExpression:
        case Syntax.Decorator:
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
        case Syntax.NewExpression:
        case Syntax.TaggedTemplateExpression:
          return true;
      }
      return false;
    }
    leftHandSideExpression(n: Node): n is qt.LeftExpression {
      return qy.is.leftHandSideExpression(qb.skip.partiallyEmittedExpressions(n).kind);
    }
    unaryExpression(n: Node): n is qt.UnaryExpression {
      return qy.is.unaryExpression(qb.skip.partiallyEmittedExpressions(n).kind);
    }
    unaryExpressionWithWrite(n: Node): n is qt.PrefixUnaryExpression | qt.PostfixUnaryExpression {
      switch (n.kind) {
        case Syntax.PostfixUnaryExpression:
          return true;
        case Syntax.PrefixUnaryExpression:
          const o = n.operator;
          return o === Syntax.Plus2Token || o === Syntax.Minus2Token;
        default:
          return false;
      }
    }
    expression(n: Node): n is qt.Expression {
      return qy.is.expression(qb.skip.partiallyEmittedExpressions(n).kind);
    }
    notEmittedOrPartiallyEmittedNode(n: Node): n is qt.NotEmittedStatement | qt.PartiallyEmittedExpression {
      const k = n.kind;
      return k === Syntax.NotEmittedStatement || k === Syntax.PartiallyEmittedExpression;
    }
    iterationStatement(n: Node, look: false): n is qt.IterationStmt;
    iterationStatement(n: Node, look: boolean): n is qt.IterationStmt | qt.LabeledStatement;
    iterationStatement(n: Node, look: boolean): n is qt.IterationStmt {
      switch (n.kind) {
        case Syntax.DoStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.ForStatement:
        case Syntax.WhileStatement:
          return true;
        case Syntax.LabeledStatement:
          const s = n.statement as Node;
          return look && this.iterationStatement(s, look);
      }
      return false;
    }
    scopeMarker(n: Node) {
      return n.kind === Syntax.ExportAssignment || n.kind === Syntax.ExportDeclaration;
    }
    conciseBody(n: qt.Nobj): n is qt.ConciseBody {
      return n.kind === Syntax.Block || this.expression(n as Node);
    }
    functionBody(n: Node): n is qt.FunctionBody {
      return n.kind === Syntax.Block;
    }
    forIniter(n: qt.Nobj): n is qt.ForIniter {
      return n.kind === Syntax.VariableDeclarationList || this.expression(n as Node);
    }
    declaration(n?: Node): n is qt.NamedDecl {
      if (n?.kind === Syntax.TypeParam) return (n.parent && n.parent.kind !== Syntax.DocTemplateTag) || this.inJSFile(n);
      return qy.is.declaration(n?.kind);
    }
    declarationStatement(n: Node): n is qt.DeclarationStmt {
      return qy.is.declarationStatement(n.kind);
    }
    statementButNotDeclaration(n: Node): n is qt.Statement {
      return qy.is.statementKindButNotDeclaration(n.kind);
    }
    statement(n: Node): n is qt.Statement {
      const k = n.kind;
      return qy.is.statementKindButNotDeclaration(k) || qy.is.declarationStatement(k) || this.blockStatement(n);
    }
    blockStatement(n: Node): n is qt.Block {
      if (n.kind !== Syntax.Block) return false;
      const p = n.parent;
      if (p && (p.kind === Syntax.TryStatement || p.kind === Syntax.CatchClause)) return false;
      return !this.functionBlock(n);
    }
    identifierOrPrivateIdentifier(n: Node): n is qt.Identifier | qt.PrivateIdentifier {
      const k = n.kind;
      return k === Syntax.Identifier || k === Syntax.PrivateIdentifier;
    }
    optionalChain(n?: Node): n is qt.PropertyAccessChain | qt.ElemAccessChain | qt.CallChain | qt.NonNullChain {
      if (n && !!(n.flags & NodeFlags.OptionalChain)) {
        switch (n.kind) {
          case Syntax.PropertyAccessExpression:
          case Syntax.ElemAccessExpression:
          case Syntax.CallExpression:
          case Syntax.NonNullExpression:
            return true;
        }
      }
      return false;
    }
    breakOrContinueStatement(n: Node): n is qt.BreakOrContinueStatement {
      const k = n.kind;
      return k === Syntax.BreakStatement || k === Syntax.ContinueStatement;
    }
    namedExportBindings(n: Node): n is qt.NamedExportBindings {
      const k = n.kind;
      return k === Syntax.NamespaceExport || k === Syntax.NamedExports;
    }
    unparsedTextLike(n: Node): n is qt.UnparsedTextLike {
      const k = n.kind;
      return k === Syntax.UnparsedText || k === Syntax.UnparsedInternalText;
    }
    entityName(n: Node): n is qt.EntityName {
      const k = n.kind;
      return k === Syntax.QualifiedName || k === Syntax.Identifier;
    }
    propertyName(n: Node): n is qt.PropertyName {
      switch (n.kind) {
        case Syntax.ComputedPropertyName:
        case Syntax.Identifier:
        case Syntax.NumericLiteral:
        case Syntax.PrivateIdentifier:
        case Syntax.StringLiteral:
          return true;
      }
      return false;
    }
    bindingName(n: Node): n is qt.BindingName {
      const k = n.kind;
      return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
    }
    typeElem(n?: Node): n is qt.TypeElem {
      switch (n?.kind) {
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
        case Syntax.MethodSignature:
        case Syntax.PropertySignature:
          return true;
      }
      return false;
    }
    arrayBindingElem(n: Node): n is qt.ArrayBindingElem {
      const k = n.kind;
      return k === Syntax.BindingElem || k === Syntax.OmittedExpression;
    }
    propertyAccessOrQualifiedNameOrImportTyping(n: Node): n is qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTyping {
      const k = n.kind;
      return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportTyping;
    }
    propertyAccessOrQualifiedName(n: Node): n is qt.PropertyAccessExpression | qt.QualifiedName {
      const k = n.kind;
      return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
    }
    callOrNewExpression(n: Node): n is qt.CallExpression | qt.NewExpression {
      const k = n.kind;
      return k === Syntax.CallExpression || k === Syntax.NewExpression;
    }
    templateLiteral(n: Node): n is qt.TemplateLiteral {
      const k = n.kind;
      return k === Syntax.TemplateExpression || k === Syntax.NoSubstitutionLiteral;
    }
    assertionExpression(n: Node): n is qt.AssertionExpression {
      const k = n.kind;
      return k === Syntax.TypeAssertionExpression || k === Syntax.AsExpression;
    }
    forInOrOfStatement(n: Node): n is qt.ForInOrOfStatement {
      const k = n.kind;
      return k === Syntax.ForInStatement || k === Syntax.ForOfStatement;
    }
    moduleBody(n: Node): n is qt.ModuleBody {
      const k = n.kind;
      return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration || k === Syntax.Identifier;
    }
    namespaceBody(n: Node): n is qt.NamespaceBody {
      const k = n.kind;
      return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration;
    }
    namedImportBindings(n: Node): n is qt.NamedImportBindings {
      const k = n.kind;
      return k === Syntax.NamedImports || k === Syntax.NamespaceImport;
    }
    moduleOrEnumDeclaration(n: Node): n is qt.ModuleDeclaration | qt.EnumDeclaration {
      const k = n.kind;
      return k === Syntax.ModuleDeclaration || k === Syntax.EnumDeclaration;
    }
    moduleReference(n: Node): n is qt.ModuleReference {
      const k = n.kind;
      return k === Syntax.ExternalModuleReference || k === Syntax.QualifiedName || k === Syntax.Identifier;
    }
    caseOrDefaultClause(n: Node): n is qt.CaseOrDefaultClause {
      const k = n.kind;
      return k === Syntax.CaseClause || k === Syntax.DefaultClause;
    }
    objectLiteralElem(n: Node): n is qt.ObjectLiteralElem {
      const k = n.kind;
      return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute || this.objectLiteralElemLike(n);
    }
    typeReferenceType(n: Node): n is qt.TypeReferenceType {
      const k = n.kind;
      return k === Syntax.TypingReference || k === Syntax.ExpressionWithTypings;
    }
    stringOrNumericLiteral(n: Node): n is qt.StringLiteral | qt.NumericLiteral {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.NumericLiteral;
    }
    selfReferenceLocation(n: Node) {
      switch (n.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
          return true;
      }
      return false;
    }
    someImportDeclaration(n: Node) {
      switch (n.kind) {
        case Syntax.ImportClause:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ImportSpecifier:
        case Syntax.NamespaceImport:
          return true;
        case Syntax.Identifier:
          return n.parent?.kind === Syntax.ImportSpecifier;
      }
      return false;
    }
    declarationNameOrImportPropertyName(n: Node) {
      switch (n.parent?.kind) {
        case Syntax.ExportSpecifier:
        case Syntax.ImportSpecifier:
          return n.kind === Syntax.Identifier;
      }
      return this.declarationName(n);
    }
    aliasSymbolDeclaration(n: Node) {
      const k = n.kind;
      const p = n.parent as Node | undefined;
      return (
        k === Syntax.ImportEqualsDeclaration ||
        k === Syntax.NamespaceExportDeclaration ||
        (n.kind === Syntax.ImportClause && !!n.name) ||
        k === Syntax.NamespaceImport ||
        k === Syntax.NamespaceExport ||
        k === Syntax.ImportSpecifier ||
        k === Syntax.ExportSpecifier ||
        (n.kind === Syntax.ExportAssignment && this.exportAssignmentAlias(n)) ||
        (n.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(n) === qt.AssignmentDeclarationKind.ModuleExports && this.exportAssignmentAlias(n)) ||
        (n.kind === Syntax.PropertyAccessExpression && p?.kind === Syntax.BinaryExpression && p.left === n && p.operatorToken.kind === Syntax.EqualsToken && this.aliasableExpression(p.right)) ||
        k === Syntax.ShorthandPropertyAssignment ||
        (n.kind === Syntax.PropertyAssignment && this.aliasableExpression(n.initer))
      );
    }
    aliasableExpression(n: qt.Expression) {
      return this.entityNameExpression(n as Node) || n.kind === Syntax.ClassExpression;
    }
    exportAssignmentAlias(n: qt.ExportAssignment | qt.BinaryExpression) {
      const e = qf.get.exportAssignmentExpression(n);
      return this.aliasableExpression(e);
    }
    valueSignatureDeclaration(n: Node): n is qt.ValueSignatureDeclaration {
      const k = n.kind;
      return k === Syntax.FunctionExpression || k === Syntax.ArrowFunction || this.methodOrAccessor(n) || k === Syntax.FunctionDeclaration || k === Syntax.Constructor;
    }
    objectTypeDeclaration(n: Node): n is qt.ObjectTypeDeclaration {
      const k = n.kind;
      return this.classLike(n) || k === Syntax.InterfaceDeclaration || k === Syntax.TypingLiteral;
    }
    accessExpression(n: Node): n is qt.AccessExpression {
      const k = n.kind;
      return k === Syntax.PropertyAccessExpression || k === Syntax.ElemAccessExpression;
    }
    namedImportsOrExports(n: Node): n is qt.NamedImportsOrExports {
      return n.kind === Syntax.NamedImports || n.kind === Syntax.NamedExports;
    }
    writeOnlyAccess(n: Node) {
      return access.get(n) === access.Kind.Write;
    }
    writeAccess(n: Node) {
      return access.get(n) !== access.Kind.Read;
    }
    validTypeOnlyAliasUseSite(n: Node) {
      return (
        !!(n.flags & NodeFlags.Ambient) ||
        this.partOfTypeQuery(n) ||
        this.identifierInNonEmittingHeritageClause(n) ||
        this.partOfPossiblyValidTypeOrAbstractComputedPropertyName(n) ||
        !this.expressionNode(n)
      );
    }
    partOfPossiblyValidTypeOrAbstractComputedPropertyName(n?: Node) {
      while (n?.kind === Syntax.Identifier || n?.kind === Syntax.PropertyAccessExpression) {
        n = n.parent as Node | undefined;
      }
      if (n?.kind !== Syntax.ComputedPropertyName) return false;
      const p = n?.parent as Node | undefined;
      if (p && qf.has.syntacticModifier(p, ModifierFlags.Abstract)) return true;
      const k = p?.parent?.kind;
      return k === Syntax.InterfaceDeclaration || k === Syntax.TypingLiteral;
    }
    identifierInNonEmittingHeritageClause(n: Node) {
      if (n.kind !== Syntax.Identifier) return false;
      const h = qb.findAncestor(n.parent, (p) => {
        switch (p.kind) {
          case Syntax.HeritageClause:
            return true;
          case Syntax.PropertyAccessExpression:
          case Syntax.ExpressionWithTypings:
            return false;
          default:
            return 'quit';
        }
      }) as qc.HeritageClause | undefined;
      return h?.token === Syntax.ImplementsKeyword || h?.parent?.kind === Syntax.InterfaceDeclaration;
    }
    identifierTypeReference(n: Node): n is qt.TypingReference & { typeName: qt.Identifier } {
      return n.kind === Syntax.TypingReference && n.typeName.kind === Syntax.Identifier;
    }
    prototypeAccess(n: Node): n is qt.BindableStaticAccessExpression {
      return this.bindableStaticAccessExpression(n) && qf.get.elemOrPropertyAccessName(n) === 'prototype';
    }
    rightSideOfQualifiedNameOrPropertyAccess(n: Node) {
      const p = n.parent as Node | undefined;
      return (p?.kind === Syntax.QualifiedName && p.right === n) || (p?.kind === Syntax.PropertyAccessExpression && p.name === n);
    }
    emptyObjectLiteral(n: Node) {
      return n.kind === Syntax.ObjectLiteralExpression && n.properties.length === 0;
    }
    emptyArrayLiteral(n: Node) {
      return n.kind === Syntax.ArrayLiteralExpression && n.elems.length === 0;
    }
    propertyNameLiteral(n: Node): n is qt.PropertyNameLiteral {
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return true;
      }
      return false;
    }
    assignmentTarget(n: Node) {
      return qf.get.assignmentTargetKind(n) !== qt.AssignmentKind.None;
    }
    literalComputedPropertyDeclarationName(n: Node) {
      return this.stringOrNumericLiteralLike(n) && n.parent?.kind === Syntax.ComputedPropertyName && this.declaration(n.parent.parent);
    }
    prototypePropertyAssignment(n: Node) {
      return n.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(n) === qt.AssignmentDeclarationKind.PrototypeProperty;
    }
    docTypeExpressionOrChild(n: Node) {
      return !!qb.findAncestor(n, isDocTypingExpression);
    }
    internalModuleImportEqualsDeclaration(n: Node): n is qt.ImportEqualsDeclaration {
      if (n.kind === Syntax.ImportEqualsDeclaration) return n.moduleReference.kind !== Syntax.ExternalModuleReference;
      return false;
    }
    inJSFile(n?: Node) {
      return !!n && !!(n.flags & NodeFlags.JavaScriptFile);
    }
    inJsonFile(n?: Node) {
      return !!n && !!(n.flags & NodeFlags.JsonFile);
    }
    inDoc(n?: Node) {
      return !!n && !!(n.flags & NodeFlags.Doc);
    }
    bindableStaticAccessExpression(n: Node, noThis?: boolean): n is qt.BindableStaticAccessExpression {
      if (n.kind === Syntax.PropertyAccessExpression) {
        const e = n.expression as Node;
        return (!noThis && e.kind === Syntax.ThisKeyword) || (n.name.kind === Syntax.Identifier && this.bindableStaticNameExpression(e, true));
      }
      return this.bindableStaticElemAccessExpression(n, noThis);
    }
    bindableStaticElemAccessExpression(n: Node, noThis?: boolean): n is qt.BindableStaticElemAccessExpression {
      if (this.literalLikeElemAccess(n)) {
        const e = n.expression as Node;
        return (!noThis && e.kind === Syntax.ThisKeyword) || this.entityNameExpression(e) || this.bindableStaticAccessExpression(e, true);
      }
      return false;
    }
    bindableStaticNameExpression(n: Node, noThis?: boolean): n is qt.BindableStaticNameExpression {
      return this.entityNameExpression(n) || this.bindableStaticAccessExpression(n, noThis);
    }
    assignmentExpression(n: Node, noCompound: true): n is qt.AssignmentExpression<qt.EqualsToken>;
    assignmentExpression(n: Node, noCompound?: false): n is qt.AssignmentExpression<qt.AssignmentOperatorToken>;
    assignmentExpression(n: Node, noCompound?: boolean): n is qt.AssignmentExpression<qt.AssignmentOperatorToken> {
      if (n.kind === Syntax.BinaryExpression)
        return (noCompound ? n.operatorToken.kind === Syntax.EqualsToken : qy.is.assignmentOperator(n.operatorToken.kind)) && this.leftHandSideExpression(n.left as Node);
      return false;
    }
    privateIdentifierPropertyDeclaration(n?: Node): n is qt.PrivateIdentifierPropertyDeclaration {
      return n?.kind === Syntax.PropertyDeclaration && n.name.kind === Syntax.PrivateIdentifier;
    }
    destructuringAssignment(n: Node): n is qt.DestructuringAssignment {
      if (this.assignmentExpression(n, true)) {
        const k = n.left.kind;
        return k === Syntax.ObjectLiteralExpression || k === Syntax.ArrayLiteralExpression;
      }
      return false;
    }
    nodeWithPossibleHoistedDeclaration(n: Node): n is qt.NodeWithPossibleHoistedDeclaration {
      switch (n.kind) {
        case Syntax.Block:
        case Syntax.CaseBlock:
        case Syntax.CaseClause:
        case Syntax.CatchClause:
        case Syntax.DefaultClause:
        case Syntax.DoStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.ForStatement:
        case Syntax.IfStatement:
        case Syntax.LabeledStatement:
        case Syntax.SwitchStatement:
        case Syntax.TryStatement:
        case Syntax.VariableStatement:
        case Syntax.WhileStatement:
        case Syntax.WithStatement:
          return true;
      }
      return false;
    }
    typeOnlyDeclarationIsExport(n: Node) {
      return n.kind === Syntax.ExportSpecifier;
    }
    nodeStartsNewLexicalEnvironment(n: Node) {
      switch (n.kind) {
        case Syntax.ArrowFunction:
        case Syntax.Constructor:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.SetAccessor:
        case Syntax.SourceFile:
          return true;
      }
      return false;
    }
    introducesArgsExoticObject(n: Node) {
      switch (n.kind) {
        case Syntax.Constructor:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.SetAccessor:
          return true;
      }
      return false;
    }
    externalOrCommonJsModule(f: qt.SourceFile) {
      return (f.externalModuleIndicator || f.commonJsModuleIndicator) !== undefined;
    }
    jsonSourceFile(f: qt.SourceFile): f is qt.JsonSourceFile {
      return f.scriptKind === qt.ScriptKind.JSON;
    }
    anyPrologueDirective(n: Node) {
      return this.prologueDirective(n) || !!(qf.get.emitFlags(n) & EmitFlags.CustomPrologue);
    }
    declarationBindingElem(n: qt.BindingOrAssignmentElem): n is qt.VariableDeclaration | qt.ParamDeclaration | qt.BindingElem {
      switch (n.kind) {
        case Syntax.BindingElem:
        case Syntax.Param:
        case Syntax.VariableDeclaration:
          return true;
      }
      return false;
    }
    bindingOrAssignmentPattern(n: qt.BindingOrAssignmentElemTarget): n is qt.BindingOrAssignmentPattern {
      return this.objectBindingOrAssignmentPattern(n) || this.arrayBindingOrAssignmentPattern(n);
    }
    objectBindingOrAssignmentPattern(n: qt.BindingOrAssignmentElemTarget): n is qt.ObjectBindingOrAssignmentPattern {
      switch (n.kind) {
        case Syntax.ObjectBindingPattern:
        case Syntax.ObjectLiteralExpression:
          return true;
      }
      return false;
    }
    arrayBindingOrAssignmentPattern(n: qt.BindingOrAssignmentElemTarget): n is qt.ArrayBindingOrAssignmentPattern {
      switch (n.kind) {
        case Syntax.ArrayBindingPattern:
        case Syntax.ArrayLiteralExpression:
          return true;
      }
      return false;
    }
    outermostOptionalChain(c: qt.OptionalChain) {
      const p = c.parent;
      return !this.optionalChain(p) || this.optionalChainRoot(p) || c !== p.expression;
    }
    emptyBindingElem(e: qt.BindingElem) {
      const n = e as Node;
      if (n.kind === Syntax.OmittedExpression) return true;
      return this.emptyBindingPattern(e.name);
    }
    emptyBindingPattern(n: qt.BindingName): n is qt.BindingPattern {
      if (this.kind(qc.BindingPattern, n)) return qu.every(n.elems, this.emptyBindingElem);
      return false;
    }
    requireCall(n: Node | undefined, literal: true): n is qt.RequireOrImportCall & { expression: qt.Identifier; args: [qt.StringLiteralLike] };
    requireCall(n: Node | undefined, literal: boolean): n is qt.CallExpression;
    requireCall(n: Node | undefined, literal: boolean): n is qt.CallExpression {
      if (n?.kind !== Syntax.CallExpression) return false;
      const e = n.expression;
      if (e.kind !== Syntax.Identifier || (e as qt.Identifier).escapedText !== 'require') return false;
      const a = n.args;
      if (a.length !== 1) return false;
      return !literal || this.stringLiteralLike(a[0] as Node);
    }
    requireVariableDeclaration(n: Node, literal: true): n is qt.RequireVariableDeclaration;
    requireVariableDeclaration(n: Node, literal: boolean): n is qt.VariableDeclaration;
    requireVariableDeclaration(n: Node, literal: boolean): n is qt.VariableDeclaration {
      if (n.kind === Syntax.VariableDeclaration) return this.requireCall(n.initer as Node | undefined, literal);
      return false;
    }
    requireVariableDeclarationStmt(n: Node, literal = true): n is qt.VariableStatement {
      if (n.kind === Syntax.VariableStatement) return qu.every(n.declarationList.declarations, (d) => this.requireVariableDeclaration(d, literal));
      return false;
    }
    typeDeclaration(
      n: Node
    ): n is qt.TypeParamDeclaration | qt.ClassDeclaration | qt.InterfaceDeclaration | qt.TypeAliasDeclaration | qt.EnumDeclaration | qt.ImportClause | qt.ImportSpecifier | qt.ExportSpecifier {
      switch (n.kind) {
        case Syntax.TypeParam:
        case Syntax.ClassDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.EnumDeclaration:
          return true;
        case Syntax.ImportClause:
          return n.isTypeOnly;
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return !!n.parent?.parent?.isTypeOnly;
      }
      return false;
    }
    typeDeclarationName(n: Node) {
      return n.kind === Syntax.Identifier && n.parent && this.typeDeclaration(n.parent) && n.parent.name === n;
    }
    doc = new (class {
      constructSignature(n: Node) {
        const p = n.kind === Syntax.DocFunctionTyping ? qu.firstOrUndefined(n.params) : undefined;
        const i = qu.tryCast(p && p.name, this.identifier);
        return i?.escapedText === 'new';
      }
      typeAlias(n: Node): n is qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag {
        const k = n.kind;
        return k === Syntax.DocTypedefTag || k === Syntax.DocCallbackTag || k === Syntax.DocEnumTag;
      }
      namespaceBody(n: Node): n is qt.DocNamespaceBody {
        const k = n.kind;
        return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
      }
      propertyLikeTag(n: Node): n is qt.DocPropertyLikeTag {
        const k = n.kind;
        return k === Syntax.DocPropertyTag || k === Syntax.DocParamTag;
      }
      node(n: Node) {
        return n.kind >= Syntax.FirstDocNode && n.kind <= Syntax.LastDocNode;
      }
      commentContainingNode(n: Node) {
        switch (n.kind) {
          case Syntax.DocComment:
          case Syntax.DocNamepathTyping:
          case Syntax.DocSignature:
          case Syntax.DocTypingLiteral:
            return true;
        }
        return this.tag(n);
      }
      tag(n: Node): n is qt.DocTag {
        const k = n.kind;
        return k >= Syntax.FirstDocTagNode && k <= Syntax.LastDocTagNode;
      }
    })();
    jsx = new (class {
      tagName(n: Node) {
        const p = n.parent as Node | undefined;
        switch (p?.kind) {
          case Syntax.JsxOpeningElem:
          case Syntax.JsxSelfClosingElem:
            return p?.tagName === n;
        }
        return false;
      }
      tagNameExpression(n: Node): n is qt.JsxTagNameExpression {
        const k = n.kind;
        return k === Syntax.ThisKeyword || k === Syntax.Identifier || k === Syntax.PropertyAccessExpression;
      }
      child(n: Node): n is qt.JsxChild {
        switch (n.kind) {
          case Syntax.JsxElem:
          case Syntax.JsxExpression:
          case Syntax.JsxSelfClosingElem:
          case Syntax.JsxText:
          case Syntax.JsxFragment:
            return true;
        }
        return false;
      }
      attributeLike(n: Node): n is qt.JsxAttributeLike {
        const k = n.kind;
        return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute;
      }
      openingLikeElem(n: Node): n is qt.JsxOpeningLikeElem {
        const k = n.kind;
        return k === Syntax.JsxOpeningElem || k === Syntax.JsxSelfClosingElem;
      }
    })();
  })());
}
export interface Fis extends ReturnType<typeof newIs> {}
export function newHas(f: qt.Frame) {
  interface Frame extends qt.Frame {
    each: Feach;
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.has = new (class {
    dynamicName(n: qt.DeclarationName) {
      if (!(n.kind === Syntax.ComputedPropertyName || n.kind === Syntax.ElemAccessExpression)) return false;
      const e = (n.kind === Syntax.ElemAccessExpression ? n.argExpression : n.expression) as Node;
      return !qf.is.stringOrNumericLiteralLike(e) && !qf.is.signedNumericLiteral(e) && !qf.is.wellKnownSymbolSyntactically(e);
    }
    docInheritDocTag(n: Node) {
      return qf.get.doc.tags(n).some((t) => t.tagName.text === 'inheritDoc');
    }
    scopeMarker(ss: readonly qt.Statement[]) {
      return qu.some(ss, qf.is.scopeMarker);
    }
    typeArgs(n: Node): n is qt.HasTypeArgs {
      return !!(n as qt.HasTypeArgs).typeArgs;
    }
    questionToken(n: Node) {
      switch (n.kind) {
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.Param:
        case Syntax.PropertyAssignment:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.ShorthandPropertyAssignment:
          return n.questionToken !== undefined;
      }
      return false;
    }
    effectiveModifiers(n: Node) {
      return qf.get.effectiveModifierFlags(n) !== ModifierFlags.None;
    }
    syntacticModifiers(n: Node) {
      return qf.get.syntacticModifierFlags(n) !== ModifierFlags.None;
    }
    effectiveModifier(n: Node, f: ModifierFlags) {
      return !!qf.get.selectedEffectiveModifierFlags(n, f);
    }
    parseError(n?: Node) {
      if (!n) return false;
      if (!(n.flags & NodeFlags.HasAggregatedChildData)) {
        const e = (n.flags & NodeFlags.ThisNodeHasError) !== 0 || qf.each.child(n, this.parseError);
        if (e) n.flags |= NodeFlags.ThisNodeOrAnySubNodesHasError;
        n.flags |= NodeFlags.HasAggregatedChildData;
      }
      return (n.flags & NodeFlags.ThisNodeOrAnySubNodesHasError) !== 0;
    }
    syntacticModifier(n: Node, f: ModifierFlags) {
      return !!qf.get.selectedSyntacticModifierFlags(n, f);
    }
    staticModifier(n: Node) {
      return this.syntacticModifier(n, ModifierFlags.Static);
    }
    effectiveReadonlyModifier(n: Node) {
      return this.effectiveModifier(n, ModifierFlags.Readonly);
    }
    invalidEscape(n: qt.TemplateLiteral) {
      return n && !!(n.kind === Syntax.NoSubstitutionLiteral ? n.templateFlags : n.head.templateFlags || qu.some(n.templateSpans, (s) => !!s.literal.templateFlags));
    }
  })());
}
export interface Fhas extends ReturnType<typeof newHas> {}
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    create: Fcreate;
    each: Feach;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.get = new (class Fget {
    nextNodeId = 1;
    static nextAutoGenerateId = 1;
    mapBundleFileSectionKindToSyntax(k: qt.BundleFileSectionKind): Syntax {
      switch (k) {
        case qt.BundleFileSectionKind.Prologue:
          return Syntax.UnparsedPrologue;
        case qt.BundleFileSectionKind.Prepend:
          return Syntax.UnparsedPrepend;
        case qt.BundleFileSectionKind.Internal:
          return Syntax.UnparsedInternalText;
        case qt.BundleFileSectionKind.Text:
          return Syntax.UnparsedText;
        case qt.BundleFileSectionKind.EmitHelpers:
        case qt.BundleFileSectionKind.NoDefaultLib:
        case qt.BundleFileSectionKind.Reference:
        case qt.BundleFileSectionKind.Type:
        case qt.BundleFileSectionKind.Lib:
          return qu.fail(`BundleFileSectionKind: ${k} not yet mapped to SyntaxKind`);
        default:
          return qc.assert.never(k);
      }
    }
    unwrapInnermostStatementOfLabel(n: qt.LabeledStatement, cb?: (n: qt.LabeledStatement) => void): qt.Statement {
      while (true) {
        if (cb) cb(n);
        if (n.statement.kind !== Syntax.LabeledStatement) return n.statement;
        n = n.statement as qt.LabeledStatement;
      }
    }
    leftmostExpression(e: qt.Expression, stopAtCallExpressions: boolean) {
      let n = e as Node;
      while (true) {
        switch (n.kind) {
          case Syntax.PostfixUnaryExpression:
            n = n.operand as Node;
            continue;
          case Syntax.BinaryExpression:
            n = n.left as Node;
            continue;
          case Syntax.ConditionalExpression:
            n = n.condition as Node;
            continue;
          case Syntax.TaggedTemplateExpression:
            n = n.tag as Node;
            continue;
          case Syntax.CallExpression:
            if (stopAtCallExpressions) return n;
          case Syntax.AsExpression:
          case Syntax.ElemAccessExpression:
          case Syntax.NonNullExpression:
          case Syntax.PartiallyEmittedExpression:
          case Syntax.PropertyAccessExpression:
            n = n.expression as Node;
            continue;
        }
        return n;
      }
    }
    rightMostAssignedExpression(e: qt.Expression) {
      let n = e as Node;
      while (qf.is.assignmentExpression(n, true)) {
        n = n.right as Node;
      }
      return n;
    }
    defaultedExpandoIniter(name: qt.Expression, i: qt.Expression, isPrototype: boolean) {
      const n = i as Node;
      const e = n.kind === Syntax.BinaryExpression && (n.operatorToken.kind === Syntax.Bar2Token || n.operatorToken.kind === Syntax.Question2Token) && this.expandoIniter(n.right as Node, isPrototype);
      if (e && qf.is.sameEntityName(name, (i as qt.BinaryExpression).left)) return e;
      return;
    }
    expressionAssociativity(e: qt.Expression) {
      const o = this.operator(e);
      const n = e as Node;
      const args = n.kind === Syntax.NewExpression && n.args !== undefined;
      return qy.get.operatorAssociativity(e.kind, o, args);
    }
    expressionPrecedence(e: qt.Expression) {
      const o = this.operator(e);
      const n = e as Node;
      const args = n.kind === Syntax.NewExpression && n.args !== undefined;
      return qy.get.operatorPrecedence(e.kind, o, args);
    }
    operator(e: qt.Expression): Syntax {
      const n = e as Node;
      if (n.kind === Syntax.BinaryExpression) return n.operatorToken.kind;
      else if (n.kind === Syntax.PrefixUnaryExpression || n.kind === Syntax.PostfixUnaryExpression) return n.operator;
      return n.kind;
    }
    propertyAccessOrIdentifierToString(e: qt.Expression): string | undefined {
      const n = e as Node;
      if (n.kind === Syntax.PropertyAccessExpression) {
        const s = this.propertyAccessOrIdentifierToString(n.expression);
        if (s !== undefined) return s + '.' + n.name;
      } else if (n.kind === Syntax.Identifier) return qy.get.unescUnderscores(n.escapedText);
      return;
    }
    moduleSpecifierText({ moduleSpecifier }: qt.ImportDeclaration): string {
      const n = moduleSpecifier as Node;
      return n.kind === Syntax.StringLiteral ? n.text : this.textOf(n);
    }
    entityNameToString(n: qt.EntityNameOrEntityNameExpression | qt.JsxTagNameExpression | qt.PrivateIdentifier): string {
      switch (n.kind) {
        case Syntax.ThisKeyword:
          return 'this';
        case Syntax.PrivateIdentifier:
        case Syntax.Identifier:
          return this.fullWidth(n) === 0 ? qb.idText(n) : this.textOf(n);
        case Syntax.QualifiedName:
          return this.entityNameToString(n.left) + '.' + this.entityNameToString(n.right);
        case Syntax.PropertyAccessExpression:
          if (n.name.kind === Syntax.Identifier || n.name.kind === Syntax.PrivateIdentifier) return this.entityNameToString(name.expression) + '.' + this.entityNameToString(name.name);
          return qc.assert.never(n.name);
        default:
          return qc.assert.never(n);
      }
    }
    generatedNameForNode(o?: Node): qt.Identifier;
    generatedNameForNode(o: Node | undefined, f: qt.GeneratedIdentifierFlags): qt.Identifier;
    generatedNameForNode(o?: Node, f?: qt.GeneratedIdentifierFlags): qt.Identifier {
      const n = new qc.Identifier(o && o.kind === Syntax.Identifier ? qb.idText(o) : '');
      n.autoGenerateFlags = qt.GeneratedIdentifierFlags.Node | f!;
      n.autoGenerateId = Fget.nextAutoGenerateId;
      n.original = o;
      Fget.nextAutoGenerateId++;
      return n;
    }
    nameOfAccessExpression(n: qt.AccessExpression) {
      if (n.kind === Syntax.PropertyAccessExpression) return n.name;
      qu.assert(n.kind === Syntax.ElemAccessExpression);
      return n.argExpression;
    }
    namespaceMemberName(ns: qt.Identifier, i: qt.Identifier, comments?: boolean, sourceMaps?: boolean): qc.PropertyAccessExpression {
      const n = new qc.PropertyAccessExpression(ns, qu.isSynthesized(i) ? i : getSynthesizedClone(i));
      n.setRange(i);
      let f: EmitFlags = 0;
      if (!sourceMaps) f |= EmitFlags.NoSourceMap;
      if (!comments) f |= EmitFlags.NoComments;
      if (f) setEmitFlags(n, f);
      return n;
    }
    nodeId(n: Node) {
      if (!n.id) {
        n.id = this.nextNodeId;
        this.nextNodeId++;
      }
      return n.id;
    }
    paramSymbolFromDoc(n: qt.DocParamTag): qt.Symbol | undefined {
      if (n.symbol) return n.symbol;
      if (n.name.kind !== Syntax.Identifier) return;
      const d = this.hostSignatureFromDoc(n);
      if (!d) return;
      const t = n.name.escapedText;
      const p = qu.find(d.params, (p) => p.name.kind === Syntax.Identifier && p.name.escapedText === t);
      return p?.symbol;
    }
    aliasDeclarationFromName(n: qt.EntityName): qt.Declaration | undefined {
      switch (n.parent?.kind) {
        case Syntax.ExportAssignment:
        case Syntax.ExportSpecifier:
        case Syntax.ImportClause:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ImportSpecifier:
        case Syntax.NamespaceImport:
          return n.parent as qt.Declaration;
        case Syntax.QualifiedName:
          do {
            n = n.parent as qt.QualifiedName;
          } while (n.parent?.kind === Syntax.QualifiedName);
          return this.aliasDeclarationFromName(n);
      }
      return;
    }
    propertyNameForPropertyNameNode(n: qt.PropertyName): qu.__String | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PrivateIdentifier:
          return n.escapedText;
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return qy.get.escUnderscores(n.text);
        case Syntax.ComputedPropertyName:
          const e = n.expression as Node;
          if (qf.is.wellKnownSymbolSyntactically(e)) return qu.getPropertyNameForKnownSymbolName(qb.idText((e as qt.PropertyAccessExpression).name));
          else if (qf.is.stringOrNumericLiteralLike(e)) return qy.get.escUnderscores(e.text);
          else if (qf.is.signedNumericLiteral(e)) {
            if (e.operator === Syntax.MinusToken) return (qy.toString(e.operator) + e.operand.text) as qu.__String;
            return e.operand.text as qu.__String;
          }
      }
      return;
    }
    textOfIdentifierOrLiteral(n: qt.PropertyNameLiteral): string {
      return qf.is.identifierOrPrivateIdentifier(n) ? qb.idText(n) : n.text;
    }
    escapedTextOfIdentifierOrLiteral(n: qt.PropertyNameLiteral): qu.__String {
      return qf.is.identifierOrPrivateIdentifier(n) ? n.escapedText : qy.get.escUnderscores(n.text);
    }
    exportAssignmentExpression(n: qt.ExportAssignment | qt.BinaryExpression): qt.Expression {
      return n.kind === Syntax.ExportAssignment ? n.expression : n.right;
    }
    propertyAssignmentAliasLikeExpression(n: qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.PropertyAccessExpression): qt.Expression {
      return n.kind === Syntax.ShorthandPropertyAssignment ? n.name : n.kind === Syntax.PropertyAssignment ? n.initer : (n.parent as qt.BinaryExpression).right;
    }
    heritageClause(cs: qt.Nodes<qt.HeritageClause> | undefined, k: Syntax) {
      if (cs) {
        for (const c of cs) {
          if (c.token === k) return c;
        }
      }
      return;
    }
    externalModuleName(n: qt.AnyImportOrReExport | qt.ImportTyping): qt.Expression | undefined {
      switch (n.kind) {
        case Syntax.ExportDeclaration:
        case Syntax.ImportDeclaration:
          return n.moduleSpecifier;
        case Syntax.ImportEqualsDeclaration:
          return n.moduleReference.kind === Syntax.ExternalModuleReference ? n.moduleReference.expression : undefined;
        case Syntax.ImportTyping:
          return qf.is.literalImportTyping(n) ? n.arg.literal : undefined;
      }
    }
    firstIdentifier(n: qt.EntityNameOrEntityNameExpression): qt.Identifier {
      switch (n.kind) {
        case Syntax.Identifier:
          return n;
        case Syntax.QualifiedName:
          do {
            n = n.left;
          } while (n.kind !== Syntax.Identifier);
          return n;
        case Syntax.PropertyAccessExpression:
          do {
            n = n.expression;
          } while (n.kind !== Syntax.Identifier);
          return n;
      }
    }
    errorSpanForArrowFunction(s: qt.SourceFile, n: qt.ArrowFunction): qu.TextSpan {
      const pos = qy.skipTrivia(s.text, n.pos);
      if (n.body && n.body.kind === Syntax.Block) {
        const { line: startLine } = s.lineAndCharOf(n.body.pos);
        const { line: endLine } = s.lineAndCharOf(n.body.end);
        if (startLine < endLine) return new qu.TextSpan(pos, getEndLinePosition(startLine, s) - pos + 1);
      }
      return qu.TextSpan.from(pos, n.end);
    }
    sourceTextOfNodeFromSourceFile(s: qt.SourceFile, n: Node, includeTrivia = false): string {
      return this.textOfNodeFromSourceText(s.text, n, includeTrivia);
    }
    errorSpanForNode(s: qt.SourceFile, n: Node): qu.TextSpan {
      let e: Node | undefined = n;
      switch (n.kind) {
        case Syntax.SourceFile:
          const pos = qy.skipTrivia(s.text, 0, false);
          if (pos === s.text.length) return new qu.TextSpan();
          return getSpanOfTokenAtPosition(s, pos);
        case Syntax.BindingElem:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.EnumDeclaration:
        case Syntax.EnumMember:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.GetAccessor:
        case Syntax.InterfaceDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.SetAccessor:
        case Syntax.TypeAliasDeclaration:
        case Syntax.VariableDeclaration:
          e = n.name;
          break;
        case Syntax.ArrowFunction:
          return this.errorSpanForArrowFunction(s, n);
        case Syntax.CaseClause:
        case Syntax.DefaultClause:
          const start = qy.skipTrivia(s.text, n.pos);
          const end = n.statements.length > 0 ? n.statements[0].pos : n.end;
          return qu.TextSpan.from(start, end);
      }
      if (e === undefined) return getSpanOfTokenAtPosition(s, n.pos);
      qu.assert(e.kind !== Syntax.DocComment);
      const isMissing = qf.is.missing(e);
      const pos = isMissing || n.kind === Syntax.JsxText ? e.pos : qy.skipTrivia(s.text, e.pos);
      if (isMissing) {
        qu.assert(pos === e.pos);
        qu.assert(pos === e.end);
      } else {
        qu.assert(pos >= e.pos);
        qu.assert(pos <= e.end);
      }
      return qu.TextSpan.from(pos, e.end);
    }
    nameOrArg(n: qt.PropertyAccessExpression | qt.LiteralLikeElemAccessExpression) {
      if (n.kind === Syntax.PropertyAccessExpression) return n.name;
      return n.argExpression;
    }
    elemOrPropertyAccessArgExpressionOrName(n: qt.AccessExpression): qt.Identifier | qt.PrivateIdentifier | qt.StringLiteralLike | qt.NumericLiteral | qt.ElemAccessExpression | undefined {
      if (n.kind === Syntax.PropertyAccessExpression) return n.name;
      const a = qb.skip.parentheses(n.argExpression) as Node;
      if (a.kind === Syntax.NumericLiteral || qf.is.stringLiteralLike(a)) return a;
      return n;
    }
    elemOrPropertyAccessName(n: qt.LiteralLikeElemAccessExpression | qt.PropertyAccessExpression): qu.__String;
    elemOrPropertyAccessName(n: qt.AccessExpression): qu.__String | undefined;
    elemOrPropertyAccessName(n: qt.AccessExpression): qu.__String | undefined {
      const name = this.elemOrPropertyAccessArgExpressionOrName(n);
      if (name) {
        if (name.kind === Syntax.Identifier) return name.escapedText;
        if (qf.is.stringLiteralLike(name) || name.kind === Syntax.NumericLiteral) return qy.get.escUnderscores(name.text);
      }
      if (n.kind === Syntax.ElemAccessExpression && qf.is.wellKnownSymbolSyntactically(n.argExpression as Node)) return qu.getPropertyNameForKnownSymbolName(qb.idText(n.argExpression.name));
      return;
    }
    assignmentDeclarationPropertyAccessKind(e: qt.AccessExpression): qt.AssignmentDeclarationKind {
      if (e.expression.kind === Syntax.ThisKeyword) return qt.AssignmentDeclarationKind.ThisProperty;
      else if (qf.is.moduleExportsAccessExpression(e)) return qt.AssignmentDeclarationKind.ModuleExports;
      else if (qf.is.bindableStaticNameExpression(e.expression, true)) {
        if (qf.is.prototypeAccess(e.expression)) return qt.AssignmentDeclarationKind.PrototypeProperty;
        let nextToLast = e;
        while (nextToLast.expression.kind !== Syntax.Identifier) {
          nextToLast = nextToLast.expression as Exclude<qt.BindableStaticNameExpression, qt.Identifier>;
        }
        const id = nextToLast.expression;
        if ((id.escapedText === 'exports' || (id.escapedText === 'module' && this.elemOrPropertyAccessName(nextToLast) === 'exports')) && qf.is.bindableStaticAccessExpression(e))
          return qt.AssignmentDeclarationKind.ExportsProperty;
        if (qf.is.bindableStaticNameExpression(e, true) || (e.kind === Syntax.ElemAccessExpression && qf.is.dynamicName(e))) return qt.AssignmentDeclarationKind.Property;
      }
      return qt.AssignmentDeclarationKind.None;
    }
    initerOfBinaryExpression(e: qt.BinaryExpression) {
      let n = e.right as Node;
      while (n.kind === Syntax.BinaryExpression) {
        n = n.right as Node;
      }
      return n.right;
    }
    effectiveIniter(n: qt.HasExpressionIniter) {
      const i = n.initer as Node | undefined;
      if (
        qf.is.inJSFile(n) &&
        i?.kind === Syntax.BinaryExpression &&
        (i.operatorToken.kind === Syntax.Bar2Token || i.operatorToken.kind === Syntax.Question2Token) &&
        n.name &&
        qf.is.entityNameExpression(n.name) &&
        qf.is.sameEntityName(n.name, i.left)
      ) {
        return i.right;
      }
      return i;
    }
    declaredExpandoIniter(n: qt.HasExpressionIniter) {
      const i = this.effectiveIniter(n);
      return i && this.expandoIniter(i, qf.is.prototypeAccess(n.name));
    }
    assignmentDeclarationKind(e: qt.BinaryExpression | qt.CallExpression): qt.AssignmentDeclarationKind {
      const worker = (e: qt.BinaryExpression | qt.CallExpression): qt.AssignmentDeclarationKind => {
        if (e.kind === Syntax.CallExpression) {
          if (!qf.is.bindableObjectDefinePropertyCall(e)) return qt.AssignmentDeclarationKind.None;
          const n = e.args[0] as Node;
          if (qf.is.exportsIdentifier(n) || qf.is.moduleExportsAccessExpression(n)) return qt.AssignmentDeclarationKind.ObjectDefinePropertyExports;
          if (qf.is.bindableStaticAccessExpression(n) && this.elemOrPropertyAccessName(n) === 'prototype') return qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty;
          return qt.AssignmentDeclarationKind.ObjectDefinePropertyValue;
        }
        if (e.operatorToken.kind !== Syntax.EqualsToken || !qf.is.accessExpression(e.left as Node)) return qt.AssignmentDeclarationKind.None;
        if (
          qf.is.bindableStaticNameExpression(e.left.expression as Node, true) &&
          this.elemOrPropertyAccessName(e.left) === 'prototype' &&
          this.initerOfBinaryExpression(e).kind === Syntax.ObjectLiteralExpression
        ) {
          return qt.AssignmentDeclarationKind.Prototype;
        }
        return this.assignmentDeclarationPropertyAccessKind(e.left);
      };
      const special = worker(e);
      return special === qt.AssignmentDeclarationKind.Property || qf.is.inJSFile(e) ? special : qt.AssignmentDeclarationKind.None;
    }
    nameFromIndexInfo(i: qt.IndexInfo): string | undefined {
      return i.declaration ? declarationNameToString(i.declaration.params[0].name) : undefined;
    }
    restParamElemType(t?: qt.Typing) {
      const n = t as Node | undefined;
      if (n?.kind === Syntax.ArrayTyping) return n.elemType;
      else if (n?.kind === Syntax.TypingReference) return qu.singleOrUndefined(n.typeArgs);
      return;
    }
    propertyAssignment(e: qt.ObjectLiteralExpression, k: string, k2?: string): readonly qt.PropertyAssignment[] {
      return e.properties.filter((p): p is qt.PropertyAssignment => {
        if (p.kind === Syntax.PropertyAssignment) {
          const n = this.textOfPropertyName(p.name);
          return k === n || (!!k2 && k2 === n);
        }
        return false;
      });
    }
    tsConfigObjectLiteralExpression(s?: qt.TsConfigSourceFile): qt.ObjectLiteralExpression | undefined {
      if (s && s.statements.length) {
        const e = s.statements[0].expression;
        return qu.tryCast(e, isObjectLiteralExpression);
      }
    }
    tsConfigPropArrayElemValue(s: qt.TsConfigSourceFile | undefined, k: string, v: string): qt.StringLiteral | undefined {
      return qu.firstDefined(this.tsConfigPropArray(s, k), (p) =>
        isArrayLiteralExpression(p.initer) ? qu.find(p.initer.elems, (e): e is qt.StringLiteral => e.kind === Syntax.StringLiteral && e.text === v) : undefined
      );
    }
    tsConfigPropArray(s: qt.TsConfigSourceFile | undefined, k: string): readonly qt.PropertyAssignment[] {
      const e = this.tsConfigObjectLiteralExpression(s);
      return e ? this.propertyAssignment(e, k) : qu.empty;
    }
    entityNameFromTypeNode(t: qt.Typing): qt.EntityNameOrEntityNameExpression | undefined {
      const n = t as Node;
      switch (n.kind) {
        case Syntax.TypingReference:
          return n.typeName;
        case Syntax.ExpressionWithTypings:
          return qf.is.entityNameExpression(n.expression as Node) ? (n.expression as qt.EntityNameExpression) : undefined;
        case Syntax.Identifier:
        case Syntax.QualifiedName:
          return n as qt.EntityName;
      }
      return;
    }
    invokedExpression(n: qt.CallLikeExpression): qt.Expression {
      switch (n.kind) {
        case Syntax.TaggedTemplateExpression:
          return n.tag;
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
          return n.tagName;
      }
      return n.expression;
    }
    assignedExpandoIniter(n?: Node): qt.Expression | undefined {
      const p = n?.parent;
      if (p?.kind === Syntax.BinaryExpression && p.operatorToken.kind === Syntax.EqualsToken) {
        const isPrototypeAssignment = qf.is.prototypeAccess(p.left as Node);
        return this.expandoIniter(p.right as Node, isPrototypeAssignment) || this.defaultedExpandoIniter(p.left, p.right, isPrototypeAssignment);
      }
      if (n?.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(n)) {
        const hasExpandoValueProperty = (n: qt.ObjectLiteralExpression, isPrototype: boolean) => {
          return qu.each(
            n.properties,
            (p) => p.kind === Syntax.PropertyAssignment && p.name.kind === Syntax.Identifier && p.name.escapedText === 'value' && p.initer && this.expandoIniter(p.initer as Node, isPrototype)
          );
        };
        const r = hasExpandoValueProperty(n.args[2], n.args[1].text === 'prototype');
        if (r) return r;
      }
      return;
    }
    expandoIniter(n: Node, isPrototype: boolean): qt.Expression | undefined {
      if (n.kind === Syntax.CallExpression) {
        const e = qb.skip.parentheses(n.expression);
        return e.kind === Syntax.FunctionExpression || e.kind === Syntax.ArrowFunction ? n : undefined;
      }
      if (n.kind === Syntax.FunctionExpression || n.kind === Syntax.ClassExpression || n.kind === Syntax.ArrowFunction) return n as qt.Expression;
      if (n.kind === Syntax.ObjectLiteralExpression && (n.properties.length === 0 || isPrototype)) return n;
      return;
    }
    textOfNodeFromSourceText(t: string, n: Node, includeTrivia = false): string {
      if (qf.is.missing(n)) return '';
      let text = t.substring(includeTrivia ? n.pos : qy.skipTrivia(t, n.pos), n.end);
      if (qf.is.docTypeExpressionOrChild(n)) text = text.replace(/(^|\r?\n|\r)\s*\*\s*/g, '$1');
      return text;
    }
    containingFunction(n: Node): qt.SignatureDeclaration | undefined {
      return qb.findAncestor(n.parent, qf.is.functionLike);
    }
    containingFunctionDeclaration(n: Node): qt.FunctionLikeDeclaration | undefined {
      return qb.findAncestor(n.parent, qf.is.functionLikeDeclaration);
    }
    containingClass(n: Node): qt.ClassLikeDeclaration | undefined {
      return qb.findAncestor(n.parent, qf.is.classLike);
    }
    thisContainer(n: Node | undefined, arrowFunctions: boolean): Node {
      qu.assert(n?.kind !== Syntax.SourceFile);
      while (true) {
        n = n?.parent;
        if (!n) return qu.fail();
        const p = n.parent as Node | undefined;
        switch (n.kind) {
          case Syntax.ComputedPropertyName:
            if (qf.is.classLike(p?.parent)) return n;
            n = p;
            break;
          case Syntax.Decorator:
            if (p?.kind === Syntax.Param && qf.is.classElem(p?.parent)) n = p.parent;
            else if (qf.is.classElem(n.parent)) n = n.parent;
            break;
          case Syntax.ArrowFunction:
            if (!arrowFunctions) continue;
          case Syntax.CallSignature:
          case Syntax.Constructor:
          case Syntax.ConstructSignature:
          case Syntax.EnumDeclaration:
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.GetAccessor:
          case Syntax.IndexSignature:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.ModuleDeclaration:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.SetAccessor:
          case Syntax.SourceFile:
            return n;
        }
      }
    }
    newTargetContainer(n: Node) {
      const c = this.thisContainer(n, false);
      switch (c?.kind) {
        case Syntax.Constructor:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          return c;
      }
      return;
    }
    superContainer(n: Node | undefined, stopOnFunctions: boolean): Node | undefined {
      while (true) {
        n = n?.parent as Node | undefined;
        if (!n) return n;
        switch (n.kind) {
          case Syntax.ComputedPropertyName:
            n = n.parent as Node | undefined;
            break;
          case Syntax.ArrowFunction:
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
            if (!stopOnFunctions) continue;
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.SetAccessor:
            return n;
          case Syntax.Decorator:
            const p = n.parent as Node | undefined;
            if (p?.kind === Syntax.Param && qf.is.classElem(p.parent)) n = p.parent;
            else if (p && qf.is.classElem(p)) n = p;
            break;
        }
      }
    }
    immediatelyInvokedFunctionExpression(n: Node): qt.CallExpression | undefined {
      if (n.kind === Syntax.FunctionExpression || n.kind === Syntax.ArrowFunction) {
        let prev = n as Node;
        let p = n.parent as Node | undefined;
        while (p?.kind === Syntax.ParenthesizedExpression) {
          prev = p as Node;
          p = p.parent as Node | undefined;
        }
        if (p?.kind === Syntax.CallExpression && p.expression === prev) return p;
      }
      return;
    }
    enclosingBlockScopeContainer(n: Node): Node {
      return qb.findAncestor(n.parent, (x) => qf.is.blockScope(x, x.parent))!;
    }
    textOf(n: Node, trivia = false): string {
      return this.sourceTextOfNodeFromSourceFile(n.sourceFile, n, trivia);
    }
    emitFlags(n: Node): EmitFlags {
      const e = n.emitNode;
      return (e && e.flags) || 0;
    }
    literalText(n: qt.LiteralLikeNode, s: qt.SourceFile, neverAsciiEscape: boolean | undefined, jsxAttributeEscape: boolean) {
      if (!qu.isSynthesized(n) && n.parent && !((n.kind === Syntax.NumericLiteral && n.numericLiteralFlags & TokenFlags.ContainsSeparator) || n.kind === Syntax.BigIntLiteral))
        return this.sourceTextOfNodeFromSourceFile(s, n);
      switch (n.kind) {
        case Syntax.StringLiteral: {
          const esc = jsxAttributeEscape ? qy.escapeJsxAttributeString : neverAsciiEscape || this.emitFlags(n) & EmitFlags.NoAsciiEscaping ? qy.escapeString : qy.escapeNonAsciiString;
          if (n.singleQuote) return "'" + esc(n.text, qy.Codes.singleQuote) + "'";
          return '"' + esc(n.text, qy.Codes.doubleQuote) + '"';
        }
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail: {
          const esc = neverAsciiEscape || this.emitFlags(n) & EmitFlags.NoAsciiEscaping ? qy.escapeString : qy.escapeNonAsciiString;
          const raw = n.rawText || escapeTemplateSubstitution(esc(n.text, qy.Codes.backtick));
          switch (n.kind) {
            case Syntax.NoSubstitutionLiteral:
              return '`' + raw + '`';
            case Syntax.TemplateHead:
              return '`' + raw + '${';
            case Syntax.TemplateMiddle:
              return '}' + raw + '${';
            case Syntax.TemplateTail:
              return '}' + raw + '`';
          }
          break;
        }
        case Syntax.BigIntLiteral:
        case Syntax.NumericLiteral:
        case Syntax.RegexLiteral:
          return n.text;
      }
      return qu.fail(`Literal kind '${n.kind}' not accounted for.`);
    }
    combinedFlags(n: Node | undefined, cb: (n?: Node) => number): number {
      if (n?.kind === Syntax.BindingElem) n = qb.walkUpBindingElemsAndPatterns(n);
      let flags = cb(n);
      if (n?.kind === Syntax.VariableDeclaration) n = n.parent;
      if (n?.kind === Syntax.VariableDeclarationList) {
        flags |= cb(n);
        n = n.parent;
      }
      if (n?.kind === Syntax.VariableStatement) flags |= cb(n);
      return flags;
    }
    combinedFlagsOf(n: Node): NodeFlags {
      return this.combinedFlags(n, (n) => n?.flags);
    }
    originalOf(n: Node): Node;
    originalOf<T extends Node>(n: Node, cb: (n?: Node) => n is T): T;
    originalOf(n: Node | undefined): Node | undefined;
    originalOf<T extends Node>(n: Node | undefined, cb: (n?: Node) => n is T): T | undefined;
    originalOf(n: Node | undefined, cb?: (n?: Node) => boolean): Node | undefined {
      if (n) {
        while (n?.original !== undefined) {
          n = n?.original;
        }
      }
      return !cb || cb(n) ? n : undefined;
    }
    parseTreeOf(n: Node): Node;
    parseTreeOf<T extends Node>(n: Node | undefined, cb?: (n: Node) => n is T): T | undefined;
    parseTreeOf(n: Node | undefined, cb?: (n: Node) => boolean): Node | undefined {
      if (n === undefined || qf.is.parseTreeNode(n)) return n;
      n = this.originalOf(n);
      if (qf.is.parseTreeNode(n) && (!cb || cb(n))) return n;
      return;
    }
    assignedName(n: Node): qt.DeclarationName | undefined {
      if (!n.parent) return;
      if (n.parent.kind === Syntax.PropertyAssignment || n.parent.kind === Syntax.BindingElem) return n.parent.name;
      if (n.parent.kind === Syntax.BinaryExpression && n === n.parent.right) {
        if (n.parent.left.kind === Syntax.Identifier) return n.parent.left;
        if (qf.is.accessExpression(n.parent.left)) return this.elemOrPropertyAccessArgExpressionOrName(n.parent.left);
      } else if (n.parent.kind === Syntax.VariableDeclaration && n.parent.name.kind === Syntax.Identifier) return n.parent.name;
      return;
    }
    getLastChild(n: Node): Node | undefined {
      let last: Node | undefined;
      qf.each.child(
        n,
        (c) => {
          if (qf.is.present(c)) last = c;
        },
        (cs) => {
          for (let i = cs.length - 1; i >= 0; i--) {
            const n2 = cs[i] as Node;
            if (qf.is.present(n2)) {
              last = n2;
              break;
            }
          }
        }
      );
      return last;
    }
    rootDeclaration(n?: Node): Node | undefined {
      while (n?.kind === Syntax.BindingElem) {
        n = n.parent?.parent;
      }
      return n;
    }
    selectedEffectiveModifierFlags(n: Node, f: ModifierFlags): ModifierFlags {
      return this.effectiveModifierFlags(n) & f;
    }
    selectedSyntacticModifierFlags(n: Node, f: ModifierFlags): ModifierFlags {
      return this.syntacticModifierFlags(n) & f;
    }
    effectiveModifierFlags(n: Node): ModifierFlags {
      return getModifierFlagsWorker(n, true);
    }
    syntacticModifierFlags(n: Node): ModifierFlags {
      return getModifierFlagsWorker(n, false);
    }
    effectiveModifierFlagsNoCache(n: Node): ModifierFlags {
      return this.syntacticModifierFlagsNoCache(n) | this.doc.modifierFlagsNoCache(n);
    }
    syntacticModifierFlagsNoCache(n: Node): ModifierFlags {
      const modifiersToFlags = (ms?: Nodes<Modifier>) => {
        let f = ModifierFlags.None;
        if (ms) {
          for (const m of ms) {
            f |= qy.get.modifierFlag(m.kind);
          }
        }
        return f;
      };
      let f = modifiersToFlags(n.modifiers);
      if (n.flags & NodeFlags.NestedNamespace || (n.kind === Syntax.Identifier && n.isInDocNamespace)) f |= ModifierFlags.Export;
      return f;
    }
    effectiveTypeAnnotationNode(n: Node): qt.Typing | undefined {
      if (!qf.is.inJSFile(n) && n.kind === Syntax.FunctionDeclaration) return;
      const type = (n as qc.HasType).type;
      if (type || !qf.is.inJSFile(n)) return type;
      return qf.is.doc.propertyLikeTag(n) ? n.typeExpression && n.typeExpression.type : this.doc.type(n);
    }
    typeAnnotationNode(n: Node): qt.Typing | undefined {
      return (n as qt.HasType).type;
    }
    assignmentTargetKind(n?: Node): qt.AssignmentKind {
      let p = n?.parent;
      while (true) {
        switch (p?.kind) {
          case Syntax.BinaryExpression:
            const binaryOperator = p.operatorToken.kind;
            return qy.is.assignmentOperator(binaryOperator) && p.left === n
              ? binaryOperator === Syntax.EqualsToken
                ? qt.AssignmentKind.Definite
                : qt.AssignmentKind.Compound
              : qt.AssignmentKind.None;
          case Syntax.PostfixUnaryExpression:
          case Syntax.PrefixUnaryExpression:
            const unaryOperator = p.operator;
            return unaryOperator === Syntax.Plus2Token || unaryOperator === Syntax.Minus2Token ? qt.AssignmentKind.Compound : qt.AssignmentKind.None;
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
            return p.initer === n ? qt.AssignmentKind.Definite : qt.AssignmentKind.None;
          case Syntax.ArrayLiteralExpression:
          case Syntax.NonNullExpression:
          case Syntax.ParenthesizedExpression:
          case Syntax.SpreadElem:
            n = p;
            break;
          case Syntax.ShorthandPropertyAssignment:
            if (p.name !== n) return qt.AssignmentKind.None;
            n = p?.parent;
            break;
          case Syntax.PropertyAssignment:
            if (p.name === n) return qt.AssignmentKind.None;
            n = p?.parent;
            break;
          default:
            return qt.AssignmentKind.None;
        }
        p = n?.parent;
      }
    }
    hostSignatureFromDoc(n: Node): qt.SignatureDeclaration | undefined {
      const h = this.effectiveDocHost(n);
      return h && qf.is.functionLike(h) ? h : undefined;
    }
    effectiveDocHost(n: Node) {
      const h = this.doc.host(n);
      return (
        this.sourceOfDefaultedAssignment(h) ||
        this.sourceOfAssignment(h) ||
        this.singleIniterOfVariableStatementOrPropertyDeclaration(h) ||
        this.singleVariableOfVariableStatement(h) ||
        this.nestedModuleDeclaration(h) ||
        h
      );
    }
    sourceOfAssignment(n: Node): Node | undefined {
      if (n.kind === Syntax.ExpressionStatement) {
        const e = n.expression as Node;
        if (e.kind === Syntax.BinaryExpression && e.operatorToken.kind === Syntax.EqualsToken) return this.rightMostAssignedExpression(e);
      }
      return;
    }
    sourceOfDefaultedAssignment(n: Node) {
      if (n.kind === Syntax.ExpressionStatement) {
        const e = n.expression as Node;
        if (e.kind === Syntax.BinaryExpression && this.assignmentDeclarationKind(e) !== qt.AssignmentDeclarationKind.None) {
          const r = e.right as Node;
          if (r.kind === Syntax.BinaryExpression && (r.operatorToken.kind === Syntax.Bar2Token || r.operatorToken.kind === Syntax.Question2Token)) return r.right;
        }
      }
      return;
    }
    singleIniterOfVariableStatementOrPropertyDeclaration(n: Node): qt.Expression | undefined {
      switch (n.kind) {
        case Syntax.VariableStatement:
          const v = this.singleVariableOfVariableStatement(n);
          return v?.initer;
        case Syntax.PropertyDeclaration:
          return n.initer;
        case Syntax.PropertyAssignment:
          return n.initer;
      }
      return;
    }
    singleVariableOfVariableStatement(n: Node): qt.VariableDeclaration | undefined {
      return n.kind === Syntax.VariableStatement ? qu.firstOrUndefined(n.declarationList.declarations) : undefined;
    }
    nestedModuleDeclaration(n?: Node): Node | undefined {
      return n?.kind === Syntax.ModuleDeclaration && n.body && n.body.kind === Syntax.ModuleDeclaration ? n.body : undefined;
    }
    ancestor(n: Node | undefined, k: Syntax): Node | undefined {
      while (n) {
        if (n.kind === k) return n;
        n = n.parent;
      }
      return;
    }
    allSuperTypeNodes(n: Node): readonly qt.Typing[] {
      return n.kind === Syntax.InterfaceDeclaration
        ? this.interfaceBaseTypeNodes(n) || qu.empty
        : qf.is.classLike(n)
        ? qu.concatenate(qu.singleElemArray(this.effectiveBaseTypeNode(n)), this.effectiveImplementsTypeNodes(n)) || qu.empty
        : qu.empty;
    }
    externalModuleImportEqualsDeclarationExpression(n: Node) {
      qu.assert(qf.is.externalModuleImportEqualsDeclaration(n));
      return n.moduleReference.expression;
    }
    declarationOfExpando(n: Node): Node | undefined {
      if (!n.parent) return;
      let name: qt.Expression | qt.BindingName | undefined;
      let decl: Node | undefined;
      if (n.parent.kind === Syntax.VariableDeclaration && n.parent.initer === n) {
        if (!qf.is.inJSFile(n) && !qf.is.varConst(n.parent)) return;
        name = n.parent.name;
        decl = n.parent;
      } else if (n.parent.kind === Syntax.BinaryExpression) {
        const p = n.parent;
        const o = n.parent.operatorToken.kind;
        if (o === Syntax.EqualsToken && p.right === n) {
          name = p.left;
          decl = name;
        } else if (o === Syntax.Bar2Token || o === Syntax.Question2Token) {
          if (p.parent?.kind === Syntax.VariableDeclaration && p.parent.initer === p) {
            name = p.parent.name;
            decl = p.parent;
          } else if (p.parent?.kind === Syntax.BinaryExpression && p.parent.operatorToken.kind === Syntax.EqualsToken && p.parent.right === p) {
            name = p.parent.left;
            decl = name;
          }
          if (!name || !qf.is.bindableStaticNameExpression(name) || !qf.is.sameEntityName(name, p.left)) return;
        }
      }
      if (!name || !this.expandoIniter(n, qf.is.prototypeAccess(name))) return;
      return decl;
    }
    defaultLibFileName(o: qt.CompilerOpts): string {
      switch (o.target) {
        case qt.ScriptTarget.ESNext:
          return 'lib.esnext.full.d.ts';
        case qt.ScriptTarget.ES2020:
          return 'lib.es2020.full.d.ts';
      }
      return 'lib.d.ts';
    }
    nonDecoratorTokenPosOfNode(n: Node, s?: qy.SourceFileLike): number {
      if (qf.is.missing(n) || !n.decorators) return n.tokenPos(s);
      return qy.skipTrivia((s || n.sourceFile).text, n.decorators.end);
    }
    textOfPropertyName(p: qt.PropertyName | qt.NoSubstitutionLiteral): qu.__String {
      const n = p as Node;
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PrivateIdentifier:
          return n.escapedText;
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return qy.get.escUnderscores(n.text);
        case Syntax.ComputedPropertyName:
          if (qf.is.stringOrNumericLiteralLike(n.expression as Node)) return qy.get.escUnderscores(n.expression.text);
          return qu.fail();
        default:
          return qc.assert.never(n);
      }
    }
    doc = new (class extends Fget {
      nameForNamelessTypedef(d: qt.DocTypedefTag | qt.DocEnumTag): qt.Identifier | qt.PrivateIdentifier | undefined {
        const n = d.parent?.parent;
        if (!n) return;
        if (qf.is.declaration(n)) return this.declarationIdentifier(n);
        switch (n.kind) {
          case Syntax.VariableStatement:
            if (n.declarationList && n.declarationList.declarations[0]) return this.declarationIdentifier(n.declarationList.declarations[0]);
            break;
          case Syntax.ExpressionStatement:
            let e = n.expression as Node;
            if (e.kind === Syntax.BinaryExpression && e.operatorToken.kind === Syntax.EqualsToken) {
              e = e.left as Node;
            }
            switch (e.kind) {
              case Syntax.PropertyAccessExpression:
                return e.name;
              case Syntax.ElemAccessExpression:
                const a = e.argExpression as Node;
                if (a.kind === Syntax.Identifier) return a;
            }
            break;
          case Syntax.ParenthesizedExpression: {
            return this.declarationIdentifier(n.expression);
          }
          case Syntax.LabeledStatement: {
            const s = n.statement as Node;
            if (qf.is.declaration(s) || qf.is.expression(s)) return this.declarationIdentifier(s);
            break;
          }
        }
        return;
      }
      augmentsTag(n: Node): qt.DocAugmentsTag | undefined {
        return this.firstTag(n, (n) => n.kind === Syntax.DocAugmentsTag);
      }
      implementsTags(n: Node): readonly qt.DocImplementsTag[] {
        return this.allTags(n, qf.is.doc.implementsTag);
      }
      classTag(n: Node): qt.DocClassTag | undefined {
        return this.firstTag(n, qf.is.doc.classTag);
      }
      publicTag(n: Node): qt.DocPublicTag | undefined {
        return this.firstTag(n, qf.is.doc.publicTag);
      }
      publicTagNoCache(n: Node): qt.DocPublicTag | undefined {
        return this.firstTag(n, qf.is.doc.publicTag, true);
      }
      privateTag(n: Node): qt.DocPrivateTag | undefined {
        return this.firstTag(n, qf.is.doc.privateTag);
      }
      privateTagNoCache(n: Node): qt.DocPrivateTag | undefined {
        return this.firstTag(n, qf.is.doc.privateTag, true);
      }
      protectedTag(n: Node): qt.DocProtectedTag | undefined {
        return this.firstTag(n, qf.is.doc.protectedTag);
      }
      protectedTagNoCache(n: Node): qt.DocProtectedTag | undefined {
        return this.firstTag(n, qf.is.doc.protectedTag, true);
      }
      readonlyTag(n: Node): qt.DocReadonlyTag | undefined {
        return this.firstTag(n, qf.is.doc.readonlyTag);
      }
      readonlyTagNoCache(n: Node): qt.DocReadonlyTag | undefined {
        return this.firstTag(n, qf.is.doc.readonlyTag, true);
      }
      enumTag(n: Node): qt.DocEnumTag | undefined {
        return this.firstTag(n, qf.is.doc.enumTag);
      }
      thisTag(n: Node): qt.DocThisTag | undefined {
        return this.firstTag(n, qf.is.doc.thisTag);
      }
      returnTag(n: Node): qt.DocReturnTag | undefined {
        return this.firstTag(n, qf.is.doc.returnTag);
      }
      templateTag(n: Node): qt.DocTemplateTag | undefined {
        return this.firstTag(n, qf.is.doc.templateTag);
      }
      typeTag(n: Node): qt.DocTypeTag | undefined {
        const tag = this.firstTag(n, qf.is.doc.typeTag);
        if (tag && tag.typeExpression && tag.typeExpression.type) return tag;
        return;
      }
      type(n: Node): qt.Typing | undefined {
        let tag: qt.DocTypeTag | qt.DocParamTag | undefined = this.firstTag(n, qf.is.doc.typeTag);
        if (!tag && n.kind === Syntax.Param) tag = qu.find(this.paramTags(n), (tag) => !!tag.typeExpression);
        return tag && tag.typeExpression && tag.typeExpression.type;
      }
      returnType(n: Node): qt.Typing | undefined {
        const returnTag = this.returnTag(n);
        if (returnTag && returnTag.typeExpression) return returnTag.typeExpression.type;
        const typeTag = this.typeTag(n);
        if (typeTag && typeTag.typeExpression) {
          const type = typeTag.typeExpression.type;
          if (type.kind === Syntax.TypingLiteral) {
            const sig = qu.find(type.members, qt.CallSignature.kind);
            return sig && sig.type;
          }
          if (type.kind === Syntax.FunctionTyping || type.kind === Syntax.DocFunctionTyping) return type.type;
        }
        return;
      }
      tagsWorker(n?: Node, noCache?: boolean): readonly qt.DocTag[] {
        let tags = (n as qt.DocContainer).cache;
        if (tags === undefined || noCache) {
          const comments = this.commentsAndTags(n, noCache);
          qu.assert(comments.length < 2 || comments[0] !== comments[1]);
          tags = qu.flatMap(comments, (j) => (j.kind === Syntax.Doc ? j.tags : j));
          if (!noCache) (n as qt.DocContainer).cache = tags;
        }
        return tags;
      }
      tags(n: Node): readonly qt.DocTag[] {
        return this.tagsWorker(n, false);
      }
      tagsNoCache(n: Node): readonly qt.DocTag[] {
        return this.tagsWorker(n, true);
      }
      firstTag<T extends qt.DocTag>(n: Node, cb: (t: qt.DocTag) => t is T, noCache?: boolean): T | undefined {
        return qu.find(this.tagsWorker(n, noCache), cb);
      }
      allTags<T extends qt.DocTag>(n: Node, cb: (t: qt.DocTag) => t is T): readonly T[] {
        return this.tags(n).filter(cb);
      }
      allTagsOfKind(n: Node, k: Syntax): readonly qt.DocTag[] {
        return this.tags(n).filter((t) => t.kind === k);
      }
      nameOfTypedef(n: qt.DocTypedefTag): qt.Identifier | qt.PrivateIdentifier | undefined {
        return n.name || this.nameForNamelessTypedef(n);
      }
      commentRanges(n: Node, text: string) {
        const commentRanges =
          n.kind === Syntax.Param || n.kind === Syntax.TypeParam || n.kind === Syntax.FunctionExpression || n.kind === Syntax.ArrowFunction || n.kind === Syntax.ParenthesizedExpression
            ? qu.concatenate(qy.get.trailingCommentRanges(text, n.pos), qy.get.leadingCommentRanges(text, n.pos))
            : qy.get.leadingCommentRanges(text, n.pos);
        return qu.filter(commentRanges, (c) => text.charCodeAt(c.pos + 1) === qy.Codes.asterisk && text.charCodeAt(c.pos + 2) === qy.Codes.asterisk && text.charCodeAt(c.pos + 3) !== qy.Codes.slash);
      }
      commentsAndTags(host: Node, noCache?: boolean): readonly (qc.Doc | qt.DocTag)[] {
        let r: (qc.Doc | qt.DocTag)[] | undefined;
        if (qf.is.variableLike(host) && qf.is.withIniter(host) && qf.is.withDocNodes(host.initer! as Node)) {
          r = qu.append(r, qu.last(host.initer.doc!));
        }
        let n: Node | undefined = host;
        while (n && n.parent) {
          if (qf.is.withDocNodes(n)) r = qu.append(r, qu.last(n.doc!));
          if (n.kind === Syntax.Param) {
            r = qu.addRange(r, (noCache ? this.paramTagsNoCache : this.paramTags)(n));
            break;
          }
          if (n.kind === Syntax.TypeParam) {
            r = qu.addRange(r, (noCache ? this.typeParamTagsNoCache : this.typeParamTags)(n));
            break;
          }
          n = this.nextCommentLocation(n);
        }
        return r || qu.empty;
      }
      nextCommentLocation(n: Node) {
        const p = n.parent;
        const pp = p?.parent;
        if (
          p?.kind === Syntax.PropertyAssignment ||
          p?.kind === Syntax.ExportAssignment ||
          p?.kind === Syntax.PropertyDeclaration ||
          (p?.kind === Syntax.ExpressionStatement && n.kind === Syntax.PropertyAccessExpression) ||
          this.nestedModuleDeclaration(p) ||
          (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.EqualsToken)
        ) {
          return p;
        } else if (pp && (this.singleVariableOfVariableStatement(pp) === n || (p?.kind === Syntax.BinaryExpression && p.operatorToken.kind === Syntax.EqualsToken))) {
          return pp;
        } else if (
          pp &&
          pp.parent &&
          (this.singleVariableOfVariableStatement(pp.parent) || this.singleIniterOfVariableStatementOrPropertyDeclaration(pp.parent) === n || this.sourceOfDefaultedAssignment(pp.parent))
        ) {
          return pp.parent;
        }
        return;
      }
      host(n: Node): qt.HasDoc | undefined {
        return qu.checkDefined(qb.findAncestor(n.parent, isDoc)).parent;
      }
      modifierFlagsNoCache(n: Node): ModifierFlags {
        let flags = ModifierFlags.None;
        if (qf.is.inJSFile(n) && !!n.parent && n.kind !== Syntax.Param) {
          if (this.publicTagNoCache(n)) flags |= ModifierFlags.Public;
          if (this.privateTagNoCache(n)) flags |= ModifierFlags.Private;
          if (this.protectedTagNoCache(n)) flags |= ModifierFlags.Protected;
          if (this.readonlyTagNoCache(n)) flags |= ModifierFlags.Readonly;
        }
        return flags;
      }
    })();
  })());
}
export interface Fget extends ReturnType<typeof newGet> {}
export interface Frame extends qt.Frame {
  calc: qg.Fcalc;
  create: Fcreate;
  decl: qg.Fdecl;
  each: Feach;
  emit: qg.Femit;
  get: Fget;
  has: Fhas;
  is: Fis;
  nest: qg.Fnest;
}
export function newFrame() {
  const f = {} as Frame;
  newCreate(f);
  newEach(f);
  newGet(f);
  newHas(f);
  newIs(f);
  qg.newCalc(f);
  qg.newDecl(f);
  qg.newEmit(f);
  qg.newNest(f);
  return f;
}
export const qf = newFrame();
export namespace access {
  export const enum Kind {
    Read,
    Write,
    ReadWrite,
  }
  export function get(n?: Node): Kind {
    const p = n?.parent as Node | undefined;
    if (!p) return Kind.Read;
    const writeOrReadWrite = (): Kind => {
      const skipParens = (n?: Node) => {
        while (n?.kind === Syntax.ParenthesizedExpression) {
          n = n.parent as Node | undefined;
        }
        return n;
      };
      const pp = p?.parent as Node | undefined;
      return pp && skipParens(pp)?.kind === Syntax.ExpressionStatement ? Kind.Write : Kind.ReadWrite;
    };
    switch (p?.kind) {
      case Syntax.ParenthesizedExpression:
        return get(p);
      case Syntax.PostfixUnaryExpression:
      case Syntax.PrefixUnaryExpression:
        const o = p.operator;
        return o === Syntax.Plus2Token || o === Syntax.Minus2Token ? writeOrReadWrite() : Kind.Read;
      case Syntax.BinaryExpression:
        const o2 = p.operatorToken;
        return p.left === n && qy.is.assignmentOperator(o2.kind) ? (o2.kind === Syntax.EqualsToken ? Kind.Write : writeOrReadWrite()) : Kind.Read;
      case Syntax.PropertyAccessExpression:
        return p.name !== n ? Kind.Read : get(p);
      case Syntax.PropertyAssignment: {
        const a = get(p.parent);
        return n === p.name ? reverse(a) : a;
      }
      case Syntax.ShorthandPropertyAssignment:
        return n === p.objectAssignmentIniter ? Kind.Read : get(p.parent);
      case Syntax.ArrayLiteralExpression:
        return get(p);
      default:
        return Kind.Read;
    }
  }
  export function reverse(k: Kind): Kind {
    switch (k) {
      case Kind.Read:
        return Kind.Write;
      case Kind.Write:
        return Kind.Read;
      case Kind.ReadWrite:
        return Kind.ReadWrite;
      default:
        return qu.fail();
    }
  }
}
function tryAddPropertyAssignment(ps: qu.Push<qt.PropertyAssignment>, p: string, e?: qt.Expression) {
  if (e) {
    ps.push(new qc.PropertyAssignment(p, e));
    return true;
  }
  return false;
}
function tryGetClassExtendingExpressionWithTypings(n: Node): qt.ClassLikeDeclaration | undefined {
  const c = tryGetClassImplementingOrExtendingExpressionWithTypings(n);
  return c && !c.isImplements ? c.class : undefined;
}
const templateSub = /\$\{/g;
function escapeTemplateSubstitution(s: string) {
  return s.replace(templateSub, '\\${');
}
function getModifierFlagsWorker(n: Node, doc: boolean): ModifierFlags {
  if (n.kind >= Syntax.FirstToken && n.kind <= Syntax.LastToken) return ModifierFlags.None;
  if (!(n.modifierFlagsCache & ModifierFlags.HasComputedFlags)) n.modifierFlagsCache = qf.get.syntacticModifierFlagsNoCache(n) | ModifierFlags.HasComputedFlags;
  if (doc && !(n.modifierFlagsCache & ModifierFlags.HasComputedDocModifiers) && qf.is.inJSFile(n) && n.parent) {
    n.modifierFlagsCache |= qf.get.doc.modifierFlagsNoCache(n) | ModifierFlags.HasComputedDocModifiers;
  }
  return n.modifierFlagsCache & ~(ModifierFlags.HasComputedFlags | ModifierFlags.HasComputedDocModifiers);
}
