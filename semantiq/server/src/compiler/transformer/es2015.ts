import { EmitFlags, Node, Modifier, ModifierFlags, TrafoFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
const enum ES2015SubstitutionFlags {
  CapturedThis = 1 << 0,
  BlockScopedBindings = 1 << 1,
}
interface LoopOutParam {
  flags: LoopOutParamFlags;
  originalName: qc.Identifier;
  outParamName: qc.Identifier;
}
const enum LoopOutParamFlags {
  Body = 1 << 0,
  Initer = 1 << 1,
}
const enum CopyDirection {
  ToOriginal,
  ToOutParam,
}
const enum Jump {
  Break = 1 << 1,
  Continue = 1 << 2,
  Return = 1 << 3,
}
interface ConvertedLoopState {
  labels?: qu.QMap<boolean>;
  labeledNonLocalBreaks?: qu.QMap<string>;
  labeledNonLocalContinues?: qu.QMap<string>;
  nonLocalJumps?: Jump;
  allowedNonLabeledJumps?: Jump;
  argsName?: qc.Identifier;
  thisName?: qc.Identifier;
  containsLexicalThis?: boolean;
  hoistedLocalVariables?: qc.Identifier[];
  conditionVariable?: qc.Identifier;
  loopParams: qt.ParamDeclaration[];
  loopOutParams: LoopOutParam[];
}
type LoopConverter = (
  node: qt.IterationStmt,
  outermostLabeledStatement: qt.LabeledStatement | undefined,
  convertedLoopBodyStatements: qc.Statement[] | undefined,
  ancestorFacts: HierarchyFacts
) => qc.Statement;
const enum HierarchyFacts {
  None = 0,
  Function = 1 << 0,
  qt.ArrowFunction = 1 << 1,
  AsyncFunctionBody = 1 << 2,
  NonStaticClassElem = 1 << 3,
  CapturesThis = 1 << 4,
  ExportedVariableStatement = 1 << 5,
  TopLevel = 1 << 6,
  qt.Block = 1 << 7,
  qt.IterationStmt = 1 << 8,
  IterationStmtBlock = 1 << 9,
  IterationContainer = 1 << 10,
  qt.ForStatement = 1 << 11,
  ForInOrForOfStatement = 1 << 12,
  ConstructorWithCapturedSuper = 1 << 13,
  AncestorFactsMask = (ConstructorWithCapturedSuper << 1) - 1,
  BlockScopeIncludes = None,
  BlockScopeExcludes = TopLevel | qt.Block | qt.IterationStmt | IterationStmtBlock | qt.ForStatement | ForInOrForOfStatement,
  SourceFileIncludes = TopLevel,
  SourceFileExcludes = (BlockScopeExcludes & ~TopLevel) | IterationContainer,
  FunctionIncludes = Function | TopLevel,
  FunctionExcludes = (BlockScopeExcludes & ~TopLevel) | qt.ArrowFunction | AsyncFunctionBody | CapturesThis | NonStaticClassElem | ConstructorWithCapturedSuper | IterationContainer,
  AsyncFunctionBodyIncludes = FunctionIncludes | AsyncFunctionBody,
  AsyncFunctionBodyExcludes = FunctionExcludes & ~NonStaticClassElem,
  ArrowFunctionIncludes = qt.ArrowFunction | TopLevel,
  ArrowFunctionExcludes = (BlockScopeExcludes & ~TopLevel) | ConstructorWithCapturedSuper,
  ConstructorIncludes = FunctionIncludes | NonStaticClassElem,
  ConstructorExcludes = FunctionExcludes & ~NonStaticClassElem,
  DoOrWhileStatementIncludes = qt.IterationStmt | IterationContainer,
  DoOrWhileStatementExcludes = None,
  ForStatementIncludes = qt.IterationStmt | qt.ForStatement | IterationContainer,
  ForStatementExcludes = BlockScopeExcludes & ~ForStatement,
  ForInOrForOfStatementIncludes = qt.IterationStmt | ForInOrForOfStatement | IterationContainer,
  ForInOrForOfStatementExcludes = BlockScopeExcludes & ~ForInOrForOfStatement,
  BlockIncludes = qt.Block,
  BlockExcludes = BlockScopeExcludes & ~Block,
  IterationStmtBlockIncludes = IterationStmtBlock,
  IterationStmtBlockExcludes = BlockScopeExcludes,
  NewTarget = 1 << 14,
  CapturedLexicalThis = 1 << 15,
  SubtreeFactsMask = ~AncestorFactsMask,
  ArrowFunctionSubtreeExcludes = None,
  FunctionSubtreeExcludes = NewTarget | CapturedLexicalThis,
}
export function transformES2015(context: qt.TrafoContext) {
  const { startLexicalEnv, resumeLexicalEnv, endLexicalEnv, hoistVariableDeclaration } = context;
  const compilerOpts = context.getCompilerOpts();
  const resolver = context.getEmitResolver();
  const previousOnSubstituteNode = context.onSubstituteNode;
  const previousOnEmitNode = context.onEmitNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  let currentSourceFile: qt.SourceFile;
  let currentText: string;
  let hierarchyFacts: HierarchyFacts;
  let taggedTemplateStringDeclarations: qt.VariableDeclaration[];
  function recordTaggedTemplateString(temp: qc.Identifier) {
    taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, new qc.VariableDeclaration(temp));
  }
  let convertedLoopState: ConvertedLoopState | undefined;
  let enabledSubstitutions: ES2015SubstitutionFlags;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    currentText = node.text;
    const visited = visitSourceFile(node);
    qf.emit.addHelpers(visited, context.readEmitHelpers());
    currentSourceFile = undefined!;
    currentText = undefined!;
    taggedTemplateStringDeclarations = undefined!;
    hierarchyFacts = HierarchyFacts.None;
    return visited;
  }
  function enterSubtree(excludeFacts: HierarchyFacts, includeFacts: HierarchyFacts) {
    const ancestorFacts = hierarchyFacts;
    hierarchyFacts = ((hierarchyFacts & ~excludeFacts) | includeFacts) & HierarchyFacts.AncestorFactsMask;
    return ancestorFacts;
  }
  function exitSubtree(ancestorFacts: HierarchyFacts, excludeFacts: HierarchyFacts, includeFacts: HierarchyFacts) {
    hierarchyFacts = (((hierarchyFacts & ~excludeFacts) | includeFacts) & HierarchyFacts.SubtreeFactsMask) | ancestorFacts;
  }
  function isReturnVoidStatementInConstructorWithCapturedSuper(node: Node): boolean {
    return (hierarchyFacts & HierarchyFacts.ConstructorWithCapturedSuper) !== 0 && node.kind === Syntax.ReturnStatement && !(<qt.ReturnStatement>node).expression;
  }
  function shouldVisitNode(node: Node): boolean {
    return (
      (node.trafoFlags & TrafoFlags.ContainsES2015) !== 0 ||
      convertedLoopState !== undefined ||
      (hierarchyFacts & HierarchyFacts.ConstructorWithCapturedSuper && (qf.is.statement(node) || node.kind === Syntax.Block)) ||
      (qf.is.iterationStatement(node, false) && shouldConvertIterationStmt(node)) ||
      (qf.get.emitFlags(node) & EmitFlags.TypeScriptClassWrapper) !== 0
    );
  }
  function visitor(node: Node): VisitResult<Node> {
    if (shouldVisitNode(node)) return visitJavaScript(node);
    return node;
  }
  function callExpressionVisitor(node: Node): VisitResult<Node> {
    if (node.kind === Syntax.SuperKeyword) return visitSuperKeyword(true);
    return visitor(node);
  }
  function visitJavaScript(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.StaticKeyword:
        return;
      case Syntax.ClassDeclaration:
        return visitClassDeclaration(<qt.ClassDeclaration>node);
      case Syntax.ClassExpression:
        return visitClassExpression(<qt.ClassExpression>node);
      case Syntax.Param:
        return visitParam(<qt.ParamDeclaration>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<qt.FunctionDeclaration>node);
      case Syntax.ArrowFunction:
        return visitArrowFunction(<qt.ArrowFunction>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<qt.FunctionExpression>node);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(<qt.VariableDeclaration>node);
      case Syntax.Identifier:
        return visitIdentifier(<qt.Identifier>node);
      case Syntax.VariableDeclarationList:
        return visitVariableDeclarationList(<qt.VariableDeclarationList>node);
      case Syntax.SwitchStatement:
        return visitSwitchStatement(<qt.SwitchStatement>node);
      case Syntax.CaseBlock:
        return visitCaseBlock(<qt.CaseBlock>node);
      case Syntax.Block:
        return visitBlock(<qt.Block>node, false);
      case Syntax.BreakStatement:
      case Syntax.ContinueStatement:
        return visitBreakOrContinueStatement(<qt.BreakOrContinueStatement>node);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(<qt.LabeledStatement>node);
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        return visitDoOrWhileStatement(<qt.DoStatement | qt.WhileStatement>node, undefined);
      case Syntax.ForStatement:
        return visitForStatement(<qt.ForStatement>node, undefined);
      case Syntax.ForInStatement:
        return visitForInStatement(<qt.ForInStatement>node, undefined);
      case Syntax.ForOfStatement:
        return visitForOfStatement(<qt.ForOfStatement>node, undefined);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(<qt.ExpressionStatement>node);
      case Syntax.ObjectLiteralExpression:
        return visitObjectLiteralExpression(<qt.ObjectLiteralExpression>node);
      case Syntax.CatchClause:
        return visitCatchClause(<qt.CatchClause>node);
      case Syntax.ShorthandPropertyAssignment:
        return visitShorthandPropertyAssignment(<qt.ShorthandPropertyAssignment>node);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(<qt.ComputedPropertyName>node);
      case Syntax.ArrayLiteralExpression:
        return visitArrayLiteralExpression(<qt.ArrayLiteralExpression>node);
      case Syntax.CallExpression:
        return visitCallExpression(<qt.CallExpression>node);
      case Syntax.NewExpression:
        return visitNewExpression(<qt.NewExpression>node);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(<qt.ParenthesizedExpression>node, true);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(<qt.BinaryExpression>node, true);
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateHead:
      case Syntax.TemplateMiddle:
      case Syntax.TemplateTail:
        return visitTemplateLiteral(<qt.LiteralExpression>node);
      case Syntax.StringLiteral:
        return visitStringLiteral(<qt.StringLiteral>node);
      case Syntax.NumericLiteral:
        return visitNumericLiteral(<qt.NumericLiteral>node);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(<qt.TaggedTemplateExpression>node);
      case Syntax.TemplateExpression:
        return visitTemplateExpression(<qt.TemplateExpression>node);
      case Syntax.YieldExpression:
        return visitYieldExpression(<qt.YieldExpression>node);
      case Syntax.SpreadElem:
        return visitSpreadElem(<qt.SpreadElem>node);
      case Syntax.SuperKeyword:
        return visitSuperKeyword(false);
      case Syntax.ThisKeyword:
        return visitThisKeyword(node);
      case Syntax.MetaProperty:
        return visitMetaProperty(<qt.MetaProperty>node);
      case Syntax.MethodDeclaration:
        return visitMethodDeclaration(<qt.MethodDeclaration>node);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return visitAccessorDeclaration(<qt.AccessorDeclaration>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<qt.VariableStatement>node);
      case Syntax.ReturnStatement:
        return visitReturnStatement(<qt.ReturnStatement>node);
      default:
        return qf.visit.children(node, visitor, context);
    }
  }
  function visitSourceFile(node: qt.SourceFile): qt.SourceFile {
    const ancestorFacts = enterSubtree(HierarchyFacts.SourceFileExcludes, HierarchyFacts.SourceFileIncludes);
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    startLexicalEnv();
    let statementOffset = addStandardPrologue(prologue, node.statements, false);
    statementOffset = addCustomPrologue(prologue, node.statements, statementOffset, visitor);
    qu.addRange(statements, Nodes.visit(node.statements, visitor, qf.is.statement, statementOffset));
    if (taggedTemplateStringDeclarations) {
      statements.push(new qc.VariableStatement(undefined, new qc.VariableDeclarationList(taggedTemplateStringDeclarations)));
    }
    qc.mergeLexicalEnv(prologue, endLexicalEnv());
    insertCaptureThisForNodeIfNeeded(prologue, node);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return qp_updateSourceNode(node, new Nodes(concatenate(prologue, statements)).setRange(node.statements));
  }
  function visitSwitchStatement(node: qt.SwitchStatement): qt.SwitchStatement {
    if (convertedLoopState !== undefined) {
      const savedAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
      convertedLoopState.allowedNonLabeledJumps! |= Jump.Break;
      const result = qf.visit.children(node, visitor, context);
      convertedLoopState.allowedNonLabeledJumps = savedAllowedNonLabeledJumps;
      return result;
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitCaseBlock(node: qt.CaseBlock): qt.CaseBlock {
    const ancestorFacts = enterSubtree(HierarchyFacts.BlockScopeExcludes, HierarchyFacts.BlockScopeIncludes);
    const updated = qf.visit.children(node, visitor, context);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function returnCapturedThis(node: Node): qt.ReturnStatement {
    return new qc.ReturnStatement(qf.create.fileLevelUniqueName('_this')).setOriginal(node);
  }
  function visitReturnStatement(node: qt.ReturnStatement): qc.Statement {
    if (convertedLoopState) {
      convertedLoopState.nonLocalJumps! |= Jump.Return;
      if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
        node = returnCapturedThis(node);
      }
      return new qc.ReturnStatement(
        new qc.ObjectLiteralExpression([new qc.PropertyAssignment(new qc.Identifier('value'), node.expression ? qf.visit.node(node.expression, visitor, isExpression) : qc.VoidExpression.zero())])
      );
    } else if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
      return returnCapturedThis(node);
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitThisKeyword(node: Node): Node {
    if (hierarchyFacts & HierarchyFacts.ArrowFunction) {
      hierarchyFacts |= HierarchyFacts.CapturedLexicalThis;
    }
    if (convertedLoopState) {
      if (hierarchyFacts & HierarchyFacts.ArrowFunction) {
        convertedLoopState.containsLexicalThis = true;
        return node;
      }
      return convertedLoopState.thisName || (convertedLoopState.thisName = qf.create.uniqueName('this'));
    }
    return node;
  }
  function visitIdentifier(node: qc.Identifier): qc.Identifier {
    if (!convertedLoopState) return node;
    if (qf.is.generatedIdentifier(node)) return node;
    if (node.escapedText !== 'args' || !resolver.isArgsLocalBinding(node)) return node;
    return convertedLoopState.argsName || (convertedLoopState.argsName = qf.create.uniqueName('args'));
  }
  function visitBreakOrContinueStatement(node: qt.BreakOrContinueStatement): qc.Statement {
    if (convertedLoopState) {
      const jump = node.kind === Syntax.BreakStatement ? Jump.Break : Jump.Continue;
      const canUseBreakOrContinue =
        (node.label && convertedLoopState.labels && convertedLoopState.labels.get(idText(node.label))) || (!node.label && convertedLoopState.allowedNonLabeledJumps! & jump);
      if (!canUseBreakOrContinue) {
        let labelMarker: string;
        const label = node.label;
        if (!label) {
          if (node.kind === Syntax.BreakStatement) {
            convertedLoopState.nonLocalJumps! |= Jump.Break;
            labelMarker = 'break';
          } else {
            convertedLoopState.nonLocalJumps! |= Jump.Continue;
            labelMarker = 'continue';
          }
        } else {
          if (node.kind === Syntax.BreakStatement) {
            labelMarker = `break-${label.escapedText}`;
            setLabeledJump(convertedLoopState, true, idText(label), labelMarker);
          } else {
            labelMarker = `continue-${label.escapedText}`;
            setLabeledJump(convertedLoopState, false, idText(label), labelMarker);
          }
        }
        let returnExpression: qc.Expression = qc.asLiteral(labelMarker);
        if (convertedLoopState.loopOutParams.length) {
          const outParams = convertedLoopState.loopOutParams;
          let expr: qc.Expression | undefined;
          for (let i = 0; i < outParams.length; i++) {
            const copyExpr = copyOutParam(outParams[i], CopyDirection.ToOutParam);
            if (i === 0) {
              expr = copyExpr;
            } else {
              expr = new qc.BinaryExpression(expr!, Syntax.CommaToken, copyExpr);
            }
          }
          returnExpression = new qc.BinaryExpression(expr!, Syntax.CommaToken, returnExpression);
        }
        return new qc.ReturnStatement(returnExpression);
      }
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitClassDeclaration(node: qt.ClassDeclaration): VisitResult<qt.Statement> {
    const variable = new qc.VariableDeclaration(qf.decl.localName(node, true), undefined, transformClassLikeDeclarationToExpression(node));
    variable.setOriginal(node);
    const statements: qc.Statement[] = [];
    const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([variable]));
    statement.setOriginal(node);
    statement.setRange(node);
    qf.emit.setStartsOnNewLine(statement);
    statements.push(statement);
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      const exportStatement = qf.has.syntacticModifier(node, ModifierFlags.Default) ? qf.create.exportDefault(qf.decl.localName(node)) : qf.create.externalModuleExport(qf.decl.localName(node));
      exportStatement.setOriginal(statement);
      statements.push(exportStatement);
    }
    const emitFlags = qf.get.emitFlags(node);
    if ((emitFlags & EmitFlags.HasEndOfDeclarationMarker) === 0) {
      statements.push(new qc.EndOfDeclarationMarker(node));
      qf.emit.setFlags(statement, emitFlags | EmitFlags.HasEndOfDeclarationMarker);
    }
    return singleOrMany(statements);
  }
  function visitClassExpression(node: qt.ClassExpression): qc.Expression {
    return transformClassLikeDeclarationToExpression(node);
  }
  function transformClassLikeDeclarationToExpression(node: qt.ClassExpression | qt.ClassDeclaration): qc.Expression {
    if (node.name) {
      enableSubstitutionsForBlockScopedBindings();
    }
    const extendsClauseElem = qf.get.classExtendsHeritageElem(node);
    const classFunction = new qc.FunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      extendsClauseElem ? [new qc.ParamDeclaration(undefined, undefined, qf.create.fileLevelUniqueName('_super'))] : [],
      undefined,
      transformClassBody(node, extendsClauseElem)
    );
    qf.emit.setFlags(classFunction, (qf.get.emitFlags(node) & EmitFlags.Indented) | EmitFlags.ReuseTempVariableScope);
    const inner = new qc.PartiallyEmittedExpression(classFunction);
    inner.end = node.end;
    qf.emit.setFlags(inner, EmitFlags.NoComments);
    const outer = new qc.PartiallyEmittedExpression(inner);
    outer.end = qy.skipTrivia(currentText, node.pos);
    qf.emit.setFlags(outer, EmitFlags.NoComments);
    const result = new qc.ParenthesizedExpression(new qc.CallExpression(outer, undefined, extendsClauseElem ? [qf.visit.node(extendsClauseElem.expression, visitor, isExpression)] : []));
    qf.emit.addSyntheticLeadingComment(result, Syntax.MultiLineCommentTrivia, '* @class ');
    return result;
  }
  function transformClassBody(node: qt.ClassExpression | qt.ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypings | undefined): qt.Block {
    const statements: qc.Statement[] = [];
    startLexicalEnv();
    addExtendsHelperIfNeeded(statements, node, extendsClauseElem);
    addConstructor(statements, node, extendsClauseElem);
    addClassMembers(statements, node);
    const closingBraceLocation = qf.create.tokenRange(qy.skipTrivia(currentText, node.members.end), Syntax.CloseBraceToken);
    const localName = qf.decl.internalName(node);
    const outer = new qc.PartiallyEmittedExpression(localName);
    outer.end = closingBraceLocation.end;
    qf.emit.setFlags(outer, EmitFlags.NoComments);
    const statement = new qc.ReturnStatement(outer);
    statement.pos = closingBraceLocation.pos;
    qf.emit.setFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
    statements.push(statement);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
    const block = new qc.Block(new Nodes(statements).setRange(true));
    qf.emit.setFlags(block, EmitFlags.NoComments);
    return block;
  }
  function addExtendsHelperIfNeeded(statements: qc.Statement[], node: qt.ClassExpression | qt.ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypings | undefined): void {
    if (extendsClauseElem) {
      statements.push(new qc.ExpressionStatement(createExtendsHelper(context, qf.decl.internalName(node))).setRange(extendsClauseElem));
    }
  }
  function addConstructor(statements: qc.Statement[], node: qt.ClassExpression | qt.ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypings | undefined): void {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.ConstructorExcludes, HierarchyFacts.ConstructorIncludes);
    const constructor = qf.get.firstConstructorWithBody(node);
    const hasSynthesizedSuper = hasSynthesizedDefaultSuperCall(constructor, extendsClauseElem !== undefined);
    const constructorFunction = new qc.FunctionDeclaration(
      undefined,
      undefined,
      undefined,
      qf.decl.internalName(node),
      undefined,
      transformConstructorParams(constructor, hasSynthesizedSuper),
      undefined,
      transformConstructorBody(constructor, node, extendsClauseElem, hasSynthesizedSuper)
    );
    constructorFunction.setRange(constructor || node);
    if (extendsClauseElem) {
      qf.emit.setFlags(constructorFunction, EmitFlags.CapturesThis);
    }
    statements.push(constructorFunction);
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
  }
  function transformConstructorParams(constructor: qt.ConstructorDeclaration | undefined, hasSynthesizedSuper: boolean) {
    return qf.visit.params(constructor && !hasSynthesizedSuper ? constructor.params : undefined, visitor, context) || <qt.ParamDeclaration[]>[];
  }
  function createDefaultConstructorBody(node: qt.ClassDeclaration | qt.ClassExpression, isDerivedClass: boolean) {
    const statements: qc.Statement[] = [];
    resumeLexicalEnv();
    qc.mergeLexicalEnv(statements, endLexicalEnv());
    if (isDerivedClass) {
      statements.push(new qc.ReturnStatement(createDefaultSuperCallOrThis()));
    }
    const statementsArray = new Nodes(statements);
    statementsArray.setRange(node.members);
    const block = new qc.Block(statementsArray, true);
    block.setRange(node);
    qf.emit.setFlags(block, EmitFlags.NoComments);
    return block;
  }
  function transformConstructorBody(
    constructor: (ConstructorDeclaration & { body: qt.FunctionBody }) | undefined,
    node: qt.ClassDeclaration | qt.ClassExpression,
    extendsClauseElem: qc.ExpressionWithTypings | undefined,
    hasSynthesizedSuper: boolean
  ) {
    const isDerivedClass = !!extendsClauseElem && qf.skip.outerExpressions(extendsClauseElem.expression).kind !== Syntax.NullKeyword;
    if (!constructor) return createDefaultConstructorBody(node, isDerivedClass);
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    resumeLexicalEnv();
    let statementOffset = 0;
    if (!hasSynthesizedSuper) statementOffset = addStandardPrologue(prologue, constructor.body.statements, false);
    addDefaultValueAssignmentsIfNeeded(statements, constructor);
    addRestParamIfNeeded(statements, constructor, hasSynthesizedSuper);
    if (!hasSynthesizedSuper) statementOffset = addCustomPrologue(statements, constructor.body.statements, statementOffset, visitor);
    let superCallExpression: qc.Expression | undefined;
    if (hasSynthesizedSuper) {
      superCallExpression = createDefaultSuperCallOrThis();
    } else if (isDerivedClass && statementOffset < constructor.body.statements.length) {
      const firstStatement = constructor.body.statements[statementOffset];
      if (firstStatement.kind === Syntax.ExpressionStatement && qf.is.superCall(firstStatement.expression)) {
        superCallExpression = visitImmediateSuperCallInBody(firstStatement.expression);
      }
    }
    if (superCallExpression) {
      hierarchyFacts |= HierarchyFacts.ConstructorWithCapturedSuper;
      statementOffset++;
    }
    qu.addRange(statements, Nodes.visit(constructor.body.statements, visitor, qf.is.statement, statementOffset));
    qc.mergeLexicalEnv(prologue, endLexicalEnv());
    insertCaptureNewTargetIfNeeded(prologue, constructor, false);
    if (isDerivedClass) {
      if (superCallExpression && statementOffset === constructor.body.statements.length && !(constructor.body.trafoFlags & TrafoFlags.ContainsLexicalThis)) {
        const superCall = cast(cast(superCallExpression, isBinaryExpression).left, isCallExpression);
        const returnStatement = new qc.ReturnStatement(superCallExpression);
        qf.emit.setCommentRange(returnStatement, qf.emit.commentRange(superCall));
        qf.emit.setFlags(superCall, EmitFlags.NoComments);
        statements.push(returnStatement);
      } else {
        insertCaptureThisForNode(statements, constructor, superCallExpression || createActualThis());
        if (!isSufficientlyCoveredByReturnStatements(constructor.body)) {
          statements.push(new qc.ReturnStatement(qf.create.fileLevelUniqueName('_this')));
        }
      }
    } else {
      insertCaptureThisForNodeIfNeeded(prologue, constructor);
    }
    const block = new qc.Block(new Nodes(concatenate(prologue, statements)).setRange(true));
    block.setRange(constructor.body);
    return block;
  }
  function isSufficientlyCoveredByReturnStatements(statement: qc.Statement): boolean {
    if (statement.kind === Syntax.ReturnStatement) return true;
    else if (statement.kind === Syntax.IfStatement) {
      const ifStatement = statement as qt.IfStatement;
      if (ifStatement.elseStatement) return isSufficientlyCoveredByReturnStatements(ifStatement.thenStatement) && isSufficientlyCoveredByReturnStatements(ifStatement.elseStatement);
    } else if (statement.kind === Syntax.Block) {
      const lastStatement = lastOrUndefined((statement as qt.Block).statements);
      if (lastStatement && isSufficientlyCoveredByReturnStatements(lastStatement)) return true;
    }
    return false;
  }
  function createActualThis() {
    return qf.emit.setFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution);
  }
  function createDefaultSuperCallOrThis() {
    return qf.create.logicalOr(
      qf.create.logicalAnd(
        qf.create.strictInequality(qf.create.fileLevelUniqueName('_super'), new qc.NullLiteral()),
        qf.create.functionApply(qf.create.fileLevelUniqueName('_super'), createActualThis(), new qc.Identifier('args'))
      ),
      createActualThis()
    );
  }
  function visitParam(node: qt.ParamDeclaration): qt.ParamDeclaration | undefined {
    if (node.dot3Token) {
      return;
    } else if (node.name.kind === Syntax.BindingPattern) {
      return new qc.ParamDeclaration(undefined, undefined, undefined, qf.get.generatedNameForNode(node), undefined, undefined, undefined).setRange(node).setOriginal(node);
    } else if (node.initer) {
      return new qc.ParamDeclaration(undefined, undefined, undefined, undefined).setRange(node).setOriginal(node);
    }
    return node;
  }
  function hasDefaultValueOrBindingPattern(node: qt.ParamDeclaration) {
    return node.initer !== undefined || node.name.kind === Syntax.BindingPattern;
  }
  function addDefaultValueAssignmentsIfNeeded(statements: qc.Statement[], node: qt.FunctionLikeDeclaration): boolean {
    if (!some(node.params, hasDefaultValueOrBindingPattern)) return false;
    let added = false;
    for (const param of node.params) {
      const { name, initer, dot3Token } = param;
      if (dot3Token) {
        continue;
      }
      if (name.kind === Syntax.BindingPattern) {
        added = insertDefaultValueAssignmentForBindingPattern(statements, param, name, initer) || added;
      } else if (initer) {
        insertDefaultValueAssignmentForIniter(statements, param, name, initer);
        added = true;
      }
    }
    return added;
  }
  function insertDefaultValueAssignmentForBindingPattern(statements: qc.Statement[], param: qt.ParamDeclaration, name: qt.BindingPattern, initer: qc.Expression | undefined): boolean {
    if (name.elems.length > 0) {
      insertStatementAfterCustomPrologue(
        statements,
        qf.emit.setFlags(
          new qc.VariableStatement(undefined, new qc.VariableDeclarationList(flattenDestructuringBinding(param, visitor, context, FlattenLevel.All, qf.get.generatedNameForNode(param)))),
          EmitFlags.CustomPrologue
        )
      );
      return true;
    } else if (initer) {
      insertStatementAfterCustomPrologue(
        statements,
        qf.emit.setFlags(new qc.ExpressionStatement(qf.create.assignment(qf.get.generatedNameForNode(param), qf.visit.node(initer, visitor, isExpression))), EmitFlags.CustomPrologue)
      );
      return true;
    }
    return false;
  }
  function insertDefaultValueAssignmentForIniter(statements: qc.Statement[], param: qt.ParamDeclaration, name: qc.Identifier, initer: qc.Expression): void {
    initer = qf.visit.node(initer, visitor, isExpression);
    const statement = new qc.IfStatement(
      qf.create.typeCheck(qf.create.synthesizedClone(name), 'undefined'),
      qf.emit.setFlags(
        new qc.Block([
          new qc.ExpressionStatement(
            qf.emit.setFlags(
              qf.create
                .assignment(qf.emit.setFlags(qf.create.mutableClone(name), EmitFlags.NoSourceMap), qf.emit.setFlags(initer, EmitFlags.NoSourceMap | qf.get.emitFlags(initer) | EmitFlags.NoComments))
                .setRange(param),
              EmitFlags.NoComments
            )
          ),
        ]).setRange(param),
        EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments
      )
    );
    qf.emit.setStartsOnNewLine(statement);
    statement.setRange(param);
    qf.emit.setFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.CustomPrologue | EmitFlags.NoComments);
    insertStatementAfterCustomPrologue(statements, statement);
  }
  function shouldAddRestParam(node: qt.ParamDeclaration | undefined, inConstructorWithSynthesizedSuper: boolean): node is qt.ParamDeclaration {
    return !!(node && node.dot3Token && !inConstructorWithSynthesizedSuper);
  }
  function addRestParamIfNeeded(statements: qc.Statement[], node: qt.FunctionLikeDeclaration, inConstructorWithSynthesizedSuper: boolean): boolean {
    const prologueStatements: qc.Statement[] = [];
    const param = lastOrUndefined(node.params);
    if (!shouldAddRestParam(param, inConstructorWithSynthesizedSuper)) return false;
    const declarationName = param.name.kind === Syntax.Identifier ? qf.create.mutableClone(param.name) : qf.create.tempVariable(undefined);
    qf.emit.setFlags(declarationName, EmitFlags.NoSourceMap);
    const expressionName = param.name.kind === Syntax.Identifier ? qf.create.synthesizedClone(param.name) : declarationName;
    const restIndex = node.params.length - 1;
    const temp = qf.create.loopVariable();
    prologueStatements.push(
      qf.emit.setFlags(
        new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(declarationName, undefined, new qc.ArrayLiteralExpression([]))])).setRange(param),
        EmitFlags.CustomPrologue
      )
    );
    const forStatement = new qc.ForStatement(
      new qc.VariableDeclarationList([new qc.VariableDeclaration(temp, undefined, qc.asLiteral(restIndex))]).setRange(param),
      qf.create.lessThan(temp, new qc.PropertyAccessExpression(new qc.Identifier('args'), 'length')).setRange(param),
      qf.create.increment(temp).setRange(param),
      new qc.Block([
        qf.emit.setStartsOnNewLine(
          new qc.ExpressionStatement(
            qf.create.assignment(
              new qc.ElemAccessExpression(expressionName, restIndex === 0 ? temp : qf.create.subtract(temp, qc.asLiteral(restIndex))),
              new qc.ElemAccessExpression(new qc.Identifier('args'), temp)
            )
          ).setRange(param)
        ),
      ])
    );
    qf.emit.setFlags(forStatement, EmitFlags.CustomPrologue);
    qf.emit.setStartsOnNewLine(forStatement);
    prologueStatements.push(forStatement);
    if (param.name.kind !== Syntax.Identifier) {
      prologueStatements.push(
        qf.emit.setFlags(
          new qc.VariableStatement(undefined, new qc.VariableDeclarationList(flattenDestructuringBinding(param, visitor, context, FlattenLevel.All, expressionName))).setRange(param),
          EmitFlags.CustomPrologue
        )
      );
    }
    insertStatementsAfterCustomPrologue(statements, prologueStatements);
    return true;
  }
  function insertCaptureThisForNodeIfNeeded(statements: qc.Statement[], node: Node): boolean {
    if (hierarchyFacts & HierarchyFacts.CapturedLexicalThis && node.kind !== Syntax.ArrowFunction) {
      insertCaptureThisForNode(statements, node, new qc.ThisExpression());
      return true;
    }
    return false;
  }
  function insertCaptureThisForNode(statements: qc.Statement[], node: Node, initer: qc.Expression | undefined): void {
    enableSubstitutionsForCapturedThis();
    const captureThisStatement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(qf.create.fileLevelUniqueName('_this'), undefined, initer)]));
    qf.emit.setFlags(captureThisStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
    qf.emit.setSourceMapRange(captureThisStatement, node);
    insertStatementAfterCustomPrologue(statements, captureThisStatement);
  }
  function insertCaptureNewTargetIfNeeded(statements: qc.Statement[], node: qt.FunctionLikeDeclaration, copyOnWrite: boolean): qc.Statement[] {
    if (hierarchyFacts & HierarchyFacts.NewTarget) {
      let newTarget: qc.Expression;
      switch (node.kind) {
        case Syntax.ArrowFunction:
          return statements;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          newTarget = qc.VoidExpression.zero();
          break;
        case Syntax.Constructor:
          newTarget = new qc.PropertyAccessExpression(qf.emit.setFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), 'constructor');
          break;
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          newTarget = new qc.ConditionalExpression(
            qf.create.logicalAnd(
              qf.emit.setFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution),
              new qc.BinaryExpression(qf.emit.setFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), Syntax.InstanceOfKeyword, qf.decl.localName(node))
            ),
            new qc.PropertyAccessExpression(qf.emit.setFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), 'constructor'),
            qc.VoidExpression.zero()
          );
          break;
        default:
          return qu.failBadSyntax(node);
      }
      const captureNewTargetStatement = new qc.VariableStatement(
        undefined,
        new qc.VariableDeclarationList([new qc.VariableDeclaration(qf.create.fileLevelUniqueName('_newTarget'), undefined, newTarget)])
      );
      qf.emit.setFlags(captureNewTargetStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
      if (copyOnWrite) {
        statements = statements.slice();
      }
      insertStatementAfterCustomPrologue(statements, captureNewTargetStatement);
    }
    return statements;
  }
  function addClassMembers(statements: qc.Statement[], node: qt.ClassExpression | qt.ClassDeclaration): void {
    for (const member of node.members) {
      switch (member.kind) {
        case Syntax.SemicolonClassElem:
          statements.push(transformSemicolonClassElemToStatement(<qt.SemicolonClassElem>member));
          break;
        case Syntax.MethodDeclaration:
          statements.push(transformClassMethodDeclarationToStatement(getClassMemberPrefix(node, member), <qt.MethodDeclaration>member, node));
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const accessors = qf.get.allAccessorDeclarations(node.members, <qt.AccessorDeclaration>member);
          if (member === accessors.firstAccessor) {
            statements.push(transformAccessorsToStatement(getClassMemberPrefix(node, member), accessors, node));
          }
          break;
        case Syntax.Constructor:
          break;
        default:
          qu.failBadSyntax(member, currentSourceFile && currentSourceFile.fileName);
          break;
      }
    }
  }
  function transformSemicolonClassElemToStatement(member: qt.SemicolonClassElem) {
    return new qc.EmptyStatement().setRange(member);
  }
  function transformClassMethodDeclarationToStatement(receiver: qt.LeftExpression, member: qt.MethodDeclaration, container: Node) {
    const commentRange = qf.emit.commentRange(member);
    const sourceMapRange = qf.emit.sourceMapRange(member);
    const memberFunction = transformFunctionLikeToExpression(member, undefined, container);
    const propertyName = qf.visit.node(member.name, visitor, qf.is.propertyName);
    let e: qc.Expression;
    if (!propertyName.kind === Syntax.PrivateIdentifier && context.getCompilerOpts().useDefineForClassFields) {
      const name =
        propertyName.kind === Syntax.ComputedPropertyName
          ? propertyName.expression
          : propertyName.kind === Syntax.Identifier
          ? new qc.StringLiteral(qy.get.unescUnderscores(propertyName.escapedText))
          : propertyName;
      e = qf.create.objectDefinePropertyCall(receiver, name, qf.create.propertyDescriptor({ value: memberFunction, enumerable: false, writable: true, configurable: true }));
    } else {
      const memberName = qf.create.memberAccessForPropertyName(receiver, propertyName, member.name);
      e = qf.create.assignment(memberName, memberFunction);
    }
    qf.emit.setFlags(memberFunction, EmitFlags.NoComments);
    qf.emit.setSourceMapRange(memberFunction, sourceMapRange);
    const statement = new qc.ExpressionStatement(e).setRange(member);
    statement.setOriginal(member);
    qf.emit.setCommentRange(statement, commentRange);
    qf.emit.setFlags(statement, EmitFlags.NoSourceMap);
    return statement;
  }
  function transformAccessorsToStatement(receiver: qt.LeftExpression, accessors: qt.AllAccessorDeclarations, container: Node): qc.Statement {
    const statement = new qc.ExpressionStatement(transformAccessorsToExpression(receiver, accessors, container, false));
    qf.emit.setFlags(statement, EmitFlags.NoComments);
    qf.emit.setSourceMapRange(statement, qf.emit.sourceMapRange(accessors.firstAccessor));
    return statement;
  }
  function transformAccessorsToExpression(receiver: qt.LeftExpression, { firstAccessor, getAccessor, setAccessor }: qt.AllAccessorDeclarations, container: Node, startsOnNewLine: boolean): qc.Expression {
    const target = qf.create.mutableClone(receiver);
    qf.emit.setFlags(target, EmitFlags.NoComments | EmitFlags.NoTrailingSourceMap);
    qf.emit.setSourceMapRange(target, firstAccessor.name);
    const visitedAccessorName = qf.visit.node(firstAccessor.name, visitor, qf.is.propertyName);
    if (visitedAccessorName.kind === Syntax.PrivateIdentifier) return qu.failBadSyntax(visitedAccessorName, 'Encountered unhandled private identifier while transforming ES2015.');
    const propertyName = qf.create.expressionForPropertyName(visitedAccessorName);
    qf.emit.setFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoLeadingSourceMap);
    qf.emit.setSourceMapRange(propertyName, firstAccessor.name);
    const properties: qt.ObjectLiteralElemLike[] = [];
    if (getAccessor) {
      const getterFunction = transformFunctionLikeToExpression(getAccessor, undefined, container);
      qf.emit.setSourceMapRange(getterFunction, qf.emit.sourceMapRange(getAccessor));
      qf.emit.setFlags(getterFunction, EmitFlags.NoLeadingComments);
      const getter = new qc.PropertyAssignment('get', getterFunction);
      qf.emit.setCommentRange(getter, qf.emit.commentRange(getAccessor));
      properties.push(getter);
    }
    if (setAccessor) {
      const setterFunction = transformFunctionLikeToExpression(setAccessor, undefined, container);
      qf.emit.setSourceMapRange(setterFunction, qf.emit.sourceMapRange(setAccessor));
      qf.emit.setFlags(setterFunction, EmitFlags.NoLeadingComments);
      const setter = new qc.PropertyAssignment('set', setterFunction);
      qf.emit.setCommentRange(setter, qf.emit.commentRange(setAccessor));
      properties.push(setter);
    }
    properties.push(
      new qc.PropertyAssignment('enumerable', getAccessor || setAccessor ? new qc.BooleanLiteral(false) : new qc.BooleanLiteral(true)),
      new qc.PropertyAssignment('configurable', new qc.BooleanLiteral(true))
    );
    const call = new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'defineProperty'), undefined, [
      target,
      propertyName,
      new qc.ObjectLiteralExpression(properties, true),
    ]);
    if (startsOnNewLine) {
      qf.emit.setStartsOnNewLine(call);
    }
    return call;
  }
  function visitArrowFunction(node: qt.ArrowFunction) {
    if (node.trafoFlags & TrafoFlags.ContainsLexicalThis) {
      hierarchyFacts |= HierarchyFacts.CapturedLexicalThis;
    }
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.ArrowFunctionExcludes, HierarchyFacts.ArrowFunctionIncludes);
    const func = new qc.FunctionExpression(undefined, undefined, undefined, undefined, qf.visit.params(node.params, visitor, context), undefined, transformFunctionBody(node));
    func.setRange(node);
    func.setOriginal(node);
    qf.emit.setFlags(func, EmitFlags.CapturesThis);
    if (hierarchyFacts & HierarchyFacts.CapturedLexicalThis) {
      enableSubstitutionsForCapturedThis();
    }
    exitSubtree(ancestorFacts, HierarchyFacts.ArrowFunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return func;
  }
  function visitFunctionExpression(node: qt.FunctionExpression): qc.Expression {
    const ancestorFacts =
      qf.get.emitFlags(node) & EmitFlags.AsyncFunctionBody
        ? enterSubtree(HierarchyFacts.AsyncFunctionBodyExcludes, HierarchyFacts.AsyncFunctionBodyIncludes)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const params = qf.visit.params(node.params, visitor, context);
    const body = transformFunctionBody(node);
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? qf.decl.localName(node) : node.name;
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return node.update(undefined, params, undefined, body);
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): qt.FunctionDeclaration {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const params = qf.visit.params(node.params, visitor, context);
    const body = transformFunctionBody(node);
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? qf.decl.localName(node) : node.name;
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), node.asteriskToken, name, undefined, params, undefined, body);
  }
  function transformFunctionLikeToExpression(node: qt.FunctionLikeDeclaration, location: TextRange | undefined, name: qc.Identifier | undefined, container: Node | undefined): qt.FunctionExpression {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts =
      container && qf.is.classLike(container) && !qf.has.syntacticModifier(node, ModifierFlags.Static)
        ? enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes | HierarchyFacts.NonStaticClassElem)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const params = qf.visit.params(node.params, visitor, context);
    const body = transformFunctionBody(node);
    if (hierarchyFacts & HierarchyFacts.NewTarget && !name && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression)) {
      name = qf.get.generatedNameForNode(node);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return new qc.FunctionExpression(undefined, params, undefined, body).setRange(location).setOriginal(node);
  }
  function transformFunctionBody(node: qt.FunctionLikeDeclaration) {
    let multiLine = false;
    let singleLine = false;
    let statementsLocation: TextRange;
    let closeBraceLocation: TextRange | undefined;
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    const body = node.body!;
    let statementOffset: number | undefined;
    resumeLexicalEnv();
    if (body.kind === Syntax.Block) {
      statementOffset = addStandardPrologue(prologue, body.statements, false);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, qf.stmt.is.hoistedFunction);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, qf.stmt.is.hoistedVariableStatement);
    }
    multiLine = addDefaultValueAssignmentsIfNeeded(statements, node) || multiLine;
    multiLine = addRestParamIfNeeded(statements, node, false) || multiLine;
    if (body.kind === Syntax.Block) {
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor);
      statementsLocation = body.statements;
      qu.addRange(statements, Nodes.visit(body.statements, visitor, qf.is.statement, statementOffset));
      if (!multiLine && body.multiLine) {
        multiLine = true;
      }
    } else {
      qf.assert.true(node.kind === Syntax.ArrowFunction);
      statementsLocation = moveRangeEnd(body, -1);
      const equalsGreaterThanToken = node.equalsGreaterThanToken;
      if (!qf.is.synthesized(equalsGreaterThanToken) && !qf.is.synthesized(body)) {
        if (endOnSameLineAsStart(equalsGreaterThanToken, body, currentSourceFile)) {
          singleLine = true;
        } else {
          multiLine = true;
        }
      }
      const expression = qf.visit.node(body, visitor, isExpression);
      const returnStatement = new qc.ReturnStatement(expression);
      returnStatement.setRange(body);
      qf.emit.moveSyntheticComments(returnStatement, body);
      qf.emit.setFlags(returnStatement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTrailingComments);
      statements.push(returnStatement);
      closeBraceLocation = body;
    }
    qc.mergeLexicalEnv(prologue, endLexicalEnv());
    insertCaptureNewTargetIfNeeded(prologue, node, false);
    insertCaptureThisForNodeIfNeeded(prologue, node);
    if (some(prologue)) {
      multiLine = true;
    }
    statements.unshift(...prologue);
    if (body.kind === Syntax.Block && arrayIsEqualTo(statements, body.statements)) return body;
    const block = new qc.Block(new Nodes(statements), statementsLocation).setRange(multiLine);
    block.setRange(node.body);
    if (!multiLine && singleLine) {
      qf.emit.setFlags(block, EmitFlags.SingleLine);
    }
    if (closeBraceLocation) {
      qf.emit.setTokenSourceMapRange(block, Syntax.CloseBraceToken, closeBraceLocation);
    }
    block.setOriginal(node.body);
    return block;
  }
  function visitBlock(node: qt.Block, isFunctionBody: boolean): qt.Block {
    if (isFunctionBody) return qf.visit.children(node, visitor, context);
    const ancestorFacts =
      hierarchyFacts & HierarchyFacts.IterationStmt
        ? enterSubtree(HierarchyFacts.IterationStmtBlockExcludes, HierarchyFacts.IterationStmtBlockIncludes)
        : enterSubtree(HierarchyFacts.BlockExcludes, HierarchyFacts.BlockIncludes);
    const updated = qf.visit.children(node, visitor, context);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitExpressionStatement(node: qc.ExpressionStatement): qc.Statement {
    switch (node.expression.kind) {
      case Syntax.ParenthesizedExpression:
        return node.update(visitParenthesizedExpression(<qt.ParenthesizedExpression>node.expression, false));
      case Syntax.BinaryExpression:
        return node.update(visitBinaryExpression(<qt.BinaryExpression>node.expression, false));
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitParenthesizedExpression(node: qt.ParenthesizedExpression, needsDestructuringValue: boolean): qt.ParenthesizedExpression {
    if (!needsDestructuringValue) {
      switch (node.expression.kind) {
        case Syntax.ParenthesizedExpression:
          return node.update(visitParenthesizedExpression(<qt.ParenthesizedExpression>node.expression, false));
        case Syntax.BinaryExpression:
          return node.update(visitBinaryExpression(<qt.BinaryExpression>node.expression, false));
      }
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitBinaryExpression(node: qt.BinaryExpression, needsDestructuringValue: boolean): qc.Expression {
    if (qf.is.destructuringAssignment(node)) return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, needsDestructuringValue);
    return qf.visit.children(node, visitor, context);
  }
  function isVariableStatementOfTypeScriptClassWrapper(node: qt.VariableStatement) {
    return (
      node.declarationList.declarations.length === 1 &&
      !!node.declarationList.declarations[0].initer &&
      !!(qf.get.emitFlags(node.declarationList.declarations[0].initer) & EmitFlags.TypeScriptClassWrapper)
    );
  }
  function visitVariableStatement(node: qt.VariableStatement): qc.Statement | undefined {
    const ancestorFacts = enterSubtree(HierarchyFacts.None, qf.has.syntacticModifier(node, ModifierFlags.Export) ? HierarchyFacts.ExportedVariableStatement : HierarchyFacts.None);
    let updated: qc.Statement | undefined;
    if (convertedLoopState && (node.declarationList.flags & NodeFlags.BlockScoped) === 0 && !isVariableStatementOfTypeScriptClassWrapper(node)) {
      let assignments: qc.Expression[] | undefined;
      for (const decl of node.declarationList.declarations) {
        hoistVariableDeclarationDeclaredInConvertedLoop(convertedLoopState, decl);
        if (decl.initer) {
          let assignment: qc.Expression;
          if (decl.name.kind === Syntax.BindingPattern) {
            assignment = flattenDestructuringAssignment(decl, visitor, context, FlattenLevel.All);
          } else {
            assignment = new qc.BinaryExpression(decl.name, Syntax.EqualsToken, qf.visit.node(decl.initer, visitor, isExpression));
            assignment.setRange(decl);
          }
          assignments = append(assignments, assignment);
        }
      }
      if (assignments) {
        updated = new qc.ExpressionStatement(inlineExpressions(assignments)).setRange(node);
      } else {
        updated = undefined;
      }
    } else {
      updated = qf.visit.children(node, visitor, context);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitVariableDeclarationList(node: qt.VariableDeclarationList): qt.VariableDeclarationList {
    if (node.flags & NodeFlags.BlockScoped || node.trafoFlags & TrafoFlags.ContainsBindingPattern) {
      if (node.flags & NodeFlags.BlockScoped) {
        enableSubstitutionsForBlockScopedBindings();
      }
      const declarations = flatMap(node.declarations, node.flags & NodeFlags.Let ? visitVariableDeclarationInLetDeclarationList : visitVariableDeclaration);
      const declarationList = new qc.VariableDeclarationList(declarations);
      declarationList.setOriginal(node);
      declarationList.setRange(node);
      qf.emit.setCommentRange(declarationList, node);
      if ((node.trafoFlags & TrafoFlags.ContainsBindingPattern && node.declarations[0].name.kind === Syntax.BindingPattern) || qu.last(node.declarations).name.kind === Syntax.BindingPattern) {
        qf.emit.setSourceMapRange(declarationList, getRangeUnion(declarations));
      }
      return declarationList;
    }
    return qf.visit.children(node, visitor, context);
  }
  function getRangeUnion(declarations: readonly Node[]): TextRange {
    let pos = -1,
      end = -1;
    for (const node of declarations) {
      pos = pos === -1 ? node.pos : node.pos === -1 ? pos : Math.min(pos, node.pos);
      end = Math.max(end, node.end);
    }
    return createRange(pos, end);
  }
  function shouldEmitExplicitIniterForLetDeclaration(node: qt.VariableDeclaration) {
    const flags = resolver.getNodeCheckFlags(node);
    const isCapturedInFunction = flags & NodeCheckFlags.CapturedBlockScopedBinding;
    const isDeclaredInLoop = flags & NodeCheckFlags.BlockScopedBindingInLoop;
    const emittedAsTopLevel = (hierarchyFacts & HierarchyFacts.TopLevel) !== 0 || (isCapturedInFunction && isDeclaredInLoop && (hierarchyFacts & HierarchyFacts.IterationStmtBlock) !== 0);
    const emitExplicitIniter =
      !emittedAsTopLevel &&
      (hierarchyFacts & HierarchyFacts.ForInOrForOfStatement) === 0 &&
      (!resolver.isDeclarationWithCollidingName(node) || (isDeclaredInLoop && !isCapturedInFunction && (hierarchyFacts & (HierarchyFacts.ForStatement | HierarchyFacts.ForInOrForOfStatement)) === 0));
    return emitExplicitIniter;
  }
  function visitVariableDeclarationInLetDeclarationList(node: qt.VariableDeclaration) {
    const name = node.name;
    if (name.kind === Syntax.BindingPattern) return visitVariableDeclaration(node);
    if (!node.initer && shouldEmitExplicitIniterForLetDeclaration(node)) {
      const clone = qf.create.mutableClone(node);
      clone.initer = qc.VoidExpression.zero();
      return clone;
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitVariableDeclaration(node: qt.VariableDeclaration): VisitResult<qt.VariableDeclaration> {
    const ancestorFacts = enterSubtree(HierarchyFacts.ExportedVariableStatement, HierarchyFacts.None);
    let updated: VisitResult<qt.VariableDeclaration>;
    if (node.name.kind === Syntax.BindingPattern) {
      updated = flattenDestructuringBinding(node, visitor, context, FlattenLevel.All, undefined, (ancestorFacts & HierarchyFacts.ExportedVariableStatement) !== 0);
    } else {
      updated = qf.visit.children(node, visitor, context);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function recordLabel(node: qt.LabeledStatement) {
    convertedLoopState!.labels!.set(idText(node.label), true);
  }
  function resetLabel(node: qt.LabeledStatement) {
    convertedLoopState!.labels!.set(idText(node.label), false);
  }
  function visitLabeledStatement(node: qt.LabeledStatement): VisitResult<qt.Statement> {
    if (convertedLoopState && !convertedLoopState.labels) {
      convertedLoopState.labels = qu.createMap<boolean>();
    }
    const statement = unwrapInnermostStatementOfLabel(node, convertedLoopState && recordLabel);
    return qf.is.iterationStatement(statement, false)
      ? visitIterationStmt(statement, node)
      : restoreEnclosingLabel(qf.visit.node(statement, visitor, qf.is.statement, qc.liftToBlock), node, convertedLoopState && resetLabel);
  }
  function visitIterationStmt(node: qt.IterationStmt, outermostLabeledStatement: qt.LabeledStatement) {
    switch (node.kind) {
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        return visitDoOrWhileStatement(<qt.DoStatement | qt.WhileStatement>node, outermostLabeledStatement);
      case Syntax.ForStatement:
        return visitForStatement(<qt.ForStatement>node, outermostLabeledStatement);
      case Syntax.ForInStatement:
        return visitForInStatement(<qt.ForInStatement>node, outermostLabeledStatement);
      case Syntax.ForOfStatement:
        return visitForOfStatement(<qt.ForOfStatement>node, outermostLabeledStatement);
    }
  }
  function visitIterationStmtWithFacts(
    excludeFacts: HierarchyFacts,
    includeFacts: HierarchyFacts,
    node: qt.IterationStmt,
    outermostLabeledStatement: qt.LabeledStatement | undefined,
    convert?: LoopConverter
  ) {
    const ancestorFacts = enterSubtree(excludeFacts, includeFacts);
    const updated = convertIterationStmtBodyIfNecessary(node, outermostLabeledStatement, ancestorFacts, convert);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitDoOrWhileStatement(node: qt.DoStatement | qt.WhileStatement, outermostLabeledStatement: qt.LabeledStatement | undefined) {
    return visitIterationStmtWithFacts(HierarchyFacts.DoOrWhileStatementExcludes, HierarchyFacts.DoOrWhileStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForStatement(node: qt.ForStatement, outermostLabeledStatement: qt.LabeledStatement | undefined) {
    return visitIterationStmtWithFacts(HierarchyFacts.ForStatementExcludes, HierarchyFacts.ForStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForInStatement(node: qt.ForInStatement, outermostLabeledStatement: qt.LabeledStatement | undefined) {
    return visitIterationStmtWithFacts(HierarchyFacts.ForInOrForOfStatementExcludes, HierarchyFacts.ForInOrForOfStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForOfStatement(node: qt.ForOfStatement, outermostLabeledStatement: qt.LabeledStatement | undefined): VisitResult<qt.Statement> {
    return visitIterationStmtWithFacts(
      HierarchyFacts.ForInOrForOfStatementExcludes,
      HierarchyFacts.ForInOrForOfStatementIncludes,
      node,
      outermostLabeledStatement,
      compilerOpts.downlevelIteration ? convertForOfStatementForIterable : convertForOfStatementForArray
    );
  }
  function convertForOfStatementHead(node: qt.ForOfStatement, boundValue: qc.Expression, convertedLoopBodyStatements: qc.Statement[]) {
    const statements: qc.Statement[] = [];
    const initer = node.initer;
    if (initer.kind === Syntax.VariableDeclarationList) {
      if (node.initer.flags & NodeFlags.BlockScoped) {
        enableSubstitutionsForBlockScopedBindings();
      }
      const firstOriginalDeclaration = firstOrUndefined(initer.declarations);
      if (firstOriginalDeclaration && firstOriginalDeclaration.name.kind === Syntax.BindingPattern) {
        const declarations = flattenDestructuringBinding(firstOriginalDeclaration, visitor, context, FlattenLevel.All, boundValue);
        const declarationList = new qc.VariableDeclarationList(declarations).setRange(node.initer);
        declarationList.setOriginal(node.initer);
        qf.emit.setSourceMapRange(declarationList, createRange(declarations[0].pos, last(declarations).end));
        statements.push(new qc.VariableStatement(undefined, declarationList));
      } else {
        statements.push(
          new qc.VariableStatement(
            undefined,
            setOriginalNode(
              new qc.VariableDeclarationList([new qc.VariableDeclaration(firstOriginalDeclaration ? firstOriginalDeclaration.name : qf.create.tempVariable(undefined), undefined, boundValue)]).setRange(
                moveRangePos(initer, -1)
              ),
              initer
            )
          ).setRange(moveRangeEnd(initer, -1))
        );
      }
    } else {
      const assignment = qf.create.assignment(initer, boundValue);
      if (qf.is.destructuringAssignment(assignment)) {
        qf.calc.aggregate(assignment);
        statements.push(new qc.ExpressionStatement(visitBinaryExpression(assignment, false)));
      } else {
        assignment.end = initer.end;
        statements.push(new qc.ExpressionStatement(qf.visit.node(assignment, visitor, isExpression)).setRange(moveRangeEnd(initer, -1)));
      }
    }
    if (convertedLoopBodyStatements) return createSyntheticBlockForConvertedStatements(addRange(statements, convertedLoopBodyStatements));
    else {
      const statement = qf.visit.node(node.statement, visitor, qf.is.statement, qc.liftToBlock);
      if (statement.kind === Syntax.Block) return statement.update(new Nodes(concatenate(statements, statement.statements)).setRange(statement.statements));
      statements.push(statement);
      return createSyntheticBlockForConvertedStatements(statements);
    }
  }
}
function createSyntheticBlockForConvertedStatements(statements: qc.Statement[]) {
  return qf.emit.setFlags(new qc.Block(new Nodes(statements), true), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
}
function convertForOfStatementForArray(node: qt.ForOfStatement, outermostLabeledStatement: qt.LabeledStatement, convertedLoopBodyStatements: qc.Statement[]): qc.Statement {
  const expression = qf.visit.node(node.expression, visitor, isExpression);
  const counter = qf.create.loopVariable();
  const rhsReference = expression.kind === Syntax.Identifier ? qf.get.generatedNameForNode(expression) : qf.create.tempVariable(undefined);
  qf.emit.setFlags(expression, EmitFlags.NoSourceMap | qf.get.emitFlags(expression));
  const forStatement = new qc.ForStatement(
    qf.emit.setFlags(
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(counter, undefined, qc.asLiteral(0)).setRange(moveRangePos(node.expression, -1)),
        new qc.VariableDeclaration(rhsReference, undefined, expression).setRange(node.expression),
      ]).setRange(node.expression),
      EmitFlags.NoHoisting
    ),
    qf.create.lessThan(counter, new qc.PropertyAccessExpression(rhsReference, 'length')).setRange(node.expression),
    qf.create.increment(counter).setRange(node.expression),
    convertForOfStatementHead(node, new qc.ElemAccessExpression(rhsReference, counter), convertedLoopBodyStatements)
  ).setRange(node);
  qf.emit.setFlags(forStatement, EmitFlags.NoTokenTrailingSourceMaps);
  forStatement.setRange(node);
  return restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel);
}
function convertForOfStatementForIterable(node: qt.ForOfStatement, outermostLabeledStatement: qt.LabeledStatement, convertedLoopBodyStatements: qc.Statement[], ancestorFacts: HierarchyFacts): qc.Statement {
  const expression = qf.visit.node(node.expression, visitor, isExpression);
  const iterator = expression.kind === Syntax.Identifier ? qf.get.generatedNameForNode(expression) : qf.create.tempVariable(undefined);
  const result = expression.kind === Syntax.Identifier ? qf.get.generatedNameForNode(iterator) : qf.create.tempVariable(undefined);
  const errorRecord = qf.create.uniqueName('e');
  const catchVariable = qf.get.generatedNameForNode(errorRecord);
  const returnMethod = qf.create.tempVariable(undefined);
  const values = createValuesHelper(context, expression, node.expression);
  const next = new qc.CallExpression(new qc.PropertyAccessExpression(iterator, 'next'), undefined, []);
  hoistVariableDeclaration(errorRecord);
  hoistVariableDeclaration(returnMethod);
  const initer = ancestorFacts & HierarchyFacts.IterationContainer ? inlineExpressions([qf.create.assignment(errorRecord, qc.VoidExpression.zero()), values]) : values;
  const forStatement = qf.emit.setFlags(
    new qc.ForStatement(
      qf.emit.setFlags(
        new qc.VariableDeclarationList([new qc.VariableDeclaration(iterator, undefined, initer).setRange(node.expression), new qc.VariableDeclaration(result, undefined, next)]).setRange(
          node.expression
        ),
        EmitFlags.NoHoisting
      ),
      qf.create.logicalNot(new qc.PropertyAccessExpression(result, 'done')),
      qf.create.assignment(result, next),
      convertForOfStatementHead(node, new qc.PropertyAccessExpression(result, 'value'), convertedLoopBodyStatements)
    ).setRange(node),
    EmitFlags.NoTokenTrailingSourceMaps
  );
  return new qc.TryStatement(
    new qc.Block([restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel)]),
    new qc.CatchClause(
      new qc.VariableDeclaration(catchVariable),
      qf.emit.setFlags(
        new qc.Block([new qc.ExpressionStatement(qf.create.assignment(errorRecord, new qc.ObjectLiteralExpression([new qc.PropertyAssignment('error', catchVariable)])))]),
        EmitFlags.SingleLine
      )
    ),
    new qc.Block([
      new qc.TryStatement(
        new qc.Block([
          qf.emit.setFlags(
            new qc.IfStatement(
              qf.create.logicalAnd(
                qf.create.logicalAnd(result, qf.create.logicalNot(new qc.PropertyAccessExpression(result, 'done'))),
                qf.create.assignment(returnMethod, new qc.PropertyAccessExpression(iterator, 'return'))
              ),
              new qc.ExpressionStatement(qf.create.functionCall(returnMethod, iterator, []))
            ),
            EmitFlags.SingleLine
          ),
        ]),
        undefined,
        qf.emit.setFlags(
          new qc.Block([qf.emit.setFlags(new qc.IfStatement(errorRecord, new qc.ThrowStatement(new qc.PropertyAccessExpression(errorRecord, 'error'))), EmitFlags.SingleLine)]),
          EmitFlags.SingleLine
        )
      ),
    ])
  );
}
function visitObjectLiteralExpression(node: qt.ObjectLiteralExpression): qc.Expression {
  const properties = node.properties;
  const numProperties = properties.length;
  let numInitialProperties = numProperties;
  let numInitialPropertiesWithoutYield = numProperties;
  for (let i = 0; i < numProperties; i++) {
    const property = properties[i];
    if (property.trafoFlags & TrafoFlags.ContainsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody && i < numInitialPropertiesWithoutYield) {
      numInitialPropertiesWithoutYield = i;
    }
    if (qf.check.defined(property.name).kind === Syntax.ComputedPropertyName) {
      numInitialProperties = i;
      break;
    }
  }
  if (numInitialProperties !== numProperties) {
    if (numInitialPropertiesWithoutYield < numInitialProperties) {
      numInitialProperties = numInitialPropertiesWithoutYield;
    }
    const temp = qf.create.tempVariable(hoistVariableDeclaration);
    const expressions: qc.Expression[] = [];
    const assignment = qf.create.assignment(
      temp,
      qf.emit.setFlags(new qc.ObjectLiteralExpression(Nodes.visit(properties, visitor, isObjectLiteralElemLike, 0, numInitialProperties), node.multiLine), EmitFlags.Indented)
    );
    if (node.multiLine) {
      qf.emit.setStartsOnNewLine(assignment);
    }
    expressions.push(assignment);
    addObjectLiteralMembers(expressions, node, temp, numInitialProperties);
    expressions.push(node.multiLine ? qf.emit.setStartsOnNewLine(qf.create.mutableClone(temp)) : temp);
    return inlineExpressions(expressions);
  }
  return qf.visit.children(node, visitor, context);
}
interface ForStatementWithConvertibleIniter extends qt.ForStatement {
  initer: qt.VariableDeclarationList;
}
interface ForStatementWithConvertibleCondition extends qt.ForStatement {
  condition: qc.Expression;
}
interface ForStatementWithConvertibleIncrementor extends qt.ForStatement {
  incrementor: qc.Expression;
}
function shouldConvertPartOfIterationStmt(node: Node) {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ContainsCapturedBlockScopeBinding) !== 0;
}
function shouldConvertIniterOfForStatement(node: qt.IterationStmt): node is ForStatementWithConvertibleIniter {
  return node.kind === Syntax.ForStatement && !!node.initer && shouldConvertPartOfIterationStmt(node.initer);
}
function shouldConvertConditionOfForStatement(node: qt.IterationStmt): node is ForStatementWithConvertibleCondition {
  return node.kind === Syntax.ForStatement && !!node.condition && shouldConvertPartOfIterationStmt(node.condition);
}
function shouldConvertIncrementorOfForStatement(node: qt.IterationStmt): node is ForStatementWithConvertibleIncrementor {
  return node.kind === Syntax.ForStatement && !!node.incrementor && shouldConvertPartOfIterationStmt(node.incrementor);
}
function shouldConvertIterationStmt(node: qt.IterationStmt) {
  return shouldConvertBodyOfIterationStmt(node) || shouldConvertIniterOfForStatement(node);
}
function shouldConvertBodyOfIterationStmt(node: qt.IterationStmt): boolean {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.LoopWithCapturedBlockScopedBinding) !== 0;
}
function hoistVariableDeclarationDeclaredInConvertedLoop(state: ConvertedLoopState, node: qt.VariableDeclaration): void {
  if (!state.hoistedLocalVariables) {
    state.hoistedLocalVariables = [];
  }
  visit(node.name);
  function visit(node: qc.Identifier | qt.BindingPattern) {
    if (node.kind === Syntax.Identifier) {
      state.hoistedLocalVariables!.push(node);
    } else {
      for (const elem of node.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          visit(elem.name);
        }
      }
    }
  }
}
function convertIterationStmtBodyIfNecessary(
  node: qt.IterationStmt,
  outermostLabeledStatement: qt.LabeledStatement | undefined,
  ancestorFacts: HierarchyFacts,
  convert?: LoopConverter
): VisitResult<qt.Statement> {
  if (!shouldConvertIterationStmt(node)) {
    let saveAllowedNonLabeledJumps: Jump | undefined;
    if (convertedLoopState) {
      saveAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
      convertedLoopState.allowedNonLabeledJumps = Jump.Break | Jump.Continue;
    }
    const result = convert
      ? convert(node, outermostLabeledStatement, undefined, ancestorFacts)
      : restoreEnclosingLabel(qf.visit.children(node, visitor, context), outermostLabeledStatement, convertedLoopState && resetLabel);
    if (convertedLoopState) {
      convertedLoopState.allowedNonLabeledJumps = saveAllowedNonLabeledJumps;
    }
    return result;
  }
  const currentState = createConvertedLoopState(node);
  const statements: qc.Statement[] = [];
  const outerConvertedLoopState = convertedLoopState;
  convertedLoopState = currentState;
  const initerFunction = shouldConvertIniterOfForStatement(node) ? createFunctionForIniterOfForStatement(node, currentState) : undefined;
  const bodyFunction = shouldConvertBodyOfIterationStmt(node) ? createFunctionForBodyOfIterationStmt(node, currentState, outerConvertedLoopState) : undefined;
  convertedLoopState = outerConvertedLoopState;
  if (initerFunction) statements.push(initerFunction.functionDeclaration);
  if (bodyFunction) statements.push(bodyFunction.functionDeclaration);
  addExtraDeclarationsForConvertedLoop(statements, currentState, outerConvertedLoopState);
  if (initerFunction) {
    statements.push(generateCallToConvertedLoopIniter(initerFunction.functionName, initerFunction.containsYield));
  }
  let loop: qc.Statement;
  if (bodyFunction) {
    if (convert) {
      loop = convert(node, outermostLabeledStatement, bodyFunction.part, ancestorFacts);
    } else {
      const clone = convertIterationStmtCore(node, initerFunction, new qc.Block(bodyFunction.part, true));
      qf.calc.aggregate(clone);
      loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
    }
  } else {
    const clone = convertIterationStmtCore(node, initerFunction, qf.visit.node(node.statement, visitor, qf.is.statement, qc.liftToBlock));
    qf.calc.aggregate(clone);
    loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
  }
  statements.push(loop);
  return statements;
}
function convertIterationStmtCore(node: qt.IterationStmt, initerFunction: IterationStmtPartFunction<qt.VariableDeclarationList> | undefined, convertedLoopBody: qc.Statement) {
  switch (node.kind) {
    case Syntax.ForStatement:
      return convertForStatement(node as qt.ForStatement, initerFunction, convertedLoopBody);
    case Syntax.ForInStatement:
      return convertForInStatement(node as qt.ForInStatement, convertedLoopBody);
    case Syntax.ForOfStatement:
      return convertForOfStatement(node as qt.ForOfStatement, convertedLoopBody);
    case Syntax.DoStatement:
      return convertDoStatement(node as qt.DoStatement, convertedLoopBody);
    case Syntax.WhileStatement:
      return convertWhileStatement(node as qt.WhileStatement, convertedLoopBody);
    default:
      return qu.failBadSyntax(node, 'IterationStmt expected');
  }
}
function convertForStatement(node: qt.ForStatement, initerFunction: IterationStmtPartFunction<qt.VariableDeclarationList> | undefined, convertedLoopBody: qc.Statement) {
  const shouldConvertCondition = node.condition && shouldConvertPartOfIterationStmt(node.condition);
  const shouldConvertIncrementor = shouldConvertCondition || (node.incrementor && shouldConvertPartOfIterationStmt(node.incrementor));
  return updateFor(
    node,
    qf.visit.node(initerFunction ? initerFunction.part : node.initer, visitor, isForIniter),
    qf.visit.node(shouldConvertCondition ? undefined : node.condition, visitor, isExpression),
    qf.visit.node(shouldConvertIncrementor ? undefined : node.incrementor, visitor, isExpression),
    convertedLoopBody
  );
}
function convertForOfStatement(node: qt.ForOfStatement, convertedLoopBody: qc.Statement) {
  return node.update(undefined, qf.visit.node(node.initer, visitor, isForIniter), qf.visit.node(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertForInStatement(node: qt.ForInStatement, convertedLoopBody: qc.Statement) {
  return node.update(qf.visit.node(node.initer, visitor, isForIniter), qf.visit.node(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertDoStatement(node: qt.DoStatement, convertedLoopBody: qc.Statement) {
  return node.update(convertedLoopBody, qf.visit.node(node.expression, visitor, isExpression));
}
function convertWhileStatement(node: qt.WhileStatement, convertedLoopBody: qc.Statement) {
  return node.update(qf.visit.node(node.expression, visitor, isExpression), convertedLoopBody);
}
function createConvertedLoopState(node: qt.IterationStmt) {
  let loopIniter: qt.VariableDeclarationList | undefined;
  switch (node.kind) {
    case Syntax.ForStatement:
    case Syntax.ForInStatement:
    case Syntax.ForOfStatement:
      const initer = (<qt.ForStatement | qt.ForInStatement | qt.ForOfStatement>node).initer;
      if (initer && initer.kind === Syntax.VariableDeclarationList) {
        loopIniter = <qt.VariableDeclarationList>initer;
      }
      break;
  }
  const loopParams: qt.ParamDeclaration[] = [];
  const loopOutParams: LoopOutParam[] = [];
  if (loopIniter && qf.get.combinedFlagsOf(loopIniter) & NodeFlags.BlockScoped) {
    const hasCapturedBindingsInForIniter = shouldConvertIniterOfForStatement(node);
    for (const decl of loopIniter.declarations) {
      processLoopVariableDeclaration(node, decl, loopParams, loopOutParams, hasCapturedBindingsInForIniter);
    }
  }
  const currentState: ConvertedLoopState = { loopParams, loopOutParams };
  if (convertedLoopState) {
    if (convertedLoopState.argsName) {
      currentState.argsName = convertedLoopState.argsName;
    }
    if (convertedLoopState.thisName) {
      currentState.thisName = convertedLoopState.thisName;
    }
    if (convertedLoopState.hoistedLocalVariables) {
      currentState.hoistedLocalVariables = convertedLoopState.hoistedLocalVariables;
    }
  }
  return currentState;
}
function addExtraDeclarationsForConvertedLoop(statements: qc.Statement[], state: ConvertedLoopState, outerState: ConvertedLoopState | undefined) {
  let extraVariableDeclarations: qt.VariableDeclaration[] | undefined;
  if (state.argsName) {
    if (outerState) {
      outerState.argsName = state.argsName;
    } else {
      (extraVariableDeclarations || (extraVariableDeclarations = [])).push(new qc.VariableDeclaration(state.argsName, undefined, new qc.Identifier('args')));
    }
  }
  if (state.thisName) {
    if (outerState) {
      outerState.thisName = state.thisName;
    } else {
      (extraVariableDeclarations || (extraVariableDeclarations = [])).push(new qc.VariableDeclaration(state.thisName, undefined, new qc.Identifier('this')));
    }
  }
  if (state.hoistedLocalVariables) {
    if (outerState) {
      outerState.hoistedLocalVariables = state.hoistedLocalVariables;
    } else {
      if (!extraVariableDeclarations) {
        extraVariableDeclarations = [];
      }
      for (const identifier of state.hoistedLocalVariables) {
        extraVariableDeclarations.push(new qc.VariableDeclaration(identifier));
      }
    }
  }
  if (state.loopOutParams.length) {
    if (!extraVariableDeclarations) {
      extraVariableDeclarations = [];
    }
    for (const outParam of state.loopOutParams) {
      extraVariableDeclarations.push(new qc.VariableDeclaration(outParam.outParamName));
    }
  }
  if (state.conditionVariable) {
    if (!extraVariableDeclarations) {
      extraVariableDeclarations = [];
    }
    extraVariableDeclarations.push(new qc.VariableDeclaration(state.conditionVariable, undefined, new qc.BooleanLiteral(false)));
  }
  if (extraVariableDeclarations) {
    statements.push(new qc.VariableStatement(undefined, new qc.VariableDeclarationList(extraVariableDeclarations)));
  }
}
interface IterationStmtPartFunction<T> {
  functionName: qc.Identifier;
  functionDeclaration: qc.Statement;
  containsYield: boolean;
  part: T;
}
function createOutVariable(p: LoopOutParam) {
  return new qc.VariableDeclaration(p.originalName, undefined, p.outParamName);
}
function createFunctionForIniterOfForStatement(node: ForStatementWithConvertibleIniter, currentState: ConvertedLoopState): IterationStmtPartFunction<qt.VariableDeclarationList> {
  const functionName = qf.create.uniqueName('_loop_init');
  const containsYield = (node.initer.trafoFlags & TrafoFlags.ContainsYield) !== 0;
  let emitFlags = EmitFlags.None;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody) emitFlags |= EmitFlags.AsyncFunctionBody;
  const statements: qc.Statement[] = [];
  statements.push(new qc.VariableStatement(undefined, node.initer));
  copyOutParams(currentState.loopOutParams, LoopOutParamFlags.Initer, CopyDirection.ToOutParam, statements);
  const functionDeclaration = new qc.VariableStatement(
    undefined,
    qf.emit.setFlags(
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(
          functionName,
          undefined,
          qf.emit.setFlags(
            new qc.FunctionExpression(
              undefined,
              containsYield ? new qc.Token(Syntax.AsteriskToken) : undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              qf.visit.node(new qc.Block(statements, true), visitor, isBlock)
            ),
            emitFlags
          )
        ),
      ]),
      EmitFlags.NoHoisting
    )
  );
  const part = new qc.VariableDeclarationList(map(currentState.loopOutParams, createOutVariable));
  return { functionName, containsYield, functionDeclaration, part };
}
function createFunctionForBodyOfIterationStmt(node: qt.IterationStmt, currentState: ConvertedLoopState, outerState: ConvertedLoopState | undefined): IterationStmtPartFunction<qt.Statement[]> {
  const functionName = qf.create.uniqueName('_loop');
  startLexicalEnv();
  const statement = qf.visit.node(node.statement, visitor, qf.is.statement, qc.liftToBlock);
  const lexicalEnvironment = endLexicalEnv();
  const statements: qc.Statement[] = [];
  if (shouldConvertConditionOfForStatement(node) || shouldConvertIncrementorOfForStatement(node)) {
    currentState.conditionVariable = qf.create.uniqueName('inc');
    statements.push(
      new qc.IfStatement(
        currentState.conditionVariable,
        new qc.ExpressionStatement(qf.visit.node(node.incrementor, visitor, isExpression)),
        new qc.ExpressionStatement(qf.create.assignment(currentState.conditionVariable, new qc.BooleanLiteral(true)))
      )
    );
    if (shouldConvertConditionOfForStatement(node)) {
      statements.push(
        new qc.IfStatement(new qc.PrefixUnaryExpression(Syntax.ExclamationToken, qf.visit.node(node.condition, visitor, isExpression)), qf.visit.node(new qc.BreakStatement(), visitor, qf.is.statement))
      );
    }
  }
  if (statement.kind === Syntax.Block) {
    qu.addRange(statements, statement.statements);
  } else {
    statements.push(statement);
  }
  copyOutParams(currentState.loopOutParams, LoopOutParamFlags.Body, CopyDirection.ToOutParam, statements);
  insertStatementsAfterStandardPrologue(statements, lexicalEnvironment);
  const loopBody = new qc.Block(statements, true);
  if (statement.kind === Syntax.Block) loopBody.setOriginal(statement);
  const containsYield = (node.statement.trafoFlags & TrafoFlags.ContainsYield) !== 0;
  let emitFlags: EmitFlags = 0;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && (hierarchyFacts & HierarchyFacts.AsyncFunctionBody) !== 0) emitFlags |= EmitFlags.AsyncFunctionBody;
  const functionDeclaration = new qc.VariableStatement(
    undefined,
    qf.emit.setFlags(
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(
          functionName,
          undefined,
          qf.emit.setFlags(
            new qc.FunctionExpression(undefined, containsYield ? new qc.Token(Syntax.AsteriskToken) : undefined, undefined, undefined, currentState.loopParams, undefined, loopBody),
            emitFlags
          )
        ),
      ]),
      EmitFlags.NoHoisting
    )
  );
  const part = generateCallToConvertedLoop(functionName, currentState, outerState, containsYield);
  return { functionName, containsYield, functionDeclaration, part };
}
function copyOutParam(outParam: LoopOutParam, copyDirection: CopyDirection): qt.BinaryExpression {
  const source = copyDirection === CopyDirection.ToOriginal ? outParam.outParamName : outParam.originalName;
  const target = copyDirection === CopyDirection.ToOriginal ? outParam.originalName : outParam.outParamName;
  return new qc.BinaryExpression(target, Syntax.EqualsToken, source);
}
function copyOutParams(outParams: LoopOutParam[], partFlags: LoopOutParamFlags, copyDirection: CopyDirection, statements: qc.Statement[]): void {
  for (const outParam of outParams) {
    if (outParam.flags & partFlags) {
      statements.push(new qc.ExpressionStatement(copyOutParam(outParam, copyDirection)));
    }
  }
}
function generateCallToConvertedLoopIniter(initFunctionExpressionName: qc.Identifier, containsYield: boolean): qc.Statement {
  const call = new qc.CallExpression(initFunctionExpressionName, undefined, []);
  const callResult = containsYield ? new qc.YieldExpression(new qc.Token(Syntax.AsteriskToken), qf.emit.setFlags(call, EmitFlags.Iterator)) : call;
  return new qc.ExpressionStatement(callResult);
}
function generateCallToConvertedLoop(loopFunctionExpressionName: qc.Identifier, state: ConvertedLoopState, outerState: ConvertedLoopState | undefined, containsYield: boolean): qc.Statement[] {
  const statements: qc.Statement[] = [];
  const isSimpleLoop = !(state.nonLocalJumps! & ~Jump.Continue) && !state.labeledNonLocalBreaks && !state.labeledNonLocalContinues;
  const call = new qc.CallExpression(
    loopFunctionExpressionName,
    undefined,
    map(state.loopParams, (p) => <qt.Identifier>p.name)
  );
  const callResult = containsYield ? new qc.YieldExpression(new qc.Token(Syntax.AsteriskToken), qf.emit.setFlags(call, EmitFlags.Iterator)) : call;
  if (isSimpleLoop) {
    statements.push(new qc.ExpressionStatement(callResult));
    copyOutParams(state.loopOutParams, LoopOutParamFlags.Body, CopyDirection.ToOriginal, statements);
  } else {
    const loopResultName = qf.create.uniqueName('state');
    const stateVariable = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(loopResultName, undefined, callResult)]));
    statements.push(stateVariable);
    copyOutParams(state.loopOutParams, LoopOutParamFlags.Body, CopyDirection.ToOriginal, statements);
    if (state.nonLocalJumps! & Jump.Return) {
      let returnStatement: qt.ReturnStatement;
      if (outerState) {
        outerState.nonLocalJumps! |= Jump.Return;
        returnStatement = new qc.ReturnStatement(loopResultName);
      } else {
        returnStatement = new qc.ReturnStatement(new qc.PropertyAccessExpression(loopResultName, 'value'));
      }
      statements.push(new qc.IfStatement(new qc.BinaryExpression(new qc.TypeOfExpression(loopResultName), Syntax.Equals3Token, qc.asLiteral('object')), returnStatement));
    }
    if (state.nonLocalJumps! & Jump.Break) {
      statements.push(new qc.IfStatement(new qc.BinaryExpression(loopResultName, Syntax.Equals3Token, qc.asLiteral('break')), new qc.BreakStatement()));
    }
    if (state.labeledNonLocalBreaks || state.labeledNonLocalContinues) {
      const caseClauses: qt.CaseClause[] = [];
      processLabeledJumps(state.labeledNonLocalBreaks!, true, loopResultName, outerState, caseClauses);
      processLabeledJumps(state.labeledNonLocalContinues!, false, loopResultName, outerState, caseClauses);
      statements.push(new qc.SwitchStatement(loopResultName, new qc.CaseBlock(caseClauses)));
    }
  }
  return statements;
}
function setLabeledJump(state: ConvertedLoopState, isBreak: boolean, labelText: string, labelMarker: string): void {
  if (isBreak) {
    if (!state.labeledNonLocalBreaks) {
      state.labeledNonLocalBreaks = qu.createMap<string>();
    }
    state.labeledNonLocalBreaks.set(labelText, labelMarker);
  } else {
    if (!state.labeledNonLocalContinues) {
      state.labeledNonLocalContinues = qu.createMap<string>();
    }
    state.labeledNonLocalContinues.set(labelText, labelMarker);
  }
}
function processLabeledJumps(table: qu.QMap<string>, isBreak: boolean, loopResultName: qc.Identifier, outerLoop: ConvertedLoopState | undefined, caseClauses: qt.CaseClause[]): void {
  if (!table) {
    return;
  }
  table.forEach((labelMarker, labelText) => {
    const statements: qc.Statement[] = [];
    if (!outerLoop || (outerLoop.labels && outerLoop.labels.get(labelText))) {
      const label = new qc.Identifier(labelText);
      statements.push(isBreak ? new qc.BreakStatement(label) : new qc.ContinueStatement(label));
    } else {
      setLabeledJump(outerLoop, isBreak, labelText, labelMarker);
      statements.push(new qc.ReturnStatement(loopResultName));
    }
    caseClauses.push(new qc.CaseClause(qc.asLiteral(labelMarker), statements));
  });
}
function processLoopVariableDeclaration(
  container: qt.IterationStmt,
  decl: qt.VariableDeclaration | qt.BindingElem,
  loopParams: qt.ParamDeclaration[],
  loopOutParams: LoopOutParam[],
  hasCapturedBindingsInForIniter: boolean
) {
  const name = decl.name;
  if (name.kind === Syntax.BindingPattern) {
    for (const elem of name.elems) {
      if (!elem.kind === Syntax.OmittedExpression) {
        processLoopVariableDeclaration(container, elem, loopParams, loopOutParams, hasCapturedBindingsInForIniter);
      }
    }
  } else {
    loopParams.push(new qc.ParamDeclaration(undefined, undefined, name));
    const checkFlags = resolver.getNodeCheckFlags(decl);
    if (checkFlags & NodeCheckFlags.NeedsLoopOutParam || hasCapturedBindingsInForIniter) {
      const outParamName = qf.create.uniqueName('out_' + idText(name));
      let flags: LoopOutParamFlags = 0;
      if (checkFlags & NodeCheckFlags.NeedsLoopOutParam) {
        flags |= LoopOutParamFlags.Body;
      }
      if (container.kind === Syntax.ForStatement && container.initer && resolver.isBindingCapturedByNode(container.initer, decl)) {
        flags |= LoopOutParamFlags.Initer;
      }
      loopOutParams.push({ flags, originalName: name, outParamName });
    }
  }
}
function addObjectLiteralMembers(expressions: qc.Expression[], node: qt.ObjectLiteralExpression, receiver: qc.Identifier, start: number) {
  const properties = node.properties;
  const numProperties = properties.length;
  for (let i = start; i < numProperties; i++) {
    const property = properties[i];
    switch (property.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        const accessors = qf.get.allAccessorDeclarations(node.properties, property);
        if (property === accessors.firstAccessor) {
          expressions.push(transformAccessorsToExpression(receiver, accessors, node, !!node.multiLine));
        }
        break;
      case Syntax.MethodDeclaration:
        expressions.push(transformObjectLiteralMethodDeclarationToExpression(property, receiver, node, node.multiLine!));
        break;
      case Syntax.PropertyAssignment:
        expressions.push(transformPropertyAssignmentToExpression(property, receiver, node.multiLine!));
        break;
      case Syntax.ShorthandPropertyAssignment:
        expressions.push(transformShorthandPropertyAssignmentToExpression(property, receiver, node.multiLine!));
        break;
      default:
        qu.failBadSyntax(node);
        break;
    }
  }
}
function transformPropertyAssignmentToExpression(property: qt.PropertyAssignment, receiver: qc.Expression, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(qf.create.memberAccessForPropertyName(receiver, qf.visit.node(property.name, visitor, qf.is.propertyName)), qf.visit.node(property.initer, visitor, isExpression));
  expression.setRange(property);
  if (startsOnNewLine) {
    qf.emit.setStartsOnNewLine(expression);
  }
  return expression;
}
function transformShorthandPropertyAssignmentToExpression(property: qt.ShorthandPropertyAssignment, receiver: qc.Expression, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(qf.create.memberAccessForPropertyName(receiver, qf.visit.node(property.name, visitor, qf.is.propertyName)), qf.create.synthesizedClone(property.name));
  expression.setRange(property);
  if (startsOnNewLine) {
    qf.emit.setStartsOnNewLine(expression);
  }
  return expression;
}
function transformObjectLiteralMethodDeclarationToExpression(method: qt.MethodDeclaration, receiver: qc.Expression, container: Node, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(
    qf.create.memberAccessForPropertyName(receiver, qf.visit.node(method.name, visitor, qf.is.propertyName)),
    transformFunctionLikeToExpression(method, undefined, container)
  );
  expression.setRange(method);
  if (startsOnNewLine) {
    qf.emit.setStartsOnNewLine(expression);
  }
  return expression;
}
function visitCatchClause(node: qt.CatchClause): qt.CatchClause {
  const ancestorFacts = enterSubtree(HierarchyFacts.BlockScopeExcludes, HierarchyFacts.BlockScopeIncludes);
  let updated: qt.CatchClause;
  qf.assert.true(!!node.variableDeclaration, 'Catch clause variable should always be present when downleveling ES2015.');
  if (node.variableDeclaration.name.kind === Syntax.BindingPattern) {
    const temp = qf.create.tempVariable(undefined);
    const newVariableDeclaration = new qc.VariableDeclaration(temp);
    newVariableDeclaration.setRange(node.variableDeclaration);
    const vars = flattenDestructuringBinding(node.variableDeclaration, visitor, context, FlattenLevel.All, temp);
    const list = new qc.VariableDeclarationList(vars);
    list.setRange(node.variableDeclaration);
    const destructure = new qc.VariableStatement(undefined, list);
    updated = node.update(newVariableDeclaration, addStatementToStartOfBlock(node.block, destructure));
  } else {
    updated = qf.visit.children(node, visitor, context);
  }
  exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
  return updated;
}
function addStatementToStartOfBlock(block: qt.Block, statement: qc.Statement): qt.Block {
  const transformedStatements = Nodes.visit(block.statements, visitor, qf.is.statement);
  return block.update([statement, ...transformedStatements]);
}
function visitMethodDeclaration(node: qt.MethodDeclaration): qt.ObjectLiteralElemLike {
  qf.assert.true(!node.name.kind === Syntax.ComputedPropertyName);
  const functionExpression = transformFunctionLikeToExpression(node, undefined);
  qf.emit.setFlags(functionExpression, EmitFlags.NoLeadingComments | qf.get.emitFlags(functionExpression));
  return new qc.PropertyAssignment(node.name, functionExpression).setRange(node);
}
function visitAccessorDeclaration(node: qt.AccessorDeclaration): qt.AccessorDeclaration {
  qf.assert.true(!node.name.kind === Syntax.ComputedPropertyName);
  const savedConvertedLoopState = convertedLoopState;
  convertedLoopState = undefined;
  const ancestorFacts = enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
  let updated: qt.AccessorDeclaration;
  const params = qf.visit.params(node.params, visitor, context);
  const body = transformFunctionBody(node);
  if (node.kind === Syntax.GetAccessor) {
    updated = node.update(node.decorators, node.modifiers, node.name, params, node.type, body);
  } else {
    updated = node.update(node.decorators, node.modifiers, node.name, params, body);
  }
  exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
  convertedLoopState = savedConvertedLoopState;
  return updated;
}
function visitShorthandPropertyAssignment(node: qt.ShorthandPropertyAssignment): qt.ObjectLiteralElemLike {
  return new qc.PropertyAssignment(node.name, qf.create.synthesizedClone(node.name)).setRange(node);
}
function visitComputedPropertyName(node: qt.ComputedPropertyName) {
  return qf.visit.children(node, visitor, context);
}
function visitYieldExpression(node: qt.YieldExpression): qc.Expression {
  return qf.visit.children(node, visitor, context);
}
function visitArrayLiteralExpression(node: qt.ArrayLiteralExpression): qc.Expression {
  if (some(node.elems, isSpreadElem)) return transformAndSpreadElems(node.elems, !!node.elems.trailingComma);
  return qf.visit.children(node, visitor, context);
}
function visitCallExpression(node: qt.CallExpression) {
  if (qf.get.emitFlags(node) & EmitFlags.TypeScriptClassWrapper) return visitTypeScriptClassWrapper(node);
  const expression = qf.skip.outerExpressions(node.expression);
  if (expression.kind === Syntax.SuperKeyword || qf.is.superProperty(expression) || some(node.args, isSpreadElem)) return visitCallExpressionWithPotentialCapturedThisAssignment(node, true);
  return node.update(qf.visit.node(node.expression, callExpressionVisitor, isExpression), undefined, Nodes.visit(node.args, visitor, isExpression));
}
function visitTypeScriptClassWrapper(node: qt.CallExpression) {
  const body = cast(cast(qf.skip.outerExpressions(node.expression), isArrowFunction).body, isBlock);
  const isVariableStatementWithIniter = (stmt: qc.Statement) => stmt.kind === Syntax.VariableStatement && !!first(stmt.declarationList.declarations).initer;
  const savedConvertedLoopState = convertedLoopState;
  convertedLoopState = undefined;
  const bodyStatements = Nodes.visit(body.statements, visitor, qf.is.statement);
  convertedLoopState = savedConvertedLoopState;
  const classStatements = filter(bodyStatements, isVariableStatementWithIniter);
  const remainingStatements = filter(bodyStatements, (stmt) => !isVariableStatementWithIniter(stmt));
  const varStatement = cast(first(classStatements), isVariableStatement);
  const variable = varStatement.declarationList.declarations[0];
  const initer = qf.skip.outerExpressions(variable.initer!);
  const aliasAssignment = qu.tryCast(initer, isAssignmentExpression);
  const call = cast(aliasAssignment ? qf.skip.outerExpressions(aliasAssignment.right) : initer, isCallExpression);
  const func = cast(qf.skip.outerExpressions(call.expression), isFunctionExpression);
  const funcStatements = func.body.statements;
  let classBodyStart = 0;
  let classBodyEnd = -1;
  const statements: qc.Statement[] = [];
  if (aliasAssignment) {
    const extendsCall = qu.tryCast(funcStatements[classBodyStart], isExpressionStatement);
    if (extendsCall) {
      statements.push(extendsCall);
      classBodyStart++;
    }
    statements.push(funcStatements[classBodyStart]);
    classBodyStart++;
    statements.push(new qc.ExpressionStatement(qf.create.assignment(aliasAssignment.left, cast(variable.name, isIdentifier))));
  }
  while (elemAt(funcStatements, classBodyEnd)?.kind !== Syntax.ReturnStatement) {
    classBodyEnd--;
  }
  qu.addRange(statements, funcStatements, classBodyStart, classBodyEnd);
  if (classBodyEnd < -1) {
    qu.addRange(statements, funcStatements, classBodyEnd + 1);
  }
  qu.addRange(statements, remainingStatements);
  qu.addRange(statements, classStatements, 1);
  return recreateOuterExpressions(
    node.expression,
    recreateOuterExpressions(
      variable.initer,
      recreateOuterExpressions(
        aliasAssignment && aliasAssignment.right,
        updateCall(call, recreateOuterExpressions(call.expression, func.update(undefined, undefined, undefined, undefined, func.params, undefined, func.body.update(statements))), undefined, call.args)
      )
    )
  );
}
function visitImmediateSuperCallInBody(node: qt.CallExpression) {
  return visitCallExpressionWithPotentialCapturedThisAssignment(node, false);
}
function visitCallExpressionWithPotentialCapturedThisAssignment(node: qt.CallExpression, assignToCapturedThis: boolean): qt.CallExpression | qt.BinaryExpression {
  if (node.trafoFlags & TrafoFlags.ContainsRestOrSpread || node.expression.kind === Syntax.SuperKeyword || qf.is.superProperty(qf.skip.outerExpressions(node.expression))) {
    const { target, thisArg } = qf.create.callBinding(node.expression, hoistVariableDeclaration);
    if (node.expression.kind === Syntax.SuperKeyword) {
      qf.emit.setFlags(thisArg, EmitFlags.NoSubstitution);
    }
    let resultingCall: qt.CallExpression | qt.BinaryExpression;
    if (node.trafoFlags & TrafoFlags.ContainsRestOrSpread) {
      resultingCall = qf.create.functionApply(
        qf.visit.node(target, callExpressionVisitor, isExpression),
        node.expression.kind === Syntax.SuperKeyword ? thisArg : qf.visit.node(thisArg, visitor, isExpression),
        transformAndSpreadElems(node.args, false)
      );
    } else {
      resultingCall = qf.create.functionCall(
        qf.visit.node(target, callExpressionVisitor, isExpression),
        node.expression.kind === Syntax.SuperKeyword ? thisArg : qf.visit.node(thisArg, visitor, isExpression),
        Nodes.visit(node.args, visitor, isExpression),
        node
      );
    }
    if (node.expression.kind === Syntax.SuperKeyword) {
      const initer = qf.create.logicalOr(resultingCall, createActualThis());
      resultingCall = assignToCapturedThis ? qf.create.assignment(qf.create.fileLevelUniqueName('_this'), initer) : initer;
    }
    return resultingCall.setOriginal(node);
  }
  return qf.visit.children(node, visitor, context);
}
function visitNewExpression(node: qt.NewExpression): qt.LeftExpression {
  if (some(node.args, isSpreadElem)) {
    const { target, thisArg } = qf.create.callBinding(new qc.PropertyAccessExpression(node.expression, 'bind'), hoistVariableDeclaration);
    return new qc.NewExpression(
      qf.create.functionApply(qf.visit.node(target, visitor, isExpression), thisArg, transformAndSpreadElems(new Nodes([qc.VoidExpression.zero(), ...node.args!]), false)),
      undefined,
      []
    );
  }
  return qf.visit.children(node, visitor, context);
}
function transformAndSpreadElems(elems: Nodes<qt.Expression>, needsUniqueCopy: boolean, multiLine: boolean, trailingComma: boolean): qc.Expression {
  const numElems = elems.length;
  const segments = flatten<qt.Expression>(spanMap(elems, partitionSpread, (partition, visitPartition, _start, end) => visitPartition(partition, multiLine, trailingComma && end === numElems)));
  if (compilerOpts.downlevelIteration) {
    if (segments.length === 1) {
      const firstSegment = segments[0];
      if (isCallToHelper(firstSegment, '___spread' as __String)) return segments[0];
    }
    return createSpreadHelper(context, segments);
  } else {
    if (segments.length === 1) {
      const firstSegment = segments[0];
      if (!needsUniqueCopy || isPackedArrayLiteral(firstSegment) || isCallToHelper(firstSegment, '___spreadArrays' as __String)) return segments[0];
    }
    return createSpreadArraysHelper(context, segments);
  }
}
function isPackedElem(node: qc.Expression) {
  return !node.kind === Syntax.OmittedExpression;
}
function isPackedArrayLiteral(node: qc.Expression) {
  return isArrayLiteralExpression(node) && every(node.elems, isPackedElem);
}
function isCallToHelper(firstSegment: qc.Expression, helperName: __String) {
  return (
    firstSegment.kind === Syntax.CallExpression &&
    firstSegment.expression.kind === Syntax.Identifier &&
    qf.get.emitFlags(firstSegment.expression) & EmitFlags.HelperName &&
    firstSegment.expression.escapedText === helperName
  );
}
function partitionSpread(node: qc.Expression) {
  return node.kind === Syntax.SpreadElem ? visitSpanOfSpreads : visitSpanOfNonSpreads;
}
function visitSpanOfSpreads(chunk: qc.Expression[]): VisitResult<qt.Expression> {
  return map(chunk, visitExpressionOfSpread);
}
function visitSpanOfNonSpreads(chunk: qc.Expression[], multiLine: boolean, trailingComma: boolean): VisitResult<qt.Expression> {
  return new qc.ArrayLiteralExpression(Nodes.visit(new Nodes(chunk, trailingComma), visitor, isExpression), multiLine);
}
function visitSpreadElem(node: qt.SpreadElem) {
  return qf.visit.node(node.expression, visitor, isExpression);
}
function visitExpressionOfSpread(node: qt.SpreadElem) {
  return qf.visit.node(node.expression, visitor, isExpression);
}
function visitTemplateLiteral(node: qt.LiteralExpression): qt.LeftExpression {
  return qc.asLiteral(node.text).setRange(node);
}
function visitStringLiteral(node: qt.StringLiteral) {
  if (node.hasExtendedEscape) return qc.asLiteral(node.text).setRange(node);
  return node;
}
function visitNumericLiteral(node: qt.NumericLiteral) {
  if (node.numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier) return new qc.NumericLiteral(node.text).setRange(node);
  return node;
}
function visitTaggedTemplateExpression(node: qt.TaggedTemplateExpression) {
  return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.All);
}
function visitTemplateExpression(node: qt.TemplateExpression): qc.Expression {
  const expressions: qc.Expression[] = [];
  addTemplateHead(expressions, node);
  addTemplateSpans(expressions, node);
  const expression = reduceLeft(expressions, qf.create.add)!;
  if (qf.is.synthesized(expression)) {
    expression.pos = node.pos;
    expression.end = node.end;
  }
  return expression;
}
function shouldAddTemplateHead(node: qt.TemplateExpression) {
  qf.assert.true(node.templateSpans.length !== 0);
  return node.head.text.length !== 0 || node.templateSpans[0].literal.text.length === 0;
}
function addTemplateHead(expressions: qc.Expression[], node: qt.TemplateExpression): void {
  if (!shouldAddTemplateHead(node)) {
    return;
  }
  expressions.push(qc.asLiteral(node.head.text));
}
function addTemplateSpans(expressions: qc.Expression[], node: qt.TemplateExpression): void {
  for (const span of node.templateSpans) {
    expressions.push(qf.visit.node(span.expression, visitor, isExpression));
    if (span.literal.text.length !== 0) {
      expressions.push(qc.asLiteral(span.literal.text));
    }
  }
}
function visitSuperKeyword(isExpressionOfCall: boolean): qt.LeftExpression {
  return hierarchyFacts & HierarchyFacts.NonStaticClassElem && !isExpressionOfCall
    ? new qc.PropertyAccessExpression(qf.create.fileLevelUniqueName('_super'), 'prototype')
    : qf.create.fileLevelUniqueName('_super');
}
function visitMetaProperty(node: qt.MetaProperty) {
  if (node.keywordToken === Syntax.NewKeyword && node.name.escapedText === 'target') {
    hierarchyFacts |= HierarchyFacts.NewTarget;
    return qf.create.fileLevelUniqueName('_newTarget');
  }
  return node;
}
function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void) {
  if (enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis && qf.is.functionLike(node)) {
    const ancestorFacts = enterSubtree(
      HierarchyFacts.FunctionExcludes,
      qf.get.emitFlags(node) & EmitFlags.CapturesThis ? HierarchyFacts.FunctionIncludes | HierarchyFacts.CapturesThis : HierarchyFacts.FunctionIncludes
    );
    previousOnEmitNode(hint, node, emitCallback);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return;
  }
  previousOnEmitNode(hint, node, emitCallback);
}
function enableSubstitutionsForBlockScopedBindings() {
  if ((enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings) === 0) {
    enabledSubstitutions |= ES2015SubstitutionFlags.BlockScopedBindings;
    context.enableSubstitution(Syntax.Identifier);
  }
}
function enableSubstitutionsForCapturedThis() {
  if ((enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis) === 0) {
    enabledSubstitutions |= ES2015SubstitutionFlags.CapturedThis;
    context.enableSubstitution(Syntax.ThisKeyword);
    context.enableEmitNotification(Syntax.Constructor);
    context.enableEmitNotification(Syntax.MethodDeclaration);
    context.enableEmitNotification(Syntax.GetAccessor);
    context.enableEmitNotification(Syntax.SetAccessor);
    context.enableEmitNotification(Syntax.ArrowFunction);
    context.enableEmitNotification(Syntax.FunctionExpression);
    context.enableEmitNotification(Syntax.FunctionDeclaration);
  }
}
function onSubstituteNode(hint: qt.EmitHint, node: Node) {
  node = previousOnSubstituteNode(hint, node);
  if (hint === qt.EmitHint.Expression) return substituteExpression(node);
  if (node.kind === Syntax.Identifier) return substituteIdentifier(node);
  return node;
}
function substituteIdentifier(node: qc.Identifier) {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !qf.is.internalName(node)) {
    const original = qf.get.parseTreeOf(node, isIdentifier);
    if (original && isNameOfDeclarationWithCollidingName(original)) return qf.get.generatedNameForNode(original).setRange(node);
  }
  return node;
}
function isNameOfDeclarationWithCollidingName(node: qc.Identifier) {
  switch (node.parent.kind) {
    case Syntax.BindingElem:
    case Syntax.ClassDeclaration:
    case Syntax.EnumDeclaration:
    case Syntax.VariableDeclaration:
      return (<qt.NamedDecl>node.parent).name === node && resolver.isDeclarationWithCollidingName(<qt.Declaration>node.parent);
  }
  return false;
}
function substituteExpression(node: Node) {
  switch (node.kind) {
    case Syntax.Identifier:
      return substituteExpressionIdentifier(<qt.Identifier>node);
    case Syntax.ThisKeyword:
      return substituteThisKeyword(<qt.PrimaryExpression>node);
  }
  return node;
}
function substituteExpressionIdentifier(node: qc.Identifier): qc.Identifier {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !qf.is.internalName(node)) {
    const declaration = resolver.getReferencedDeclarationWithCollidingName(node);
    if (declaration && !(qf.is.classLike(declaration) && isPartOfClassBody(declaration, node))) return qf.get.generatedNameForNode(qf.decl.nameOf(declaration)).setRange(node);
  }
  return node;
}
function isPartOfClassBody(declaration: qt.ClassLikeDeclaration, node: qc.Identifier) {
  let currentNode: Node | undefined = qf.get.parseTreeOf(node);
  if (!currentNode || currentNode === declaration || currentNode.end <= declaration.pos || currentNode.pos >= declaration.end) return false;
  const blockScope = qf.get.enclosingBlockScopeContainer(declaration);
  while (currentNode) {
    if (currentNode === blockScope || currentNode === declaration) return false;
    if (qf.is.classElem(currentNode) && currentNode.parent === declaration) return true;
    currentNode = currentNode.parent;
  }
  return false;
}
function substituteThisKeyword(node: qt.PrimaryExpression): qt.PrimaryExpression {
  if (enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis && hierarchyFacts & HierarchyFacts.CapturesThis) return qf.create.fileLevelUniqueName('_this').setRange(node);
  return node;
}
function getClassMemberPrefix(node: qt.ClassExpression | qt.ClassDeclaration, member: qt.ClassElem) {
  return qf.has.syntacticModifier(member, ModifierFlags.Static) ? qf.decl.internalName(node) : new qc.PropertyAccessExpression(qf.decl.internalName(node), 'prototype');
}
function hasSynthesizedDefaultSuperCall(constructor: qt.ConstructorDeclaration | undefined, hasExtendsClause: boolean) {
  if (!constructor || !hasExtendsClause) return false;
  if (some(constructor.params)) return false;
  const statement = firstOrUndefined(constructor.body!.statements);
  if (!statement || !qf.is.synthesized(statement) || statement.kind !== Syntax.ExpressionStatement) return false;
  const statementExpression = (<qt.ExpressionStatement>statement).expression;
  if (!qf.is.synthesized(statementExpression) || statementExpression.kind !== Syntax.CallExpression) return false;
  const callTarget = (<qt.CallExpression>statementExpression).expression;
  if (!qf.is.synthesized(callTarget) || callTarget.kind !== Syntax.SuperKeyword) return false;
  const callArg = singleOrUndefined((<qt.CallExpression>statementExpression).args);
  if (!callArg || !qf.is.synthesized(callArg) || callArg.kind !== Syntax.SpreadElem) return false;
  const expression = (<qt.SpreadElem>callArg).expression;
  return expression.kind === Syntax.Identifier && expression.escapedText === 'args';
}
function createExtendsHelper(context: qt.TrafoContext, name: qc.Identifier) {
  context.requestEmitHelper(extendsHelper);
  return new qc.CallExpression(getUnscopedHelperName('__extends'), undefined, [name, qf.create.fileLevelUniqueName('_super')]);
}
export const extendsHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:extends',
  importName: '__extends',
  scoped: false,
  priority: 0,
  text: `
            var __extends = (this && this.__extends) || (function () {
                var extendStatics = function (d, b) {
                    extendStatics = Object.setPrototypeOf ||
                        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
                    return extendStatics(d, b);
                };
                                return function (d, b) {
                    extendStatics(d, b);
                    function __() { this.constructor = d; }
                    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
                };
            })();`,
};
