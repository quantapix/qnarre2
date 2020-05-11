import * as assert from 'assert';
import * as vscode from 'vscode';

import { docUri, activate } from './helper.test';

suite('Should do completion', () => {
  const u = docUri('completion.txt');
  test('Completes JS/TS in txt file', async () => {
    await testCompletion(u, new vscode.Position(0, 0), {
      items: [
        { label: 'JavaScript', kind: vscode.CompletionItemKind.Text },
        { label: 'TypeScript', kind: vscode.CompletionItemKind.Text },
      ],
    });
  });
});

async function testCompletion(
  u: vscode.Uri,
  p: vscode.Position,
  es: vscode.CompletionList
) {
  await activate(u);
  const cs = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    u,
    p
  )) as vscode.CompletionList;
  assert.ok(cs.items.length >= 2);
  es.items.forEach((e, i) => {
    const a = cs.items[i];
    assert.equal(a.label, e.label);
    assert.equal(a.kind, e.kind);
  });
}
