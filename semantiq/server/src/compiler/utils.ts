import * as qb from './base';
import * as qc from './core3';
import * as syntax from './syntax';
import { Syntax } from './syntax';
function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
  return new qc.CallExpression(new qc.PropertyAccessExpression(object, asName(methodName)), undefined, argumentsList);
}
function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
  return createMethodCall(new Identifier(globalObjectName), methodName, argumentsList);
}
export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
  return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
}
function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
  if (e) {
    ps.push(new qc.PropertyAssignment(p, e));
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
  return new qc.ObjectLiteralExpression(ps, !singleLine);
}
export const resolvingEmptyArray: never[] = [] as never[];
export const emptyMap = new QMap<never>() as QReadonlyMap<never> & ReadonlyPragmaMap;
export const emptyUnderscoreEscapedMap: ReadonlyUnderscoreEscapedMap<never> = emptyMap as ReadonlyUnderscoreEscapedMap<never>;
export const externalHelpersModuleNameText = 'tslib';
export const defaultMaximumTruncationLength = 160;
export const noTruncationMaximumTruncationLength = 1_000_000;
export function createUnderscoreEscapedMap<T>(): UnderscoreEscapedMap<T> {
  return new QMap<T>() as UnderscoreEscapedMap<T>;
}
export function hasEntries(map: ReadonlyUnderscoreEscapedMap<any> | undefined): map is ReadonlyUnderscoreEscapedMap<any> {
  return !!map && !!map.size;
}
const stringWriter = createSingleLineStringWriter();
function createSingleLineStringWriter(): EmitTextWriter {
  let str = '';
  const writeText: (text: string) => void = (text) => (str += text);
  return {
    getText: () => str,
    write: writeText,
    rawWrite: writeText,
    writeKeyword: writeText,
    writeOperator: writeText,
    writePunctuation: writeText,
    writeSpace: writeText,
    writeStringLiteral: writeText,
    writeLiteral: writeText,
    writeParameter: writeText,
    writeProperty: writeText,
    writeSymbol: (s, _) => writeText(s),
    writeTrailingSemicolon: writeText,
    writeComment: writeText,
    getTextPos: () => str.length,
    getLine: () => 0,
    getColumn: () => 0,
    getIndent: () => 0,
    isAtStartOfLine: () => false,
    hasTrailingComment: () => false,
    hasTrailingWhitespace: () => !!str.length && syntax.is.whiteSpaceLike(str.charCodeAt(str.length - 1)),
    writeLine: () => (str += ' '),
    increaseIndent: noop,
    decreaseIndent: noop,
    clear: () => (str = ''),
    trackSymbol: noop,
    reportInaccessibleThisError: noop,
    reportInaccessibleUniqueSymbolError: noop,
    reportPrivateInBaseOfClassExpression: noop,
  };
}
export function changesAffectModuleResolution(oldOptions: CompilerOptions, newOptions: CompilerOptions): boolean {
  return oldOptions.configFilePath !== newOptions.configFilePath || optionsHaveModuleResolutionChanges(oldOptions, newOptions);
}
export function optionsHaveModuleResolutionChanges(oldOptions: CompilerOptions, newOptions: CompilerOptions) {
  return moduleResolutionOptionDeclarations.some((o) => !isJsonEqual(getCompilerOptionValue(oldOptions, o), getCompilerOptionValue(newOptions, o)));
}
export function usingSingleLineStringWriter(action: (writer: EmitTextWriter) => void): string {
  const oldString = stringWriter.getText();
  try {
    action(stringWriter);
    return stringWriter.getText();
  } finally {
    stringWriter.clear();
    stringWriter.writeKeyword(oldString);
  }
}
export function getResolvedModule(sourceFile: SourceFile | undefined, moduleNameText: string): ResolvedModuleFull | undefined {
  return sourceFile && sourceFile.resolvedModules && sourceFile.resolvedModules.get(moduleNameText);
}
export function setResolvedModule(sourceFile: SourceFile, moduleNameText: string, resolvedModule: ResolvedModuleFull): void {
  if (!sourceFile.resolvedModules) {
    sourceFile.resolvedModules = new QMap<ResolvedModuleFull>();
  }
  sourceFile.resolvedModules.set(moduleNameText, resolvedModule);
}
export function setResolvedTypeReferenceDirective(sourceFile: SourceFile, typeReferenceDirectiveName: string, resolvedTypeReferenceDirective?: ResolvedTypeReferenceDirective): void {
  if (!sourceFile.resolvedTypeReferenceDirectiveNames) {
    sourceFile.resolvedTypeReferenceDirectiveNames = new QMap<ResolvedTypeReferenceDirective | undefined>();
  }
  sourceFile.resolvedTypeReferenceDirectiveNames.set(typeReferenceDirectiveName, resolvedTypeReferenceDirective);
}
export function getStartPositionOfLine(line: number, sourceFile: SourceFileLike): number {
  assert(line >= 0);
  return syntax.get.lineStarts(sourceFile)[line];
}
export function getEndLinePosition(line: number, sourceFile: SourceFileLike): number {
  assert(line >= 0);
  const lineStarts = syntax.get.lineStarts(sourceFile);
  const lineIndex = line;
  const sourceText = sourceFile.text;
  if (lineIndex + 1 === syntax.get.lineStarts.length) return sourceText.length - 1;
  const start = lineStarts[lineIndex];
  let pos = lineStarts[lineIndex + 1] - 1;
  assert(syntax.is.lineBreak(sourceText.charCodeAt(pos)));
  while (start <= pos && syntax.is.lineBreak(sourceText.charCodeAt(pos))) {
    pos--;
  }
  return pos;
}
export function isFileLevelUniqueName(sourceFile: SourceFile, name: string, hasGlobalName?: PrintHandlers['hasGlobalName']): boolean {
  return !(hasGlobalName && hasGlobalName(name)) && !sourceFile.identifiers.has(name);
}
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
export function hasChangesInResolutions<T>(
  names: readonly string[],
  newResolutions: readonly T[],
  oldResolutions: QReadonlyMap<T> | undefined,
  comparer: (oldResolution: T, newResolution: T) => boolean
): boolean {
  assert(names.length === newResolutions.length);
  for (let i = 0; i < names.length; i++) {
    const newResolution = newResolutions[i];
    const oldResolution = oldResolutions && oldResolutions.get(names[i]);
    const changed = oldResolution ? !newResolution || !comparer(oldResolution, newResolution) : newResolution;
    if (changed) return true;
  }
  return false;
}
function insertStatementsAfterPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined, isPrologueDirective: (node: Node) => boolean): T[] {
  if (from === undefined || from.length === 0) return to;
  let statementIndex = 0;
  for (; statementIndex < to.length; ++statementIndex) {
    if (!qc.is.prologueDirective(to[statementIndex])) break;
  }
  to.splice(statementIndex, 0, ...from);
  return to;
}
function insertStatementAfterPrologue<T extends Statement>(to: T[], statement: T | undefined, isPrologueDirective: (node: Node) => boolean): T[] {
  if (statement === undefined) return to;
  let statementIndex = 0;
  for (; statementIndex < to.length; ++statementIndex) {
    if (!qc.is.prologueDirective(to[statementIndex])) break;
  }
  to.splice(statementIndex, 0, statement);
  return to;
}
function isAnyPrologueDirective(node: Node) {
  return qc.is.prologueDirective(node) || !!(qc.get.emitFlags(node) & EmitFlags.CustomPrologue);
}
export function insertStatementsAfterStandardPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined): T[] {
  return insertStatementsAfterPrologue(to, from, isPrologueDirective);
}
export function insertStatementsAfterCustomPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined): T[] {
  return insertStatementsAfterPrologue(to, from, isAnyPrologueDirective);
}
export function insertStatementAfterStandardPrologue<T extends Statement>(to: T[], statement: T | undefined): T[] {
  return insertStatementAfterPrologue(to, statement, isPrologueDirective);
}
export function insertStatementAfterCustomPrologue<T extends Statement>(to: T[], statement: T | undefined): T[] {
  return insertStatementAfterPrologue(to, statement, isAnyPrologueDirective);
}
export function isRecognizedTripleSlashComment(text: string, commentPos: number, commentEnd: number) {
  if (text.charCodeAt(commentPos + 1) === Codes.slash && commentPos + 2 < commentEnd && text.charCodeAt(commentPos + 2) === Codes.slash) {
    const textSubStr = text.substring(commentPos, commentEnd);
    return textSubStr.match(fullTripleSlashReferencePathRegEx) ||
      textSubStr.match(fullTripleSlashAMDReferencePathRegEx) ||
      textSubStr.match(fullTripleSlashReferenceTypeReferenceDirectiveRegEx) ||
      textSubStr.match(defaultLibReferenceRegEx)
      ? true
      : false;
  }
  return false;
}
export function isPinnedComment(text: string, start: number) {
  return text.charCodeAt(start + 1) === Codes.asterisk && text.charCodeAt(start + 2) === Codes.exclamation;
}
export function createCommentDirectivesMap(sourceFile: SourceFile, commentDirectives: CommentDirective[]): CommentDirectivesMap {
  const directivesByLine = new QMap(commentDirectives.map((commentDirective) => [`${syntax.get.lineAndCharOf(sourceFile, commentDirective.range.end).line}`, commentDirective]));
  const usedLines = new QMap<boolean>();
  return { getUnusedExpectations, markUsed };
  function getUnusedExpectations() {
    return arrayFrom(directivesByLine.entries())
      .filter(([line, directive]) => directive.type === CommentDirectiveType.ExpectError && !usedLines.get(line))
      .map(([_, directive]) => directive);
  }
  function markUsed(line: number) {
    if (!directivesByLine.has(`${line}`)) return false;
    usedLines.set(`${line}`, true);
    return true;
  }
}
export function getTokenPosOfNode(node: Node, sourceFile?: SourceFileLike, includeDoc?: boolean): number {
  if (qc.is.missing(node)) return node.pos;
  if (qc.isDoc.node(node)) return syntax.skipTrivia((sourceFile || qc.get.sourceFileOf(node)).text, node.pos, false, true);
  if (includeDoc && qc.is.withDocNodes(node)) return getTokenPosOfNode(node.doc![0], sourceFile);
  if (node.kind === Syntax.SyntaxList && (<SyntaxList>node)._children.length > 0) return getTokenPosOfNode((<SyntaxList>node)._children[0], sourceFile, includeDoc);
  return syntax.skipTrivia((sourceFile || qc.get.sourceFileOf(node)).text, node.pos);
}
export function getNonDecoratorTokenPosOfNode(node: Node, sourceFile?: SourceFileLike): number {
  if (qc.is.missing(node) || !node.decorators) return getTokenPosOfNode(node, sourceFile);
  return syntax.skipTrivia((sourceFile || qc.get.sourceFileOf(node)).text, node.decorators.end);
}
export function getSourceTextOfNodeFromSourceFile(sourceFile: SourceFile, node: Node, includeTrivia = false): string {
  return getTextOfNodeFromSourceText(sourceFile.text, node, includeTrivia);
}
function isDocTypeExpressionOrChild(node: Node): boolean {
  return !!Node.findAncestor(node, isDocTypeExpression);
}
export function indexOfNode(nodeArray: readonly Node[], node: Node) {
  return binarySearch(nodeArray, node, getPos, compareValues);
}
export function getTextOfConstantValue(value: string | number) {
  return isString(value) ? '"' + escapeNonAsciiString(value) + '"' : '' + value;
}
export function makeIdentifierFromModuleName(moduleName: string): string {
  return getBaseFileName(moduleName).replace(/^(\d)/, '_$1').replace(/\W/g, '_');
}
export function isBlockOrCatchScoped(declaration: Declaration) {
  return (qc.get.combinedFlagsOf(declaration) & NodeFlags.BlockScoped) !== 0 || isCatchClauseVariableDeclarationOrBindingElement(declaration);
}
export function isCatchClauseVariableDeclarationOrBindingElement(declaration: Declaration) {
  const node = getRootDeclaration(declaration);
  return node.kind === Syntax.VariableDeclaration && node.parent.kind === Syntax.CatchClause;
}
export function isGlobalScopeAugmentation(module: ModuleDeclaration): boolean {
  return !!(module.flags & NodeFlags.GlobalAugmentation);
}
export function isEffectiveExternalModule(node: SourceFile, compilerOptions: CompilerOptions) {
  return qp_isExternalModule(node) || compilerOptions.isolatedModules || (getEmitModuleKind(compilerOptions) === ModuleKind.CommonJS && !!node.commonJsModuleIndicator);
}
export function isEffectiveStrictModeSourceFile(node: SourceFile, compilerOptions: CompilerOptions) {
  switch (node.scriptKind) {
    case ScriptKind.JS:
    case ScriptKind.TS:
    case ScriptKind.JSX:
    case ScriptKind.TSX:
      break;
    default:
      return false;
  }
  if (node.isDeclarationFile) return false;
  if (getStrictOptionValue(compilerOptions, 'alwaysStrict')) return true;
  if (startsWithUseStrict(node.statements)) return true;
  if (qp_isExternalModule(node) || compilerOptions.isolatedModules) {
    if (getEmitModuleKind(compilerOptions) >= ModuleKind.ES2015) return true;
    return !compilerOptions.noImplicitUseStrict;
  }
  return false;
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
export function getTextOfPropertyName(name: PropertyName | NoSubstitutionLiteral): __String {
  switch (name.kind) {
    case Syntax.Identifier:
    case Syntax.PrivateIdentifier:
      return name.escapedText;
    case Syntax.StringLiteral:
    case Syntax.NumericLiteral:
    case Syntax.NoSubstitutionLiteral:
      return syntax.get.escUnderscores(name.text);
    case Syntax.ComputedPropertyName:
      if (StringLiteral.orNumericLiteralLike(name.expression)) return syntax.get.escUnderscores(name.expression.text);
      return fail('Text of property name cannot be read from non-literal-valued ComputedPropertyNames');
    default:
      return Debug.assertNever(name);
  }
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
      if (qc.is.kind(Identifier, name.name) || qc.is.kind(PrivateIdentifier, name.name)) return entityNameToString(name.expression) + '.' + entityNameToString(name.name);
      return Debug.assertNever(name.name);
    default:
      return Debug.assertNever(name);
  }
}
export function createDiagnosticForNode(
  node: Node,
  message: DiagnosticMessage,
  arg0?: string | number,
  arg1?: string | number,
  arg2?: string | number,
  arg3?: string | number
): DiagnosticWithLocation {
  const sourceFile = qc.get.sourceFileOf(node);
  return createDiagnosticForNodeInSourceFile(sourceFile, node, message, arg0, arg1, arg2, arg3);
}
export function createDiagnosticForNodes(
  sourceFile: SourceFile,
  nodes: Nodes<Node>,
  message: DiagnosticMessage,
  arg0?: string | number,
  arg1?: string | number,
  arg2?: string | number,
  arg3?: string | number
): DiagnosticWithLocation {
  const start = syntax.skipTrivia(sourceFile.text, nodes.pos);
  return createFileDiagnostic(sourceFile, start, nodes.end - start, message, arg0, arg1, arg2, arg3);
}
export function createDiagnosticForNodeInSourceFile(
  sourceFile: SourceFile,
  node: Node,
  message: DiagnosticMessage,
  arg0?: string | number,
  arg1?: string | number,
  arg2?: string | number,
  arg3?: string | number
): DiagnosticWithLocation {
  const span = getErrorSpanForNode(sourceFile, node);
  return createFileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2, arg3);
}
export function createDiagnosticForNodeFromMessageChain(node: Node, messageChain: DiagnosticMessageChain, relatedInformation?: DiagnosticRelatedInformation[]): DiagnosticWithLocation {
  const sourceFile = qc.get.sourceFileOf(node);
  const span = getErrorSpanForNode(sourceFile, node);
  return {
    file: sourceFile,
    start: span.start,
    length: span.length,
    code: messageChain.code,
    category: messageChain.category,
    messageText: messageChain.next ? messageChain : messageChain.messageText,
    relatedInformation,
  };
}
export function createDiagnosticForRange(sourceFile: SourceFile, range: TextRange, message: DiagnosticMessage): DiagnosticWithLocation {
  return {
    file: sourceFile,
    start: range.pos,
    length: range.end - range.pos,
    code: message.code,
    category: message.category,
    messageText: message.message,
  };
}
export function getSpanOfTokenAtPosition(s: SourceFile, pos: number): TextSpan {
  const scanner = qs_create(true, s.languageVariant);
  scanner.setText(s.text, pos);
  scanner.scan();
  const start = scanner.getTokenPos();
  return TextSpan.from(start, scanner.getTextPos());
}
function getErrorSpanForArrowFunction(sourceFile: SourceFile, node: ArrowFunction): TextSpan {
  const pos = syntax.skipTrivia(sourceFile.text, node.pos);
  if (node.body && node.body.kind === Syntax.Block) {
    const { line: startLine } = sourceFile.lineAndCharOf(node.body.pos);
    const { line: endLine } = sourceFile.lineAndCharOf(node.body.end);
    if (startLine < endLine) return new TextSpan(pos, getEndLinePosition(startLine, sourceFile) - pos + 1);
  }
  return TextSpan.from(pos, node.end);
}
export function getErrorSpanForNode(sourceFile: SourceFile, node: Node): TextSpan {
  let errorNode: Node | undefined = node;
  switch (node.kind) {
    case Syntax.SourceFile:
      const pos = syntax.skipTrivia(sourceFile.text, 0, false);
      if (pos === sourceFile.text.length) return new TextSpan();
      return getSpanOfTokenAtPosition(sourceFile, pos);
    case Syntax.VariableDeclaration:
    case Syntax.BindingElement:
    case Syntax.ClassDeclaration:
    case Syntax.ClassExpression:
    case Syntax.InterfaceDeclaration:
    case Syntax.ModuleDeclaration:
    case Syntax.EnumDeclaration:
    case Syntax.EnumMember:
    case Syntax.FunctionDeclaration:
    case Syntax.FunctionExpression:
    case Syntax.MethodDeclaration:
    case Syntax.GetAccessor:
    case Syntax.SetAccessor:
    case Syntax.TypeAliasDeclaration:
    case Syntax.PropertyDeclaration:
    case Syntax.PropertySignature:
      errorNode = (<NamedDeclaration>node).name;
      break;
    case Syntax.ArrowFunction:
      return getErrorSpanForArrowFunction(sourceFile, <ArrowFunction>node);
    case Syntax.CaseClause:
    case Syntax.DefaultClause:
      const start = syntax.skipTrivia(sourceFile.text, (<CaseOrDefaultClause>node).pos);
      const end = (<CaseOrDefaultClause>node).statements.length > 0 ? (<CaseOrDefaultClause>node).statements[0].pos : (<CaseOrDefaultClause>node).end;
      return TextSpan.from(start, end);
  }
  if (errorNode === undefined) return getSpanOfTokenAtPosition(sourceFile, node.pos);
  assert(!qc.is.kind(Doc, errorNode));
  const isMissing = qc.is.missing(errorNode);
  const pos = isMissing || qc.is.kind(JsxText, node) ? errorNode.pos : syntax.skipTrivia(sourceFile.text, errorNode.pos);
  if (isMissing) {
    assert(pos === errorNode.pos);
    assert(pos === errorNode.end);
  } else {
    assert(pos >= errorNode.pos);
    assert(pos <= errorNode.end);
  }
  return TextSpan.from(pos, errorNode.end);
}
export function isExternalOrCommonJsModule(file: SourceFile): boolean {
  return (file.externalModuleIndicator || file.commonJsModuleIndicator) !== undefined;
}
export function isJsonSourceFile(file: SourceFile): file is JsonSourceFile {
  return file.scriptKind === ScriptKind.JSON;
}
export function isEnumConst(node: EnumDeclaration): boolean {
  return !!(getCombinedModifierFlags(node) & ModifierFlags.Const);
}
export function isDeclarationReadonly(declaration: Declaration): boolean {
  return !!(getCombinedModifierFlags(declaration) & ModifierFlags.Readonly && !qc.is.parameterPropertyDeclaration(declaration, declaration.parent));
}
export function isVarConst(node: VariableDeclaration | VariableDeclarationList): boolean {
  return !!(qc.get.combinedFlagsOf(node) & NodeFlags.Const);
}
export function isCustomPrologue(node: Statement) {
  return !!(qc.get.emitFlags(node) & EmitFlags.CustomPrologue);
}
export function isHoistedFunction(node: Statement) {
  return isCustomPrologue(node) && qc.is.kind(FunctionDeclaration, node);
}
function isHoistedVariable(node: VariableDeclaration) {
  return qc.is.kind(Identifier, node.name) && !node.initializer;
}
export function isHoistedVariableStatement(node: Statement) {
  return isCustomPrologue(node) && qc.is.kind(VariableStatement, node) && every(node.declarationList.declarations, isHoistedVariable);
}
export function getLeadingCommentRangesOfNode(node: Node, sourceFileOfNode: SourceFile) {
  return node.kind !== Syntax.JsxText ? syntax.get.leadingCommentRanges(sourceFileOfNode.text, node.pos) : undefined;
}
export const fullTripleSlashReferencePathRegEx = /^(\/\/\/\s*<reference\s+path\s*=\s*)('|")(.+?)\2.*?\/>/;
const fullTripleSlashReferenceTypeReferenceDirectiveRegEx = /^(\/\/\/\s*<reference\s+types\s*=\s*)('|")(.+?)\2.*?\/>/;
export const fullTripleSlashAMDReferencePathRegEx = /^(\/\/\/\s*<amd-dependency\s+path\s*=\s*)('|")(.+?)\2.*?\/>/;
const defaultLibReferenceRegEx = /^(\/\/\/\s*<reference\s+no-default-lib\s*=\s*)('|")(.+?)\2\s*\/>/;
export function forEachReturnStatement<T>(body: Block, visitor: (stmt: ReturnStatement) => T): T | undefined {
  return traverse(body);
  function traverse(node: Node): T | undefined {
    switch (node.kind) {
      case Syntax.ReturnStatement:
        return visitor(<ReturnStatement>node);
      case Syntax.CaseBlock:
      case Syntax.Block:
      case Syntax.IfStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.ForStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.WithStatement:
      case Syntax.SwitchStatement:
      case Syntax.CaseClause:
      case Syntax.DefaultClause:
      case Syntax.LabeledStatement:
      case Syntax.TryStatement:
      case Syntax.CatchClause:
        return qc.forEach.child(node, traverse);
    }
    return;
  }
}
export function forEachYieldExpression(body: Block, visitor: (expr: YieldExpression) => void): void {
  return traverse(body);
  function traverse(node: Node): void {
    switch (node.kind) {
      case Syntax.YieldExpression:
        visitor(<YieldExpression>node);
        const operand = (<YieldExpression>node).expression;
        if (operand) {
          traverse(operand);
        }
        return;
      case Syntax.EnumDeclaration:
      case Syntax.InterfaceDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.TypeAliasDeclaration:
        return;
      default:
        if (qc.is.functionLike(node)) {
          if (node.name && node.name.kind === Syntax.ComputedPropertyName) {
            traverse(node.name.expression);
            return;
          }
        } else if (!qc.is.partOfTypeNode(node)) {
          qc.forEach.child(node, traverse);
        }
    }
  }
}
export function getRestParameterElementType(node: TypeNode | undefined) {
  if (node && node.kind === Syntax.ArrayType) return (<ArrayTypeNode>node).elementType;
  else if (node && node.kind === Syntax.TypeReference) return singleOrUndefined((<TypeReferenceNode>node).typeArguments);
  else {
    return;
  }
}
export function getMembersOfDeclaration(node: Declaration): Nodes<ClassElement | TypeElement | ObjectLiteralElement> | undefined {
  switch (node.kind) {
    case Syntax.InterfaceDeclaration:
    case Syntax.ClassDeclaration:
    case Syntax.ClassExpression:
    case Syntax.TypeLiteral:
      return (<ObjectTypeDeclaration>node).members;
    case Syntax.ObjectLiteralExpression:
      return (<ObjectLiteralExpression>node).properties;
  }
}
export function isVariableDeclarationInVariableStatement(node: VariableDeclaration) {
  return node.parent.kind === Syntax.VariableDeclarationList && node.parent.parent.kind === Syntax.VariableStatement;
}
export function introducesArgumentsExoticObject(node: Node) {
  switch (node.kind) {
    case Syntax.MethodDeclaration:
    case Syntax.MethodSignature:
    case Syntax.Constructor:
    case Syntax.GetAccessor:
    case Syntax.SetAccessor:
    case Syntax.FunctionDeclaration:
    case Syntax.FunctionExpression:
      return true;
  }
  return false;
}
export function unwrapInnermostStatementOfLabel(node: LabeledStatement, beforeUnwrapLabelCallback?: (node: LabeledStatement) => void): Statement {
  while (true) {
    if (beforeUnwrapLabelCallback) {
      beforeUnwrapLabelCallback(node);
    }
    if (node.statement.kind !== Syntax.LabeledStatement) return node.statement;
    node = <LabeledStatement>node.statement;
  }
}
export function isIdentifierTypePredicate(predicate: TypePredicate): predicate is IdentifierTypePredicate {
  return predicate && predicate.kind === TypePredicateKind.Identifier;
}
export function isThisTypePredicate(predicate: TypePredicate): predicate is ThisTypePredicate {
  return predicate && predicate.kind === TypePredicateKind.This;
}
export function getPropertyAssignment(objectLiteral: ObjectLiteralExpression, key: string, key2?: string): readonly PropertyAssignment[] {
  return objectLiteral.properties.filter((property): property is PropertyAssignment => {
    if (property.kind === Syntax.PropertyAssignment) {
      const propName = getTextOfPropertyName(property.name);
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
    isArrayLiteralExpression(property.initializer)
      ? find(property.initializer.elements, (element): element is StringLiteral => qc.is.kind(StringLiteral, element) && element.text === elementValue)
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
      return isEntityNameExpression((<ExpressionWithTypeArguments>node).expression) ? <EntityNameExpression>(<ExpressionWithTypeArguments>node).expression : undefined;
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
  if (qc.is.namedDeclaration(node) && qc.is.kind(PrivateIdentifier, node.name)) return false;
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
export function getExternalModuleImportEqualsDeclarationExpression(node: Node) {
  assert(qc.is.externalModuleImportEqualsDeclaration(node));
  return (<ExternalModuleReference>(<ImportEqualsDeclaration>node).moduleReference).expression;
}
export function isInternalModuleImportEqualsDeclaration(node: Node): node is ImportEqualsDeclaration {
  return node.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>node).moduleReference.kind !== Syntax.ExternalModuleReference;
}
export function isSourceFileJS(file: SourceFile): boolean {
  return isInJSFile(file);
}
export function isSourceFileNotJS(file: SourceFile): boolean {
  return !isInJSFile(file);
}
export function isInJSFile(node: Node | undefined): boolean {
  return !!node && !!(node.flags & NodeFlags.JavaScriptFile);
}
export function isInJsonFile(node: Node | undefined): boolean {
  return !!node && !!(node.flags & NodeFlags.JsonFile);
}
export function isSourceFileNotJson(file: SourceFile) {
  return !isJsonSourceFile(file);
}
export function isInDoc(node: Node | undefined): boolean {
  return !!node && !!(node.flags & NodeFlags.Doc);
}
export function isDocIndexSignature(node: TypeReferenceNode | ExpressionWithTypeArguments) {
  return (
    qc.is.kind(TypeReferenceNode, node) &&
    qc.is.kind(Identifier, node.typeName) &&
    node.typeName.escapedText === 'Object' &&
    node.typeArguments &&
    node.typeArguments.length === 2 &&
    (node.typeArguments[0].kind === Syntax.StringKeyword || node.typeArguments[0].kind === Syntax.NumberKeyword)
  );
}
export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: true): callExpression is RequireOrImportCall & { expression: Identifier; arguments: [StringLiteralLike] };
export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: boolean): callExpression is CallExpression;
export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: boolean): callExpression is CallExpression {
  if (callExpression.kind !== Syntax.CallExpression) return false;
  const { expression, arguments: args } = callExpression as CallExpression;
  if (expression.kind !== Syntax.Identifier || (expression as Identifier).escapedText !== 'require') return false;
  if (args.length !== 1) return false;
  const arg = args[0];
  return !requireStringLiteralLikeArgument || StringLiteral.like(arg);
}
export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: true): node is RequireVariableDeclaration;
export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: boolean): node is VariableDeclaration;
export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: boolean): node is VariableDeclaration {
  return qc.is.kind(VariableDeclaration, node) && !!node.initializer && isRequireCall(node.initializer, requireStringLiteralLikeArgument);
}
export function isRequireVariableDeclarationStatement(node: Node, requireStringLiteralLikeArgument = true): node is VariableStatement {
  return qc.is.kind(VariableStatement, node) && every(node.declarationList.declarations, (decl) => isRequireVariableDeclaration(decl, requireStringLiteralLikeArgument));
}
export function isSingleOrDoubleQuote(cc: number) {
  return cc === Codes.singleQuote || cc === Codes.doubleQuote;
}
export function isStringDoubleQuoted(str: StringLiteralLike, sourceFile: SourceFile): boolean {
  return getSourceTextOfNodeFromSourceFile(sourceFile, str).charCodeAt(0) === Codes.doubleQuote;
}
export function getDeclarationOfExpando(node: Node): Node | undefined {
  if (!node.parent) {
    return;
  }
  let name: Expression | BindingName | undefined;
  let decl: Node | undefined;
  if (qc.is.kind(VariableDeclaration, node.parent) && node.parent.initializer === node) {
    if (!isInJSFile(node) && !isVarConst(node.parent)) {
      return;
    }
    name = node.parent.name;
    decl = node.parent;
  } else if (qc.is.kind(node.parent, BinaryExpression)) {
    const parentNode = node.parent;
    const parentNodeOperator = node.parent.operatorToken.kind;
    if (parentNodeOperator === Syntax.EqualsToken && parentNode.right === node) {
      name = parentNode.left;
      decl = name;
    } else if (parentNodeOperator === Syntax.Bar2Token || parentNodeOperator === Syntax.Question2Token) {
      if (qc.is.kind(VariableDeclaration, parentNode.parent) && parentNode.parent.initializer === parentNode) {
        name = parentNode.parent.name;
        decl = parentNode.parent;
      } else if (qc.is.kind(parentNode.parent, BinaryExpression) && parentNode.parent.operatorToken.kind === Syntax.EqualsToken && parentNode.parent.right === parentNode) {
        name = parentNode.parent.left;
        decl = name;
      }
      if (!name || !isBindableStaticNameExpression(name) || !isSameEntityName(name, parentNode.left)) {
        return;
      }
    }
  }
  if (!name || !getExpandoInitializer(node, isPrototypeAccess(name))) {
    return;
  }
  return decl;
}
export function isAssignmentDeclaration(decl: Declaration) {
  return qc.is.kind(BinaryExpression, decl) || isAccessExpression(decl) || qc.is.kind(Identifier, decl) || qc.is.kind(CallExpression, decl);
}
export function getEffectiveInitializer(node: HasExpressionInitializer) {
  if (
    isInJSFile(node) &&
    node.initializer &&
    qc.is.kind(BinaryExpression, node.initializer) &&
    (node.initializer.operatorToken.kind === Syntax.Bar2Token || node.initializer.operatorToken.kind === Syntax.Question2Token) &&
    node.name &&
    isEntityNameExpression(node.name) &&
    isSameEntityName(node.name, node.initializer.left)
  ) {
    return node.initializer.right;
  }
  return node.initializer;
}
export function getDeclaredExpandoInitializer(node: HasExpressionInitializer) {
  const init = getEffectiveInitializer(node);
  return init && getExpandoInitializer(init, isPrototypeAccess(node.name));
}
function hasExpandoValueProperty(node: ObjectLiteralExpression, isPrototypeAssignment: boolean) {
  return forEach(
    node.properties,
    (p) => qc.is.kind(PropertyAssignment, p) && qc.is.kind(Identifier, p.name) && p.name.escapedText === 'value' && p.initializer && getExpandoInitializer(p.initializer, isPrototypeAssignment)
  );
}
export function getAssignedExpandoInitializer(node: Node | undefined): Expression | undefined {
  if (node && node.parent && qc.is.kind(BinaryExpression, node.parent) && node.parent.operatorToken.kind === Syntax.EqualsToken) {
    const isPrototypeAssignment = isPrototypeAccess(node.parent.left);
    return getExpandoInitializer(node.parent.right, isPrototypeAssignment) || getDefaultedExpandoInitializer(node.parent.left, node.parent.right, isPrototypeAssignment);
  }
  if (node && qc.is.kind(CallExpression, node) && isBindableObjectDefinePropertyCall(node)) {
    const result = hasExpandoValueProperty(node.arguments[2], node.arguments[1].text === 'prototype');
    if (result) return result;
  }
}
export function getExpandoInitializer(initializer: Node, isPrototypeAssignment: boolean): Expression | undefined {
  if (qc.is.kind(CallExpression, initializer)) {
    const e = skipParentheses(initializer.expression);
    return e.kind === Syntax.FunctionExpression || e.kind === Syntax.ArrowFunction ? initializer : undefined;
  }
  if (initializer.kind === Syntax.FunctionExpression || initializer.kind === Syntax.ClassExpression || initializer.kind === Syntax.ArrowFunction) return initializer as Expression;
  if (qc.is.kind(ObjectLiteralExpression, initializer) && (initializer.properties.length === 0 || isPrototypeAssignment)) return initializer;
  return;
}
function getDefaultedExpandoInitializer(name: Expression, initializer: Expression, isPrototypeAssignment: boolean) {
  const e =
    qc.is.kind(BinaryExpression, initializer) &&
    (initializer.operatorToken.kind === Syntax.Bar2Token || initializer.operatorToken.kind === Syntax.Question2Token) &&
    getExpandoInitializer(initializer.right, isPrototypeAssignment);
  if (e && isSameEntityName(name, (initializer as BinaryExpression).left)) return e;
  return;
}
export function isDefaultedExpandoInitializer(node: BinaryExpression) {
  const name = qc.is.kind(VariableDeclaration, node.parent)
    ? node.parent.name
    : qc.is.kind(BinaryExpression, node.parent) && node.parent.operatorToken.kind === Syntax.EqualsToken
    ? node.parent.left
    : undefined;
  return name && getExpandoInitializer(node.right, isPrototypeAccess(name)) && isEntityNameExpression(name) && isSameEntityName(name, node.left);
}
export function getNameOfExpando(node: Declaration): DeclarationName | undefined {
  if (qc.is.kind(BinaryExpression, node.parent)) {
    const parent =
      (node.parent.operatorToken.kind === Syntax.Bar2Token || node.parent.operatorToken.kind === Syntax.Question2Token) && qc.is.kind(BinaryExpression, node.parent.parent)
        ? node.parent.parent
        : node.parent;
    if (parent.operatorToken.kind === Syntax.EqualsToken && qc.is.kind(Identifier, parent.left)) return parent.left;
  } else if (qc.is.kind(VariableDeclaration, node.parent)) {
    return node.parent.name;
  }
}
function isSameEntityName(name: Expression, initializer: Expression): boolean {
  if (isPropertyNameLiteral(name) && isPropertyNameLiteral(initializer)) return getTextOfIdentifierOrLiteral(name) === getTextOfIdentifierOrLiteral(name);
  if (
    qc.is.kind(Identifier, name) &&
    qc.is.literalLikeAccess(initializer) &&
    (initializer.expression.kind === Syntax.ThisKeyword ||
      (qc.is.kind(Identifier, initializer.expression) &&
        (initializer.expression.escapedText === 'window' || initializer.expression.escapedText === 'self' || initializer.expression.escapedText === 'global')))
  ) {
    const nameOrArgument = getNameOrArgument(initializer);
    if (qc.is.kind(PrivateIdentifier, nameOrArgument)) {
      fail('Unexpected PrivateIdentifier in name expression with literal-like access.');
    }
    return isSameEntityName(name, nameOrArgument);
  }
  if (qc.is.literalLikeAccess(name) && qc.is.literalLikeAccess(initializer))
    return getElementOrPropertyAccessName(name) === getElementOrPropertyAccessName(initializer) && isSameEntityName(name.expression, initializer.expression);
  return false;
}
export function getRightMostAssignedExpression(node: Expression): Expression {
  while (isAssignmentExpression(node, true)) {
    node = node.right;
  }
  return node;
}
export function getAssignmentDeclarationKind(expr: BinaryExpression | CallExpression): AssignmentDeclarationKind {
  const special = getAssignmentDeclarationKindWorker(expr);
  return special === AssignmentDeclarationKind.Property || isInJSFile(expr) ? special : AssignmentDeclarationKind.None;
}
export function isBindableObjectDefinePropertyCall(expr: CallExpression): expr is BindableObjectDefinePropertyCall {
  return (
    length(expr.arguments) === 3 &&
    qc.is.kind(PropertyAccessExpression, expr.expression) &&
    qc.is.kind(Identifier, expr.expression.expression) &&
    idText(expr.expression.expression) === 'Object' &&
    idText(expr.expression.name) === 'defineProperty' &&
    StringLiteral.orNumericLiteralLike(expr.arguments[1]) &&
    isBindableStaticNameExpression(expr.arguments[0], true)
  );
}
export function isBindableStaticAccessExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticAccessExpression {
  return (
    (qc.is.kind(PropertyAccessExpression, node) &&
      ((!excludeThisKeyword && node.expression.kind === Syntax.ThisKeyword) || (qc.is.kind(Identifier, node.name) && isBindableStaticNameExpression(node.expression, true)))) ||
    isBindableStaticElementAccessExpression(node, excludeThisKeyword)
  );
}
export function isBindableStaticElementAccessExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticElementAccessExpression {
  return (
    qc.is.literalLikeElementAccess(node) &&
    ((!excludeThisKeyword && node.expression.kind === Syntax.ThisKeyword) || isEntityNameExpression(node.expression) || isBindableStaticAccessExpression(node.expression, true))
  );
}
export function isBindableStaticNameExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticNameExpression {
  return isEntityNameExpression(node) || isBindableStaticAccessExpression(node, excludeThisKeyword);
}
export function getNameOrArgument(expr: PropertyAccessExpression | LiteralLikeElementAccessExpression) {
  if (qc.is.kind(PropertyAccessExpression, expr)) return expr.name;
  return expr.argumentExpression;
}
function getAssignmentDeclarationKindWorker(expr: BinaryExpression | CallExpression): AssignmentDeclarationKind {
  if (qc.is.kind(CallExpression, expr)) {
    if (!isBindableObjectDefinePropertyCall(expr)) return AssignmentDeclarationKind.None;
    const entityName = expr.arguments[0];
    if (qc.is.exportsIdentifier(entityName) || qc.is.moduleExportsAccessExpression(entityName)) return AssignmentDeclarationKind.ObjectDefinePropertyExports;
    if (isBindableStaticAccessExpression(entityName) && getElementOrPropertyAccessName(entityName) === 'prototype') return AssignmentDeclarationKind.ObjectDefinePrototypeProperty;
    return AssignmentDeclarationKind.ObjectDefinePropertyValue;
  }
  if (expr.operatorToken.kind !== Syntax.EqualsToken || !isAccessExpression(expr.left)) return AssignmentDeclarationKind.None;
  if (
    isBindableStaticNameExpression(expr.left.expression, true) &&
    getElementOrPropertyAccessName(expr.left) === 'prototype' &&
    qc.is.kind(ObjectLiteralExpression, getInitializerOfBinaryExpression(expr))
  ) {
    return AssignmentDeclarationKind.Prototype;
  }
  return getAssignmentDeclarationPropertyAccessKind(expr.left);
}
export function getElementOrPropertyAccessArgumentExpressionOrName(node: AccessExpression): Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ElementAccessExpression | undefined {
  if (qc.is.kind(PropertyAccessExpression, node)) return node.name;
  const arg = skipParentheses(node.argumentExpression);
  if (qc.is.kind(NumericLiteral, arg) || StringLiteral.like(arg)) return arg;
  return node;
}
export function getElementOrPropertyAccessName(node: LiteralLikeElementAccessExpression | PropertyAccessExpression): __String;
export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined;
export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined {
  const name = getElementOrPropertyAccessArgumentExpressionOrName(node);
  if (name) {
    if (qc.is.kind(Identifier, name)) return name.escapedText;
    if (StringLiteral.like(name) || qc.is.kind(NumericLiteral, name)) return syntax.get.escUnderscores(name.text);
  }
  if (qc.is.kind(ElementAccessExpression, node) && isWellKnownSymbolSyntactically(node.argumentExpression))
    return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>node.argumentExpression).name));
  return;
}
export function getAssignmentDeclarationPropertyAccessKind(lhs: AccessExpression): AssignmentDeclarationKind {
  if (lhs.expression.kind === Syntax.ThisKeyword) return AssignmentDeclarationKind.ThisProperty;
  else if (qc.is.moduleExportsAccessExpression(lhs)) return AssignmentDeclarationKind.ModuleExports;
  else if (isBindableStaticNameExpression(lhs.expression, true)) {
    if (isPrototypeAccess(lhs.expression)) return AssignmentDeclarationKind.PrototypeProperty;
    let nextToLast = lhs;
    while (!qc.is.kind(Identifier, nextToLast.expression)) {
      nextToLast = nextToLast.expression as Exclude<BindableStaticNameExpression, Identifier>;
    }
    const id = nextToLast.expression;
    if ((id.escapedText === 'exports' || (id.escapedText === 'module' && getElementOrPropertyAccessName(nextToLast) === 'exports')) && isBindableStaticAccessExpression(lhs))
      return AssignmentDeclarationKind.ExportsProperty;
    if (isBindableStaticNameExpression(lhs, true) || (qc.is.kind(ElementAccessExpression, lhs) && isDynamicName(lhs))) return AssignmentDeclarationKind.Property;
  }
  return AssignmentDeclarationKind.None;
}
export function getInitializerOfBinaryExpression(expr: BinaryExpression) {
  while (qc.is.kind(BinaryExpression, expr.right)) {
    expr = expr.right;
  }
  return expr.right;
}
export function isPrototypePropertyAssignment(node: Node): boolean {
  return qc.is.kind(BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.PrototypeProperty;
}
export function isSpecialPropertyDeclaration(expr: PropertyAccessExpression | ElementAccessExpression): expr is PropertyAccessExpression | LiteralLikeElementAccessExpression {
  return (
    isInJSFile(expr) &&
    expr.parent &&
    expr.parent.kind === Syntax.ExpressionStatement &&
    (!qc.is.kind(ElementAccessExpression, expr) || qc.is.literalLikeElementAccess(expr)) &&
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
      assert(qc.is.kind(StringLiteral, node));
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
export function forEachImportClauseDeclaration<T>(node: ImportClause, action: (declaration: ImportClause | NamespaceImport | ImportSpecifier) => T | undefined): T | undefined {
  if (node.name) {
    const result = action(node);
    if (result) return result;
  }
  if (node.namedBindings) {
    const result = qc.is.kind(NamespaceImport, node.namedBindings) ? action(node.namedBindings) : forEach(node.namedBindings.elements, action);
    if (result) return result;
  }
}
export function hasQuestionToken(node: Node) {
  if (node) {
    switch (node.kind) {
      case Syntax.Parameter:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.ShorthandPropertyAssignment:
      case Syntax.PropertyAssignment:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        return (<ParameterDeclaration | MethodDeclaration | PropertyDeclaration>node).questionToken !== undefined;
    }
  }
  return false;
}
function getSourceOfAssignment(node: Node): Node | undefined {
  return qc.is.kind(ExpressionStatement, node) && qc.is.kind(BinaryExpression, node.expression) && node.expression.operatorToken.kind === Syntax.EqualsToken
    ? getRightMostAssignedExpression(node.expression)
    : undefined;
}
function getSourceOfDefaultedAssignment(node: Node): Node | undefined {
  return qc.is.kind(ExpressionStatement, node) &&
    qc.is.kind(BinaryExpression, node.expression) &&
    getAssignmentDeclarationKind(node.expression) !== AssignmentDeclarationKind.None &&
    qc.is.kind(BinaryExpression, node.expression.right) &&
    (node.expression.right.operatorToken.kind === Syntax.Bar2Token || node.expression.right.operatorToken.kind === Syntax.Question2Token)
    ? node.expression.right.right
    : undefined;
}
export function getSingleInitializerOfVariableStatementOrPropertyDeclaration(node: Node): Expression | undefined {
  switch (node.kind) {
    case Syntax.VariableStatement:
      const v = getSingleVariableOfVariableStatement(node);
      return v && v.initializer;
    case Syntax.PropertyDeclaration:
      return (node as PropertyDeclaration).initializer;
    case Syntax.PropertyAssignment:
      return (node as PropertyAssignment).initializer;
  }
}
function getSingleVariableOfVariableStatement(node: Node): VariableDeclaration | undefined {
  return qc.is.kind(VariableStatement, node) ? firstOrUndefined(node.declarationList.declarations) : undefined;
}
function getNestedModuleDeclaration(node: Node): Node | undefined {
  return qc.is.kind(ModuleDeclaration, node) && node.body && node.body.kind === Syntax.ModuleDeclaration ? node.body : undefined;
}
export function getParameterSymbolFromDoc(node: DocParameterTag): Symbol | undefined {
  if (node.symbol) return node.symbol;
  if (!qc.is.kind(Identifier, node.name)) {
    return;
  }
  const name = node.name.escapedText;
  const decl = getHostSignatureFromDoc(node);
  if (!decl) {
    return;
  }
  const parameter = find(decl.parameters, (p) => p.name.kind === Syntax.Identifier && p.name.escapedText === name);
  return parameter && parameter.symbol;
}
export function getHostSignatureFromDoc(node: Node): SignatureDeclaration | undefined {
  const host = getEffectiveDocHost(node);
  return host && qc.is.functionLike(host) ? host : undefined;
}
export function getEffectiveDocHost(node: Node): Node | undefined {
  const host = qc.getDoc.host(node);
  const decl =
    getSourceOfDefaultedAssignment(host) ||
    getSourceOfAssignment(host) ||
    getSingleInitializerOfVariableStatementOrPropertyDeclaration(host) ||
    getSingleVariableOfVariableStatement(host) ||
    getNestedModuleDeclaration(host) ||
    host;
  return decl;
}
export function getTypeParameterFromDoc(node: TypeParameterDeclaration & { parent: DocTemplateTag }): TypeParameterDeclaration | undefined {
  const name = node.name.escapedText;
  const { typeParameters } = node.parent.parent.parent as SignatureDeclaration | InterfaceDeclaration | ClassDeclaration;
  return typeParameters && find(typeParameters, (p) => p.name.escapedText === name);
}
export function hasRestParameter(s: SignatureDeclaration | DocSignature): boolean {
  const last = lastOrUndefined<ParameterDeclaration | DocParameterTag>(s.parameters);
  return !!last && isRestParameter(last);
}
export function isRestParameter(node: ParameterDeclaration | DocParameterTag): boolean {
  const type = qc.is.kind(DocParameterTag, node) ? node.typeExpression && node.typeExpression.type : node.type;
  return (node as ParameterDeclaration).dot3Token !== undefined || (!!type && type.kind === Syntax.DocVariadicType);
}
export function hasTypeArguments(node: Node): node is HasTypeArguments {
  return !!(node as HasTypeArguments).typeArguments;
}
export const enum AssignmentKind {
  None,
  Definite,
  Compound,
}
export function getAssignmentTargetKind(node: Node): AssignmentKind {
  let parent = node.parent;
  while (true) {
    switch (parent.kind) {
      case Syntax.BinaryExpression:
        const binaryOperator = (<BinaryExpression>parent).operatorToken.kind;
        return syntax.is.assignmentOperator(binaryOperator) && (<BinaryExpression>parent).left === node
          ? binaryOperator === Syntax.EqualsToken
            ? AssignmentKind.Definite
            : AssignmentKind.Compound
          : AssignmentKind.None;
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        const unaryOperator = (<PrefixUnaryExpression | PostfixUnaryExpression>parent).operator;
        return unaryOperator === Syntax.Plus2Token || unaryOperator === Syntax.Minus2Token ? AssignmentKind.Compound : AssignmentKind.None;
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        return (<ForInOrOfStatement>parent).initializer === node ? AssignmentKind.Definite : AssignmentKind.None;
      case Syntax.ParenthesizedExpression:
      case Syntax.ArrayLiteralExpression:
      case Syntax.SpreadElement:
      case Syntax.NonNullExpression:
        node = parent;
        break;
      case Syntax.ShorthandPropertyAssignment:
        if ((parent as ShorthandPropertyAssignment).name !== node) return AssignmentKind.None;
        node = parent.parent;
        break;
      case Syntax.PropertyAssignment:
        if ((parent as ShorthandPropertyAssignment).name === node) return AssignmentKind.None;
        node = parent.parent;
        break;
      default:
        return AssignmentKind.None;
    }
    parent = node.parent;
  }
}
export function isAssignmentTarget(node: Node): boolean {
  return getAssignmentTargetKind(node) !== AssignmentKind.None;
}
export type NodeWithPossibleHoistedDeclaration =
  | Block
  | VariableStatement
  | WithStatement
  | IfStatement
  | SwitchStatement
  | CaseBlock
  | CaseClause
  | DefaultClause
  | LabeledStatement
  | ForStatement
  | ForInStatement
  | ForOfStatement
  | DoStatement
  | WhileStatement
  | TryStatement
  | CatchClause;
export function isNodeWithPossibleHoistedDeclaration(node: Node): node is NodeWithPossibleHoistedDeclaration {
  switch (node.kind) {
    case Syntax.Block:
    case Syntax.VariableStatement:
    case Syntax.WithStatement:
    case Syntax.IfStatement:
    case Syntax.SwitchStatement:
    case Syntax.CaseBlock:
    case Syntax.CaseClause:
    case Syntax.DefaultClause:
    case Syntax.LabeledStatement:
    case Syntax.ForStatement:
    case Syntax.ForInStatement:
    case Syntax.ForOfStatement:
    case Syntax.DoStatement:
    case Syntax.WhileStatement:
    case Syntax.TryStatement:
    case Syntax.CatchClause:
      return true;
  }
  return false;
}
export type ValueSignatureDeclaration = FunctionDeclaration | MethodDeclaration | ConstructorDeclaration | AccessorDeclaration | FunctionExpression | ArrowFunction;
export function isValueSignatureDeclaration(node: Node): node is ValueSignatureDeclaration {
  return qc.is.kind(FunctionExpression, node) || qc.is.kind(ArrowFunction, node) || qc.is.methodOrAccessor(node) || qc.is.kind(FunctionDeclaration, node) || qc.is.kind(ConstructorDeclaration, node);
}
function walkUp(node: Node, kind: Syntax) {
  while (node && node.kind === kind) {
    node = node.parent;
  }
  return node;
}
export function walkUpParenthesizedTypes(node: Node) {
  return walkUp(node, Syntax.ParenthesizedType);
}
export function walkUpParenthesizedExpressions(node: Node) {
  return walkUp(node, Syntax.ParenthesizedExpression);
}
export function getDeclarationFromName(name: Node): Declaration | undefined {
  const parent = name.parent;
  switch (name.kind) {
    case Syntax.StringLiteral:
    case Syntax.NoSubstitutionLiteral:
    case Syntax.NumericLiteral:
      if (qc.is.kind(ComputedPropertyName, parent)) return parent.parent;
    case Syntax.Identifier:
      if (qc.is.declaration(parent)) return parent.name === name ? parent : undefined;
      else if (qc.is.kind(QualifiedName, parent)) {
        const tag = parent.parent;
        return qc.is.kind(DocParameterTag, tag) && tag.name === parent ? tag : undefined;
      } else {
        const binExp = parent.parent;
        return qc.is.kind(BinaryExpression, binExp) &&
          getAssignmentDeclarationKind(binExp) !== AssignmentDeclarationKind.None &&
          (binExp.left.symbol || binExp.symbol) &&
          getNameOfDeclaration(binExp) === name
          ? binExp
          : undefined;
      }
    case Syntax.PrivateIdentifier:
      return qc.is.declaration(parent) && parent.name === name ? parent : undefined;
    default:
      return;
  }
}
export function isLiteralComputedPropertyDeclarationName(node: Node) {
  return StringLiteral.orNumericLiteralLike(node) && node.parent.kind === Syntax.ComputedPropertyName && qc.is.declaration(node.parent.parent);
}
export function isIdentifierName(node: Identifier): boolean {
  let parent = node.parent;
  switch (parent.kind) {
    case Syntax.PropertyDeclaration:
    case Syntax.PropertySignature:
    case Syntax.MethodDeclaration:
    case Syntax.MethodSignature:
    case Syntax.GetAccessor:
    case Syntax.SetAccessor:
    case Syntax.EnumMember:
    case Syntax.PropertyAssignment:
    case Syntax.PropertyAccessExpression:
      return (<NamedDeclaration | PropertyAccessExpression>parent).name === node;
    case Syntax.QualifiedName:
      if ((<QualifiedName>parent).right === node) {
        while (parent.kind === Syntax.QualifiedName) {
          parent = parent.parent;
        }
        return parent.kind === Syntax.TypeQuery || parent.kind === Syntax.TypeReference;
      }
      return false;
    case Syntax.BindingElement:
    case Syntax.ImportSpecifier:
      return (<BindingElement | ImportSpecifier>parent).propertyName === node;
    case Syntax.ExportSpecifier:
    case Syntax.JsxAttribute:
      return true;
  }
  return false;
}
export function isAliasSymbolDeclaration(node: Node): boolean {
  return (
    node.kind === Syntax.ImportEqualsDeclaration ||
    node.kind === Syntax.NamespaceExportDeclaration ||
    (node.kind === Syntax.ImportClause && !!(<ImportClause>node).name) ||
    node.kind === Syntax.NamespaceImport ||
    node.kind === Syntax.NamespaceExport ||
    node.kind === Syntax.ImportSpecifier ||
    node.kind === Syntax.ExportSpecifier ||
    (node.kind === Syntax.ExportAssignment && exportAssignmentIsAlias(<ExportAssignment>node)) ||
    (qc.is.kind(BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.ModuleExports && exportAssignmentIsAlias(node)) ||
    (qc.is.kind(PropertyAccessExpression, node) &&
      qc.is.kind(BinaryExpression, node.parent) &&
      node.parent.left === node &&
      node.parent.operatorToken.kind === Syntax.EqualsToken &&
      isAliasableExpression(node.parent.right)) ||
    node.kind === Syntax.ShorthandPropertyAssignment ||
    (node.kind === Syntax.PropertyAssignment && isAliasableExpression((node as PropertyAssignment).initializer))
  );
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
export function isAliasableExpression(e: Expression) {
  return isEntityNameExpression(e) || qc.is.kind(ClassExpression, e);
}
export function exportAssignmentIsAlias(node: ExportAssignment | BinaryExpression): boolean {
  const e = getExportAssignmentExpression(node);
  return isAliasableExpression(e);
}
export function getExportAssignmentExpression(node: ExportAssignment | BinaryExpression): Expression {
  return qc.is.kind(ExportAssignment, node) ? node.expression : node.right;
}
export function getPropertyAssignmentAliasLikeExpression(node: PropertyAssignment | ShorthandPropertyAssignment | PropertyAccessExpression): Expression {
  return node.kind === Syntax.ShorthandPropertyAssignment ? node.name : node.kind === Syntax.PropertyAssignment ? node.initializer : (node.parent as BinaryExpression).right;
}
export function getEffectiveBaseTypeNode(node: ClassLikeDeclaration | InterfaceDeclaration) {
  const baseType = getClassExtendsHeritageElement(node);
  if (baseType && isInJSFile(node)) {
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
  if (isInJSFile(node)) return qc.getDoc.implementsTags(node).map((n) => n.class);
  else {
    const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ImplementsKeyword);
    return heritageClause?.types;
  }
}
export function getAllSuperTypeNodes(node: Node): readonly TypeNode[] {
  return qc.is.kind(InterfaceDeclaration, node)
    ? getInterfaceBaseTypeNodes(node) || emptyArray
    : qc.is.classLike(node)
    ? concatenate(singleElementArray(getEffectiveBaseTypeNode(node)), getEffectiveImplementsTypeNodes(node)) || emptyArray
    : emptyArray;
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
export function getAncestor(node: Node | undefined, kind: Syntax): Node | undefined {
  while (node) {
    if (node.kind === kind) return node;
    node = node.parent;
  }
  return;
}
export function isIdentifierANonContextualKeyword({ originalKeywordKind }: Identifier): boolean {
  return !!originalKeywordKind && !syntax.is.contextualKeyword(originalKeywordKind);
}
export const enum FunctionFlags {
  Normal = 0,
  Generator = 1 << 0,
  Async = 1 << 1,
  Invalid = 1 << 2,
  AsyncGenerator = Async | Generator,
}
export function getFunctionFlags(node: SignatureDeclaration | undefined) {
  if (!node) return FunctionFlags.Invalid;
  let flags = FunctionFlags.Normal;
  switch (node.kind) {
    case Syntax.FunctionDeclaration:
    case Syntax.FunctionExpression:
    case Syntax.MethodDeclaration:
      if (node.asteriskToken) {
        flags |= FunctionFlags.Generator;
      }
    case Syntax.ArrowFunction:
      if (hasSyntacticModifier(node, ModifierFlags.Async)) {
        flags |= FunctionFlags.Async;
      }
      break;
  }
  if (!(node as FunctionLikeDeclaration).body) {
    flags |= FunctionFlags.Invalid;
  }
  return flags;
}
export function hasDynamicName(declaration: Declaration): declaration is DynamicNamedDeclaration | DynamicNamedBinaryExpression {
  const name = getNameOfDeclaration(declaration);
  return !!name && isDynamicName(name);
}
export function isDynamicName(name: DeclarationName): boolean {
  if (!(name.kind === Syntax.ComputedPropertyName || name.kind === Syntax.ElementAccessExpression)) return false;
  const expr = qc.is.kind(ElementAccessExpression, name) ? name.argumentExpression : name.expression;
  return !StringLiteral.orNumericLiteralLike(expr) && !qc.is.signedNumericLiteral(expr) && !isWellKnownSymbolSyntactically(expr);
}
export function isWellKnownSymbolSyntactically(node: Node): node is WellKnownSymbolExpression {
  return qc.is.kind(PropertyAccessExpression, node) && isESSymbolIdentifier(node.expression);
}
export function getPropertyNameForPropertyNameNode(name: PropertyName): __String | undefined {
  switch (name.kind) {
    case Syntax.Identifier:
    case Syntax.PrivateIdentifier:
      return name.escapedText;
    case Syntax.StringLiteral:
    case Syntax.NumericLiteral:
      return syntax.get.escUnderscores(name.text);
    case Syntax.ComputedPropertyName:
      const nameExpression = name.expression;
      if (isWellKnownSymbolSyntactically(nameExpression)) return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>nameExpression).name));
      else if (StringLiteral.orNumericLiteralLike(nameExpression)) return syntax.get.escUnderscores(nameExpression.text);
      else if (qc.is.signedNumericLiteral(nameExpression)) {
        if (nameExpression.operator === Syntax.MinusToken) return (Token.toString(nameExpression.operator) + nameExpression.operand.text) as __String;
        return nameExpression.operand.text as __String;
      }
      return;
    default:
      return Debug.assertNever(name);
  }
}
export type PropertyNameLiteral = Identifier | StringLiteralLike | NumericLiteral;
export function isPropertyNameLiteral(node: Node): node is PropertyNameLiteral {
  switch (node.kind) {
    case Syntax.Identifier:
    case Syntax.StringLiteral:
    case Syntax.NoSubstitutionLiteral:
    case Syntax.NumericLiteral:
      return true;
    default:
      return false;
  }
}
export function getTextOfIdentifierOrLiteral(node: PropertyNameLiteral): string {
  return qc.is.identifierOrPrivateIdentifier(node) ? idText(node) : node.text;
}
export function getEscapedTextOfIdentifierOrLiteral(node: PropertyNameLiteral): __String {
  return qc.is.identifierOrPrivateIdentifier(node) ? node.escapedText : syntax.get.escUnderscores(node.text);
}
export function getPropertyNameForKnownSymbolName(symbolName: string): __String {
  return ('__@' + symbolName) as __String;
}
export function isESSymbolIdentifier(node: Node): boolean {
  return node.kind === Syntax.Identifier && (<Identifier>node).escapedText === 'Symbol';
}
export function isPushOrUnshiftIdentifier(node: Identifier) {
  return node.escapedText === 'push' || node.escapedText === 'unshift';
}
export function isParameterDeclaration(node: VariableLikeDeclaration) {
  const root = getRootDeclaration(node);
  return root.kind === Syntax.Parameter;
}
export function getRootDeclaration(node: Node): Node {
  while (node.kind === Syntax.BindingElement) {
    node = node.parent.parent;
  }
  return node;
}
export function nodeStartsNewLexicalEnvironment(node: Node): boolean {
  const kind = node.kind;
  return (
    kind === Syntax.Constructor ||
    kind === Syntax.FunctionExpression ||
    kind === Syntax.FunctionDeclaration ||
    kind === Syntax.ArrowFunction ||
    kind === Syntax.MethodDeclaration ||
    kind === Syntax.GetAccessor ||
    kind === Syntax.SetAccessor ||
    kind === Syntax.ModuleDeclaration ||
    kind === Syntax.SourceFile
  );
}
export function getOriginalSourceFile(sourceFile: SourceFile) {
  return qc.get.parseTreeOf(sourceFile, isSourceFile) || sourceFile;
}
export function getExpressionAssociativity(expression: Expression) {
  const operator = getOperator(expression);
  const hasArguments = expression.kind === Syntax.NewExpression && (<NewExpression>expression).arguments !== undefined;
  return syntax.get.operatorAssociativity(expression.kind, operator, hasArguments);
}
export function getExpressionPrecedence(expression: Expression) {
  const operator = getOperator(expression);
  const hasArguments = expression.kind === Syntax.NewExpression && (<NewExpression>expression).arguments !== undefined;
  return syntax.get.operatorPrecedence(expression.kind, operator, hasArguments);
}
export function getOperator(expression: Expression): Syntax {
  if (expression.kind === Syntax.BinaryExpression) return (<BinaryExpression>expression).operatorToken.kind;
  else if (expression.kind === Syntax.PrefixUnaryExpression || expression.kind === Syntax.PostfixUnaryExpression) return (<PrefixUnaryExpression | PostfixUnaryExpression>expression).operator;
  return expression.kind;
}
export function createDiagnosticCollection(): DiagnosticCollection {
  let nonFileDiagnostics = ([] as Diagnostic[]) as SortedArray<Diagnostic>;
  const filesWithDiagnostics = ([] as string[]) as SortedArray<string>;
  const fileDiagnostics = new QMap<SortedArray<DiagnosticWithLocation>>();
  let hasReadNonFileDiagnostics = false;
  return {
    add,
    lookup,
    getGlobalDiagnostics,
    getDiagnostics,
    reattachFileDiagnostics,
  };
  function reattachFileDiagnostics(newFile: SourceFile): void {
    forEach(fileqd.get(newFile.fileName), (diagnostic) => (diagnostic.file = newFile));
  }
  function lookup(diagnostic: Diagnostic): Diagnostic | undefined {
    let diagnostics: SortedArray<Diagnostic> | undefined;
    if (diagnostic.file) {
      diagnostics = fileqd.get(diagnostic.file.fileName);
    } else {
      diagnostics = nonFileDiagnostics;
    }
    if (!diagnostics) {
      return;
    }
    const result = binarySearch(diagnostics, diagnostic, identity, compareDiagnosticsSkipRelatedInformation);
    if (result >= 0) return diagnostics[result];
    return;
  }
  function add(diagnostic: Diagnostic): void {
    let diagnostics: SortedArray<Diagnostic> | undefined;
    if (diagnostic.file) {
      diagnostics = fileqd.get(diagnostic.file.fileName);
      if (!diagnostics) {
        diagnostics = ([] as Diagnostic[]) as SortedArray<DiagnosticWithLocation>;
        fileqd.set(diagnostic.file.fileName, diagnostics as SortedArray<DiagnosticWithLocation>);
        insertSorted(filesWithDiagnostics, diagnostic.file.fileName, compareStringsCaseSensitive);
      }
    } else {
      if (hasReadNonFileDiagnostics) {
        hasReadNonFileDiagnostics = false;
        nonFileDiagnostics = nonFileqd.slice() as SortedArray<Diagnostic>;
      }
      diagnostics = nonFileDiagnostics;
    }
    insertSorted(diagnostics, diagnostic, compareDiagnostics);
  }
  function getGlobalDiagnostics(): Diagnostic[] {
    hasReadNonFileDiagnostics = true;
    return nonFileDiagnostics;
  }
  function getDiagnostics(fileName: string): DiagnosticWithLocation[];
  function getDiagnostics(): Diagnostic[];
  function getDiagnostics(fileName?: string): Diagnostic[] {
    if (fileName) return fileqd.get(fileName) || [];
    const fileDiags: Diagnostic[] = flatMapToMutable(filesWithDiagnostics, (f) => fileqd.get(f));
    if (!nonFileqd.length) return fileDiags;
    fileDiags.unshift(...nonFileDiagnostics);
    return fileDiags;
  }
}
const templateSubstitutionRegExp = /\$\{/g;
function escapeTemplateSubstitution(str: string): string {
  return str.replace(templateSubstitutionRegExp, '\\${');
}
export function hasInvalidEscape(template: TemplateLiteral): boolean {
  return template && !!(qc.is.kind(NoSubstitutionLiteral, template) ? template.templateFlags : template.head.templateFlags || some(template.templateSpans, (span) => !!span.literal.templateFlags));
}
const doubleQuoteEscapedCharsRegExp = /[\\\"\u0000-\u001f\t\v\f\b\r\n\u2028\u2029\u0085]/g;
const singleQuoteEscapedCharsRegExp = /[\\\'\u0000-\u001f\t\v\f\b\r\n\u2028\u2029\u0085]/g;
const backtickQuoteEscapedCharsRegExp = /[\\`]/g;
const escapedCharsMap = new QMap({
  '\t': '\\t',
  '\v': '\\v',
  '\f': '\\f',
  '\b': '\\b',
  '\r': '\\r',
  '\n': '\\n',
  '\\': '\\\\',
  '"': '\\"',
  "'": "\\'",
  '`': '\\`',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
  '\u0085': '\\u0085',
});
function encodeUtf16EscapeSequence(cc: number): string {
  const hexCharCode = cc.toString(16).toUpperCase();
  const paddedHexCode = ('0000' + hexCharCode).slice(-4);
  return '\\u' + paddedHexCode;
}
function getReplacement(c: string, offset: number, input: string) {
  if (c.charCodeAt(0) === Codes.nullCharacter) {
    const lookAhead = input.charCodeAt(offset + c.length);
    if (lookAhead >= Codes._0 && lookAhead <= Codes._9) return '\\x00';
    return '\\0';
  }
  return escapedCharsMap.get(c) || encodeUtf16EscapeSequence(c.charCodeAt(0));
}
export function escapeString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote | Codes.backtick): string {
  const escapedCharsRegExp = quoteChar === Codes.backtick ? backtickQuoteEscapedCharsRegExp : quoteChar === Codes.singleQuote ? singleQuoteEscapedCharsRegExp : doubleQuoteEscapedCharsRegExp;
  return s.replace(escapedCharsRegExp, getReplacement);
}
const nonAsciiCharacters = /[^\u0000-\u007F]/g;
export function escapeNonAsciiString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote | Codes.backtick): string {
  s = escapeString(s, quoteChar);
  return nonAsciiCharacters.test(s) ? s.replace(nonAsciiCharacters, (c) => encodeUtf16EscapeSequence(c.charCodeAt(0))) : s;
}
const jsxDoubleQuoteEscapedCharsRegExp = /[\"\u0000-\u001f\u2028\u2029\u0085]/g;
const jsxSingleQuoteEscapedCharsRegExp = /[\'\u0000-\u001f\u2028\u2029\u0085]/g;
const jsxEscapedCharsMap = new QMap({
  '"': '&quot;',
  "'": '&apos;',
});
function encodeJsxCharacterEntity(cc: number): string {
  const hexCharCode = cc.toString(16).toUpperCase();
  return '&#x' + hexCharCode + ';';
}
function getJsxAttributeStringReplacement(c: string) {
  if (c.charCodeAt(0) === Codes.nullCharacter) return '&#0;';
  return jsxEscapedCharsMap.get(c) || encodeJsxCharacterEntity(c.charCodeAt(0));
}
export function escapeJsxAttributeString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote) {
  const escapedCharsRegExp = quoteChar === Codes.singleQuote ? jsxSingleQuoteEscapedCharsRegExp : jsxDoubleQuoteEscapedCharsRegExp;
  return s.replace(escapedCharsRegExp, getJsxAttributeStringReplacement);
}
export function stripQuotes(name: string) {
  const length = name.length;
  if (length >= 2 && name.charCodeAt(0) === name.charCodeAt(length - 1) && isQuoteOrBacktick(name.charCodeAt(0))) return name.substring(1, length - 1);
  return name;
}
function isQuoteOrBacktick(cc: number) {
  return cc === Codes.singleQuote || cc === Codes.doubleQuote || cc === Codes.backtick;
}
export function isIntrinsicJsxName(name: __String | string) {
  const ch = (name as string).charCodeAt(0);
  return (ch >= Codes.a && ch <= Codes.z) || stringContains(name as string, '-');
}
const indentStrings: string[] = ['', '    '];
export function getIndentString(level: number) {
  if (indentStrings[level] === undefined) {
    indentStrings[level] = getIndentString(level - 1) + indentStrings[1];
  }
  return indentStrings[level];
}
export function getIndentSize() {
  return indentStrings[1].length;
}
export function createTextWriter(newLine: string): EmitTextWriter {
  let output: string;
  let indent: number;
  let lineStart: boolean;
  let lineCount: number;
  let linePos: number;
  let hasTrailingComment = false;
  function updateLineCountAndPosFor(s: string) {
    const s2 = syntax.get.lineStarts(s);
    if (s2.length > 1) {
      lineCount = lineCount + s2.length - 1;
      linePos = output.length - s.length + last(s2);
      lineStart = linePos - output.length === 0;
    } else {
      lineStart = false;
    }
  }
  function writeText(s: string) {
    if (s && s.length) {
      if (lineStart) {
        s = getIndentString(indent) + s;
        lineStart = false;
      }
      output += s;
      updateLineCountAndPosFor(s);
    }
  }
  function write(s: string) {
    if (s) hasTrailingComment = false;
    writeText(s);
  }
  function writeComment(s: string) {
    if (s) hasTrailingComment = true;
    writeText(s);
  }
  function reset(): void {
    output = '';
    indent = 0;
    lineStart = true;
    lineCount = 0;
    linePos = 0;
    hasTrailingComment = false;
  }
  function rawWrite(s: string) {
    if (s !== undefined) {
      output += s;
      updateLineCountAndPosFor(s);
      hasTrailingComment = false;
    }
  }
  function writeLiteral(s: string) {
    if (s && s.length) {
      write(s);
    }
  }
  function writeLine(force?: boolean) {
    if (!lineStart || force) {
      output += newLine;
      lineCount++;
      linePos = output.length;
      lineStart = true;
      hasTrailingComment = false;
    }
  }
  function getTextPosWithWriteLine() {
    return lineStart ? output.length : output.length + newLine.length;
  }
  reset();
  return {
    write,
    rawWrite,
    writeLiteral,
    writeLine,
    increaseIndent: () => {
      indent++;
    },
    decreaseIndent: () => {
      indent--;
    },
    getIndent: () => indent,
    getTextPos: () => output.length,
    getLine: () => lineCount,
    getColumn: () => (lineStart ? indent * getIndentSize() : output.length - linePos),
    getText: () => output,
    isAtStartOfLine: () => lineStart,
    hasTrailingComment: () => hasTrailingComment,
    hasTrailingWhitespace: () => !!output.length && syntax.is.whiteSpaceLike(output.charCodeAt(output.length - 1)),
    clear: reset,
    reportInaccessibleThisError: noop,
    reportPrivateInBaseOfClassExpression: noop,
    reportInaccessibleUniqueSymbolError: noop,
    trackSymbol: noop,
    writeKeyword: write,
    writeOperator: write,
    writeParameter: write,
    writeProperty: write,
    writePunctuation: write,
    writeSpace: write,
    writeStringLiteral: write,
    writeSymbol: (s, _) => write(s),
    writeTrailingSemicolon: write,
    writeComment,
    getTextPosWithWriteLine,
  };
}
export function getTrailingSemicolonDeferringWriter(writer: EmitTextWriter): EmitTextWriter {
  let pendingTrailingSemicolon = false;
  function commitPendingTrailingSemicolon() {
    if (pendingTrailingSemicolon) {
      writer.writeTrailingSemicolon(';');
      pendingTrailingSemicolon = false;
    }
  }
  return {
    ...writer,
    writeTrailingSemicolon() {
      pendingTrailingSemicolon = true;
    },
    writeLiteral(s) {
      commitPendingTrailingSemicolon();
      writer.writeLiteral(s);
    },
    writeStringLiteral(s) {
      commitPendingTrailingSemicolon();
      writer.writeStringLiteral(s);
    },
    writeSymbol(s, sym) {
      commitPendingTrailingSemicolon();
      writer.writeSymbol(s, sym);
    },
    writePunctuation(s) {
      commitPendingTrailingSemicolon();
      writer.writePunctuation(s);
    },
    writeKeyword(s) {
      commitPendingTrailingSemicolon();
      writer.writeKeyword(s);
    },
    writeOperator(s) {
      commitPendingTrailingSemicolon();
      writer.writeOperator(s);
    },
    writeParameter(s) {
      commitPendingTrailingSemicolon();
      writer.writeParameter(s);
    },
    writeSpace(s) {
      commitPendingTrailingSemicolon();
      writer.writeSpace(s);
    },
    writeProperty(s) {
      commitPendingTrailingSemicolon();
      writer.writeProperty(s);
    },
    writeComment(s) {
      commitPendingTrailingSemicolon();
      writer.writeComment(s);
    },
    writeLine() {
      commitPendingTrailingSemicolon();
      writer.writeLine();
    },
    increaseIndent() {
      commitPendingTrailingSemicolon();
      writer.increaseIndent();
    },
    decreaseIndent() {
      commitPendingTrailingSemicolon();
      writer.decreaseIndent();
    },
  };
}
export function hostUsesCaseSensitiveFileNames(host: { useCaseSensitiveFileNames?(): boolean }): boolean {
  return host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : false;
}
export function hostGetCanonicalFileName(host: { useCaseSensitiveFileNames?(): boolean }): GetCanonicalFileName {
  return createGetCanonicalFileName(hostUsesCaseSensitiveFileNames(host));
}
export interface ResolveModuleNameResolutionHost {
  getCanonicalFileName(p: string): string;
  getCommonSourceDirectory(): string;
  getCurrentDirectory(): string;
}
export function getResolvedExternalModuleName(host: ResolveModuleNameResolutionHost, file: SourceFile, referenceFile?: SourceFile): string {
  return file.moduleName || getExternalModuleNameFromPath(host, file.fileName, referenceFile && referenceFile.fileName);
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
export function getExternalModuleNameFromPath(host: ResolveModuleNameResolutionHost, fileName: string, referencePath?: string): string {
  const getCanonicalFileName = (f: string) => host.getCanonicalFileName(f);
  const dir = toPath(referencePath ? getDirectoryPath(referencePath) : host.getCommonSourceDirectory(), host.getCurrentDirectory(), getCanonicalFileName);
  const filePath = getNormalizedAbsolutePath(fileName, host.getCurrentDirectory());
  const relativePath = getRelativePathToDirectoryOrUrl(dir, filePath, dir, getCanonicalFileName, false);
  const extensionless = removeFileExtension(relativePath);
  return referencePath ? ensurePathIsNonModuleName(extensionless) : extensionless;
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
export function getSourceFilesToEmit(host: EmitHost, targetSourceFile?: SourceFile, forceDtsEmit?: boolean): readonly SourceFile[] {
  const options = host.getCompilerOptions();
  if (options.outFile || options.out) {
    const moduleKind = getEmitModuleKind(options);
    const moduleEmitEnabled = options.emitDeclarationOnly || moduleKind === ModuleKind.AMD || moduleKind === ModuleKind.System;
    return filter(host.getSourceFiles(), (sourceFile) => (moduleEmitEnabled || !qp_isExternalModule(sourceFile)) && sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
  } else {
    const sourceFiles = targetSourceFile === undefined ? host.getSourceFiles() : [targetSourceFile];
    return filter(sourceFiles, (sourceFile) => sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
  }
}
export function sourceFileMayBeEmitted(sourceFile: SourceFile, host: SourceFileMayBeEmittedHost, forceDtsEmit?: boolean) {
  const options = host.getCompilerOptions();
  return (
    !(options.noEmitForJsFiles && isSourceFileJS(sourceFile)) &&
    !sourceFile.isDeclarationFile &&
    !host.isSourceFileFromExternalLibrary(sourceFile) &&
    !(isJsonSourceFile(sourceFile) && host.getResolvedProjectReferenceToRedirect(sourceFile.fileName)) &&
    (forceDtsEmit || !host.isSourceOfProjectReferenceRedirect(sourceFile.fileName))
  );
}
export function getSourceFilePathInNewDir(fileName: string, host: EmitHost, newDirPath: string): string {
  return getSourceFilePathInNewDirWorker(fileName, newDirPath, host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getSourceFilePathInNewDirWorker(fileName: string, newDirPath: string, currentDirectory: string, commonSourceDirectory: string, getCanonicalFileName: GetCanonicalFileName): string {
  let sourceFilePath = getNormalizedAbsolutePath(fileName, currentDirectory);
  const isSourceFileInCommonSourceDirectory = getCanonicalFileName(sourceFilePath).indexOf(getCanonicalFileName(commonSourceDirectory)) === 0;
  sourceFilePath = isSourceFileInCommonSourceDirectory ? sourceFilePath.substring(commonSourceDirectory.length) : sourceFilePath;
  return combinePaths(newDirPath, sourceFilePath);
}
export function writeFile(host: { writeFile: WriteFileCallback }, diagnostics: DiagnosticCollection, fileName: string, data: string, writeByteOrderMark: boolean, sourceFiles?: readonly SourceFile[]) {
  host.writeFile(
    fileName,
    data,
    writeByteOrderMark,
    (hostErrorMessage) => {
      diagnostics.add(createCompilerDiagnostic(qd.Could_not_write_file_0_Colon_1, fileName, hostErrorMessage));
    },
    sourceFiles
  );
}
function ensureDirectoriesExist(directoryPath: string, createDirectory: (path: string) => void, directoryExists: (path: string) => boolean): void {
  if (directoryPath.length > getRootLength(directoryPath) && !directoryExists(directoryPath)) {
    const parentDirectory = getDirectoryPath(directoryPath);
    ensureDirectoriesExist(parentDirectory, createDirectory, directoryExists);
    createDirectory(directoryPath);
  }
}
export function writeFileEnsuringDirectories(
  path: string,
  data: string,
  writeByteOrderMark: boolean,
  writeFile: (path: string, data: string, writeByteOrderMark: boolean) => void,
  createDirectory: (path: string) => void,
  directoryExists: (path: string) => boolean
): void {
  try {
    writeFile(path, data, writeByteOrderMark);
  } catch {
    ensureDirectoriesExist(getDirectoryPath(normalizePath(path)), createDirectory, directoryExists);
    writeFile(path, data, writeByteOrderMark);
  }
}
export function getLineOfLocalPosition(sourceFile: SourceFile, pos: number) {
  const s = syntax.get.lineStarts(sourceFile);
  return Scanner.lineOf(s, pos);
}
export function getLineOfLocalPositionFromLineMap(lineMap: readonly number[], pos: number) {
  return Scanner.lineOf(lineMap, pos);
}
export function getFirstConstructorWithBody(node: ClassLikeDeclaration): (ConstructorDeclaration & { body: FunctionBody }) | undefined {
  return find(node.members, (member): member is ConstructorDeclaration & { body: FunctionBody } => qc.is.kind(ConstructorDeclaration, member) && qc.is.present(member.body));
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
  if (signature.parameters.length && !qc.is.kind(DocSignature, signature)) {
    const thisParameter = signature.parameters[0];
    if (parameterIsThisKeyword(thisParameter)) return thisParameter;
  }
}
export function parameterIsThisKeyword(parameter: ParameterDeclaration): boolean {
  return isThisNodeKind(Identifier, parameter.name);
}
export function isThisNodeKind(Identifier, node: Node | undefined): boolean {
  return !!node && node.kind === Syntax.Identifier && identifierIsThisKeyword(node as Identifier);
}
export function identifierIsThisKeyword(id: Identifier): boolean {
  return id.originalKeywordKind === Syntax.ThisKeyword;
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
      if (qc.is.accessor(member) && hasSyntacticModifier(member, ModifierFlags.Static) === hasSyntacticModifier(accessor, ModifierFlags.Static)) {
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
export function getEffectiveTypeAnnotationNode(node: Node): TypeNode | undefined {
  if (!isInJSFile(node) && qc.is.kind(FunctionDeclaration, node)) return;
  const type = (node as HasType).type;
  if (type || !isInJSFile(node)) return type;
  return qc.isDoc.propertyLikeTag(node) ? node.typeExpression && node.typeExpression.type : qc.getDoc.type(node);
}
export function getTypeAnnotationNode(node: Node): TypeNode | undefined {
  return (node as HasType).type;
}
export function getEffectiveReturnTypeNode(node: SignatureDeclaration | DocSignature): TypeNode | undefined {
  return qc.is.kind(DocSignature, node) ? node.type && node.type.typeExpression && node.type.typeExpression.type : node.type || (isInJSFile(node) ? qc.getDoc.returnType(node) : undefined);
}
function isNonTypeAliasTemplate(tag: DocTag): tag is DocTemplateTag {
  return qc.is.kind(DocTemplateTag, tag) && !(tag.parent.kind === Syntax.DocComment && tag.parent.tags!.some(isDocTypeAlias));
}
export function getEffectiveSetAccessorTypeAnnotationNode(node: SetAccessorDeclaration): TypeNode | undefined {
  const parameter = getSetAccessorValueParameter(node);
  return parameter && getEffectiveTypeAnnotationNode(parameter);
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
export function emitComments(
  text: string,
  lineMap: readonly number[],
  writer: EmitTextWriter,
  comments: readonly CommentRange[] | undefined,
  leadingSeparator: boolean,
  trailingSeparator: boolean,
  newLine: string,
  writeComment: (text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void
) {
  if (comments && comments.length > 0) {
    if (leadingSeparator) {
      writer.writeSpace(' ');
    }
    let emitInterveningSeparator = false;
    for (const comment of comments) {
      if (emitInterveningSeparator) {
        writer.writeSpace(' ');
        emitInterveningSeparator = false;
      }
      writeComment(text, lineMap, writer, comment.pos, comment.end, newLine);
      if (comment.hasTrailingNewLine) {
        writer.writeLine();
      } else {
        emitInterveningSeparator = true;
      }
    }
    if (emitInterveningSeparator && trailingSeparator) {
      writer.writeSpace(' ');
    }
  }
}
export function emitDetachedComments(
  text: string,
  lineMap: readonly number[],
  writer: EmitTextWriter,
  writeComment: (text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void,
  node: TextRange,
  newLine: string,
  removeComments: boolean
) {
  let leadingComments: CommentRange[] | undefined;
  let currentDetachedCommentInfo: { nodePos: number; detachedCommentEndPos: number } | undefined;
  if (removeComments) {
    if (node.pos === 0) {
      leadingComments = filter(syntax.get.leadingCommentRanges(text, node.pos), isPinnedCommentLocal);
    }
  } else {
    leadingComments = syntax.get.leadingCommentRanges(text, node.pos);
  }
  if (leadingComments) {
    const detachedComments: CommentRange[] = [];
    let lastComment: CommentRange | undefined;
    for (const comment of leadingComments) {
      if (lastComment) {
        const lastCommentLine = getLineOfLocalPositionFromLineMap(lineMap, lastComment.end);
        const commentLine = getLineOfLocalPositionFromLineMap(lineMap, comment.pos);
        if (commentLine >= lastCommentLine + 2) {
          break;
        }
      }
      detachedComments.push(comment);
      lastComment = comment;
    }
    if (detachedComments.length) {
      const lastCommentLine = getLineOfLocalPositionFromLineMap(lineMap, last(detachedComments).end);
      const nodeLine = getLineOfLocalPositionFromLineMap(lineMap, syntax.skipTrivia(text, node.pos));
      if (nodeLine >= lastCommentLine + 2) {
        emitNewLineBeforeLeadingComments(lineMap, writer, node, leadingComments);
        emitComments(text, lineMap, writer, detachedComments, true, newLine, writeComment);
        currentDetachedCommentInfo = { nodePos: node.pos, detachedCommentEndPos: last(detachedComments).end };
      }
    }
  }
  return currentDetachedCommentInfo;
  function isPinnedCommentLocal(comment: CommentRange) {
    return isPinnedComment(text, comment.pos);
  }
}
export function writeCommentRange(text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) {
  if (text.charCodeAt(commentPos + 1) === Codes.asterisk) {
    const firstCommentLineAndChar = syntax.get.lineAndCharOf(lineMap, commentPos);
    const lineCount = lineMap.length;
    let firstCommentLineIndent: number | undefined;
    for (let pos = commentPos, currentLine = firstCommentLineAndChar.line; pos < commentEnd; currentLine++) {
      const nextLineStart = currentLine + 1 === lineCount ? text.length + 1 : lineMap[currentLine + 1];
      if (pos !== commentPos) {
        if (firstCommentLineIndent === undefined) {
          firstCommentLineIndent = calculateIndent(text, lineMap[firstCommentLineAndChar.line], commentPos);
        }
        const currentWriterIndentSpacing = writer.getIndent() * getIndentSize();
        const spacesToEmit = currentWriterIndentSpacing - firstCommentLineIndent + calculateIndent(text, pos, nextLineStart);
        if (spacesToEmit > 0) {
          let numberOfSingleSpacesToEmit = spacesToEmit % getIndentSize();
          const indentSizeSpaceString = getIndentString((spacesToEmit - numberOfSingleSpacesToEmit) / getIndentSize());
          writer.rawWrite(indentSizeSpaceString);
          while (numberOfSingleSpacesToEmit) {
            writer.rawWrite(' ');
            numberOfSingleSpacesToEmit--;
          }
        } else {
          writer.rawWrite('');
        }
      }
      writeTrimmedCurrentLine(text, commentEnd, writer, newLine, pos, nextLineStart);
      pos = nextLineStart;
    }
  } else {
    writer.writeComment(text.substring(commentPos, commentEnd));
  }
}
function writeTrimmedCurrentLine(text: string, commentEnd: number, writer: EmitTextWriter, newLine: string, pos: number, nextLineStart: number) {
  const end = Math.min(commentEnd, nextLineStart - 1);
  const currentLineText = text.substring(pos, end).replace(/^\s+|\s+$/g, '');
  if (currentLineText) {
    writer.writeComment(currentLineText);
    if (end !== commentEnd) {
      writer.writeLine();
    }
  } else {
    writer.rawWrite(newLine);
  }
}
function calculateIndent(text: string, pos: number, end: number) {
  let currentLineIndent = 0;
  for (; pos < end && syntax.is.whiteSpaceSingleLine(text.charCodeAt(pos)); pos++) {
    if (text.charCodeAt(pos) === Codes.tab) {
      currentLineIndent += getIndentSize() - (currentLineIndent % getIndentSize());
    } else {
      currentLineIndent++;
    }
  }
  return currentLineIndent;
}
export function hasEffectiveModifiers(node: Node) {
  return getEffectiveModifierFlags(node) !== ModifierFlags.None;
}
export function hasSyntacticModifiers(node: Node) {
  return getSyntacticModifierFlags(node) !== ModifierFlags.None;
}
export function hasEffectiveModifier(node: Node, flags: ModifierFlags): boolean {
  return !!getSelectedEffectiveModifierFlags(node, flags);
}
export function hasSyntacticModifier(node: Node, flags: ModifierFlags): boolean {
  return !!getSelectedSyntacticModifierFlags(node, flags);
}
export function hasStaticModifier(node: Node): boolean {
  return hasSyntacticModifier(node, ModifierFlags.Static);
}
export function hasEffectiveReadonlyModifier(node: Node): boolean {
  return hasEffectiveModifier(node, ModifierFlags.Readonly);
}
export function getSelectedEffectiveModifierFlags(node: Node, flags: ModifierFlags): ModifierFlags {
  return getEffectiveModifierFlags(node) & flags;
}
export function getSelectedSyntacticModifierFlags(node: Node, flags: ModifierFlags): ModifierFlags {
  return getSyntacticModifierFlags(node) & flags;
}
function getModifierFlagsWorker(node: Node, includeDoc: boolean): ModifierFlags {
  if (node.kind >= Syntax.FirstToken && node.kind <= Syntax.LastToken) return ModifierFlags.None;
  if (!(node.modifierFlagsCache & ModifierFlags.HasComputedFlags)) {
    node.modifierFlagsCache = getSyntacticModifierFlagsNoCache(node) | ModifierFlags.HasComputedFlags;
  }
  if (includeDoc && !(node.modifierFlagsCache & ModifierFlags.HasComputedDocModifiers) && isInJSFile(node) && node.parent) {
    node.modifierFlagsCache |= qc.getDoc.modifierFlagsNoCache(node) | ModifierFlags.HasComputedDocModifiers;
  }
  return node.modifierFlagsCache & ~(ModifierFlags.HasComputedFlags | ModifierFlags.HasComputedDocModifiers);
}
export function getEffectiveModifierFlags(node: Node): ModifierFlags {
  return getModifierFlagsWorker(node, true);
}
export function getSyntacticModifierFlags(node: Node): ModifierFlags {
  return getModifierFlagsWorker(node, false);
}
export function getEffectiveModifierFlagsNoCache(node: Node): ModifierFlags {
  return getSyntacticModifierFlagsNoCache(node) | qc.getDoc.modifierFlagsNoCache(node);
}
export function getSyntacticModifierFlagsNoCache(node: Node): ModifierFlags {
  let flags = modifiersToFlags(node.modifiers);
  if (node.flags & NodeFlags.NestedNamespace || (node.kind === Syntax.Identifier && (<Identifier>node).isInDocNamespace)) {
    flags |= ModifierFlags.Export;
  }
  return flags;
}
export function modifiersToFlags(modifiers: Nodes<Modifier> | undefined) {
  let flags = ModifierFlags.None;
  if (modifiers) {
    for (const modifier of modifiers) {
      flags |= syntax.get.modifierFlag(modifier.kind);
    }
  }
  return flags;
}
export function tryGetClassExtendingExpressionWithTypeArguments(node: Node): ClassLikeDeclaration | undefined {
  const cls = tryGetClassImplementingOrExtendingExpressionWithTypeArguments(node);
  return cls && !cls.isImplements ? cls.class : undefined;
}
export interface ClassImplementingOrExtendingExpressionWithTypeArguments {
  readonly class: ClassLikeDeclaration;
  readonly isImplements: boolean;
}
export function tryGetClassImplementingOrExtendingExpressionWithTypeArguments(node: Node): ClassImplementingOrExtendingExpressionWithTypeArguments | undefined {
  return qc.is.kind(ExpressionWithTypeArguments, node) && qc.is.kind(HeritageClause, node.parent) && qc.is.classLike(node.parent.parent)
    ? { class: node.parent.parent, isImplements: node.parent.token === Syntax.ImplementsKeyword }
    : undefined;
}
export function isAssignmentExpression(node: Node, excludeCompoundAssignment: true): node is AssignmentExpression<EqualsToken>;
export function isAssignmentExpression(node: Node, excludeCompoundAssignment?: false): node is AssignmentExpression<AssignmentOperatorToken>;
export function isAssignmentExpression(node: Node, excludeCompoundAssignment?: boolean): node is AssignmentExpression<AssignmentOperatorToken> {
  return (
    qc.is.kind(BinaryExpression, node) &&
    (excludeCompoundAssignment ? node.operatorToken.kind === Syntax.EqualsToken : syntax.is.assignmentOperator(node.operatorToken.kind)) &&
    qc.is.leftHandSideExpression(node.left)
  );
}
export function isDestructuringAssignment(node: Node): node is DestructuringAssignment {
  if (isAssignmentExpression(node, true)) {
    const kind = node.left.kind;
    return kind === Syntax.ObjectLiteralExpression || kind === Syntax.ArrayLiteralExpression;
  }
  return false;
}
export function isExpressionWithTypeArgumentsInClassExtendsClause(node: Node): node is ExpressionWithTypeArguments {
  return tryGetClassExtendingExpressionWithTypeArguments(node) !== undefined;
}
export function isEntityNameExpression(node: Node): node is EntityNameExpression {
  return node.kind === Syntax.Identifier || isPropertyAccessEntityNameExpression(node);
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
export function isDottedName(node: Expression): boolean {
  return (
    node.kind === Syntax.Identifier ||
    node.kind === Syntax.ThisKeyword ||
    node.kind === Syntax.SuperKeyword ||
    (node.kind === Syntax.PropertyAccessExpression && isDottedName((<PropertyAccessExpression>node).expression)) ||
    (node.kind === Syntax.ParenthesizedExpression && isDottedName((<ParenthesizedExpression>node).expression))
  );
}
export function isPropertyAccessEntityNameExpression(node: Node): node is PropertyAccessEntityNameExpression {
  return qc.is.kind(PropertyAccessExpression, node) && qc.is.kind(Identifier, node.name) && isEntityNameExpression(node.expression);
}
export function tryGetPropertyAccessOrIdentifierToString(expr: Expression): string | undefined {
  if (qc.is.kind(PropertyAccessExpression, expr)) {
    const baseStr = tryGetPropertyAccessOrIdentifierToString(expr.expression);
    if (baseStr !== undefined) return baseStr + '.' + expr.name;
  } else if (qc.is.kind(Identifier, expr)) {
    return syntax.get.unescUnderscores(expr.escapedText);
  }
  return;
}
export function isPrototypeAccess(node: Node): node is BindableStaticAccessExpression {
  return isBindableStaticAccessExpression(node) && getElementOrPropertyAccessName(node) === 'prototype';
}
export function isRightSideOfQualifiedNameOrPropertyAccess(node: Node) {
  return (
    (node.parent.kind === Syntax.QualifiedName && (<QualifiedName>node.parent).right === node) ||
    (node.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>node.parent).name === node)
  );
}
export function isEmptyObjectLiteral(expression: Node): boolean {
  return expression.kind === Syntax.ObjectLiteralExpression && (<ObjectLiteralExpression>expression).properties.length === 0;
}
export function isEmptyArrayLiteral(expression: Node): boolean {
  return expression.kind === Syntax.ArrayLiteralExpression && (<ArrayLiteralExpression>expression).elements.length === 0;
}
export function tryExtractTSExtension(fileName: string): string | undefined {
  return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
}
function getExpandedCodes(input: string): number[] {
  const output: number[] = [];
  const length = input.length;
  for (let i = 0; i < length; i++) {
    const cc = input.charCodeAt(i);
    if (cc < 0x80) {
      output.push(cc);
    } else if (cc < 0x800) {
      output.push((cc >> 6) | 0b11000000);
      output.push((cc & 0b00111111) | 0b10000000);
    } else if (cc < 0x10000) {
      output.push((cc >> 12) | 0b11100000);
      output.push(((cc >> 6) & 0b00111111) | 0b10000000);
      output.push((cc & 0b00111111) | 0b10000000);
    } else if (cc < 0x20000) {
      output.push((cc >> 18) | 0b11110000);
      output.push(((cc >> 12) & 0b00111111) | 0b10000000);
      output.push(((cc >> 6) & 0b00111111) | 0b10000000);
      output.push((cc & 0b00111111) | 0b10000000);
    } else {
      assert(false, 'Unexpected code point');
    }
  }
  return output;
}
const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export function convertToBase64(input: string): string {
  let result = '';
  const ccs = getExpandedCodes(input);
  let i = 0;
  const length = ccs.length;
  let byte1: number, byte2: number, byte3: number, byte4: number;
  while (i < length) {
    byte1 = ccs[i] >> 2;
    byte2 = ((ccs[i] & 0b00000011) << 4) | (ccs[i + 1] >> 4);
    byte3 = ((ccs[i + 1] & 0b00001111) << 2) | (ccs[i + 2] >> 6);
    byte4 = ccs[i + 2] & 0b00111111;
    if (i + 1 >= length) {
      byte3 = byte4 = 64;
    } else if (i + 2 >= length) {
      byte4 = 64;
    }
    result += base64Digits.charAt(byte1) + base64Digits.charAt(byte2) + base64Digits.charAt(byte3) + base64Digits.charAt(byte4);
    i += 3;
  }
  return result;
}
function getStringFromExpandedCodes(codes: number[]): string {
  let output = '';
  let i = 0;
  const length = codes.length;
  while (i < length) {
    const cc = codes[i];
    if (cc < 0x80) {
      output += String.fromCharCode(cc);
      i++;
    } else if ((cc & 0b11000000) === 0b11000000) {
      let value = cc & 0b00111111;
      i++;
      let nextCode: number = codes[i];
      while ((nextCode & 0b11000000) === 0b10000000) {
        value = (value << 6) | (nextCode & 0b00111111);
        i++;
        nextCode = codes[i];
      }
      output += String.fromCharCode(value);
    } else {
      output += String.fromCharCode(cc);
      i++;
    }
  }
  return output;
}
export function base64encode(host: { base64encode?(input: string): string } | undefined, input: string): string {
  if (host && host.base64encode) return host.base64encode(input);
  return convertToBase64(input);
}
export function base64decode(host: { base64decode?(input: string): string } | undefined, input: string): string {
  if (host && host.base64decode) return host.base64decode(input);
  const length = input.length;
  const expandedCodes: number[] = [];
  let i = 0;
  while (i < length) {
    if (input.charCodeAt(i) === base64Digits.charCodeAt(64)) {
      break;
    }
    const ch1 = base64Digits.indexOf(input[i]);
    const ch2 = base64Digits.indexOf(input[i + 1]);
    const ch3 = base64Digits.indexOf(input[i + 2]);
    const ch4 = base64Digits.indexOf(input[i + 3]);
    const code1 = ((ch1 & 0b00111111) << 2) | ((ch2 >> 4) & 0b00000011);
    const code2 = ((ch2 & 0b00001111) << 4) | ((ch3 >> 2) & 0b00001111);
    const code3 = ((ch3 & 0b00000011) << 6) | (ch4 & 0b00111111);
    if (code2 === 0 && ch3 !== 0) {
      expandedCodes.push(code1);
    } else if (code3 === 0 && ch4 !== 0) {
      expandedCodes.push(code1, code2);
    } else {
      expandedCodes.push(code1, code2, code3);
    }
    i += 4;
  }
  return getStringFromExpandedCodes(expandedCodes);
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
export function isDeclarationNameOfEnumOrNamespace(node: Identifier) {
  const parseNode = qc.get.parseTreeOf(node);
  if (parseNode) {
    switch (parseNode.parent.kind) {
      case Syntax.EnumDeclaration:
      case Syntax.ModuleDeclaration:
        return parseNode === (<EnumDeclaration | ModuleDeclaration>parseNode.parent).name;
    }
  }
  return false;
}
export function getInitializedVariables(node: VariableDeclarationList) {
  return filter(node.declarations, isInitializedVariable);
}
function isInitializedVariable(node: VariableDeclaration) {
  return node.initializer !== undefined;
}
export function isWatchSet(options: CompilerOptions) {
  return options.watch && options.hasOwnProperty('watch');
}
export function closeFileWatcher(watcher: FileWatcher) {
  watcher.close();
}
export function isWriteOnlyAccess(node: Node) {
  return accessKind(node) === AccessKind.Write;
}
export function isWriteAccess(node: Node) {
  return accessKind(node) !== AccessKind.Read;
}
const enum AccessKind {
  Read,
  Write,
  ReadWrite,
}
function accessKind(n: Node): AccessKind {
  const { parent } = n;
  if (!parent) return AccessKind.Read;
  switch (parent.kind) {
    case Syntax.ParenthesizedExpression:
      return accessKind(parent);
    case Syntax.PostfixUnaryExpression:
    case Syntax.PrefixUnaryExpression:
      const { operator } = parent as PrefixUnaryExpression | PostfixUnaryExpression;
      return operator === Syntax.Plus2Token || operator === Syntax.Minus2Token ? writeOrReadWrite() : AccessKind.Read;
    case Syntax.BinaryExpression:
      const { left, operatorToken } = parent as BinaryExpression;
      return left === n && syntax.is.assignmentOperator(operatorToken.kind) ? (operatorToken.kind === Syntax.EqualsToken ? AccessKind.Write : writeOrReadWrite()) : AccessKind.Read;
    case Syntax.PropertyAccessExpression:
      return (parent as PropertyAccessExpression).name !== n ? AccessKind.Read : accessKind(parent);
    case Syntax.PropertyAssignment: {
      const parentAccess = accessKind(parent.parent);
      return n === (parent as PropertyAssignment).name ? reverseAccessKind(parentAccess) : parentAccess;
    }
    case Syntax.ShorthandPropertyAssignment:
      return n === (parent as ShorthandPropertyAssignment).objectAssignmentInitializer ? AccessKind.Read : accessKind(parent.parent);
    case Syntax.ArrayLiteralExpression:
      return accessKind(parent);
    default:
      return AccessKind.Read;
  }
  function writeOrReadWrite(): AccessKind {
    const skipParenthesesUp = (n: Node) => {
      while (n.kind === Syntax.ParenthesizedExpression) {
        n = n.parent;
      }
      return n;
    };
    return parent.parent && skipParenthesesUp(parent.parent).kind === Syntax.ExpressionStatement ? AccessKind.Write : AccessKind.ReadWrite;
  }
}
function reverseAccessKind(a: AccessKind): AccessKind {
  switch (a) {
    case AccessKind.Read:
      return AccessKind.Write;
    case AccessKind.Write:
      return AccessKind.Read;
    case AccessKind.ReadWrite:
      return AccessKind.ReadWrite;
    default:
      return Debug.assertNever(a);
  }
}
export function compareDataObjects(dst: any, src: any): boolean {
  if (!dst || !src || Object.keys(dst).length !== Object.keys(src).length) return false;
  for (const e in dst) {
    if (typeof dst[e] === 'object') {
      if (!compareDataObjects(dst[e], src[e])) return false;
    } else if (typeof dst[e] !== 'function') {
      if (dst[e] !== src[e]) return false;
    }
  }
  return true;
}
export function clearMap<T>(map: { forEach: QMap<T>['forEach']; clear: QMap<T>['clear'] }, onDeleteValue: (valueInMap: T, key: string) => void) {
  map.forEach(onDeleteValue);
  map.clear();
}
export interface MutateMapSkippingNewValuesOptions<T, U> {
  onDeleteValue(existingValue: T, key: string): void;
  onExistingValue?(existingValue: T, valueInNewMap: U, key: string): void;
}
export function mutateMapSkippingNewValues<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, options: MutateMapSkippingNewValuesOptions<T, U>) {
  const { onDeleteValue, onExistingValue } = options;
  map.forEach((existingValue, key) => {
    const valueInNewMap = newMap.get(key);
    if (valueInNewMap === undefined) {
      map.delete(key);
      onDeleteValue(existingValue, key);
    } else if (onExistingValue) {
      onExistingValue(existingValue, valueInNewMap, key);
    }
  });
}
export interface MutateMapOptions<T, U> extends MutateMapSkippingNewValuesOptions<T, U> {
  createNewValue(key: string, valueInNewMap: U): T;
}
export function mutateMap<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, options: MutateMapOptions<T, U>) {
  mutateMapSkippingNewValues(map, newMap, options);
  const { createNewValue } = options;
  newMap.forEach((valueInNewMap, key) => {
    if (!map.has(key)) {
      map.set(key, createNewValue(key, valueInNewMap));
    }
  });
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
  return qc.is.kind(StringLiteral, moduleSpecifier) ? moduleSpecifier.text : qc.get.textOf(moduleSpecifier);
}
export function getLastChild(n: Node): Node | undefined {
  let lastChild: Node | undefined;
  qc.forEach.child(
    n,
    (child) => {
      if (qc.is.present(child)) lastChild = child;
    },
    (children) => {
      for (let i = children.length - 1; i >= 0; i--) {
        if (qc.is.present(children[i])) {
          lastChild = children[i];
          break;
        }
      }
    }
  );
  return lastChild;
}
export function addToSeen(seen: QMap<true>, key: string | number): boolean;
export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T): boolean;
export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T = true as any): boolean {
  key = String(key);
  if (seen.has(key)) return false;
  seen.set(key, value);
  return true;
}
export function isObjectTypeDeclaration(n: Node): n is ObjectTypeDeclaration {
  return qc.is.classLike(n) || qc.is.kind(InterfaceDeclaration, n) || qc.is.kind(TypeLiteralNode, n);
}
export function isAccessExpression(node: Node): node is AccessExpression {
  return node.kind === Syntax.PropertyAccessExpression || node.kind === Syntax.ElementAccessExpression;
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
export function isNamedImportsOrExports(node: Node): node is NamedImportsOrExports {
  return node.kind === Syntax.NamedImports || node.kind === Syntax.NamedExports;
}
export function formatStringFromArgs(text: string, args: ArrayLike<string | number>, baseIndex = 0): string {
  return text.replace(/{(\d+)}/g, (_match, index: string) => '' + Debug.checkDefined(args[+index + baseIndex]));
}
export let localizedDiagnosticMessages: MapLike<string> | undefined;
export function setLocalizedDiagnosticMessages(messages: typeof localizedDiagnosticMessages) {
  localizedDiagnosticMessages = messages;
}
export function getLocaleSpecificMessage(message: DiagnosticMessage) {
  return (localizedDiagnosticMessages && localizedDiagnosticMessages[message.key]) || message.message;
}
export function createFileDiagnostic(file: SourceFile, start: number, length: number, message: DiagnosticMessage, ...args: (string | number | undefined)[]): DiagnosticWithLocation;
export function createFileDiagnostic(file: SourceFile, start: number, length: number, message: DiagnosticMessage): DiagnosticWithLocation {
  Debug.assertGreaterThanOrEqual(start, 0);
  Debug.assertGreaterThanOrEqual(length, 0);
  if (file) {
    Debug.assertLessThanOrEqual(start, file.text.length);
    Debug.assertLessThanOrEqual(start + length, file.text.length);
  }
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 4) {
    text = formatStringFromArgs(text, arguments, 4);
  }
  return {
    file,
    start,
    length,
    messageText: text,
    category: message.category,
    code: message.code,
    reportsUnnecessary: message.reportsUnnecessary,
  };
}
export function formatMessage(_dummy: any, message: DiagnosticMessage, ...args: (string | number | undefined)[]): string;
export function formatMessage(_dummy: any, message: DiagnosticMessage): string {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 2) {
    text = formatStringFromArgs(text, arguments, 2);
  }
  return text;
}
export function createCompilerDiagnostic(message: DiagnosticMessage, ...args: (string | number | undefined)[]): Diagnostic;
export function createCompilerDiagnostic(message: DiagnosticMessage): Diagnostic {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 1) {
    text = formatStringFromArgs(text, arguments, 1);
  }
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    messageText: text,
    category: message.category,
    code: message.code,
    reportsUnnecessary: message.reportsUnnecessary,
  };
}
export function createCompilerDiagnosticFromMessageChain(chain: DiagnosticMessageChain): Diagnostic {
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    code: chain.code,
    category: chain.category,
    messageText: chain.next ? chain : chain.messageText,
  };
}
export function chainDiagnosticMessages(
  details: DiagnosticMessageChain | DiagnosticMessageChain[] | undefined,
  message: DiagnosticMessage,
  ...args: (string | number | undefined)[]
): DiagnosticMessageChain;
export function chainDiagnosticMessages(details: DiagnosticMessageChain | DiagnosticMessageChain[] | undefined, message: DiagnosticMessage): DiagnosticMessageChain {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 2) {
    text = formatStringFromArgs(text, arguments, 2);
  }
  return {
    messageText: text,
    category: message.category,
    code: message.code,
    next: details === undefined || Array.isArray(details) ? details : [details],
  };
}
export function concatenateDiagnosticMessageChains(headChain: DiagnosticMessageChain, tailChain: DiagnosticMessageChain): void {
  let lastChain = headChain;
  while (lastChain.next) {
    lastChain = lastChain.next[0];
  }
  lastChain.next = [tailChain];
}
function getDiagnosticFilePath(diagnostic: Diagnostic): string | undefined {
  return diagnostic.file ? diagnostic.file.path : undefined;
}
export function compareDiagnostics(d1: Diagnostic, d2: Diagnostic): Comparison {
  return compareDiagnosticsSkipRelatedInformation(d1, d2) || compareRelatedInformation(d1, d2) || Comparison.EqualTo;
}
export function compareDiagnosticsSkipRelatedInformation(d1: Diagnostic, d2: Diagnostic): Comparison {
  return (
    compareStringsCaseSensitive(getDiagnosticFilePath(d1), getDiagnosticFilePath(d2)) ||
    compareValues(d1.start, d2.start) ||
    compareValues(d1.length, d2.length) ||
    compareValues(d1.code, d2.code) ||
    compareMessageText(d1.messageText, d2.messageText) ||
    Comparison.EqualTo
  );
}
function compareRelatedInformation(d1: Diagnostic, d2: Diagnostic): Comparison {
  if (!d1.relatedInformation && !d2.relatedInformation) return Comparison.EqualTo;
  if (d1.relatedInformation && d2.relatedInformation) {
    return (
      compareValues(d1.relatedInformation.length, d2.relatedInformation.length) ||
      forEach(d1.relatedInformation, (d1i, index) => {
        const d2i = d2.relatedInformation![index];
        return compareDiagnostics(d1i, d2i);
      }) ||
      Comparison.EqualTo
    );
  }
  return d1.relatedInformation ? Comparison.LessThan : Comparison.GreaterThan;
}
function compareMessageText(t1: string | DiagnosticMessageChain, t2: string | DiagnosticMessageChain): Comparison {
  if (typeof t1 === 'string' && typeof t2 === 'string') return compareStringsCaseSensitive(t1, t2);
  if (typeof t1 === 'string') return Comparison.LessThan;
  if (typeof t2 === 'string') return Comparison.GreaterThan;
  let res = compareStringsCaseSensitive(t1.messageText, t2.messageText);
  if (res) return res;
  if (!t1.next && !t2.next) return Comparison.EqualTo;
  if (!t1.next) return Comparison.LessThan;
  if (!t2.next) return Comparison.GreaterThan;
  const len = Math.min(t1.next.length, t2.next.length);
  for (let i = 0; i < len; i++) {
    res = compareMessageText(t1.next[i], t2.next[i]);
    if (res) return res;
  }
  if (t1.next.length < t2.next.length) return Comparison.LessThan;
  else if (t1.next.length > t2.next.length) return Comparison.GreaterThan;
  return Comparison.EqualTo;
}
export function getEmitScriptTarget(compilerOptions: CompilerOptions) {
  return compilerOptions.target || ScriptTarget.ES2020;
}
export function getEmitModuleKind(compilerOptions: { module?: CompilerOptions['module']; target?: CompilerOptions['target'] }) {
  return typeof compilerOptions.module === 'number' ? compilerOptions.module : ModuleKind.ES2015;
}
export function getEmitModuleResolutionKind(compilerOptions: CompilerOptions) {
  let moduleResolution = compilerOptions.moduleResolution;
  if (moduleResolution === undefined) {
    moduleResolution = getEmitModuleKind(compilerOptions) === ModuleKind.CommonJS ? ModuleResolutionKind.NodeJs : ModuleResolutionKind.Classic;
  }
  return moduleResolution;
}
export function hasJsonModuleEmitEnabled(options: CompilerOptions) {
  switch (getEmitModuleKind(options)) {
    case ModuleKind.CommonJS:
    case ModuleKind.AMD:
    case ModuleKind.ES2015:
    case ModuleKind.ES2020:
    case ModuleKind.ESNext:
      return true;
    default:
      return false;
  }
}
export function unreachableCodeIsError(options: CompilerOptions): boolean {
  return options.allowUnreachableCode === false;
}
export function unusedLabelIsError(options: CompilerOptions): boolean {
  return options.allowUnusedLabels === false;
}
export function getAreDeclarationMapsEnabled(options: CompilerOptions) {
  return !!(getEmitDeclarations(options) && options.declarationMap);
}
export function getAllowSyntheticDefaultImports(compilerOptions: CompilerOptions) {
  const moduleKind = getEmitModuleKind(compilerOptions);
  return compilerOptions.allowSyntheticDefaultImports !== undefined ? compilerOptions.allowSyntheticDefaultImports : compilerOptions.esModuleInterop || moduleKind === ModuleKind.System;
}
export function getEmitDeclarations(compilerOptions: CompilerOptions): boolean {
  return !!(compilerOptions.declaration || compilerOptions.composite);
}
export function isIncrementalCompilation(options: CompilerOptions) {
  return !!(options.incremental || options.composite);
}
export type StrictOptionName = 'noImplicitAny' | 'noImplicitThis' | 'strictNullChecks' | 'strictFunctionTypes' | 'strictBindCallApply' | 'strictPropertyInitialization' | 'alwaysStrict';
export function getStrictOptionValue(compilerOptions: CompilerOptions, flag: StrictOptionName): boolean {
  return compilerOptions[flag] === undefined ? !!compilerOptions.strict : !!compilerOptions[flag];
}
export function compilerOptionsAffectSemanticDiagnostics(newOptions: CompilerOptions, oldOptions: CompilerOptions): boolean {
  return oldOptions !== newOptions && semanticDiagnosticsOptionDeclarations.some((option) => !isJsonEqual(getCompilerOptionValue(oldOptions, option), getCompilerOptionValue(newOptions, option)));
}
export function compilerOptionsAffectEmit(newOptions: CompilerOptions, oldOptions: CompilerOptions): boolean {
  return oldOptions !== newOptions && affectsEmitOptionDeclarations.some((option) => !isJsonEqual(getCompilerOptionValue(oldOptions, option), getCompilerOptionValue(newOptions, option)));
}
export function getCompilerOptionValue(options: CompilerOptions, option: CommandLineOption): unknown {
  return option.strictFlag ? getStrictOptionValue(options, option.name as StrictOptionName) : options[option.name];
}
export function hasZeroOrOneAsteriskCharacter(str: string): boolean {
  let seenAsterisk = false;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === Codes.asterisk) {
      if (!seenAsterisk) {
        seenAsterisk = true;
      }
      return false;
    }
  }
  return true;
}
export function discoverProbableSymlinks(files: readonly SourceFile[], getCanonicalFileName: GetCanonicalFileName, cwd: string): QReadonlyMap<string> {
  const result = new QMap<string>();
  const symlinks = flatten<readonly [string, string]>(
    mapDefined(
      files,
      (sf) =>
        sf.resolvedModules &&
        compact(
          arrayFrom(
            mapIterator(sf.resolvedModules.values(), (res) => (res && res.originalPath && res.resolvedFileName !== res.originalPath ? ([res.resolvedFileName, res.originalPath] as const) : undefined))
          )
        )
    )
  );
  for (const [resolvedPath, originalPath] of symlinks) {
    const [commonResolved, commonOriginal] = guessDirectorySymlink(resolvedPath, originalPath, cwd, getCanonicalFileName);
    result.set(commonOriginal, commonResolved);
  }
  return result;
}
function guessDirectorySymlink(a: string, b: string, cwd: string, getCanonicalFileName: GetCanonicalFileName): [string, string] {
  const aParts = getPathComponents(toPath(a, cwd, getCanonicalFileName));
  const bParts = getPathComponents(toPath(b, cwd, getCanonicalFileName));
  while (
    !isNodeModulesOrScopedPackageDirectory(aParts[aParts.length - 2], getCanonicalFileName) &&
    !isNodeModulesOrScopedPackageDirectory(bParts[bParts.length - 2], getCanonicalFileName) &&
    getCanonicalFileName(aParts[aParts.length - 1]) === getCanonicalFileName(bParts[bParts.length - 1])
  ) {
    aParts.pop();
    bParts.pop();
  }
  return [getPathFromPathComponents(aParts), getPathFromPathComponents(bParts)];
}
function isNodeModulesOrScopedPackageDirectory(s: string, getCanonicalFileName: GetCanonicalFileName): boolean {
  return getCanonicalFileName(s) === 'node_modules' || startsWith(s, '@');
}
function stripLeadingDirectorySeparator(s: string): string | undefined {
  return syntax.is.dirSeparator(s.charCodeAt(0)) ? s.slice(1) : undefined;
}
export function tryRemoveDirectoryPrefix(path: string, dirPath: string, getCanonicalFileName: GetCanonicalFileName): string | undefined {
  const withoutPrefix = tryRemovePrefix(path, dirPath, getCanonicalFileName);
  return withoutPrefix === undefined ? undefined : stripLeadingDirectorySeparator(withoutPrefix);
}
const reservedCharacterPattern = /[^\w\s\/]/g;
export function regExpEscape(text: string) {
  return text.replace(reservedCharacterPattern, escapeRegExpCharacter);
}
function escapeRegExpCharacter(match: string) {
  return '\\' + match;
}
const wildcardCodes = [Codes.asterisk, Codes.question];
export const commonPackageFolders: readonly string[] = ['node_modules', 'bower_components', 'jspm_packages'];
const implicitExcludePathRegexPattern = `(?!(${commonPackageFolders.join('|')})(/|$))`;
interface WildcardMatcher {
  singleAsteriskRegexFragment: string;
  doubleAsteriskRegexFragment: string;
  replaceWildcardCharacter: (match: string) => string;
}
const filesMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '([^./]|(\\.(?!min\\.js$))?)*',
  doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, filesMatcher.singleAsteriskRegexFragment),
};
const directoriesMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '[^/]*',
  doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, directoriesMatcher.singleAsteriskRegexFragment),
};
const excludeMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '[^/]*',
  doubleAsteriskRegexFragment: '(/.+?)?',
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, excludeMatcher.singleAsteriskRegexFragment),
};
const wildcardMatchers = {
  files: filesMatcher,
  directories: directoriesMatcher,
  exclude: excludeMatcher,
};
export function getRegularExpressionForWildcard(specs: readonly string[] | undefined, basePath: string, usage: 'files' | 'directories' | 'exclude'): string | undefined {
  const patterns = getRegularExpressionsForWildcards(specs, basePath, usage);
  if (!patterns || !patterns.length) {
    return;
  }
  const pattern = patterns.map((pattern) => `(${pattern})`).join('|');
  const terminator = usage === 'exclude' ? '($|/)' : '$';
  return `^(${pattern})${terminator}`;
}
export function getRegularExpressionsForWildcards(specs: readonly string[] | undefined, basePath: string, usage: 'files' | 'directories' | 'exclude'): readonly string[] | undefined {
  if (specs === undefined || specs.length === 0) {
    return;
  }
  return flatMap(specs, (spec) => spec && getSubPatternFromSpec(spec, basePath, usage, wildcardMatchers[usage]));
}
export function isImplicitGlob(lastPathComponent: string): boolean {
  return !/[.*?]/.test(lastPathComponent);
}
function getSubPatternFromSpec(
  spec: string,
  basePath: string,
  usage: 'files' | 'directories' | 'exclude',
  { singleAsteriskRegexFragment, doubleAsteriskRegexFragment, replaceWildcardCharacter }: WildcardMatcher
): string | undefined {
  let subpattern = '';
  let hasWrittenComponent = false;
  const components = getNormalizedPathComponents(spec, basePath);
  const lastComponent = last(components);
  if (usage !== 'exclude' && lastComponent === '**') {
    return;
  }
  components[0] = removeTrailingDirectorySeparator(components[0]);
  if (isImplicitGlob(lastComponent)) {
    components.push('**', '*');
  }
  let optionalCount = 0;
  for (let component of components) {
    if (component === '**') {
      subpattern += doubleAsteriskRegexFragment;
    } else {
      if (usage === 'directories') {
        subpattern += '(';
        optionalCount++;
      }
      if (hasWrittenComponent) {
        subpattern += dirSeparator;
      }
      if (usage !== 'exclude') {
        let componentPattern = '';
        if (component.charCodeAt(0) === Codes.asterisk) {
          componentPattern += '([^./]' + singleAsteriskRegexFragment + ')?';
          component = component.substr(1);
        } else if (component.charCodeAt(0) === Codes.question) {
          componentPattern += '[^./]';
          component = component.substr(1);
        }
        componentPattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);
        if (componentPattern !== component) {
          subpattern += implicitExcludePathRegexPattern;
        }
        subpattern += componentPattern;
      } else {
        subpattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);
      }
    }
    hasWrittenComponent = true;
  }
  while (optionalCount > 0) {
    subpattern += ')?';
    optionalCount--;
  }
  return subpattern;
}
function replaceWildcardCharacter(match: string, singleAsteriskRegexFragment: string) {
  return match === '*' ? singleAsteriskRegexFragment : match === '?' ? '[^/]' : '\\' + match;
}
export interface FileSystemEntries {
  readonly files: readonly string[];
  readonly directories: readonly string[];
}
export interface FileMatcherPatterns {
  includeFilePatterns: readonly string[] | undefined;
  includeFilePattern: string | undefined;
  includeDirectoryPattern: string | undefined;
  excludePattern: string | undefined;
  basePaths: readonly string[];
}
export function getFileMatcherPatterns(
  path: string,
  excludes: readonly string[] | undefined,
  includes: readonly string[] | undefined,
  useCaseSensitiveFileNames: boolean,
  currentDirectory: string
): FileMatcherPatterns {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);
  const absolutePath = combinePaths(currentDirectory, path);
  return {
    includeFilePatterns: map(getRegularExpressionsForWildcards(includes, absolutePath, 'files'), (pattern) => `^${pattern}$`),
    includeFilePattern: getRegularExpressionForWildcard(includes, absolutePath, 'files'),
    includeDirectoryPattern: getRegularExpressionForWildcard(includes, absolutePath, 'directories'),
    excludePattern: getRegularExpressionForWildcard(excludes, absolutePath, 'exclude'),
    basePaths: getBasePaths(path, includes, useCaseSensitiveFileNames),
  };
}
export function getRegexFromPattern(pattern: string, useCaseSensitiveFileNames: boolean): RegExp {
  return new RegExp(pattern, useCaseSensitiveFileNames ? '' : 'i');
}
export function matchFiles(
  path: string,
  extensions: readonly string[] | undefined,
  excludes: readonly string[] | undefined,
  includes: readonly string[] | undefined,
  useCaseSensitiveFileNames: boolean,
  currentDirectory: string,
  depth: number | undefined,
  getFileSystemEntries: (path: string) => FileSystemEntries,
  realpath: (path: string) => string
): string[] {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);
  const patterns = getFileMatcherPatterns(path, excludes, includes, useCaseSensitiveFileNames, currentDirectory);
  const includeFileRegexes = patterns.includeFilePatterns && patterns.includeFilePatterns.map((pattern) => getRegexFromPattern(pattern, useCaseSensitiveFileNames));
  const includeDirectoryRegex = patterns.includeDirectoryPattern && getRegexFromPattern(patterns.includeDirectoryPattern, useCaseSensitiveFileNames);
  const excludeRegex = patterns.excludePattern && getRegexFromPattern(patterns.excludePattern, useCaseSensitiveFileNames);
  const results: string[][] = includeFileRegexes ? includeFileRegexes.map(() => []) : [[]];
  const visited = new QMap<true>();
  const toCanonical = createGetCanonicalFileName(useCaseSensitiveFileNames);
  for (const basePath of patterns.basePaths) {
    visitDirectory(basePath, combinePaths(currentDirectory, basePath), depth);
  }
  return flatten(results);
  function visitDirectory(path: string, absolutePath: string, depth: number | undefined) {
    const canonicalPath = toCanonical(realpath(absolutePath));
    if (visited.has(canonicalPath)) return;
    visited.set(canonicalPath, true);
    const { files, directories } = getFileSystemEntries(path);
    for (const current of sort<string>(files, compareStringsCaseSensitive)) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if (extensions && !fileExtensionIsOneOf(name, extensions)) continue;
      if (excludeRegex && excludeRegex.test(absoluteName)) continue;
      if (!includeFileRegexes) {
        results[0].push(name);
      } else {
        const includeIndex = findIndex(includeFileRegexes, (re) => re.test(absoluteName));
        if (includeIndex !== -1) {
          results[includeIndex].push(name);
        }
      }
    }
    if (depth !== undefined) {
      depth--;
      if (depth === 0) {
        return;
      }
    }
    for (const current of sort<string>(directories, compareStringsCaseSensitive)) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if ((!includeDirectoryRegex || includeDirectoryRegex.test(absoluteName)) && (!excludeRegex || !excludeRegex.test(absoluteName))) {
        visitDirectory(name, absoluteName, depth);
      }
    }
  }
}
function getBasePaths(path: string, includes: readonly string[] | undefined, useCaseSensitiveFileNames: boolean): string[] {
  const basePaths: string[] = [path];
  if (includes) {
    const includeBasePaths: string[] = [];
    for (const include of includes) {
      const absolute: string = isRootedDiskPath(include) ? include : normalizePath(combinePaths(path, include));
      includeBasePaths.push(getIncludeBasePath(absolute));
    }
    includeBasePaths.sort(getStringComparer(!useCaseSensitiveFileNames));
    for (const includeBasePath of includeBasePaths) {
      if (every(basePaths, (basePath) => !containsPath(basePath, includeBasePath, path, !useCaseSensitiveFileNames))) {
        basePaths.push(includeBasePath);
      }
    }
  }
  return basePaths;
}
function getIncludeBasePath(absolute: string): string {
  const wildcardOffset = indexOfAnyCharCode(absolute, wildcardCodes);
  if (wildcardOffset < 0) return !hasExtension(absolute) ? absolute : removeTrailingDirectorySeparator(getDirectoryPath(absolute));
  return absolute.substring(0, absolute.lastIndexOf(dirSeparator, wildcardOffset));
}
export function ensureScriptKind(fileName: string, scriptKind: ScriptKind | undefined): ScriptKind {
  return scriptKind || getScriptKindFromFileName(fileName) || ScriptKind.TS;
}
export function getScriptKindFromFileName(fileName: string): ScriptKind {
  const ext = fileName.substr(fileName.lastIndexOf('.'));
  switch (ext.toLowerCase()) {
    case Extension.Js:
      return ScriptKind.JS;
    case Extension.Jsx:
      return ScriptKind.JSX;
    case Extension.Ts:
      return ScriptKind.TS;
    case Extension.Tsx:
      return ScriptKind.TSX;
    case Extension.Json:
      return ScriptKind.JSON;
    default:
      return ScriptKind.Unknown;
  }
}
export const supportedTSExtensions: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts];
export const supportedTSExtensionsWithJson: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts, Extension.Json];
export const supportedTSExtensionsForExtractExtension: readonly Extension[] = [Extension.Dts, Extension.Ts, Extension.Tsx];
export const supportedJSExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx];
export const supportedJSAndJsonExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx, Extension.Json];
const allSupportedExtensions: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions];
const allSupportedExtensionsWithJson: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions, Extension.Json];
export function getSupportedExtensions(options?: CompilerOptions): readonly Extension[];
export function getSupportedExtensions(options?: CompilerOptions, extraFileExtensions?: readonly FileExtensionInfo[]): readonly string[];
export function getSupportedExtensions(options?: CompilerOptions, extraFileExtensions?: readonly FileExtensionInfo[]): readonly string[] {
  const needJsExtensions = options && options.allowJs;
  if (!extraFileExtensions || extraFileExtensions.length === 0) return needJsExtensions ? allSupportedExtensions : supportedTSExtensions;
  const extensions = [
    ...(needJsExtensions ? allSupportedExtensions : supportedTSExtensions),
    ...mapDefined(extraFileExtensions, (x) => (x.scriptKind === ScriptKind.Deferred || (needJsExtensions && isJSLike(x.scriptKind)) ? x.extension : undefined)),
  ];
  return deduplicate<string>(extensions, equateStringsCaseSensitive, compareStringsCaseSensitive);
}
export function getSuppoertedExtensionsWithJsonIfResolveJsonModule(options: CompilerOptions | undefined, supportedExtensions: readonly string[]): readonly string[] {
  if (!options || !options.resolveJsonModule) return supportedExtensions;
  if (supportedExtensions === allSupportedExtensions) return allSupportedExtensionsWithJson;
  if (supportedExtensions === supportedTSExtensions) return supportedTSExtensionsWithJson;
  return [...supportedExtensions, Extension.Json];
}
function isJSLike(scriptKind: ScriptKind | undefined): boolean {
  return scriptKind === ScriptKind.JS || scriptKind === ScriptKind.JSX;
}
export function hasJSFileExtension(fileName: string): boolean {
  return some(supportedJSExtensions, (extension) => fileExtensionIs(fileName, extension));
}
export function hasTSFileExtension(fileName: string): boolean {
  return some(supportedTSExtensions, (extension) => fileExtensionIs(fileName, extension));
}
export function isSupportedSourceFileName(fileName: string, compilerOptions?: CompilerOptions, extraFileExtensions?: readonly FileExtensionInfo[]) {
  if (!fileName) return false;
  const supportedExtensions = getSupportedExtensions(compilerOptions, extraFileExtensions);
  for (const extension of getSuppoertedExtensionsWithJsonIfResolveJsonModule(compilerOptions, supportedExtensions)) {
    if (fileExtensionIs(fileName, extension)) return true;
  }
  return false;
}
export const enum ExtensionPriority {
  TypeScriptFiles = 0,
  DeclarationAndJavaScriptFiles = 2,
  Highest = TypeScriptFiles,
  Lowest = DeclarationAndJavaScriptFiles,
}
export function getExtensionPriority(path: string, supportedExtensions: readonly string[]): ExtensionPriority {
  for (let i = supportedExtensions.length - 1; i >= 0; i--) {
    if (fileExtensionIs(path, supportedExtensions[i])) return adjustExtensionPriority(<ExtensionPriority>i, supportedExtensions);
  }
  return ExtensionPriority.Highest;
}
export function adjustExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
  if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) return ExtensionPriority.TypeScriptFiles;
  else if (extensionPriority < supportedExtensions.length) return ExtensionPriority.DeclarationAndJavaScriptFiles;
  return supportedExtensions.length;
}
export function getNextLowestExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
  if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) return ExtensionPriority.DeclarationAndJavaScriptFiles;
  return supportedExtensions.length;
}
const extensionsToRemove = [Extension.Dts, Extension.Ts, Extension.Js, Extension.Tsx, Extension.Jsx, Extension.Json];
export function removeFileExtension(path: string): string {
  for (const ext of extensionsToRemove) {
    const extensionless = tryRemoveExtension(path, ext);
    if (extensionless !== undefined) return extensionless;
  }
  return path;
}
export function tryRemoveExtension(path: string, extension: string): string | undefined {
  return fileExtensionIs(path, extension) ? removeExtension(path, extension) : undefined;
}
export function removeExtension(path: string, extension: string): string {
  return path.substring(0, path.length - extension.length);
}
export function changeExtension<T extends string | Path>(path: T, newExtension: string): T {
  return <T>changeAnyExtension(path, newExtension, extensionsToRemove, false);
}
export function tryParsePattern(pattern: string): Pattern | undefined {
  assert(hasZeroOrOneAsteriskCharacter(pattern));
  const indexOfStar = pattern.indexOf('*');
  return indexOfStar === -1
    ? undefined
    : {
        prefix: pattern.substr(0, indexOfStar),
        suffix: pattern.substr(indexOfStar + 1),
      };
}
export function extensionIsTS(ext: Extension): boolean {
  return ext === Extension.Ts || ext === Extension.Tsx || ext === Extension.Dts;
}
export function resolutionExtensionIsTSOrJson(ext: Extension) {
  return extensionIsTS(ext) || ext === Extension.Json;
}
export function extensionFromPath(path: string): Extension {
  const ext = tryGetExtensionFromPath(path);
  return ext !== undefined ? ext : fail(`File ${path} has unknown extension.`);
}
export function isAnySupportedFileExtension(path: string): boolean {
  return tryGetExtensionFromPath(path) !== undefined;
}
export function tryGetExtensionFromPath(path: string): Extension | undefined {
  return find<Extension>(extensionsToRemove, (e) => fileExtensionIs(path, e));
}
export function isCheckJsEnabledForFile(sourceFile: SourceFile, compilerOptions: CompilerOptions) {
  return sourceFile.checkJsDirective ? sourceFile.checkJsDirective.enabled : compilerOptions.checkJs;
}
export const emptyFileSystemEntries: FileSystemEntries = {
  files: emptyArray,
  directories: emptyArray,
};
export function matchPatternOrExact(patternStrings: readonly string[], candidate: string): string | Pattern | undefined {
  const patterns: Pattern[] = [];
  for (const patternString of patternStrings) {
    if (!hasZeroOrOneAsteriskCharacter(patternString)) continue;
    const pattern = tryParsePattern(patternString);
    if (pattern) {
      patterns.push(pattern);
    } else if (patternString === candidate) {
      return patternString;
    }
  }
  return findBestPatternMatch(patterns, (_) => _, candidate);
}
export type Mutable<T extends object> = { -readonly [K in keyof T]: T[K] };
export function sliceAfter<T>(arr: readonly T[], value: T): readonly T[] {
  const index = arr.indexOf(value);
  assert(index !== -1);
  return arr.slice(index);
}
export function addRelatedInfo<T extends Diagnostic>(diagnostic: T, ...relatedInformation: DiagnosticRelatedInformation[]): T {
  if (!relatedInformation.length) return diagnostic;
  if (!diagnostic.relatedInformation) {
    diagnostic.relatedInformation = [];
  }
  diagnostic.relatedInformation.push(...relatedInformation);
  return diagnostic;
}
export function minAndMax<T>(arr: readonly T[], getValue: (value: T) => number): { readonly min: number; readonly max: number } {
  assert(arr.length !== 0);
  let min = getValue(arr[0]);
  let max = min;
  for (let i = 1; i < arr.length; i++) {
    const value = getValue(arr[i]);
    if (value < min) {
      min = value;
    } else if (value > max) {
      max = value;
    }
  }
  return { min, max };
}
export interface ReadonlyNodeSet<TNode extends Node> {
  has(node: TNode): boolean;
  forEach(cb: (node: TNode) => void): void;
  some(pred: (node: TNode) => boolean): boolean;
}
export class NodeSet<TNode extends Node> implements ReadonlyNodeSet<TNode> {
  private map = new QMap<TNode>();
  add(node: TNode): void {
    this.map.set(String(getNodeId(node)), node);
  }
  tryAdd(node: TNode): boolean {
    if (this.has(node)) return false;
    this.add(node);
    return true;
  }
  has(node: TNode): boolean {
    return this.map.has(String(getNodeId(node)));
  }
  forEach(cb: (node: TNode) => void): void {
    this.map.forEach(cb);
  }
  some(pred: (node: TNode) => boolean): boolean {
    return qu.forEachEntry(this.map, pred) || false;
  }
}
export interface ReadonlyNodeMap<TNode extends Node, TValue> {
  get(node: TNode): TValue | undefined;
  has(node: TNode): boolean;
}
export class NodeMap<TNode extends Node, TValue> implements ReadonlyNodeMap<TNode, TValue> {
  private map = new QMap<{ node: TNode; value: TValue }>();
  get(node: TNode): TValue | undefined {
    const res = this.map.get(String(getNodeId(node)));
    return res && res.value;
  }
  getOrUpdate(node: TNode, setValue: () => TValue): TValue {
    const res = this.get(node);
    if (res) return res;
    const value = setValue();
    this.set(node, value);
    return value;
  }
  set(node: TNode, value: TValue): void {
    this.map.set(String(getNodeId(node)), { node, value });
  }
  has(node: TNode): boolean {
    return this.map.has(String(getNodeId(node)));
  }
  forEach(cb: (value: TValue, node: TNode) => void): void {
    this.map.forEach(({ node, value }) => cb(value, node));
  }
}
export interface HostWithIsSourceOfProjectReferenceRedirect {
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export function skipTypeChecking(sourceFile: SourceFile, options: CompilerOptions, host: HostWithIsSourceOfProjectReferenceRedirect) {
  return (options.skipLibCheck && sourceFile.isDeclarationFile) || (options.skipDefaultLibCheck && sourceFile.hasNoDefaultLib) || host.isSourceOfProjectReferenceRedirect(sourceFile.fileName);
}
export function isJsonEqual(a: unknown, b: unknown): boolean {
  return a === b || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && equalOwnProperties(a as MapLike<unknown>, b as MapLike<unknown>, isJsonEqual));
}
export function getOrUpdate<T>(map: QMap<T>, key: string, getDefault: () => T): T {
  const got = map.get(key);
  if (got === undefined) {
    const value = getDefault();
    map.set(key, value);
    return value;
  }
  return got;
}
export function parsePseudoBigInt(stringValue: string): string {
  let log2Base: number;
  switch (stringValue.charCodeAt(1)) {
    case Codes.b:
    case Codes.B:
      log2Base = 1;
      break;
    case Codes.o:
    case Codes.O:
      log2Base = 3;
      break;
    case Codes.x:
    case Codes.X:
      log2Base = 4;
      break;
    default:
      const nIndex = stringValue.length - 1;
      let nonZeroStart = 0;
      while (stringValue.charCodeAt(nonZeroStart) === Codes._0) {
        nonZeroStart++;
      }
      return stringValue.slice(nonZeroStart, nIndex) || '0';
  }
  const startIndex = 2,
    endIndex = stringValue.length - 1;
  const bitsNeeded = (endIndex - startIndex) * log2Base;
  const segments = new Uint16Array((bitsNeeded >>> 4) + (bitsNeeded & 15 ? 1 : 0));
  for (let i = endIndex - 1, bitOffset = 0; i >= startIndex; i--, bitOffset += log2Base) {
    const segment = bitOffset >>> 4;
    const digitChar = stringValue.charCodeAt(i);
    const digit = digitChar <= Codes._9 ? digitChar - Codes._0 : 10 + digitChar - (digitChar <= Codes.F ? Codes.A : Codes.a);
    const shiftedDigit = digit << (bitOffset & 15);
    segments[segment] |= shiftedDigit;
    const residual = shiftedDigit >>> 16;
    if (residual) segments[segment + 1] |= residual;
  }
  let base10Value = '';
  let firstNonzeroSegment = segments.length - 1;
  let segmentsRemaining = true;
  while (segmentsRemaining) {
    let mod10 = 0;
    segmentsRemaining = false;
    for (let segment = firstNonzeroSegment; segment >= 0; segment--) {
      const newSegment = (mod10 << 16) | segments[segment];
      const segmentValue = (newSegment / 10) | 0;
      segments[segment] = segmentValue;
      mod10 = newSegment - segmentValue * 10;
      if (segmentValue && !segmentsRemaining) {
        firstNonzeroSegment = segment;
        segmentsRemaining = true;
      }
    }
    base10Value = mod10 + base10Value;
  }
  return base10Value;
}
export function pseudoBigIntToString({ negative, base10Value }: PseudoBigInt): string {
  return (negative && base10Value !== '0' ? '-' : '') + base10Value;
}
export function isValidTypeOnlyAliasUseSite(useSite: Node): boolean {
  return (
    !!(useSite.flags & NodeFlags.Ambient) ||
    qc.is.partOfTypeQuery(useSite) ||
    isIdentifierInNonEmittingHeritageClause(useSite) ||
    isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(useSite) ||
    !qc.is.expressionNode(useSite)
  );
}
export function typeOnlyDeclarationIsExport(typeOnlyDeclaration: Node) {
  return typeOnlyDeclaration.kind === Syntax.ExportSpecifier;
}
function isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(node: Node) {
  while (node.kind === Syntax.Identifier || node.kind === Syntax.PropertyAccessExpression) {
    node = node.parent;
  }
  if (node.kind !== Syntax.ComputedPropertyName) return false;
  if (hasSyntacticModifier(node.parent, ModifierFlags.Abstract)) return true;
  const containerKind = node.parent.parent.kind;
  return containerKind === Syntax.InterfaceDeclaration || containerKind === Syntax.TypeLiteral;
}
function isIdentifierInNonEmittingHeritageClause(node: Node): boolean {
  if (node.kind !== Syntax.Identifier) return false;
  const heritageClause = Node.findAncestor(node.parent, (parent) => {
    switch (parent.kind) {
      case Syntax.HeritageClause:
        return true;
      case Syntax.PropertyAccessExpression:
      case Syntax.ExpressionWithTypeArguments:
        return false;
      default:
        return 'quit';
    }
  }) as HeritageClause | undefined;
  return heritageClause?.token === Syntax.ImplementsKeyword || heritageClause?.parent.kind === Syntax.InterfaceDeclaration;
}
export function isIdentifierTypeReference(node: Node): node is TypeReferenceNode & { typeName: Identifier } {
  return qc.is.kind(TypeReferenceNode, node) && qc.is.kind(Identifier, node.typeName);
}
export function arrayIsHomogeneous<T>(array: readonly T[], comparer: EqualityComparer<T> = equateValues) {
  if (array.length < 2) return true;
  const first = array[0];
  for (let i = 1, length = array.length; i < length; i++) {
    const target = array[i];
    if (!comparer(first, target)) return false;
  }
  return true;
}
export function getTextOfNodeFromSourceText(sourceText: string, node: Node, includeTrivia = false): string {
  if (qc.is.missing(node)) return '';
  let text = sourceText.substring(includeTrivia ? node.pos : syntax.skipTrivia(sourceText, node.pos), node.end);
  if (isDocTypeExpressionOrChild(node)) {
    text = text.replace(/(^|\r?\n|\r)\s*\*\s*/g, '$1');
  }
  return text;
}
export namespace semver {
  const versionRegExp = /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;
  const prereleaseRegExp = /^(?:0|[1-9]\d*|[a-z-][a-z0-9-]*)(?:\.(?:0|[1-9]\d*|[a-z-][a-z0-9-]*))*$/i;
  const buildRegExp = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i;
  const numericIdentifierRegExp = /^(0|[1-9]\d*)$/;
  export class Version {
    static readonly zero = new Version(0, 0, 0);
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly prerelease: readonly string[];
    readonly build: readonly string[];
    constructor(text: string);
    constructor(major: number, minor?: number, patch?: number, prerelease?: string, build?: string);
    constructor(major: number | string, minor = 0, patch = 0, prerelease = '', build = '') {
      if (typeof major === 'string') {
        const result = Debug.checkDefined(tryParseComponents(major), 'Invalid version');
        ({ major, minor, patch, prerelease, build } = result);
      }
      assert(major >= 0, 'Invalid argument: major');
      assert(minor >= 0, 'Invalid argument: minor');
      assert(patch >= 0, 'Invalid argument: patch');
      assert(!prerelease || prereleaseRegExp.test(prerelease), 'Invalid argument: prerelease');
      assert(!build || buildRegExp.test(build), 'Invalid argument: build');
      this.major = major;
      this.minor = minor;
      this.patch = patch;
      this.prerelease = prerelease ? prerelease.split('.') : emptyArray;
      this.build = build ? build.split('.') : emptyArray;
    }
    static tryParse(text: string) {
      const result = tryParseComponents(text);
      if (!result) return;
      const { major, minor, patch, prerelease, build } = result;
      return new Version(major, minor, patch, prerelease, build);
    }
    compareTo(other: Version | undefined) {
      if (this === other) return Comparison.EqualTo;
      if (other === undefined) return Comparison.GreaterThan;
      return (
        compareValues(this.major, other.major) || compareValues(this.minor, other.minor) || compareValues(this.patch, other.patch) || comparePrerelaseIdentifiers(this.prerelease, other.prerelease)
      );
    }
    increment(field: 'major' | 'minor' | 'patch') {
      switch (field) {
        case 'major':
          return new Version(this.major + 1, 0, 0);
        case 'minor':
          return new Version(this.major, this.minor + 1, 0);
        case 'patch':
          return new Version(this.major, this.minor, this.patch + 1);
        default:
          return Debug.assertNever(field);
      }
    }
    toString() {
      let result = `${this.major}.${this.minor}.${this.patch}`;
      if (some(this.prerelease)) result += `-${this.prerelease.join('.')}`;
      if (some(this.build)) result += `+${this.build.join('.')}`;
      return result;
    }
  }
  function tryParseComponents(text: string) {
    const match = versionRegExp.exec(text);
    if (!match) return;
    const [, major, minor = '0', patch = '0', prerelease = '', build = ''] = match;
    if (prerelease && !prereleaseRegExp.test(prerelease)) return;
    if (build && !buildRegExp.test(build)) return;
    return {
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease,
      build,
    };
  }
  function comparePrerelaseIdentifiers(left: readonly string[], right: readonly string[]) {
    if (left === right) return Comparison.EqualTo;
    if (left.length === 0) return right.length === 0 ? Comparison.EqualTo : Comparison.GreaterThan;
    if (right.length === 0) return Comparison.LessThan;
    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const leftIdentifier = left[i];
      const rightIdentifier = right[i];
      if (leftIdentifier === rightIdentifier) continue;
      const leftIsNumeric = numericIdentifierRegExp.test(leftIdentifier);
      const rightIsNumeric = numericIdentifierRegExp.test(rightIdentifier);
      if (leftIsNumeric || rightIsNumeric) {
        if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? Comparison.LessThan : Comparison.GreaterThan;
        const result = compareValues(+leftIdentifier, +rightIdentifier);
        if (result) return result;
      } else {
        const result = compareStringsCaseSensitive(leftIdentifier, rightIdentifier);
        if (result) return result;
      }
    }
    return compareValues(left.length, right.length);
  }
  export class VersionRange {
    private _alternatives: readonly (readonly Comparator[])[];
    constructor(spec: string) {
      this._alternatives = spec ? Debug.checkDefined(parseRange(spec), 'Invalid range spec.') : emptyArray;
    }
    static tryParse(text: string) {
      const sets = parseRange(text);
      if (sets) {
        const range = new VersionRange('');
        range._alternatives = sets;
        return range;
      }
      return;
    }
    test(version: Version | string) {
      if (typeof version === 'string') version = new Version(version);
      return testDisjunction(version, this._alternatives);
    }
    toString() {
      return formatDisjunction(this._alternatives);
    }
  }
  interface Comparator {
    readonly operator: '<' | '<=' | '>' | '>=' | '=';
    readonly operand: Version;
  }
  const logicalOrRegExp = /\s*\|\|\s*/g;
  const whitespaceRegExp = /\s+/g;
  const partialRegExp = /^([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;
  const hyphenRegExp = /^\s*([a-z0-9-+.*]+)\s+-\s+([a-z0-9-+.*]+)\s*$/i;
  const rangeRegExp = /^\s*(~|\^|<|<=|>|>=|=)?\s*([a-z0-9-+.*]+)$/i;
  function parseRange(text: string) {
    const alternatives: Comparator[][] = [];
    for (const range of text.trim().split(logicalOrRegExp)) {
      if (!range) continue;
      const comparators: Comparator[] = [];
      const match = hyphenRegExp.exec(range);
      if (match) {
        if (!parseHyphen(match[1], match[2], comparators)) return;
      } else {
        for (const simple of range.split(whitespaceRegExp)) {
          const match = rangeRegExp.exec(simple);
          if (!match || !parseComparator(match[1], match[2], comparators)) return;
        }
      }
      alternatives.push(comparators);
    }
    return alternatives;
  }
  function parsePartial(text: string) {
    const match = partialRegExp.exec(text);
    if (!match) return;
    const [, major, minor = '*', patch = '*', prerelease, build] = match;
    const version = new Version(
      isWildcard(major) ? 0 : parseInt(major, 10),
      isWildcard(major) || isWildcard(minor) ? 0 : parseInt(minor, 10),
      isWildcard(major) || isWildcard(minor) || isWildcard(patch) ? 0 : parseInt(patch, 10),
      prerelease,
      build
    );
    return { version, major, minor, patch };
  }
  function parseHyphen(left: string, right: string, comparators: Comparator[]) {
    const leftResult = parsePartial(left);
    if (!leftResult) return false;
    const rightResult = parsePartial(right);
    if (!rightResult) return false;
    if (!isWildcard(leftResult.major)) {
      comparators.push(createComparator('>=', leftResult.version));
    }
    if (!isWildcard(rightResult.major)) {
      comparators.push(
        isWildcard(rightResult.minor)
          ? createComparator('<', rightResult.version.increment('major'))
          : isWildcard(rightResult.patch)
          ? createComparator('<', rightResult.version.increment('minor'))
          : createComparator('<=', rightResult.version)
      );
    }
    return true;
  }
  function parseComparator(operator: string, text: string, comparators: Comparator[]) {
    const result = parsePartial(text);
    if (!result) return false;
    const { version, major, minor, patch } = result;
    if (!isWildcard(major)) {
      switch (operator) {
        case '~':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          break;
        case '^':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(version.major > 0 || isWildcard(minor) ? 'major' : version.minor > 0 || isWildcard(patch) ? 'minor' : 'patch')));
          break;
        case '<':
        case '>=':
          comparators.push(createComparator(operator, version));
          break;
        case '<=':
        case '>':
          comparators.push(
            isWildcard(minor)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('major'))
              : isWildcard(patch)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('minor'))
              : createComparator(operator, version)
          );
          break;
        case '=':
        case undefined:
          if (isWildcard(minor) || isWildcard(patch)) {
            comparators.push(createComparator('>=', version));
            comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          } else {
            comparators.push(createComparator('=', version));
          }
          break;
        default:
          return false;
      }
    } else if (operator === '<' || operator === '>') {
      comparators.push(createComparator('<', Version.zero));
    }
    return true;
  }
  function isWildcard(part: string) {
    return part === '*' || part === 'x' || part === 'X';
  }
  function createComparator(operator: Comparator['operator'], operand: Version) {
    return { operator, operand };
  }
  function testDisjunction(version: Version, alternatives: readonly (readonly Comparator[])[]) {
    if (alternatives.length === 0) return true;
    for (const alternative of alternatives) {
      if (testAlternative(version, alternative)) return true;
    }
    return false;
  }
  function testAlternative(version: Version, comparators: readonly Comparator[]) {
    for (const comparator of comparators) {
      if (!testComparator(version, comparator.operator, comparator.operand)) return false;
    }
    return true;
  }
  function testComparator(version: Version, operator: Comparator['operator'], operand: Version) {
    const cmp = version.compareTo(operand);
    switch (operator) {
      case '<':
        return cmp < 0;
      case '<=':
        return cmp <= 0;
      case '>':
        return cmp > 0;
      case '>=':
        return cmp >= 0;
      case '=':
        return cmp === 0;
      default:
        return Debug.assertNever(operator);
    }
  }
  function formatDisjunction(alternatives: readonly (readonly Comparator[])[]) {
    return map(alternatives, formatAlternative).join(' || ') || '*';
  }
  function formatAlternative(comparators: readonly Comparator[]) {
    return map(comparators, formatComparator).join(' ');
  }
  function formatComparator(comparator: Comparator) {
    return `${comparator.operator}${comparator.operand}`;
  }
}
