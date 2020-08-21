import { newCheck, Fcheck } from './check';
import { newMake, Fmake, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newGet, Fget } from './get';
import { Node, ObjectFlags, SignatureFlags, SymbolFlags, TypeFlags } from './types';
import * as qb from './bases';
import * as qc from '../core';
import * as qd from '../diags';
import * as qg from './groups';
import * as qt from './types';
import * as qu from '../utils';
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
    /*
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
    */
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
    /*
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
    */
  })());
}
export interface Fhas extends ReturnType<typeof newHas> {}
interface Frame extends qc.Frame {
  check: Fcheck;
  make: Fmake;
  get: Fget;
  has: Fhas;
  instantiate: Finstantiate;
  is: Fis;
  resolve: Fresolve;
  signature: qg.Fsign;
  symbol: qg.Fsymb;
  type: qg.Ftype;
}
export const qf = qc.newFrame() as Frame;
newCheck(qf);
newMake(qf);
newGet(qf);
newHas(qf);
newInstantiate(qf);
newIs(qf);
newResolve(qf);
qg.newType(qf);
qg.newSymb(qf);
qg.newSign(qf);

export function newChecker(host: qt.TypeCheckerHost, produceDiagnostics: boolean): qt.TypeChecker {
  class Signature extends qb.Signature {}
  class Symbol extends qb.Symbol {
    static nextId = 1;
    static count = 0;
    _id?: number;
    constructor(f: SymbolFlags, n: qu.__String, c?: qt.CheckFlags) {
      super(f, n, c);
      Symbol.count++;
    }
    get id() {
      if (!this._id) {
        this._id = Symbol.nextId;
        Symbol.nextId++;
      }
      return this._id;
    }
    get links(): qt.SymbolLinks {
      if (this.isTransient()) return this;
      const i = this.id;
      return symbolLinks[i] || (symbolLinks[i] = {} as qt.SymbolLinks);
    }
    clone() {
      const r = new Symbol(this.flags, this.escName);
      r.declarations = this.declarations ? this.declarations.slice() : [];
      r.parent = this.parent;
      if (this.valueDeclaration) r.valueDeclaration = this.valueDeclaration;
      if (this.constEnumOnlyModule) r.constEnumOnlyModule = true;
      if (this.members) r.members = qc.cloneMap(this.members);
      if (this.exports) r.exports = qc.cloneMap(this.exports);
      this.recordMerged(r);
      return r;
    }
    private recordMerged(s: Symbol) {
      if (!this.mergeId) {
        this.mergeId = nextMergeId;
        nextMergeId++;
      }
      mergedSymbols[this.mergeId] = s;
    }
    markAliasReferenced(n: Node) {
      if (this.isNonLocalAlias(SymbolFlags.Value) && !qf.is.inTypeQuery(n) && !this.getTypeOnlyAliasDeclaration()) {
        if ((compilerOpts.preserveConstEnums && isExportOrExportExpression(n)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) this.markAliasSymbolAsReferenced();
        else this.markConstEnumAliasAsReferenced();
      }
    }
    markAliasSymbolAsReferenced() {
      const ls = this.links;
      if (!ls.referenced) {
        ls.referenced = true;
        const d = this.getDeclarationOfAliasSymbol();
        qf.assert.true(d);
        if (qf.is.internalModuleImportEqualsDeclaration(d)) {
          const t = this.resolveSymbol();
          if (t === unknownSymbol || (t && t.flags & SymbolFlags.Value)) qf.check.expressionCached(d.moduleReference);
        }
      }
    }
  }
  class Type extends qb.Type {}
  const unknownSymbol = new Symbol(SymbolFlags.Property, 'unknown' as qu.__String);
  const resolvingSymbol = new Symbol(0, qt.InternalSymbol.Resolving);

  const compilerOpts = host.getCompilerOpts();
  const allowSyntheticDefaultImports = getAllowSyntheticDefaultImports(compilerOpts);
  const emptySymbols = new qb.SymbolTable();
  const anyFunctionType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const anyType = qf.make.intrinsicType(TypeFlags.Any, 'any');
  const anyIterationTypes = qf.make.iterationTypes(anyType, anyType, anyType);
  const unknownType = qf.make.intrinsicType(TypeFlags.Unknown, 'unknown');
  const anyIterationTypesExceptNext = qf.make.iterationTypes(anyType, anyType, unknownType);
  const anySignature = qf.make.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
  const argsSymbol = new Symbol(SymbolFlags.Property, 'args' as qu.__String);
  const arrayVariances = [qt.VarianceFlags.Covariant];
  const autoType = qf.make.intrinsicType(TypeFlags.Any, 'any');
  const bigintType = qf.make.intrinsicType(TypeFlags.BigInt, 'bigint');
  const regularFalseType = qf.make.intrinsicType(TypeFlags.BooleanLiteral, 'false') as qt.FreshableIntrinsicType;
  const regularTrueType = qf.make.intrinsicType(TypeFlags.BooleanLiteral, 'true') as qt.FreshableIntrinsicType;
  const booleanType = qf.make.booleanType([regularFalseType, regularTrueType]);
  const circularConstraintType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const neverType = qf.make.intrinsicType(TypeFlags.Never, 'never');
  const undefinedType = qf.make.intrinsicType(TypeFlags.Undefined, 'undefined');
  const defaultIterationTypes = qf.make.iterationTypes(neverType, anyType, undefinedType);
  const emitResolver = createResolver();
  const emptyGenericType = <qt.GenericType>(<qt.ObjectType>qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined));
  const emptyJsxObjectType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const emptyObjectType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const emptyTypeLiteralSymbol = new Symbol(SymbolFlags.TypeLiteral, qt.InternalSymbol.Type);
  const emptyTypeLiteralType = qf.make.anonymousType(emptyTypeLiteralSymbol, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const stringType = qf.make.intrinsicType(TypeFlags.String, 'string');
  const enumNumberIndexInfo = qf.make.indexInfo(stringType, true);
  const errorType = qf.make.intrinsicType(TypeFlags.Any, 'error');
  const esSymbolType = qf.make.intrinsicType(TypeFlags.ESSymbol, 'symbol');
  const falseType = qf.make.intrinsicType(TypeFlags.BooleanLiteral, 'false') as qt.FreshableIntrinsicType;
  const freshObjectLiteralFlag = compilerOpts.suppressExcessPropertyErrors ? 0 : ObjectFlags.FreshLiteral;
  const globals = new qb.SymbolTable();
  const globalThisSymbol = new Symbol(SymbolFlags.Module, 'globalThis' as qu.__String, qt.CheckFlags.Readonly);
  const implicitNeverType = qf.make.intrinsicType(TypeFlags.Never, 'never');
  const iterationTypesCache = new qu.QMap<qt.IterationTypes>();
  const numberType = qf.make.intrinsicType(TypeFlags.Number, 'number');
  const stringNumberSymbolType = qf.get.unionType([stringType, numberType, esSymbolType]);
  const keyofStringsOnly = !!compilerOpts.keyofStringsOnly;
  const keyofConstraintType = keyofStringsOnly ? stringType : stringNumberSymbolType;
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const markerOtherType = qf.make.typeParam();
  const markerSubType = qf.make.typeParam();
  const markerSuperType = qf.make.typeParam();
  const moduleKind = getEmitModuleKind(compilerOpts);
  const noConstraintType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const nodeBuilder = createNodeBuilder();
  const noImplicitAny = getStrictOptionValue(compilerOpts, 'noImplicitAny');
  const noImplicitThis = getStrictOptionValue(compilerOpts, 'noImplicitThis');
  const nonInferrableAnyType = qf.make.intrinsicType(TypeFlags.Any, 'any', ObjectFlags.ContainsWideningType);
  const nonInferrableType = qf.make.intrinsicType(TypeFlags.Never, 'never', ObjectFlags.NonInferrableType);
  const nonPrimitiveType = qf.make.intrinsicType(TypeFlags.NonPrimitive, 'object');
  const noTypePredicate = qf.make.typePredicate(qt.TypePredicateKind.Identifier, '<<unresolved>>', 0, anyType);
  const nullType = qf.make.intrinsicType(TypeFlags.Null, 'null');
  const strictNullChecks = getStrictOptionValue(compilerOpts, 'strictNullChecks');
  const nullWideningType = strictNullChecks ? nullType : qf.make.intrinsicType(TypeFlags.Null, 'null', ObjectFlags.ContainsWideningType);
  const numberOrBigIntType = qf.get.unionType([numberType, bigintType]);
  const optionalType = qf.make.intrinsicType(TypeFlags.Undefined, 'undefined');
  const permissiveMapper: qt.TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? wildcardType : t));
  const requireSymbol = new Symbol(SymbolFlags.Property, 'require' as qu.__String);
  const resolvingDefaultType = qf.make.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const resolvingSignature = qf.make.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
  const restrictiveMapper: qt.TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? getRestrictiveTypeParam(<qt.TypeParam>t) : t));
  const silentNeverType = qf.make.intrinsicType(TypeFlags.Never, 'never');
  const silentNeverSignature = qf.make.signature(undefined, undefined, undefined, qu.empty, silentNeverType, undefined, 0, SignatureFlags.None);
  const strictBindCallApply = getStrictOptionValue(compilerOpts, 'strictBindCallApply');
  const strictFunctionTypes = getStrictOptionValue(compilerOpts, 'strictFunctionTypes');
  const strictPropertyInitialization = getStrictOptionValue(compilerOpts, 'strictPropertyInitialization');
  const trueType = qf.make.intrinsicType(TypeFlags.BooleanLiteral, 'true') as qt.FreshableIntrinsicType;
  const undefinedSymbol = new Symbol(SymbolFlags.Property, 'undefined' as qu.__String);
  const undefinedWideningType = strictNullChecks ? undefinedType : qf.make.intrinsicType(TypeFlags.Undefined, 'undefined', ObjectFlags.ContainsWideningType);
  const unknownSignature = qf.make.signature(undefined, undefined, undefined, qu.empty, errorType, undefined, 0, SignatureFlags.None);
  const unreachableNeverType = qf.make.intrinsicType(TypeFlags.Never, 'never');
  const voidType = qf.make.intrinsicType(TypeFlags.Void, 'void');
  const wildcardType = qf.make.intrinsicType(TypeFlags.Any, 'any');
  const tupleTypes = new qu.QMap<qt.GenericType>();
  const unionTypes = new qu.QMap<qt.UnionType>();
  const intersectionTypes = new qu.QMap<qt.Type>();
  const literalTypes = new qu.QMap<qt.LiteralType>();
  const indexedAccessTypes = new qu.QMap<qt.IndexedAccessType>();
  const substitutionTypes = new qu.QMap<qt.SubstitutionType>();
  const evolvingArrayTypes: qt.EvolvingArrayType[] = [];
  const undefinedProperties = new qu.QMap<qt.Symbol>() as qu.EscapedMap<qt.Symbol>;
  const reverseMappedCache = new qu.QMap<qt.Type | undefined>();
  const emptyStringType = qf.get.literalType('');
  const zeroType = qf.get.literalType(0);
  const zeroBigIntType = qf.get.literalType({ negative: false, base10Value: '0' });
  const resolutionTargets: TypeSystemEntity[] = [];
  const resolutionResults: boolean[] = [];
  const resolutionPropertyNames: TypeSystemPropertyName[] = [];
  const maximumSuggestionCount = 10;
  const mergedSymbols: qt.Symbol[] = [];
  const symbolLinks: qt.SymbolLinks[] = [];
  const flowLoopCaches: qu.QMap<qt.Type>[] = [];
  const flowLoopNodes: qt.FlowNode[] = [];
  const flowLoopKeys: string[] = [];
  const flowLoopTypes: qt.Type[][] = [];
  const sharedFlowNodes: qt.FlowNode[] = [];
  const sharedFlowTypes: qt.FlowType[] = [];
  const flowNodeReachable: (boolean | undefined)[] = [];
  const flowNodePostSuper: (boolean | undefined)[] = [];
  const potentialThisCollisions: Node[] = [];
  const potentialNewTargetCollisions: Node[] = [];
  const potentialWeakMapCollisions: Node[] = [];
  const awaitedTypeStack: number[] = [];
  const diagnostics = createDiagnosticCollection();
  const suggestionDiagnostics = createDiagnosticCollection();
  const allPotentiallyUnusedIdentifiers = new qu.QMap<PotentiallyUnusedIdentifier[]>();
  const typeofType = createTypeofType();
  const subtypeRelation = new qu.QMap<qt.RelationComparisonResult>();
  const strictSubtypeRelation = new qu.QMap<qt.RelationComparisonResult>();
  const assignableRelation = new qu.QMap<qt.RelationComparisonResult>();
  const comparableRelation = new qu.QMap<qt.RelationComparisonResult>();
  const identityRelation = new qu.QMap<qt.RelationComparisonResult>();
  const enumRelation = new qu.QMap<qt.RelationComparisonResult>();
  const builtinGlobals = new qc.SymbolTable();

  qf.make.booleanType([falseType, regularTrueType]);
  qf.make.booleanType([falseType, trueType]);
  qf.make.booleanType([regularFalseType, trueType]);
  anyFunctionType.objectFlags |= ObjectFlags.NonInferrableType;
  emptyGenericType.instantiations = new qu.QMap<qt.TypeReference>();
  emptyJsxObjectType.objectFlags |= ObjectFlags.JsxAttributes;
  emptyTypeLiteralSymbol.members = new qc.SymbolTable();
  falseType.freshType = falseType;
  falseType.regularType = regularFalseType;
  globals.set(globalThisSymbol.escName, globalThisSymbol);
  globalThisSymbol.declarations = [];
  globalThisSymbol.exports = globals;
  markerSubType.constraint = markerSuperType;
  regularFalseType.freshType = falseType;
  regularFalseType.regularType = regularFalseType;
  regularTrueType.freshType = trueType;
  regularTrueType.regularType = regularTrueType;
  trueType.freshType = trueType;
  trueType.regularType = regularTrueType;
  undefinedSymbol.declarations = [];

  const noIterationTypes: qt.IterationTypes = {
    get yieldType(): qt.Type {
      return qu.fail('Not supported');
    },
    get returnType(): qt.Type {
      return qu.fail('Not supported');
    },
    get nextType(): qt.Type {
      return qu.fail('Not supported');
    },
  };
  const asyncIterationTypesResolver: qt.IterationTypesResolver = {
    iterableCacheKey: 'iterationTypesOfAsyncIterable',
    iteratorCacheKey: 'iterationTypesOfAsyncIterator',
    iteratorSymbolName: 'asyncIterator',
    getGlobalIteratorType: getGlobalAsyncIteratorType,
    getGlobalIterableType: getGlobalAsyncIterableType,
    getGlobalIterableIteratorType: getGlobalAsyncIterableIteratorType,
    getGlobalGeneratorType: getGlobalAsyncGeneratorType,
    resolveIterationType: getAwaitedType,
    mustHaveANextMethodDiagnostic: qd.msgs.An_async_iterator_must_have_a_next_method,
    mustBeAMethodDiagnostic: qd.msgs.The_0_property_of_an_async_iterator_must_be_a_method,
    mustHaveAValueDiagnostic: qd.msgs.The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_property,
  };
  const syncIterationTypesResolver: qt.IterationTypesResolver = {
    iterableCacheKey: 'iterationTypesOfIterable',
    iteratorCacheKey: 'iterationTypesOfIterator',
    iteratorSymbolName: 'iterator',
    getGlobalIteratorType,
    getGlobalIterableType,
    getGlobalIterableIteratorType,
    getGlobalGeneratorType,
    resolveIterationType: (type, _errorNode) => type,
    mustHaveANextMethodDiagnostic: qd.msgs.An_iterator_must_have_a_next_method,
    mustBeAMethodDiagnostic: qd.msgs.The_0_property_of_an_iterator_must_be_a_method,
    mustHaveAValueDiagnostic: qd.msgs.The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property,
  };
  const typeofTypesByName: qu.QReadonlyMap<qt.Type> = new qu.QMap<qt.Type>({
    string: stringType,
    number: numberType,
    bigint: bigintType,
    boolean: booleanType,
    symbol: esSymbolType,
    undefined: undefinedType,
  });
  let _jsxNamespace: qu.__String;
  let _jsxFactoryEntity: qt.EntityName | undefined;
  let nextMergeId = 1;
  let nextFlowId = 1;
  let cancellationToken: qt.CancellationToken | undefined;
  let requestedExternalEmitHelpers: qt.ExternalEmitHelpers;
  let externalHelpersModule: qt.Symbol;
  let enumCount = 0;
  let totalInstantiationCount = 0;
  let instantiationCount = 0;
  let instantiationDepth = 0;
  let constraintDepth = 0;
  let currentNode: Node | undefined;
  let apparentArgCount: number | undefined;
  let amalgamatedDuplicates: qu.QMap<DuplicateInfoForFiles> | undefined;
  let inInferTypeForHomomorphicMappedType = false;
  let ambientModulesCache: qt.Symbol[] | undefined;
  let patternAmbientModules: qt.PatternAmbientModule[];
  let patternAmbientModuleAugmentations: qu.QMap<qt.Symbol> | undefined;
  let globalObjectType: qt.ObjectType;
  let globalFunctionType: qt.ObjectType;
  let globalCallableFunctionType: qt.ObjectType;
  let globalNewableFunctionType: qt.ObjectType;
  let globalArrayType: qt.GenericType;
  let globalReadonlyArrayType: qt.GenericType;
  let globalStringType: qt.ObjectType;
  let globalNumberType: qt.ObjectType;
  let globalBooleanType: qt.ObjectType;
  let globalRegExpType: qt.ObjectType;
  let globalThisType: qt.GenericType;
  let anyArrayType: qt.Type;
  let autoArrayType: qt.Type;
  let anyReadonlyArrayType: qt.Type;
  let deferredGlobalNonNullableTypeAlias: qt.Symbol;
  let deferredGlobalESSymbolConstructorSymbol: qt.Symbol | undefined;
  let deferredGlobalESSymbolType: qt.ObjectType;
  let deferredGlobalTypedPropertyDescriptorType: qt.GenericType;
  let deferredGlobalPromiseType: qt.GenericType;
  let deferredGlobalPromiseLikeType: qt.GenericType;
  let deferredGlobalPromiseConstructorSymbol: qt.Symbol | undefined;
  let deferredGlobalPromiseConstructorLikeType: qt.ObjectType;
  let deferredGlobalIterableType: qt.GenericType;
  let deferredGlobalIteratorType: qt.GenericType;
  let deferredGlobalIterableIteratorType: qt.GenericType;
  let deferredGlobalGeneratorType: qt.GenericType;
  let deferredGlobalIteratorYieldResultType: qt.GenericType;
  let deferredGlobalIteratorReturnResultType: qt.GenericType;
  let deferredGlobalAsyncIterableType: qt.GenericType;
  let deferredGlobalAsyncIteratorType: qt.GenericType;
  let deferredGlobalAsyncIterableIteratorType: qt.GenericType;
  let deferredGlobalAsyncGeneratorType: qt.GenericType;
  let deferredGlobalTemplateStringsArrayType: qt.ObjectType;
  let deferredGlobalImportMetaType: qt.ObjectType;
  let deferredGlobalExtractSymbol: qt.Symbol;
  let deferredGlobalOmitSymbol: qt.Symbol;
  let deferredGlobalBigIntType: qt.ObjectType;
  let flowLoopStart = 0;
  let flowLoopCount = 0;
  let sharedFlowCount = 0;
  let flowAnalysisDisabled = false;
  let flowInvocationCount = 0;
  let lastFlowNode: qt.FlowNode | undefined;
  let lastFlowNodeReachable: boolean;
  let flowTypeCache: qt.Type[] | undefined;
  let suggestionCount = 0;

  function newType(f: qt.Frame) {
    interface Frame extends qt.Frame {
      check: Fcheck;
      get: Fget;
      has: Fhas;
    }
    const qf = f as Frame;
    interface _Ftype extends qg.Ftype {}
    class _Ftype {}
    const t = qg.newType(qf);
    qu.addMixins(_Ftype, [t]);
    type _Fget = qg.Ftype['get'];
    type _Fis = qg.Ftype['is'];
    return (qf.type = new (class Base extends _Ftype {
      _get2 = new (class extends Base {})();
      get: Base['_get2'] & _Fget;
      _is2 = new (class extends Base {
        assignableToKind(t: Type, k: TypeFlags, strict?: boolean) {
          if (t.flags & k) return true;
          if (strict && t.flags & (TypeFlags.AnyOrUnknown | TypeFlags.Void | TypeFlags.Undefined | TypeFlags.Null)) return false;
          return (
            (!!(k & TypeFlags.NumberLike) && this.check.assignableTo(t, numberType)) ||
            (!!(k & TypeFlags.BigIntLike) && this.check.assignableTo(t, bigintType)) ||
            (!!(k & TypeFlags.StringLike) && this.check.assignableTo(t, stringType)) ||
            (!!(k & TypeFlags.BooleanLike) && this.check.assignableTo(t, booleanType)) ||
            (!!(k & TypeFlags.Void) && this.check.assignableTo(t, voidType)) ||
            (!!(k & TypeFlags.Never) && this.check.assignableTo(t, neverType)) ||
            (!!(k & TypeFlags.Null) && this.check.assignableTo(t, nullType)) ||
            (!!(k & TypeFlags.Undefined) && this.check.assignableTo(t, undefinedType)) ||
            (!!(k & TypeFlags.ESSymbol) && this.check.assignableTo(t, esSymbolType)) ||
            (!!(k & TypeFlags.NonPrimitive) && this.check.assignableTo(t, nonPrimitiveType))
          );
        }
        iteratorResult(t: Type, k: qt.IterationTypeKind.Yield | qt.IterationTypeKind.Return) {
          const d = qf.get.typeOfPropertyOfType(t, 'done' as qu.__String) || falseType;
          return this.check.assignableTo(k === qt.IterationTypeKind.Yield ? falseType : trueType, d);
        }
        literalOfContextualType(t: Type, c?: Type) {
          if (c) {
            if (this.unionOrIntersection(c)) return qu.some(c.types, (t) => isLiteralOfContextualType(t, t));
            if (c.flags & TypeFlags.InstantiableNonPrimitive) {
              const b = qf.get.baseConstraintOfType(c) || unknownType;
              return (
                (maybeTypeOfKind(b, TypeFlags.String) && maybeTypeOfKind(t, TypeFlags.StringLiteral)) ||
                (maybeTypeOfKind(b, TypeFlags.Number) && maybeTypeOfKind(t, TypeFlags.NumberLiteral)) ||
                (maybeTypeOfKind(b, TypeFlags.BigInt) && maybeTypeOfKind(t, TypeFlags.BigIntLiteral)) ||
                (maybeTypeOfKind(b, TypeFlags.ESSymbol) && maybeTypeOfKind(t, TypeFlags.UniqueESSymbol)) ||
                isLiteralOfContextualType(t, b)
              );
            }
            return !!(
              (c.flags & (TypeFlags.StringLiteral | TypeFlags.Index) && maybeTypeOfKind(t, TypeFlags.StringLiteral)) ||
              (c.flags & TypeFlags.NumberLiteral && maybeTypeOfKind(t, TypeFlags.NumberLiteral)) ||
              (c.flags & TypeFlags.BigIntLiteral && maybeTypeOfKind(t, TypeFlags.BigIntLiteral)) ||
              (c.flags & TypeFlags.BooleanLiteral && maybeTypeOfKind(t, TypeFlags.BooleanLiteral)) ||
              (c.flags & TypeFlags.UniqueESSymbol && maybeTypeOfKind(t, TypeFlags.UniqueESSymbol))
            );
          }
          return false;
        }
        nullableType(t: Type) {
          return !!((strictNullChecks ? getFalsyFlags(t) : t.flags) & TypeFlags.Nullable);
        }
        untypedFunctionCall(t: Type, f: Type, calls: number, constructs: number) {
          return (
            this.any(t) ||
            (this.any(f) && !!(t.flags & TypeFlags.TypeParam)) ||
            (!calls && !constructs && !(f.flags & (TypeFlags.Union | TypeFlags.Never)) && this.check.assignableTo(t, globalFunctionType))
          );
        }
      })();
      is: Base['_is2'] & _Fis;
      constructor() {
        super();
        this.get = this._get2 as Base['get'];
        qu.addMixins(this.get, [t.get]);
        this.is = this._is2 as Base['is'];
        qu.addMixins(this.is, [t.is]);
      }
      literalTypeToNode(t: qt.FreshableType, enclosing: Node, tracker: qt.SymbolTracker): qt.Expression {
        const r =
          t.flags & qt.TypeFlags.EnumLiteral
            ? nodeBuilder.symbolToExpression(t.symbol, qt.SymbolFlags.Value, enclosing, undefined, tracker)
            : t === trueType
            ? new qc.BooleanLiteral(true)
            : t === falseType && new qc.BooleanLiteral(false);
        return r || qc.asLiteral((t as qt.LiteralType).value);
      }
    })());
  }
  interface Ftype extends ReturnType<typeof newType> {}
  function newSymbol(f: qt.Frame) {
    interface Frame extends qt.Frame {
      check: Fcheck;
      get: Fget;
      has: qg.Fhas;
    }
    const qf = f as Frame;
    interface Fsymbol extends qc.Fsymbol {}
    class Fsymbol {}
    return (qf.type = new Fsymbol());
  }
  interface Fsymbol extends ReturnType<typeof newSymbol> {}
  function newSignature(f: qt.Frame) {
    interface Frame extends qt.Frame {
      check: Fcheck;
      get: Fget;
      has: qg.Fhas;
    }
    const qf = f as Frame;
    interface Fsignature extends qc.Fsignature {}
    class Fsignature {}
    return (qf.type = new Fsignature());
  }
  interface Fsignature extends ReturnType<typeof newSignature> {}
  interface Frame extends qc.Frame {
    check: Fcheck;
    make: Fmake;
    get: Fget;
    has: qg.Fhas;
    instantiate: Finstantiate;
    is: qg.Fis;
    resolve: Fresolve;
    signature: Fsignature;
    symbol: Fsymbol;
    type: Ftype;
  }
  const f = qc.newFrame() as Frame;
  newCheck(f);
  newMake(f);
  newGet(f);
  qg.newHas(f);
  newInstantiate(f);
  qg.newIs(f);
  newResolve(f);
  newType(f);
  newSymbol(f);
  newSignature(f);
  return f;
}
