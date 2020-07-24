import * as qb from '../base';
import { Node, Nodes } from '../core3';
import * as qc from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, ModifierFlags, Syntax } from '../syntax';
export function getOriginalNodeId(node: Node) {
  node = qc.get.originalOf(node);
  return node ? getNodeId(node) : 0;
}
export interface ExternalModuleInfo {
  externalImports: (ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration)[];
  externalHelpersImportDeclaration: ImportDeclaration | undefined;
  exportSpecifiers: Map<ExportSpecifier[]>;
  exportedBindings: Identifier[][];
  exportedNames: Identifier[] | undefined;
  exportEquals: ExportAssignment | undefined;
  hasExportStarsToExportValues: boolean;
}
function containsDefaultReference(node: NamedImportBindings | undefined) {
  if (!node) return false;
  if (!qc.is.kind(qc.NamedImports, node)) return false;
  return some(node.elements, isNamedDefaultReference);
}
function isNamedDefaultReference(e: ImportSpecifier): boolean {
  return e.propertyName !== undefined && e.propertyName.escapedText === InternalSymbol.Default;
}
export function chainBundle(transformSourceFile: (x: SourceFile) => SourceFile): (x: SourceFile | Bundle) => SourceFile | Bundle {
  return transformSourceFileOrBundle;
  function transformSourceFileOrBundle(node: SourceFile | Bundle) {
    return node.kind === Syntax.SourceFile ? transformSourceFile(node) : transformBundle(node);
  }
  function transformBundle(node: Bundle) {
    return new qc.Bundle(map(node.sourceFiles, transformSourceFile), node.prepends);
  }
}
export function getExportNeedsImportStarHelper(node: ExportDeclaration): boolean {
  return !!qf.get.namespaceDeclarationNode(node);
}
export function getImportNeedsImportStarHelper(node: ImportDeclaration): boolean {
  if (!!qf.get.namespaceDeclarationNode(node)) return true;
  const bindings = node.importClause && node.importClause.namedBindings;
  if (!bindings) return false;
  if (!qc.is.kind(qc.NamedImports, bindings)) return false;
  let defaultRefCount = 0;
  for (const binding of bindings.elements) {
    if (isNamedDefaultReference(binding)) {
      defaultRefCount++;
    }
  }
  return (defaultRefCount > 0 && defaultRefCount !== bindings.elements.length) || (!!(bindings.elements.length - defaultRefCount) && isDefaultImport(node));
}
export function getImportNeedsImportDefaultHelper(node: ImportDeclaration): boolean {
  return (
    !getImportNeedsImportStarHelper(node) &&
    (isDefaultImport(node) || (!!node.importClause && qc.is.kind(qc.NamedImports, node.importClause.namedBindings!) && containsDefaultReference(node.importClause.namedBindings)))
  );
}
export function collectExternalModuleInfo(sourceFile: SourceFile, resolver: EmitResolver, compilerOptions: CompilerOptions): ExternalModuleInfo {
  const externalImports: (ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration)[] = [];
  const exportSpecifiers = new MultiMap<ExportSpecifier>();
  const exportedBindings: Identifier[][] = [];
  const uniqueExports = createMap<boolean>();
  let exportedNames: Identifier[] | undefined;
  let hasExportDefault = false;
  let exportEquals: ExportAssignment | undefined;
  let hasExportStarsToExportValues = false;
  let hasImportStar = false;
  let hasImportDefault = false;
  for (const node of sourceFile.statements) {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
        externalImports.push(<ImportDeclaration>node);
        if (!hasImportStar && getImportNeedsImportStarHelper(<ImportDeclaration>node)) {
          hasImportStar = true;
        }
        if (!hasImportDefault && getImportNeedsImportDefaultHelper(<ImportDeclaration>node)) {
          hasImportDefault = true;
        }
        break;
      case Syntax.ImportEqualsDeclaration:
        if ((<ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference) {
          externalImports.push(<ImportEqualsDeclaration>node);
        }
        break;
      case Syntax.ExportDeclaration:
        if ((<ExportDeclaration>node).moduleSpecifier) {
          if (!(<ExportDeclaration>node).exportClause) {
            externalImports.push(<ExportDeclaration>node);
            hasExportStarsToExportValues = true;
          } else {
            externalImports.push(<ExportDeclaration>node);
          }
        } else {
          for (const specifier of cast((<ExportDeclaration>node).exportClause, isNamedExports).elements) {
            if (!uniqueExports.get(idText(specifier.name))) {
              const name = specifier.propertyName || specifier.name;
              exportSpecifiers.add(idText(name), specifier);
              const decl = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
              if (decl) {
                multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(decl), specifier.name);
              }
              uniqueExports.set(idText(specifier.name), true);
              exportedNames = append(exportedNames, specifier.name);
            }
          }
        }
        break;
      case Syntax.ExportAssignment:
        if ((<ExportAssignment>node).isExportEquals && !exportEquals) {
          exportEquals = <ExportAssignment>node;
        }
        break;
      case Syntax.VariableStatement:
        if (qc.has.syntacticModifier(node, ModifierFlags.Export)) {
          for (const decl of (<VariableStatement>node).declarationList.declarations) {
            exportedNames = collectExportedVariableInfo(decl, uniqueExports, exportedNames);
          }
        }
        break;
      case Syntax.FunctionDeclaration:
        if (qc.has.syntacticModifier(node, ModifierFlags.Export)) {
          if (qc.has.syntacticModifier(node, ModifierFlags.Default)) {
            if (!hasExportDefault) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), getDeclarationName(<FunctionDeclaration>node));
              hasExportDefault = true;
            }
          } else {
            const name = (<FunctionDeclaration>node).name!;
            if (!uniqueExports.get(idText(name))) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), name);
              uniqueExports.set(idText(name), true);
              exportedNames = append(exportedNames, name);
            }
          }
        }
        break;
      case Syntax.ClassDeclaration:
        if (qc.has.syntacticModifier(node, ModifierFlags.Export)) {
          if (qc.has.syntacticModifier(node, ModifierFlags.Default)) {
            if (!hasExportDefault) {
              multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), getDeclarationName(<ClassDeclaration>node));
              hasExportDefault = true;
            }
          } else {
            const name = (<ClassDeclaration>node).name;
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
  const externalHelpersImportDeclaration = createExternalHelpersImportDeclarationIfNeeded(sourceFile, compilerOptions, hasExportStarsToExportValues, hasImportStar, hasImportDefault);
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
function collectExportedVariableInfo(decl: VariableDeclaration | BindingElement, uniqueExports: Map<boolean>, exportedNames: Identifier[] | undefined) {
  if (qc.is.kind(qc.BindingPattern, decl.name)) {
    for (const element of decl.name.elements) {
      if (!qc.is.kind(qc.OmittedExpression, element)) {
        exportedNames = collectExportedVariableInfo(element, uniqueExports, exportedNames);
      }
    }
  } else if (!qc.is.generatedIdentifier(decl.name)) {
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
export function isSimpleCopiableExpression(expression: Expression) {
  return StringLiteral.like(expression) || expression.kind === Syntax.NumericLiteral || syntax.is.keyword(expression.kind) || qc.is.kind(qc.Identifier, expression);
}
export function isSimpleInlineableExpression(expression: Expression) {
  return (!qc.is.kind(qc.Identifier, expression) && isSimpleCopiableExpression(expression)) || qc.is.wellKnownSymbolSyntactically(expression);
}
export function isCompoundAssignment(kind: BinaryOperator): kind is CompoundAssignmentOperator {
  return kind >= Syntax.FirstCompoundAssignment && kind <= Syntax.LastCompoundAssignment;
}
export function getNonAssignmentOperatorForCompoundAssignment(kind: CompoundAssignmentOperator): BitwiseOperatorOrHigher {
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
export function addPrologueDirectivesAndInitialSuperCall(ctor: ConstructorDeclaration, result: Statement[], visitor: Visitor): number {
  if (ctor.body) {
    const statements = ctor.body.statements;
    const index = addPrologue(result, statements, false, visitor);
    if (index === statements.length) return index;
    const superIndex = findIndex(statements, (s) => qc.is.kind(qc.ExpressionStatement, s) && qc.is.superCall(s.expression), index);
    if (superIndex > -1) {
      for (let i = index; i <= superIndex; i++) {
        result.push(visitNode(statements[i], visitor, isStatement));
      }
      return superIndex + 1;
    }
    return index;
  }
  return 0;
}
export function helperString(input: TemplateStringsArray, ...args: string[]) {
  return (uniqueName: EmitHelperUniqueNameCallback) => {
    let result = '';
    for (let i = 0; i < args.length; i++) {
      result += input[i];
      result += uniqueName(args[i]);
    }
    result += input[input.length - 1];
    return result;
  };
}
export function getProperties(node: ClassExpression | ClassDeclaration, requireIniter: boolean, isStatic: boolean): readonly PropertyDeclaration[] {
  return filter(node.members, (m) => isInitializedOrStaticProperty(m, requireIniter, isStatic)) as PropertyDeclaration[];
}
function isInitializedOrStaticProperty(member: ClassElement, requireIniter: boolean, isStatic: boolean) {
  return qc.is.kind(qc.PropertyDeclaration, member) && (!!member.initer || !requireIniter) && qc.has.staticModifier(member) === isStatic;
}
export function isInitializedProperty(member: ClassElement): member is PropertyDeclaration & { initer: Expression } {
  return member.kind === Syntax.PropertyDeclaration && (<PropertyDeclaration>member).initer !== undefined;
}
