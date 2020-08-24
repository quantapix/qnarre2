import { EmitFlags, Node, Nodes, NodeFlags, ObjectFlags, Visitor, Visitors, VisitResult } from '../types';
import { qf, Fassert, Fis } from './frame';
import { Syntax } from '../syntax';
import * as qb from './bases';
import * as qc from './classes';
import * as qg from './groups';
import * as qi from './index';
import * as qt from '../types';
import * as qu from '../utils';
type Tester = (n: Node) => boolean;
type Lifter<T extends Node> = ((ns?: Nodes) => T) | ((ns?: readonly Node[]) => T);
export function newVisit(f: qt.Frame) {
  interface Frame extends qt.Frame {
    assert: Fassert;
    calc: qg.Fcalc;
    //make: Fmake;
    emit: qg.Femit;
    //get: Fget;
    //has: Fhas;
    stmt: qg.Fstmt;
    is: Fis;
    type: qg.Ftype;
  }
  const qf = f as Frame;
  return (qf.visit = new (class {
    body(n: qt.FunctionBody, v: Visitor, c: qt.TrafoContext): qt.FunctionBody;
    body(n: qt.FunctionBody | undefined, v: Visitor, c: qt.TrafoContext): qt.FunctionBody | undefined;
    body(n: qt.ConciseBody, v: Visitor, c: qt.TrafoContext): qt.ConciseBody;
    body(n: qt.ConciseBody | undefined, v: Visitor, c: qt.TrafoContext): qt.ConciseBody | undefined {
      c.resumeLexicalEnv();
      const r = this.node(n, v, qf.is.conciseBody);
      const ds = c.endLexicalEnv();
      if (qu.some(ds)) {
        const b = qi.convertToFunctionBody(r);
        const ss = qi.mergeLexicalEnv(b.statements, ds);
        return b.update(ss);
      }
      return r;
    }
    children<T extends Node>(node: T, v: Visitor, c: qt.TrafoContext): T;
    children<T extends Node>(
      node: T | undefined,
      v: Visitor,
      c: qt.TrafoContext,
      vs?: (ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number) => Nodes<T> | undefined,
      tokenVisitor?: Visitor
    ): T | undefined;
    children(node: Node | undefined, v: Visitor, c: qt.TrafoContext, vs = this.nodes, tokenVisitor?: Visitor): Node | undefined {
      if (!node) return;
      if (qf.is.token(node) || node.kind === Syntax.ThisTyping) return node;
      const n = node as qc.Node;
      switch (n.kind) {
        case Syntax.Identifier:
          return n.update(vs(n.typeArgs, v, qu.or(qf.is.typeNode, qf.is.typeParamDeclaration)));
        case Syntax.QualifiedName:
          return n.update(this.node(n.left, v, qf.is.entityName), this.node(n.right, v, qf.is.identifier));
        case Syntax.ComputedPropertyName:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.TypeParam:
          return n.update(this.node(n.name, v, qf.is.identifier), this.node(n.constraint, v, qf.is.typeNode), this.node(n.default, v, qf.is.typeNode));
        case Syntax.Param:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.dot3Token, tokenVisitor, qf.is.token),
            this.node(n.name, v, qf.is.bindingName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.initer, v, qf.is.expressionNode)
          );
        case Syntax.Decorator:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.PropertySignature:
          return n.update(
            vs(n.modifiers, v, qf.is.token),
            this.node(n.name, v, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.initer, v, qf.is.expressionNode)
          );
        case Syntax.PropertyDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.propertyName),
            this.node(n.questionToken || n.exclamationToken, tokenVisitor, qf.is.token),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.initer, v, qf.is.expressionNode)
          );
        case Syntax.MethodSignature:
          return n.update(
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            vs(n.params, v, qf.is.paramDeclaration),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.name, v, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token)
          );
        case Syntax.MethodDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, v, qf.is.propertyName),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            this.params(n.params, v, c, vs),
            this.node(n.type, v, qf.is.typeNode),
            this.body(n.body!, v, c)
          );
        case Syntax.Constructor:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), this.params(n.params, v, c, vs), this.body(n.body!, v, c));
        case Syntax.GetAccessor:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.propertyName),
            this.params(n.params, v, c, vs),
            this.node(n.type, v, qf.is.typeNode),
            this.body(n.body!, v, c)
          );
        case Syntax.SetAccessor:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.propertyName),
            this.params(n.params, v, c, vs),
            this.body(n.body!, v, c)
          );
        case Syntax.CallSignature:
          return n.update(vs(n.typeParams, v, qf.is.typeParamDeclaration), vs(n.params, v, qf.is.paramDeclaration), this.node(n.type, v, qf.is.typeNode));
        case Syntax.ConstructSignature:
          return n.update(vs(n.typeParams, v, qf.is.typeParamDeclaration), vs(n.params, v, qf.is.paramDeclaration), this.node(n.type, v, qf.is.typeNode));
        case Syntax.IndexSignature:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), vs(n.params, v, qf.is.paramDeclaration), this.node(n.type, v, qf.is.typeNode));
        case Syntax.TypingPredicate:
          return n.update(this.node(n.assertsModifier, v), this.node(n.paramName, v), this.node(n.type, v, qf.is.typeNode));
        case Syntax.TypingReference:
          return n.update(this.node(n.typeName, v, qf.is.entityName), vs(n.typeArgs, v, qf.is.typeNode));
        case Syntax.FunctionTyping:
          return n.update(vs(n.typeParams, v, qf.is.typeParamDeclaration), vs(n.params, v, qf.is.paramDeclaration), this.node(n.type, v, qf.is.typeNode));
        case Syntax.ConstructorTyping:
          return n.update(vs(n.typeParams, v, qf.is.typeParamDeclaration), vs(n.params, v, qf.is.paramDeclaration), this.node(n.type, v, qf.is.typeNode));
        case Syntax.TypingQuery:
          return n.update(this.node(n.exprName, v, qf.is.entityName));
        case Syntax.TypingLiteral:
          return n.update(vs(n.members, v, qf.is.typeElem));
        case Syntax.ArrayTyping:
          return n.update(this.node(n.elemType, v, qf.is.typeNode));
        case Syntax.TupleTyping:
          return n.update(vs(n.elems, v, qf.is.typeNode));
        case Syntax.OptionalTyping:
          return n.update(this.node(n.type, v, qf.is.typeNode));
        case Syntax.RestTyping:
          return n.update(this.node(n.type, v, qf.is.typeNode));
        case Syntax.UnionTyping:
          return n.update(vs(n.types, v, qf.is.typeNode));
        case Syntax.IntersectionTyping:
          return n.update(vs(n.types, v, qf.is.typeNode));
        case Syntax.ConditionalTyping:
          return n.update(this.node(n.checkType, v, qf.is.typeNode), this.node(n.extendsType, v, qf.is.typeNode), this.node(n.trueType, v, qf.is.typeNode), this.node(n.falseType, v, qf.is.typeNode));
        case Syntax.InferTyping:
          return n.update(this.node(n.typeParam, v, qf.is.typeParamDeclaration));
        case Syntax.ImportTyping:
          return n.update(this.node(n.arg, v, qf.is.typeNode), this.node(n.qualifier, v, qf.is.entityName), Nodes.visit(n.typeArgs, v, qf.is.typeNode), n.isTypeOf);
        case Syntax.NamedTupleMember:
          return n.update(this.node(n.dot3Token, v, qf.is.token), this.node(n.name, v, qf.is.identifier), this.node(n.questionToken, v, qf.is.token), this.node(n.type, v, qf.is.typeNode));
        case Syntax.ParenthesizedTyping:
          return n.update(this.node(n.type, v, qf.is.typeNode));
        case Syntax.TypingOperator:
          return n.update(this.node(n.type, v, qf.is.typeNode));
        case Syntax.IndexedAccessTyping:
          return n.update(this.node(n.objectType, v, qf.is.typeNode), this.node(n.indexType, v, qf.is.typeNode));
        case Syntax.MappedTyping:
          return n.update(
            this.node(n.readonlyToken, tokenVisitor, qf.is.token),
            this.node(n.typeParam, v, qf.is.typeParamDeclaration),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.type, v, qf.is.typeNode)
          );
        case Syntax.LiteralTyping:
          return n.update(this.node(n.literal, v, qf.is.expressionNode));
        case Syntax.ObjectBindingPattern:
          return n.update(vs(n.elems, v, qt.BindingElem.kind));
        case Syntax.ArrayBindingPattern:
          return n.update(vs(n.elems, v, qf.is.arrayBindingElem));
        case Syntax.BindingElem:
          return n.update(
            this.node(n.dot3Token, tokenVisitor, qf.is.token),
            this.node(n.propertyName, v, qf.is.propertyName),
            this.node(n.name, v, qf.is.bindingName),
            this.node(n.initer, v, qf.is.expressionNode)
          );
        case Syntax.ArrayLiteralExpression:
          return n.update(vs(n.elems, v, qf.is.expressionNode));
        case Syntax.ObjectLiteralExpression:
          return n.update(vs(n.properties, v, qf.is.objectLiteralElemLike));
        case Syntax.PropertyAccessExpression:
          if (node.flags & NodeFlags.OptionalChain)
            return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.questionDotToken, tokenVisitor, qf.is.token), this.node(n.name, v, qf.is.identifier));
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.name, v, qf.is.identifierOrPrivateIdentifier));
        case Syntax.ElemAccessExpression:
          if (node.flags & NodeFlags.OptionalChain)
            return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.questionDotToken, tokenVisitor, qf.is.token), this.node(n.argExpression, v, qf.is.expressionNode));
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.argExpression, v, qf.is.expressionNode));
        case Syntax.CallExpression:
          if (node.flags & NodeFlags.OptionalChain) {
            return n.update(
              this.node(n.expression, v, qf.is.expressionNode),
              this.node(n.questionDotToken, tokenVisitor, qf.is.token),
              vs(n.typeArgs, v, qf.is.typeNode),
              vs(n.args, v, qf.is.expressionNode)
            );
          }
          return n.update(this.node(n.expression, v, qf.is.expressionNode), vs(n.typeArgs, v, qf.is.typeNode), vs(n.args, v, qf.is.expressionNode));
        case Syntax.NewExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), vs(n.typeArgs, v, qf.is.typeNode), vs(n.args, v, qf.is.expressionNode));
        case Syntax.TaggedTemplateExpression:
          return n.update(this.node(n.tag, v, qf.is.expressionNode), Nodes.visit(n.typeArgs, v, qf.is.expressionNode), this.node(n.template, v, qf.is.templateLiteral));
        case Syntax.TypeAssertionExpression:
          return n.update(this.node(n.type, v, qf.is.typeNode), this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.ParenthesizedExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.FunctionExpression:
          return n.update(
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            this.params(n.params, v, c, vs),
            this.node(n.type, v, qf.is.typeNode),
            this.body(n.body, v, c)
          );
        case Syntax.ArrowFunction:
          return n.update(
            vs(n.modifiers, v, qf.is.modifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            this.params(n.params, v, c, vs),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.equalsGreaterThanToken, tokenVisitor, qf.is.token),
            this.body(n.body, v, c)
          );
        case Syntax.DeleteExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.TypeOfExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.VoidExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.AwaitExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.PrefixUnaryExpression:
          return n.update(this.node(n.operand, v, qf.is.expressionNode));
        case Syntax.PostfixUnaryExpression:
          return n.update(this.node(n.operand, v, qf.is.expressionNode));
        case Syntax.BinaryExpression:
          return n.update(this.node(n.left, v, qf.is.expressionNode), this.node(n.right, v, qf.is.expressionNode), this.node(n.operatorToken, tokenVisitor, qf.is.token));
        case Syntax.ConditionalExpression:
          return n.update(
            this.node(n.condition, v, qf.is.expressionNode),
            this.node(n.questionToken, tokenVisitor, qf.is.token),
            this.node(n.whenTrue, v, qf.is.expressionNode),
            this.node(n.colonToken, tokenVisitor, qf.is.token),
            this.node(n.whenFalse, v, qf.is.expressionNode)
          );
        case Syntax.TemplateExpression:
          return n.update(this.node(n.head, v, qt.TemplateHead.kind), vs(n.templateSpans, v, qf.is.templateSpan));
        case Syntax.YieldExpression:
          return n.update(this.node(n.asteriskToken, tokenVisitor, qf.is.token), this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.SpreadElem:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.ClassExpression:
          return n.update(
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            vs(n.heritageClauses, v, qf.is.heritageClause),
            vs(n.members, v, qf.is.classElem)
          );
        case Syntax.ExpressionWithTypings:
          return n.update(vs(n.typeArgs, v, qf.is.typeNode), this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.AsExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.type, v, qf.is.typeNode));
        case Syntax.NonNullExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.MetaProperty:
          return n.update(this.node(n.name, v, qf.is.identifier));
        case Syntax.TemplateSpan:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.literal, v, qt.TemplateMiddle.kindOrTemplateTail));
        case Syntax.Block:
          return n.update(vs(n.statements, v, qf.is.statement));
        case Syntax.VariableStatement:
          return n.update(vs(n.modifiers, v, qf.is.modifier), this.node(n.declarationList, v, qf.is.variableDeclarationList));
        case Syntax.ExpressionStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.IfStatement:
          return n.update(
            this.node(n.expression, v, qf.is.expressionNode),
            this.node(n.thenStatement, v, qf.is.statement, qi.liftToBlock),
            this.node(n.elseStatement, v, qf.is.statement, qi.liftToBlock)
          );
        case Syntax.DoStatement:
          return n.update(this.node(n.statement, v, qf.is.statement, qi.liftToBlock), this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.WhileStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.statement, v, qf.is.statement, qi.liftToBlock));
        case Syntax.ForStatement:
          return n.update(
            this.node(n.initer, v, qf.is.forIniter),
            this.node(n.condition, v, qf.is.expressionNode),
            this.node(n.incrementor, v, qf.is.expressionNode),
            this.node(n.statement, v, qf.is.statement, qi.liftToBlock)
          );
        case Syntax.ForInStatement:
          return n.update(this.node(n.initer, v, qf.is.forIniter), this.node(n.expression, v, qf.is.expressionNode), this.node(n.statement, v, qf.is.statement, qi.liftToBlock));
        case Syntax.ForOfStatement:
          return n.update(
            this.node(n.awaitModifier, tokenVisitor, qf.is.token),
            this.node(n.initer, v, qf.is.forIniter),
            this.node(n.expression, v, qf.is.expressionNode),
            this.node(n.statement, v, qf.is.statement, qi.liftToBlock)
          );
        case Syntax.ContinueStatement:
          return n.update(this.node(n.label, v, qf.is.identifier));
        case Syntax.BreakStatement:
          return n.update(this.node(n.label, v, qf.is.identifier));
        case Syntax.ReturnStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.WithStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.statement, v, qf.is.statement, qi.liftToBlock));
        case Syntax.SwitchStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), this.node(n.caseBlock, v, qf.is.caseBlock));
        case Syntax.LabeledStatement:
          return n.update(this.node(n.label, v, qf.is.identifier), this.node(n.statement, v, qf.is.statement, qi.liftToBlock));
        case Syntax.ThrowStatement:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.TryStatement:
          return n.update(this.node(n.tryBlock, v, qf.is.block), this.node(n.catchClause, v, qf.is.catchClause), this.node(n.finallyBlock, v, qf.is.block));
        case Syntax.VariableDeclaration:
          return n.update(
            this.node(n.name, v, qf.is.bindingName),
            this.node(n.exclamationToken, tokenVisitor, qf.is.token),
            this.node(n.type, v, qf.is.typeNode),
            this.node(n.initer, v, qf.is.expressionNode)
          );
        case Syntax.VariableDeclarationList:
          return n.update(vs(n.declarations, v, qf.is.variableDeclaration));
        case Syntax.FunctionDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.asteriskToken, tokenVisitor, qf.is.token),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            this.params(n.params, v, c, vs),
            this.node(n.type, v, qf.is.typeNode),
            this.body(n.body, v, c)
          );
        case Syntax.ClassDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            vs(n.heritageClauses, v, qf.is.heritageClause),
            vs(n.members, v, qf.is.classElem)
          );
        case Syntax.InterfaceDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            vs(n.heritageClauses, v, qf.is.heritageClause),
            vs(n.members, v, qf.is.typeElem)
          );
        case Syntax.TypeAliasDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.name, v, qf.is.identifier),
            vs(n.typeParams, v, qf.is.typeParamDeclaration),
            this.node(n.type, v, qf.is.typeNode)
          );
        case Syntax.EnumDeclaration:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), this.node(n.name, v, qf.is.identifier), vs(n.members, v, qf.is.enumMember));
        case Syntax.ModuleDeclaration:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), this.node(n.name, v, qf.is.identifier), this.node(n.body, v, qf.is.moduleBody));
        case Syntax.ModuleBlock:
          return n.update(vs(n.statements, v, qf.is.statement));
        case Syntax.CaseBlock:
          return n.update(vs(n.clauses, v, qf.is.caseOrDefaultClause));
        case Syntax.NamespaceExportDeclaration:
          return n.update(this.node(n.name, v, qf.is.identifier));
        case Syntax.ImportEqualsDeclaration:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), this.node(n.name, v, qf.is.identifier), this.node(n.moduleReference, v, qf.is.moduleReference));
        case Syntax.ImportDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.importClause, v, qf.is.importClause),
            this.node(n.moduleSpecifier, v, qf.is.expressionNode)
          );
        case Syntax.ImportClause:
          return n.update(this.node(n.name, v, qf.is.identifier), this.node(n.namedBindings, v, qf.is.namedImportBindings), (node as qt.ImportClause).isTypeOnly);
        case Syntax.NamespaceImport:
          return n.update(this.node(n.name, v, qf.is.identifier));
        case Syntax.NamespaceExport:
          return n.update(this.node(n.name, v, qf.is.identifier));
        case Syntax.NamedImports:
          return n.update(vs(n.elems, v, qf.is.importSpecifier));
        case Syntax.ImportSpecifier:
          return n.update(this.node(n.propertyName, v, qf.is.identifier), this.node(n.name, v, qf.is.identifier));
        case Syntax.ExportAssignment:
          return n.update(vs(n.decorators, v, qf.is.decorator), vs(n.modifiers, v, qf.is.modifier), this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.ExportDeclaration:
          return n.update(
            vs(n.decorators, v, qf.is.decorator),
            vs(n.modifiers, v, qf.is.modifier),
            this.node(n.exportClause, v, qf.is.namedExportBindings),
            this.node(n.moduleSpecifier, v, qf.is.expressionNode),
            (node as qt.ExportDeclaration).isTypeOnly
          );
        case Syntax.NamedExports:
          return n.update(vs(n.elems, v, qf.is.exportSpecifier));
        case Syntax.ExportSpecifier:
          return n.update(this.node(n.propertyName, v, qf.is.identifier), this.node(n.name, v, qf.is.identifier));
        case Syntax.ExternalModuleReference:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.JsxElem:
          return n.update(this.node(n.opening, v, qf.is.jsx.openingElem), vs(n.children, v, qf.is.jsx.child), this.node(n.closing, v, qf.is.jsx.closingElem));
        case Syntax.JsxSelfClosingElem:
          return n.update(this.node(n.tagName, v, qf.is.jsx.tagNameExpression), vs(n.typeArgs, v, qf.is.typeNode), this.node(n.attributes, v, qf.is.jsx.attributes));
        case Syntax.JsxOpeningElem:
          return n.update(this.node(n.tagName, v, qf.is.jsx.tagNameExpression), vs(n.typeArgs, v, qf.is.typeNode), this.node(n.attributes, v, qf.is.jsx.attributes));
        case Syntax.JsxClosingElem:
          return n.update(this.node(n.tagName, v, qf.is.jsx.tagNameExpression));
        case Syntax.JsxFragment:
          return n.update(this.node(n.openingFragment, v, qf.is.jsx.openingFragment), vs(n.children, v, qf.is.jsx.child), this.node(n.closingFragment, v, qf.is.jsx.closingFragment));
        case Syntax.JsxAttribute:
          return n.update(this.node(n.name, v, qf.is.identifier), this.node(n.initer, v, qf.is.stringLiteralOrJsxExpressionKind));
        case Syntax.JsxAttributes:
          return n.update(vs(n.properties, v, qf.is.jsx.attributeLike));
        case Syntax.JsxSpreadAttribute:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.JsxExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.CaseClause:
          return n.update(this.node(n.expression, v, qf.is.expressionNode), vs(n.statements, v, qf.is.statement));
        case Syntax.DefaultClause:
          return n.update(vs(n.statements, v, qf.is.statement));
        case Syntax.HeritageClause:
          return n.update(vs(n.types, v, qf.is.expressionNodeWithTypings));
        case Syntax.CatchClause:
          return n.update(this.node(n.variableDeclaration, v, qf.is.variableDeclaration), this.node(n.block, v, qf.is.block));
        case Syntax.PropertyAssignment:
          return n.update(this.node(n.name, v, qf.is.propertyName), this.node(n.initer, v, qf.is.expressionNode));
        case Syntax.ShorthandPropertyAssignment:
          return n.update(this.node(n.name, v, qf.is.identifier), this.node(n.objectAssignmentIniter, v, qf.is.expressionNode));
        case Syntax.SpreadAssignment:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.EnumMember:
          return n.update(this.node(n.name, v, qf.is.propertyName), this.node(n.initer, v, qf.is.expressionNode));
        case Syntax.SourceFile:
          return qp_update(this.lexicalEnv(n.statements, v, c));
        case Syntax.PartiallyEmittedExpression:
          return n.update(this.node(n.expression, v, qf.is.expressionNode));
        case Syntax.CommaListExpression:
          return n.update(vs(n.elems, v, qf.is.expressionNode));
        default:
          return node;
      }
    }
    lexicalEnv(ss: Nodes<qt.Statement>, v: Visitor, c: qt.TrafoContext, start?: number, strict?: boolean) {
      c.startLexicalEnv();
      ss = this.nodes<qt.Statement>(ss, v, qf.is.statement, start);
      if (strict) {
        const found = qf.stmt.findUseStrictPrologue(ss);
        if (!found) ss = new qb.Nodes<qt.Statement>([qf.emit.setStartsOnNewLine(new qc.ExpressionStatement(qc.asLiteral('use strict'))), ...ss]).setRange(ss);
      }
      return qi.mergeLexicalEnv(ss, c.endLexicalEnv());
    }
    node<T extends Node>(n?: T, v?: Visitor, test?: Tester, lift?: Lifter<T>): T;
    node<T extends Node>(n?: T, v?: Visitor, test?: Tester, lift?: Lifter<T>): T | undefined;
    node<T extends Node>(n?: T, v?: Visitor, test?: Tester, lift?: Lifter<T>): T | undefined {
      if (!n || !v) return n;
      qf.calc.aggregate(n);
      const y = v(n as Node);
      if (!y) return;
      if (y === n) return n;
      let n2: T | undefined;
      const extractSingle = (ns: readonly T[]) => {
        qf.assert.true(ns.length <= 1);
        return qu.singleOrUndefined(ns);
      };
      if (qf.is.array(y)) n2 = (lift || extractSingle)(y);
      else n2 = y as T;
      qf.assert.node(n2, test);
      qf.calc.aggregate(n2!);
      return n2;
    }
    nodes<T extends Node>(ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T>;
    nodes<T extends Node>(ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T> | undefined;
    nodes<T extends Node>(ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number): Nodes<T> | undefined {
      if (!ns || !v) return ns;
      let r: qb.MutableNodes<T> | undefined;
      const length = ns.length;
      if (start === undefined || start < 0) start = 0;
      if (count === undefined || count > length - start) count = length - start;
      if (start > 0 || count < length) r = new qb.Nodes<T>([], ns.trailingComma && start + count === length);
      for (let i = 0; i < count; i++) {
        const n: T = ns[i + start];
        qf.calc.aggregate(n);
        const y = n ? v(n) : undefined;
        if (r !== undefined || y === undefined || y !== n) {
          if (r === undefined) r = new qb.Nodes(ns.slice(0, i), ns.trailingComma).setRange(ns);
          if (y) {
            if (qf.is.array(y)) {
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
    params<T extends Node>(ns: Nodes<T>, v: Visitor, c: qt.TrafoContext, vs?: (ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number) => Nodes<T>): Nodes<T>;
    params<T extends Node>(
      ns: Nodes<T> | undefined,
      v: Visitor,
      c: qt.TrafoContext,
      vs?: (ns?: Nodes<T>, v?: Visitor, test?: Tester, start?: number, count?: number) => Nodes<T> | undefined
    ): Nodes<T> | undefined;
    params<T extends Node = qt.ParamDeclaration>(ns: Nodes<T> | undefined, v: Visitor, c: qt.TrafoContext, vs = this.nodes) {
      let r: Nodes<qt.ParamDeclaration> | undefined;
      c.startLexicalEnv();
      if (ns) {
        c.setLexicalEnvFlags(qt.LexicalEnvFlags.InParams, true);
        r = vs(ns, v, qf.is.paramDeclaration) as Nodes<qt.ParamDeclaration>;
        if (r && c.getLexicalEnvFlags() & qt.LexicalEnvFlags.VariablesHoistedInParams) r = addValueAssignments(r, c);
        c.setLexicalEnvFlags(qt.LexicalEnvFlags.InParams, false);
      }
      c.suspendLexicalEnv();
      return r;
    }
    reduce<T>(node: Node | undefined, init: T, cb: (t: T, n: Node) => T, cbs?: (t: T, ns: Nodes) => T): T {
      if (node === undefined) return init;
      const reduce = <T>(n: Node | undefined, cb: (t: T, n: Node) => T, init: T) => {
        return n ? cb(init, n) : init;
      };
      const reduce2 = <T>(ns: Nodes | undefined, cb: (t: T, ns: Nodes) => T, init: T) => {
        return ns ? cb(init, ns) : init;
      };
      const reduceAll: (ns: Nodes | undefined, cb: ((t: T, n: Node) => T) | ((t: T, ns: Nodes) => T), init: T) => T = cbs ? reduce2 : qu.reduceLeft;
      cbs = cbs || cb;
      const kind = node.kind;
      if (kind > Syntax.FirstToken && kind <= Syntax.LastToken) return init;
      if (kind >= Syntax.TypingPredicate && kind <= Syntax.LiteralTyping) return init;
      let r = init;
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
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.initer, cb, r);
          break;
        case Syntax.Decorator:
          r = reduce(n.expression, cb, r);
          break;
        case Syntax.PropertySignature:
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.questionToken, cb, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.initer, cb, r);
          break;
        case Syntax.PropertyDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.initer, cb, r);
          break;
        case Syntax.MethodDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.Constructor:
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.GetAccessor:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.SetAccessor:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.ArrayBindingPattern:
        case Syntax.ObjectBindingPattern:
          r = reduceAll(n.elems, cbs!, r);
          break;
        case Syntax.BindingElem:
          r = reduce(n.propertyName, cb, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.initer, cb, r);
          break;
        case Syntax.ArrayLiteralExpression:
          r = reduceAll(n.elems, cbs!, r);
          break;
        case Syntax.ObjectLiteralExpression:
          r = reduceAll(n.properties, cbs!, r);
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
          r = reduceAll(n.typeArgs, cbs!, r);
          r = reduceAll(n.args, cbs!, r);
          break;
        case Syntax.NewExpression:
          r = reduce(n.expression, cb, r);
          r = reduceAll(n.typeArgs, cbs!, r);
          r = reduceAll(n.args, cbs!, r);
          break;
        case Syntax.TaggedTemplateExpression:
          r = reduce(n.tag, cb, r);
          r = reduceAll(n.typeArgs, cbs!, r);
          r = reduce(n.template, cb, r);
          break;
        case Syntax.TypeAssertionExpression:
          r = reduce(n.type, cb, r);
          r = reduce(n.expression, cb, r);
          break;
        case Syntax.FunctionExpression:
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.ArrowFunction:
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.params, cbs!, r);
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
          r = reduceAll(n.templateSpans, cbs!, r);
          break;
        case Syntax.ClassExpression:
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.heritageClauses, cbs!, r);
          r = reduceAll(n.members, cbs!, r);
          break;
        case Syntax.ExpressionWithTypings:
          r = reduce(n.expression, cb, r);
          r = reduceAll(n.typeArgs, cbs!, r);
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
          r = reduceAll(n.statements, cbs!, r);
          break;
        case Syntax.VariableStatement:
          r = reduceAll(n.modifiers, cbs!, r);
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
          r = reduceAll(n.declarations, cbs!, r);
          break;
        case Syntax.FunctionDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.params, cbs!, r);
          r = reduce(n.type, cb, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.ClassDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.typeParams, cbs!, r);
          r = reduceAll(n.heritageClauses, cbs!, r);
          r = reduceAll(n.members, cbs!, r);
          break;
        case Syntax.EnumDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduceAll(n.members, cbs!, r);
          break;
        case Syntax.ModuleDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.body, cb, r);
          break;
        case Syntax.ModuleBlock:
          r = reduceAll(n.statements, cbs!, r);
          break;
        case Syntax.CaseBlock:
          r = reduceAll(n.clauses, cbs!, r);
          break;
        case Syntax.ImportEqualsDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
          r = reduce(n.name, cb, r);
          r = reduce(n.moduleReference, cb, r);
          break;
        case Syntax.ImportDeclaration:
          r = reduceAll(n.decorators, cbs!, r);
          r = reduceAll(n.modifiers, cbs!, r);
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
          r = reduceAll(n.elems, cbs!, r);
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
          r = reduceAll(n.properties, cbs!, r);
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
          r = reduceAll(n.statements, cbs!, r);
          break;
        case Syntax.HeritageClause:
          r = reduceAll(n.types, cbs!, r);
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
          r = reduceAll(n.statements, cbs!, r);
          break;
        case Syntax.PartiallyEmittedExpression:
          r = reduce(n.expression, cb, r);
          break;
        case Syntax.CommaListExpression:
          r = reduceAll(n.elems, cbs!, r);
          break;
        default:
          break;
      }
      return r;
    }
  })());
}
export interface Fvisit extends ReturnType<typeof newVisit> {}
function addValueAssignments(ps: Nodes<qt.ParamDeclaration>, c: qt.TrafoContext) {
  let r: qt.ParamDeclaration[] | undefined;
  const forBindingPattern = (p: qc.ParamDeclaration) => {
    c.addInitializationStatement(
      new qc.VariableStatement(
        undefined,
        new qc.VariableDeclarationList([
          new qc.VariableDeclaration(
            p.name,
            p.type,
            p.initer
              ? new qc.ConditionalExpression(qf.make.strictEquality(qf.get.generatedNameForNode(p), qc.VoidExpression.zero()), p.initer, qf.get.generatedNameForNode(p))
              : qf.get.generatedNameForNode(p)
          ),
        ])
      )
    );
    return p.update(p.decorators, p.modifiers, p.dot3Token, qf.get.generatedNameForNode(p), p.questionToken, p.type, undefined);
  };
  const forIniter = (p: qc.ParamDeclaration, name: qt.Identifier, init: qt.Expression) => {
    c.addInitializationStatement(
      new qc.IfStatement(
        qf.make.typeCheck(qf.make.synthesizedClone(name), 'undefined'),
        qf.emit.setFlags(
          new qc.Block([
            new qc.ExpressionStatement(
              qf.emit.setFlags(
                qf.create
                  .assignment(qf.emit.setFlags(qf.make.mutableClone(name), EmitFlags.NoSourceMap), qf.emit.setFlags(init, EmitFlags.NoSourceMap | qf.get.emitFlags(init) | EmitFlags.NoComments))
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
  };
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const n = p.dot3Token ? p : p.name.kind === Syntax.BindingPattern ? forBindingPattern(p) : p.initer ? forIniter(p, p.name, p.initer) : p;
    if (r || n !== p) {
      if (!r) r = ps.slice(0, i);
      r[i] = n;
    }
  }
  if (r) return new qb.Nodes(r, ps.trailingComma).setRange(ps);
  return ps;
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
      if (qf.type.is.object(t)) {
        const objectType = t as qt.ObjectType;
        const objectFlags = objectType.objectFlags;
        if (objectFlags & ObjectFlags.Reference) visitTypeReference(t as qt.TypeReference);
        if (objectFlags & ObjectFlags.Mapped) visitMappedType(t as qt.MappedType);
        if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) visitInterfaceType(t as qt.InterfaceType);
        if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) visitObjectType(objectType);
      }
      if (qf.type.is.param(t)) visitTypeParam(t);
      if (qf.type.is.unionOrIntersection(t)) visitUnionOrIntersectionType(t);
      if (qf.type.is.index(t)) visitIndexType(t);
      if (qf.type.is.indexedAccess(t)) visitIndexedAccessType(t);
    }
    function visitTypeReference(t: qt.TypeReference) {
      visitType(t.target);
      qf.each.up(getTypeArgs(t), visitType);
    }
    function visitTypeParam(t: qt.TypeParam) {
      visitType(qf.get.constraintOfTypeParam(t));
    }
    function visitUnionOrIntersectionType(t: qt.UnionOrIntersectionType) {
      qf.each.up(t.types, visitType);
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
      qf.each.up(signature.typeParams, visitType);
      for (const param of signature.params) {
        visitSymbol(param);
      }
      visitType(getRestTypeOfSignature(signature));
      visitType(qf.get.returnTypeOfSignature(signature));
    }
    function visitInterfaceType(interfaceT: qt.InterfaceType) {
      visitObjectType(interfaceT);
      qf.each.up(interfaceT.typeParams, visitType);
      qf.each.up(getBaseTypes(interfaceT), visitType);
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
      qf.each.up(s.declarations, (d) => {
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
