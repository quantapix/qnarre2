import * as qc from '../core';
import { Node, Nodes } from '../core';
import { qf } from '../core';
import { Modifier } from '../type';
import * as qu from '../util';
import * as qt from '../type';
import * as qy from '../syntax';
import { Syntax } from '../syntax';
// Transforms generator functions into a compatible ES5 representation with similar runtime
// semantics. This is accomplished by first transforming the body of each generator
// function into an intermediate representation that is the compiled into a JavaScript
// switch statement.
//
// Many functions in this transformer will contain comments indicating the expected
// intermediate representation. For illustrative purposes, the following intermediate
// language is used to define this intermediate representation:
//
//  .nop                            - Performs no operation.
//  .local NAME, ...                - Define local variable declarations.
//  .mark LABEL                     - Mark the location of a label.
//  .br LABEL                       - Jump to a label. If jumping out of a protected
//                                    region, all .finally blocks are executed.
//  .brtrue LABEL, (x)              - Jump to a label IIF the expression `x` is truthy.
//                                    If jumping out of a protected region, all .finally
//                                    blocks are executed.
//  .brfalse LABEL, (x)             - Jump to a label IIF the expression `x` is falsey.
//                                    If jumping out of a protected region, all .finally
//                                    blocks are executed.
//  .yield (x)                      - Yield the value of the optional expression `x`.
//                                    Resume at the next label.
//  .yieldstar (x)                  - Delegate yield to the value of the optional
//                                    expression `x`. Resume at the next label.
//                                    NOTE: `x` must be an Iterator, not an Iterable.
//  .loop CONTINUE, BREAK           - Marks the beginning of a loop. Any "continue" or
//                                    "break" abrupt completions jump to the CONTINUE or
//                                    BREAK labels, respectively.
//  .endloop                        - Marks the end of a loop.
//  .with (x)                       - Marks the beginning of a WithStatement block, using
//                                    the supplied expression.
//  .endwith                        - Marks the end of a WithStatement.
//  .switch                         - Marks the beginning of a SwitchStatement.
//  .endswitch                      - Marks the end of a SwitchStatement.
//  .labeled NAME                   - Marks the beginning of a LabeledStatement with the
//                                    supplied name.
//  .endlabeled                     - Marks the end of a LabeledStatement.
//  .try TRY, CATCH, FINALLY, END   - Marks the beginning of a protected region, and the
//                                    labels for each block.
//  .catch (x)                      - Marks the beginning of a catch block.
//  .finally                        - Marks the beginning of a finally block.
//  .endfinally                     - Marks the end of a finally block.
//  .endtry                         - Marks the end of a protected region.
//  .throw (x)                      - Throws the value of the expression `x`.
//  .return (x)                     - Returns the value of the expression `x`.
//
// In addition, the illustrative intermediate representation introduces some special
// variables:
//
//  %sent%                          - Either returns the next value sent to the generator,
//                                    returns the result of a delegated yield, or throws
//                                    the exception sent to the generator.
//  %error%                         - Returns the value of the current exception in a
//                                    catch block.
//
// This intermediate representation is then compiled into JavaScript syntax. The resulting
// compilation output looks something like the following:
//
//  function f() {
//      var ;
//
//      return __generator(function (state) {
//          switch (state.label) {
//
//          }
//      });
//  }
//
// Each of the above instructions corresponds to JavaScript emit similar to the following:
//
//  .local NAME                   | var NAME;
// -------------------------------|----------------------------------------------
//  .mark LABEL                   | case LABEL:
// -------------------------------|----------------------------------------------
//  .br LABEL                     |     return [3 , LABEL];
// -------------------------------|----------------------------------------------
//  .brtrue LABEL, (x)            |     if (x) return [3 , LABEL];
// -------------------------------|----------------------------------------------
//  .brfalse LABEL, (x)           |     if (!(x)) return [3, , LABEL];
// -------------------------------|----------------------------------------------
//  .yield (x)                    |     return [4 , x];
//  .mark RESUME                  | case RESUME:
//      a = %sent%;               |     a = state.sent();
// -------------------------------|----------------------------------------------
//  .yieldstar (x)                |     return [5 , x];
//  .mark RESUME                  | case RESUME:
//      a = %sent%;               |     a = state.sent();
// -------------------------------|----------------------------------------------
//  .with (_a)                    |     with (_a) {
//      a();                      |         a();
//                                |     }
//                                |     state.label = LABEL;
//  .mark LABEL                   | case LABEL:
//                                |     with (_a) {
//      b();                      |         b();
//                                |     }
//  .endwith                      |
// -------------------------------|----------------------------------------------
//                                | case 0:
//                                |     state.trys = [];
//                                | ...
//  .try TRY, CATCH, FINALLY, END |
//  .mark TRY                     | case TRY:
//                                |     state.trys.push([TRY, CATCH, FINALLY, END]);
//  .nop                          |
//      a();                      |     a();
//  .br END                       |     return [3 , END];
//  .catch (e)                    |
//  .mark CATCH                   | case CATCH:
//                                |     e = state.sent();
//      b();                      |     b();
//  .br END                       |     return [3 , END];
//  .finally                      |
//  .mark FINALLY                 | case FINALLY:
//      c();                      |     c();
//  .endfinally                   |     return [7 ];
//  .endtry                       |
//  .mark END                     | case END:
type Label = number;
const enum OpCode {
  Nop, // No operation, used to force a new case in the state machine
  Statement, // A regular javascript statement
  Assign, // An assignment
  Break, // A break instruction used to jump to a label
  BreakWhenTrue, // A break instruction used to jump to a label if a condition evaluates to true
  BreakWhenFalse, // A break instruction used to jump to a label if a condition evaluates to false
  Yield, // A completion instruction for the `yield` keyword
  YieldStar, // A completion instruction for the `yield*` keyword (not implemented, but reserved for future use)
  Return, // A completion instruction for the `return` keyword
  Throw, // A completion instruction for the `throw` keyword
  Endfinally, // Marks the end of a `finally` block
}
type OperationArguments = [Label] | [Label, Expression] | [Statement] | [Expression | undefined] | [Expression, Expression];
// whether a generated code block is opening or closing at the current operation for a FunctionBuilder
const enum BlockAction {
  Open,
  Close,
}
// the kind for a generated code block in a FunctionBuilder
const enum CodeBlockKind {
  Exception,
  With,
  Switch,
  Loop,
  Labeled,
}
// the state for a generated code exception block
const enum ExceptionBlockState {
  Try,
  Catch,
  Finally,
  Done,
}
// A generated code block
type CodeBlock = ExceptionBlock | LabeledBlock | SwitchBlock | LoopBlock | WithBlock;
// a generated exception block, used for 'try' statements
interface ExceptionBlock {
  kind: CodeBlockKind.Exception;
  state: ExceptionBlockState;
  startLabel: Label;
  catchVariable?: Identifier;
  catchLabel?: Label;
  finallyLabel?: Label;
  endLabel: Label;
}
// A generated code that tracks the target for 'break' statements in a LabeledStatement.
interface LabeledBlock {
  kind: CodeBlockKind.Labeled;
  labelText: string;
  isScript: boolean;
  breakLabel: Label;
}
// a generated block that tracks the target for 'break' statements in a 'switch' statement
interface SwitchBlock {
  kind: CodeBlockKind.Switch;
  isScript: boolean;
  breakLabel: Label;
}
// a generated block that tracks the targets for 'break' and 'continue' statements, used for iteration statements
interface LoopBlock {
  kind: CodeBlockKind.Loop;
  continueLabel: Label;
  isScript: boolean;
  breakLabel: Label;
}
// a generated block associated with a 'with' statement
interface WithBlock {
  kind: CodeBlockKind.With;
  expression: Identifier;
  startLabel: Label;
  endLabel: Label;
}
// NOTE: changes to this enum should be reflected in the __generator helper.
const enum Instruction {
  Next = 0,
  Throw = 1,
  Return = 2,
  Break = 3,
  Yield = 4,
  YieldStar = 5,
  Catch = 6,
  Endfinally = 7,
}
function getInstructionName(instruction: Instruction): string {
  switch (instruction) {
    case Instruction.Return:
      return 'return';
    case Instruction.Break:
      return 'break';
    case Instruction.Yield:
      return 'yield';
    case Instruction.YieldStar:
      return 'yield*';
    case Instruction.Endfinally:
      return 'endfinally';
    default:
      return undefined!; // TODO: GH#18217
  }
}
export function transformGenerators(context: TransformationContext) {
  const { resumeLexicalEnvironment, endLexicalEnvironment, hoistFunctionDeclaration, hoistVariableDeclaration } = context;
  const compilerOptions = context.getCompilerOptions();
  const languageVersion = getEmitScriptTarget(compilerOptions);
  const resolver = context.getEmitResolver();
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  let renamedCatchVariables: Map<boolean>;
  let renamedCatchVariableDeclarations: Identifier[];
  let inGeneratorFunctionBody: boolean;
  let inStatementContainingYield: boolean;
  // The following three arrays store information about generated code blocks.
  // All three arrays are correlated by their index. This approach is used over allocating
  // objects to store the same information to avoid GC overhead.
  //
  let blocks: CodeBlock[] | undefined; // Information about the code block
  let blockOffsets: number[] | undefined; // The operation offset at which a code block begins or ends
  let blockActions: BlockAction[] | undefined; // Whether the code block is opened or closed
  let blockStack: CodeBlock[] | undefined; // A stack of currently open code blocks
  // Labels are used to mark locations in the code that can be the target of a Break (jump)
  // operation. These are translated into case clauses in a switch statement.
  // The following two arrays are correlated by their index. This approach is used over
  // allocating objects to store the same information to avoid GC overhead.
  //
  let labelOffsets: number[] | undefined; // The operation offset at which the label is defined.
  let labelExpressions: LiteralExpression[][] | undefined; // The NumericLiteral nodes bound to each label.
  let nextLabelId = 1; // The next label id to use.
  // Operations store information about generated code for the function body. This
  // Includes things like statements, assignments, breaks (jumps), and yields.
  // The following three arrays are correlated by their index. This approach is used over
  // allocating objects to store the same information to avoid GC overhead.
  //
  let operations: OpCode[] | undefined; // The operation to perform.
  let operationArguments: (OperationArguments | undefined)[] | undefined; // The arguments to the operation.
  let operationLocations: (TextRange | undefined)[] | undefined; // The source map location for the operation.
  let state: Identifier; // The name of the state object used by the generator at runtime.
  // The following variables store information used by the `build` function:
  //
  let blockIndex = 0; // The index of the current block.
  let labelNumber = 0; // The current label number.
  let labelNumbers: number[][] | undefined;
  let lastOperationWasAbrupt: boolean; // Indicates whether the last operation was abrupt (break/continue).
  let lastOperationWasCompletion: boolean; // Indicates whether the last operation was a completion (return/throw).
  let clauses: CaseClause[] | undefined; // The case clauses generated for labels.
  let statements: Statement[] | undefined; // The statements for the current label.
  let exceptionBlockStack: ExceptionBlock[] | undefined; // A stack of containing exception blocks.
  let currentExceptionBlock: ExceptionBlock | undefined; // The current exception block.
  let withBlockStack: WithBlock[] | undefined; // A stack containing `with` blocks.
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile || (node.transformFlags & TransformFlags.ContainsGenerator) === 0) return node;
    const visited = visitEachChild(node, visitor, context);
    addEmitHelpers(visited, context.readEmitHelpers());
    return visited;
  }
  function visitor(node: Node): VisitResult<Node> {
    const transformFlags = node.transformFlags;
    if (inStatementContainingYield) return visitJavaScriptInStatementContainingYield(node);
    if (inGeneratorFunctionBody) return visitJavaScriptInGeneratorFunctionBody(node);
    if (qc.is.functionLikeDeclaration(node) && node.asteriskToken) return visitGenerator(node);
    if (transformFlags & TransformFlags.ContainsGenerator) return visitEachChild(node, visitor, context);
    return node;
  }
  function visitJavaScriptInStatementContainingYield(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.DoStatement:
        return visitDoStatement(<DoStatement>node);
      case Syntax.WhileStatement:
        return visitWhileStatement(<WhileStatement>node);
      case Syntax.SwitchStatement:
        return visitSwitchStatement(<SwitchStatement>node);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(<LabeledStatement>node);
      default:
        return visitJavaScriptInGeneratorFunctionBody(node);
    }
  }
  function visitJavaScriptInGeneratorFunctionBody(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<FunctionExpression>node);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return visitAccessorDeclaration(<AccessorDeclaration>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<VariableStatement>node);
      case Syntax.ForStatement:
        return visitForStatement(<ForStatement>node);
      case Syntax.ForInStatement:
        return visitForInStatement(<ForInStatement>node);
      case Syntax.BreakStatement:
        return visitBreakStatement(<BreakStatement>node);
      case Syntax.ContinueStatement:
        return visitContinueStatement(<ContinueStatement>node);
      case Syntax.ReturnStatement:
        return visitReturnStatement(<ReturnStatement>node);
      default:
        if (node.transformFlags & TransformFlags.ContainsYield) return visitJavaScriptContainingYield(node);
        if (node.transformFlags & (TransformFlags.ContainsGenerator | TransformFlags.ContainsHoistedDeclarationOrCompletion)) return visitEachChild(node, visitor, context);
        return node;
    }
  }
  function visitJavaScriptContainingYield(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.BinaryExpression:
        return visitBinaryExpression(<BinaryExpression>node);
      case Syntax.ConditionalExpression:
        return visitConditionalExpression(<ConditionalExpression>node);
      case Syntax.YieldExpression:
        return visitYieldExpression(<YieldExpression>node);
      case Syntax.ArrayLiteralExpression:
        return visitArrayLiteralExpression(<ArrayLiteralExpression>node);
      case Syntax.ObjectLiteralExpression:
        return visitObjectLiteralExpression(<ObjectLiteralExpression>node);
      case Syntax.ElementAccessExpression:
        return visitElementAccessExpression(<ElementAccessExpression>node);
      case Syntax.CallExpression:
        return visitCallExpression(<CallExpression>node);
      case Syntax.NewExpression:
        return visitNewExpression(<NewExpression>node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitGenerator(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<FunctionExpression>node);
      default:
        return Debug.failBadSyntax(node);
    }
  }
  function visitFunctionDeclaration(node: FunctionDeclaration): Statement | undefined {
    // Currently, we only support generators that were originally async functions.
    if (node.asteriskToken) {
      node = setOriginalNode(
        setRange(
          new qc.FunctionDeclaration(
            undefined,
            node.modifiers,
            undefined,
            node.name,
            undefined,
            visitParameterList(node.parameters, visitor, context),
            undefined,
            transformGeneratorFunctionBody(node.body!)
          ),
          node
        ),
        node
      );
    } else {
      const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
      const savedInStatementContainingYield = inStatementContainingYield;
      inGeneratorFunctionBody = false;
      inStatementContainingYield = false;
      node = visitEachChild(node, visitor, context);
      inGeneratorFunctionBody = savedInGeneratorFunctionBody;
      inStatementContainingYield = savedInStatementContainingYield;
    }
    if (inGeneratorFunctionBody) {
      // Function declarations in a generator function body are hoisted
      // to the top of the lexical scope and elided from the current statement.
      hoistFunctionDeclaration(node);
      return;
    }
    return node;
  }
  function visitFunctionExpression(node: FunctionExpression): Expression {
    // Currently, we only support generators that were originally async functions.
    if (node.asteriskToken) {
      node = setOriginalNode(
        setRange(
          new qc.FunctionExpression(undefined, undefined, node.name, undefined, visitParameterList(node.parameters, visitor, context), undefined, transformGeneratorFunctionBody(node.body)),
          node
        ),
        node
      );
    } else {
      const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
      const savedInStatementContainingYield = inStatementContainingYield;
      inGeneratorFunctionBody = false;
      inStatementContainingYield = false;
      node = visitEachChild(node, visitor, context);
      inGeneratorFunctionBody = savedInGeneratorFunctionBody;
      inStatementContainingYield = savedInStatementContainingYield;
    }
    return node;
  }
  function visitAccessorDeclaration(node: AccessorDeclaration) {
    const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
    const savedInStatementContainingYield = inStatementContainingYield;
    inGeneratorFunctionBody = false;
    inStatementContainingYield = false;
    node = visitEachChild(node, visitor, context);
    inGeneratorFunctionBody = savedInGeneratorFunctionBody;
    inStatementContainingYield = savedInStatementContainingYield;
    return node;
  }
  function transformGeneratorFunctionBody(body: Block) {
    // Save existing generator state
    const statements: Statement[] = [];
    const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
    const savedInStatementContainingYield = inStatementContainingYield;
    const savedBlocks = blocks;
    const savedBlockOffsets = blockOffsets;
    const savedBlockActions = blockActions;
    const savedBlockStack = blockStack;
    const savedLabelOffsets = labelOffsets;
    const savedLabelExpressions = labelExpressions;
    const savedNextLabelId = nextLabelId;
    const savedOperations = operations;
    const savedOperationArguments = operationArguments;
    const savedOperationLocations = operationLocations;
    const savedState = state;
    // Initialize generator state
    inGeneratorFunctionBody = true;
    inStatementContainingYield = false;
    blocks = undefined;
    blockOffsets = undefined;
    blockActions = undefined;
    blockStack = undefined;
    labelOffsets = undefined;
    labelExpressions = undefined;
    nextLabelId = 1;
    operations = undefined;
    operationArguments = undefined;
    operationLocations = undefined;
    state = createTempVariable(undefined);
    // Build the generator
    resumeLexicalEnvironment();
    const statementOffset = addPrologue(statements, body.statements, false, visitor);
    transformAndEmitStatements(body.statements, statementOffset);
    const buildResult = build();
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    statements.push(new qc.ReturnStatement(buildResult));
    // Restore previous generator state
    inGeneratorFunctionBody = savedInGeneratorFunctionBody;
    inStatementContainingYield = savedInStatementContainingYield;
    blocks = savedBlocks;
    blockOffsets = savedBlockOffsets;
    blockActions = savedBlockActions;
    blockStack = savedBlockStack;
    labelOffsets = savedLabelOffsets;
    labelExpressions = savedLabelExpressions;
    nextLabelId = savedNextLabelId;
    operations = savedOperations;
    operationArguments = savedOperationArguments;
    operationLocations = savedOperationLocations;
    state = savedState;
    return setRange(new Block(statements, body.multiLine), body);
  }
  function visitVariableStatement(node: VariableStatement): Statement | undefined {
    if (node.transformFlags & TransformFlags.ContainsYield) {
      transformAndEmitVariableDeclarationList(node.declarationList);
      return;
    } else {
      // Do not hoist custom prologues.
      if (qc.get.emitFlags(node) & EmitFlags.CustomPrologue) return node;
      for (const variable of node.declarationList.declarations) {
        hoistVariableDeclaration(<Identifier>variable.name);
      }
      const variables = qf.get.initializedVariables(node.declarationList);
      if (variables.length === 0) {
        return;
      }
      return setSourceMapRange(new qc.ExpressionStatement(inlineExpressions(map(variables, transformInitializedVariable))), node);
    }
  }
  function visitBinaryExpression(node: BinaryExpression): Expression {
    const assoc = qf.get.expressionAssociativity(node);
    switch (assoc) {
      case Associativity.Left:
        return visitLeftAssociativeBinaryExpression(node);
      case Associativity.Right:
        return visitRightAssociativeBinaryExpression(node);
      default:
        return qc.assert.never(assoc);
    }
  }
  function visitRightAssociativeBinaryExpression(node: BinaryExpression) {
    const { left, right } = node;
    if (containsYield(right)) {
      let target: Expression;
      switch (left.kind) {
        case Syntax.PropertyAccessExpression:
          // [source]
          //      a.b = yield;
          //
          // [intermediate]
          //  .local _a
          //      _a = a;
          //  .yield resumeLabel
          //  .mark resumeLabel
          //      _a.b = %sent%;
          target = updatePropertyAccess(
            <PropertyAccessExpression>left,
            cacheExpression(visitNode((<PropertyAccessExpression>left).expression, visitor, isLeftHandSideExpression)),
            (<PropertyAccessExpression>left).name
          );
          break;
        case Syntax.ElementAccessExpression:
          // [source]
          //      a[b] = yield;
          //
          // [intermediate]
          //  .local _a, _b
          //      _a = a;
          //      _b = b;
          //  .yield resumeLabel
          //  .mark resumeLabel
          //      _a[_b] = %sent%;
          target = updateElementAccess(
            <ElementAccessExpression>left,
            cacheExpression(visitNode((<ElementAccessExpression>left).expression, visitor, isLeftHandSideExpression)),
            cacheExpression(visitNode((<ElementAccessExpression>left).argumentExpression, visitor, isExpression))
          );
          break;
        default:
          target = visitNode(left, visitor, isExpression);
          break;
      }
      const operator = node.operatorToken.kind;
      if (isCompoundAssignment(operator)) {
        return setRange(
          qf.create.assignment(target, setRange(new BinaryExpression(cacheExpression(target), getNonAssignmentOperatorForCompoundAssignment(operator), visitNode(right, visitor, isExpression)), node)),
          node
        );
      }
      return node.update(target, visitNode(right, visitor, isExpression));
    }
    return visitEachChild(node, visitor, context);
  }
  function visitLeftAssociativeBinaryExpression(node: BinaryExpression) {
    if (containsYield(node.right)) {
      if (syntax.is.logicalOperator(node.operatorToken.kind)) return visitLogicalBinaryExpression(node);
      else if (node.operatorToken.kind === Syntax.CommaToken) return visitCommaExpression(node);
      // [source]
      //      a() + (yield) + c()
      //
      // [intermediate]
      //  .local _a
      //      _a = a();
      //  .yield resumeLabel
      //      _a + %sent% + c()
      const clone = getMutableClone(node);
      clone.left = cacheExpression(visitNode(node.left, visitor, isExpression));
      clone.right = visitNode(node.right, visitor, isExpression);
      return clone;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitLogicalBinaryExpression(node: BinaryExpression) {
    // Logical binary expressions (`&&` and `||`) are shortcutting expressions and need
    // to be transformed as such:
    //
    // [source]
    //      x = a() && yield;
    //
    // [intermediate]
    //  .local _a
    //      _a = a();
    //  .brfalse resultLabel, (_a)
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      _a = %sent%;
    //  .mark resultLabel
    //      x = _a;
    //
    // [source]
    //      x = a() || yield;
    //
    // [intermediate]
    //  .local _a
    //      _a = a();
    //  .brtrue resultLabel, (_a)
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      _a = %sent%;
    //  .mark resultLabel
    //      x = _a;
    const resultLabel = defineLabel();
    const resultLocal = declareLocal();
    emitAssignment(resultLocal, visitNode(node.left, visitor, isExpression), node.left);
    if (node.operatorToken.kind === Syntax.Ampersand2Token) {
      // Logical `&&` shortcuts when the left-hand operand is falsey.
      emitBreakWhenFalse(resultLabel, resultLocal, node.left);
    } else {
      // Logical `||` shortcuts when the left-hand operand is truthy.
      emitBreakWhenTrue(resultLabel, resultLocal, node.left);
    }
    emitAssignment(resultLocal, visitNode(node.right, visitor, isExpression), node.right);
    markLabel(resultLabel);
    return resultLocal;
  }
  function visitCommaExpression(node: BinaryExpression) {
    // [source]
    //      x = a(), yield, b();
    //
    // [intermediate]
    //      a();
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      x = %sent%, b();
    let pendingExpressions: Expression[] = [];
    visit(node.left);
    visit(node.right);
    return inlineExpressions(pendingExpressions);
    function visit(node: Expression) {
      if (qc.is.kind(qc.BinaryExpression, node) && node.operatorToken.kind === Syntax.CommaToken) {
        visit(node.left);
        visit(node.right);
      } else {
        if (containsYield(node) && pendingExpressions.length > 0) {
          emitWorker(OpCode.Statement, [new qc.ExpressionStatement(inlineExpressions(pendingExpressions))]);
          pendingExpressions = [];
        }
        pendingExpressions.push(visitNode(node, visitor, isExpression));
      }
    }
  }
  function visitConditionalExpression(node: ConditionalExpression): Expression {
    // [source]
    //      x = a() ? yield : b();
    //
    // [intermediate]
    //  .local _a
    //  .brfalse whenFalseLabel, (a())
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      _a = %sent%;
    //  .br resultLabel
    //  .mark whenFalseLabel
    //      _a = b();
    //  .mark resultLabel
    //      x = _a;
    // We only need to perform a specific transformation if a `yield` expression exists
    // in either the `whenTrue` or `whenFalse` branches.
    // A `yield` in the condition will be handled by the normal visitor.
    if (containsYield(node.whenTrue) || containsYield(node.whenFalse)) {
      const whenFalseLabel = defineLabel();
      const resultLabel = defineLabel();
      const resultLocal = declareLocal();
      emitBreakWhenFalse(whenFalseLabel, visitNode(node.condition, visitor, isExpression), node.condition);
      emitAssignment(resultLocal, visitNode(node.whenTrue, visitor, isExpression), node.whenTrue);
      emitBreak(resultLabel);
      markLabel(whenFalseLabel);
      emitAssignment(resultLocal, visitNode(node.whenFalse, visitor, isExpression), node.whenFalse);
      markLabel(resultLabel);
      return resultLocal;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitYieldExpression(node: YieldExpression): LeftHandSideExpression {
    // [source]
    //      x = yield a();
    //
    // [intermediate]
    //  .yield resumeLabel, (a())
    //  .mark resumeLabel
    //      x = %sent%;
    const resumeLabel = defineLabel();
    const expression = visitNode(node.expression, visitor, isExpression);
    if (node.asteriskToken) {
      const iterator = (qc.get.emitFlags(node.expression!) & EmitFlags.Iterator) === 0 ? createValuesHelper(context, expression, node) : expression;
      emitYieldStar(iterator, node);
    } else {
      emitYield(expression, node);
    }
    markLabel(resumeLabel);
    return createGeneratorResume(node);
  }
  function visitArrayLiteralExpression(node: ArrayLiteralExpression) {
    return visitElements(node.elements, undefined, node.multiLine);
  }
  function visitElements(elements: Nodes<Expression>, leadingElement?: Expression, location?: TextRange, multiLine?: boolean) {
    // [source]
    //      ar = [1, yield, 2];
    //
    // [intermediate]
    //  .local _a
    //      _a = [1];
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      ar = _a.concat([%sent%, 2]);
    const numInitialElements = countInitialNodesWithoutYield(elements);
    let temp: Identifier | undefined;
    if (numInitialElements > 0) {
      temp = declareLocal();
      const initialElements = Nodes.visit(elements, visitor, isExpression, 0, numInitialElements);
      emitAssignment(temp, new ArrayLiteralExpression(leadingElement ? [leadingElement, ...initialElements] : initialElements));
      leadingElement = undefined;
    }
    const expressions = reduceLeft(elements, reduceElement, <Expression[]>[], numInitialElements);
    return temp
      ? createArrayConcat(temp, [new ArrayLiteralExpression(expressions, multiLine)])
      : setRange(new ArrayLiteralExpression(leadingElement ? [leadingElement, ...expressions] : expressions, multiLine), location);
    function reduceElement(expressions: Expression[], element: Expression) {
      if (containsYield(element) && expressions.length > 0) {
        const hasAssignedTemp = temp !== undefined;
        if (!temp) {
          temp = declareLocal();
        }
        emitAssignment(
          temp,
          hasAssignedTemp
            ? createArrayConcat(temp, [new ArrayLiteralExpression(expressions, multiLine)])
            : new ArrayLiteralExpression(leadingElement ? [leadingElement, ...expressions] : expressions, multiLine)
        );
        leadingElement = undefined;
        expressions = [];
      }
      expressions.push(visitNode(element, visitor, isExpression));
      return expressions;
    }
  }
  function visitObjectLiteralExpression(node: ObjectLiteralExpression) {
    // [source]
    //      o = {
    //          a: 1,
    //          b: yield,
    //          c: 2
    //      };
    //
    // [intermediate]
    //  .local _a
    //      _a = {
    //          a: 1
    //      };
    //  .yield resumeLabel
    //  .mark resumeLabel
    //      o = (_a.b = %sent%,
    //          _a.c = 2,
    //          _a);
    const properties = node.properties;
    const multiLine = node.multiLine;
    const numInitialProperties = countInitialNodesWithoutYield(properties);
    const temp = declareLocal();
    emitAssignment(temp, new qc.ObjectLiteralExpression(Nodes.visit(properties, visitor, isObjectLiteralElementLike, 0, numInitialProperties), multiLine));
    const expressions = reduceLeft(properties, reduceProperty, <Expression[]>[], numInitialProperties);
    expressions.push(multiLine ? startOnNewLine(getMutableClone(temp)) : temp);
    return inlineExpressions(expressions);
    function reduceProperty(expressions: Expression[], property: ObjectLiteralElementLike) {
      if (containsYield(property) && expressions.length > 0) {
        emitStatement(new qc.ExpressionStatement(inlineExpressions(expressions)));
        expressions = [];
      }
      const expression = createExpressionForObjectLiteralElementLike(node, property, temp);
      const visited = visitNode(expression, visitor, isExpression);
      if (visited) {
        if (multiLine) {
          startOnNewLine(visited);
        }
        expressions.push(visited);
      }
      return expressions;
    }
  }
  function visitElementAccessExpression(node: ElementAccessExpression) {
    if (containsYield(node.argumentExpression)) {
      // [source]
      //      a = x[yield];
      //
      // [intermediate]
      //  .local _a
      //      _a = x;
      //  .yield resumeLabel
      //  .mark resumeLabel
      //      a = _a[%sent%]
      const clone = getMutableClone(node);
      clone.expression = cacheExpression(visitNode(node.expression, visitor, isLeftHandSideExpression));
      clone.argumentExpression = visitNode(node.argumentExpression, visitor, isExpression);
      return clone;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitCallExpression(node: CallExpression) {
    if (!qc.is.importCall(node) && forEach(node.arguments, containsYield)) {
      // [source]
      //      a.b(1, yield, 2);
      //
      // [intermediate]
      //  .local _a, _b, _c
      //      _b = (_a = a).b;
      //      _c = [1];
      //  .yield resumeLabel
      //  .mark resumeLabel
      //      _b.apply(_a, _c.concat([%sent%, 2]));
      const { target, thisArg } = qf.create.callBinding(node.expression, hoistVariableDeclaration, languageVersion, true);
      return createFunctionApply(cacheExpression(visitNode(target, visitor, isLeftHandSideExpression)), thisArg, visitElements(node.arguments), node).setOriginal(node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitNewExpression(node: NewExpression) {
    if (forEach(node.arguments, containsYield)) {
      // [source]
      //      new a.b(1, yield, 2);
      //
      // [intermediate]
      //  .local _a, _b, _c
      //      _b = (_a = a.b).bind;
      //      _c = [1];
      //  .yield resumeLabel
      //  .mark resumeLabel
      //      new (_b.apply(_a, _c.concat([%sent%, 2])));
      const { target, thisArg } = qf.create.callBinding(new qc.PropertyAccessExpression(node.expression, 'bind'), hoistVariableDeclaration);
      return setOriginalNode(
        setRange(
          new qc.NewExpression(createFunctionApply(cacheExpression(visitNode(target, visitor, isExpression)), thisArg, visitElements(node.arguments!, qc.VoidExpression.zero())), undefined, []),
          node
        ),
        node
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function transformAndEmitStatements(statements: readonly Statement[], start = 0) {
    const numStatements = statements.length;
    for (let i = start; i < numStatements; i++) {
      transformAndEmitStatement(statements[i]);
    }
  }
  function transformAndEmitEmbeddedStatement(node: Statement) {
    if (qc.is.kind(qc.Block, node)) {
      transformAndEmitStatements(node.statements);
    } else {
      transformAndEmitStatement(node);
    }
  }
  function transformAndEmitStatement(node: Statement): void {
    const savedInStatementContainingYield = inStatementContainingYield;
    if (!inStatementContainingYield) {
      inStatementContainingYield = containsYield(node);
    }
    transformAndEmitStatementWorker(node);
    inStatementContainingYield = savedInStatementContainingYield;
  }
  function transformAndEmitStatementWorker(node: Statement): void {
    switch (node.kind) {
      case Syntax.Block:
        return transformAndEmitBlock(<Block>node);
      case Syntax.ExpressionStatement:
        return transformAndEmitExpressionStatement(<ExpressionStatement>node);
      case Syntax.IfStatement:
        return transformAndEmitIfStatement(<IfStatement>node);
      case Syntax.DoStatement:
        return transformAndEmitDoStatement(<DoStatement>node);
      case Syntax.WhileStatement:
        return transformAndEmitWhileStatement(<WhileStatement>node);
      case Syntax.ForStatement:
        return transformAndEmitForStatement(<ForStatement>node);
      case Syntax.ForInStatement:
        return transformAndEmitForInStatement(<ForInStatement>node);
      case Syntax.ContinueStatement:
        return transformAndEmitContinueStatement(<ContinueStatement>node);
      case Syntax.BreakStatement:
        return transformAndEmitBreakStatement(<BreakStatement>node);
      case Syntax.ReturnStatement:
        return transformAndEmitReturnStatement(<ReturnStatement>node);
      case Syntax.WithStatement:
        return transformAndEmitWithStatement(<WithStatement>node);
      case Syntax.SwitchStatement:
        return transformAndEmitSwitchStatement(<SwitchStatement>node);
      case Syntax.LabeledStatement:
        return transformAndEmitLabeledStatement(<LabeledStatement>node);
      case Syntax.ThrowStatement:
        return transformAndEmitThrowStatement(<ThrowStatement>node);
      case Syntax.TryStatement:
        return transformAndEmitTryStatement(<TryStatement>node);
      default:
        return emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function transformAndEmitBlock(node: Block): void {
    if (containsYield(node)) {
      transformAndEmitStatements(node.statements);
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function transformAndEmitExpressionStatement(node: ExpressionStatement) {
    emitStatement(visitNode(node, visitor, isStatement));
  }
  function transformAndEmitVariableDeclarationList(node: VariableDeclarationList): VariableDeclarationList | undefined {
    for (const variable of node.declarations) {
      const name = getSynthesizedClone(<Identifier>variable.name);
      setCommentRange(name, variable.name);
      hoistVariableDeclaration(name);
    }
    const variables = qf.get.initializedVariables(node);
    const numVariables = variables.length;
    let variablesWritten = 0;
    let pendingExpressions: Expression[] = [];
    while (variablesWritten < numVariables) {
      for (let i = variablesWritten; i < numVariables; i++) {
        const variable = variables[i];
        if (containsYield(variable.initer) && pendingExpressions.length > 0) {
          break;
        }
        pendingExpressions.push(transformInitializedVariable(variable));
      }
      if (pendingExpressions.length) {
        emitStatement(new qc.ExpressionStatement(inlineExpressions(pendingExpressions)));
        variablesWritten += pendingExpressions.length;
        pendingExpressions = [];
      }
    }
    return;
  }
  function transformInitializedVariable(node: VariableDeclaration) {
    return setSourceMapRange(qf.create.assignment(setSourceMapRange(<Identifier>getSynthesizedClone(node.name), node.name), visitNode(node.initer, visitor, isExpression)), node);
  }
  function transformAndEmitIfStatement(node: IfStatement) {
    if (containsYield(node)) {
      // [source]
      //      if (x)
      //
      //      else
      //
      //
      // [intermediate]
      //  .brfalse elseLabel, (x)
      //
      //  .br endLabel
      //  .mark elseLabel
      //
      //  .mark endLabel
      if (containsYield(node.thenStatement) || containsYield(node.elseStatement)) {
        const endLabel = defineLabel();
        const elseLabel = node.elseStatement ? defineLabel() : undefined;
        emitBreakWhenFalse(node.elseStatement ? elseLabel! : endLabel, visitNode(node.expression, visitor, isExpression), node.expression);
        transformAndEmitEmbeddedStatement(node.thenStatement);
        if (node.elseStatement) {
          emitBreak(endLabel);
          markLabel(elseLabel!);
          transformAndEmitEmbeddedStatement(node.elseStatement);
        }
        markLabel(endLabel);
      } else {
        emitStatement(visitNode(node, visitor, isStatement));
      }
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function transformAndEmitDoStatement(node: DoStatement) {
    if (containsYield(node)) {
      // [source]
      //      do {
      //
      //      }
      //      while (i < 10);
      //
      // [intermediate]
      //  .loop conditionLabel, endLabel
      //  .mark loopLabel
      //
      //  .mark conditionLabel
      //  .brtrue loopLabel, (i < 10)
      //  .endloop
      //  .mark endLabel
      const conditionLabel = defineLabel();
      const loopLabel = defineLabel();
      beginLoopBlock(conditionLabel);
      markLabel(loopLabel);
      transformAndEmitEmbeddedStatement(node.statement);
      markLabel(conditionLabel);
      emitBreakWhenTrue(loopLabel, visitNode(node.expression, visitor, isExpression));
      endLoopBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitDoStatement(node: DoStatement) {
    if (inStatementContainingYield) {
      beginScriptLoopBlock();
      node = visitEachChild(node, visitor, context);
      endLoopBlock();
      return node;
    }
    return visitEachChild(node, visitor, context);
  }
  function transformAndEmitWhileStatement(node: WhileStatement) {
    if (containsYield(node)) {
      // [source]
      //      while (i < 10) {
      //
      //      }
      //
      // [intermediate]
      //  .loop loopLabel, endLabel
      //  .mark loopLabel
      //  .brfalse endLabel, (i < 10)
      //
      //  .br loopLabel
      //  .endloop
      //  .mark endLabel
      const loopLabel = defineLabel();
      const endLabel = beginLoopBlock(loopLabel);
      markLabel(loopLabel);
      emitBreakWhenFalse(endLabel, visitNode(node.expression, visitor, isExpression));
      transformAndEmitEmbeddedStatement(node.statement);
      emitBreak(loopLabel);
      endLoopBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitWhileStatement(node: WhileStatement) {
    if (inStatementContainingYield) {
      beginScriptLoopBlock();
      node = visitEachChild(node, visitor, context);
      endLoopBlock();
      return node;
    }
    return visitEachChild(node, visitor, context);
  }
  function transformAndEmitForStatement(node: ForStatement) {
    if (containsYield(node)) {
      // [source]
      //      for (var i = 0; i < 10; i++) {
      //
      //      }
      //
      // [intermediate]
      //  .local i
      //      i = 0;
      //  .loop incrementLabel, endLoopLabel
      //  .mark conditionLabel
      //  .brfalse endLoopLabel, (i < 10)
      //
      //  .mark incrementLabel
      //      i++;
      //  .br conditionLabel
      //  .endloop
      //  .mark endLoopLabel
      const conditionLabel = defineLabel();
      const incrementLabel = defineLabel();
      const endLabel = beginLoopBlock(incrementLabel);
      if (node.initer) {
        const initer = node.initer;
        if (qc.is.kind(qc.VariableDeclarationList, initer)) {
          transformAndEmitVariableDeclarationList(initer);
        } else {
          emitStatement(setRange(new qc.ExpressionStatement(visitNode(initer, visitor, isExpression)), initer));
        }
      }
      markLabel(conditionLabel);
      if (node.condition) {
        emitBreakWhenFalse(endLabel, visitNode(node.condition, visitor, isExpression));
      }
      transformAndEmitEmbeddedStatement(node.statement);
      markLabel(incrementLabel);
      if (node.incrementor) {
        emitStatement(setRange(new qc.ExpressionStatement(visitNode(node.incrementor, visitor, isExpression)), node.incrementor));
      }
      emitBreak(conditionLabel);
      endLoopBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitForStatement(node: ForStatement) {
    if (inStatementContainingYield) {
      beginScriptLoopBlock();
    }
    const initer = node.initer;
    if (initer && qc.is.kind(qc.VariableDeclarationList, initer)) {
      for (const variable of initer.declarations) {
        hoistVariableDeclaration(<Identifier>variable.name);
      }
      const variables = qf.get.initializedVariables(initer);
      node = updateFor(
        node,
        variables.length > 0 ? inlineExpressions(map(variables, transformInitializedVariable)) : undefined,
        visitNode(node.condition, visitor, isExpression),
        visitNode(node.incrementor, visitor, isExpression),
        visitNode(node.statement, visitor, isStatement, liftToBlock)
      );
    } else {
      node = visitEachChild(node, visitor, context);
    }
    if (inStatementContainingYield) {
      endLoopBlock();
    }
    return node;
  }
  function transformAndEmitForInStatement(node: ForInStatement) {
    // TODO(rbuckton): Source map locations
    if (containsYield(node)) {
      // [source]
      //      for (var p in o) {
      //
      //      }
      //
      // [intermediate]
      //  .local _a, _b, _i
      //      _a = [];
      //      for (_b in o) _a.push(_b);
      //      _i = 0;
      //  .loop incrementLabel, endLoopLabel
      //  .mark conditionLabel
      //  .brfalse endLoopLabel, (_i < _a.length)
      //      p = _a[_i];
      //
      //  .mark incrementLabel
      //      _b++;
      //  .br conditionLabel
      //  .endloop
      //  .mark endLoopLabel
      const keysArray = declareLocal(); // _a
      const key = declareLocal(); // _b
      const keysIndex = createLoopVariable(); // _i
      const initer = node.initer;
      hoistVariableDeclaration(keysIndex);
      emitAssignment(keysArray, new ArrayLiteralExpression());
      emitStatement(
        new qc.ForInStatement(
          key,
          visitNode(node.expression, visitor, isExpression),
          new qc.ExpressionStatement(new qc.CallExpression(new qc.PropertyAccessExpression(keysArray, 'push'), undefined, [key]))
        )
      );
      emitAssignment(keysIndex, qc.asLiteral(0));
      const conditionLabel = defineLabel();
      const incrementLabel = defineLabel();
      const endLabel = beginLoopBlock(incrementLabel);
      markLabel(conditionLabel);
      emitBreakWhenFalse(endLabel, qf.create.lessThan(keysIndex, new qc.PropertyAccessExpression(keysArray, 'length')));
      let variable: Expression;
      if (qc.is.kind(qc.VariableDeclarationList, initer)) {
        for (const variable of initer.declarations) {
          hoistVariableDeclaration(<Identifier>variable.name);
        }
        variable = <Identifier>getSynthesizedClone(initer.declarations[0].name);
      } else {
        variable = visitNode(initer, visitor, isExpression);
        assert(qc.is.leftHandSideExpression(variable));
      }
      emitAssignment(variable, new qc.ElementAccessExpression(keysArray, keysIndex));
      transformAndEmitEmbeddedStatement(node.statement);
      markLabel(incrementLabel);
      emitStatement(new qc.ExpressionStatement(qf.create.increment(keysIndex)));
      emitBreak(conditionLabel);
      endLoopBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitForInStatement(node: ForInStatement) {
    // [source]
    //      for (var x in a) {
    //
    //      }
    //
    // [intermediate]
    //  .local x
    //  .loop
    //      for (x in a) {
    //
    //      }
    //  .endloop
    if (inStatementContainingYield) {
      beginScriptLoopBlock();
    }
    const initer = node.initer;
    if (qc.is.kind(qc.VariableDeclarationList, initer)) {
      for (const variable of initer.declarations) {
        hoistVariableDeclaration(<Identifier>variable.name);
      }
      node = node.update(<Identifier>initer.declarations[0].name, visitNode(node.expression, visitor, isExpression), visitNode(node.statement, visitor, isStatement, liftToBlock));
    } else {
      node = visitEachChild(node, visitor, context);
    }
    if (inStatementContainingYield) {
      endLoopBlock();
    }
    return node;
  }
  function transformAndEmitContinueStatement(node: ContinueStatement): void {
    const label = findContinueTarget(node.label ? idText(node.label) : undefined);
    if (label > 0) {
      emitBreak(label, node);
    } else {
      // invalid continue without a containing loop. Leave the node as is, per #17875.
      emitStatement(node);
    }
  }
  function visitContinueStatement(node: ContinueStatement): Statement {
    if (inStatementContainingYield) {
      const label = findContinueTarget(node.label && idText(node.label));
      if (label > 0) return createInlineBreak(label, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function transformAndEmitBreakStatement(node: BreakStatement): void {
    const label = findBreakTarget(node.label ? idText(node.label) : undefined);
    if (label > 0) {
      emitBreak(label, node);
    } else {
      // invalid break without a containing loop, switch, or labeled statement. Leave the node as is, per #17875.
      emitStatement(node);
    }
  }
  function visitBreakStatement(node: BreakStatement): Statement {
    if (inStatementContainingYield) {
      const label = findBreakTarget(node.label && idText(node.label));
      if (label > 0) return createInlineBreak(label, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function transformAndEmitReturnStatement(node: ReturnStatement): void {
    emitReturn(visitNode(node.expression, visitor, isExpression), node);
  }
  function visitReturnStatement(node: ReturnStatement) {
    return createInlineReturn(visitNode(node.expression, visitor, isExpression), node);
  }
  function transformAndEmitWithStatement(node: WithStatement) {
    if (containsYield(node)) {
      // [source]
      //      with (x) {
      //
      //      }
      //
      // [intermediate]
      //  .with (x)
      //
      //  .endwith
      beginWithBlock(cacheExpression(visitNode(node.expression, visitor, isExpression)));
      transformAndEmitEmbeddedStatement(node.statement);
      endWithBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function transformAndEmitSwitchStatement(node: SwitchStatement) {
    if (containsYield(node.caseBlock)) {
      // [source]
      //      switch (x) {
      //          case a:
      //
      //          case b:
      //
      //          default:
      //
      //      }
      //
      // [intermediate]
      //  .local _a
      //  .switch endLabel
      //      _a = x;
      //      switch (_a) {
      //          case a:
      //  .br clauseLabels[0]
      //      }
      //      switch (_a) {
      //          case b:
      //  .br clauseLabels[1]
      //      }
      //  .br clauseLabels[2]
      //  .mark clauseLabels[0]
      //
      //  .mark clauseLabels[1]
      //
      //  .mark clauseLabels[2]
      //
      //  .endswitch
      //  .mark endLabel
      const caseBlock = node.caseBlock;
      const numClauses = caseBlock.clauses.length;
      const endLabel = beginSwitchBlock();
      const expression = cacheExpression(visitNode(node.expression, visitor, isExpression));
      // Create labels for each clause and find the index of the first default clause.
      const clauseLabels: Label[] = [];
      let defaultClauseIndex = -1;
      for (let i = 0; i < numClauses; i++) {
        const clause = caseBlock.clauses[i];
        clauseLabels.push(defineLabel());
        if (clause.kind === Syntax.DefaultClause && defaultClauseIndex === -1) {
          defaultClauseIndex = i;
        }
      }
      // Emit switch statements for each run of case clauses either from the first case
      // clause or the next case clause with a `yield` in its expression, up to the next
      // case clause with a `yield` in its expression.
      let clausesWritten = 0;
      let pendingClauses: CaseClause[] = [];
      while (clausesWritten < numClauses) {
        let defaultClausesSkipped = 0;
        for (let i = clausesWritten; i < numClauses; i++) {
          const clause = caseBlock.clauses[i];
          if (clause.kind === Syntax.CaseClause) {
            if (containsYield(clause.expression) && pendingClauses.length > 0) {
              break;
            }
            pendingClauses.push(new qc.CaseClause(visitNode(clause.expression, visitor, isExpression), [createInlineBreak(clauseLabels[i], clause.expression)]));
          } else {
            defaultClausesSkipped++;
          }
        }
        if (pendingClauses.length) {
          emitStatement(new qc.SwitchStatement(expression, new qc.CaseBlock(pendingClauses)));
          clausesWritten += pendingClauses.length;
          pendingClauses = [];
        }
        if (defaultClausesSkipped > 0) {
          clausesWritten += defaultClausesSkipped;
          defaultClausesSkipped = 0;
        }
      }
      if (defaultClauseIndex >= 0) {
        emitBreak(clauseLabels[defaultClauseIndex]);
      } else {
        emitBreak(endLabel);
      }
      for (let i = 0; i < numClauses; i++) {
        markLabel(clauseLabels[i]);
        transformAndEmitStatements(caseBlock.clauses[i].statements);
      }
      endSwitchBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitSwitchStatement(node: SwitchStatement) {
    if (inStatementContainingYield) {
      beginScriptSwitchBlock();
    }
    node = visitEachChild(node, visitor, context);
    if (inStatementContainingYield) {
      endSwitchBlock();
    }
    return node;
  }
  function transformAndEmitLabeledStatement(node: LabeledStatement) {
    if (containsYield(node)) {
      // [source]
      //      x: {
      //
      //      }
      //
      // [intermediate]
      //  .labeled "x", endLabel
      //
      //  .endlabeled
      //  .mark endLabel
      beginLabeledBlock(idText(node.label));
      transformAndEmitEmbeddedStatement(node.statement);
      endLabeledBlock();
    } else {
      emitStatement(visitNode(node, visitor, isStatement));
    }
  }
  function visitLabeledStatement(node: LabeledStatement) {
    if (inStatementContainingYield) {
      beginScriptLabeledBlock(idText(node.label));
    }
    node = visitEachChild(node, visitor, context);
    if (inStatementContainingYield) {
      endLabeledBlock();
    }
    return node;
  }
  function transformAndEmitThrowStatement(node: ThrowStatement): void {
    emitThrow(visitNode(node.expression, visitor, isExpression), node);
  }
  function transformAndEmitTryStatement(node: TryStatement) {
    if (containsYield(node)) {
      // [source]
      //      try {
      //
      //      }
      //      catch (e) {
      //
      //      }
      //      finally {
      //
      //      }
      //
      // [intermediate]
      //  .local _a
      //  .try tryLabel, catchLabel, finallyLabel, endLabel
      //  .mark tryLabel
      //  .nop
      //
      //  .br endLabel
      //  .catch
      //  .mark catchLabel
      //      _a = %error%;
      //
      //  .br endLabel
      //  .finally
      //  .mark finallyLabel
      //
      //  .endfinally
      //  .endtry
      //  .mark endLabel
      beginExceptionBlock();
      transformAndEmitEmbeddedStatement(node.tryBlock);
      if (node.catchClause) {
        beginCatchBlock(node.catchClause.variableDeclaration!); // TODO: GH#18217
        transformAndEmitEmbeddedStatement(node.catchClause.block);
      }
      if (node.finallyBlock) {
        beginFinallyBlock();
        transformAndEmitEmbeddedStatement(node.finallyBlock);
      }
      endExceptionBlock();
    } else {
      emitStatement(visitEachChild(node, visitor, context));
    }
  }
  function containsYield(node: Node | undefined): boolean {
    return !!node && (node.transformFlags & TransformFlags.ContainsYield) !== 0;
  }
  function countInitialNodesWithoutYield(nodes: Nodes<Node>) {
    const numNodes = nodes.length;
    for (let i = 0; i < numNodes; i++) {
      if (containsYield(nodes[i])) return i;
    }
    return -1;
  }
  function onSubstituteNode(hint: EmitHint, node: Node): Node {
    node = previousOnSubstituteNode(hint, node);
    if (hint === EmitHint.Expression) return substituteExpression(<Expression>node);
    return node;
  }
  function substituteExpression(node: Expression): Expression {
    if (qc.is.kind(qc.Identifier, node)) return substituteExpressionIdentifier(node);
    return node;
  }
  function substituteExpressionIdentifier(node: Identifier) {
    if (!qc.is.generatedIdentifier(node) && renamedCatchVariables && renamedCatchVariables.has(idText(node))) {
      const original = qc.get.originalOf(node);
      if (qc.is.kind(qc.Identifier, original) && original.parent) {
        const declaration = resolver.getReferencedValueDeclaration(original);
        if (declaration) {
          const name = renamedCatchVariableDeclarations[getOriginalNodeId(declaration)];
          if (name) {
            const clone = getMutableClone(name);
            setSourceMapRange(clone, node);
            setCommentRange(clone, node);
            return clone;
          }
        }
      }
    }
    return node;
  }
  function cacheExpression(node: Expression): Identifier {
    if (qc.is.generatedIdentifier(node) || qc.get.emitFlags(node) & EmitFlags.HelperName) return <Identifier>node;
    const temp = createTempVariable(hoistVariableDeclaration);
    emitAssignment(temp, node, node);
    return temp;
  }
  function declareLocal(name?: string): Identifier {
    const temp = name ? createUniqueName(name) : createTempVariable(undefined);
    hoistVariableDeclaration(temp);
    return temp;
  }
  function defineLabel(): Label {
    if (!labelOffsets) {
      labelOffsets = [];
    }
    const label = nextLabelId;
    nextLabelId++;
    labelOffsets[label] = -1;
    return label;
  }
  function markLabel(label: Label): void {
    assert(labelOffsets !== undefined, 'No labels were defined.');
    labelOffsets[label] = operations ? operations.length : 0;
  }
  function beginBlock(block: CodeBlock): number {
    if (!blocks) {
      blocks = [];
      blockActions = [];
      blockOffsets = [];
      blockStack = [];
    }
    const index = blockActions!.length;
    blockActions![index] = BlockAction.Open;
    blockOffsets![index] = operations ? operations.length : 0;
    blocks[index] = block;
    blockStack!.push(block);
    return index;
  }
  function endBlock(): CodeBlock {
    const block = peekBlock();
    if (block === undefined) return fail('beginBlock was never called.');
    const index = blockActions!.length;
    blockActions![index] = BlockAction.Close;
    blockOffsets![index] = operations ? operations.length : 0;
    blocks![index] = block;
    blockStack!.pop();
    return block;
  }
  function peekBlock() {
    return lastOrUndefined(blockStack!);
  }
  function peekBlockKind(): CodeBlockKind | undefined {
    const block = peekBlock();
    return block && block.kind;
  }
  function beginWithBlock(expression: Identifier): void {
    const startLabel = defineLabel();
    const endLabel = defineLabel();
    markLabel(startLabel);
    beginBlock({
      kind: CodeBlockKind.With,
      expression,
      startLabel,
      endLabel,
    });
  }
  function endWithBlock(): void {
    assert(peekBlockKind() === CodeBlockKind.With);
    const block = <WithBlock>endBlock();
    markLabel(block.endLabel);
  }
  function beginExceptionBlock(): Label {
    const startLabel = defineLabel();
    const endLabel = defineLabel();
    markLabel(startLabel);
    beginBlock({
      kind: CodeBlockKind.Exception,
      state: ExceptionBlockState.Try,
      startLabel,
      endLabel,
    });
    emitNop();
    return endLabel;
  }
  function beginCatchBlock(variable: VariableDeclaration): void {
    assert(peekBlockKind() === CodeBlockKind.Exception);
    // generated identifiers should already be unique within a file
    let name: Identifier;
    if (qc.is.generatedIdentifier(variable.name)) {
      name = variable.name;
      hoistVariableDeclaration(variable.name);
    } else {
      const text = idText(<Identifier>variable.name);
      name = declareLocal(text);
      if (!renamedCatchVariables) {
        renamedCatchVariables = createMap<boolean>();
        renamedCatchVariableDeclarations = [];
        context.enableSubstitution(Syntax.Identifier);
      }
      renamedCatchVariables.set(text, true);
      renamedCatchVariableDeclarations[getOriginalNodeId(variable)] = name;
    }
    const exception = <ExceptionBlock>peekBlock();
    assert(exception.state < ExceptionBlockState.Catch);
    const endLabel = exception.endLabel;
    emitBreak(endLabel);
    const catchLabel = defineLabel();
    markLabel(catchLabel);
    exception.state = ExceptionBlockState.Catch;
    exception.catchVariable = name;
    exception.catchLabel = catchLabel;
    emitAssignment(name, new qc.CallExpression(new qc.PropertyAccessExpression(state, 'sent'), undefined, []));
    emitNop();
  }
  function beginFinallyBlock(): void {
    assert(peekBlockKind() === CodeBlockKind.Exception);
    const exception = <ExceptionBlock>peekBlock();
    assert(exception.state < ExceptionBlockState.Finally);
    const endLabel = exception.endLabel;
    emitBreak(endLabel);
    const finallyLabel = defineLabel();
    markLabel(finallyLabel);
    exception.state = ExceptionBlockState.Finally;
    exception.finallyLabel = finallyLabel;
  }
  function endExceptionBlock(): void {
    assert(peekBlockKind() === CodeBlockKind.Exception);
    const exception = <ExceptionBlock>endBlock();
    const state = exception.state;
    if (state < ExceptionBlockState.Finally) {
      emitBreak(exception.endLabel);
    } else {
      emitEndfinally();
    }
    markLabel(exception.endLabel);
    emitNop();
    exception.state = ExceptionBlockState.Done;
  }
  function beginScriptLoopBlock(): void {
    beginBlock({
      kind: CodeBlockKind.Loop,
      isScript: true,
      breakLabel: -1,
      continueLabel: -1,
    });
  }
  function beginLoopBlock(continueLabel: Label): Label {
    const breakLabel = defineLabel();
    beginBlock({
      kind: CodeBlockKind.Loop,
      isScript: false,
      breakLabel,
      continueLabel,
    });
    return breakLabel;
  }
  function endLoopBlock(): void {
    assert(peekBlockKind() === CodeBlockKind.Loop);
    const block = <SwitchBlock>endBlock();
    const breakLabel = block.breakLabel;
    if (!block.isScript) {
      markLabel(breakLabel);
    }
  }
  function beginScriptSwitchBlock(): void {
    beginBlock({
      kind: CodeBlockKind.Switch,
      isScript: true,
      breakLabel: -1,
    });
  }
  function beginSwitchBlock(): Label {
    const breakLabel = defineLabel();
    beginBlock({
      kind: CodeBlockKind.Switch,
      isScript: false,
      breakLabel,
    });
    return breakLabel;
  }
  function endSwitchBlock(): void {
    assert(peekBlockKind() === CodeBlockKind.Switch);
    const block = <SwitchBlock>endBlock();
    const breakLabel = block.breakLabel;
    if (!block.isScript) {
      markLabel(breakLabel);
    }
  }
  function beginScriptLabeledBlock(labelText: string) {
    beginBlock({
      kind: CodeBlockKind.Labeled,
      isScript: true,
      labelText,
      breakLabel: -1,
    });
  }
  function beginLabeledBlock(labelText: string) {
    const breakLabel = defineLabel();
    beginBlock({
      kind: CodeBlockKind.Labeled,
      isScript: false,
      labelText,
      breakLabel,
    });
  }
  function endLabeledBlock() {
    assert(peekBlockKind() === CodeBlockKind.Labeled);
    const block = <LabeledBlock>endBlock();
    if (!block.isScript) {
      markLabel(block.breakLabel);
    }
  }
  function supportsUnlabeledBreak(block: CodeBlock): block is SwitchBlock | LoopBlock {
    return block.kind === CodeBlockKind.Switch || block.kind === CodeBlockKind.Loop;
  }
  function supportsLabeledBreakOrContinue(block: CodeBlock): block is LabeledBlock {
    return block.kind === CodeBlockKind.Labeled;
  }
  function supportsUnlabeledContinue(block: CodeBlock): block is LoopBlock {
    return block.kind === CodeBlockKind.Loop;
  }
  function hasImmediateContainingLabeledBlock(labelText: string, start: number) {
    for (let j = start; j >= 0; j--) {
      const containingBlock = blockStack![j];
      if (supportsLabeledBreakOrContinue(containingBlock)) {
        if (containingBlock.labelText === labelText) return true;
      } else {
        break;
      }
    }
    return false;
  }
  function findBreakTarget(labelText?: string): Label {
    if (blockStack) {
      if (labelText) {
        for (let i = blockStack.length - 1; i >= 0; i--) {
          const block = blockStack[i];
          if (supportsLabeledBreakOrContinue(block) && block.labelText === labelText) return block.breakLabel;
          else if (supportsUnlabeledBreak(block) && hasImmediateContainingLabeledBlock(labelText, i - 1)) return block.breakLabel;
        }
      } else {
        for (let i = blockStack.length - 1; i >= 0; i--) {
          const block = blockStack[i];
          if (supportsUnlabeledBreak(block)) return block.breakLabel;
        }
      }
    }
    return 0;
  }
  function findContinueTarget(labelText?: string): Label {
    if (blockStack) {
      if (labelText) {
        for (let i = blockStack.length - 1; i >= 0; i--) {
          const block = blockStack[i];
          if (supportsUnlabeledContinue(block) && hasImmediateContainingLabeledBlock(labelText, i - 1)) return block.continueLabel;
        }
      } else {
        for (let i = blockStack.length - 1; i >= 0; i--) {
          const block = blockStack[i];
          if (supportsUnlabeledContinue(block)) return block.continueLabel;
        }
      }
    }
    return 0;
  }
  function createLabel(label: Label | undefined): Expression {
    if (label !== undefined && label > 0) {
      if (labelExpressions === undefined) {
        labelExpressions = [];
      }
      const expression = qc.asLiteral(-1);
      if (labelExpressions[label] === undefined) {
        labelExpressions[label] = [expression];
      } else {
        labelExpressions[label].push(expression);
      }
      return expression;
    }
    return new qc.OmittedExpression();
  }
  function createInstruction(instruction: Instruction): NumericLiteral {
    const literal = qc.asLiteral(instruction);
    addSyntheticTrailingComment(literal, Syntax.MultiLineCommentTrivia, getInstructionName(instruction));
    return literal;
  }
  function createInlineBreak(label: Label, location?: TextRange): ReturnStatement {
    Debug.assertLessThan(0, label, 'Invalid label');
    return setRange(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.Break), createLabel(label)])), location);
  }
  function createInlineReturn(expression?: Expression, location?: TextRange): ReturnStatement {
    return setRange(new qc.ReturnStatement(new ArrayLiteralExpression(expression ? [createInstruction(Instruction.Return), expression] : [createInstruction(Instruction.Return)])), location);
  }
  function createGeneratorResume(location?: TextRange): LeftHandSideExpression {
    return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(state, 'sent'), undefined, []), location);
  }
  function emitNop() {
    emitWorker(OpCode.Nop);
  }
  function emitStatement(node: Statement): void {
    if (node) {
      emitWorker(OpCode.Statement, [node]);
    } else {
      emitNop();
    }
  }
  function emitAssignment(left: Expression, right: Expression, location?: TextRange): void {
    emitWorker(OpCode.Assign, [left, right], location);
  }
  function emitBreak(label: Label, location?: TextRange): void {
    emitWorker(OpCode.Break, [label], location);
  }
  function emitBreakWhenTrue(label: Label, condition: Expression, location?: TextRange): void {
    emitWorker(OpCode.BreakWhenTrue, [label, condition], location);
  }
  function emitBreakWhenFalse(label: Label, condition: Expression, location?: TextRange): void {
    emitWorker(OpCode.BreakWhenFalse, [label, condition], location);
  }
  function emitYieldStar(expression?: Expression, location?: TextRange): void {
    emitWorker(OpCode.YieldStar, [expression], location);
  }
  function emitYield(expression?: Expression, location?: TextRange): void {
    emitWorker(OpCode.Yield, [expression], location);
  }
  function emitReturn(expression?: Expression, location?: TextRange): void {
    emitWorker(OpCode.Return, [expression], location);
  }
  function emitThrow(expression: Expression, location?: TextRange): void {
    emitWorker(OpCode.Throw, [expression], location);
  }
  function emitEndfinally(): void {
    emitWorker(OpCode.Endfinally);
  }
  function emitWorker(code: OpCode, args?: OperationArguments, location?: TextRange): void {
    if (operations === undefined) {
      operations = [];
      operationArguments = [];
      operationLocations = [];
    }
    if (labelOffsets === undefined) {
      // mark entry point
      markLabel(defineLabel());
    }
    const operationIndex = operations.length;
    operations[operationIndex] = code;
    operationArguments![operationIndex] = args;
    operationLocations![operationIndex] = location;
  }
  function build() {
    blockIndex = 0;
    labelNumber = 0;
    labelNumbers = undefined;
    lastOperationWasAbrupt = false;
    lastOperationWasCompletion = false;
    clauses = undefined;
    statements = undefined;
    exceptionBlockStack = undefined;
    currentExceptionBlock = undefined;
    withBlockStack = undefined;
    const buildResult = buildStatements();
    return createGeneratorHelper(
      context,
      setEmitFlags(
        new qc.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParameterDeclaration(undefined, undefined, state)], undefined, new Block(buildResult, buildResult.length > 0)),
        EmitFlags.ReuseTempVariableScope
      )
    );
  }
  function buildStatements(): Statement[] {
    if (operations) {
      for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
        writeOperation(operationIndex);
      }
      flushFinalLabel(operations.length);
    } else {
      flushFinalLabel(0);
    }
    if (clauses) {
      const labelExpression = new qc.PropertyAccessExpression(state, 'label');
      const switchStatement = new qc.SwitchStatement(labelExpression, new qc.CaseBlock(clauses));
      return [startOnNewLine(switchStatement)];
    }
    if (statements) return statements;
    return [];
  }
  function flushLabel(): void {
    if (!statements) {
      return;
    }
    appendLabel(!lastOperationWasAbrupt);
    lastOperationWasAbrupt = false;
    lastOperationWasCompletion = false;
    labelNumber++;
  }
  function flushFinalLabel(operationIndex: number): void {
    if (isFinalLabelReachable(operationIndex)) {
      tryEnterLabel(operationIndex);
      withBlockStack = undefined;
      writeReturn(undefined);
    }
    if (statements && clauses) {
      appendLabel(false);
    }
    updateLabelExpressions();
  }
  function isFinalLabelReachable(operationIndex: number) {
    // if the last operation was *not* a completion (return/throw) then
    // the final label is reachable.
    if (!lastOperationWasCompletion) return true;
    // if there are no labels defined or referenced, then the final label is
    // not reachable.
    if (!labelOffsets || !labelExpressions) return false;
    // if the label for this offset is referenced, then the final label
    // is reachable.
    for (let label = 0; label < labelOffsets.length; label++) {
      if (labelOffsets[label] === operationIndex && labelExpressions[label]) return true;
    }
    return false;
  }
  function appendLabel(markLabelEnd: boolean): void {
    if (!clauses) {
      clauses = [];
    }
    if (statements) {
      if (withBlockStack) {
        // The previous label was nested inside one or more `with` blocks, so we
        // surround the statements in generated `with` blocks to create the same environment.
        for (let i = withBlockStack.length - 1; i >= 0; i--) {
          const withBlock = withBlockStack[i];
          statements = [new qc.WithStatement(withBlock.expression, new Block(statements))];
        }
      }
      if (currentExceptionBlock) {
        // The previous label was nested inside of an exception block, so we must
        // indicate entry into a protected region by pushing the label numbers
        // for each block in the protected region.
        const { startLabel, catchLabel, finallyLabel, endLabel } = currentExceptionBlock;
        statements.unshift(
          new qc.ExpressionStatement(
            new qc.CallExpression(new qc.PropertyAccessExpression(new qc.PropertyAccessExpression(state, 'trys'), 'push'), undefined, [
              new ArrayLiteralExpression([createLabel(startLabel), createLabel(catchLabel), createLabel(finallyLabel), createLabel(endLabel)]),
            ])
          )
        );
        currentExceptionBlock = undefined;
      }
      if (markLabelEnd) {
        // The case clause for the last label falls through to this label, so we
        // add an assignment statement to reflect the change in labels.
        statements.push(new qc.ExpressionStatement(qf.create.assignment(new qc.PropertyAccessExpression(state, 'label'), qc.asLiteral(labelNumber + 1))));
      }
    }
    clauses.push(new qc.CaseClause(qc.asLiteral(labelNumber), statements || []));
    statements = undefined;
  }
  function tryEnterLabel(operationIndex: number): void {
    if (!labelOffsets) {
      return;
    }
    for (let label = 0; label < labelOffsets.length; label++) {
      if (labelOffsets[label] === operationIndex) {
        flushLabel();
        if (labelNumbers === undefined) {
          labelNumbers = [];
        }
        if (labelNumbers[labelNumber] === undefined) {
          labelNumbers[labelNumber] = [label];
        } else {
          labelNumbers[labelNumber].push(label);
        }
      }
    }
  }
  function updateLabelExpressions() {
    if (labelExpressions !== undefined && labelNumbers !== undefined) {
      for (let labelNumber = 0; labelNumber < labelNumbers.length; labelNumber++) {
        const labels = labelNumbers[labelNumber];
        if (labels !== undefined) {
          for (const label of labels) {
            const expressions = labelExpressions[label];
            if (expressions !== undefined) {
              for (const expression of expressions) {
                expression.text = String(labelNumber);
              }
            }
          }
        }
      }
    }
  }
  function tryEnterOrLeaveBlock(operationIndex: number): void {
    if (blocks) {
      for (; blockIndex < blockActions!.length && blockOffsets![blockIndex] <= operationIndex; blockIndex++) {
        const block: CodeBlock = blocks[blockIndex];
        const blockAction = blockActions![blockIndex];
        switch (block.kind) {
          case CodeBlockKind.Exception:
            if (blockAction === BlockAction.Open) {
              if (!exceptionBlockStack) {
                exceptionBlockStack = [];
              }
              if (!statements) {
                statements = [];
              }
              exceptionBlockStack.push(currentExceptionBlock!);
              currentExceptionBlock = block;
            } else if (blockAction === BlockAction.Close) {
              currentExceptionBlock = exceptionBlockStack!.pop();
            }
            break;
          case CodeBlockKind.With:
            if (blockAction === BlockAction.Open) {
              if (!withBlockStack) {
                withBlockStack = [];
              }
              withBlockStack.push(block);
            } else if (blockAction === BlockAction.Close) {
              withBlockStack!.pop();
            }
            break;
          // default: do nothing
        }
      }
    }
  }
  function writeOperation(operationIndex: number): void {
    tryEnterLabel(operationIndex);
    tryEnterOrLeaveBlock(operationIndex);
    // early termination, nothing else to process in this label
    if (lastOperationWasAbrupt) {
      return;
    }
    lastOperationWasAbrupt = false;
    lastOperationWasCompletion = false;
    const opcode = operations![operationIndex];
    if (opcode === OpCode.Nop) {
      return;
    } else if (opcode === OpCode.Endfinally) {
      return writeEndfinally();
    }
    const args = operationArguments![operationIndex]!;
    if (opcode === OpCode.Statement) return writeStatement(<Statement>args[0]);
    const location = operationLocations![operationIndex];
    switch (opcode) {
      case OpCode.Assign:
        return writeAssign(<Expression>args[0], <Expression>args[1], location);
      case OpCode.Break:
        return writeBreak(<Label>args[0], location);
      case OpCode.BreakWhenTrue:
        return writeBreakWhenTrue(<Label>args[0], <Expression>args[1], location);
      case OpCode.BreakWhenFalse:
        return writeBreakWhenFalse(<Label>args[0], <Expression>args[1], location);
      case OpCode.Yield:
        return writeYield(<Expression>args[0], location);
      case OpCode.YieldStar:
        return writeYieldStar(<Expression>args[0], location);
      case OpCode.Return:
        return writeReturn(<Expression>args[0], location);
      case OpCode.Throw:
        return writeThrow(<Expression>args[0], location);
    }
  }
  function writeStatement(statement: Statement): void {
    if (statement) {
      if (!statements) {
        statements = [statement];
      } else {
        statements.push(statement);
      }
    }
  }
  function writeAssign(left: Expression, right: Expression, operationLocation: TextRange | undefined): void {
    writeStatement(setRange(new qc.ExpressionStatement(qf.create.assignment(left, right)), operationLocation));
  }
  function writeThrow(expression: Expression, operationLocation: TextRange | undefined): void {
    lastOperationWasAbrupt = true;
    lastOperationWasCompletion = true;
    writeStatement(setRange(new qc.ThrowStatement(expression), operationLocation));
  }
  function writeReturn(expression: Expression | undefined, operationLocation: TextRange | undefined): void {
    lastOperationWasAbrupt = true;
    lastOperationWasCompletion = true;
    writeStatement(
      setEmitFlags(
        setRange(new qc.ReturnStatement(new ArrayLiteralExpression(expression ? [createInstruction(Instruction.Return), expression] : [createInstruction(Instruction.Return)])), operationLocation),
        EmitFlags.NoTokenSourceMaps
      )
    );
  }
  function writeBreak(label: Label, operationLocation: TextRange | undefined): void {
    lastOperationWasAbrupt = true;
    writeStatement(
      setEmitFlags(setRange(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.Break), createLabel(label)])), operationLocation), EmitFlags.NoTokenSourceMaps)
    );
  }
  function writeBreakWhenTrue(label: Label, condition: Expression, operationLocation: TextRange | undefined): void {
    writeStatement(
      setEmitFlags(
        new qc.IfStatement(
          condition,
          setEmitFlags(setRange(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.Break), createLabel(label)])), operationLocation), EmitFlags.NoTokenSourceMaps)
        ),
        EmitFlags.SingleLine
      )
    );
  }
  function writeBreakWhenFalse(label: Label, condition: Expression, operationLocation: TextRange | undefined): void {
    writeStatement(
      setEmitFlags(
        new qc.IfStatement(
          qf.create.logicalNot(condition),
          setEmitFlags(setRange(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.Break), createLabel(label)])), operationLocation), EmitFlags.NoTokenSourceMaps)
        ),
        EmitFlags.SingleLine
      )
    );
  }
  function writeYield(expression: Expression, operationLocation: TextRange | undefined): void {
    lastOperationWasAbrupt = true;
    writeStatement(
      setEmitFlags(
        setRange(new qc.ReturnStatement(new ArrayLiteralExpression(expression ? [createInstruction(Instruction.Yield), expression] : [createInstruction(Instruction.Yield)])), operationLocation),
        EmitFlags.NoTokenSourceMaps
      )
    );
  }
  function writeYieldStar(expression: Expression, operationLocation: TextRange | undefined): void {
    lastOperationWasAbrupt = true;
    writeStatement(setEmitFlags(setRange(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.YieldStar), expression])), operationLocation), EmitFlags.NoTokenSourceMaps));
  }
  function writeEndfinally(): void {
    lastOperationWasAbrupt = true;
    writeStatement(new qc.ReturnStatement(new ArrayLiteralExpression([createInstruction(Instruction.Endfinally)])));
  }
}
function createGeneratorHelper(context: TransformationContext, body: FunctionExpression) {
  context.requestEmitHelper(generatorHelper);
  return new qc.CallExpression(getUnscopedHelperName('__generator'), undefined, [new qc.ThisExpression(), body]);
}
// The __generator helper is used by down-level transformations to emulate the runtime
// semantics of an ES2015 generator function. When called, this helper returns an
// object that implements the Iterator protocol, in that it has `next`, `return`, and
// `throw` methods that step through the generator when invoked.
//
// parameters:
//  @param thisArg  The value to use as the `this` binding for the transformed generator body.
//  @param body     A function that acts as the transformed generator body.
//
// variables:
//  _       Persistent state for the generator that is shared between the helper and the
//          generator body. The state object has the following members:
//            sent() - A method that returns or throws the current completion value.
//            label  - The next point at which to resume evaluation of the generator body.
//            trys   - A stack of protected regions (try/catch/finally blocks).
//            ops    - A stack of pending instructions when inside of a finally block.
//  f       A value indicating whether the generator is executing.
//  y       An iterator to delegate for a yield*.
//  t       A temporary variable that holds one of the following values (note that these
//          cases do not overlap):
//          - The completion value when resuming from a `yield` or `yield*`.
//          - The error value for a catch block.
//          - The current protected region (array of try/catch/finally/end labels).
//          - The verb (`next`, `throw`, or `return` method) to delegate to the expression
//            of a `yield*`.
//          - The result of evaluating the verb delegated to the expression of a `yield*`.
//
// functions:
//  verb(n)     Creates a bound callback to the `step` function for opcode `n`.
//  step(op)    Evaluates opcodes in a generator body until execution is suspended or
//              completed.
//
// The __generator helper understands a limited set of instructions:
//  0: next(value?)     - Start or resume the generator with the specified value.
//  1: throw(error)     - Resume the generator with an exception. If the generator is
//                        suspended inside of one or more protected regions, evaluates
//                        any intervening finally blocks between the current label and
//                        the nearest catch block or function boundary. If uncaught, the
//                        exception is thrown to the caller.
//  2: return(value?)   - Resume the generator as if with a return. If the generator is
//                        suspended inside of one or more protected regions, evaluates any
//                        intervening finally blocks.
//  3: break(label)     - Jump to the specified label. If the label is outside of the
//                        current protected region, evaluates any intervening finally
//                        blocks.
//  4: yield(value?)    - Yield execution to the caller with an optional value. When
//                        resumed, the generator will continue at the next label.
//  5: yield*(value)    - Delegates evaluation to the supplied iterator. When
//                        delegation completes, the generator will continue at the next
//                        label.
//  6: catch(error)     - Handles an exception thrown from within the generator body. If
//                        the current label is inside of one or more protected regions,
//                        evaluates any intervening finally blocks between the current
//                        label and the nearest catch block or function boundary. If
//                        uncaught, the exception is thrown to the caller.
//  7: endfinally       - Ends a finally block, resuming the last instruction prior to
//                        entering a finally block.
//
// For examples of how these are used, see the comments in ./transformers/generators.ts
export const generatorHelper: UnscopedEmitHelper = {
  name: 'typescript:generator',
  importName: '__generator',
  scoped: false,
  priority: 6,
  text: `
            var __generator = (this && this.__generator) || function (thisArg, body) {
                var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
                return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
                function verb(n) { return function (v) { return step([n, v]); }; }
                function step(op) {
                    if (f) throw new TypeError("Generator is already executing.");
                    while (_) try {
                        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                        if (y = 0, t) op = [op[0] & 2, t.value];
                        switch (op[0]) {
                            case 0: case 1: t = op; break;
                            case 4: _.label++; return { value: op[1], done: false };
                            case 5: _.label++; y = op[1]; op = [0]; continue;
                            case 7: op = _.ops.pop(); _.trys.pop(); continue;
                            default:
                                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                                if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                                if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                                if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                                if (t[2]) _.ops.pop();
                                _.trys.pop(); continue;
                        }
                        op = body.call(thisArg, _);
                    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
                    if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
                }
            };`,
};
