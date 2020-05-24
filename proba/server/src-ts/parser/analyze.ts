import { TSESTree, TSESLint, TSESLintScope, AST_NODE_TYPES } from './xutils';
import { getKeys as fallback } from 'eslint-visitor-keys';

import { visitorKeys as childVisitorKeys } from './visitor-keys';

type ParserOptions = TSESLint.ParserOptions;

export class EnumScope extends TSESLintScope.Scope {
  constructor(
    scopeManager: ScopeManager,
    upperScope: TSESLintScope.Scope,
    block: TSESTree.TSEnumDeclaration | null
  ) {
    super(scopeManager, 'enum', upperScope, block, false);
  }
}

export class EmptyFunctionScope extends TSESLintScope.Scope {
  constructor(
    scopeManager: ScopeManager,
    upperScope: TSESLintScope.Scope,
    block: TSESTree.TSDeclareFunction | null
  ) {
    super(scopeManager, 'empty-function', upperScope, block, false);
  }
}

export class ScopeManager extends TSESLintScope.ScopeManager {
  scopes!: TSESLintScope.Scope[];
  globalScope!: TSESLintScope.Scope;

  constructor(options: TSESLintScope.ScopeManagerOptions) {
    super(options);
  }

  /** @internal */
  __nestEnumScope(node: TSESTree.TSEnumDeclaration): TSESLintScope.Scope {
    return this.__nestScope(new EnumScope(this, this.__currentScope, node));
  }

  /** @internal */
  __nestEmptyFunctionScope(node: TSESTree.TSDeclareFunction): TSESLintScope.Scope {
    return this.__nestScope(new EmptyFunctionScope(this, this.__currentScope, node));
  }
}

function overrideDefine(
  define: (node: TSESTree.Node, def: TSESLintScope.Definition) => void
) {
  return function (
    this: TSESLintScope.Scope,
    node: TSESTree.Node,
    definition: TSESLintScope.Definition
  ): void {
    define.call(this, node, definition);

    // Set `variable.eslintUsed` to tell ESLint that the variable is exported.
    const variable =
      'name' in node && typeof node.name === 'string' && this.set.get(node.name);
    if (variable) {
      variable.eslintUsed = true;
    }
  };
}

class PatternVisitor extends TSESLintScope.PatternVisitor {
  constructor(
    options: TSESLintScope.PatternVisitorOptions,
    rootPattern: TSESTree.BaseNode,
    callback: TSESLintScope.PatternVisitorCallback
  ) {
    super(options, rootPattern, callback);
  }

  Identifier(node: TSESTree.Identifier): void {
    super.Identifier(node);
    if (node.decorators) {
      this.rightHandNodes.push(...node.decorators);
    }
    if (node.typeAnnotation) {
      this.rightHandNodes.push(node.typeAnnotation);
    }
  }

  ArrayPattern(node: TSESTree.ArrayPattern): void {
    node.elements.forEach(this.visit, this);
    if (node.decorators) {
      this.rightHandNodes.push(...node.decorators);
    }
    if (node.typeAnnotation) {
      this.rightHandNodes.push(node.typeAnnotation);
    }
  }

  ObjectPattern(node: TSESTree.ObjectPattern): void {
    node.properties.forEach(this.visit, this);
    if (node.decorators) {
      this.rightHandNodes.push(...node.decorators);
    }
    if (node.typeAnnotation) {
      this.rightHandNodes.push(node.typeAnnotation);
    }
  }

  RestElement(node: TSESTree.RestElement): void {
    super.RestElement(node);
    if (node.decorators) {
      this.rightHandNodes.push(...node.decorators);
    }
    if (node.typeAnnotation) {
      this.rightHandNodes.push(node.typeAnnotation);
    }
  }

  TSParameterProperty(node: TSESTree.TSParameterProperty): void {
    this.visit(node.parameter);
    if (node.decorators) {
      this.rightHandNodes.push(...node.decorators);
    }
  }
}

class Referencer extends TSESLintScope.Referencer<ScopeManager> {
  protected typeMode: boolean;

  constructor(options: TSESLintScope.ScopeManagerOptions, scopeManager: ScopeManager) {
    super(options, scopeManager);
    this.typeMode = false;
  }

  visitPattern<T extends TSESTree.BaseNode>(
    node: T,
    options: TSESLintScope.PatternVisitorOptions,
    callback: TSESLintScope.PatternVisitorCallback
  ): void {
    if (!node) {
      return;
    }

    if (typeof options === 'function') {
      callback = options;
      options = { processRightHandNodes: false };
    }

    const visitor = new PatternVisitor(this.options, node, callback);
    visitor.visit(node);

    if (options.processRightHandNodes) {
      visitor.rightHandNodes.forEach(this.visit, this);
    }
  }

