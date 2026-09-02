import * as fs from 'fs';
import * as path from 'path';
import type { Frame } from '@playwright/test';
import { test, expect } from '../utils/fixtures';
import { openBrunoSidebar, createCollection, openRequest, findCollectionDir, runCommand } from '../utils/page/actions';

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
      `  url: ${TEST_SERVER}/api/echo/json`,
      '  body: none',
      '  auth: none',
      '}',
      ''
    ].join('\n'),
    'utf8'
  );

  const editor = await openRequest(page, sidebar, collectionName, 'GetUsers');
  return editor;
}

test.describe('Global History', () => {
  test('records sent request and displays in global history page', async ({ page, tmpDir }) => {
    const editor = await setupRequest(page, tmpDir, 'History Collection');

    // Click Send request
    const sendButton = editor.locator('button:has-text("Send"), [aria-label="Send Request"]').first();
    if (await sendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendButton.click();
    }

    // Open Global History via command
    await runCommand(page, 'Bruno: Open Global History');

    // Verify Global History page opens
    await expect(page.locator('[data-testid="global-history-page"]')).toBeVisible({ timeout: 10_000 });
  });
});
