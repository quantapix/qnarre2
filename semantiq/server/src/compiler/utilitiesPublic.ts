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
    if (d && d.kind === SyntaxKind.TypeParameter) {
      for (let current: Node = d; current; current = current.parent) {
        if (isFunctionLike(current) || isClassLike(current) || current.kind === SyntaxKind.InterfaceDeclaration) {
          return <Declaration>current;
        }
      }
    }
    return;
  }

  export type ParameterPropertyDeclaration = ParameterDeclaration & { parent: ConstructorDeclaration; name: Identifier };
  export function isParameterPropertyDeclaration(n: Node, parent: Node): n is ParameterPropertyDeclaration {
    return hasSyntacticModifier(n, ModifierFlags.ParameterPropertyModifier) && parent.kind === SyntaxKind.Constructor;
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
    while (isBindingElement(n.parent)) {
      n = n.parent.parent;
    }
    return n.parent;
  }

  function getCombinedFlags(n: Node, getFlags: (n: Node) => number): number {
    if (isBindingElement(n)) {
      n = walkUpBindingElementsAndPatterns(n);
    }
    let flags = getFlags(n);
    if (n.kind === SyntaxKind.VariableDeclaration) n = n.parent;

    if (n && n.kind === SyntaxKind.VariableDeclarationList) {
      flags |= getFlags(n);
      n = n.parent;
    }
    if (n && n.kind === SyntaxKind.VariableStatement) flags |= getFlags(n);

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
        errors.push(
          createCompilerDiagnostic(Diagnostics.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp')
        );
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

  export function escapeLeadingUnderscores(identifier: string): __String {
    return (identifier.length >= 2 && identifier.charCodeAt(0) === Codes._ && identifier.charCodeAt(1) === Codes._
      ? '_' + identifier
      : identifier) as __String;
  }

  export function unescapeLeadingUnderscores(identifier: __String): string {
    const id = identifier as string;
    return id.length >= 3 && id.charCodeAt(0) === Codes._ && id.charCodeAt(1) === Codes._ && id.charCodeAt(2) === Codes._ ? id.substr(1) : id;
  }

  export function idText(identifierOrPrivateName: Identifier | PrivateIdentifier): string {
    return unescapeLeadingUnderscores(identifierOrPrivateName.escapedText);
  }

  export function symbolName(s: Symbol): string {
    if (s.valueDeclaration && isPrivateIdentifierPropertyDeclaration(s.valueDeclaration)) {
      return idText(s.valueDeclaration.name);
    }
    return unescapeLeadingUnderscores(s.escapedName);
  }

  function nameForNamelessJSDocTypedef(declaration: JSDocTypedefTag | JSDocEnumTag): Identifier | PrivateIdentifier | undefined {
    const n = declaration.parent.parent;
    if (!n) return;
    if (isDeclaration(n)) return getDeclarationIdentifier(n);
    switch (n.kind) {
      case SyntaxKind.VariableStatement:
        if (n.declarationList && n.declarationList.declarations[0]) {
          return getDeclarationIdentifier(n.declarationList.declarations[0]);
        }
        break;
      case SyntaxKind.ExpressionStatement:
        let expr = n.expression;
        if (expr.kind === SyntaxKind.BinaryExpression && (expr as BinaryExpression).operatorToken.kind === SyntaxKind.EqualsToken) {
          expr = (expr as BinaryExpression).left;
        }
        switch (expr.kind) {
          case SyntaxKind.PropertyAccessExpression:
            return (expr as PropertyAccessExpression).name;
          case SyntaxKind.ElementAccessExpression:
            const arg = (expr as ElementAccessExpression).argumentExpression;
            if (isIdentifier(arg)) return arg;
        }
        break;
      case SyntaxKind.ParenthesizedExpression: {
        return getDeclarationIdentifier(n.expression);
      }
      case SyntaxKind.LabeledStatement: {
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
      case SyntaxKind.Identifier:
        return declaration as Identifier;
      case SyntaxKind.JSDocPropertyTag:
      case SyntaxKind.JSDocParameterTag: {
        const { name } = declaration as JSDocPropertyLikeTag;
        if (name.kind === SyntaxKind.QualifiedName) {
          return name.right;
        }
        break;
      }
      case SyntaxKind.CallExpression:
      case SyntaxKind.BinaryExpression: {
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
      case SyntaxKind.JSDocTypedefTag:
        return getNameOfJSDocTypedef(declaration as JSDocTypedefTag);
      case SyntaxKind.JSDocEnumTag:
        return nameForNamelessJSDocTypedef(declaration as JSDocEnumTag);
      case SyntaxKind.ExportAssignment: {
        const { expression } = declaration as ExportAssignment;
        return isIdentifier(expression) ? expression : undefined;
      }
      case SyntaxKind.ElementAccessExpression:
        const expr = declaration as ElementAccessExpression;
        if (isBindableStaticElementAccessExpression(expr)) return expr.argumentExpression;
    }
    return (declaration as NamedDeclaration).name;
  }

  export function getNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
    if (declaration === undefined) return;
    return (
      getNonAssignedNameOfDeclaration(declaration) ||
      (isFunctionExpression(declaration) || isClassExpression(declaration) ? getAssignedName(declaration) : undefined)
    );
  }

  function getAssignedName(n: Node): DeclarationName | undefined {
    if (!n.parent) {
      return;
    } else if (isPropertyAssignment(n.parent) || isBindingElement(n.parent)) {
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
        return getJSDocTagsWorker(param.parent, noCache).filter(
          (tag): tag is JSDocParameterTag => isJSDocParameterTag(tag) && isIdentifier(tag.name) && tag.name.escapedText === name
        );
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
    return getJSDocTagsWorker(param.parent, noCache).filter(
      (tag): tag is JSDocTemplateTag => isJSDocTemplateTag(tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name)
    );
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
      if (isTypeLiteralNode(type)) {
        const sig = find(type.members, isCallSignatureDeclaration);
        return sig && sig.type;
      }
      if (isFunctionTypeNode(type) || isJSDocFunctionType(type)) return type.type;
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

  export function getAllJSDocTagsOfKind(n: Node, kind: SyntaxKind): readonly JSDocTag[] {
    return getJSDocTags(n).filter((doc) => doc.kind === kind);
  }

  export function getEffectiveTypeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
    if (isJSDocSignature(n)) return emptyArray;
    if (isJSDocTypeAlias(n)) {
      assert(n.parent.kind === SyntaxKind.JSDocComment);
      return flatMap(n.parent.tags, (tag) => (isJSDocTemplateTag(tag) ? tag.typeParameters : undefined));
    }
    if (n.typeParameters) return n.typeParameters;
    if (isInJSFile(n)) {
      const decls = getJSDocTypeParameterDeclarations(n);
      if (decls.length) return decls;
      const typeTag = getJSDocType(n);
      if (typeTag && isFunctionTypeNode(typeTag) && typeTag.typeParameters) return typeTag.typeParameters;
    }
    return emptyArray;
  }

  export function getEffectiveConstraintOfTypeParameter(n: TypeParameterDeclaration): TypeNode | undefined {
    return n.constraint ? n.constraint : isJSDocTemplateTag(n.parent) && n === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
  }

  export function isIdentifier(n: Node): n is Identifier {
    return n.kind === SyntaxKind.Identifier;
  }

  export function isPrivateIdentifier(n: Node): n is PrivateIdentifier {
    return n.kind === SyntaxKind.PrivateIdentifier;
  }

  export function isIdentifierOrPrivateIdentifier(n: Node): n is Identifier | PrivateIdentifier {
    return n.kind === SyntaxKind.Identifier || n.kind === SyntaxKind.PrivateIdentifier;
  }

  export function isTypeParameterDeclaration(n: Node): n is TypeParameterDeclaration {
    return n.kind === SyntaxKind.TypeParameter;
  }

  export function isParameter(n: Node): n is ParameterDeclaration {
    return n.kind === SyntaxKind.Parameter;
  }

  export function isDecorator(n: Node): n is Decorator {
    return n.kind === SyntaxKind.Decorator;
  }

  export function isPropertySignature(n: Node): n is PropertySignature {
    return n.kind === SyntaxKind.PropertySignature;
  }

  export function isPropertyDeclaration(n: Node): n is PropertyDeclaration {
    return n.kind === SyntaxKind.PropertyDeclaration;
  }

  export function isMethodSignature(n: Node): n is MethodSignature {
    return n.kind === SyntaxKind.MethodSignature;
  }

  export function isMethodDeclaration(n: Node): n is MethodDeclaration {
    return n.kind === SyntaxKind.MethodDeclaration;
  }

  export function isConstructorDeclaration(n: Node): n is ConstructorDeclaration {
    return n.kind === SyntaxKind.Constructor;
  }

  export function isGetAccessorDeclaration(n: Node): n is GetAccessorDeclaration {
    return n.kind === SyntaxKind.GetAccessor;
  }

  export function isSetAccessorDeclaration(n: Node): n is SetAccessorDeclaration {
    return n.kind === SyntaxKind.SetAccessor;
  }

  export function isCallSignatureDeclaration(n: Node): n is CallSignatureDeclaration {
    return n.kind === SyntaxKind.CallSignature;
  }

  export function isConstructSignatureDeclaration(n: Node): n is ConstructSignatureDeclaration {
    return n.kind === SyntaxKind.ConstructSignature;
  }

  export function isIndexSignatureDeclaration(n: Node): n is IndexSignatureDeclaration {
    return n.kind === SyntaxKind.IndexSignature;
  }

  export function isGetOrSetAccessorDeclaration(n: Node): n is AccessorDeclaration {
    return n.kind === SyntaxKind.SetAccessor || n.kind === SyntaxKind.GetAccessor;
  }

  export function isTypePredicateNode(n: Node): n is TypePredicateNode {
    return n.kind === SyntaxKind.TypePredicate;
  }

  export function isTypeReferenceNode(n: Node): n is TypeReferenceNode {
    return n.kind === SyntaxKind.TypeReference;
  }

  export function isFunctionTypeNode(n: Node): n is FunctionTypeNode {
    return n.kind === SyntaxKind.FunctionType;
  }

  export function isConstructorTypeNode(n: Node): n is ConstructorTypeNode {
    return n.kind === SyntaxKind.ConstructorType;
  }

  export function isTypeQueryNode(n: Node): n is TypeQueryNode {
    return n.kind === SyntaxKind.TypeQuery;
  }

  export function isTypeLiteralNode(n: Node): n is TypeLiteralNode {
    return n.kind === SyntaxKind.TypeLiteral;
  }

  export function isArrayTypeNode(n: Node): n is ArrayTypeNode {
    return n.kind === SyntaxKind.ArrayType;
  }

  export function isTupleTypeNode(n: Node): n is TupleTypeNode {
    return n.kind === SyntaxKind.TupleType;
  }

  export function isUnionTypeNode(n: Node): n is UnionTypeNode {
    return n.kind === SyntaxKind.UnionType;
  }

  export function isIntersectionTypeNode(n: Node): n is IntersectionTypeNode {
    return n.kind === SyntaxKind.IntersectionType;
  }

  export function isConditionalTypeNode(n: Node): n is ConditionalTypeNode {
    return n.kind === SyntaxKind.ConditionalType;
  }

  export function isInferTypeNode(n: Node): n is InferTypeNode {
    return n.kind === SyntaxKind.InferType;
  }

  export function isParenthesizedTypeNode(n: Node): n is ParenthesizedTypeNode {
    return n.kind === SyntaxKind.ParenthesizedType;
  }

  export function isThisTypeNode(n: Node): n is ThisTypeNode {
    return n.kind === SyntaxKind.ThisType;
  }

  export function isTypeOperatorNode(n: Node): n is TypeOperatorNode {
    return n.kind === SyntaxKind.TypeOperator;
  }

  export function isIndexedAccessTypeNode(n: Node): n is IndexedAccessTypeNode {
    return n.kind === SyntaxKind.IndexedAccessType;
  }

  export function isMappedTypeNode(n: Node): n is MappedTypeNode {
    return n.kind === SyntaxKind.MappedType;
  }

  export function isLiteralTypeNode(n: Node): n is LiteralTypeNode {
    return n.kind === SyntaxKind.LiteralType;
  }

  export function isImportTypeNode(n: Node): n is ImportTypeNode {
    return n.kind === SyntaxKind.ImportType;
  }

  export function isObjectBindingPattern(n: Node): n is ObjectBindingPattern {
    return n.kind === SyntaxKind.ObjectBindingPattern;
  }

  export function isArrayBindingPattern(n: Node): n is ArrayBindingPattern {
    return n.kind === SyntaxKind.ArrayBindingPattern;
  }

  export function isBindingElement(n: Node): n is BindingElement {
    return n.kind === SyntaxKind.BindingElement;
  }

  export function isArrayLiteralExpression(n: Node): n is ArrayLiteralExpression {
    return n.kind === SyntaxKind.ArrayLiteralExpression;
  }

  export function isObjectLiteralExpression(n: Node): n is ObjectLiteralExpression {
    return n.kind === SyntaxKind.ObjectLiteralExpression;
  }

  export function isPropertyAccessExpression(n: Node): n is PropertyAccessExpression {
    return n.kind === SyntaxKind.PropertyAccessExpression;
  }

  export function isPropertyAccessChain(n: Node): n is PropertyAccessChain {
    return isPropertyAccessExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isElementAccessExpression(n: Node): n is ElementAccessExpression {
    return n.kind === SyntaxKind.ElementAccessExpression;
  }

  export function isElementAccessChain(n: Node): n is ElementAccessChain {
    return isElementAccessExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isCallExpression(n: Node): n is CallExpression {
    return n.kind === SyntaxKind.CallExpression;
  }

  export function isCallChain(n: Node): n is CallChain {
    return isCallExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isOptionalChain(n: Node): n is PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain {
    const k = n.kind;
    return (
      !!(n.flags & NodeFlags.OptionalChain) &&
      (k === SyntaxKind.PropertyAccessExpression ||
        k === SyntaxKind.ElementAccessExpression ||
        k === SyntaxKind.CallExpression ||
        k === SyntaxKind.NonNullExpression)
    );
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
    return n.kind === SyntaxKind.BinaryExpression && (<BinaryExpression>n).operatorToken.kind === SyntaxKind.Question2Token;
  }

  export function isNewExpression(n: Node): n is NewExpression {
    return n.kind === SyntaxKind.NewExpression;
  }

  export function isTaggedTemplateExpression(n: Node): n is TaggedTemplateExpression {
    return n.kind === SyntaxKind.TaggedTemplateExpression;
  }

  export function isTypeAssertion(n: Node): n is TypeAssertion {
    return n.kind === SyntaxKind.TypeAssertionExpression;
  }

  export function isConstTypeReference(n: Node) {
    return isTypeReferenceNode(n) && isIdentifier(n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
  }

  export function isParenthesizedExpression(n: Node): n is ParenthesizedExpression {
    return n.kind === SyntaxKind.ParenthesizedExpression;
  }

  export function skipPartiallyEmittedExpressions(n: Expression): Expression;
  export function skipPartiallyEmittedExpressions(n: Node): Node;
  export function skipPartiallyEmittedExpressions(n: Node) {
    return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
  }

  export function isFunctionExpression(n: Node): n is FunctionExpression {
    return n.kind === SyntaxKind.FunctionExpression;
  }

  export function isArrowFunction(n: Node): n is ArrowFunction {
    return n.kind === SyntaxKind.ArrowFunction;
  }

  export function isDeleteExpression(n: Node): n is DeleteExpression {
    return n.kind === SyntaxKind.DeleteExpression;
  }

  export function isTypeOfExpression(n: Node): n is TypeOfExpression {
    return n.kind === SyntaxKind.TypeOfExpression;
  }

  export function isVoidExpression(n: Node): n is VoidExpression {
    return n.kind === SyntaxKind.VoidExpression;
  }

  export function isAwaitExpression(n: Node): n is AwaitExpression {
    return n.kind === SyntaxKind.AwaitExpression;
  }

  export function isPrefixUnaryExpression(n: Node): n is PrefixUnaryExpression {
    return n.kind === SyntaxKind.PrefixUnaryExpression;
  }

  export function isPostfixUnaryExpression(n: Node): n is PostfixUnaryExpression {
    return n.kind === SyntaxKind.PostfixUnaryExpression;
  }

  export function isBinaryExpression(n: Node): n is BinaryExpression {
    return n.kind === SyntaxKind.BinaryExpression;
  }

  export function isConditionalExpression(n: Node): n is ConditionalExpression {
    return n.kind === SyntaxKind.ConditionalExpression;
  }

  export function isTemplateExpression(n: Node): n is TemplateExpression {
    return n.kind === SyntaxKind.TemplateExpression;
  }

  export function isYieldExpression(n: Node): n is YieldExpression {
    return n.kind === SyntaxKind.YieldExpression;
  }

  export function isSpreadElement(n: Node): n is SpreadElement {
    return n.kind === SyntaxKind.SpreadElement;
  }

  export function isClassExpression(n: Node): n is ClassExpression {
    return n.kind === SyntaxKind.ClassExpression;
  }

  export function isOmittedExpression(n: Node): n is OmittedExpression {
    return n.kind === SyntaxKind.OmittedExpression;
  }

  export function isExpressionWithTypeArguments(n: Node): n is ExpressionWithTypeArguments {
    return n.kind === SyntaxKind.ExpressionWithTypeArguments;
  }

  export function isAsExpression(n: Node): n is AsExpression {
    return n.kind === SyntaxKind.AsExpression;
  }

  export function isNonNullExpression(n: Node): n is NonNullExpression {
    return n.kind === SyntaxKind.NonNullExpression;
  }

  export function isNonNullChain(n: Node): n is NonNullChain {
    return isNonNullExpression(n) && !!(n.flags & NodeFlags.OptionalChain);
  }

  export function isMetaProperty(n: Node): n is MetaProperty {
    return n.kind === SyntaxKind.MetaProperty;
  }

  export function isTemplateSpan(n: Node): n is TemplateSpan {
    return n.kind === SyntaxKind.TemplateSpan;
  }

  export function isSemicolonClassElement(n: Node): n is SemicolonClassElement {
    return n.kind === SyntaxKind.SemicolonClassElement;
  }

  export function isBlock(n: Node): n is Block {
    return n.kind === SyntaxKind.Block;
  }

  export function isVariableStatement(n: Node): n is VariableStatement {
    return n.kind === SyntaxKind.VariableStatement;
  }

  export function isEmptyStatement(n: Node): n is EmptyStatement {
    return n.kind === SyntaxKind.EmptyStatement;
  }

  export function isExpressionStatement(n: Node): n is ExpressionStatement {
    return n.kind === SyntaxKind.ExpressionStatement;
  }

  export function isIfStatement(n: Node): n is IfStatement {
    return n.kind === SyntaxKind.IfStatement;
  }

  export function isDoStatement(n: Node): n is DoStatement {
    return n.kind === SyntaxKind.DoStatement;
  }

  export function isWhileStatement(n: Node): n is WhileStatement {
    return n.kind === SyntaxKind.WhileStatement;
  }

  export function isForStatement(n: Node): n is ForStatement {
    return n.kind === SyntaxKind.ForStatement;
  }

  export function isForInStatement(n: Node): n is ForInStatement {
    return n.kind === SyntaxKind.ForInStatement;
  }

  export function isForOfStatement(n: Node): n is ForOfStatement {
    return n.kind === SyntaxKind.ForOfStatement;
  }

  export function isContinueStatement(n: Node): n is ContinueStatement {
    return n.kind === SyntaxKind.ContinueStatement;
  }

  export function isBreakStatement(n: Node): n is BreakStatement {
    return n.kind === SyntaxKind.BreakStatement;
  }

  export function isBreakOrContinueStatement(n: Node): n is BreakOrContinueStatement {
    return n.kind === SyntaxKind.BreakStatement || n.kind === SyntaxKind.ContinueStatement;
  }

  export function isReturnStatement(n: Node): n is ReturnStatement {
    return n.kind === SyntaxKind.ReturnStatement;
  }

  export function isWithStatement(n: Node): n is WithStatement {
    return n.kind === SyntaxKind.WithStatement;
  }

  export function isSwitchStatement(n: Node): n is SwitchStatement {
    return n.kind === SyntaxKind.SwitchStatement;
  }

  export function isLabeledStatement(n: Node): n is LabeledStatement {
    return n.kind === SyntaxKind.LabeledStatement;
  }

  export function isThrowStatement(n: Node): n is ThrowStatement {
    return n.kind === SyntaxKind.ThrowStatement;
  }

  export function isTryStatement(n: Node): n is TryStatement {
    return n.kind === SyntaxKind.TryStatement;
  }

  export function isDebuggerStatement(n: Node): n is DebuggerStatement {
    return n.kind === SyntaxKind.DebuggerStatement;
  }

  export function isVariableDeclaration(n: Node): n is VariableDeclaration {
    return n.kind === SyntaxKind.VariableDeclaration;
  }

  export function isVariableDeclarationList(n: Node): n is VariableDeclarationList {
    return n.kind === SyntaxKind.VariableDeclarationList;
  }

  export function isFunctionDeclaration(n: Node): n is FunctionDeclaration {
    return n.kind === SyntaxKind.FunctionDeclaration;
  }

  export function isClassDeclaration(n: Node): n is ClassDeclaration {
    return n.kind === SyntaxKind.ClassDeclaration;
  }

  export function isInterfaceDeclaration(n: Node): n is InterfaceDeclaration {
    return n.kind === SyntaxKind.InterfaceDeclaration;
  }

  export function isTypeAliasDeclaration(n: Node): n is TypeAliasDeclaration {
    return n.kind === SyntaxKind.TypeAliasDeclaration;
  }

  export function isEnumDeclaration(n: Node): n is EnumDeclaration {
    return n.kind === SyntaxKind.EnumDeclaration;
  }

  export function isModuleDeclaration(n: Node): n is ModuleDeclaration {
    return n.kind === SyntaxKind.ModuleDeclaration;
  }

  export function isModuleBlock(n: Node): n is ModuleBlock {
    return n.kind === SyntaxKind.ModuleBlock;
  }

  export function isCaseBlock(n: Node): n is CaseBlock {
    return n.kind === SyntaxKind.CaseBlock;
  }

  export function isNamespaceExportDeclaration(n: Node): n is NamespaceExportDeclaration {
    return n.kind === SyntaxKind.NamespaceExportDeclaration;
  }

  export function isImportEqualsDeclaration(n: Node): n is ImportEqualsDeclaration {
    return n.kind === SyntaxKind.ImportEqualsDeclaration;
  }

  export function isImportDeclaration(n: Node): n is ImportDeclaration {
    return n.kind === SyntaxKind.ImportDeclaration;
  }

  export function isImportClause(n: Node): n is ImportClause {
    return n.kind === SyntaxKind.ImportClause;
  }

  export function isNamespaceImport(n: Node): n is NamespaceImport {
    return n.kind === SyntaxKind.NamespaceImport;
  }

  export function isNamespaceExport(n: Node): n is NamespaceExport {
    return n.kind === SyntaxKind.NamespaceExport;
  }

  export function isNamedExportBindings(n: Node): n is NamedExportBindings {
    return n.kind === SyntaxKind.NamespaceExport || n.kind === SyntaxKind.NamedExports;
  }

  export function isNamedImports(n: Node): n is NamedImports {
    return n.kind === SyntaxKind.NamedImports;
  }

  export function isImportSpecifier(n: Node): n is ImportSpecifier {
    return n.kind === SyntaxKind.ImportSpecifier;
  }

  export function isExportAssignment(n: Node): n is ExportAssignment {
    return n.kind === SyntaxKind.ExportAssignment;
  }

  export function isExportDeclaration(n: Node): n is ExportDeclaration {
    return n.kind === SyntaxKind.ExportDeclaration;
  }

  export function isNamedExports(n: Node): n is NamedExports {
    return n.kind === SyntaxKind.NamedExports;
  }

  export function isExportSpecifier(n: Node): n is ExportSpecifier {
    return n.kind === SyntaxKind.ExportSpecifier;
  }

  export function isMissingDeclaration(n: Node): n is MissingDeclaration {
    return n.kind === SyntaxKind.MissingDeclaration;
  }

  export function isExternalModuleReference(n: Node): n is ExternalModuleReference {
    return n.kind === SyntaxKind.ExternalModuleReference;
  }

  export function isJsxElement(n: Node): n is JsxElement {
    return n.kind === SyntaxKind.JsxElement;
  }

  export function isJsxSelfClosingElement(n: Node): n is JsxSelfClosingElement {
    return n.kind === SyntaxKind.JsxSelfClosingElement;
  }

  export function isJsxOpeningElement(n: Node): n is JsxOpeningElement {
    return n.kind === SyntaxKind.JsxOpeningElement;
  }

  export function isJsxClosingElement(n: Node): n is JsxClosingElement {
    return n.kind === SyntaxKind.JsxClosingElement;
  }

  export function isJsxFragment(n: Node): n is JsxFragment {
    return n.kind === SyntaxKind.JsxFragment;
  }

  export function isJsxOpeningFragment(n: Node): n is JsxOpeningFragment {
    return n.kind === SyntaxKind.JsxOpeningFragment;
  }

  export function isJsxClosingFragment(n: Node): n is JsxClosingFragment {
    return n.kind === SyntaxKind.JsxClosingFragment;
  }

  export function isJsxAttribute(n: Node): n is JsxAttribute {
    return n.kind === SyntaxKind.JsxAttribute;
  }

  export function isJsxAttributes(n: Node): n is JsxAttributes {
    return n.kind === SyntaxKind.JsxAttributes;
  }

  export function isJsxSpreadAttribute(n: Node): n is JsxSpreadAttribute {
    return n.kind === SyntaxKind.JsxSpreadAttribute;
  }

  export function isJsxExpression(n: Node): n is JsxExpression {
    return n.kind === SyntaxKind.JsxExpression;
  }

  export function isCaseClause(n: Node): n is CaseClause {
    return n.kind === SyntaxKind.CaseClause;
  }

  export function isDefaultClause(n: Node): n is DefaultClause {
    return n.kind === SyntaxKind.DefaultClause;
  }

  export function isHeritageClause(n: Node): n is HeritageClause {
    return n.kind === SyntaxKind.HeritageClause;
  }

  export function isCatchClause(n: Node): n is CatchClause {
    return n.kind === SyntaxKind.CatchClause;
  }

  export function isPropertyAssignment(n: Node): n is PropertyAssignment {
    return n.kind === SyntaxKind.PropertyAssignment;
  }

  export function isShorthandPropertyAssignment(n: Node): n is ShorthandPropertyAssignment {
    return n.kind === SyntaxKind.ShorthandPropertyAssignment;
  }

  export function isSpreadAssignment(n: Node): n is SpreadAssignment {
    return n.kind === SyntaxKind.SpreadAssignment;
  }

  export function isEnumMember(n: Node): n is EnumMember {
    return n.kind === SyntaxKind.EnumMember;
  }

  export function isSourceFile(n: Node): n is SourceFile {
    return n.kind === SyntaxKind.SourceFile;
  }

  export function isBundle(n: Node): n is Bundle {
    return n.kind === SyntaxKind.Bundle;
  }

  export function isUnparsedSource(n: Node): n is UnparsedSource {
    return n.kind === SyntaxKind.UnparsedSource;
  }

  export function isUnparsedPrepend(n: Node): n is UnparsedPrepend {
    return n.kind === SyntaxKind.UnparsedPrepend;
  }

  export function isUnparsedTextLike(n: Node): n is UnparsedTextLike {
    switch (n.kind) {
      case SyntaxKind.UnparsedText:
      case SyntaxKind.UnparsedInternalText:
        return true;
      default:
        return false;
    }
  }

  export function isUnparsedNode(n: Node): n is UnparsedNode {
    return isUnparsedTextLike(n) || n.kind === SyntaxKind.UnparsedPrologue || n.kind === SyntaxKind.UnparsedSyntheticReference;
  }

  export function isJSDocTypeExpression(n: Node): n is JSDocTypeExpression {
    return n.kind === SyntaxKind.JSDocTypeExpression;
  }

  export function isJSDocAllType(n: Node): n is JSDocAllType {
    return n.kind === SyntaxKind.JSDocAllType;
  }

  export function isJSDocUnknownType(n: Node): n is JSDocUnknownType {
    return n.kind === SyntaxKind.JSDocUnknownType;
  }

  export function isJSDocNullableType(n: Node): n is JSDocNullableType {
    return n.kind === SyntaxKind.JSDocNullableType;
  }

  export function isJSDocNonNullableType(n: Node): n is JSDocNonNullableType {
    return n.kind === SyntaxKind.JSDocNonNullableType;
  }

  export function isJSDocOptionalType(n: Node): n is JSDocOptionalType {
    return n.kind === SyntaxKind.JSDocOptionalType;
  }

  export function isJSDocFunctionType(n: Node): n is JSDocFunctionType {
    return n.kind === SyntaxKind.JSDocFunctionType;
  }

  export function isJSDocVariadicType(n: Node): n is JSDocVariadicType {
    return n.kind === SyntaxKind.JSDocVariadicType;
  }

  export function isJSDoc(n: Node): n is JSDoc {
    return n.kind === SyntaxKind.JSDocComment;
  }

  export function isJSDocAuthorTag(n: Node): n is JSDocAuthorTag {
    return n.kind === SyntaxKind.JSDocAuthorTag;
  }

  export function isJSDocAugmentsTag(n: Node): n is JSDocAugmentsTag {
    return n.kind === SyntaxKind.JSDocAugmentsTag;
  }

  export function isJSDocImplementsTag(n: Node): n is JSDocImplementsTag {
    return n.kind === SyntaxKind.JSDocImplementsTag;
  }

  export function isJSDocClassTag(n: Node): n is JSDocClassTag {
    return n.kind === SyntaxKind.JSDocClassTag;
  }

  export function isJSDocPublicTag(n: Node): n is JSDocPublicTag {
    return n.kind === SyntaxKind.JSDocPublicTag;
  }

  export function isJSDocPrivateTag(n: Node): n is JSDocPrivateTag {
    return n.kind === SyntaxKind.JSDocPrivateTag;
  }

  export function isJSDocProtectedTag(n: Node): n is JSDocProtectedTag {
    return n.kind === SyntaxKind.JSDocProtectedTag;
  }

  export function isJSDocReadonlyTag(n: Node): n is JSDocReadonlyTag {
    return n.kind === SyntaxKind.JSDocReadonlyTag;
  }

  export function isJSDocEnumTag(n: Node): n is JSDocEnumTag {
    return n.kind === SyntaxKind.JSDocEnumTag;
  }

  export function isJSDocThisTag(n: Node): n is JSDocThisTag {
    return n.kind === SyntaxKind.JSDocThisTag;
  }

  export function isJSDocParameterTag(n: Node): n is JSDocParameterTag {
    return n.kind === SyntaxKind.JSDocParameterTag;
  }

  export function isJSDocReturnTag(n: Node): n is JSDocReturnTag {
    return n.kind === SyntaxKind.JSDocReturnTag;
  }

  export function isJSDocTypeTag(n: Node): n is JSDocTypeTag {
    return n.kind === SyntaxKind.JSDocTypeTag;
  }

  export function isJSDocTemplateTag(n: Node): n is JSDocTemplateTag {
    return n.kind === SyntaxKind.JSDocTemplateTag;
  }

  export function isJSDocTypedefTag(n: Node): n is JSDocTypedefTag {
    return n.kind === SyntaxKind.JSDocTypedefTag;
  }

  export function isJSDocPropertyTag(n: Node): n is JSDocPropertyTag {
    return n.kind === SyntaxKind.JSDocPropertyTag;
  }

  export function isJSDocPropertyLikeTag(n: Node): n is JSDocPropertyLikeTag {
    return n.kind === SyntaxKind.JSDocPropertyTag || n.kind === SyntaxKind.JSDocParameterTag;
  }

  export function isJSDocTypeLiteral(n: Node): n is JSDocTypeLiteral {
    return n.kind === SyntaxKind.JSDocTypeLiteral;
  }

  export function isJSDocCallbackTag(n: Node): n is JSDocCallbackTag {
    return n.kind === SyntaxKind.JSDocCallbackTag;
  }

  export function isJSDocSignature(n: Node): n is JSDocSignature {
    return n.kind === SyntaxKind.JSDocSignature;
  }

  export function isSyntaxList(n: Node): n is SyntaxList {
    return n.kind === SyntaxKind.SyntaxList;
  }

  export function isNode(n: Node) {
    return isNodeKind(n.kind);
  }

  export function isNodeKind(k: SyntaxKind) {
    return k >= SyntaxKind.FirstNode;
  }

  export function isToken(n: Node) {
    return n.kind >= SyntaxKind.FirstToken && n.kind <= SyntaxKind.LastToken;
  }

  export function isNodeArray<T extends Node>(array: readonly T[]): array is NodeArray<T> {
    return array.hasOwnProperty('pos') && array.hasOwnProperty('end');
  }

  export function isLiteralKind(k: SyntaxKind) {
    return SyntaxKind.FirstLiteralToken <= k && k <= SyntaxKind.LastLiteralToken;
  }

  export function isLiteralExpression(n: Node): n is LiteralExpression {
    return isLiteralKind(n.kind);
  }

  export function isTemplateLiteralKind(k: SyntaxKind) {
    return SyntaxKind.FirstTemplateToken <= k && k <= SyntaxKind.LastTemplateToken;
  }

  export type TemplateLiteralToken = NoSubstitutionTemplateLiteral | TemplateHead | TemplateMiddle | TemplateTail;
  export function isTemplateLiteralToken(n: Node): n is TemplateLiteralToken {
    return isTemplateLiteralKind(n.kind);
  }

  export function isImportOrExportSpecifier(n: Node): n is ImportSpecifier | ExportSpecifier {
    return isImportSpecifier(n) || isExportSpecifier(n);
  }

  export function isTypeOnlyImportOrExportDeclaration(n: Node): n is TypeOnlyCompatibleAliasDeclaration {
    switch (n.kind) {
      case SyntaxKind.ImportSpecifier:
      case SyntaxKind.ExportSpecifier:
        return (n as ImportOrExportSpecifier).parent.parent.isTypeOnly;
      case SyntaxKind.NamespaceImport:
        return (n as NamespaceImport).parent.isTypeOnly;
      case SyntaxKind.ImportClause:
        return (n as ImportClause).isTypeOnly;
      default:
        return false;
    }
  }

  export function isStringTextContainingNode(n: Node): n is StringLiteral | TemplateLiteralToken {
    return n.kind === SyntaxKind.StringLiteral || isTemplateLiteralKind(n.kind);
  }

  export function isGeneratedIdentifier(n: Node): n is GeneratedIdentifier {
    return isIdentifier(n) && (n.autoGenerateFlags! & GeneratedIdentifierFlags.KindMask) > GeneratedIdentifierFlags.None;
  }

  export function isPrivateIdentifierPropertyDeclaration(n: Node): n is PrivateIdentifierPropertyDeclaration {
    return isPropertyDeclaration(n) && isPrivateIdentifier(n.name);
  }

  export function isPrivateIdentifierPropertyAccessExpression(n: Node): n is PrivateIdentifierPropertyAccessExpression {
    return isPropertyAccessExpression(n) && isPrivateIdentifier(n.name);
  }

  export function isModifierKind(token: SyntaxKind): token is Modifier['kind'] {
    switch (token) {
      case SyntaxKind.AbstractKeyword:
      case SyntaxKind.AsyncKeyword:
      case SyntaxKind.ConstKeyword:
      case SyntaxKind.DeclareKeyword:
      case SyntaxKind.DefaultKeyword:
      case SyntaxKind.ExportKeyword:
      case SyntaxKind.PublicKeyword:
      case SyntaxKind.PrivateKeyword:
      case SyntaxKind.ProtectedKeyword:
      case SyntaxKind.ReadonlyKeyword:
      case SyntaxKind.StaticKeyword:
        return true;
    }
    return false;
  }

  export function isParameterPropertyModifier(k: SyntaxKind) {
    return !!(modifierToFlag(k) & ModifierFlags.ParameterPropertyModifier);
  }

  export function isClassMemberModifier(idToken: SyntaxKind) {
    return isParameterPropertyModifier(idToken) || idToken === SyntaxKind.StaticKeyword;
  }

  export function isModifier(n: Node): n is Modifier {
    return isModifierKind(n.kind);
  }

  export function isEntityName(n: Node): n is EntityName {
    const k = n.kind;
    return k === SyntaxKind.QualifiedName || k === SyntaxKind.Identifier;
  }

  export function isPropertyName(n: Node): n is PropertyName {
    const k = n.kind;
    return (
      k === SyntaxKind.Identifier ||
      k === SyntaxKind.PrivateIdentifier ||
      k === SyntaxKind.StringLiteral ||
      k === SyntaxKind.NumericLiteral ||
      k === SyntaxKind.ComputedPropertyName
    );
  }

  export function isBindingName(n: Node): n is BindingName {
    const k = n.kind;
    return k === SyntaxKind.Identifier || k === SyntaxKind.ObjectBindingPattern || k === SyntaxKind.ArrayBindingPattern;
  }

  export function isFunctionLike(n: Node): n is SignatureDeclaration {
    return n && isFunctionLikeKind(n.kind);
  }

  export function isFunctionLikeDeclaration(n: Node): n is FunctionLikeDeclaration {
    return n && isFunctionLikeDeclarationKind(n.kind);
  }

  function isFunctionLikeDeclarationKind(k: SyntaxKind) {
    switch (k) {
      case SyntaxKind.FunctionDeclaration:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.Constructor:
      case SyntaxKind.GetAccessor:
      case SyntaxKind.SetAccessor:
      case SyntaxKind.FunctionExpression:
      case SyntaxKind.ArrowFunction:
        return true;
      default:
        return false;
    }
  }

  export function isFunctionLikeKind(k: SyntaxKind) {
    switch (k) {
      case SyntaxKind.MethodSignature:
      case SyntaxKind.CallSignature:
      case SyntaxKind.JSDocSignature:
      case SyntaxKind.ConstructSignature:
      case SyntaxKind.IndexSignature:
      case SyntaxKind.FunctionType:
      case SyntaxKind.JSDocFunctionType:
      case SyntaxKind.ConstructorType:
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
      k === SyntaxKind.Constructor ||
      k === SyntaxKind.PropertyDeclaration ||
      k === SyntaxKind.MethodDeclaration ||
      k === SyntaxKind.GetAccessor ||
      k === SyntaxKind.SetAccessor ||
      k === SyntaxKind.IndexSignature ||
      k === SyntaxKind.SemicolonClassElement
    );
  }

  export function isClassLike(n: Node): n is ClassLikeDeclaration {
    return n && (n.kind === SyntaxKind.ClassDeclaration || n.kind === SyntaxKind.ClassExpression);
  }

  export function isAccessor(n: Node): n is AccessorDeclaration {
    return n && (n.kind === SyntaxKind.GetAccessor || n.kind === SyntaxKind.SetAccessor);
  }

  export function isMethodOrAccessor(n: Node): n is MethodDeclaration | AccessorDeclaration {
    switch (n.kind) {
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.GetAccessor:
      case SyntaxKind.SetAccessor:
        return true;
      default:
        return false;
    }
  }

  export function isTypeElement(n: Node): n is TypeElement {
    const k = n.kind;
    return (
      k === SyntaxKind.ConstructSignature ||
      k === SyntaxKind.CallSignature ||
      k === SyntaxKind.PropertySignature ||
      k === SyntaxKind.MethodSignature ||
      k === SyntaxKind.IndexSignature
    );
  }

  export function isClassOrTypeElement(n: Node): n is ClassElement | TypeElement {
    return isTypeElement(n) || isClassElement(n);
  }

  export function isObjectLiteralElementLike(n: Node): n is ObjectLiteralElementLike {
    const k = n.kind;
    return (
      k === SyntaxKind.PropertyAssignment ||
      k === SyntaxKind.ShorthandPropertyAssignment ||
      k === SyntaxKind.SpreadAssignment ||
      k === SyntaxKind.MethodDeclaration ||
      k === SyntaxKind.GetAccessor ||
      k === SyntaxKind.SetAccessor
    );
  }

  export function isTypeNode(n: Node): n is TypeNode {
    return isTypeNodeKind(n.kind);
  }

  export function isFunctionOrConstructorTypeNode(n: Node): n is FunctionTypeNode | ConstructorTypeNode {
    switch (n.kind) {
      case SyntaxKind.FunctionType:
      case SyntaxKind.ConstructorType:
        return true;
    }
    return false;
  }

  export function isBindingPattern(n: Node | undefined): n is BindingPattern {
    if (n) {
      const k = n.kind;
      return k === SyntaxKind.ArrayBindingPattern || k === SyntaxKind.ObjectBindingPattern;
    }
    return false;
  }

  export function isAssignmentPattern(n: Node): n is AssignmentPattern {
    const k = n.kind;
    return k === SyntaxKind.ArrayLiteralExpression || k === SyntaxKind.ObjectLiteralExpression;
  }

  export function isArrayBindingElement(n: Node): n is ArrayBindingElement {
    const k = n.kind;
    return k === SyntaxKind.BindingElement || k === SyntaxKind.OmittedExpression;
  }

  export function isDeclarationBindingElement(e: BindingOrAssignmentElement): e is VariableDeclaration | ParameterDeclaration | BindingElement {
    switch (e.kind) {
      case SyntaxKind.VariableDeclaration:
      case SyntaxKind.Parameter:
      case SyntaxKind.BindingElement:
        return true;
    }
    return false;
  }

  export function isBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is BindingOrAssignmentPattern {
    return isObjectBindingOrAssignmentPattern(n) || isArrayBindingOrAssignmentPattern(n);
  }

  export function isObjectBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ObjectBindingOrAssignmentPattern {
    switch (n.kind) {
      case SyntaxKind.ObjectBindingPattern:
      case SyntaxKind.ObjectLiteralExpression:
        return true;
    }
    return false;
  }

  export function isArrayBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ArrayBindingOrAssignmentPattern {
    switch (n.kind) {
      case SyntaxKind.ArrayBindingPattern:
      case SyntaxKind.ArrayLiteralExpression:
        return true;
    }
    return false;
  }

  export function isPropertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is PropertyAccessExpression | QualifiedName | ImportTypeNode {
    const k = n.kind;
    return k === SyntaxKind.PropertyAccessExpression || k === SyntaxKind.QualifiedName || k === SyntaxKind.ImportType;
  }

  export function isPropertyAccessOrQualifiedName(n: Node): n is PropertyAccessExpression | QualifiedName {
    const k = n.kind;
    return k === SyntaxKind.PropertyAccessExpression || k === SyntaxKind.QualifiedName;
  }

  export function isCallLikeExpression(n: Node): n is CallLikeExpression {
    switch (n.kind) {
      case SyntaxKind.JsxOpeningElement:
      case SyntaxKind.JsxSelfClosingElement:
      case SyntaxKind.CallExpression:
      case SyntaxKind.NewExpression:
      case SyntaxKind.TaggedTemplateExpression:
      case SyntaxKind.Decorator:
        return true;
      default:
        return false;
    }
  }

  export function isCallOrNewExpression(n: Node): n is CallExpression | NewExpression {
    return n.kind === SyntaxKind.CallExpression || n.kind === SyntaxKind.NewExpression;
  }

  export function isTemplateLiteral(n: Node): n is TemplateLiteral {
    const k = n.kind;
    return k === SyntaxKind.TemplateExpression || k === SyntaxKind.NoSubstitutionTemplateLiteral;
  }

  export function isLeftHandSideExpression(n: Node): n is LeftHandSideExpression {
    return isLeftHandSideExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isLeftHandSideExpressionKind(k: SyntaxKind) {
    switch (k) {
      case SyntaxKind.PropertyAccessExpression:
      case SyntaxKind.ElementAccessExpression:
      case SyntaxKind.NewExpression:
      case SyntaxKind.CallExpression:
      case SyntaxKind.JsxElement:
      case SyntaxKind.JsxSelfClosingElement:
      case SyntaxKind.JsxFragment:
      case SyntaxKind.TaggedTemplateExpression:
      case SyntaxKind.ArrayLiteralExpression:
      case SyntaxKind.ParenthesizedExpression:
      case SyntaxKind.ObjectLiteralExpression:
      case SyntaxKind.ClassExpression:
      case SyntaxKind.FunctionExpression:
      case SyntaxKind.Identifier:
      case SyntaxKind.RegularExpressionLiteral:
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.BigIntLiteral:
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NoSubstitutionTemplateLiteral:
      case SyntaxKind.TemplateExpression:
      case SyntaxKind.FalseKeyword:
      case SyntaxKind.NullKeyword:
      case SyntaxKind.ThisKeyword:
      case SyntaxKind.TrueKeyword:
      case SyntaxKind.SuperKeyword:
      case SyntaxKind.NonNullExpression:
      case SyntaxKind.MetaProperty:
      case SyntaxKind.ImportKeyword:
        return true;
      default:
        return false;
    }
  }

  export function isUnaryExpression(n: Node): n is UnaryExpression {
    return isUnaryExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isUnaryExpressionKind(k: SyntaxKind) {
    switch (k) {
      case SyntaxKind.PrefixUnaryExpression:
      case SyntaxKind.PostfixUnaryExpression:
      case SyntaxKind.DeleteExpression:
      case SyntaxKind.TypeOfExpression:
      case SyntaxKind.VoidExpression:
      case SyntaxKind.AwaitExpression:
      case SyntaxKind.TypeAssertionExpression:
        return true;
      default:
        return isLeftHandSideExpressionKind(k);
    }
  }

  export function isUnaryExpressionWithWrite(expr: Node): expr is PrefixUnaryExpression | PostfixUnaryExpression {
    switch (expr.kind) {
      case SyntaxKind.PostfixUnaryExpression:
        return true;
      case SyntaxKind.PrefixUnaryExpression:
        return (<PrefixUnaryExpression>expr).operator === SyntaxKind.Plus2Token || (<PrefixUnaryExpression>expr).operator === SyntaxKind.Minus2Token;
      default:
        return false;
    }
  }

  export function isExpression(n: Node): n is Expression {
    return isExpressionKind(skipPartiallyEmittedExpressions(n).kind);
  }

  function isExpressionKind(k: SyntaxKind) {
    switch (k) {
      case SyntaxKind.ConditionalExpression:
      case SyntaxKind.YieldExpression:
      case SyntaxKind.ArrowFunction:
      case SyntaxKind.BinaryExpression:
      case SyntaxKind.SpreadElement:
      case SyntaxKind.AsExpression:
      case SyntaxKind.OmittedExpression:
      case SyntaxKind.CommaListExpression:
      case SyntaxKind.PartiallyEmittedExpression:
        return true;
      default:
        return isUnaryExpressionKind(k);
    }
  }

  export function isAssertionExpression(n: Node): n is AssertionExpression {
    const k = n.kind;
    return k === SyntaxKind.TypeAssertionExpression || k === SyntaxKind.AsExpression;
  }

  export function isPartiallyEmittedExpression(n: Node): n is PartiallyEmittedExpression {
    return n.kind === SyntaxKind.PartiallyEmittedExpression;
  }

  export function isNotEmittedStatement(n: Node): n is NotEmittedStatement {
    return n.kind === SyntaxKind.NotEmittedStatement;
  }

  export function isSyntheticReference(n: Node): n is SyntheticReferenceExpression {
    return n.kind === SyntaxKind.SyntheticReferenceExpression;
  }

  export function isNotEmittedOrPartiallyEmittedNode(n: Node): n is NotEmittedStatement | PartiallyEmittedExpression {
    return isNotEmittedStatement(n) || isPartiallyEmittedExpression(n);
  }

  export function isIterationStatement(n: Node, look: false): n is IterationStatement;
  export function isIterationStatement(n: Node, look: boolean): n is IterationStatement | LabeledStatement;
  export function isIterationStatement(n: Node, look: boolean): n is IterationStatement {
    switch (n.kind) {
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.DoStatement:
      case SyntaxKind.WhileStatement:
        return true;
      case SyntaxKind.LabeledStatement:
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
    return n.kind === SyntaxKind.ForInStatement || n.kind === SyntaxKind.ForOfStatement;
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
    return k === SyntaxKind.ModuleBlock || k === SyntaxKind.ModuleDeclaration || k === SyntaxKind.Identifier;
  }

  export function isNamespaceBody(n: Node): n is NamespaceBody {
    const k = n.kind;
    return k === SyntaxKind.ModuleBlock || k === SyntaxKind.ModuleDeclaration;
  }

  export function isJSDocNamespaceBody(n: Node): n is JSDocNamespaceBody {
    const k = n.kind;
    return k === SyntaxKind.Identifier || k === SyntaxKind.ModuleDeclaration;
  }

  export function isNamedImportBindings(n: Node): n is NamedImportBindings {
    const k = n.kind;
    return k === SyntaxKind.NamedImports || k === SyntaxKind.NamespaceImport;
  }

  export function isModuleOrEnumDeclaration(n: Node): n is ModuleDeclaration | EnumDeclaration {
    return n.kind === SyntaxKind.ModuleDeclaration || n.kind === SyntaxKind.EnumDeclaration;
  }

  function isDeclarationKind(k: SyntaxKind) {
    return (
      k === SyntaxKind.ArrowFunction ||
      k === SyntaxKind.BindingElement ||
      k === SyntaxKind.ClassDeclaration ||
      k === SyntaxKind.ClassExpression ||
      k === SyntaxKind.Constructor ||
      k === SyntaxKind.EnumDeclaration ||
      k === SyntaxKind.EnumMember ||
      k === SyntaxKind.ExportSpecifier ||
      k === SyntaxKind.FunctionDeclaration ||
      k === SyntaxKind.FunctionExpression ||
      k === SyntaxKind.GetAccessor ||
      k === SyntaxKind.ImportClause ||
      k === SyntaxKind.ImportEqualsDeclaration ||
      k === SyntaxKind.ImportSpecifier ||
      k === SyntaxKind.InterfaceDeclaration ||
      k === SyntaxKind.JsxAttribute ||
      k === SyntaxKind.MethodDeclaration ||
      k === SyntaxKind.MethodSignature ||
      k === SyntaxKind.ModuleDeclaration ||
      k === SyntaxKind.NamespaceExportDeclaration ||
      k === SyntaxKind.NamespaceImport ||
      k === SyntaxKind.NamespaceExport ||
      k === SyntaxKind.Parameter ||
      k === SyntaxKind.PropertyAssignment ||
      k === SyntaxKind.PropertyDeclaration ||
      k === SyntaxKind.PropertySignature ||
      k === SyntaxKind.SetAccessor ||
      k === SyntaxKind.ShorthandPropertyAssignment ||
      k === SyntaxKind.TypeAliasDeclaration ||
      k === SyntaxKind.TypeParameter ||
      k === SyntaxKind.VariableDeclaration ||
      k === SyntaxKind.JSDocTypedefTag ||
      k === SyntaxKind.JSDocCallbackTag ||
      k === SyntaxKind.JSDocPropertyTag
    );
  }

  function isDeclarationStatementKind(k: SyntaxKind) {
    return (
      k === SyntaxKind.FunctionDeclaration ||
      k === SyntaxKind.MissingDeclaration ||
      k === SyntaxKind.ClassDeclaration ||
      k === SyntaxKind.InterfaceDeclaration ||
      k === SyntaxKind.TypeAliasDeclaration ||
      k === SyntaxKind.EnumDeclaration ||
      k === SyntaxKind.ModuleDeclaration ||
      k === SyntaxKind.ImportDeclaration ||
      k === SyntaxKind.ImportEqualsDeclaration ||
      k === SyntaxKind.ExportDeclaration ||
      k === SyntaxKind.ExportAssignment ||
      k === SyntaxKind.NamespaceExportDeclaration
    );
  }

  function isStatementKindButNotDeclarationKind(k: SyntaxKind) {
    return (
      k === SyntaxKind.BreakStatement ||
      k === SyntaxKind.ContinueStatement ||
      k === SyntaxKind.DebuggerStatement ||
      k === SyntaxKind.DoStatement ||
      k === SyntaxKind.ExpressionStatement ||
      k === SyntaxKind.EmptyStatement ||
      k === SyntaxKind.ForInStatement ||
      k === SyntaxKind.ForOfStatement ||
      k === SyntaxKind.ForStatement ||
      k === SyntaxKind.IfStatement ||
      k === SyntaxKind.LabeledStatement ||
      k === SyntaxKind.ReturnStatement ||
      k === SyntaxKind.SwitchStatement ||
      k === SyntaxKind.ThrowStatement ||
      k === SyntaxKind.TryStatement ||
      k === SyntaxKind.VariableStatement ||
      k === SyntaxKind.WhileStatement ||
      k === SyntaxKind.WithStatement ||
      k === SyntaxKind.NotEmittedStatement ||
      k === SyntaxKind.EndOfDeclarationMarker ||
      k === SyntaxKind.MergeDeclarationMarker
    );
  }

  export function isDeclaration(n: Node): n is NamedDeclaration {
    if (n.kind === SyntaxKind.TypeParameter) {
      return (n.parent && n.parent.kind !== SyntaxKind.JSDocTemplateTag) || isInJSFile(n);
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
    if (n.kind !== SyntaxKind.Block) return false;
    if (n.parent !== undefined) {
      if (n.parent.kind === SyntaxKind.TryStatement || n.parent.kind === SyntaxKind.CatchClause) {
        return false;
      }
    }
    return !isFunctionBlock(n);
  }

  export function isModuleReference(n: Node): n is ModuleReference {
    const k = n.kind;
    return k === SyntaxKind.ExternalModuleReference || k === SyntaxKind.QualifiedName || k === SyntaxKind.Identifier;
  }

  export function isJsxTagNameExpression(n: Node): n is JsxTagNameExpression {
    const k = n.kind;
    return k === SyntaxKind.ThisKeyword || k === SyntaxKind.Identifier || k === SyntaxKind.PropertyAccessExpression;
  }

  export function isJsxChild(n: Node): n is JsxChild {
    const k = n.kind;
    return (
      k === SyntaxKind.JsxElement ||
      k === SyntaxKind.JsxExpression ||
      k === SyntaxKind.JsxSelfClosingElement ||
      k === SyntaxKind.JsxText ||
      k === SyntaxKind.JsxFragment
    );
  }

  export function isJsxAttributeLike(n: Node): n is JsxAttributeLike {
    const k = n.kind;
    return k === SyntaxKind.JsxAttribute || k === SyntaxKind.JsxSpreadAttribute;
  }

  export function isJsxOpeningLikeElement(n: Node): n is JsxOpeningLikeElement {
    const k = n.kind;
    return k === SyntaxKind.JsxOpeningElement || k === SyntaxKind.JsxSelfClosingElement;
  }

  export function isCaseOrDefaultClause(n: Node): n is CaseOrDefaultClause {
    const k = n.kind;
    return k === SyntaxKind.CaseClause || k === SyntaxKind.DefaultClause;
  }

  export function isJSDocNode(n: Node) {
    return n.kind >= SyntaxKind.FirstJSDocNode && n.kind <= SyntaxKind.LastJSDocNode;
  }

  export function isJSDocCommentContainingNode(n: Node) {
    return (
      n.kind === SyntaxKind.JSDocComment || n.kind === SyntaxKind.JSDocNamepathType || isJSDocTag(n) || isJSDocTypeLiteral(n) || isJSDocSignature(n)
    );
  }

  export function isJSDocTag(n: Node): n is JSDocTag {
    return n.kind >= SyntaxKind.FirstJSDocTagNode && n.kind <= SyntaxKind.LastJSDocTagNode;
  }

  export function isSetAccessor(n: Node): n is SetAccessorDeclaration {
    return n.kind === SyntaxKind.SetAccessor;
  }

  export function isGetAccessor(n: Node): n is GetAccessorDeclaration {
    return n.kind === SyntaxKind.GetAccessor;
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
      case SyntaxKind.VariableDeclaration:
      case SyntaxKind.Parameter:
      case SyntaxKind.BindingElement:
      case SyntaxKind.PropertySignature:
      case SyntaxKind.PropertyDeclaration:
      case SyntaxKind.PropertyAssignment:
      case SyntaxKind.EnumMember:
        return true;
      default:
        return false;
    }
  }

  export function isObjectLiteralElement(n: Node): n is ObjectLiteralElement {
    return n.kind === SyntaxKind.JsxAttribute || n.kind === SyntaxKind.JsxSpreadAttribute || isObjectLiteralElementLike(n);
  }

  export function isTypeReferenceType(n: Node): n is TypeReferenceType {
    return n.kind === SyntaxKind.TypeReference || n.kind === SyntaxKind.ExpressionWithTypeArguments;
  }

  const MAX_SMI_X86 = 0x3fff_ffff;
  export function guessIndentation(lines: string[]) {
    let indentation = MAX_SMI_X86;
    for (const line of lines) {
      if (!line.length) continue;
      let i = 0;
      for (; i < line.length && i < indentation; i++) {
        if (!isWhiteSpaceLike(line.charCodeAt(i))) break;
      }
      if (i < indentation) indentation = i;
      if (indentation === 0) return 0;
    }
    return indentation === MAX_SMI_X86 ? undefined : indentation;
  }
}