  visitFunction(
    node:
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression
  ): void {
    const { type, id, typeParameters, params, returnType, body } = node;
    const scopeManager = this.scopeManager;
    const upperScope = this.currentScope();

    // Process the name.
    if (type === AST_NODE_TYPES.FunctionDeclaration && id) {
      upperScope.__define(
        id,
        new TSESLintScope.Definition('FunctionName', id, node, null, null, null)
      );

      // Remove overload definition to avoid confusion of no-redeclare rule.
      const { defs, identifiers } = upperScope.set.get(id.name)!;
      for (let i = 0; i < defs.length; ++i) {
        const def = defs[i];
        if (
          def.type === 'FunctionName' &&
          def.node.type === AST_NODE_TYPES.TSDeclareFunction
        ) {
          defs.splice(i, 1);
          identifiers.splice(i, 1);
          break;
        }
      }
    } else if (type === AST_NODE_TYPES.FunctionExpression && id) {
      scopeManager.__nestFunctionExpressionNameScope(node);
    }

    // Open the function scope.
    scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);
    const innerScope = this.currentScope();

    // Process the type parameters
    this.visit(typeParameters);

    // Process parameter declarations.
    for (let i = 0; i < params.length; ++i) {
      this.visitPattern(params[i], { processRightHandNodes: true }, (pattern, info) => {
        if (pattern.type !== AST_NODE_TYPES.Identifier || pattern.name !== 'this') {
          innerScope.__define(
            pattern,
            new TSESLintScope.ParameterDefinition(pattern, node, i, info.rest)
          );
          this.referencingDefaultValue(pattern, info.assignments, null, true);
        }
      });
    }

    // Process the return type.
    this.visit(returnType);

    // Process the body.
    if (body && body.type === AST_NODE_TYPES.BlockStatement) {
      this.visitChildren(body);
    } else {
      this.visit(body);
    }

