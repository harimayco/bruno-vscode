import * as fs from 'fs';
import * as path from 'path';
import type { Frame } from '@playwright/test';
import { test, expect } from '../utils/fixtures';
import { openBrunoSidebar, createCollection, openRequest, findCollectionDir } from '../utils/page/actions';

const TEST_SERVER = 'http://127.0.0.1:8081';

async function setupRequest(page: any, tmpDir: string, collectionName: string): Promise<Frame> {
  const sidebar = await openBrunoSidebar(page);
  await createCollection(page, sidebar, collectionName, tmpDir, 'bru');
  const collectionDir = findCollectionDir(tmpDir);

  fs.writeFileSync(
    path.join(collectionDir, 'GetUsers.bru'),
    [
      'meta {',
      '  name: GetUsers',
      '  type: http',
      '  seq: 1',
      '}',
      '',
      'get {',
      `  url: ${TEST_SERVER}/api/users?limit=10`,
      '  body: none',
      '  auth: none',
      '}',
      '',
      'params:query {',
      '  limit: 10',
      '}',
      ''
    ].join('\n'),
    'utf8'
  );

  const editor = await openRequest(page, sidebar, collectionName, 'GetUsers');
  return editor;
}

test.describe('Generate Code', () => {
  test('opens modal and generates snippet successfully without validation error', async ({ page, tmpDir }) => {
    const editor = await setupRequest(page, tmpDir, 'GenCode Collection');

    // Click the Generate Code icon
    const genCodeIcon = editor.locator('[data-testid="generate-code-icon"]');
    await expect(genCodeIcon).toBeVisible({ timeout: 10_000 });
    await genCodeIcon.click();

    // Verify modal appears
    const modal = editor.locator('[data-testid="generate-code-modal"]');
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Verify the code editor inside modal displays valid generated snippet
    const codeEditor = modal.locator('.CodeMirror-code');
    await expect(codeEditor).toBeVisible({ timeout: 10_000 });

    const content = await codeEditor.textContent();
    expect(content).toContain('curl');
    expect(content).not.toContain('Could not generate a snippet');
    expect(content).not.toContain('Validation Failed');
  });
});
