/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import * as vsc from 'vscode';
import type * as proto from '../protocol';

function replaceLinks(text: string) {
  return text.replace(
    /\{@(link|linkplain|linkcode) (https?:\/\/[^ |}]+?)(?:[| ]([^{}\n]+?))?\}/gi,
    (_, tag: string, link: string, text?: string) => {
      switch (tag) {
        case 'linkcode':
          return `[\`${text ? text.trim() : link}\`](${link})`;
        default:
          return `[${text ? text.trim() : link}](${link})`;
      }
    }
  );
}

function processInlineTags(text: string) {
  return replaceLinks(text);
}

function getTagBodyText(tag: proto.JSDocTagInfo): string | undefined {
  if (!tag.text) return;
  function makeCodeblock(text: string) {
    if (text.match(/^\s*[~`]{3}/g)) return text;
    return '```\n' + text + '\n```';
  }
  const captionTagMatches = tag.text.match(/<caption>(.*?)<\/caption>\s*(\r\n|\n)/);
  const emailMatch = tag.text.match(/(.+)\s<([-.\w]+@[-.\w]+)>/);
  switch (tag.name) {
    case 'example':
      if (captionTagMatches && captionTagMatches.index === 0) {
        return (
          captionTagMatches[1] +
          '\n\n' +
          makeCodeblock(tag.text.substr(captionTagMatches[0].length))
        );
      } else {
        return makeCodeblock(tag.text);
      }
    case 'author':
      if (emailMatch === null) return tag.text;
      return `${emailMatch[1]} ${emailMatch[2]}`;
    case 'default':
      return makeCodeblock(tag.text);
  }
  return processInlineTags(tag.text);
}

function tagDocumentation(tag: proto.JSDocTagInfo): string | undefined {
  const body = (tag.text || '').split(/^(\S+)\s*-?\s*/);
  switch (tag.name) {
    case 'augments':
    case 'extends':
    case 'param':
    case 'template':
      if (body?.length === 3) {
        const param = body[1];
        const doc = body[2];
        const label = `*@${tag.name}* \`${param}\``;
        if (!doc) return label;
        return (
          label +
          (doc.match(/\r\n|\n/g)
            ? '  \n' + processInlineTags(doc)
            : ` — ${processInlineTags(doc)}`)
        );
      }
  }
  const label = `*@${tag.name}*`;
  const text = getTagBodyText(tag);
  if (!text) return label;
  return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
}

export function plain(parts: proto.SymbolDisplayPart[] | string): string {
  return processInlineTags(
    typeof parts === 'string' ? parts : parts.map((part) => part.text).join('')
  );
}

export function tagsMarkdownPreview(tags: proto.JSDocTagInfo[]): string {
  return tags.map(tagDocumentation).join('  \n\n');
}

export function mdDocumentation(
  documentation: proto.SymbolDisplayPart[] | string,
  tags: proto.JSDocTagInfo[]
): vsc.MarkdownString {
  const out = new vsc.MarkdownString();
  addMdDocumentation(out, documentation, tags);
  return out;
}

export function addMdDocumentation(
  out: vsc.MarkdownString,
  documentation: proto.SymbolDisplayPart[] | string | undefined,
  tags: proto.JSDocTagInfo[] | undefined
): vsc.MarkdownString {
  if (documentation) out.appendMarkdown(plain(documentation));
  if (tags) {
    const tagsPreview = tagsMarkdownPreview(tags);
    if (tagsPreview) out.appendMarkdown('\n\n' + tagsPreview);
  }
  return out;
}