    // Close the function scope.
    this.close(node);
  }

  visitClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): void {
    this.visitDecorators(node.decorators);

    const upperTypeMode = this.typeMode;
    this.typeMode = true;
    if (node.superTypeParameters) {
      this.visit(node.superTypeParameters);
    }
    if (node.implements) {
      node.implements.forEach(this.visit, this);
    }
    this.typeMode = upperTypeMode;

    super.visitClass(node);
  }

  visitTypeParameters(node: {
    typeParameters?:
      | TSESTree.TSTypeParameterDeclaration
      | TSESTree.TSTypeParameterInstantiation;
  }): void {
    if (node.typeParameters) {
      const upperTypeMode = this.typeMode;
      this.typeMode = true;
      this.visit(node.typeParameters);
      this.typeMode = upperTypeMode;
    }
  }

  JSXOpeningElement(node: TSESTree.JSXOpeningElement): void {
    this.visit(node.name);
    this.visitTypeParameters(node);
    node.attributes.forEach(this.visit, this);
  }

  Identifier(node: TSESTree.Identifier): void {
    this.visitDecorators(node.decorators);

    if (!this.typeMode) {
      super.Identifier(node);
    }

    this.visit(node.typeAnnotation);
  }

  MethodDefinition(
    node: TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition
  ): void {
    this.visitDecorators(node.decorators);
    super.MethodDefinition(node);
  }

  ClassProperty(node: TSESTree.ClassProperty | TSESTree.TSAbstractClassProperty): void {
    const upperTypeMode = this.typeMode;
    const { computed, decorators, key, typeAnnotation, value } = node;

    this.typeMode = false;
    this.visitDecorators(decorators);
    if (computed) {
      this.visit(key);
    }
    this.typeMode = true;
    this.visit(typeAnnotation);
    this.typeMode = false;
    this.visit(value);

    this.typeMode = upperTypeMode;
  }

  NewExpression(node: TSESTree.NewExpression): void {
    this.visitTypeParameters(node);
    this.visit(node.callee);

    node.arguments.forEach(this.visit, this);
  }

  CallExpression(node: TSESTree.CallExpression): void {
    this.visitTypeParameters(node);

    this.visit(node.callee);

    node.arguments.forEach(this.visit, this);
  }

  OptionalMemberExpression(node: TSESTree.OptionalMemberExpression): void {
    this.visit(node.object);
    if (node.computed) {
      this.visit(node.property);
    }
  }

  OptionalCallExpression(node: TSESTree.OptionalCallExpression): void {
    this.visitTypeParameters(node);

    this.visit(node.callee);

    node.arguments.forEach(this.visit, this);
  }

  TSDeclareFunction(node: TSESTree.TSDeclareFunction): void {
    const scopeManager = this.scopeManager;
    const upperScope = this.currentScope();
    const { id, typeParameters, params, returnType } = node;

    // Ignore this if other overload have already existed.
    if (id) {
      const variable = upperScope.set.get(id.name);
      const defs = variable?.defs;
      const existed = defs?.some((d): boolean => d.type === 'FunctionName');
      if (!existed) {
        upperScope.__define(
          id,
          new TSESLintScope.Definition('FunctionName', id, node, null, null, null)
        );
      }
    }

    // Open the function scope.
    scopeManager.__nestEmptyFunctionScope(node);
    const innerScope = this.currentScope();

    // Process the type parameters
    this.visit(typeParameters);

    // Process parameter declarations.
    for (let i = 0; i < params.length; ++i) {
      this.visitPattern(params[i], { processRightHandNodes: true }, (pattern, info) => {
        innerScope.__define(
          pattern,
          new TSESLintScope.ParameterDefinition(pattern, node, i, info.rest)
        );

        // Set `variable.eslintUsed` to tell ESLint that the variable is used.
        const variable = innerScope.set.get(pattern.name);
        if (variable) {
          variable.eslintUsed = true;
        }
        this.referencingDefaultValue(pattern, info.assignments, null, true);
      });
    }

    // Process the return type.
    this.visit(returnType);

    // Close the function scope.
    this.close(node);
  }

  TSEmptyBodyFunctionExpression(node: TSESTree.TSEmptyBodyFunctionExpression): void {
    const upperTypeMode = this.typeMode;
    const { typeParameters, params, returnType } = node;

    this.typeMode = true;
    this.visit(typeParameters);
    params.forEach(this.visit, this);
    this.visit(returnType);
    this.typeMode = upperTypeMode;
  }

  TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration): void {
    this.visitTypeNodes(node);
  }

  TSClassImplements(node: TSESTree.TSClassImplements): void {
    this.visitTypeNodes(node);
  }

  TSIndexSignature(node: TSESTree.TSIndexSignature): void {
    this.visitTypeNodes(node);
  }

  TSTypeAssertion(node: TSESTree.TSTypeAssertion): void {
    if (this.typeMode) {
      this.visit(node.typeAnnotation);
    } else {
      this.typeMode = true;
      this.visit(node.typeAnnotation);
      this.typeMode = false;
    }

    this.visit(node.expression);
  }

  TSAsExpression(node: TSESTree.TSAsExpression): void {
    this.visit(node.expression);

    if (this.typeMode) {
      this.visit(node.typeAnnotation);
    } else {
      this.typeMode = true;
      this.visit(node.typeAnnotation);
      this.typeMode = false;
    }
  }

  TSTypeAnnotation(node: TSESTree.TSTypeAnnotation): void {
    this.visitTypeNodes(node);
  }

  TSTypeParameterDeclaration(node: TSESTree.TSTypeParameterDeclaration): void {
    this.visitTypeNodes(node);
  }

  TSTypeQuery(node: TSESTree.TSTypeQuery): void {
    if (this.typeMode) {
      this.typeMode = false;
      this.visitChildren(node);
      this.typeMode = true;
    } else {
      this.visitChildren(node);
    }
  }

  TSTypeParameter(node: TSESTree.TSTypeParameter): void {
    this.visitTypeNodes(node);
  }

  TSInferType(node: TSESTree.TSInferType): void {
    this.visitTypeNodes(node);
  }

  TSTypeReference(node: TSESTree.TSTypeReference): void {
    this.visitTypeNodes(node);
  }

  TSTypeLiteral(node: TSESTree.TSTypeLiteral): void {
    this.visitTypeNodes(node);
  }

  TSLiteralType(node: TSESTree.TSLiteralType): void {
    this.visitTypeNodes(node);
  }

  TSIntersectionType(node: TSESTree.TSIntersectionType): void {
    this.visitTypeNodes(node);
  }

  TSConditionalType(node: TSESTree.TSConditionalType): void {
    this.visitTypeNodes(node);
  }

  TSIndexedAccessType(node: TSESTree.TSIndexedAccessType): void {
    this.visitTypeNodes(node);
  }

  TSMappedType(node: TSESTree.TSMappedType): void {
    this.visitTypeNodes(node);
  }

  TSOptionalType(node: TSESTree.TSOptionalType): void {
    this.visitTypeNodes(node);
  }

  TSParenthesizedType(node: TSESTree.TSParenthesizedType): void {
    this.visitTypeNodes(node);
  }

  TSRestType(node: TSESTree.TSRestType): void {
    this.visitTypeNodes(node);
  }

  TSTupleType(node: TSESTree.TSTupleType): void {
    this.visitTypeNodes(node);
  }

  TSQualifiedName(node: TSESTree.TSQualifiedName): void {
    this.visit(node.left);
  }

  TSPropertySignature(node: TSESTree.TSPropertySignature): void {
    const upperTypeMode = this.typeMode;
    const { computed, key, typeAnnotation, initializer } = node;

    if (computed) {
      this.typeMode = false;
      this.visit(key);
      this.typeMode = true;
    } else {
      this.typeMode = true;
      this.visit(key);
    }
    this.visit(typeAnnotation);
    this.visit(initializer);

    this.typeMode = upperTypeMode;
  }

  TSMethodSignature(node: TSESTree.TSMethodSignature): void {
    const upperTypeMode = this.typeMode;
    const { computed, key, typeParameters, params, returnType } = node;

    if (computed) {
      this.typeMode = false;
      this.visit(key);
      this.typeMode = true;
    } else {
      this.typeMode = true;
      this.visit(key);
    }
    this.visit(typeParameters);
    params.forEach(this.visit, this);
    this.visit(returnType);

    this.typeMode = upperTypeMode;
  }

  TSEnumDeclaration(node: TSESTree.TSEnumDeclaration): void {
    const { id, members } = node;
    const scopeManager = this.scopeManager;
    const scope = this.currentScope();

    if (id) {
      scope.__define(id, new TSESLintScope.Definition('EnumName', id, node));
    }

    scopeManager.__nestEnumScope(node);
    for (const member of members) {
      this.visit(member);
    }
    this.close(node);
  }

  TSEnumMember(node: TSESTree.TSEnumMember): void {
    const { id, initializer } = node;
    const scope = this.currentScope();

    scope.__define(id, new TSESLintScope.Definition('EnumMemberName', id, node));
    if (initializer) {
      scope.__referencing(
        id,
        TSESLintScope.Reference.WRITE,
        initializer,
        null,
        false,
        true
      );
      this.visit(initializer);
    }
  }

  TSModuleDeclaration(node: TSESTree.TSModuleDeclaration): void {
    const scope = this.currentScope();
    const { id, body } = node;

    if (node.global) {
      this.visitGlobalAugmentation(node);
      return;
    }

    if (id && id.type === AST_NODE_TYPES.Identifier) {
      scope.__define(
        id,
        new TSESLintScope.Definition('NamespaceName', id, node, null, null, null)
      );
    }
    this.visit(body);
  }

  TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration): void {
    this.typeMode = true;
    this.visitChildren(node);
    this.typeMode = false;
  }

  TSModuleBlock(node: TSESTree.TSModuleBlock): void {
    this.scopeManager.__nestBlockScope(node);
    this.visitChildren(node);
    this.close(node);
  }

  TSAbstractClassProperty(node: TSESTree.TSAbstractClassProperty): void {
    this.ClassProperty(node);
  }

  TSAbstractMethodDefinition(node: TSESTree.TSAbstractMethodDefinition): void {
    this.MethodDefinition(node);
  }

  TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration): void {
    const { id, moduleReference } = node;
    if (id && id.type === AST_NODE_TYPES.Identifier) {
      this.currentScope().__define(
        id,
        new TSESLintScope.Definition('ImportBinding', id, node, null, null, null)
      );
    }
    this.visit(moduleReference);
  }

  visitGlobalAugmentation(node: TSESTree.TSModuleDeclaration): void {
    const scopeManager = this.scopeManager;
    const currentScope = this.currentScope();
    const globalScope = scopeManager.globalScope;
    const originalDefine = globalScope.__define;

    globalScope.__define = overrideDefine(originalDefine);
    scopeManager.__currentScope = globalScope;

    // Skip TSModuleBlock to avoid to create that block scope.
    if (node.body && node.body.type === AST_NODE_TYPES.TSModuleBlock) {
      node.body.body.forEach(this.visit, this);
    }

    scopeManager.__currentScope = currentScope;
    globalScope.__define = originalDefine;
  }

  visitDecorators(decorators?: TSESTree.Decorator[]): void {
    if (decorators) {
      decorators.forEach(this.visit, this);
    }
  }

  visitTypeNodes(node: TSESTree.Node): void {
    if (this.typeMode) {
      this.visitChildren(node);
    } else {
      this.typeMode = true;
      this.visitChildren(node);
      this.typeMode = false;
    }
  }
}

export function analyzeScope(
  ast: TSESTree.Program,
  parserOptions: ParserOptions
): ScopeManager {
  const options = {
    ignoreEval: true,
    optimistic: false,
    directive: false,
    nodejsScope:
      parserOptions.sourceType === 'script' &&
      (parserOptions.ecmaFeatures && parserOptions.ecmaFeatures.globalReturn) === true,
    impliedStrict: false,
    sourceType: parserOptions.sourceType,
    ecmaVersion: parserOptions.ecmaVersion ?? 2018,
    childVisitorKeys,
    fallback,
  };

  const scopeManager = new ScopeManager(options);
  const referencer = new Referencer(options, scopeManager);

  referencer.visit(ast);

  return scopeManager;
}
