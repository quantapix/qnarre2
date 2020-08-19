import { CheckFlags, FlowFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Signature, Symbol, Type, TypeParam, TypeReference } from './types';
import { Fcheck } from './check';
import { Fget } from './get';
import { Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';
export interface Fis extends qc.Fis {}
export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
    skip: qc.Fskip;
  }
  const qf = f as Frame;
  interface _Fis extends qc.Fis {}
  class _Fis extends qu.Fis {}
  qu.addMixins(_Fis, [qc.newIs(qf)]);
  return (qf.is = new (class extends _Fis {
    deferredContext(n: Node, last?: Node) {
      if (n.kind !== Syntax.ArrowFunction && n.kind !== Syntax.FunctionExpression) {
        return (
          n.kind === Syntax.TypingQuery ||
          ((this.functionLikeDeclaration(n) || (n.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(n, ModifierFlags.Static))) && (!last || last !== n.name))
        );
      }
      if (last && last === n.name) return false;
      if (n.asteriskToken || qf.has.syntacticModifier(n, ModifierFlags.Async)) return true;
      return !qf.get.immediatelyInvokedFunctionExpression(n);
    }
    docInSignature(n: qt.TypingReference | qt.ExpressionWithTypings) {
      return (
        n.kind === Syntax.TypingReference &&
        n.typeName.kind === Syntax.Identifier &&
        n.typeName.escapedText === 'Object' &&
        n.typeArgs &&
        n.typeArgs.length === 2 &&
        (n.typeArgs[0].kind === Syntax.StringKeyword || n.typeArgs[0].kind === Syntax.NumberKeyword)
      );
    }
    decoratable(n: qt.ClassDeclaration): true;
    decoratable(n: qt.ClassElem, p?: Node): boolean;
    decoratable(n: Node, p: Node, grandp: Node): boolean;
    decoratable(n: Node | qt.ClassElem, p?: Node, grandp?: Node) {
      if (this.namedDeclaration(n) && n.name.kind === Syntax.PrivateIdentifier) return false;
      switch (n.kind) {
        case Syntax.ClassDeclaration:
          return true;
        case Syntax.PropertyDeclaration:
          return p?.kind === Syntax.ClassDeclaration;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.MethodDeclaration:
          return n.body !== undefined && p?.kind === Syntax.ClassDeclaration;
        case Syntax.Param:
          return p?.body !== undefined && (p?.kind === Syntax.Constructor || p?.kind === Syntax.MethodDeclaration || p?.kind === Syntax.SetAccessor) && grandp?.kind === Syntax.ClassDeclaration;
      }
      return false;
    }
    decorated(n: qt.ClassDeclaration): boolean;
    decorated(n: qt.ClassElem, p?: Node): boolean;
    decorated(n: Node, p: Node, grandp: Node): boolean;
    decorated(n: Node | qt.ClassElem, p?: Node, grandp?: Node) {
      return n.decorators !== undefined && this.decoratable(n, p!, grandp!);
    }
    blockScopedNameDeclaredBeforeUse(d: qt.Declaration, usage: Node): boolean {
      const dFile = d.sourceFile;
      const useFile = usage.sourceFile;
      const declContainer = qf.get.enclosingBlockScopeContainer(d);
      const isUsedInFunctionOrInstanceProperty = () => {
        return !!qc.findAncestor(usage, (n) => {
          if (n === declContainer) return 'quit';
          if (this.functionLike(n)) return true;
          const i = n.parent?.kind === Syntax.PropertyDeclaration && n.parent.initer === n;
          if (i) {
            if (qf.has.syntacticModifier(n.parent!, ModifierFlags.Static)) {
              if (d.kind === Syntax.MethodDeclaration) return true;
            } else {
              const p = d.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(d, ModifierFlags.Static);
              if (!p || qf.get.containingClass(usage) !== qf.get.containingClass(d)) return true;
            }
          }
          return false;
        });
      };
      if (dFile !== useFile) {
        if (
          (moduleKind && (dFile.externalModuleIndicator || useFile.externalModuleIndicator)) ||
          (!compilerOpts.outFile && !compilerOpts.out) ||
          this.inTypeQuery(usage) ||
          d.flags & NodeFlags.Ambient
        ) {
          return true;
        }
        if (isUsedInFunctionOrInstanceProperty()) return true;
        const sourceFiles = host.getSourceFiles();
        return sourceFiles.indexOf(dFile) <= sourceFiles.indexOf(useFile);
      }
      const isPropertyImmediatelyReferencedWithinDeclaration = (d: qt.PropertyDeclaration | qt.ParamPropertyDeclaration, stop: boolean) => {
        if (usage.end > d.end) return false;
        const changer = qc.findAncestor(usage, (n: Node) => {
          if (n === d) return 'quit';
          switch (n.kind) {
            case Syntax.ArrowFunction:
              return true;
            case Syntax.PropertyDeclaration:
              return stop && ((d.kind === Syntax.PropertyDeclaration && n.parent === d.parent) || (this.paramPropertyDeclaration(d, d.parent) && n.parent === d.parent?.parent)) ? 'quit' : true;
            case Syntax.Block:
              switch (n.parent?.kind) {
                case Syntax.GetAccessor:
                case Syntax.MethodDeclaration:
                case Syntax.SetAccessor:
                  return true;
              }
          }
          return false;
        });
        return changer === undefined;
      };
      if (d.pos <= usage.pos && !(d.kind === Syntax.PropertyDeclaration && this.thisProperty(usage.parent) && !d.initer && !d.exclamationToken)) {
        if (d.kind === Syntax.BindingElem) {
          const errorBindingElem = qf.get.ancestor(usage, Syntax.BindingElem) as qt.BindingElem;
          if (errorBindingElem) return qc.findAncestor(errorBindingElem, qt.BindingElem.kind) !== qc.findAncestor(d, qt.BindingElem.kind) || d.pos < errorBindingElem.pos;
          return this.blockScopedNameDeclaredBeforeUse(qf.get.ancestor(d, Syntax.VariableDeclaration) as qt.Declaration, usage);
        } else if (d.kind === Syntax.VariableDeclaration) {
          const isImmediatelyUsedInIniterOfBlockScopedVariable = () => {
            switch (d.parent?.parent?.kind) {
              case Syntax.VariableStatement:
              case Syntax.ForStatement:
              case Syntax.ForOfStatement:
                if (this.sameScopeDescendentOf(usage, d, declContainer)) return true;
                break;
            }
            const p = d.parent?.parent;
            return qf.check.forInOrOfStatement(p) && this.sameScopeDescendentOf(usage, p?.expression, declContainer);
          };
          return !isImmediatelyUsedInIniterOfBlockScopedVariable();
        } else if (d.kind === Syntax.ClassDeclaration) {
          return !qc.findAncestor(usage, (n) => n.kind === Syntax.ComputedPropertyName && n.parent?.parent === d);
        } else if (d.kind === Syntax.PropertyDeclaration) {
          return !isPropertyImmediatelyReferencedWithinDeclaration(d, false);
        } else if (this.paramPropertyDeclaration(d, d.parent)) {
          return !(
            compilerOpts.target === qt.ScriptTarget.ESNext &&
            !!compilerOpts.useDefineForClassFields &&
            qf.get.containingClass(d) === qf.get.containingClass(usage) &&
            isUsedInFunctionOrInstanceProperty()
          );
        }
        return true;
      }
      if (usage.parent?.kind === Syntax.ExportSpecifier || (usage.parent?.kind === Syntax.ExportAssignment && usage.parent.isExportEquals)) return true;
      if (usage.kind === Syntax.ExportAssignment && usage.isExportEquals) return true;
      const usageInTypeDeclaration = () => {
        return !!qc.findAncestor(usage, (n) => n.kind === Syntax.InterfaceDeclaration || n.kind === Syntax.TypeAliasDeclaration);
      };
      if (!!(usage.flags & NodeFlags.Doc) || this.inTypeQuery(usage) || usageInTypeDeclaration()) return true;
      if (isUsedInFunctionOrInstanceProperty()) {
        if (
          compilerOpts.target === qt.ScriptTarget.ESNext &&
          !!compilerOpts.useDefineForClassFields &&
          qf.get.containingClass(d) &&
          (d.kind === Syntax.PropertyDeclaration || this.paramPropertyDeclaration(d, d.parent))
        ) {
          return !isPropertyImmediatelyReferencedWithinDeclaration(d, true);
        }
        return true;
      }
      return false;
    }
    primitiveTypeName(n: qu.__String) {
      return n === 'any' || n === 'string' || n === 'number' || n === 'boolean' || n === 'never' || n === 'unknown';
    }
    es2015OrLaterConstructorName(n: qu.__String) {
      switch (n) {
        case 'Promise':
        case 'Symbol':
        case 'Map':
        case 'WeakMap':
        case 'Set':
        case 'WeakSet':
          return true;
      }
      return false;
    }
    sameScopeDescendentOf(n: Node, p: Node | undefined, stopAt: Node) {
      return !!p && !!qc.findAncestor(n, (n) => (n === stopAt || this.functionLike(n) ? 'quit' : n === p));
    }
    aliasableOrJsExpression(e: qt.Expression) {
      return this.aliasableExpression(e) || (e.kind === Syntax.FunctionExpression && this.jsConstructor(e));
    }
    syntacticDefault(n: Node) {
      return (n.kind === Syntax.ExportAssignment && !n.isExportEquals) || qf.has.syntacticModifier(n, ModifierFlags.Default) || n.kind === Syntax.ExportSpecifier;
    }
    entityNameVisible(entityName: qt.EntityNameOrEntityNameExpression, enclosingDeclaration: Node): SymbolVisibilityResult {
      let meaning: SymbolFlags;
      if (entityName.parent.kind === Syntax.TypingQuery || this.expressionWithTypeArgsInClassExtendsClause(entityName.parent) || entityName.parent.kind === Syntax.ComputedPropertyName)
        meaning = SymbolFlags.Value | SymbolFlags.ExportValue;
      else if (entityName.kind === Syntax.QualifiedName || entityName.kind === Syntax.PropertyAccessExpression || entityName.parent.kind === Syntax.ImportEqualsDeclaration) {
        meaning = SymbolFlags.Namespace;
      } else {
        meaning = SymbolFlags.Type;
      }
      const firstIdentifier = qf.get.firstIdentifier(entityName);
      const s = resolveName(enclosingDeclaration, firstIdentifier.escapedText, meaning, undefined, undefined, false);
      return (
        (s && hasVisibleDeclarations(s, true)) || {
          accessibility: SymbolAccessibility.NotAccessible,
          errorSymbolName: qf.get.textOf(firstIdentifier),
          errorNode: firstIdentifier,
        }
      );
    }
    topLevelInExternalModuleAugmentation(n?: Node) {
      return n?.parent?.kind === Syntax.ModuleBlock && this.externalModuleAugmentation(n.parent.parent);
    }
    defaultBindingContext(n: Node) {
      return n.kind === Syntax.SourceFile || this.ambientModule(n);
    }
    declarationVisible(n: Node): boolean {
      if (n) {
        const ls = qf.get.nodeLinks(n);
        const determineIfDeclarationIsVisible = () => {
          switch (n.kind) {
            case Syntax.DocCallbackTag:
            case Syntax.DocEnumTag:
            case Syntax.DocTypedefTag:
              return !!(n.parent && n.parent.parent && n.parent.parent.parent && n.parent.parent.parent.kind === Syntax.SourceFile);
            case Syntax.BindingElem:
              return this.declarationVisible(n.parent.parent);
            case Syntax.VariableDeclaration:
              if (n.name.kind === Syntax.BindingPattern && !n.name.elems.length) return false;
            case Syntax.ClassDeclaration:
            case Syntax.EnumDeclaration:
            case Syntax.FunctionDeclaration:
            case Syntax.ImportEqualsDeclaration:
            case Syntax.InterfaceDeclaration:
            case Syntax.ModuleDeclaration:
            case Syntax.TypeAliasDeclaration:
              if (this.externalModuleAugmentation(n)) return true;
              const p = getDeclarationContainer(n);
              if (
                !(qf.get.combinedModifierFlags(n as qt.Declaration) & ModifierFlags.Export) &&
                !(n.kind !== Syntax.ImportEqualsDeclaration && p.kind !== Syntax.SourceFile && p.flags & NodeFlags.Ambient)
              ) {
                return this.globalSourceFile(p);
              }
              return this.declarationVisible(p);
            case Syntax.GetAccessor:
            case Syntax.MethodDeclaration:
            case Syntax.MetSignature:
            case Syntax.PropertyDeclaration:
            case Syntax.PropeSignature:
            case Syntax.SetAccessor:
              if (qf.has.effectiveModifier(n, ModifierFlags.Private | ModifierFlags.Protected)) return false;
            case Syntax.ArrayTyping:
            case Syntax.CSignature:
            case Syntax.Constructor:
            case Syntax.ConstructorTyping:
            case Syntax.ConstrSignature:
            case Syntax.FunctionTyping:
            case Syntax.InSignature:
            case Syntax.IntersectionTyping:
            case Syntax.ModuleBlock:
            case Syntax.NamedTupleMember:
            case Syntax.Param:
            case Syntax.ParenthesizedTyping:
            case Syntax.TupleTyping:
            case Syntax.TypingLiteral:
            case Syntax.TypingReference:
            case Syntax.UnionTyping:
              return this.declarationVisible(n.parent);
            case Syntax.ImportClause:
            case Syntax.ImportSpecifier:
            case Syntax.NamespaceImport:
              return false;
            case Syntax.NamespaceExportDeclaration:
            case Syntax.SourceFile:
            case Syntax.TypeParam:
              return true;
            case Syntax.ExportAssignment:
              return false;
            default:
              return false;
          }
        };
        if (ls.isVisible === undefined) ls.isVisible = !!determineIfDeclarationIsVisible();
        return ls.isVisible;
      }
      return false;
    }
    nodewithType(t: qt.TypeSystemEntity, propertyName: qt.TypeSystemPropertyName): boolean {
      switch (propertyName) {
        case qt.TypeSystemPropertyName.Type:
          return !!t.links.type;
        case qt.TypeSystemPropertyName.EnumTagType:
          return !!qf.get.nodeLinks(t as qt.DocEnumTag).resolvedEnumType;
        case qt.TypeSystemPropertyName.DeclaredType:
          return !!t.links.declaredType;
        case qt.TypeSystemPropertyName.ResolvedBaseConstructorType:
          return !!t.resolvedBaseConstructorType;
        case qt.TypeSystemPropertyName.ResolvedReturnType:
          return !!t.resolvedReturn;
        case qt.TypeSystemPropertyName.ImmediateBaseConstraint:
          return !!t.immediateBaseConstraint;
        case qt.TypeSystemPropertyName.ResolvedTypeArgs:
          return !!(t as TypeReference).resolvedTypeArgs;
      }
      return qc.assert.never(propertyName);
    }
    nullOrUndefined(n: qt.Expression) {
      const e = qf.skip.parentheses(n);
      return e.kind === Syntax.NullKeyword || (e.kind === Syntax.Identifier && getResolvedSymbol(e) === undefinedSymbol);
    }
    emptyArrayLiteral(n: qt.Expression | Node) {
      const e = qf.skip.parentheses(n);
      return e.kind === Syntax.ArrayLiteralExpression && e.elems.length === 0;
    }
    declarationInConstructor(e: qt.Expression) {
      const n = qf.get.thisContainer(e, false);
      return n.kind === Syntax.Constructor || n.kind === Syntax.FunctionDeclaration || (n.kind === Syntax.FunctionExpression && !this.prototypePropertyAssignment(n.parent));
    }
    stringConcatExpression(e: Node): boolean {
      if (this.stringLiteralLike(e)) return true;
      else if (e.kind === Syntax.BinaryExpression) return this.stringConcatExpression(e.left) && this.stringConcatExpression(e.right);
      return false;
    }
    literalEnumMember(member: qt.EnumMember) {
      const e = member.initer;
      if (!e) return !(member.flags & NodeFlags.Ambient);
      switch (e.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.NoSubstitutionLiteral:
          return true;
        case Syntax.PrefixUnaryExpression:
          return e.operator === Syntax.MinusToken && e.operand.kind === Syntax.NumericLiteral;
        case Syntax.Identifier:
          return this.missing(e) || !!qf.get.symbolOfNode(member.parent).exports!.get(e.escapedText);
        case Syntax.BinaryExpression:
          return this.stringConcatExpression(e);
        default:
          return false;
      }
    }
    thislessType(n: qt.Typing): boolean {
      switch (n.kind) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.VoidKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NullKeyword:
        case Syntax.NeverKeyword:
        case Syntax.LiteralTyping:
          return true;
        case Syntax.ArrayTyping:
          return this.thislessType(n.elemType);
        case Syntax.TypingReference:
          return !(n as qt.TypingReference).typeArgs || (n as qt.TypingReference).typeArgs!.every(this.thislessType);
      }
      return false;
    }
    thislessTypeParam(n: qt.TypeParamDeclaration) {
      const c = qf.get.effectiveConstraintOfTypeParam(n);
      return !c || this.thislessType(c);
    }
    thislessVariableLikeDeclaration(n: qt.VariableLikeDeclaration): boolean {
      const t = qf.get.effectiveTypeAnnotationNode(n);
      return t ? this.thislessType(t) : !this.withIniter(n);
    }
    thislessFunctionLikeDeclaration(n: qt.FunctionLikeDeclaration): boolean {
      const t = qf.get.effectiveReturnTypeNode(n);
      const ps = qf.get.effectiveTypeParamDeclarations(n);
      return (n.kind === Syntax.Constructor || (!!t && this.thislessType(t))) && n.params.every(this.thislessVariableLikeDeclaration) && ps.every(this.thislessTypeParam);
    }
    lateBindableName(n: qt.DeclarationName): n is qt.LateBoundName {
      if (n.kind !== Syntax.ComputedPropertyName && n.kind !== Syntax.ElemAccessExpression) return false;
      const e = n.kind === Syntax.ComputedPropertyName ? n.expression : n.argExpression;
      return this.entityNameExpression(e) && this.usableAsPropertyName(n.kind === Syntax.ComputedPropertyName ? check.computedPropertyName(n) : check.expressionCached(e));
    }
    lateBoundName(name: qu.__String): boolean {
      return (name as string).charCodeAt(0) === qy.Codes._ && (name as string).charCodeAt(1) === qy.Codes._ && (name as string).charCodeAt(2) === qy.Codes.at;
    }
    nonBindableDynamicName(n: qt.DeclarationName) {
      return this.dynamicName(n) && !this.lateBindableName(n);
    }
    mappedTypeWithKeyofConstraintDeclaration(t: qt.MappedType) {
      const constraintDeclaration = getConstraintDeclarationForMappedType(t)!;
      return constraintDeclaration.kind === Syntax.TypingOperator && constraintDeclaration.operator === Syntax.KeyOfKeyword;
    }
    docOptionalParam(n: qt.ParamDeclaration) {
      return (
        this.inJSFile(n) &&
        ((n.type && n.type.kind === Syntax.DocOptionalTyping) ||
          qf.get.doc.paramTags(n).some(({ isBracketed, typeExpression }) => isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalTyping)))
      );
    }
    optionalParam(n: qt.ParamDeclaration | qt.DocParamTag) {
      if (qf.has.questionToken(n) || this.optionalDocParamTag(n) || this.docOptionalParam(n)) return true;
      if (n.initer) {
        const signature = qf.get.signatureFromDeclaration(n.parent);
        const paramIndex = n.parent.params.indexOf(n);
        qf.assert.true(paramIndex >= 0);
        return paramIndex >= getMinArgCount(signature, true);
      }
      const iife = qf.get.immediatelyInvokedFunctionExpression(n.parent);
      if (iife) return !n.type && !n.dot3Token && n.parent.params.indexOf(n) >= iife.args.length;
      return false;
    }
    optionalDocParamTag(n: Node): n is qt.DocParamTag {
      if (n.kind !== Syntax.DocParamTag) return false;
      const { isBracketed, typeExpression } = n;
      return isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalTyping);
    }
    unaryTupleTyping(n: qt.Typing) {
      return n.kind === Syntax.TupleTyping && n.elems.length === 1;
    }
    docTypeReference(n: Node): n is qt.TypingReference {
      return !!(n.flags & NodeFlags.Doc) && (n.kind === Syntax.TypingReference || n.kind === Syntax.ImportTyping);
    }
    tupleRestElem(n: qt.Typing) {
      return n.kind === Syntax.RestTyping || (n.kind === Syntax.NamedTupleMember && !!(n as qt.NamedTupleMember).dot3Token);
    }
    tupleOptionalElem(n: qt.Typing) {
      return n.kind === Syntax.OptionalTyping || (n.kind === Syntax.NamedTupleMember && !!(n as qt.NamedTupleMember).questionToken);
    }
    deferredTypingReference(n: qt.TypingReference | qt.ArrayTyping | qt.TupleTyping, hasDefaultTypeArgs?: boolean) {
      return (
        !!getAliasSymbolForTypeNode(n) ||
        (this.resolvedByTypeAlias(n) &&
          (n.kind === Syntax.ArrayTyping
            ? mayResolveTypeAlias(n.elemType)
            : n.kind === Syntax.TupleTyping
            ? qu.some(n.elems, mayResolveTypeAlias)
            : hasDefaultTypeArgs || qu.some(n.typeArgs, mayResolveTypeAlias)))
      );
    }
    resolvedByTypeAlias(n: Node): boolean {
      const p = n.parent;
      switch (p?.kind) {
        case Syntax.ArrayTyping:
        case Syntax.ConditionalTyping:
        case Syntax.IndexedAccessTyping:
        case Syntax.IntersectionTyping:
        case Syntax.NamedTupleMember:
        case Syntax.ParenthesizedTyping:
        case Syntax.TupleTyping:
        case Syntax.TypingOperator:
        case Syntax.TypingReference:
        case Syntax.UnionTyping:
          return this.resolvedByTypeAlias(p);
        case Syntax.TypeAliasDeclaration:
          return true;
      }
      return false;
    }
    readonlyTypeOperator(n: Node) {
      return n.kind === Syntax.TypingOperator && n.operator === Syntax.ReadonlyKeyword;
    }
    typeParamPossiblyReferenced(tp: TypeParam, node: Node) {
      if (tp.symbol && tp.symbol.declarations && tp.symbol.declarations.length === 1) {
        const container = tp.symbol.declarations[0].parent;
        const containsReference = (n: Node): boolean => {
          switch (n.kind) {
            case Syntax.ThisTyping:
              return !!tp.isThisType;
            case Syntax.Identifier:
              return !tp.isThisType && this.partOfTypeNode(n) && maybeTypeParamReference(n) && qf.get.typeFromTypeNodeWorker(<qt.Typing>n) === tp;
            case Syntax.TypingQuery:
              return true;
          }
          return !!qf.each.child(n, containsReference);
        };
        for (let n = node; n !== container; n = n.parent) {
          if (!n || n.kind === Syntax.Block || (n.kind === Syntax.ConditionalTyping && qf.each.child(n.extendsType, containsReference))) return true;
        }
        return !!qf.each.child(n, containsReference);
      }
      return true;
    }
    contextSensitive(n: qt.Expression | qt.MethodDeclaration | qt.ObjectLiteralElemLike | qt.JsxAttributeLike | qt.JsxChild): boolean {
      qf.assert.true(n.kind !== Syntax.MethodDeclaration || this.objectLiteralMethod(n));
      switch (n.kind) {
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
        case Syntax.FunctionDeclaration:
          return this.contextSensitiveFunctionLikeDeclaration(<qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration>n);
        case Syntax.ObjectLiteralExpression:
          return qu.some(n.properties, this.contextSensitive);
        case Syntax.ArrayLiteralExpression:
          return qu.some(n.elems, this.contextSensitive);
        case Syntax.ConditionalExpression:
          return this.contextSensitive(n.whenTrue) || this.contextSensitive(n.whenFalse);
        case Syntax.BinaryExpression:
          return (n.operatorToken.kind === Syntax.Bar2Token || n.operatorToken.kind === Syntax.Question2Token) && (this.contextSensitive(n.left) || this.contextSensitive(n.right));
        case Syntax.PropertyAssignment:
          return this.contextSensitive(n.initer);
        case Syntax.ParenthesizedExpression:
          return this.contextSensitive(n.expression);
        case Syntax.JsxAttributes:
          return qu.some(n.properties, this.contextSensitive) || (n.parent.kind === Syntax.JsxOpeningElem && qu.some(n.parent.parent.children, this.contextSensitive));
        case Syntax.JsxAttribute:
          const { initer } = n as qt.JsxAttribute;
          return !!initer && this.contextSensitive(initer);
        case Syntax.JsxExpression:
          const { expression } = n as qt.JsxExpression;
          return !!expression && this.contextSensitive(expression);
      }
      return false;
    }
    contextSensitiveFunctionLikeDeclaration(n: qt.FunctionLikeDeclaration): boolean {
      return (!n.kind === Syntax.FunctionDeclaration || (this.inJSFile(n) && !!getTypeForDeclarationFromDocComment(n))) && (hasContextSensitiveParams(n) || hasContextSensitiveReturnExpression(n));
    }
    contextSensitiveFunctionOrObjectLiteralMethod(n: Node): n is qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration {
      return ((this.inJSFile(n) && n.kind === Syntax.FunctionDeclaration) || isFunctionExpressionOrArrowFunction(n) || this.objectLiteralMethod(n)) && this.contextSensitiveFunctionLikeDeclaration(n);
    }
    emptyResolvedType(t: qt.ResolvedType) {
      return t !== anyFunctionType && t.properties.length === 0 && t.cSignatures.length === 0 && t.constrSignatures.length === 0 && !t.stringIndexInfo && !t.numberIndexInfo;
    }
    zeroBigInt({ value }: qt.BigIntLiteralType) {
      return value.base10Value === '0';
    }
    inTypeQuery(n: Node): boolean {
      return !!qc.findAncestor(n, (n) => (n.kind === Syntax.TypingQuery ? true : n.kind === Syntax.Identifier || n.kind === Syntax.QualifiedName ? false : 'quit'));
    }
    matchingReference(s: Node, t: Node): boolean {
      switch (t.kind) {
        case Syntax.ParenthesizedExpression:
        case Syntax.NonNullExpression:
          return this.matchingReference(s, (t as qt.NonNullExpression | qt.ParenthesizedExpression).expression);
      }
      switch (s.kind) {
        case Syntax.Identifier:
          return (
            (t.kind === Syntax.Identifier && getResolvedSymbol(s) === getResolvedSymbol(t)) ||
            ((t.kind === Syntax.VariableDeclaration || t.kind === Syntax.BindingElem) && getExportSymbolOfValueSymbolIfExported(getResolvedSymbol(s)) === qf.get.symbolOfNode(t))
          );
        case Syntax.ThisKeyword:
          return t.kind === Syntax.ThisKeyword;
        case Syntax.SuperKeyword:
          return t.kind === Syntax.SuperKeyword;
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
          return this.matchingReference((s as qt.NonNullExpression | qt.ParenthesizedExpression).expression, t);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          return (
            this.accessExpression(t) && getAccessedPropertyName(<qt.AccessExpression>s) === getAccessedPropertyName(t) && this.matchingReference((<qt.AccessExpression>s).expression, t.expression)
          );
      }
      return false;
    }
    orContainsMatchingReference(s: Node, t: Node) {
      return this.matchingReference(s, t) || containsMatchingReference(s, t);
    }
    destructuringAssignmentTarget(p: Node) {
      return (p.parent.kind === Syntax.BinaryExpression && (p.parent as qt.BinaryExpression).left === p) || (p.parent.kind === Syntax.ForOfStatement && (p.parent as qt.ForOfStatement).initer === p);
    }
    emptyArrayAssignment(n: qt.VariableDeclaration | qt.BindingElem | qt.Expression) {
      return (
        (n.kind === Syntax.VariableDeclaration && n.initer && this.emptyArrayLiteral(n.initer!)) ||
        (n.kind !== Syntax.BindingElem && n.parent.kind === Syntax.BinaryExpression && this.emptyArrayLiteral(n.parent.right))
      );
    }
    incomplete(flowType: qt.FlowType) {
      return flowType.flags === 0;
    }
    evolvingArrayOperationTarget(n: Node) {
      const root = getReferenceRoot(n);
      const p = root.parent;
      const isLengthPushOrUnshift =
        p.kind === Syntax.PropertyAccessExpression &&
        (p.name.escapedText === 'length' || (p.parent.kind === Syntax.CallExpression && p.name.kind === Syntax.Identifier && this.pushOrUnshiftIdentifier(p.name)));
      const isElemAssignment =
        p.kind === Syntax.ElemAccessExpression &&
        p.expression === root &&
        p.parent.kind === Syntax.BinaryExpression &&
        p.parent.operatorToken.kind === Syntax.EqualsToken &&
        p.parent.left === p &&
        !this.assignmentTarget(p.parent) &&
        qf.type.is.assignableToKind(qf.get.typeOfExpression(p.argExpression), TypeFlags.NumberLike);
      return isLengthPushOrUnshift || isElemAssignment;
    }
    declarationWithExplicitTypeAnnotation(d: qt.Declaration) {
      return (
        (d.kind === Syntax.VariableDeclaration || d.kind === Syntax.Param || d.kind === Syntax.PropertyDeclaration || d.kind === Syntax.PropeSignature) &&
        !!qf.get.effectiveTypeAnnotationNode(d as qt.VariableDeclaration | qt.ParamDeclaration | qt.PropertyDeclaration | qt.PropeSignature)
      );
    }
    reachableFlowNode(flow: qt.FlowNode) {
      const result = this.reachableFlowNodeWorker(flow, false);
      lastFlowNode = flow;
      lastFlowNodeReachable = result;
      return result;
    }
    falseExpression(e: qt.Expression): boolean {
      const n = qf.skip.parentheses(e);
      return (
        n.kind === Syntax.FalseKeyword ||
        (n.kind === Syntax.BinaryExpression &&
          ((n.operatorToken.kind === Syntax.Ampersand2Token && (this.falseExpression(n.left) || this.falseExpression(n.right))) ||
            (n.operatorToken.kind === Syntax.Bar2Token && this.falseExpression(n.left) && this.falseExpression(n.right))))
      );
    }
    reachableFlowNodeWorker(flow: qt.FlowNode, noCacheCheck: boolean): boolean {
      while (true) {
        if (flow === lastFlowNode) return lastFlowNodeReachable;
        const flags = flow.flags;
        if (flags & FlowFlags.Shared) {
          if (!noCacheCheck) {
            const id = getFlowNodeId(flow);
            const reachable = flowNodeReachable[id];
            return reachable !== undefined ? reachable : (flowNodeReachable[id] = this.reachableFlowNodeWorker(flow, true));
          }
          noCacheCheck = false;
        }
        if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation)) flow = (<qt.FlowAssignment | qt.FlowCondition | qt.FlowArrayMutation>flow).antecedent;
        else if (flags & FlowFlags.Call) {
          const signature = getEffeSignature((<qt.FlowCall>flow).n);
          if (signature) {
            const predicate = getTypePredicatSignature(signature);
            if (predicate && predicate.kind === TypePredicateKind.AssertsIdentifier) {
              const predicateArg = (<qt.FlowCall>flow).n.args[predicate.paramIndex];
              if (predicateArg && this.falseExpression(predicateArg)) return false;
            }
            if (qf.get.returnTypSignature(signature).flags & TypeFlags.Never) return false;
          }
          flow = (<qt.FlowCall>flow).antecedent;
        } else if (flags & FlowFlags.BranchLabel) {
          return qu.some((<qt.FlowLabel>flow).antecedents, (f) => this.reachableFlowNodeWorker(f, false));
        } else if (flags & FlowFlags.LoopLabel) {
          flow = (<qt.FlowLabel>flow).antecedents![0];
        } else if (flags & FlowFlags.SwitchClause) {
          if ((<qt.FlowSwitchClause>flow).clauseStart === (<qt.FlowSwitchClause>flow).clauseEnd && isExhaustiveSwitchStatement((<qt.FlowSwitchClause>flow).switchStatement)) return false;
          flow = (<qt.FlowSwitchClause>flow).antecedent;
        } else if (flags & FlowFlags.ReduceLabel) {
          lastFlowNode = undefined;
          const t = (<qt.FlowReduceLabel>flow).t;
          const saveAntecedents = t.antecedents;
          t.antecedents = (<qt.FlowReduceLabel>flow).antecedents;
          const result = this.reachableFlowNodeWorker((<qt.FlowReduceLabel>flow).antecedent, false);
          t.antecedents = saveAntecedents;
          return result;
        }
        return !(flags & FlowFlags.Unreachable);
      }
    }
    postSuperFlowNode(flow: qt.FlowNode, noCacheCheck: boolean): boolean {
      while (true) {
        const flags = flow.flags;
        if (flags & FlowFlags.Shared) {
          if (!noCacheCheck) {
            const id = getFlowNodeId(flow);
            const postSuper = flowNodePostSuper[id];
            return postSuper !== undefined ? postSuper : (flowNodePostSuper[id] = isPostSuperFlowNode(flow, true));
          }
          noCacheCheck = false;
        }
        if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation | FlowFlags.SwitchClause))
          flow = (<qt.FlowAssignment | qt.FlowCondition | qt.FlowArrayMutation | qt.FlowSwitchClause>flow).antecedent;
        else if (flags & FlowFlags.Call) {
          if ((<qt.FlowCall>flow).n.expression.kind === Syntax.SuperKeyword) return true;
          flow = (<qt.FlowCall>flow).antecedent;
        } else if (flags & FlowFlags.BranchLabel) {
          return qu.every((<qt.FlowLabel>flow).antecedents, (f) => isPostSuperFlowNode(f, false));
        } else if (flags & FlowFlags.LoopLabel) {
          flow = (<qt.FlowLabel>flow).antecedents![0];
        } else if (flags & FlowFlags.ReduceLabel) {
          const t = (<qt.FlowReduceLabel>flow).t;
          const saveAntecedents = t.antecedents;
          t.antecedents = (<qt.FlowReduceLabel>flow).antecedents;
          const result = isPostSuperFlowNode((<qt.FlowReduceLabel>flow).antecedent, false);
          t.antecedents = saveAntecedents;
          return result;
        }
        return !!(flags & FlowFlags.Unreachable);
      }
    }
    constraintPosition(n: Node) {
      const p = n.parent;
      return (
        p?.kind === Syntax.PropertyAccessExpression ||
        (p?.kind === Syntax.CallExpression && p.expression === n) ||
        (p?.kind === Syntax.ElemAccessExpression && p.expression === n) ||
        (p?.kind === Syntax.BindingElem && p.name === n && !!p.initer)
      );
    }
    exportOrExportExpression(n: Node) {
      return !!qc.findAncestor(n, (a) => a.parent?.kind === Syntax.ExportAssignment && a.parent.expression === a && this.entityNameExpression(a));
    }
    insideFunction(n: Node, threshold: Node): boolean {
      return !!qc.findAncestor(n, (n) => (n === threshold ? 'quit' : this.functionLike(n)));
    }
    bindingCapturedByNode(n: Node, decl: qt.VariableDeclaration | qt.BindingElem) {
      const links = qf.get.nodeLinks(n);
      return !!links && qu.contains(links.capturedBlockScopeBindings, qf.get.symbolOfNode(decl));
    }
    assignedInBodyOfForStatement(n: qt.Identifier, container: qt.ForStatement): boolean {
      let current: Node = n;
      while (current.parent.kind === Syntax.ParenthesizedExpression) {
        current = current.parent;
      }
      let assigned = false;
      if (this.assignmentTarget(current)) assigned = true;
      else if (current.parent.kind === Syntax.PrefixUnaryExpression || current.parent.kind === Syntax.PostfixUnaryExpression) {
        const e = <qt.PrefixUnaryExpression | qt.PostfixUnaryExpression>current.parent;
        assigned = e.operator === Syntax.Plus2Token || e.operator === Syntax.Minus2Token;
      }
      if (!assigned) return false;
      return !!qc.findAncestor(current, (n) => (n === container ? 'quit' : n === container.statement));
    }
    inConstructorArgIniter(n: Node, constructorDecl: Node): boolean {
      return !!qc.findAncestor(n, (n) => (this.functionLikeDeclaration(n) ? 'quit' : n.kind === Syntax.Param && n.parent === constructorDecl));
    }
    inParamIniterBeforeContainingFunction(n: Node) {
      let inBindingIniter = false;
      while (n.parent && !this.functionLike(n.parent)) {
        if (n.parent.kind === Syntax.Param && (inBindingIniter || n.parent.initer === n)) return true;
        if (n.parent.kind === Syntax.BindingElem && n.parent.initer === n) inBindingIniter = true;
        n = n.parent;
      }
      return false;
    }
    possiblyDiscriminantValue(n: qt.Expression): boolean {
      switch (n.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.NullKeyword:
        case Syntax.Identifier:
        case Syntax.UndefinedKeyword:
          return true;
        case Syntax.PropertyAccessExpression:
        case Syntax.ParenthesizedExpression:
          return this.possiblyDiscriminantValue((<qt.PropertyAccessExpression | qt.ParenthesizedExpression>n).expression);
        case Syntax.JsxExpression:
          return !(n as qt.JsxExpression).expression || this.possiblyDiscriminantValue((n as qt.JsxExpression).expression!);
      }
      return false;
    }
    functionExpressionOrArrowFunction(n: Node): n is qt.FunctionExpression | qt.ArrowFunction {
      return n.kind === Syntax.FunctionExpression || n.kind === Syntax.ArrowFunction;
    }
    numericName(name: qt.DeclarationName): boolean {
      switch (name.kind) {
        case Syntax.ComputedPropertyName:
          return this.numericComputedName(name);
        case Syntax.Identifier:
          return qt.NumericLiteral.name(name.escapedText);
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return qt.NumericLiteral.name(name.text);
        default:
          return false;
      }
    }
    numericComputedName(n: qt.ComputedPropertyName): boolean {
      return qf.type.is.assignableToKind(qf.check.computedPropertyName(n), TypeFlags.NumberLike);
    }
    jsxIntrinsicIdentifier(tagName: qt.JsxTagNameExpression): boolean {
      return tagName.kind === Syntax.Identifier && qy.is.intrinsicJsxName(tagName.escapedText);
    }
    methodAccessForCall(n: Node) {
      while (n.parent.kind === Syntax.ParenthesizedExpression) {
        n = n.parent;
      }
      return this.callOrNewExpression(n.parent) && n.parent.expression === n;
    }
    thisPropertyAccessInConstructor(n: qt.ElemAccessExpression | qt.PropertyAccessExpression | qt.QualifiedName, s: Symbol) {
      return this.thisProperty(n) && (this.autoTypedProperty(s) || this.constructorDeclaredProperty(s)) && qf.get.thisContainer(n, true) === getDeclaringConstructor(s);
    }
    inPropertyIniter(n: Node) {
      return !!qc.findAncestor(n, (n) => {
        switch (n.kind) {
          case Syntax.PropertyDeclaration:
            return true;
          case Syntax.PropertyAssignment:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.SpreadAssignment:
          case Syntax.ComputedPropertyName:
          case Syntax.TemplateSpan:
          case Syntax.JsxExpression:
          case Syntax.JsxAttribute:
          case Syntax.JsxAttributes:
          case Syntax.JsxSpreadAttribute:
          case Syntax.JsxOpeningElem:
          case Syntax.ExpressionWithTypings:
          case Syntax.HeritageClause:
            return false;
          default:
            return this.expressionNode(n) ? false : 'quit';
        }
      });
    }
    validPropertyAccess(n: qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTyping, propertyName: qu.__String): boolean {
      switch (n.kind) {
        case Syntax.PropertyAccessExpression:
          return this.validPropertyAccessWithType(n, n.expression.kind === Syntax.SuperKeyword, propertyName, qf.get.widenedType(check.expression(n.expression)));
        case Syntax.QualifiedName:
          return this.validPropertyAccessWithType(n, false, propertyName, qf.get.widenedType(check.expression(n.left)));
        case Syntax.ImportTyping:
          return this.validPropertyAccessWithType(n, false, propertyName, qf.get.typeFromTypeNode(n));
      }
    }
    validPropertyAccessForCompletions(n: qt.PropertyAccessExpression | qt.ImportTyping | qt.QualifiedName, t: Type, property: Symbol): boolean {
      return this.validPropertyAccessWithType(n, n.kind === Syntax.PropertyAccessExpression && n.expression.kind === Syntax.SuperKeyword, property.escName, t);
    }
    validPropertyAccessWithType(n: qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTyping, isSuper: boolean, propertyName: qu.__String, t: Type): boolean {
      if (t === errorType || this.any(t)) return true;
      const prop = qf.get.propertyOfType(t, propertyName);
      if (prop) {
        if (n.kind === Syntax.PropertyAccessExpression && this.privateIdentifierPropertyDeclaration(prop.valueDeclaration)) {
          const declClass = qf.get.containingClass(prop.valueDeclaration);
          return !this.optionalChain(n) && !!qc.findAncestor(n, (p) => p === declClass);
        }
        return check.propertyAccessibility(n, isSuper, t, prop);
      }
      return this.inJSFile(n) && (t.flags & TypeFlags.Union) !== 0 && t.types.some((elemType) => this.validPropertyAccessWithType(n, isSuper, propertyName, elemType));
    }
    forInVariableForNumericPropertyNames(exp: qt.Expression) {
      const e = qf.skip.parentheses(exp);
      if (e.kind === Syntax.Identifier) {
        const s = getResolvedSymbol(e);
        if (s.flags & SymbolFlags.Variable) {
          let child: Node = e;
          let n = e.parent;
          while (n) {
            if (n.kind === Syntax.ForInStatement && child === n.statement && getForInVariableSymbol(n) === s && hasNumericPropertyNames(qf.get.typeOfExpression(n.expression))) {
              return true;
            }
            child = n;
            n = n.parent;
          }
        }
      }
      return false;
    }
    spreadArg(n?: qt.Expression): n is qt.Expression {
      return !!n && (n.kind === Syntax.SpreadElem || (n.kind === Syntax.SyntheticExpression && n.isSpread));
    }
    potentiallyUncalledDecorator(d: qt.Decorator, ss: readonly Signature[]) {
      return ss.length && qu.every(ss, (s) => s.minArgCount === 0 && !s.hasRestParam(s) && s.params.length < getDecoratorArgCount(d, s));
    }
    jsConstructor(n?: Node): n is qt.FunctionDeclaration | qt.FunctionExpression {
      if (!n || !this.inJSFile(n)) return false;
      const func =
        n.kind === Syntax.FunctionDeclaration || n.kind === Syntax.FunctionExpression
          ? n
          : n.kind === Syntax.VariableDeclaration && n.initer && n.initer.kind === Syntax.FunctionExpression
          ? n.initer
          : undefined;
      if (func) {
        if (qf.get.doc.classTag(n)) return true;
        const s = qf.get.symbolOfNode(func);
        return !!s && qu.hasEntries(s.members);
      }
      return false;
    }
    symbolOrSymbolForCall(n: Node) {
      if (!n.kind === Syntax.CallExpression) return false;
      let left = n.expression;
      if (left.kind === Syntax.PropertyAccessExpression && left.name.escapedText === 'for') left = left.expression;
      if (!left.kind === Syntax.Identifier || left.escapedText !== 'Symbol') return false;
      const globalESSymbol = getGlobalESSymbolConstructorSymbol(false);
      if (!globalESSymbol) return false;
      return globalESSymbol === resolveName(left, 'Symbol' as qu.__String, SymbolFlags.Value, undefined, undefined, false);
    }
    commonJsRequire(n: Node): boolean {
      if (!this.requireCall(n, true)) return false;
      if (!n.expression.kind === Syntax.Identifier) return qu.fail();
      const resolvedRequire = resolveName(n.expression, n.expression.escapedText, SymbolFlags.Value, undefined, undefined, true)!;
      if (resolvedRequire === requireSymbol) return true;
      if (resolvedRequire.flags & SymbolFlags.Alias) return false;
      const targetDeclarationKind =
        resolvedRequire.flags & SymbolFlags.Function ? Syntax.FunctionDeclaration : resolvedRequire.flags & SymbolFlags.Variable ? Syntax.VariableDeclaration : Syntax.Unknown;
      if (targetDeclarationKind !== Syntax.Unknown) {
        const decl = resolvedRequire.declarationOfKind(targetDeclarationKind)!;
        return !!decl && !!(decl.flags & NodeFlags.Ambient);
      }
      return false;
    }
    validConstAssertionArg(n: Node): boolean {
      switch (n.kind) {
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.ArrayLiteralExpression:
        case Syntax.ObjectLiteralExpression:
          return true;
        case Syntax.ParenthesizedExpression:
          return isValidConstAssertionArg(n.expression);
        case Syntax.PrefixUnaryExpression:
          const op = n.operator;
          const arg = n.operand;
          return (op === Syntax.MinusToken && (arg.kind === Syntax.NumericLiteral || arg.kind === Syntax.BigIntLiteral)) || (op === Syntax.PlusToken && arg.kind === Syntax.NumericLiteral);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          const e = (<qt.PropertyAccessExpression | qt.ElemAccessExpression>n).expression;
          if (e.kind === Syntax.Identifier) {
            let s = getSymbolAtLocation(e);
            if (s && s.flags & SymbolFlags.Alias) s = this.resolveAlias();
            return !!(s && s.flags & SymbolFlags.Enum && getEnumKind(s) === qt.EnumKind.Literal);
          }
      }
      return false;
    }
    validDeclarationForTupleLabel(d: qt.Declaration): d is qt.NamedTupleMember | (ParamDeclaration & { name: qc.Identifier }) {
      return d.kind === Syntax.NamedTupleMember || (d.kind === Syntax.ParamDeclaration && d.name && d.name.kind === Syntax.Identifier);
    }
    exhaustiveSwitchStatement(n: qt.SwitchStatement): boolean {
      const links = qf.get.nodeLinks(n);
      return links.isExhaustive !== undefined ? links.isExhaustive : (links.isExhaustive = computeExhaustiveSwitchStatement(n));
    }
    readonlyAssignmentDeclaration(d: qt.Declaration) {
      if (!d.kind === Syntax.CallExpression) return false;
      if (!this.bindableObjectDefinePropertyCall(d)) return false;
      const objectLitType = check.expressionCached(d.args[2]);
      const valueType = qf.get.typeOfPropertyOfType(objectLitType, 'value' as qu.__String);
      if (valueType) {
        const writableProp = qf.get.propertyOfType(objectLitType, 'writable' as qu.__String);
        const writableType = writableProp && writableProp.typeOfSymbol();
        if (!writableType || writableType === falseType || writableType === regularFalseType) return true;
        if (writableProp && writableProp.valueDeclaration && writableProp.valueDeclaration.kind === Syntax.PropertyAssignment) {
          const initer = writableProp.valueDeclaration.initer;
          const rawOriginalType = check.expression(initer);
          if (rawOriginalType === falseType || rawOriginalType === regularFalseType) return true;
        }
        return false;
      }
      const setProp = qf.get.propertyOfType(objectLitType, 'set' as qu.__String);
      return !setProp;
    }
    assignmentToReadonlyEntity(e: qt.Expression, s: Symbol, assignmentKind: qt.AssignmentKind) {
      if (assignmentKind === qt.AssignmentKind.None) return false;
      if (isReadonlySymbol(s)) {
        if (s.flags & SymbolFlags.Property && this.accessExpression(e) && e.expression.kind === Syntax.ThisKeyword) {
          const ctor = qf.get.containingFunction(e);
          if (!(ctor && ctor.kind === Syntax.Constructor)) return true;
          if (s.valueDeclaration) {
            const isAssignmentDeclaration = s.valueDeclaration.kind === Syntax.BinaryExpression;
            const isLocalPropertyDeclaration = ctor.parent === s.valueDeclaration.parent;
            const isLocalParamProperty = ctor === s.valueDeclaration.parent;
            const isLocalThisPropertyAssignment = this.assignmentDeclaration && s.parent?.valueDeclaration === ctor.parent;
            const isLocalThisPropertyAssignmentConstructorFunction = this.assignmentDeclaration && s.parent?.valueDeclaration === ctor;
            const isWriteableSymbol = isLocalPropertyDeclaration || isLocalParamProperty || isLocalThisPropertyAssignment || isLocalThisPropertyAssignmentConstructorFunction;
            return !isWriteableSymbol;
          }
        }
        return true;
      }
      if (this.accessExpression(e)) {
        const n = qf.skip.parentheses(e.expression);
        if (n.kind === Syntax.Identifier) {
          const s = qf.get.nodeLinks(n).resolvedSymbol!;
          if (s.flags & SymbolFlags.Alias) {
            const d = s.getDeclarationOfAliasSymbol();
            return !!d && d.kind === Syntax.NamespaceImport;
          }
        }
      }
      return false;
    }
    topLevelAwait(n: qt.AwaitExpression) {
      const c = qf.get.thisContainer(n, true);
      return c.kind === Syntax.SourceFile;
    }
    sideEffectFree(n: Node): boolean {
      n = qf.skip.parentheses(n);
      switch (n.kind) {
        case Syntax.ArrayLiteralExpression:
        case Syntax.ArrowFunction:
        case Syntax.BigIntLiteral:
        case Syntax.ClassExpression:
        case Syntax.FalseKeyword:
        case Syntax.FunctionExpression:
        case Syntax.Identifier:
        case Syntax.JsxElem:
        case Syntax.JsxSelfClosingElem:
        case Syntax.NonNullExpression:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NullKeyword:
        case Syntax.NumericLiteral:
        case Syntax.ObjectLiteralExpression:
        case Syntax.RegexLiteral:
        case Syntax.StringLiteral:
        case Syntax.TaggedTemplateExpression:
        case Syntax.TemplateExpression:
        case Syntax.TrueKeyword:
        case Syntax.TypeOfExpression:
        case Syntax.UndefinedKeyword:
          return true;
        case Syntax.ConditionalExpression:
          return isSideEffectFree(n.whenTrue) && isSideEffectFree(n.whenFalse);
        case Syntax.BinaryExpression:
          if (qy.this.assignmentOperator((n as qt.BinaryExpression).operatorToken.kind)) return false;
          return isSideEffectFree((n as qt.BinaryExpression).left) && isSideEffectFree((n as qt.BinaryExpression).right);
        case Syntax.PostfixUnaryExpression:
        case Syntax.PrefixUnaryExpression:
          switch ((n as qt.PrefixUnaryExpression).operator) {
            case Syntax.ExclamationToken:
            case Syntax.MinusToken:
            case Syntax.PlusToken:
            case Syntax.TildeToken:
              return true;
          }
          return false;
        case Syntax.AsExpression:
        case Syntax.TypeAssertionExpression:
        case Syntax.VoidExpression:
        default:
          return false;
      }
    }
    nodekind(TypeAssertion, n: qt.Expression) {
      n = qf.skip.parentheses(n);
      return n.kind === Syntax.TypeAssertionExpression || n.kind === Syntax.AsExpression;
    }
    constContext(n: qt.Expression): boolean {
      const p = n.parent;
      return (
        (this.assertionExpression(p) && this.constTypeReference(p.type)) ||
        ((p.kind === Syntax.ParenthesizedExpression || isArrayLiteralExpression(p) || p.kind === Syntax.SpreadElem) && isConstContext(p)) ||
        ((p.kind === Syntax.PropertyAssignment || p.kind === Syntax.ShorthandPropertyAssignment) && isConstContext(p.parent))
      );
    }
    privateWithinAmbient(n: Node): boolean {
      return (qf.has.effectiveModifier(n, ModifierFlags.Private) || this.privateIdentifierPropertyDeclaration(n)) && !!(n.flags & NodeFlags.Ambient);
    }
    thenableType(t: Type): boolean {
      const thenFunction = qf.get.typeOfPropertyOfType(t, 'then' as qu.__String);
      return !!thenFunction && SignaturesOfType(getTypeWithFacts(thenFunction, TypeFacts.NEUndefinedOrNull), SignatureKind.Call).length > 0;
    }
    identifierThatStartsWithUnderscore(n: Node) {
      return n.kind === Syntax.Identifier && idText(n).charCodeAt(0) === qy.Codes._;
    }
    typeParamUnused(d: qt.TypeParamDeclaration) {
      return !(qf.get.mergedSymbol(d.symbol).referenced! & SymbolFlags.TypeParam) && !this.identifierThatStartsWithUnderscore(d.name);
    }
    validUnusedLocalDeclaration(d: qt.Declaration): boolean {
      if (d.kind === Syntax.BindingElem && this.identifierThatStartsWithUnderscore(d.name)) {
        return !!qc.findAncestor(d.parent, (ancestor) =>
          ancestor.kind === Syntax.ArrayBindingPattern || ancestor.kind === Syntax.VariableDeclaration || ancestor.kind === Syntax.VariableDeclarationList
            ? false
            : ancestor.kind === Syntax.ForOfStatement
            ? true
            : 'quit'
        );
      }
      return (
        this.ambientModule(d) ||
        (((d.kind === Syntax.VariableDeclaration && qf.check.forInOrOfStatement(d.parent.parent)) || isImportedDeclaration(d)) && this.identifierThatStartsWithUnderscore(d.name!))
      );
    }
    importedDeclaration(n: Node): n is ImportedDeclaration {
      return n.kind === Syntax.ImportClause || n.kind === Syntax.ImportSpecifier || n.kind === Syntax.NamespaceImport;
    }
    unwrappedReturnTypeVoidOrAny(func: SignatureDeclaration, returnType: Type): boolean {
      const unwrappedReturnType = unwrapReturnType(returnType, qf.get.functionFlags(func));
      return !!unwrappedReturnType && maybeTypeOfKind(unwrappedReturnType, TypeFlags.Void | TypeFlags.AnyOrUnknown);
    }
    instancePropertyWithoutIniter(n: Node) {
      return n.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(n, ModifierFlags.Static | ModifierFlags.Abstract) && !n.exclamationToken && !n.initer;
    }
    propertyInitializedInConstructor(propName: qc.Identifier | qc.PrivateIdentifier, propType: Type, constructor: qt.ConstructorDeclaration) {
      const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), propName);
      reference.expression.parent = reference;
      reference.parent = constructor;
      reference.flowNode = constructor.returnFlowNode;
      const flowType = qf.get.flow.typeOfReference(reference, propType, qf.get.optionalType(propType));
      return !(getFalsyFlags(flowType) & TypeFlags.Undefined);
    }
    constantMemberAccess(n: qt.Expression): boolean {
      return (
        n.kind === Syntax.Identifier ||
        (n.kind === Syntax.PropertyAccessExpression && isConstantMemberAccess((<qt.PropertyAccessExpression>n).expression)) ||
        (n.kind === Syntax.ElemAccessExpression && isConstantMemberAccess((<qt.ElemAccessExpression>n).expression) && this.stringLiteralLike((<qt.ElemAccessExpression>n).argExpression))
      );
    }
    typeReferenceIdentifier(n: qt.EntityName): boolean {
      while (n.parent.kind === Syntax.QualifiedName) {
        n = n.parent as qt.QualifiedName;
      }
      return n.parent.kind === Syntax.TypingReference;
    }
    heritageClauseElemIdentifier(n: Node): boolean {
      while (n.parent.kind === Syntax.PropertyAccessExpression) {
        n = n.parent;
      }
      return n.parent.kind === Syntax.ExpressionWithTypings;
    }
    nUsedDuringClassInitialization(n: Node) {
      return !!qc.findAncestor(n, (elem) => {
        if ((elem.kind === Syntax.ConstructorDeclaration && this.present(elem.body)) || elem.kind === Syntax.PropertyDeclaration) return true;
        else if (this.classLike(elem) || this.functionLikeDeclaration(elem)) return 'quit';
        return false;
      });
    }
    nWithinClass(n: Node, classDeclaration: qt.ClassLikeDeclaration) {
      return !!forEachEnclosingClass(n, (n) => n === classDeclaration);
    }
    inRightSideOfImportOrExportAssignment(n: qt.EntityName) {
      return getLeftSideOfImportEqualsOrExportAssignment(n) !== undefined;
    }
    importTypeQualifierPart(n: qt.EntityName): qt.ImportTyping | undefined {
      let p = n.parent;
      while (p.kind === Syntax.QualifiedName) {
        n = p;
        p = p.parent;
      }
      if (p && p.kind === Syntax.ImportTyping && (p as qt.ImportTyping).qualifier === n) return p as qt.ImportTyping;
      return;
    }
    argsLocalBinding(nIn: qt.Identifier): boolean {
      if (!this.generatedIdentifier(nIn)) {
        const n = qf.get.parseTreeOf(nIn, qf.is.identifier);
        if (n) {
          const isPropertyName = n.parent.kind === Syntax.PropertyAccessExpression && n.parent.name === n;
          return !isPropertyName && getReferencedValueSymbol(n) === argsSymbol;
        }
      }
      return false;
    }
    nameOfModuleOrEnumDeclaration(n: qt.Identifier) {
      return this.moduleOrEnumDeclaration(n.parent) && n === n.parent.name;
    }
    declarationWithCollidingName(nIn: qt.Declaration): boolean {
      const n = qf.get.parseTreeOf(nIn, isDeclaration);
      if (n) {
        const s = qf.get.symbolOfNode(n);
        if (s) return isSymbolOfDeclarationWithCollidingName(s);
      }
      return false;
    }
    valueAliasDeclaration(n: Node): boolean {
      switch (n.kind) {
        case Syntax.ImportEqualsDeclaration:
          return isAliasResolvedToValue(qf.get.symbolOfNode(n) || unknownSymbol);
        case Syntax.ImportClause:
        case Syntax.NamespaceImport:
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          const s = qf.get.symbolOfNode(n) || unknownSymbol;
          return isAliasResolvedToValue(s) && !this.getTypeOnlyAliasDeclaration();
        case Syntax.ExportDeclaration:
          const exportClause = (<qt.ExportDeclaration>n).exportClause;
          return !!exportClause && (exportClause.kind === Syntax.NamespaceExport || qu.some(exportClause.elems, isValueAliasDeclaration));
        case Syntax.ExportAssignment:
          return n.expression && n.expression.kind === Syntax.Identifier ? isAliasResolvedToValue(qf.get.symbolOfNode(n) || unknownSymbol) : true;
      }
      return false;
    }
    topLevelValueImportEqualsWithEntityName(nIn: qt.ImportEqualsDeclaration): boolean {
      const n = qf.get.parseTreeOf(nIn, isImportEqualsDeclaration);
      if (n === undefined || n.parent.kind !== Syntax.SourceFile || !this.internalModuleImportEqualsDeclaration(n)) return false;
      const isValue = isAliasResolvedToValue(qf.get.symbolOfNode(n));
      return isValue && n.moduleReference && !this.missing(n.moduleReference);
    }
    referencedAliasDeclaration(n: Node, checkChildren?: boolean): boolean {
      if (qf.is.aliasSymbolDeclaration(n)) {
        const s = qf.get.symbolOfNode(n);
        if (s && s.links.referenced) return true;
        const t = s.links.t;
        if (t && qf.get.effectiveModifierFlags(n) & ModifierFlags.Export && t.flags & SymbolFlags.Value && (compilerOpts.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(t))) return true;
      }
      if (checkChildren) return !!qf.each.child(n, (n) => referencedAliasDeclaration(n, checkChildren));
      return false;
    }
    implementationOfOverload(n: SignatureDeclaration) {
      if (this.present((n as qt.FunctionLikeDeclaration).body)) {
        if (n.kind === Syntax.GetAccessorDeclaration || n.kind === Syntax.SetAccessorDeclaration) return false;
        const s = qf.get.symbolOfNode(n);
        const signaturesOfSymbol = SignaturesOfSymbol(s);
        return signaturesOfSymbol.length > 1 || (signaturesOfSymbol.length === 1 && signaturesOfSymbol[0].declaration !== n);
      }
      return false;
    }
    requiredInitializedParam(param: qt.ParamDeclaration | qt.DocParamTag): boolean {
      return !!strictNullChecks && !isOptionalParam(param) && !param.kind === Syntax.DocParamTag && !!param.initer && !qf.has.syntacticModifier(param, ModifierFlags.ParamPropertyModifier);
    }
    optionalUninitializedParamProperty(param: qt.ParamDeclaration) {
      return strictNullChecks && isOptionalParam(param) && !param.initer && qf.has.syntacticModifier(param, ModifierFlags.ParamPropertyModifier);
    }
    expandoFunctionDeclaration(n: qt.Declaration): boolean {
      const d = qf.get.parseTreeOf(n, isFunctionDeclaration);
      if (!d) return false;
      const s = qf.get.symbolOfNode(d);
      if (!s || !(s.flags & SymbolFlags.Function)) return false;
      return !!forEachEntry(this.getExportsOfSymbol(), (p) => p.flags & SymbolFlags.Value && p.valueDeclaration && p.valueDeclaration.kind === Syntax.PropertyAccessExpression);
    }
    literalConstDeclaration(n: qt.VariableDeclaration | qt.PropertyDeclaration | qt.PropeSignature | qt.ParamDeclaration): boolean {
      if (this.declarationReadonly(n) || (n.kind === Syntax.VariableDeclaration && this.varConst(n))) return this.freshLiteralType(qf.get.symbolOfNode(n).typeOfSymbol());
      return false;
    }
    simpleLiteralEnumReference(e: qt.Expression) {
      if (
        (e.kind === Syntax.PropertyAccessExpression || (e.kind === Syntax.ElemAccessExpression && this.stringLiteralOrNumberLiteralExpression(e.argExpression))) &&
        this.entityNameExpression(e.expression)
      ) {
        return !!(check.expressionCached(e).flags & TypeFlags.EnumLiteral);
      }
      return;
    }
  })());
}
export interface Fis extends ReturnType<typeof newIs> {}

