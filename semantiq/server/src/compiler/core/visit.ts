import { EmitFlags, Node, NodeFlags, ObjectFlags, TypeFlags } from '../types';
import { MutableNodes, Nodes } from './bases';
import { qf, Fis } from './frame';
import { Syntax } from '../syntax';
import * as qc from './classes';
import * as qt from '../types';
import * as qu from '../utils';
import * as qg from './groups';
type Tester = (n: Node) => boolean;
export type Visitor = (n: Node) => VisitResult<Node>;
export type VisitResult<T extends Node = Node> = T | T[] | undefined;
export function newVisit(f: qt.Frame) {
  interface Frame extends qt.Frame {
    assert: qg.Fassert;
    calc: qg.Fcalc;
    //create: Fcreate;
    emit: qg.Femit;
    //get: Fget;
    //has: Fhas;
    stmt: qg.Fstmt;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.visit = new (class {
    node<T extends Node>(n?: T, cb?: Visitor, test?: Tester, lift?: (ns: Nodes<Node>) => T): T;
    node<T extends Node>(n?: T, cb?: Visitor, test?: Tester, lift?: (ns: Nodes<Node>) => T): T | undefined;
    node<T extends Node>(n?: T, cb?: Visitor, test?: Tester, lift?: (ns: Nodes<Node>) => T): T | undefined {
      if (!n || !cb) return n;
      qf.calc.aggregate(n);
      const y = cb(n as Node);
      if (!y) return;
      if (y === n) return n;
      let n2: Node | undefined;
      const extractSingle = (ns: readonly Node[]): Node | undefined => {
        qu.assert(ns.length <= 1);
        return qu.singleOrUndefined(ns);
      };
      if (qu.isArray(y)) n2 = (lift || extractSingle)(y);
      else n2 = y;
      qf.assert.node(n2, test);
      qf.calc.aggregate(n2!);
      return n2 as T;
    }
    nodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T>;
    nodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T> | undefined;
    nodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T> | undefined {
      if (!ns || !cb) return ns;
      let r: MutableNodes<T> | undefined;
      const length = ns.length;
      if (start === undefined || start < 0) start = 0;
      if (count === undefined || count > length - start) count = length - start;
      if (start > 0 || count < length) r = new Nodes<T>([], ns.trailingComma && start + count === length);
      for (let i = 0; i < count; i++) {
        const n: T = ns[i + start];
        qf.calc.aggregate(n);
        const y = n ? cb(n) : undefined;
        if (r !== undefined || y === undefined || y !== n) {
          if (r === undefined) r = new Nodes(ns.slice(0, i), ns.trailingComma).setRange(ns);
          if (y) {
            if (qu.isArray(y)) {
              for (const n2 of y) {
                qf.assert.node(n2, test);
                qf.calc.aggregate(n2);
                r.push(n2 as T);
              }
            } else {
              qf.assert.node(y, test);
              qf.calc.aggregate(y);
              r.push(y as T);
            }
          }
        }
      }
      return r || ns;
    }
    lexicalEnv(ss: Nodes<qt.Statement>, cb: Visitor, c: qt.TrafoContext, start?: number, strict?: boolean) {
      c.startLexicalEnv();
      ss = this.nodes(ss, cb, qf.is.statement, start);
      if (strict) {
        const found = qf.stmt.findUseStrictPrologue(ss);
        if (!found) ss = new Nodes<qt.Statement>([qf.emit.setStartsOnNewLine(new qc.ExpressionStatement(qc.asLiteral('use strict'))), ...ss]).setRange(ss);
      }
      return mergeLexicalEnv(ss, c.endLexicalEnv());
    }
    paramList<T extends Node>(ns: Nodes<T>, cb: Visitor, c: qt.TrafoContext, v?: (ns?: Nodes<T>, cb?: Visitor, test?: Tester, start?: number, count?: number) => Nodes<T>): Nodes<T>;
    paramList<T extends Node>(
      ns: Nodes<T> | undefined,
      cb: Visitor,
      c: qt.TrafoContext,
      v?: (ns?: Nodes<T>, cb?: Visitor, test?: Tester, start?: number, count?: number) => Nodes<T> | undefined
    ): Nodes<T> | undefined;
    paramList<T extends Node>(ns: Nodes<T> | undefined, cb: Visitor, c: qt.TrafoContext, v = this.nodes) {
      let r: Nodes<qt.ParamDeclaration> | undefined;
      c.startLexicalEnv();
      if (ns) {
        c.setLexicalEnvFlags(qt.LexicalEnvFlags.InParams, true);
        r = v(ns, cb, qf.is.paramDeclaration);
        if (c.getLexicalEnvFlags() & qt.LexicalEnvFlags.VariablesHoistedInParams) r = addValueAssignments(r!, c);
        c.setLexicalEnvFlags(qt.LexicalEnvFlags.InParams, false);
      }
      c.suspendLexicalEnv();
      return r;
    }
    functionBody(n: qt.FunctionBody, cb: Visitor, c: qt.TrafoContext): qt.FunctionBody;
    functionBody(n: qt.FunctionBody | undefined, cb: Visitor, c: qt.TrafoContext): qt.FunctionBody | undefined;
    functionBody(n: qt.ConciseBody, cb: Visitor, c: qt.TrafoContext): qt.ConciseBody;
    functionBody(n: qt.ConciseBody | undefined, cb: Visitor, c: qt.TrafoContext): qt.ConciseBody | undefined {
      c.resumeLexicalEnv();
      const updated = this.node(n, cb, qf.is.conciseBody);
      const declarations = c.endLexicalEnv();
      if (qu.some(declarations)) {
        const b = convertToFunctionBody(updated);
        const ss = mergeLexicalEnv(b.statements, declarations);
        return b.update(ss);
      }
      return updated;
    }
    eachChild<T extends Node>(node: T, cb: Visitor, c: qt.TrafoContext): T;
    eachChild<T extends Node>(node: T | undefined, cb: Visitor, c: qt.TrafoContext, nodesVisitor?: typeof Nodes.visit, tokenVisitor?: Visitor): T | undefined;
    eachChild(node: Node | undefined, cb: Visitor, c: qt.TrafoContext, nodesVisitor = Nodes.visit, tokenVisitor?: Visitor): Node | undefined {
      if (!node) return;
      const k = node.kind;
      if ((k > Syntax.FirstToken && k <= Syntax.LastToken) || k === Syntax.ThisTyping) return node;
      const n = node as qc.Node;
      switch (n.kind) {
        case Syntax.Identifier:
          return n.update(nodesVisitor(n.typeArgs, cb, isTypeNodeOrTypeParamDeclaration));
        case Syntax.QualifiedName:
          return n.update(this.node(n.left, cb, qf.is.entityName), this.node(n.right, cb, qf.is.identifier));
        case Syntax.ComputedPropertyName:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.TypeParam:
          return n.update(this.node(n.name, cb, qf.is.identifier), this.node(n.constraint, cb, qf.is.typeNode), this.node(n.default, cb, qf.is.typeNode));
        case Syntax.Param:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.dot3Token, tokenVisitor, qf.is.token),
            this.node(n.name, cb, qf.is.bindingName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.initer, cb, qf.is.expressionNode)
          );
        case Syntax.Decorator:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.PropertySignature:
          return n.update(
            nodesVisitor(n.modifiers, cb, qf.is.token),
            this.node(n.name, cb, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.initer, cb, qf.is.expressionNode)
          );
        case Syntax.PropertyDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.propertyName),
            this.node(n.questionToken || n.exclamationToken, tokenVisitor, qf.is.token),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.initer, cb, qf.is.expressionNode)
          );
        case Syntax.MethodSignature:
          return n.update(
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            nodesVisitor(n.params, cb, qf.is.paramDeclaration),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.name, cb, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token)
          );
        case Syntax.MethodDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, cb, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.node(n.type, cb, qf.is.typeNode),
            this.functionBody(n.body!, cb, c)
          );
        case Syntax.Constructor:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.functionBody(n.body!, cb, c)
          );
        case Syntax.GetAccessor:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.propertyName),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.node(n.type, cb, qf.is.typeNode),
            this.functionBody(n.body!, cb, c)
          );
        case Syntax.SetAccessor:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.propertyName),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.functionBody(n.body!, cb, c)
          );
        case Syntax.CallSignature:
          return n.update(nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration), nodesVisitor(n.params, cb, qf.is.paramDeclaration), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.ConstructSignature:
          return n.update(nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration), nodesVisitor(n.params, cb, qf.is.paramDeclaration), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.IndexSignature:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            nodesVisitor(n.params, cb, qf.is.paramDeclaration),
            this.node(n.type, cb, qf.is.typeNode)
          );
        case Syntax.TypingPredicate:
          return n.update(this.node(n.assertsModifier, cb), this.node(n.paramName, cb), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.TypingReference:
          return n.update(this.node(n.typeName, cb, qf.is.entityName), nodesVisitor(n.typeArgs, cb, qf.is.typeNode));
        case Syntax.FunctionTyping:
          return n.update(nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration), nodesVisitor(n.params, cb, qf.is.paramDeclaration), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.ConstructorTyping:
          return n.update(nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration), nodesVisitor(n.params, cb, qf.is.paramDeclaration), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.TypingQuery:
          return n.update(this.node(n.exprName, cb, qf.is.entityName));
        case Syntax.TypingLiteral:
          return n.update(nodesVisitor(n.members, cb, qf.is.typeElem));
        case Syntax.ArrayTyping:
          return n.update(this.node(n.elemType, cb, qf.is.typeNode));
        case Syntax.TupleTyping:
          return n.update(nodesVisitor(n.elems, cb, qf.is.typeNode));
        case Syntax.OptionalTyping:
          return n.update(this.node(n.type, cb, qf.is.typeNode));
        case Syntax.RestTyping:
          return n.update(this.node(n.type, cb, qf.is.typeNode));
        case Syntax.UnionTyping:
          return n.update(nodesVisitor(n.types, cb, qf.is.typeNode));
        case Syntax.IntersectionTyping:
          return n.update(nodesVisitor(n.types, cb, qf.is.typeNode));
        case Syntax.ConditionalTyping:
          return n.update(
            this.node(n.checkType, cb, qf.is.typeNode),
            this.node(n.extendsType, cb, qf.is.typeNode),
            this.node(n.trueType, cb, qf.is.typeNode),
            this.node(n.falseType, cb, qf.is.typeNode)
          );
        case Syntax.InferTyping:
          return n.update(this.node(n.typeParam, cb, qf.is.typeParamDeclaration));
        case Syntax.ImportTyping:
          return n.update(this.node(n.arg, cb, qf.is.typeNode), this.node(n.qualifier, cb, qf.is.entityName), Nodes.visit(n.typeArgs, cb, qf.is.typeNode), n.isTypeOf);
        case Syntax.NamedTupleMember:
          return n.update(this.node(n.dot3Token, cb, qf.is.token), this.node(n.name, cb, qf.is.identifier), this.node(n.questionToken, cb, qf.is.token), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.ParenthesizedTyping:
          return n.update(this.node(n.type, cb, qf.is.typeNode));
        case Syntax.TypingOperator:
          return n.update(this.node(n.type, cb, qf.is.typeNode));
        case Syntax.IndexedAccessTyping:
          return n.update(this.node(n.objectType, cb, qf.is.typeNode), this.node(n.indexType, cb, qf.is.typeNode));
        case Syntax.MappedTyping:
          return n.update(
            this.node(n.readonlyToken, tokenVisitor, qf.is.token),
            this.node(n.typeParam, cb, qf.is.typeParamDeclaration),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, cb, qf.is.typeNode)
          );
        case Syntax.LiteralTyping:
          return n.update(this.node(n.literal, cb, qf.is.expressionNode));
        case Syntax.ObjectBindingPattern:
          return n.update(nodesVisitor(n.elems, cb, qt.BindingElem.kind));
        case Syntax.ArrayBindingPattern:
          return n.update(nodesVisitor(n.elems, cb, qf.is.arrayBindingElem));
        case Syntax.BindingElem:
          return n.update(
            this.node(n.dot3Token, tokenVisitor, qf.is.token),
            this.node(n.propertyName, cb, qf.is.propertyName),
            this.node(n.name, cb, qf.is.bindingName),
            this.node(n.initer, cb, qf.is.expressionNode)
          );
        case Syntax.ArrayLiteralExpression:
          return n.update(nodesVisitor(n.elems, cb, qf.is.expressionNode));
        case Syntax.ObjectLiteralExpression:
          return n.update(nodesVisitor(n.properties, cb, qf.is.objectLiteralElemLike));
        case Syntax.PropertyAccessExpression:
          if (node.flags & NodeFlags.OptionalChain)
            return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.questionDotToken, tokenVisitor, qf.is.token), this.node(n.name, cb, qf.is.identifier));
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.name, cb, qf.is.identifierOrPrivateIdentifier));
        case Syntax.ElemAccessExpression:
          if (node.flags & NodeFlags.OptionalChain)
            return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.questionDotToken, tokenVisitor, qf.is.token), this.node(n.argExpression, cb, qf.is.expressionNode));
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.argExpression, cb, qf.is.expressionNode));
        case Syntax.CallExpression:
          if (node.flags & NodeFlags.OptionalChain) {
            return n.update(
              this.node(n.expression, cb, qf.is.expressionNode),
              this.node(n.questionDotToken, tokenVisitor, qf.is.token),
              nodesVisitor(n.typeArgs, cb, qf.is.typeNode),
              nodesVisitor(n.args, cb, qf.is.expressionNode)
            );
          }
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), nodesVisitor(n.typeArgs, cb, qf.is.typeNode), nodesVisitor(n.args, cb, qf.is.expressionNode));
        case Syntax.NewExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), nodesVisitor(n.typeArgs, cb, qf.is.typeNode), nodesVisitor(n.args, cb, qf.is.expressionNode));
        case Syntax.TaggedTemplateExpression:
          return n.update(this.node(n.tag, cb, qf.is.expressionNode), Nodes.visit(n.typeArgs, cb, qf.is.expressionNode), this.node(n.template, cb, qf.is.templateLiteral));
        case Syntax.TypeAssertionExpression:
          return n.update(this.node(n.type, cb, qf.is.typeNode), this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.ParenthesizedExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.FunctionExpression:
          return n.update(
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.node(n.type, cb, qf.is.typeNode),
            this.functionBody(n.body, cb, c)
          );
        case Syntax.ArrowFunction:
          return n.update(
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.equalsGreaterThanToken, tokenVisitor, qf.is.token),
            this.functionBody(n.body, cb, c)
          );
        case Syntax.DeleteExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.TypeOfExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.VoidExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.AwaitExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.PrefixUnaryExpression:
          return n.update(this.node(n.operand, cb, qf.is.expressionNode));
        case Syntax.PostfixUnaryExpression:
          return n.update(this.node(n.operand, cb, qf.is.expressionNode));
        case Syntax.BinaryExpression:
          return n.update(this.node(n.left, cb, qf.is.expressionNode), this.node(n.right, cb, qf.is.expressionNode), this.node(n.operatorToken, tokenVisitor, qf.is.token));
        case Syntax.ConditionalExpression:
          return n.update(
            this.node(n.condition, cb, qf.is.expressionNode),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.whenTrue, cb, qf.is.expressionNode),
            this.node(n.colonToken, tokenVisitor, qf.is.token),
            this.node(n.whenFalse, cb, qf.is.expressionNode)
          );
        case Syntax.TemplateExpression:
          return n.update(this.node(n.head, cb, qt.TemplateHead.kind), nodesVisitor(n.templateSpans, cb, qf.is.templateSpan));
        case Syntax.YieldExpression:
          return n.update(this.node(n.asteriskToken, tokenVisitor, qf.is.token), this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.SpreadElem:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.ClassExpression:
          return n.update(
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            nodesVisitor(n.heritageClauses, cb, qf.is.heritageClause),
            nodesVisitor(n.members, cb, qf.is.classElem)
          );
        case Syntax.ExpressionWithTypings:
          return n.update(nodesVisitor(n.typeArgs, cb, qf.is.typeNode), this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.AsExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.type, cb, qf.is.typeNode));
        case Syntax.NonNullExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.MetaProperty:
          return n.update(this.node(n.name, cb, qf.is.identifier));
        case Syntax.TemplateSpan:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.literal, cb, qt.TemplateMiddle.kindOrTemplateTail));
        case Syntax.Block:
          return n.update(nodesVisitor(n.statements, cb, qf.is.statement));
        case Syntax.VariableStatement:
          return n.update(nodesVisitor(n.modifiers, cb, qf.is.modifier), this.node(n.declarationList, cb, qf.is.variableDeclarationList));
        case Syntax.ExpressionStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.IfStatement:
          return n.update(
            this.node(n.expression, cb, qf.is.expressionNode),
            this.node(n.thenStatement, cb, qf.is.statement, liftToBlock),
            this.node(n.elseStatement, cb, qf.is.statement, liftToBlock)
          );
        case Syntax.DoStatement:
          return n.update(this.node(n.statement, cb, qf.is.statement, liftToBlock), this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.WhileStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.statement, cb, qf.is.statement, liftToBlock));
        case Syntax.ForStatement:
          return n.update(
            this.node(n.initer, cb, qf.is.forIniter),
            this.node(n.condition, cb, qf.is.expressionNode),
            this.node(n.incrementor, cb, qf.is.expressionNode),
            this.node(n.statement, cb, qf.is.statement, liftToBlock)
          );
        case Syntax.ForInStatement:
          return n.update(this.node(n.initer, cb, qf.is.forIniter), this.node(n.expression, cb, qf.is.expressionNode), this.node(n.statement, cb, qf.is.statement, liftToBlock));
        case Syntax.ForOfStatement:
          return n.update(
            this.node(n.awaitModifier, tokenVisitor, qf.is.token),
            this.node(n.initer, cb, qf.is.forIniter),
            this.node(n.expression, cb, qf.is.expressionNode),
            this.node(n.statement, cb, qf.is.statement, liftToBlock)
          );
        case Syntax.ContinueStatement:
          return n.update(this.node(n.label, cb, qf.is.identifier));
        case Syntax.BreakStatement:
          return n.update(this.node(n.label, cb, qf.is.identifier));
        case Syntax.ReturnStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.WithStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.statement, cb, qf.is.statement, liftToBlock));
        case Syntax.SwitchStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), this.node(n.caseBlock, cb, qf.is.caseBlock));
        case Syntax.LabeledStatement:
          return n.update(this.node(n.label, cb, qf.is.identifier), this.node(n.statement, cb, qf.is.statement, liftToBlock));
        case Syntax.ThrowStatement:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.TryStatement:
          return n.update(this.node(n.tryBlock, cb, qf.is.block), this.node(n.catchClause, cb, qf.is.catchClause), this.node(n.finallyBlock, cb, qf.is.block));
        case Syntax.VariableDeclaration:
          return n.update(
            this.node(n.name, cb, qf.is.bindingName),
            this.node(n.exclamationToken, tokenVisitor, qf.is.token),
            this.node(n.type, cb, qf.is.typeNode),
            this.node(n.initer, cb, qf.is.expressionNode)
          );
        case Syntax.VariableDeclarationList:
          return n.update(nodesVisitor(n.declarations, cb, qf.is.variableDeclaration));
        case Syntax.FunctionDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            this.paramList(n.params, cb, c, nodesVisitor),
            this.node(n.type, cb, qf.is.typeNode),
            this.functionBody(n.body, cb, c)
          );
        case Syntax.ClassDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            nodesVisitor(n.heritageClauses, cb, qf.is.heritageClause),
            nodesVisitor(n.members, cb, qf.is.classElem)
          );
        case Syntax.InterfaceDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            nodesVisitor(n.heritageClauses, cb, qf.is.heritageClause),
            nodesVisitor(n.members, cb, qf.is.typeElem)
          );
        case Syntax.TypeAliasDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.typeParams, cb, qf.is.typeParamDeclaration),
            this.node(n.type, cb, qf.is.typeNode)
          );
        case Syntax.EnumDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            nodesVisitor(n.members, cb, qf.is.enumMember)
          );
        case Syntax.ModuleDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            this.node(n.body, cb, qf.is.moduleBody)
          );
        case Syntax.ModuleBlock:
          return n.update(nodesVisitor(n.statements, cb, qf.is.statement));
        case Syntax.CaseBlock:
          return n.update(nodesVisitor(n.clauses, cb, qf.is.caseOrDefaultClause));
        case Syntax.NamespaceExportDeclaration:
          return n.update(this.node(n.name, cb, qf.is.identifier));
        case Syntax.ImportEqualsDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.name, cb, qf.is.identifier),
            this.node(n.moduleReference, cb, qf.is.moduleReference)
          );
        case Syntax.ImportDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.importClause, cb, qf.is.importClause),
            this.node(n.moduleSpecifier, cb, qf.is.expressionNode)
          );
        case Syntax.ImportClause:
          return n.update(this.node(n.name, cb, qf.is.identifier), this.node(n.namedBindings, cb, qf.is.namedImportBindings), (node as qt.ImportClause).isTypeOnly);
        case Syntax.NamespaceImport:
          return n.update(this.node(n.name, cb, qf.is.identifier));
        case Syntax.NamespaceExport:
          return n.update(this.node(n.name, cb, qf.is.identifier));
        case Syntax.NamedImports:
          return n.update(nodesVisitor(n.elems, cb, qf.is.importSpecifier));
        case Syntax.ImportSpecifier:
          return n.update(this.node(n.propertyName, cb, qf.is.identifier), this.node(n.name, cb, qf.is.identifier));
        case Syntax.ExportAssignment:
          return n.update(nodesVisitor(n.decorators, cb, qf.is.decorator), nodesVisitor(n.modifiers, cb, qf.is.modifier), this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.ExportDeclaration:
          return n.update(
            nodesVisitor(n.decorators, cb, qf.is.decorator),
            nodesVisitor(n.modifiers, cb, qf.is.modifier),
            this.node(n.exportClause, cb, qf.is.namedExportBindings),
            this.node(n.moduleSpecifier, cb, qf.is.expressionNode),
            (node as qt.ExportDeclaration).isTypeOnly
          );
        case Syntax.NamedExports:
          return n.update(nodesVisitor(n.elems, cb, qf.is.exportSpecifier));
        case Syntax.ExportSpecifier:
          return n.update(this.node(n.propertyName, cb, qf.is.identifier), this.node(n.name, cb, qf.is.identifier));
        case Syntax.ExternalModuleReference:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.JsxElem:
          return n.update(this.node(n.opening, cb, qf.is.jsx.openingElem), nodesVisitor(n.children, cb, qf.is.jsx.child), this.node(n.closing, cb, qf.is.jsx.closingElem));
        case Syntax.JsxSelfClosingElem:
          return n.update(this.node(n.tagName, cb, qf.is.jsx.tagNameExpression), nodesVisitor(n.typeArgs, cb, qf.is.typeNode), this.node(n.attributes, cb, qf.is.jsx.attributes));
        case Syntax.JsxOpeningElem:
          return n.update(this.node(n.tagName, cb, qf.is.jsx.tagNameExpression), nodesVisitor(n.typeArgs, cb, qf.is.typeNode), this.node(n.attributes, cb, qf.is.jsx.attributes));
        case Syntax.JsxClosingElem:
          return n.update(this.node(n.tagName, cb, qf.is.jsx.tagNameExpression));
        case Syntax.JsxFragment:
          return n.update(this.node(n.openingFragment, cb, qf.is.jsx.openingFragment), nodesVisitor(n.children, cb, qf.is.jsx.child), this.node(n.closingFragment, cb, qf.is.jsx.closingFragment));
        case Syntax.JsxAttribute:
          return n.update(this.node(n.name, cb, qf.is.identifier), this.node(n.initer, cb, qf.is.stringLiteralOrJsxExpressionKind));
        case Syntax.JsxAttributes:
          return n.update(nodesVisitor(n.properties, cb, qf.is.jsx.attributeLike));
        case Syntax.JsxSpreadAttribute:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.JsxExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.CaseClause:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode), nodesVisitor(n.statements, cb, qf.is.statement));
        case Syntax.DefaultClause:
          return n.update(nodesVisitor(n.statements, cb, qf.is.statement));
        case Syntax.HeritageClause:
          return n.update(nodesVisitor(n.types, cb, qf.is.expressionNodeWithTypings));
        case Syntax.CatchClause:
          return n.update(this.node(n.variableDeclaration, cb, qf.is.variableDeclaration), this.node(n.block, cb, qf.is.block));
        case Syntax.PropertyAssignment:
          return n.update(this.node(n.name, cb, qf.is.propertyName), this.node(n.initer, cb, qf.is.expressionNode));
        case Syntax.ShorthandPropertyAssignment:
          return n.update(this.node(n.name, cb, qf.is.identifier), this.node(n.objectAssignmentIniter, cb, qf.is.expressionNode));
        case Syntax.SpreadAssignment:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.EnumMember:
          return n.update(this.node(n.name, cb, qf.is.propertyName), this.node(n.initer, cb, qf.is.expressionNode));
        case Syntax.SourceFile:
          return qp_update(this.lexicalEnv(n.statements, cb, c));
        case Syntax.PartiallyEmittedExpression:
          return n.update(this.node(n.expression, cb, qf.is.expressionNode));
        case Syntax.CommaListExpression:
          return n.update(nodesVisitor(n.elems, cb, qf.is.expressionNode));
        default:
          return node;
      }
    }
  })());
}
export interface Fvisit extends ReturnType<typeof newVisit> {}
const isTypeNodeOrTypeParamDeclaration = qu.or(qf.is.typeNode, qf.is.typeParamDeclaration);
function addValueAssignments(ps: Nodes<qc.ParamDeclaration>, c: qt.TrafoContext) {
  let r: qc.ParamDeclaration[] | undefined;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const updated = addValueAssignmentIfNeeded(p, c);
    if (r || updated !== p) {
      if (!r) r = ps.slice(0, i);
      r[i] = updated;
    }
  }
  if (r) return new Nodes(r, ps.trailingComma).setRange(ps);
  return ps;
}
function addValueAssignmentIfNeeded(p: qc.ParamDeclaration, c: qt.TrafoContext) {
  return p.dot3Token ? p : p.name.kind === Syntax.BindingPattern ? addForBindingPattern(p, c) : p.initer ? addForIniter(p, p.name, p.initer, c) : p;
}
function addForBindingPattern(p: qc.ParamDeclaration, c: qt.TrafoContext) {
  c.addInitializationStatement(
    new qc.VariableStatement(
      undefined,
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(
          p.name,
          p.type,
          p.initer
            ? new qc.ConditionalExpression(qf.create.strictEquality(qf.get.generatedNameForNode(p), qc.VoidExpression.zero()), p.initer, qf.get.generatedNameForNode(p))
            : qf.get.generatedNameForNode(p)
        ),
      ])
    )
  );
  return p.update(p.decorators, p.modifiers, p.dot3Token, qf.get.generatedNameForNode(p), p.questionToken, p.type, undefined);
}
function addForIniter(p: qc.ParamDeclaration, name: qt.Identifier, init: qt.Expression, c: qt.TrafoContext) {
  c.addInitializationStatement(
    new qc.IfStatement(
      createTypeCheck(getSynthesizedClone(name), 'undefined'),
      qf.emit.setFlags(
        new qc.Block([
          new qc.ExpressionStatement(
            qf.emit.setFlags(
              qf.create
                .assignment(qf.emit.setFlags(getMutableClone(name), EmitFlags.NoSourceMap), qf.emit.setFlags(init, EmitFlags.NoSourceMap | qf.get.emitFlags(init) | EmitFlags.NoComments))
                .setRange(p),
              EmitFlags.NoComments
            )
          ),
        ]).setRange(p),
        EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments
      )
    )
  );
  return p.update(p.decorators, p.modifiers, p.dot3Token, p.name, p.questionToken, p.type, undefined);
}
export function reduceEachChild<T>(node: Node | undefined, initial: T, cb: (memo: T, node: Node) => T, cbs?: (memo: T, ns: Nodes<Node>) => T): T {
  if (node === undefined) return initial;
  const reduce = <T>(n: Node | undefined, cb: (t: T, n: Node) => T, init: T) => {
    return n ? cb(init, n) : init;
  };
  const reduce2 = <T>(ns: Nodes<Node> | undefined, cb: (t: T, ns: Nodes<Node>) => T, init: T) => {
    return ns ? cb(init, ns) : init;
  };
  const reduceAll: (ns: Nodes<Node> | undefined, cb: ((t: T, n: Node) => T) | ((t: T, ns: Nodes<Node>) => T), init: T) => T = cbs ? reduce2 : qu.reduceLeft;
  cbs = cbs || cb;
  const kind = node.kind;
  if (kind > Syntax.FirstToken && kind <= Syntax.LastToken) return initial;
  if (kind >= Syntax.TypingPredicate && kind <= Syntax.LiteralTyping) return initial;
  let r = initial;
  const n = node as qc.Node;
  switch (n.kind) {
    case Syntax.DebuggerStatement:
    case Syntax.EmptyStatement:
    case Syntax.NotEmittedStatement:
    case Syntax.OmittedExpression:
    case Syntax.SemicolonClassElem:
      break;
    case Syntax.QualifiedName:
      r = reduce(n.left, cb, r);
      r = reduce(n.right, cb, r);
      break;
    case Syntax.ComputedPropertyName:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.Param:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.Decorator:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.PropertySignature:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.questionToken, cb, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.PropertyDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.MethodDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.Constructor:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.GetAccessor:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.SetAccessor:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.ArrayBindingPattern:
    case Syntax.ObjectBindingPattern:
      r = reduceAll(n.elems, cbs, r);
      break;
    case Syntax.BindingElem:
      r = reduce(n.propertyName, cb, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.ArrayLiteralExpression:
      r = reduceAll(n.elems, cbs, r);
      break;
    case Syntax.ObjectLiteralExpression:
      r = reduceAll(n.properties, cbs, r);
      break;
    case Syntax.PropertyAccessExpression:
      r = reduce(n.expression, cb, r);
      r = reduce(n.name, cb, r);
      break;
    case Syntax.ElemAccessExpression:
      r = reduce(n.expression, cb, r);
      r = reduce(n.argExpression, cb, r);
      break;
    case Syntax.CallExpression:
      r = reduce(n.expression, cb, r);
      r = reduceAll(n.typeArgs, cbs, r);
      r = reduceAll(n.args, cbs, r);
      break;
    case Syntax.NewExpression:
      r = reduce(n.expression, cb, r);
      r = reduceAll(n.typeArgs, cbs, r);
      r = reduceAll(n.args, cbs, r);
      break;
    case Syntax.TaggedTemplateExpression:
      r = reduce(n.tag, cb, r);
      r = reduceAll(n.typeArgs, cbs, r);
      r = reduce(n.template, cb, r);
      break;
    case Syntax.TypeAssertionExpression:
      r = reduce(n.type, cb, r);
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.FunctionExpression:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.ArrowFunction:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.AwaitExpression:
    case Syntax.DeleteExpression:
    case Syntax.NonNullExpression:
    case Syntax.ParenthesizedExpression:
    case Syntax.SpreadElem:
    case Syntax.TypeOfExpression:
    case Syntax.VoidExpression:
    case Syntax.YieldExpression:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.PostfixUnaryExpression:
    case Syntax.PrefixUnaryExpression:
      r = reduce(n.operand, cb, r);
      break;
    case Syntax.BinaryExpression:
      r = reduce(n.left, cb, r);
      r = reduce(n.right, cb, r);
      break;
    case Syntax.ConditionalExpression:
      r = reduce(n.condition, cb, r);
      r = reduce(n.whenTrue, cb, r);
      r = reduce(n.whenFalse, cb, r);
      break;
    case Syntax.TemplateExpression:
      r = reduce(n.head, cb, r);
      r = reduceAll(n.templateSpans, cbs, r);
      break;
    case Syntax.ClassExpression:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.heritageClauses, cbs, r);
      r = reduceAll(n.members, cbs, r);
      break;
    case Syntax.ExpressionWithTypings:
      r = reduce(n.expression, cb, r);
      r = reduceAll(n.typeArgs, cbs, r);
      break;
    case Syntax.AsExpression:
      r = reduce(n.expression, cb, r);
      r = reduce(n.type, cb, r);
      break;
    case Syntax.TemplateSpan:
      r = reduce(n.expression, cb, r);
      r = reduce(n.literal, cb, r);
      break;
    case Syntax.Block:
      r = reduceAll(n.statements, cbs, r);
      break;
    case Syntax.VariableStatement:
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.declarationList, cb, r);
      break;
    case Syntax.ExpressionStatement:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.IfStatement:
      r = reduce(n.expression, cb, r);
      r = reduce(n.thenStatement, cb, r);
      r = reduce(n.elseStatement, cb, r);
      break;
    case Syntax.DoStatement:
      r = reduce(n.statement, cb, r);
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.WhileStatement:
    case Syntax.WithStatement:
      r = reduce(n.expression, cb, r);
      r = reduce(n.statement, cb, r);
      break;
    case Syntax.ForStatement:
      r = reduce(n.initer, cb, r);
      r = reduce(n.condition, cb, r);
      r = reduce(n.incrementor, cb, r);
      r = reduce(n.statement, cb, r);
      break;
    case Syntax.ForInStatement:
    case Syntax.ForOfStatement:
      r = reduce(n.initer, cb, r);
      r = reduce(n.expression, cb, r);
      r = reduce(n.statement, cb, r);
      break;
    case Syntax.ReturnStatement:
    case Syntax.ThrowStatement:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.SwitchStatement:
      r = reduce(n.expression, cb, r);
      r = reduce(n.caseBlock, cb, r);
      break;
    case Syntax.LabeledStatement:
      r = reduce(n.label, cb, r);
      r = reduce(n.statement, cb, r);
      break;
    case Syntax.TryStatement:
      r = reduce(n.tryBlock, cb, r);
      r = reduce(n.catchClause, cb, r);
      r = reduce(n.finallyBlock, cb, r);
      break;
    case Syntax.VariableDeclaration:
      r = reduce(n.name, cb, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.VariableDeclarationList:
      r = reduceAll(n.declarations, cbs, r);
      break;
    case Syntax.FunctionDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.params, cbs, r);
      r = reduce(n.type, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.ClassDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.typeParams, cbs, r);
      r = reduceAll(n.heritageClauses, cbs, r);
      r = reduceAll(n.members, cbs, r);
      break;
    case Syntax.EnumDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduceAll(n.members, cbs, r);
      break;
    case Syntax.ModuleDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.body, cb, r);
      break;
    case Syntax.ModuleBlock:
      r = reduceAll(n.statements, cbs, r);
      break;
    case Syntax.CaseBlock:
      r = reduceAll(n.clauses, cbs, r);
      break;
    case Syntax.ImportEqualsDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.name, cb, r);
      r = reduce(n.moduleReference, cb, r);
      break;
    case Syntax.ImportDeclaration:
      r = reduceAll(n.decorators, cbs, r);
      r = reduceAll(n.modifiers, cbs, r);
      r = reduce(n.importClause, cb, r);
      r = reduce(n.moduleSpecifier, cb, r);
      break;
    case Syntax.ImportClause:
      r = reduce(n.name, cb, r);
      r = reduce(n.namedBindings, cb, r);
      break;
    case Syntax.NamespaceImport:
      r = reduce(n.name, cb, r);
      break;
    case Syntax.NamespaceExport:
      r = reduce(n.name, cb, r);
      break;
    case Syntax.NamedImports:
    case Syntax.NamedExports:
      r = reduceAll(n.elems, cbs, r);
      break;
    case Syntax.ImportSpecifier:
    case Syntax.ExportSpecifier:
      r = reduce(n.propertyName, cb, r);
      r = reduce(n.name, cb, r);
      break;
    case Syntax.ExportAssignment:
      r = qu.reduceLeft(n.decorators, cb, r);
      r = qu.reduceLeft(n.modifiers, cb, r);
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.ExportDeclaration:
      r = qu.reduceLeft(n.decorators, cb, r);
      r = qu.reduceLeft(n.modifiers, cb, r);
      r = reduce(n.exportClause, cb, r);
      r = reduce(n.moduleSpecifier, cb, r);
      break;
    case Syntax.ExternalModuleReference:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.JsxElem:
      r = reduce(n.opening, cb, r);
      r = qu.reduceLeft(n.children, cb, r);
      r = reduce(n.closing, cb, r);
      break;
    case Syntax.JsxFragment:
      r = reduce(n.openingFragment, cb, r);
      r = qu.reduceLeft(n.children, cb, r);
      r = reduce(n.closingFragment, cb, r);
      break;
    case Syntax.JsxSelfClosingElem:
    case Syntax.JsxOpeningElem:
      r = reduce(n.tagName, cb, r);
      r = reduceAll(n.typeArgs, cb, r);
      r = reduce(n.attributes, cb, r);
      break;
    case Syntax.JsxAttributes:
      r = reduceAll(n.properties, cbs, r);
      break;
    case Syntax.JsxClosingElem:
      r = reduce(n.tagName, cb, r);
      break;
    case Syntax.JsxAttribute:
      r = reduce(n.name, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.JsxSpreadAttribute:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.JsxExpression:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.CaseClause:
      r = reduce(n.expression, cb, r);
    case Syntax.DefaultClause:
      r = reduceAll(n.statements, cbs, r);
      break;
    case Syntax.HeritageClause:
      r = reduceAll(n.types, cbs, r);
      break;
    case Syntax.CatchClause:
      r = reduce(n.variableDeclaration, cb, r);
      r = reduce(n.block, cb, r);
      break;
    case Syntax.PropertyAssignment:
      r = reduce(n.name, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.ShorthandPropertyAssignment:
      r = reduce(n.name, cb, r);
      r = reduce(n.objectAssignmentIniter, cb, r);
      break;
    case Syntax.SpreadAssignment:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.EnumMember:
      r = reduce(n.name, cb, r);
      r = reduce(n.initer, cb, r);
      break;
    case Syntax.SourceFile:
      r = reduceAll(n.statements, cbs, r);
      break;
    case Syntax.PartiallyEmittedExpression:
      r = reduce(n.expression, cb, r);
      break;
    case Syntax.CommaListExpression:
      r = reduceAll(n.elems, cbs, r);
      break;
    default:
      break;
  }
  return r;
}
export function convertToFunctionBody(n: qt.ConciseBody, multiLine?: boolean) {
  return n.kind === Syntax.Block ? (n as qc.Block) : new qc.Block([new qc.ReturnStatement(n).setRange(n)], multiLine).setRange(n);
}
export function mergeLexicalEnv(ss: Nodes<qt.Statement>, ds?: readonly qt.Statement[]): Nodes<qt.Statement>;
export function mergeLexicalEnv(ss: qt.Statement[], ds?: readonly qt.Statement[]): qt.Statement[];
export function mergeLexicalEnv(ss: qt.Statement[] | Nodes<qt.Statement>, ds?: readonly qt.Statement[]) {
  if (!qu.some(ds)) return ss;
  const findSpanEnd = <T>(ts: readonly T[], cb: (v: T) => boolean, start: number) => {
    let i = start;
    while (i < ts.length && cb(ts[i])) {
      i++;
    }
    return i;
  };
  const ls = findSpanEnd(ss, qf.is.prologueDirective, 0);
  const lf = findSpanEnd(ss, qf.stmt.is.hoistedFunction, ls);
  const lv = findSpanEnd(ss, qf.stmt.is.hoistedVariableStatement, lf);
  const rs = findSpanEnd(ds, qf.is.prologueDirective, 0);
  const rf = findSpanEnd(ds, qf.stmt.is.hoistedFunction, rs);
  const rv = findSpanEnd(ds, qf.stmt.is.hoistedVariableStatement, rf);
  const rc = findSpanEnd(ds, qf.stmt.is.customPrologue, rv);
  qu.assert(rc === ds.length);
  const left = Nodes.is(ss) ? ss.slice() : ss;
  if (rc > rv) left.splice(lv, 0, ...ds.slice(rv, rc));
  if (rv > rf) left.splice(lf, 0, ...ds.slice(rf, rv));
  if (rf > rs) left.splice(ls, 0, ...ds.slice(rs, rf));
  if (rs > 0) {
    if (ls === 0) left.splice(0, 0, ...ds.slice(0, rs));
    else {
      const lp = qu.createMap<boolean>();
      for (let i = 0; i < ls; i++) {
        const p = ss[i] as qt.PrologueDirective;
        lp.set(p.expression.text, true);
      }
      for (let i = rs - 1; i >= 0; i--) {
        const p = ds[i] as qt.PrologueDirective;
        if (!lp.has(p.expression.text)) left.unshift(p);
      }
    }
  }
  if (Nodes.is(ss)) return new Nodes(left, ss.trailingComma).setRange(ss);
  return ss;
}
export function liftToBlock(ns: readonly Node[]): qt.Statement {
  qu.assert(qu.every(ns, qf.is.statement), 'Cannot lift nodes to a qt.Block.');
  return (qu.singleOrUndefined(ns) as qt.Statement) || new qc.Block(<Nodes<qt.Statement>>ns);
}
export function createGetSymbolWalker(
  getRestTypeOfSignature: (sig: qt.Signature) => qt.Type,
  getTypePredicateOfSignature: (sig: qt.Signature) => qt.TypePredicate | undefined,
  getReturnTypeOfSignature: (sig: qt.Signature) => qt.Type,
  getBaseTypes: (t: qt.Type) => qt.Type[],
  resolveStructuredTypeMembers: (t: qt.ObjectType) => qt.ResolvedType,
  getTypeOfSymbol: (sym: qt.Symbol) => qt.Type,
  getResolvedSymbol: (node: Node) => qt.Symbol,
  getIndexTypeOfStructuredType: (t: qt.Type, kind: qt.IndexKind) => qt.Type | undefined,
  getConstraintOfTypeParam: (typeParam: qt.TypeParam) => qt.Type | undefined,
  getFirstIdentifier: (node: qt.EntityNameOrEntityNameExpression) => qt.Identifier,
  getTypeArgs: (t: qt.TypeReference) => readonly qt.Type[]
) {
  return getSymbolWalker;
  function getSymbolWalker(accept: (symbol: qt.Symbol) => boolean = () => true): qt.SymbolWalker {
    const visitedTypes: qt.Type[] = [];
    const visitedSymbols: qt.Symbol[] = [];
    return {
      walkType: (t) => {
        try {
          visitType(t);
          return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
        } finally {
          clear(visitedTypes);
          clear(visitedSymbols);
        }
      },
      walkSymbol: (symbol) => {
        try {
          visitSymbol(symbol);
          return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
        } finally {
          clear(visitedTypes);
          clear(visitedSymbols);
        }
      },
    };
    function visitType(t: qt.Type | undefined) {
      if (!t) return;
      if (visitedTypes[t.id]) return;
      visitedTypes[t.id] = t;
      const shouldBail = visitSymbol(t.symbol);
      if (shouldBail) return;
      if (t.flags & TypeFlags.Object) {
        const objectType = t as qt.ObjectType;
        const objectFlags = objectType.objectFlags;
        if (objectFlags & ObjectFlags.Reference) visitTypeReference(t as qt.TypeReference);
        if (objectFlags & ObjectFlags.Mapped) visitMappedType(t as qt.MappedType);
        if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) visitInterfaceType(t as qt.InterfaceType);
        if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) visitObjectType(objectType);
      }
      if (t.flags & TypeFlags.TypeParam) visitTypeParam(t as qt.TypeParam);
      if (t.flags & TypeFlags.UnionOrIntersection) visitUnionOrIntersectionType(t as qt.UnionOrIntersectionType);
      if (t.flags & TypeFlags.Index) visitIndexType(t as qt.IndexType);
      if (t.flags & TypeFlags.IndexedAccess) visitIndexedAccessType(t as qt.IndexedAccessType);
    }
    function visitTypeReference(t: qt.TypeReference) {
      visitType(t.target);
      qu.each(getTypeArgs(t), visitType);
    }
    function visitTypeParam(t: qt.TypeParam) {
      visitType(qf.get.constraintOfTypeParam(t));
    }
    function visitUnionOrIntersectionType(t: qt.UnionOrIntersectionType) {
      qu.each(t.types, visitType);
    }
    function visitIndexType(t: qt.IndexType) {
      visitType(t.type);
    }
    function visitIndexedAccessType(t: qt.IndexedAccessType) {
      visitType(t.objectType);
      visitType(t.indexType);
      visitType(t.constraint);
    }
    function visitMappedType(t: qt.MappedType) {
      visitType(t.typeParam);
      visitType(t.constraintType);
      visitType(t.templateType);
      visitType(t.modifiersType);
    }
    function visitSignature(signature: qt.Signature) {
      const typePredicate = getTypePredicateOfSignature(signature);
      if (typePredicate) visitType(typePredicate.type);
      qu.each(signature.typeParams, visitType);
      for (const param of signature.params) {
        visitSymbol(param);
      }
      visitType(getRestTypeOfSignature(signature));
      visitType(qf.get.returnTypeOfSignature(signature));
    }
    function visitInterfaceType(interfaceT: qt.InterfaceType) {
      visitObjectType(interfaceT);
      qu.each(interfaceT.typeParams, visitType);
      qu.each(getBaseTypes(interfaceT), visitType);
      visitType(interfaceT.thisType);
    }
    function visitObjectType(t: qt.ObjectType) {
      const stringIndexType = qf.get.indexTypeOfStructuredType(t, qt.IndexKind.String);
      visitType(stringIndexType);
      const numberIndexType = qf.get.indexTypeOfStructuredType(t, qt.IndexKind.Number);
      visitType(numberIndexType);
      const resolved = resolveStructuredTypeMembers(t);
      for (const signature of resolved.callSignatures) {
        visitSignature(signature);
      }
      for (const signature of resolved.constructSignatures) {
        visitSignature(signature);
      }
      for (const p of resolved.properties) {
        visitSymbol(p);
      }
    }
    function visitSymbol(s?: qt.Symbol): boolean {
      if (!s) return false;
      const i = s.getId();
      if (visitedSymbols[i]) return false;
      visitedSymbols[i] = s;
      if (!accept(s)) return true;
      const t = s.typeOfSymbol();
      visitType(t);
      if (s.exports) s.exports.forEach(visitSymbol);
      qu.each(s.declarations, (d) => {
        if ((d as any).type && (d as any).type.kind === Syntax.TypingQuery) {
          const query = (d as any).type as qt.TypingQuery;
          const entity = getResolvedSymbol(qf.get.firstIdentifier(query.exprName));
          visitSymbol(entity);
        }
      });
      return false;
    }
  }
}
