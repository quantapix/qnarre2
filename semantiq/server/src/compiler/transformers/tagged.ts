import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export enum ProcessLevel {
  LiftRestriction,
  All,
}
export function processTaggedTemplateExpression(
  context: TransformationContext,
  node: TaggedTemplateExpression,
  visitor: Visitor,
  currentSourceFile: SourceFile,
  recordTaggedTemplateString: (temp: Identifier) => void,
  level: ProcessLevel
) {
  const tag = visitNode(node.tag, visitor, isExpression);
  const templateArguments: Expression[] = [undefined!];
  const cookedStrings: Expression[] = [];
  const rawStrings: Expression[] = [];
  const template = node.template;
  if (level === ProcessLevel.LiftRestriction && !hasInvalidEscape(template)) return visitEachChild(node, visitor, context);
  if (Node.is.kind(NoSubstitutionLiteral, template)) {
    cookedStrings.push(createTemplateCooked(template));
    rawStrings.push(getRawLiteral(template, currentSourceFile));
  } else {
    cookedStrings.push(createTemplateCooked(template.head));
    rawStrings.push(getRawLiteral(template.head, currentSourceFile));
    for (const templateSpan of template.templateSpans) {
      cookedStrings.push(createTemplateCooked(templateSpan.literal));
      rawStrings.push(getRawLiteral(templateSpan.literal, currentSourceFile));
      templateArguments.push(visitNode(templateSpan.expression, visitor, isExpression));
    }
  }
  const helperCall = createTemplateObjectHelper(context, new ArrayLiteralExpression(cookedStrings), new ArrayLiteralExpression(rawStrings));
  if (qp_isExternalModule(currentSourceFile)) {
    const tempVar = createUniqueName('templateObject');
    recordTaggedTemplateString(tempVar);
    templateArguments[0] = createLogicalOr(tempVar, createAssignment(tempVar, helperCall));
  } else {
    templateArguments[0] = helperCall;
  }
  return new qs.CallExpression(tag, undefined, templateArguments);
}
function createTemplateCooked(template: TemplateHead | TemplateMiddle | TemplateTail | NoSubstitutionLiteral) {
  return template.templateFlags ? qs.VoidExpression.zero() : createLiteral(template.text);
}
function getRawLiteral(node: TemplateLiteralLikeNode, currentSourceFile: SourceFile) {
  let text = node.rawText;
  if (text === undefined) {
    text = getSourceTextOfNodeFromSourceFile(currentSourceFile, node);
    const isLast = node.kind === Syntax.NoSubstitutionLiteral || node.kind === Syntax.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
  }
  text = text.replace(/\r\n?/g, '\n');
  return setRange(createLiteral(text), node);
}
function createTemplateObjectHelper(context: TransformationContext, cooked: ArrayLiteralExpression, raw: ArrayLiteralExpression) {
  context.requestEmitHelper(templateObjectHelper);
  return new qs.CallExpression(getUnscopedHelperName('__makeTemplateObject'), undefined, [cooked, raw]);
}
export const templateObjectHelper: UnscopedEmitHelper = {
  name: 'typescript:makeTemplateObject',
  importName: '__makeTemplateObject',
  scoped: false,
  priority: 0,
  text: `
            var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
                if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
                return cooked;
            };`,
};
