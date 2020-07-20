import * as qb from './base';
import * as qc from './core3';
import * as qy from './syntax';
import { ModifierFlags, Syntax } from './syntax';
function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
  if (e) {
    ps.push(new qc.PropertyAssignment(p, e));
    return true;
  }
  return false;
}
export const resolvingEmptyArray: never[] = [] as never[];
export const externalHelpersModuleNameText = 'tslib';
export const defaultMaximumTruncationLength = 160;
export const noTruncationMaximumTruncationLength = 1_000_000;
export function projectReferenceIsEqualTo(oldRef: ProjectReference, newRef: ProjectReference) {
  return oldRef.path === newRef.path && !oldRef.prepend === !newRef.prepend && !oldRef.circular === !newRef.circular;
}
export function moduleResolutionIsEqualTo(oldResolution: ResolvedModuleFull, newResolution: ResolvedModuleFull): boolean {
  return (
    oldResolution.isExternalLibraryImport === newResolution.isExternalLibraryImport &&
    oldResolution.extension === newResolution.extension &&
    oldResolution.resolvedFileName === newResolution.resolvedFileName &&
    oldResolution.originalPath === newResolution.originalPath &&
    packageIdIsEqual(oldResolution.packageId, newResolution.packageId)
  );
}
function packageIdIsEqual(a: PackageId | undefined, b: PackageId | undefined): boolean {
  return a === b || (!!a && !!b && a.name === b.name && a.subModuleName === b.subModuleName && a.version === b.version);
}
export function packageIdToString({ name, subModuleName, version }: PackageId): string {
  const fullName = subModuleName ? `${name}/${subModuleName}` : name;
  return `${fullName}@${version}`;
}
export function typeDirectiveIsEqualTo(oldResolution: ResolvedTypeReferenceDirective, newResolution: ResolvedTypeReferenceDirective): boolean {
  return oldResolution.resolvedFileName === newResolution.resolvedFileName && oldResolution.primary === newResolution.primary;
}
export function declarationNameToString(name: DeclarationName | QualifiedName | undefined) {
  return !name || qc.get.fullWidth(name) === 0 ? '(Missing)' : qc.get.textOf(name);
}
export function getNameFromIndexInfo(info: IndexInfo): string | undefined {
  return info.declaration ? declarationNameToString(info.declaration.parameters[0].name) : undefined;
}
export function isComputedNonLiteralName(name: PropertyName): boolean {
  return name.kind === Syntax.ComputedPropertyName && !StringLiteral.orNumericLiteralLike(name.expression);
}
export function entityNameToString(name: EntityNameOrEntityNameExpression | JsxTagNameExpression | PrivateIdentifier): string {
  switch (name.kind) {
    case Syntax.ThisKeyword:
      return 'this';
    case Syntax.PrivateIdentifier:
    case Syntax.Identifier:
      return qc.get.fullWidth(name) === 0 ? idText(name) : qc.get.textOf(name);
    case Syntax.QualifiedName:
      return entityNameToString(name.left) + '.' + entityNameToString(name.right);
    case Syntax.PropertyAccessExpression:
      if (qc.is.kind(qc.Identifier, name.name) || qc.is.kind(qc.PrivateIdentifier, name.name)) return entityNameToString(name.expression) + '.' + entityNameToString(name.name);
      return Debug.assertNever(name.name);
    default:
      return Debug.assertNever(name);
  }
}
export function getRestParameterElementType(node: TypeNode | undefined) {
  if (node && node.kind === Syntax.ArrayType) return (<ArrayTypeNode>node).elementType;
  else if (node && node.kind === Syntax.TypeReference) return singleOrUndefined((<TypeReferenceNode>node).typeArguments);
  else {
    return;
  }
}
export function getPropertyAssignment(objectLiteral: ObjectLiteralExpression, key: string, key2?: string): readonly PropertyAssignment[] {
  return objectLiteral.properties.filter((property): property is PropertyAssignment => {
    if (property.kind === Syntax.PropertyAssignment) {
      const propName = qc.get.textOfPropertyName(property.name);
      return key === propName || (!!key2 && key2 === propName);
    }
    return false;
  });
}
export function getTsConfigObjectLiteralExpression(tsConfigSourceFile: TsConfigSourceFile | undefined): ObjectLiteralExpression | undefined {
  if (tsConfigSourceFile && tsConfigSourceFile.statements.length) {
    const expression = tsConfigSourceFile.statements[0].expression;
    return tryCast(expression, isObjectLiteralExpression);
  }
}
export function getTsConfigPropArrayElementValue(tsConfigSourceFile: TsConfigSourceFile | undefined, propKey: string, elementValue: string): StringLiteral | undefined {
  return firstDefined(getTsConfigPropArray(tsConfigSourceFile, propKey), (property) =>
    isArrayLiteralExpression(property.initer)
      ? find(property.initer.elements, (element): element is StringLiteral => qc.is.kind(qc.StringLiteral, element) && element.text === elementValue)
      : undefined
  );
}
export function getTsConfigPropArray(tsConfigSourceFile: TsConfigSourceFile | undefined, propKey: string): readonly PropertyAssignment[] {
  const jsonObjectLiteral = getTsConfigObjectLiteralExpression(tsConfigSourceFile);
  return jsonObjectLiteral ? getPropertyAssignment(jsonObjectLiteral, propKey) : emptyArray;
}
export function getEntityNameFromTypeNode(node: TypeNode): EntityNameOrEntityNameExpression | undefined {
  switch (node.kind) {
    case Syntax.TypeReference:
      return (<TypeReferenceNode>node).typeName;
    case Syntax.ExpressionWithTypeArguments:
      return qc.is.entityNameExpression((<ExpressionWithTypeArguments>node).expression) ? <EntityNameExpression>(<ExpressionWithTypeArguments>node).expression : undefined;
    case Syntax.Identifier:
    case Syntax.QualifiedName:
      return <EntityName>(<Node>node);
  }
  return;
}
export function getInvokedExpression(node: CallLikeExpression): Expression {
  switch (node.kind) {
    case Syntax.TaggedTemplateExpression:
      return node.tag;
    case Syntax.JsxOpeningElement:
    case Syntax.JsxSelfClosingElement:
      return node.tagName;
    default:
      return node.expression;
  }
}
export function nodeCanBeDecorated(node: ClassDeclaration): true;
export function nodeCanBeDecorated(node: ClassElement, parent: Node): boolean;
export function nodeCanBeDecorated(node: Node, parent: Node, grandparent: Node): boolean;
export function nodeCanBeDecorated(node: Node, parent?: Node, grandparent?: Node): boolean {
  if (qc.is.namedDeclaration(node) && qc.is.kind(qc.PrivateIdentifier, node.name)) return false;
  switch (node.kind) {
    case Syntax.ClassDeclaration:
      return true;
    case Syntax.PropertyDeclaration:
      return parent!.kind === Syntax.ClassDeclaration;
    case Syntax.GetAccessor:
    case Syntax.SetAccessor:
    case Syntax.MethodDeclaration:
      return (<FunctionLikeDeclaration>node).body !== undefined && parent!.kind === Syntax.ClassDeclaration;
    case Syntax.Parameter:
      return (
        (<FunctionLikeDeclaration>parent).body !== undefined &&
        (parent!.kind === Syntax.Constructor || parent!.kind === Syntax.MethodDeclaration || parent!.kind === Syntax.SetAccessor) &&
        grandparent!.kind === Syntax.ClassDeclaration
      );
  }
  return false;
}
export function nodeIsDecorated(node: ClassDeclaration): boolean;
export function nodeIsDecorated(node: ClassElement, parent: Node): boolean;
export function nodeIsDecorated(node: Node, parent: Node, grandparent: Node): boolean;
export function nodeIsDecorated(node: Node, parent?: Node, grandparent?: Node): boolean {
  return node.decorators !== undefined && nodeCanBeDecorated(node, parent!, grandparent!);
}
export function nodeOrChildIsDecorated(node: ClassDeclaration): boolean;
export function nodeOrChildIsDecorated(node: ClassElement, parent: Node): boolean;
export function nodeOrChildIsDecorated(node: Node, parent: Node, grandparent: Node): boolean;
export function nodeOrChildIsDecorated(node: Node, parent?: Node, grandparent?: Node): boolean {
  return nodeIsDecorated(node, parent!, grandparent!) || childIsDecorated(node, parent!);
}
export function childIsDecorated(node: ClassDeclaration): boolean;
export function childIsDecorated(node: Node, parent: Node): boolean;
export function childIsDecorated(node: Node, parent?: Node): boolean {
  switch (node.kind) {
    case Syntax.ClassDeclaration:
      return some((<ClassDeclaration>node).members, (m) => nodeOrChildIsDecorated(m, node, parent!));
    case Syntax.MethodDeclaration:
    case Syntax.SetAccessor:
      return some((<FunctionLikeDeclaration>node).parameters, (p) => nodeIsDecorated(p, node, parent!));
    default:
      return false;
  }
}
export function isDocIndexSignature(node: TypeReferenceNode | ExpressionWithTypeArguments) {
  return (
    qc.is.kind(qc.TypeReferenceNode, node) &&
    qc.is.kind(qc.Identifier, node.typeName) &&
    node.typeName.escapedText === 'Object' &&
    node.typeArguments &&
    node.typeArguments.length === 2 &&
    (node.typeArguments[0].kind === Syntax.StringKeyword || node.typeArguments[0].kind === Syntax.NumberKeyword)
  );
}
export function getEffectiveIniter(node: HasExpressionIniter) {
  if (
    qc.is.inJSFile(node) &&
    node.initer &&
    qc.is.kind(qc.BinaryExpression, node.initer) &&
    (node.initer.operatorToken.kind === Syntax.Bar2Token || node.initer.operatorToken.kind === Syntax.Question2Token) &&
    node.name &&
    qc.is.entityNameExpression(node.name) &&
    isSameEntityName(node.name, node.initer.left)
  ) {
    return node.initer.right;
  }
  return node.initer;
}
export function getDeclaredExpandoIniter(node: HasExpressionIniter) {
  const init = getEffectiveIniter(node);
  return init && getExpandoIniter(init, qc.is.prototypeAccess(node.name));
}
function hasExpandoValueProperty(node: ObjectLiteralExpression, isPrototypeAssignment: boolean) {
  return forEach(
    node.properties,
    (p) => qc.is.kind(qc.PropertyAssignment, p) && qc.is.kind(qc.Identifier, p.name) && p.name.escapedText === 'value' && p.initer && getExpandoIniter(p.initer, isPrototypeAssignment)
  );
}
export function getAssignmentDeclarationKind(expr: BinaryExpression | CallExpression): AssignmentDeclarationKind {
  const special = getAssignmentDeclarationKindWorker(expr);
  return special === AssignmentDeclarationKind.Property || qc.is.inJSFile(expr) ? special : AssignmentDeclarationKind.None;
}
export function isBindableObjectDefinePropertyCall(expr: CallExpression): expr is BindableObjectDefinePropertyCall {
  return (
    length(expr.arguments) === 3 &&
    qc.is.kind(qc.PropertyAccessExpression, expr.expression) &&
    qc.is.kind(qc.Identifier, expr.expression.expression) &&
    idText(expr.expression.expression) === 'Object' &&
    idText(expr.expression.name) === 'defineProperty' &&
    StringLiteral.orNumericLiteralLike(expr.arguments[1]) &&
    qc.is.bindableStaticNameExpression(expr.arguments[0], true)
  );
}
export function getNameOrArgument(expr: PropertyAccessExpression | LiteralLikeElementAccessExpression) {
  if (qc.is.kind(qc.PropertyAccessExpression, expr)) return expr.name;
  return expr.argumentExpression;
}
function getAssignmentDeclarationKindWorker(expr: BinaryExpression | CallExpression): AssignmentDeclarationKind {
  if (qc.is.kind(qc.CallExpression, expr)) {
    if (!isBindableObjectDefinePropertyCall(expr)) return AssignmentDeclarationKind.None;
    const entityName = expr.arguments[0];
    if (qc.is.exportsIdentifier(entityName) || qc.is.moduleExportsAccessExpression(entityName)) return AssignmentDeclarationKind.ObjectDefinePropertyExports;
    if (qc.is.bindableStaticAccessExpression(entityName) && getElementOrPropertyAccessName(entityName) === 'prototype') return AssignmentDeclarationKind.ObjectDefinePrototypeProperty;
    return AssignmentDeclarationKind.ObjectDefinePropertyValue;
  }
  if (expr.operatorToken.kind !== Syntax.EqualsToken || !qc.is.accessExpression(expr.left)) return AssignmentDeclarationKind.None;
  if (
    qc.is.bindableStaticNameExpression(expr.left.expression, true) &&
    getElementOrPropertyAccessName(expr.left) === 'prototype' &&
    qc.is.kind(qc.ObjectLiteralExpression, getIniterOfBinaryExpression(expr))
  ) {
    return AssignmentDeclarationKind.Prototype;
  }
  return getAssignmentDeclarationPropertyAccessKind(expr.left);
}
export function getElementOrPropertyAccessArgumentExpressionOrName(node: AccessExpression): Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ElementAccessExpression | undefined {
  if (qc.is.kind(qc.PropertyAccessExpression, node)) return node.name;
  const arg = skipParentheses(node.argumentExpression);
  if (qc.is.kind(qc.NumericLiteral, arg) || StringLiteral.like(arg)) return arg;
  return node;
}
export function getElementOrPropertyAccessName(node: LiteralLikeElementAccessExpression | PropertyAccessExpression): __String;
export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined;
export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined {
  const name = getElementOrPropertyAccessArgumentExpressionOrName(node);
  if (name) {
    if (qc.is.kind(qc.Identifier, name)) return name.escapedText;
    if (StringLiteral.like(name) || qc.is.kind(qc.NumericLiteral, name)) return qy.get.escUnderscores(name.text);
  }
  if (qc.is.kind(qc.ElementAccessExpression, node) && qc.is.wellKnownSymbolSyntactically(node.argumentExpression))
    return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>node.argumentExpression).name));
  return;
}
export function getAssignmentDeclarationPropertyAccessKind(lhs: AccessExpression): AssignmentDeclarationKind {
  if (lhs.expression.kind === Syntax.ThisKeyword) return AssignmentDeclarationKind.ThisProperty;
  else if (qc.is.moduleExportsAccessExpression(lhs)) return AssignmentDeclarationKind.ModuleExports;
  else if (qc.is.bindableStaticNameExpression(lhs.expression, true)) {
    if (qc.is.prototypeAccess(lhs.expression)) return AssignmentDeclarationKind.PrototypeProperty;
    let nextToLast = lhs;
    while (!qc.is.kind(qc.Identifier, nextToLast.expression)) {
      nextToLast = nextToLast.expression as Exclude<BindableStaticNameExpression, Identifier>;
    }
    const id = nextToLast.expression;
    if ((id.escapedText === 'exports' || (id.escapedText === 'module' && getElementOrPropertyAccessName(nextToLast) === 'exports')) && qc.is.bindableStaticAccessExpression(lhs))
      return AssignmentDeclarationKind.ExportsProperty;
    if (qc.is.bindableStaticNameExpression(lhs, true) || (qc.is.kind(qc.ElementAccessExpression, lhs) && isDynamicName(lhs))) return AssignmentDeclarationKind.Property;
  }
  return AssignmentDeclarationKind.None;
}
export function getIniterOfBinaryExpression(expr: BinaryExpression) {
  while (qc.is.kind(qc.BinaryExpression, expr.right)) {
    expr = expr.right;
  }
  return expr.right;
}
export function isSpecialPropertyDeclaration(expr: PropertyAccessExpression | ElementAccessExpression): expr is PropertyAccessExpression | LiteralLikeElementAccessExpression {
  return (
    qc.is.inJSFile(expr) &&
    expr.parent &&
    expr.parent.kind === Syntax.ExpressionStatement &&
    (!qc.is.kind(qc.ElementAccessExpression, expr) || qc.is.literalLikeElementAccess(expr)) &&
    !!qc.getDoc.typeTag(expr.parent)
  );
}
export function importFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport {
  return tryGetImportFromModuleSpecifier(node) || Debug.failBadSyntax(node.parent);
}
export function tryGetImportFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport | undefined {
  switch (node.parent.kind) {
    case Syntax.ImportDeclaration:
    case Syntax.ExportDeclaration:
      return node.parent as AnyValidImportOrReExport;
    case Syntax.ExternalModuleReference:
      return (node.parent as ExternalModuleReference).parent as AnyValidImportOrReExport;
    case Syntax.CallExpression:
      return qc.is.importCall(node.parent) || isRequireCall(node.parent, false) ? (node.parent as RequireOrImportCall) : undefined;
    case Syntax.LiteralType:
      assert(qc.is.kind(qc.StringLiteral, node));
      return tryCast(node.parent.parent, ImportTypeNode.kind) as ValidImportTypeNode | undefined;
    default:
      return;
  }
}
export function getExternalModuleName(node: AnyImportOrReExport | ImportTypeNode): Expression | undefined {
  switch (node.kind) {
    case Syntax.ImportDeclaration:
    case Syntax.ExportDeclaration:
      return node.moduleSpecifier;
    case Syntax.ImportEqualsDeclaration:
      return node.moduleReference.kind === Syntax.ExternalModuleReference ? node.moduleReference.expression : undefined;
    case Syntax.ImportType:
      return qc.is.literalImportTypeNode(node) ? node.argument.literal : undefined;
    default:
      return Debug.assertNever(node);
  }
}
export function getNamespaceDeclarationNode(node: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration): ImportEqualsDeclaration | NamespaceImport | NamespaceExport | undefined {
  switch (node.kind) {
    case Syntax.ImportDeclaration:
      return node.importClause && tryCast(node.importClause.namedBindings, isNamespaceImport);
    case Syntax.ImportEqualsDeclaration:
      return node;
    case Syntax.ExportDeclaration:
      return node.exportClause && tryCast(node.exportClause, isNamespaceExport);
    default:
      return Debug.assertNever(node);
  }
}
export function isDefaultImport(node: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration): boolean {
  return node.kind === Syntax.ImportDeclaration && !!node.importClause && !!node.importClause.name;
}
export function getParameterSymbolFromDoc(node: DocParameterTag): Symbol | undefined {
  if (node.symbol) return node.symbol;
  if (!qc.is.kind(qc.Identifier, node.name)) {
    return;
  }
  const name = node.name.escapedText;
  const decl = qc.get.hostSignatureFromDoc(node);
  if (!decl) {
    return;
  }
  const parameter = find(decl.parameters, (p) => p.name.kind === Syntax.Identifier && p.name.escapedText === name);
  return parameter && parameter.symbol;
}
export function getTypeParameterFromDoc(node: TypeParameterDeclaration & { parent: DocTemplateTag }): TypeParameterDeclaration | undefined {
  const name = node.name.escapedText;
  const { typeParameters } = node.parent.parent.parent as SignatureDeclaration | InterfaceDeclaration | ClassDeclaration;
  return typeParameters && find(typeParameters, (p) => p.name.escapedText === name);
}
export function getAliasDeclarationFromName(node: EntityName): Declaration | undefined {
  switch (node.parent.kind) {
    case Syntax.ImportClause:
    case Syntax.ImportSpecifier:
    case Syntax.NamespaceImport:
    case Syntax.ExportSpecifier:
    case Syntax.ExportAssignment:
    case Syntax.ImportEqualsDeclaration:
      return node.parent as Declaration;
    case Syntax.QualifiedName:
      do {
        node = node.parent as QualifiedName;
      } while (node.parent.kind === Syntax.QualifiedName);
      return getAliasDeclarationFromName(node);
  }
}
export function getExportAssignmentExpression(node: ExportAssignment | BinaryExpression): Expression {
  return qc.is.kind(qc.ExportAssignment, node) ? node.expression : node.right;
}
export function getPropertyAssignmentAliasLikeExpression(node: PropertyAssignment | ShorthandPropertyAssignment | PropertyAccessExpression): Expression {
  return node.kind === Syntax.ShorthandPropertyAssignment ? node.name : node.kind === Syntax.PropertyAssignment ? node.initer : (node.parent as BinaryExpression).right;
}
export function getEffectiveBaseTypeNode(node: ClassLikeDeclaration | InterfaceDeclaration) {
  const baseType = getClassExtendsHeritageElement(node);
  if (baseType && qc.is.inJSFile(node)) {
    const tag = qc.getDoc.augmentsTag(node);
    if (tag) return tag.class;
  }
  return baseType;
}
export function getClassExtendsHeritageElement(node: ClassLikeDeclaration | InterfaceDeclaration) {
  const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ExtendsKeyword);
  return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
}
export function getEffectiveImplementsTypeNodes(node: ClassLikeDeclaration): undefined | readonly ExpressionWithTypeArguments[] {
  if (qc.is.inJSFile(node)) return qc.getDoc.implementsTags(node).map((n) => n.class);
  else {
    const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ImplementsKeyword);
    return heritageClause?.types;
  }
}
export function getInterfaceBaseTypeNodes(node: InterfaceDeclaration) {
  const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ExtendsKeyword);
  return heritageClause ? heritageClause.types : undefined;
}
export function getHeritageClause(clauses: Nodes<HeritageClause> | undefined, kind: Syntax) {
  if (clauses) {
    for (const clause of clauses) {
      if (clause.token === kind) return clause;
    }
  }
  return;
}
export function isDynamicName(name: DeclarationName): boolean {
  if (!(name.kind === Syntax.ComputedPropertyName || name.kind === Syntax.ElementAccessExpression)) return false;
  const expr = qc.is.kind(qc.ElementAccessExpression, name) ? name.argumentExpression : name.expression;
  return !StringLiteral.orNumericLiteralLike(expr) && !qc.is.signedNumericLiteral(expr) && !qc.is.wellKnownSymbolSyntactically(expr);
}
export function getPropertyNameForPropertyNameNode(name: PropertyName): __String | undefined {
  switch (name.kind) {
    case Syntax.Identifier:
    case Syntax.PrivateIdentifier:
      return name.escapedText;
    case Syntax.StringLiteral:
    case Syntax.NumericLiteral:
      return qy.get.escUnderscores(name.text);
    case Syntax.ComputedPropertyName:
      const nameExpression = name.expression;
      if (qc.is.wellKnownSymbolSyntactically(nameExpression)) return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>nameExpression).name));
      else if (StringLiteral.orNumericLiteralLike(nameExpression)) return qy.get.escUnderscores(nameExpression.text);
      else if (qc.is.signedNumericLiteral(nameExpression)) {
        if (nameExpression.operator === Syntax.MinusToken) return (Token.toString(nameExpression.operator) + nameExpression.operand.text) as __String;
        return nameExpression.operand.text as __String;
      }
      return;
    default:
      return Debug.assertNever(name);
  }
}
export function getTextOfIdentifierOrLiteral(node: PropertyNameLiteral): string {
  return qc.is.identifierOrPrivateIdentifier(node) ? idText(node) : node.text;
}
export function getEscapedTextOfIdentifierOrLiteral(node: PropertyNameLiteral): __String {
  return qc.is.identifierOrPrivateIdentifier(node) ? node.escapedText : qy.get.escUnderscores(node.text);
}
export function isParameterDeclaration(node: VariableLikeDeclaration) {
  const root = qc.get.rootDeclaration(node);
  return root.kind === Syntax.Parameter;
}
export function hostUsesCaseSensitiveFileNames(host: { useCaseSensitiveFileNames?(): boolean }): boolean {
  return host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : false;
}
export function hostGetCanonicalFileName(host: { useCaseSensitiveFileNames?(): boolean }): GetCanonicalFileName {
  return createGetCanonicalFileName(hostUsesCaseSensitiveFileNames(host));
}
export function getExternalModuleNameFromDeclaration(
  host: ResolveModuleNameResolutionHost,
  resolver: EmitResolver,
  declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | ImportTypeNode
): string | undefined {
  const file = resolver.getExternalModuleFileFromDeclaration(declaration);
  if (!file || file.isDeclarationFile) {
    return;
  }
  return getResolvedExternalModuleName(host, file);
}
export function getOwnEmitOutputFilePath(fileName: string, host: EmitHost, extension: string) {
  const compilerOptions = host.getCompilerOptions();
  let emitOutputFilePathWithoutExtension: string;
  if (compilerOptions.outDir) {
    emitOutputFilePathWithoutExtension = removeFileExtension(getSourceFilePathInNewDir(fileName, host, compilerOptions.outDir));
  } else {
    emitOutputFilePathWithoutExtension = removeFileExtension(fileName);
  }
  return emitOutputFilePathWithoutExtension + extension;
}
export function getDeclarationEmitOutputFilePath(fileName: string, host: EmitHost) {
  return getDeclarationEmitOutputFilePathWorker(fileName, host.getCompilerOptions(), host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getDeclarationEmitOutputFilePathWorker(
  fileName: string,
  options: CompilerOptions,
  currentDirectory: string,
  commonSourceDirectory: string,
  getCanonicalFileName: GetCanonicalFileName
): string {
  const outputDir = options.declarationDir || options.outDir;
  const path = outputDir ? getSourceFilePathInNewDirWorker(fileName, outputDir, currentDirectory, commonSourceDirectory, getCanonicalFileName) : fileName;
  return removeFileExtension(path) + Extension.Dts;
}
export interface EmitFileNames {
  jsFilePath?: string | undefined;
  sourceMapFilePath?: string | undefined;
  declarationFilePath?: string | undefined;
  declarationMapPath?: string | undefined;
  buildInfoPath?: string | undefined;
}
export function getSourceFilePathInNewDir(fileName: string, host: EmitHost, newDirPath: string): string {
  return getSourceFilePathInNewDirWorker(fileName, newDirPath, host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getFirstConstructorWithBody(node: ClassLikeDeclaration): (ConstructorDeclaration & { body: FunctionBody }) | undefined {
  return find(node.members, (member): member is ConstructorDeclaration & { body: FunctionBody } => qc.is.kind(qc.ConstructorDeclaration, member) && qc.is.present(member.body));
}
export function getSetAccessorValueParameter(accessor: SetAccessorDeclaration): ParameterDeclaration | undefined {
  if (accessor && accessor.parameters.length > 0) {
    const hasThis = accessor.parameters.length === 2 && parameterIsThisKeyword(accessor.parameters[0]);
    return accessor.parameters[hasThis ? 1 : 0];
  }
}
export function getSetAccessorTypeAnnotationNode(accessor: SetAccessorDeclaration): TypeNode | undefined {
  const parameter = getSetAccessorValueParameter(accessor);
  return parameter && parameter.type;
}
export function getThisNodeKind(ParameterDeclaration, signature: SignatureDeclaration | DocSignature): ParameterDeclaration | undefined {
  if (signature.parameters.length && !qc.is.kind(qc.DocSignature, signature)) {
    const thisParameter = signature.parameters[0];
    if (parameterIsThisKeyword(thisParameter)) return thisParameter;
  }
}
export function parameterIsThisKeyword(parameter: ParameterDeclaration): boolean {
  return isThisNodeKind(Identifier, parameter.name);
}
export function getAllAccessorDeclarations(declarations: readonly Declaration[], accessor: AccessorDeclaration): AllAccessorDeclarations {
  let firstAccessor!: AccessorDeclaration;
  let secondAccessor!: AccessorDeclaration;
  let getAccessor!: GetAccessorDeclaration;
  let setAccessor!: SetAccessorDeclaration;
  if (hasDynamicName(accessor)) {
    firstAccessor = accessor;
    if (accessor.kind === Syntax.GetAccessor) {
      getAccessor = accessor;
    } else if (accessor.kind === Syntax.SetAccessor) {
      setAccessor = accessor;
    } else {
      fail('Accessor has wrong kind');
    }
  } else {
    forEach(declarations, (member) => {
      if (qc.is.accessor(member) && qc.has.syntacticModifier(member, ModifierFlags.Static) === qc.has.syntacticModifier(accessor, ModifierFlags.Static)) {
        const memberName = getPropertyNameForPropertyNameNode(member.name);
        const accessorName = getPropertyNameForPropertyNameNode(accessor.name);
        if (memberName === accessorName) {
          if (!firstAccessor) {
            firstAccessor = member;
          } else if (!secondAccessor) {
            secondAccessor = member;
          }
          if (member.kind === Syntax.GetAccessor && !getAccessor) {
            getAccessor = member;
          }
          if (member.kind === Syntax.SetAccessor && !setAccessor) {
            setAccessor = member;
          }
        }
      }
    });
  }
  return {
    firstAccessor,
    secondAccessor,
    getAccessor,
    setAccessor,
  };
}
export function getEffectiveReturnTypeNode(node: SignatureDeclaration | DocSignature): TypeNode | undefined {
  return qc.is.kind(qc.DocSignature, node) ? node.type && node.type.typeExpression && node.type.typeExpression.type : node.type || (qc.is.inJSFile(node) ? qc.getDoc.returnType(node) : undefined);
}
function isNonTypeAliasTemplate(tag: DocTag): tag is DocTemplateTag {
  return qc.is.kind(qc.DocTemplateTag, tag) && !(tag.parent.kind === Syntax.DocComment && tag.parent.tags!.some(isDocTypeAlias));
}
export function getEffectiveSetAccessorTypeAnnotationNode(node: SetAccessorDeclaration): TypeNode | undefined {
  const parameter = getSetAccessorValueParameter(node);
  return parameter && qc.get.effectiveTypeAnnotationNode(parameter);
}
export function emitNewLineBeforeLeadingComments(lineMap: readonly number[], writer: EmitTextWriter, node: TextRange, leadingComments: readonly CommentRange[] | undefined) {
  emitNewLineBeforeLeadingCommentsOfPosition(lineMap, writer, node.pos, leadingComments);
}
export function emitNewLineBeforeLeadingCommentsOfPosition(lineMap: readonly number[], writer: EmitTextWriter, pos: number, leadingComments: readonly CommentRange[] | undefined) {
  if (
    leadingComments &&
    leadingComments.length &&
    pos !== leadingComments[0].pos &&
    getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, leadingComments[0].pos)
  ) {
    writer.writeLine();
  }
}
export function emitNewLineBeforeLeadingCommentOfPosition(lineMap: readonly number[], writer: EmitTextWriter, pos: number, commentPos: number) {
  if (pos !== commentPos && getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, commentPos)) {
    writer.writeLine();
  }
}
export function getFirstIdentifier(node: EntityNameOrEntityNameExpression): Identifier {
  switch (node.kind) {
    case Syntax.Identifier:
      return node;
    case Syntax.QualifiedName:
      do {
        node = node.left;
      } while (node.kind !== Syntax.Identifier);
      return node;
    case Syntax.PropertyAccessExpression:
      do {
        node = node.expression;
      } while (node.kind !== Syntax.Identifier);
      return node;
  }
}
export function tryExtractTSExtension(fileName: string): string | undefined {
  return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
}
export function readJson(path: string, host: { readFile(fileName: string): string | undefined }): object {
  try {
    const jsonText = host.readFile(path);
    if (!jsonText) return {};
    const result = parseConfigFileTextToJson(path, jsonText);
    if (result.error) return {};
    return result.config;
  } catch (e) {
    return {};
  }
}
export function directoryProbablyExists(directoryName: string, host: { directoryExists?: (directoryName: string) => boolean }): boolean {
  return !host.directoryExists || host.directoryExists(directoryName);
}
const carriageReturnLineFeed = '\r\n';
const lineFeed = '\n';
export function getNewLineCharacter(options: CompilerOptions | PrinterOptions, getNewLine?: () => string): string {
  switch (options.newLine) {
    case NewLineKind.CarriageReturnLineFeed:
      return carriageReturnLineFeed;
    case NewLineKind.LineFeed:
      return lineFeed;
  }
  return getNewLine ? getNewLine() : sys ? sys.newLine : carriageReturnLineFeed;
}
export function getInitializedVariables(node: VariableDeclarationList) {
  return filter(node.declarations, isInitializedVariable);
}
function isInitializedVariable(node: VariableDeclaration) {
  return node.initer !== undefined;
}
export function isWatchSet(options: CompilerOptions) {
  return options.watch && options.hasOwnProperty('watch');
}
export function closeFileWatcher(watcher: FileWatcher) {
  watcher.close();
}
export function isAbstractConstructorType(type: Type): boolean {
  return !!(getObjectFlags(type) & ObjectFlags.Anonymous) && !!type.symbol && isAbstractConstructorSymbol(type.symbol);
}
export function getObjectFlags(type: Type): ObjectFlags {
  return type.flags & TypeFlags.ObjectFlagsType ? (<ObjectFlagsType>type).objectFlags : 0;
}
export function typeHasCallOrConstructSignatures(type: Type, checker: TypeChecker) {
  return checker.getSignaturesOfType(type, SignatureKind.Call).length !== 0 || checker.getSignaturesOfType(type, SignatureKind.Construct).length !== 0;
}
export function forSomeAncestorDirectory(directory: string, cb: (directory: string) => boolean): boolean {
  return !!forEachAncestorDirectory(directory, (d) => (cb(d) ? true : undefined));
}
export function showModuleSpecifier({ moduleSpecifier }: ImportDeclaration): string {
  return qc.is.kind(qc.StringLiteral, moduleSpecifier) ? moduleSpecifier.text : qc.get.textOf(moduleSpecifier);
}
export function getNameOfAccessExpression(node: AccessExpression) {
  if (node.kind === Syntax.PropertyAccessExpression) return node.name;
  assert(node.kind === Syntax.ElementAccessExpression);
  return node.argumentExpression;
}
export function isBundleFileTextLike(section: BundleFileSection): section is BundleFileTextLike {
  switch (section.kind) {
    case BundleFileSectionKind.Text:
    case BundleFileSectionKind.Internal:
      return true;
    default:
      return false;
  }
}
