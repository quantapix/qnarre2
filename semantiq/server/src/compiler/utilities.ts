namespace core {
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
      if (!Node.is.prologueDirective(to[statementIndex])) break;
    }
    to.splice(statementIndex, 0, ...from);
    return to;
  }

  function insertStatementAfterPrologue<T extends Statement>(to: T[], statement: T | undefined, isPrologueDirective: (node: Node) => boolean): T[] {
    if (statement === undefined) return to;
    let statementIndex = 0;
    for (; statementIndex < to.length; ++statementIndex) {
      if (!Node.is.prologueDirective(to[statementIndex])) break;
    }
    to.splice(statementIndex, 0, statement);
    return to;
  }

  function isAnyPrologueDirective(node: Node) {
    return Node.is.prologueDirective(node) || !!(Node.get.emitFlags(node) & EmitFlags.CustomPrologue);
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

  export function getTokenPosOfNode(node: Node, sourceFile?: SourceFileLike, includeJsDoc?: boolean): number {
    if (Node.is.missing(node)) return node.pos;
    if (Node.isJSDoc.node(node)) return syntax.skipTrivia((sourceFile || Node.get.sourceFileOf(node)).text, node.pos, false, true);
    if (includeJsDoc && Node.is.withJSDocNodes(node)) return getTokenPosOfNode(node.jsDoc![0], sourceFile);
    if (node.kind === Syntax.SyntaxList && (<SyntaxList>node)._children.length > 0) {
      return getTokenPosOfNode((<SyntaxList>node)._children[0], sourceFile, includeJsDoc);
    }
    return syntax.skipTrivia((sourceFile || Node.get.sourceFileOf(node)).text, node.pos);
  }

  export function getNonDecoratorTokenPosOfNode(node: Node, sourceFile?: SourceFileLike): number {
    if (Node.is.missing(node) || !node.decorators) return getTokenPosOfNode(node, sourceFile);
    return syntax.skipTrivia((sourceFile || Node.get.sourceFileOf(node)).text, node.decorators.end);
  }

  export function getSourceTextOfNodeFromSourceFile(sourceFile: SourceFile, node: Node, includeTrivia = false): string {
    return getTextOfNodeFromSourceText(sourceFile.text, node, includeTrivia);
  }

  function isJSDocTypeExpressionOrChild(node: Node): boolean {
    return !!Node.findAncestor(node, isJSDocTypeExpression);
  }

  export function getTextOfNodeFromSourceText(sourceText: string, node: Node, includeTrivia = false): string {
    if (Node.is.missing(node)) return '';
    let text = sourceText.substring(includeTrivia ? node.pos : syntax.skipTrivia(sourceText, node.pos), node.end);
    if (isJSDocTypeExpressionOrChild(node)) {
      // strip space + asterisk at line start
      text = text.replace(/(^|\r?\n|\r)\s*\*\s*/g, '$1');
    }
    return text;
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
    return (Node.get.combinedFlagsOf(declaration) & NodeFlags.BlockScoped) !== 0 || isCatchClauseVariableDeclarationOrBindingElement(declaration);
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
    return !name || Node.get.fullWidth(name) === 0 ? '(Missing)' : Node.get.textOf(name);
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
        return Node.get.fullWidth(name) === 0 ? idText(name) : Node.get.textOf(name);
      case Syntax.QualifiedName:
        return entityNameToString(name.left) + '.' + entityNameToString(name.right);
      case Syntax.PropertyAccessExpression:
        if (Node.is.kind(Identifier, name.name) || Node.is.kind(PrivateIdentifier, name.name)) {
          return entityNameToString(name.expression) + '.' + entityNameToString(name.name);
        } else {
          return Debug.assertNever(name.name);
        }
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
    const sourceFile = Node.get.sourceFileOf(node);
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
    const sourceFile = Node.get.sourceFileOf(node);
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
      if (startLine < endLine) {
        return new TextSpan(pos, getEndLinePosition(startLine, sourceFile) - pos + 1);
      }
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
    if (errorNode === undefined) {
      return getSpanOfTokenAtPosition(sourceFile, node.pos);
    }
    assert(!Node.is.kind(JSDoc, errorNode));
    const isMissing = Node.is.missing(errorNode);
    const pos = isMissing || Node.is.kind(JsxText, node) ? errorNode.pos : syntax.skipTrivia(sourceFile.text, errorNode.pos);
    if (isMissing) {
      assert(pos === errorNode.pos, 'This failure could trigger https://github.com/Microsoft/TypeScript/issues/20809');
      assert(pos === errorNode.end, 'This failure could trigger https://github.com/Microsoft/TypeScript/issues/20809');
    } else {
      assert(pos >= errorNode.pos, 'This failure could trigger https://github.com/Microsoft/TypeScript/issues/20809');
      assert(pos <= errorNode.end, 'This failure could trigger https://github.com/Microsoft/TypeScript/issues/20809');
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
    return !!(getCombinedModifierFlags(declaration) & ModifierFlags.Readonly && !Node.is.parameterPropertyDeclaration(declaration, declaration.parent));
  }
  export function isVarConst(node: VariableDeclaration | VariableDeclarationList): boolean {
    return !!(Node.get.combinedFlagsOf(node) & NodeFlags.Const);
  }

  
  export function isCustomPrologue(node: Statement) {
    return !!(Node.get.emitFlags(node) & EmitFlags.CustomPrologue);
  }

  export function isHoistedFunction(node: Statement) {
    return isCustomPrologue(node) && Node.is.kind(FunctionDeclaration, node);
  }

  function isHoistedVariable(node: VariableDeclaration) {
    return Node.is.kind(Identifier, node.name) && !node.initializer;
  }

  export function isHoistedVariableStatement(node: Statement) {
    return isCustomPrologue(node) && Node.is.kind(VariableStatement, node) && every(node.declarationList.declarations, isHoistedVariable);
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
          return Node.forEach.child(node, traverse);
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
          if (Node.is.functionLike(node)) {
            if (node.name && node.name.kind === Syntax.ComputedPropertyName) {
              traverse(node.name.expression);
              return;
            }
          } else if (!Node.is.partOfTypeNode(node)) {
            Node.forEach.child(node, traverse);
          }
      }
    }
  }

  export function getRestParameterElementType(node: TypeNode | undefined) {
    if (node && node.kind === Syntax.ArrayType) {
      return (<ArrayTypeNode>node).elementType;
    } else if (node && node.kind === Syntax.TypeReference) {
      return singleOrUndefined((<TypeReferenceNode>node).typeArguments);
    } else {
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
      if (node.statement.kind !== Syntax.LabeledStatement) {
        return node.statement;
      }
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
        ? find(property.initializer.elements, (element): element is StringLiteral => Node.is.kind(StringLiteral, element) && element.text === elementValue)
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
    if (Node.is.namedDeclaration(node) && Node.is.kind(PrivateIdentifier, node.name)) {
      return false;
    }
    switch (node.kind) {
      case Syntax.ClassDeclaration:
        // classes are valid targets
        return true;

      case Syntax.PropertyDeclaration:
        // property declarations are valid if their parent is a class declaration.
        return parent!.kind === Syntax.ClassDeclaration;

      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.MethodDeclaration:
        // if this method has a body and its parent is a class declaration, this is a valid target.
        return (<FunctionLikeDeclaration>node).body !== undefined && parent!.kind === Syntax.ClassDeclaration;

      case Syntax.Parameter:
        // if the parameter's parent has a body and its grandparent is a class declaration, this is a valid target;
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
    return node.decorators !== undefined && nodeCanBeDecorated(node, parent!, grandparent!); // TODO: GH#18217
  }

  export function nodeOrChildIsDecorated(node: ClassDeclaration): boolean;
  export function nodeOrChildIsDecorated(node: ClassElement, parent: Node): boolean;
  export function nodeOrChildIsDecorated(node: Node, parent: Node, grandparent: Node): boolean;
  export function nodeOrChildIsDecorated(node: Node, parent?: Node, grandparent?: Node): boolean {
    return nodeIsDecorated(node, parent!, grandparent!) || childIsDecorated(node, parent!); // TODO: GH#18217
  }

  export function childIsDecorated(node: ClassDeclaration): boolean;
  export function childIsDecorated(node: Node, parent: Node): boolean;
  export function childIsDecorated(node: Node, parent?: Node): boolean {
    switch (node.kind) {
      case Syntax.ClassDeclaration:
        return some((<ClassDeclaration>node).members, (m) => nodeOrChildIsDecorated(m, node, parent!)); // TODO: GH#18217
      case Syntax.MethodDeclaration:
      case Syntax.SetAccessor:
        return some((<FunctionLikeDeclaration>node).parameters, (p) => nodeIsDecorated(p, node, parent!)); // TODO: GH#18217
      default:
        return false;
    }
  }


  export function getExternalModuleImportEqualsDeclarationExpression(node: Node) {
    assert(Node.is.externalModuleImportEqualsDeclaration(node));
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

  export function isInJSDoc(node: Node | undefined): boolean {
    return !!node && !!(node.flags & NodeFlags.JSDoc);
  }

  export function isJSDocIndexSignature(node: TypeReferenceNode | ExpressionWithTypeArguments) {
    return (
      Node.is.kind(TypeReferenceNode, node) &&
      Node.is.kind(Identifier, node.typeName) &&
      node.typeName.escapedText === 'Object' &&
      node.typeArguments &&
      node.typeArguments.length === 2 &&
      (node.typeArguments[0].kind === Syntax.StringKeyword || node.typeArguments[0].kind === Syntax.NumberKeyword)
    );
  }

  export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: true): callExpression is RequireOrImportCall & { expression: Identifier; arguments: [StringLiteralLike] };
  export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: boolean): callExpression is CallExpression;
  export function isRequireCall(callExpression: Node, requireStringLiteralLikeArgument: boolean): callExpression is CallExpression {
    if (callExpression.kind !== Syntax.CallExpression) {
      return false;
    }
    const { expression, arguments: args } = callExpression as CallExpression;
    if (expression.kind !== Syntax.Identifier || (expression as Identifier).escapedText !== 'require') {
      return false;
    }
    if (args.length !== 1) {
      return false;
    }
    const arg = args[0];
    return !requireStringLiteralLikeArgument || StringLiteral.like(arg);
  }

  export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: true): node is RequireVariableDeclaration;
  export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: boolean): node is VariableDeclaration;
  export function isRequireVariableDeclaration(node: Node, requireStringLiteralLikeArgument: boolean): node is VariableDeclaration {
    return Node.is.kind(VariableDeclaration, node) && !!node.initializer && isRequireCall(node.initializer, requireStringLiteralLikeArgument);
  }

  export function isRequireVariableDeclarationStatement(node: Node, requireStringLiteralLikeArgument = true): node is VariableStatement {
    return Node.is.kind(VariableStatement, node) && every(node.declarationList.declarations, (decl) => isRequireVariableDeclaration(decl, requireStringLiteralLikeArgument));
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
    if (Node.is.kind(VariableDeclaration, node.parent) && node.parent.initializer === node) {
      if (!isInJSFile(node) && !isVarConst(node.parent)) {
        return;
      }
      name = node.parent.name;
      decl = node.parent;
    } else if (Node.is.kind(node.parent, BinaryExpression)) {
      const parentNode = node.parent;
      const parentNodeOperator = node.parent.operatorToken.kind;
      if (parentNodeOperator === Syntax.EqualsToken && parentNode.right === node) {
        name = parentNode.left;
        decl = name;
      } else if (parentNodeOperator === Syntax.Bar2Token || parentNodeOperator === Syntax.Question2Token) {
        if (Node.is.kind(VariableDeclaration, parentNode.parent) && parentNode.parent.initializer === parentNode) {
          name = parentNode.parent.name;
          decl = parentNode.parent;
        } else if (Node.is.kind(parentNode.parent, BinaryExpression) && parentNode.parent.operatorToken.kind === Syntax.EqualsToken && parentNode.parent.right === parentNode) {
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
    return Node.is.kind(BinaryExpression, decl) || isAccessExpression(decl) || Node.is.kind(Identifier, decl) || Node.is.kind(CallExpression, decl);
  }

  export function getEffectiveInitializer(node: HasExpressionInitializer) {
    if (
      isInJSFile(node) &&
      node.initializer &&
      Node.is.kind(BinaryExpression, node.initializer) &&
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
      (p) => Node.is.kind(PropertyAssignment, p) && Node.is.kind(Identifier, p.name) && p.name.escapedText === 'value' && p.initializer && getExpandoInitializer(p.initializer, isPrototypeAssignment)
    );
  }

  export function getAssignedExpandoInitializer(node: Node | undefined): Expression | undefined {
    if (node && node.parent && Node.is.kind(BinaryExpression, node.parent) && node.parent.operatorToken.kind === Syntax.EqualsToken) {
      const isPrototypeAssignment = isPrototypeAccess(node.parent.left);
      return getExpandoInitializer(node.parent.right, isPrototypeAssignment) || getDefaultedExpandoInitializer(node.parent.left, node.parent.right, isPrototypeAssignment);
    }
    if (node && Node.is.kind(CallExpression, node) && isBindableObjectDefinePropertyCall(node)) {
      const result = hasExpandoValueProperty(node.arguments[2], node.arguments[1].text === 'prototype');
      if (result) {
        return result;
      }
    }
  }

  export function getExpandoInitializer(initializer: Node, isPrototypeAssignment: boolean): Expression | undefined {
    if (Node.is.kind(CallExpression, initializer)) {
      const e = skipParentheses(initializer.expression);
      return e.kind === Syntax.FunctionExpression || e.kind === Syntax.ArrowFunction ? initializer : undefined;
    }
    if (initializer.kind === Syntax.FunctionExpression || initializer.kind === Syntax.ClassExpression || initializer.kind === Syntax.ArrowFunction) {
      return initializer as Expression;
    }
    if (Node.is.kind(ObjectLiteralExpression, initializer) && (initializer.properties.length === 0 || isPrototypeAssignment)) {
      return initializer;
    }
    return;
  }

  function getDefaultedExpandoInitializer(name: Expression, initializer: Expression, isPrototypeAssignment: boolean) {
    const e =
      Node.is.kind(BinaryExpression, initializer) &&
      (initializer.operatorToken.kind === Syntax.Bar2Token || initializer.operatorToken.kind === Syntax.Question2Token) &&
      getExpandoInitializer(initializer.right, isPrototypeAssignment);
    if (e && isSameEntityName(name, (initializer as BinaryExpression).left)) {
      return e;
    }
    return;
  }

  export function isDefaultedExpandoInitializer(node: BinaryExpression) {
    const name = Node.is.kind(VariableDeclaration, node.parent) ? node.parent.name : Node.is.kind(BinaryExpression, node.parent) && node.parent.operatorToken.kind === Syntax.EqualsToken ? node.parent.left : undefined;
    return name && getExpandoInitializer(node.right, isPrototypeAccess(name)) && isEntityNameExpression(name) && isSameEntityName(name, node.left);
  }

  export function getNameOfExpando(node: Declaration): DeclarationName | undefined {
    if (Node.is.kind(BinaryExpression, node.parent)) {
      const parent =
        (node.parent.operatorToken.kind === Syntax.Bar2Token || node.parent.operatorToken.kind === Syntax.Question2Token) && Node.is.kind(BinaryExpression, node.parent.parent) ? node.parent.parent : node.parent;
      if (parent.operatorToken.kind === Syntax.EqualsToken && Node.is.kind(Identifier, parent.left)) {
        return parent.left;
      }
    } else if (Node.is.kind(VariableDeclaration, node.parent)) {
      return node.parent.name;
    }
  }

  function isSameEntityName(name: Expression, initializer: Expression): boolean {
    if (isPropertyNameLiteral(name) && isPropertyNameLiteral(initializer)) {
      return getTextOfIdentifierOrLiteral(name) === getTextOfIdentifierOrLiteral(name);
    }
    if (
      Node.is.kind(Identifier, name) &&
      Node.is.literalLikeAccess(initializer) &&
      (initializer.expression.kind === Syntax.ThisKeyword ||
        (Node.is.kind(Identifier, initializer.expression) && (initializer.expression.escapedText === 'window' || initializer.expression.escapedText === 'self' || initializer.expression.escapedText === 'global')))
    ) {
      const nameOrArgument = getNameOrArgument(initializer);
      if (Node.is.kind(PrivateIdentifier, nameOrArgument)) {
        fail('Unexpected PrivateIdentifier in name expression with literal-like access.');
      }
      return isSameEntityName(name, nameOrArgument);
    }
    if (Node.is.literalLikeAccess(name) && Node.is.literalLikeAccess(initializer)) {
      return getElementOrPropertyAccessName(name) === getElementOrPropertyAccessName(initializer) && isSameEntityName(name.expression, initializer.expression);
    }
    return false;
  }

  export function getRightMostAssignedExpression(node: Expression): Expression {
    while (isAssignmentExpression(node, /*excludeCompoundAssignments*/ true)) {
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
      Node.is.kind(PropertyAccessExpression, expr.expression) &&
      Node.is.kind(Identifier, expr.expression.expression) &&
      idText(expr.expression.expression) === 'Object' &&
      idText(expr.expression.name) === 'defineProperty' &&
      StringLiteral.orNumericLiteralLike(expr.arguments[1]) &&
      isBindableStaticNameExpression(expr.arguments[0], /*excludeThisKeyword*/ true)
    );
  }


  export function isBindableStaticAccessExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticAccessExpression {
    return (
      (Node.is.kind(PropertyAccessExpression, node) &&
        ((!excludeThisKeyword && node.expression.kind === Syntax.ThisKeyword) || (Node.is.kind(Identifier, node.name) && isBindableStaticNameExpression(node.expression, /*excludeThisKeyword*/ true)))) ||
      isBindableStaticElementAccessExpression(node, excludeThisKeyword)
    );
  }

  /** Any series of property and element accesses, ending in a literal element access */
  export function isBindableStaticElementAccessExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticElementAccessExpression {
    return (
      Node.is.literalLikeElementAccess(node) &&
      ((!excludeThisKeyword && node.expression.kind === Syntax.ThisKeyword) ||
        isEntityNameExpression(node.expression) ||
        isBindableStaticAccessExpression(node.expression, /*excludeThisKeyword*/ true))
    );
  }

  export function isBindableStaticNameExpression(node: Node, excludeThisKeyword?: boolean): node is BindableStaticNameExpression {
    return isEntityNameExpression(node) || isBindableStaticAccessExpression(node, excludeThisKeyword);
  }

  export function getNameOrArgument(expr: PropertyAccessExpression | LiteralLikeElementAccessExpression) {
    if (Node.is.kind(PropertyAccessExpression, expr)) {
      return expr.name;
    }
    return expr.argumentExpression;
  }

  function getAssignmentDeclarationKindWorker(expr: BinaryExpression | CallExpression): AssignmentDeclarationKind {
    if (Node.is.kind(CallExpression, expr)) {
      if (!isBindableObjectDefinePropertyCall(expr)) {
        return AssignmentDeclarationKind.None;
      }
      const entityName = expr.arguments[0];
      if (Node.is.exportsIdentifier(entityName) || Node.is.moduleExportsAccessExpression(entityName)) {
        return AssignmentDeclarationKind.ObjectDefinePropertyExports;
      }
      if (isBindableStaticAccessExpression(entityName) && getElementOrPropertyAccessName(entityName) === 'prototype') {
        return AssignmentDeclarationKind.ObjectDefinePrototypeProperty;
      }
      return AssignmentDeclarationKind.ObjectDefinePropertyValue;
    }
    if (expr.operatorToken.kind !== Syntax.EqualsToken || !isAccessExpression(expr.left)) {
      return AssignmentDeclarationKind.None;
    }
    if (
      isBindableStaticNameExpression(expr.left.expression, /*excludeThisKeyword*/ true) &&
      getElementOrPropertyAccessName(expr.left) === 'prototype' &&
      Node.is.kind(ObjectLiteralExpression, getInitializerOfBinaryExpression(expr))
    ) {
      // F.prototype = { ... }
      return AssignmentDeclarationKind.Prototype;
    }
    return getAssignmentDeclarationPropertyAccessKind(expr.left);
  }

  export function getElementOrPropertyAccessArgumentExpressionOrName(
    node: AccessExpression
  ): Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ElementAccessExpression | undefined {
    if (Node.is.kind(PropertyAccessExpression, node)) {
      return node.name;
    }
    const arg = skipParentheses(node.argumentExpression);
    if (Node.is.kind(NumericLiteral, arg) || StringLiteral.like(arg)) {
      return arg;
    }
    return node;
  }

  export function getElementOrPropertyAccessName(node: LiteralLikeElementAccessExpression | PropertyAccessExpression): __String;
  export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined;
  export function getElementOrPropertyAccessName(node: AccessExpression): __String | undefined {
    const name = getElementOrPropertyAccessArgumentExpressionOrName(node);
    if (name) {
      if (Node.is.kind(Identifier, name)) {
        return name.escapedText;
      }
      if (StringLiteral.like(name) || Node.is.kind(NumericLiteral, name)) {
        return syntax.get.escUnderscores(name.text);
      }
    }
    if (Node.is.kind(ElementAccessExpression, node) && isWellKnownSymbolSyntactically(node.argumentExpression)) {
      return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>node.argumentExpression).name));
    }
    return;
  }

  export function getAssignmentDeclarationPropertyAccessKind(lhs: AccessExpression): AssignmentDeclarationKind {
    if (lhs.expression.kind === Syntax.ThisKeyword) {
      return AssignmentDeclarationKind.ThisProperty;
    } else if (Node.is.moduleExportsAccessExpression(lhs)) {
      // module.exports = expr
      return AssignmentDeclarationKind.ModuleExports;
    } else if (isBindableStaticNameExpression(lhs.expression, /*excludeThisKeyword*/ true)) {
      if (isPrototypeAccess(lhs.expression)) {
        // F.G....prototype.x = expr
        return AssignmentDeclarationKind.PrototypeProperty;
      }

      let nextToLast = lhs;
      while (!Node.is.kind(Identifier, nextToLast.expression)) {
        nextToLast = nextToLast.expression as Exclude<BindableStaticNameExpression, Identifier>;
      }
      const id = nextToLast.expression;
      if (
        (id.escapedText === 'exports' || (id.escapedText === 'module' && getElementOrPropertyAccessName(nextToLast) === 'exports')) &&
        // ExportsProperty does not support binding with computed names
        isBindableStaticAccessExpression(lhs)
      ) {
        // exports.name = expr OR module.exports.name = expr OR exports["name"] = expr ...
        return AssignmentDeclarationKind.ExportsProperty;
      }
      if (isBindableStaticNameExpression(lhs, /*excludeThisKeyword*/ true) || (Node.is.kind(ElementAccessExpression, lhs) && isDynamicName(lhs))) {
        // F.G...x = expr
        return AssignmentDeclarationKind.Property;
      }
    }

    return AssignmentDeclarationKind.None;
  }

  export function getInitializerOfBinaryExpression(expr: BinaryExpression) {
    while (Node.is.kind(BinaryExpression, expr.right)) {
      expr = expr.right;
    }
    return expr.right;
  }

  export function isPrototypePropertyAssignment(node: Node): boolean {
    return Node.is.kind(BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.PrototypeProperty;
  }

  export function isSpecialPropertyDeclaration(expr: PropertyAccessExpression | ElementAccessExpression): expr is PropertyAccessExpression | LiteralLikeElementAccessExpression {
    return (
      isInJSFile(expr) && expr.parent && expr.parent.kind === Syntax.ExpressionStatement && (!Node.is.kind(ElementAccessExpression, expr) || Node.is.literalLikeElementAccess(expr)) && !!Node.getJSDoc.typeTag(expr.parent)
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
        return Node.is.importCall(node.parent) || isRequireCall(node.parent, /*checkArg*/ false) ? (node.parent as RequireOrImportCall) : undefined;
      case Syntax.LiteralType:
        assert(Node.is.kind(StringLiteral, node));
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
        return Node.is.literalImportTypeNode(node) ? node.argument.literal : undefined;
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
      const result = Node.is.kind(NamespaceImport, node.namedBindings) ? action(node.namedBindings) : forEach(node.namedBindings.elements, action);
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
    return Node.is.kind(ExpressionStatement, node) && Node.is.kind(BinaryExpression, node.expression) && node.expression.operatorToken.kind === Syntax.EqualsToken
      ? getRightMostAssignedExpression(node.expression)
      : undefined;
  }

  function getSourceOfDefaultedAssignment(node: Node): Node | undefined {
    return Node.is.kind(ExpressionStatement, node) &&
      Node.is.kind(BinaryExpression, node.expression) &&
      getAssignmentDeclarationKind(node.expression) !== AssignmentDeclarationKind.None &&
      Node.is.kind(BinaryExpression, node.expression.right) &&
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
    return Node.is.kind(VariableStatement, node) ? firstOrUndefined(node.declarationList.declarations) : undefined;
  }

  function getNestedModuleDeclaration(node: Node): Node | undefined {
    return Node.is.kind(ModuleDeclaration, node) && node.body && node.body.kind === Syntax.ModuleDeclaration ? node.body : undefined;
  }

  export function getParameterSymbolFromJSDoc(node: JSDocParameterTag): Symbol | undefined {
    if (node.symbol) {
      return node.symbol;
    }
    if (!Node.is.kind(Identifier, node.name)) {
      return;
    }
    const name = node.name.escapedText;
    const decl = getHostSignatureFromJSDoc(node);
    if (!decl) {
      return;
    }
    const parameter = find(decl.parameters, (p) => p.name.kind === Syntax.Identifier && p.name.escapedText === name);
    return parameter && parameter.symbol;
  }

  export function getHostSignatureFromJSDoc(node: Node): SignatureDeclaration | undefined {
    const host = getEffectiveJSDocHost(node);
    return host && Node.is.functionLike(host) ? host : undefined;
  }

  export function getEffectiveJSDocHost(node: Node): Node | undefined {
    const host = Node.getJSDoc.host(node);
    const decl =
      getSourceOfDefaultedAssignment(host) ||
      getSourceOfAssignment(host) ||
      getSingleInitializerOfVariableStatementOrPropertyDeclaration(host) ||
      getSingleVariableOfVariableStatement(host) ||
      getNestedModuleDeclaration(host) ||
      host;
    return decl;
  }


  export function getTypeParameterFromJsDoc(node: TypeParameterDeclaration & { parent: JSDocTemplateTag }): TypeParameterDeclaration | undefined {
    const name = node.name.escapedText;
    const { typeParameters } = node.parent.parent.parent as SignatureDeclaration | InterfaceDeclaration | ClassDeclaration;
    return typeParameters && find(typeParameters, (p) => p.name.escapedText === name);
  }

  export function hasRestParameter(s: SignatureDeclaration | JSDocSignature): boolean {
    const last = lastOrUndefined<ParameterDeclaration | JSDocParameterTag>(s.parameters);
    return !!last && isRestParameter(last);
  }

  export function isRestParameter(node: ParameterDeclaration | JSDocParameterTag): boolean {
    const type = Node.is.kind(JSDocParameterTag, node) ? node.typeExpression && node.typeExpression.type : node.type;
    return (node as ParameterDeclaration).dot3Token !== undefined || (!!type && type.kind === Syntax.JSDocVariadicType);
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
          if ((parent as ShorthandPropertyAssignment).name !== node) {
            return AssignmentKind.None;
          }
          node = parent.parent;
          break;
        case Syntax.PropertyAssignment:
          if ((parent as ShorthandPropertyAssignment).name === node) {
            return AssignmentKind.None;
          }
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
    return Node.is.kind(FunctionExpression, node) || Node.is.kind(ArrowFunction, node) || Node.is.methodOrAccessor(node) || Node.is.kind(FunctionDeclaration, node) || Node.is.kind(ConstructorDeclaration, node);
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

  export function skipParentheses(node: Expression): Expression;
  export function skipParentheses(node: Node): Node;
  export function skipParentheses(node: Node): Node {
    return skipOuterExpressions(node, OuterExpressionKinds.Parentheses);
  }

  function skipParenthesesUp(node: Node): Node {
    while (node.kind === Syntax.ParenthesizedExpression) {
      node = node.parent;
    }
    return node;
  }


  export function getDeclarationFromName(name: Node): Declaration | undefined {
    const parent = name.parent;
    switch (name.kind) {
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.NumericLiteral:
        if (Node.is.kind(ComputedPropertyName, parent)) return parent.parent;
      // falls through
      case Syntax.Identifier:
        if (Node.is.declaration(parent)) {
          return parent.name === name ? parent : undefined;
        } else if (Node.is.kind(QualifiedName, parent)) {
          const tag = parent.parent;
          return Node.is.kind(JSDocParameterTag, tag) && tag.name === parent ? tag : undefined;
        } else {
          const binExp = parent.parent;
          return Node.is.kind(BinaryExpression, binExp) && getAssignmentDeclarationKind(binExp) !== AssignmentDeclarationKind.None && (binExp.left.symbol || binExp.symbol) && getNameOfDeclaration(binExp) === name
            ? binExp
            : undefined;
        }
      case Syntax.PrivateIdentifier:
        return Node.is.declaration(parent) && parent.name === name ? parent : undefined;
      default:
        return;
    }
  }

  export function isLiteralComputedPropertyDeclarationName(node: Node) {
    return StringLiteral.orNumericLiteralLike(node) && node.parent.kind === Syntax.ComputedPropertyName && Node.is.declaration(node.parent.parent);
  }

  // Return true if the given identifier is classified as an IdentifierName
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
        // Name in member declaration or property name in property access
        return (<NamedDeclaration | PropertyAccessExpression>parent).name === node;
      case Syntax.QualifiedName:
        // Name on right hand side of dot in a type query or type reference
        if ((<QualifiedName>parent).right === node) {
          while (parent.kind === Syntax.QualifiedName) {
            parent = parent.parent;
          }
          return parent.kind === Syntax.TypeQuery || parent.kind === Syntax.TypeReference;
        }
        return false;
      case Syntax.BindingElement:
      case Syntax.ImportSpecifier:
        // Property name in binding element or import specifier
        return (<BindingElement | ImportSpecifier>parent).propertyName === node;
      case Syntax.ExportSpecifier:
      case Syntax.JsxAttribute:
        // Any name in an export specifier or JSX Attribute
        return true;
    }
    return false;
  }

  // An alias symbol is created by one of the following declarations:
  // import <symbol> = ...
  // import <symbol> from ...
  // import * as <symbol> from ...
  // import { x as <symbol> } from ...
  // export { x as <symbol> } from ...
  // export * as ns <symbol> from ...
  // export = <EntityNameExpression>
  // export default <EntityNameExpression>
  // module.exports = <EntityNameExpression>
  // {<Identifier>}
  // {name: <EntityNameExpression>}
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
      (Node.is.kind(BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.ModuleExports && exportAssignmentIsAlias(node)) ||
      (Node.is.kind(PropertyAccessExpression, node) &&
        Node.is.kind(BinaryExpression, node.parent) &&
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
    return isEntityNameExpression(e) || Node.is.kind(ClassExpression, e);
  }

  export function exportAssignmentIsAlias(node: ExportAssignment | BinaryExpression): boolean {
    const e = getExportAssignmentExpression(node);
    return isAliasableExpression(e);
  }

  export function getExportAssignmentExpression(node: ExportAssignment | BinaryExpression): Expression {
    return Node.is.kind(ExportAssignment, node) ? node.expression : node.right;
  }

  export function getPropertyAssignmentAliasLikeExpression(node: PropertyAssignment | ShorthandPropertyAssignment | PropertyAccessExpression): Expression {
    return node.kind === Syntax.ShorthandPropertyAssignment ? node.name : node.kind === Syntax.PropertyAssignment ? node.initializer : (node.parent as BinaryExpression).right;
  }

  export function getEffectiveBaseTypeNode(node: ClassLikeDeclaration | InterfaceDeclaration) {
    const baseType = getClassExtendsHeritageElement(node);
    if (baseType && isInJSFile(node)) {
      // Prefer an @augments tag because it may have type parameters.
      const tag = Node.getJSDoc.augmentsTag(node);
      if (tag) {
        return tag.class;
      }
    }
    return baseType;
  }

  export function getClassExtendsHeritageElement(node: ClassLikeDeclaration | InterfaceDeclaration) {
    const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ExtendsKeyword);
    return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
  }

  export function getEffectiveImplementsTypeNodes(node: ClassLikeDeclaration): undefined | readonly ExpressionWithTypeArguments[] {
    if (isInJSFile(node)) {
      return Node.getJSDoc.implementsTags(node).map((n) => n.class);
    } else {
      const heritageClause = getHeritageClause(node.heritageClauses, Syntax.ImplementsKeyword);
      return heritageClause?.types;
    }
  }

  export function getAllSuperTypeNodes(node: Node): readonly TypeNode[] {
    return Node.is.kind(InterfaceDeclaration, node)
      ? getInterfaceBaseTypeNodes(node) || emptyArray
      : Node.is.classLike(node)
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
        if (clause.token === kind) {
          return clause;
        }
      }
    }

    return;
  }

  export function getAncestor(node: Node | undefined, kind: Syntax): Node | undefined {
    while (node) {
      if (node.kind === kind) {
        return node;
      }
      node = node.parent;
    }
    return;
  }


  export function isIdentifierANonContextualKeyword({ originalKeywordKind }: Identifier): boolean {
    return !!originalKeywordKind && !syntax.is.contextualKeyword(originalKeywordKind);
  }
  
  export type TriviaKind = Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia | Syntax.NewLineTrivia | Syntax.WhitespaceTrivia | Syntax.ShebangTrivia | Syntax.ConflictMarkerTrivia;

  export const enum FunctionFlags {
    Normal = 0, // Function is a normal function
    Generator = 1 << 0, // Function is a generator function or async generator function
    Async = 1 << 1, // Function is an async function or an async generator function
    Invalid = 1 << 2, // Function is a signature or overload and does not have a body.
    AsyncGenerator = Async | Generator, // Function is an async generator function
  }

  export function getFunctionFlags(node: SignatureDeclaration | undefined) {
    if (!node) {
      return FunctionFlags.Invalid;
    }

    let flags = FunctionFlags.Normal;
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.MethodDeclaration:
        if (node.asteriskToken) {
          flags |= FunctionFlags.Generator;
        }
      // falls through

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
    if (!(name.kind === Syntax.ComputedPropertyName || name.kind === Syntax.ElementAccessExpression)) {
      return false;
    }
    const expr = Node.is.kind(ElementAccessExpression, name) ? name.argumentExpression : name.expression;
    return !StringLiteral.orNumericLiteralLike(expr) && !Node.is.signedNumericLiteral(expr) && !isWellKnownSymbolSyntactically(expr);
  }

  export function isWellKnownSymbolSyntactically(node: Node): node is WellKnownSymbolExpression {
    return Node.is.kind(PropertyAccessExpression, node) && isESSymbolIdentifier(node.expression);
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
        if (isWellKnownSymbolSyntactically(nameExpression)) {
          return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>nameExpression).name));
        } else if (StringLiteral.orNumericLiteralLike(nameExpression)) {
          return syntax.get.escUnderscores(nameExpression.text);
        } else if (Node.is.signedNumericLiteral(nameExpression)) {
          if (nameExpression.operator === Syntax.MinusToken) {
            return (Token.toString(nameExpression.operator) + nameExpression.operand.text) as __String;
          }
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
    return Node.is.identifierOrPrivateIdentifier(node) ? idText(node) : node.text;
  }

  export function getEscapedTextOfIdentifierOrLiteral(node: PropertyNameLiteral): __String {
    return Node.is.identifierOrPrivateIdentifier(node) ? node.escapedText : syntax.get.escUnderscores(node.text);
  }

  export function getPropertyNameForKnownSymbolName(symbolName: string): __String {
    return ('__@' + symbolName) as __String;
  }


  /**
   * Includes the word "Symbol" with unicode escapes
   */
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
    return Node.get.parseTreeOf(sourceFile, isSourceFile) || sourceFile;
  }

  export const enum Associativity {
    Left,
    Right,
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
    if (expression.kind === Syntax.BinaryExpression) {
      return (<BinaryExpression>expression).operatorToken.kind;
    } else if (expression.kind === Syntax.PrefixUnaryExpression || expression.kind === Syntax.PostfixUnaryExpression) {
      return (<PrefixUnaryExpression | PostfixUnaryExpression>expression).operator;
    } else {
      return expression.kind;
    }
  }


  export function createDiagnosticCollection(): DiagnosticCollection {
    let nonFileDiagnostics = ([] as Diagnostic[]) as SortedArray<Diagnostic>; // See GH#19873
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
      forEach(fileDiagnostics.get(newFile.fileName), (diagnostic) => (diagnostic.file = newFile));
    }

    function lookup(diagnostic: Diagnostic): Diagnostic | undefined {
      let diagnostics: SortedArray<Diagnostic> | undefined;
      if (diagnostic.file) {
        diagnostics = fileDiagnostics.get(diagnostic.file.fileName);
      } else {
        diagnostics = nonFileDiagnostics;
      }
      if (!diagnostics) {
        return;
      }
      const result = binarySearch(diagnostics, diagnostic, identity, compareDiagnosticsSkipRelatedInformation);
      if (result >= 0) {
        return diagnostics[result];
      }
      return;
    }

    function add(diagnostic: Diagnostic): void {
      let diagnostics: SortedArray<Diagnostic> | undefined;
      if (diagnostic.file) {
        diagnostics = fileDiagnostics.get(diagnostic.file.fileName);
        if (!diagnostics) {
          diagnostics = ([] as Diagnostic[]) as SortedArray<DiagnosticWithLocation>; // See GH#19873
          fileDiagnostics.set(diagnostic.file.fileName, diagnostics as SortedArray<DiagnosticWithLocation>);
          insertSorted(filesWithDiagnostics, diagnostic.file.fileName, compareStringsCaseSensitive);
        }
      } else {
        // If we've already read the non-file diagnostics, do not modify the existing array.
        if (hasReadNonFileDiagnostics) {
          hasReadNonFileDiagnostics = false;
          nonFileDiagnostics = nonFileDiagnostics.slice() as SortedArray<Diagnostic>;
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
      if (fileName) {
        return fileDiagnostics.get(fileName) || [];
      }

      const fileDiags: Diagnostic[] = flatMapToMutable(filesWithDiagnostics, (f) => fileDiagnostics.get(f));
      if (!nonFileDiagnostics.length) {
        return fileDiags;
      }
      fileDiags.unshift(...nonFileDiagnostics);
      return fileDiags;
    }
  }

  const templateSubstitutionRegExp = /\$\{/g;
  function escapeTemplateSubstitution(str: string): string {
    return str.replace(templateSubstitutionRegExp, '\\${');
  }

  export function hasInvalidEscape(template: TemplateLiteral): boolean {
    return template && !!(Node.is.kind(NoSubstitutionLiteral, template) ? template.templateFlags : template.head.templateFlags || some(template.templateSpans, (span) => !!span.literal.templateFlags));
  }

  // This consists of the first 19 unprintable ASCII characters, canonical escapes, lineSeparator,
  // paragraphSeparator, and nextLine. The latter three are just desirable to suppress new lines in
  // the language service. These characters should be escaped when printing, and if any characters are added,
  // the map below must be updated. Note that this regexp *does not* include the 'delete' character.
  // There is no reason for this other than that JSON.stringify does not handle it either.
  const doubleQuoteEscapedCharsRegExp = /[\\\"\u0000-\u001f\t\v\f\b\r\n\u2028\u2029\u0085]/g;
  const singleQuoteEscapedCharsRegExp = /[\\\'\u0000-\u001f\t\v\f\b\r\n\u2028\u2029\u0085]/g;
  // Template strings should be preserved as much as possible
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
    '\u2028': '\\u2028', // lineSeparator
    '\u2029': '\\u2029', // paragraphSeparator
    '\u0085': '\\u0085', // nextLine
  });

  function encodeUtf16EscapeSequence(cc: number): string {
    const hexCharCode = cc.toString(16).toUpperCase();
    const paddedHexCode = ('0000' + hexCharCode).slice(-4);
    return '\\u' + paddedHexCode;
  }

  function getReplacement(c: string, offset: number, input: string) {
    if (c.charCodeAt(0) === Codes.nullCharacter) {
      const lookAhead = input.charCodeAt(offset + c.length);
      if (lookAhead >= Codes._0 && lookAhead <= Codes._9) {
        // If the null character is followed by digits, print as a hex escape to prevent the result from parsing as an octal (which is forbidden in strict mode)
        return '\\x00';
      }
      // Otherwise, keep printing a literal \0 for the null character
      return '\\0';
    }
    return escapedCharsMap.get(c) || encodeUtf16EscapeSequence(c.charCodeAt(0));
  }

  /**
   * Based heavily on the abstract 'Quote'/'QuoteJSONString' operation from ECMA-262 (24.3.2.2),
   * but augmented for a few select characters (e.g. lineSeparator, paragraphSeparator, nextLine)
   * Note that this doesn't actually wrap the input in double quotes.
   */
  export function escapeString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote | Codes.backtick): string {
    const escapedCharsRegExp = quoteChar === Codes.backtick ? backtickQuoteEscapedCharsRegExp : quoteChar === Codes.singleQuote ? singleQuoteEscapedCharsRegExp : doubleQuoteEscapedCharsRegExp;
    return s.replace(escapedCharsRegExp, getReplacement);
  }

  const nonAsciiCharacters = /[^\u0000-\u007F]/g;
  export function escapeNonAsciiString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote | Codes.backtick): string {
    s = escapeString(s, quoteChar);
    // Replace non-ASCII characters with '\uNNNN' escapes if any exist.
    // Otherwise just return the original string.
    return nonAsciiCharacters.test(s) ? s.replace(nonAsciiCharacters, (c) => encodeUtf16EscapeSequence(c.charCodeAt(0))) : s;
  }

  // This consists of the first 19 unprintable ASCII characters, JSX canonical escapes, lineSeparator,
  // paragraphSeparator, and nextLine. The latter three are just desirable to suppress new lines in
  // the language service. These characters should be escaped when printing, and if any characters are added,
  // the map below must be updated.
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
    if (c.charCodeAt(0) === Codes.nullCharacter) {
      return '&#0;';
    }
    return jsxEscapedCharsMap.get(c) || encodeJsxCharacterEntity(c.charCodeAt(0));
  }

  export function escapeJsxAttributeString(s: string, quoteChar?: Codes.doubleQuote | Codes.singleQuote) {
    const escapedCharsRegExp = quoteChar === Codes.singleQuote ? jsxSingleQuoteEscapedCharsRegExp : jsxDoubleQuoteEscapedCharsRegExp;
    return s.replace(escapedCharsRegExp, getJsxAttributeStringReplacement);
  }

  /**
   * Strip off existed surrounding single quotes, double quotes, or backticks from a given string
   *
   * @return non-quoted string
   */
  export function stripQuotes(name: string) {
    const length = name.length;
    if (length >= 2 && name.charCodeAt(0) === name.charCodeAt(length - 1) && isQuoteOrBacktick(name.charCodeAt(0))) {
      return name.substring(1, length - 1);
    }
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
      const syntax.get.lineStartsOfS = syntax.get.lineStarts(s);
      if (syntax.get.lineStartsOfS.length > 1) {
        lineCount = lineCount + syntax.get.lineStartsOfS.length - 1;
        linePos = output.length - s.length + last(syntax.get.lineStartsOfS);
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

  /**
   * Resolves a local path to a path which is absolute to the base of the emit
   */
  export function getExternalModuleNameFromPath(host: ResolveModuleNameResolutionHost, fileName: string, referencePath?: string): string {
    const getCanonicalFileName = (f: string) => host.getCanonicalFileName(f);
    const dir = toPath(referencePath ? getDirectoryPath(referencePath) : host.getCommonSourceDirectory(), host.getCurrentDirectory(), getCanonicalFileName);
    const filePath = getNormalizedAbsolutePath(fileName, host.getCurrentDirectory());
    const relativePath = getRelativePathToDirectoryOrUrl(dir, filePath, dir, getCanonicalFileName, /*isAbsolutePathAnUrl*/ false);
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
    const outputDir = options.declarationDir || options.outDir; // Prefer declaration folder if specified

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

  /**
   * Gets the source files that are expected to have an emit output.
   *
   * Originally part of `forEachExpectedEmitFile`, this functionality was extracted to support
   * transformations.
   *
   * @param host An EmitHost.
   * @param targetSourceFile An optional target source file to emit.
   */
  export function getSourceFilesToEmit(host: EmitHost, targetSourceFile?: SourceFile, forceDtsEmit?: boolean): readonly SourceFile[] {
    const options = host.getCompilerOptions();
    if (options.outFile || options.out) {
      const moduleKind = getEmitModuleKind(options);
      const moduleEmitEnabled = options.emitDeclarationOnly || moduleKind === ModuleKind.AMD || moduleKind === ModuleKind.System;
      // Can emit only sources that are not declaration file and are either non module code or module with --module or --target es6 specified
      return filter(host.getSourceFiles(), (sourceFile) => (moduleEmitEnabled || !qp_isExternalModule(sourceFile)) && sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    } else {
      const sourceFiles = targetSourceFile === undefined ? host.getSourceFiles() : [targetSourceFile];
      return filter(sourceFiles, (sourceFile) => sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    }
  }

  /** Don't call this for `--outFile`, just for `--outDir` or plain emit. `--outFile` needs additional checks. */
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

  export function writeFile(
    host: { writeFile: WriteFileCallback },
    diagnostics: DiagnosticCollection,
    fileName: string,
    data: string,
    writeByteOrderMark: boolean,
    sourceFiles?: readonly SourceFile[]
  ) {
    host.writeFile(
      fileName,
      data,
      writeByteOrderMark,
      (hostErrorMessage) => {
        diagnostics.add(createCompilerDiagnostic(Diagnostics.Could_not_write_file_0_Colon_1, fileName, hostErrorMessage));
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
    // PERF: Checking for directory existence is expensive.  Instead, assume the directory exists
    // and fall back to creating it if the file write fails.
    try {
      writeFile(path, data, writeByteOrderMark);
    } catch {
      ensureDirectoriesExist(getDirectoryPath(normalizePath(path)), createDirectory, directoryExists);
      writeFile(path, data, writeByteOrderMark);
    }
  }

  export function getLineOfLocalPosition(sourceFile: SourceFile, pos: number) {
    const syntax.get.lineStarts = syntax.get.lineStarts(sourceFile);
    return Scanner.lineOf(syntax.get.lineStarts, pos);
  }

  export function getLineOfLocalPositionFromLineMap(lineMap: readonly number[], pos: number) {
    return Scanner.lineOf(lineMap, pos);
  }

  export function getFirstConstructorWithBody(node: ClassLikeDeclaration): (ConstructorDeclaration & { body: FunctionBody }) | undefined {
    return find(node.members, (member): member is ConstructorDeclaration & { body: FunctionBody } => Node.is.kind(ConstructorDeclaration, member) && Node.is.present(member.body));
  }

  export function getSetAccessorValueParameter(accessor: SetAccessorDeclaration): ParameterDeclaration | undefined {
    if (accessor && accessor.parameters.length > 0) {
      const hasThis = accessor.parameters.length === 2 && parameterIsThisKeyword(accessor.parameters[0]);
      return accessor.parameters[hasThis ? 1 : 0];
    }
  }

  /** Get the type annotation for the value parameter. */
  export function getSetAccessorTypeAnnotationNode(accessor: SetAccessorDeclaration): TypeNode | undefined {
    const parameter = getSetAccessorValueParameter(accessor);
    return parameter && parameter.type;
  }

  export function getThisNodeKind(ParameterDeclaration, signature: SignatureDeclaration | JSDocSignature): ParameterDeclaration | undefined {
    // cb tags do not currently support this parameters
    if (signature.parameters.length && !Node.is.kind(JSDocSignature, signature)) {
      const thisParameter = signature.parameters[0];
      if (parameterIsThisKeyword(thisParameter)) {
        return thisParameter;
      }
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
    // TODO: GH#18217
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
        if (Node.is.accessor(member) && hasSyntacticModifier(member, ModifierFlags.Static) === hasSyntacticModifier(accessor, ModifierFlags.Static)) {
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
    if (!isInJSFile(node) && Node.is.kind(FunctionDeclaration, node)) return;
    const type = (node as HasType).type;
    if (type || !isInJSFile(node)) return type;
    return Node.isJSDoc.propertyLikeTag(node) ? node.typeExpression && node.typeExpression.type : Node.getJSDoc.type(node);
  }

  export function getTypeAnnotationNode(node: Node): TypeNode | undefined {
    return (node as HasType).type;
  }

  export function getEffectiveReturnTypeNode(node: SignatureDeclaration | JSDocSignature): TypeNode | undefined {
    return Node.is.kind(JSDocSignature, node) ? node.type && node.type.typeExpression && node.type.typeExpression.type : node.type || (isInJSFile(node) ? Node.getJSDoc.returnType(node) : undefined);
  }


  function isNonTypeAliasTemplate(tag: JSDocTag): tag is JSDocTemplateTag {
    return Node.is.kind(JSDocTemplateTag, tag) && !(tag.parent.kind === Syntax.JSDocComment && tag.parent.tags!.some(isJSDocTypeAlias));
  }

  export function getEffectiveSetAccessorTypeAnnotationNode(node: SetAccessorDeclaration): TypeNode | undefined {
    const parameter = getSetAccessorValueParameter(node);
    return parameter && getEffectiveTypeAnnotationNode(parameter);
  }

  export function emitNewLineBeforeLeadingComments(lineMap: readonly number[], writer: EmitTextWriter, node: TextRange, leadingComments: readonly CommentRange[] | undefined) {
    emitNewLineBeforeLeadingCommentsOfPosition(lineMap, writer, node.pos, leadingComments);
  }

  export function emitNewLineBeforeLeadingCommentsOfPosition(lineMap: readonly number[], writer: EmitTextWriter, pos: number, leadingComments: readonly CommentRange[] | undefined) {
    // If the leading comments start on different line than the start of node, write new line
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
    // If the leading comments start on different line than the start of node, write new line
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

  /**
   * Detached comment is a comment at the top of file or function body that is separated from
   * the next statement by space.
   */
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
      // removeComments is true, only reserve pinned comment at the top of file
      // For example:
      //      /*! Pinned Comment */
      //
      //      var x = 10;
      if (node.pos === 0) {
        leadingComments = filter(syntax.get.leadingCommentRanges(text, node.pos), isPinnedCommentLocal);
      }
    } else {
      // removeComments is false, just get detached as normal and bypass the process to filter comment
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
            // There was a blank line between the last comment and this comment.  This
            // comment is not part of the copyright comments.  Return what we have so
            // far.
            break;
          }
        }

        detachedComments.push(comment);
        lastComment = comment;
      }

      if (detachedComments.length) {
        // All comments look like they could have been part of the copyright header.  Make
        // sure there is at least one blank line between it and the node.  If not, it's not
        // a copyright header.
        const lastCommentLine = getLineOfLocalPositionFromLineMap(lineMap, last(detachedComments).end);
        const nodeLine = getLineOfLocalPositionFromLineMap(lineMap, syntax.skipTrivia(text, node.pos));
        if (nodeLine >= lastCommentLine + 2) {
          // Valid detachedComments
          emitNewLineBeforeLeadingComments(lineMap, writer, node, leadingComments);
          emitComments(text, lineMap, writer, detachedComments, /*leadingSeparator*/ false, /*trailingSeparator*/ true, newLine, writeComment);
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
          // If we are not emitting first line, we need to write the spaces to adjust the alignment
          if (firstCommentLineIndent === undefined) {
            firstCommentLineIndent = calculateIndent(text, lineMap[firstCommentLineAndChar.line], commentPos);
          }

          // These are number of spaces writer is going to write at current indent
          const currentWriterIndentSpacing = writer.getIndent() * getIndentSize();

          // Number of spaces we want to be writing
          // eg: Assume writer indent
          // module m {
          //         /* starts at character 9 this is line 1
          //    * starts at character pos 4 line                        --1  = 8 - 8 + 3
          //   More left indented comment */                            --2  = 8 - 8 + 2
          //     class c { }
          // }
          // module m {
          //     /* this is line 1 -- Assume current writer indent 8
          //      * line                                                --3 = 8 - 4 + 5
          //            More right indented comment */                  --4 = 8 - 4 + 11
          //     class c { }
          // }
          const spacesToEmit = currentWriterIndentSpacing - firstCommentLineIndent + calculateIndent(text, pos, nextLineStart);
          if (spacesToEmit > 0) {
            let numberOfSingleSpacesToEmit = spacesToEmit % getIndentSize();
            const indentSizeSpaceString = getIndentString((spacesToEmit - numberOfSingleSpacesToEmit) / getIndentSize());

            // Write indent size string ( in eg 1: = "", 2: "" , 3: string with 8 spaces 4: string with 12 spaces
            writer.rawWrite(indentSizeSpaceString);

            // Emit the single spaces (in eg: 1: 3 spaces, 2: 2 spaces, 3: 1 space, 4: 3 spaces)
            while (numberOfSingleSpacesToEmit) {
              writer.rawWrite(' ');
              numberOfSingleSpacesToEmit--;
            }
          } else {
            // No spaces to emit write empty string
            writer.rawWrite('');
          }
        }

        // Write the comment line text
        writeTrimmedCurrentLine(text, commentEnd, writer, newLine, pos, nextLineStart);

        pos = nextLineStart;
      }
    } else {
      // Single line comment of style //....
      writer.writeComment(text.substring(commentPos, commentEnd));
    }
  }

  function writeTrimmedCurrentLine(text: string, commentEnd: number, writer: EmitTextWriter, newLine: string, pos: number, nextLineStart: number) {
    const end = Math.min(commentEnd, nextLineStart - 1);
    const currentLineText = text.substring(pos, end).replace(/^\s+|\s+$/g, '');
    if (currentLineText) {
      // trimmed forward and ending spaces text
      writer.writeComment(currentLineText);
      if (end !== commentEnd) {
        writer.writeLine();
      }
    } else {
      // Empty string - make sure we write empty line
      writer.rawWrite(newLine);
    }
  }

  function calculateIndent(text: string, pos: number, end: number) {
    let currentLineIndent = 0;
    for (; pos < end && syntax.is.whiteSpaceSingleLine(text.charCodeAt(pos)); pos++) {
      if (text.charCodeAt(pos) === Codes.tab) {
        // Tabs = TabSize = indent size and go to next tabStop
        currentLineIndent += getIndentSize() - (currentLineIndent % getIndentSize());
      } else {
        // Single space
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

  function getModifierFlagsWorker(node: Node, includeJSDoc: boolean): ModifierFlags {
    if (node.kind >= Syntax.FirstToken && node.kind <= Syntax.LastToken) {
      return ModifierFlags.None;
    }

    if (!(node.modifierFlagsCache & ModifierFlags.HasComputedFlags)) {
      node.modifierFlagsCache = getSyntacticModifierFlagsNoCache(node) | ModifierFlags.HasComputedFlags;
    }

    if (includeJSDoc && !(node.modifierFlagsCache & ModifierFlags.HasComputedJSDocModifiers) && isInJSFile(node) && node.parent) {
      node.modifierFlagsCache |= Node.getJSDoc.modifierFlagsNoCache(node) | ModifierFlags.HasComputedJSDocModifiers;
    }

    return node.modifierFlagsCache & ~(ModifierFlags.HasComputedFlags | ModifierFlags.HasComputedJSDocModifiers);
  }

  export function getEffectiveModifierFlags(node: Node): ModifierFlags {
    return getModifierFlagsWorker(node, /*includeJSDoc*/ true);
  }

  export function getSyntacticModifierFlags(node: Node): ModifierFlags {
    return getModifierFlagsWorker(node, /*includeJSDoc*/ false);
  }


  export function getEffectiveModifierFlagsNoCache(node: Node): ModifierFlags {
    return getSyntacticModifierFlagsNoCache(node) | Node.getJSDoc.modifierFlagsNoCache(node);
  }

  export function getSyntacticModifierFlagsNoCache(node: Node): ModifierFlags {
    let flags = modifiersToFlags(node.modifiers);
    if (node.flags & NodeFlags.NestedNamespace || (node.kind === Syntax.Identifier && (<Identifier>node).isInJSDocNamespace)) {
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



  /** Get `C` given `N` if `N` is in the position `class C extends N` where `N` is an ExpressionWithTypeArguments. */
  export function tryGetClassExtendingExpressionWithTypeArguments(node: Node): ClassLikeDeclaration | undefined {
    const cls = tryGetClassImplementingOrExtendingExpressionWithTypeArguments(node);
    return cls && !cls.isImplements ? cls.class : undefined;
  }

  export interface ClassImplementingOrExtendingExpressionWithTypeArguments {
    readonly class: ClassLikeDeclaration;
    readonly isImplements: boolean;
  }
  export function tryGetClassImplementingOrExtendingExpressionWithTypeArguments(node: Node): ClassImplementingOrExtendingExpressionWithTypeArguments | undefined {
    return Node.is.kind(ExpressionWithTypeArguments, node) && Node.is.kind(HeritageClause, node.parent) && Node.is.classLike(node.parent.parent)
      ? { class: node.parent.parent, isImplements: node.parent.token === Syntax.ImplementsKeyword }
      : undefined;
  }

  export function isAssignmentExpression(node: Node, excludeCompoundAssignment: true): node is AssignmentExpression<EqualsToken>;
  export function isAssignmentExpression(node: Node, excludeCompoundAssignment?: false): node is AssignmentExpression<AssignmentOperatorToken>;
  export function isAssignmentExpression(node: Node, excludeCompoundAssignment?: boolean): node is AssignmentExpression<AssignmentOperatorToken> {
    return (
      Node.is.kind(BinaryExpression, node) && (excludeCompoundAssignment ? node.operatorToken.kind === Syntax.EqualsToken : syntax.is.assignmentOperator(node.operatorToken.kind)) && Node.is.leftHandSideExpression(node.left)
    );
  }

  export function isDestructuringAssignment(node: Node): node is DestructuringAssignment {
    if (isAssignmentExpression(node, /*excludeCompoundAssignment*/ true)) {
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
    return Node.is.kind(PropertyAccessExpression, node) && Node.is.kind(Identifier, node.name) && isEntityNameExpression(node.expression);
  }

  export function tryGetPropertyAccessOrIdentifierToString(expr: Expression): string | undefined {
    if (Node.is.kind(PropertyAccessExpression, expr)) {
      const baseStr = tryGetPropertyAccessOrIdentifierToString(expr.expression);
      if (baseStr !== undefined) {
        return baseStr + '.' + expr.name;
      }
    } else if (Node.is.kind(Identifier, expr)) {
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


  /** Return ".ts", ".d.ts", or ".tsx", if that is the extension. */
  export function tryExtractTSExtension(fileName: string): string | undefined {
    return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
  }

  function getExpandedCodes(input: string): number[] {
    const output: number[] = [];
    const length = input.length;

    for (let i = 0; i < length; i++) {
      const cc = input.charCodeAt(i);

      // handle utf8
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
      // Convert every 6-bits in the input 3 character points
      // into a base64 digit
      byte1 = ccs[i] >> 2;
      byte2 = ((ccs[i] & 0b00000011) << 4) | (ccs[i + 1] >> 4);
      byte3 = ((ccs[i + 1] & 0b00001111) << 2) | (ccs[i + 2] >> 6);
      byte4 = ccs[i + 2] & 0b00111111;

      // We are out of characters in the input, set the extra
      // digits to 64 (padding character).
      if (i + 1 >= length) {
        byte3 = byte4 = 64;
      } else if (i + 2 >= length) {
        byte4 = 64;
      }

      // Write to the output
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
        // `value` may be greater than 10FFFF (the maximum unicode codepoint) - JS will just make this into an invalid character for us
        output += String.fromCharCode(value);
      } else {
        // We don't want to kill the process when decoding fails (due to a following char byte not
        // following a leading char), so we just print the (bad) value
        output += String.fromCharCode(cc);
        i++;
      }
    }
    return output;
  }

  export function base64encode(host: { base64encode?(input: string): string } | undefined, input: string): string {
    if (host && host.base64encode) {
      return host.base64encode(input);
    }
    return convertToBase64(input);
  }

  export function base64decode(host: { base64decode?(input: string): string } | undefined, input: string): string {
    if (host && host.base64decode) {
      return host.base64decode(input);
    }
    const length = input.length;
    const expandedCodes: number[] = [];
    let i = 0;
    while (i < length) {
      // Stop decoding once padding characters are present
      if (input.charCodeAt(i) === base64Digits.charCodeAt(64)) {
        break;
      }
      // convert 4 input digits into three characters, ignoring padding characters at the end
      const ch1 = base64Digits.indexOf(input[i]);
      const ch2 = base64Digits.indexOf(input[i + 1]);
      const ch3 = base64Digits.indexOf(input[i + 2]);
      const ch4 = base64Digits.indexOf(input[i + 3]);

      const code1 = ((ch1 & 0b00111111) << 2) | ((ch2 >> 4) & 0b00000011);
      const code2 = ((ch2 & 0b00001111) << 4) | ((ch3 >> 2) & 0b00001111);
      const code3 = ((ch3 & 0b00000011) << 6) | (ch4 & 0b00111111);

      if (code2 === 0 && ch3 !== 0) {
        // code2 decoded to zero, but ch3 was padding - elide code2 and code3
        expandedCodes.push(code1);
      } else if (code3 === 0 && ch4 !== 0) {
        // code3 decoded to zero, but ch4 was padding, elide code3
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
      if (result.error) {
        return {};
      }
      return result.config;
    } catch (e) {
      // gracefully handle if readFile fails or returns not JSON
      return {};
    }
  }

  export function directoryProbablyExists(directoryName: string, host: { directoryExists?: (directoryName: string) => boolean }): boolean {
    // if host does not support 'directoryExists' assume that directory will exist
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
    const parseNode = Node.get.parseTreeOf(node);
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
    // Firefox has Object.prototype.watch
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
    /** Only reads from a variable. */
    Read,
    /** Only writes to a variable without using the result. E.g.: `x++;`. */
    Write,
    /** Writes to a variable and uses the result as an expression. E.g.: `f(x++);`. */
    ReadWrite,
  }
  function accessKind(node: Node): AccessKind {
    const { parent } = node;
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
        return left === node && syntax.is.assignmentOperator(operatorToken.kind) ? (operatorToken.kind === Syntax.EqualsToken ? AccessKind.Write : writeOrReadWrite()) : AccessKind.Read;
      case Syntax.PropertyAccessExpression:
        return (parent as PropertyAccessExpression).name !== node ? AccessKind.Read : accessKind(parent);
      case Syntax.PropertyAssignment: {
        const parentAccess = accessKind(parent.parent);
        // In `({ x: varname }) = { x: 1 }`, the left `x` is a read, the right `x` is a write.
        return node === (parent as PropertyAssignment).name ? reverseAccessKind(parentAccess) : parentAccess;
      }
      case Syntax.ShorthandPropertyAssignment:
        // Assume it's the local variable being accessed, since we don't check public properties for --noUnusedLocals.
        return node === (parent as ShorthandPropertyAssignment).objectAssignmentInitializer ? AccessKind.Read : accessKind(parent.parent);
      case Syntax.ArrayLiteralExpression:
        return accessKind(parent);
      default:
        return AccessKind.Read;
    }

    function writeOrReadWrite(): AccessKind {
      // If grandparent is not an ExpressionStatement, this is used as an expression in addition to having a side effect.
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
    if (!dst || !src || Object.keys(dst).length !== Object.keys(src).length) {
      return false;
    }

    for (const e in dst) {
      if (typeof dst[e] === 'object') {
        if (!compareDataObjects(dst[e], src[e])) {
          return false;
        }
      } else if (typeof dst[e] !== 'function') {
        if (dst[e] !== src[e]) {
          return false;
        }
      }
    }
    return true;
  }

  export function clearMap<T>(map: { forEach: QMap<T>['forEach']; clear: QMap<T>['clear'] }, onDeleteValue: (valueInMap: T, key: string) => void) {
    // Remove all
    map.forEach(onDeleteValue);
    map.clear();
  }

  export interface MutateMapSkippingNewValuesOptions<T, U> {
    onDeleteValue(existingValue: T, key: string): void;

    onExistingValue?(existingValue: T, valueInNewMap: U, key: string): void;
  }

  export function mutateMapSkippingNewValues<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, options: MutateMapSkippingNewValuesOptions<T, U>) {
    const { onDeleteValue, onExistingValue } = options;
    // Needs update
    map.forEach((existingValue, key) => {
      const valueInNewMap = newMap.get(key);
      // Not present any more in new map, remove it
      if (valueInNewMap === undefined) {
        map.delete(key);
        onDeleteValue(existingValue, key);
      }
      // If present notify about existing values
      else if (onExistingValue) {
        onExistingValue(existingValue, valueInNewMap, key);
      }
    });
  }

  export interface MutateMapOptions<T, U> extends MutateMapSkippingNewValuesOptions<T, U> {
    createNewValue(key: string, valueInNewMap: U): T;
  }

  export function mutateMap<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, options: MutateMapOptions<T, U>) {
    // Needs update
    mutateMapSkippingNewValues(map, newMap, options);

    const { createNewValue } = options;
    // Add new values that are not already present
    newMap.forEach((valueInNewMap, key) => {
      if (!map.has(key)) {
        // New values
        map.set(key, createNewValue(key, valueInNewMap));
      }
    });
  }

  // Return true if the given type is the constructor type for an abstract class
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
    return Node.is.kind(StringLiteral, moduleSpecifier) ? moduleSpecifier.text : Node.get.textOf(moduleSpecifier);
  }

  export function getLastChild(node: Node): Node | undefined {
    let lastChild: Node | undefined;
    Node.forEach.child(
      node,
      (child) => {
        if (Node.is.present(child)) lastChild = child;
      },
      (children) => {
        // As an optimization, jump straight to the end of the list.
        for (let i = children.length - 1; i >= 0; i--) {
          if (Node.is.present(children[i])) {
            lastChild = children[i];
            break;
          }
        }
      }
    );
    return lastChild;
  }

  /** Add a value to a set, and return true if it wasn't already present. */
  export function addToSeen(seen: QMap<true>, key: string | number): boolean;
  export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T): boolean;
  export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T = true as any): boolean {
    key = String(key);
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, value);
    return true;
  }

  export function isObjectTypeDeclaration(node: Node): node is ObjectTypeDeclaration {
    return Node.is.classLike(node) || Node.is.kind(InterfaceDeclaration, node) || Node.is.kind(TypeLiteralNode, node);
  }

  export function isAccessExpression(node: Node): node is AccessExpression {
    return node.kind === Syntax.PropertyAccessExpression || node.kind === Syntax.ElementAccessExpression;
  }

  export function getNameOfAccessExpression(node: AccessExpression) {
    if (node.kind === Syntax.PropertyAccessExpression) {
      return node.name;
    }
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
    if (!d1.relatedInformation && !d2.relatedInformation) {
      return Comparison.EqualTo;
    }
    if (d1.relatedInformation && d2.relatedInformation) {
      return (
        compareValues(d1.relatedInformation.length, d2.relatedInformation.length) ||
        forEach(d1.relatedInformation, (d1i, index) => {
          const d2i = d2.relatedInformation![index];
          return compareDiagnostics(d1i, d2i); // EqualTo is 0, so falsy, and will cause the next item to be compared
        }) ||
        Comparison.EqualTo
      );
    }
    return d1.relatedInformation ? Comparison.LessThan : Comparison.GreaterThan;
  }

  function compareMessageText(t1: string | DiagnosticMessageChain, t2: string | DiagnosticMessageChain): Comparison {
    if (typeof t1 === 'string' && typeof t2 === 'string') {
      return compareStringsCaseSensitive(t1, t2);
    } else if (typeof t1 === 'string') {
      return Comparison.LessThan;
    } else if (typeof t2 === 'string') {
      return Comparison.GreaterThan;
    }
    let res = compareStringsCaseSensitive(t1.messageText, t2.messageText);
    if (res) {
      return res;
    }
    if (!t1.next && !t2.next) {
      return Comparison.EqualTo;
    }
    if (!t1.next) {
      return Comparison.LessThan;
    }
    if (!t2.next) {
      return Comparison.GreaterThan;
    }
    const len = Math.min(t1.next.length, t2.next.length);
    for (let i = 0; i < len; i++) {
      res = compareMessageText(t1.next[i], t2.next[i]);
      if (res) {
        return res;
      }
    }
    if (t1.next.length < t2.next.length) {
      return Comparison.LessThan;
    } else if (t1.next.length > t2.next.length) {
      return Comparison.GreaterThan;
    }
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
        } else {
          // have already seen asterisk
          return false;
        }
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
              mapIterator(sf.resolvedModules.values(), (res) =>
                res && res.originalPath && res.resolvedFileName !== res.originalPath ? ([res.resolvedFileName, res.originalPath] as const) : undefined
              )
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

  // KLUDGE: Don't assume one 'node_modules' links to another. More likely a single directory inside the node_modules is the symlink.
  // ALso, don't assume that an `@foo` directory is linked. More likely the contents of that are linked.
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

  // Reserved characters, forces escaping of any non-word (or digit), non-whitespace character.
  // It may be inefficient (we could just match (/[-[\]{}()*+?.,\\^$|#\s]/g), but this is future
  // proof.
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
    /**
     * Matches any single directory segment unless it is the last segment and a .min.js file
     * Breakdown:
     *  [^./]                   # matches everything up to the first . character (excluding directory separators)
     *  (\\.(?!min\\.js$))?     # matches . characters but not if they are part of the .min.js file extension
     */
    singleAsteriskRegexFragment: '([^./]|(\\.(?!min\\.js$))?)*',
    /**
     * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
     * files or directories, does not match subdirectories that start with a . character
     */
    doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
    replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, filesMatcher.singleAsteriskRegexFragment),
  };

  const directoriesMatcher: WildcardMatcher = {
    singleAsteriskRegexFragment: '[^/]*',
    /**
     * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
     * files or directories, does not match subdirectories that start with a . character
     */
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
    // If excluding, match "foo/bar/baz...", but if including, only allow "foo".
    const terminator = usage === 'exclude' ? '($|/)' : '$';
    return `^(${pattern})${terminator}`;
  }

  export function getRegularExpressionsForWildcards(specs: readonly string[] | undefined, basePath: string, usage: 'files' | 'directories' | 'exclude'): readonly string[] | undefined {
    if (specs === undefined || specs.length === 0) {
      return;
    }

    return flatMap(specs, (spec) => spec && getSubPatternFromSpec(spec, basePath, usage, wildcardMatchers[usage]));
  }

  /**
   * An "includes" path "foo" is implicitly a glob "foo/** /*" (without the space) if its last component has no extension,
   * and does not contain any glob characters itself.
   */
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

    // getNormalizedPathComponents includes the separator for the root component.
    // We need to remove to create our regex correctly.
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
          // The * and ? wildcards should not match directories or files that start with . if they
          // appear first in a component. Dotted directories and files can be included explicitly
          // like so: **/.*/.*
          if (component.charCodeAt(0) === Codes.asterisk) {
            componentPattern += '([^./]' + singleAsteriskRegexFragment + ')?';
            component = component.substr(1);
          } else if (component.charCodeAt(0) === Codes.question) {
            componentPattern += '[^./]';
            component = component.substr(1);
          }

          componentPattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);

          // Patterns should not include subfolders like node_modules unless they are
          // explicitly included as part of the path.
          //
          // As an optimization, if the component pattern is the same as the component,
          // then there definitely were no wildcard characters and we do not need to
          // add the exclusion pattern.
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
    /** One pattern for each "include" spec. */
    includeFilePatterns: readonly string[] | undefined;
    /** One pattern matching one of any of the "include" specs. */
    includeFilePattern: string | undefined;
    includeDirectoryPattern: string | undefined;
    excludePattern: string | undefined;
    basePaths: readonly string[];
  }

  /** @param path directory of the tsconfig.json */
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

  /** @param path directory of the tsconfig.json */
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

    // Associate an array of results with each include regex. This keeps results in order of the "include" order.
    // If there are no "includes", then just put everything in results[0].
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

  /**
   * Computes the unique non-wildcard base paths amongst the provided include patterns.
   */
  function getBasePaths(path: string, includes: readonly string[] | undefined, useCaseSensitiveFileNames: boolean): string[] {
    // Storage for our results in the form of literal paths (e.g. the paths as written by the user).
    const basePaths: string[] = [path];

    if (includes) {
      // Storage for literal base paths amongst the include patterns.
      const includeBasePaths: string[] = [];
      for (const include of includes) {
        // We also need to check the relative paths by converting them to absolute and normalizing
        // in case they escape the base path (e.g "..\somedirectory")
        const absolute: string = isRootedDiskPath(include) ? include : normalizePath(combinePaths(path, include));
        // Append the literal and canonical candidate base paths.
        includeBasePaths.push(getIncludeBasePath(absolute));
      }

      // Sort the offsets array using either the literal or canonical path representations.
      includeBasePaths.sort(getStringComparer(!useCaseSensitiveFileNames));

      // Iterate over each include base path and include unique base paths that are not a
      // subpath of an existing base path
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
    if (wildcardOffset < 0) {
      // No "*" or "?" in the path
      return !hasExtension(absolute) ? absolute : removeTrailingDirectorySeparator(getDirectoryPath(absolute));
    }
    return absolute.substring(0, absolute.lastIndexOf(dirSeparator, wildcardOffset));
  }

  export function ensureScriptKind(fileName: string, scriptKind: ScriptKind | undefined): ScriptKind {
    // Using scriptKind as a condition handles both:
    // - 'scriptKind' is unspecified and thus it is `undefined`
    // - 'scriptKind' is set and it is `Unknown` (0)
    // If the 'scriptKind' is 'undefined' or 'Unknown' then we attempt
    // to get the ScriptKind from the file name. If it cannot be resolved
    // from the file name then the default 'TS' script kind is returned.
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

  /**
   *  List of supported extensions in order of file resolution precedence.
   */
  export const supportedTSExtensions: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts];
  export const supportedTSExtensionsWithJson: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts, Extension.Json];
  /** Must have ".d.ts" first because if ".ts" goes first, that will be detected as the extension instead of ".d.ts". */
  export const supportedTSExtensionsForExtractExtension: readonly Extension[] = [Extension.Dts, Extension.Ts, Extension.Tsx];
  export const supportedJSExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx];
  export const supportedJSAndJsonExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx, Extension.Json];
  const allSupportedExtensions: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions];
  const allSupportedExtensionsWithJson: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions, Extension.Json];

  export function getSupportedExtensions(options?: CompilerOptions): readonly Extension[];
  export function getSupportedExtensions(options?: CompilerOptions, extraFileExtensions?: readonly FileExtensionInfo[]): readonly string[];
  export function getSupportedExtensions(options?: CompilerOptions, extraFileExtensions?: readonly FileExtensionInfo[]): readonly string[] {
    const needJsExtensions = options && options.allowJs;

    if (!extraFileExtensions || extraFileExtensions.length === 0) {
      return needJsExtensions ? allSupportedExtensions : supportedTSExtensions;
    }

    const extensions = [
      ...(needJsExtensions ? allSupportedExtensions : supportedTSExtensions),
      ...mapDefined(extraFileExtensions, (x) => (x.scriptKind === ScriptKind.Deferred || (needJsExtensions && isJSLike(x.scriptKind)) ? x.extension : undefined)),
    ];

    return deduplicate<string>(extensions, equateStringsCaseSensitive, compareStringsCaseSensitive);
  }

  export function getSuppoertedExtensionsWithJsonIfResolveJsonModule(options: CompilerOptions | undefined, supportedExtensions: readonly string[]): readonly string[] {
    if (!options || !options.resolveJsonModule) {
      return supportedExtensions;
    }
    if (supportedExtensions === allSupportedExtensions) {
      return allSupportedExtensionsWithJson;
    }
    if (supportedExtensions === supportedTSExtensions) {
      return supportedTSExtensionsWithJson;
    }
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
    if (!fileName) {
      return false;
    }

    const supportedExtensions = getSupportedExtensions(compilerOptions, extraFileExtensions);
    for (const extension of getSuppoertedExtensionsWithJsonIfResolveJsonModule(compilerOptions, supportedExtensions)) {
      if (fileExtensionIs(fileName, extension)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extension boundaries by priority. Lower numbers indicate higher priorities, and are
   * aligned to the offset of the highest priority extension in the
   * allSupportedExtensions array.
   */
  export const enum ExtensionPriority {
    TypeScriptFiles = 0,
    DeclarationAndJavaScriptFiles = 2,

    Highest = TypeScriptFiles,
    Lowest = DeclarationAndJavaScriptFiles,
  }

  export function getExtensionPriority(path: string, supportedExtensions: readonly string[]): ExtensionPriority {
    for (let i = supportedExtensions.length - 1; i >= 0; i--) {
      if (fileExtensionIs(path, supportedExtensions[i])) {
        return adjustExtensionPriority(<ExtensionPriority>i, supportedExtensions);
      }
    }

    // If its not in the list of supported extensions, this is likely a
    // TypeScript file with a non-ts extension
    return ExtensionPriority.Highest;
  }

  /**
   * Adjusts an extension priority to be the highest priority within the same range.
   */
  export function adjustExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
    if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) {
      return ExtensionPriority.TypeScriptFiles;
    } else if (extensionPriority < supportedExtensions.length) {
      return ExtensionPriority.DeclarationAndJavaScriptFiles;
    } else {
      return supportedExtensions.length;
    }
  }

  /**
   * Gets the next lowest extension priority for a given priority.
   */
  export function getNextLowestExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
    if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) {
      return ExtensionPriority.DeclarationAndJavaScriptFiles;
    } else {
      return supportedExtensions.length;
    }
  }

  const extensionsToRemove = [Extension.Dts, Extension.Ts, Extension.Js, Extension.Tsx, Extension.Jsx, Extension.Json];
  export function removeFileExtension(path: string): string {
    for (const ext of extensionsToRemove) {
      const extensionless = tryRemoveExtension(path, ext);
      if (extensionless !== undefined) {
        return extensionless;
      }
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
    return <T>changeAnyExtension(path, newExtension, extensionsToRemove, /*ignoreCase*/ false);
  }

  export function tryParsePattern(pattern: string): Pattern | undefined {
    // This should be verified outside of here and a proper error thrown.
    assert(hasZeroOrOneAsteriskCharacter(pattern));
    const indexOfStar = pattern.indexOf('*');
    return indexOfStar === -1
      ? undefined
      : {
          prefix: pattern.substr(0, indexOfStar),
          suffix: pattern.substr(indexOfStar + 1),
        };
  }

  /** True if an extension is one of the supported TypeScript extensions. */
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
        // pattern was matched as is - no need to search further
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
    if (!relatedInformation.length) {
      return diagnostic;
    }
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
    // If skipLibCheck is enabled, skip reporting errors if file is a declaration file.
    // If skipDefaultLibCheck is enabled, skip reporting errors if file contains a
    // '/// <reference no-default-lib="true"/>' directive.
    return (options.skipLibCheck && sourceFile.isDeclarationFile) || (options.skipDefaultLibCheck && sourceFile.hasNoDefaultLib) || host.isSourceOfProjectReferenceRedirect(sourceFile.fileName);
  }

  export function isJsonEqual(a: unknown, b: unknown): boolean {
    // eslint-disable-next-line no-null/no-null
    return a === b || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && equalOwnProperties(a as MapLike<unknown>, b as MapLike<unknown>, isJsonEqual));
  }

  export function getOrUpdate<T>(map: QMap<T>, key: string, getDefault: () => T): T {
    const got = map.get(key);
    if (got === undefined) {
      const value = getDefault();
      map.set(key, value);
      return value;
    } else {
      return got;
    }
  }

  /**
   * Converts a bigint literal string, e.g. `0x1234n`,
   * to its decimal string representation, e.g. `4660`.
   */
  export function parsePseudoBigInt(stringValue: string): string {
    let log2Base: number;
    switch (
      stringValue.charCodeAt(1) // "x" in "0x123"
    ) {
      case Codes.b:
      case Codes.B: // 0b or 0B
        log2Base = 1;
        break;
      case Codes.o:
      case Codes.O: // 0o or 0O
        log2Base = 3;
        break;
      case Codes.x:
      case Codes.X: // 0x or 0X
        log2Base = 4;
        break;
      default:
        // already in decimal; omit trailing "n"
        const nIndex = stringValue.length - 1;
        // Skip leading 0s
        let nonZeroStart = 0;
        while (stringValue.charCodeAt(nonZeroStart) === Codes._0) {
          nonZeroStart++;
        }
        return stringValue.slice(nonZeroStart, nIndex) || '0';
    }

    // Omit leading "0b", "0o", or "0x", and trailing "n"
    const startIndex = 2,
      endIndex = stringValue.length - 1;
    const bitsNeeded = (endIndex - startIndex) * log2Base;
    // Stores the value specified by the string as a LE array of 16-bit integers
    // using Uint16 instead of Uint32 so combining steps can use bitwise operators
    const segments = new Uint16Array((bitsNeeded >>> 4) + (bitsNeeded & 15 ? 1 : 0));
    // Add the digits, one at a time
    for (let i = endIndex - 1, bitOffset = 0; i >= startIndex; i--, bitOffset += log2Base) {
      const segment = bitOffset >>> 4;
      const digitChar = stringValue.charCodeAt(i);
      // Find character range: 0-9 < A-F < a-f
      const digit = digitChar <= Codes._9 ? digitChar - Codes._0 : 10 + digitChar - (digitChar <= Codes.F ? Codes.A : Codes.a);
      const shiftedDigit = digit << (bitOffset & 15);
      segments[segment] |= shiftedDigit;
      const residual = shiftedDigit >>> 16;
      if (residual) segments[segment + 1] |= residual; // overflows segment
    }
    // Repeatedly divide segments by 10 and add remainder to base10Value
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
      Node.is.partOfTypeQuery(useSite) ||
      isIdentifierInNonEmittingHeritageClause(useSite) ||
      isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(useSite) ||
      !Node.is.expressionNode(useSite)
    );
  }

  export function typeOnlyDeclarationIsExport(typeOnlyDeclaration: Node) {
    return typeOnlyDeclaration.kind === Syntax.ExportSpecifier;
  }

  function isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(node: Node) {
    while (node.kind === Syntax.Identifier || node.kind === Syntax.PropertyAccessExpression) {
      node = node.parent;
    }
    if (node.kind !== Syntax.ComputedPropertyName) {
      return false;
    }
    if (hasSyntacticModifier(node.parent, ModifierFlags.Abstract)) {
      return true;
    }
    const containerKind = node.parent.parent.kind;
    return containerKind === Syntax.InterfaceDeclaration || containerKind === Syntax.TypeLiteral;
  }

  /** Returns true for an identifier in 1) an `implements` clause, and 2) an `extends` clause of an interface. */
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
    return Node.is.kind(TypeReferenceNode, node) && Node.is.kind(Identifier, node.typeName);
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
}
