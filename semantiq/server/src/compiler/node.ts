namespace qnr {
  export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;

  export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
    return isString(n) ? createIdentifier(n) : n;
  }

  export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
    return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
  }

  export function asToken<TKind extends Syntax>(t: TKind | Token<TKind>): Token<TKind> {
    return typeof t === 'number' ? createToken(t) : t;
  }

  export function asEmbeddedStatement<T extends Node>(statement: T): T | EmptyStatement;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined {
    return statement && isNotEmittedStatement(statement) ? setTextRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
  }

  function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
    return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
  }

  function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
    return createMethodCall(createIdentifier(globalObjectName), methodName, argumentsList);
  }

  export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
    return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
  }

  function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
    if (e) {
      ps.push(createPropertyAssignment(p, e));
      return true;
    }
    return false;
  }

  export function createPropertyDescriptor(attributes: PropertyDescriptorAttributes, singleLine?: boolean) {
    const ps: PropertyAssignment[] = [];
    tryAddPropertyAssignment(ps, 'enumerable', asExpression(attributes.enumerable));
    tryAddPropertyAssignment(ps, 'configurable', asExpression(attributes.configurable));
    let isData = tryAddPropertyAssignment(ps, 'writable', asExpression(attributes.writable));
    isData = tryAddPropertyAssignment(ps, 'value', attributes.value) || isData;
    let isAccessor = tryAddPropertyAssignment(ps, 'get', attributes.get);
    isAccessor = tryAddPropertyAssignment(ps, 'set', attributes.set) || isAccessor;
    assert(!(isData && isAccessor), 'A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.');
    return createObjectLiteral(ps, !singleLine);
  }

  export namespace NodeArray {
    export function create<T extends Node>(es?: T[], hasTrailingComma?: boolean): MutableNodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T> {
      if (!es || es === emptyArray) es = [];
      else if (isNodeArray(es)) return es;
      const a = es as NodeArray<T>;
      a.pos = -1;
      a.end = -1;
      a.hasTrailingComma = hasTrailingComma;
      return a;
    }
    export function from<T extends Node>(a: readonly T[]): NodeArray<T>;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined {
      return a ? create(a) : undefined;
    }
    export function visit<T>(cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T | undefined, ns?: NodeArray<Node>): T | undefined {
      if (ns) {
        if (cbs) return cbs(ns);
        for (const n of ns) {
          const r = cb(n);
          if (r) return r;
        }
      }
      return;
    }
  }

  export namespace qn {
    export function create<T extends Syntax>(k: T, pos: number, end: number, parent?: Node): NodeType<T> {
      const n =
        is.node(k) || k === Syntax.Unknown
          ? new NodeObj(k, pos, end)
          : k === Syntax.SourceFile
          ? new SourceFileObj(Syntax.SourceFile, pos, end)
          : k === Syntax.Identifier
          ? new IdentifierObj(Syntax.Identifier, pos, end)
          : k === Syntax.PrivateIdentifier
          ? new PrivateIdentifierObj(Syntax.PrivateIdentifier, pos, end)
          : new TokenObj<T>(k, pos, end);
      if (parent) {
        n.parent = parent;
        n.flags = parent.flags & NodeFlags.ContextFlags;
      }
      return n as NodeType<T>;
    }

    export function createSynthesized<T extends Syntax>(k: T): NodeType<T> {
      const n = create<T>(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    export function createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw?: string) {
      const n = createSynthesized(k);
      n.text = t;
      if (raw === undefined || t === raw) n.rawText = raw;
      else {
        const r = qs_process(k, raw);
        if (typeof r === 'object') return fail('Invalid raw text');
        assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
        n.rawText = raw;
      }
      return n;
    }

    export const is = new (class {
      node(k: Syntax) {
        return k >= Syntax.FirstNode;
      }
      kind<S extends Syntax, T extends { kind: S; also?: S[] }>(t: T, n: NodeType<S>): n is NodeType<T['kind']> {
        return n.kind === t.kind || !!t.also?.includes(n.kind);
      }
    })();

    export const forEach = new (class {
      child<T extends Node>(node: Node, cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T): T | undefined {
        if (node.kind <= Syntax.LastToken) return;
        const n = node as NodeTypes;
        switch (n.kind) {
          case Syntax.QualifiedName:
            return n.left.visit(cb) || n.right.visit(cb);
          case Syntax.TypeParameter:
            return n.name.visit(cb) || n.constraint?.visit(cb) || n.default?.visit(cb) || n.expression?.visit(cb);
          case Syntax.ShorthandPropertyAssignment:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken?.visit(cb) ||
              n.equalsToken?.visit(cb) ||
              n.objectAssignmentInitializer?.visit(cb)
            );
          case Syntax.SpreadAssignment:
            return n.expression.visit(cb);
          case Syntax.Parameter:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.dot3Token?.visit(cb) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertyDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertySignature:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
          case Syntax.PropertyAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.initializer.visit(cb);
          case Syntax.VariableDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.BindingElement:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.dot3Token?.visit(cb) || n.propertyName?.visit(cb) || n.name.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb)
            );
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.asteriskToken?.visit(cb) ||
              n.name?.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb) ||
              (n as ArrowFunction).equalsGreaterThanToken.visit(cb) ||
              n.body.visit(cb)
            );
          case Syntax.TypeReference:
            return n.typeName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.TypePredicate:
            return n.assertsModifier?.visit(cb) || n.parameterName.visit(cb) || n.type?.visit(cb);
          case Syntax.TypeQuery:
            return n.exprName.visit(cb);
          case Syntax.TypeLiteral:
            return NodeArray.visit(cb, cbs, n.members);
          case Syntax.ArrayType:
            return n.elementType.visit(cb);
          case Syntax.TupleType:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.UnionType:
          case Syntax.IntersectionType:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ConditionalType:
            return n.checkType.visit(cb) || n.extendsType.visit(cb) || n.trueType.visit(cb) || n.falseType.visit(cb);
          case Syntax.InferType:
            return n.typeParameter.visit(cb);
          case Syntax.ImportType:
            return n.argument.visit(cb) || n.qualifier?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.ParenthesizedType:
          case Syntax.TypeOperator:
            return n.type.visit(cb);
          case Syntax.IndexedAccessType:
            return n.objectType.visit(cb) || n.indexType.visit(cb);
          case Syntax.MappedType:
            return n.readonlyToken?.visit(cb) || n.typeParameter.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb);
          case Syntax.LiteralType:
            return n.literal.visit(cb);
          case Syntax.NamedTupleMember:
            return n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type.visit(cb);
          case Syntax.ObjectBindingPattern:
          case Syntax.ArrayBindingPattern:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ArrayLiteralExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ObjectLiteralExpression:
            return NodeArray.visit(cb, cbs, n.properties);
          case Syntax.PropertyAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.name.visit(cb);
          case Syntax.ElementAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.argumentExpression.visit(cb);
          case Syntax.CallExpression:
          case Syntax.NewExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || NodeArray.visit(cb, cbs, n.arguments);
          case Syntax.TaggedTemplateExpression:
            return n.tag.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.template.visit(cb);
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
          case Syntax.SpreadElement:
            return n.expression.visit(cb);
          case Syntax.Block:
          case Syntax.ModuleBlock:
            return NodeArray.visit(cb, cbs, n.statements);
          case Syntax.SourceFile:
            return NodeArray.visit(cb, cbs, n.statements) || n.endOfFileToken.visit(cb);
          case Syntax.VariableStatement:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.declarationList.visit(cb);
          case Syntax.VariableDeclarationList:
            return NodeArray.visit(cb, cbs, n.declarations);
          case Syntax.ExpressionStatement:
            return n.expression.visit(cb);
          case Syntax.IfStatement:
            return n.expression.visit(cb) || n.thenStatement.visit(cb) || n.elseStatement?.visit(cb);
          case Syntax.DoStatement:
            return n.statement.visit(cb) || n.expression.visit(cb);
          case Syntax.WhileStatement:
            return n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.ForStatement:
            return n.initializer?.visit(cb) || n.condition?.visit(cb) || n.incrementor?.visit(cb) || n.statement.visit(cb);
          case Syntax.ForInStatement:
            return n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.ForOfStatement:
            return n.awaitModifier?.visit(cb) || n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
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
            return NodeArray.visit(cb, cbs, n.clauses);
          case Syntax.CaseClause:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.statements);
          case Syntax.DefaultClause:
            return NodeArray.visit(cb, cbs, n.statements);
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
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name?.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.InterfaceDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, (n as ClassDeclaration).heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.TypeAliasDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters) || n.type.visit(cb);
          case Syntax.EnumDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.members);
          case Syntax.EnumMember:
            return n.name.visit(cb) || n.initializer?.visit(cb);
          case Syntax.ModuleDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.body?.visit(cb);
          case Syntax.ImportEqualsDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.moduleReference.visit(cb);
          case Syntax.ImportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.importClause?.visit(cb) || n.moduleSpecifier.visit(cb);
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
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ExportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.exportClause?.visit(cb) || n.moduleSpecifier?.visit(cb);
          case Syntax.ImportSpecifier:
          case Syntax.ExportSpecifier:
            return n.propertyName?.visit(cb) || n.name.visit(cb);
          case Syntax.ExportAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.expression.visit(cb);
          case Syntax.TemplateExpression:
            return n.head.visit(cb) || NodeArray.visit(cb, cbs, n.templateSpans);
          case Syntax.TemplateSpan:
            return n.expression.visit(cb) || n.literal.visit(cb);
          case Syntax.ComputedPropertyName:
            return n.expression.visit(cb);
          case Syntax.HeritageClause:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ExpressionWithTypeArguments:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.ExternalModuleReference:
            return n.expression.visit(cb);
          case Syntax.MissingDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators);
          case Syntax.CommaListExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.JsxElement:
            return n.openingElement.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingElement.visit(cb);
          case Syntax.JsxFragment:
            return n.openingFragment.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingFragment.visit(cb);
          case Syntax.JsxSelfClosingElement:
          case Syntax.JsxOpeningElement:
            return n.tagName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.attributes.visit(cb);
          case Syntax.JsxAttributes:
            return NodeArray.visit(cb, cbs, n.properties);
          case Syntax.JsxAttribute:
            return n.name.visit(cb) || n.initializer?.visit(cb);
          case Syntax.JsxSpreadAttribute:
            return n.expression.visit(cb);
          case Syntax.JsxExpression:
            return n.dot3Token?.visit(cb) || n.expression?.visit(cb);
          case Syntax.JsxClosingElement:
            return n.tagName.visit(cb);
          case Syntax.OptionalType:
          case Syntax.RestType:
          case Syntax.JSDocTypeExpression:
          case Syntax.JSDocNonNullableType:
          case Syntax.JSDocNullableType:
          case Syntax.JSDocOptionalType:
          case Syntax.JSDocVariadicType:
            return n.type.visit(cb);
          case Syntax.JSDocFunctionType:
            return NodeArray.visit(cb, cbs, n.parameters) || n.type?.visit(cb);
          case Syntax.JSDocComment:
            return NodeArray.visit(cb, cbs, n.tags);
          case Syntax.JSDocParameterTag:
          case Syntax.JSDocPropertyTag:
            return n.tagName.visit(cb) || (n.isNameFirst ? n.name.visit(cb) || n.typeExpression?.visit(cb) : n.typeExpression?.visit(cb) || n.name.visit(cb));
          case Syntax.JSDocAuthorTag:
            return n.tagName.visit(cb);
          case Syntax.JSDocImplementsTag:
            return n.tagName.visit(cb) || n.class.visit(cb);
          case Syntax.JSDocAugmentsTag:
            return n.tagName.visit(cb) || n.class.visit(cb);
          case Syntax.JSDocTemplateTag:
            return n.tagName.visit(cb) || n.constraint?.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters);
          case Syntax.JSDocTypedefTag:
            return (
              n.tagName.visit(cb) ||
              (n.typeExpression && n.typeExpression!.kind === Syntax.JSDocTypeExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
            );
          case Syntax.JSDocCallbackTag:
            const n2 = n as JSDocCallbackTag;
            return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
          case Syntax.JSDocReturnTag:
          case Syntax.JSDocTypeTag:
          case Syntax.JSDocThisTag:
          case Syntax.JSDocEnumTag:
            const n3 = n as JSDocReturnTag | JSDocTypeTag | JSDocThisTag | JSDocEnumTag;
            return n3.tagName.visit(cb) || n3.typeExpression?.visit(cb);
          case Syntax.JSDocSignature:
            return forEach(n.typeParameters, cb) || forEach(n.parameters, cb) || n.type?.visit(cb);
          case Syntax.JSDocTypeLiteral:
            return forEach(n.jsDocPropertyTags, cb);
          case Syntax.JSDocTag:
          case Syntax.JSDocClassTag:
          case Syntax.JSDocPublicTag:
          case Syntax.JSDocPrivateTag:
          case Syntax.JSDocProtectedTag:
          case Syntax.JSDocReadonlyTag:
            return n.tagName.visit(cb);
          case Syntax.PartiallyEmittedExpression:
            return n.expression.visit(cb);
        }
      }
      childRecursively<T>(root: Node, cb: (n: Node, parent: Node) => T | 'skip' | undefined, cbs?: (ns: NodeArray<Node>, parent: Node) => T | 'skip' | undefined): T | undefined {
        const ns: Node[] = [root];
        const children = (n: Node) => {
          const cs: (Node | NodeArray<Node>)[] = [];
          const add = (n: Node | NodeArray<Node>) => {
            cs.unshift(n);
          };
          this.child(n, add, add);
          return cs;
        };
        const visitAll = (parent: Node, cs: readonly (Node | NodeArray<Node>)[]) => {
          for (const c of cs) {
            if (isArray(c)) {
              if (cbs) {
                const r = cbs(c, parent);
                if (r) {
                  if (r === 'skip') continue;
                  return r;
                }
              }
              for (let i = c.length - 1; i >= 0; i--) {
                const real = c[i];
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
    })();

    class NodeObj extends TextRange implements Node {
      id = 0;
      flags = NodeFlags.None;
      modifierFlagsCache = ModifierFlags.None;
      transformFlags = TransformFlags.None;
      parent!: Node;
      symbol!: Symbol;
      jsDoc?: JSDoc[];
      original?: Node;
      private _children?: Node[];

      constructor(public kind: Syntax, pos: number, end: number) {
        super(pos, end);
      }
      getSourceFile(): SourceFile {
        return getSourceFileOfNode(this);
      }
      getStart(s?: SourceFileLike, includeJsDocComment?: boolean) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return getTokenPosOfNode(this, s, includeJsDocComment);
      }
      getFullStart() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.pos;
      }
      getEnd() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end;
      }
      getWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getEnd() - this.getStart(s);
      }
      getFullWidth() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end - this.pos;
      }
      getLeadingTriviaWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getStart(s) - this.pos;
      }
      getFullText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return (s || this.getSourceFile()).text.substring(this.pos, this.end);
      }
      getText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        if (!s) s = this.getSourceFile();
        return s.text.substring(this.getStart(s), this.getEnd());
      }
      getChildCount(s?: SourceFile) {
        return this.getChildren(s).length;
      }
      getChildAt(i: number, s?: SourceFile) {
        return this.getChildren(s)[i];
      }
      getChildren(s?: SourceFileLike) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const scanner = qs_getRaw();
        const addSynthetics = (ns: Push<Node>, pos: number, end: number) => {
          scanner.setTextPos(pos);
          while (pos < end) {
            const t = scanner.scan();
            const p = scanner.getTextPos();
            if (p <= end) {
              if (t === Syntax.Identifier) fail(`Did not expect ${Debug.formatSyntax(this.kind)} to have an Identifier in its trivia`);
              ns.push(create(t, pos, p, this));
            }
            pos = p;
            if (t === Syntax.EndOfFileToken) break;
          }
        };
        const createSyntaxList = (ns: NodeArray<Node>) => {
          const list = create(Syntax.SyntaxList, ns.pos, ns.end, this);
          list._children = [];
          let p = ns.pos;
          for (const n of ns) {
            addSynthetics(list._children, p, n.pos);
            list._children.push(n);
            p = n.end;
          }
          addSynthetics(list._children, p, ns.end);
          return list;
        };
        const createChildren = () => {
          const cs = [] as Node[];
          if (is.node(this.kind)) {
            if (isJSDocCommentContainingNode(this)) {
              forEach.child(this, (c) => {
                cs.push(c);
              });
              return cs;
            }
            scanner.setText((s || this.getSourceFile()).text);
            let p = this.pos;
            const processNode = (c: Node) => {
              addSynthetics(cs, p, c.pos);
              cs.push(c);
              p = c.end;
            };
            const processNodes = (ns: NodeArray<Node>) => {
              addSynthetics(cs, p, ns.pos);
              cs.push(createSyntaxList(ns));
              p = ns.end;
            };
            forEach((this as JSDocContainer).jsDoc, processNode);
            p = this.pos;
            forEach.child(this, processNode, processNodes);
            addSynthetics(cs, p, this.end);
            scanner.setText(undefined);
          }
          return cs;
        };
        return this._children || (this._children = createChildren());
      }
      getFirstToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        if (!cs.length) return;
        const c = find(cs, (c) => c.kind < Syntax.FirstJSDocNode || c.kind > Syntax.LastJSDocNode)!;
        return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
      }
      getLastToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        const c = lastOrUndefined(cs);
        if (!c) return;
        return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
      }
      visit<T>(cb: (n: Node) => T): T | undefined {
        return cb(this);
      }
    }

    class TokenOrIdentifierObj extends NodeObj {
      getChildren(): Node[] {
        return this.kind === Syntax.EndOfFileToken ? (this as EndOfFileToken).jsDoc || emptyArray : emptyArray;
      }
    }

    export class TokenObj<T extends Syntax> extends TokenOrIdentifierObj implements Token<T> {
      constructor(public kind: T, pos: number, end: number) {
        super(kind, pos, end);
      }
    }

    export class IdentifierObj extends TokenOrIdentifierObj implements Identifier {
      escapedText!: __String;
      autoGenerateFlags!: GeneratedIdentifierFlags;
      _primaryExpressionBrand: any;
      _memberExpressionBrand: any;
      _leftHandSideExpressionBrand: any;
      _updateExpressionBrand: any;
      _unaryExpressionBrand: any;
      _expressionBrand: any;
      _declarationBrand: any;
      typeArguments!: NodeArray<TypeNode>;
      flowNode = undefined;
      constructor(public kind: Syntax.Identifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    IdentifierObj.prototype.kind = Syntax.Identifier;

    export class PrivateIdentifierObj extends TokenOrIdentifierObj implements PrivateIdentifier {
      escapedText!: __String;
      constructor(public kind: Syntax.PrivateIdentifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    PrivateIdentifierObj.prototype.kind = Syntax.PrivateIdentifier;

    interface SymbolDisplayPart {}
    interface JSDocTagInfo {}

    export class SymbolObj implements Symbol {
      declarations!: Declaration[];
      valueDeclaration!: Declaration;
      docComment?: SymbolDisplayPart[];
      getComment?: SymbolDisplayPart[];
      setComment?: SymbolDisplayPart[];
      tags?: JSDocTagInfo[];

      constructor(public flags: SymbolFlags, public escName: __String) {}

      get name(): string {
        return symbolName(this);
      }
      getName(): string {
        return this.name;
      }
      getEscName(): __String {
        return this.escName;
      }
      getFlags(): SymbolFlags {
        return this.flags;
      }
      getDeclarations(): Declaration[] | undefined {
        return this.declarations;
      }
      getDocComment(checker: TypeChecker | undefined): SymbolDisplayPart[] {
        if (!this.docComment) {
          this.docComment = emptyArray;
          if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
            const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
            this.docComment = getDocComment([labelDecl], checker);
          } else {
            this.docComment = getDocComment(this.declarations, checker);
          }
        }
        return this.docComment;
      }
      getCtxComment(context: Node | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
        switch (context?.kind) {
          case Syntax.GetAccessor:
            if (!this.getComment) {
              this.getComment = emptyArray;
              this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
            }
            return this.getComment;
          case Syntax.SetAccessor:
            if (!this.setComment) {
              this.setComment = emptyArray;
              this.setComment = getDocComment(filter(this.declarations, isSetAccessor), checker);
            }
            return this.setComment;
          default:
            return this.getDocComment(checker);
        }
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.tags === undefined) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
        return this.tags;
      }
    }

    export class TypeObj implements Type {
      id!: number;
      symbol!: Symbol;
      objectFlags?: ObjectFlags;
      constructor(public checker: TypeChecker, public flags: TypeFlags) {}
      getFlags(): TypeFlags {
        return this.flags;
      }
      getSymbol(): Symbol | undefined {
        return this.symbol;
      }
      getProperties(): Symbol[] {
        return this.checker.getPropertiesOfType(this);
      }
      getProperty(propertyName: string): Symbol | undefined {
        return this.checker.getPropertyOfType(this, propertyName);
      }
      getApparentProperties(): Symbol[] {
        return this.checker.getAugmentedPropertiesOfType(this);
      }
      getCallSignatures(): readonly Signature[] {
        return this.checker.getSignaturesOfType(this, SignatureKind.Call);
      }
      getConstructSignatures(): readonly Signature[] {
        return this.checker.getSignaturesOfType(this, SignatureKind.Construct);
      }
      getStringIndexType(): Type | undefined {
        return this.checker.getIndexTypeOfType(this, IndexKind.String);
      }
      getNumberIndexType(): Type | undefined {
        return this.checker.getIndexTypeOfType(this, IndexKind.Number);
      }
      getBaseTypes(): BaseType[] | undefined {
        return this.isClassOrInterface() ? this.checker.getBaseTypes(this) : undefined;
      }
      isNullableType(): boolean {
        return this.checker.isNullableType(this);
      }
      getNonNullableType(): Type {
        return this.checker.getNonNullableType(this);
      }
      getNonOptionalType(): Type {
        return this.checker.getNonOptionalType(this);
      }
      getConstraint(): Type | undefined {
        return this.checker.getBaseConstraintOfType(this);
      }
      getDefault(): Type | undefined {
        return this.checker.getDefaultFromTypeParameter(this);
      }
      isUnion(): this is UnionType {
        return !!(this.flags & TypeFlags.Union);
      }
      isIntersection(): this is IntersectionType {
        return !!(this.flags & TypeFlags.Intersection);
      }
      isUnionOrIntersection(): this is UnionOrIntersectionType {
        return !!(this.flags & TypeFlags.UnionOrIntersection);
      }
      isLiteral(): this is LiteralType {
        return !!(this.flags & TypeFlags.StringOrNumberLiteral);
      }
      isStringLiteral(): this is StringLiteralType {
        return !!(this.flags & TypeFlags.StringLiteral);
      }
      isNumberLiteral(): this is NumberLiteralType {
        return !!(this.flags & TypeFlags.NumberLiteral);
      }
      isTypeParameter(): this is TypeParameter {
        return !!(this.flags & TypeFlags.TypeParameter);
      }
      isClassOrInterface(): this is InterfaceType {
        return !!(getObjectFlags(this) & ObjectFlags.ClassOrInterface);
      }
      isClass(): this is InterfaceType {
        return !!(getObjectFlags(this) & ObjectFlags.Class);
      }
      get typeArguments() {
        if (getObjectFlags(this) & ObjectFlags.Reference) return this.checker.getTypeArguments((this as Type) as TypeReference);
        return;
      }
    }

    export class SignatureObj implements Signature {
      declaration!: SignatureDeclaration;
      typeParameters?: TypeParameter[];
      parameters!: Symbol[];
      thisParameter!: Symbol;
      resolvedReturnType!: Type;
      resolvedTypePredicate: TypePredicate | undefined;
      minTypeArgumentCount!: number;
      minArgumentCount!: number;
      docComment?: SymbolDisplayPart[];
      jsDocTags?: JSDocTagInfo[];

      constructor(public checker: TypeChecker, public flags: SignatureFlags) {}
      getDeclaration(): SignatureDeclaration {
        return this.declaration;
      }
      getTypeParameters(): TypeParameter[] | undefined {
        return this.typeParameters;
      }
      getParameters(): Symbol[] {
        return this.parameters;
      }
      getReturnType(): Type {
        return this.checker.getReturnTypeOfSignature(this);
      }
      getDocComment(): SymbolDisplayPart[] {
        return this.docComment || (this.docComment = getDocComment(singleElementArray(this.declaration), this.checker));
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.jsDocTags === undefined) {
          this.jsDocTags = this.declaration ? JsDoc.getJsDocTagsFromDeclarations([this.declaration]) : [];
        }
        return this.jsDocTags;
      }
    }

    export class SourceFileObj extends NodeObj implements SourceFile {
      kind: Syntax.SourceFile = Syntax.SourceFile;
      _declarationBrand: any;
      fileName!: string;
      path!: Path;
      resolvedPath!: Path;
      originalFileName!: string;
      text!: string;
      scriptSnapshot!: IScriptSnapshot;
      lineMap!: readonly number[];

      statements!: NodeArray<Statement>;
      endOfFileToken!: Token<Syntax.EndOfFileToken>;

      amdDependencies!: { name: string; path: string }[];
      moduleName!: string;
      referencedFiles!: FileReference[];
      typeReferenceDirectives!: FileReference[];
      libReferenceDirectives!: FileReference[];

      syntacticDiagnostics!: DiagnosticWithLocation[];
      parseDiagnostics!: DiagnosticWithLocation[];
      bindDiagnostics!: DiagnosticWithLocation[];
      bindSuggestionDiagnostics?: DiagnosticWithLocation[];

      isDeclarationFile!: boolean;
      isDefaultLib!: boolean;
      hasNoDefaultLib!: boolean;
      externalModuleIndicator!: Node; // The first node that causes this file to be an external module
      commonJsModuleIndicator!: Node; // The first node that causes this file to be a CommonJS module
      nodeCount!: number;
      identifierCount!: number;
      symbolCount!: number;
      version!: string;
      scriptKind!: ScriptKind;
      languageVersion!: ScriptTarget;
      languageVariant!: LanguageVariant;
      identifiers!: QMap<string>;
      nameTable: UnderscoreEscapedMap<number> | undefined;
      resolvedModules: QMap<ResolvedModuleFull> | undefined;
      resolvedTypeReferenceDirectiveNames!: QMap<ResolvedTypeReferenceDirective>;
      imports!: readonly StringLiteralLike[];
      moduleAugmentations!: StringLiteral[];
      private namedDeclarations: QMap<Declaration[]> | undefined;
      ambientModuleNames!: string[];
      checkJsDirective: CheckJsDirective | undefined;
      errorExpectations: TextRange[] | undefined;
      possiblyContainDynamicImport?: boolean;
      pragmas!: PragmaMap;
      localJsxFactory: EntityName | undefined;
      localJsxNamespace: __String | undefined;

      constructor(kind: Syntax, pos: number, end: number) {
        super(kind, pos, end);
      }
      update(newText: string, textChangeRange: TextChangeRange): SourceFile {
        return qp_updateSource(this, newText, textChangeRange);
      }
      getLineAndCharacterOfPosition(position: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, position);
      }
      getLineStarts(): readonly number[] {
        return getLineStarts(this);
      }
      getPositionOfLineAndCharacter(line: number, character: number, allowEdits?: true): number {
        return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);
      }
      getLineEndOfPosition(pos: number): number {
        const { line } = this.getLineAndCharacterOfPosition(pos);
        const lineStarts = this.getLineStarts();

        let lastCharPos: number | undefined;
        if (line + 1 >= lineStarts.length) {
          lastCharPos = this.getEnd();
        }
        if (!lastCharPos) {
          lastCharPos = lineStarts[line + 1] - 1;
        }

        const fullText = this.getFullText();
        // if the new line is "\r\n", we should return the last non-new-line-character position
        return fullText[lastCharPos] === '\n' && fullText[lastCharPos - 1] === '\r' ? lastCharPos - 1 : lastCharPos;
      }

      getNamedDeclarations(): QMap<Declaration[]> {
        if (!this.namedDeclarations) {
          this.namedDeclarations = this.computeNamedDeclarations();
        }
        return this.namedDeclarations;
      }

      private computeNamedDeclarations(): QMap<Declaration[]> {
        const result = createMultiMap<Declaration>();
        this.qn.forEach.child(visit);
        return result;

        function addDeclaration(declaration: Declaration) {
          const name = getDeclarationName(declaration);
          if (name) {
            result.add(name, declaration);
          }
        }

        function getDeclarations(name: string) {
          let declarations = result.get(name);
          if (!declarations) {
            result.set(name, (declarations = []));
          }
          return declarations;
        }

        function getDeclarationName(declaration: Declaration) {
          const name = getNonAssignedNameOfDeclaration(declaration);
          return name && (isComputedPropertyName(name) && isPropertyAccessExpression(name.expression) ? name.expression.name.text : isPropertyName(name) ? getNameFromPropertyName(name) : undefined);
        }

        function visit(node: Node): void {
          switch (node.kind) {
            case Syntax.FunctionDeclaration:
            case Syntax.FunctionExpression:
            case Syntax.MethodDeclaration:
            case Syntax.MethodSignature:
              const functionDeclaration = <FunctionLikeDeclaration>node;
              const declarationName = getDeclarationName(functionDeclaration);
              if (declarationName) {
                const declarations = getDeclarations(declarationName);
                const lastDeclaration = lastOrUndefined(declarations);
                if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
                  if (functionDeclaration.body && !(<FunctionLikeDeclaration>lastDeclaration).body) {
                    declarations[declarations.length - 1] = functionDeclaration;
                  }
                } else {
                  declarations.push(functionDeclaration);
                }
              }
              qn.forEach.child(node, visit);
              break;
            case Syntax.ClassDeclaration:
            case Syntax.ClassExpression:
            case Syntax.InterfaceDeclaration:
            case Syntax.TypeAliasDeclaration:
            case Syntax.EnumDeclaration:
            case Syntax.ModuleDeclaration:
            case Syntax.ImportEqualsDeclaration:
            case Syntax.ExportSpecifier:
            case Syntax.ImportSpecifier:
            case Syntax.ImportClause:
            case Syntax.NamespaceImport:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
            case Syntax.TypeLiteral:
              addDeclaration(<Declaration>node);
              qn.forEach.child(node, visit);
              break;
            case Syntax.Parameter:
              // Only consider parameter properties
              if (!hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) {
                break;
              }
            // falls through
            case Syntax.VariableDeclaration:
            case Syntax.BindingElement: {
              const decl = <VariableDeclaration>node;
              if (qn.is.kind(BindingPattern, decl.name)) {
                qn.forEach.child(decl.name, visit);
                break;
              }
              if (decl.initializer) visit(decl.initializer);
            }
            // falls through
            case Syntax.EnumMember:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
              addDeclaration(<Declaration>node);
              break;
            case Syntax.ExportDeclaration:
              const exportDeclaration = <ExportDeclaration>node;
              if (exportDeclaration.exportClause) {
                if (isNamedExports(exportDeclaration.exportClause)) {
                  forEach(exportDeclaration.exportClause.elements, visit);
                } else {
                  visit(exportDeclaration.exportClause.name);
                }
              }
              break;
            case Syntax.ImportDeclaration:
              const importClause = (<ImportDeclaration>node).importClause;
              if (importClause) {
                if (importClause.name) {
                  addDeclaration(importClause.name);
                }
                if (importClause.namedBindings) {
                  if (importClause.namedBindings.kind === Syntax.NamespaceImport) {
                    addDeclaration(importClause.namedBindings);
                  } else {
                    forEach(importClause.namedBindings.elements, visit);
                  }
                }
              }
              break;
            case Syntax.BinaryExpression:
              if (getAssignmentDeclarationKind(node as BinaryExpression) !== AssignmentDeclarationKind.None) {
                addDeclaration(node as BinaryExpression);
              }
            // falls through
            default:
              qn.forEach.child(node, visit);
          }
        }
      }
    }

    export class SourceMapSourceObj implements SourceMapSource {
      lineMap!: number[];
      constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
      getLineAndCharacterOfPosition(pos: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, pos);
      }
    }

    function hasJSDocInheritDocTag(node: Node) {
      return getJSDocTags(node).some((tag) => tag.tagName.text === 'inheritDoc');
    }

    function getDocComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
      if (!declarations) return emptyArray;
      let doc = JsDoc.getJsDocCommentsFromDeclarations(declarations);
      if (doc.length === 0 || declarations.some(hasJSDocInheritDocTag)) {
        forEachUnique(declarations, (declaration) => {
          const inheritedDocs = findInheritedJSDocComments(declaration, declaration.symbol.name, checker!); // TODO: GH#18217
          if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
        });
      }
      return doc;
    }

    function findInheritedJSDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
      return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : emptyArray, (superTypeNode) => {
        const superType = typeChecker.getTypeAtLocation(superTypeNode);
        const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
        const inheritedDocs = baseProperty && baseProperty.getDocComment(typeChecker);
        return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
      });
    }
  }

  export namespace ArrayBindingElement {
    export const also = [Syntax.BindingElement, Syntax.OmittedExpression] as const;
  }
  export namespace ArrayLiteralExpression {
    export const kind = Syntax.ArrayLiteralExpression;
  }

  export interface ArrayBindingPattern extends Node {
    kind: Syntax.ArrayBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<ArrayBindingElement>;
  }
  export namespace ArrayBindingPattern {
    export const kind = Syntax.ArrayBindingPattern;
    export function create(es: readonly ArrayBindingElement[]) {
      const n = qn.createSynthesized(Syntax.ArrayBindingPattern);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: ArrayBindingPattern, es: readonly ArrayBindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface ArrayTypeNode extends TypeNode {
    kind: Syntax.ArrayType;
    elementType: TypeNode;
  }
  export namespace ArrayTypeNode {
    export const kind = Syntax.ArrayType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.ArrayType);
      n.elementType = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: ArrayTypeNode, t: TypeNode) {
      return n.elementType !== t ? updateNode(create(t), n) : n;
    }
  }

  export namespace AsExpression {
    export const kind = Syntax.AsExpression;
  }
  export namespace AssignmentPattern {
    export const kind = Syntax.ArrayLiteralExpression;
    export const also = [Syntax.ObjectLiteralExpression] as const;
  }
  export namespace AwaitExpression {
    export const kind = Syntax.AwaitExpression;
  }

  export interface BigIntLiteral extends LiteralExpression {
    kind: Syntax.BigIntLiteral;
  }
  export namespace BigIntLiteral {
    export const kind = Syntax.BigIntLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.BigIntLiteral);
      n.text = t;
      return n;
    }
    export function expression(e: Expression) {
      return (
        e.kind === Syntax.BigIntLiteral ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
      );
    }
  }

  export namespace BinaryExpression {
    export const kind = Syntax.BinaryExpression;
  }
  export namespace BindingPattern {
    export const kind = Syntax.ArrayBindingPattern;
    export const also = [Syntax.ObjectBindingPattern] as const;
  }

  export interface BindingElement extends NamedDeclaration {
    kind: Syntax.BindingElement;
    parent: BindingPattern;
    propertyName?: PropertyName;
    dot3Token?: Dot3Token;
    name: BindingName;
    initializer?: Expression;
  }
  export namespace BindingElement {
    export const kind = Syntax.BindingElement;
    export function create(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
      const n = qn.createSynthesized(Syntax.BindingElement);
      n.dot3Token = d;
      n.propertyName = asName(p);
      n.name = asName(b);
      n.initializer = i;
      return n;
    }
    export function update(n: BindingElement, d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
      return n.propertyName !== p || n.dot3Token !== d || n.name !== b || n.initializer !== i ? updateNode(create(d, p, b, i), n) : n;
    }
  }

  export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.CallSignature;
  }
  export namespace CallSignatureDeclaration {
    export const kind = Syntax.CallSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
    }
    export function update(n: CallSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface ComputedPropertyName extends Node {
    kind: Syntax.ComputedPropertyName;
    parent: Declaration;
    expression: Expression;
  }
  export namespace ComputedPropertyName {
    export const kind = Syntax.ComputedPropertyName;
    export function create(e: Expression) {
      const n = qn.createSynthesized(Syntax.ComputedPropertyName);
      n.expression = isCommaSequence(e) ? createParen(e) : e;
      return n;
    }
    export function update(n: ComputedPropertyName, e: Expression) {
      return n.expression !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface ConditionalTypeNode extends TypeNode {
    kind: Syntax.ConditionalType;
    checkType: TypeNode;
    extendsType: TypeNode;
    trueType: TypeNode;
    falseType: TypeNode;
  }
  export namespace ConditionalTypeNode {
    export const kind = Syntax.ConditionalType;
    export function create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      const n = qn.createSynthesized(Syntax.ConditionalType);
      n.checkType = parenthesizeConditionalTypeMember(c);
      n.extendsType = parenthesizeConditionalTypeMember(e);
      n.trueType = t;
      n.falseType = f;
      return n;
    }
    export function update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
    }
  }

  export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
    kind: Syntax.Constructor;
    parent: ClassLikeDeclaration;
    body?: FunctionBody;
  }
  export namespace ConstructorDeclaration {
    export const kind = Syntax.Constructor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = qn.createSynthesized(Syntax.Constructor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.type = undefined;
      n.body = b;
      return n;
    }
    export function update(n: ConstructorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, ps, b), n) : n;
    }
  }

  export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.ConstructorType;
  }
  export namespace ConstructorTypeNode {
    export const kind = Syntax.ConstructorType;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
    }
    export function update(n: ConstructorTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.ConstructSignature;
  }
  export namespace ConstructSignatureDeclaration {
    export const kind = Syntax.ConstructSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
    }
    export function update(n: ConstructSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.FunctionType;
  }
  export namespace FunctionTypeNode {
    export const kind = Syntax.FunctionType;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
    }
    export function update(n: FunctionTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.GetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace GetAccessorDeclaration {
    export const kind = Syntax.GetAccessor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
      const n = qn.createSynthesized(Syntax.GetAccessor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: GetAccessorDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: PropertyName,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.type !== t || n.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
    }
    export function orSetKind(n: Node): n is AccessorDeclaration {
      return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
    }
  }

  export interface ImportTypeNode extends NodeWithTypeArguments {
    kind: Syntax.ImportType;
    isTypeOf?: boolean;
    argument: TypeNode;
    qualifier?: EntityName;
  }
  export namespace ImportTypeNode {
    export const kind = Syntax.ImportType;
    export function create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      const n = qn.createSynthesized(Syntax.ImportType);
      n.argument = a;
      n.qualifier = q;
      n.typeArguments = parenthesizeTypeParameters(ts);
      n.isTypeOf = tof;
      return n;
    }
    export function update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
    }
  }

  export interface IndexedAccessTypeNode extends TypeNode {
    kind: Syntax.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export namespace IndexedAccessTypeNode {
    export const kind = Syntax.IndexedAccessType;
    export function create(o: TypeNode, i: TypeNode) {
      const n = qn.createSynthesized(Syntax.IndexedAccessType);
      n.objectType = parenthesizeElementTypeMember(o);
      n.indexType = i;
      return n;
    }
    export function update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
      return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
    }
  }

  export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
    kind: Syntax.IndexSignature;
    parent: ObjectTypeDeclaration;
  }
  export namespace IndexSignatureDeclaration {
    export const kind = Syntax.IndexSignature;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
      const n = qn.createSynthesized(Syntax.IndexSignature);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.parameters = NodeArray.create(ps);
      n.type = t;
      return n;
    }
    export function update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
      return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
    }
  }

  export interface InferTypeNode extends TypeNode {
    kind: Syntax.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export namespace InferTypeNode {
    export const kind = Syntax.InferType;
    export function create(p: TypeParameterDeclaration) {
      const n = qn.createSynthesized(Syntax.InferType);
      n.typeParameter = p;
      return n;
    }
    export function update(n: InferTypeNode, p: TypeParameterDeclaration) {
      return n.typeParameter !== p ? updateNode(create(p), n) : n;
    }
  }

  export interface IntersectionTypeNode extends TypeNode {
    kind: Syntax.IntersectionType;
    types: NodeArray<TypeNode>;
  }
  export namespace IntersectionTypeNode {
    export const kind = Syntax.IntersectionType;
    export function create(ts: readonly TypeNode[]) {
      return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
    }
    export function update(n: IntersectionTypeNode, ts: NodeArray<TypeNode>) {
      return UnionTypeNode.orIntersectionUpdate(n, ts);
    }
  }

  export interface JsxText extends LiteralLikeNode {
    kind: Syntax.JsxText;
    onlyTriviaWhitespaces: boolean;
    parent: JsxElement;
  }
  export namespace JsxText {
    export const kind = Syntax.JsxText;
    export function create(t: string, onlyTriviaWhitespaces?: boolean) {
      const n = qn.createSynthesized(Syntax.JsxText);
      n.text = t;
      n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
      return n;
    }
  }

  export interface KeywordTypeNode extends TypeNode {
    kind:
      | Syntax.AnyKeyword
      | Syntax.UnknownKeyword
      | Syntax.NumberKeyword
      | Syntax.BigIntKeyword
      | Syntax.ObjectKeyword
      | Syntax.BooleanKeyword
      | Syntax.StringKeyword
      | Syntax.SymbolKeyword
      | Syntax.ThisKeyword
      | Syntax.VoidKeyword
      | Syntax.UndefinedKeyword
      | Syntax.NullKeyword
      | Syntax.NeverKeyword;
  }
  export namespace KeywordTypeNode {
    export function create(k: KeywordTypeNode['kind']) {
      return qn.createSynthesized(k) as KeywordTypeNode;
    }
  }

  export interface LiteralTypeNode extends TypeNode {
    kind: Syntax.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export namespace LiteralTypeNode {
    export const kind = Syntax.LiteralType;
    export function create(l: LiteralTypeNode['literal']) {
      const n = qn.createSynthesized(Syntax.LiteralType);
      n.literal = l;
      return n;
    }
    export function update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
      return n.literal !== l ? updateNode(create(l), n) : n;
    }
  }

  export interface MappedTypeNode extends TypeNode, Declaration {
    kind: Syntax.MappedType;
    readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
    typeParameter: TypeParameterDeclaration;
    questionToken?: QuestionToken | PlusToken | MinusToken;
    type?: TypeNode;
  }
  export namespace MappedTypeNode {
    export const kind = Syntax.MappedType;
    export function create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.MappedType);
      n.readonlyToken = r;
      n.typeParameter = p;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
    }
  }

  export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.MethodDeclaration;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace MethodDeclaration {
    export const kind = Syntax.MethodDeclaration;
    export function create(
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: string | PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      const n = qn.createSynthesized(Syntax.MethodDeclaration);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.asteriskToken = a;
      n.name = asName(p);
      n.questionToken = q;
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.create(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: MethodDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.asteriskToken !== a ||
        n.name !== p ||
        n.questionToken !== q ||
        n.typeParameters !== ts ||
        n.parameters !== ps ||
        n.type !== t ||
        n.body !== b
        ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
        : n;
    }
  }

  export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.MethodSignature;
    parent: ObjectTypeDeclaration;
    name: PropertyName;
  }
  export namespace MethodSignature {
    export const kind = Syntax.MethodSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
      const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
      n.name = asName(p);
      n.questionToken = q;
      return n;
    }
    export function update(n: MethodSignature, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
    }
  }

  export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
    kind: Syntax.NamedTupleMember;
    dot3Token?: Token<Syntax.Dot3Token>;
    name: Identifier;
    questionToken?: Token<Syntax.QuestionToken>;
    type: TypeNode;
  }
  export namespace NamedTupleMember {
    export const kind = Syntax.NamedTupleMember;
    export function create(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      const n = qn.createSynthesized(Syntax.NamedTupleMember);
      n.dot3Token = d;
      n.name = i;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: NamedTupleMember, d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
    }
  }

  export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
    kind: Syntax.NoSubstitutionLiteral;
    templateFlags?: TokenFlags;
  }
  export namespace NoSubstitutionLiteral {
    export const kind = Syntax.NoSubstitutionLiteral;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
    }
  }

  export interface NumericLiteral extends LiteralExpression, Declaration {
    kind: Syntax.NumericLiteral;
    numericLiteralFlags: TokenFlags;
  }
  export namespace NumericLiteral {
    export const kind = Syntax.NumericLiteral;
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = qn.createSynthesized(Syntax.NumericLiteral);
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function name(name: string | __String) {
      return (+name).toString() === name;
    }
  }

  export interface ObjectBindingPattern extends Node {
    kind: Syntax.ObjectBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<BindingElement>;
  }
  export namespace ObjectBindingPattern {
    export const kind = Syntax.ObjectBindingPattern;
    export function create(es: readonly BindingElement[]) {
      const n = qn.createSynthesized(Syntax.ObjectBindingPattern);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface OptionalTypeNode extends TypeNode {
    kind: Syntax.OptionalType;
    type: TypeNode;
  }
  export namespace OptionalTypeNode {
    export const kind = Syntax.OptionalType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.OptionalType);
      n.type = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface ParenthesizedTypeNode extends TypeNode {
    kind: Syntax.ParenthesizedType;
    type: TypeNode;
  }
  export namespace ParenthesizedTypeNode {
    export const kind = Syntax.ParenthesizedType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.ParenthesizedType);
      n.type = t;
      return n;
    }
    export function update(n: ParenthesizedTypeNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface PropertyDeclaration extends ClassElement, JSDocContainer {
    kind: Syntax.PropertyDeclaration;
    parent: ClassLikeDeclaration;
    name: PropertyName;
    questionToken?: QuestionToken;
    exclamationToken?: ExclamationToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertyDeclaration {
    export const kind = Syntax.PropertyDeclaration;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
      const n = qn.createSynthesized(Syntax.PropertyDeclaration);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
      n.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(
      n: PropertyDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: string | PropertyName,
      q?: QuestionToken | ExclamationToken,
      t?: TypeNode,
      i?: Expression
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.name !== p ||
        n.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
        n.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
        n.type !== t ||
        n.initializer !== i
        ? updateNode(create(ds, ms, p, q, t, i), n)
        : n;
    }
  }

  export interface PropertySignature extends TypeElement, JSDocContainer {
    kind: Syntax.PropertySignature;
    name: PropertyName;
    questionToken?: QuestionToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertySignature {
    export const kind = Syntax.PropertySignature;
    export function create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      const n = qn.createSynthesized(Syntax.PropertySignature);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.questionToken = q;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
    }
  }

  export interface QualifiedName extends Node {
    kind: Syntax.QualifiedName;
    left: EntityName;
    right: Identifier;
    jsdocDotPos?: number;
  }
  export namespace QualifiedName {
    export const kind = Syntax.QualifiedName;
    export function create(left: EntityName, right: string | Identifier) {
      const n = qn.createSynthesized(Syntax.QualifiedName);
      n.left = left;
      n.right = asName(right);
      return n;
    }
    export function update(n: QualifiedName, left: EntityName, right: Identifier) {
      return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
    }
  }

  export interface RegexLiteral extends LiteralExpression {
    kind: Syntax.RegexLiteral;
  }
  export namespace RegexLiteral {
    export const kind = Syntax.RegexLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.RegexLiteral);
      n.text = t;
      return n;
    }
  }

  export interface RestTypeNode extends TypeNode {
    kind: Syntax.RestType;
    type: TypeNode;
  }
  export namespace RestTypeNode {
    export const kind = Syntax.RestType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.RestType);
      n.type = t;
      return n;
    }
    export function update(n: RestTypeNode, t: TypeNode): RestTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.SetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace SetAccessorDeclaration {
    export const kind = Syntax.SetAccessor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = qn.createSynthesized(Syntax.SetAccessor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.body = b;
      return n;
    }
    export function update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
    }
  }

  export interface StringLiteral extends LiteralExpression, Declaration {
    kind: Syntax.StringLiteral;
    textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
    singleQuote?: boolean;
  }
  export namespace StringLiteral {
    export const kind = Syntax.StringLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.StringLiteral);
      n.text = t;
      return n;
    }
    export function like(n: Node): n is StringLiteralLike {
      return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
    }
    export function orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
      return like(n) || qn.is.kind(NumericLiteral, n);
    }
    export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
    }
    export function orNumberLiteralExpression(e: Expression) {
      return (
        orNumericLiteralLike(e) ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
      );
    }
  }

  export interface TemplateHead extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateHead;
    parent: TemplateExpression;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateHead {
    export const kind = Syntax.TemplateHead;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
    }
  }

  export interface TemplateMiddle extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateMiddle;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateMiddle {
    export const kind = Syntax.TemplateMiddle;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
    }
    export function orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
      const k = n.kind;
      return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
    }
  }

  export interface TemplateTail extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateTail;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateTail {
    export const kind = Syntax.TemplateTail;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
    }
  }

  export interface ThisTypeNode extends TypeNode {
    kind: Syntax.ThisType;
  }
  export namespace ThisTypeNode {
    export const kind = Syntax.ThisType;
    export function create() {
      return qn.createSynthesized(Syntax.ThisType);
    }
  }

  export interface TupleTypeNode extends TypeNode {
    kind: Syntax.TupleType;
    elements: NodeArray<TypeNode | NamedTupleMember>;
  }
  export namespace TupleTypeNode {
    export const kind = Syntax.TupleType;
    export function create(es: readonly (TypeNode | NamedTupleMember)[]) {
      const n = qn.createSynthesized(Syntax.TupleType);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: Syntax.TypeLiteral;
    members: NodeArray<TypeElement>;
  }
  export namespace TypeLiteralNode {
    export const kind = Syntax.TypeLiteral;
    export function create(ms: readonly TypeElement[] | undefined) {
      const n = qn.createSynthesized(Syntax.TypeLiteral);
      n.members = NodeArray.create(ms);
      return n;
    }
    export function update(n: TypeLiteralNode, ms: NodeArray<TypeElement>) {
      return n.members !== ms ? updateNode(create(ms), n) : n;
    }
  }

  export interface TypeNode extends Node {
    _typeNodeBrand: any;
  }

  export interface TypeOperatorNode extends TypeNode {
    kind: Syntax.TypeOperator;
    operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
    type: TypeNode;
  }
  export namespace TypeOperatorNode {
    export const kind = Syntax.TypeOperator;
    export function create(t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.TypeOperator);
      n.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
      n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
      return n;
    }
    export function update(n: TypeOperatorNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(n.operator, t), n) : n;
    }
  }

  export interface TypePredicateNode extends TypeNode {
    kind: Syntax.TypePredicate;
    parent: SignatureDeclaration | JSDocTypeExpression;
    assertsModifier?: AssertsToken;
    parameterName: Identifier | ThisTypeNode;
    type?: TypeNode;
  }
  export namespace TypePredicateNode {
    export const kind = Syntax.TypePredicate;
    export function create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
      return createWithModifier(undefined, p, t);
    }
    export function createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.TypePredicate);
      n.assertsModifier = a;
      n.parameterName = asName(p);
      n.type = t;
      return n;
    }
    export function update(n: TypePredicateNode, p: Identifier | ThisTypeNode, t: TypeNode) {
      return updateWithModifier(n, n.assertsModifier, p, t);
    }
    export function updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
      return n.assertsModifier !== a || n.parameterName !== p || n.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
    }
  }

  export interface TypeQueryNode extends TypeNode {
    kind: Syntax.TypeQuery;
    exprName: EntityName;
  }
  export namespace TypeQueryNode {
    export const kind = Syntax.TypeQuery;
    export function create(e: EntityName) {
      const n = qn.createSynthesized(Syntax.TypeQuery);
      n.exprName = e;
      return n;
    }
    export function update(n: TypeQueryNode, e: EntityName) {
      return n.exprName !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface TypeReferenceNode extends NodeWithTypeArguments {
    kind: Syntax.TypeReference;
    typeName: EntityName;
  }
  export namespace TypeReferenceNode {
    export const kind = Syntax.TypeReference;
    export function create(t: string | EntityName, ts?: readonly TypeNode[]) {
      const n = qn.createSynthesized(Syntax.TypeReference);
      n.typeName = asName(t);
      n.typeArguments = ts && parenthesizeTypeParameters(ts);
      return n;
    }
    export function update(n: TypeReferenceNode, t: EntityName, ts?: NodeArray<TypeNode>) {
      return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
    }
  }

  export interface UnionTypeNode extends TypeNode {
    kind: Syntax.UnionType;
    types: NodeArray<TypeNode>;
  }
  export namespace UnionTypeNode {
    export const kind = Syntax.UnionType;
    export function create(ts: readonly TypeNode[]) {
      return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
    }
    export function orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
      const n = qn.createSynthesized(k);
      n.types = parenthesizeElementTypeMembers(ts);
      return n;
    }
    export function update(n: UnionTypeNode, ts: NodeArray<TypeNode>) {
      return orIntersectionUpdate(n, ts);
    }
    export function orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: NodeArray<TypeNode>): T {
      return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
    }
  }

  export namespace SignatureDeclaration {
    export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
      const n = qn.createSynthesized(k);
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.from(ps);
      n.type = t;
      n.typeArguments = NodeArray.from(ta);
      return n;
    }
    export function update<T extends SignatureDeclaration>(n: T, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode): T {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
    }
  }

  type NodeTypes =
    | ArrayLiteralExpression
    | ArrayTypeNode
    | AsExpression
    | AwaitExpression
    | BinaryExpression
    | BindingElement
    | BindingPattern
    | Block
    | BreakOrContinueStatement
    | CallExpression
    | CaseBlock
    | CaseClause
    | CatchClause
    | ClassLikeDeclaration
    | CommaListExpression
    | ComputedPropertyName
    | ConditionalExpression
    | ConditionalTypeNode
    | Decorator
    | DefaultClause
    | DeleteExpression
    | DeleteExpression
    | DoStatement
    | ElementAccessExpression
    | EnumDeclaration
    | EnumMember
    | ExportAssignment
    | ExportDeclaration
    | ExpressionStatement
    | ExpressionWithTypeArguments
    | ExternalModuleReference
    | ForInStatement
    | ForOfStatement
    | ForStatement
    | FunctionLikeDeclaration
    | HeritageClause
    | IfStatement
    | ImportClause
    | ImportDeclaration
    | ImportEqualsDeclaration
    | ImportOrExportSpecifier
    | ImportTypeNode
    | IndexedAccessTypeNode
    | InferTypeNode
    | InterfaceDeclaration
    | JSDoc
    | JSDocAugmentsTag
    | JSDocAuthorTag
    | JSDocFunctionType
    | JSDocImplementsTag
    | JSDocSignature
    | JSDocTemplateTag
    | JSDocTypedefTag
    | JSDocTypeExpression
    | JSDocTypeLiteral
    | JSDocTypeReferencingNode
    | JsxAttribute
    | JsxAttributes
    | JsxClosingElement
    | JsxElement
    | JsxExpression
    | JsxFragment
    | JsxOpeningLikeElement
    | JsxSpreadAttribute
    | LabeledStatement
    | LiteralTypeNode
    | MappedTypeNode
    | MetaProperty
    | MissingDeclaration
    | ModuleDeclaration
    | NamedImportsOrExports
    | NamedTupleMember
    | NamespaceExport
    | NamespaceExportDeclaration
    | NamespaceImport
    | NonNullExpression
    | ObjectLiteralExpression
    | OptionalTypeNode
    | ParameterDeclaration
    | ParenthesizedExpression
    | ParenthesizedTypeNode
    | PartiallyEmittedExpression
    | PostfixUnaryExpression
    | PrefixUnaryExpression
    | PropertyAccessExpression
    | PropertyAssignment
    | PropertyDeclaration
    | PropertySignature
    | QualifiedName
    | RestTypeNode
    | ReturnStatement
    | ShorthandPropertyAssignment
    | SignatureDeclaration
    | SourceFile
    | SpreadAssignment
    | SpreadElement
    | SwitchStatement
    | TaggedTemplateExpression
    | TemplateExpression
    | TemplateSpan
    | ThrowStatement
    | TryStatement
    | TupleTypeNode
    | TypeAliasDeclaration
    | TypeAssertion
    | TypeLiteralNode
    | TypeOfExpression
    | TypeOperatorNode
    | TypeParameterDeclaration
    | TypePredicateNode
    | TypeQueryNode
    | TypeReferenceNode
    | UnionOrIntersectionTypeNode
    | VariableDeclaration
    | VariableDeclarationList
    | VariableStatement
    | VoidExpression
    | WhileStatement
    | WithStatement
    | YieldExpression;

  //// ====================

  interface xxx {
    [Syntax.ArrowFunction]: ArrowFunction;
    [Syntax.Block]: Block;
    [Syntax.BreakStatement]: BreakStatement;
    [Syntax.Bundle]: Bundle;
    [Syntax.CallExpression]: CallExpression;
    [Syntax.CaseBlock]: CaseBlock;
    [Syntax.CaseClause]: CaseClause;
    [Syntax.CatchClause]: CatchClause;
    [Syntax.ClassDeclaration]: ClassDeclaration;
    [Syntax.ClassExpression]: ClassExpression;
    [Syntax.ColonToken]: ColonToken;
    [Syntax.CommaListExpression]: CommaListExpression;
    [Syntax.ConditionalExpression]: ConditionalExpression;
    [Syntax.ContinueStatement]: ContinueStatement;
    [Syntax.DebuggerStatement]: DebuggerStatement;
    [Syntax.Decorator]: Decorator;
    [Syntax.DefaultClause]: DefaultClause;
    [Syntax.DeleteExpression]: DeleteExpression;
    [Syntax.DoStatement]: DoStatement;
    [Syntax.Dot3Token]: Dot3Token;
    [Syntax.DotToken]: DotToken;
    [Syntax.ElementAccessExpression]: ElementAccessExpression;
    [Syntax.EmptyStatement]: EmptyStatement;
    [Syntax.EndOfDeclarationMarker]: EndOfDeclarationMarker;
    [Syntax.EndOfFileToken]: EndOfFileToken;
    [Syntax.EnumDeclaration]: EnumDeclaration;
    [Syntax.EnumMember]: EnumMember;
    [Syntax.EqualsGreaterThanToken]: EqualsGreaterThanToken;
    [Syntax.EqualsToken]: EqualsToken;
    [Syntax.ExclamationToken]: ExclamationToken;
    [Syntax.ExportAssignment]: ExportAssignment;
    [Syntax.ExportDeclaration]: ExportDeclaration;
    [Syntax.ExportSpecifier]: ExportSpecifier;
    [Syntax.ExpressionStatement]: ExpressionStatement;
    [Syntax.ExpressionWithTypeArguments]: ExpressionWithTypeArguments;
    [Syntax.ExternalModuleReference]: ExternalModuleReference;
    [Syntax.ForInStatement]: ForInStatement;
    [Syntax.ForOfStatement]: ForOfStatement;
    [Syntax.ForStatement]: ForStatement;
    [Syntax.FunctionDeclaration]: FunctionDeclaration;
    [Syntax.FunctionExpression]: FunctionExpression;
    [Syntax.HeritageClause]: HeritageClause;
    [Syntax.Identifier]: Identifier;
    [Syntax.IfStatement]: IfStatement;
    [Syntax.ImportClause]: ImportClause;
    [Syntax.ImportDeclaration]: ImportDeclaration;
    [Syntax.ImportEqualsDeclaration]: ImportEqualsDeclaration;
    [Syntax.ImportSpecifier]: ImportSpecifier;
    [Syntax.InputFiles]: InputFiles;
    [Syntax.InterfaceDeclaration]: InterfaceDeclaration;
    [Syntax.JSDocAllType]: JSDocAllType;
    [Syntax.JSDocAugmentsTag]: JSDocAugmentsTag;
    [Syntax.JSDocAuthorTag]: JSDocAuthorTag;
    [Syntax.JSDocCallbackTag]: JSDocCallbackTag;
    [Syntax.JSDocClassTag]: JSDocClassTag;
    [Syntax.JSDocComment]: JSDoc;
    [Syntax.JSDocEnumTag]: JSDocEnumTag;
    [Syntax.JSDocFunctionType]: JSDocFunctionType;
    [Syntax.JSDocImplementsTag]: JSDocImplementsTag;
    [Syntax.JSDocNamepathType]: JSDocNamepathType;
    [Syntax.JSDocNonNullableType]: JSDocNonNullableType;
    [Syntax.JSDocNullableType]: JSDocNullableType;
    [Syntax.JSDocOptionalType]: JSDocOptionalType;
    [Syntax.JSDocParameterTag]: JSDocParameterTag;
    [Syntax.JSDocPrivateTag]: JSDocPrivateTag;
    [Syntax.JSDocPropertyTag]: JSDocPropertyTag;
    [Syntax.JSDocProtectedTag]: JSDocProtectedTag;
    [Syntax.JSDocPublicTag]: JSDocPublicTag;
    [Syntax.JSDocReadonlyTag]: JSDocReadonlyTag;
    [Syntax.JSDocReturnTag]: JSDocReturnTag;
    [Syntax.JSDocSignature]: JSDocSignature;
    [Syntax.JSDocTag]: JSDocTag;
    [Syntax.JSDocTemplateTag]: JSDocTemplateTag;
    [Syntax.JSDocThisTag]: JSDocThisTag;
    [Syntax.JSDocTypedefTag]: JSDocTypedefTag;
    [Syntax.JSDocTypeExpression]: JSDocTypeExpression;
    [Syntax.JSDocTypeLiteral]: JSDocTypeLiteral;
    [Syntax.JSDocTypeTag]: JSDocTypeTag;
    [Syntax.JSDocUnknownType]: JSDocUnknownType;
    [Syntax.JSDocVariadicType]: JSDocVariadicType;
    [Syntax.JsxAttribute]: JsxAttribute;
    [Syntax.JsxAttributes]: JsxAttributes;
    [Syntax.JsxClosingElement]: JsxClosingElement;
    [Syntax.JsxClosingFragment]: JsxClosingFragment;
    [Syntax.JsxElement]: JsxElement;
    [Syntax.JsxExpression]: JsxExpression;
    [Syntax.JsxFragment]: JsxFragment;
    [Syntax.JsxOpeningElement]: JsxOpeningElement;
    [Syntax.JsxOpeningFragment]: JsxOpeningFragment;
    [Syntax.JsxSelfClosingElement]: JsxSelfClosingElement;
    [Syntax.JsxSpreadAttribute]: JsxSpreadAttribute;
    [Syntax.LabeledStatement]: LabeledStatement;
    [Syntax.MergeDeclarationMarker]: MergeDeclarationMarker;
    [Syntax.MetaProperty]: MetaProperty;
    [Syntax.MissingDeclaration]: MissingDeclaration;
    [Syntax.ModuleBlock]: ModuleBlock;
    [Syntax.ModuleDeclaration]: ModuleDeclaration;
    [Syntax.NamedExports]: NamedExports;
    [Syntax.NamedImports]: NamedImports;
    [Syntax.NamespaceExport]: NamespaceExport;
    [Syntax.NamespaceExportDeclaration]: NamespaceExportDeclaration;
    [Syntax.NamespaceImport]: NamespaceImport;
    [Syntax.NewExpression]: NewExpression;
    [Syntax.NonNullExpression]: NonNullExpression;
    [Syntax.NotEmittedStatement]: NotEmittedStatement;
    [Syntax.ObjectLiteralExpression]: ObjectLiteralExpression;
    [Syntax.OmittedExpression]: OmittedExpression;
    [Syntax.Parameter]: ParameterDeclaration;
    [Syntax.ParenthesizedExpression]: ParenthesizedExpression;
    [Syntax.PartiallyEmittedExpression]: PartiallyEmittedExpression;
    [Syntax.PlusToken]: PlusToken;
    [Syntax.PostfixUnaryExpression]: PostfixUnaryExpression;
    [Syntax.PrefixUnaryExpression]: PrefixUnaryExpression;
    [Syntax.PrivateIdentifier]: PrivateIdentifier;
    [Syntax.PropertyAccessExpression]: PropertyAccessExpression;
    [Syntax.PropertyAssignment]: PropertyAssignment;
    [Syntax.ReturnStatement]: ReturnStatement;
    [Syntax.SemicolonClassElement]: SemicolonClassElement;
    [Syntax.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
    [Syntax.SourceFile]: SourceFile;
    [Syntax.SpreadAssignment]: SpreadAssignment;
    [Syntax.SpreadElement]: SpreadElement;
    [Syntax.SwitchStatement]: SwitchStatement;
    [Syntax.SyntaxList]: SyntaxList;
    [Syntax.SyntheticExpression]: SyntheticExpression;
    [Syntax.SyntheticReferenceExpression]: SyntheticReferenceExpression;
    [Syntax.TaggedTemplateExpression]: TaggedTemplateExpression;
    [Syntax.TemplateExpression]: TemplateExpression;
    [Syntax.TemplateSpan]: TemplateSpan;
    [Syntax.ThrowStatement]: ThrowStatement;
    [Syntax.TryStatement]: TryStatement;
    [Syntax.TypeAliasDeclaration]: TypeAliasDeclaration;
    [Syntax.TypeAssertionExpression]: TypeAssertion;
    [Syntax.TypeOfExpression]: TypeOfExpression;
    [Syntax.TypeOperator]: TypeOperatorNode;
    [Syntax.TypeParameter]: TypeParameterDeclaration;
    [Syntax.UnparsedInternalText]: UnparsedTextLike;
    [Syntax.UnparsedPrepend]: UnparsedPrepend;
    [Syntax.UnparsedPrologue]: UnparsedPrologue;
    [Syntax.UnparsedSource]: UnparsedSource;
    [Syntax.UnparsedSyntheticReference]: UnparsedSyntheticReference;
    [Syntax.UnparsedText]: UnparsedTextLike;
    [Syntax.VariableDeclaration]: VariableDeclaration;
    [Syntax.VariableDeclarationList]: VariableDeclarationList;
    [Syntax.VariableStatement]: VariableStatement;
    [Syntax.VoidExpression]: VoidExpression;
    [Syntax.WhileStatement]: WhileStatement;
    [Syntax.WithStatement]: WithStatement;
    [Syntax.YieldExpression]: YieldExpression;
  }
}
