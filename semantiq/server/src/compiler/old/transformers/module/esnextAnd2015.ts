namespace core {
  export function transformECMAScriptModule(context: TransformationContext) {
    const compilerOptions = context.getCompilerOptions();
    const previousOnEmitNode = context.onEmitNode;
    const previousOnSubstituteNode = context.onSubstituteNode;
    context.onEmitNode = onEmitNode;
    context.onSubstituteNode = onSubstituteNode;
    context.enableEmitNotification(Syntax.SourceFile);
    context.enableSubstitution(Syntax.Identifier);

    let helperNameSubstitutions: Map<Identifier> | undefined;
    return chainBundle(transformSourceFile);

    function transformSourceFile(node: SourceFile) {
      if (node.isDeclarationFile) {
        return node;
      }

      if (qp_isExternalModule(node) || compilerOptions.isolatedModules) {
        const result = updateExternalModule(node);
        if (!qp_isExternalModule(node) || some(result.statements, qp_isExternalModuleIndicator)) {
          return result;
        }
        return qp_updateSourceNode(result, setRange(new Nodes([...result.statements, createEmptyExports()]), result.statements));
      }

      return node;
    }

    function updateExternalModule(node: SourceFile) {
      const externalHelpersImportDeclaration = createExternalHelpersImportDeclarationIfNeeded(node, compilerOptions);
      if (externalHelpersImportDeclaration) {
        const statements: Statement[] = [];
        const statementOffset = addPrologue(statements, node.statements);
        append(statements, externalHelpersImportDeclaration);

        addRange(statements, Nodes.visit(node.statements, visitor, isStatement, statementOffset));
        return qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
      } else {
        return visitEachChild(node, visitor, context);
      }
    }

    function visitor(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.ImportEqualsDeclaration:
          
          return;
        case Syntax.ExportAssignment:
          return visitExportAssignment(<ExportAssignment>node);
        case Syntax.ExportDeclaration:
          const exportDecl = node as ExportDeclaration;
          return visitExportDeclaration(exportDecl);
      }

      return node;
    }

    function visitExportAssignment(node: ExportAssignment): VisitResult<ExportAssignment> {
      
      return node.isExportEquals ? undefined : node;
    }

    function visitExportDeclaration(node: ExportDeclaration) {
      
      if (compilerOptions.module !== undefined && compilerOptions.module > ModuleKind.ES2015) {
        return node;
      }

      
      if (!node.exportClause || !Node.is.kind(NamespaceExport, node.exportClause) || !node.moduleSpecifier) {
        return node;
      }

      const oldIdentifier = node.exportClause.name;
      const synthName = getGeneratedNameForNode(oldIdentifier);
      const importDecl = createImportDeclaration(undefined,  undefined, createNamespaceImport(synthName)), node.moduleSpecifier);
      setOriginalNode(importDecl, node.exportClause);

      const exportDecl = createExportDeclaration(undefined,  undefined, createNamedExports([createExportSpecifier(synthName, oldIdentifier)]));
      setOriginalNode(exportDecl, node);

      return [importDecl, exportDecl];
    }

    
    
    

    function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
      if (Node.is.kind(SourceFile, node)) {
        if ((qp_isExternalModule(node) || compilerOptions.isolatedModules) && compilerOptions.importHelpers) {
          helperNameSubstitutions = createMap<Identifier>();
        }
        previousOnEmitNode(hint, node, emitCallback);
        helperNameSubstitutions = undefined;
      } else {
        previousOnEmitNode(hint, node, emitCallback);
      }
    }

    
    
    

    function onSubstituteNode(hint: EmitHint, node: Node) {
      node = previousOnSubstituteNode(hint, node);
      if (helperNameSubstitutions && Node.is.kind(Identifier, node) && Node.get.emitFlags(node) & EmitFlags.HelperName) {
        return substituteHelperName(node);
      }

      return node;
    }

    function substituteHelperName(node: Identifier): Expression {
      const name = idText(node);
      let substitution = helperNameSubstitutions!.get(name);
      if (!substitution) {
        helperNameSubstitutions!.set(name, (substitution = createFileLevelUniqueName(name)));
      }
      return substitution;
    }
  }
}
