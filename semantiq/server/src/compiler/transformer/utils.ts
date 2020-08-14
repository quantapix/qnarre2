import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function getOriginalNodeId(node: Node) {
  node = qf.get.originalOf(node);
  return node ? qf.get.nodeId(node) : 0;
}
export interface ExternalModuleInfo {
  externalImports: (ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration)[];
  externalHelpersImportDeclaration: qt.ImportDeclaration | undefined;
  exportSpecifiers: Map<qt.ExportSpecifier[]>;
  exportedBindings: qt.Identifier[][];
  exportedNames: qt.Identifier[] | undefined;
  exportEquals: qt.ExportAssignment | undefined;
  hasExportStarsToExportValues: boolean;
}
function containsDefaultReference(node: qt.NamedImportBindings | undefined) {
  if (!node) return false;
  if (!node.kind === Syntax.NamedImports) return false;
  return some(node.elems, isNamedDefaultReference);
}
function isNamedDefaultReference(e: qt.ImportSpecifier): boolean {
  return e.propertyName !== undefined && e.propertyName.escapedText === InternalSymbol.Default;
}
export function chainBundle(transformSourceFile: (x: qt.SourceFile) => qt.SourceFile): (x: qt.SourceFile | qt.Bundle) => qt.SourceFile | qt.Bundle {
  return transformSourceFileOrBundle;
  function transformSourceFileOrBundle(node: qt.SourceFile | qt.Bundle) {
    return node.kind === Syntax.SourceFile ? transformSourceFile(node) : transformBundle(node);
  }
  function transformBundle(node: qt.Bundle) {
    return new qc.Bundle(map(node.sourceFiles, transformSourceFile), node.prepends);
  }
}
export function getExportNeedsImportStarHelper(node: qt.ExportDeclaration): boolean {
  return !!qf.get.namespaceDeclarationNode(node);
}
export function getImportNeedsImportStarHelper(node: qt.ImportDeclaration): boolean {
  if (!!qf.get.namespaceDeclarationNode(node)) return true;
  const bindings = node.importClause && node.importClause.namedBindings;
  if (!bindings) return false;
  if (!bindings.kind === Syntax.NamedImports) return false;
  let defaultRefCount = 0;
  for (const binding of bindings.elems) {
    if (isNamedDefaultReference(binding)) {
      defaultRefCount++;
    }
  }
  return (defaultRefCount > 0 && defaultRefCount !== bindings.elems.length) || (!!(bindings.elems.length - defaultRefCount) && qf.is.defaultImport(node));
}
export function getImportNeedsImportDefaultHelper(node: qt.ImportDeclaration): boolean {
  return (
    !getImportNeedsImportStarHelper(node) &&
    (qf.is.defaultImport(node) || (!!node.importClause && node.importClause.namedBindings?.kind === Syntax.NamedImports && containsDefaultReference(node.importClause.namedBindings)))
  );
}
export function collectExternalModuleInfo(sourceFile: qt.SourceFile, resolver: qt.EmitResolver, compilerOpts: qt.CompilerOpts): ExternalModuleInfo {
  const externalImports: (ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration)[] = [];
  const exportSpecifiers = new MultiMap<qt.ExportSpecifier>();
  const exportedBindings: qt.Identifier[][] = [];
  const uniqueExports = qu.createMap<boolean>();
  let exportedNames: qt.Identifier[] | undefined;
  let hasExportDefault = false;
  let exportEquals: qt.ExportAssignment | undefined;
  let hasExportStarsToExportValues = false;
  let hasImportStar = false;
  let hasImportDefault = false;
  for (const node of sourceFile.statements) {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
        externalImports.push(<qt.ImportDeclaration>node);
        if (!hasImportStar && getImportNeedsImportStarHelper(<qt.ImportDeclaration>node)) {
          hasImportStar = true;
        }
        if (!hasImportDefault && getImportNeedsImportDefaultHelper(<qt.ImportDeclaration>node)) {
          hasImportDefault = true;
        }
        break;
      case Syntax.ImportEqualsDeclaration:
        if ((<qt.ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference) {
          externalImports.push(<qt.ImportEqualsDeclaration>node);
        }
        break;
      case Syntax.ExportDeclaration:
        if ((<qt.ExportDeclaration>node).moduleSpecifier) {
          if (!(<qt.ExportDeclaration>node).exportClause) {
            externalImports.push(<qt.ExportDeclaration>node);
            hasExportStarsToExportValues = true;
          } else {
            externalImports.push(<qt.ExportDeclaration>node);
          }
        } else {
          for (const spec of cast((<qt.ExportDeclaration>node).exportClause, isNamedExports).elems) {
            if (!uniqueExports.get(idText(spec.name))) {
              const name = spec.propertyName || spec.name;
              exportSpecifiers.add(idText(name), spec);
              const decl = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
              if (decl) {
                multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(decl), spec.name);
              }
              uniqueExports.set(idText(spec.name), true);
              exportedNames = append(exportedNames, spec.name);
            }
          }
        }
        break;
      case Syntax.ExportAssignment:
        if ((<qt.ExportAssignment>node).isExportEquals && !exportEquals) {
          exportEquals = <qt.ExportAssignment>node;
        }
        break;
      case Syntax.VariableStatement:
        if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
          for (const decl of (<qt.VariableStatement>node).declarationList.declarations) {
            exportedNames = collectExportedVariableInfo(decl, uniqueExports, exportedNames);
          }
        }
        break;
      case Syntax.FunctionDeclaration:
        if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
          if (qf.has.syntacticModifier(node, ModifierFlags.Default)) {
            if (!hasExportDefault) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), qf.decl.name(<qt.FunctionDeclaration>node));
              hasExportDefault = true;
            }
          } else {
            const name = (<qt.FunctionDeclaration>node).name!;
            if (!uniqueExports.get(idText(name))) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), name);
              uniqueExports.set(idText(name), true);
              exportedNames = append(exportedNames, name);
            }
          }
        }
        break;
      case Syntax.ClassDeclaration:
        if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
          if (qf.has.syntacticModifier(node, ModifierFlags.Default)) {
            if (!hasExportDefault) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), qf.decl.name(<qt.ClassDeclaration>node));
              hasExportDefault = true;
            }
          } else {
            const name = (<qt.ClassDeclaration>node).name;
            if (name && !uniqueExports.get(idText(name))) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), name);
              uniqueExports.set(idText(name), true);
              exportedNames = append(exportedNames, name);
            }
          }
        }
        break;
    }
  }
  const externalHelpersImportDeclaration = createExternalHelpersImportDeclarationIfNeeded(sourceFile, compilerOpts, hasExportStarsToExportValues, hasImportStar, hasImportDefault);
  if (externalHelpersImportDeclaration) {
    externalImports.unshift(externalHelpersImportDeclaration);
  }
  return {
    externalImports,
    exportSpecifiers,
    exportEquals,
    hasExportStarsToExportValues,
    exportedBindings,
    exportedNames,
    externalHelpersImportDeclaration,
  };
}
function collectExportedVariableInfo(decl: qt.VariableDeclaration | qt.BindingElem, uniqueExports: Map<boolean>, exportedNames: qt.Identifier[] | undefined) {
  if (decl.name.kind === Syntax.BindingPattern) {
    for (const elem of decl.name.elems) {
      if (!elem.kind === Syntax.OmittedExpression) {
        exportedNames = collectExportedVariableInfo(elem, uniqueExports, exportedNames);
      }
    }
  } else if (!qf.is.generatedIdentifier(decl.name)) {
    const text = idText(decl.name);
    if (!uniqueExports.get(text)) {
      uniqueExports.set(text, true);
      exportedNames = append(exportedNames, decl.name);
    }
  }
  return exportedNames;
}
function multiMapSparseArrayAdd<V>(map: V[][], key: number, value: V): V[] {
  let values = map[key];
  if (values) {
    values.push(value);
  } else {
    map[key] = values = [value];
  }
  return values;
}
export function isSimpleCopiableExpression(expression: qt.Expression) {
  return qf.is.stringLiteralLike(expression) || expression.kind === Syntax.NumericLiteral || syntax.is.keyword(expression.kind) || expression.kind === Syntax.Identifier;
}
export function isSimpleInlineableExpression(expression: qt.Expression) {
  return (!expression.kind === Syntax.Identifier && isSimpleCopiableExpression(expression)) || qf.is.wellKnownSymbolSyntactically(expression);
}
export function isCompoundAssignment(kind: qt.BinaryOperator): kind is qt.CompoundAssignmentOperator {
  return kind >= Syntax.FirstCompoundAssignment && kind <= Syntax.LastCompoundAssignment;
}
export function getNonAssignmentOperatorForCompoundAssignment(kind: qt.CompoundAssignmentOperator): qt.BitwiseOperatorOrHigher {
  switch (kind) {
    case Syntax.PlusEqualsToken:
      return Syntax.PlusToken;
    case Syntax.MinusEqualsToken:
      return Syntax.MinusToken;
    case Syntax.AsteriskEqualsToken:
      return Syntax.AsteriskToken;
    case Syntax.Asterisk2EqualsToken:
      return Syntax.Asterisk2Token;
    case Syntax.SlashEqualsToken:
      return Syntax.SlashToken;
    case Syntax.PercentEqualsToken:
      return Syntax.PercentToken;
    case Syntax.LessThan2EqualsToken:
      return Syntax.LessThan2Token;
    case Syntax.GreaterThan2EqualsToken:
      return Syntax.GreaterThan2Token;
    case Syntax.GreaterThan3EqualsToken:
      return Syntax.GreaterThan3Token;
    case Syntax.AmpersandEqualsToken:
      return Syntax.AmpersandToken;
    case Syntax.BarEqualsToken:
      return Syntax.BarToken;
    case Syntax.CaretEqualsToken:
      return Syntax.CaretToken;
  }
}
export function addPrologueDirectivesAndInitialSuperCall(ctor: qt.ConstructorDeclaration, result: qt.Statement[], visitor: Visitor): number {
  if (ctor.body) {
    const statements = ctor.body.statements;
    const index = addPrologue(result, statements, false, visitor);
    if (index === statements.length) return index;
    const superIndex = findIndex(statements, (s) => s.kind === Syntax.ExpressionStatement && qf.is.superCall(s.expression), index);
    if (superIndex > -1) {
      for (let i = index; i <= superIndex; i++) {
        result.push(qf.visit.node(statements[i], visitor, qf.is.statement));
      }
      return superIndex + 1;
    }
    return index;
  }
  return 0;
}
export function helperString(input: TemplateStringsArray, ...args: string[]) {
  return (uniqueName: qt.EmitHelperUniqueNameCallback) => {
    let result = '';
    for (let i = 0; i < args.length; i++) {
      result += input[i];
      result += uniqueName(args[i]);
    }
    result += input[input.length - 1];
    return result;
  };
}
export function getProperties(node: qt.ClassExpression | qt.ClassDeclaration, requireIniter: boolean, isStatic: boolean): readonly qt.PropertyDeclaration[] {
  return filter(node.members, (m) => isInitializedOrStaticProperty(m, requireIniter, isStatic)) as qt.PropertyDeclaration[];
}
function isInitializedOrStaticProperty(member: qt.ClassElem, requireIniter: boolean, isStatic: boolean) {
  return member.kind === Syntax.PropertyDeclaration && (!!member.initer || !requireIniter) && qf.has.staticModifier(member) === isStatic;
}
export function isInitializedProperty(member: qt.ClassElem): member is qt.PropertyDeclaration & { initer: qt.Expression } {
  return member.kind === Syntax.PropertyDeclaration && (<qt.PropertyDeclaration>member).initer !== undefined;
}
