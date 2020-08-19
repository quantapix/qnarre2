import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export enum ProcessLevel {
  LiftRestriction,
  All,
}
export function processTaggedTemplateExpression(
  context: qt.TrafoContext,
  node: qt.TaggedTemplateExpression,
  visitor: Visitor,
  currentSourceFile: qt.SourceFile,
  recordTaggedTemplateString: (temp: qt.Identifier) => void,
  level: ProcessLevel
) {
  const tag = qf.visit.node(node.tag, visitor, isExpression);
  const templateArgs: qt.Expression[] = [undefined!];
  const cookedStrings: qt.Expression[] = [];
  const rawStrings: qt.Expression[] = [];
  const template = node.template;
  if (level === ProcessLevel.LiftRestriction && !qf.has.invalidEscape(template)) return qf.visit.children(node, visitor, context);
  if (template.kind === Syntax.NoSubstitutionLiteral) {
    cookedStrings.push(createTemplateCooked(template));
    rawStrings.push(getRawLiteral(template, currentSourceFile));
  } else {
    cookedStrings.push(createTemplateCooked(template.head));
    rawStrings.push(getRawLiteral(template.head, currentSourceFile));
    for (const templateSpan of template.templateSpans) {
      cookedStrings.push(createTemplateCooked(templateSpan.literal));
      rawStrings.push(getRawLiteral(templateSpan.literal, currentSourceFile));
      templateArgs.push(qf.visit.node(templateSpan.expression, visitor, isExpression));
    }
  }
  const helperCall = createTemplateObjectHelper(context, new qc.ArrayLiteralExpression(cookedStrings), new qc.ArrayLiteralExpression(rawStrings));
  if (qf.is.externalModule(currentSourceFile)) {
    const tempVar = qf.make.uniqueName('templateObject');
    recordTaggedTemplateString(tempVar);
    templateArgs[0] = qf.make.logicalOr(tempVar, qf.make.assignment(tempVar, helperCall));
  } else {
    templateArgs[0] = helperCall;
  }
  return new qc.CallExpression(tag, undefined, templateArgs);
}
function createTemplateCooked(template: qt.TemplateHead | qt.TemplateMiddle | qt.TemplateTail | qt.NoSubstitutionLiteral) {
  return template.templateFlags ? qc.VoidExpression.zero() : qc.asLiteral(template.text);
}
function getRawLiteral(node: qt.TemplateLiteralLikeNode, currentSourceFile: qt.SourceFile) {
  let text = node.rawText;
  if (text === undefined) {
    text = qf.get.sourceTextOfNodeFromSourceFile(currentSourceFile, node);
    const isLast = node.kind === Syntax.NoSubstitutionLiteral || node.kind === Syntax.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
  }
  text = text.replace(/\r\n?/g, '\n');
  return qc.asLiteral(text).setRange(node);
}
function createTemplateObjectHelper(context: qt.TrafoContext, cooked: qt.ArrayLiteralExpression, raw: qt.ArrayLiteralExpression) {
  context.requestEmitHelper(templateObjectHelper);
  return new qc.CallExpression(getUnscopedHelperName('__makeTemplateObject'), undefined, [cooked, raw]);
}
export const templateObjectHelper: qt.UnscopedEmitHelper = {
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
