import { Node, Nodes } from '../core';
import * as qc from '../core';
import { qf } from '../core';
import { EmitFlags, Modifier, ModifierFlags, TransformFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import * as qy from '../syntax';
import { Syntax } from '../syntax';
const enum ES2015SubstitutionFlags {
  CapturedThis = 1 << 0,
  BlockScopedBindings = 1 << 1,
}
interface LoopOutParameter {
  flags: LoopOutParameterFlags;
  originalName: qc.Identifier;
  outParamName: qc.Identifier;
}
const enum LoopOutParameterFlags {
  Body = 1 << 0,
  Initer = 1 << 1,
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
  labels?: qu.QMap<boolean>;
  labeledNonLocalBreaks?: qu.QMap<string>;
  labeledNonLocalContinues?: qu.QMap<string>;
  nonLocalJumps?: Jump;
  allowedNonLabeledJumps?: Jump;
  argumentsName?: qc.Identifier;
  thisName?: qc.Identifier;
  containsLexicalThis?: boolean;
  hoistedLocalVariables?: qc.Identifier[];
  conditionVariable?: qc.Identifier;
  loopParameters: ParameterDeclaration[];
  loopOutParameters: LoopOutParameter[];
}
type LoopConverter = (
  node: IterationSobj,
  outermostLabeledStatement: LabeledStatement | undefined,
  convertedLoopBodyStatements: qc.Statement[] | undefined,
  ancestorFacts: HierarchyFacts
) => qc.Statement;
const enum HierarchyFacts {
  None = 0,
  Function = 1 << 0,
  ArrowFunction = 1 << 1,
  AsyncFunctionBody = 1 << 2,
  NonStaticClassElem = 1 << 3,
  CapturesThis = 1 << 4,
  ExportedVariableStatement = 1 << 5,
  TopLevel = 1 << 6,
  Block = 1 << 7,
  IterationSobj = 1 << 8,
  IterationSobjBlock = 1 << 9,
  IterationContainer = 1 << 10,
  ForStatement = 1 << 11,
  ForInOrForOfStatement = 1 << 12,
  ConstructorWithCapturedSuper = 1 << 13,
  AncestorFactsMask = (ConstructorWithCapturedSuper << 1) - 1,
  BlockScopeIncludes = None,
  BlockScopeExcludes = TopLevel | Block | IterationSobj | IterationSobjBlock | ForStatement | ForInOrForOfStatement,
  SourceFileIncludes = TopLevel,
  SourceFileExcludes = (BlockScopeExcludes & ~TopLevel) | IterationContainer,
  FunctionIncludes = Function | TopLevel,
  FunctionExcludes = (BlockScopeExcludes & ~TopLevel) | ArrowFunction | AsyncFunctionBody | CapturesThis | NonStaticClassElem | ConstructorWithCapturedSuper | IterationContainer,
  AsyncFunctionBodyIncludes = FunctionIncludes | AsyncFunctionBody,
  AsyncFunctionBodyExcludes = FunctionExcludes & ~NonStaticClassElem,
  ArrowFunctionIncludes = ArrowFunction | TopLevel,
  ArrowFunctionExcludes = (BlockScopeExcludes & ~TopLevel) | ConstructorWithCapturedSuper,
  ConstructorIncludes = FunctionIncludes | NonStaticClassElem,
  ConstructorExcludes = FunctionExcludes & ~NonStaticClassElem,
  DoOrWhileStatementIncludes = IterationSobj | IterationContainer,
  DoOrWhileStatementExcludes = None,
  ForStatementIncludes = IterationSobj | ForStatement | IterationContainer,
  ForStatementExcludes = BlockScopeExcludes & ~ForStatement,
  ForInOrForOfStatementIncludes = IterationSobj | ForInOrForOfStatement | IterationContainer,
  ForInOrForOfStatementExcludes = BlockScopeExcludes & ~ForInOrForOfStatement,
  BlockIncludes = Block,
  BlockExcludes = BlockScopeExcludes & ~Block,
  IterationSobjBlockIncludes = IterationSobjBlock,
  IterationSobjBlockExcludes = BlockScopeExcludes,
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
  function recordTaggedTemplateString(temp: qc.Identifier) {
    taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, new qc.VariableDeclaration(temp));
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
      (hierarchyFacts & HierarchyFacts.ConstructorWithCapturedSuper && (qf.is.statement(node) || node.kind === Syntax.Block)) ||
      (qf.is.iterationStatement(node, false) && shouldConvertIterationSobj(node)) ||
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
      case Syntax.SpreadElem:
        return visitSpreadElem(<SpreadElem>node);
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
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    startLexicalEnvironment();
    let statementOffset = addStandardPrologue(prologue, node.statements, false);
    statementOffset = addCustomPrologue(prologue, node.statements, statementOffset, visitor);
    addRange(statements, Nodes.visit(node.statements, visitor, isStatement, statementOffset));
    if (taggedTemplateStringDeclarations) {
      statements.push(new qc.VariableStatement(undefined, new qc.VariableDeclarationList(taggedTemplateStringDeclarations)));
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
    return new qc.ReturnStatement(createFileLevelUniqueName('_this')).setOriginal(node);
  }
  function visitReturnStatement(node: ReturnStatement): qc.Statement {
    if (convertedLoopState) {
      convertedLoopState.nonLocalJumps! |= Jump.Return;
      if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
        node = returnCapturedThis(node);
      }
      return new qc.ReturnStatement(
        new qc.ObjectLiteralExpression([new qc.PropertyAssignment(new qc.Identifier('value'), node.expression ? visitNode(node.expression, visitor, isExpression) : qc.VoidExpression.zero())])
      );
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
  function visitIdentifier(node: qc.Identifier): qc.Identifier {
    if (!convertedLoopState) return node;
    if (qf.is.generatedIdentifier(node)) return node;
    if (node.escapedText !== 'arguments' || !resolver.isArgumentsLocalBinding(node)) return node;
    return convertedLoopState.argumentsName || (convertedLoopState.argumentsName = createUniqueName('arguments'));
  }
  function visitBreakOrContinueStatement(node: BreakOrContinueStatement): qc.Statement {
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
        if (convertedLoopState.loopOutParameters.length) {
          const outParams = convertedLoopState.loopOutParameters;
          let expr: qc.Expression | undefined;
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
        return new qc.ReturnStatement(returnExpression);
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
    const variable = new qc.VariableDeclaration(qf.get.declaration.localName(node, true), undefined, transformClassLikeDeclarationToExpression(node));
    variable.setOriginal(node);
    const statements: qc.Statement[] = [];
    const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([variable]));
    statement.setOriginal(node);
    setRange(statement, node);
    startOnNewLine(statement);
    statements.push(statement);
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      const exportStatement = qf.has.syntacticModifier(node, ModifierFlags.Default)
        ? qf.create.exportDefault(qf.get.declaration.localName(node))
        : qf.create.externalModuleExport(qf.get.declaration.localName(node));
      exportStatement.setOriginal(statement);
      statements.push(exportStatement);
    }
    const emitFlags = qf.get.emitFlags(node);
    if ((emitFlags & EmitFlags.HasEndOfDeclarationMarker) === 0) {
      statements.push(new EndOfDeclarationMarker(node));
      setEmitFlags(statement, emitFlags | EmitFlags.HasEndOfDeclarationMarker);
    }
    return singleOrMany(statements);
  }
  function visitClassExpression(node: ClassExpression): qc.Expression {
    return transformClassLikeDeclarationToExpression(node);
  }
  function transformClassLikeDeclarationToExpression(node: ClassExpression | ClassDeclaration): qc.Expression {
    if (node.name) {
      enableSubstitutionsForBlockScopedBindings();
    }
    const extendsClauseElem = qf.get.classExtendsHeritageElem(node);
    const classFunction = new qc.FunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      extendsClauseElem ? [new qc.ParameterDeclaration(undefined, undefined, createFileLevelUniqueName('_super'))] : [],
      undefined,
      transformClassBody(node, extendsClauseElem)
    );
    setEmitFlags(classFunction, (qf.get.emitFlags(node) & EmitFlags.Indented) | EmitFlags.ReuseTempVariableScope);
    const inner = new qc.PartiallyEmittedExpression(classFunction);
    inner.end = node.end;
    setEmitFlags(inner, EmitFlags.NoComments);
    const outer = new qc.PartiallyEmittedExpression(inner);
    outer.end = qy.skipTrivia(currentText, node.pos);
    setEmitFlags(outer, EmitFlags.NoComments);
    const result = new qc.ParenthesizedExpression(new qc.CallExpression(outer, undefined, extendsClauseElem ? [visitNode(extendsClauseElem.expression, visitor, isExpression)] : []));
    addSyntheticLeadingComment(result, Syntax.MultiLineCommentTrivia, '* @class ');
    return result;
  }
  function transformClassBody(node: ClassExpression | ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypeArguments | undefined): Block {
    const statements: qc.Statement[] = [];
    startLexicalEnvironment();
    addExtendsHelperIfNeeded(statements, node, extendsClauseElem);
    addConstructor(statements, node, extendsClauseElem);
    addClassMembers(statements, node);
    const closingBraceLocation = qf.create.tokenRange(qy.skipTrivia(currentText, node.members.end), Syntax.CloseBraceToken);
    const localName = qf.get.declaration.internalName(node);
    const outer = new qc.PartiallyEmittedExpression(localName);
    outer.end = closingBraceLocation.end;
    setEmitFlags(outer, EmitFlags.NoComments);
    const statement = new qc.ReturnStatement(outer);
    statement.pos = closingBraceLocation.pos;
    setEmitFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
    statements.push(statement);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    const block = new Block(setRange(new Nodes(statements), true));
    setEmitFlags(block, EmitFlags.NoComments);
    return block;
  }
  function addExtendsHelperIfNeeded(statements: qc.Statement[], node: ClassExpression | ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypeArguments | undefined): void {
    if (extendsClauseElem) {
      statements.push(setRange(new qc.ExpressionStatement(createExtendsHelper(context, qf.get.declaration.internalName(node))), extendsClauseElem));
    }
  }
  function addConstructor(statements: qc.Statement[], node: ClassExpression | ClassDeclaration, extendsClauseElem: qc.ExpressionWithTypeArguments | undefined): void {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts = enterSubtree(HierarchyFacts.ConstructorExcludes, HierarchyFacts.ConstructorIncludes);
    const constructor = qf.get.firstConstructorWithBody(node);
    const hasSynthesizedSuper = hasSynthesizedDefaultSuperCall(constructor, extendsClauseElem !== undefined);
    const constructorFunction = new qc.FunctionDeclaration(
      undefined,
      undefined,
      undefined,
      qf.get.declaration.internalName(node),
      undefined,
      transformConstructorParameters(constructor, hasSynthesizedSuper),
      undefined,
      transformConstructorBody(constructor, node, extendsClauseElem, hasSynthesizedSuper)
    );
    setRange(constructorFunction, constructor || node);
    if (extendsClauseElem) {
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
    const statements: qc.Statement[] = [];
    resumeLexicalEnvironment();
    mergeLexicalEnvironment(statements, endLexicalEnvironment());
    if (isDerivedClass) {
      statements.push(new qc.ReturnStatement(createDefaultSuperCallOrThis()));
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
    extendsClauseElem: qc.ExpressionWithTypeArguments | undefined,
    hasSynthesizedSuper: boolean
  ) {
    const isDerivedClass = !!extendsClauseElem && qc.skip.outerExpressions(extendsClauseElem.expression).kind !== Syntax.NullKeyword;
    if (!constructor) return createDefaultConstructorBody(node, isDerivedClass);
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    resumeLexicalEnvironment();
    let statementOffset = 0;
    if (!hasSynthesizedSuper) statementOffset = addStandardPrologue(prologue, constructor.body.statements, false);
    addDefaultValueAssignmentsIfNeeded(statements, constructor);
    addRestParameterIfNeeded(statements, constructor, hasSynthesizedSuper);
    if (!hasSynthesizedSuper) statementOffset = addCustomPrologue(statements, constructor.body.statements, statementOffset, visitor);
    let superCallExpression: qc.Expression | undefined;
    if (hasSynthesizedSuper) {
      superCallExpression = createDefaultSuperCallOrThis();
    } else if (isDerivedClass && statementOffset < constructor.body.statements.length) {
      const firstStatement = constructor.body.statements[statementOffset];
      if (qf.is.kind(qc.ExpressionStatement, firstStatement) && qf.is.superCall(firstStatement.expression)) {
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
        const returnStatement = new qc.ReturnStatement(superCallExpression);
        setCommentRange(returnStatement, getCommentRange(superCall));
        setEmitFlags(superCall, EmitFlags.NoComments);
        statements.push(returnStatement);
      } else {
        insertCaptureThisForNode(statements, constructor, superCallExpression || createActualThis());
        if (!isSufficientlyCoveredByReturnStatements(constructor.body)) {
          statements.push(new qc.ReturnStatement(createFileLevelUniqueName('_this')));
        }
      }
    } else {
      insertCaptureThisForNodeIfNeeded(prologue, constructor);
    }
    const block = new Block(setRange(new Nodes(concatenate(prologue, statements)), true));
    setRange(block, constructor.body);
    return block;
  }
  function isSufficientlyCoveredByReturnStatements(statement: qc.Statement): boolean {
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
    return setEmitFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution);
  }
  function createDefaultSuperCallOrThis() {
    return qf.create.logicalOr(
      qf.create.logicalAnd(
        qf.create.strictInequality(createFileLevelUniqueName('_super'), new qc.NullLiteral()),
        createFunctionApply(createFileLevelUniqueName('_super'), createActualThis(), new qc.Identifier('arguments'))
      ),
      createActualThis()
    );
  }
  function visitParameter(node: ParameterDeclaration): ParameterDeclaration | undefined {
    if (node.dot3Token) {
      return;
    } else if (qf.is.kind(qc.BindingPattern, node.name)) {
      return setRange(new qc.ParameterDeclaration(undefined, undefined, undefined, qf.get.generatedNameForNode(node), undefined, undefined, undefined), node).setOriginal(node);
    } else if (node.initer) {
      return setRange(new qc.ParameterDeclaration(undefined, undefined, undefined, undefined), node).setOriginal(node);
    }
    return node;
  }
  function hasDefaultValueOrBindingPattern(node: ParameterDeclaration) {
    return node.initer !== undefined || qf.is.kind(qc.BindingPattern, node.name);
  }
  function addDefaultValueAssignmentsIfNeeded(statements: qc.Statement[], node: FunctionLikeDeclaration): boolean {
    if (!some(node.parameters, hasDefaultValueOrBindingPattern)) return false;
    let added = false;
    for (const parameter of node.parameters) {
      const { name, initer, dot3Token } = parameter;
      if (dot3Token) {
        continue;
      }
      if (qf.is.kind(qc.BindingPattern, name)) {
        added = insertDefaultValueAssignmentForBindingPattern(statements, parameter, name, initer) || added;
      } else if (initer) {
        insertDefaultValueAssignmentForIniter(statements, parameter, name, initer);
        added = true;
      }
    }
    return added;
  }
  function insertDefaultValueAssignmentForBindingPattern(statements: qc.Statement[], parameter: ParameterDeclaration, name: BindingPattern, initer: qc.Expression | undefined): boolean {
    if (name.elems.length > 0) {
      insertStatementAfterCustomPrologue(
        statements,
        setEmitFlags(
          new qc.VariableStatement(undefined, new qc.VariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, qf.get.generatedNameForNode(parameter)))),
          EmitFlags.CustomPrologue
        )
      );
      return true;
    } else if (initer) {
      insertStatementAfterCustomPrologue(
        statements,
        setEmitFlags(new qc.ExpressionStatement(qf.create.assignment(qf.get.generatedNameForNode(parameter), visitNode(initer, visitor, isExpression))), EmitFlags.CustomPrologue)
      );
      return true;
    }
    return false;
  }
  function insertDefaultValueAssignmentForIniter(statements: qc.Statement[], parameter: ParameterDeclaration, name: qc.Identifier, initer: qc.Expression): void {
    initer = visitNode(initer, visitor, isExpression);
    const statement = new qc.IfStatement(
      createTypeCheck(getSynthesizedClone(name), 'undefined'),
      setEmitFlags(
        setRange(
          new Block([
            new qc.ExpressionStatement(
              setEmitFlags(
                setRange(
                  qf.create.assignment(setEmitFlags(getMutableClone(name), EmitFlags.NoSourceMap), setEmitFlags(initer, EmitFlags.NoSourceMap | qf.get.emitFlags(initer) | EmitFlags.NoComments)),
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
  function addRestParameterIfNeeded(statements: qc.Statement[], node: FunctionLikeDeclaration, inConstructorWithSynthesizedSuper: boolean): boolean {
    const prologueStatements: qc.Statement[] = [];
    const parameter = lastOrUndefined(node.parameters);
    if (!shouldAddRestParameter(parameter, inConstructorWithSynthesizedSuper)) return false;
    const declarationName = parameter.name.kind === Syntax.Identifier ? getMutableClone(parameter.name) : createTempVariable(undefined);
    setEmitFlags(declarationName, EmitFlags.NoSourceMap);
    const expressionName = parameter.name.kind === Syntax.Identifier ? getSynthesizedClone(parameter.name) : declarationName;
    const restIndex = node.parameters.length - 1;
    const temp = createLoopVariable();
    prologueStatements.push(
      setEmitFlags(
        setRange(new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(declarationName, undefined, new ArrayLiteralExpression([]))])), parameter),
        EmitFlags.CustomPrologue
      )
    );
    const forStatement = new qc.ForStatement(
      setRange(new qc.VariableDeclarationList([new qc.VariableDeclaration(temp, undefined, qc.asLiteral(restIndex))]), parameter),
      setRange(qf.create.lessThan(temp, new qc.PropertyAccessExpression(new qc.Identifier('arguments'), 'length')), parameter),
      setRange(qf.create.increment(temp), parameter),
      new Block([
        startOnNewLine(
          setRange(
            new qc.ExpressionStatement(
              qf.create.assignment(
                new qc.ElemAccessExpression(expressionName, restIndex === 0 ? temp : qf.create.subtract(temp, qc.asLiteral(restIndex))),
                new qc.ElemAccessExpression(new qc.Identifier('arguments'), temp)
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
          setRange(new qc.VariableStatement(undefined, new qc.VariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, expressionName))), parameter),
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
    const captureThisStatement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(createFileLevelUniqueName('_this'), undefined, initer)]));
    setEmitFlags(captureThisStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
    setSourceMapRange(captureThisStatement, node);
    insertStatementAfterCustomPrologue(statements, captureThisStatement);
  }
  function insertCaptureNewTargetIfNeeded(statements: qc.Statement[], node: FunctionLikeDeclaration, copyOnWrite: boolean): qc.Statement[] {
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
          newTarget = new qc.PropertyAccessExpression(setEmitFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), 'constructor');
          break;
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          newTarget = new qc.ConditionalExpression(
            qf.create.logicalAnd(
              setEmitFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution),
              new BinaryExpression(setEmitFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), Syntax.InstanceOfKeyword, qf.get.declaration.localName(node))
            ),
            new qc.PropertyAccessExpression(setEmitFlags(new qc.ThisExpression(), EmitFlags.NoSubstitution), 'constructor'),
            qc.VoidExpression.zero()
          );
          break;
        default:
          return qu.failBadSyntax(node);
      }
      const captureNewTargetStatement = new qc.VariableStatement(
        undefined,
        new qc.VariableDeclarationList([new qc.VariableDeclaration(createFileLevelUniqueName('_newTarget'), undefined, newTarget)])
      );
      setEmitFlags(captureNewTargetStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
      if (copyOnWrite) {
        statements = statements.slice();
      }
      insertStatementAfterCustomPrologue(statements, captureNewTargetStatement);
    }
    return statements;
  }
  function addClassMembers(statements: qc.Statement[], node: ClassExpression | ClassDeclaration): void {
    for (const member of node.members) {
      switch (member.kind) {
        case Syntax.SemicolonClassElem:
          statements.push(transformSemicolonClassElemToStatement(<SemicolonClassElem>member));
          break;
        case Syntax.MethodDeclaration:
          statements.push(transformClassMethodDeclarationToStatement(getClassMemberPrefix(node, member), <MethodDeclaration>member, node));
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const accessors = qf.get.allAccessorDeclarations(node.members, <AccessorDeclaration>member);
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
  function transformSemicolonClassElemToStatement(member: SemicolonClassElem) {
    return setRange(new qc.EmptyStatement(), member);
  }
  function transformClassMethodDeclarationToStatement(receiver: LeftExpression, member: MethodDeclaration, container: Node) {
    const commentRange = getCommentRange(member);
    const sourceMapRange = getSourceMapRange(member);
    const memberFunction = transformFunctionLikeToExpression(member, undefined, container);
    const propertyName = visitNode(member.name, visitor, isPropertyName);
    let e: qc.Expression;
    if (!qf.is.kind(qc.PrivateIdentifier, propertyName) && context.getCompilerOptions().useDefineForClassFields) {
      const name = qf.is.kind(qc.ComputedPropertyName, propertyName)
        ? propertyName.expression
        : qf.is.kind(qc.Identifier, propertyName)
        ? new qc.StringLiteral(qy.get.unescUnderscores(propertyName.escapedText))
        : propertyName;
      e = qf.create.objectDefinePropertyCall(receiver, name, qf.create.propertyDescriptor({ value: memberFunction, enumerable: false, writable: true, configurable: true }));
    } else {
      const memberName = createMemberAccessForPropertyName(receiver, propertyName, member.name);
      e = qf.create.assignment(memberName, memberFunction);
    }
    setEmitFlags(memberFunction, EmitFlags.NoComments);
    setSourceMapRange(memberFunction, sourceMapRange);
    const statement = setRange(new qc.ExpressionStatement(e), member);
    statement.setOriginal(member);
    setCommentRange(statement, commentRange);
    setEmitFlags(statement, EmitFlags.NoSourceMap);
    return statement;
  }
  function transformAccessorsToStatement(receiver: LeftExpression, accessors: AllAccessorDeclarations, container: Node): qc.Statement {
    const statement = new qc.ExpressionStatement(transformAccessorsToExpression(receiver, accessors, container, false));
    setEmitFlags(statement, EmitFlags.NoComments);
    setSourceMapRange(statement, getSourceMapRange(accessors.firstAccessor));
    return statement;
  }
  function transformAccessorsToExpression(receiver: LeftExpression, { firstAccessor, getAccessor, setAccessor }: AllAccessorDeclarations, container: Node, startsOnNewLine: boolean): qc.Expression {
    const target = getMutableClone(receiver);
    setEmitFlags(target, EmitFlags.NoComments | EmitFlags.NoTrailingSourceMap);
    setSourceMapRange(target, firstAccessor.name);
    const visitedAccessorName = visitNode(firstAccessor.name, visitor, isPropertyName);
    if (qf.is.kind(qc.PrivateIdentifier, visitedAccessorName)) return qu.failBadSyntax(visitedAccessorName, 'Encountered unhandled private identifier while transforming ES2015.');
    const propertyName = createExpressionForPropertyName(visitedAccessorName);
    setEmitFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoLeadingSourceMap);
    setSourceMapRange(propertyName, firstAccessor.name);
    const properties: ObjectLiteralElemLike[] = [];
    if (getAccessor) {
      const getterFunction = transformFunctionLikeToExpression(getAccessor, undefined, container);
      setSourceMapRange(getterFunction, getSourceMapRange(getAccessor));
      setEmitFlags(getterFunction, EmitFlags.NoLeadingComments);
      const getter = new qc.PropertyAssignment('get', getterFunction);
      setCommentRange(getter, getCommentRange(getAccessor));
      properties.push(getter);
    }
    if (setAccessor) {
      const setterFunction = transformFunctionLikeToExpression(setAccessor, undefined, container);
      setSourceMapRange(setterFunction, getSourceMapRange(setAccessor));
      setEmitFlags(setterFunction, EmitFlags.NoLeadingComments);
      const setter = new qc.PropertyAssignment('set', setterFunction);
      setCommentRange(setter, getCommentRange(setAccessor));
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
    const func = new qc.FunctionExpression(undefined, undefined, undefined, undefined, visitParameterList(node.parameters, visitor, context), undefined, transformFunctionBody(node));
    setRange(func, node);
    func.setOriginal(node);
    setEmitFlags(func, EmitFlags.CapturesThis);
    if (hierarchyFacts & HierarchyFacts.CapturedLexicalThis) {
      enableSubstitutionsForCapturedThis();
    }
    exitSubtree(ancestorFacts, HierarchyFacts.ArrowFunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return func;
  }
  function visitFunctionExpression(node: FunctionExpression): qc.Expression {
    const ancestorFacts =
      qf.get.emitFlags(node) & EmitFlags.AsyncFunctionBody
        ? enterSubtree(HierarchyFacts.AsyncFunctionBodyExcludes, HierarchyFacts.AsyncFunctionBodyIncludes)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const parameters = visitParameterList(node.parameters, visitor, context);
    const body = transformFunctionBody(node);
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? qf.get.declaration.localName(node) : node.name;
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
    const name = hierarchyFacts & HierarchyFacts.NewTarget ? qf.get.declaration.localName(node) : node.name;
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), node.asteriskToken, name, undefined, parameters, undefined, body);
  }
  function transformFunctionLikeToExpression(node: FunctionLikeDeclaration, location: TextRange | undefined, name: qc.Identifier | undefined, container: Node | undefined): FunctionExpression {
    const savedConvertedLoopState = convertedLoopState;
    convertedLoopState = undefined;
    const ancestorFacts =
      container && qf.is.classLike(container) && !qf.has.syntacticModifier(node, ModifierFlags.Static)
        ? enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes | HierarchyFacts.NonStaticClassElem)
        : enterSubtree(HierarchyFacts.FunctionExcludes, HierarchyFacts.FunctionIncludes);
    const parameters = visitParameterList(node.parameters, visitor, context);
    const body = transformFunctionBody(node);
    if (hierarchyFacts & HierarchyFacts.NewTarget && !name && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression)) {
      name = qf.get.generatedNameForNode(node);
    }
    exitSubtree(ancestorFacts, HierarchyFacts.FunctionSubtreeExcludes, HierarchyFacts.None);
    convertedLoopState = savedConvertedLoopState;
    return setRange(new qc.FunctionExpression(undefined, parameters, undefined, body), location).setOriginal(node);
  }
  function transformFunctionBody(node: FunctionLikeDeclaration) {
    let multiLine = false;
    let singleLine = false;
    let statementsLocation: TextRange;
    let closeBraceLocation: TextRange | undefined;
    const prologue: qc.Statement[] = [];
    const statements: qc.Statement[] = [];
    const body = node.body!;
    let statementOffset: number | undefined;
    resumeLexicalEnvironment();
    if (qf.is.kind(qc.Block, body)) {
      statementOffset = addStandardPrologue(prologue, body.statements, false);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, isHoistedFunction);
      statementOffset = addCustomPrologue(statements, body.statements, statementOffset, visitor, isHoistedVariableStatement);
    }
    multiLine = addDefaultValueAssignmentsIfNeeded(statements, node) || multiLine;
    multiLine = addRestParameterIfNeeded(statements, node, false) || multiLine;
    if (qf.is.kind(qc.Block, body)) {
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
      const returnStatement = new qc.ReturnStatement(expression);
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
    if (qf.is.kind(qc.Block, body) && arrayIsEqualTo(statements, body.statements)) return body;
    const block = new Block(setRange(new Nodes(statements), statementsLocation), multiLine);
    setRange(block, node.body);
    if (!multiLine && singleLine) {
      setEmitFlags(block, EmitFlags.SingleLine);
    }
    if (closeBraceLocation) {
      setTokenSourceMapRange(block, Syntax.CloseBraceToken, closeBraceLocation);
    }
    block.setOriginal(node.body);
    return block;
  }
  function visitBlock(node: Block, isFunctionBody: boolean): Block {
    if (isFunctionBody) return visitEachChild(node, visitor, context);
    const ancestorFacts =
      hierarchyFacts & HierarchyFacts.IterationSobj
        ? enterSubtree(HierarchyFacts.IterationSobjBlockExcludes, HierarchyFacts.IterationSobjBlockIncludes)
        : enterSubtree(HierarchyFacts.BlockExcludes, HierarchyFacts.BlockIncludes);
    const updated = visitEachChild(node, visitor, context);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitExpressionStatement(node: qc.ExpressionStatement): qc.Statement {
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
  function visitBinaryExpression(node: BinaryExpression, needsDestructuringValue: boolean): qc.Expression {
    if (qf.is.destructuringAssignment(node)) return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, needsDestructuringValue);
    return visitEachChild(node, visitor, context);
  }
  function isVariableStatementOfTypeScriptClassWrapper(node: VariableStatement) {
    return (
      node.declarationList.declarations.length === 1 &&
      !!node.declarationList.declarations[0].initer &&
      !!(qf.get.emitFlags(node.declarationList.declarations[0].initer) & EmitFlags.TypeScriptClassWrapper)
    );
  }
  function visitVariableStatement(node: VariableStatement): qc.Statement | undefined {
    const ancestorFacts = enterSubtree(HierarchyFacts.None, qf.has.syntacticModifier(node, ModifierFlags.Export) ? HierarchyFacts.ExportedVariableStatement : HierarchyFacts.None);
    let updated: qc.Statement | undefined;
    if (convertedLoopState && (node.declarationList.flags & NodeFlags.BlockScoped) === 0 && !isVariableStatementOfTypeScriptClassWrapper(node)) {
      let assignments: qc.Expression[] | undefined;
      for (const decl of node.declarationList.declarations) {
        hoistVariableDeclarationDeclaredInConvertedLoop(convertedLoopState, decl);
        if (decl.initer) {
          let assignment: qc.Expression;
          if (qf.is.kind(qc.BindingPattern, decl.name)) {
            assignment = flattenDestructuringAssignment(decl, visitor, context, FlattenLevel.All);
          } else {
            assignment = new BinaryExpression(decl.name, Syntax.EqualsToken, visitNode(decl.initer, visitor, isExpression));
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
      const declarationList = new qc.VariableDeclarationList(declarations);
      declarationList.setOriginal(node);
      setRange(declarationList, node);
      setCommentRange(declarationList, node);
      if (node.transformFlags & TransformFlags.ContainsBindingPattern && (qf.is.kind(qc.BindingPattern, node.declarations[0].name) || qf.is.kind(qc.BindingPattern, last(node.declarations).name))) {
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
  function shouldEmitExplicitIniterForLetDeclaration(node: VariableDeclaration) {
    const flags = resolver.getNodeCheckFlags(node);
    const isCapturedInFunction = flags & NodeCheckFlags.CapturedBlockScopedBinding;
    const isDeclaredInLoop = flags & NodeCheckFlags.BlockScopedBindingInLoop;
    const emittedAsTopLevel = (hierarchyFacts & HierarchyFacts.TopLevel) !== 0 || (isCapturedInFunction && isDeclaredInLoop && (hierarchyFacts & HierarchyFacts.IterationSobjBlock) !== 0);
    const emitExplicitIniter =
      !emittedAsTopLevel &&
      (hierarchyFacts & HierarchyFacts.ForInOrForOfStatement) === 0 &&
      (!resolver.isDeclarationWithCollidingName(node) || (isDeclaredInLoop && !isCapturedInFunction && (hierarchyFacts & (HierarchyFacts.ForStatement | HierarchyFacts.ForInOrForOfStatement)) === 0));
    return emitExplicitIniter;
  }
  function visitVariableDeclarationInLetDeclarationList(node: VariableDeclaration) {
    const name = node.name;
    if (qf.is.kind(qc.BindingPattern, name)) return visitVariableDeclaration(node);
    if (!node.initer && shouldEmitExplicitIniterForLetDeclaration(node)) {
      const clone = getMutableClone(node);
      clone.initer = qc.VoidExpression.zero();
      return clone;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitVariableDeclaration(node: VariableDeclaration): VisitResult<VariableDeclaration> {
    const ancestorFacts = enterSubtree(HierarchyFacts.ExportedVariableStatement, HierarchyFacts.None);
    let updated: VisitResult<VariableDeclaration>;
    if (qf.is.kind(qc.BindingPattern, node.name)) {
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
    return qf.is.iterationStatement(statement, false)
      ? visitIterationSobj(statement, node)
      : restoreEnclosingLabel(visitNode(statement, visitor, isStatement, liftToBlock), node, convertedLoopState && resetLabel);
  }
  function visitIterationSobj(node: IterationSobj, outermostLabeledStatement: LabeledStatement) {
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
  function visitIterationSobjWithFacts(
    excludeFacts: HierarchyFacts,
    includeFacts: HierarchyFacts,
    node: IterationSobj,
    outermostLabeledStatement: LabeledStatement | undefined,
    convert?: LoopConverter
  ) {
    const ancestorFacts = enterSubtree(excludeFacts, includeFacts);
    const updated = convertIterationSobjBodyIfNecessary(node, outermostLabeledStatement, ancestorFacts, convert);
    exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
    return updated;
  }
  function visitDoOrWhileStatement(node: DoStatement | WhileStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationSobjWithFacts(HierarchyFacts.DoOrWhileStatementExcludes, HierarchyFacts.DoOrWhileStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForStatement(node: ForStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationSobjWithFacts(HierarchyFacts.ForStatementExcludes, HierarchyFacts.ForStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForInStatement(node: ForInStatement, outermostLabeledStatement: LabeledStatement | undefined) {
    return visitIterationSobjWithFacts(HierarchyFacts.ForInOrForOfStatementExcludes, HierarchyFacts.ForInOrForOfStatementIncludes, node, outermostLabeledStatement);
  }
  function visitForOfStatement(node: ForOfStatement, outermostLabeledStatement: LabeledStatement | undefined): VisitResult<Statement> {
    return visitIterationSobjWithFacts(
      HierarchyFacts.ForInOrForOfStatementExcludes,
      HierarchyFacts.ForInOrForOfStatementIncludes,
      node,
      outermostLabeledStatement,
      compilerOptions.downlevelIteration ? convertForOfStatementForIterable : convertForOfStatementForArray
    );
  }
  function convertForOfStatementHead(node: ForOfStatement, boundValue: qc.Expression, convertedLoopBodyStatements: qc.Statement[]) {
    const statements: qc.Statement[] = [];
    const initer = node.initer;
    if (qf.is.kind(qc.VariableDeclarationList, initer)) {
      if (node.initer.flags & NodeFlags.BlockScoped) {
        enableSubstitutionsForBlockScopedBindings();
      }
      const firstOriginalDeclaration = firstOrUndefined(initer.declarations);
      if (firstOriginalDeclaration && qf.is.kind(qc.BindingPattern, firstOriginalDeclaration.name)) {
        const declarations = flattenDestructuringBinding(firstOriginalDeclaration, visitor, context, FlattenLevel.All, boundValue);
        const declarationList = setRange(new qc.VariableDeclarationList(declarations), node.initer);
        declarationList.setOriginal(node.initer);
        setSourceMapRange(declarationList, createRange(declarations[0].pos, last(declarations).end));
        statements.push(new qc.VariableStatement(undefined, declarationList));
      } else {
        statements.push(
          setRange(
            new qc.VariableStatement(
              undefined,
              setOriginalNode(
                setRange(
                  new qc.VariableDeclarationList([new qc.VariableDeclaration(firstOriginalDeclaration ? firstOriginalDeclaration.name : createTempVariable(undefined), undefined, boundValue)]),
                  moveRangePos(initer, -1)
                ),
                initer
              )
            ),
            moveRangeEnd(initer, -1)
          )
        );
      }
    } else {
      const assignment = qf.create.assignment(initer, boundValue);
      if (qf.is.destructuringAssignment(assignment)) {
        aggregateTransformFlags(assignment);
        statements.push(new qc.ExpressionStatement(visitBinaryExpression(assignment, false)));
      } else {
        assignment.end = initer.end;
        statements.push(setRange(new qc.ExpressionStatement(visitNode(assignment, visitor, isExpression)), moveRangeEnd(initer, -1)));
      }
    }
    if (convertedLoopBodyStatements) return createSyntheticBlockForConvertedStatements(addRange(statements, convertedLoopBodyStatements));
    else {
      const statement = visitNode(node.statement, visitor, isStatement, liftToBlock);
      if (qf.is.kind(qc.Block, statement)) return statement.update(setRange(new Nodes(concatenate(statements, statement.statements)), statement.statements));
      statements.push(statement);
      return createSyntheticBlockForConvertedStatements(statements);
    }
  }
}
function createSyntheticBlockForConvertedStatements(statements: qc.Statement[]) {
  return setEmitFlags(new Block(new Nodes(statements), true), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
}
function convertForOfStatementForArray(node: ForOfStatement, outermostLabeledStatement: LabeledStatement, convertedLoopBodyStatements: qc.Statement[]): qc.Statement {
  const expression = visitNode(node.expression, visitor, isExpression);
  const counter = createLoopVariable();
  const rhsReference = qf.is.kind(qc.Identifier, expression) ? qf.get.generatedNameForNode(expression) : createTempVariable(undefined);
  setEmitFlags(expression, EmitFlags.NoSourceMap | qf.get.emitFlags(expression));
  const forStatement = setRange(
    new qc.ForStatement(
      setEmitFlags(
        setRange(
          new qc.VariableDeclarationList([
            setRange(new qc.VariableDeclaration(counter, undefined, qc.asLiteral(0)), moveRangePos(node.expression, -1)),
            setRange(new qc.VariableDeclaration(rhsReference, undefined, expression), node.expression),
          ]),
          node.expression
        ),
        EmitFlags.NoHoisting
      ),
      setRange(qf.create.lessThan(counter, new qc.PropertyAccessExpression(rhsReference, 'length')), node.expression),
      setRange(qf.create.increment(counter), node.expression),
      convertForOfStatementHead(node, new qc.ElemAccessExpression(rhsReference, counter), convertedLoopBodyStatements)
    ),
    node
  );
  setEmitFlags(forStatement, EmitFlags.NoTokenTrailingSourceMaps);
  setRange(forStatement, node);
  return restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel);
}
function convertForOfStatementForIterable(node: ForOfStatement, outermostLabeledStatement: LabeledStatement, convertedLoopBodyStatements: qc.Statement[], ancestorFacts: HierarchyFacts): qc.Statement {
  const expression = visitNode(node.expression, visitor, isExpression);
  const iterator = qf.is.kind(qc.Identifier, expression) ? qf.get.generatedNameForNode(expression) : createTempVariable(undefined);
  const result = qf.is.kind(qc.Identifier, expression) ? qf.get.generatedNameForNode(iterator) : createTempVariable(undefined);
  const errorRecord = createUniqueName('e');
  const catchVariable = qf.get.generatedNameForNode(errorRecord);
  const returnMethod = createTempVariable(undefined);
  const values = createValuesHelper(context, expression, node.expression);
  const next = new qc.CallExpression(new qc.PropertyAccessExpression(iterator, 'next'), undefined, []);
  hoistVariableDeclaration(errorRecord);
  hoistVariableDeclaration(returnMethod);
  const initer = ancestorFacts & HierarchyFacts.IterationContainer ? inlineExpressions([qf.create.assignment(errorRecord, qc.VoidExpression.zero()), values]) : values;
  const forStatement = setEmitFlags(
    setRange(
      new qc.ForStatement(
        setEmitFlags(
          setRange(
            new qc.VariableDeclarationList([setRange(new qc.VariableDeclaration(iterator, undefined, initer), node.expression), new qc.VariableDeclaration(result, undefined, next)]),
            node.expression
          ),
          EmitFlags.NoHoisting
        ),
        qf.create.logicalNot(new qc.PropertyAccessExpression(result, 'done')),
        qf.create.assignment(result, next),
        convertForOfStatementHead(node, new qc.PropertyAccessExpression(result, 'value'), convertedLoopBodyStatements)
      ),
      node
    ),
    EmitFlags.NoTokenTrailingSourceMaps
  );
  return new qc.TryStatement(
    new Block([restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel)]),
    new qc.CatchClause(
      new qc.VariableDeclaration(catchVariable),
      setEmitFlags(
        new Block([new qc.ExpressionStatement(qf.create.assignment(errorRecord, new qc.ObjectLiteralExpression([new qc.PropertyAssignment('error', catchVariable)])))]),
        EmitFlags.SingleLine
      )
    ),
    new Block([
      new qc.TryStatement(
        new Block([
          setEmitFlags(
            new qc.IfStatement(
              qf.create.logicalAnd(
                qf.create.logicalAnd(result, qf.create.logicalNot(new qc.PropertyAccessExpression(result, 'done'))),
                qf.create.assignment(returnMethod, new qc.PropertyAccessExpression(iterator, 'return'))
              ),
              new qc.ExpressionStatement(createFunctionCall(returnMethod, iterator, []))
            ),
            EmitFlags.SingleLine
          ),
        ]),
        undefined,
        setEmitFlags(
          new Block([setEmitFlags(new qc.IfStatement(errorRecord, new qc.ThrowStatement(new qc.PropertyAccessExpression(errorRecord, 'error'))), EmitFlags.SingleLine)]),
          EmitFlags.SingleLine
        )
      ),
    ])
  );
}
function visitObjectLiteralExpression(node: ObjectLiteralExpression): qc.Expression {
  const properties = node.properties;
  const numProperties = properties.length;
  let numInitialProperties = numProperties;
  let numInitialPropertiesWithoutYield = numProperties;
  for (let i = 0; i < numProperties; i++) {
    const property = properties[i];
    if (property.transformFlags & TransformFlags.ContainsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody && i < numInitialPropertiesWithoutYield) {
      numInitialPropertiesWithoutYield = i;
    }
    if (qu.checkDefined(property.name).kind === Syntax.ComputedPropertyName) {
      numInitialProperties = i;
      break;
    }
  }
  if (numInitialProperties !== numProperties) {
    if (numInitialPropertiesWithoutYield < numInitialProperties) {
      numInitialProperties = numInitialPropertiesWithoutYield;
    }
    const temp = createTempVariable(hoistVariableDeclaration);
    const expressions: qc.Expression[] = [];
    const assignment = qf.create.assignment(
      temp,
      setEmitFlags(new qc.ObjectLiteralExpression(Nodes.visit(properties, visitor, isObjectLiteralElemLike, 0, numInitialProperties), node.multiLine), EmitFlags.Indented)
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
interface ForStatementWithConvertibleIniter extends ForStatement {
  initer: VariableDeclarationList;
}
interface ForStatementWithConvertibleCondition extends ForStatement {
  condition: qc.Expression;
}
interface ForStatementWithConvertibleIncrementor extends ForStatement {
  incrementor: qc.Expression;
}
function shouldConvertPartOfIterationSobj(node: Node) {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ContainsCapturedBlockScopeBinding) !== 0;
}
function shouldConvertIniterOfForStatement(node: IterationSobj): node is ForStatementWithConvertibleIniter {
  return qf.is.kind(qc.ForStatement, node) && !!node.initer && shouldConvertPartOfIterationSobj(node.initer);
}
function shouldConvertConditionOfForStatement(node: IterationSobj): node is ForStatementWithConvertibleCondition {
  return qf.is.kind(qc.ForStatement, node) && !!node.condition && shouldConvertPartOfIterationSobj(node.condition);
}
function shouldConvertIncrementorOfForStatement(node: IterationSobj): node is ForStatementWithConvertibleIncrementor {
  return qf.is.kind(qc.ForStatement, node) && !!node.incrementor && shouldConvertPartOfIterationSobj(node.incrementor);
}
function shouldConvertIterationSobj(node: IterationSobj) {
  return shouldConvertBodyOfIterationSobj(node) || shouldConvertIniterOfForStatement(node);
}
function shouldConvertBodyOfIterationSobj(node: IterationSobj): boolean {
  return (resolver.getNodeCheckFlags(node) & NodeCheckFlags.LoopWithCapturedBlockScopedBinding) !== 0;
}
function hoistVariableDeclarationDeclaredInConvertedLoop(state: ConvertedLoopState, node: VariableDeclaration): void {
  if (!state.hoistedLocalVariables) {
    state.hoistedLocalVariables = [];
  }
  visit(node.name);
  function visit(node: qc.Identifier | BindingPattern) {
    if (node.kind === Syntax.Identifier) {
      state.hoistedLocalVariables!.push(node);
    } else {
      for (const elem of node.elems) {
        if (!qf.is.kind(qc.OmittedExpression, elem)) {
          visit(elem.name);
        }
      }
    }
  }
}
function convertIterationSobjBodyIfNecessary(
  node: IterationSobj,
  outermostLabeledStatement: LabeledStatement | undefined,
  ancestorFacts: HierarchyFacts,
  convert?: LoopConverter
): VisitResult<Statement> {
  if (!shouldConvertIterationSobj(node)) {
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
  const statements: qc.Statement[] = [];
  const outerConvertedLoopState = convertedLoopState;
  convertedLoopState = currentState;
  const initerFunction = shouldConvertIniterOfForStatement(node) ? createFunctionForIniterOfForStatement(node, currentState) : undefined;
  const bodyFunction = shouldConvertBodyOfIterationSobj(node) ? createFunctionForBodyOfIterationSobj(node, currentState, outerConvertedLoopState) : undefined;
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
      const clone = convertIterationSobjCore(node, initerFunction, new Block(bodyFunction.part, true));
      aggregateTransformFlags(clone);
      loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
    }
  } else {
    const clone = convertIterationSobjCore(node, initerFunction, visitNode(node.statement, visitor, isStatement, liftToBlock));
    aggregateTransformFlags(clone);
    loop = restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
  }
  statements.push(loop);
  return statements;
}
function convertIterationSobjCore(node: IterationSobj, initerFunction: IterationSobjPartFunction<VariableDeclarationList> | undefined, convertedLoopBody: qc.Statement) {
  switch (node.kind) {
    case Syntax.ForStatement:
      return convertForStatement(node as ForStatement, initerFunction, convertedLoopBody);
    case Syntax.ForInStatement:
      return convertForInStatement(node as ForInStatement, convertedLoopBody);
    case Syntax.ForOfStatement:
      return convertForOfStatement(node as ForOfStatement, convertedLoopBody);
    case Syntax.DoStatement:
      return convertDoStatement(node as DoStatement, convertedLoopBody);
    case Syntax.WhileStatement:
      return convertWhileStatement(node as WhileStatement, convertedLoopBody);
    default:
      return qu.failBadSyntax(node, 'IterationSobj expected');
  }
}
function convertForStatement(node: ForStatement, initerFunction: IterationSobjPartFunction<VariableDeclarationList> | undefined, convertedLoopBody: qc.Statement) {
  const shouldConvertCondition = node.condition && shouldConvertPartOfIterationSobj(node.condition);
  const shouldConvertIncrementor = shouldConvertCondition || (node.incrementor && shouldConvertPartOfIterationSobj(node.incrementor));
  return updateFor(
    node,
    visitNode(initerFunction ? initerFunction.part : node.initer, visitor, isForIniter),
    visitNode(shouldConvertCondition ? undefined : node.condition, visitor, isExpression),
    visitNode(shouldConvertIncrementor ? undefined : node.incrementor, visitor, isExpression),
    convertedLoopBody
  );
}
function convertForOfStatement(node: ForOfStatement, convertedLoopBody: qc.Statement) {
  return node.update(undefined, visitNode(node.initer, visitor, isForIniter), visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertForInStatement(node: ForInStatement, convertedLoopBody: qc.Statement) {
  return node.update(visitNode(node.initer, visitor, isForIniter), visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function convertDoStatement(node: DoStatement, convertedLoopBody: qc.Statement) {
  return node.update(convertedLoopBody, visitNode(node.expression, visitor, isExpression));
}
function convertWhileStatement(node: WhileStatement, convertedLoopBody: qc.Statement) {
  return node.update(visitNode(node.expression, visitor, isExpression), convertedLoopBody);
}
function createConvertedLoopState(node: IterationSobj) {
  let loopIniter: VariableDeclarationList | undefined;
  switch (node.kind) {
    case Syntax.ForStatement:
    case Syntax.ForInStatement:
    case Syntax.ForOfStatement:
      const initer = (<ForStatement | ForInStatement | ForOfStatement>node).initer;
      if (initer && initer.kind === Syntax.VariableDeclarationList) {
        loopIniter = <VariableDeclarationList>initer;
      }
      break;
  }
  const loopParameters: ParameterDeclaration[] = [];
  const loopOutParameters: LoopOutParameter[] = [];
  if (loopIniter && qf.get.combinedFlagsOf(loopIniter) & NodeFlags.BlockScoped) {
    const hasCapturedBindingsInForIniter = shouldConvertIniterOfForStatement(node);
    for (const decl of loopIniter.declarations) {
      processLoopVariableDeclaration(node, decl, loopParameters, loopOutParameters, hasCapturedBindingsInForIniter);
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
function addExtraDeclarationsForConvertedLoop(statements: qc.Statement[], state: ConvertedLoopState, outerState: ConvertedLoopState | undefined) {
  let extraVariableDeclarations: VariableDeclaration[] | undefined;
  if (state.argumentsName) {
    if (outerState) {
      outerState.argumentsName = state.argumentsName;
    } else {
      (extraVariableDeclarations || (extraVariableDeclarations = [])).push(new qc.VariableDeclaration(state.argumentsName, undefined, new qc.Identifier('arguments')));
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
  if (state.loopOutParameters.length) {
    if (!extraVariableDeclarations) {
      extraVariableDeclarations = [];
    }
    for (const outParam of state.loopOutParameters) {
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
interface IterationSobjPartFunction<T> {
  functionName: qc.Identifier;
  functionDeclaration: qc.Statement;
  containsYield: boolean;
  part: T;
}
function createOutVariable(p: LoopOutParameter) {
  return new qc.VariableDeclaration(p.originalName, undefined, p.outParamName);
}
function createFunctionForIniterOfForStatement(node: ForStatementWithConvertibleIniter, currentState: ConvertedLoopState): IterationSobjPartFunction<VariableDeclarationList> {
  const functionName = createUniqueName('_loop_init');
  const containsYield = (node.initer.transformFlags & TransformFlags.ContainsYield) !== 0;
  let emitFlags = EmitFlags.None;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && hierarchyFacts & HierarchyFacts.AsyncFunctionBody) emitFlags |= EmitFlags.AsyncFunctionBody;
  const statements: qc.Statement[] = [];
  statements.push(new qc.VariableStatement(undefined, node.initer));
  copyOutParameters(currentState.loopOutParameters, LoopOutParameterFlags.Initer, CopyDirection.ToOutParameter, statements);
  const functionDeclaration = new qc.VariableStatement(
    undefined,
    setEmitFlags(
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(
          functionName,
          undefined,
          setEmitFlags(
            new qc.FunctionExpression(
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
  const part = new qc.VariableDeclarationList(map(currentState.loopOutParameters, createOutVariable));
  return { functionName, containsYield, functionDeclaration, part };
}
function createFunctionForBodyOfIterationSobj(node: IterationSobj, currentState: ConvertedLoopState, outerState: ConvertedLoopState | undefined): IterationSobjPartFunction<Statement[]> {
  const functionName = createUniqueName('_loop');
  startLexicalEnvironment();
  const statement = visitNode(node.statement, visitor, isStatement, liftToBlock);
  const lexicalEnvironment = endLexicalEnvironment();
  const statements: qc.Statement[] = [];
  if (shouldConvertConditionOfForStatement(node) || shouldConvertIncrementorOfForStatement(node)) {
    currentState.conditionVariable = createUniqueName('inc');
    statements.push(
      new qc.IfStatement(
        currentState.conditionVariable,
        new qc.ExpressionStatement(visitNode(node.incrementor, visitor, isExpression)),
        new qc.ExpressionStatement(qf.create.assignment(currentState.conditionVariable, new qc.BooleanLiteral(true)))
      )
    );
    if (shouldConvertConditionOfForStatement(node)) {
      statements.push(
        new qc.IfStatement(new qc.PrefixUnaryExpression(Syntax.ExclamationToken, visitNode(node.condition, visitor, isExpression)), visitNode(new qc.BreakStatement(), visitor, isStatement))
      );
    }
  }
  if (qf.is.kind(qc.Block, statement)) {
    addRange(statements, statement.statements);
  } else {
    statements.push(statement);
  }
  copyOutParameters(currentState.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOutParameter, statements);
  insertStatementsAfterStandardPrologue(statements, lexicalEnvironment);
  const loopBody = new Block(statements, true);
  if (qf.is.kind(qc.Block, statement)) loopBody.setOriginal(statement);
  const containsYield = (node.statement.transformFlags & TransformFlags.ContainsYield) !== 0;
  let emitFlags: EmitFlags = 0;
  if (currentState.containsLexicalThis) emitFlags |= EmitFlags.CapturesThis;
  if (containsYield && (hierarchyFacts & HierarchyFacts.AsyncFunctionBody) !== 0) emitFlags |= EmitFlags.AsyncFunctionBody;
  const functionDeclaration = new qc.VariableStatement(
    undefined,
    setEmitFlags(
      new qc.VariableDeclarationList([
        new qc.VariableDeclaration(
          functionName,
          undefined,
          setEmitFlags(
            new qc.FunctionExpression(undefined, containsYield ? new Token(Syntax.AsteriskToken) : undefined, undefined, undefined, currentState.loopParameters, undefined, loopBody),
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
function copyOutParameters(outParams: LoopOutParameter[], partFlags: LoopOutParameterFlags, copyDirection: CopyDirection, statements: qc.Statement[]): void {
  for (const outParam of outParams) {
    if (outParam.flags & partFlags) {
      statements.push(new qc.ExpressionStatement(copyOutParameter(outParam, copyDirection)));
    }
  }
}
function generateCallToConvertedLoopIniter(initFunctionExpressionName: qc.Identifier, containsYield: boolean): qc.Statement {
  const call = new qc.CallExpression(initFunctionExpressionName, undefined, []);
  const callResult = containsYield ? new qc.YieldExpression(new Token(Syntax.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator)) : call;
  return new qc.ExpressionStatement(callResult);
}
function generateCallToConvertedLoop(loopFunctionExpressionName: qc.Identifier, state: ConvertedLoopState, outerState: ConvertedLoopState | undefined, containsYield: boolean): qc.Statement[] {
  const statements: qc.Statement[] = [];
  const isSimpleLoop = !(state.nonLocalJumps! & ~Jump.Continue) && !state.labeledNonLocalBreaks && !state.labeledNonLocalContinues;
  const call = new qc.CallExpression(
    loopFunctionExpressionName,
    undefined,
    map(state.loopParameters, (p) => <Identifier>p.name)
  );
  const callResult = containsYield ? new qc.YieldExpression(new Token(Syntax.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator)) : call;
  if (isSimpleLoop) {
    statements.push(new qc.ExpressionStatement(callResult));
    copyOutParameters(state.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOriginal, statements);
  } else {
    const loopResultName = createUniqueName('state');
    const stateVariable = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(loopResultName, undefined, callResult)]));
    statements.push(stateVariable);
    copyOutParameters(state.loopOutParameters, LoopOutParameterFlags.Body, CopyDirection.ToOriginal, statements);
    if (state.nonLocalJumps! & Jump.Return) {
      let returnStatement: ReturnStatement;
      if (outerState) {
        outerState.nonLocalJumps! |= Jump.Return;
        returnStatement = new qc.ReturnStatement(loopResultName);
      } else {
        returnStatement = new qc.ReturnStatement(new qc.PropertyAccessExpression(loopResultName, 'value'));
      }
      statements.push(new qc.IfStatement(new BinaryExpression(new TypeOfExpression(loopResultName), Syntax.Equals3Token, qc.asLiteral('object')), returnStatement));
    }
    if (state.nonLocalJumps! & Jump.Break) {
      statements.push(new qc.IfStatement(new BinaryExpression(loopResultName, Syntax.Equals3Token, qc.asLiteral('break')), new qc.BreakStatement()));
    }
    if (state.labeledNonLocalBreaks || state.labeledNonLocalContinues) {
      const caseClauses: CaseClause[] = [];
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
function processLabeledJumps(table: qu.QMap<string>, isBreak: boolean, loopResultName: qc.Identifier, outerLoop: ConvertedLoopState | undefined, caseClauses: CaseClause[]): void {
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
  container: IterationSobj,
  decl: VariableDeclaration | BindingElem,
  loopParameters: ParameterDeclaration[],
  loopOutParameters: LoopOutParameter[],
  hasCapturedBindingsInForIniter: boolean
) {
  const name = decl.name;
  if (qf.is.kind(qc.BindingPattern, name)) {
    for (const elem of name.elems) {
      if (!qf.is.kind(qc.OmittedExpression, elem)) {
        processLoopVariableDeclaration(container, elem, loopParameters, loopOutParameters, hasCapturedBindingsInForIniter);
      }
    }
  } else {
    loopParameters.push(new qc.ParameterDeclaration(undefined, undefined, name));
    const checkFlags = resolver.getNodeCheckFlags(decl);
    if (checkFlags & NodeCheckFlags.NeedsLoopOutParameter || hasCapturedBindingsInForIniter) {
      const outParamName = createUniqueName('out_' + idText(name));
      let flags: LoopOutParameterFlags = 0;
      if (checkFlags & NodeCheckFlags.NeedsLoopOutParameter) {
        flags |= LoopOutParameterFlags.Body;
      }
      if (qf.is.kind(qc.ForStatement, container) && container.initer && resolver.isBindingCapturedByNode(container.initer, decl)) {
        flags |= LoopOutParameterFlags.Initer;
      }
      loopOutParameters.push({ flags, originalName: name, outParamName });
    }
  }
}
function addObjectLiteralMembers(expressions: qc.Expression[], node: ObjectLiteralExpression, receiver: qc.Identifier, start: number) {
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
function transformPropertyAssignmentToExpression(property: PropertyAssignment, receiver: qc.Expression, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(createMemberAccessForPropertyName(receiver, visitNode(property.name, visitor, isPropertyName)), visitNode(property.initer, visitor, isExpression));
  setRange(expression, property);
  if (startsOnNewLine) {
    startOnNewLine(expression);
  }
  return expression;
}
function transformShorthandPropertyAssignmentToExpression(property: ShorthandPropertyAssignment, receiver: qc.Expression, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(createMemberAccessForPropertyName(receiver, visitNode(property.name, visitor, isPropertyName)), getSynthesizedClone(property.name));
  setRange(expression, property);
  if (startsOnNewLine) {
    startOnNewLine(expression);
  }
  return expression;
}
function transformObjectLiteralMethodDeclarationToExpression(method: MethodDeclaration, receiver: qc.Expression, container: Node, startsOnNewLine: boolean) {
  const expression = qf.create.assignment(
    createMemberAccessForPropertyName(receiver, visitNode(method.name, visitor, isPropertyName)),
    transformFunctionLikeToExpression(method, undefined, container)
  );
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
  if (qf.is.kind(qc.BindingPattern, node.variableDeclaration.name)) {
    const temp = createTempVariable(undefined);
    const newVariableDeclaration = new qc.VariableDeclaration(temp);
    setRange(newVariableDeclaration, node.variableDeclaration);
    const vars = flattenDestructuringBinding(node.variableDeclaration, visitor, context, FlattenLevel.All, temp);
    const list = new qc.VariableDeclarationList(vars);
    setRange(list, node.variableDeclaration);
    const destructure = new qc.VariableStatement(undefined, list);
    updated = node.update(newVariableDeclaration, addStatementToStartOfBlock(node.block, destructure));
  } else {
    updated = visitEachChild(node, visitor, context);
  }
  exitSubtree(ancestorFacts, HierarchyFacts.None, HierarchyFacts.None);
  return updated;
}
function addStatementToStartOfBlock(block: Block, statement: qc.Statement): Block {
  const transformedStatements = Nodes.visit(block.statements, visitor, isStatement);
  return block.update([statement, ...transformedStatements]);
}
function visitMethodDeclaration(node: MethodDeclaration): ObjectLiteralElemLike {
  assert(!qf.is.kind(qc.ComputedPropertyName, node.name));
  const functionExpression = transformFunctionLikeToExpression(node, undefined);
  setEmitFlags(functionExpression, EmitFlags.NoLeadingComments | qf.get.emitFlags(functionExpression));
  return setRange(new qc.PropertyAssignment(node.name, functionExpression), node);
}
function visitAccessorDeclaration(node: AccessorDeclaration): AccessorDeclaration {
  assert(!qf.is.kind(qc.ComputedPropertyName, node.name));
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
function visitShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElemLike {
  return setRange(new qc.PropertyAssignment(node.name, getSynthesizedClone(node.name)), node);
}
function visitComputedPropertyName(node: ComputedPropertyName) {
  return visitEachChild(node, visitor, context);
}
function visitYieldExpression(node: YieldExpression): qc.Expression {
  return visitEachChild(node, visitor, context);
}
function visitArrayLiteralExpression(node: ArrayLiteralExpression): qc.Expression {
  if (some(node.elems, isSpreadElem)) return transformAndSpreadElems(node.elems, !!node.elems.trailingComma);
  return visitEachChild(node, visitor, context);
}
function visitCallExpression(node: CallExpression) {
  if (qf.get.emitFlags(node) & EmitFlags.TypeScriptClassWrapper) return visitTypeScriptClassWrapper(node);
  const expression = qc.skip.outerExpressions(node.expression);
  if (expression.kind === Syntax.SuperKeyword || qf.is.superProperty(expression) || some(node.arguments, isSpreadElem)) return visitCallExpressionWithPotentialCapturedThisAssignment(node, true);
  return node.update(visitNode(node.expression, callExpressionVisitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
}
function visitTypeScriptClassWrapper(node: CallExpression) {
  const body = cast(cast(qc.skip.outerExpressions(node.expression), isArrowFunction).body, isBlock);
  const isVariableStatementWithIniter = (stmt: qc.Statement) => qf.is.kind(qc.VariableStatement, stmt) && !!first(stmt.declarationList.declarations).initer;
  const savedConvertedLoopState = convertedLoopState;
  convertedLoopState = undefined;
  const bodyStatements = Nodes.visit(body.statements, visitor, isStatement);
  convertedLoopState = savedConvertedLoopState;
  const classStatements = filter(bodyStatements, isVariableStatementWithIniter);
  const remainingStatements = filter(bodyStatements, (stmt) => !isVariableStatementWithIniter(stmt));
  const varStatement = cast(first(classStatements), isVariableStatement);
  const variable = varStatement.declarationList.declarations[0];
  const initer = qc.skip.outerExpressions(variable.initer!);
  const aliasAssignment = qu.tryCast(initer, isAssignmentExpression);
  const call = cast(aliasAssignment ? qc.skip.outerExpressions(aliasAssignment.right) : initer, isCallExpression);
  const func = cast(qc.skip.outerExpressions(call.expression), isFunctionExpression);
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
  while (!qf.is.kind(qc.ReturnStatement, elemAt(funcStatements, classBodyEnd)!)) {
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
      variable.initer,
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
  if (node.transformFlags & TransformFlags.ContainsRestOrSpread || node.expression.kind === Syntax.SuperKeyword || qf.is.superProperty(qc.skip.outerExpressions(node.expression))) {
    const { target, thisArg } = qf.create.callBinding(node.expression, hoistVariableDeclaration);
    if (node.expression.kind === Syntax.SuperKeyword) {
      setEmitFlags(thisArg, EmitFlags.NoSubstitution);
    }
    let resultingCall: CallExpression | BinaryExpression;
    if (node.transformFlags & TransformFlags.ContainsRestOrSpread) {
      resultingCall = createFunctionApply(
        visitNode(target, callExpressionVisitor, isExpression),
        node.expression.kind === Syntax.SuperKeyword ? thisArg : visitNode(thisArg, visitor, isExpression),
        transformAndSpreadElems(node.arguments, false)
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
      const initer = qf.create.logicalOr(resultingCall, createActualThis());
      resultingCall = assignToCapturedThis ? qf.create.assignment(createFileLevelUniqueName('_this'), initer) : initer;
    }
    return resultingCall.setOriginal(node);
  }
  return visitEachChild(node, visitor, context);
}
function visitNewExpression(node: NewExpression): LeftExpression {
  if (some(node.arguments, isSpreadElem)) {
    const { target, thisArg } = qf.create.callBinding(new qc.PropertyAccessExpression(node.expression, 'bind'), hoistVariableDeclaration);
    return new qc.NewExpression(
      createFunctionApply(visitNode(target, visitor, isExpression), thisArg, transformAndSpreadElems(new Nodes([qc.VoidExpression.zero(), ...node.arguments!]), false)),
      undefined,
      []
    );
  }
  return visitEachChild(node, visitor, context);
}
function transformAndSpreadElems(elems: Nodes<Expression>, needsUniqueCopy: boolean, multiLine: boolean, trailingComma: boolean): qc.Expression {
  const numElems = elems.length;
  const segments = flatten<Expression>(spanMap(elems, partitionSpread, (partition, visitPartition, _start, end) => visitPartition(partition, multiLine, trailingComma && end === numElems)));
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
function isPackedElem(node: qc.Expression) {
  return !qf.is.kind(qc.OmittedExpression, node);
}
function isPackedArrayLiteral(node: qc.Expression) {
  return isArrayLiteralExpression(node) && every(node.elems, isPackedElem);
}
function isCallToHelper(firstSegment: qc.Expression, helperName: __String) {
  return (
    qf.is.kind(qc.CallExpression, firstSegment) &&
    qf.is.kind(qc.Identifier, firstSegment.expression) &&
    qf.get.emitFlags(firstSegment.expression) & EmitFlags.HelperName &&
    firstSegment.expression.escapedText === helperName
  );
}
function partitionSpread(node: qc.Expression) {
  return qf.is.kind(qc.SpreadElem, node) ? visitSpanOfSpreads : visitSpanOfNonSpreads;
}
function visitSpanOfSpreads(chunk: qc.Expression[]): VisitResult<Expression> {
  return map(chunk, visitExpressionOfSpread);
}
function visitSpanOfNonSpreads(chunk: qc.Expression[], multiLine: boolean, trailingComma: boolean): VisitResult<Expression> {
  return new ArrayLiteralExpression(Nodes.visit(new Nodes(chunk, trailingComma), visitor, isExpression), multiLine);
}
function visitSpreadElem(node: SpreadElem) {
  return visitNode(node.expression, visitor, isExpression);
}
function visitExpressionOfSpread(node: SpreadElem) {
  return visitNode(node.expression, visitor, isExpression);
}
function visitTemplateLiteral(node: LiteralExpression): LeftExpression {
  return setRange(qc.asLiteral(node.text), node);
}
function visitStringLiteral(node: StringLiteral) {
  if (node.hasExtendedEscape) return setRange(qc.asLiteral(node.text), node);
  return node;
}
function visitNumericLiteral(node: NumericLiteral) {
  if (node.numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier) return setRange(new qc.NumericLiteral(node.text), node);
  return node;
}
function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
  return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.All);
}
function visitTemplateExpression(node: TemplateExpression): qc.Expression {
  const expressions: qc.Expression[] = [];
  addTemplateHead(expressions, node);
  addTemplateSpans(expressions, node);
  const expression = reduceLeft(expressions, qf.create.add)!;
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
function addTemplateHead(expressions: qc.Expression[], node: TemplateExpression): void {
  if (!shouldAddTemplateHead(node)) {
    return;
  }
  expressions.push(qc.asLiteral(node.head.text));
}
function addTemplateSpans(expressions: qc.Expression[], node: TemplateExpression): void {
  for (const span of node.templateSpans) {
    expressions.push(visitNode(span.expression, visitor, isExpression));
    if (span.literal.text.length !== 0) {
      expressions.push(qc.asLiteral(span.literal.text));
    }
  }
}
function visitSuperKeyword(isExpressionOfCall: boolean): LeftExpression {
  return hierarchyFacts & HierarchyFacts.NonStaticClassElem && !isExpressionOfCall
    ? new qc.PropertyAccessExpression(createFileLevelUniqueName('_super'), 'prototype')
    : createFileLevelUniqueName('_super');
}
function visitMetaProperty(node: MetaProperty) {
  if (node.keywordToken === Syntax.NewKeyword && node.name.escapedText === 'target') {
    hierarchyFacts |= HierarchyFacts.NewTarget;
    return createFileLevelUniqueName('_newTarget');
  }
  return node;
}
function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) {
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
function onSubstituteNode(hint: EmitHint, node: Node) {
  node = previousOnSubstituteNode(hint, node);
  if (hint === EmitHint.Expression) return substituteExpression(node);
  if (qf.is.kind(qc.Identifier, node)) return substituteIdentifier(node);
  return node;
}
function substituteIdentifier(node: qc.Identifier) {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !qf.is.internalName(node)) {
    const original = qf.get.parseTreeOf(node, isIdentifier);
    if (original && isNameOfDeclarationWithCollidingName(original)) return setRange(qf.get.generatedNameForNode(original), node);
  }
  return node;
}
function isNameOfDeclarationWithCollidingName(node: qc.Identifier) {
  switch (node.parent.kind) {
    case Syntax.BindingElem:
    case Syntax.ClassDeclaration:
    case Syntax.EnumDeclaration:
    case Syntax.VariableDeclaration:
      return (<NamedDobj>node.parent).name === node && resolver.isDeclarationWithCollidingName(<Declaration>node.parent);
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
function substituteExpressionIdentifier(node: qc.Identifier): qc.Identifier {
  if (enabledSubstitutions & ES2015SubstitutionFlags.BlockScopedBindings && !qf.is.internalName(node)) {
    const declaration = resolver.getReferencedDeclarationWithCollidingName(node);
    if (declaration && !(qf.is.classLike(declaration) && isPartOfClassBody(declaration, node))) return setRange(qf.get.generatedNameForNode(qf.get.declaration.nameOf(declaration)), node);
  }
  return node;
}
function isPartOfClassBody(declaration: ClassLikeDeclaration, node: qc.Identifier) {
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
function substituteThisKeyword(node: PrimaryExpression): PrimaryExpression {
  if (enabledSubstitutions & ES2015SubstitutionFlags.CapturedThis && hierarchyFacts & HierarchyFacts.CapturesThis) return setRange(createFileLevelUniqueName('_this'), node);
  return node;
}
function getClassMemberPrefix(node: ClassExpression | ClassDeclaration, member: ClassElem) {
  return qf.has.syntacticModifier(member, ModifierFlags.Static) ? qf.get.declaration.internalName(node) : new qc.PropertyAccessExpression(qf.get.declaration.internalName(node), 'prototype');
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
  if (!callArgument || !isSynthesized(callArgument) || callArgument.kind !== Syntax.SpreadElem) return false;
  const expression = (<SpreadElem>callArgument).expression;
  return qf.is.kind(qc.Identifier, expression) && expression.escapedText === 'arguments';
}
function createExtendsHelper(context: TransformationContext, name: qc.Identifier) {
  context.requestEmitHelper(extendsHelper);
  return new qc.CallExpression(getUnscopedHelperName('__extends'), undefined, [name, createFileLevelUniqueName('_super')]);
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
