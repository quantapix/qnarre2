/* eslint-disable no-case-declarations */
import * as qpc from './corePublic';
import * as qc from './core';
import * as qp from './path';
import * as qt from './types';
import * as qu from './utilities';
import { Debug } from './debug';
import { Diagnostics } from './diagnostics';

export function isExternalModuleNameRelative(moduleName: string): boolean {
  // TypeScript 1.0 spec (April 2014): 11.2.1
  // An external module name is "relative" if the first term is "." or "..".
  // Update: We also consider a path like `C:\foo.ts` "relative" because we do not search for it in `node_modules` or treat it as an ambient module.
  return qp.pathIsRelative(moduleName) || qp.isRootedDiskPath(moduleName);
}

export function sortAndDeduplicateDiagnostics<T extends qt.Diagnostic>(diagnostics: readonly T[]): qpc.SortedReadonlyArray<T> {
  return qc.sortAndDeduplicate<T>(diagnostics, qu.compareDiagnostics);
}

export function getDefaultLibFileName(options: qt.CompilerOptions): string {
  switch (options.target) {
    case qt.ScriptTarget.ESNext:
      return 'lib.esnext.full.d.ts';
    case qt.ScriptTarget.ES2020:
      return 'lib.es2020.full.d.ts';
    case qt.ScriptTarget.ES2019:
      return 'lib.es2019.full.d.ts';
    case qt.ScriptTarget.ES2018:
      return 'lib.es2018.full.d.ts';
    case qt.ScriptTarget.ES2017:
      return 'lib.es2017.full.d.ts';
    case qt.ScriptTarget.ES2016:
      return 'lib.es2016.full.d.ts';
    case qt.ScriptTarget.ES2015:
      return 'lib.es6.d.ts'; // We don't use lib.es2015.full.d.ts due to breaking change.
    default:
      return 'lib.d.ts';
  }
}

export function textSpanEnd(span: qt.TextSpan) {
  return span.start + span.length;
}

export function textSpanIsEmpty(span: qt.TextSpan) {
  return span.length === 0;
}

export function textSpanContainsPosition(span: qt.TextSpan, position: number) {
  return position >= span.start && position < textSpanEnd(span);
}

export function textRangeContainsPositionInclusive(span: qt.TextRange, position: number): boolean {
  return position >= span.pos && position <= span.end;
}

// Returns true if 'span' contains 'other'.
export function textSpanContainsTextSpan(span: qt.TextSpan, other: qt.TextSpan) {
  return other.start >= span.start && textSpanEnd(other) <= textSpanEnd(span);
}

export function textSpanOverlapsWith(span: qt.TextSpan, other: qt.TextSpan) {
  return textSpanOverlap(span, other) !== undefined;
}

export function textSpanOverlap(span1: qt.TextSpan, span2: qt.TextSpan): qt.TextSpan | undefined {
  const overlap = textSpanIntersection(span1, span2);
  return overlap && overlap.length === 0 ? undefined : overlap;
}

export function textSpanIntersectsWithTextSpan(span: qt.TextSpan, other: qt.TextSpan) {
  return decodedTextSpanIntersectsWith(span.start, span.length, other.start, other.length);
}

export function textSpanIntersectsWith(span: qt.TextSpan, start: number, length: number) {
  return decodedTextSpanIntersectsWith(span.start, span.length, start, length);
}

export function decodedTextSpanIntersectsWith(start1: number, length1: number, start2: number, length2: number) {
  const end1 = start1 + length1;
  const end2 = start2 + length2;
  return start2 <= end1 && end2 >= start1;
}

export function textSpanIntersectsWithPosition(span: qt.TextSpan, position: number) {
  return position <= textSpanEnd(span) && position >= span.start;
}

export function textSpanIntersection(span1: qt.TextSpan, span2: qt.TextSpan): qt.TextSpan | undefined {
  const start = Math.max(span1.start, span2.start);
  const end = Math.min(textSpanEnd(span1), textSpanEnd(span2));
  return start <= end ? createTextSpanFromBounds(start, end) : undefined;
}

export function createTextSpan(start: number, length: number): qt.TextSpan {
  if (start < 0) {
    throw new Error('start < 0');
  }
  if (length < 0) {
    throw new Error('length < 0');
  }

  return { start, length };
}

export function createTextSpanFromBounds(start: number, end: number) {
  return createTextSpan(start, end - start);
}

export function textChangeRangeNewSpan(range: qt.TextChangeRange) {
  return createTextSpan(range.span.start, range.newLength);
}

export function textChangeRangeIsUnchanged(range: qt.TextChangeRange) {
  return textSpanIsEmpty(range.span) && range.newLength === 0;
}

export function createTextChangeRange(span: qt.TextSpan, newLength: number): qt.TextChangeRange {
  if (newLength < 0) {
    throw new Error('newLength < 0');
  }

  return { span, newLength };
}

export let unchangedTextChangeRange = createTextChangeRange(createTextSpan(0, 0), 0); // eslint-disable-line prefer-const

/**
 * Called to merge all the changes that occurred across several versions of a script snapshot
 * into a single change.  i.e. if a user keeps making successive edits to a script we will
 * have a text change from V1 to V2, V2 to V3, ..., Vn.
 *
 * This function will then merge those changes into a single change range valid between V1 and
 * Vn.
 */
export function collapseTextChangeRangesAcrossMultipleVersions(changes: readonly qt.TextChangeRange[]): qt.TextChangeRange {
  if (changes.length === 0) {
    return unchangedTextChangeRange;
  }

  if (changes.length === 1) {
    return changes[0];
  }

  // We change from talking about { { oldStart, oldLength }, newLength } to { oldStart, oldEnd, newEnd }
  // as it makes things much easier to reason about.
  const change0 = changes[0];

  let oldStartN = change0.span.start;
  let oldEndN = textSpanEnd(change0.span);
  let newEndN = oldStartN + change0.newLength;

  for (let i = 1; i < changes.length; i++) {
    const nextChange = changes[i];

    // Consider the following case:
    // i.e. two edits.  The first represents the text change range { { 10, 50 }, 30 }.  i.e. The span starting
    // at 10, with length 50 is reduced to length 30.  The second represents the text change range { { 30, 30 }, 40 }.
    // i.e. the span starting at 30 with length 30 is increased to length 40.
    //
    //      0         10        20        30        40        50        60        70        80        90        100
    //      -------------------------------------------------------------------------------------------------------
    //                |                                                 /
    //                |                                            /----
    //  T1            |                                       /----
    //                |                                  /----
    //                |                             /----
    //      -------------------------------------------------------------------------------------------------------
    //                                     |                            \
    //                                     |                               \
    //   T2                                |                                 \
    //                                     |                                   \
    //                                     |                                      \
    //      -------------------------------------------------------------------------------------------------------
    //
    // Merging these turns out to not be too difficult.  First, determining the new start of the change is trivial
    // it's just the min of the old and new starts.  i.e.:
    //
    //      0         10        20        30        40        50        60        70        80        90        100
    //      ------------------------------------------------------------*------------------------------------------
    //                |                                                 /
    //                |                                            /----
    //  T1            |                                       /----
    //                |                                  /----
    //                |                             /----
    //      ----------------------------------------$-------------------$------------------------------------------
    //                .                    |                            \
    //                .                    |                               \
    //   T2           .                    |                                 \
    //                .                    |                                   \
    //                .                    |                                      \
    //      ----------------------------------------------------------------------*--------------------------------
    //
    // (Note the dots represent the newly inferred start.
    // Determining the new and old end is also pretty simple.  Basically it boils down to paying attention to the
    // absolute positions at the asterisks, and the relative change between the dollar signs. Basically, we see
    // which if the two $'s precedes the other, and we move that one forward until they line up.  in this case that
    // means:
    //
    //      0         10        20        30        40        50        60        70        80        90        100
    //      --------------------------------------------------------------------------------*----------------------
    //                |                                                                     /
    //                |                                                                /----
    //  T1            |                                                           /----
    //                |                                                      /----
    //                |                                                 /----
    //      ------------------------------------------------------------$------------------------------------------
    //                .                    |                            \
    //                .                    |                               \
    //   T2           .                    |                                 \
    //                .                    |                                   \
    //                .                    |                                      \
    //      ----------------------------------------------------------------------*--------------------------------
    //
    // In other words (in this case), we're recognizing that the second edit happened after where the first edit
    // ended with a delta of 20 characters (60 - 40).  Thus, if we go back in time to where the first edit started
    // that's the same as if we started at char 80 instead of 60.
    //
    // As it so happens, the same logic applies if the second edit precedes the first edit.  In that case rather
    // than pushing the first edit forward to match the second, we'll push the second edit forward to match the
    // first.
    //
    // In this case that means we have { oldStart: 10, oldEnd: 80, newEnd: 70 } or, in qt.TextChangeRange
    // semantics: { { start: 10, length: 70 }, newLength: 60 }
    //
    // The math then works out as follows.
    // If we have { oldStart1, oldEnd1, newEnd1 } and { oldStart2, oldEnd2, newEnd2 } then we can compute the
    // final result like so:
    //
    // {
    //      oldStart3: Min(oldStart1, oldStart2),
    //      oldEnd3: Max(oldEnd1, oldEnd1 + (oldEnd2 - newEnd1)),
    //      newEnd3: Max(newEnd2, newEnd2 + (newEnd1 - oldEnd2))
    // }

    const oldStart1 = oldStartN;
    const oldEnd1 = oldEndN;
    const newEnd1 = newEndN;

    const oldStart2 = nextChange.span.start;
    const oldEnd2 = textSpanEnd(nextChange.span);
    const newEnd2 = oldStart2 + nextChange.newLength;

    oldStartN = Math.min(oldStart1, oldStart2);
    oldEndN = Math.max(oldEnd1, oldEnd1 + (oldEnd2 - newEnd1));
    newEndN = Math.max(newEnd2, newEnd2 + (newEnd1 - oldEnd2));
  }

  return createTextChangeRange(createTextSpanFromBounds(oldStartN, oldEndN), /*newLength*/ newEndN - oldStartN);
}

export function getTypeParameterOwner(d: qt.Declaration): qt.Declaration | undefined {
  if (d && d.kind === qt.SyntaxKind.TypeParameter) {
    for (let current: qt.Node = d; current; current = current.parent) {
      if (isFunctionLike(current) || isClassLike(current) || current.kind === qt.SyntaxKind.InterfaceDeclaration) {
        return <qt.Declaration>current;
      }
    }
  }
  return;
}

export type ParameterPropertyDeclaration = qt.ParameterDeclaration & { parent: qt.ConstructorDeclaration; name: qt.Identifier };
export function isParameterPropertyDeclaration(n: qt.Node, parent: qt.Node): n is ParameterPropertyDeclaration {
  return qu.hasSyntacticModifier(n, qt.ModifierFlags.ParameterPropertyModifier) && parent.kind === qt.SyntaxKind.Constructor;
}

export function isEmptyBindingPattern(n: qt.BindingName): n is qt.BindingPattern {
  if (isBindingPattern(n)) {
    return qc.every(n.elements, isEmptyBindingElement);
  }
  return false;
}

export function isEmptyBindingElement(n: qt.BindingElement): boolean {
  if (isOmittedExpression(n)) {
    return true;
  }
  return isEmptyBindingPattern(n.name);
}

export function walkUpBindingElementsAndPatterns(binding: qt.BindingElement): qt.VariableDeclaration | qt.ParameterDeclaration {
  let n = binding.parent;
  while (isBindingElement(n.parent)) {
    n = n.parent.parent;
  }
  return n.parent;
}

function getCombinedFlags(n: qt.Node, getFlags: (n: qt.Node) => number): number {
  if (isBindingElement(n)) {
    n = walkUpBindingElementsAndPatterns(n);
  }
  let flags = getFlags(n);
  if (n.kind === qt.SyntaxKind.VariableDeclaration) {
    n = n.parent;
  }
  if (n && n.kind === qt.SyntaxKind.VariableDeclarationList) {
    flags |= getFlags(n);
    n = n.parent;
  }
  if (n && n.kind === qt.SyntaxKind.VariableStatement) {
    flags |= getFlags(n);
  }
  return flags;
}

export function getCombinedModifierFlags(n: qt.Declaration): qt.ModifierFlags {
  return getCombinedFlags(n, qu.getEffectiveModifierFlags);
}

// Returns the node flags for this node and all relevant parent nodes.  This is done so that
// nodes like variable declarations and binding elements can returned a view of their flags
// that includes the modifiers from their container.  i.e. flags like export/declare aren't
// stored on the variable declaration directly, but on the containing variable statement
// (if it has one).  Similarly, flags for let/const are store on the variable declaration
// list.  By calling this function, all those flags are combined so that the client can treat
// the node as if it actually had those flags.
export function getCombinedNodeFlags(n: qt.Node): qt.NodeFlags {
  return getCombinedFlags(n, (n) => n.flags);
}