export interface Fhas extends qc.Fhas {}
export function newHas(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  interface _Fhas extends qc.Fhas {}
  class _Fhas extends qu.Fhas {}
  qu.addMixins(_Fhas, [qc.newHas(qf)]);
  return (qf.has = new (class extends _Fhas {
    externalModuleSymbol(d: Node) {
      return this.ambientModule(d) || (d.kind === Syntax.SourceFile && this.externalOrCommonJsModule(<qt.SourceFile>d));
    }
    nonGlobalAugmentationExternalModuleSymbol(d: Node) {
      return qf.is.moduleWithStringLiteralName(d) || (d.kind === Syntax.SourceFile && qf.is.externalOrCommonJsModule(<qt.SourceFile>d));
    }
    lateBindableName(n: qt.Declaration): n is qt.LateBoundDecl | qt.LateBoundBinaryExpressionDeclaration {
      const name = qf.decl.nameOf(n);
      return !!name && this.lateBindableName(name);
    }
    nonBindableDynamicName(n: qt.Declaration) {
      return qf.has.dynamicName(n) && !hasLateBindableName(n);
    }
    nonCircularBaseConstraint(t: qt.InstantiableType): boolean {
      return getResolvedBaseConstraint(t) !== circularConstraintType;
    }
    contextSensitiveParams(n: qt.FunctionLikeDeclaration) {
      if (!n.typeParams) {
        if (qu.some(n.params, (p) => !qf.get.effectiveTypeAnnotationNode(p))) return true;
        if (n.kind !== Syntax.ArrowFunction) {
          const param = firstOrUndefined(n.params);
          if (!(param && paramIsThqy.this.keyword(param))) return true;
        }
      }
      return false;
    }
    contextSensitiveReturnExpression(n: qt.FunctionLikeDeclaration) {
      return !n.typeParams && !qf.get.effectiveReturnTypeNode(n) && !!n.body && n.body.kind !== Syntax.Block && this.contextSensitive(n.body);
    }
    covariantVoidArg(typeArgs: readonly Type[], variances: VarianceFlags[]): boolean {
      for (let i = 0; i < variances.length; i++) {
        if ((variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Covariant && typeArgs[i].flags & TypeFlags.Void) return true;
      }
      return false;
    }
    skipDirectInferenceFlag(n: Node) {
      return !!qf.get.nodeLinks(n).skipDirectInference;
    }
    matchingArg(callExpression: qt.CallExpression, reference: Node) {
      if (callExpression.args) {
        for (const arg of callExpression.args) {
          if (isOrContainsMatchingReference(reference, arg)) return true;
        }
      }
      if (callExpression.expression.kind === Syntax.PropertyAccessExpression && isOrContainsMatchingReference(reference, (<qt.PropertyAccessExpression>callExpression.expression).expression))
        return true;
      return false;
    }
    parentWithAssignmentsMarked(n: Node) {
      return !!qc.findAncestor(n.parent, (n) => qf.is.functionLike(n) && !!(qf.get.nodeLinks(n).flags & NodeCheckFlags.AssignmentsMarked));
    }
    defaultValue(n: qt.BindingElem | qt.Expression): boolean {
      return (n.kind === Syntax.BindingElem && !!(<qt.BindingElem>n).initer) || (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.EqualsToken);
    }
    correctArity(n: qt.CallLikeExpression, args: readonly qt.Expression[], signature: Signature, signatureHelpTrailingComma = false) {
      let argCount: number;
      let callIsIncomplete = false;
      let effectiveParamCount = getParamCount(signature);
      let effectiveMinimumArgs = getMinArgCount(signature);
      if (n.kind === Syntax.TaggedTemplateExpression) {
        argCount = args.length;
        if (n.template.kind === Syntax.TemplateExpression) {
          const lastSpan = last(n.template.templateSpans);
          callIsIncomplete = qf.is.missing(lastSpan.literal) || !!lastSpan.literal.isUnterminated;
        } else {
          const templateLiteral = <qt.LiteralExpression>n.template;
          qf.assert.true(templateLiteral.kind === Syntax.NoSubstitutionLiteral);
          callIsIncomplete = !!templateLiteral.isUnterminated;
        }
      } else if (n.kind === Syntax.Decorator) {
        argCount = getDecoratorArgCount(n, signature);
      } else if (qf.is.jsx.openingLikeElem(n)) {
        callIsIncomplete = n.attributes.end === n.end;
        if (callIsIncomplete) return true;
        argCount = effectiveMinimumArgs === 0 ? args.length : 1;
        effectiveParamCount = args.length === 0 ? effectiveParamCount : 1;
        effectiveMinimumArgs = Math.min(effectiveMinimumArgs, 1);
      } else {
        if (!n.args) {
          qf.assert.true(n.kind === Syntax.NewExpression);
          return getMinArgCount(signature) === 0;
        }
        argCount = signatureHelpTrailingComma ? args.length + 1 : args.length;
        callIsIncomplete = n.args.end === n.end;
        const spreadArgIndex = getSpreadArgIndex(args);
        if (spreadArgIndex >= 0) return spreadArgIndex >= getMinArgCount(signature) && (hasEffectiveRestParam(signature) || spreadArgIndex < getParamCount(signature));
      }
      if (!hasEffectiveRestParam(signature) && argCount > effectiveParamCount) return false;
      if (callIsIncomplete || argCount >= effectiveMinimumArgs) return true;
      for (let i = argCount; i < effectiveMinimumArgs; i++) {
        const t = getTypeAtPosition(signature, i);
        if (filterType(t, acceptsVoid).flags & TypeFlags.Never) return false;
      }
      return true;
    }
    inferenceCandidates(info: qt.InferenceInfo) {
      return !!(info.candidates || info.contraCandidates);
    }
    overlappingInferences(a: qt.InferenceInfo[], b: qt.InferenceInfo[]) {
      for (let i = 0; i < a.length; i++) {
        if (hasInferenceCandidates(a[i]) && hasInferenceCandidates(b[i])) return true;
      }
      return false;
    }
    typeParamByName(typeParams: readonly TypeParam[] | undefined, name: qu.__String) {
      return qu.some(typeParams, (tp) => tp.symbol.escName === name);
    }
    globalName(name: string): boolean {
      return globals.has(qy.get.escUnderscores(name));
    }
    parseDiagnostics(sFile: qt.SourceFile): boolean {
      return sFile.parseqd.msgs.length > 0;
    }
    sameNamedThisProperty(thisProperty: qt.Expression, expression: qt.Expression) {
      return (
        thisProperty.kind === Syntax.PropertyAccessExpression &&
        thisProperty.expression.kind === Syntax.ThisKeyword &&
        qf.each.childRecursively(expression, (n) => this.matchingReference(thisProperty, n))
      );
    }
    argsReference(d: SignatureDeclaration): boolean {
      const links = qf.get.nodeLinks(d);
      if (links.containsArgsReference === undefined) {
        if (links.flags & NodeCheckFlags.CaptureArgs) links.containsArgsReference = true;
        else {
          links.containsArgsReference = traverse((d as qt.FunctionLikeDeclaration).body!);
        }
      }
      return links.containsArgsReference;
      function traverse(n: Node): boolean {
        if (!n) return false;
        switch (n.kind) {
          case Syntax.Identifier:
            return n.escapedText === 'args' && qf.is.expressionNode(n);
          case Syntax.PropertyDeclaration:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return (<qt.NamedDecl>n).name!.kind === Syntax.ComputedPropertyName && traverse((<qt.NamedDecl>n).name!);
          default:
            return !nStartsNewLexicalEnv(n) && !qf.is.partOfTypeNode(n) && !!qf.each.child(n, traverse);
        }
      }
    }
    truthyCheck(s: Node, t: Node) {
      return (
        this.matchingReference(s, t) || (t.kind === Syntax.BinaryExpression && t.operatorToken.kind === Syntax.Ampersand2Token && (containsTruthyCheck(s, t.left) || containsTruthyCheck(s, t.right)))
      );
    }
    matchingReference(s: Node, t: Node) {
      while (qf.is.accessExpression(s)) {
        s = s.expression;
        if (this.matchingReference(s, t)) return true;
      }
      return false;
    }
  })());
}
export interface Fhas extends ReturnType<typeof newHas> {}

export interface Fsign extends qc.Fsign {}
export function newSign(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface _Fsign extends qc.Fsign {}
  class _Fsign {}
  qu.addMixins(_Fsign, [qc.newSign(qf)]);
  return (qf.sign = new (class extends _Fsign {
    get = new (class extends Base {
      signatureInstantiation(s: Signature, typeArgs: Type[] | undefined, isJavascript: boolean, inferredTypeParams?: readonly qt.TypeParam[]): Signature {
        const instantiatedSignature = this.signatureInstantiationWithoutFillingInTypeArgs(
          signature,
          fillMissingTypeArgs(typeArgs, signature.typeParams, this.minTypeArgCount(signature.typeParams), isJavascript)
        );
        if (inferredTypeParams) {
          const returnSignature = this.singleCallOrConstructSignature(this.returnTypeOfSignature(instantiatedSignature));
          if (returnSignature) {
            const newReturnSignature = cloneSignature(returnSignature);
            newReturnSignature.typeParams = inferredTypeParams;
            const newInstantiatedSignature = cloneSignature(instantiatedSignature);
            newInstantiatedSignature.resolvedReturn = this.orCreateTypeFromSignature(newReturnSignature);
            return newInstantiatedSignature;
          }
        }
        return instantiatedSignature;
      }
      signatureInstantiationWithoutFillingInTypeArgs(s: Signature, typeArgs: readonly Type[] | undefined): Signature {
        const instantiations = signature.instantiations || (signature.instantiations = new qu.QMap<Signature>());
        const id = this.typeListId(typeArgs);
        let instantiation = instantiations.get(id);
        if (!instantiation) instantiations.set(id, (instantiation = qf.make.signatureInstantiation(signature, typeArgs)));
        return instantiation;
      }
      orCreateTypeFromSignature(s: Signature): qt.ObjectType {
        if (!signature.isolatedSignatureType) {
          const kind = signature.declaration ? signature.declaration.kind : Syntax.Unknown;
          const isConstructor = kind === Syntax.Constructor || kind === Syntax.ConstructSignature || kind === Syntax.ConstructorTyping;
          const type = qf.make.objectType(ObjectFlags.Anonymous);
          t.members = qu.emptySymbols;
          t.properties = qu.empty;
          t.callSignatures = !isConstructor ? [signature] : qu.empty;
          t.constructSignatures = isConstructor ? [signature] : qu.empty;
          signature.isolatedSignatureType = type;
        }
        return signature.isolatedSignatureType;
      }
      effectiveFirstArgForJsxSignature(s: Signature, n: qt.JsxOpeningLikeElem) {
        return this.jsxReferenceKind(n) !== qt.JsxReferenceKind.Component ? this.jsxPropsTypeFromCallSignature(signature, n) : this.jsxPropsTypeFromClassType(signature, n);
      }
      jsxPropsTypeFromCallSignature(sig: Signature, context: qt.JsxOpeningLikeElem) {
        let propsType = this.typeOfFirstParamOfSignatureWithFallback(sig, unknownType);
        propsType = this.jsxManagedAttributesFromLocatedAttributes(context, this.jsxNamespaceAt(context), propsType);
        const intrinsicAttribs = this.jsxType(JsxNames.IntrinsicAttributes, context);
        if (intrinsicAttribs !== errorType) propsType = intersectTypes(intrinsicAttribs, propsType);
        return propsType;
      }
      jsxPropsTypeForSignatureFromMember(sig: Signature, forcedLookupLocation: qu.__String) {
        if (sig.unions) {
          const results: Type[] = [];
          for (const signature of sig.unions) {
            const instance = this.returnTypeOfSignature(signature);
            if (qf.type.is.any(instance)) return instance;
            const propType = this.typeOfPropertyOfType(instance, forcedLookupLocation);
            if (!propType) return;
            results.push(propType);
          }
          return this.intersectionType(results);
        }
        const instanceType = this.returnTypeOfSignature(sig);
        return qf.type.is.any(instanceType) ? instanceType : this.typeOfPropertyOfType(instanceType, forcedLookupLocation);
      }
      jsxPropsTypeFromClassType(sig: Signature, context: qt.JsxOpeningLikeElem) {
        const ns = this.jsxNamespaceAt(context);
        const forcedLookupLocation = this.jsxElemPropertiesName(ns);
        let attributesType =
          forcedLookupLocation === undefined
            ? this.typeOfFirstParamOfSignatureWithFallback(sig, unknownType)
            : forcedLookupLocation === ''
            ? this.returnTypeOfSignature(sig)
            : this.jsxPropsTypeForSignatureFromMember(sig, forcedLookupLocation);
        if (!attributesType) {
          if (!!forcedLookupLocation && !!qu.length(context.attributes.properties))
            error(context, qd.msgs.JSX_elem_class_does_not_support_attributes_because_it_does_not_have_a_0_property, qy.get.unescUnderscores(forcedLookupLocation));
          return unknownType;
        }
        attributesType = this.jsxManagedAttributesFromLocatedAttributes(context, ns, attributesType);
        if (qf.type.is.any(attributesType)) return attributesType;
        else {
          let apparentAttributesType = attributesType;
          const intrinsicClassAttribs = this.jsxType(JsxNames.IntrinsicClassAttributes, context);
          if (intrinsicClassAttribs !== errorType) {
            const typeParams = this.localTypeParamsOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
            const hostClassType = this.returnTypeOfSignature(sig);
            apparentAttributesType = intersectTypes(
              typeParams
                ? qf.make.typeReference(<qt.GenericType>intrinsicClassAttribs, fillMissingTypeArgs([hostClassType], typeParams, this.minTypeArgCount(typeParams), qf.is.inJSFile(context)))
                : intrinsicClassAttribs,
              apparentAttributesType
            );
          }
          const intrinsicAttribs = this.jsxType(JsxNames.IntrinsicAttributes, context);
          if (intrinsicAttribs !== errorType) apparentAttributesType = intersectTypes(intrinsicAttribs, apparentAttributesType);
          return apparentAttributesType;
        }
      }
      longestCandidateIndex(candidates: Signature[], argsCount: number): number {
        let maxParamsIndex = -1;
        let maxParams = -1;
        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i];
          const paramCount = this.paramCount(candidate);
          if (qf.has.effectiveRestParam(candidate) || paramCount >= argsCount) return i;
          if (paramCount > maxParams) {
            maxParams = paramCount;
            maxParamsIndex = i;
          }
        }
        return maxParamsIndex;
      }
    })();
    findMatchingSignature(signatureList: readonly qt.Signature[], signature: qt.Signature, partialMatch: boolean, ignoreThisTypes: boolean, ignoreReturnTypes: boolean): qt.Signature | undefined {
      for (const s of signatureList) {
        if (compareSignaturesIdentical(s, signature, partialMatch, ignoreThisTypes, ignoreReturnTypes, partialMatch ? compareTypesSubtypeOf : compareTypesIdentical)) return s;
      }
    }
    findMatchingSignatures(signatureLists: readonly (readonly qt.Signature[])[], signature: qt.Signature, listIndex: number): qt.Signature[] | undefined {
      if (signature.typeParams) {
        if (listIndex > 0) return;
        for (let i = 1; i < signatureLists.length; i++) {
          if (!findMatchingSignature(signatureLists[i], signature, false)) return;
        }
        return [signature];
      }
      let result: qt.Signature[] | undefined;
      for (let i = 0; i < signatureLists.length; i++) {
        const match = i === listIndex ? signature : findMatchingSignature(signatureLists[i], signature, true);
        if (!match) return;
        result = appendIfUnique(result, match);
      }
      return result;
    }
    appendSignatures(signatures: qt.Signature[] | undefined, newSignatures: readonly qt.Signature[]) {
      for (const sig of newSignatures) {
        if (!signatures || every(signatures, (s) => !compareSignaturesIdentical(s, sig, false, compareTypesIdentical))) signatures = append(signatures, sig);
      }
      return signatures;
    }
    reorderCandidates(signatures: readonly qt.Signature[], result: qt.Signature[], callChainFlags: SignatureFlags): void {
      let lastParent: Node | undefined;
      let lastSymbol: qt.Symbol | undefined;
      let cutoffIndex = 0;
      let index: number | undefined;
      let specializedIndex = -1;
      let spliceIndex: number;
      qf.assert.true(!result.length);
      for (const signature of signatures) {
        const symbol = signature.declaration && qf.get.symbolOfNode(signature.declaration);
        const parent = signature.declaration && signature.declaration.parent;
        if (!lastSymbol || symbol === lastSymbol) {
          if (lastParent && parent === lastParent) index = index! + 1;
          else {
            lastParent = parent;
            index = cutoffIndex;
          }
        } else {
          index = cutoffIndex = result.length;
          lastParent = parent;
        }
        lastSymbol = symbol;
        if (signature.hasLiteralTypes()) {
          specializedIndex++;
          spliceIndex = specializedIndex;
          cutoffIndex++;
        } else {
          spliceIndex = index;
        }
        result.splice(spliceIndex, 0, callChainFlags ? getOptionalCallSignature(signature, callChainFlags) : signature);
      }
    }
  })());
}
export interface Fsign extends ReturnType<typeof newSign> {}

