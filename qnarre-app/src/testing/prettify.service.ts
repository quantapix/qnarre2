import {of} from 'rxjs';

export class MockPrettify {
  formatCode(code: string, language?: string, linenums?: number | boolean) {
    const t = linenums === undefined ? '' : `, linenums: ${linenums}`;
    return of(`Formatted code (language: ${language || 'auto'}${t}): ${code}`);
  }
}