/**
 * Checks to see if the locale is in the appropriate format,
 * and if it is, attempts to set the appropriate language.
 */
export function validateLocaleAndSetLanguage(locale: string, sys: { getExecutingFilePath(): string; resolvePath(path: string): string; fileExists(fileName: string): boolean; readFile(fileName: string): string | undefined }, errors?: qpc.Push<qt.Diagnostic>) {
  const matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());

  if (!matchResult) {
    if (errors) {
      errors.push(qu.createCompilerDiagnostic(Diagnostics.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp'));
    }
    return;
  }

  const language = matchResult[1];
  const territory = matchResult[3];

  // First try the entire locale, then fall back to just language if that's all we have.
  // Either ways do not fail, and fallback to the English diagnostic strings.
  if (!trySetLanguageAndTerritory(language, territory, errors)) {
    trySetLanguageAndTerritory(language, /*territory*/ undefined, errors);
  }

  // Set the UI locale for string collation
  setUILocale(locale);

  function trySetLanguageAndTerritory(language: string, territory: string | undefined, errors?: qpc.Push<Diagnostic>): boolean {
    const compilerFilePath = normalizePath(sys.getExecutingFilePath());
    const containingDirectoryPath = qp.getDirectoryPath(compilerFilePath);

    let filePath = qp.combinePaths(containingDirectoryPath, language);

    if (territory) {
      filePath = filePath + '-' + territory;
    }

    filePath = sys.resolvePath(qp.combinePaths(filePath, 'diagnosticMessages.generated.json'));

    if (!sys.fileExists(filePath)) {
      return false;
    }

    // TODO: Add codePage support for readFile?
    let fileContents: string | undefined = '';
    try {
      fileContents = sys.readFile(filePath);
    } catch (e) {
      if (errors) {
        errors.push(qu.createCompilerDiagnostic(Diagnostics.Unable_to_open_file_0, filePath));
      }
      return false;
    }
    try {
      // this is a global mutation (or live binding update)!
      setLocalizedDiagnosticMessages(JSON.parse(fileContents!));
    } catch {
      if (errors) {
        errors.push(qu.createCompilerDiagnostic(Diagnostics.Corrupted_locale_file_0, filePath));
      }
      return false;
    }

    return true;
  }
}

export function getOriginalNode(n: qt.Node): qt.Node;
export function getOriginalNode<T extends qt.Node>(n: qt.Node, nodeTest: (n: qt.Node) => n is T): T;
export function getOriginalNode(n: qt.Node | undefined): qt.Node | undefined;
export function getOriginalNode<T extends qt.Node>(n: qt.Node | undefined, nodeTest: (n: qt.Node | undefined) => n is T): T | undefined;
export function getOriginalNode(n: qt.Node | undefined, nodeTest?: (n: qt.Node | undefined) => boolean): qt.Node | undefined {
  if (n) {
    while (n.original !== undefined) {
      n = n.original;
    }
  }

  return !nodeTest || nodeTest(n) ? n : undefined;
}

export function isParseTreeNode(n: qt.Node): boolean {
  return (n.flags & qt.NodeFlags.Synthesized) === 0;
}

export function getParseTreeNode(n: qt.Node): qt.Node;

export function getParseTreeNode<T extends qt.Node>(n: qt.Node | undefined, nodeTest?: (n: qt.Node) => n is T): T | undefined;
export function getParseTreeNode(n: qt.Node | undefined, nodeTest?: (_: qt.Node) => boolean): qt.Node | undefined {
  if (n === undefined || isParseTreeNode(n)) {
    return n;
  }
  n = getOriginalNode(n);
  if (isParseTreeNode(n) && (!nodeTest || nodeTest(n))) {
    return n;
  }
  return undefined;
}

/** Add an extra underscore to identifiers that start with two underscores to avoid issues with magic names like '__proto__' */
export function escapeLeadingUnderscores(identifier: string): qt.__String {
  return (identifier.length >= 2 && identifier.charCodeAt(0) === qt.CharacterCodes._ && identifier.charCodeAt(1) === qt.CharacterCodes._ ? '_' + identifier : identifier) as qt.__String;
}

/**
 * Remove extra underscore from escaped identifier text content.
 *
 * @param identifier The escaped identifier text.
 * @returns The unescaped identifier text.
 */
export function unescapeLeadingUnderscores(identifier: qt.__String): string {
  const id = identifier as string;
  return id.length >= 3 && id.charCodeAt(0) === qt.CharacterCodes._ && id.charCodeAt(1) === qt.CharacterCodes._ && id.charCodeAt(2) === qt.CharacterCodes._ ? id.substr(1) : id;
}

export function idText(identifierOrPrivateName: qt.Identifier | qt.PrivateIdentifier): string {
  return unescapeLeadingUnderscores(identifierOrPrivateName.escapedText);
}
export function symbolName(symbol: symbol): string {
  if (symbol.valueDeclaration && isPrivateIdentifierPropertyDeclaration(symbol.valueDeclaration)) {
    return idText(symbol.valueDeclaration.name);
  }
  return unescapeLeadingUnderscores(symbol.escapedName);
}

/**
 * A JSDocTypedef tag has an _optional_ name field - if a name is not directly present, we should
 * attempt to draw the name from the node the declaration is on (as that declaration is what its' symbol
 * will be merged with)
 */
function nameForNamelessJSDocTypedef(declaration: qt.JSDocTypedefTag | qt.JSDocEnumTag): qt.Identifier | qt.PrivateIdentifier | undefined {
  const hostNode = declaration.parent.parent;
  if (!hostNode) {
    return;
  }
  // Covers classes, functions - any named declaration host node
  if (isDeclaration(hostNode)) {
    return getDeclarationIdentifier(hostNode);
  }
  // Covers remaining cases (returning undefined if none match).
  switch (hostNode.kind) {
    case qt.SyntaxKind.VariableStatement:
      if (hostNode.declarationList && hostNode.declarationList.declarations[0]) {
        return getDeclarationIdentifier(hostNode.declarationList.declarations[0]);
      }
      break;
    case qt.SyntaxKind.ExpressionStatement:
      let expr = hostNode.expression;
      if (expr.kind === qt.SyntaxKind.BinaryExpression && expr.operatorToken.kind === qt.SyntaxKind.EqualsToken) {
        expr = expr.left;
      }
      switch (expr.kind) {
        case qt.SyntaxKind.PropertyAccessExpression:
          return expr.name;
        case qt.SyntaxKind.ElementAccessExpression:
          const arg = expr.argumentExpression;
          if (isIdentifier(arg)) {
            return arg;
          }
      }
      break;
    case qt.SyntaxKind.ParenthesizedExpression: {
      return getDeclarationIdentifier(hostNode.expression);
    }
    case qt.SyntaxKind.LabeledStatement: {
      if (isDeclaration(hostNode.statement) || isExpression(hostNode.statement)) {
        return getDeclarationIdentifier(hostNode.statement);
      }
      break;
    }
  }
  return;
}

function getDeclarationIdentifier(n: qt.Declaration | qt.Expression): qt.Identifier | undefined {
  const name = getNameOfDeclaration(n);
  return name && isIdentifier(name) ? name : undefined;
}

export function nodeHasName(statement: qt.Node, name: qt.Identifier) {
  if (isNamedDeclaration(statement) && isIdentifier(statement.name) && idText(statement.name) === idText(name)) {
    return true;
  }
  if (isVariableStatement(statement) && qc.some(statement.declarationList.declarations, (d) => nodeHasName(d, name))) {
    return true;
  }
  return false;
}

export function getNameOfJSDocTypedef(declaration: qt.JSDocTypedefTag): qt.Identifier | qt.PrivateIdentifier | undefined {
  return declaration.name || nameForNamelessJSDocTypedef(declaration);
}

export function isNamedDeclaration(n: qt.Node): n is qt.NamedDeclaration & { name: qt.DeclarationName } {
  return !!n.name; // A 'name' property should always be a qt.DeclarationName.
}

export function getNonAssignedNameOfDeclaration(declaration: qt.Declaration | qt.Expression): qt.DeclarationName | undefined {
  switch (declaration.kind) {
    case qt.SyntaxKind.Identifier:
      return declaration as qt.Identifier;
    case qt.SyntaxKind.JSDocPropertyTag:
    case qt.SyntaxKind.JSDocParameterTag: {
      const { name } = declaration as qt.JSDocPropertyLikeTag;
      if (name.kind === qt.SyntaxKind.QualifiedName) {
        return name.right;
      }
      break;
    }
    case qt.SyntaxKind.CallExpression:
    case qt.SyntaxKind.BinaryExpression: {
      const expr = declaration;
      switch (getAssignmentDeclarationKind(expr)) {
        case qt.AssignmentDeclarationKind.ExportsProperty:
        case qt.AssignmentDeclarationKind.ThisProperty:
        case qt.AssignmentDeclarationKind.Property:
        case qt.AssignmentDeclarationKind.PrototypeProperty:
          return getElementOrPropertyAccessArgumentExpressionOrName((expr as qt.BinaryExpression).left);
        case qt.AssignmentDeclarationKind.ObjectDefinePropertyValue:
        case qt.AssignmentDeclarationKind.ObjectDefinePropertyExports:
        case qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
          return (expr as qt.BindableObjectDefinePropertyCall).arguments[1];
        default:
          return undefined;
      }
    }
    case qt.SyntaxKind.JSDocTypedefTag:
      return getNameOfJSDocTypedef(declaration as qt.JSDocTypedefTag);
    case qt.SyntaxKind.JSDocEnumTag:
      return nameForNamelessJSDocTypedef(declaration as qt.JSDocEnumTag);
    case qt.SyntaxKind.ExportAssignment: {
      const { expression } = declaration as qt.ExportAssignment;
      return isIdentifier(expression) ? expression : undefined;
    }
    case qt.SyntaxKind.ElementAccessExpression:
      const expr = declaration as qt.ElementAccessExpression;
      if (isBindableStaticElementAccessExpression(expr)) {
        return expr.argumentExpression;
      }
  }
  return (declaration as qt.NamedDeclaration).name;
}

export function getNameOfDeclaration(declaration: qt.Declaration | qt.Expression): qt.DeclarationName | undefined {
  if (declaration === undefined) return undefined;
  return getNonAssignedNameOfDeclaration(declaration) || (isFunctionExpression(declaration) || isClassExpression(declaration) ? getAssignedName(declaration) : undefined);
}

function getAssignedName(n: qt.Node): qt.DeclarationName | undefined {
  if (!n.parent) {
    return;
  } else if (isPropertyAssignment(n.parent) || isBindingElement(n.parent)) {
    return n.parent.name;
  } else if (isBinaryExpression(n.parent) && n === n.parent.right) {
    if (isIdentifier(n.parent.left)) {
      return n.parent.left;
    } else if (qu.isAccessExpression(n.parent.left)) {
      return getElementOrPropertyAccessArgumentExpressionOrName(n.parent.left);
    }
  } else if (isVariableDeclaration(n.parent) && isIdentifier(n.parent.name)) {
    return n.parent.name;
  }
  return;
}

function getJSDocParameterTagsWorker(param: qt.ParameterDeclaration, noCache?: boolean): readonly qt.JSDocParameterTag[] {
  if (param.name) {
    if (isIdentifier(param.name)) {
      const name = param.name.escapedText;
      return getJSDocTagsWorker(param.parent, noCache).filter((tag): tag is qt.JSDocParameterTag => isJSDocParameterTag(tag) && isIdentifier(tag.name) && tag.name.escapedText === name);
    } else {
      const i = param.parent.parameters.indexOf(param);
      Debug.assert(i > -1, "Parameters should always be in their parents' parameter list");
      const paramTags = getJSDocTagsWorker(param.parent, noCache).filter(isJSDocParameterTag);
      if (i < paramTags.length) {
        return [paramTags[i]];
      }
    }
  }
  // return empty array for: out-of-order binding patterns and JSDoc function syntax, which has un-named parameters
  return emptyArray;
}

/**
 * Gets the JSDoc parameter tags for the node if present.
 *
 * @remarks Returns any JSDoc param tag whose name matches the provided
 * parameter, whether a param tag on a containing function
 * expression, or a param tag on a variable declaration whose
 * initializer is the containing function. The tags closest to the
 * node are returned first, so in the previous example, the param
 * tag on the containing function expression would be first.
 *
 * For binding patterns, parameter tags are matched by position.
 */
export function getJSDocParameterTags(param: qt.ParameterDeclaration): readonly qt.JSDocParameterTag[] {
  return getJSDocParameterTagsWorker(param, /*noCache*/ false);
}

export function getJSDocParameterTagsNoCache(param: qt.ParameterDeclaration): readonly qt.JSDocParameterTag[] {
  return getJSDocParameterTagsWorker(param, /*noCache*/ true);
}

function getJSDocTypeParameterTagsWorker(param: qt.TypeParameterDeclaration, noCache?: boolean): readonly qt.JSDocTemplateTag[] {
  const name = param.name.escapedText;
  return getJSDocTagsWorker(param.parent, noCache).filter((tag): tag is qt.JSDocTemplateTag => isJSDocTemplateTag(tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name));
}

/**
 * Gets the JSDoc type parameter tags for the node if present.
 *
 * @remarks Returns any JSDoc template tag whose names match the provided
 * parameter, whether a template tag on a containing function
 * expression, or a template tag on a variable declaration whose
 * initializer is the containing function. The tags closest to the
 * node are returned first, so in the previous example, the template
 * tag on the containing function expression would be first.
 */
export function getJSDocTypeParameterTags(param: qt.TypeParameterDeclaration): readonly qt.JSDocTemplateTag[] {
  return getJSDocTypeParameterTagsWorker(param, /*noCache*/ false);
}

export function getJSDocTypeParameterTagsNoCache(param: qt.TypeParameterDeclaration): readonly qt.JSDocTemplateTag[] {
  return getJSDocTypeParameterTagsWorker(param, /*noCache*/ true);
}

/**
 * Return true if the node has JSDoc parameter tags.
 *
 * @remarks Includes parameter tags that are not directly on the node,
 * for example on a variable declaration whose initializer is a function expression.
 */
export function hasJSDocParameterTags(n: qt.FunctionLikeDeclaration | qt.SignatureDeclaration): boolean {
  return !!getFirstJSDocTag(n, isJSDocParameterTag);
}

/** Gets the JSDoc augments tag for the node if present */
export function getJSDocAugmentsTag(n: qt.Node): qt.JSDocAugmentsTag | undefined {
  return getFirstJSDocTag(n, isJSDocAugmentsTag);
}

/** Gets the JSDoc implements tags for the node if present */
export function getJSDocImplementsTags(n: qt.Node): readonly qt.JSDocImplementsTag[] {
  return getAllJSDocTags(n, isJSDocImplementsTag);
}

/** Gets the JSDoc class tag for the node if present */
export function getJSDocClassTag(n: qt.Node): qt.JSDocClassTag | undefined {
  return getFirstJSDocTag(n, isJSDocClassTag);
}

/** Gets the JSDoc public tag for the node if present */
export function getJSDocPublicTag(n: qt.Node): qt.JSDocPublicTag | undefined {
  return getFirstJSDocTag(n, isJSDocPublicTag);
}

export function getJSDocPublicTagNoCache(n: qt.Node): qt.JSDocPublicTag | undefined {
  return getFirstJSDocTag(n, isJSDocPublicTag, /*noCache*/ true);
}

/** Gets the JSDoc private tag for the node if present */
export function getJSDocPrivateTag(n: qt.Node): qt.JSDocPrivateTag | undefined {
  return getFirstJSDocTag(n, isJSDocPrivateTag);
}

export function getJSDocPrivateTagNoCache(n: qt.Node): qt.JSDocPrivateTag | undefined {
  return getFirstJSDocTag(n, isJSDocPrivateTag, /*noCache*/ true);
}

/** Gets the JSDoc protected tag for the node if present */
export function getJSDocProtectedTag(n: qt.Node): qt.JSDocProtectedTag | undefined {
  return getFirstJSDocTag(n, isJSDocProtectedTag);
}

export function getJSDocProtectedTagNoCache(n: qt.Node): qt.JSDocProtectedTag | undefined {
  return getFirstJSDocTag(n, isJSDocProtectedTag, /*noCache*/ true);
}

/** Gets the JSDoc protected tag for the node if present */
export function getJSDocReadonlyTag(n: qt.Node): qt.JSDocReadonlyTag | undefined {
  return getFirstJSDocTag(n, isJSDocReadonlyTag);
}

export function getJSDocReadonlyTagNoCache(n: qt.Node): qt.JSDocReadonlyTag | undefined {
  return getFirstJSDocTag(n, isJSDocReadonlyTag, /*noCache*/ true);
}

/** Gets the JSDoc enum tag for the node if present */
export function getJSDocEnumTag(n: qt.Node): qt.JSDocEnumTag | undefined {
  return getFirstJSDocTag(n, isJSDocEnumTag);
}

/** Gets the JSDoc this tag for the node if present */
export function getJSDocThisTag(n: qt.Node): qt.JSDocThisTag | undefined {
  return getFirstJSDocTag(n, isJSDocThisTag);
}

/** Gets the JSDoc return tag for the node if present */
export function getJSDocReturnTag(n: qt.Node): qt.JSDocReturnTag | undefined {
  return getFirstJSDocTag(n, isJSDocReturnTag);
}

/** Gets the JSDoc template tag for the node if present */
export function getJSDocTemplateTag(n: qt.Node): qt.JSDocTemplateTag | undefined {
  return getFirstJSDocTag(n, isJSDocTemplateTag);
}

/** Gets the JSDoc type tag for the node if present and valid */
export function getJSDocTypeTag(n: qt.Node): qt.JSDocTypeTag | undefined {
  // We should have already issued an error if there were multiple type jsdocs, so just use the first one.
  const tag = getFirstJSDocTag(n, isJSDocTypeTag);
  if (tag && tag.typeExpression && tag.typeExpression.type) {
    return tag;
  }
  return undefined;
}

/**
 * Gets the type node for the node if provided via JSDoc.
 *
 * @remarks The search includes any JSDoc param tag that relates
 * to the provided parameter, for example a type tag on the
 * parameter itself, or a param tag on a containing function
 * expression, or a param tag on a variable declaration whose
 * initializer is the containing function. The tags closest to the
 * node are examined first, so in the previous example, the type
 * tag directly on the node would be returned.
 */
export function getJSDocType(n: qt.Node): qt.TypeNode | undefined {
  let tag: qt.JSDocTypeTag | qt.JSDocParameterTag | undefined = getFirstJSDocTag(n, isJSDocTypeTag);
  if (!tag && isParameter(n)) {
    tag = qc.find(getJSDocParameterTags(n), (tag) => !!tag.typeExpression);
  }

  return tag && tag.typeExpression && tag.typeExpression.type;
}

/**
 * Gets the return type node for the node if provided via JSDoc return tag or type tag.
 *
 * @remarks `getJSDocReturnTag` just gets the whole JSDoc tag. This function
 * gets the type from inside the braces, after the fat arrow, etc.
 */
export function getJSDocReturnType(n: qt.Node): qt.TypeNode | undefined {
  const returnTag = getJSDocReturnTag(n);
  if (returnTag && returnTag.typeExpression) {
    return returnTag.typeExpression.type;
  }
  const typeTag = getJSDocTypeTag(n);
  if (typeTag && typeTag.typeExpression) {
    const type = typeTag.typeExpression.type;
    if (isTypeLiteralNode(type)) {
      const sig = qc.find(type.members, isCallSignatureDeclaration);
      return sig && sig.type;
    }
    if (isFunctionTypeNode(type) || isJSDocFunctionType(type)) {
      return type.type;
    }
  }
  return;
}

function getJSDocTagsWorker(n: qt.Node, noCache?: boolean): readonly qt.JSDocTag[] {
  let tags = n.jsDocCache;
  // If cache is 'null', that means we did the work of searching for JSDoc tags and came up with nothing.
  if (tags === undefined || noCache) {
    const comments = qu.getJSDocCommentsAndTags(n, noCache);
    Debug.assert(comments.length < 2 || comments[0] !== comments[1]);
    tags = qc.flatMap(comments, (j) => (isJSDoc(j) ? j.tags : j));
    if (!noCache) {
      n.jsDocCache = tags;
    }
  }
  return tags;
}

/** Get all JSDoc tags related to a node, including those on parent nodes. */
export function getJSDocTags(n: qt.Node): readonly qt.JSDocTag[] {
  return getJSDocTagsWorker(n, /*noCache*/ false);
}

export function getJSDocTagsNoCache(n: qt.Node): readonly qt.JSDocTag[] {
  return getJSDocTagsWorker(n, /*noCache*/ true);
}

/** Get the first JSDoc tag of a specified kind, or undefined if not present. */
function getFirstJSDocTag<T extends qt.JSDocTag>(n: qt.Node, predicate: (tag: qt.JSDocTag) => tag is T, noCache?: boolean): T | undefined {
  return qc.find(getJSDocTagsWorker(n, noCache), predicate);
}

/** Gets all JSDoc tags that match a specified predicate */
export function getAllJSDocTags<T extends qt.JSDocTag>(n: qt.Node, predicate: (tag: qt.JSDocTag) => tag is T): readonly T[] {
  return getJSDocTags(n).filter(predicate);
}

/** Gets all JSDoc tags of a specified kind */
export function getAllJSDocTagsOfKind(n: qt.Node, kind: qt.SyntaxKind): readonly qt.JSDocTag[] {
  return getJSDocTags(n).filter((doc) => doc.kind === kind);
}

/**
 * Gets the effective type parameters. If the node was parsed in a
 * JavaScript file, gets the type parameters from the `@template` tag from JSDoc.
 */
export function getEffectiveTypeParameterDeclarations(n: qt.DeclarationWithTypeParameters): readonly qt.TypeParameterDeclaration[] {
  if (isJSDocSignature(n)) {
    return emptyArray;
  }
  if (isJSDocTypeAlias(n)) {
    Debug.assert(n.parent.kind === qt.SyntaxKind.JSDocComment);
    return flatMap(n.parent.tags, (tag) => (isJSDocTemplateTag(tag) ? tag.typeParameters : undefined));
  }
  if (n.typeParameters) {
    return n.typeParameters;
  }
  if (isInJSFile(n)) {
    const decls = qu.getJSDocTypeParameterDeclarations(n);
    if (decls.length) {
      return decls;
    }
    const typeTag = getJSDocType(n);
    if (typeTag && isFunctionTypeNode(typeTag) && typeTag.typeParameters) {
      return typeTag.typeParameters;
    }
  }
  return emptyArray;
}

export function getEffectiveConstraintOfTypeParameter(n: qt.TypeParameterDeclaration): qt.TypeNode | undefined {
  return n.constraint ? n.constraint : isJSDocTemplateTag(n.parent) && node === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
}

// #region
// Simple node tests of the form `n.kind === qt.SyntaxKind.Foo`.
// Literals
export function isNumericLiteral(n: qt.Node): n is qt.NumericLiteral {
  return n.kind === qt.SyntaxKind.NumericLiteral;
}

export function isBigIntLiteral(n: qt.Node): n is qt.BigIntLiteral {
  return n.kind === qt.SyntaxKind.BigIntLiteral;
}

export function isStringLiteral(n: qt.Node): n is qt.StringLiteral {
  return n.kind === qt.SyntaxKind.StringLiteral;
}

export function isJsxText(n: qt.Node): n is qt.JsxText {
  return n.kind === qt.SyntaxKind.JsxText;
}

export function isRegularExpressionLiteral(n: qt.Node): n is qt.RegularExpressionLiteral {
  return n.kind === qt.SyntaxKind.RegularExpressionLiteral;
}

export function isNoSubstitutionTemplateLiteral(n: qt.Node): n is qt.NoSubstitutionTemplateLiteral {
  return n.kind === qt.SyntaxKind.NoSubstitutionTemplateLiteral;
}

// Pseudo-literals

export function isTemplateHead(n: qt.Node): n is qt.TemplateHead {
  return n.kind === qt.SyntaxKind.TemplateHead;
}

export function isTemplateMiddle(n: qt.Node): n is qt.TemplateMiddle {
  return n.kind === qt.SyntaxKind.TemplateMiddle;
}

export function isTemplateTail(n: qt.Node): n is qt.TemplateTail {
  return n.kind === qt.SyntaxKind.TemplateTail;
}

export function isIdentifier(n: qt.Node): n is qt.Identifier {
  return n.kind === qt.SyntaxKind.Identifier;
}

// Names

export function isQualifiedName(n: qt.Node): n is qt.QualifiedName {
  return n.kind === qt.SyntaxKind.QualifiedName;
}

export function isComputedPropertyName(n: qt.Node): n is qt.ComputedPropertyName {
  return n.kind === qt.SyntaxKind.ComputedPropertyName;
}

export function isPrivateIdentifier(n: qt.Node): n is qt.PrivateIdentifier {
  return n.kind === qt.SyntaxKind.PrivateIdentifier;
}

export function isIdentifierOrPrivateIdentifier(n: qt.Node): n is qt.Identifier | qt.PrivateIdentifier {
  return n.kind === qt.SyntaxKind.Identifier || n.kind === qt.SyntaxKind.PrivateIdentifier;
}

// Signature elements

export function isTypeParameterDeclaration(n: qt.Node): n is qt.TypeParameterDeclaration {
  return n.kind === qt.SyntaxKind.TypeParameter;
}

export function isParameter(n: qt.Node): n is qt.ParameterDeclaration {
  return n.kind === qt.SyntaxKind.Parameter;
}

export function isDecorator(n: qt.Node): n is qt.Decorator {
  return n.kind === qt.SyntaxKind.Decorator;
}

// TypeMember

export function isPropertySignature(n: qt.Node): n is qt.PropertySignature {
  return n.kind === qt.SyntaxKind.PropertySignature;
}

export function isPropertyDeclaration(n: qt.Node): n is qt.PropertyDeclaration {
  return n.kind === qt.SyntaxKind.PropertyDeclaration;
}

export function isMethodSignature(n: qt.Node): n is qt.MethodSignature {
  return n.kind === qt.SyntaxKind.MethodSignature;
}

export function isMethodDeclaration(n: qt.Node): n is qt.MethodDeclaration {
  return n.kind === qt.SyntaxKind.MethodDeclaration;
}

export function isConstructorDeclaration(n: qt.Node): n is qt.ConstructorDeclaration {
  return n.kind === qt.SyntaxKind.Constructor;
}

export function isGetAccessorDeclaration(n: qt.Node): n is qt.GetAccessorDeclaration {
  return n.kind === qt.SyntaxKind.GetAccessor;
}

export function isSetAccessorDeclaration(n: qt.Node): n is qt.SetAccessorDeclaration {
  return n.kind === qt.SyntaxKind.SetAccessor;
}

export function isCallSignatureDeclaration(n: qt.Node): n is qt.CallSignatureDeclaration {
  return n.kind === qt.SyntaxKind.CallSignature;
}

export function isConstructSignatureDeclaration(n: qt.Node): n is qt.ConstructSignatureDeclaration {
  return n.kind === qt.SyntaxKind.ConstructSignature;
}

export function isIndexSignatureDeclaration(n: qt.Node): n is qt.IndexSignatureDeclaration {
  return n.kind === qt.SyntaxKind.IndexSignature;
}

export function isGetOrSetAccessorDeclaration(n: qt.Node): n is qt.AccessorDeclaration {
  return n.kind === qt.SyntaxKind.SetAccessor || n.kind === qt.SyntaxKind.GetAccessor;
}

// Type

export function isTypePredicateNode(n: qt.Node): n is qt.TypePredicateNode {
  return n.kind === qt.SyntaxKind.TypePredicate;
}

export function isTypeReferenceNode(n: qt.Node): n is qt.TypeReferenceNode {
  return n.kind === qt.SyntaxKind.TypeReference;
}

export function isFunctionTypeNode(n: qt.Node): n is qt.FunctionTypeNode {
  return n.kind === qt.SyntaxKind.FunctionType;
}

export function isConstructorTypeNode(n: qt.Node): n is qt.ConstructorTypeNode {
  return n.kind === qt.SyntaxKind.ConstructorType;
}

export function isTypeQueryNode(n: qt.Node): n is qt.TypeQueryNode {
  return n.kind === qt.SyntaxKind.TypeQuery;
}

export function isTypeLiteralNode(n: qt.Node): n is qt.TypeLiteralNode {
  return n.kind === qt.SyntaxKind.TypeLiteral;
}

export function isArrayTypeNode(n: qt.Node): n is qt.ArrayTypeNode {
  return n.kind === qt.SyntaxKind.ArrayType;
}

export function isTupleTypeNode(n: qt.Node): n is qt.TupleTypeNode {
  return n.kind === qt.SyntaxKind.TupleType;
}

export function isUnionTypeNode(n: qt.Node): n is qt.UnionTypeNode {
  return n.kind === qt.SyntaxKind.UnionType;
}

export function isIntersectionTypeNode(n: qt.Node): n is qt.IntersectionTypeNode {
  return n.kind === qt.SyntaxKind.IntersectionType;
}

export function isConditionalTypeNode(n: qt.Node): n is qt.ConditionalTypeNode {
  return n.kind === qt.SyntaxKind.ConditionalType;
}

export function isInferTypeNode(n: qt.Node): n is qt.InferTypeNode {
  return n.kind === qt.SyntaxKind.InferType;
}

export function isParenthesizedTypeNode(n: qt.Node): n is qt.ParenthesizedTypeNode {
  return n.kind === qt.SyntaxKind.ParenthesizedType;
}

export function isThisTypeNode(n: qt.Node): n is qt.ThisTypeNode {
  return n.kind === qt.SyntaxKind.ThisType;
}

export function isTypeOperatorNode(n: qt.Node): n is qt.TypeOperatorNode {
  return n.kind === qt.SyntaxKind.TypeOperator;
}

export function isIndexedAccessTypeNode(n: qt.Node): n is qt.IndexedAccessTypeNode {
  return n.kind === qt.SyntaxKind.IndexedAccessType;
}

export function isMappedTypeNode(n: qt.Node): n is qt.MappedTypeNode {
  return n.kind === qt.SyntaxKind.MappedType;
}

export function isLiteralTypeNode(n: qt.Node): n is qt.LiteralTypeNode {
  return n.kind === qt.SyntaxKind.LiteralType;
}

export function isImportTypeNode(n: qt.Node): n is qt.ImportTypeNode {
  return n.kind === qt.SyntaxKind.ImportType;
}

// Binding patterns

export function isObjectBindingPattern(n: qt.Node): n is qt.ObjectBindingPattern {
  return n.kind === qt.SyntaxKind.ObjectBindingPattern;
}

export function isArrayBindingPattern(n: qt.Node): n is qt.ArrayBindingPattern {
  return n.kind === qt.SyntaxKind.ArrayBindingPattern;
}

export function isBindingElement(n: qt.Node): n is qt.BindingElement {
  return n.kind === qt.SyntaxKind.BindingElement;
}

// qt.Expression

export function isArrayLiteralExpression(n: qt.Node): n is qt.ArrayLiteralExpression {
  return n.kind === qt.SyntaxKind.ArrayLiteralExpression;
}

export function isObjectLiteralExpression(n: qt.Node): n is qt.ObjectLiteralExpression {
  return n.kind === qt.SyntaxKind.ObjectLiteralExpression;
}

export function isPropertyAccessExpression(n: qt.Node): n is qt.PropertyAccessExpression {
  return n.kind === qt.SyntaxKind.PropertyAccessExpression;
}

export function isPropertyAccessChain(n: qt.Node): n is qt.PropertyAccessChain {
  return isPropertyAccessExpression(n) && !!(n.flags & qt.NodeFlags.OptionalChain);
}

export function isElementAccessExpression(n: qt.Node): n is qt.ElementAccessExpression {
  return n.kind === qt.SyntaxKind.ElementAccessExpression;
}

export function isElementAccessChain(n: qt.Node): n is qt.ElementAccessChain {
  return isElementAccessExpression(n) && !!(n.flags & qt.NodeFlags.OptionalChain);
}

export function isCallExpression(n: qt.Node): n is qt.CallExpression {
  return n.kind === qt.SyntaxKind.CallExpression;
}

export function isCallChain(n: qt.Node): n is qt.CallChain {
  return isCallExpression(n) && !!(n.flags & qt.NodeFlags.OptionalChain);
}

export function isOptionalChain(n: qt.Node): n is qt.PropertyAccessChain | qt.ElementAccessChain | qt.CallChain | qt.NonNullChain {
  const kind = n.kind;
  return !!(n.flags & qt.NodeFlags.OptionalChain) && (kind === qt.SyntaxKind.PropertyAccessExpression || kind === qt.SyntaxKind.ElementAccessExpression || kind === qt.SyntaxKind.CallExpression || kind === qt.SyntaxKind.NonNullExpression);
}

export function isOptionalChainRoot(n: qt.Node): n is qt.OptionalChainRoot {
  return isOptionalChain(n) && !isNonNullExpression(n) && !!n.questionDotToken;
}

/**
 * Determines whether a n is the expression preceding an optional chain (i.e. `a` in `a?.b`).
 */

export function isExpressionOfOptionalChainRoot(n: qt.Node): n is qt.Expression & { parent: qt.OptionalChainRoot } {
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

export function isOutermostOptionalChain(n: qt.OptionalChain) {
  return (
    !isOptionalChain(n.parent) || // cases 1, 2, and 3
    isOptionalChainRoot(n.parent) || // case 4
    node !== n.parent.expression
  ); // case 5
}

export function isNullishCoalesce(n: qt.Node) {
  return n.kind === qt.SyntaxKind.BinaryExpression && node.operatorToken.kind === qt.SyntaxKind.QuestionQuestionToken;
}

export function isNewExpression(n: qt.Node): n is qt.NewExpression {
  return n.kind === qt.SyntaxKind.NewExpression;
}

export function isTaggedTemplateExpression(n: qt.Node): n is qt.TaggedTemplateExpression {
  return n.kind === qt.SyntaxKind.TaggedTemplateExpression;
}

export function isTypeAssertion(n: qt.Node): n is qt.TypeAssertion {
  return n.kind === qt.SyntaxKind.TypeAssertionExpression;
}

export function isConstTypeReference(n: qt.Node) {
  return isTypeReferenceNode(n) && isIdentifier(n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
}

export function isParenthesizedExpression(n: qt.Node): n is qt.ParenthesizedExpression {
  return n.kind === qt.SyntaxKind.ParenthesizedExpression;
}

export function skipPartiallyEmittedExpressions(n: qt.Expression): qt.Expression;
export function skipPartiallyEmittedExpressions(n: qt.Node): qt.Node;
export function skipPartiallyEmittedExpressions(n: qt.Node) {
  return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
}

export function isFunctionExpression(n: qt.Node): n is qt.FunctionExpression {
  return n.kind === qt.SyntaxKind.FunctionExpression;
}

export function isArrowFunction(n: qt.Node): n is qt.ArrowFunction {
  return n.kind === qt.SyntaxKind.ArrowFunction;
}

export function isDeleteExpression(n: qt.Node): n is qt.DeleteExpression {
  return n.kind === qt.SyntaxKind.DeleteExpression;
}

export function isTypeOfExpression(n: qt.Node): n is qt.TypeOfExpression {
  return n.kind === qt.SyntaxKind.TypeOfExpression;
}

export function isVoidExpression(n: qt.Node): n is qt.VoidExpression {
  return n.kind === qt.SyntaxKind.VoidExpression;
}

export function isAwaitExpression(n: qt.Node): n is qt.AwaitExpression {
  return n.kind === qt.SyntaxKind.AwaitExpression;
}

export function isPrefixUnaryExpression(n: qt.Node): n is qt.PrefixUnaryExpression {
  return n.kind === qt.SyntaxKind.PrefixUnaryExpression;
}

export function isPostfixUnaryExpression(n: qt.Node): n is qt.PostfixUnaryExpression {
  return n.kind === qt.SyntaxKind.PostfixUnaryExpression;
}

export function isBinaryExpression(n: qt.Node): n is qt.BinaryExpression {
  return n.kind === qt.SyntaxKind.BinaryExpression;
}

export function isConditionalExpression(n: qt.Node): n is qt.ConditionalExpression {
  return n.kind === qt.SyntaxKind.ConditionalExpression;
}

export function isTemplateExpression(n: qt.Node): n is qt.TemplateExpression {
  return n.kind === qt.SyntaxKind.TemplateExpression;
}

export function isYieldExpression(n: qt.Node): n is qt.YieldExpression {
  return n.kind === qt.SyntaxKind.YieldExpression;
}

export function isSpreadElement(n: qt.Node): n is qt.SpreadElement {
  return n.kind === qt.SyntaxKind.SpreadElement;
}

export function isClassExpression(n: qt.Node): n is qt.ClassExpression {
  return n.kind === qt.SyntaxKind.ClassExpression;
}

export function isOmittedExpression(n: qt.Node): n is qt.OmittedExpression {
  return n.kind === qt.SyntaxKind.OmittedExpression;
}

export function isExpressionWithTypeArguments(n: qt.Node): n is qt.ExpressionWithTypeArguments {
  return n.kind === qt.SyntaxKind.ExpressionWithTypeArguments;
}

export function isAsExpression(n: qt.Node): n is qt.AsExpression {
  return n.kind === qt.SyntaxKind.AsExpression;
}

export function isNonNullExpression(n: qt.Node): n is qt.NonNullExpression {
  return n.kind === qt.SyntaxKind.NonNullExpression;
}

export function isNonNullChain(n: qt.Node): n is qt.NonNullChain {
  return isNonNullExpression(n) && !!(n.flags & qt.NodeFlags.OptionalChain);
}

export function isMetaProperty(n: qt.Node): n is qt.MetaProperty {
  return n.kind === qt.SyntaxKind.MetaProperty;
}

// Misc

export function isTemplateSpan(n: qt.Node): n is qt.TemplateSpan {
  return n.kind === qt.SyntaxKind.TemplateSpan;
}

export function isSemicolonClassElement(n: qt.Node): n is qt.SemicolonClassElement {
  return n.kind === qt.SyntaxKind.SemicolonClassElement;
}

// Block

export function isBlock(n: qt.Node): n is qt.Block {
  return n.kind === qt.SyntaxKind.Block;
}

export function isVariableStatement(n: qt.Node): n is qt.VariableStatement {
  return n.kind === qt.SyntaxKind.VariableStatement;
}

export function isEmptyStatement(n: qt.Node): n is qt.EmptyStatement {
  return n.kind === qt.SyntaxKind.EmptyStatement;
}

export function isExpressionStatement(n: qt.Node): n is qt.ExpressionStatement {
  return n.kind === qt.SyntaxKind.ExpressionStatement;
}

export function isIfStatement(n: qt.Node): n is qt.IfStatement {
  return n.kind === qt.SyntaxKind.IfStatement;
}

export function isDoStatement(n: qt.Node): n is qt.DoStatement {
  return n.kind === qt.SyntaxKind.DoStatement;
}

export function isWhileStatement(n: qt.Node): n is qt.WhileStatement {
  return n.kind === qt.SyntaxKind.WhileStatement;
}

export function isForStatement(n: qt.Node): n is qt.ForStatement {
  return n.kind === qt.SyntaxKind.ForStatement;
}

export function isForInStatement(n: qt.Node): n is qt.ForInStatement {
  return n.kind === qt.SyntaxKind.ForInStatement;
}

export function isForOfStatement(n: qt.Node): n is qt.ForOfStatement {
  return n.kind === qt.SyntaxKind.ForOfStatement;
}

export function isContinueStatement(n: qt.Node): n is qt.ContinueStatement {
  return n.kind === qt.SyntaxKind.ContinueStatement;
}

export function isBreakStatement(n: qt.Node): n is qt.BreakStatement {
  return n.kind === qt.SyntaxKind.BreakStatement;
}

export function isBreakOrContinueStatement(n: qt.Node): n is qt.BreakOrContinueStatement {
  return n.kind === qt.SyntaxKind.BreakStatement || n.kind === qt.SyntaxKind.ContinueStatement;
}

export function isReturnStatement(n: qt.Node): n is qt.ReturnStatement {
  return n.kind === qt.SyntaxKind.ReturnStatement;
}

export function isWithStatement(n: qt.Node): n is qt.WithStatement {
  return n.kind === qt.SyntaxKind.WithStatement;
}

export function isSwitchStatement(n: qt.Node): n is qt.SwitchStatement {
  return n.kind === qt.SyntaxKind.SwitchStatement;
}

export function isLabeledStatement(n: qt.Node): n is qt.LabeledStatement {
  return n.kind === qt.SyntaxKind.LabeledStatement;
}

export function isThrowStatement(n: qt.Node): n is qt.ThrowStatement {
  return n.kind === qt.SyntaxKind.ThrowStatement;
}

export function isTryStatement(n: qt.Node): n is qt.TryStatement {
  return n.kind === qt.SyntaxKind.TryStatement;
}

export function isDebuggerStatement(n: qt.Node): n is qt.DebuggerStatement {
  return n.kind === qt.SyntaxKind.DebuggerStatement;
}

export function isVariableDeclaration(n: qt.Node): n is qt.VariableDeclaration {
  return n.kind === qt.SyntaxKind.VariableDeclaration;
}

export function isVariableDeclarationList(n: qt.Node): n is qt.VariableDeclarationList {
  return n.kind === qt.SyntaxKind.VariableDeclarationList;
}

export function isFunctionDeclaration(n: qt.Node): n is qt.FunctionDeclaration {
  return n.kind === qt.SyntaxKind.FunctionDeclaration;
}

export function isClassDeclaration(n: qt.Node): n is qt.ClassDeclaration {
  return n.kind === qt.SyntaxKind.ClassDeclaration;
}

export function isInterfaceDeclaration(n: qt.Node): n is qt.InterfaceDeclaration {
  return n.kind === qt.SyntaxKind.InterfaceDeclaration;
}

export function isTypeAliasDeclaration(n: qt.Node): n is qt.TypeAliasDeclaration {
  return n.kind === qt.SyntaxKind.TypeAliasDeclaration;
}

export function isEnumDeclaration(n: qt.Node): n is qt.EnumDeclaration {
  return n.kind === qt.SyntaxKind.EnumDeclaration;
}

export function isModuleDeclaration(n: qt.Node): n is qt.ModuleDeclaration {
  return n.kind === qt.SyntaxKind.ModuleDeclaration;
}

export function isModuleBlock(n: qt.Node): n is qt.ModuleBlock {
  return n.kind === qt.SyntaxKind.ModuleBlock;
}

export function isCaseBlock(n: qt.Node): n is qt.CaseBlock {
  return n.kind === qt.SyntaxKind.CaseBlock;
}

export function isNamespaceExportDeclaration(n: qt.Node): n is qt.NamespaceExportDeclaration {
  return n.kind === qt.SyntaxKind.NamespaceExportDeclaration;
}

export function isImportEqualsDeclaration(n: qt.Node): n is qt.ImportEqualsDeclaration {
  return n.kind === qt.SyntaxKind.ImportEqualsDeclaration;
}

export function isImportDeclaration(n: qt.Node): n is qt.ImportDeclaration {
  return n.kind === qt.SyntaxKind.ImportDeclaration;
}

export function isImportClause(n: qt.Node): n is qt.ImportClause {
  return n.kind === qt.SyntaxKind.ImportClause;
}

export function isNamespaceImport(n: qt.Node): n is qt.NamespaceImport {
  return n.kind === qt.SyntaxKind.NamespaceImport;
}

export function isNamespaceExport(n: qt.Node): n is qt.NamespaceExport {
  return n.kind === qt.SyntaxKind.NamespaceExport;
}

export function isNamedExportBindings(n: qt.Node): n is qt.NamedExportBindings {
  return n.kind === qt.SyntaxKind.NamespaceExport || n.kind === qt.SyntaxKind.NamedExports;
}

export function isNamedImports(n: qt.Node): n is qt.NamedImports {
  return n.kind === qt.SyntaxKind.NamedImports;
}

export function isImportSpecifier(n: qt.Node): n is qt.ImportSpecifier {
  return n.kind === qt.SyntaxKind.ImportSpecifier;
}

export function isExportAssignment(n: qt.Node): n is qt.ExportAssignment {
  return n.kind === qt.SyntaxKind.ExportAssignment;
}

export function isExportDeclaration(n: qt.Node): n is qt.ExportDeclaration {
  return n.kind === qt.SyntaxKind.ExportDeclaration;
}

export function isNamedExports(n: qt.Node): n is qt.NamedExports {
  return n.kind === qt.SyntaxKind.NamedExports;
}

export function isExportSpecifier(n: qt.Node): n is qt.ExportSpecifier {
  return n.kind === qt.SyntaxKind.ExportSpecifier;
}

export function isMissingDeclaration(n: qt.Node): n is qt.MissingDeclaration {
  return n.kind === qt.SyntaxKind.MissingDeclaration;
}

// Module References

export function isExternalModuleReference(n: qt.Node): n is qt.ExternalModuleReference {
  return n.kind === qt.SyntaxKind.ExternalModuleReference;
}

// JSX

export function isJsxElement(n: qt.Node): n is qt.JsxElement {
  return n.kind === qt.SyntaxKind.JsxElement;
}

export function isJsxSelfClosingElement(n: qt.Node): n is qt.JsxSelfClosingElement {
  return n.kind === qt.SyntaxKind.JsxSelfClosingElement;
}

export function isJsxOpeningElement(n: qt.Node): n is qt.JsxOpeningElement {
  return n.kind === qt.SyntaxKind.JsxOpeningElement;
}

export function isJsxClosingElement(n: qt.Node): n is qt.JsxClosingElement {
  return n.kind === qt.SyntaxKind.JsxClosingElement;
}

export function isJsxFragment(n: qt.Node): n is qt.JsxFragment {
  return n.kind === qt.SyntaxKind.JsxFragment;
}

export function isJsxOpeningFragment(n: qt.Node): n is qt.JsxOpeningFragment {
  return n.kind === qt.SyntaxKind.JsxOpeningFragment;
}

export function isJsxClosingFragment(n: qt.Node): n is qt.JsxClosingFragment {
  return n.kind === qt.SyntaxKind.JsxClosingFragment;
}

export function isJsxAttribute(n: qt.Node): n is qt.JsxAttribute {
  return n.kind === qt.SyntaxKind.JsxAttribute;
}

export function isJsxAttributes(n: qt.Node): n is qt.JsxAttributes {
  return n.kind === qt.SyntaxKind.JsxAttributes;
}

export function isJsxSpreadAttribute(n: qt.Node): n is qt.JsxSpreadAttribute {
  return n.kind === qt.SyntaxKind.JsxSpreadAttribute;
}

export function isJsxExpression(n: qt.Node): n is qt.JsxExpression {
  return n.kind === qt.SyntaxKind.JsxExpression;
}

// Clauses

export function isCaseClause(n: qt.Node): n is qt.CaseClause {
  return n.kind === qt.SyntaxKind.CaseClause;
}

export function isDefaultClause(n: qt.Node): n is qt.DefaultClause {
  return n.kind === qt.SyntaxKind.DefaultClause;
}

export function isHeritageClause(n: qt.Node): n is qt.HeritageClause {
  return n.kind === qt.SyntaxKind.HeritageClause;
}

export function isCatchClause(n: qt.Node): n is qt.CatchClause {
  return n.kind === qt.SyntaxKind.CatchClause;
}

// Property assignments

export function isPropertyAssignment(n: qt.Node): n is qt.PropertyAssignment {
  return n.kind === qt.SyntaxKind.PropertyAssignment;
}

export function isShorthandPropertyAssignment(n: qt.Node): n is qt.ShorthandPropertyAssignment {
  return n.kind === qt.SyntaxKind.ShorthandPropertyAssignment;
}

export function isSpreadAssignment(n: qt.Node): n is qt.SpreadAssignment {
  return n.kind === qt.SyntaxKind.SpreadAssignment;
}

// Enum

export function isEnumMember(n: qt.Node): n is qt.EnumMember {
  return n.kind === qt.SyntaxKind.EnumMember;
}

// Top-level nodes
export function isSourceFile(n: qt.Node): n is qt.SourceFile {
  return n.kind === qt.SyntaxKind.SourceFile;
}

export function isBundle(n: qt.Node): n is qt.Bundle {
  return n.kind === qt.SyntaxKind.Bundle;
}

export function isUnparsedSource(n: qt.Node): n is qt.UnparsedSource {
  return n.kind === qt.SyntaxKind.UnparsedSource;
}

export function isUnparsedPrepend(n: qt.Node): n is qt.UnparsedPrepend {
  return n.kind === qt.SyntaxKind.UnparsedPrepend;
}

export function isUnparsedTextLike(n: qt.Node): n is qt.UnparsedTextLike {
  switch (n.kind) {
    case qt.SyntaxKind.UnparsedText:
    case qt.SyntaxKind.UnparsedInternalText:
      return true;
    default:
      return false;
  }
}

export function isUnparsedNode(n: qt.Node): n is qt.UnparsedNode {
  return isUnparsedTextLike(n) || n.kind === qt.SyntaxKind.UnparsedPrologue || n.kind === qt.SyntaxKind.UnparsedSyntheticReference;
}

// JSDoc

export function isJSDocTypeExpression(n: qt.Node): n is qt.JSDocTypeExpression {
  return n.kind === qt.SyntaxKind.JSDocTypeExpression;
}

export function isJSDocAllType(n: qt.Node): n is qt.JSDocAllType {
  return n.kind === qt.SyntaxKind.JSDocAllType;
}

export function isJSDocUnknownType(n: qt.Node): n is qt.JSDocUnknownType {
  return n.kind === qt.SyntaxKind.JSDocUnknownType;
}

export function isJSDocNullableType(n: qt.Node): n is qt.JSDocNullableType {
  return n.kind === qt.SyntaxKind.JSDocNullableType;
}

export function isJSDocNonNullableType(n: qt.Node): n is qt.JSDocNonNullableType {
  return n.kind === qt.SyntaxKind.JSDocNonNullableType;
}

export function isJSDocOptionalType(n: qt.Node): n is qt.JSDocOptionalType {
  return n.kind === qt.SyntaxKind.JSDocOptionalType;
}

export function isJSDocFunctionType(n: qt.Node): n is qt.JSDocFunctionType {
  return n.kind === qt.SyntaxKind.JSDocFunctionType;
}

export function isJSDocVariadicType(n: qt.Node): n is qt.JSDocVariadicType {
  return n.kind === qt.SyntaxKind.JSDocVariadicType;
}

export function isJSDoc(n: qt.Node): n is qt.JSDoc {
  return n.kind === qt.SyntaxKind.JSDocComment;
}

export function isJSDocAuthorTag(n: qt.Node): n is qt.JSDocAuthorTag {
  return n.kind === qt.SyntaxKind.JSDocAuthorTag;
}

export function isJSDocAugmentsTag(n: qt.Node): n is qt.JSDocAugmentsTag {
  return n.kind === qt.SyntaxKind.JSDocAugmentsTag;
}

export function isJSDocImplementsTag(n: qt.Node): n is qt.JSDocImplementsTag {
  return n.kind === qt.SyntaxKind.JSDocImplementsTag;
}

export function isJSDocClassTag(n: qt.Node): n is qt.JSDocClassTag {
  return n.kind === qt.SyntaxKind.JSDocClassTag;
}

export function isJSDocPublicTag(n: qt.Node): n is qt.JSDocPublicTag {
  return n.kind === qt.SyntaxKind.JSDocPublicTag;
}

export function isJSDocPrivateTag(n: qt.Node): n is qt.JSDocPrivateTag {
  return n.kind === qt.SyntaxKind.JSDocPrivateTag;
}

export function isJSDocProtectedTag(n: qt.Node): n is qt.JSDocProtectedTag {
  return n.kind === qt.SyntaxKind.JSDocProtectedTag;
}

export function isJSDocReadonlyTag(n: qt.Node): n is qt.JSDocReadonlyTag {
  return n.kind === qt.SyntaxKind.JSDocReadonlyTag;
}

export function isJSDocEnumTag(n: qt.Node): n is qt.JSDocEnumTag {
  return n.kind === qt.SyntaxKind.JSDocEnumTag;
}

export function isJSDocThisTag(n: qt.Node): n is qt.JSDocThisTag {
  return n.kind === qt.SyntaxKind.JSDocThisTag;
}

export function isJSDocParameterTag(n: qt.Node): n is qt.JSDocParameterTag {
  return n.kind === qt.SyntaxKind.JSDocParameterTag;
}

export function isJSDocReturnTag(n: qt.Node): n is qt.JSDocReturnTag {
  return n.kind === qt.SyntaxKind.JSDocReturnTag;
}

export function isJSDocTypeTag(n: qt.Node): n is qt.JSDocTypeTag {
  return n.kind === qt.SyntaxKind.JSDocTypeTag;
}

export function isJSDocTemplateTag(n: qt.Node): n is qt.JSDocTemplateTag {
  return n.kind === qt.SyntaxKind.JSDocTemplateTag;
}

export function isJSDocTypedefTag(n: qt.Node): n is qt.JSDocTypedefTag {
  return n.kind === qt.SyntaxKind.JSDocTypedefTag;
}

export function isJSDocPropertyTag(n: qt.Node): n is qt.JSDocPropertyTag {
  return n.kind === qt.SyntaxKind.JSDocPropertyTag;
}

export function isJSDocPropertyLikeTag(n: qt.Node): n is qt.JSDocPropertyLikeTag {
  return n.kind === qt.SyntaxKind.JSDocPropertyTag || n.kind === qt.SyntaxKind.JSDocParameterTag;
}

export function isJSDocTypeLiteral(n: qt.Node): n is qt.JSDocTypeLiteral {
  return n.kind === qt.SyntaxKind.JSDocTypeLiteral;
}

export function isJSDocCallbackTag(n: qt.Node): n is qt.JSDocCallbackTag {
  return n.kind === qt.SyntaxKind.JSDocCallbackTag;
}

export function isJSDocSignature(n: qt.Node): n is qt.JSDocSignature {
  return n.kind === qt.SyntaxKind.JSDocSignature;
}

// #endregion

// #region
// Node tests
//
// All node tests in the following list should *not* reference parent pointers so that
// they may be used with transformations.

export function isSyntaxList(n: qt.Node): n is qt.SyntaxList {
  return n.kind === qt.SyntaxKind.SyntaxList;
}

export function isNode(n: qt.Node) {
  return isNodeKind(n.kind);
}

export function isNodeKind(kind: qt.SyntaxKind) {
  return kind >= qt.SyntaxKind.FirstNode;
}

/**
 * True if n is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 * Literals are considered tokens, except TemplateLiteral, but does include TemplateHead/Middle/Tail.
 */
export function isToken(n: qt.Node): boolean {
  return n.kind >= qt.SyntaxKind.FirstToken && n.kind <= qt.SyntaxKind.LastToken;
}

// Node Arrays

export function isNodeArray<T extends qt.Node>(array: readonly T[]): array is qt.NodeArray<T> {
  return array.hasOwnProperty('pos') && array.hasOwnProperty('end');
}

// Literals

export function isLiteralKind(kind: qt.SyntaxKind): boolean {
  return qt.SyntaxKind.FirstLiteralToken <= kind && kind <= qt.SyntaxKind.LastLiteralToken;
}

export function isLiteralExpression(n: qt.Node): n is qt.LiteralExpression {
  return isLiteralKind(n.kind);
}

// Pseudo-literals

export function isTemplateLiteralKind(kind: qt.SyntaxKind): boolean {
  return qt.SyntaxKind.FirstTemplateToken <= kind && kind <= qt.SyntaxKind.LastTemplateToken;
}

export type TemplateLiteralToken = NoSubstitutionTemplateLiteral | TemplateHead | TemplateMiddle | TemplateTail;
export function isTemplateLiteralToken(n: qt.Node): n is TemplateLiteralToken {
  return isTemplateLiteralKind(n.kind);
}

export function isTemplateMiddleOrTemplateTail(n: qt.Node): n is qt.TemplateMiddle | qt.TemplateTail {
  const kind = n.kind;
  return kind === qt.SyntaxKind.TemplateMiddle || kind === qt.SyntaxKind.TemplateTail;
}

export function isImportOrExportSpecifier(n: qt.Node): n is qt.ImportSpecifier | qt.ExportSpecifier {
  return isImportSpecifier(n) || isExportSpecifier(n);
}

export function isTypeOnlyImportOrExportDeclaration(n: qt.Node): n is qt.TypeOnlyCompatibleAliasDeclaration {
  switch (n.kind) {
    case qt.SyntaxKind.ImportSpecifier:
    case qt.SyntaxKind.ExportSpecifier:
      return n.parent.parent.isTypeOnly;
    case qt.SyntaxKind.NamespaceImport:
      return n.parent.isTypeOnly;
    case qt.SyntaxKind.ImportClause:
      return n.isTypeOnly;
    default:
      return false;
  }
}

export function isStringTextContainingNode(n: qt.Node): n is qt.StringLiteral | TemplateLiteralToken {
  return n.kind === qt.SyntaxKind.StringLiteral || isTemplateLiteralKind(n.kind);
}

// qt.Identifiers

export function isGeneratedIdentifier(n: qt.Node): n is qt.GeneratedIdentifier {
  return isIdentifier(n) && (n.autoGenerateFlags! & qt.GeneratedIdentifierFlags.KindMask) > qt.GeneratedIdentifierFlags.None;
}

// Private qt.Identifiers
export function isPrivateIdentifierPropertyDeclaration(n: qt.Node): n is qt.PrivateIdentifierPropertyDeclaration {
  return isPropertyDeclaration(n) && isPrivateIdentifier(n.name);
}

export function isPrivateIdentifierPropertyAccessExpression(n: qt.Node): n is qt.PrivateIdentifierPropertyAccessExpression {
  return isPropertyAccessExpression(n) && isPrivateIdentifier(n.name);
}

// Keywords

export function isModifierKind(token: qt.SyntaxKind): token is qt.Modifier['kind'] {
  switch (token) {
    case qt.SyntaxKind.AbstractKeyword:
    case qt.SyntaxKind.AsyncKeyword:
    case qt.SyntaxKind.ConstKeyword:
    case qt.SyntaxKind.DeclareKeyword:
    case qt.SyntaxKind.DefaultKeyword:
    case qt.SyntaxKind.ExportKeyword:
    case qt.SyntaxKind.PublicKeyword:
    case qt.SyntaxKind.PrivateKeyword:
    case qt.SyntaxKind.ProtectedKeyword:
    case qt.SyntaxKind.ReadonlyKeyword:
    case qt.SyntaxKind.StaticKeyword:
      return true;
  }
  return false;
}

export function isParameterPropertyModifier(kind: qt.SyntaxKind): boolean {
  return !!(modifierToFlag(kind) & qt.ModifierFlags.ParameterPropertyModifier);
}

export function isClassMemberModifier(idToken: qt.SyntaxKind): boolean {
  return isParameterPropertyModifier(idToken) || idToken === qt.SyntaxKind.StaticKeyword;
}

export function isModifier(n: qt.Node): n is qt.Modifier {
  return isModifierKind(n.kind);
}

export function isEntityName(n: qt.Node): n is qt.EntityName {
  const kind = n.kind;
  return kind === qt.SyntaxKind.QualifiedName || kind === qt.SyntaxKind.Identifier;
}

export function isPropertyName(n: qt.Node): n is qt.PropertyName {
  const kind = n.kind;
  return kind === qt.SyntaxKind.Identifier || kind === qt.SyntaxKind.PrivateIdentifier || kind === qt.SyntaxKind.StringLiteral || kind === qt.SyntaxKind.NumericLiteral || kind === qt.SyntaxKind.ComputedPropertyName;
}

export function isBindingName(n: qt.Node): n is qt.BindingName {
  const kind = n.kind;
  return kind === qt.SyntaxKind.Identifier || kind === qt.SyntaxKind.ObjectBindingPattern || kind === qt.SyntaxKind.ArrayBindingPattern;
}

// Functions

export function isFunctionLike(n: qt.Node): n is qt.SignatureDeclaration {
  return node && isFunctionLikeKind(n.kind);
}

export function isFunctionLikeDeclaration(n: qt.Node): n is qt.FunctionLikeDeclaration {
  return node && isFunctionLikeDeclarationKind(n.kind);
}

function isFunctionLikeDeclarationKind(kind: qt.SyntaxKind): boolean {
  switch (kind) {
    case qt.SyntaxKind.FunctionDeclaration:
    case qt.SyntaxKind.MethodDeclaration:
    case qt.SyntaxKind.Constructor:
    case qt.SyntaxKind.GetAccessor:
    case qt.SyntaxKind.SetAccessor:
    case qt.SyntaxKind.FunctionExpression:
    case qt.SyntaxKind.ArrowFunction:
      return true;
    default:
      return false;
  }
}

export function isFunctionLikeKind(kind: qt.SyntaxKind): boolean {
  switch (kind) {
    case qt.SyntaxKind.MethodSignature:
    case qt.SyntaxKind.CallSignature:
    case qt.SyntaxKind.JSDocSignature:
    case qt.SyntaxKind.ConstructSignature:
    case qt.SyntaxKind.IndexSignature:
    case qt.SyntaxKind.FunctionType:
    case qt.SyntaxKind.JSDocFunctionType:
    case qt.SyntaxKind.ConstructorType:
      return true;
    default:
      return isFunctionLikeDeclarationKind(kind);
  }
}

export function isFunctionOrModuleBlock(n: qt.Node): boolean {
  return isSourceFile(n) || isModuleBlock(n) || (isBlock(n) && isFunctionLike(n.parent));
}

// Classes
export function isClassElement(n: qt.Node): n is qt.ClassElement {
  const kind = n.kind;
  return kind === qt.SyntaxKind.Constructor || kind === qt.SyntaxKind.PropertyDeclaration || kind === qt.SyntaxKind.MethodDeclaration || kind === qt.SyntaxKind.GetAccessor || kind === qt.SyntaxKind.SetAccessor || kind === qt.SyntaxKind.IndexSignature || kind === qt.SyntaxKind.SemicolonClassElement;
}

export function isClassLike(n: qt.Node): n is qt.ClassLikeDeclaration {
  return node && (n.kind === qt.SyntaxKind.ClassDeclaration || n.kind === qt.SyntaxKind.ClassExpression);
}

export function isAccessor(n: qt.Node): n is qt.AccessorDeclaration {
  return node && (n.kind === qt.SyntaxKind.GetAccessor || n.kind === qt.SyntaxKind.SetAccessor);
}

export function isMethodOrAccessor(n: qt.Node): n is qt.MethodDeclaration | AccessorDeclaration {
  switch (n.kind) {
    case qt.SyntaxKind.MethodDeclaration:
    case qt.SyntaxKind.GetAccessor:
    case qt.SyntaxKind.SetAccessor:
      return true;
    default:
      return false;
  }
}

// Type members

export function isTypeElement(n: qt.Node): n is qt.TypeElement {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ConstructSignature || kind === qt.SyntaxKind.CallSignature || kind === qt.SyntaxKind.PropertySignature || kind === qt.SyntaxKind.MethodSignature || kind === qt.SyntaxKind.IndexSignature;
}

export function isClassOrTypeElement(n: qt.Node): n is qt.ClassElement | TypeElement {
  return isTypeElement(n) || isClassElement(n);
}

export function isObjectLiteralElementLike(n: qt.Node): n is qt.ObjectLiteralElementLike {
  const kind = n.kind;
  return kind === qt.SyntaxKind.PropertyAssignment || kind === qt.SyntaxKind.ShorthandPropertyAssignment || kind === qt.SyntaxKind.SpreadAssignment || kind === qt.SyntaxKind.MethodDeclaration || kind === qt.SyntaxKind.GetAccessor || kind === qt.SyntaxKind.SetAccessor;
}

// Type

/**
 * Node test that determines whether a n is a valid type n.
 * This differs from the `isPartOfTypeNode` function which determines whether a n is *part*
 * of a qt.TypeNode.
 */
export function isTypeNode(n: qt.Node): n is qt.TypeNode {
  return isTypeNodeKind(n.kind);
}

export function isFunctionOrConstructorTypeNode(n: qt.Node): n is qt.FunctionTypeNode | ConstructorTypeNode {
  switch (n.kind) {
    case qt.SyntaxKind.FunctionType:
    case qt.SyntaxKind.ConstructorType:
      return true;
  }

  return false;
}

// Binding patterns

export function isBindingPattern(n: qt.Node | undefined): n is qt.BindingPattern {
  if (n) {
    const kind = n.kind;
    return kind === qt.SyntaxKind.ArrayBindingPattern || kind === qt.SyntaxKind.ObjectBindingPattern;
  }

  return false;
}

export function isAssignmentPattern(n: qt.Node): n is qt.AssignmentPattern {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ArrayLiteralExpression || kind === qt.SyntaxKind.ObjectLiteralExpression;
}

export function isArrayBindingElement(n: qt.Node): n is qt.ArrayBindingElement {
  const kind = n.kind;
  return kind === qt.SyntaxKind.BindingElement || kind === qt.SyntaxKind.OmittedExpression;
}

/**
 * Determines whether the qt.BindingOrAssignmentElement is a qt.BindingElement-like declaration
 */

export function isDeclarationBindingElement(bindingElement: qt.BindingOrAssignmentElement): bindingElement is qt.VariableDeclaration | qt.ParameterDeclaration | qt.BindingElement {
  switch (bindingElement.kind) {
    case qt.SyntaxKind.VariableDeclaration:
    case qt.SyntaxKind.Parameter:
    case qt.SyntaxKind.BindingElement:
      return true;
  }

  return false;
}

/**
 * Determines whether a n is a qt.BindingOrAssignmentPattern
 */

export function isBindingOrAssignmentPattern(n: qt.BindingOrAssignmentElementTarget): n is qt.BindingOrAssignmentPattern {
  return isObjectBindingOrAssignmentPattern(n) || isArrayBindingOrAssignmentPattern(n);
}

/**
 * Determines whether a n is an qt.ObjectBindingOrAssignmentPattern
 */

export function isObjectBindingOrAssignmentPattern(n: qt.BindingOrAssignmentElementTarget): n is qt.ObjectBindingOrAssignmentPattern {
  switch (n.kind) {
    case qt.SyntaxKind.ObjectBindingPattern:
    case qt.SyntaxKind.ObjectLiteralExpression:
      return true;
  }

  return false;
}

/**
 * Determines whether a n is an qt.ArrayBindingOrAssignmentPattern
 */

export function isArrayBindingOrAssignmentPattern(n: qt.BindingOrAssignmentElementTarget): n is qt.ArrayBindingOrAssignmentPattern {
  switch (n.kind) {
    case qt.SyntaxKind.ArrayBindingPattern:
    case qt.SyntaxKind.ArrayLiteralExpression:
      return true;
  }

  return false;
}

export function isPropertyAccessOrQualifiedNameOrImportTypeNode(n: qt.Node): n is qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTypeNode {
  const kind = n.kind;
  return kind === qt.SyntaxKind.PropertyAccessExpression || kind === qt.SyntaxKind.QualifiedName || kind === qt.SyntaxKind.ImportType;
}

// qt.Expression

export function isPropertyAccessOrQualifiedName(n: qt.Node): n is qt.PropertyAccessExpression | qt.QualifiedName {
  const kind = n.kind;
  return kind === qt.SyntaxKind.PropertyAccessExpression || kind === qt.SyntaxKind.QualifiedName;
}

export function isCallLikeExpression(n: qt.Node): n is qt.CallLikeExpression {
  switch (n.kind) {
    case qt.SyntaxKind.JsxOpeningElement:
    case qt.SyntaxKind.JsxSelfClosingElement:
    case qt.SyntaxKind.CallExpression:
    case qt.SyntaxKind.NewExpression:
    case qt.SyntaxKind.TaggedTemplateExpression:
    case qt.SyntaxKind.Decorator:
      return true;
    default:
      return false;
  }
}

export function isCallOrNewExpression(n: qt.Node): n is qt.CallExpression | NewExpression {
  return n.kind === qt.SyntaxKind.CallExpression || n.kind === qt.SyntaxKind.NewExpression;
}

export function isTemplateLiteral(n: qt.Node): n is qt.TemplateLiteral {
  const kind = n.kind;
  return kind === qt.SyntaxKind.TemplateExpression || kind === qt.SyntaxKind.NoSubstitutionTemplateLiteral;
}

export function isLeftHandSideExpression(n: qt.Node): n is qt.LeftHandSideExpression {
  return isLeftHandSideExpressionKind(skipPartiallyEmittedExpressions(n).kind);
}

function isLeftHandSideExpressionKind(kind: qt.SyntaxKind): boolean {
  switch (kind) {
    case qt.SyntaxKind.PropertyAccessExpression:
    case qt.SyntaxKind.ElementAccessExpression:
    case qt.SyntaxKind.NewExpression:
    case qt.SyntaxKind.CallExpression:
    case qt.SyntaxKind.JsxElement:
    case qt.SyntaxKind.JsxSelfClosingElement:
    case qt.SyntaxKind.JsxFragment:
    case qt.SyntaxKind.TaggedTemplateExpression:
    case qt.SyntaxKind.ArrayLiteralExpression:
    case qt.SyntaxKind.ParenthesizedExpression:
    case qt.SyntaxKind.ObjectLiteralExpression:
    case qt.SyntaxKind.ClassExpression:
    case qt.SyntaxKind.FunctionExpression:
    case qt.SyntaxKind.Identifier:
    case qt.SyntaxKind.RegularExpressionLiteral:
    case qt.SyntaxKind.NumericLiteral:
    case qt.SyntaxKind.BigIntLiteral:
    case qt.SyntaxKind.StringLiteral:
    case qt.SyntaxKind.NoSubstitutionTemplateLiteral:
    case qt.SyntaxKind.TemplateExpression:
    case qt.SyntaxKind.FalseKeyword:
    case qt.SyntaxKind.NullKeyword:
    case qt.SyntaxKind.ThisKeyword:
    case qt.SyntaxKind.TrueKeyword:
    case qt.SyntaxKind.SuperKeyword:
    case qt.SyntaxKind.NonNullExpression:
    case qt.SyntaxKind.MetaProperty:
    case qt.SyntaxKind.ImportKeyword: // technically this is only an qt.Expression if it's in a CallExpression
      return true;
    default:
      return false;
  }
}

export function isUnaryExpression(n: qt.Node): n is qt.UnaryExpression {
  return isUnaryExpressionKind(skipPartiallyEmittedExpressions(n).kind);
}

function isUnaryExpressionKind(kind: qt.SyntaxKind): boolean {
  switch (kind) {
    case qt.SyntaxKind.PrefixUnaryExpression:
    case qt.SyntaxKind.PostfixUnaryExpression:
    case qt.SyntaxKind.DeleteExpression:
    case qt.SyntaxKind.TypeOfExpression:
    case qt.SyntaxKind.VoidExpression:
    case qt.SyntaxKind.AwaitExpression:
    case qt.SyntaxKind.TypeAssertionExpression:
      return true;
    default:
      return isLeftHandSideExpressionKind(kind);
  }
}

export function isUnaryExpressionWithWrite(expr: qt.Node): expr is qt.PrefixUnaryExpression | qt.PostfixUnaryExpression {
  switch (expr.kind) {
    case qt.SyntaxKind.PostfixUnaryExpression:
      return true;
    case qt.SyntaxKind.PrefixUnaryExpression:
      return (<qt.PrefixUnaryExpression>expr).operator === qt.SyntaxKind.PlusPlusToken || (<qt.PrefixUnaryExpression>expr).operator === qt.SyntaxKind.MinusMinusToken;
    default:
      return false;
  }
}

/**
 * Determines whether a n is an expression based only on its kind.
 * Use `isExpressionNode` if not in transforms.
 */
export function isExpression(n: qt.Node): n is qt.Expression {
  return isExpressionKind(skipPartiallyEmittedExpressions(n).kind);
}

function isExpressionKind(kind: qt.SyntaxKind): boolean {
  switch (kind) {
    case qt.SyntaxKind.ConditionalExpression:
    case qt.SyntaxKind.YieldExpression:
    case qt.SyntaxKind.ArrowFunction:
    case qt.SyntaxKind.BinaryExpression:
    case qt.SyntaxKind.SpreadElement:
    case qt.SyntaxKind.AsExpression:
    case qt.SyntaxKind.OmittedExpression:
    case qt.SyntaxKind.CommaListExpression:
    case qt.SyntaxKind.PartiallyEmittedExpression:
      return true;
    default:
      return isUnaryExpressionKind(kind);
  }
}

export function isAssertionExpression(n: qt.Node): n is qt.AssertionExpression {
  const kind = n.kind;
  return kind === qt.SyntaxKind.TypeAssertionExpression || kind === qt.SyntaxKind.AsExpression;
}

export function isPartiallyEmittedExpression(n: qt.Node): n is qt.PartiallyEmittedExpression {
  return n.kind === qt.SyntaxKind.PartiallyEmittedExpression;
}

export function isNotEmittedStatement(n: qt.Node): n is qt.NotEmittedStatement {
  return n.kind === qt.SyntaxKind.NotEmittedStatement;
}

export function isSyntheticReference(n: qt.Node): n is qt.SyntheticReferenceExpression {
  return n.kind === qt.SyntaxKind.SyntheticReferenceExpression;
}

export function isNotEmittedOrPartiallyEmittedNode(n: qt.Node): n is qt.NotEmittedStatement | qt.PartiallyEmittedExpression {
  return isNotEmittedStatement(n) || isPartiallyEmittedExpression(n);
}

// qt.Statement

export function isIterationStatement(n: qt.Node, lookInLabeledStatements: false): n is qt.IterationStatement;
export function isIterationStatement(n: qt.Node, lookInLabeledStatements: boolean): n is qt.IterationStatement | LabeledStatement;
export function isIterationStatement(n: qt.Node, lookInLabeledStatements: boolean): n is qt.IterationStatement {
  switch (n.kind) {
    case qt.SyntaxKind.ForStatement:
    case qt.SyntaxKind.ForInStatement:
    case qt.SyntaxKind.ForOfStatement:
    case qt.SyntaxKind.DoStatement:
    case qt.SyntaxKind.WhileStatement:
      return true;
    case qt.SyntaxKind.LabeledStatement:
      return lookInLabeledStatements && isIterationStatement(n.statement, lookInLabeledStatements);
  }

  return false;
}

export function isScopeMarker(n: qt.Node) {
  return isExportAssignment(n) || isExportDeclaration(n);
}

export function hasScopeMarker(statements: readonly qt.Statement[]) {
  return qc.some(statements, isScopeMarker);
}

export function needsScopeMarker(result: qt.Statement) {
  return !isAnyImportOrReExport(result) && !isExportAssignment(result) && !hasSyntacticModifier(result, qt.ModifierFlags.Export) && !isAmbientModule(result);
}

export function isExternalModuleIndicator(result: qt.Statement) {
  // Exported top-level member indicates moduleness
  return isAnyImportOrReExport(result) || isExportAssignment(result) || qu.hasSyntacticModifier(result, qt.ModifierFlags.Export);
}

export function isForInOrOfStatement(n: qt.Node): n is qt.ForInOrOfStatement {
  return n.kind === qt.SyntaxKind.ForInStatement || n.kind === qt.SyntaxKind.ForOfStatement;
}

// Element

export function isConciseBody(n: qt.Node): n is qt.ConciseBody {
  return isBlock(n) || isExpression(n);
}

export function isFunctionBody(n: qt.Node): n is qt.FunctionBody {
  return isBlock(n);
}

export function isForInitializer(n: qt.Node): n is qt.ForInitializer {
  return isVariableDeclarationList(n) || isExpression(n);
}

export function isModuleBody(n: qt.Node): n is qt.ModuleBody {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ModuleBlock || kind === qt.SyntaxKind.ModuleDeclaration || kind === qt.SyntaxKind.Identifier;
}

export function isNamespaceBody(n: qt.Node): n is qt.NamespaceBody {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ModuleBlock || kind === qt.SyntaxKind.ModuleDeclaration;
}

export function isJSDocNamespaceBody(n: qt.Node): n is qt.JSDocNamespaceBody {
  const kind = n.kind;
  return kind === qt.SyntaxKind.Identifier || kind === qt.SyntaxKind.ModuleDeclaration;
}

export function isNamedImportBindings(n: qt.Node): n is qt.NamedImportBindings {
  const kind = n.kind;
  return kind === qt.SyntaxKind.NamedImports || kind === qt.SyntaxKind.NamespaceImport;
}

export function isModuleOrEnumDeclaration(n: qt.Node): n is qt.ModuleDeclaration | qt.EnumDeclaration {
  return n.kind === qt.SyntaxKind.ModuleDeclaration || n.kind === qt.SyntaxKind.EnumDeclaration;
}

function isDeclarationKind(kind: qt.SyntaxKind) {
  return (
    kind === qt.SyntaxKind.ArrowFunction ||
    kind === qt.SyntaxKind.BindingElement ||
    kind === qt.SyntaxKind.ClassDeclaration ||
    kind === qt.SyntaxKind.ClassExpression ||
    kind === qt.SyntaxKind.Constructor ||
    kind === qt.SyntaxKind.EnumDeclaration ||
    kind === qt.SyntaxKind.EnumMember ||
    kind === qt.SyntaxKind.ExportSpecifier ||
    kind === qt.SyntaxKind.FunctionDeclaration ||
    kind === qt.SyntaxKind.FunctionExpression ||
    kind === qt.SyntaxKind.GetAccessor ||
    kind === qt.SyntaxKind.ImportClause ||
    kind === qt.SyntaxKind.ImportEqualsDeclaration ||
    kind === qt.SyntaxKind.ImportSpecifier ||
    kind === qt.SyntaxKind.InterfaceDeclaration ||
    kind === qt.SyntaxKind.JsxAttribute ||
    kind === qt.SyntaxKind.MethodDeclaration ||
    kind === qt.SyntaxKind.MethodSignature ||
    kind === qt.SyntaxKind.ModuleDeclaration ||
    kind === qt.SyntaxKind.NamespaceExportDeclaration ||
    kind === qt.SyntaxKind.NamespaceImport ||
    kind === qt.SyntaxKind.NamespaceExport ||
    kind === qt.SyntaxKind.Parameter ||
    kind === qt.SyntaxKind.PropertyAssignment ||
    kind === qt.SyntaxKind.PropertyDeclaration ||
    kind === qt.SyntaxKind.PropertySignature ||
    kind === qt.SyntaxKind.SetAccessor ||
    kind === qt.SyntaxKind.ShorthandPropertyAssignment ||
    kind === qt.SyntaxKind.TypeAliasDeclaration ||
    kind === qt.SyntaxKind.TypeParameter ||
    kind === qt.SyntaxKind.VariableDeclaration ||
    kind === qt.SyntaxKind.JSDocTypedefTag ||
    kind === qt.SyntaxKind.JSDocCallbackTag ||
    kind === qt.SyntaxKind.JSDocPropertyTag
  );
}

function isDeclarationStatementKind(kind: qt.SyntaxKind) {
  return (
    kind === qt.SyntaxKind.FunctionDeclaration ||
    kind === qt.SyntaxKind.MissingDeclaration ||
    kind === qt.SyntaxKind.ClassDeclaration ||
    kind === qt.SyntaxKind.InterfaceDeclaration ||
    kind === qt.SyntaxKind.TypeAliasDeclaration ||
    kind === qt.SyntaxKind.EnumDeclaration ||
    kind === qt.SyntaxKind.ModuleDeclaration ||
    kind === qt.SyntaxKind.ImportDeclaration ||
    kind === qt.SyntaxKind.ImportEqualsDeclaration ||
    kind === qt.SyntaxKind.ExportDeclaration ||
    kind === qt.SyntaxKind.ExportAssignment ||
    kind === qt.SyntaxKind.NamespaceExportDeclaration
  );
}

function isStatementKindButNotDeclarationKind(kind: qt.SyntaxKind) {
  return (
    kind === qt.SyntaxKind.BreakStatement ||
    kind === qt.SyntaxKind.ContinueStatement ||
    kind === qt.SyntaxKind.DebuggerStatement ||
    kind === qt.SyntaxKind.DoStatement ||
    kind === qt.SyntaxKind.ExpressionStatement ||
    kind === qt.SyntaxKind.EmptyStatement ||
    kind === qt.SyntaxKind.ForInStatement ||
    kind === qt.SyntaxKind.ForOfStatement ||
    kind === qt.SyntaxKind.ForStatement ||
    kind === qt.SyntaxKind.IfStatement ||
    kind === qt.SyntaxKind.LabeledStatement ||
    kind === qt.SyntaxKind.ReturnStatement ||
    kind === qt.SyntaxKind.SwitchStatement ||
    kind === qt.SyntaxKind.ThrowStatement ||
    kind === qt.SyntaxKind.TryStatement ||
    kind === qt.SyntaxKind.VariableStatement ||
    kind === qt.SyntaxKind.WhileStatement ||
    kind === qt.SyntaxKind.WithStatement ||
    kind === qt.SyntaxKind.NotEmittedStatement ||
    kind === qt.SyntaxKind.EndOfDeclarationMarker ||
    kind === qt.SyntaxKind.MergeDeclarationMarker
  );
}

export function isDeclaration(n: qt.Node): n is qt.NamedDeclaration {
  if (n.kind === qt.SyntaxKind.TypeParameter) {
    return (n.parent && n.parent.kind !== qt.SyntaxKind.JSDocTemplateTag) || qu.isInJSFile(n);
  }

  return isDeclarationKind(n.kind);
}

export function isDeclarationStatement(n: qt.Node): n is qt.DeclarationStatement {
  return isDeclarationStatementKind(n.kind);
}

/**
 * Determines whether the n is a statement that is not also a declaration
 */

export function isStatementButNotDeclaration(n: qt.Node): n is qt.Statement {
  return isStatementKindButNotDeclarationKind(n.kind);
}

export function isStatement(n: qt.Node): n is qt.Statement {
  const kind = n.kind;
  return isStatementKindButNotDeclarationKind(kind) || isDeclarationStatementKind(kind) || isBlockStatement(n);
}

function isBlockStatement(n: qt.Node): n is qt.Block {
  if (n.kind !== qt.SyntaxKind.Block) return false;
  if (n.parent !== undefined) {
    if (n.parent.kind === qt.SyntaxKind.TryStatement || n.parent.kind === qt.SyntaxKind.CatchClause) {
      return false;
    }
  }
  return !qu.isFunctionBlock(n);
}

// Module references

export function isModuleReference(n: qt.Node): n is qt.ModuleReference {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ExternalModuleReference || kind === qt.SyntaxKind.QualifiedName || kind === qt.SyntaxKind.Identifier;
}

// JSX

export function isJsxTagNameExpression(n: qt.Node): n is qt.JsxTagNameExpression {
  const kind = n.kind;
  return kind === qt.SyntaxKind.ThisKeyword || kind === qt.SyntaxKind.Identifier || kind === qt.SyntaxKind.PropertyAccessExpression;
}

export function isJsxChild(n: qt.Node): n is qt.JsxChild {
  const kind = n.kind;
  return kind === qt.SyntaxKind.JsxElement || kind === qt.SyntaxKind.JsxExpression || kind === qt.SyntaxKind.JsxSelfClosingElement || kind === qt.SyntaxKind.JsxText || kind === qt.SyntaxKind.JsxFragment;
}

export function isJsxAttributeLike(n: qt.Node): n is qt.JsxAttributeLike {
  const kind = n.kind;
  return kind === qt.SyntaxKind.JsxAttribute || kind === qt.SyntaxKind.JsxSpreadAttribute;
}

export function isStringLiteralOrJsxExpression(n: qt.Node): n is qt.StringLiteral | qt.JsxExpression {
  const kind = n.kind;
  return kind === qt.SyntaxKind.StringLiteral || kind === qt.SyntaxKind.JsxExpression;
}

export function isJsxOpeningLikeElement(n: qt.Node): n is qt.JsxOpeningLikeElement {
  const kind = n.kind;
  return kind === qt.SyntaxKind.JsxOpeningElement || kind === qt.SyntaxKind.JsxSelfClosingElement;
}

// Clauses

export function isCaseOrDefaultClause(n: qt.Node): n is qt.CaseOrDefaultClause {
  const kind = n.kind;
  return kind === qt.SyntaxKind.CaseClause || kind === qt.SyntaxKind.DefaultClause;
}

// JSDoc

/** True if n is of some JSDoc syntax kind. */

export function isJSDocNode(n: qt.Node): boolean {
  return n.kind >= qt.SyntaxKind.FirstJSDocNode && n.kind <= qt.SyntaxKind.LastJSDocNode;
}

/** True if n is of a kind that may contain comment text. */
export function isJSDocCommentContainingNode(n: qt.Node): boolean {
  return n.kind === qt.SyntaxKind.JSDocComment || n.kind === qt.SyntaxKind.JSDocNamepathType || isJSDocTag(n) || isJSDocTypeLiteral(n) || isJSDocSignature(n);
}

// TODO: determine what this does before making it public.

export function isJSDocTag(n: qt.Node): n is qt.JSDocTag {
  return n.kind >= qt.SyntaxKind.FirstJSDocTagNode && n.kind <= qt.SyntaxKind.LastJSDocTagNode;
}

export function isSetAccessor(n: qt.Node): n is qt.SetAccessorDeclaration {
  return n.kind === qt.SyntaxKind.SetAccessor;
}

export function isGetAccessor(n: qt.Node): n is qt.GetAccessorDeclaration {
  return n.kind === qt.SyntaxKind.GetAccessor;
}

/** True if has jsdoc nodes attached to it. */

// TODO: GH#19856 Would like to return `n is Node & { jsDoc: JSDoc[] }` but it causes long compile times
export function hasJSDocNodes(n: qt.Node): n is qt.HasJSDoc {
  const { jsDoc } = n;
  return !!jsDoc && jsDoc.length > 0;
}

/** True if has type node attached to it. */

export function hasType(n: qt.Node): n is qt.HasType {
  return !!n.type;
}

/** True if has initializer node attached to it. */

export function hasInitializer(n: qt.Node): n is qt.HasInitializer {
  return !!n.initializer;
}

/** True if has initializer node attached to it. */
export function hasOnlyExpressionInitializer(n: qt.Node): n is qt.HasExpressionInitializer {
  switch (n.kind) {
    case qt.SyntaxKind.VariableDeclaration:
    case qt.SyntaxKind.Parameter:
    case qt.SyntaxKind.BindingElement:
    case qt.SyntaxKind.PropertySignature:
    case qt.SyntaxKind.PropertyDeclaration:
    case qt.SyntaxKind.PropertyAssignment:
    case qt.SyntaxKind.EnumMember:
      return true;
    default:
      return false;
  }
}

export function isObjectLiteralElement(n: qt.Node): n is qt.ObjectLiteralElement {
  return n.kind === qt.SyntaxKind.JsxAttribute || n.kind === qt.SyntaxKind.JsxSpreadAttribute || isObjectLiteralElementLike(n);
}

export function isTypeReferenceType(n: qt.Node): n is qt.TypeReferenceType {
  return n.kind === qt.SyntaxKind.TypeReference || n.kind === qt.SyntaxKind.ExpressionWithTypeArguments;
}

const MAX_SMI_X86 = 0x3fff_ffff;

export function guessIndentation(lines: string[]) {
  let indentation = MAX_SMI_X86;
  for (const line of lines) {
    if (!line.length) {
      continue;
    }
    let i = 0;
    for (; i < line.length && i < indentation; i++) {
      if (!isWhiteSpaceLike(line.charCodeAt(i))) {
        break;
      }
    }
    if (i < indentation) {
      indentation = i;
    }
    if (indentation === 0) {
      return 0;
    }
  }
  return indentation === MAX_SMI_X86 ? undefined : indentation;
}

export function isStringLiteralLike(n: qt.Node): n is qt.StringLiteralLike {
  return n.kind === qt.SyntaxKind.StringLiteral || n.kind === qt.SyntaxKind.NoSubstitutionTemplateLiteral;
}