export interface Fsymb extends qc.Fsymb {}
export function newSymb(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface _Fsymb extends qc.Fsymb {}
  class _Fsymb {}
  qu.addMixins(_Fsymb, [qc.newSymb(qf)]);
  return (qf.symb = new (class Base extends _Fsymb {
    get = new (class extends Base {
      excluded(f: SymbolFlags): SymbolFlags {
        let r: SymbolFlags = 0;
        if (f & SymbolFlags.Alias) r |= SymbolFlags.AliasExcludes;
        if (f & SymbolFlags.BlockScopedVariable) r |= SymbolFlags.BlockScopedVariableExcludes;
        if (f & SymbolFlags.Class) r |= SymbolFlags.ClassExcludes;
        if (f & SymbolFlags.ConstEnum) r |= SymbolFlags.ConstEnumExcludes;
        if (f & SymbolFlags.EnumMember) r |= SymbolFlags.EnumMemberExcludes;
        if (f & SymbolFlags.Function) r |= SymbolFlags.FunctionExcludes;
        if (f & SymbolFlags.FunctionScopedVariable) r |= SymbolFlags.FunctionScopedVariableExcludes;
        if (f & SymbolFlags.GetAccessor) r |= SymbolFlags.GetAccessorExcludes;
        if (f & SymbolFlags.Interface) r |= SymbolFlags.InterfaceExcludes;
        if (f & SymbolFlags.Method) r |= SymbolFlags.MethodExcludes;
        if (f & SymbolFlags.Property) r |= SymbolFlags.PropertyExcludes;
        if (f & SymbolFlags.RegularEnum) r |= SymbolFlags.RegularEnumExcludes;
        if (f & SymbolFlags.SetAccessor) r |= SymbolFlags.SetAccessorExcludes;
        if (f & SymbolFlags.TypeAlias) r |= SymbolFlags.TypeAliasExcludes;
        if (f & SymbolFlags.TypeParam) r |= SymbolFlags.TypeParamExcludes;
        if (f & SymbolFlags.ValueModule) r |= SymbolFlags.ValueModuleExcludes;
        return r;
      }
      mergedSymbol(s: Symbol): Symbol | undefined {
        let r: Symbol;
        return s.mergeId && (r = qf.mergedSymbols[s.mergeId]) ? r : s;
      }
      commonJsExportEquals(exported: Symbol | undefined, moduleSymbol: Symbol): Symbol | undefined {
        if (!exported || exported === unknownSymbol || exported === moduleSymbol || moduleSymbol.exports!.size === 1 || exported.flags & SymbolFlags.Alias) return exported;
        const ls = exported.this.links();
        if (ls.cjsExportMerged) return ls.cjsExportMerged;
        const merged = exported.flags & SymbolFlags.Transient ? exported : exported.clone();
        merged.flags = merged.flags | SymbolFlags.ValueModule;
        if (merged.exports === undefined) merged.exports = new qc.SymbolTable();
        moduleSymbol.exports!.forEach((s, name) => {
          if (name === InternalSymbol.ExportEquals) return;
          merged.exports!.set(name, merged.exports!.has(name) ? s.merge(merged.exports!.get(name)!) : s);
        });
        merged.this.links().cjsExportMerged = merged;
        return (ls.cjsExportMerged = merged);
      }
      exportsOfModuleAsArray(s: Symbol): Symbol[] {
        return this.exportsOfModule(s).toArray();
      }
      exportsAndPropertiesOfModule(moduleSymbol: Symbol): Symbol[] {
        const exports = this.exportsOfModuleAsArray(moduleSymbol);
        const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
        if (exportEquals !== moduleSymbol) qu.addRange(exports, this.propertiesOfType(this.typeOfSymbol(exportEquals)));
        return exports;
      }
      symbolIfSameReference(s1: Symbol, s2: Symbol) {
        if (this.mergedSymbol(this.mergedSymbol(s1)?.resolveSymbol()) === this.mergedSymbol(this.mergedSymbol(s2)?.resolveSymbol())) return s1;
      }
      qualifiedLeftMeaning(rightMeaning: SymbolFlags) {
        return rightMeaning === SymbolFlags.Value ? SymbolFlags.Value : SymbolFlags.Namespace;
      }
      accessibleSymbolChain(
        symbol: Symbol | undefined,
        enclosingDeclaration: Node | undefined,
        meaning: SymbolFlags,
        useOnlyExternalAliasing: boolean,
        visitedSymbolTablesMap: qu.QMap<SymbolTable[]> = new qu.QMap()
      ): Symbol[] | undefined {
        if (!(symbol && !qf.is.propertyOrMethodDeclarationSymbol(symbol))) return;
        const id = '' + symbol.this.id();
        let visitedSymbolTables = visitedSymbolTablesMap.get(id);
        if (!visitedSymbolTables) visitedSymbolTablesMap.set(id, (visitedSymbolTables = []));
        return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
        const accessibleSymbolChainFromSymbolTable = (symbols: SymbolTable, ignoreQualification?: boolean): Symbol[] | undefined => {
          if (!pushIfUnique(visitedSymbolTables!, symbols)) return;
          const result = trySymbolTable(symbols, ignoreQualification);
          visitedSymbolTables!.pop();
          return result;
        };
        const canQualifySymbol = (symbolFromSymbolTable: Symbol, meaning: SymbolFlags) => {
          return (
            !needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning) ||
            !!this.accessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, this.qualifiedLeftMeaning(meaning), useOnlyExternalAliasing, visitedSymbolTablesMap)
          );
        };
        const isAccessible = (symbolFromSymbolTable: Symbol, resolvedAliasSymbol?: Symbol, ignoreQualification?: boolean) => {
          return (
            (symbol === (resolvedAliasSymbol || symbolFromSymbolTable) || this.mergedSymbol(symbol) === this.mergedSymbol(resolvedAliasSymbol || symbolFromSymbolTable)) &&
            !some(symbolFromSymbolTable.declarations, hasNonGlobalAugmentationExternalModuleSymbol) &&
            (ignoreQualification || canQualifySymbol(this.mergedSymbol(symbolFromSymbolTable), meaning))
          );
        };
        const trySymbolTable = (symbols: SymbolTable, ignoreQualification: boolean | undefined): Symbol[] | undefined => {
          if (isAccessible(symbols.get(symbol!.escName)!, undefined, ignoreQualification)) return [symbol!];
          const result = forEachEntry(symbols, (symbolFromSymbolTable) => {
            if (
              symbolFromSymbolTable.flags & SymbolFlags.Alias &&
              symbolFromSymbolTable.escName !== InternalSymbol.ExportEquals &&
              symbolFromSymbolTable.escName !== InternalSymbol.Default &&
              !(qf.is.uMDExportSymbol(symbolFromSymbolTable) && enclosingDeclaration && qf.is.externalModule(enclosingDeclaration.sourceFile)) &&
              (!useOnlyExternalAliasing || qu.some(symbolFromSymbolTable.declarations, qf.is.externalModuleImportEqualsDeclaration)) &&
              (ignoreQualification || !symbolFromSymbolTable.declarationOfKind(Syntax.ExportSpecifier))
            ) {
              const resolvedImportedSymbol = symbolFromSymbolTable.resolveAlias();
              const candidate = this.candidateListForSymbol(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification);
              if (candidate) return candidate;
            }
            if (symbolFromSymbolTable.escName === symbol!.escName && symbolFromSymbolTable.exportSymbol) {
              if (isAccessible(this.mergedSymbol(symbolFromSymbolTable.exportSymbol), undefined, ignoreQualification)) return [symbol!];
            }
          });
          return result || (symbols === globals ? this.candidateListForSymbol(globalThisSymbol, globalThisSymbol, ignoreQualification) : undefined);
        };
        const candidateListForSymbol = (symbolFromSymbolTable: Symbol, resolvedImportedSymbol: Symbol, ignoreQualification: boolean | undefined) => {
          if (isAccessible(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification)) return [symbolFromSymbolTable];
          const candidateTable = resolvedImportedSymbol.this.exportsOfSymbol();
          const accessibleSymbolsFromExports = candidateTable && this.accessibleSymbolChainFromSymbolTable(candidateTable, true);
          if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, this.qualifiedLeftMeaning(meaning))) return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
        };
      }
      typeOfPrototypeProperty(prototype: Symbol): Type {
        const classType = <qt.InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prototype)!);
        return classType.typeParams
          ? qf.make.typeReference(
              <qt.GenericType>classType,
              map(classType.typeParams, (_) => anyType)
            )
          : classType;
      }
      flowTypeInConstructor(symbol: Symbol, constructor: qt.ConstructorDeclaration) {
        const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), qy.get.unescUnderscores(symbol.escName));
        reference.expression.parent = reference;
        reference.parent = constructor;
        reference.flowNode = constructor.returnFlowNode;
        const flowType = this.flowTypeOfProperty(reference, symbol);
        if (noImplicitAny && (flowType === autoType || flowType === autoArrayType))
          error(symbol.valueDeclaration, qd.msgs.Member_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
        return everyType(flowType, qf.type.is.nullable) ? undefined : convertAutoToAny(flowType);
      }
      widenedTypeForAssignmentDeclaration(symbol: Symbol, resolvedSymbol?: Symbol) {
        const container = this.assignedExpandoIniter(symbol.valueDeclaration);
        if (container) {
          const tag = qf.get.doc.typeTag(container);
          if (tag && tag.typeExpression) return this.typeFromTypeNode(tag.typeExpression);
          const containerObjectType = this.jSContainerObjectType(symbol.valueDeclaration, symbol, container);
          return containerObjectType || this.widenedLiteralType(qf.check.expressionCached(container));
        }
        let type;
        let definedInConstructor = false;
        let definedInMethod = false;
        if (qf.is.constructorDeclaredProperty(symbol)) type = this.flowTypeInConstructor(symbol, this.declaringConstructor(symbol)!);
        if (!type) {
          let jsdocType: Type | undefined;
          let types: Type[] | undefined;
          for (const declaration of symbol.declarations) {
            const expression =
              declaration.kind === Syntax.BinaryExpression || declaration.kind === Syntax.CallExpression
                ? declaration
                : qf.is.accessExpression(declaration)
                ? declaration.parent?.kind === Syntax.BinaryExpression
                  ? declaration.parent
                  : declaration
                : undefined;
            if (!expression) continue;
            const kind = qf.is.accessExpression(expression) ? this.assignmentDeclarationPropertyAccessKind(expression) : this.assignmentDeclarationKind(expression);
            if (kind === qt.AssignmentDeclarationKind.ThisProperty) {
              if (qf.is.declarationInConstructor(expression)) definedInConstructor = true;
              else {
                definedInMethod = true;
              }
            }
            if (!expression.kind === Syntax.CallExpression) jsdocType = this.annotatedTypeForAssignmentDeclaration(jsdocType, expression, symbol, declaration);
            if (!jsdocType) {
              (types || (types = [])).push(
                expression.kind === Syntax.BinaryExpression || expression.kind === Syntax.CallExpression
                  ? this.initerTypeFromAssignmentDeclaration(symbol, resolvedSymbol, expression, kind)
                  : neverType
              );
            }
          }
          type = jsdocType;
          if (!type) {
            if (!qu.length(types)) return errorType;
            let constructorTypes = definedInConstructor ? this.constructorDefinedThisAssignmentTypes(types!, symbol.declarations) : undefined;
            if (definedInMethod) {
              const propType = this.typeOfPropertyInBaseClass(symbol);
              if (propType) {
                (constructorTypes || (constructorTypes = [])).push(propType);
                definedInConstructor = true;
              }
            }
            const sourceTypes = qu.some(constructorTypes, (t) => !!(t.flags & ~TypeFlags.Nullable)) ? constructorTypes : types;
            type = this.unionType(sourceTypes!, UnionReduction.Subtype);
          }
        }
        const widened = this.widenedType(addOptionality(t, definedInMethod && !definedInConstructor));
        if (filterType(widened, (t) => !!(t.flags & ~TypeFlags.Nullable)) === neverType) {
          reportImplicitAny(symbol.valueDeclaration, anyType);
          return anyType;
        }
        return widened;
      }
      initerTypeFromAssignmentDeclaration(symbol: Symbol, resolvedSymbol: Symbol | undefined, expression: qt.BinaryExpression | qt.CallExpression, kind: qt.AssignmentDeclarationKind) {
        if (expression.kind === Syntax.CallExpression) {
          if (resolvedSymbol) return this.typeOfSymbol(resolvedSymbol);
          const objectLitType = qf.check.expressionCached((expression as qt.BindableObjectDefinePropertyCall).args[2]);
          const valueType = this.typeOfPropertyOfType(objectLitType, 'value' as qu.__String);
          if (valueType) return valueType;
          const getFunc = this.typeOfPropertyOfType(objectLitType, 'get' as qu.__String);
          if (getFunc) {
            const getSig = this.singleCSignature(getFunc);
            if (getSig) return this.returnTypSignature(getSig);
          }
          const setFunc = this.typeOfPropertyOfType(objectLitType, 'set' as qu.__String);
          if (setFunc) {
            const setSig = this.singleCSignature(setFunc);
            if (setSig) return this.typeOfFirstParaSignature(setSig);
          }
          return anyType;
        }
        if (containsSameNamedThisProperty(expression.left, expression.right)) return anyType;
        const type = resolvedSymbol ? this.typeOfSymbol(resolvedSymbol) : this.widenedLiteralType(qf.check.expressionCached(expression.right));
        if (t.flags & TypeFlags.Object && kind === qt.AssignmentDeclarationKind.ModuleExports && symbol.escName === InternalSymbol.ExportEquals) {
          const exportedType = resolveStructuredTypeMembers(type as qt.ObjectType);
          const members = new qc.SymbolTable();
          copyEntries(exportedType.members, members);
          if (resolvedSymbol && !resolvedSymbol.exports) resolvedSymbol.exports = new qc.SymbolTable();
          (resolvedSymbol || symbol).exports!.forEach((s, name) => {
            const exportedMember = members.get(name)!;
            if (exportedMember && exportedMember !== s) {
              if (s.flags & SymbolFlags.Value) {
                if (s.valueDeclaration.sourceFile !== exportedMember.valueDeclaration.sourceFile) {
                  const unescName = qy.get.unescUnderscores(s.escName);
                  const exportedMemberName = qu.tryCast(exportedMember.valueDeclaration, isNamedDecl)?.name || exportedMember.valueDeclaration;
                  addRelatedInfo(error(s.valueDeclaration, qd.msgs.Duplicate_identifier_0, unescName), qf.make.diagForNode(exportedMemberName, qd.msgs._0_was_also_declared_here, unescName));
                  addRelatedInfo(error(exportedMemberName, qd.msgs.Duplicate_identifier_0, unescName), qf.make.diagForNode(s.valueDeclaration, qd.msgs._0_was_also_declared_here, unescName));
                }
                const union = new qc.Symbol(s.flags | exportedMember.flags, name);
                union.type = this.unionType([this.typeOfSymbol(s), this.typeOfSymbol(exportedMember)]);
                union.valueDeclaration = exportedMember.valueDeclaration;
                union.declarations = concatenate(exportedMember.declarations, s.declarations);
                members.set(name, union);
              } else {
                members.set(name, exportedMember.merge(s));
              }
            } else {
              members.set(name, s);
            }
          });
          const result = qf.make.anonymousType(exportedType.symbol, members, exportedType.cSignatures, exportedType.constrSignatures, exportedType.stringIndexInfo, exportedType.numberIndexInfo);
          result.objectFlags |= this.objectFlags(t) & ObjectFlags.JSLiteral;
          return result;
        }
        if (qf.type.is.emptyArrayLiteral(t)) {
          reportImplicitAny(expression, anyArrayType);
          return anyArrayType;
        }
        return type;
      }
      resolvedMembersOrExportsOfSymbol(symbol: Symbol, resolutionKind: MembersOrExportsResolutionKind): EscapedMap<Symbol> {
        const ls = symbol.this.links();
        if (!ls[resolutionKind]) {
          const isStatic = resolutionKind === MembersOrExportsResolutionKind.resolvedExports;
          const earlySymbols = !isStatic ? symbol.members : symbol.flags & SymbolFlags.Module ? symbol.this.exportsOfModuleWorker() : symbol.exports;
          ls[resolutionKind] = earlySymbols || qu.emptySymbols;
          const lateSymbols = new qc.SymbolTable<qt.TransientSymbol>();
          for (const decl of symbol.declarations) {
            const members = this.declaration.members(decl);
            if (members) {
              for (const member of members) {
                if (isStatic === qf.has.staticModifier(member) && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
              }
            }
          }
          const assignments = symbol.assignmentDeclarations;
          if (assignments) {
            const decls = arrayFrom(assignments.values());
            for (const member of decls) {
              const assignmentKind = this.assignmentDeclarationKind(member as qt.BinaryExpression | qt.CallExpression);
              const isInstanceMember =
                assignmentKind === qt.AssignmentDeclarationKind.PrototypeProperty ||
                assignmentKind === qt.AssignmentDeclarationKind.ThisProperty ||
                assignmentKind === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty ||
                assignmentKind === qt.AssignmentDeclarationKind.Prototype;
              if (isStatic === !isInstanceMember && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
            }
          }
          ls[resolutionKind] = earlySymbols?.combine(lateSymbols) || qu.emptySymbols;
        }
        return ls[resolutionKind]!;
      }
      typeOfMappedSymbol(s: qt.MappedSymbol) {
        if (!s.type) {
          if (!pushTypeResolution(s, qt.TypeSystemPropertyName.Type)) return errorType;
          const templateType = this.templateTypeFromMappedType(<qt.MappedType>s.mappedType.target || s.mappedType);
          const propType = instantiateType(templateType, s.mapper);
          let type =
            strictNullChecks && s.flags & SymbolFlags.Optional && !maybeTypeOfKind(propType, TypeFlags.Undefined | TypeFlags.Void)
              ? this.optionalType(propType)
              : s.checkFlags & qt.CheckFlags.StripOptional
              ? this.typeWithFacts(propType, TypeFacts.NEUndefined)
              : propType;
          if (!popTypeResolution()) {
            error(currentNode, qd.msgs.Type_of_property_0_circularly_references_itself_in_mapped_type_1, s.sToString(), typeToString(s.mappedType));
            type = errorType;
          }
          s.type = type;
          s.mapper = undefined!;
        }
        return s.type;
      }
      signaturesOfSymbol(symbol: Symbol | undefined): Signature[] {
        if (!symbol) return qu.empty;
        const result: Signature[] = [];
        for (let i = 0; i < symbol.declarations.length; i++) {
          const decl = symbol.declarations[i];
          if (!qf.is.functionLike(decl)) continue;
          if (i > 0 && (decl as qt.FunctionLikeDeclaration).body) {
            const previous = symbol.declarations[i - 1];
            if (decl.parent === previous.parent && decl.kind === previous.kind && decl.pos === previous.end) continue;
          }
          result.push(this.signatureFromDeclaration(decl));
        }
        return result;
      }
      typeAliasInstantiation(symbol: Symbol, typeArgs: readonly Type[] | undefined): Type {
        const type = this.declaredTypeOfSymbol(symbol);
        const links = s.this.links(symbol);
        const typeParams = links.typeParams!;
        const id = this.typeListId(typeArgs);
        let instantiation = links.instantiations!.get(id);
        if (!instantiation) {
          links.instantiations!.set(
            id,
            (instantiation = instantiateType(
              type,
              qf.make.typeMapper(typeParams, fillMissingTypeArgs(typeArgs, typeParams, this.minTypeArgCount(typeParams), qf.is.inJSFile(symbol.valueDeclaration)))
            ))
          );
        }
        return instantiation;
      }
      typeOfGlobalSymbol(s: Symbol | undefined, arity: number): qt.ObjectType {
        const typeDeclaration = (s: Symbol): qt.Declaration | undefined => {
          const ds = s.declarations;
          for (const d of ds) {
            switch (d.kind) {
              case Syntax.ClassDeclaration:
              case Syntax.InterfaceDeclaration:
              case Syntax.EnumDeclaration:
                return d;
            }
          }
          return;
        };
        if (!s) return arity ? qu.emptyGenericType : qu.emptyObjectType;
        const type = this.declaredTypeOfSymbol(s);
        if (!(t.flags & TypeFlags.Object)) {
          error(typeDeclaration(s), qd.msgs.Global_type_0_must_be_a_class_or_interface_type, s.name);
          return arity ? qu.emptyGenericType : qu.emptyObjectType;
        }
        if (length((<qt.InterfaceType>type).typeParams) !== arity) {
          error(typeDeclaration(s), qd.msgs.Global_type_0_must_have_1_type_param_s, s.name, arity);
          return arity ? qu.emptyGenericType : qu.emptyObjectType;
        }
        return <qt.ObjectType>type;
      }
      literalTypeFromProperty(s: Symbol, include: TypeFlags) {
        if (!(s.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier)) {
          let t = s.this.links(this.lateBoundSymbol(s)).nameType;
          if (!t && !s.isKnown()) {
            if (s.escName === InternalSymbol.Default) t = this.literalType('default');
            else {
              const n = s.valueDeclaration && (this.declaration.nameOf(s.valueDeclaration) as qt.PropertyName);
              t = (n && this.literalTypeFromPropertyName(n)) || this.literalType(s.name);
            }
          }
          if (t && t.flags & include) return t;
        }
        return neverType;
      }
      typeArgsForAliasSymbol(symbol: Symbol | undefined) {
        return symbol ? this.this.localTypeParamsOfClassOrInterfaceOrTypeAlias() : undefined;
      }
      spreadSymbol(prop: Symbol, readonly: boolean) {
        const isSetonlyAccessor = prop.flags & SymbolFlags.SetAccessor && !(prop.flags & SymbolFlags.GetAccessor);
        if (!isSetonlyAccessor && readonly === qf.is.readonlySymbol(prop)) return prop;
        const flags = SymbolFlags.Property | (prop.flags & SymbolFlags.Optional);
        const result = new qc.Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
        result.type = isSetonlyAccessor ? undefinedType : this.typeOfSymbol(prop);
        result.declarations = prop.declarations;
        result.nameType = s.this.links(prop).nameType;
        result.syntheticOrigin = prop;
        return result;
      }
      declaringClass(prop: Symbol) {
        return prop.parent && prop.parent?.flags & SymbolFlags.Class ? <qt.InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prop)!) : undefined;
      }
      typeOfPropertyInBaseClass(property: Symbol) {
        const classType = this.declaringClass(property);
        const baseClassType = classType && this.baseTypes(classType)[0];
        return baseClassType && this.typeOfPropertyOfType(baseClassType, property.escName);
      }
      widenedProperty(prop: Symbol, context: qt.WideningContext | undefined): Symbol {
        if (!(prop.flags & SymbolFlags.Property)) return prop;
        const original = this.typeOfSymbol(prop);
        const propContext = context && qf.make.wideningContext(context, prop.escName, undefined);
        const widened = this.widenedTypeWithContext(original, propContext);
        return widened === original ? prop : qf.make.symbolWithType(prop, widened);
      }
      undefinedProperty(prop: Symbol) {
        const cached = undefinedProperties.get(prop.escName);
        if (cached) return cached;
        const result = qf.make.symbolWithType(prop, undefinedType);
        result.flags |= SymbolFlags.Optional;
        undefinedProperties.set(prop.escName, result);
        return result;
      }
      typeOfReverseMappedSymbol(s: qt.ReverseMappedSymbol) {
        return inferReverseMappedType(s.propertyType, s.mappedType, s.constraintType);
      }
      explicitTypeOfSymbol(symbol: Symbol, diagnostic?: qd.Diagnostic) {
        if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.ValueModule)) return this.this.typeOfSymbol();
        if (symbol.flags & (SymbolFlags.Variable | SymbolFlags.Property)) {
          const declaration = symbol.valueDeclaration;
          if (declaration) {
            if (qf.is.declarationWithExplicitTypeAnnotation(declaration)) return this.this.typeOfSymbol();
            if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForOfStatement) {
              const statement = declaration.parent?.parent;
              const expressionType = this.typeOfDottedName(statement.expression, undefined);
              if (expressionType) {
                const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
                return qf.check.iteratedTypeOrElemType(use, expressionType, undefinedType, undefined);
              }
            }
            if (diagnostic) addRelatedInfo(diagnostic, qf.make.diagForNode(declaration, qd.msgs._0_needs_an_explicit_type_annotation, symbol.symbolToString()));
          }
        }
      }
      typeOfSymbolAtLocation(symbol: Symbol, location: Node) {
        symbol = symbol.exportSymbol || symbol;
        if (location.kind === Syntax.Identifier) {
          if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(location)) location = location.parent;
          if (qf.is.expressionNode(location) && !qf.is.assignmentTarget(location)) {
            const type = this.typeOfExpression(location);
            if (this.exportSymbolOfValueSymbolIfExported(this.nodeLinks(location).resolvedSymbol) === symbol) return type;
          }
        }
        return this.this.typeOfSymbol();
      }
      jsxLibraryManagedAttributes(jsxNamespace: Symbol) {
        return jsxNamespace && this.symbol(jsxNamespace.exports!, JsxNames.LibraryManagedAttributes, SymbolFlags.Type);
      }
      jsxElemPropertiesName(jsxNamespace: Symbol) {
        return this.nameFromJsxElemAttributesContainer(JsxNames.ElemAttributesPropertyNameContainer, jsxNamespace);
      }
      jsxElemChildrenPropertyName(jsxNamespace: Symbol): qu.__String | undefined {
        return this.nameFromJsxElemAttributesContainer(JsxNames.ElemChildrenAttributeNameContainer, jsxNamespace);
      }
      declarationNodeFlagsFromSymbol(s: Symbol): NodeFlags {
        return s.valueDeclaration ? this.combinedFlagsOf(s.valueDeclaration) : 0;
      }
    })();
    useOuterVariableScopeInParam(result: Symbol, location: Node, lastLocation: Node) {
      const target = getEmitScriptTarget(compilerOpts);
      const functionLocation = <qt.FunctionLikeDeclaration>location;
      if (
        lastLocation.kind === Syntax.ParamDeclaration &&
        functionLocation.body &&
        result.valueDeclaration.pos >= functionLocation.body.pos &&
        result.valueDeclaration.end <= functionLocation.body.end
      ) {
        const ls = qf.get.nodeLinks(functionLocation);
        if (ls.declarationRequiresScopeChange === undefined) ls.declarationRequiresScopeChange = forEach(functionLocation.params, requiresScopeChange) || false;
        return !ls.declarationRequiresScopeChange;
      }
      return false;
      function requiresScopeChange(node: qt.ParamDeclaration): boolean {
        return requiresScopeChangeWorker(node.name) || (!!node.initer && requiresScopeChangeWorker(node.initer));
      }
      function requiresScopeChangeWorker(node: Node): boolean {
        switch (node.kind) {
          case Syntax.ArrowFunction:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.Constructor:
            return false;
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.PropertyAssignment:
            return requiresScopeChangeWorker((node as qt.MethodDeclaration | qt.AccessorDeclaration | qt.PropertyAssignment).name);
          case Syntax.PropertyDeclaration:
            if (qf.has.staticModifier(node)) return target < qt.ScriptTarget.ESNext || !compilerOpts.useDefineForClassFields;
            return requiresScopeChangeWorker((node as qt.PropertyDeclaration).name);
          default:
            if (qf.is.nullishCoalesce(node) || qf.is.optionalChain(node)) return false;
            if (node.kind === Syntax.BindingElem && node.dot3Token && node.parent.kind === Syntax.ObjectBindingPattern) return false;
            if (qf.is.typeNode(node)) return false;
            return qf.each.child(node, requiresScopeChangeWorker) || false;
        }
      }
    }
    reportNonDefaultExport(moduleSymbol: Symbol, node: qt.ImportClause) {
      if (moduleSymbol.exports?.has(node.symbol.escName))
        error(node.name, qd.msgs.Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead, moduleSymbol.symbolToString(), node.symbol.symbolToString());
      else {
        const diagnostic = error(node.name, qd.msgs.Module_0_has_no_default_export, moduleSymbol.symbolToString());
        const exportStar = moduleSymbol.exports?.get(InternalSymbol.ExportStar);
        if (exportStar) {
          const defaultExport = qf.find.up(
            exportStar.declarations,
            (decl) => !!(decl.kind === Syntax.ExportDeclaration && decl.moduleSpecifier && resolveExternalModuleName(decl, decl.moduleSpecifier)?.exports?.has(InternalSymbol.Default))
          );
          if (defaultExport) addRelatedInfo(diagnostic, qf.make.diagForNode(defaultExport, qd.msgs.export_Asterisk_does_not_re_export_a_default));
        }
      }
    }
    combineValueAndTypeSymbols(valueSymbol: Symbol, typeSymbol: Symbol): Symbol {
      if (valueSymbol === unknownSymbol && typeSymbol === unknownSymbol) return unknownSymbol;
      if (valueSymbol.flags & (SymbolFlags.Type | SymbolFlags.Namespace)) return valueSymbol;
      const result = new qc.Symbol(valueSymbol.flags | typeSymbol.flags, valueSymbol.escName);
      result.declarations = deduplicate(concatenate(valueSymbol.declarations, typeSymbol.declarations), equateValues);
      result.parent = valueSymbol.parent || typeSymbol.parent;
      if (valueSymbol.valueDeclaration) result.valueDeclaration = valueSymbol.valueDeclaration;
      if (typeSymbol.members) result.members = cloneMap(typeSymbol.members);
      if (valueSymbol.exports) result.exports = cloneMap(valueSymbol.exports);
      return result;
    }
    tryGetMemberInModuleExports(memberName: qu.__String, moduleSymbol: Symbol): Symbol | undefined {
      const symbolTable = qf.get.exportsOfModule(moduleSymbol);
      if (symbolTable) return symbolTable.get(memberName);
    }
    tryGetMemberInModuleExportsAndProperties(memberName: qu.__String, moduleSymbol: Symbol): Symbol | undefined {
      const symbol = tryGetMemberInModuleExports(memberName, moduleSymbol);
      if (symbol) return symbol;
      const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
      if (exportEquals === moduleSymbol) return;
      const type = exportEquals.typeOfSymbol();
      return type.flags & qt.TypeFlags.Primitive || getObjectFlags(type) & ObjectFlags.Class || qf.type.is.arrayOrTupleLike(type) ? undefined : qf.get.propertyOfType(type, memberName);
    }
    addDeclarationToLateBoundSymbol(symbol: Symbol, member: qt.LateBoundDecl | qt.BinaryExpression, symbolFlags: SymbolFlags) {
      qf.assert.true(!!(this.checkFlags() & qt.CheckFlags.Late), 'Expected a late-bound symbol.');
      symbol.flags |= symbolFlags;
      member.symbol.links.lateSymbol = symbol;
      if (!symbol.declarations) symbol.declarations = [member];
      else {
        symbol.declarations.push(member);
      }
      if (symbolFlags & SymbolFlags.Value) {
        if (!symbol.valueDeclaration || symbol.valueDeclaration.kind !== member.kind) symbol.valueDeclaration = member;
      }
    }
    lateBindMember(parent: Symbol, earlySymbols: SymbolTable | undefined, lateSymbols: EscapedMap<qt.TransientSymbol>, decl: qt.LateBoundDecl | qt.LateBoundBinaryExpressionDeclaration) {
      qf.assert.true(!!decl.symbol, 'The member is expected to have a symbol.');
      const ls = qf.get.nodeLinks(decl);
      if (!ls.resolvedSymbol) {
        ls.resolvedSymbol = decl.symbol;
        const declName = decl.kind === Syntax.BinaryExpression ? decl.left : decl.name;
        const type = declName.kind === Syntax.ElemAccessExpression ? check.expressionCached(declName.argExpression) : check.computedPropertyName(declName);
        if (qf.type.is.usableAsPropertyName(type)) {
          const memberName = getPropertyNameFromType(type);
          const symbolFlags = decl.symbol.flags;
          let lateSymbol = lateSymbols.get(memberName);
          if (!lateSymbol) lateSymbols.set(memberName, (lateSymbol = new qc.Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late)));
          const earlySymbol = earlySymbols && earlySymbols.get(memberName);
          if (lateSymbol.flags & qf.get.excluded(symbolFlags) || earlySymbol) {
            const declarations = earlySymbol ? concatenate(earlySymbol.declarations, lateSymbol.declarations) : lateSymbol.declarations;
            const name = (!(type.flags & qt.TypeFlags.UniqueESSymbol) && qy.get.unescUnderscores(memberName)) || declarationNameToString(declName);
            forEach(declarations, (declaration) => error(qf.decl.nameOf(declaration) || declaration, qd.msgs.Property_0_was_also_declared_here, name));
            error(declName || decl, qd.msgs.Duplicate_property_0, name);
            lateSymbol = new qc.Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late);
          }
          lateSymbol.nameType = type;
          addDeclarationToLateBoundSymbol(lateSymbol, decl, symbolFlags);
          if (lateSymbol.parent) qf.assert.true(lateSymbol.parent === parent, 'Existing symbol parent should match new one');
          else {
            lateSymbol.parent = parent;
          }
          return (ls.resolvedSymbol = lateSymbol);
        }
      }
      return ls.resolvedSymbol;
    }
    combineUnionThisParam(left: Symbol | undefined, right: Symbol | undefined): Symbol | undefined {
      if (!left || !right) return left || right;
      const thisType = qf.get.intersectionType([left.typeOfSymbol(), right.typeOfSymbol()]);
      return createSymbolWithType(left, thisType);
    }
    findDiscriminantProperties(sourceProperties: Symbol[], target: qt.Type): Symbol[] | undefined {
      let result: Symbol[] | undefined;
      for (const sourceProperty of sourceProperties) {
        if (isDiscriminantProperty(target, sourceProperty.escName)) {
          if (result) {
            result.push(sourceProperty);
            continue;
          }
          result = [sourceProperty];
        }
      }
      return result;
    }
    markPropertyAsReferenced(prop: Symbol, nodeForCheckWriteOnly: Node | undefined, isThisAccess: boolean) {
      const valueDeclaration = prop && prop.flags & SymbolFlags.ClassMember && prop.valueDeclaration;
      if (!valueDeclaration) return;
      const hasPrivateModifier = qf.has.effectiveModifier(valueDeclaration, ModifierFlags.Private);
      const hasPrivateIdentifier = qf.is.namedDeclaration(prop.valueDeclaration) && prop.valueDeclaration.name.kind === Syntax.PrivateIdentifier;
      if (!hasPrivateModifier && !hasPrivateIdentifier) return;
      if (nodeForCheckWriteOnly && qf.is.writeOnlyAccess(nodeForCheckWriteOnly) && !(prop.flags & SymbolFlags.SetAccessor)) return;
      if (isThisAccess) {
        const containingMethod = qc.findAncestor(nodeForCheckWriteOnly, isFunctionLikeDeclaration);
        if (containingMethod && containingMethod.symbol === prop) return;
      }
      (prop.checkFlags() & qt.CheckFlags.Instantiated ? prop.links.target : prop)!.referenced = SymbolFlags.All;
    }
    typeHasProtectedAccessibleBase(target: Symbol, type: qt.InterfaceType): boolean {
      const baseTypes = getBaseTypes(type);
      if (!length(baseTypes)) return false;
      const firstBase = baseTypes[0];
      if (firstBase.flags & qt.TypeFlags.Intersection) {
        const types = (firstBase as qt.IntersectionType).types;
        const mixinFlags = findMixins(types);
        let i = 0;
        for (const intersectionMember of (firstBase as qt.IntersectionType).types) {
          if (!mixinFlags[i]) {
            if (getObjectFlags(intersectionMember) & (ObjectFlags.Class | ObjectFlags.Interface)) {
              if (intersectionMember.symbol === target) return true;
              if (typeHasProtectedAccessibleBase(target, intersectionMember as qt.InterfaceType)) return true;
            }
          }
          i++;
        }
        return false;
      }
      if (firstBase.symbol === target) return true;
      return typeHasProtectedAccessibleBase(target, firstBase as qt.InterfaceType);
    }
    mergeJSSymbols(target: Symbol, source: Symbol | undefined) {
      if (source) {
        const links = source.links;
        if (!links.inferredClassSymbol || !links.inferredClassSymbol.has('' + target.getId())) {
          const inferred = target.isTransient() ? target : (target.clone() as qt.TransientSymbol);
          inferred.exports = inferred.exports || new qc.SymbolTable();
          inferred.members = inferred.members || new qc.SymbolTable();
          inferred.flags |= source.flags & SymbolFlags.Class;
          if (qu.hasEntries(source.exports)) inferred.exports.merge(source.exports);
          if (qu.hasEntries(source.members)) inferred.members.merge(source.members);
          (links.inferredClassSymbol || (links.inferredClassSymbol = new qu.QMap<qt.TransientSymbol>())).set('' + inferred.getId(), inferred);
          return inferred;
        }
        return links.inferredClassSymbol.get('' + target.getId());
      }
    }
    assignParamType(param: Symbol, type?: qt.Type) {
      const links = param.links;
      if (!links.type) {
        const declaration = param.valueDeclaration as qt.ParamDeclaration;
        links.type = type || qf.get.widenedTypeForVariableLikeDeclaration(declaration, true);
        if (declaration.name.kind !== Syntax.Identifier) {
          if (links.type === unknownType) links.type = qf.get.typeFromBindingPattern(declaration.name);
          assignBindingElemTypes(declaration.name);
        }
      }
    }
  })());
}
export interface Fsymb extends ReturnType<typeof newSymb> {}

