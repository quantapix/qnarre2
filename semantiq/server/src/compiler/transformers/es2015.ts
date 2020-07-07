import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
const enum ES2015SubstitutionFlags {
  CapturedThis = 1 << 0,
  BlockScopedBindings = 1 << 1,
}
interface LoopOutParameter {
  flags: LoopOutParameterFlags;
  originalName: Identifier;
  outParamName: Identifier;
}
const enum LoopOutParameterFlags {
  Body = 1 << 0,
  Initializer = 1 << 1,
}
const enum CopyDirection {
  ToOriginal,
  ToOutParameter,
}
const enum Jump {
  Break = 1 << 1,
  Continue = 1 << 2,
  Return = 1 << 3,
}
interface ConvertedLoopState {
  labels?: Map<boolean>;
  labeledNonLocalBreaks?: Map<string>;
  labeledNonLocalContinues?: Map<string>;
  nonLocalJumps?: Jump;
  allowedNonLabeledJumps?: Jump;
  argumentsName?: Identifier;
  thisName?: Identifier;
  containsLexicalThis?: boolean;
  hoistedLocalVariables?: Identifier[];
  conditionVariable?: Identifier;
  loopParameters: ParameterDeclaration[];
  loopOutParameters: LoopOutParameter[];
}
type LoopConverter = (
  node: IterationStatement,
  outermostLabeledStatement: LabeledStatement | undefined,
  convertedLoopBodyStatements: Statement[] | undefined,
  ancestorFacts: HierarchyFacts
) => Statement;
const enum HierarchyFacts {
  None = 0,
  Function = 1 << 0,
  ArrowFunction = 1 << 1,
  AsyncFunctionBody = 1 << 2,
  NonStaticClassElement = 1 << 3,
  CapturesThis = 1 << 4,
  ExportedVariableStatement = 1 << 5,
  TopLevel = 1 << 6,
  Block = 1 << 7,
  IterationStatement = 1 << 8,
  IterationStatementBlock = 1 << 9,
  IterationContainer = 1 << 10,
  ForStatement = 1 << 11,
  ForInOrForOfStatement = 1 << 12,
  ConstructorWithCapturedSuper = 1 << 13,
  AncestorFactsMask = (ConstructorWithCapturedSuper << 1) - 1,
  BlockScopeIncludes = None,
  BlockScopeExcludes = TopLevel | Block | IterationStatement | IterationStatementBlock | ForStatement | ForInOrForOfStatement,
  SourceFileIncludes = TopLevel,
  SourceFileExcludes = (BlockScopeExcludes & ~TopLevel) | IterationContainer,
  FunctionIncludes = Function | TopLevel,
  FunctionExcludes = (BlockScopeExcludes & ~TopLevel) | ArrowFunction | AsyncFunctionBody | CapturesThis | NonStaticClassElement | ConstructorWithCapturedSuper | IterationContainer,
  AsyncFunctionBodyIncludes = FunctionIncludes | AsyncFunctionBody,
  AsyncFunctionBodyExcludes = FunctionExcludes & ~NonStaticClassElement,
  ArrowFunctionIncludes = ArrowFunction | TopLevel,
  ArrowFunctionExcludes = (BlockScopeExcludes & ~TopLevel) | ConstructorWithCapturedSuper,
  ConstructorIncludes = FunctionIncludes | NonStaticClassElement,
  ConstructorExcludes = FunctionExcludes & ~NonStaticClassElement,
  DoOrWhileStatementIncludes = IterationStatement | IterationContainer,
  DoOrWhileStatementExcludes = None,
  ForStatementIncludes = IterationStatement | ForStatement | IterationContainer,
  ForStatementExcludes = BlockScopeExcludes & ~ForStatement,
  ForInOrForOfStatementIncludes = IterationStatement | ForInOrForOfStatement | IterationContainer,
  ForInOrForOfStatementExcludes = BlockScopeExcludes & ~ForInOrForOfStatement,
  BlockIncludes = Block,
  BlockExcludes = BlockScopeExcludes & ~Block,
  IterationStatementBlockIncludes = IterationStatementBlock,
  IterationStatementBlockExcludes = BlockScopeExcludes,
  NewTarget = 1 << 14,
  CapturedLexicalThis = 1 << 15,
  SubtreeFactsMask = ~AncestorFactsMask,
  ArrowFunctionSubtreeExcludes = None,
  FunctionSubtreeExcludes = NewTarget | CapturedLexicalThis,
}
export function transformES2015(context: TransformationContext) {
  const { startLexicalEnvironment, resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const compilerOptions = context.getCompilerOptions();
  const resolver = context.getEmitResolver();
  const previousOnSubstituteNode = context.onSubstituteNode;
  const previousOnEmitNode = context.onEmitNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  let currentSourceFile: SourceFile;
  let currentText: string;
  let hierarchyFacts: HierarchyFacts;
  let taggedTemplateStringDeclarations: VariableDeclaration[];
  function recordTaggedTemplateString(temp: Identifier) {
    taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, createVariableDeclaration(temp));
  }
  let convertedLoopState: ConvertedLoopState | undefined;
  let enabledSubstitutions: ES2015SubstitutionFlags;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    currentText = node.text;
    const visited = visitSourceFile(node);
    addEmitHelpers(visited, context.readEmitHelpers());
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
    return (hierarchyFacts & HierarchyFacts.ConstructorWithCapturedSuper) !== 0 && node.kind === Syntax.ReturnStatement && !(<ReturnStatement>node).expression;
  }
  function shouldVisitNode(node: Node): boolean {
    return (
      (node.transformFlags & TransformFlags.ContainsES2015) !== 0 ||
      convertedLoopState !== undefined ||
      (hierarchyFacts & HierarchyFacts.ConstructorWithCapturedSuper && (Node.is.statement(node) || node.kind === Syntax.Block)) ||
      (Node.is.iterationStatement(node, false) && shouldConvertIterationStatement(node)) ||
      (Node.get.emitFlags(node) & EmitFlags.TypeScriptClassWrapper) !== 0
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
        return visitClassDeclaration(<ClassDeclaration>node);
      case Syntax.ClassExpression:
        return visitClassExpression(<ClassExpression>node);
      case Syntax.Parameter:
        return visitParameter(<ParameterDeclaration>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<FunctionDeclaration>node);
      case Syntax.ArrowFunction:
        return visitArrowFunction(<ArrowFunction>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<FunctionExpression>node);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(<VariableDeclaration>node);
      case Syntax.Identifier:
        return visitIdentifier(<Identifier>node);
      case Syntax.VariableDeclarationList:
        return visitVariableDeclarationList(<VariableDeclarationList>node);
      case Syntax.SwitchStatement:
        return visitSwitchStatement(<SwitchStatement>node);
      case Syntax.CaseBlock:
        return visitCaseBlock(<CaseBlock>node);
      case Syntax.Block:
        return visitBlock(<Block>node, false);
      case Syntax.BreakStatement:
      case Syntax.ContinueStatement:
        return visitBreakOrContinueStatement(<BreakOrContinueStatement>node);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(<LabeledStatement>node);
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        return visitDoOrWhileStatement(<DoStatement | WhileStatement>node, undefined);
      case Syntax.ForStatement:
        return visitForStatement(<ForStatement>node, undefined);
      case Syntax.ForInStatement:
        return visitForInStatement(<ForInStatement>node, undefined);
      case Syntax.ForOfStatement:
        return visitForOfStatement(<ForOfStatement>node, undefined);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(<ExpressionStatement>node);
      case Syntax.ObjectLiteralExpression:
        return visitObjectLiteralExpression(<ObjectLiteralExpression>node);
      case Syntax.CatchClause:
        return visitCatchClause(<CatchClause>node);
      case Syntax.ShorthandPropertyAssignment:
        return visitShorthandPropertyAssignment(<ShorthandPropertyAssignment>node);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(<ComputedPropertyName>node);
      case Syntax.ArrayLiteralExpression:
        return visitArrayLiteralExpression(<ArrayLiteralExpression>node);
      case Syntax.CallExpression:
        return visitCallExpression(<CallExpression>node);
      case Syntax.NewExpression:
        return visitNewExpression(<NewExpression>node);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(<ParenthesizedExpression>node, true);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(<BinaryExpression>node, true);
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateHead:
      case Syntax.TemplateMiddle:
      case Syntax.TemplateTail:
        return visitTemplateLiteral(<LiteralExpression>node);
      case Syntax.StringLiteral:
        return visitStringLiteral(<StringLiteral>node);
      case Syntax.NumericLiteral:
        return visitNumericLiteral(<NumericLiteral>node);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(<TaggedTemplateExpression>node);
      case Syntax.TemplateExpression:
        return visitTemplateExpression(<TemplateExpression>node);
      case Syntax.YieldExpression:
        return visitYieldExpression(<YieldExpression>node);
      case Syntax.SpreadElement:
        return visitSpreadElement(<SpreadElement>node);
      case Syntax.SuperKeyword:
        return visitSuperKeyword(false);
      case Syntax.ThisKeyword:
        return visitThisKeyword(node);
      case Syntax.MetaProperty:
        return visitMetaProperty(<MetaProperty>node);
      case Syntax.MethodDeclaration:
        return visitMethodDeclaration(<MethodDeclaration>node);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return visitAccessorDeclaration(<AccessorDeclaration>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<VariableStatement>node);
      case Syntax.ReturnStatement:
        return visitReturnStatement(<ReturnStatement>node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitSourceFile(node: SourceFile): SourceFile {
    const ancestorFacts = enterSubtree(HierarchyFacts.SourceFileExcludes, HierarchyFacts.SourceFileIncludes);
    const prologue: Statement[] = [];
    const statements: Statement[] = [];
    startLexicalEnvironment();
    let statementOffset = addStandardPrologue(prologue, node.statements, false);
    statementOffset = addCustomPrologue(prologue, node.statements, statementOffset, visitor);
    addRange(statements, Nodes.visit(node.statements, visitor, isStatement, statementOffset));
    if (taggedTemplateStringDeclarations) {
      statements.push(createVariableStatement(undefined, createVariableDeclarationList(taggedTemplateStringDeclarations)));
    }
    mergeLexicalEnvironment(prologue, endLexicalEnvironment());
    insertCaptureThisForNodeIfNeeded(prologue, node);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return qp_updateSourceNode(node, setRange(new Nodes(concatenate(prologue, statements)), node.statements));
  }
  function visitSwitchStatement(node: SwitchStatement): SwitchStatement {
    if (convertedLoopState !== undefined) {
      const savedAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
      convertedLoopState.allowedNonLabeledJumps! |= Jump.Break;
      const result = visitEachChild(node, visitor, context);
      convertedLoopState.allowedNonLabeledJumps = savedAllowedNonLabeledJumps;
      return result;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitCaseBlock(node: CaseBlock): CaseBlock {
    const ancestorFacts = enterSubtree(HierarchyFacts.BlockScopeExcludes, HierarchyFacts.BlockScopeIncludes);
    const updated = visitEachChild(node, visitor, context);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function returnCapturedThis(node: Node): ReturnStatement {
    return setOriginalNode(createReturn(createFileLevelUniqueName('_this')), node);
  }
  function visitReturnStatement(node: ReturnStatement): Statement {
    if (convertedLoopState) {
      convertedLoopState.nonLocalJumps! |= Jump.Return;
      if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
        node = returnCapturedThis(node);
      }
      return createReturn(createObjectLiteral([createPropertyAssignment(new Identifier('value'), node.expression ? visitNode(node.expression, visitor, isExpression) : qs.VoidExpression.zero())]));
    } else if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
      return returnCapturedThis(node);
    }
    return visitEachChild(node, visitor, context);
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
      return convertedLoopState.thisName || (convertedLoopState.thisName = createUniqueName('this'));
    }
    return node;
  }
  function visitIdentifier(node: Identifier): Identifier {
    if (!convertedLoopState) return node;
    if (Node.is.generatedIdentifier(node)) return node;
    if (node.escapedText !== 'arguments' || !resolver.isArgumentsLocalBinding(node)) return node;
    return convertedLoopState.argumentsName || (convertedLoopState.argumentsName = createUniqueName('arguments'));
  }
  function visitBreakOrContinueStatement(node: BreakOrContinueStatement): Statement {
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
        let returnExpression: Expression = createLiteral(labelMarker);
        if (convertedLoopState.loopOutParameters.length) {
          const outParams = convertedLoopState.loopOutParameters;
          let expr: Expression | undefined;
          for (let i = 0; i < outParams.length; i++) {
            const copyExpr = copyOutParameter(outParams[i], CopyDirection.ToOutParameter);
            if (i === 0) {
              expr = copyExpr;
            } else {
              expr = new BinaryExpression(expr!, Syntax.CommaToken, copyExpr);
            }
          }
          returnExpression = new BinaryExpression(expr!, Syntax.CommaToken, returnExpression);
        }
        return createReturn(returnExpression);
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
    const variable = createVariableDeclaration(getLocalName(node, true), undefined, transformClassLikeDeclarationToExpression(node));
    setOriginalNode(variable, node);
    const statements: Statement[] = [];
    const statement = createVariableStatement(undefined, createVariableDeclarationList([variable]));
    setOriginalNode(statement, node);
    setRange(statement, node);
    startOnNewLine(statement);
    statements.push(statement);
    if (hasSyntacticModifier(node, ModifierFlags.Export)) {
      const exportStatement = hasSyntacticModifier(node, ModifierFlags.Default) ? createExportDefault(getLocalName(node)) : createExternalModuleExport(getLocalName(node));
      setOriginalNode(exportStatement, statement);
      statements.push(exportStatement);
    }
    const emitFlags = Node.get.emitFlags(node);
    if ((emitFlags & EmitFlags.HasEndOfDeclarationMarker) === 0) {
      statements.push(new EndOfDeclarationMarker(node));
      setEmitFlags(statement, emitFlags | EmitFlags.HasEndOfDeclarationMarker);
    }
    return singleOrMany(statements);
  }
  function visitClassExpression(node: ClassExpression): Expression {
    return transformClassLikeDeclarationToExpression(node);
  }
  function transformClassLikeDeclarationToExpression(node: ClassExpression | ClassDeclaration): Expression {
    if (node.name) {
      enableSubstitutionsForBlockScopedBindings();
    }
    const extendsClauseElement = getClassExtendsHeritageElement(node);
    const classFunction = new qs.FunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      extendsClauseElement ? [createParameter(undefined, undefined, createFileLevelUniqueName('_super'))] : [],
      undefined,
      transformClassBody(node, extendsClauseElement)
    );
    setEmitFlags(classFunction, (Node.get.emitFlags(node) & EmitFlags.Indented) | EmitFlags.ReuseTempVariableScope);
    const inner = new qs.PartiallyEmittedExpression(classFunction);
    inner.end = node.end;
    setEmitFlags(inner, EmitFlags.NoComments);
    const outer = new qs.PartiallyEmittedExpression(inner);
    outer.end = syntax.skipTrivia(currentText, node.pos);
    setEmitFlags(outer, EmitFlags.NoComments);
    const result = new qc.ParenthesizedExpression(new qs.CallExpression(outer, undefined, extendsClauseElement ? [visitNode(extendsClauseElement.expression, visitor, isExpression)] : []));
    addSyntheticLeadingComment(result, Syntax.MultiLineCommentTrivia, '* @class ');
    return result;
  }
  function transformClassBody(node: ClassExpression | ClassDeclaration, extendsClauseElement: ExpressionWithTypeArguments | undefined): Block {
    const statements: Statement[] = [];
    startLexicalEnvironment();
    addExtendsHelperIfNeeded(statements, node, extendsClauseElement);
    addConstructor(statements, node, extendsClauseElement);
    addClassMembers(statements, node);
    const closingBraceLocation = createTokenRange(syntax.skipTrivia(currentText, node.members.end), Syntax.CloseBraceToken);
    const localName = getInternalName(node);
    const outer = new qs.PartiallyEmittedExpression(localName);
    outer.end = closingBraceLocation.end;
    setEmitFlags(outer, EmitFlags.NoComments);
    const statement = createReturn(outer);
    statement.pos = closingBraceLocation.pos;
    setEmitFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
    statements.push(statement);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    const block = new Block(setRange(new Nodes(statements), true));
    setEmitFlags(block, EmitFlags.NoComments);
    return block;
  }
  function addExtendsHelperIfNeeded(statements: Statement[], node: ClassExpression | ClassDeclaration, extendsClauseElement: ExpressionWithTypeArguments | undefined): void {
    if (extendsClauseElement) {
      statements.push(setRange(new qc.ExpressionStatement(createExtendsHelper(context, getInternalName(node))), extendsClauseElement));
    }
  }
  function addConstructor(statements: Statement[], node: ClassExpression | ClassDeclaration, extendsClauseElement: ExpressionWithTypeArguments | undefined): void {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.ConstructorExcludes, HierarchyFacts.ConstructorIncludes);
    const constructor = getFirstConstructorWithBody(node);
    const hasSynthesizedSuper = hasSynthesizedDefaultSuperCall(constructor, extendsClauseElement !== undefined);
    const constructorFunction = createFunctionDeclaration(
      undefined,
      undefined,
      undefined,
      getInternalName(node),
      undefined,
      transformConstructorParameters(constructor, hasSynthesizedSuper),
      undefined,
      transformConstructorBody(constructor, node, extendsClauseElement, hasSynthesizedSuper)
    );
    setRange(constructorFunction, constructor || node);
    if (extendsClauseElement) {
      setEmitFlags(constructorFunction, EmitFlags.CapturesThis);
    }
    statements.push(constructorFunction);
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
  }
  function transformConstructorParameters(constructor: ConstructorDeclaration | undefined, hasSynthesizedSuper: boolean) {
    return visitParameterList(constructor && !hasSynthesizedSuper ? constructor.parameters : undefined, visitor, context) || <ParameterDeclaration[]>[];
  }
  function createDefaultConstructorBody(node: ClassDeclaration | ClassExpression, isDerivedClass: boolean) {
    const statements: Statement[] = [];
    resumeLexicalEnvironment();
    mergeLexicalEnvironment(statements, endLexicalEnvironment());
    if (isDerivedClass) {
      statements.push(createReturn(createDefaultSuperCallOrThis()));
    }
    const statementsArray = new Nodes(statements);
    setRange(statementsArray, node.members);
    const block = new Block(statementsArray, true);
    setRange(block, node);
    setEmitFlags(block, EmitFlags.NoComments);
    return block;
  }
  function transformConstructorBody(
    constructor: (ConstructorDeclaration & { body: FunctionBody }) | undefined,
    node: ClassDeclaration | ClassExpression,
    extendsClauseElement: ExpressionWithTypeArguments | undefined,
    hasSynthesizedSuper: boolean
  ) {
    const isDerivedClass = !!extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== Syntax.NullKeyword;
    if (!constructor) return createDefaultConstructorBody(node, isDerivedClass);
    const prologue: Statement[] = [];
    const statements: Statement[] = [];
    resumeLexicalEnvironment();
    let statementOffset = 0;
    if (!hasSynthesizedSuper) statementOffset = addStandardPrologue(prologue, constructor.body.statements, false);
    addDefaultValueAssignmentsIfNeeded(statements, constructor);
    addRestParameterIfNeeded(statements, constructor, hasSynthesizedSuper);
    if (!hasSynthesizedSuper) statementOffset = addCustomPrologue(statements, constructor.body.statements, statementOffset, visitor);
    let superCallExpression: Expression | undefined;
    if (hasSynthesizedSuper) {
      superCallExpression = createDefaultSuperCallOrThis();
    } else if (isDerivedClass && statementOffset < constructor.body.statements.length) {
      const firstStatement = constructor.body.statements[statementOffset];
      if (Node.is.kind(ExpressionStatement, firstStatement) && Node.is.superCall(firstStatement.expression)) {
        superCallExpression = visitImmediateSuperCallInBody(firstStatement.expression);
      }
    }
    if (superCallExpression) {
      hierarchyFacts |= HierarchyFacts.ConstructorWithCapturedSuper;
      statementOffset++;
    }
    addRange(statements, Nodes.visit(constructor.body.statements, visitor, isStatement, statementOffset));
    mergeLexicalEnvironment(prologue, endLexicalEnvironment());
    insertCaptureNewTargetIfNeeded(prologue, constructor, false);
    if (isDerivedClass) {
      if (superCallExpression && statementOffset === constructor.body.statements.length && !(constructor.body.transformFlags & TransformFlags.ContainsLexicalThis)) {
        const superCall = cast(cast(superCallExpression, isBinaryExpression).left, isCallExpression);
        const returnStatement = createReturn(superCallExpression);
        setCommentRange(returnStatement, getCommentRange(superCall));
        setEmitFlags(superCall, EmitFlags.NoComments);
        statements.push(returnStatement);
      } else {
        insertCaptureThisForNode(statements, constructor, superCallExpression || createActualThis());
        if (!isSufficientlyCoveredByReturnStatements(constructor.body)) {
          statements.push(createReturn(createFileLevelUniqueName('_this')));
        }
      }
    } else {
      insertCaptureThisForNodeIfNeeded(prologue, constructor);
    }
    const block = new Block(setRange(new Nodes(concatenate(prologue, statements)), true));
    setRange(block, constructor.body);
    return block;
  }
  function isSufficientlyCoveredByReturnStatements(statement: Statement): boolean {
    if (statement.kind === Syntax.ReturnStatement) return true;
    else if (statement.kind === Syntax.IfStatement) {
      const ifStatement = statement as IfStatement;
      if (ifStatement.elseStatement) return isSufficientlyCoveredByReturnStatements(ifStatement.thenStatement) && isSufficientlyCoveredByReturnStatements(ifStatement.elseStatement);
    } else if (statement.kind === Syntax.Block) {
      const lastStatement = lastOrUndefined((statement as Block).statements);
      if (lastStatement && isSufficientlyCoveredByReturnStatements(lastStatement)) return true;
    }
    return false;
  }
  function createActualThis() {
    return setEmitFlags(createThis(), EmitFlags.NoSubstitution);
  }
  function createDefaultSuperCallOrThis() {
    return createLogicalOr(
      createLogicalAnd(
        createStrictInequality(createFileLevelUniqueName('_super'), createNull()),
        createFunctionApply(createFileLevelUniqueName('_super'), createActualThis(), new Identifier('arguments'))
      ),
      createActualThis()
    );
  }
  function visitParameter(node: ParameterDeclaration): ParameterDeclaration | undefined {
    if (node.dot3Token) {
      return;
    } else if (Node.is.kind(BindingPattern, node.name)) {
      return setOriginalNode(setRange(createParameter(undefined, undefined, undefined, getGeneratedNameForNode(node), undefined, undefined, undefined), node), node);
    } else if (node.initializer) {
      return setOriginalNode(setRange(createParameter(undefined, undefined, undefined, undefined), node), node);
    }
    return node;
  }
  function hasDefaultValueOrBindingPattern(node: ParameterDeclaration) {
    return node.initializer !== undefined || Node.is.kind(BindingPattern, node.name);
  }
  function addDefaultValueAssignmentsIfNeeded(statements: Statement[], node: FunctionLikeDeclaration): boolean {
    if (!some(node.parameters, hasDefaultValueOrBindingPattern)) return false;
    let added = false;
    for (const parameter of node.parameters) {
      const { name, initializer, dot3Token } = parameter;
      if (dot3Token) {
        continue;
      }
      if (Node.is.kind(BindingPattern, name)) {
        added = insertDefaultValueAssignmentForBindingPattern(statements, parameter, name, initializer) || added;
      } else if (initializer) {
        insertDefaultValueAssignmentForInitializer(statements, parameter, name, initializer);
        added = true;
      }
    }
    return added;
  }
  function insertDefaultValueAssignmentForBindingPattern(statements: Statement[], parameter: ParameterDeclaration, name: BindingPattern, initializer: Expression | undefined): boolean {
    if (name.elements.length > 0) {
      insertStatementAfterCustomPrologue(
        statements,
        setEmitFlags(
          createVariableStatement(undefined, createVariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, getGeneratedNameForNode(parameter)))),
          EmitFlags.CustomPrologue
        )
      );
      return true;
    } else if (initializer) {
      insertStatementAfterCustomPrologue(
        statements,
        setEmitFlags(new qc.ExpressionStatement(createAssignment(getGeneratedNameForNode(parameter), visitNode(initializer, visitor, isExpression))), EmitFlags.CustomPrologue)
      );
      return true;
    }
    return false;
  }
  function insertDefaultValueAssignmentForInitializer(statements: Statement[], parameter: ParameterDeclaration, name: Identifier, initializer: Expression): void {
    initializer = visitNode(initializer, visitor, isExpression);
    const statement = createIf(
      createTypeCheck(getSynthesizedClone(name), 'undefined'),
      setEmitFlags(
        setRange(
          new Block([
            new qc.ExpressionStatement(
              setEmitFlags(
                setRange(
                  createAssignment(
                    setEmitFlags(getMutableClone(name), EmitFlags.NoSourceMap),
                    setEmitFlags(initializer, EmitFlags.NoSourceMap | Node.get.emitFlags(initializer) | EmitFlags.NoComments)
                  ),
                  parameter
                ),
                EmitFlags.NoComments
              )
            ),
          ]),
          parameter
        ),
        EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments
      )
    );
    startOnNewLine(statement);
    setRange(statement, parameter);
    setEmitFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.CustomPrologue | EmitFlags.NoComments);
    insertStatementAfterCustomPrologue(statements, statement);
  }
  function shouldAddRestParameter(node: ParameterDeclaration | undefined, inConstructorWithSynthesizedSuper: boolean): node is ParameterDeclaration {
    return !!(node && node.dot3Token && !inConstructorWithSynthesizedSuper);
  }
  function addRestParameterIfNeeded(statements: Statement[], node: FunctionLikeDeclaration, inConstructorWithSynthesizedSuper: boolean): boolean {
    const prologueStatements: Statement[] = [];
    const parameter = lastOrUndefined(node.parameters);
    if (!shouldAddRestParameter(parameter, inConstructorWithSynthesizedSuper)) return false;
    const declarationName = parameter.name.kind === Syntax.Identifier ? getMutableClone(parameter.name) : createTempVariable(undefined);
    setEmitFlags(declarationName, EmitFlags.NoSourceMap);
    const expressionName = parameter.name.kind === Syntax.Identifier ? getSynthesizedClone(parameter.name) : declarationName;
    const restIndex = node.parameters.length - 1;
    const temp = createLoopVariable();
    prologueStatements.push(
      setEmitFlags(
        setRange(createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(declarationName, undefined, new ArrayLiteralExpression([]))])), parameter),
        EmitFlags.CustomPrologue
      )
    );
    const forStatement = new qc.ForStatement(
      setRange(createVariableDeclarationList([createVariableDeclaration(temp, undefined, createLiteral(restIndex))]), parameter),
      setRange(createLessThan(temp, createPropertyAccess(new Identifier('arguments'), 'length')), parameter),
      setRange(qs.PostfixUnaryExpression.increment(temp), parameter),
      new Block([
        startOnNewLine(
          setRange(
            new qc.ExpressionStatement(
              createAssignment(
                new qs.ElementAccessExpression(expressionName, restIndex === 0 ? temp : createSubtract(temp, createLiteral(restIndex))),
                new qs.ElementAccessExpression(new Identifier('arguments'), temp)
              )
            ),
            parameter
          )
        ),
      ])
    );
    setEmitFlags(forStatement, EmitFlags.CustomPrologue);
    startOnNewLine(forStatement);
    prologueStatements.push(forStatement);
    if (parameter.name.kind !== Syntax.Identifier) {
      prologueStatements.push(
        setEmitFlags(
          setRange(createVariableStatement(undefined, createVariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, expressionName))), parameter),
          EmitFlags.CustomPrologue
        )
      );
    }
    insertStatementsAfterCustomPrologue(statements, prologueStatements);
    return true;
  }
  function insertCaptureThisForNodeIfNeeded(statements: Statement[], node: Node): boolean {
    if (hierarchyFacts & HierarchyFacts.CapturedLexicalThis && node.kind !== Syntax.ArrowFunction) {
      insertCaptureThisForNode(statements, node, createThis());
      return true;
    }
    return false;
  }
  function insertCaptureThisForNode(statements: Statement[], node: Node, initializer: Expression | undefined): void {
    enableSubstitutionsForCapturedThis();
    const captureThisStatement = createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(createFileLevelUniqueName('_this'), undefined, initializer)]));
    setEmitFlags(captureThisStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
    setSourceMapRange(captureThisStatement, node);
    insertStatementAfterCustomPrologue(statements, captureThisStatement);
  }
  function insertCaptureNewTargetIfNeeded(statements: Statement[], node: FunctionLikeDeclaration, copyOnWrite: boolean): Statement[] {
    if (hierarchyFacts & HierarchyFacts.NewTarget) {
      let newTarget: Expression;
      switch (node.kind) {
        case Syntax.ArrowFunction:
          return statements;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          newTarget = qs.VoidExpression.zero();
          break;
        case Syntax.Constructor:
          newTarget = createPropertyAccess(setEmitFlags(createThis(), EmitFlags.NoSubstitution), 'constructor');
          break;
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          newTarget = new qc.ConditionalExpression(
            createLogicalAnd(
              setEmitFlags(createThis(), EmitFlags.NoSubstitution),
              new BinaryExpression(setEmitFlags(createThis(), EmitFlags.NoSubstitution), Syntax.InstanceOfKeyword, getLocalName(node))
            ),
            createPropertyAccess(setEmitFlags(createThis(), EmitFlags.NoSubstitution), 'constructor'),
            qs.VoidExpression.zero()
          );
          break;
        default:
          return Debug.failBadSyntax(node);
      }
      const captureNewTargetStatement = createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(createFileLevelUniqueName('_newTarget'), undefined, newTarget)]));
      setEmitFlags(captureNewTargetStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
      if (copyOnWrite) {
        statements = statements.slice();
      }
      insertStatementAfterCustomPrologue(statements, captureNewTargetStatement);
    }
    return statements;
  }
  function addClassMembers(statements: Statement[], node: ClassExpression | ClassDeclaration): void {
    for (const member of node.members) {
      switch (member.kind) {
        case Syntax.SemicolonClassElement:
          statements.push(transformSemicolonClassElementToStatement(<SemicolonClassElement>member));
          break;
        case Syntax.MethodDeclaration:
          statements.push(transformClassMethodDeclarationToStatement(getClassMemberPrefix(node, member), <MethodDeclaration>member, node));
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const accessors = getAllAccessorDeclarations(node.members, <AccessorDeclaration>member);
          if (member === accessors.firstAccessor) {
            statements.push(transformAccessorsToStatement(getClassMemberPrefix(node, member), accessors, node));
          }
          break;
        case Syntax.Constructor:
          break;
        default:
          Debug.failBadSyntax(member, currentSourceFile && currentSourceFile.fileName);
          break;
      }
    }
  }
  function transformSemicolonClassElementToStatement(member: SemicolonClassElement) {
    return setRange(createEmptyStatement(), member);
  }
  function transformClassMethodDeclarationToStatement(receiver: LeftHandSideExpression, member: MethodDeclaration, container: Node) {
    const commentRange = getCommentRange(member);
    const sourceMapRange = getSourceMapRange(member);
    const memberFunction = transformFunctionLikeToExpression(member, undefined, container);
    const propertyName = visitNode(member.name, visitor, isPropertyName);
    let e: Expression;
    if (!Node.is.kind(PrivateIdentifier, propertyName) && context.getCompilerOptions().useDefineForClassFields) {
      const name = Node.is.kind(ComputedPropertyName, propertyName)
        ? propertyName.expression
        : Node.is.kind(Identifier, propertyName)
        ? StringLiteral.create(syntax.get.unescUnderscores(propertyName.escapedText))
        : propertyName;
      e = createObjectDefinePropertyCall(receiver, name, createPropertyDescriptor({ value: memberFunction, enumerable: false, writable: true, configurable: true }));
    } else {
      const memberName = createMemberAccessForPropertyName(receiver, propertyName, member.name);
      e = createAssignment(memberName, memberFunction);
    }
    setEmitFlags(memberFunction, EmitFlags.NoComments);
    setSourceMapRange(memberFunction, sourceMapRange);
    const statement = setRange(new qc.ExpressionStatement(e), member);
    setOriginalNode(statement, member);
    setCommentRange(statement, commentRange);
    setEmitFlags(statement, EmitFlags.NoSourceMap);
    return statement;
  }
  function transformAccessorsToStatement(receiver: LeftHandSideExpression, accessors: AllAccessorDeclarations, container: Node): Statement {
    const statement = new qc.ExpressionStatement(transformAccessorsToExpression(receiver, accessors, container, false));
    setEmitFlags(statement, EmitFlags.NoComments);
    setSourceMapRange(statement, getSourceMapRange(accessors.firstAccessor));
    return statement;
  }
  function transformAccessorsToExpression(
    receiver: LeftHandSideExpression,
    { firstAccessor, getAccessor, setAccessor }: AllAccessorDeclarations,
    container: Node,
    startsOnNewLine: boolean
  ): Expression {
    const target = getMutableClone(receiver);
    setEmitFlags(target, EmitFlags.NoComments | EmitFlags.NoTrailingSourceMap);
    setSourceMapRange(target, firstAccessor.name);
    const visitedAccessorName = visitNode(firstAccessor.name, visitor, isPropertyName);
    if (Node.is.kind(PrivateIdentifier, visitedAccessorName)) return Debug.failBadSyntax(visitedAccessorName, 'Encountered unhandled private identifier while transforming ES2015.');
    const propertyName = createExpressionForPropertyName(visitedAccessorName);
    setEmitFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoLeadingSourceMap);
    setSourceMapRange(propertyName, firstAccessor.name);
    const properties: ObjectLiteralElementLike[] = [];
    if (getAccessor) {
      const getterFunction = transformFunctionLikeToExpression(getAccessor, undefined, container);
      setSourceMapRange(getterFunction, getSourceMapRange(getAccessor));
      setEmitFlags(getterFunction, EmitFlags.NoLeadingComments);
      const getter = createPropertyAssignment('get', getterFunction);
      setCommentRange(getter, getCommentRange(getAccessor));
      properties.push(getter);
    }
    if (setAccessor) {
      const setterFunction = transformFunctionLikeToExpression(setAccessor, undefined, container);
      setSourceMapRange(setterFunction, getSourceMapRange(setAccessor));
      setEmitFlags(setterFunction, EmitFlags.NoLeadingComments);
      const setter = createPropertyAssignment('set', setterFunction);
      setCommentRange(setter, getCommentRange(setAccessor));
      properties.push(setter);
    }
    properties.push(createPropertyAssignment('enumerable', getAccessor || setAccessor ? createFalse() : createTrue()), createPropertyAssignment('configurable', createTrue()));
    const call = new qs.CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'), undefined, [target, propertyName, createObjectLiteral(properties, true)]);
    if (startsOnNewLine) {
      startOnNewLine(call);
    }
    return call;
  }
  function visitArrowFunction(node: ArrowFunction) {
    if (node.transformFlags & TransformFlags.ContainsLexicalThis) {
      hierarchyFacts |= HierarchyFacts.CapturedLexicalThis;
    }
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.ArrowFunctionExcludes, HierarchyFacts.ArrowFunctionIncludes);
    const func = new qs.FunctionExpression(undefined, undefined, undefined, undefined, visitParameterList(node.parameters, visitor, context), undefined, transformFunctionBody(node));
    setRange(func, node);
    setOriginalNode(func, node);
    setEmitFlags(func, EmitFlags.CapturesThis);
    if (hierarchyFacts & HierarchyFacts.CapturedLexicalThis) {
      enableSubstitutionsForCapturedThis();
    }
    exitSubtree(ancestorFacts, HierarchyFacts.ArrowFunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return func;
  }
  function visitFunctionExpression(node: FunctionExpression): Expression {
    const ancestorFacts =
      Node.get.emitFlags(node) & EmitFlags.AsyncFunctionBody
        ? enterSubtree(HierarchyFacts.AsyncFunctionBodyExcludes, HierarchyFacts.AsyncFunctionBodyIncludes)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const parameters = visitParameterList(node.parameters, visitor, context);
    const body = transformFunctionBody(node);
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? getLocalName(node) : node.name;
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return node.update(undefined, parameters, undefined, body);
  }
  function visitFunctionDeclaration(node: FunctionDeclaration): FunctionDeclaration {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const parameters = visitParameterList(node.parameters, visitor, context);
    const body = transformFunctionBody(node);
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? getLocalName(node) : node.name;
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), node.asteriskToken, name, undefined, parameters, undefined, body);
  }
  function transformFunctionLikeToExpression(node: FunctionLikeDeclaration, location: TextRange | undefined, name: Identifier | undefined, container: Node | undefined): FunctionExpression {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts =
      container && Node.is.classLike(container) && !hasSyntacticModifier(node, ModifierFlags.Static)
        ? enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes | HierarchyFacts.NonStaticClassElement)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const parameters = visitParameterList(node.parameters, visitor, context);
    const body = transformFunctionBody(node);
    if (hierarchyFacts & HierarchyFacts.NewTarget && !name && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression)) {
      name = getGeneratedNameForNode(node);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return setOriginalNode(setRange(new qs.FunctionExpression(undefined, parameters, undefined, body), location), node);
  }
  function transformFunctionBody(node: FunctionLikeDeclaration) {
    let multiLine = false;
    let singleLine = false;
    let statementsLocation: TextRange;
    let closeBraceLocation: TextRange | undefined;
    const prologue: Statement[] = [];
    const statements: Statement[] = [];
    const body = node.body!;
    let statementOffset: number | undefined;
    resumeLexicalEnvironment();
    if (Node.is.kind(Block, body)) {
      statementOffset = addStandardPrologue(prologue, body.statements, false);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, isHoistedFunction);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, isHoistedVariableStatement);
    }
    multiLine = addDefaultValueAssignmentsIfNeeded(statements, node) || multiLine;
    multiLine = addRestParameterIfNeeded(statements, node, false) || multiLine;
    if (Node.is.kind(Block, body)) {
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor);
      statementsLocation = body.statements;
      addRange(statements, Nodes.visit(body.statements, visitor, isStatement, statementOffset));
      if (!multiLine && body.multiLine) {
        multiLine = true;
      }
    } else {
      assert(node.kind === Syntax.ArrowFunction);
      statementsLocation = moveRangeEnd(body, -1);
      const equalsGreaterThanToken = node.equalsGreaterThanToken;
      if (!isSynthesized(equalsGreaterThanToken) && !isSynthesized(body)) {
        if (endOnSameLineAsStart(equalsGreaterThanToken, body, currentSourceFile)) {
          singleLine = true;
        } else {
          multiLine = true;
        }
      }
      const expression = visitNode(body, visitor, isExpression);
      const returnStatement = createReturn(expression);
      setRange(returnStatement, body);
      moveSyntheticComments(returnStatement, body);
      setEmitFlags(returnStatement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTrailingComments);
      statements.push(returnStatement);
      closeBraceLocation = body;
    }
    mergeLexicalEnvironment(prologue, endLexicalEnvironment());
    insertCaptureNewTargetIfNeeded(prologue, node, false);
    insertCaptureThisForNodeIfNeeded(prologue, node);
    if (some(prologue)) {
      multiLine = true;
    }
    statements.unshift(...prologue);
    if (Node.is.kind(Block, body) && arrayIsEqualTo(statements, body.statements)) return body;
    const block = new Block(setRange(new Nodes(statements), statementsLocation), multiLine);
    setRange(block, node.body);
    if (!multiLine && singleLine) {
      setEmitFlags(block, EmitFlags.SingleLine);
    }
    if (closeBraceLocation) {
      setTokenSourceMapRange(block, Syntax.CloseBraceToken, closeBraceLocation);
    }
    setOriginalNode(block, node.body);
    return block;
  }
  function visitBlock(node: Block, isFunctionBody: boolean): Block {
    if (isFunctionBody) return visitEachChild(node, visitor, context);
    const ancestorFacts =
      hierarchyFacts & HierarchyFacts.IterationStatement
        ? enterSubtree(HierarchyFacts.IterationStatementBlockExcludes, HierarchyFacts.IterationStatementBlockIncludes)
        : enterSubtree(HierarchyFacts.BlockExcludes, HierarchyFacts.BlockIncludes);
    const updated = visitEachChild(node, visitor, context);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitExpressionStatement(node: ExpressionStatement): Statement {
    switch (node.expression.kind) {
      case Syntax.ParenthesizedExpression:
        return node.update(visitParenthesizedExpression(<ParenthesizedExpression>node.expression, false));
      case Syntax.BinaryExpression:
        return node.update(visitBinaryExpression(<BinaryExpression>node.expression, false));
    }
    return visitEachChild(node, visitor, context);
  }
  function visitParenthesizedExpression(node: ParenthesizedExpression, needsDestructuringValue: boolean): ParenthesizedExpression {
    if (!needsDestructuringValue) {
      switch (node.expression.kind) {
        case Syntax.ParenthesizedExpression:
          return node.update(visitParenthesizedExpression(<ParenthesizedExpression>node.expression, false));
        case Syntax.BinaryExpression:
          return node.update(visitBinaryExpression(<BinaryExpression>node.expression, false));
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitBinaryExpression(node: BinaryExpression, needsDestructuringValue: boolean): Expression {
    if (isDestructuringAssignment(node)) return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, needsDestructuringValue);
    return visitEachChild(node, visitor, context);
  }
  function isVariableStatementOfTypeScriptClassWrapper(node: VariableStatement) {
    return (
      node.declarationList.declarations.length === 1 &&
      !!node.declarationList.declarations[0].initializer &&
      !!(Node.get.emitFlags(node.declarationList.declarations[0].initializer) & EmitFlags.TypeScriptClassWrapper)
    );
  }
  function visitVariableStatement(node: VariableStatement): Statement | undefined {
    const ancestorFacts = enterSubtree(HierarchyFacts.None, hasSyntacticModifier(node, ModifierFlags.Export) ? HierarchyFacts.ExportedVariableStatement : HierarchyFacts.None);
    let updated: Statement | undefined;
    if (convertedLoopState && (node.declarationList.flags & NodeFlags.BlockScoped) === 0 && !isVariableStatementOfTypeScriptClassWrapper(node)) {
      let assignments: Expression[] | undefined;
      for (const decl of node.declarationList.declarations) {
        hoistVariableDeclarationDeclaredInConvertedLoop(convertedLoopState, decl);
        if (decl.initializer) {
          let assignment: Expression;
          if (Node.is.kind(BindingPattern, decl.name)) {
            assignment = flattenDestructuringAssignment(decl, visitor, context, FlattenLevel.All);
          } else {
            assignment = new BinaryExpression(decl.name, Syntax.EqualsToken, visitNode(decl.initializer, visitor, isExpression));
            setRange(assignment, decl);
          }
          assignments = append(assignments, assignment);
        }
      }
      if (assignments) {
        updated = setRange(new qc.ExpressionStatement(inlineExpressions(assignments)), node);
      } else {
        updated = undefined;
      }
    } else {
      updated = visitEachChild(node, visitor, context);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitVariableDeclarationList(node: VariableDeclarationList): VariableDeclarationList {
    if (node.flags & NodeFlags.BlockScoped || node.transformFlags & TransformFlags.ContainsBindingPattern) {
      if (node.flags & NodeFlags.BlockScoped) {
        enableSubstitutionsForBlockScopedBindings();
      }
      const declarations = flatMap(node.declarations, node.flags & NodeFlags.Let ? visitVariableDeclarationInLetDeclarationList : visitVariableDeclaration);
      const declarationList = createVariableDeclarationList(declarations);
      setOriginalNode(declarationList, node);
      setRange(declarationList, node);
      setCommentRange(declarationList, node);
      if (node.transformFlags & TransformFlags.ContainsBindingPattern && (Node.is.kind(BindingPattern, node.declarations[0].name) || Node.is.kind(BindingPattern, last(node.declarations).name))) {
        setSourceMapRange(declarationList, getRangeUnion(declarations));
      }
      return declarationList;
    }
    return visitEachChild(node, visitor, context);
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
  function shouldEmitExplicitInitializerForLetDeclaration(node: VariableDeclaration) {
    const flags = resolver.getNodeCheckFlags(node);
    const isCapturedInFunction = flags & NodeCheckFlags.CapturedBlockScopedBinding;
    const isDeclaredInLoop = flags & NodeCheckFlags.BlockScopedBindingInLoop;
    const emittedAsTopLevel = (hierarchyFacts & HierarchyFacts.TopLevel) !== 0 || (isCapturedInFunction && isDeclaredInLoop && (hierarchyFacts & HierarchyFacts.IterationStatementBlock) !== 0);
    const emitExplicitInitializer =
      !emittedAsTopLevel &&
      (hierarchyFacts & HierarchyFacts.ForInOrForOfStatement) === 0 &&
      (!resolver.isDeclarationWithCollidingName(node) || (isDeclaredInLoop && !isCapturedInFunction && (hierarchyFacts & (HierarchyFacts.ForStatement | HierarchyFacts.ForInOrForOfStatement)) === 0));
    return emitExplicitInitializer;
  }
  function visitVariableDeclarationInLetDeclarationList(node: VariableDeclaration) {
    const name = node.name;
    if (Node.is.kind(BindingPattern, name)) return visitVariableDeclaration(node);
    if (!node.initializer && shouldEmitExplicitInitializerForLetDeclaration(node)) {
      const clone = getMutableClone(node);
      clone.initializer = qs.VoidExpression.zero();
      return clone;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitVariableDeclaration(node: VariableDeclaration): VisitResult<VariableDeclaration> {
    const ancestorFacts = enterSubtree(HierarchyFacts.ExportedVariableStatement, HierarchyFacts.None);
    let updated: VisitResult<VariableDeclaration>;
    if (Node.is.kind(BindingPattern, node.name)) {
      updated = flattenDestructuringBinding(node, visitor, context, FlattenLevel.All, undefined, (ancestorFacts & HierarchyFacts.ExportedVariableStatement) !== 0);
    } else {
      updated = visitEachChild(node, visitor, context);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function recordLabel(node: LabeledStatement) {
    convertedLoopState!.labels!.set(idText(node.label), true);
  }
  function resetLabel(node: LabeledStatement) {
    convertedLoopState!.labels!.set(idText(node.label), false);
  }
  function visitLabeledStatement(node: LabeledStatement): VisitResult<Statement> {
    if (convertedLoopState && !convertedLoopState.labels) {
      convertedLoopState.labels = createMap<boolean>();
    }
    const statement = unwrapInnermostStatementOfLabel(node, convertedLoopState && recordLabel);
    return Node.is.iterationStatement(statement, false)
      ? visitIterationStatement(statement, node)
      : restoreEnclosingLabel(visitNode(statement, visitor, isStatement, liftToBlock), node, convertedLoopState && resetLabel);
  }
  function visitIterationStatement(node: IterationStatement, outermostLabeledStatement: LabeledStatement) {
    switch (node.kind) {
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        return visitDoOrWhileStatement(<DoStatement | WhileStatement>node, outermostLabeledStatement);
      case Syntax.ForStatement:
        return visitForStatement(<ForStatement>node, outermostLabeledStatement);
      case Syntax.ForInStatement:
        return visitForInStatement(<ForInStatement>node, outermostLabeledStatement);
      case Syntax.ForOfStatement:
        return visitForOfStatement(<ForOfStatement>node, outermostLabeledStatement);
    }
  }
  function visitIterationStatementWithFacts(
    excludeFacts: HierarchyFacts,
    includeFacts: HierarchyFacts,
    node: IterationStatement,
    outermostLabeledStatement: LabeledStatement | undefined,
    convert?: LoopConverter
  ) {
    const ancestorFacts = enterSubtree(excludeFacts, includeFacts);
    const updated = convertIterationStatementBodyIfNecessary(node, outermostLabeledStatement, ancestorFacts, convert);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitDoOrWhileStatement(node: DoStatement | WhileStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationStatementWithFacts(HierarchyFacts.DoOrWhileStatementExcludes, HierarchyFacts.DoOrWhileStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForStatement(node: ForStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationStatementWithFacts(HierarchyFacts.ForStatementExcludes, HierarchyFacts.ForStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForInStatement(node: ForInStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationStatementWithFacts(HierarchyFacts.ForInOrForOfStatementExcludes, HierarchyFacts.ForInOrForOfStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForOfStatement(node: ForOfStatement, outermostLabeledStatement: LabeledStatement | undefined): VisitResult<Statement> {
    return visitIterationStatementWithFacts(
      HierarchyFacts.ForInOrForOfStatementExcludes,
      HierarchyFacts.ForInOrForOfStatementIncludes,
      node,
      outermostLabeledStatement,
      compilerOptions.downlevelIteration ? convertForOfStatementForIterable : convertForOfStatementForArray
    );
  }
  function convertForOfStatementHead(node: ForOfStatement, boundValue: Expression, convertedLoopBodyStatements: Statement[]) {
    const statements: Statement[] = [];
    const initializer = node.initializer;
    if (Node.is.kind(VariableDeclarationList, initializer)) {
      if (node.initializer.flags & NodeFlags.BlockScoped) {
        enableSubstitutionsForBlockScopedBindings();
      }
      const firstOriginalDeclaration = firstOrUndefined(initializer.declarations);
      if (firstOriginalDeclaration && Node.is.kind(BindingPattern, firstOriginalDeclaration.name)) {
        const declarations = flattenDestructuringBinding(firstOriginalDeclaration, visitor, context, FlattenLevel.All, boundValue);
        const declarationList = setRange(createVariableDeclarationList(declarations), node.initializer);
        setOriginalNode(declarationList, node.initializer);
        setSourceMapRange(declarationList, createRange(declarations[0].pos, last(declarations).end));
        statements.push(createVariableStatement(undefined, declarationList));
      } else {
        statements.push(
          setRange(
            createVariableStatement(
              undefined,
              setOriginalNode(
                setRange(
                  createVariableDeclarationList([createVariableDeclaration(firstOriginalDeclaration ? firstOriginalDeclaration.name : createTempVariable(undefined), undefined, boundValue)]),
                  moveRangePos(initializer, -1)
                ),
                initializer
              )
            ),
            moveRangeEnd(initializer, -1)
          )
        );
      }
    } else {
      const assignment = createAssignment(initializer, boundValue);
      if (isDestructuringAssignment(assignment)) {
        aggregateTransformFlags(assignment);
        statements.push(new qc.ExpressionStatement(visitBinaryExpression(assignment, false)));
      } else {
        assignment.end = initializer.end;
        statements.push(setRange(new qc.ExpressionStatement(visitNode(assignment, visitor, isExpression)), moveRangeEnd(initializer, -1)));
      }
    }
    if (convertedLoopBodyStatements) return createSyntheticBlockForConvertedStatements(addRange(statements, convertedLoopBodyStatements));
    else {
      const statement = visitNode(node.statement, visitor, isStatement, liftToBlock);
      if (Node.is.kind(Block, statement)) return statement.update(setRange(new Nodes(concatenate(statements, statement.statements)), statement.statements));
      statements.push(statement);
      return createSyntheticBlockForConvertedStatements(statements);
    }
  }
}
function createSyntheticBlockForConvertedStatements(statements: Statement[]) {
  return setEmitFlags(new Block(new Nodes(statements), true), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
}
function convertForOfStatementForArray(node: ForOfStatement, outermostLabeledStatement: LabeledStatement, convertedLoopBodyStatements: Statement[]): Statement {
  const expression = visitNode(node.expression, visitor, isExpression);
  const counter = createLoopVariable();
  const rhsReference = Node.is.kind(Identifier, expression) ? getGeneratedNameForNode(expression) : createTempVariable(undefined);
  setEmitFlags(expression, EmitFlags.NoSourceMap | Node.get.emitFlags(expression));
  const forStatement = setRange(
    new qc.ForStatement(
      setEmitFlags(
        setRange(
          createVariableDeclarationList([
            setRange(createVariableDeclaration(counter, undefined, createLiteral(0)), moveRangePos(node.expression, -1)),
            setRange(createVariableDeclaration(rhsReference, undefined, expression), node.expression),
          ]),
          node.expression
        ),
        EmitFlags.NoHoisting
      ),
      setRange(createLessThan(counter, createPropertyAccess(rhsReference, 'length')), node.expression),
      setRange(qs.PostfixUnaryExpression.increment(counter), node.expression),
      convertForOfStatementHead(node, new qs.ElementAccessExpression(rhsReference, counter), convertedLoopBodyStatements)
    ),
    node
  );
  setEmitFlags(forStatement, EmitFlags.NoTokenTrailingSourceMaps);
  setRange(forStatement, node);
  return restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel);
}
function convertForOfStatementForIterable(node: ForOfStatement, outermostLabeledStatement: LabeledStatement, convertedLoopBodyStatements: Statement[], ancestorFacts: HierarchyFacts): Statement {
  const expression = visitNode(node.expression, visitor, isExpression);
  const iterator = Node.is.kind(Identifier, expression) ? getGeneratedNameForNode(expression) : createTempVariable(undefined);
  const result = Node.is.kind(Identifier, expression) ? getGeneratedNameForNode(iterator) : createTempVariable(undefined);
  const errorRecord = createUniqueName('e');
  const catchVariable = getGeneratedNameForNode(errorRecord);
  const returnMethod = createTempVariable(undefined);
  const values = createValuesHelper(context, expression, node.expression);
  const next = new qs.CallExpression(createPropertyAccess(iterator, 'next'), undefined, []);
  hoistVariableDeclaration(errorRecord);
  hoistVariableDeclaration(returnMethod);
  const initializer = ancestorFacts & HierarchyFacts.IterationContainer ? inlineExpressions([createAssignment(errorRecord, qs.VoidExpression.zero()), values]) : values;
  const forStatement = setEmitFlags(
    setRange(
      new qc.ForStatement(
        setEmitFlags(
          setRange(
            createVariableDeclarationList([setRange(createVariableDeclaration(iterator, undefined, initializer), node.expression), createVariableDeclaration(result, undefined, next)]),
            node.expression
          ),
          EmitFlags.NoHoisting
        ),
        qs.PrefixUnaryExpression.logicalNot(createPropertyAccess(result, 'done')),
        createAssignment(result, next),
        convertForOfStatementHead(node, createPropertyAccess(result, 'value'), convertedLoopBodyStatements)
      ),
      node
    ),
    EmitFlags.NoTokenTrailingSourceMaps
  );
  return createTry(
    new Block([restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel)]),
    new qc.CatchClause(
      createVariableDeclaration(catchVariable),
      setEmitFlags(new Block([new qc.ExpressionStatement(createAssignment(errorRecord, createObjectLiteral([createPropertyAssignment('error', catchVariable)])))]), EmitFlags.SingleLine)
    ),
    new Block([
      createTry(
        new Block([
          setEmitFlags(
            createIf(
              createLogicalAnd(
                createLogicalAnd(result, qs.PrefixUnaryExpression.logicalNot(createPropertyAccess(result, 'done'))),
                createAssignment(returnMethod, createPropertyAccess(iterator, 'return'))
              ),
              new qc.ExpressionStatement(createFunctionCall(returnMethod, iterator, []))
            ),
            EmitFlags.SingleLine
          ),
        ]),
        undefined,
        setEmitFlags(new Block([setEmitFlags(createIf(errorRecord, createThrow(createPropertyAccess(errorRecord, 'error'))), EmitFlags.SingleLine)]), EmitFlags.SingleLine)
      ),
    ])
  );
}
function visitObjectLiteralExpression(node: ObjectLiteralExpression): Expression {
  const properties = node.properties;
  const numProperties = properties.length;
  let numInitialProperties = numProperties;
  let numInitialPropertiesWithoutYield = numProperties;
  for (let i = 0; i < numProperties; i++) {
    const property = properties[i];
    if (property.transformFlags & TransformFlags.ContainsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody && i < numInitialPropertiesWithoutYield) {
      numInitialPropertiesWithoutYield = i;
    }
    if (Debug.checkDefined(property.name).kind === Syntax.ComputedPropertyName) {
      numInitialProperties = i;
      break;
    }
  }
  if (numInitialProperties !== numProperties) {
    if (numInitialPropertiesWithoutYield < numInitialProperties) {
      numInitialProperties = numInitialPropertiesWithoutYield;
    }
    const temp = createTempVariable(hoistVariableDeclaration);
    const expressions: Expression[] = [];
    const assignment = createAssignment(
      temp,
      setEmitFlags(createObjectLiteral(Nodes.visit(properties, visitor, isObjectLiteralElementLike, 0, numInitialProperties), node.multiLine), EmitFlags.Indented)
    );
    if (node.multiLine) {
      startOnNewLine(assignment);
    }
    expressions.push(assignment);
    addObjectLiteralMembers(expressions, node, temp, numInitialProperties);
    expressions.push(node.multiLine ? startOnNewLine(getMutableClone(temp)) : temp);
    return inlineExpressions(expressions);
  }
  return visitEachChild(node, visitor, context);
}
interface ForStatementWithConvertibleInitializer extends ForStatement {
  initializer: VariableDeclarationList;
}
interface ForStatementWithConvertibleCondition extends ForStatement {
  condition: Expression;
}
interface ForStatementWithConvertibleIncrementor extends ForStatement {
  incrementor: Expression;
}
function shouldConvertPartOfIterationStatement(node: Node) {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ContainsCapturedBlockScopeBinding) !== 0;
}
function shouldConvertInitializerOfForStatement(node: IterationStatement): node is ForStatementWithConvertibleInitializer {
  return Node.is.kind(ForStatement, node) && !!node.initializer && shouldConvertPartOfIterationStatement(node.initializer);
}
function shouldConvertConditionOfForStatement(node: IterationStatement): node is ForStatementWithConvertibleCondition {
  return Node.is.kind(ForStatement, node) && !!node.condition && shouldConvertPartOfIterationStatement(node.condition);
}
function shouldConvertIncrementorOfForStatement(node: IterationStatement): node is ForStatementWithConvertibleIncrementor {
  return Node.is.kind(ForStatement, node) && !!node.incrementor && shouldConvertPartOfIterationStatement(node.incrementor);
}
function shouldConvertIterationStatement(node: IterationStatement) {
  return shouldConvertBodyOfIterationStatement(node) || shouldConvertInitializerOfForStatement(node);
}
function shouldConvertBodyOfIterationStatement(node: IterationStatement): boolean {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.LoopWithCapturedBlockScopedBinding) !== 0;
}
function hoistVariableDeclarationDeclaredInConvertedLoop(state: ConvertedLoopState, node: VariableDeclaration): void {
  if (!state.hoistedLocalVariables) {
    state.hoistedLocalVariables = [];
  }
  visit(node.name);
  function visit(node: Identifier | BindingPattern) {
    if (node.kind === Syntax.Identifier) {
      state.hoistedLocalVariables!.push(node);
    } else {
      for (const element of node.elements) {
        if (!Node.is.kind(OmittedExpression, element)) {
          visit(element.name);
        }
      }
    }
  }
}
function convertIterationStatementBodyIfNecessary(
  node: IterationStatement,
  outermostLabeledStatement: LabeledStatement | undefined,
  ancestorFacts: HierarchyFacts,
  convert?: LoopConverter
): VisitResult<Statement> {
  if (!shouldConvertIterationStatement(node)) {
    let saveAllowedNonLabeledJumps: Jump | undefined;
    if (convertedLoopState) {
      saveAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
      convertedLoopState.allowedNonLabeledJumps = Jump.Break | Jump.Continue;
    }
    const result = convert
      ? convert(node, outermostLabeledStatement, undefined, ancestorFacts)
      : restoreEnclosingLabel(visitEachChild(node, visitor, context), outermostLabeledStatement, convertedLoopState && resetLabel);
    if (convertedLoopState) {
      convertedLoopState.allowedNonLabeledJumps = saveAllowedNonLabeledJumps;
    }
    return result;
  }
  const currentState = createConvertedLoopState(node);
  const statements: Statement[] = [];
  const outerConvertedLoopState = convertedLoopState;
  convertedLoopState = currentState;
  const initializerFunction = shouldConvertInitializerOfForStatement(node) ? createFunctionForInitializerOfForStatement(node, currentState) : undefined;
  const bodyFunction = shouldConvertBodyOfIterationStatement(node) ? createFunctionForBodyOfIterationStatement(node, currentState, outerConvertedLoopState) : undefined;
  convertedLoopState = outerConvertedLoopState;
  if (initializerFunction) statements.push(initializerFunction.functionDeclaration);
  if (bodyFunction) statements.push(bodyFunction.functionDeclaration);
  addExtraDeclarationsForConvertedLoop(statements, currentState, outerConvertedLoopState);
  if (initializerFunction) {
    statements.push(generateCallToConvertedLoopInitializer(initializerFunction.functionName, initializerFunction.containsYield));
  }
  let loop: Statement;
  if (bodyFunction) {
    if (convert) {
      loop = convert(node, outermostLabeledStatement, bodyFunction.part, ancestorFacts);
    } else {
      const clone = convertIterationStatementCore(node, initializerFunction, new Block(bodyFunction.part, true));
      aggregateTransformFlags(clone);
      loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
    }
  } else {
    const clone = convertIterationStatementCore(node, initializerFunction, visitNode(node.statement, visitor, isStatement, liftToBlock));
    aggregateTransformFlags(clone);
    loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
  }
  statements.push(loop);
  return statements;
}
function convertIterationStatementCore(node: IterationStatement, initializerFunction: IterationStatementPartFunction<VariableDeclarationList> | undefined, convertedLoopBody: Statement) {
  switch (node.kind) {
    case Syntax.ForStatement:
      return convertForStatement(node as ForStatement, initializerFunction, convertedLoopBody);
    case Syntax.ForInStatement:
      return convertForInStatement(node as ForInStatement, convertedLoopBody);
    case Syntax.ForOfStatement:
      return convertForOfStatement(node as ForOfStatement, convertedLoopBody);
    case Syntax.DoStatement:
      return convertDoStatement(node as DoStatement, convertedLoopBody);
    case Syntax.WhileStatement:
      return convertWhileStatement(node as WhileStatement, convertedLoopBody);
    default:
      return Debug.failBadSyntax(node, 'IterationStatement expected');
  }
}
function convertForStatement(node: ForStatement, initializerFunction: IterationStatementPartFunction<VariableDeclarationList> | undefined, convertedLoopBody: Statement) {
  const shouldConvertCondition = node.condition && shouldConvertPartOfIterationStatement(node.condition);
  const shouldConvertIncrementor = shouldConvertCondition || (node.incrementor && shouldConvertPartOfIterationStatement(node.incrementor));
  return updateFor(
    node,
    visitNode(initializerFunction ? initializerFunction.part : node.initializer, visitor, isForInitializer),
    visitNode(shouldConvertCondition ? undefined : node.condition, visitor, isExpression),
    visitNode(shouldConvertIncrementor ? undefined : node.incrementor, visitor, isExpression),
    convertedLoopBody
  );
}
function convertForOfStatement(node: ForOfStatement, convertedLoopBody: Statement) {
  return node.update(undefined, visitNode(node.initializer, visitor, isForInitializer), visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertForInStatement(node: ForInStatement, convertedLoopBody: Statement) {
  return node.update(visitNode(node.initializer, visitor, isForInitializer), visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertDoStatement(node: DoStatement, convertedLoopBody: Statement) {
  return node.update(convertedLoopBody, visitNode(node.expression, visitor, isExpression));
}
function convertWhileStatement(node: WhileStatement, convertedLoopBody: Statement) {
  return node.update(visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function createConvertedLoopState(node: IterationStatement) {
  let loopInitializer: VariableDeclarationList | undefined;
  switch (node.kind) {
    case Syntax.ForStatement:
    case Syntax.ForInStatement:
    case Syntax.ForOfStatement:
      const initializer = (<ForStatement | ForInStatement | ForOfStatement>node).initializer;
      if (initializer && initializer.kind === Syntax.VariableDeclarationList) {
        loopInitializer = <VariableDeclarationList>initializer;
      }
      break;
  }
  const loopParameters: ParameterDeclaration[] = [];
  const loopOutParameters: LoopOutParameter[] = [];
  if (loopInitializer && Node.get.combinedFlagsOf(loopInitializer) & NodeFlags.BlockScoped) {
    const hasCapturedBindingsInForInitializer = shouldConvertInitializerOfForStatement(node);
    for (const decl of loopInitializer.declarations) {
      processLoopVariableDeclaration(node, decl, loopParameters, loopOutParameters, hasCapturedBindingsInForInitializer);
    }
  }
  const currentState: ConvertedLoopState = { loopParameters, loopOutParameters };
  if (convertedLoopState) {
    if (convertedLoopState.argumentsName) {
      currentState.argumentsName = convertedLoopState.argumentsName;
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
function addExtraDeclarationsForConvertedLoop(statements: Statement[], state: ConvertedLoopState, outerState: ConvertedLoopState | undefined) {
  let extraVariableDeclarations: VariableDeclaration[] | undefined;
  if (state.argumentsName) {
    if (outerState) {
      outerState.argumentsName = state.argumentsName;
    } else {
      (extraVariableDeclarations || (extraVariableDeclarations = [])).push(createVariableDeclaration(state.argumentsName, undefined, new Identifier('arguments')));
    }
  }
  if (state.thisName) {
    if (outerState) {
      outerState.thisName = state.thisName;
    } else {
      (extraVariableDeclarations || (extraVariableDeclarations = [])).push(createVariableDeclaration(state.thisName, undefined, new Identifier('this')));
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
        extraVariableDeclarations.push(createVariableDeclaration(identifier));
      }
    }
  }
  if (state.loopOutParameters.length) {
    if (!extraVariableDeclarations) {
      extraVariableDeclarations = [];
    }
    for (const outParam of state.loopOutParameters) {
      extraVariableDeclarations.push(createVariableDeclaration(outParam.outParamName));
    }
  }
  if (state.conditionVariable) {
    if (!extraVariableDeclarations) {
      extraVariableDeclarations = [];
    }
    extraVariableDeclarations.push(createVariableDeclaration(state.conditionVariable, undefined, createFalse()));
  }
  if (extraVariableDeclarations) {
    statements.push(createVariableStatement(undefined, createVariableDeclarationList(extraVariableDeclarations)));
  }
}
interface IterationStatementPartFunction<T> {
  functionName: Identifier;
  functionDeclaration: Statement;
  containsYield: boolean;
  part: T;
}
function createOutVariable(p: LoopOutParameter) {
  return createVariableDeclaration(p.originalName, undefined, p.outParamName);
}
function createFunctionForInitializerOfForStatement(node: ForStatementWithConvertibleInitializer, currentState: ConvertedLoopState): IterationStatementPartFunction<VariableDeclarationList> {
  const functionName = createUniqueName('_loop_init');
  const containsYield = (node.initializer.transformFlags & TransformFlags.ContainsYield) !== 0;
  let emitFlags = EmitFlags.None;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody) emitFlags |= EmitFlags.AsyncFunctionBody;
  const statements: Statement[] = [];
  statements.push(createVariableStatement(undefined, node.initializer));
  copyOutParameters(currentState.loopOutParameters, LoopOutParameterFlags.Initializer, CopyDirection.ToOutParameter, statements);
  const functionDeclaration = createVariableStatement(
    undefined,
    setEmitFlags(
      createVariableDeclarationList([
        createVariableDeclaration(
          functionName,
          undefined,
          setEmitFlags(
            new qs.FunctionExpression(
              undefined,
              containsYield ? new Token(Syntax.AsteriskToken) : undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              visitNode(new Block(statements, true), visitor, isBlock)
            ),
            emitFlags
          )
        ),
      ]),
      EmitFlags.NoHoisting
    )
  );
  const part = createVariableDeclarationList(map(currentState.loopOutParameters, createOutVariable));
  return { functionName, containsYield, functionDeclaration, part };
}
function createFunctionForBodyOfIterationStatement(
  node: IterationStatement,
  currentState: ConvertedLoopState,
  outerState: ConvertedLoopState | undefined
): IterationStatementPartFunction<Statement[]> {
  const functionName = createUniqueName('_loop');
  startLexicalEnvironment();
  const statement = visitNode(node.statement, visitor, isStatement, liftToBlock);
  const lexicalEnvironment = endLexicalEnvironment();
  const statements: Statement[] = [];
  if (shouldConvertConditionOfForStatement(node) || shouldConvertIncrementorOfForStatement(node)) {
    currentState.conditionVariable = createUniqueName('inc');
    statements.push(
      createIf(currentState.conditionVariable, createStatement(visitNode(node.incrementor, visitor, isExpression)), createStatement(createAssignment(currentState.conditionVariable, createTrue())))
    );
    if (shouldConvertConditionOfForStatement(node)) {
      statements.push(createIf(new qs.PrefixUnaryExpression(Syntax.ExclamationToken, visitNode(node.condition, visitor, isExpression)), visitNode(new qc.BreakStatement(), visitor, isStatement)));
    }
  }
  if (Node.is.kind(Block, statement)) {
    addRange(statements, statement.statements);
  } else {
    statements.push(statement);
  }
  copyOutParameters(currentState.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOutParameter, statements);
  insertStatementsAfterStandardPrologue(statements, lexicalEnvironment);
  const loopBody = new Block(statements, true);
  if (Node.is.kind(Block, statement)) setOriginalNode(loopBody, statement);
  const containsYield = (node.statement.transformFlags & TransformFlags.ContainsYield) !== 0;
  let emitFlags: EmitFlags = 0;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && (hierarchyFacts & HierarchyFacts.AsyncFunctionBody) !== 0) emitFlags |= EmitFlags.AsyncFunctionBody;
  const functionDeclaration = createVariableStatement(
    undefined,
    setEmitFlags(
      createVariableDeclarationList([
        createVariableDeclaration(
          functionName,
          undefined,
          setEmitFlags(
            new qs.FunctionExpression(undefined, containsYield ? new Token(Syntax.AsteriskToken) : undefined, undefined, undefined, currentState.loopParameters, undefined, loopBody),
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
function copyOutParameter(outParam: LoopOutParameter, copyDirection: CopyDirection): BinaryExpression {
  const source = copyDirection === CopyDirection.ToOriginal ? outParam.outParamName : outParam.originalName;
  const target = copyDirection === CopyDirection.ToOriginal ? outParam.originalName : outParam.outParamName;
  return new BinaryExpression(target, Syntax.EqualsToken, source);
}
function copyOutParameters(outParams: LoopOutParameter[], partFlags: LoopOutParameterFlags, copyDirection: CopyDirection, statements: Statement[]): void {
  for (const outParam of outParams) {
    if (outParam.flags & partFlags) {
      statements.push(new qc.ExpressionStatement(copyOutParameter(outParam, copyDirection)));
    }
  }
}
function generateCallToConvertedLoopInitializer(initFunctionExpressionName: Identifier, containsYield: boolean): Statement {
  const call = new qs.CallExpression(initFunctionExpressionName, undefined, []);
  const callResult = containsYield ? createYield(new Token(Syntax.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator)) : call;
  return createStatement(callResult);
}
function generateCallToConvertedLoop(loopFunctionExpressionName: Identifier, state: ConvertedLoopState, outerState: ConvertedLoopState | undefined, containsYield: boolean): Statement[] {
  const statements: Statement[] = [];
  const isSimpleLoop = !(state.nonLocalJumps! & ~Jump.Continue) && !state.labeledNonLocalBreaks && !state.labeledNonLocalContinues;
  const call = new qs.CallExpression(
    loopFunctionExpressionName,
    undefined,
    map(state.loopParameters, (p) => <Identifier>p.name)
  );
  const callResult = containsYield ? createYield(new Token(Syntax.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator)) : call;
  if (isSimpleLoop) {
    statements.push(new qc.ExpressionStatement(callResult));
    copyOutParameters(state.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOriginal, statements);
  } else {
    const loopResultName = createUniqueName('state');
    const stateVariable = createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(loopResultName, undefined, callResult)]));
    statements.push(stateVariable);
    copyOutParameters(state.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOriginal, statements);
    if (state.nonLocalJumps! & Jump.Return) {
      let returnStatement: ReturnStatement;
      if (outerState) {
        outerState.nonLocalJumps! |= Jump.Return;
        returnStatement = createReturn(loopResultName);
      } else {
        returnStatement = createReturn(createPropertyAccess(loopResultName, 'value'));
      }
      statements.push(createIf(new BinaryExpression(new TypeOfExpression(loopResultName), Syntax.Equals3Token, createLiteral('object')), returnStatement));
    }
    if (state.nonLocalJumps! & Jump.Break) {
      statements.push(createIf(new BinaryExpression(loopResultName, Syntax.Equals3Token, createLiteral('break')), new qc.BreakStatement()));
    }
    if (state.labeledNonLocalBreaks || state.labeledNonLocalContinues) {
      const caseClauses: CaseClause[] = [];
      processLabeledJumps(state.labeledNonLocalBreaks!, true, loopResultName, outerState, caseClauses);
      processLabeledJumps(state.labeledNonLocalContinues!, false, loopResultName, outerState, caseClauses);
      statements.push(createSwitch(loopResultName, new qc.CaseBlock(caseClauses)));
    }
  }
  return statements;
}
function setLabeledJump(state: ConvertedLoopState, isBreak: boolean, labelText: string, labelMarker: string): void {
  if (isBreak) {
    if (!state.labeledNonLocalBreaks) {
      state.labeledNonLocalBreaks = createMap<string>();
    }
    state.labeledNonLocalBreaks.set(labelText, labelMarker);
  } else {
    if (!state.labeledNonLocalContinues) {
      state.labeledNonLocalContinues = createMap<string>();
    }
    state.labeledNonLocalContinues.set(labelText, labelMarker);
  }
}
function processLabeledJumps(table: Map<string>, isBreak: boolean, loopResultName: Identifier, outerLoop: ConvertedLoopState | undefined, caseClauses: CaseClause[]): void {
  if (!table) {
    return;
  }
  table.forEach((labelMarker, labelText) => {
    const statements: Statement[] = [];
    if (!outerLoop || (outerLoop.labels && outerLoop.labels.get(labelText))) {
      const label = new Identifier(labelText);
      statements.push(isBreak ? new qc.BreakStatement(label) : new qc.ContinueStatement(label));
    } else {
      setLabeledJump(outerLoop, isBreak, labelText, labelMarker);
      statements.push(createReturn(loopResultName));
    }
    caseClauses.push(new qc.CaseClause(createLiteral(labelMarker), statements));
  });
}
function processLoopVariableDeclaration(
  container: IterationStatement,
  decl: VariableDeclaration | BindingElement,
  loopParameters: ParameterDeclaration[],
  loopOutParameters: LoopOutParameter[],
  hasCapturedBindingsInForInitializer: boolean
) {
  const name = decl.name;
  if (Node.is.kind(BindingPattern, name)) {
    for (const element of name.elements) {
      if (!Node.is.kind(OmittedExpression, element)) {
        processLoopVariableDeclaration(container, element, loopParameters, loopOutParameters, hasCapturedBindingsInForInitializer);
      }
    }
  } else {
    loopParameters.push(createParameter(undefined, undefined, name));
    const checkFlags = resolver.getNodeCheckFlags(decl);
    if (checkFlags & NodeCheckFlags.NeedsLoopOutParameter || hasCapturedBindingsInForInitializer) {
      const outParamName = createUniqueName('out_' + idText(name));
      let flags: LoopOutParameterFlags = 0;
      if (checkFlags & NodeCheckFlags.NeedsLoopOutParameter) {
        flags |= LoopOutParameterFlags.Body;
      }
      if (Node.is.kind(ForStatement, container) && container.initializer && resolver.isBindingCapturedByNode(container.initializer, decl)) {
        flags |= LoopOutParameterFlags.Initializer;
      }
      loopOutParameters.push({ flags, originalName: name, outParamName });
    }
  }
}
function addObjectLiteralMembers(expressions: Expression[], node: ObjectLiteralExpression, receiver: Identifier, start: number) {
  const properties = node.properties;
  const numProperties = properties.length;
  for (let i = start; i < numProperties; i++) {
    const property = properties[i];
    switch (property.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        const accessors = getAllAccessorDeclarations(node.properties, property);
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
        Debug.failBadSyntax(node);
        break;
    }
  }
}
function transformPropertyAssignmentToExpression(property: PropertyAssignment, receiver: Expression, startsOnNewLine: boolean) {
  const expression = createAssignment(createMemberAccessForPropertyName(receiver, visitNode(property.name, visitor, isPropertyName)), visitNode(property.initializer, visitor, isExpression));
  setRange(expression, property);
  if (startsOnNewLine) {
    startOnNewLine(expression);
  }
  return expression;
}
function transformShorthandPropertyAssignmentToExpression(property: ShorthandPropertyAssignment, receiver: Expression, startsOnNewLine: boolean) {
  const expression = createAssignment(createMemberAccessForPropertyName(receiver, visitNode(property.name, visitor, isPropertyName)), getSynthesizedClone(property.name));
  setRange(expression, property);
  if (startsOnNewLine) {
    startOnNewLine(expression);
  }
  return expression;
}
function transformObjectLiteralMethodDeclarationToExpression(method: MethodDeclaration, receiver: Expression, container: Node, startsOnNewLine: boolean) {
  const expression = createAssignment(createMemberAccessForPropertyName(receiver, visitNode(method.name, visitor, isPropertyName)), transformFunctionLikeToExpression(method, undefined, container));
  setRange(expression, method);
  if (startsOnNewLine) {
    startOnNewLine(expression);
  }
  return expression;
}
function visitCatchClause(node: CatchClause): CatchClause {
  const ancestorFacts = enterSubtree(HierarchyFacts.BlockScopeExcludes, HierarchyFacts.BlockScopeIncludes);
  let updated: CatchClause;
  assert(!!node.variableDeclaration, 'Catch clause variable should always be present when downleveling ES2015.');
  if (Node.is.kind(BindingPattern, node.variableDeclaration.name)) {
    const temp = createTempVariable(undefined);
    const newVariableDeclaration = createVariableDeclaration(temp);
    setRange(newVariableDeclaration, node.variableDeclaration);
    const vars = flattenDestructuringBinding(node.variableDeclaration, visitor, context, FlattenLevel.All, temp);
    const list = createVariableDeclarationList(vars);
    setRange(list, node.variableDeclaration);
    const destructure = createVariableStatement(undefined, list);
    updated = node.update(newVariableDeclaration, addStatementToStartOfBlock(node.block, destructure));
  } else {
    updated = visitEachChild(node, visitor, context);
  }
  exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
  return updated;
}
function addStatementToStartOfBlock(block: Block, statement: Statement): Block {
  const transformedStatements = Nodes.visit(block.statements, visitor, isStatement);
  return block.update([statement, ...transformedStatements]);
}
function visitMethodDeclaration(node: MethodDeclaration): ObjectLiteralElementLike {
  assert(!Node.is.kind(ComputedPropertyName, node.name));
  const functionExpression = transformFunctionLikeToExpression(node, undefined);
  setEmitFlags(functionExpression, EmitFlags.NoLeadingComments | Node.get.emitFlags(functionExpression));
  return setRange(createPropertyAssignment(node.name, functionExpression), node);
}
function visitAccessorDeclaration(node: AccessorDeclaration): AccessorDeclaration {
  assert(!Node.is.kind(ComputedPropertyName, node.name));
  const savedConvertedLoopState = convertedLoopState;
  convertedLoopState = undefined;
  const ancestorFacts = enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
  let updated: AccessorDeclaration;
  const parameters = visitParameterList(node.parameters, visitor, context);
  const body = transformFunctionBody(node);
  if (node.kind === Syntax.GetAccessor) {
    updated = node.update(node.decorators, node.modifiers, node.name, parameters, node.type, body);
  } else {
    updated = node.update(node.decorators, node.modifiers, node.name, parameters, body);
  }
  exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
  convertedLoopState = savedConvertedLoopState;
  return updated;
}
function visitShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElementLike {
  return setRange(createPropertyAssignment(node.name, getSynthesizedClone(node.name)), node);
}
function visitComputedPropertyName(node: ComputedPropertyName) {
  return visitEachChild(node, visitor, context);
}
function visitYieldExpression(node: YieldExpression): Expression {
  return visitEachChild(node, visitor, context);
}
function visitArrayLiteralExpression(node: ArrayLiteralExpression): Expression {
  if (some(node.elements, isSpreadElement)) return transformAndSpreadElements(node.elements, !!node.elements.trailingComma);
  return visitEachChild(node, visitor, context);
}
function visitCallExpression(node: CallExpression) {
  if (Node.get.emitFlags(node) & EmitFlags.TypeScriptClassWrapper) return visitTypeScriptClassWrapper(node);
  const expression = skipOuterExpressions(node.expression);
  if (expression.kind === Syntax.SuperKeyword || Node.is.superProperty(expression) || some(node.arguments, isSpreadElement)) return visitCallExpressionWithPotentialCapturedThisAssignment(node, true);
  return node.update(visitNode(node.expression, callExpressionVisitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
}
function visitTypeScriptClassWrapper(node: CallExpression) {
  const body = cast(cast(skipOuterExpressions(node.expression), isArrowFunction).body, isBlock);
  const isVariableStatementWithInitializer = (stmt: Statement) => Node.is.kind(VariableStatement, stmt) && !!first(stmt.declarationList.declarations).initializer;
  const savedConvertedLoopState = convertedLoopState;
  convertedLoopState = undefined;
  const bodyStatements = Nodes.visit(body.statements, visitor, isStatement);
  convertedLoopState = savedConvertedLoopState;
  const classStatements = filter(bodyStatements, isVariableStatementWithInitializer);
  const remainingStatements = filter(bodyStatements, (stmt) => !isVariableStatementWithInitializer(stmt));
  const varStatement = cast(first(classStatements), isVariableStatement);
  const variable = varStatement.declarationList.declarations[0];
  const initializer = skipOuterExpressions(variable.initializer!);
  const aliasAssignment = tryCast(initializer, isAssignmentExpression);
  const call = cast(aliasAssignment ? skipOuterExpressions(aliasAssignment.right) : initializer, isCallExpression);
  const func = cast(skipOuterExpressions(call.expression), isFunctionExpression);
  const funcStatements = func.body.statements;
  let classBodyStart = 0;
  let classBodyEnd = -1;
  const statements: Statement[] = [];
  if (aliasAssignment) {
    const extendsCall = tryCast(funcStatements[classBodyStart], isExpressionStatement);
    if (extendsCall) {
      statements.push(extendsCall);
      classBodyStart++;
    }
    statements.push(funcStatements[classBodyStart]);
    classBodyStart++;
    statements.push(new qc.ExpressionStatement(createAssignment(aliasAssignment.left, cast(variable.name, isIdentifier))));
  }
  while (!Node.is.kind(ReturnStatement, elementAt(funcStatements, classBodyEnd)!)) {
    classBodyEnd--;
  }
  addRange(statements, funcStatements, classBodyStart, classBodyEnd);
  if (classBodyEnd < -1) {
    addRange(statements, funcStatements, classBodyEnd + 1);
  }
  addRange(statements, remainingStatements);
  addRange(statements, classStatements, 1);
  return recreateOuterExpressions(
    node.expression,
    recreateOuterExpressions(
      variable.initializer,
      recreateOuterExpressions(
        aliasAssignment && aliasAssignment.right,
        updateCall(
          call,
          recreateOuterExpressions(call.expression, func.update(undefined, undefined, undefined, undefined, func.parameters, undefined, func.body.update(statements))),
          undefined,
          call.arguments
        )
      )
    )
  );
}
function visitImmediateSuperCallInBody(node: CallExpression) {
  return visitCallExpressionWithPotentialCapturedThisAssignment(node, false);
}
function visitCallExpressionWithPotentialCapturedThisAssignment(node: CallExpression, assignToCapturedThis: boolean): CallExpression | BinaryExpression {
  if (node.transformFlags & TransformFlags.ContainsRestOrSpread || node.expression.kind === Syntax.SuperKeyword || Node.is.superProperty(skipOuterExpressions(node.expression))) {
    const { target, thisArg } = createCallBinding(node.expression, hoistVariableDeclaration);
    if (node.expression.kind === Syntax.SuperKeyword) {
      setEmitFlags(thisArg, EmitFlags.NoSubstitution);
    }
    let resultingCall: CallExpression | BinaryExpression;
    if (node.transformFlags & TransformFlags.ContainsRestOrSpread) {
      resultingCall = createFunctionApply(
        visitNode(target, callExpressionVisitor, isExpression),
        node.expression.kind === Syntax.SuperKeyword ? thisArg : visitNode(thisArg, visitor, isExpression),
        transformAndSpreadElements(node.arguments, false)
      );
    } else {
      resultingCall = createFunctionCall(
        visitNode(target, callExpressionVisitor, isExpression),
        node.expression.kind === Syntax.SuperKeyword ? thisArg : visitNode(thisArg, visitor, isExpression),
        Nodes.visit(node.arguments, visitor, isExpression),
        node
      );
    }
    if (node.expression.kind === Syntax.SuperKeyword) {
      const initializer = createLogicalOr(resultingCall, createActualThis());
      resultingCall = assignToCapturedThis ? createAssignment(createFileLevelUniqueName('_this'), initializer) : initializer;
    }
    return setOriginalNode(resultingCall, node);
  }
  return visitEachChild(node, visitor, context);
}
function visitNewExpression(node: NewExpression): LeftHandSideExpression {
  if (some(node.arguments, isSpreadElement)) {
    const { target, thisArg } = createCallBinding(createPropertyAccess(node.expression, 'bind'), hoistVariableDeclaration);
    return createNew(
      createFunctionApply(visitNode(target, visitor, isExpression), thisArg, transformAndSpreadElements(new Nodes([qs.VoidExpression.zero(), ...node.arguments!]), false)),
      undefined,
      []
    );
  }
  return visitEachChild(node, visitor, context);
}
function transformAndSpreadElements(elements: Nodes<Expression>, needsUniqueCopy: boolean, multiLine: boolean, trailingComma: boolean): Expression {
  const numElements = elements.length;
  const segments = flatten<Expression>(spanMap(elements, partitionSpread, (partition, visitPartition, _start, end) => visitPartition(partition, multiLine, trailingComma && end === numElements)));
  if (compilerOptions.downlevelIteration) {
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
function isPackedElement(node: Expression) {
  return !Node.is.kind(OmittedExpression, node);
}
function isPackedArrayLiteral(node: Expression) {
  return isArrayLiteralExpression(node) && every(node.elements, isPackedElement);
}
function isCallToHelper(firstSegment: Expression, helperName: __String) {
  return (
    Node.is.kind(CallExpression, firstSegment) &&
    Node.is.kind(Identifier, firstSegment.expression) &&
    Node.get.emitFlags(firstSegment.expression) & EmitFlags.HelperName &&
    firstSegment.expression.escapedText === helperName
  );
}
function partitionSpread(node: Expression) {
  return Node.is.kind(SpreadElement, node) ? visitSpanOfSpreads : visitSpanOfNonSpreads;
}
function visitSpanOfSpreads(chunk: Expression[]): VisitResult<Expression> {
  return map(chunk, visitExpressionOfSpread);
}
function visitSpanOfNonSpreads(chunk: Expression[], multiLine: boolean, trailingComma: boolean): VisitResult<Expression> {
  return new ArrayLiteralExpression(Nodes.visit(new Nodes(chunk, trailingComma), visitor, isExpression), multiLine);
}
function visitSpreadElement(node: SpreadElement) {
  return visitNode(node.expression, visitor, isExpression);
}
function visitExpressionOfSpread(node: SpreadElement) {
  return visitNode(node.expression, visitor, isExpression);
}
function visitTemplateLiteral(node: LiteralExpression): LeftHandSideExpression {
  return setRange(createLiteral(node.text), node);
}
function visitStringLiteral(node: StringLiteral) {
  if (node.hasExtendedEscape) return setRange(createLiteral(node.text), node);
  return node;
}
function visitNumericLiteral(node: NumericLiteral) {
  if (node.numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier) return setRange(NumericLiteral.create(node.text), node);
  return node;
}
function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
  return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.All);
}
function visitTemplateExpression(node: TemplateExpression): Expression {
  const expressions: Expression[] = [];
  addTemplateHead(expressions, node);
  addTemplateSpans(expressions, node);
  const expression = reduceLeft(expressions, createAdd)!;
  if (isSynthesized(expression)) {
    expression.pos = node.pos;
    expression.end = node.end;
  }
  return expression;
}
function shouldAddTemplateHead(node: TemplateExpression) {
  assert(node.templateSpans.length !== 0);
  return node.head.text.length !== 0 || node.templateSpans[0].literal.text.length === 0;
}
function addTemplateHead(expressions: Expression[], node: TemplateExpression): void {
  if (!shouldAddTemplateHead(node)) {
    return;
  }
  expressions.push(createLiteral(node.head.text));
}
function addTemplateSpans(expressions: Expression[], node: TemplateExpression): void {
  for (const span of node.templateSpans) {
    expressions.push(visitNode(span.expression, visitor, isExpression));
    if (span.literal.text.length !== 0) {
      expressions.push(createLiteral(span.literal.text));
    }
  }
}
function visitSuperKeyword(isExpressionOfCall: boolean): LeftHandSideExpression {
  return hierarchyFacts & HierarchyFacts.NonStaticClassElement && !isExpressionOfCall ? createPropertyAccess(createFileLevelUniqueName('_super'), 'prototype') : createFileLevelUniqueName('_super');
}
function visitMetaProperty(node: MetaProperty) {
  if (node.keywordToken === Syntax.NewKeyword && node.name.escapedText === 'target') {
    hierarchyFacts |= HierarchyFacts.NewTarget;
    return createFileLevelUniqueName('_newTarget');
  }
  return node;
}
function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) {
  if (enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis && Node.is.functionLike(node)) {
    const ancestorFacts = enterSubtree(
      HierarchyFacts.FunctionExcludes,
      Node.get.emitFlags(node) & EmitFlags.CapturesThis ? HierarchyFacts.FunctionIncludes | HierarchyFacts.CapturesThis : HierarchyFacts.FunctionIncludes
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
function onSubstituteNode(hint: EmitHint, node: Node) {
  node = previousOnSubstituteNode(hint, node);
  if (hint === EmitHint.Expression) return substituteExpression(node);
  if (Node.is.kind(Identifier, node)) return substituteIdentifier(node);
  return node;
}
function substituteIdentifier(node: Identifier) {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !isInternalName(node)) {
    const original = Node.get.parseTreeOf(node, isIdentifier);
    if (original && isNameOfDeclarationWithCollidingName(original)) return setRange(getGeneratedNameForNode(original), node);
  }
  return node;
}
function isNameOfDeclarationWithCollidingName(node: Identifier) {
  switch (node.parent.kind) {
    case Syntax.BindingElement:
    case Syntax.ClassDeclaration:
    case Syntax.EnumDeclaration:
    case Syntax.VariableDeclaration:
      return (<NamedDeclaration>node.parent).name === node && resolver.isDeclarationWithCollidingName(<Declaration>node.parent);
  }
  return false;
}
function substituteExpression(node: Node) {
  switch (node.kind) {
    case Syntax.Identifier:
      return substituteExpressionIdentifier(<Identifier>node);
    case Syntax.ThisKeyword:
      return substituteThisKeyword(<PrimaryExpression>node);
  }
  return node;
}
function substituteExpressionIdentifier(node: Identifier): Identifier {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !isInternalName(node)) {
    const declaration = resolver.getReferencedDeclarationWithCollidingName(node);
    if (declaration && !(Node.is.classLike(declaration) && isPartOfClassBody(declaration, node))) return setRange(getGeneratedNameForNode(getNameOfDeclaration(declaration)), node);
  }
  return node;
}
function isPartOfClassBody(declaration: ClassLikeDeclaration, node: Identifier) {
  let currentNode: Node | undefined = Node.get.parseTreeOf(node);
  if (!currentNode || currentNode === declaration || currentNode.end <= declaration.pos || currentNode.pos >= declaration.end) return false;
  const blockScope = Node.get.enclosingBlockScopeContainer(declaration);
  while (currentNode) {
    if (currentNode === blockScope || currentNode === declaration) return false;
    if (Node.is.classElement(currentNode) && currentNode.parent === declaration) return true;
    currentNode = currentNode.parent;
  }
  return false;
}
function substituteThisKeyword(node: PrimaryExpression): PrimaryExpression {
  if (enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis && hierarchyFacts & HierarchyFacts.CapturesThis) return setRange(createFileLevelUniqueName('_this'), node);
  return node;
}
function getClassMemberPrefix(node: ClassExpression | ClassDeclaration, member: ClassElement) {
  return hasSyntacticModifier(member, ModifierFlags.Static) ? getInternalName(node) : createPropertyAccess(getInternalName(node), 'prototype');
}
function hasSynthesizedDefaultSuperCall(constructor: ConstructorDeclaration | undefined, hasExtendsClause: boolean) {
  if (!constructor || !hasExtendsClause) return false;
  if (some(constructor.parameters)) return false;
  const statement = firstOrUndefined(constructor.body!.statements);
  if (!statement || !isSynthesized(statement) || statement.kind !== Syntax.ExpressionStatement) return false;
  const statementExpression = (<ExpressionStatement>statement).expression;
  if (!isSynthesized(statementExpression) || statementExpression.kind !== Syntax.CallExpression) return false;
  const callTarget = (<CallExpression>statementExpression).expression;
  if (!isSynthesized(callTarget) || callTarget.kind !== Syntax.SuperKeyword) return false;
  const callArgument = singleOrUndefined((<CallExpression>statementExpression).arguments);
  if (!callArgument || !isSynthesized(callArgument) || callArgument.kind !== Syntax.SpreadElement) return false;
  const expression = (<SpreadElement>callArgument).expression;
  return Node.is.kind(Identifier, expression) && expression.escapedText === 'arguments';
}
function createExtendsHelper(context: TransformationContext, name: Identifier) {
  context.requestEmitHelper(extendsHelper);
  return new qs.CallExpression(getUnscopedHelperName('__extends'), undefined, [name, createFileLevelUniqueName('_super')]);
}
export const extendsHelper: UnscopedEmitHelper = {
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
