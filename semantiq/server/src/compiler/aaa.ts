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
      statements.push(createExpressionStatement(visitBinaryExpression(assignment, false)));
    } else {
      assignment.end = initializer.end;
      statements.push(setRange(createExpressionStatement(visitNode(assignment, visitor, isExpression)), moveRangeEnd(initializer, -1)));
    }
  }
  if (convertedLoopBodyStatements) {
    return createSyntheticBlockForConvertedStatements(addRange(statements, convertedLoopBodyStatements));
  } else {
    const statement = visitNode(node.statement, visitor, isStatement, liftToBlock);
    if (Node.is.kind(Block, statement)) return statement.update(setRange(new Nodes(concatenate(statements, statement.statements)), statement.statements));
    statements.push(statement);
    return createSyntheticBlockForConvertedStatements(statements);
  }
}
