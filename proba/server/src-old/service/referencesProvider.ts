/*
 * referencesProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that finds all of the references to a symbol specified
 * by a location within a file.
 */

import { CancellationToken } from 'vscode-languageserver';

import * as AnalyzerNodeInfo from '../analyzer/analyzerNodeInfo';
import { Declaration } from '../analyzer/declaration';
import * as DeclarationUtils from '../analyzer/declarationUtils';
import * as ParseTreeUtils from '../analyzer/parseTreeUtils';
import { ParseTreeWalker } from '../analyzer/parseTreeWalker';
import { TypeEvaluator } from '../analyzer/typeEvaluator';
import { throwIfCancellationRequested } from '../utils/cancel';
import { convertOffsetToPosition, convertPositionToOffset } from '../utils/positionUtils';
import { DocumentRange, Position } from '../utils/text';
import { TextRange } from '../utils/text';
import { ModuleNameNode, NameNode, ParseNode, ParseNodeType } from '../parser/parseNodes';
import { ParseResults } from '../parser/parser';

export interface ReferencesResult {
  requiresGlobalSearch: boolean;
  nodeAtOffset: ParseNode;
  symbolName: string;
  declarations: Declaration[];
  locations: DocumentRange[];
}

class FindReferencesTreeWalker extends ParseTreeWalker {
  private _parseResults: ParseResults;
  private _filePath: string;
  private _referencesResult: ReferencesResult;
  private _includeDeclaration: boolean;
  private _evaluator: TypeEvaluator;
  private _cancellationToken: CancellationToken;

  constructor(
    parseResults: ParseResults,
    filePath: string,
    referencesResult: ReferencesResult,
    includeDeclaration: boolean,
    evaluator: TypeEvaluator,
    token: CancellationToken
  ) {
    super();
    this._parseResults = parseResults;
    this._filePath = filePath;
    this._referencesResult = referencesResult;
    this._includeDeclaration = includeDeclaration;
    this._evaluator = evaluator;
    this._cancellationToken = token;
  }

  findReferences() {
    this.walk(this._parseResults.parseTree);
  }

  walk(node: ParseNode) {
    if (!AnalyzerNodeInfo.isCodeUnreachable(node)) {
      super.walk(node);
    }
  }

  visitModuleName(node: ModuleNameNode): boolean {
    // Don't ever look for references within a module name.
    return false;
  }

  visitName(node: NameNode): boolean {
    throwIfCancellationRequested(this._cancellationToken);

    // No need to do any more work if the symbol name doesn't match.
    if (node.value !== this._referencesResult.symbolName) {
      return false;
    }

    const declarations = this._evaluator.getDeclarationsForNameNode(node);

    if (declarations && declarations.length > 0) {
      // Does this name share a declaration with the symbol of interest?
      if (declarations.some((decl) => this._resultsContainsDeclaration(decl))) {
        // Is it the same symbol?
        if (this._includeDeclaration || node !== this._referencesResult.nodeAtOffset) {
          this._referencesResult.locations.push({
            path: this._filePath,
            range: {
              start: convertOffsetToPosition(
                node.start,
                this._parseResults.tokenizerOutput.lines
              ),
              end: convertOffsetToPosition(
                TextRange.getEnd(node),
                this._parseResults.tokenizerOutput.lines
              ),
            },
          });
        }
      }
    }

    return true;
  }

  private _resultsContainsDeclaration(declaration: Declaration) {
    // Resolve the declaration.
    const resolvedDecl = this._evaluator.resolveAliasDeclaration(
      declaration,
      /* resolveLocalNames */ false
    );
    if (!resolvedDecl) {
      return false;
    }

    // The reference results declarations are already resolved, so we don't
    // need to call resolveAliasDeclaration on them.
    if (
      this._referencesResult.declarations.some((decl) =>
        DeclarationUtils.areDeclarationsSame(decl, resolvedDecl)
      )
    ) {
      return true;
    }

    // We didn't find the declaration using local-only alias resolution. Attempt
    // it again by fully resolving the alias.
    const resolvedDeclNonlocal = this._evaluator.resolveAliasDeclaration(
      resolvedDecl,
      /* resolveLocalNames */ true
    );
    if (!resolvedDeclNonlocal || resolvedDeclNonlocal === resolvedDecl) {
      return false;
    }

    return this._referencesResult.declarations.some((decl) =>
      DeclarationUtils.areDeclarationsSame(decl, resolvedDeclNonlocal)
    );
  }
}

export class ReferencesProvider {
  static getDeclarationForPosition(
    parseResults: ParseResults,
    filePath: string,
    position: Position,
    evaluator: TypeEvaluator,
    token: CancellationToken
  ): ReferencesResult | undefined {
    throwIfCancellationRequested(token);

    const offset = convertPositionToOffset(position, parseResults.tokenizerOutput.lines);
    if (offset === undefined) {
      return undefined;
    }

    const node = ParseTreeUtils.findNodeByOffset(parseResults.parseTree, offset);
    if (node === undefined) {
      return undefined;
    }

    // If this isn't a name node, there are no references to be found.
    if (node.nodeType !== ParseNodeType.Name) {
      return undefined;
    }

    // Special case module names, which don't have references.
    if (node.parent?.nodeType === ParseNodeType.ModuleName) {
      return undefined;
    }

    const declarations = evaluator.getDeclarationsForNameNode(node);
    if (!declarations) {
      return undefined;
    }

    const resolvedDeclarations: Declaration[] = [];
    declarations.forEach((decl) => {
      const resolvedDecl = evaluator.resolveAliasDeclaration(
        decl,
        /* resolveLocalNames */ false
      );
      if (resolvedDecl) {
        resolvedDeclarations.push(resolvedDecl);
      }
    });

    if (resolvedDeclarations.length === 0) {
      return undefined;
    }

    // Does this symbol require search beyond the current file? Determine whether
    // the symbol is declared within an evaluation scope that is within the current
    // file and cannot be imported directly from other modules.
    const requiresGlobalSearch = resolvedDeclarations.some((decl) => {
      // If the declaration is outside of this file, a global search is needed.
      if (decl.path !== filePath) {
        return true;
      }

      const evalScope = ParseTreeUtils.getEvaluationScopeNode(decl.node);

      // If the declaration is at the module level or a class level, it can be seen
      // outside of the current module, so a global search is needed.
      if (
        evalScope.nodeType === ParseNodeType.Module ||
        evalScope.nodeType === ParseNodeType.Class
      ) {
        return true;
      }

      // If the name node is a member variable, we need to do a global search.
      if (
        decl.node?.parent?.nodeType === ParseNodeType.MemberAccess &&
        decl.node === decl.node.parent.memberName
      ) {
        return true;
      }

      return false;
    });

    return {
      requiresGlobalSearch,
      nodeAtOffset: node,
      symbolName: node.value,
      declarations: resolvedDeclarations,
      locations: [],
    };
  }

  static addReferences(
    parseResults: ParseResults,
    filePath: string,
    referencesResult: ReferencesResult,
    includeDeclaration: boolean,
    evaluator: TypeEvaluator,
    token: CancellationToken
  ): void {
    const refTreeWalker = new FindReferencesTreeWalker(
      parseResults,
      filePath,
      referencesResult,
      includeDeclaration,
      evaluator,
      token
    );
    refTreeWalker.findReferences();
  }
}
