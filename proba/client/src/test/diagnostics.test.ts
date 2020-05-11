import * as vscode from 'vscode';
import * as assert from 'assert';
import { docUri, activate } from './helper';

suite('Should get diagnostics', () => {
  const u = docUri('diagnostics.txt');
  test('Diagnoses uppercase texts', async () => {
    await testDiagnostics(u, [
      {
        message: 'ANY is all uppercase.',
        range: toRange(0, 0, 0, 3),
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'ex',
      },
      {
        message: 'ANY is all uppercase.',
        range: toRange(0, 14, 0, 17),
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'ex',
      },
      {
        message: 'OS is all uppercase.',
        range: toRange(0, 18, 0, 20),
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'ex',
      },
    ]);
  });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new vscode.Position(sLine, sChar);
  const end = new vscode.Position(eLine, eChar);
  return new vscode.Range(start, end);
}

async function testDiagnostics(u: vscode.Uri, es: vscode.Diagnostic[]) {
  await activate(u);
  const ds = vscode.languages.getDiagnostics(u);
  assert.equal(ds.length, es.length);
  es.forEach((e, i) => {
    const a = ds[i];
    assert.equal(a.message, e.message);
    assert.deepEqual(a.range, e.range);
    assert.equal(a.severity, e.severity);
  });
}
