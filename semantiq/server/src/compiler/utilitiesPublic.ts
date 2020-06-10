namespace qnr {
  export function isExternalModuleNameRelative(moduleName: string) {
    return pathIsRelative(moduleName) || isRootedDiskPath(moduleName);
  }

  export function sortAndDeduplicateDiagnostics<T extends Diagnostic>(diagnostics: readonly T[]): SortedReadonlyArray<T> {
    return sortAndDeduplicate<T>(diagnostics, compareDiagnostics);
  }

  export function getDefaultLibFileName(options: CompilerOptions): string {
    switch (options.target) {
      case ScriptTarget.ESNext:
        return 'lib.esnext.full.d.ts';
      case ScriptTarget.ES2020:
        return 'lib.es2020.full.d.ts';
      default:
        return 'lib.d.ts';
    }
  }

  export function getTypeParameterOwner(d: Declaration): Declaration | undefined {
    if (d && d.kind === Syntax.TypeParameter) {
      for (let current: Node = d; current; current = current.parent) {
        if (isFunctionLike(current) || isClassLike(current) || current.kind === Syntax.InterfaceDeclaration) {
          return <Declaration>current;
        }
      }
    }
    return;
  }

  export type ParameterPropertyDeclaration = ParameterDeclaration & { parent: ConstructorDeclaration; name: Identifier };
  export function isParameterPropertyDeclaration(n: Node, parent: Node): n is ParameterPropertyDeclaration {
    return hasSyntacticModifier(n, ModifierFlags.ParameterPropertyModifier) && parent.kind === Syntax.Constructor;
  }

  export function isEmptyBindingPattern(n: BindingName): n is BindingPattern {
    if (isBindingPattern(n)) return every(n.elements, isEmptyBindingElement);
    return false;
  }

  export function isEmptyBindingElement(n: BindingElement) {
    if (isOmittedExpression(n)) return true;

    return isEmptyBindingPattern(n.name);
  }

  export function walkUpBindingElementsAndPatterns(binding: BindingElement): VariableDeclaration | ParameterDeclaration {
    let n = binding.parent;
    while (BindingElement.kind(n.parent)) {
      n = n.parent.parent;
    }
    return n.parent;
  }

  function getCombinedFlags(n: Node, getFlags: (n: Node) => number): number {
    if (BindingElement.kind(n)) {
      n = walkUpBindingElementsAndPatterns(n);
    }
    let flags = getFlags(n);
    if (n.kind === Syntax.VariableDeclaration) n = n.parent;

    if (n && n.kind === Syntax.VariableDeclarationList) {
      flags |= getFlags(n);
      n = n.parent;
    }
    if (n && n.kind === Syntax.VariableStatement) flags |= getFlags(n);

    return flags;
  }

  export function getCombinedModifierFlags(n: Declaration): ModifierFlags {
    return getCombinedFlags(n, getEffectiveModifierFlags);
  }

  export function getCombinedNodeFlags(n: Node): NodeFlags {
    return getCombinedFlags(n, (n) => n.flags);
  }

  export function validateLocaleAndSetLanguage(
    locale: string,
    sys: {
      getExecutingFilePath(): string;
      resolvePath(path: string): string;
      fileExists(fileName: string): boolean;
      readFile(fileName: string): string | undefined;
    },
    errors?: Push<Diagnostic>
  ) {
    const matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());

    if (!matchResult) {
      if (errors) {
        errors.push(createCompilerDiagnostic(Diagnostics.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp'));
      }
      return;
    }

    const language = matchResult[1];
    const territory = matchResult[3];
    if (!trySetLanguageAndTerritory(language, territory, errors)) {
      trySetLanguageAndTerritory(language, /*territory*/ undefined, errors);
    }
    setUILocale(locale);

    function trySetLanguageAndTerritory(language: string, territory: string | undefined, errors?: Push<Diagnostic>) {
      const compilerFilePath = normalizePath(sys.getExecutingFilePath());
      const containingDirectoryPath = getDirectoryPath(compilerFilePath);
      let filePath = combinePaths(containingDirectoryPath, language);
      if (territory) filePath = filePath + '-' + territory;
      filePath = sys.resolvePath(combinePaths(filePath, 'diagnosticMessages.generated.json'));
      if (!sys.fileExists(filePath)) return false;
      // TODO: Add codePage support for readFile?
      let fileContents: string | undefined = '';
      try {
        fileContents = sys.readFile(filePath);
      } catch (e) {
        if (errors) {
          errors.push(createCompilerDiagnostic(Diagnostics.Unable_to_open_file_0, filePath));
        }
        return false;
      }
      try {
        // this is a global mutation (or live binding update)!
        setLocalizedDiagnosticMessages(JSON.parse(fileContents!));
      } catch {
        if (errors) {
          errors.push(createCompilerDiagnostic(Diagnostics.Corrupted_locale_file_0, filePath));
        }
        return false;
      }
      return true;
    }
  }

  export function getOriginalNode(n: Node): Node;
  export function getOriginalNode<T extends Node>(n: Node, nTest: (n: Node) => n is T): T;
  export function getOriginalNode(n: Node | undefined): Node | undefined;
  export function getOriginalNode<T extends Node>(n: Node | undefined, nTest: (n: Node | undefined) => n is T): T | undefined;
  export function getOriginalNode(n: Node | undefined, nTest?: (n: Node | undefined) => boolean): Node | undefined {
    if (n) {
      while (n.original !== undefined) {
        n = n.original;
      }
    }
    return !nTest || nTest(n) ? n : undefined;
  }

  export function isParseTreeNode(n: Node) {
    return (n.flags & NodeFlags.Synthesized) === 0;
  }

  export function getParseTreeNode(n: Node): Node;
  export function getParseTreeNode<T extends Node>(n: Node | undefined, nTest?: (n: Node) => n is T): T | undefined;
  export function getParseTreeNode(n: Node | undefined, nTest?: (n: Node) => boolean): Node | undefined {
    if (n === undefined || isParseTreeNode(n)) return n;
    n = getOriginalNode(n);
    if (isParseTreeNode(n) && (!nTest || nTest(n))) return n;
    return;
  }

  export function idText(identifierOrPrivateName: Identifier | PrivateIdentifier): string {
    return Scanner.unescapeUnderscores(identifierOrPrivateName.escapedText);
  }

  export function symbolName(s: Symbol): string {
    if (s.valueDeclaration && isPrivateIdentifierPropertyDeclaration(s.valueDeclaration)) {
      return idText(s.valueDeclaration.name);
    }
    return Scanner.unescapeUnderscores(s.escapedName);
  }

  function nameForNamelessJSDocTypedef(declaration: JSDocTypedefTag | JSDocEnumTag): Identifier | PrivateIdentifier | undefined {
    const n = declaration.parent.parent;
    if (!n) return;
    if (isDeclaration(n)) return getDeclarationIdentifier(n);
    switch (n.kind) {
      case Syntax.VariableStatement:
        if (n.declarationList && n.declarationList.declarations[0]) {
          return getDeclarationIdentifier(n.declarationList.declarations[0]);
        }
        break;
      case Syntax.ExpressionStatement:
        let expr = n.expression;
        if (expr.kind === Syntax.BinaryExpression && (expr as BinaryExpression).operatorToken.kind === Syntax.EqualsToken) {
          expr = (expr as BinaryExpression).left;
        }
        switch (expr.kind) {
          case Syntax.PropertyAccessExpression:
            return (expr as PropertyAccessExpression).name;
          case Syntax.ElementAccessExpression:
            const arg = (expr as ElementAccessExpression).argumentExpression;
            if (isIdentifier(arg)) return arg;
        }
        break;
      case Syntax.ParenthesizedExpression: {
        return getDeclarationIdentifier(n.expression);
      }
      case Syntax.LabeledStatement: {
        if (isDeclaration(n.statement) || isExpression(n.statement)) return getDeclarationIdentifier(n.statement);
        break;
      }
    }
    return;
  }

  function getDeclarationIdentifier(n: Declaration | Expression): Identifier | undefined {
    const name = getNameOfDeclaration(n);
    return name && isIdentifier(name) ? name : undefined;
  }

  export function nHasName(n: Node, name: Identifier) {
    if (isNamedDeclaration(n) && isIdentifier(n.name) && idText(n.name as Identifier) === idText(name)) return true;
    if (isVariableStatement(n) && some(n.declarationList.declarations, (d) => nHasName(d, name))) return true;
    return false;
  }

  export function getNameOfJSDocTypedef(declaration: JSDocTypedefTag): Identifier | PrivateIdentifier | undefined {
    return declaration.name || nameForNamelessJSDocTypedef(declaration);
  }

  export function isNamedDeclaration(n: Node): n is NamedDeclaration & { name: DeclarationName } {
    return !!(n as NamedDeclaration).name;
  }

  export function getNonAssignedNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
    switch (declaration.kind) {
      case Syntax.Identifier:
        return declaration as Identifier;
      case Syntax.JSDocPropertyTag:
      case Syntax.JSDocParameterTag: {
        const { name } = declaration as JSDocPropertyLikeTag;
        if (name.kind === Syntax.QualifiedName) {
          return name.right;
        }
        break;
      }
      case Syntax.CallExpression:
      case Syntax.BinaryExpression: {
        const expr = declaration as BinaryExpression | CallExpression;
        switch (getAssignmentDeclarationKind(expr)) {
          case AssignmentDeclarationKind.ExportsProperty:
          case AssignmentDeclarationKind.ThisProperty:
          case AssignmentDeclarationKind.Property:
          case AssignmentDeclarationKind.PrototypeProperty:
            return getElementOrPropertyAccessArgumentExpressionOrName((expr as BinaryExpression).left as AccessExpression);
          case AssignmentDeclarationKind.ObjectDefinePropertyValue:
          case AssignmentDeclarationKind.ObjectDefinePropertyExports:
          case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
            return (expr as BindableObjectDefinePropertyCall).arguments[1];
          default:
            return;
        }
      }
      case Syntax.JSDocTypedefTag:
        return getNameOfJSDocTypedef(declaration as JSDocTypedefTag);
      case Syntax.JSDocEnumTag:
        return nameForNamelessJSDocTypedef(declaration as JSDocEnumTag);
      case Syntax.ExportAssignment: {
        const { expression } = declaration as ExportAssignment;
        return isIdentifier(expression) ? expression : undefined;
      }
      case Syntax.ElementAccessExpression:
        const expr = declaration as ElementAccessExpression;
        if (isBindableStaticElementAccessExpression(expr)) return expr.argumentExpression;
    }
    return (declaration as NamedDeclaration).name;
  }

  export function getNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
    if (declaration === undefined) return;
    return getNonAssignedNameOfDeclaration(declaration) || (isFunctionExpression(declaration) || isClassExpression(declaration) ? getAssignedName(declaration) : undefined);
  }

  function getAssignedName(n: Node): DeclarationName | undefined {
    if (!n.parent) {
      return;
    } else if (isPropertyAssignment(n.parent) || BindingElement.kind(n.parent)) {
      return n.parent.name;
    } else if (isBinaryExpression(n.parent) && n === n.parent.right) {
      if (isIdentifier(n.parent.left)) {
        return n.parent.left;
      } else if (isAccessExpression(n.parent.left)) {
        return getElementOrPropertyAccessArgumentExpressionOrName(n.parent.left);
      }
    } else if (isVariableDeclaration(n.parent) && isIdentifier(n.parent.name)) {
      return n.parent.name;
    }
    return;
  }

  function getJSDocParameterTagsWorker(param: ParameterDeclaration, noCache?: boolean): readonly JSDocParameterTag[] {
    if (param.name) {
      if (isIdentifier(param.name)) {
        const name = param.name.escapedText;
        return getJSDocTagsWorker(param.parent, noCache).filter((tag): tag is JSDocParameterTag => isJSDocParameterTag(tag) && isIdentifier(tag.name) && tag.name.escapedText === name);
      } else {
        const i = param.parent.parameters.indexOf(param);
        assert(i > -1, "Parameters should always be in their parents' parameter list");
        const paramTags = getJSDocTagsWorker(param.parent, noCache).filter(isJSDocParameterTag);
        if (i < paramTags.length) return [paramTags[i]];
      }
    }
    return emptyArray;
  }

  export function getJSDocParameterTags(param: ParameterDeclaration): readonly JSDocParameterTag[] {
    return getJSDocParameterTagsWorker(param, /*noCache*/ false);
  }

  export function getJSDocParameterTagsNoCache(param: ParameterDeclaration): readonly JSDocParameterTag[] {
    return getJSDocParameterTagsWorker(param, /*noCache*/ true);
  }

  function getJSDocTypeParameterTagsWorker(param: TypeParameterDeclaration, noCache?: boolean): readonly JSDocTemplateTag[] {
    const name = param.name.escapedText;
    return getJSDocTagsWorker(param.parent, noCache).filter((tag): tag is JSDocTemplateTag => isJSDocTemplateTag(tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name));
  }

  export function getJSDocTypeParameterTags(param: TypeParameterDeclaration): readonly JSDocTemplateTag[] {
    return getJSDocTypeParameterTagsWorker(param, /*noCache*/ false);
  }

  export function getJSDocTypeParameterTagsNoCache(param: TypeParameterDeclaration): readonly JSDocTemplateTag[] {
    return getJSDocTypeParameterTagsWorker(param, /*noCache*/ true);
  }

  export function hasJSDocParameterTags(n: FunctionLikeDeclaration | SignatureDeclaration) {
    return !!getFirstJSDocTag(n, isJSDocParameterTag);
  }

  export function getJSDocAugmentsTag(n: Node): JSDocAugmentsTag | undefined {
    return getFirstJSDocTag(n, isJSDocAugmentsTag);
  }

  export function getJSDocImplementsTags(n: Node): readonly JSDocImplementsTag[] {
    return getAllJSDocTags(n, isJSDocImplementsTag);
  }

  export function getJSDocClassTag(n: Node): JSDocClassTag | undefined {
    return getFirstJSDocTag(n, isJSDocClassTag);
  }

  export function getJSDocPublicTag(n: Node): JSDocPublicTag | undefined {
    return getFirstJSDocTag(n, isJSDocPublicTag);
  }

  export function getJSDocPublicTagNoCache(n: Node): JSDocPublicTag | undefined {
    return getFirstJSDocTag(n, isJSDocPublicTag, /*noCache*/ true);
  }

  export function getJSDocPrivateTag(n: Node): JSDocPrivateTag | undefined {
    return getFirstJSDocTag(n, isJSDocPrivateTag);
  }

  export function getJSDocPrivateTagNoCache(n: Node): JSDocPrivateTag | undefined {
    return getFirstJSDocTag(n, isJSDocPrivateTag, /*noCache*/ true);
  }

  export function getJSDocProtectedTag(n: Node): JSDocProtectedTag | undefined {
    return getFirstJSDocTag(n, isJSDocProtectedTag);
  }

  export function getJSDocProtectedTagNoCache(n: Node): JSDocProtectedTag | undefined {
    return getFirstJSDocTag(n, isJSDocProtectedTag, /*noCache*/ true);
  }

  export function getJSDocReadonlyTag(n: Node): JSDocReadonlyTag | undefined {
    return getFirstJSDocTag(n, isJSDocReadonlyTag);
  }

  export function getJSDocReadonlyTagNoCache(n: Node): JSDocReadonlyTag | undefined {
    return getFirstJSDocTag(n, isJSDocReadonlyTag, /*noCache*/ true);
  }

  export function getJSDocEnumTag(n: Node): JSDocEnumTag | undefined {
    return getFirstJSDocTag(n, isJSDocEnumTag);
  }

  export function getJSDocThisTag(n: Node): JSDocThisTag | undefined {
    return getFirstJSDocTag(n, isJSDocThisTag);
  }

  export function getJSDocReturnTag(n: Node): JSDocReturnTag | undefined {
    return getFirstJSDocTag(n, isJSDocReturnTag);
  }

  export function getJSDocTemplateTag(n: Node): JSDocTemplateTag | undefined {
    return getFirstJSDocTag(n, isJSDocTemplateTag);
  }

  export function getJSDocTypeTag(n: Node): JSDocTypeTag | undefined {
    const tag = getFirstJSDocTag(n, isJSDocTypeTag);
    if (tag && tag.typeExpression && tag.typeExpression.type) return tag;
    return;
  }

  export function getJSDocType(n: Node): TypeNode | undefined {
    let tag: JSDocTypeTag | JSDocParameterTag | undefined = getFirstJSDocTag(n, isJSDocTypeTag);
    if (!tag && isParameter(n)) tag = find(getJSDocParameterTags(n), (tag) => !!tag.typeExpression);
    return tag && tag.typeExpression && tag.typeExpression.type;
  }

  export function getJSDocReturnType(n: Node): TypeNode | undefined {
    const returnTag = getJSDocReturnTag(n);
    if (returnTag && returnTag.typeExpression) return returnTag.typeExpression.type;
    const typeTag = getJSDocTypeTag(n);
    if (typeTag && typeTag.typeExpression) {
      const type = typeTag.typeExpression.type;
      if (TypeLiteralNode.kind(type)) {
        const sig = find(type.members, CallSignatureDeclaration.kind);
        return sig && sig.type;
      }
      if (FunctionTypeNode.kind(type) || isJSDocFunctionType(type)) return type.type;
    }
    return;
  }

  function getJSDocTagsWorker(n: Node, noCache?: boolean): readonly JSDocTag[] {
    let tags = (n as JSDocContainer).jsDocCache;
    if (tags === undefined || noCache) {
      const comments = getJSDocCommentsAndTags(n, noCache);
      assert(comments.length < 2 || comments[0] !== comments[1]);
      tags = flatMap(comments, (j) => (isJSDoc(j) ? j.tags : j));
      if (!noCache) (n as JSDocContainer).jsDocCache = tags;
    }
    return tags;
  }

  export function getJSDocTags(n: Node): readonly JSDocTag[] {
    return getJSDocTagsWorker(n, /*noCache*/ false);
  }

  export function getJSDocTagsNoCache(n: Node): readonly JSDocTag[] {
    return getJSDocTagsWorker(n, /*noCache*/ true);
  }

  function getFirstJSDocTag<T extends JSDocTag>(n: Node, predicate: (tag: JSDocTag) => tag is T, noCache?: boolean): T | undefined {
    return find(getJSDocTagsWorker(n, noCache), predicate);
  }

  export function getAllJSDocTags<T extends JSDocTag>(n: Node, predicate: (tag: JSDocTag) => tag is T): readonly T[] {
    return getJSDocTags(n).filter(predicate);
  }

  export function getAllJSDocTagsOfKind(n: Node, kind: Syntax): readonly JSDocTag[] {
    return getJSDocTags(n).filter((doc) => doc.kind === kind);
  }

  export function getEffectiveTypeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
    if (isJSDocSignature(n)) return emptyArray;
    if (isJSDocTypeAlias(n)) {
      assert(n.parent.kind === Syntax.JSDocComment);
      return flatMap(n.parent.tags, (tag) => (isJSDocTemplateTag(tag) ? tag.typeParameters : undefined));
    }
    if (n.typeParameters) return n.typeParameters;
    if (isInJSFile(n)) {
      const decls = getJSDocTypeParameterDeclarations(n);
      if (decls.length) return decls;
      const typeTag = getJSDocType(n);
      if (typeTag && FunctionTypeNode.kind(typeTag) && typeTag.typeParameters) return typeTag.typeParameters;
    }
    return emptyArray;
  }

  export function getEffectiveConstraintOfTypeParameter(n: TypeParameterDeclaration): TypeNode | undefined {
    return n.constraint ? n.constraint : isJSDocTemplateTag(n.parent) && n === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
  }

  export function isIdentifier(n: Node): n is Identifier {
    return n.kind === Syntax.Identifier;
  }

  export function isPrivateIdentifier(n: Node): n is PrivateIdentifier {
    return n.kind === Syntax.PrivateIdentifier;
  }

  export function isIdentifierOrPrivateIdentifier(n: Node): n is Identifier | PrivateIdentifier {
    return n.kind === Syntax.Identifier || n.kind === Syntax.PrivateIdentifier;
  }

  export function isTypeParameterDeclaration(n: Node): n is TypeParameterDeclaration {
    return n.kind === Syntax.TypeParameter;
  }

  export function isParameter(n: Node): n is ParameterDeclaration {
    return n.kind === Syntax.Parameter;
  }

  export function isDecorator(n: Node): n is Decorator {
    return n.kind === Syntax.Decorator;
  }

  export function isArrayLiteralExpression(n: Node): n is ArrayLiteralExpression {
    return n.kind === Syntax.ArrayLiteralExpression;
  }

  export function isObjectLiteralExpression(n: Node): n is ObjectLiteralExpression {
    return n.kind === Syntax.ObjectLiteralExpression;
  }

  export function isPropertyAccessExpression(n: Node): n is PropertyAccessExpression {
    return n.kind === Syntax.PropertyAccessExpression;
  }

  export function isPropertyAccessChain(n: Node): n is PropertyAccessChain {
    return isPropertyAccessExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isElementAccessExpression(n: Node): n is ElementAccessExpression {
    return n.kind === Syntax.ElementAccessExpression;
  }

  export function isElementAccessChain(n: Node): n is ElementAccessChain {
    return isElementAccessExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isCallExpression(n: Node): n is CallExpression {
    return n.kind === Syntax.CallExpression;
  }

  export function isCallChain(n: Node): n is CallChain {
    return isCallExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isOptionalChain(n: Node): n is PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain {
    const k = n.kind;
    return !!(n.flags & NodeFlags.OptionalChain) && (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression || k === Syntax.CallExpression || k === Syntax.NonNullExpression);
  }

  export function isOptionalChainRoot(n: Node): n is OptionalChainRoot {
    return isOptionalChain(n) && !isNonNullExpression(n) && !!n.questionDotToken;
  }

  export function isExpressionOfOptionalChainRoot(n: Node): n is Expression & { parent: OptionalChainRoot } {
    return isOptionalChainRoot(n.parent) && n.parent.expression === n;
  }

  /**
   * Determines whether a n is the outermost `OptionalChain` in an ECMAScript `OptionalExpression`:
   *
   * 1. For `a?.b.c`, the outermost chain is `a?.b.c` (`c` is the end of the chain starting at `a?.`)
   * 2. For `a?.b!`, the outermost chain is `a?.b` (`b` is the end of the chain starting at `a?.`)
   * 3. For `(a?.b.c).d`, the outermost chain is `a?.b.c` (`c` is the end of the chain starting at `a?.` since parens end the chain)
   * 4. For `a?.b.c?.d`, both `a?.b.c` and `a?.b.c?.d` are outermost (`c` is the end of the chain starting at `a?.`, and `d` is
   *   the end of the chain starting at `c?.`)
   * 5. For `a?.(b?.c).d`, both `b?.c` and `a?.(b?.c)d` are outermost (`c` is the end of the chain starting at `b`, and `d` is
   *   the end of the chain starting at `a?.`)
   */
  export function isOutermostOptionalChain(n: OptionalChain) {
    return (
      !isOptionalChain(n.parent) || // cases 1, 2, and 3
      isOptionalChainRoot(n.parent) || // case 4
      n !== n.parent.expression
    ); // case 5
  }

  export function isNullishCoalesce(n: Node) {
    return n.kind === Syntax.BinaryExpression && (<BinaryExpression>n).operatorToken.kind === Syntax.Question2Token;
  }

  export function isNewExpression(n: Node): n is NewExpression {
    return n.kind === Syntax.NewExpression;
  }

  export function isTaggedTemplateExpression(n: Node): n is TaggedTemplateExpression {
    return n.kind === Syntax.TaggedTemplateExpression;
  }

  export function isTypeAssertion(n: Node): n is TypeAssertion {
    return n.kind === Syntax.TypeAssertionExpression;
  }

  export function isConstTypeReference(n: Node) {
    return TypeReferenceNode.kind(n) && isIdentifier(n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
  }

  export function isParenthesizedExpression(n: Node): n is ParenthesizedExpression {
    return n.kind === Syntax.ParenthesizedExpression;
  }

  export function skipPartiallyEmittedExpressions(n: Expression): Expression;
  export function skipPartiallyEmittedExpressions(n: Node): Node;
  export function skipPartiallyEmittedExpressions(n: Node) {
    return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
  }

  export function isFunctionExpression(n: Node): n is FunctionExpression {
    return n.kind === Syntax.FunctionExpression;
  }

  export function isArrowFunction(n: Node): n is ArrowFunction {
    return n.kind === Syntax.ArrowFunction;
  }

  export function isDeleteExpression(n: Node): n is DeleteExpression {
    return n.kind === Syntax.DeleteExpression;
  }

  export function isTypeOfExpression(n: Node): n is TypeOfExpression {
    return n.kind === Syntax.TypeOfExpression;
  }

  export function isVoidExpression(n: Node): n is VoidExpression {
    return n.kind === Syntax.VoidExpression;
  }

  export function isAwaitExpression(n: Node): n is AwaitExpression {
    return n.kind === Syntax.AwaitExpression;
  }

  export function isPrefixUnaryExpression(n: Node): n is PrefixUnaryExpression {
    return n.kind === Syntax.PrefixUnaryExpression;
  }

  export function isPostfixUnaryExpression(n: Node): n is PostfixUnaryExpression {
    return n.kind === Syntax.PostfixUnaryExpression;
  }

  export function isBinaryExpression(n: Node): n is BinaryExpression {
    return n.kind === Syntax.BinaryExpression;
  }

  export function isConditionalExpression(n: Node): n is ConditionalExpression {
    return n.kind === Syntax.ConditionalExpression;
  }

  export function isTemplateExpression(n: Node): n is TemplateExpression {
    return n.kind === Syntax.TemplateExpression;
  }

  export function isYieldExpression(n: Node): n is YieldExpression {
    return n.kind === Syntax.YieldExpression;
  }

  export function isSpreadElement(n: Node): n is SpreadElement {
    return n.kind === Syntax.SpreadElement;
  }

  export function isClassExpression(n: Node): n is ClassExpression {
    return n.kind === Syntax.ClassExpression;
  }

  export function isOmittedExpression(n: Node): n is OmittedExpression {
    return n.kind === Syntax.OmittedExpression;
  }

  export function isExpressionWithTypeArguments(n: Node): n is ExpressionWithTypeArguments {
    return n.kind === Syntax.ExpressionWithTypeArguments;
  }

  export function isAsExpression(n: Node): n is AsExpression {
    return n.kind === Syntax.AsExpression;
  }

  export function isNonNullExpression(n: Node): n is NonNullExpression {
    return n.kind === Syntax.NonNullExpression;
  }

  export function isNonNullChain(n: Node): n is NonNullChain {
    return isNonNullExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isMetaProperty(n: Node): n is MetaProperty {
    return n.kind === Syntax.MetaProperty;
  }

  export function isTemplateSpan(n: Node): n is TemplateSpan {
    return n.kind === Syntax.TemplateSpan;
  }

  export function isSemicolonClassElement(n: Node): n is SemicolonClassElement {
    return n.kind === Syntax.SemicolonClassElement;
  }

  export function isBlock(n: Node): n is Block {
    return n.kind === Syntax.Block;
  }

  export function isVariableStatement(n: Node): n is VariableStatement {
    return n.kind === Syntax.VariableStatement;
  }

  export function isEmptyStatement(n: Node): n is EmptyStatement {
    return n.kind === Syntax.EmptyStatement;
  }

  export function isExpressionStatement(n: Node): n is ExpressionStatement {
    return n.kind === Syntax.ExpressionStatement;
  }

  export function isIfStatement(n: Node): n is IfStatement {
    return n.kind === Syntax.IfStatement;
  }

  export function isDoStatement(n: Node): n is DoStatement {
    return n.kind === Syntax.DoStatement;
  }

  export function isWhileStatement(n: Node): n is WhileStatement {
    return n.kind === Syntax.WhileStatement;
  }

  export function isForStatement(n: Node): n is ForStatement {
    return n.kind === Syntax.ForStatement;
  }

  export function isForInStatement(n: Node): n is ForInStatement {
    return n.kind === Syntax.ForInStatement;
  }

  export function isForOfStatement(n: Node): n is ForOfStatement {
    return n.kind === Syntax.ForOfStatement;
  }

  export function isContinueStatement(n: Node): n is ContinueStatement {
    return n.kind === Syntax.ContinueStatement;
  }

  export function isBreakStatement(n: Node): n is BreakStatement {
    return n.kind === Syntax.BreakStatement;
  }

  export function isBreakOrContinueStatement(n: Node): n is BreakOrContinueStatement {
    return n.kind === Syntax.BreakStatement || n.kind === Syntax.ContinueStatement;
  }

  export function isReturnStatement(n: Node): n is ReturnStatement {
    return n.kind === Syntax.ReturnStatement;
  }

  export function isWithStatement(n: Node): n is WithStatement {
    return n.kind === Syntax.WithStatement;
  }

  export function isSwitchStatement(n: Node): n is SwitchStatement {
    return n.kind === Syntax.SwitchStatement;
  }

  export function isLabeledStatement(n: Node): n is LabeledStatement {
    return n.kind === Syntax.LabeledStatement;
  }

  export function isThrowStatement(n: Node): n is ThrowStatement {
    return n.kind === Syntax.ThrowStatement;
  }

  export function isTryStatement(n: Node): n is TryStatement {
    return n.kind === Syntax.TryStatement;
  }

  export function isDebuggerStatement(n: Node): n is DebuggerStatement {
    return n.kind === Syntax.DebuggerStatement;
  }

  export function isVariableDeclaration(n: Node): n is VariableDeclaration {
    return n.kind === Syntax.VariableDeclaration;
  }

  export function isVariableDeclarationList(n: Node): n is VariableDeclarationList {
    return n.kind === Syntax.VariableDeclarationList;
  }

  export function isFunctionDeclaration(n: Node): n is FunctionDeclaration {
    return n.kind === Syntax.FunctionDeclaration;
  }

  export function isClassDeclaration(n: Node): n is ClassDeclaration {
    return n.kind === Syntax.ClassDeclaration;
  }

  export function isInterfaceDeclaration(n: Node): n is InterfaceDeclaration {
    return n.kind === Syntax.InterfaceDeclaration;
  }

  export function isTypeAliasDeclaration(n: Node): n is TypeAliasDeclaration {
    return n.kind === Syntax.TypeAliasDeclaration;
  }

  export function isEnumDeclaration(n: Node): n is EnumDeclaration {
    return n.kind === Syntax.EnumDeclaration;
  }

  export function isModuleDeclaration(n: Node): n is ModuleDeclaration {
    return n.kind === Syntax.ModuleDeclaration;
  }

  export function isModuleBlock(n: Node): n is ModuleBlock {
    return n.kind === Syntax.ModuleBlock;
  }

  export function isCaseBlock(n: Node): n is CaseBlock {
    return n.kind === Syntax.CaseBlock;
  }

  export function isNamespaceExportDeclaration(n: Node): n is NamespaceExportDeclaration {
    return n.kind === Syntax.NamespaceExportDeclaration;
  }

  export function isImportEqualsDeclaration(n: Node): n is ImportEqualsDeclaration {
    return n.kind === Syntax.ImportEqualsDeclaration;
  }

  export function isImportDeclaration(n: Node): n is ImportDeclaration {
    return n.kind === Syntax.ImportDeclaration;
  }

  export function isImportClause(n: Node): n is ImportClause {
    return n.kind === Syntax.ImportClause;
  }

  export function isNamespaceImport(n: Node): n is NamespaceImport {
    return n.kind === Syntax.NamespaceImport;
  }

  export function isNamespaceExport(n: Node): n is NamespaceExport {
    return n.kind === Syntax.NamespaceExport;
  }

  export function isNamedExportBindings(n: Node): n is NamedExportBindings {
    return n.kind === Syntax.NamespaceExport || n.kind === Syntax.NamedExports;
  }

  export function isNamedImports(n: Node): n is NamedImports {
    return n.kind === Syntax.NamedImports;
  }

  export function isImportSpecifier(n: Node): n is ImportSpecifier {
    return n.kind === Syntax.ImportSpecifier;
  }

  export function isExportAssignment(n: Node): n is ExportAssignment {
    return n.kind === Syntax.ExportAssignment;
  }

  export function isExportDeclaration(n: Node): n is ExportDeclaration {
    return n.kind === Syntax.ExportDeclaration;
  }

  export function isNamedExports(n: Node): n is NamedExports {
    return n.kind === Syntax.NamedExports;
  }

  export function isExportSpecifier(n: Node): n is ExportSpecifier {
    return n.kind === Syntax.ExportSpecifier;
  }

  export function isMissingDeclaration(n: Node): n is MissingDeclaration {
    return n.kind === Syntax.MissingDeclaration;
  }

  export function isExternalModuleReference(n: Node): n is ExternalModuleReference {
    return n.kind === Syntax.ExternalModuleReference;
  }

  export function isJsxElement(n: Node): n is JsxElement {
    return n.kind === Syntax.JsxElement;
  }

  export function isJsxSelfClosingElement(n: Node): n is JsxSelfClosingElement {
    return n.kind === Syntax.JsxSelfClosingElement;
  }

  export function isJsxOpeningElement(n: Node): n is JsxOpeningElement {
    return n.kind === Syntax.JsxOpeningElement;
  }

  export function isJsxClosingElement(n: Node): n is JsxClosingElement {
    return n.kind === Syntax.JsxClosingElement;
  }

  export function isJsxFragment(n: Node): n is JsxFragment {
    return n.kind === Syntax.JsxFragment;
  }

  export function isJsxOpeningFragment(n: Node): n is JsxOpeningFragment {
    return n.kind === Syntax.JsxOpeningFragment;
  }

  export function isJsxClosingFragment(n: Node): n is JsxClosingFragment {
    return n.kind === Syntax.JsxClosingFragment;
  }

  export function isJsxAttribute(n: Node): n is JsxAttribute {
    return n.kind === Syntax.JsxAttribute;
  }

  export function isJsxAttributes(n: Node): n is JsxAttributes {
    return n.kind === Syntax.JsxAttributes;
  }

  export function isJsxSpreadAttribute(n: Node): n is JsxSpreadAttribute {
    return n.kind === Syntax.JsxSpreadAttribute;
  }

  export function isJsxExpression(n: Node): n is JsxExpression {
    return n.kind === Syntax.JsxExpression;
  }

  export function isCaseClause(n: Node): n is CaseClause {
    return n.kind === Syntax.CaseClause;
  }

  export function isDefaultClause(n: Node): n is DefaultClause {
    return n.kind === Syntax.DefaultClause;
  }

  export function isHeritageClause(n: Node): n is HeritageClause {
    return n.kind === Syntax.HeritageClause;
  }

  export function isCatchClause(n: Node): n is CatchClause {
    return n.kind === Syntax.CatchClause;
  }

  export function isPropertyAssignment(n: Node): n is PropertyAssignment {
    return n.kind === Syntax.PropertyAssignment;
  }

  export function isShorthandPropertyAssignment(n: Node): n is ShorthandPropertyAssignment {
    return n.kind === Syntax.ShorthandPropertyAssignment;
  }

  export function isSpreadAssignment(n: Node): n is SpreadAssignment {
    return n.kind === Syntax.SpreadAssignment;
  }

  export function isEnumMember(n: Node): n is EnumMember {
    return n.kind === Syntax.EnumMember;
  }

  export function isSourceFile(n: Node): n is SourceFile {
    return n.kind === Syntax.SourceFile;
  }

  export function isBundle(n: Node): n is Bundle {
    return n.kind === Syntax.Bundle;
  }

  export function isUnparsedSource(n: Node): n is UnparsedSource {
    return n.kind === Syntax.UnparsedSource;
  }

  export function isUnparsedPrepend(n: Node): n is UnparsedPrepend {
    return n.kind === Syntax.UnparsedPrepend;
  }

  export function isUnparsedTextLike(n: Node): n is UnparsedTextLike {
    switch (n.kind) {
      case Syntax.UnparsedText:
      case Syntax.UnparsedInternalText:
        return true;
      default:
        return false;
    }
  }

  export function isUnparsedNode(n: Node): n is UnparsedNode {
    return isUnparsedTextLike(n) || n.kind === Syntax.UnparsedPrologue || n.kind === Syntax.UnparsedSyntheticReference;
  }

  export function isJSDocTypeExpression(n: Node): n is JSDocTypeExpression {
    return n.kind === Syntax.JSDocTypeExpression;
  }

  export function isJSDocAllType(n: Node): n is JSDocAllType {
    return n.kind === Syntax.JSDocAllType;
  }

  export function isJSDocUnknownType(n: Node): n is JSDocUnknownType {
    return n.kind === Syntax.JSDocUnknownType;
  }

  export function isJSDocNullableType(n: Node): n is JSDocNullableType {
    return n.kind === Syntax.JSDocNullableType;
  }

  export function isJSDocNonNullableType(n: Node): n is JSDocNonNullableType {
    return n.kind === Syntax.JSDocNonNullableType;
  }

  export function isJSDocOptionalType(n: Node): n is JSDocOptionalType {
    return n.kind === Syntax.JSDocOptionalType;
  }

  export function isJSDocFunctionType(n: Node): n is JSDocFunctionType {
    return n.kind === Syntax.JSDocFunctionType;
  }

  export function isJSDocVariadicType(n: Node): n is JSDocVariadicType {
    return n.kind === Syntax.JSDocVariadicType;
  }

  export function isJSDoc(n: Node): n is JSDoc {
    return n.kind === Syntax.JSDocComment;
  }

  export function isJSDocAuthorTag(n: Node): n is JSDocAuthorTag {
    return n.kind === Syntax.JSDocAuthorTag;
  }

  export function isJSDocAugmentsTag(n: Node): n is JSDocAugmentsTag {
    return n.kind === Syntax.JSDocAugmentsTag;
  }

  export function isJSDocImplementsTag(n: Node): n is JSDocImplementsTag {
    return n.kind === Syntax.JSDocImplementsTag;
  }

  export function isJSDocClassTag(n: Node): n is JSDocClassTag {
    return n.kind === Syntax.JSDocClassTag;
  }

  export function isJSDocPublicTag(n: Node): n is JSDocPublicTag {
    return n.kind === Syntax.JSDocPublicTag;
  }

  export function isJSDocPrivateTag(n: Node): n is JSDocPrivateTag {
    return n.kind === Syntax.JSDocPrivateTag;
  }

  export function isJSDocProtectedTag(n: Node): n is JSDocProtectedTag {
    return n.kind === Syntax.JSDocProtectedTag;
  }

  export function isJSDocReadonlyTag(n: Node): n is JSDocReadonlyTag {
    return n.kind === Syntax.JSDocReadonlyTag;
  }

  export function isJSDocEnumTag(n: Node): n is JSDocEnumTag {
    return n.kind === Syntax.JSDocEnumTag;
  }

  export function isJSDocThisTag(n: Node): n is JSDocThisTag {
    return n.kind === Syntax.JSDocThisTag;
  }

  export function isJSDocParameterTag(n: Node): n is JSDocParameterTag {
    return n.kind === Syntax.JSDocParameterTag;
  }

  export function isJSDocReturnTag(n: Node): n is JSDocReturnTag {
    return n.kind === Syntax.JSDocReturnTag;
  }

  export function isJSDocTypeTag(n: Node): n is JSDocTypeTag {
    return n.kind === Syntax.JSDocTypeTag;
  }

  export function isJSDocTemplateTag(n: Node): n is JSDocTemplateTag {
    return n.kind === Syntax.JSDocTemplateTag;
  }

  export function isJSDocTypedefTag(n: Node): n is JSDocTypedefTag {
    return n.kind === Syntax.JSDocTypedefTag;
  }

  export function isJSDocPropertyTag(n: Node): n is JSDocPropertyTag {
    return n.kind === Syntax.JSDocPropertyTag;
  }

  export function isJSDocPropertyLikeTag(n: Node): n is JSDocPropertyLikeTag {
    return n.kind === Syntax.JSDocPropertyTag || n.kind === Syntax.JSDocParameterTag;
  }

  export function isJSDocTypeLiteral(n: Node): n is JSDocTypeLiteral {
    return n.kind === Syntax.JSDocTypeLiteral;
  }

  export function isJSDocCallbackTag(n: Node): n is JSDocCallbackTag {
    return n.kind === Syntax.JSDocCallbackTag;
  }

  export function isJSDocSignature(n: Node): n is JSDocSignature {
    return n.kind === Syntax.JSDocSignature;
  }

  export function isSyntaxList(n: Node): n is SyntaxList {
    return n.kind === Syntax.SyntaxList;
  }

  export function isToken(n: Node) {
    return n.kind >= Syntax.FirstToken && n.kind <= Syntax.LastToken;
  }

  export function isNodeArray<T extends Node>(array: readonly T[]): array is NodeArray<T> {
    return array.hasOwnProperty('pos') && array.hasOwnProperty('end');
  }

  export function isLiteralKind(k: Syntax) {
    return Syntax.FirstLiteralToken <= k && k <= Syntax.LastLiteralToken;
  }

  export function isLiteralExpression(n: Node): n is LiteralExpression {
    return isLiteralKind(n.kind);
  }

  export function isTemplateLiteralKind(k: Syntax) {
    return Syntax.FirstTemplateToken <= k && k <= Syntax.LastTemplateToken;
  }

  export type TemplateLiteralToken = NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail;
  export function isTemplateLiteralToken(n: Node): n is TemplateLiteralToken {
    return isTemplateLiteralKind(n.kind);
  }

  export function isImportOrExportSpecifier(n: Node): n is ImportSpecifier | ExportSpecifier {
    return isImportSpecifier(n) || isExportSpecifier(n);
  }

  export function isTypeOnlyImportOrExportDeclaration(n: Node): n is TypeOnlyCompatibleAliasDeclaration {
    switch (n.kind) {
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return (n as ImportOrExportSpecifier).parent.parent.isTypeOnly;
      case Syntax.NamespaceImport:
        return (n as NamespaceImport).parent.isTypeOnly;
      case Syntax.ImportClause:
        return (n as ImportClause).isTypeOnly;
      default:
        return false;
    }
  }

  export function isStringTextContainingNode(n: Node): n is StringLiteral | TemplateLiteralToken {
    return n.kind === Syntax.StringLiteral || isTemplateLiteralKind(n.kind);
  }

  export function isGeneratedIdentifier(n: Node): n is GeneratedIdentifier {
    return isIdentifier(n) && (n.autoGenerateFlags! & GeneratedIdentifierFlags.KindMask) > GeneratedIdentifierFlags.None;
  }

  export function isPrivateIdentifierPropertyDeclaration(n: Node): n is PrivateIdentifierPropertyDeclaration {
    return PropertyDeclaration.kind(n) && isPrivateIdentifier(n.name);
  }

  export function isPrivateIdentifierPropertyAccessExpression(n: Node): n is PrivateIdentifierPropertyAccessExpression {
    return isPropertyAccessExpression(n) && isPrivateIdentifier(n.name);
  }

  export function isModifierKind(token: Syntax): token is Modifier['kind'] {
    switch (token) {
      case Syntax.AbstractKeyword:
      case Syntax.AsyncKeyword:
      case Syntax.ConstKeyword:
      case Syntax.DeclareKeyword:
      case Syntax.DefaultKeyword:
      case Syntax.ExportKeyword:
      case Syntax.PublicKeyword:
      case Syntax.PrivateKeyword:
      case Syntax.ProtectedKeyword:
      case Syntax.ReadonlyKeyword:
      case Syntax.StaticKeyword:
        return true;
    }
    return false;
  }

  export function isParameterPropertyModifier(k: Syntax) {
    return !!(modifierToFlag(k) & ModifierFlags.ParameterPropertyModifier);
  }

  export function isClassMemberModifier(idToken: Syntax) {
    return isParameterPropertyModifier(idToken) || idToken === Syntax.StaticKeyword;
  }

  export function isModifier(n: Node): n is Modifier {
    return isModifierKind(n.kind);
  }

  export function isEntityName(n: Node): n is EntityName {
    const k = n.kind;
    return k === Syntax.QualifiedName || k === Syntax.Identifier;
  }

  export function isPropertyName(n: Node): n is PropertyName {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.PrivateIdentifier || k === Syntax.StringLiteral || k === Syntax.NumericLiteral || k === Syntax.ComputedPropertyName;
  }

  export function isBindingName(n: Node): n is BindingName {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
  }

  export function isFunctionLike(n: Node): n is SignatureDeclaration {
    return n && isFunctionLikeKind(n.kind);
  }

  export function isFunctionLikeDeclaration(n: Node): n is FunctionLikeDeclaration {
    return n && isFunctionLikeDeclarationKind(n.kind);
  }

  function isFunctionLikeDeclarationKind(k: Syntax) {
    switch (k) {
      case Syntax.FunctionDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.Constructor:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return true;
      default:
        return false;
    }
  }

  export function isFunctionLikeKind(k: Syntax) {
    switch (k) {
      case Syntax.MethodSignature:
      case Syntax.CallSignature:
      case Syntax.JSDocSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.FunctionType:
      case Syntax.JSDocFunctionType:
      case Syntax.ConstructorType:
        return true;
      default:
        return isFunctionLikeDeclarationKind(k);
    }
  }

  export function isFunctionOrModuleBlock(n: Node) {
    return isSourceFile(n) || isModuleBlock(n) || (isBlock(n) && isFunctionLike(n.parent));
  }

  export function isClassElement(n: Node): n is ClassElement {
    const k = n.kind;
    return (
      k === Syntax.Constructor ||
      k === Syntax.PropertyDeclaration ||
      k === Syntax.MethodDeclaration ||
      k === Syntax.GetAccessor ||
      k === Syntax.SetAccessor ||
      k === Syntax.IndexSignature ||
      k === Syntax.SemicolonClassElement
    );
  }

  export function isClassLike(n: Node): n is ClassLikeDeclaration {
    return n && (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression);
  }

  export function isAccessor(n: Node): n is AccessorDeclaration {
    return n && (n.kind === Syntax.GetAccessor || n.kind === Syntax.SetAccessor);
  }

  export function isMethodOrAccessor(n: Node): n is MethodDeclaration | AccessorDeclaration {
    switch (n.kind) {
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return true;
      default:
        return false;
    }
  }

  export function isTypeElement(n: Node): n is TypeElement {
    const k = n.kind;
    return k === Syntax.ConstructSignature || k === Syntax.CallSignature || k === Syntax.PropertySignature || k === Syntax.MethodSignature || k === Syntax.IndexSignature;
  }

  export function isClassOrTypeElement(n: Node): n is ClassElement | TypeElement {
    return isTypeElement(n) || isClassElement(n);
  }

  export function isObjectLiteralElementLike(n: Node): n is ObjectLiteralElementLike {
    const k = n.kind;
    return (
      k === Syntax.PropertyAssignment ||
      k === Syntax.ShorthandPropertyAssignment ||
      k === Syntax.SpreadAssignment ||
      k === Syntax.MethodDeclaration ||
      k === Syntax.GetAccessor ||
      k === Syntax.SetAccessor
    );
  }

  export function isTypeNode(n: Node): n is TypeNode {
    return isTypeNodeKind(n.kind);
  }

  export function isFunctionOrConstructorTypeNode(n: Node): n is FunctionTypeNode | ConstructorTypeNode {
    switch (n.kind) {
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return true;
    }
    return false;
  }

  export function isBindingPattern(n: Node | undefined): n is BindingPattern {
    if (n) {
      const k = n.kind;
      return k === Syntax.ArrayBindingPattern || k === Syntax.ObjectBindingPattern;
    }
    return false;
  }

  export function isAssignmentPattern(n: Node): n is AssignmentPattern {
    const k = n.kind;
    return k === Syntax.ArrayLiteralExpression || k === Syntax.ObjectLiteralExpression;
  }

  export function isArrayBindingElement(n: Node): n is ArrayBindingElement {
    const k = n.kind;
    return k === Syntax.BindingElement || k === Syntax.OmittedExpression;
  }

  export function isDeclarationBindingElement(e: BindingOrAssignmentElement): e is VariableDeclaration | ParameterDeclaration | BindingElement {
    switch (e.kind) {
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.BindingElement:
        return true;
    }
    return false;
  }

  export function isBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is BindingOrAssignmentPattern {
    return isObjectBindingOrAssignmentPattern(n) || isArrayBindingOrAssignmentPattern(n);
  }

  export function isObjectBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ObjectBindingOrAssignmentPattern {
    switch (n.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return true;
    }
    return false;
  }

  export function isArrayBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ArrayBindingOrAssignmentPattern {
    switch (n.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return true;
    }
    return false;
  }

  export function isPropertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is PropertyAccessExpression | QualifiedName | ImportTypeNode {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportType;
  }

  export function isPropertyAccessOrQualifiedName(n: Node): n is PropertyAccessExpression | QualifiedName {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
  }

  export function isCallLikeExpression(n: Node): n is CallLikeExpression {
    switch (n.kind) {
      case Syntax.JsxOpeningElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.CallExpression:
      case Syntax.NewExpression:
      case Syntax.TaggedTemplateExpression:
      case Syntax.Decorator:
        return true;
      default:
        return false;
    }
  }

  export function isCallOrNewExpression(n: Node): n is CallExpression | NewExpression {
    return n.kind === Syntax.CallExpression || n.kind === Syntax.NewExpression;
  }

  export function isTemplateLiteral(n: Node): n is TemplateLiteral {
    const k = n.kind;
    return k === Syntax.TemplateExpression || k === Syntax.NoSubstitutionLiteral;
  }

  export function isLeftHandSideExpression(n: Node): n is LeftHandSideExpression {
    return isLeftHandSideExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isLeftHandSideExpressionKind(k: Syntax) {
    switch (k) {
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
      case Syntax.NewExpression:
      case Syntax.CallExpression:
      case Syntax.JsxElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxFragment:
      case Syntax.TaggedTemplateExpression:
      case Syntax.ArrayLiteralExpression:
      case Syntax.ParenthesizedExpression:
      case Syntax.ObjectLiteralExpression:
      case Syntax.ClassExpression:
      case Syntax.FunctionExpression:
      case Syntax.Identifier:
      case Syntax.RegexLiteral:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateExpression:
      case Syntax.FalseKeyword:
      case Syntax.NullKeyword:
      case Syntax.ThisKeyword:
      case Syntax.TrueKeyword:
      case Syntax.SuperKeyword:
      case Syntax.NonNullExpression:
      case Syntax.MetaProperty:
      case Syntax.ImportKeyword:
        return true;
      default:
        return false;
    }
  }

  export function isUnaryExpression(n: Node): n is UnaryExpression {
    return isUnaryExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isUnaryExpressionKind(k: Syntax) {
    switch (k) {
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
      case Syntax.DeleteExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.AwaitExpression:
      case Syntax.TypeAssertionExpression:
        return true;
      default:
        return isLeftHandSideExpressionKind(k);
    }
  }

  export function isUnaryExpressionWithWrite(expr: Node): expr is PrefixUnaryExpression | PostfixUnaryExpression {
    switch (expr.kind) {
      case Syntax.PostfixUnaryExpression:
        return true;
      case Syntax.PrefixUnaryExpression:
        return (<PrefixUnaryExpression>expr).operator === Syntax.Plus2Token || (<PrefixUnaryExpression>expr).operator === Syntax.Minus2Token;
      default:
        return false;
    }
  }

  export function isExpression(n: Node): n is Expression {
    return isExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isExpressionKind(k: Syntax) {
    switch (k) {
      case Syntax.ConditionalExpression:
      case Syntax.YieldExpression:
      case Syntax.ArrowFunction:
      case Syntax.BinaryExpression:
      case Syntax.SpreadElement:
      case Syntax.AsExpression:
      case Syntax.OmittedExpression:
      case Syntax.CommaListExpression:
      case Syntax.PartiallyEmittedExpression:
        return true;
      default:
        return isUnaryExpressionKind(k);
    }
  }

  export function isAssertionExpression(n: Node): n is AssertionExpression {
    const k = n.kind;
    return k === Syntax.TypeAssertionExpression || k === Syntax.AsExpression;
  }

  export function isPartiallyEmittedExpression(n: Node): n is PartiallyEmittedExpression {
    return n.kind === Syntax.PartiallyEmittedExpression;
  }

  export function isNotEmittedStatement(n: Node): n is NotEmittedStatement {
    return n.kind === Syntax.NotEmittedStatement;
  }

  export function isSyntheticReference(n: Node): n is SyntheticReferenceExpression {
    return n.kind === Syntax.SyntheticReferenceExpression;
  }

  export function isNotEmittedOrPartiallyEmittedNode(n: Node): n is NotEmittedStatement | PartiallyEmittedExpression {
    return isNotEmittedStatement(n) || isPartiallyEmittedExpression(n);
  }

  export function isIterationStatement(n: Node, look: false): n is IterationStatement;
  export function isIterationStatement(n: Node, look: boolean): n is IterationStatement | LabeledStatement;
  export function isIterationStatement(n: Node, look: boolean): n is IterationStatement {
    switch (n.kind) {
      case Syntax.ForStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        return true;
      case Syntax.LabeledStatement:
        return look && isIterationStatement((<LabeledStatement>n).statement, look);
    }
    return false;
  }

  export function isScopeMarker(n: Node) {
    return isExportAssignment(n) || isExportDeclaration(n);
  }

  export function hasScopeMarker(ss: readonly Statement[]) {
    return some(ss, isScopeMarker);
  }

  export function needsScopeMarker(s: Statement) {
    return !isAnyImportOrReExport(s) && !isExportAssignment(s) && !hasSyntacticModifier(s, ModifierFlags.Export) && !isAmbientModule(s);
  }

  export function isExternalModuleIndicator(s: Statement) {
    return isAnyImportOrReExport(s) || isExportAssignment(s) || hasSyntacticModifier(s, ModifierFlags.Export);
  }

  export function isForInOrOfStatement(n: Node): n is ForInOrOfStatement {
    return n.kind === Syntax.ForInStatement || n.kind === Syntax.ForOfStatement;
  }

  export function isConciseBody(n: Node): n is ConciseBody {
    return isBlock(n) || isExpression(n);
  }

  export function isFunctionBody(n: Node): n is FunctionBody {
    return isBlock(n);
  }

  export function isForInitializer(n: Node): n is ForInitializer {
    return isVariableDeclarationList(n) || isExpression(n);
  }

  export function isModuleBody(n: Node): n is ModuleBody {
    const k = n.kind;
    return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration || k === Syntax.Identifier;
  }

  export function isNamespaceBody(n: Node): n is NamespaceBody {
    const k = n.kind;
    return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration;
  }

  export function isJSDocNamespaceBody(n: Node): n is JSDocNamespaceBody {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
  }

  export function isNamedImportBindings(n: Node): n is NamedImportBindings {
    const k = n.kind;
    return k === Syntax.NamedImports || k === Syntax.NamespaceImport;
  }

  export function isModuleOrEnumDeclaration(n: Node): n is ModuleDeclaration | EnumDeclaration {
    return n.kind === Syntax.ModuleDeclaration || n.kind === Syntax.EnumDeclaration;
  }

  function isDeclarationKind(k: Syntax) {
    return (
      k === Syntax.ArrowFunction ||
      k === Syntax.BindingElement ||
      k === Syntax.ClassDeclaration ||
      k === Syntax.ClassExpression ||
      k === Syntax.Constructor ||
      k === Syntax.EnumDeclaration ||
      k === Syntax.EnumMember ||
      k === Syntax.ExportSpecifier ||
      k === Syntax.FunctionDeclaration ||
      k === Syntax.FunctionExpression ||
      k === Syntax.GetAccessor ||
      k === Syntax.ImportClause ||
      k === Syntax.ImportEqualsDeclaration ||
      k === Syntax.ImportSpecifier ||
      k === Syntax.InterfaceDeclaration ||
      k === Syntax.JsxAttribute ||
      k === Syntax.MethodDeclaration ||
      k === Syntax.MethodSignature ||
      k === Syntax.ModuleDeclaration ||
      k === Syntax.NamespaceExportDeclaration ||
      k === Syntax.NamespaceImport ||
      k === Syntax.NamespaceExport ||
      k === Syntax.Parameter ||
      k === Syntax.PropertyAssignment ||
      k === Syntax.PropertyDeclaration ||
      k === Syntax.PropertySignature ||
      k === Syntax.SetAccessor ||
      k === Syntax.ShorthandPropertyAssignment ||
      k === Syntax.TypeAliasDeclaration ||
      k === Syntax.TypeParameter ||
      k === Syntax.VariableDeclaration ||
      k === Syntax.JSDocTypedefTag ||
      k === Syntax.JSDocCallbackTag ||
      k === Syntax.JSDocPropertyTag
    );
  }

  function isDeclarationStatementKind(k: Syntax) {
    return (
      k === Syntax.FunctionDeclaration ||
      k === Syntax.MissingDeclaration ||
      k === Syntax.ClassDeclaration ||
      k === Syntax.InterfaceDeclaration ||
      k === Syntax.TypeAliasDeclaration ||
      k === Syntax.EnumDeclaration ||
      k === Syntax.ModuleDeclaration ||
      k === Syntax.ImportDeclaration ||
      k === Syntax.ImportEqualsDeclaration ||
      k === Syntax.ExportDeclaration ||
      k === Syntax.ExportAssignment ||
      k === Syntax.NamespaceExportDeclaration
    );
  }

  function isStatementKindButNotDeclarationKind(k: Syntax) {
    return (
      k === Syntax.BreakStatement ||
      k === Syntax.ContinueStatement ||
      k === Syntax.DebuggerStatement ||
      k === Syntax.DoStatement ||
      k === Syntax.ExpressionStatement ||
      k === Syntax.EmptyStatement ||
      k === Syntax.ForInStatement ||
      k === Syntax.ForOfStatement ||
      k === Syntax.ForStatement ||
      k === Syntax.IfStatement ||
      k === Syntax.LabeledStatement ||
      k === Syntax.ReturnStatement ||
      k === Syntax.SwitchStatement ||
      k === Syntax.ThrowStatement ||
      k === Syntax.TryStatement ||
      k === Syntax.VariableStatement ||
      k === Syntax.WhileStatement ||
      k === Syntax.WithStatement ||
      k === Syntax.NotEmittedStatement ||
      k === Syntax.EndOfDeclarationMarker ||
      k === Syntax.MergeDeclarationMarker
    );
  }

  export function isDeclaration(n: Node): n is NamedDeclaration {
    if (n.kind === Syntax.TypeParameter) {
      return (n.parent && n.parent.kind !== Syntax.JSDocTemplateTag) || isInJSFile(n);
    }
    return isDeclarationKind(n.kind);
  }

  export function isDeclarationStatement(n: Node): n is DeclarationStatement {
    return isDeclarationStatementKind(n.kind);
  }

  export function isStatementButNotDeclaration(n: Node): n is Statement {
    return isStatementKindButNotDeclarationKind(n.kind);
  }

  export function isStatement(n: Node): n is Statement {
    const k = n.kind;
    return isStatementKindButNotDeclarationKind(k) || isDeclarationStatementKind(k) || isBlockStatement(n);
  }

  function isBlockStatement(n: Node): n is Block {
    if (n.kind !== Syntax.Block) return false;
    if (n.parent !== undefined) {
      if (n.parent.kind === Syntax.TryStatement || n.parent.kind === Syntax.CatchClause) {
        return false;
      }
    }
    return !isFunctionBlock(n);
  }

  export function isModuleReference(n: Node): n is ModuleReference {
    const k = n.kind;
    return k === Syntax.ExternalModuleReference || k === Syntax.QualifiedName || k === Syntax.Identifier;
  }

  export function isJsxTagNameExpression(n: Node): n is JsxTagNameExpression {
    const k = n.kind;
    return k === Syntax.ThisKeyword || k === Syntax.Identifier || k === Syntax.PropertyAccessExpression;
  }

  export function isJsxChild(n: Node): n is JsxChild {
    const k = n.kind;
    return k === Syntax.JsxElement || k === Syntax.JsxExpression || k === Syntax.JsxSelfClosingElement || k === Syntax.JsxText || k === Syntax.JsxFragment;
  }

  export function isJsxAttributeLike(n: Node): n is JsxAttributeLike {
    const k = n.kind;
    return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute;
  }

  export function isJsxOpeningLikeElement(n: Node): n is JsxOpeningLikeElement {
    const k = n.kind;
    return k === Syntax.JsxOpeningElement || k === Syntax.JsxSelfClosingElement;
  }

  export function isCaseOrDefaultClause(n: Node): n is CaseOrDefaultClause {
    const k = n.kind;
    return k === Syntax.CaseClause || k === Syntax.DefaultClause;
  }

  export function isJSDocNode(n: Node) {
    return n.kind >= Syntax.FirstJSDocNode && n.kind <= Syntax.LastJSDocNode;
  }

  export function isJSDocCommentContainingNode(n: Node) {
    return n.kind === Syntax.JSDocComment || n.kind === Syntax.JSDocNamepathType || isJSDocTag(n) || isJSDocTypeLiteral(n) || isJSDocSignature(n);
  }

  export function isJSDocTag(n: Node): n is JSDocTag {
    return n.kind >= Syntax.FirstJSDocTagNode && n.kind <= Syntax.LastJSDocTagNode;
  }

  export function isSetAccessor(n: Node): n is SetAccessorDeclaration {
    return n.kind === Syntax.SetAccessor;
  }

  export function isGetAccessor(n: Node): n is GetAccessorDeclaration {
    return n.kind === Syntax.GetAccessor;
  }

  export function hasJSDocNodes(n: Node): n is HasJSDoc {
    const { jsDoc } = n as JSDocContainer;
    return !!jsDoc && jsDoc.length > 0;
  }

  export function hasType(n: Node): n is HasType {
    return !!(n as HasType).type;
  }

  export function hasInitializer(n: Node): n is HasInitializer {
    return !!(n as HasInitializer).initializer;
  }

  export function hasOnlyExpressionInitializer(n: Node): n is HasExpressionInitializer {
    switch (n.kind) {
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.BindingElement:
      case Syntax.PropertySignature:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertyAssignment:
      case Syntax.EnumMember:
        return true;
      default:
        return false;
    }
  }

  export function isObjectLiteralElement(n: Node): n is ObjectLiteralElement {
    return n.kind === Syntax.JsxAttribute || n.kind === Syntax.JsxSpreadAttribute || isObjectLiteralElementLike(n);
  }

  export function isTypeReferenceType(n: Node): n is TypeReferenceType {
    return n.kind === Syntax.TypeReference || n.kind === Syntax.ExpressionWithTypeArguments;
  }

  const MAX_SMI_X86 = 0x3fff_ffff;
  export function guessIndentation(lines: string[]) {
    let indentation = MAX_SMI_X86;
    for (const line of lines) {
      if (!line.length) continue;
      let i = 0;
      for (; i < line.length && i < indentation; i++) {
        if (!Scanner.isWhiteSpaceLike(line.charCodeAt(i))) break;
      }
      if (i < indentation) indentation = i;
      if (indentation === 0) return 0;
    }
    return indentation === MAX_SMI_X86 ? undefined : indentation;
  }
}