export interface Ftype extends qc.Ftype {}
export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface _Ftype extends qc.Ftype {}
  class _Ftype {}
  qu.addMixins(_Ftype, [qc.newType(qf)]);
  return (qf.type = new (class Base extends _Ftype {
    get = new (class extends Base {
      unionObjectAndArrayLiteralCandidates(candidates: qt.Type[]): qt.Type[] {
        if (candidates.length > 1) {
          const objectLiterals = filter(candidates, qf.type.is.objectOrArrayLiteral);
          if (objectLiterals.length) {
            const literalsType = qf.get.unionType(objectLiterals, qt.UnionReduction.Subtype);
            return concatenate(
              filter(candidates, (t) => !qf.type.is.objectOrArrayLiteral(t)),
              [literalsType]
            );
          }
        }
        return candidates;
      }

      intersectionType(types: readonly Type[], aliasSymbol?: Symbol, aliasTypeArgs?: readonly Type[]): Type {
        const typeMembershipMap: qu.QMap<Type> = new qu.QMap();
        const includes = addTypesToIntersection(typeMembershipMap, 0, types);
        const typeSet: Type[] = arrayFrom(typeMembershipMap.values());
        if (
          includes & TypeFlags.Never ||
          (strictNullChecks && includes & TypeFlags.Nullable && includes & (TypeFlags.Object | TypeFlags.NonPrimitive | TypeFlags.IncludesEmptyObject)) ||
          (includes & TypeFlags.NonPrimitive && includes & (TypeFlags.DisjointDomains & ~TypeFlags.NonPrimitive)) ||
          (includes & TypeFlags.StringLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.StringLike)) ||
          (includes & TypeFlags.NumberLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.NumberLike)) ||
          (includes & TypeFlags.BigIntLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.BigIntLike)) ||
          (includes & TypeFlags.ESSymbolLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.ESSymbolLike)) ||
          (includes & TypeFlags.VoidLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.VoidLike))
        ) {
          return neverType;
        }
        if (includes & TypeFlags.Any) return includes & TypeFlags.IncludesWildcard ? wildcardType : anyType;
        if (!strictNullChecks && includes & TypeFlags.Nullable) return includes & TypeFlags.Undefined ? undefinedType : nullType;
        if (
          (includes & TypeFlags.String && includes & TypeFlags.StringLiteral) ||
          (includes & TypeFlags.Number && includes & TypeFlags.NumberLiteral) ||
          (includes & TypeFlags.BigInt && includes & TypeFlags.BigIntLiteral) ||
          (includes & TypeFlags.ESSymbol && includes & TypeFlags.UniqueESSymbol)
        ) {
          removeRedundantPrimitiveTypes(typeSet, includes);
        }
        if (includes & TypeFlags.IncludesEmptyObject && includes & TypeFlags.Object) orderedRemoveItemAt(typeSet, qf.find.index(typeSet, qf.type.is.emptyAnonymousObject));
        if (typeSet.length === 0) return unknownType;
        if (typeSet.length === 1) return typeSet[0];
        const id = this.typeListId(typeSet);
        let result = intersectionTypes.get(id);
        if (!result) {
          if (includes & TypeFlags.Union) {
            if (intersectUnionsOfPrimitiveTypes(typeSet)) result = this.intersectionType(typeSet, aliasSymbol, aliasTypeArgs);
            else if (extractIrreducible(typeSet, TypeFlags.Undefined)) {
              result = this.unionType([this.intersectionType(typeSet), undefinedType], UnionReduction.Literal, aliasSymbol, aliasTypeArgs);
            } else if (extractIrreducible(typeSet, TypeFlags.Null)) {
              result = this.unionType([this.intersectionType(typeSet), nullType], UnionReduction.Literal, aliasSymbol, aliasTypeArgs);
            } else {
              const size = reduceLeft(typeSet, (n, t) => n * (t.flags & TypeFlags.Union ? (<qt.UnionType>t).types.length : 1), 1);
              if (size >= 100000) {
                error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
                return errorType;
              }
              const unionIndex = qf.find.index(typeSet, (t) => (t.flags & TypeFlags.Union) !== 0);
              const unionType = <qt.UnionType>typeSet[unionIndex];
              result = this.unionType(
                map(unionType.types, (t) => this.intersectionType(replaceElem(typeSet, unionIndex, t))),
                UnionReduction.Literal,
                aliasSymbol,
                aliasTypeArgs
              );
            }
          } else {
            result = qf.make.intersectionType(typeSet, aliasSymbol, aliasTypeArgs);
          }
          intersectionTypes.set(id, result);
        }
        return result;
      }
      baseTypeNodeOfClass(t: qt.InterfaceType): qt.ExpressionWithTypings | undefined {
        return this.effectiveBaseTypeNode(t.symbol.valueDeclaration as qt.ClassLikeDeclaration);
      }
      baseConstructorTypeOfClass(t: qt.InterfaceType): Type {
        if (!type.resolvedBaseConstructorType) {
          const decl = <qt.ClassLikeDeclaration>type.symbol.valueDeclaration;
          const extended = this.effectiveBaseTypeNode(decl);
          const baseTypeNode = this.baseTypeNodeOfClass(t);
          if (!baseTypeNode) return (t.resolvedBaseConstructorType = undefinedType);
          if (!pushTypeResolution(t, qt.TypeSystemPropertyName.ResolvedBaseConstructorType)) return errorType;
          const baseConstructorType = qf.check.expression(baseTypeNode.expression);
          if (extended && baseTypeNode !== extended) {
            qf.assert.true(!extended.typeArgs);
            qf.check.expression(extended.expression);
          }
          if (baseConstructorType.flags & (TypeFlags.Object | TypeFlags.Intersection)) resolveStructuredTypeMembers(<qt.ObjectType>baseConstructorType);
          if (!popTypeResolution()) {
            error(t.symbol.valueDeclaration, qd.msgs._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, t.symbol.symbolToString());
            return (t.resolvedBaseConstructorType = errorType);
          }
          if (!(baseConstructorType.flags & TypeFlags.Any) && baseConstructorType !== nullWideningType && !qf.type.is.constructr(baseConstructorType)) {
            const err = error(baseTypeNode.expression, qd.msgs.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
            if (baseConstructorType.flags & TypeFlags.TypeParam) {
              const constraint = this.constraintFromTypeParam(baseConstructorType);
              let ctorReturn: Type = unknownType;
              if (constraint) {
                const ctorSig = this.signaturesOfType(constraint, SignatureKind.Construct);
                if (ctorSig[0]) ctorReturn = this.returnTypSignature(ctorSig[0]);
              }
              addRelatedInfo(
                err,
                qf.make.diagForNode(
                  baseConstructorType.symbol.declarations[0],
                  qd.msgs.Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1,
                  baseConstructorType.symbol.symbolToString(),
                  typeToString(ctorReturn)
                )
              );
            }
            return (t.resolvedBaseConstructorType = errorType);
          }
          t.resolvedBaseConstructorType = baseConstructorType;
        }
        return t.resolvedBaseConstructorType;
      }
      implementsTypes(t: qt.InterfaceType): qt.BaseType[] {
        let resolvedImplementsTypes: qt.BaseType[] = qu.empty;
        for (const declaration of t.symbol.declarations) {
          const implementsTypeNodes = this.effectiveImplementsTypeNodes(declaration as qt.ClassLikeDeclaration);
          if (!implementsTypeNodes) continue;
          for (const n of implementsTypeNodes) {
            const implementsType = this.typeFromTypeNode(n);
            if (implementsType !== errorType) {
              if (resolvedImplementsTypes === qu.empty) resolvedImplementsTypes = [<qt.ObjectType>implementsType];
              else {
                resolvedImplementsTypes.push(implementsType);
              }
            }
          }
        }
        return resolvedImplementsTypes;
      }
      baseTypes(t: qt.InterfaceType): qt.BaseType[] {
        if (!type.resolvedBaseTypes) {
          if (t.objectFlags & ObjectFlags.Tuple) t.resolvedBaseTypes = [qf.make.arrayType(this.unionType(t.typeParams || qu.empty), (<qt.TupleType>type).readonly)];
          else if (t.symbol.flags & (SymbolFlags.Class | SymbolFlags.Interface)) {
            if (t.symbol.flags & SymbolFlags.Class) resolveBaseTypesOfClass(t);
            if (t.symbol.flags & SymbolFlags.Interface) resolveBaseTypesOfInterface(t);
          } else {
            qu.fail('type must be class or interface');
          }
        }
        return t.resolvedBaseTypes;
      }
      propertyNameFromType(t: qt.StringLiteralType | qt.NumberLiteralType | qt.UniqueESSymbolType): qu.__String {
        if (t.flags & TypeFlags.UniqueESSymbol) return (<qt.UniqueESSymbolType>type).escName;
        if (t.flags & (TypeFlags.StringLiteral | TypeFlags.NumberLiteral)) return qy.get.escUnderscores('' + (<qt.StringLiteralType | qt.NumberLiteralType>type).value);
        return qu.fail();
      }
      defaultConstrSignatures(classType: qt.InterfaceType): Signature[] {
        const baseConstructorType = this.baseConstructorTypeOfClass(classType);
        const bSignatures = this.signaturesOfType(baseConstructorType, SignatureKind.Construct);
        if (bSignatures.length === 0) return [qf.make.signature(undefined, classType.localTypeParams, undefined, qu.empty, classType, undefined, 0, SignatureFlags.None)];
        const baseTypeNode = this.baseTypeNodeOfClass(classType)!;
        const isJavaScript = qf.is.inJSFile(baseTypeNode);
        const typeArgs = typeArgsFromTypingReference(baseTypeNode);
        const typeArgCount = length(typeArgs);
        const result: Signature[] = [];
        for (const baseSig of bSignatures) {
          const minTypeArgCount = this.minTypeArgCount(baseSig.typeParams);
          const typeParamCount = length(baseSig.typeParams);
          if (isJavaScript || (typeArgCount >= minTypeArgCount && typeArgCount <= typeParamCount)) {
            const sig = typeParamCount ? qf.make.signatureInstantiation(baseSig, fillMissingTypeArgs(typeArgs, baseSig.typeParams, minTypeArgCount, isJavaScript)) : clSignature(baseSig);
            sig.typeParams = classType.localTypeParams;
            sig.resolvedReturn = classType;
            result.push(sig);
          }
        }
        return result;
      }
      typeParamFromMappedType(t: qt.MappedType) {
        return t.typeParam || (t.typeParam = this.declaredTypeOfTypeParam(this.symbolOfNode(t.declaration.typeParam)));
      }
      constraintTypeFromMappedType(t: qt.MappedType) {
        return t.constraintType || (t.constraintType = this.constraintOfTypeParam(this.typeParamFromMappedType(t)) || errorType);
      }
      templateTypeFromMappedType(t: qt.MappedType) {
        return (
          t.templateType ||
          (t.templateType = t.declaration.type
            ? instantiateType(addOptionality(this.typeFromTypeNode(t.declaration.type), !!(this.mappedTypeModifiers(t) & MappedTypeModifiers.IncludeOptional)), t.mapper)
            : errorType)
        );
      }
      constraintDeclarationForMappedType(t: qt.MappedType) {
        return this.effectiveConstraintOfTypeParam(t.declaration.typeParam);
      }
      modifiersTypeFromMappedType(t: qt.MappedType) {
        if (!type.modifiersType) {
          if (qf.is.mappedTypeWithKeyofConstraintDeclaration(t))
            t.modifiersType = instantiateType(this.typeFromTypeNode((<qt.TypingOperator>this.constraintDeclarationForMappedType(t)).type), t.mapper);
          else {
            const declaredType = <qt.MappedType>this.typeFromMappedTyping(t.declaration);
            const constraint = this.constraintTypeFromMappedType(declaredType);
            const extendedConstraint = constraint && constraint.flags & TypeFlags.TypeParam ? this.constraintOfTypeParam(<TypeParam>constraint) : constraint;
            t.modifiersType = extendedConstraint && extendedConstraint.flags & TypeFlags.Index ? instantiateType((<qt.IndexType>extendedConstraint).type, t.mapper) : unknownType;
          }
        }
        return t.modifiersType;
      }
      mappedTypeModifiers(t: qt.MappedType): MappedTypeModifiers {
        const declaration = t.declaration;
        return (
          (declaration.readonlyToken ? (declaration.readonlyToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeReadonly : MappedTypeModifiers.IncludeReadonly) : 0) |
          (declaration.questionToken ? (declaration.questionToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeOptional : MappedTypeModifiers.IncludeOptional) : 0)
        );
      }
      mappedTypeOptionality(t: qt.MappedType): number {
        const modifiers = this.mappedTypeModifiers(t);
        return modifiers & MappedTypeModifiers.ExcludeOptional ? -1 : modifiers & MappedTypeModifiers.IncludeOptional ? 1 : 0;
      }
      combinedMappedTypeOptionality(t: qt.MappedType): number {
        const optionality = this.mappedTypeOptionality(t);
        const modifiersType = this.modifiersTypeFromMappedType(t);
        return optionality || (qf.type.is.genericMapped(modifiersType) ? this.mappedTypeOptionality(modifiersType) : 0);
      }
      propertiesOfUnionOrIntersectionType(t: qt.UnionOrIntersectionType): Symbol[] {
        if (!type.resolvedProperties) {
          const members = new qc.SymbolTable();
          for (const current of t.types) {
            for (const prop of this.propertiesOfType(current)) {
              if (!members.has(prop.escName)) {
                const combinedProp = this.propertyOfUnionOrIntersectionType(t, prop.escName);
                if (combinedProp) members.set(prop.escName, combinedProp);
              }
            }
            if (t.flags & TypeFlags.Union && !this.indexInfoOfType(current, qt.IndexKind.String) && !this.indexInfoOfType(current, qt.IndexKind.Number)) break;
          }
          t.resolvedProperties = this.namedMembers(members);
        }
        return t.resolvedProperties;
      }
      allPossiblePropertiesOfTypes(types: readonly Type[]): Symbol[] {
        const unionType = this.unionType(types);
        if (!(unionType.flags & TypeFlags.Union)) return this.augmentedPropertiesOfType(unionType);
        const props = new qc.SymbolTable();
        for (const memberType of types) {
          for (const { escName } of this.augmentedPropertiesOfType(memberType)) {
            if (!props.has(escName)) {
              const prop = qf.make.unionOrIntersectionProperty(unionType as qt.UnionType, escName);
              if (prop) props.set(escName, prop);
            }
          }
        }
        return arrayFrom(props.values());
      }
      constraintOfType(t: qt.InstantiableType | qt.UnionOrIntersectionType): Type | undefined {
        return t.flags & TypeFlags.TypeParam
          ? this.constraintOfTypeParam(<TypeParam>type)
          : t.flags & TypeFlags.IndexedAccess
          ? this.constraintOfIndexedAccess(<qt.IndexedAccessType>type)
          : t.flags & TypeFlags.Conditional
          ? this.constraintOfConditionalType(<qt.ConditionalType>type)
          : this.baseConstraintOfType(t);
      }
      constraintOfIndexedAccess(t: qt.IndexedAccessType) {
        return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromIndexedAccess(t) : undefined;
      }
      constraintFromIndexedAccess(t: qt.IndexedAccessType) {
        const indexConstraint = this.simplifiedTypeOrConstraint(t.indexType);
        if (indexConstraint && indexConstraint !== t.indexType) {
          const indexedAccess = this.indexedAccessTypeOrUndefined(t.objectType, indexConstraint);
          if (indexedAccess) return indexedAccess;
        }
        const objectConstraint = this.simplifiedTypeOrConstraint(t.objectType);
        if (objectConstraint && objectConstraint !== t.objectType) return this.indexedAccessTypeOrUndefined(objectConstraint, t.indexType);
        return;
      }
      defaultConstraintOfConditionalType(t: qt.ConditionalType) {
        if (!type.resolvedDefaultConstraint) {
          const trueConstraint = this.inferredTrueTypeFromConditionalType(t);
          const falseConstraint = this.falseTypeFromConditionalType(t);
          t.resolvedDefaultConstraint = qf.type.is.any(trueConstraint) ? falseConstraint : qf.type.is.any(falseConstraint) ? trueConstraint : this.unionType([trueConstraint, falseConstraint]);
        }
        return t.resolvedDefaultConstraint;
      }
      constraintOfDistributiveConditionalType(t: qt.ConditionalType): Type | undefined {
        if (t.root.isDistributive && t.restrictive !== type) {
          const simplified = this.simplifiedType(t.checkType, false);
          const constraint = simplified === t.checkType ? this.constraintOfType(simplified) : simplified;
          if (constraint && constraint !== t.checkType) {
            const instantiated = this.conditionalTypeInstantiation(t, prependTypeMapping(t.root.checkType, constraint, t.mapper));
            if (!(instantiated.flags & TypeFlags.Never)) return instantiated;
          }
        }
        return;
      }
      constraintFromConditionalType(t: qt.ConditionalType) {
        return this.constraintOfDistributiveConditionalType(t) || this.defaultConstraintOfConditionalType(t);
      }
      constraintOfConditionalType(t: qt.ConditionalType) {
        return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromConditionalType(t) : undefined;
      }
      effectiveConstraintOfIntersection(types: readonly Type[], targetIsUnion: boolean) {
        let constraints: Type[] | undefined;
        let hasDisjointDomainType = false;
        for (const t of types) {
          if (t.flags & TypeFlags.Instantiable) {
            let constraint = this.constraintOfType(t);
            while (constraint && constraint.flags & (TypeFlags.TypeParam | TypeFlags.Index | TypeFlags.Conditional)) {
              constraint = this.constraintOfType(constraint);
            }
            if (constraint) {
              constraints = append(constraints, constraint);
              if (targetIsUnion) constraints = append(constraints, t);
            }
          } else if (t.flags & TypeFlags.DisjointDomains) hasDisjointDomainType = true;
        }
        if (constraints && (targetIsUnion || hasDisjointDomainType)) {
          if (hasDisjointDomainType) {
            for (const t of types) {
              if (t.flags & TypeFlags.DisjointDomains) constraints = append(constraints, t);
            }
          }
          return this.intersectionType(constraints);
        }
        return;
      }
      resolvedBaseConstraint(t: qt.InstantiableType | qt.UnionOrIntersectionType): Type {
        let nonTerminating = false;
        return t.resolvedBaseConstraint || (t.resolvedBaseConstraint = this.typeWithThisArg(this.immediateBaseConstraint(t), type));
        const immediateBaseConstraint = (t: Type): Type => {
          if (!t.immediateBaseConstraint) {
            if (!pushTypeResolution(t, qt.TypeSystemPropertyName.ImmediateBaseConstraint)) return circularConstraintType;
            if (constraintDepth >= 50) {
              error(currentNode, qd.msgs.Type_instantiation_is_excessively_deep_and_possibly_infinite);
              nonTerminating = true;
              return (t.immediateBaseConstraint = noConstraintType);
            }
            constraintDepth++;
            let result = computeBaseConstraint(this.simplifiedType(t, false));
            constraintDepth--;
            if (!popTypeResolution()) {
              if (t.flags & TypeFlags.TypeParam) {
                const errorNode = this.constraintDeclaration(<TypeParam>t);
                if (errorNode) {
                  const diagnostic = error(errorNode, qd.msgs.Type_param_0_has_a_circular_constraint, typeToString(t));
                  if (currentNode && !qf.is.descendantOf(errorNode, currentNode) && !qf.is.descendantOf(currentNode, errorNode))
                    addRelatedInfo(diagnostic, qf.make.diagForNode(currentNode, qd.msgs.Circularity_originates_in_type_at_this_location));
                }
              }
              result = circularConstraintType;
            }
            if (nonTerminating) result = circularConstraintType;
            t.immediateBaseConstraint = result || noConstraintType;
          }
          return t.immediateBaseConstraint;
        };
        const baseConstraint = (t: Type): Type | undefined => {
          const c = this.immediateBaseConstraint(t);
          return c !== noConstraintType && c !== circularConstraintType ? c : undefined;
        };
        const computeBaseConstraint = (t: Type): Type | undefined => {
          if (t.flags & TypeFlags.TypeParam) {
            const constraint = this.constraintFromTypeParam(<TypeParam>t);
            return (t as TypeParam).isThisType || !constraint ? constraint : this.baseConstraint(constraint);
          }
          if (t.flags & TypeFlags.UnionOrIntersection) {
            const types = (<qt.UnionOrIntersectionType>t).types;
            const baseTypes: Type[] = [];
            for (const type of types) {
              const baseType = this.baseConstraint(t);
              if (baseType) baseTypes.push(baseType);
            }
            return t.flags & TypeFlags.Union && baseTypes.length === types.length
              ? this.unionType(baseTypes)
              : t.flags & TypeFlags.Intersection && baseTypes.length
              ? this.intersectionType(baseTypes)
              : undefined;
          }
          if (t.flags & TypeFlags.Index) return keyofConstraintType;
          if (t.flags & TypeFlags.IndexedAccess) {
            const baseObjectType = this.baseConstraint((<qt.IndexedAccessType>t).objectType);
            const baseIndexType = this.baseConstraint((<qt.IndexedAccessType>t).indexType);
            const baseIndexedAccess = baseObjectType && baseIndexType && this.indexedAccessTypeOrUndefined(baseObjectType, baseIndexType);
            return baseIndexedAccess && this.baseConstraint(baseIndexedAccess);
          }
          if (t.flags & TypeFlags.Conditional) {
            const constraint = this.constraintFromConditionalType(<qt.ConditionalType>t);
            constraintDepth++;
            const result = constraint && this.baseConstraint(constraint);
            constraintDepth--;
            return result;
          }
          if (t.flags & TypeFlags.Substitution) return this.baseConstraint((<qt.SubstitutionType>t).substitute);
          return t;
        };
      }
      apparentTypeOfIntersectionType(t: qt.IntersectionType) {
        return t.resolvedApparentType || (t.resolvedApparentType = this.typeWithThisArg(t, type, true));
      }
      apparentTypeOfMappedType(t: qt.MappedType) {
        return t.resolvedApparentType || (t.resolvedApparentType = this.resolvedApparentTypeOfMappedType(t));
      }
      resolvedApparentTypeOfMappedType(t: qt.MappedType) {
        const r = this.homomorphicTypeVariable(t);
        if (r) {
          const c = this.constraintOfTypeParam(r);
          if (c && (qf.type.is.array(c) || qf.type.is.tuple(c))) return instantiateType(t, prependTypeMapping(r, c, t.mapper));
        }
        return t;
      }
      unionOrIntersectionProperty(t: qt.UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
        const properties = t.propertyCache || (t.propertyCache = new qc.SymbolTable());
        let property = properties.get(name);
        if (!property) {
          property = qf.make.unionOrIntersectionProperty(t, name);
          if (property) properties.set(name, property);
        }
        return property;
      }
      propertyOfUnionOrIntersectionType(t: qt.UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
        const property = this.unionOrIntersectionProperty(t, name);
        return property && !(this.checkFlags(property) & qt.CheckFlags.ReadPartial) ? property : undefined;
      }
      reducedUnionType(unionType: qt.UnionType) {
        const reducedTypes = sameMap(unionType.types, getReducedType);
        if (reducedTypes === unionType.types) return unionType;
        const reduced = this.unionType(reducedTypes);
        if (reduced.flags & TypeFlags.Union) (<qt.UnionType>reduced).resolvedReducedType = reduced;
        return reduced;
      }
      typeParamsFromDeclaration(declaration: qt.DeclarationWithTypeParams): TypeParam[] | undefined {
        let result: TypeParam[] | undefined;
        for (const n of this.effectiveTypeParamDeclarations(declaration)) {
          result = appendIfUnique(result, this.declaredTypeOfTypeParam(n.symbol));
        }
        return result;
      }
      minTypeArgCount(typeParams: readonly TypeParam[] | undefined): number {
        let minTypeArgCount = 0;
        if (typeParams) {
          for (let i = 0; i < typeParams.length; i++) {
            if (!qf.has.typeParamDefault(typeParams[i])) minTypeArgCount = i + 1;
          }
        }
        return minTypeArgCount;
      }
      typeArgs(t: TypeReference): readonly Type[] {
        if (!type.resolvedTypeArgs) {
          if (!pushTypeResolution(t, qt.TypeSystemPropertyName.ResolvedTypeArgs)) return t.target.localTypeParams?.map(() => errorType) || qu.empty;
          const n = t.node;
          const typeArgs = !n
            ? qu.empty
            : n.kind === Syntax.TypingReference
            ? concatenate(t.target.outerTypeParams, this.effectiveTypeArgs(n, t.target.localTypeParams!))
            : n.kind === Syntax.ArrayTyping
            ? [this.typeFromTypeNode(n.elemType)]
            : map(n.elems, this.typeFromTypeNode);
          if (popTypeResolution()) t.resolvedTypeArgs = t.mapper ? instantiateTypes(typeArgs, t.mapper) : typeArgs;
          else {
            t.resolvedTypeArgs = t.target.localTypeParams?.map(() => errorType) || qu.empty;
            error(
              t.node || currentNode,
              t.target.symbol ? qd.msgs.Type_args_for_0_circularly_reference_themselves : qd.msgs.Tuple_type_args_circularly_reference_themselves,
              t.target.symbol && t.target.symbol.symbolToString()
            );
          }
        }
        return t.resolvedTypeArgs;
      }
      typeReferenceArity(t: TypeReference): number {
        return length(t.target.typeParams);
      }
      typeReferenceName(n: TypeReferenceType): qt.EntityNameOrEntityNameExpression | undefined {
        switch (n.kind) {
          case Syntax.TypingReference:
            return n.typeName;
          case Syntax.ExpressionWithTypings:
            const expr = n.expression;
            if (qf.is.entityNameExpression(expr)) return expr;
        }
        return;
      }
      typeFromTypeReference(n: TypeReferenceType): Type {
        const links = this.nodeLinks(n);
        if (!links.resolvedType) {
          if (qf.is.constTypeReference(n) && qf.is.assertionExpression(n.parent)) {
            links.resolvedSymbol = unknownSymbol;
            return (links.resolvedType = qf.check.expressionCached(n.parent?.expression));
          }
          let symbol: Symbol | undefined;
          let type: Type | undefined;
          const meaning = SymbolFlags.Type;
          if (qf.is.docTypeReference(n)) {
            type = this.intendedTypeFromDocTypeReference(n);
            if (!type) {
              symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning, true);
              if (symbol === unknownSymbol) symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning | SymbolFlags.Value);
              else {
                resolveTypeReferenceName(this.typeReferenceName(n), meaning);
              }
              type = this.typeReferenceType(n, symbol);
            }
          }
          if (!type) {
            symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning);
            type = this.typeReferenceType(n, symbol);
          }
          links.resolvedSymbol = symbol;
          links.resolvedType = type;
        }
        return links.resolvedType;
      }
      indexTypeForGenericType(t: qt.InstantiableType | qt.UnionOrIntersectionType, stringsOnly: boolean) {
        return stringsOnly ? t.resolvedStringIndexType || (t.resolvedStringIndexType = qf.make.indexType(t, true)) : t.resolvedIndexType || (t.resolvedIndexType = qf.make.indexType(t, false));
      }
      simplifiedIndexedAccessType(t: qt.IndexedAccessType, writing: boolean): Type {
        const cache = writing ? 'simplifiedForWriting' : 'simplifiedForReading';
        if (type[cache]) return type[cache] === circularConstraintType ? type : type[cache]!;
        type[cache] = circularConstraintType;
        const objectType = unwrapSubstitution(this.simplifiedType(t.objectType, writing));
        const indexType = this.simplifiedType(t.indexType, writing);
        const distributedOverIndex = distributeObjectOverIndexType(objectType, indexType, writing);
        if (distributedOverIndex) return (type[cache] = distributedOverIndex);
        if (!(indexType.flags & TypeFlags.Instantiable)) {
          const distributedOverObject = distributeIndexOverObjectType(objectType, indexType, writing);
          if (distributedOverObject) return (type[cache] = distributedOverObject);
        }
        if (qf.type.is.genericMapped(objectType)) return (type[cache] = mapType(substituteIndexedMappedType(objectType, t.indexType), (t) => this.simplifiedType(t, writing)));
        return (type[cache] = type);
      }
      simplifiedConditionalType(t: qt.ConditionalType, writing: boolean) {
        const checkType = t.checkType;
        const extendsType = t.extendsType;
        const trueType = this.trueTypeFromConditionalType(t);
        const falseType = this.falseTypeFromConditionalType(t);
        if (falseType.flags & TypeFlags.Never && this.actualTypeVariable(trueType) === this.actualTypeVariable(checkType)) {
          if (checkType.flags & TypeFlags.Any || qf.type.is.assignableTo(this.restrictive(checkType), this.restrictive(extendsType))) return this.simplifiedType(trueType, writing);
          else if (qf.type.is.intersectionEmpty(checkType, extendsType)) return neverType;
        } else if (trueType.flags & TypeFlags.Never && this.actualTypeVariable(falseType) === this.actualTypeVariable(checkType)) {
          if (!(checkType.flags & TypeFlags.Any) && qf.type.is.assignableTo(this.restrictive(checkType), this.restrictive(extendsType))) return neverType;
          else if (checkType.flags & TypeFlags.Any || qf.type.is.intersectionEmpty(checkType, extendsType)) return this.simplifiedType(falseType, writing);
        }
        return type;
      }
      propertyNameFromIndex(
        indexType: Type,
        accessNode:
          | qt.StringLiteral
          | qt.Identifier
          | qc.PrivateIdentifier
          | qt.ObjectBindingPattern
          | qt.ArrayBindingPattern
          | qt.ComputedPropertyName
          | qt.NumericLiteral
          | qt.IndexedAccessTyping
          | qt.ElemAccessExpression
          | qt.SyntheticExpression
          | undefined
      ) {
        const accessExpression = accessNode && accessNode.kind === Syntax.ElemAccessExpression ? accessNode : undefined;
        return qf.type.is.usableAsPropertyName(indexType)
          ? this.propertyNameFromType(indexType)
          : accessExpression && qf.check.thatExpressionIsProperSymbolReference(accessExpression.argExpression, indexType, false)
          ? qu.this.propertyNameForKnownSymbolName(idText((<qt.PropertyAccessExpression>accessExpression.argExpression).name))
          : accessNode && qf.is.propertyName(accessNode)
          ? this.propertyNameForPropertyNameNode(accessNode)
          : undefined;
      }
      propertyTypeForIndexType(
        originalObjectType: Type,
        objectType: Type,
        indexType: Type,
        fullIndexType: Type,
        suppressNoImplicitAnyError: boolean,
        accessNode: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression | undefined,
        accessFlags: AccessFlags
      ) {
        const accessExpression = accessNode && accessNode.kind === Syntax.ElemAccessExpression ? accessNode : undefined;
        const propName = accessNode && accessNode.kind === Syntax.PrivateIdentifier ? undefined : this.propertyNameFromIndex(indexType, accessNode);
        if (propName !== undefined) {
          const prop = this.propertyOfType(objectType, propName);
          if (prop) {
            if (accessExpression) {
              markPropertyAsReferenced(prop, accessExpression, accessExpression.expression.kind === Syntax.ThisKeyword);
              if (qf.is.assignmentToReadonlyEntity(accessExpression, prop, this.assignmentTargetKind(accessExpression))) {
                error(accessExpression.argExpression, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, prop.symbolToString());
                return;
              }
              if (accessFlags & AccessFlags.CacheSymbol) this.nodeLinks(accessNode!).resolvedSymbol = prop;
              if (qf.is.thisPropertyAccessInConstructor(accessExpression, prop)) return autoType;
            }
            const propType = this.typeOfSymbol(prop);
            return accessExpression && this.assignmentTargetKind(accessExpression) !== qt.AssignmentKind.Definite ? this.flow.typeOfReference(accessExpression, propType) : propType;
          }
          if (everyType(objectType, qf.is.tupleType) && qt.NumericLiteral.name(propName) && +propName >= 0) {
            if (accessNode && everyType(objectType, (t) => !(<qt.TupleTypeReference>t).target.hasRestElem) && !(accessFlags & AccessFlags.NoTupleBoundsCheck)) {
              const indexNode = this.indexNodeForAccessExpression(accessNode);
              if (qf.type.is.tuple(objectType))
                error(indexNode, qd.msgs.Tuple_type_0_of_length_1_has_no_elem_at_index_2, typeToString(objectType), this.typeReferenceArity(objectType), qy.get.unescUnderscores(propName));
              else {
                error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
              }
            }
            errorIfWritingToReadonlyIndex(this.indexInfoOfType(objectType, qt.IndexKind.Number));
            return mapType(objectType, (t) => this.restTypeOfTupleType(<qt.TupleTypeReference>t) || undefinedType);
          }
        }
        if (!(indexType.flags & TypeFlags.Nullable) && qf.type.is.assignableToKind(indexType, TypeFlags.StringLike | TypeFlags.NumberLike | TypeFlags.ESSymbolLike)) {
          if (objectType.flags & (TypeFlags.Any | TypeFlags.Never)) return objectType;
          const stringIndexInfo = this.indexInfoOfType(objectType, qt.IndexKind.String);
          const indexInfo = (qf.type.is.assignableToKind(indexType, TypeFlags.NumberLike) && this.indexInfoOfType(objectType, qt.IndexKind.Number)) || stringIndexInfo;
          if (indexInfo) {
            if (accessFlags & AccessFlags.NoInSignatures && indexInfo === stringIndexInfo) {
              if (accessExpression) error(accessExpression, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(originalObjectType));
              return;
            }
            if (accessNode && !qf.type.is.assignableToKind(indexType, TypeFlags.String | TypeFlags.Number)) {
              const indexNode = this.indexNodeForAccessExpression(accessNode);
              error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
              return indexInfo.type;
            }
            errorIfWritingToReadonlyIndex(indexInfo);
            return indexInfo.type;
          }
          if (indexType.flags & TypeFlags.Never) return neverType;
          if (qf.type.is.jsLiteral(objectType)) return anyType;
          if (accessExpression && !qf.is.constEnumObjectType(objectType)) {
            if (objectType.symbol === globalThisSymbol && propName !== undefined && globalThisSymbol.exports!.has(propName) && globalThisSymbol.exports!.get(propName)!.flags & SymbolFlags.BlockScoped)
              error(accessExpression, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
            else if (noImplicitAny && !compilerOpts.suppressImplicitAnyIndexErrors && !suppressNoImplicitAnyError) {
              if (propName !== undefined && typeHasStaticProperty(propName, objectType))
                error(accessExpression, qd.msgs.Property_0_is_a_static_member_of_type_1, propName as string, typeToString(objectType));
              else if (this.indexTypeOfType(objectType, qt.IndexKind.Number)) {
                error(accessExpression.argExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number);
              } else {
                let suggestion: string | undefined;
                if (propName !== undefined && (suggestion = this.suggestionForNonexistentProperty(propName as string, objectType))) {
                  if (suggestion !== undefined)
                    error(accessExpression.argExpression, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, propName as string, typeToString(objectType), suggestion);
                } else {
                  const suggestion = this.suggestionForNonexistentInSignature(objectType, accessExpression, indexType);
                  if (suggestion !== undefined)
                    error(accessExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1, typeToString(objectType), suggestion);
                  else {
                    let errorInfo: qd.MessageChain | undefined;
                    if (indexType.flags & TypeFlags.EnumLiteral)
                      errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + typeToString(indexType) + ']', typeToString(objectType));
                    else if (indexType.flags & TypeFlags.UniqueESSymbol) {
                      const symbolName = this.fullyQualifiedName((indexType as qt.UniqueESSymbolType).symbol, accessExpression);
                      errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + symbolName + ']', typeToString(objectType));
                    } else if (indexType.flags & TypeFlags.StringLiteral) {
                      errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as qt.StringLiteralType).value, typeToString(objectType));
                    } else if (indexType.flags & TypeFlags.NumberLiteral) {
                      errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as qt.NumberLiteralType).value, typeToString(objectType));
                    } else if (indexType.flags & (TypeFlags.Number | TypeFlags.String)) {
                      errorInfo = chainqd.Messages(undefined, qd.msgs.No_index_signature_with_a_param_of_type_0_was_found_on_type_1, typeToString(indexType), typeToString(objectType));
                    }
                    errorInfo = chainqd.Messages(
                      errorInfo,
                      qd.msgs.Elem_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1,
                      typeToString(fullIndexType),
                      typeToString(objectType)
                    );
                    diagnostics.add(qf.make.diagForNodeFromMessageChain(accessExpression, errorInfo));
                  }
                }
              }
            }
            return;
          }
        }
        if (qf.type.is.jsLiteral(objectType)) return anyType;
        if (accessNode) {
          const indexNode = this.indexNodeForAccessExpression(accessNode);
          if (indexType.flags & (TypeFlags.StringLiteral | TypeFlags.NumberLiteral))
            error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, '' + (<qt.StringLiteralType | qt.NumberLiteralType>indexType).value, typeToString(objectType));
          else if (indexType.flags & (TypeFlags.String | TypeFlags.Number)) {
            error(indexNode, qd.msgs.Type_0_has_no_matching_index_signature_for_type_1, typeToString(objectType), typeToString(indexType));
          } else {
            error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
          }
        }
        if (qf.type.is.any(indexType)) return indexType;
        return;
        const errorIfWritingToReadonlyIndex = (indexInfo: qt.IndexInfo | undefined) => {
          if (indexInfo && indexInfo.isReadonly && accessExpression && (qf.is.assignmentTarget(accessExpression) || qf.is.deleteTarget(accessExpression)))
            error(accessExpression, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
        };
      }
      indexedAccessTypeOrUndefined(
        objectType: Type,
        indexType: Type,
        accessNode?: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression,
        accessFlags = AccessFlags.None
      ): Type | undefined {
        if (objectType === wildcardType || indexType === wildcardType) return wildcardType;
        if (qf.type.is.stringInSignatureOnly(objectType) && !(indexType.flags & TypeFlags.Nullable) && qf.type.is.assignableToKind(indexType, TypeFlags.String | TypeFlags.Number))
          indexType = stringType;
        if (qf.type.is.genericIndex(indexType) || (!(accessNode && accessNode.kind !== Syntax.IndexedAccessTyping) && qf.type.is.genericObject(objectType))) {
          if (objectType.flags & TypeFlags.AnyOrUnknown) return objectType;
          const id = objectType.id + ',' + indexType.id;
          let type = indexedAccessTypes.get(id);
          if (!type) indexedAccessTypes.set(id, (type = qf.make.indexedAccessType(objectType, indexType)));
          return type;
        }
        const apparentObjectType = this.reducedApparentType(objectType);
        if (indexType.flags & TypeFlags.Union && !(indexType.flags & TypeFlags.Boolean)) {
          const propTypes: Type[] = [];
          let wasMissingProp = false;
          for (const t of (<qt.UnionType>indexType).types) {
            const propType = this.propertyTypeForIndexType(objectType, apparentObjectType, t, indexType, wasMissingProp, accessNode, accessFlags);
            if (propType) propTypes.push(propType);
            else if (!accessNode) {
              return;
            } else {
              wasMissingProp = true;
            }
          }
          if (wasMissingProp) return;
          return accessFlags & AccessFlags.Writing ? this.intersectionType(propTypes) : this.unionType(propTypes);
        }
        return this.propertyTypeForIndexType(objectType, apparentObjectType, indexType, indexType, false, accessNode, accessFlags | AccessFlags.CacheSymbol);
      }
      trueTypeFromConditionalType(t: qt.ConditionalType) {
        return t.resolvedTrueType || (t.resolvedTrueType = instantiateType(t.root.trueType, t.mapper));
      }
      falseTypeFromConditionalType(t: qt.ConditionalType) {
        return t.resolvedFalseType || (t.resolvedFalseType = instantiateType(t.root.falseType, t.mapper));
      }
      inferredTrueTypeFromConditionalType(t: qt.ConditionalType) {
        return t.resolvedInferredTrueType || (t.resolvedInferredTrueType = t.combinedMapper ? instantiateType(t.root.trueType, t.combinedMapper) : this.trueTypeFromConditionalType(t));
      }
      restrictiveTypeParam(tp: TypeParam) {
        return tp.constraint === unknownType ? tp : tp.restrictive || ((tp.restrictive = qf.make.typeParam(tp.symbol)), ((tp.restrictive as TypeParam).constraint = unknownType), tp.restrictive);
      }
      objectTypeInstantiation(t: qt.AnonymousType | qt.DeferredTypeReference, mapper: TypeMapper) {
        const target = t.objectFlags & ObjectFlags.Instantiated ? t.target! : type;
        const n = t.objectFlags & ObjectFlags.Reference ? (<TypeReference>type).node! : t.symbol.declarations[0];
        const links = this.nodeLinks(n);
        let typeParams = links.outerTypeParams;
        if (!typeParams) {
          let declaration = n;
          if (qf.is.inJSFile(declaration)) {
            const paramTag = qc.findAncestor(declaration, isDocParamTag);
            if (paramTag) {
              const paramSymbol = this.paramSymbolFromDoc(paramTag);
              if (paramSymbol) declaration = paramSymbol.valueDeclaration;
            }
          }
          let outerTypeParams = this.outerTypeParams(declaration, true);
          if (qf.is.jsConstructor(declaration)) {
            const templateTagParams = this.typeParamsFromDeclaration(declaration as qt.DeclarationWithTypeParams);
            outerTypeParams = qu.addRange(outerTypeParams, templateTagParams);
          }
          typeParams = outerTypeParams || qu.empty;
          typeParams =
            (target.objectFlags & ObjectFlags.Reference || target.symbol.flags & SymbolFlags.TypeLiteral) && !target.aliasTypeArgs
              ? qu.filter(typeParams, (tp) => qf.is.typeParamPossiblyReferenced(tp, declaration))
              : typeParams;
          links.outerTypeParams = typeParams;
          if (typeParams.length) {
            links.instantiations = new qu.QMap<Type>();
            links.instantiations.set(this.typeListId(typeParams), target);
          }
        }
        if (typeParams.length) {
          const combinedMapper = combineTypeMappers(t.mapper, mapper);
          const typeArgs = map(typeParams, (t) => this.mappedType(t, combinedMapper));
          const id = this.typeListId(typeArgs);
          let result = links.instantiations!.get(id);
          if (!result) {
            const newMapper = qf.make.typeMapper(typeParams, typeArgs);
            result =
              target.objectFlags & ObjectFlags.Reference
                ? qf.make.deferredTypeReference((<qt.DeferredTypeReference>type).target, (<qt.DeferredTypeReference>type).node, newMapper)
                : target.objectFlags & ObjectFlags.Mapped
                ? instantiateMappedType(<qt.MappedType>target, newMapper)
                : instantiateAnonymousType(target, newMapper);
            links.instantiations!.set(id, result);
          }
          return result;
        }
        return type;
      }
      homomorphicTypeVariable(t: qt.MappedType) {
        const constraintType = this.constraintTypeFromMappedType(t);
        if (constraintType.flags & TypeFlags.Index) {
          const typeVariable = this.actualTypeVariable((<qt.IndexType>constraintType).type);
          if (typeVariable.flags & TypeFlags.TypeParam) return <TypeParam>typeVariable;
        }
        return;
      }
      conditionalTypeInstantiation(t: qt.ConditionalType, mapper: TypeMapper): Type {
        const root = t.root;
        if (root.outerTypeParams) {
          const typeArgs = map(root.outerTypeParams, (t) => this.mappedType(t, mapper));
          const id = this.typeListId(typeArgs);
          let result = root.instantiations!.get(id);
          if (!result) {
            const newMapper = qf.make.typeMapper(root.outerTypeParams, typeArgs);
            result = instantiateConditionalType(root, newMapper);
            root.instantiations!.set(id, result);
          }
          return result;
        }
        return type;
      }
      markerTypeReference(t: qt.GenericType, source: TypeParam, target: Type) {
        const result = qf.make.typeReference(
          type,
          map(t.typeParams, (t) => (t === source ? target : t))
        );
        result.objectFlags |= ObjectFlags.MarkerType;
        return result;
      }
      variances(t: qt.GenericType): VarianceFlags[] {
        if (type === globalArrayType || type === globalReadonlyArrayType || t.objectFlags & ObjectFlags.Tuple) return arrayVariances;
        return this.variancesWorker(t.typeParams, type, getMarkerTypeReference);
      }
      typeReferenceId(t: TypeReference, typeParams: Type[], depth = 0) {
        let result = '' + t.target.id;
        for (const t of this.typeArgs(t)) {
          if (qf.type.is.unconstrainedParam(t)) {
            let index = typeParams.indexOf(t);
            if (index < 0) {
              index = typeParams.length;
              typeParams.push(t);
            }
            result += '=' + index;
          } else if (depth < 4 && qf.type.is.referenceWithGenericArgs(t)) {
            result += '<' + this.typeReferenceId(t as TypeReference, typeParams, depth + 1) + '>';
          } else {
            result += '-' + t.id;
          }
        }
        return result;
      }
      restTypeOfTupleType(t: qt.TupleTypeReference) {
        return t.target.hasRestElem ? this.typeArgs(t)[type.target.typeParams!.length - 1] : undefined;
      }
      restArrayTypeOfTupleType(t: qt.TupleTypeReference) {
        const restType = this.restTypeOfTupleType(t);
        return restType && qf.make.arrayType(restType);
      }
      lengthOfTupleType(t: qt.TupleTypeReference) {
        return this.typeReferenceArity(t) - (t.target.hasRestElem ? 1 : 0);
      }
      assignmentReducedType(declaredType: qt.UnionType, assignedType: Type) {
        if (declaredType !== assignedType) {
          if (assignedType.flags & TypeFlags.Never) return assignedType;
          let reducedType = filterType(declaredType, (t) => typeMaybeAssignableTo(assignedType, t));
          if (assignedType.flags & TypeFlags.BooleanLiteral && qf.type.is.freshLiteral(assignedType)) reducedType = mapType(reducedType, getFreshTypeOfLiteralType);
          if (qf.type.is.assignableTo(assignedType, reducedType)) return reducedType;
        }
        return declaredType;
      }
      contextualTypeForElemExpression(arrayContextualType: Type | undefined, index: number): Type | undefined {
        return (
          arrayContextualType &&
          (this.typeOfPropertyOfContextualType(arrayContextualType, ('' + index) as qu.__String) ||
            this.iteratedTypeOrElemType(IterationUse.Elem, arrayContextualType, undefinedType, undefined, false))
        );
      }
      contextualCSignature(t: Type, n: SignatureDeclaration): Signature | undefined {
        const signatures = this.signaturesOfType(t, SignatureKind.Call);
        if (signatures.length === 1) {
          const signature = signatures[0];
          if (!qf.is.aritySmaller(signature, n)) return signature;
        }
      }
      arrayLiteralTupleTypeIfApplicable(elemTypes: Type[], contextualType: Type | undefined, hasRestElem: boolean, elemCount = elemTypes.length, readonly = false) {
        if (readonly || (contextualType && forEachType(contextualType, qf.type.is.tupleLike))) return qf.make.tupleType(elemTypes, elemCount - (hasRestElem ? 1 : 0), hasRestElem, readonly);
        return;
      }
      uninstantiatedSignaturesOfType(elemType: Type, caller: qt.JsxOpeningLikeElem): readonly Signature[] {
        if (elemType.flags & TypeFlags.String) return [Signature];
        else if (elemType.flags & TypeFlags.StringLiteral) {
          const intrinsicType = this.intrinsicAttributesTypeFromStringLiteralType(elemType as qt.StringLiteralType, caller);
          if (!intrinsicType) {
            error(caller, qd.msgs.Property_0_does_not_exist_on_type_1, (elemType as qt.StringLiteralType).value, 'JSX.' + JsxNames.IntrinsicElems);
            return qu.empty;
          } else {
            const fSignature = qf.make.signatureForJSXIntrinsic(caller, intrinsicType);
            return [fSignature];
          }
        }
        const apparentElemType = this.apparentType(elemType);
        let signatures = this.signaturesOfType(apparentElemType, SignatureKind.Construct);
        if (signatures.length === 0) signatures = this.signaturesOfType(apparentElemType, SignatureKind.Call);
        if (signatures.length === 0 && apparentElemType.flags & TypeFlags.Union)
          signatures = this.unions(map((apparentElemType as qt.UnionType).types, (t) => this.uninstantiatedSignaturesOfType(t, caller)));
        return signatures;
      }
      intrinsicAttributesTypeFromStringLiteralType(t: qt.StringLiteralType, location: Node): Type | undefined {
        const intrinsicElemsType = this.jsxType(JsxNames.IntrinsicElems, location);
        if (intrinsicElemsType !== errorType) {
          const stringLiteralTypeName = t.value;
          const intrinsicProp = this.propertyOfType(intrinsicElemsType, qy.get.escUnderscores(stringLiteralTypeName));
          if (intrinsicProp) return this.typeOfSymbol(intrinsicProp);
          const inSignatureType = this.indexTypeOfType(intrinsicElemsType, qt.IndexKind.String);
          if (inSignatureType) return inSignatureType;
          return;
        }
        return anyType;
      }
      superClass(classType: qt.InterfaceType): Type | undefined {
        const x = this.baseTypes(classType);
        if (x.length === 0) return;
        return this.intersectionType(x);
      }
      returnTypeOfSingleNonGenericCSignature(funcType: Type) {
        const signature = this.singleCSignature(funcType);
        if (signature && !signature.typeParams) return this.returnTypSignature(signature);
      }
      iteratedTypeOrElemType(use: IterationUse, inputType: Type, sentType: Type, errorNode: Node | undefined, checkAssignability: boolean): Type | undefined {
        const allowAsyncIterables = (use & IterationUse.AllowsAsyncIterablesFlag) !== 0;
        if (inputType === neverType) {
          reportTypeNotIterableError(errorNode!, inputType, allowAsyncIterables);
          return;
        }
        const uplevelIteration = true;
        const downlevelIteration = !uplevelIteration && compilerOpts.downlevelIteration;
        if (uplevelIteration || downlevelIteration || allowAsyncIterables) {
          const iterationTypes = this.iterationTypesOfIterable(inputType, use, uplevelIteration ? errorNode : undefined);
          if (checkAssignability) {
            if (iterationTypes) {
              const diagnostic =
                use & IterationUse.ForOfFlag
                  ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_send_0
                  : use & IterationUse.SpreadFlag
                  ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_always_send_0
                  : use & IterationUse.DestructuringFlag
                  ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring_will_always_send_0
                  : use & IterationUse.YieldStarFlag
                  ? qd.msgs.Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_containing_generator_will_always_send_0
                  : undefined;
              if (diagnostic) qf.type.check.assignableTo(sentType, iterationTypes.nextType, errorNode, diagnostic);
            }
          }
          if (iterationTypes || uplevelIteration) return iterationTypes && iterationTypes.yieldType;
        }
        let arrayType = inputType;
        let reportedError = false;
        let hasStringConstituent = false;
        if (use & IterationUse.AllowsStringInputFlag) {
          if (arrayType.flags & TypeFlags.Union) {
            const arrayTypes = (<qt.UnionType>inputType).types;
            const filteredTypes = qu.filter(arrayTypes, (t) => !(t.flags & TypeFlags.StringLike));
            if (filteredTypes !== arrayTypes) arrayType = this.unionType(filteredTypes, UnionReduction.Subtype);
          } else if (arrayType.flags & TypeFlags.StringLike) {
            arrayType = neverType;
          }
          hasStringConstituent = arrayType !== inputType;
          if (hasStringConstituent) {
            if (arrayType.flags & TypeFlags.Never) return stringType;
          }
        }
        if (!qf.type.is.arrayLike(arrayType)) {
          if (errorNode && !reportedError) {
            const yieldType = this.iterationTypeOfIterable(use, IterationTypeKind.Yield, inputType, undefined);
            const [defaultDiagnostic, maybeMissingAwait]: [qd.Message, boolean] =
              !(use & IterationUse.AllowsStringInputFlag) || hasStringConstituent
                ? downlevelIteration
                  ? [qd.msgs.Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator, true]
                  : yieldType
                  ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators, false]
                  : [qd.msgs.Type_0_is_not_an_array_type, true]
                : downlevelIteration
                ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator, true]
                : yieldType
                ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators, false]
                : [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type, true];
            errorAndMaybeSuggestAwait(errorNode, maybeMissingAwait && !!this.awaitedTypeOfPromise(arrayType), defaultDiagnostic, typeToString(arrayType));
          }
          return hasStringConstituent ? stringType : undefined;
        }
        const arrayElemType = this.indexTypeOfType(arrayType, qt.IndexKind.Number);
        if (hasStringConstituent && arrayElemType) {
          if (arrayElemType.flags & TypeFlags.StringLike) return stringType;
          return this.unionType([arrayElemType, stringType], UnionReduction.Subtype);
        }
        return arrayElemType;
      }
      iterationTypeOfIterable(use: IterationUse, typeKind: IterationTypeKind, inputType: Type, errorNode: Node | undefined): Type | undefined {
        if (qf.type.is.any(inputType)) return;
        const iterationTypes = this.iterationTypesOfIterable(inputType, use, errorNode);
        return iterationTypes && iterationTypes[this.iterationTypesKeyFromIterationTypeKind(typeKind)];
      }
      asyncFromSyncIterationTypes(iterationTypes: qt.IterationTypes, errorNode: Node | undefined) {
        if (iterationTypes === noIterationTypes) return noIterationTypes;
        if (iterationTypes === anyIterationTypes) return anyIterationTypes;
        const { yieldType, returnType, nextType } = iterationTypes;
        return qf.make.iterationTypes(this.awaitedType(yieldType, errorNode) || anyType, this.awaitedType(returnType, errorNode) || anyType, nextType);
      }
      nonInterhitedProperties(t: qt.InterfaceType, baseTypes: qt.BaseType[], properties: Symbol[]) {
        if (!qu.length(baseTypes)) return properties;
        const seen = qu.qf.make.escapedMap<Symbol>();
        forEach(properties, (p) => {
          seen.set(p.escName, p);
        });
        for (const base of baseTypes) {
          const properties = this.propertiesOfType(this.typeWithThisArg(base, t.thisType));
          for (const prop of properties) {
            const existing = seen.get(prop.escName);
            if (existing && !qf.is.propertyIdenticalTo(existing, prop)) seen.delete(prop.escName);
          }
        }
        return arrayFrom(seen.values());
      }
      flow = new (class extends Base {
        narrowTypeByAssertion(t: Type, expr: qt.Expression): Type {
          const n = qf.skip.parentheses(expr);
          if (n.kind === Syntax.FalseKeyword) return unreachableNeverType;
          if (n.kind === Syntax.BinaryExpression) {
            if (n.operatorToken.kind === Syntax.Ampersand2Token) return narrowTypeByAssertion(narrowTypeByAssertion(t, n.left), n.right);
            if (n.operatorToken.kind === Syntax.Bar2Token) return this.unionType([narrowTypeByAssertion(t, n.left), narrowTypeByAssertion(t, n.right)]);
          }
          return narrowType(t, n, true);
        }
        narrowTypeByDiscriminant(t: Type, access: qt.AccessExpression, narrowType: (t: Type) => Type): Type {
          const propName = this.accessedPropertyName(access);
          if (propName === undefined) return type;
          const propType = this.typeOfPropertyOfType(t, propName);
          if (!propType) return type;
          const narrowedPropType = narrowType(propType);
          return filterType(t, (t) => {
            const discriminantType = this.typeOfPropertyOrInSignature(t, propName);
            return !(discriminantType.flags & TypeFlags.Never) && qf.type.is.comparableTo(discriminantType, narrowedPropType);
          });
        }
        narrowTypeByTruthiness(t: Type, expr: qt.Expression, assumeTrue: boolean): Type {
          if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy);
          if (strictNullChecks && assumeTrue && optionalChainContainsReference(expr, reference)) type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
          if (qf.is.matchingReferenceDiscriminant(expr, type))
            return narrowTypeByDiscriminant(t, <qt.AccessExpression>expr, (t) => this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy));
          return type;
        }
        isTypePresencePossible(t: Type, propName: qu.__String, assumeTrue: boolean) {
          if (this.indexInfoOfType(t, qt.IndexKind.String)) return true;
          const prop = this.propertyOfType(t, propName);
          if (prop) return prop.flags & SymbolFlags.Optional ? true : assumeTrue;
          return !assumeTrue;
        }
        narrowByInKeyword(t: Type, literal: qt.LiteralExpression, assumeTrue: boolean) {
          if (t.flags & (TypeFlags.Union | TypeFlags.Object) || qf.type.is.thisParam(t)) {
            const propName = qy.get.escUnderscores(literal.text);
            return filterType(t, (t) => qf.is.typePresencePossible(t, propName, assumeTrue));
          }
          return type;
        }
        narrowTypeByBinaryExpression(t: Type, expr: qt.BinaryExpression, assumeTrue: boolean): Type {
          switch (expr.operatorToken.kind) {
            case Syntax.EqualsToken:
              return narrowTypeByTruthiness(narrowType(t, expr.right, assumeTrue), expr.left, assumeTrue);
            case Syntax.Equals2Token:
            case Syntax.ExclamationEqualsToken:
            case Syntax.Equals3Token:
            case Syntax.ExclamationEquals2Token:
              const operator = expr.operatorToken.kind;
              const left = this.referenceCandidate(expr.left);
              const right = this.referenceCandidate(expr.right);
              if (left.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(right)) return narrowTypeByTypeof(t, <TypeOfExpression>left, operator, right, assumeTrue);
              if (right.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(left)) return narrowTypeByTypeof(t, <TypeOfExpression>right, operator, left, assumeTrue);
              if (qf.is.matchingReference(reference, left)) return narrowTypeByEquality(t, operator, right, assumeTrue);
              if (qf.is.matchingReference(reference, right)) return narrowTypeByEquality(t, operator, left, assumeTrue);
              if (strictNullChecks) {
                if (optionalChainContainsReference(left, reference)) type = narrowTypeByOptionalChainContainment(t, operator, right, assumeTrue);
                else if (optionalChainContainsReference(right, reference)) {
                  type = narrowTypeByOptionalChainContainment(t, operator, left, assumeTrue);
                }
              }
              if (qf.is.matchingReferenceDiscriminant(left, type)) return narrowTypeByDiscriminant(t, <qt.AccessExpression>left, (t) => narrowTypeByEquality(t, operator, right, assumeTrue));
              if (qf.is.matchingReferenceDiscriminant(right, type)) return narrowTypeByDiscriminant(t, <qt.AccessExpression>right, (t) => narrowTypeByEquality(t, operator, left, assumeTrue));
              if (qf.is.matchingConstructorReference(left)) return narrowTypeByConstructor(t, operator, right, assumeTrue);
              if (qf.is.matchingConstructorReference(right)) return narrowTypeByConstructor(t, operator, left, assumeTrue);
              break;
            case Syntax.InstanceOfKeyword:
              return narrowTypeByInstanceof(t, expr, assumeTrue);
            case Syntax.InKeyword:
              const target = this.referenceCandidate(expr.right);
              if (qf.is.stringLiteralLike(expr.left) && qf.is.matchingReference(reference, target)) return narrowByInKeyword(t, expr.left, assumeTrue);
              break;
            case Syntax.CommaToken:
              return narrowType(t, expr.right, assumeTrue);
          }
          return type;
        }
        narrowTypeByOptionalChainContainment(t: Type, operator: Syntax, value: qt.Expression, assumeTrue: boolean): Type {
          const equalsOperator = operator === Syntax.Equals2Token || operator === Syntax.Equals3Token;
          const nullableFlags = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken ? TypeFlags.Nullable : TypeFlags.Undefined;
          const valueType = this.typeOfExpression(value);
          const removeNullable =
            (equalsOperator !== assumeTrue && everyType(valueType, (t) => !!(t.flags & nullableFlags))) ||
            (equalsOperator === assumeTrue && everyType(valueType, (t) => !(t.flags & (TypeFlags.AnyOrUnknown | nullableFlags))));
          return removeNullable ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
        }
        narrowTypeByEquality(t: Type, operator: Syntax, value: qt.Expression, assumeTrue: boolean): Type {
          if (t.flags & TypeFlags.Any) return type;
          if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
          const valueType = this.typeOfExpression(value);
          if (t.flags & TypeFlags.Unknown && assumeTrue && (operator === Syntax.Equals3Token || operator === Syntax.ExclamationEquals2Token)) {
            if (valueType.flags & (TypeFlags.Primitive | TypeFlags.NonPrimitive)) return valueType;
            if (valueType.flags & TypeFlags.Object) return nonPrimitiveType;
            return type;
          }
          if (valueType.flags & TypeFlags.Nullable) {
            if (!strictNullChecks) return type;
            const doubleEquals = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken;
            const facts = doubleEquals
              ? assumeTrue
                ? TypeFacts.EQUndefinedOrNull
                : TypeFacts.NEUndefinedOrNull
              : valueType.flags & TypeFlags.Null
              ? assumeTrue
                ? TypeFacts.EQNull
                : TypeFacts.NENull
              : assumeTrue
              ? TypeFacts.EQUndefined
              : TypeFacts.NEUndefined;
            return this.typeWithFacts(t, facts);
          }
          if (t.flags & TypeFlags.NotUnionOrUnit) return type;
          if (assumeTrue) {
            const filterFn: (t: Type) => boolean =
              operator === Syntax.Equals2Token ? (t) => areTypesComparable(t, valueType) || qf.type.is.coercibleUnderDoubleEquals(t, valueType) : (t) => areTypesComparable(t, valueType);
            const narrowedType = filterType(t, filterFn);
            return narrowedType.flags & TypeFlags.Never ? type : replacePrimitivesWithLiterals(narrowedType, valueType);
          }
          if (qf.type.is.unit(valueType)) {
            const regularType = this.regularTypeOfLiteralType(valueType);
            return filterType(t, (t) => (qf.type.is.unit(t) ? !areTypesComparable(t, valueType) : this.regularTypeOfLiteralType(t) !== regularType));
          }
          return type;
        }
        narrowTypeByTypeof(t: Type, typeOfExpr: TypeOfExpression, operator: Syntax, literal: qt.LiteralExpression, assumeTrue: boolean): Type {
          if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
          const target = this.referenceCandidate(typeOfExpr.expression);
          if (!qf.is.matchingReference(reference, target)) {
            if (strictNullChecks && optionalChainContainsReference(target, reference) && assumeTrue === (literal.text !== 'undefined')) return this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
            return type;
          }
          if (t.flags & TypeFlags.Any && literal.text === 'function') return type;
          if (assumeTrue && t.flags & TypeFlags.Unknown && literal.text === 'object') {
            if (typeOfExpr.parent?.parent?.kind === Syntax.BinaryExpression) {
              const expr = typeOfExpr.parent?.parent;
              if (expr.operatorToken.kind === Syntax.Ampersand2Token && expr.right === typeOfExpr.parent && containsTruthyCheck(reference, expr.left)) return nonPrimitiveType;
            }
            return this.unionType([nonPrimitiveType, nullType]);
          }
          const facts = assumeTrue ? typeofEQFacts.get(literal.text) || TypeFacts.TypeofEQHostObject : typeofNEFacts.get(literal.text) || TypeFacts.TypeofNEHostObject;
          const impliedType = this.impliedTypeFromTypeofGuard(t, literal.text);
          return this.typeWithFacts(assumeTrue && impliedType ? mapType(t, narrowUnionMemberByTypeof(impliedType)) : type, facts);
        }
        narrowTypeBySwitchOptionalChainContainment(t: Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number, clauseCheck: (t: Type) => boolean) {
          const everyClauseChecks = clauseStart !== clauseEnd && every(this.switchClauseTypes(switchStatement).slice(clauseStart, clauseEnd), clauseCheck);
          return everyClauseChecks ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
        }
        narrowTypeBySwitchOnDiscriminant(t: Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number) {
          const switchTypes = this.switchClauseTypes(switchStatement);
          if (!switchTypes.length) return type;
          const clauseTypes = switchTypes.slice(clauseStart, clauseEnd);
          const hasDefaultClause = clauseStart === clauseEnd || contains(clauseTypes, neverType);
          if (t.flags & TypeFlags.Unknown && !hasDefaultClause) {
            let groundClauseTypes: Type[] | undefined;
            for (let i = 0; i < clauseTypes.length; i += 1) {
              const t = clauseTypes[i];
              if (t.flags & (TypeFlags.Primitive | TypeFlags.NonPrimitive)) {
                if (groundClauseTypes !== undefined) groundClauseTypes.push(t);
              } else if (t.flags & TypeFlags.Object) {
                if (groundClauseTypes === undefined) groundClauseTypes = clauseTypes.slice(0, i);
                groundClauseTypes.push(nonPrimitiveType);
              }
              return type;
            }
            return this.unionType(groundClauseTypes === undefined ? clauseTypes : groundClauseTypes);
          }
          const discriminantType = this.unionType(clauseTypes);
          const caseType =
            discriminantType.flags & TypeFlags.Never
              ? neverType
              : replacePrimitivesWithLiterals(
                  filterType(t, (t) => areTypesComparable(discriminantType, t)),
                  discriminantType
                );
          if (!hasDefaultClause) return caseType;
          const defaultType = filterType(t, (t) => !(qf.type.is.unit(t) && contains(switchTypes, this.regularTypeOfLiteralType(t))));
          return caseType.flags & TypeFlags.Never ? defaultType : this.unionType([caseType, defaultType]);
        }
        impliedTypeFromTypeofGuard(t: Type, text: string) {
          switch (text) {
            case 'function':
              return t.flags & TypeFlags.Any ? type : globalFunctionType;
            case 'object':
              return t.flags & TypeFlags.Unknown ? this.unionType([nonPrimitiveType, nullType]) : type;
            default:
              return typeofTypesByName.get(text);
          }
        }
        narrowUnionMemberByTypeof(candidate: Type) {
          return (t: Type) => {
            if (qf.type.is.subtypeOf(t, candidate)) return type;
            if (qf.type.is.subtypeOf(candidate, type)) return candidate;
            if (t.flags & TypeFlags.Instantiable) {
              const constraint = this.baseConstraintOfType(t) || anyType;
              if (qf.type.is.subtypeOf(candidate, constraint)) return this.intersectionType([type, candidate]);
            }
            return type;
          };
        }
        narrowBySwitchOnTypeOf(t: Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number): Type {
          const switchWitnesses = this.switchClauseTypeOfWitnesses(switchStatement, true);
          if (!switchWitnesses.length) return type;
          const defaultCaseLocation = qf.find.index(switchWitnesses, (elem) => elem === undefined);
          const hasDefaultClause = clauseStart === clauseEnd || (defaultCaseLocation >= clauseStart && defaultCaseLocation < clauseEnd);
          let clauseWitnesses: string[];
          let switchFacts: TypeFacts;
          if (defaultCaseLocation > -1) {
            const witnesses = <string[]>switchWitnesses.filter((witness) => witness !== undefined);
            const fixedClauseStart = defaultCaseLocation < clauseStart ? clauseStart - 1 : clauseStart;
            const fixedClauseEnd = defaultCaseLocation < clauseEnd ? clauseEnd - 1 : clauseEnd;
            clauseWitnesses = witnesses.slice(fixedClauseStart, fixedClauseEnd);
            switchFacts = this.factsFromTypeofSwitch(fixedClauseStart, fixedClauseEnd, witnesses, hasDefaultClause);
          } else {
            clauseWitnesses = <string[]>switchWitnesses.slice(clauseStart, clauseEnd);
            switchFacts = this.factsFromTypeofSwitch(clauseStart, clauseEnd, <string[]>switchWitnesses, hasDefaultClause);
          }
          if (hasDefaultClause) return filterType(t, (t) => (this.typeFacts(t) & switchFacts) === switchFacts);
          const impliedType = this.typeWithFacts(this.unionType(clauseWitnesses.map((text) => this.impliedTypeFromTypeofGuard(t, text) || type)), switchFacts);
          return this.typeWithFacts(mapType(t, narrowUnionMemberByTypeof(impliedType)), switchFacts);
        }
        narrowTypeByConstructor(t: Type, operator: Syntax, identifier: qt.Expression, assumeTrue: boolean): Type {
          if (assumeTrue ? operator !== Syntax.Equals2Token && operator !== Syntax.Equals3Token : operator !== Syntax.ExclamationEqualsToken && operator !== Syntax.ExclamationEquals2Token)
            return type;
          const identifierType = this.typeOfExpression(identifier);
          if (!qf.is.functionType(identifierType) && !qf.type.is.constructr(identifierType)) return type;
          const prototypeProperty = this.propertyOfType(identifierType, 'prototype' as qu.__String);
          if (!prototypeProperty) return type;
          const prototypeType = this.typeOfSymbol(prototypeProperty);
          const candidate = !qf.type.is.any(prototypeType) ? prototypeType : undefined;
          if (!candidate || candidate === globalObjectType || candidate === globalFunctionType) return type;
          if (qf.type.is.any(t)) return candidate;
          return filterType(t, (t) => qf.is.constructedBy(t, candidate));
          const isConstructedBy = (source: Type, target: Type) => {
            if ((source.flags & TypeFlags.Object && this.objectFlags(source) & ObjectFlags.Class) || (target.flags & TypeFlags.Object && this.objectFlags(target) & ObjectFlags.Class))
              return source.symbol === target.symbol;
            return qf.type.is.subtypeOf(source, target);
          };
        }
        narrowTypeByInstanceof(t: Type, expr: qt.BinaryExpression, assumeTrue: boolean): Type {
          const left = this.referenceCandidate(expr.left);
          if (!qf.is.matchingReference(reference, left)) {
            if (assumeTrue && strictNullChecks && optionalChainContainsReference(left, reference)) return this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
            return type;
          }
          const rightType = this.typeOfExpression(expr.right);
          if (!qf.type.is.derivedFrom(rightType, globalFunctionType)) return type;
          let targetType: Type | undefined;
          const prototypeProperty = this.propertyOfType(rightType, 'prototype' as qu.__String);
          if (prototypeProperty) {
            const prototypePropertyType = this.typeOfSymbol(prototypeProperty);
            if (!qf.type.is.any(prototypePropertyType)) targetType = prototypePropertyType;
          }
          if (qf.type.is.any(t) && (targetType === globalObjectType || targetType === globalFunctionType)) return type;
          if (!targetType) {
            const constrSignatures = this.signaturesOfType(rightType, SignatureKind.Construct);
            targetType = constrSignatures.length ? this.unionType(map(constrSignatures, (s) => this.returnTypSignature(s.erased()))) : qu.emptyObjectType;
          }
          return this.narrowedType(t, targetType, assumeTrue, qf.type.is.derivedFrom);
        }
        narrowedType(t: Type, candidate: Type, assumeTrue: boolean, isRelated: (source: Type, target: Type) => boolean) {
          if (!assumeTrue) return filterType(t, (t) => !qf.is.related(t, candidate));
          if (t.flags & TypeFlags.Union) {
            const assignableType = filterType(t, (t) => qf.is.related(t, candidate));
            if (!(assignableType.flags & TypeFlags.Never)) return assignableType;
          }
          return qf.type.is.subtypeOf(candidate, type)
            ? candidate
            : qf.type.is.assignableTo(t, candidate)
            ? type
            : qf.type.is.assignableTo(candidate, type)
            ? candidate
            : this.intersectionType([type, candidate]);
        }
        narrowTypeByCallExpression(t: Type, callExpression: qt.CallExpression, assumeTrue: boolean): Type {
          if (qf.has.matchingArg(callExpression, reference)) {
            const signature = assumeTrue || !qf.is.callChain(callExpression) ? this.effeSignature(callExpression) : undefined;
            const predicate = signature && this.typePredicatSignature(signature);
            if (predicate && (predicate.kind === TypePredicateKind.This || predicate.kind === TypePredicateKind.Identifier)) return narrowTypeByTypePredicate(t, predicate, callExpression, assumeTrue);
          }
          return type;
        }
        narrowTypeByTypePredicate(t: Type, predicate: TypePredicate, callExpression: qt.CallExpression, assumeTrue: boolean): Type {
          if (predicate.type && !(qf.type.is.any(t) && (predicate.type === globalObjectType || predicate.type === globalFunctionType))) {
            const predicateArg = this.typePredicateArg(predicate, callExpression);
            if (predicateArg) {
              if (qf.is.matchingReference(reference, predicateArg)) return this.narrowedType(t, predicate.type, assumeTrue, qf.type.is.subtypeOf);
              if (strictNullChecks && assumeTrue && optionalChainContainsReference(predicateArg, reference) && !(this.typeFacts(predicate.type) & TypeFacts.EQUndefined))
                type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
              if (qf.is.matchingReferenceDiscriminant(predicateArg, type))
                return narrowTypeByDiscriminant(t, predicateArg as qt.AccessExpression, (t) => this.narrowedType(t, predicate.type!, assumeTrue, qf.type.is.subtypeOf));
            }
          }
          return type;
        }
        narrowType(t: Type, expr: qt.Expression, assumeTrue: boolean): Type {
          if (qf.is.expressionOfOptionalChainRoot(expr) || (expr.parent?.kind === Syntax.BinaryExpression && expr.parent?.operatorToken.kind === Syntax.Question2Token && expr.parent?.left === expr))
            return narrowTypeByOptionality(t, expr, assumeTrue);
          switch (expr.kind) {
            case Syntax.Identifier:
            case Syntax.ThisKeyword:
            case Syntax.SuperKeyword:
            case Syntax.PropertyAccessExpression:
            case Syntax.ElemAccessExpression:
              return narrowTypeByTruthiness(t, expr, assumeTrue);
            case Syntax.CallExpression:
              return narrowTypeByCallExpression(t, <qt.CallExpression>expr, assumeTrue);
            case Syntax.ParenthesizedExpression:
              return narrowType(t, (<qt.ParenthesizedExpression>expr).expression, assumeTrue);
            case Syntax.BinaryExpression:
              return narrowTypeByBinaryExpression(t, expr, assumeTrue);
            case Syntax.PrefixUnaryExpression:
              if ((<qt.PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken) return narrowType(t, (<qt.PrefixUnaryExpression>expr).operand, !assumeTrue);
              break;
          }
          return type;
        }
        narrowTypeByOptionality(t: Type, expr: qt.Expression, assumePresent: boolean): Type {
          if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull);
          if (qf.is.matchingReferenceDiscriminant(expr, type))
            return narrowTypeByDiscriminant(t, <qt.AccessExpression>expr, (t) => this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull));
          return type;
        }
      })();
    })();
    is = new (class extends Base {
      literalTypesWithSameBaseType(types: qt.Type[]): boolean {
        let commonBaseType: qt.Type | undefined;
        for (const t of types) {
          const baseType = getBaseTypeOfLiteralType(t);
          if (!commonBaseType) commonBaseType = baseType;
          if (baseType === t || baseType !== commonBaseType) return false;
        }
        return true;
      }
    })();
    literalTypeToNode(type: qt.FreshableType, enclosing: Node, tracker: qt.SymbolTracker): qt.Expression {
      const enumResult =
        type.flags & qt.TypeFlags.EnumLiteral
          ? nodeBuilder.symbolToExpression(type.symbol, qt.SymbolFlags.Value, enclosing, undefined, tracker)
          : type === trueType
          ? new qc.BooleanLiteral(true)
          : type === falseType && new qc.BooleanLiteral(false);
      return enumResult || qc.asLiteral((type as qt.LiteralType).value);
    }
    filterPrimitivesIfContainsNonPrimitive(type: qt.UnionType) {
      if (maybeTypeOfKind(type, qt.TypeFlags.NonPrimitive)) {
        const result = filterType(type, (t) => !(t.flags & qt.TypeFlags.Primitive));
        if (!(result.flags & qt.TypeFlags.Never)) return result;
      }
      return type;
    }
    removeOptionalityFromDeclaredType(declaredType: qt.Type, declaration: qt.VariableLikeDeclaration): qt.Type {
      if (pushTypeResolution(declaration.symbol, TypeSystemPropertyName.DeclaredType)) {
        const annotationIncludesUndefined =
          strictNullChecks &&
          declaration.kind === Syntax.Param &&
          declaration.initer &&
          getFalsyFlags(declaredType) & qt.TypeFlags.Undefined &&
          !(getFalsyFlags(check.expression(declaration.initer)) & qt.TypeFlags.Undefined);
        popTypeResolution();
        return annotationIncludesUndefined ? getTypeWithFacts(declaredType, TypeFacts.NEUndefined) : declaredType;
      } else {
        reportCircularityError(declaration.symbol);
        return declaredType;
      }
    }
    addEvolvingArrayElemType(evolvingArrayType: qt.EvolvingArrayType, node: qt.Expression): qt.EvolvingArrayType {
      const elemType = getBaseTypeOfLiteralType(getContextFreeTypeOfExpression(node));
      return isTypeSubsetOf(elemType, evolvingArrayType.elemType) ? evolvingArrayType : getEvolvingArrayType(qf.get.unionType([evolvingArrayType.elemType, elemType]));
    }
    finalizeEvolvingArrayType(type: qt.Type): qt.Type {
      return getObjectFlags(type) & ObjectFlags.EvolvingArray ? getFinalArrayType(<qt.EvolvingArrayType>type) : type;
    }
    addTypesToUnion(typeSet: qt.Type[], includes: qt.TypeFlags, types: readonly qt.Type[]): qt.TypeFlags {
      for (const type of types) {
        includes = addTypeToUnion(typeSet, includes, type);
      }
      return includes;
    }
    removeSubtypes(types: qt.Type[], primitivesOnly: boolean): boolean {
      const len = types.length;
      if (len === 0 || isSetOfLiteralsFromSameEnum(types)) return true;
      let i = len;
      let count = 0;
      while (i > 0) {
        i--;
        const source = types[i];
        for (const target of types) {
          if (source !== target) {
            if (count === 100000) {
              const estimatedCount = (count / (len - i)) * len;
              if (estimatedCount > (primitivesOnly ? 25000000 : 1000000)) {
                error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
                return false;
              }
            }
            count++;
            if (
              qf.type.is.relatedTo(source, target, strictSubtypeRelation) &&
              (!(getObjectFlags(getTargetType(source)) & ObjectFlags.Class) || !(getObjectFlags(getTargetType(target)) & ObjectFlags.Class) || qf.type.is.derivedFrom(source, target))
            ) {
              orderedRemoveItemAt(types, i);
              break;
            }
          }
        }
      }
      return true;
    }
    removeRedundantLiteralTypes(types: qt.Type[], includes: qt.TypeFlags) {
      let i = types.length;
      while (i > 0) {
        i--;
        const t = types[i];
        const remove =
          (t.flags & qt.TypeFlags.StringLiteral && includes & qt.TypeFlags.String) ||
          (t.flags & qt.TypeFlags.NumberLiteral && includes & qt.TypeFlags.Number) ||
          (t.flags & qt.TypeFlags.BigIntLiteral && includes & qt.TypeFlags.BigInt) ||
          (t.flags & qt.TypeFlags.UniqueESSymbol && includes & qt.TypeFlags.ESSymbol) ||
          (qf.type.is.freshLiteral(t) && containsType(types, (<qt.LiteralType>t).regularType));
        if (remove) orderedRemoveItemAt(types, i);
      }
    }
    removeRedundantPrimitiveTypes(types: qt.Type[], includes: qt.TypeFlags) {
      let i = types.length;
      while (i > 0) {
        i--;
        const t = types[i];
        const remove =
          (t.flags & qt.TypeFlags.String && includes & qt.TypeFlags.StringLiteral) ||
          (t.flags & qt.TypeFlags.Number && includes & qt.TypeFlags.NumberLiteral) ||
          (t.flags & qt.TypeFlags.BigInt && includes & qt.TypeFlags.BigIntLiteral) ||
          (t.flags & qt.TypeFlags.ESSymbol && includes & qt.TypeFlags.UniqueESSymbol);
        if (remove) orderedRemoveItemAt(types, i);
      }
    }
    extractIrreducible(types: qt.Type[], flag: qt.TypeFlags) {
      if (every(types, (t) => !!(t.flags & qt.TypeFlags.Union) && some((t as qt.UnionType).types, (tt) => !!(tt.flags & flag)))) {
        for (let i = 0; i < types.length; i++) {
          types[i] = filterType(types[i], (t) => !(t.flags & flag));
        }
        return true;
      }
      return false;
    }
    intersectUnionsOfPrimitiveTypes(types: qt.Type[]) {
      let unionTypes: qt.UnionType[] | undefined;
      const index = qf.find.index(types, (t) => !!(getObjectFlags(t) & ObjectFlags.PrimitiveUnion));
      if (index < 0) return false;
      let i = index + 1;
      while (i < types.length) {
        const t = types[i];
        if (getObjectFlags(t) & ObjectFlags.PrimitiveUnion) {
          (unionTypes || (unionTypes = [<qt.UnionType>types[index]])).push(<qt.UnionType>t);
          orderedRemoveItemAt(types, i);
        } else {
          i++;
        }
      }
      if (!unionTypes) return false;
      const checked: qt.Type[] = [];
      const result: qt.Type[] = [];
      for (const u of unionTypes) {
        for (const t of u.types) {
          if (insertType(checked, t)) {
            if (eachUnionContains(unionTypes, t)) insertType(result, t);
          }
        }
      }
      types[index] = qf.get.unionTypeFromSortedList(result, ObjectFlags.PrimitiveUnion);
      return true;
    }
    substituteIndexedMappedType(objectType: qt.MappedType, index: qt.Type) {
      const mapper = createTypeMapper([getTypeParamFromMappedType(objectType)], [index]);
      const templateMapper = combineTypeMappers(objectType.mapper, mapper);
      return instantiateType(getTemplateTypeFromMappedType(objectType), templateMapper);
    }
    tryMergeUnionOfObjectTypeAndEmptyObject(type: qt.UnionType, readonly: boolean): qt.Type | undefined {
      if (type.types.length === 2) {
        const firstType = type.types[0];
        const secondType = type.types[1];
        if (every(type.types, qf.type.is.emptyObjOrSpreadsIntoEmptyObj)) return qf.type.is.emptyObject(firstType) ? firstType : qf.type.is.emptyObject(secondType) ? secondType : emptyObjectType;
        if (qf.type.is.emptyObjOrSpreadsIntoEmptyObj(firstType) && qf.type.is.singlePropertyAnonymousObject(secondType)) return getAnonymousPartialType(secondType);
        if (qf.type.is.emptyObjOrSpreadsIntoEmptyObj(secondType) && qf.type.is.singlePropertyAnonymousObject(firstType)) return getAnonymousPartialType(firstType);
      }
      function getAnonymousPartialType(type: qt.Type) {
        const members = new qc.SymbolTable();
        for (const prop of qf.get.propertiesOfType(type)) {
          if (prop.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) {
          } else if (isSpreadableProperty(prop)) {
            const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
            const flags = qt.SymbolFlags.Property | qt.SymbolFlags.Optional;
            const result = new qc.Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
            result.type = isSetonlyAccessor ? undefinedType : prop.typeOfSymbol();
            result.declarations = prop.declarations;
            result.nameType = prop.links.nameType;
            result.syntheticOrigin = prop;
            members.set(prop.escName, result);
          }
        }
        const spread = qf.make.anonymousType(type.symbol, members, qu.empty, qu.empty, qf.get.indexInfoOfType(type, IndexKind.String), qf.get.indexInfoOfType(type, IndexKind.Number));
        spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
        return spread;
      }
    }
  })());
}
export interface Ftype extends ReturnType<typeof newType> {}
