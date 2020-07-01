namespace core {
  export function getOriginalNodeId(node: Node) {
    node = Node.get.originalOf(node);
    return node ? getNodeId(node) : 0;
  }

  export interface ExternalModuleInfo {
    externalImports: (ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration)[]; // imports of other external modules
    externalHelpersImportDeclaration: ImportDeclaration | undefined; // import of external helpers
    exportSpecifiers: Map<ExportSpecifier[]>; // export specifiers by name
    exportedBindings: Identifier[][]; // exported names of local declarations
    exportedNames: Identifier[] | undefined; // all exported names local to module
    exportEquals: ExportAssignment | undefined; // an export= declaration if one was present
    hasExportStarsToExportValues: boolean; // whether this module contains export*
  }

  function containsDefaultReference(node: NamedImportBindings | undefined) {
    if (!node) return false;
    if (!Node.is.kind(NamedImports, node)) return false;
    return some(node.elements, isNamedDefaultReference);
  }

  function isNamedDefaultReference(e: ImportSpecifier): boolean {
    return e.propertyName !== undefined && e.propertyName.escapedText === InternalSymbolName.Default;
  }

  export function chainBundle(transformSourceFile: (x: SourceFile) => SourceFile): (x: SourceFile | Bundle) => SourceFile | Bundle {
    return transformSourceFileOrBundle;

    function transformSourceFileOrBundle(node: SourceFile | Bundle) {
      return node.kind === Syntax.SourceFile ? transformSourceFile(node) : transformBundle(node);
    }

    function transformBundle(node: Bundle) {
      return createBundle(map(node.sourceFiles, transformSourceFile), node.prepends);
    }
  }

  export function getExportNeedsImportStarHelper(node: ExportDeclaration): boolean {
    return !!getNamespaceDeclarationNode(node);
  }

  export function getImportNeedsImportStarHelper(node: ImportDeclaration): boolean {
    if (!!getNamespaceDeclarationNode(node)) {
      return true;
    }
    const bindings = node.importClause && node.importClause.namedBindings;
    if (!bindings) {
      return false;
    }
    if (!Node.is.kind(NamedImports, bindings)) return false;
    let defaultRefCount = 0;
    for (const binding of bindings.elements) {
      if (isNamedDefaultReference(binding)) {
        defaultRefCount++;
      }
    }
    // Import star is required if there's default named refs mixed with non-default refs, or if theres non-default refs and it has a default import
    return (defaultRefCount > 0 && defaultRefCount !== bindings.elements.length) || (!!(bindings.elements.length - defaultRefCount) && isDefaultImport(node));
  }

  export function getImportNeedsImportDefaultHelper(node: ImportDeclaration): boolean {
    // Import default is needed if there's a default import or a default ref and no other refs (meaning an import star helper wasn't requested)
    return (
      !getImportNeedsImportStarHelper(node) &&
      (isDefaultImport(node) || (!!node.importClause && Node.is.kind(NamedImports, node.importClause.namedBindings!) && containsDefaultReference(node.importClause.namedBindings)))
    ); // TODO: GH#18217
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
          // import "mod"
          // import x from "mod"
          // import * as x from "mod"
          // import { x, y } from "mod"
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
            // import x = require("mod")
            externalImports.push(<ImportEqualsDeclaration>node);
          }

          break;

        case Syntax.ExportDeclaration:
          if ((<ExportDeclaration>node).moduleSpecifier) {
            if (!(<ExportDeclaration>node).exportClause) {
              // export * from "mod"
              externalImports.push(<ExportDeclaration>node);
              hasExportStarsToExportValues = true;
            } else {
              // export * as ns from "mod"
              // export { x, y } from "mod"
              externalImports.push(<ExportDeclaration>node);
            }
          } else {
            // export { x, y }
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
            // export = x
            exportEquals = <ExportAssignment>node;
          }
          break;

        case Syntax.VariableStatement:
          if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            for (const decl of (<VariableStatement>node).declarationList.declarations) {
              exportedNames = collectExportedVariableInfo(decl, uniqueExports, exportedNames);
            }
          }
          break;

        case Syntax.FunctionDeclaration:
          if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            if (hasSyntacticModifier(node, ModifierFlags.Default)) {
              // export default function() { }
              if (!hasExportDefault) {
                multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), getDeclarationName(<FunctionDeclaration>node));
                hasExportDefault = true;
              }
            } else {
              // export function x() { }
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
          if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            if (hasSyntacticModifier(node, ModifierFlags.Default)) {
              // export default class { }
              if (!hasExportDefault) {
                multiMapSparseArrayAdd(exportedBindings, getOriginalNodeId(node), getDeclarationName(<ClassDeclaration>node));
                hasExportDefault = true;
              }
            } else {
              // export class x { }
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
    if (Node.is.kind(BindingPattern, decl.name)) {
      for (const element of decl.name.elements) {
        if (!Node.is.kind(OmittedExpression, element)) {
          exportedNames = collectExportedVariableInfo(element, uniqueExports, exportedNames);
        }
      }
    } else if (!Node.is.generatedIdentifier(decl.name)) {
      const text = idText(decl.name);
      if (!uniqueExports.get(text)) {
        uniqueExports.set(text, true);
        exportedNames = append(exportedNames, decl.name);
      }
    }
    return exportedNames;
  }

  /** Use a sparse array as a multi-map. */
  function multiMapSparseArrayAdd<V>(map: V[][], key: number, value: V): V[] {
    let values = map[key];
    if (values) {
      values.push(value);
    } else {
      map[key] = values = [value];
    }
    return values;
  }

  /**
   * Used in the module transformer to check if an expression is reasonably without sideeffect,
   *  and thus better to copy into multiple places rather than to cache in a temporary variable
   *  - this is mostly subjective beyond the requirement that the expression not be sideeffecting
   */
  export function isSimpleCopiableExpression(expression: Expression) {
    return StringLiteral.like(expression) || expression.kind === Syntax.NumericLiteral || syntax.is.keyword(expression.kind) || Node.is.kind(Identifier, expression);
  }

  /**
   * A simple inlinable expression is an expression which can be copied into multiple locations
   * without risk of repeating any sideeffects and whose value could not possibly change between
   * any such locations
   */
  export function isSimpleInlineableExpression(expression: Expression) {
    return (!Node.is.kind(Identifier, expression) && isSimpleCopiableExpression(expression)) || isWellKnownSymbolSyntactically(expression);
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

  /**
   * Adds super call and preceding prologue directives into the list of statements.
   *
   * @param ctor The constructor node.
   * @param result The list of statements.
   * @param visitor The visitor to apply to each node added to the result array.
   * @returns index of the statement that follows super call
   */
  export function addPrologueDirectivesAndInitialSuperCall(ctor: ConstructorDeclaration, result: Statement[], visitor: Visitor): number {
    if (ctor.body) {
      const statements = ctor.body.statements;
      // add prologue directives to the list (if any)
      const index = addPrologue(result, statements, /*ensureUseStrict*/ false, visitor);
      if (index === statements.length) {
        // list contains nothing but prologue directives (or empty) - exit
        return index;
      }

      const superIndex = findIndex(statements, (s) => Node.is.kind(ExpressionStatement, s) && Node.is.superCall(s.expression), index);
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

  /**
   * @param input Template string input strings
   * @param args Names which need to be made file-level unique
   */
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

  /**
   * Gets all the static or all the instance property declarations of a class
   *
   * @param node The class node.
   * @param isStatic A value indicating whether to get properties from the static or instance side of the class.
   */
  export function getProperties(node: ClassExpression | ClassDeclaration, requireInitializer: boolean, isStatic: boolean): readonly PropertyDeclaration[] {
    return filter(node.members, (m) => isInitializedOrStaticProperty(m, requireInitializer, isStatic)) as PropertyDeclaration[];
  }

  /**
   * Is a class element either a static or an instance property declaration with an initializer?
   *
   * @param member The class element node.
   * @param isStatic A value indicating whether the member should be a static or instance member.
   */
  function isInitializedOrStaticProperty(member: ClassElement, requireInitializer: boolean, isStatic: boolean) {
    return Node.is.kind(PropertyDeclaration, member) && (!!member.initializer || !requireInitializer) && hasStaticModifier(member) === isStatic;
  }

  /**
   * Gets a value indicating whether a class element is either a static or an instance property declaration with an initializer.
   *
   * @param member The class element node.
   * @param isStatic A value indicating whether the member should be a static or instance member.
   */
  export function isInitializedProperty(member: ClassElement): member is PropertyDeclaration & { initializer: Expression } {
    return member.kind === Syntax.PropertyDeclaration && (<PropertyDeclaration>member).initializer !== undefined;
  }
}