import { CheckFlags, FlowFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Fcheck } from './check';
import { Fget } from './get';
import { Nodes } from '../core';
import { Symbol } from './bases';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';

export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface Fis extends qc.Fis {}
  class Fis implements qt.CheckerIs {
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
    docIndexSignature(n: qt.TypingReference | qt.ExpressionWithTypings) {
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
    decoratable(n: qt.ClassElem, p: Node): boolean;
    decoratable(n: Node, p: Node, grandp: Node): boolean;
    decoratable(n: Node, p?: Node, grandp?: Node) {
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
    decorated(n: qt.ClassElem, p: Node): boolean;
    decorated(n: Node, p: Node, grandp: Node): boolean;
    decorated(n: Node, p?: Node, grandp?: Node) {
      return n.decorators !== undefined && this.decoratable(n, p!, grandp!);
    }
    blockScopedNameDeclaredBeforeUse(d: qt.Declaration, usage: Node) {
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
    aliasSymbolDeclaration(n: Node) {
      return (
        n.kind === Syntax.ImportEqualsDeclaration ||
        n.kind === Syntax.NamespaceExportDeclaration ||
        (n.kind === Syntax.ImportClause && !!n.name) ||
        n.kind === Syntax.NamespaceImport ||
        n.kind === Syntax.NamespaceExport ||
        n.kind === Syntax.ImportSpecifier ||
        n.kind === Syntax.ExportSpecifier ||
        (n.kind === Syntax.ExportAssignment && this.exportAssignmentAlias(n)) ||
        (n.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(n) === qt.AssignmentDeclarationKind.ModuleExports && this.exportAssignmentAlias(n)) ||
        (n.kind === Syntax.PropertyAccessExpression &&
          n.parent?.kind === Syntax.BinaryExpression &&
          n.parent.left === n &&
          n.parent.operatorToken.kind === Syntax.EqualsToken &&
          this.aliasableOrJsExpression(n.parent.right)) ||
        n.kind === Syntax.ShorthandPropertyAssignment ||
        (n.kind === Syntax.PropertyAssignment && this.aliasableOrJsExpression(n.initer))
      );
    }
    aliasableOrJsExpression(e: qt.Expression) {
      return this.aliasableExpression(e) || (e.kind === Syntax.FunctionExpression && this.jsConstructor(e));
    }
    syntacticDefault(n: Node) {
      return (n.kind === Syntax.ExportAssignment && !n.isExportEquals) || qf.has.syntacticModifier(n, ModifierFlags.Default) || n.kind === Syntax.ExportSpecifier;
    }
    anySymbolAccessible(
      ss: qt.Symbol[] | undefined,
      enclosingDeclaration: Node | undefined,
      initialSymbol: qt.Symbol,
      meaning: qt.SymbolFlags,
      compute: boolean
    ): qt.SymbolAccessibilityResult | undefined {
      if (!qu.length(ss)) return;
      let hadAccessibleChain: qt.Symbol | undefined;
      let earlyModuleBail = false;
      for (const s of ss!) {
        const c = qf.get.accessibleSymbolChain(s, enclosingDeclaration, meaning, false);
        if (c) {
          hadAccessibleChain = s;
          const hasAccessibleDeclarations = hasVisibleDeclarations(c[0], compute);
          if (hasAccessibleDeclarations) return hasAccessibleDeclarations;
        } else {
          if (qu.some(s.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) {
            if (compute) {
              earlyModuleBail = true;
              continue;
            }
            return { accessibility: qt.SymbolAccessibility.Accessible };
          }
        }
        let cs = getContainersOfSymbol(s, enclosingDeclaration);
        const firstDecl: Node | false = !!qu.length(s.declarations) && first(s.declarations);
        if (!qu.length(cs) && meaning & qt.SymbolFlags.Value && firstDecl && firstDecl.kind === Syntax.ObjectLiteralExpression) {
          if (firstDecl.parent && firstDecl.parent.kind === Syntax.VariableDeclaration && firstDecl === firstDecl.parent.initer) containers = [qf.get.symbolOfNode(firstDecl.parent)];
        }
        const parentResult = this.anySymbolAccessible(cs, enclosingDeclaration, initialSymbol, initialSymbol === s ? getQualifiedLeftMeaning(meaning) : meaning, compute);
        if (parentResult) return parentResult;
      }
      if (earlyModuleBail) {
        return { accessibility: qt.SymbolAccessibility.Accessible };
      }
      if (hadAccessibleChain) {
        return {
          accessibility: qt.SymbolAccessibility.NotAccessible,
          errorSymbolName: initialSymbol.symbolToString(enclosingDeclaration, meaning),
          errorModuleName: hadAccessibleChain !== initialSymbol ? hadAccessibleChain.symbolToString(enclosingDeclaration, qt.SymbolFlags.Namespace) : undefined,
        };
      }
      return;
    }
    entityNameVisible(entityName: qt.EntityNameOrEntityNameExpression, enclosingDeclaration: Node): qt.SymbolVisibilityResult {
      let meaning: qt.SymbolFlags;
      if (entityName.parent.kind === Syntax.TypingQuery || this.expressionWithTypeArgsInClassExtendsClause(entityName.parent) || entityName.parent.kind === Syntax.ComputedPropertyName)
        meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
      else if (entityName.kind === Syntax.QualifiedName || entityName.kind === Syntax.PropertyAccessExpression || entityName.parent.kind === Syntax.ImportEqualsDeclaration) {
        meaning = qt.SymbolFlags.Namespace;
      } else {
        meaning = qt.SymbolFlags.Type;
      }
      const firstIdentifier = qf.get.firstIdentifier(entityName);
      const s = resolveName(enclosingDeclaration, firstIdentifier.escapedText, meaning, undefined, undefined, false);
      return (
        (s && hasVisibleDeclarations(s, true)) || {
          accessibility: qt.SymbolAccessibility.NotAccessible,
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
            case Syntax.MethodSignature:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
            case Syntax.SetAccessor:
              if (qf.has.effectiveModifier(n, ModifierFlags.Private | ModifierFlags.Protected)) return false;
            case Syntax.ArrayTyping:
            case Syntax.CallSignature:
            case Syntax.Constructor:
            case Syntax.ConstructorTyping:
            case Syntax.ConstructSignature:
            case Syntax.FunctionTyping:
            case Syntax.IndexSignature:
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
          return !!(t as qt.TypeReference).resolvedTypeArgs;
      }
      return qc.assert.never(propertyName);
    }
    nullOrUndefined(n: qt.Expression) {
      const e = qf.skip.parentheses(n);
      return e.kind === Syntax.NullKeyword || (e.kind === Syntax.Identifier && getResolvedSymbol(e) === undefinedSymbol);
    }
    emptyArrayLiteral(n: qt.Expression) {
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
      return this.entityNameExpression(e) && this.typeUsableAsPropertyName(n.kind === Syntax.ComputedPropertyName ? check.computedPropertyName(n) : check.expressionCached(e));
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
    neverReducedProperty(s: qt.Symbol) {
      return this.discriminantWithNeverType(s) || this.conflictingPrivateProperty(s);
    }
    discriminantWithNeverType(s: qt.Symbol) {
      return !(s.flags & qt.SymbolFlags.Optional) && (s.checkFlags() & (CheckFlags.Discriminant | CheckFlags.HasNeverType)) === CheckFlags.Discriminant && !!(s.typeOfSymbol().flags & TypeFlags.Never);
    }
    conflictingPrivateProperty(s: qt.Symbol) {
      return !s.valueDeclaration && !!(s.checkFlags() & CheckFlags.ContainsPrivate);
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
    resolvingReturnTypeOfSignature(signature: qt.Signature) {
      return !signature.resolvedReturn && findResolutionCycleStartIndex(signature, qt.TypeSystemPropertyName.ResolvedReturnType) >= 0;
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
    resolvedByTypeAlias(n: Node) {
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
    setOfLiteralsFromSameEnum(ts: readonly qt.Type[]): boolean {
      const first = ts[0];
      if (first.flags & TypeFlags.EnumLiteral) {
        const firstEnum = getParentOfSymbol(first.symbol);
        for (let i = 1; i < ts.length; i++) {
          const other = ts[i];
          if (!(other.flags & TypeFlags.EnumLiteral) || firstEnum !== getParentOfSymbol(other.symbol)) return false;
        }
        return true;
      }
      return false;
    }
    spreadableProperty(s: qt.Symbol): boolean {
      return (
        !qu.some(s.declarations, this.privateIdentifierPropertyDeclaration) &&
        (!(s.flags & (SymbolFlags.Method | qt.SymbolFlags.GetAccessor | qt.SymbolFlags.SetAccessor)) || !s.declarations.some((d) => this.classLike(d.parent)))
      );
    }
    typeParamPossiblyReferenced(tp: qt.TypeParam, node: Node) {
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
    signatureAssignableTo(s: qt.Signature, t: qt.Signature, ignoreReturnTypes: boolean): boolean {
      return compareSignaturesRelated(s, t, ignoreReturnTypes ? qt.SignatureCheckMode.IgnoreReturnTypes : 0, false, undefined, undefined, compareTypesAssignable, undefined) !== qt.Ternary.False;
    }
    anySignature(s: qt.Signature) {
      return (
        !s.typeParams &&
        (!s.thisParam || this.typeAny(getTypeOfParam(s.thisParam))) &&
        s.params.length === 1 &&
        s.hasRestParam() &&
        (getTypeOfParam(s.params[0]) === anyArrayType || this.typeAny(getTypeOfParam(s.params[0]))) &&
        this.typeAny(qf.get.returnTypeOfSignature(s))
      );
    }
    implementationCompatibleWithOverload(implementation: qt.Signature, overload: qt.Signature): boolean {
      const erasedSource = getErasedSignature(implementation);
      const erasedTarget = getErasedSignature(overload);
      const sourceReturnType = qf.get.returnTypeOfSignature(erasedSource);
      const targetReturnType = qf.get.returnTypeOfSignature(erasedTarget);
      if (targetReturnType === voidType || this.typeRelatedTo(targetReturnType, sourceReturnType, assignableRelation) || this.typeRelatedTo(sourceReturnType, targetReturnType, assignableRelation))
        return this.signatureAssignableTo(erasedSource, erasedTarget, true);
      return false;
    }
    emptyResolvedType(t: qt.ResolvedType) {
      return t !== anyFunctionType && t.properties.length === 0 && t.callSignatures.length === 0 && t.constructSignatures.length === 0 && !t.stringIndexInfo && !t.numberIndexInfo;
    }
    enumTypeRelatedTo(s: qt.Symbol, t: qt.Symbol, errorReporter?: qt.ErrorReporter) {
      if (s === t) return true;
      const id = s.getId() + ',' + t.getId();
      const entry = enumRelation.get(id);
      if (entry !== undefined && !(!(entry & qt.RelationComparisonResult.Reported) && entry & qt.RelationComparisonResult.Failed && errorReporter))
        return !!(entry & qt.RelationComparisonResult.Succeeded);
      if (s.escName !== t.escName || !(s.flags & qt.SymbolFlags.RegularEnum) || !(t.flags & qt.SymbolFlags.RegularEnum)) {
        enumRelation.set(id, qt.RelationComparisonResult.Failed | qt.RelationComparisonResult.Reported);
        return false;
      }
      const targetEnumType = t.typeOfSymbol();
      for (const property of qf.get.propertiesOfType(s.typeOfSymbol())) {
        if (property.flags & qt.SymbolFlags.EnumMember) {
          const targetProperty = qf.get.propertyOfType(targetEnumType, property.escName);
          if (!targetProperty || !(targetProperty.flags & qt.SymbolFlags.EnumMember)) {
            if (errorReporter) {
              errorReporter(qd.msgs.Property_0_is_missing_in_type_1, property.name, typeToString(getDeclaredTypeOfSymbol(t), undefined, TypeFormatFlags.UseFullyQualifiedType));
              enumRelation.set(id, qt.RelationComparisonResult.Failed | qt.RelationComparisonResult.Reported);
            } else enumRelation.set(id, qt.RelationComparisonResult.Failed);
            return false;
          }
        }
      }
      enumRelation.set(id, qt.RelationComparisonResult.Succeeded);
      return true;
    }
    propertyInClassDerivedFrom(s: qt.Symbol, baseClass: qt.Type | undefined) {
      return forEachProperty(s, (sp) => {
        const sClass = getDeclaringClass(sp);
        return sClass ? hasBaseType(sClass, baseClass) : false;
      });
    }
    validOverrideOf(sProp: qt.Symbol, tProp: qt.Symbol) {
      return !forEachProperty(tProp, (s) => (s.declarationModifierFlags() & ModifierFlags.Protected ? !isPropertyInClassDerivedFrom(sProp, getDeclaringClass(s)) : false));
    }
    classDerivedFromDeclaringClasses(checkClass: qt.Type, s: qt.Symbol) {
      return forEachProperty(s, (p) => (p.declarationModifierFlags() & ModifierFlags.Protected ? !hasBaseType(checkClass, getDeclaringClass(p)) : false)) ? undefined : checkClass;
    }
    propertyIdenticalTo(sProp: qt.Symbol, tProp: qt.Symbol): boolean {
      return compareProperties(sProp, tProp, compareTypesIdentical) !== qt.Ternary.False;
    }
    matchingSignature(s: qt.Signature, t: qt.Signature, partialMatch: boolean) {
      const sParamCount = getParamCount(s);
      const tParamCount = getParamCount(t);
      const sMinArgCount = getMinArgCount(s);
      const tMinArgCount = getMinArgCount(t);
      const sHasRestParam = hasEffectiveRestParam(s);
      const tHasRestParam = hasEffectiveRestParam(t);
      if (sParamCount === tParamCount && sMinArgCount === tMinArgCount && sHasRestParam === tHasRestParam) return true;
      if (partialMatch && sMinArgCount <= tMinArgCount) return true;
      return false;
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
    discriminantProperty(t: qt.Type | undefined, name: qu.__String) {
      if (t && t.flags & TypeFlags.Union) {
        const s = getUnionOrIntersectionProperty(t, name);
        if (s && s.checkFlags() & CheckFlags.SyntheticProperty) {
          if ((<qt.TransientSymbol>s).isDiscriminantProperty === undefined) {
            (<qt.TransientSymbol>s).isDiscriminantProperty =
              ((<qt.TransientSymbol>s).checkFlags & CheckFlags.Discriminant) === CheckFlags.Discriminant && !maybeTypeOfKind(s.typeOfSymbol(), TypeFlags.Instantiable);
          }
          return !!(<qt.TransientSymbol>s).isDiscriminantProperty;
        }
      }
      return false;
    }
    orContainsMatchingReference(s: Node, t: Node) {
      return this.matchingReference(s, t) || containsMatchingReference(s, t);
    }
    functionObjectType(t: qt.ObjectType): boolean {
      const resolved = resolveStructuredTypeMembers(t);
      return !!(resolved.callSignatures.length || resolved.constructSignatures.length || (resolved.members.get('bind' as qu.__String) && isTypeSubtypeOf(t, globalFunctionType)));
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
    typeSubsetOf(s: qt.Type, t: qt.Type) {
      return s === t || (t.flags & TypeFlags.Union && this.typeSubsetOfUnion(s, t));
    }
    typeSubsetOfUnion(s: qt.Type, t: qt.UnionType) {
      if (s.flags & TypeFlags.Union) {
        for (const t of s.types) {
          if (!containsType(t.types, t)) return false;
        }
        return true;
      }
      if (s.flags & TypeFlags.EnumLiteral && getBaseTypeOfEnumLiteralType(<qt.LiteralType>s) === t) return true;
      return containsType(t.types, s);
    }
    incomplete(flowType: qt.FlowType) {
      return flowType.flags === 0;
    }
    evolvingArrayTypeList(types: qt.Type[]) {
      let hasEvolvingArrayType = false;
      for (const t of types) {
        if (!(t.flags & TypeFlags.Never)) {
          if (!(getObjectFlags(t) & ObjectFlags.EvolvingArray)) return false;
          hasEvolvingArrayType = true;
        }
      }
      return hasEvolvingArrayType;
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
        this.typeAssignableToKind(qf.get.typeOfExpression(p.argExpression), TypeFlags.NumberLike);
      return isLengthPushOrUnshift || isElemAssignment;
    }
    declarationWithExplicitTypeAnnotation(d: qt.Declaration) {
      return (
        (d.kind === Syntax.VariableDeclaration || d.kind === Syntax.Param || d.kind === Syntax.PropertyDeclaration || d.kind === Syntax.PropertySignature) &&
        !!qf.get.effectiveTypeAnnotationNode(d as qt.VariableDeclaration | qt.ParamDeclaration | qt.PropertyDeclaration | qt.PropertySignature)
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
          const signature = getEffectsSignature((<qt.FlowCall>flow).n);
          if (signature) {
            const predicate = getTypePredicateOfSignature(signature);
            if (predicate && predicate.kind === qt.TypePredicateKind.AssertsIdentifier) {
              const predicateArg = (<qt.FlowCall>flow).n.args[predicate.paramIndex];
              if (predicateArg && this.falseExpression(predicateArg)) return false;
            }
            if (qf.get.returnTypeOfSignature(signature).flags & TypeFlags.Never) return false;
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
    aritySmaller(signature: qt.Signature, t: qt.SignatureDeclaration) {
      let tParamCount = 0;
      for (; tParamCount < t.params.length; tParamCount++) {
        const param = t.params[tParamCount];
        if (param.initer || param.questionToken || param.dot3Token || this.docOptionalParam(param)) break;
      }
      if (t.params.length && paramIsThqy.this.keyword(t.params[0])) tParamCount--;
      return !hasEffectiveRestParam(signature) && getParamCount(signature) < tParamCount;
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
      return this.typeAssignableToKind(qf.check.computedPropertyName(n), TypeFlags.NumberLike);
    }
    validSpreadType(t: qt.Type): boolean {
      if (t.flags & TypeFlags.Instantiable) {
        const constraint = qf.get.baseConstraintOfType(t);
        if (constraint !== undefined) return this.validSpreadType(constraint);
      }
      return !!(
        t.flags & (TypeFlags.Any | TypeFlags.NonPrimitive | TypeFlags.Object | TypeFlags.InstantiableNonPrimitive) ||
        (getFalsyFlags(t) & TypeFlags.DefinitelyFalsy && this.validSpreadType(removeDefinitelyFalsyTypes(t))) ||
        (t.flags & TypeFlags.UnionOrIntersection && qu.every(t.types, this.validSpreadType))
      );
    }
    jsxIntrinsicIdentifier(tagName: qt.JsxTagNameExpression): boolean {
      return tagName.kind === Syntax.Identifier && qy.is.intrinsicJsxName(tagName.escapedText);
    }
    knownProperty(tType: qt.Type, name: qu.__String, isComparingJsxAttributes: boolean): boolean {
      if (tType.flags & TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(tType as qt.ObjectType);
        if (
          resolved.stringIndexInfo ||
          (resolved.numberIndexInfo && qt.NumericLiteral.name(name)) ||
          getPropertyOfObjectType(tType, name) ||
          (isComparingJsxAttributes && !qu.unhyphenatedJsxName(name))
        ) {
          return true;
        }
      } else if (tType.flags & TypeFlags.UnionOrIntersection && this.excessPropertyCheckTarget(tType)) {
        for (const t of (tType as qt.UnionOrIntersectionType).types) {
          if (this.knownProperty(t, name, isComparingJsxAttributes)) return true;
        }
      }
      return false;
    }
    excessPropertyCheckTarget(t: qt.Type): boolean {
      return !!(
        (t.flags & TypeFlags.Object && !(getObjectFlags(t) & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) ||
        t.flags & TypeFlags.NonPrimitive ||
        (t.flags & TypeFlags.Union && qu.some(t.types, this.excessPropertyCheckTarget)) ||
        (t.flags & TypeFlags.Intersection && qu.every(t.types, this.excessPropertyCheckTarget))
      );
    }
    nullableType(t: qt.Type) {
      return !!((strictNullChecks ? getFalsyFlags(t) : t.flags) & TypeFlags.Nullable);
    }
    methodAccessForCall(n: Node) {
      while (n.parent.kind === Syntax.ParenthesizedExpression) {
        n = n.parent;
      }
      return this.callOrNewExpression(n.parent) && n.parent.expression === n;
    }
    thisPropertyAccessInConstructor(n: qt.ElemAccessExpression | qt.PropertyAccessExpression | qt.QualifiedName, s: qt.Symbol) {
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
    propertyDeclaredInAncestorClass(s: qt.Symbol): boolean {
      if (!(s.parent!.flags & qt.SymbolFlags.Class)) return false;
      let classType: qt.InterfaceType | undefined = s.parent!.typeOfSymbol() as qt.InterfaceType;
      while (true) {
        classType = classType.symbol && (getSuperClass(classType) as qt.InterfaceType | undefined);
        if (!classType) return false;
        const superProperty = qf.get.propertyOfType(classType, s.escName);
        if (superProperty && superProperty.valueDeclaration) return true;
      }
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
    validPropertyAccessForCompletions(n: qt.PropertyAccessExpression | qt.ImportTyping | qt.QualifiedName, t: qt.Type, property: qt.Symbol): boolean {
      return this.validPropertyAccessWithType(n, n.kind === Syntax.PropertyAccessExpression && n.expression.kind === Syntax.SuperKeyword, property.escName, t);
    }
    validPropertyAccessWithType(n: qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTyping, isSuper: boolean, propertyName: qu.__String, t: qt.Type): boolean {
      if (t === errorType || this.typeAny(t)) return true;
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
        if (s.flags & qt.SymbolFlags.Variable) {
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
    genericFunctionReturningFunction(s: qt.Signature) {
      return !!(s.typeParams && this.functionType(qf.get.returnTypeOfSignature(s)));
    }
    untypedFunctionCall(t: qt.Type, apparentFuncType: qt.Type, numCallSignatures: number, numConstructSignatures: number): boolean {
      return (
        this.typeAny(t) ||
        (this.typeAny(apparentFuncType) && !!(t.flags & TypeFlags.TypeParam)) ||
        (!numCallSignatures && !numConstructSignatures && !(apparentFuncType.flags & (TypeFlags.Union | TypeFlags.Never)) && this.typeAssignableTo(t, globalFunctionType))
      );
    }
    constructorAccessible(n: qt.NewExpression, signature: qt.Signature) {
      if (!signature || !signature.declaration) return true;
      const d = signature.declaration;
      const modifiers = qf.get.selectedEffectiveModifierFlags(d, ModifierFlags.NonPublicAccessibilityModifier);
      if (!modifiers || d.kind !== Syntax.Constructor) return true;
      const declaringClassDeclaration = d.parent.symbol.classLikeDeclaration()!;
      const declaringClass = getDeclaredTypeOfSymbol(d.parent.symbol);
      if (!isNodeWithinClass(n, declaringClassDeclaration)) {
        const containingClass = qf.get.containingClass(n);
        if (containingClass && modifiers & ModifierFlags.Protected) {
          const containingType = getTypeOfNode(containingClass);
          if (typeHasProtectedAccessibleBase(d.parent.symbol, containingType as qt.InterfaceType)) return true;
        }
        if (modifiers & ModifierFlags.Private) error(n, qd.msgs.Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
        if (modifiers & ModifierFlags.Protected) error(n, qd.msgs.Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
        return false;
      }
      return true;
    }
    potentiallyUncalledDecorator(d: qt.Decorator, ss: readonly qt.Signature[]) {
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
      return globalESSymbol === resolveName(left, 'Symbol' as qu.__String, qt.SymbolFlags.Value, undefined, undefined, false);
    }
    commonJsRequire(n: Node): boolean {
      if (!this.requireCall(n, true)) return false;
      if (!n.expression.kind === Syntax.Identifier) return qu.fail();
      const resolvedRequire = resolveName(n.expression, n.expression.escapedText, qt.SymbolFlags.Value, undefined, undefined, true)!;
      if (resolvedRequire === requireSymbol) return true;
      if (resolvedRequire.flags & qt.SymbolFlags.Alias) return false;
      const targetDeclarationKind =
        resolvedRequire.flags & qt.SymbolFlags.Function ? Syntax.FunctionDeclaration : resolvedRequire.flags & qt.SymbolFlags.Variable ? Syntax.VariableDeclaration : Syntax.Unknown;
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
            if (s && s.flags & qt.SymbolFlags.Alias) s = this.resolveAlias();
            return !!(s && s.flags & qt.SymbolFlags.Enum && getEnumKind(s) === qt.EnumKind.Literal);
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
    assignmentToReadonlyEntity(e: qt.Expression, s: qt.Symbol, assignmentKind: qt.AssignmentKind) {
      if (assignmentKind === qt.AssignmentKind.None) return false;
      if (isReadonlySymbol(s)) {
        if (s.flags & qt.SymbolFlags.Property && this.accessExpression(e) && e.expression.kind === Syntax.ThisKeyword) {
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
          if (s.flags & qt.SymbolFlags.Alias) {
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
    typeAssignableToKind(s: qt.Type, kind: TypeFlags, strict?: boolean): boolean {
      if (s.flags & kind) return true;
      if (strict && s.flags & (TypeFlags.AnyOrUnknown | TypeFlags.Void | TypeFlags.Undefined | TypeFlags.Null)) return false;
      return (
        (!!(kind & TypeFlags.NumberLike) && this.typeAssignableTo(s, numberType)) ||
        (!!(kind & TypeFlags.BigIntLike) && this.typeAssignableTo(s, bigintType)) ||
        (!!(kind & TypeFlags.StringLike) && this.typeAssignableTo(s, stringType)) ||
        (!!(kind & TypeFlags.BooleanLike) && this.typeAssignableTo(s, booleanType)) ||
        (!!(kind & TypeFlags.Void) && this.typeAssignableTo(s, voidType)) ||
        (!!(kind & TypeFlags.Never) && this.typeAssignableTo(s, neverType)) ||
        (!!(kind & TypeFlags.Null) && this.typeAssignableTo(s, nullType)) ||
        (!!(kind & TypeFlags.Undefined) && this.typeAssignableTo(s, undefinedType)) ||
        (!!(kind & TypeFlags.ESSymbol) && this.typeAssignableTo(s, esSymbolType)) ||
        (!!(kind & TypeFlags.NonPrimitive) && this.typeAssignableTo(s, nonPrimitiveType))
      );
    }
    constEnumObjectType(t: qt.Type): boolean {
      return !!(getObjectFlags(t) & ObjectFlags.Anonymous) && !!t.symbol && isConstEnumSymbol(t.symbol);
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
    typeEqualityComparableTo(s: qt.Type, t: qt.Type) {
      return (t.flags & TypeFlags.Nullable) !== 0 || isTypeComparableTo(s, t);
    }
    nodekind(TypeAssertion, n: qt.Expression) {
      n = qf.skip.parentheses(n);
      return n.kind === Syntax.TypeAssertionExpression || n.kind === Syntax.AsExpression;
    }
    literalOfContextualType(t: qt.Type, c?: qt.Type): boolean {
      if (c) {
        if (c.flags & TypeFlags.UnionOrIntersection) {
          const types = c.types;
          return qu.some(types, (t) => isLiteralOfContextualType(t, t));
        }
        if (c.flags & TypeFlags.InstantiableNonPrimitive) {
          const constraint = qf.get.baseConstraintOfType(c) || unknownType;
          return (
            (maybeTypeOfKind(constraint, TypeFlags.String) && maybeTypeOfKind(t, TypeFlags.StringLiteral)) ||
            (maybeTypeOfKind(constraint, TypeFlags.Number) && maybeTypeOfKind(t, TypeFlags.NumberLiteral)) ||
            (maybeTypeOfKind(constraint, TypeFlags.BigInt) && maybeTypeOfKind(t, TypeFlags.BigIntLiteral)) ||
            (maybeTypeOfKind(constraint, TypeFlags.ESSymbol) && maybeTypeOfKind(t, TypeFlags.UniqueESSymbol)) ||
            isLiteralOfContextualType(t, constraint)
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
    thenableType(t: qt.Type): boolean {
      const thenFunction = qf.get.typeOfPropertyOfType(t, 'then' as qu.__String);
      return !!thenFunction && getSignaturesOfType(getTypeWithFacts(thenFunction, TypeFacts.NEUndefinedOrNull), qt.SignatureKind.Call).length > 0;
    }
    identifierThatStartsWithUnderscore(n: Node) {
      return n.kind === Syntax.Identifier && idText(n).charCodeAt(0) === qy.Codes._;
    }
    typeParamUnused(d: qt.TypeParamDeclaration) {
      return !(qf.get.mergedSymbol(d.symbol).referenced! & qt.SymbolFlags.TypeParam) && !this.identifierThatStartsWithUnderscore(d.name);
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
    iteratorResult(t: qt.Type, kind: IterationTypeKind.Yield | IterationTypeKind.Return) {
      const doneType = qf.get.typeOfPropertyOfType(t, 'done' as qu.__String) || falseType;
      return this.typeAssignableTo(kind === IterationTypeKind.Yield ? falseType : trueType, doneType);
    }
    yieldIteratorResult(t: qt.Type) {
      return isIteratorResult(t, IterationTypeKind.Yield);
    }
    returnIteratorResult(t: qt.Type) {
      return isIteratorResult(t, IterationTypeKind.Return);
    }
    unwrappedReturnTypeVoidOrAny(func: qt.SignatureDeclaration, returnType: qt.Type): boolean {
      const unwrappedReturnType = unwrapReturnType(returnType, qf.get.functionFlags(func));
      return !!unwrappedReturnType && maybeTypeOfKind(unwrappedReturnType, TypeFlags.Void | TypeFlags.AnyOrUnknown);
    }
    instancePropertyWithoutIniter(n: Node) {
      return n.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(n, ModifierFlags.Static | ModifierFlags.Abstract) && !n.exclamationToken && !n.initer;
    }
    propertyInitializedInConstructor(propName: qc.Identifier | qc.PrivateIdentifier, propType: qt.Type, constructor: qt.ConstructorDeclaration) {
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
        if (t && qf.get.effectiveModifierFlags(n) & ModifierFlags.Export && t.flags & qt.SymbolFlags.Value && (compilerOpts.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(t))) return true;
      }
      if (checkChildren) return !!qf.each.child(n, (n) => referencedAliasDeclaration(n, checkChildren));
      return false;
    }
    implementationOfOverload(n: qt.SignatureDeclaration) {
      if (this.present((n as qt.FunctionLikeDeclaration).body)) {
        if (n.kind === Syntax.GetAccessorDeclaration || n.kind === Syntax.SetAccessorDeclaration) return false;
        const s = qf.get.symbolOfNode(n);
        const signaturesOfSymbol = getSignaturesOfSymbol(s);
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
      if (!s || !(s.flags & qt.SymbolFlags.Function)) return false;
      return !!forEachEntry(this.getExportsOfSymbol(), (p) => p.flags & qt.SymbolFlags.Value && p.valueDeclaration && p.valueDeclaration.kind === Syntax.PropertyAccessExpression);
    }
    functionType(t: qt.Type): boolean {
      return !!(t.flags & TypeFlags.Object) && getSignaturesOfType(t, qt.SignatureKind.Call).length > 0;
    }
    literalConstDeclaration(n: qt.VariableDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.ParamDeclaration): boolean {
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
  }
  return (qf.is = new Fis());
}
export interface Fis extends ReturnType<typeof newIs> {}
export function newHas(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  interface Fhas extends qc.Fhas {}
  class Fhas {
    exportAssignmentSymbol(moduleSymbol: qt.Symbol): boolean {
      return moduleSymbol.exports!.get(InternalSymbol.ExportEquals) !== undefined;
    }
    externalModuleSymbol(d: Node) {
      return this.ambientModule(d) || (d.kind === Syntax.SourceFile && this.externalOrCommonJsModule(<qt.SourceFile>d));
    }
    nonGlobalAugmentationExternalModuleSymbol(d: Node) {
      return qf.is.moduleWithStringLiteralName(d) || (d.kind === Syntax.SourceFile && qf.is.externalOrCommonJsModule(<qt.SourceFile>d));
    }
    baseType(t: qt.Type, checkBase: qt.Type | undefined) {
      return check(t);
      function check(t: qt.Type): boolean {
        if (getObjectFlags(t) & (ObjectFlags.ClassOrInterface | ObjectFlags.Reference)) {
          const target = getTargetType(t);
          return target === checkBase || qu.some(getBaseTypes(target), check);
        } else if (t.flags & TypeFlags.Intersection) {
          return qu.some(t.types, check);
        }
        return false;
      }
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
    nonCircularTypeParamDefault(typeParam: qt.TypeParam) {
      return qf.get.resolvedTypeParamDefault(typeParam) !== circularConstraintType;
    }
    typeParamDefault(typeParam: qt.TypeParam): boolean {
      return !!(typeParam.symbol && forEach(typeParam.symbol.declarations, (decl) => decl.kind === Syntax.TypeParamDeclaration && decl.default));
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
    commonProperties(s: qt.Type, t: qt.Type, isComparingJsxAttributes: boolean) {
      for (const prop of qf.get.propertiesOfType(s)) {
        if (qf.is.knownProperty(t, prop.escName, isComparingJsxAttributes)) return true;
      }
      return false;
    }
    covariantVoidArg(typeArgs: readonly qt.Type[], variances: VarianceFlags[]): boolean {
      for (let i = 0; i < variances.length; i++) {
        if ((variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Covariant && typeArgs[i].flags & TypeFlags.Void) return true;
      }
      return false;
    }
    skipDirectInferenceFlag(n: Node) {
      return !!qf.get.nodeLinks(n).skipDirectInference;
    }
    primitiveConstraint(t: qt.TypeParam): boolean {
      const constraint = qf.get.constraintOfTypeParam(t);
      return (
        !!constraint &&
        maybeTypeOfKind(constraint.flags & TypeFlags.Conditional ? getDefaultConstraintOfConditionalType(constraint as qt.ConditionalType) : constraint, TypeFlags.Primitive | TypeFlags.Index)
      );
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
    typePredicateOrNeverReturnType(signature: qt.Signature) {
      return !!(getTypePredicateOfSignature(signature) || (signature.declaration && (getReturnTypeFromAnnotation(signature.declaration) || unknownType).flags & TypeFlags.Never));
    }
    parentWithAssignmentsMarked(n: Node) {
      return !!qc.findAncestor(n.parent, (n) => qf.is.functionLike(n) && !!(qf.get.nodeLinks(n).flags & NodeCheckFlags.AssignmentsMarked));
    }
    defaultValue(n: qt.BindingElem | qt.Expression): boolean {
      return (n.kind === Syntax.BindingElem && !!(<qt.BindingElem>n).initer) || (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.EqualsToken);
    }
    numericPropertyNames(t: qt.Type) {
      return qf.get.indexTypeOfType(t, IndexKind.Number) && !qf.get.indexTypeOfType(t, IndexKind.String);
    }
    correctArity(n: qt.CallLikeExpression, args: readonly qt.Expression[], signature: qt.Signature, signatureHelpTrailingComma = false) {
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
    correctTypeArgArity(signature: qt.Signature, typeArgs: Nodes<qt.Typing> | undefined) {
      const numTypeParams = length(signature.typeParams);
      const minTypeArgCount = getMinTypeArgCount(signature.typeParams);
      return !qu.some(typeArgs) || (typeArgs.length >= minTypeArgCount && typeArgs.length <= numTypeParams);
    }
    effectiveRestParam(s: qt.Signature) {
      if (s.hasRestParam()) {
        const restType = s.params[s.params.length - 1].typeOfSymbol();
        return !this.tupleType(restType) || restType.target.hasRestElem;
      }
      return false;
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
    typeParamByName(typeParams: readonly qt.TypeParam[] | undefined, name: qu.__String) {
      return qu.some(typeParams, (tp) => tp.symbol.escName === name);
    }
    exportedMembers(moduleSymbol: qt.Symbol) {
      return forEachEntry(moduleSymbol.exports!, (_, id) => id !== 'export=');
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
    argsReference(d: qt.SignatureDeclaration): boolean {
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
    type(types: readonly qt.Type[], t: qt.Type): boolean {
      return binarySearch(types, t, getTypeId, compareNumbers) >= 0;
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
  }
  return (qf.is = new Fhas());
}
export interface Fhas extends ReturnType<typeof newHas> {}

export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface Ftype extends qc.Ftype {}
  class Ftype {}
  return (qf.type = new Ftype());
}
export interface Ftype extends ReturnType<typeof newType> {}
export function newSymbol(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface Fsymbol extends qc.Fsymbol {}
  class Fsymbol {}
  return (qf.type = new Fsymbol());
}
export interface Fsymbol extends ReturnType<typeof newSymbol> {}
export function newSignature(f: qt.Frame) {
  interface Frame extends qt.Frame {
    check: Fcheck;
    get: Fget;
    has: Fhas;
  }
  const qf = f as Frame;
  interface Fsignature extends qc.Fsignature {}
  class Fsignature {}
  return (qf.type = new Fsignature());
}
export interface Fsignature extends ReturnType<typeof newSignature> {}
