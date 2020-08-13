import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export enum ProcessLevel {
  LiftRestriction,
  All,
}
export function processTaggedTemplateExpression(
  context: TrafoContext,
  node: TaggedTemplateExpression,
  visitor: Visitor,
  currentSourceFile: SourceFile,
  recordTaggedTemplateString: (temp: Identifier) => void,
  level: ProcessLevel
) {
  const tag = visitNode(node.tag, visitor, isExpression);
  const templateArgs: Expression[] = [undefined!];
  const cookedStrings: Expression[] = [];
  const rawStrings: Expression[] = [];
  const template = node.template;
  if (level === ProcessLevel.LiftRestriction && !qc.has.invalidEscape(template)) return visitEachChild(node, visitor, context);
  if (qc.is.kind(qc.NoSubstitutionLiteral, template)) {
    cookedStrings.push(createTemplateCooked(template));
    rawStrings.push(getRawLiteral(template, currentSourceFile));
  } else {
    cookedStrings.push(createTemplateCooked(template.head));
    rawStrings.push(getRawLiteral(template.head, currentSourceFile));
    for (const templateSpan of template.templateSpans) {
      cookedStrings.push(createTemplateCooked(templateSpan.literal));
      rawStrings.push(getRawLiteral(templateSpan.literal, currentSourceFile));
      templateArgs.push(visitNode(templateSpan.expression, visitor, isExpression));
    }
  }
  const helperCall = createTemplateObjectHelper(context, new ArrayLiteralExpression(cookedStrings), new ArrayLiteralExpression(rawStrings));
  if (qc.is.externalModule(currentSourceFile)) {
    const tempVar = createUniqueName('templateObject');
    recordTaggedTemplateString(tempVar);
    templateArgs[0] = qf.create.logicalOr(tempVar, qf.create.assignment(tempVar, helperCall));
  } else {
    templateArgs[0] = helperCall;
  }
  return new qs.CallExpression(tag, undefined, templateArgs);
}
function createTemplateCooked(template: TemplateHead | TemplateMiddle | TemplateTail | NoSubstitutionLiteral) {
  return template.templateFlags ? qs.VoidExpression.zero() : qc.asLiteral(template.text);
}
function getRawLiteral(node: TemplateLiteralLikeNode, currentSourceFile: SourceFile) {
  let text = node.rawText;
  if (text === undefined) {
    text = qf.get.sourceTextOfNodeFromSourceFile(currentSourceFile, node);
    const isLast = node.kind === Syntax.NoSubstitutionLiteral || node.kind === Syntax.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
  }
  text = text.replace(/\r\n?/g, '\n');
  return qc.asLiteral(text).setRange(node);
}
function createTemplateObjectHelper(context: TrafoContext, cooked: ArrayLiteralExpression, raw: ArrayLiteralExpression) {
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
