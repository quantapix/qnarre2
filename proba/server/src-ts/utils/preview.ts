import * as vsc from 'vscode';
import type * as proto from '../protocol';

function replaceLinks(t: string) {
  return t.replace(
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

function inlineTags(t: string) {
  return replaceLinks(t);
}

function tagBodyText(tag: proto.JSDocTagInfo) {
  if (!tag.text) return;
  function block(t: string) {
    if (t.match(/^\s*[~`]{3}/g)) return t;
    return '```\n' + t + '\n```';
  }
  const ms = /<caption>(.*?)<\/caption>\s*(\r\n|\n)/.exec(tag.text);
  const email = /(.+)\s<([-.\w]+@[-.\w]+)>/.exec(tag.text);
  switch (tag.name) {
    case 'example':
      if (ms?.index === 0) return ms[1] + '\n\n' + block(tag.text.substr(ms[0].length));
      else return block(tag.text);
    case 'author':
      if (email === null) return tag.text;
      return `${email[1]} ${email[2]}`;
    case 'default':
      return block(tag.text);
  }
  return inlineTags(tag.text);
}

function tagDocumentation(tag: proto.JSDocTagInfo) {
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
          (doc.match(/\r\n|\n/g) ? '  \n' + inlineTags(doc) : ` — ${inlineTags(doc)}`)
        );
      }
  }
  const label = `*@${tag.name}*`;
  const text = tagBodyText(tag);
  if (!text) return label;
  return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
}

export function plain(parts: proto.SymbolDisplayPart[] | string): string {
  return inlineTags(
    typeof parts === 'string' ? parts : parts.map((part) => part.text).join('')
  );
}

export function tagsPreview(tags: proto.JSDocTagInfo[]) {
  return tags.map(tagDocumentation).join('  \n\n');
}

export function documentation(
  d: proto.SymbolDisplayPart[] | string,
  ts: proto.JSDocTagInfo[]
) {
  const md = new vsc.MarkdownString();
  addDocumentation(md, d, ts);
  return md;
}

export function addDocumentation(
  md: vsc.MarkdownString,
  d?: proto.SymbolDisplayPart[] | string,
  ts?: proto.JSDocTagInfo[]
) {
  if (d) md.appendMarkdown(plain(d));
  if (ts) {
    const p = tagsPreview(ts);
    if (p) md.appendMarkdown('\n\n' + p);
  }
  return md;
}
