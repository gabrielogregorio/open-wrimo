import { createNovel, expect, pngImage, test } from './fixtures';

test('a writer creates a novel with a cover, a daily goal and the November event', async ({ writerPage: page }) => {
  await page.goto('/write/novels/new');
  await page.locator('#field-genre-draft').fill('Romance');
  await page.keyboard.press('Enter');
  await page.locator('#field-genre-draft').fill('Mistério');
  await page.keyboard.press('Enter');
  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+b');
  await page.keyboard.type('Capítulo um.');
  await page.locator('#field-title').fill('A Casa das Marés');
  await page
    .locator('#field-cover')
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: await pngImage() });
  await page.getByLabel('Com que frequência').selectOption('daily');
  await page.locator('#field-periodTarget').fill('1667');
  await expect(page.locator('#field-periodTarget')).toHaveValue('1.667');
  await page.getByLabel('Participar de um evento').selectOption('november');
  await page.getByRole('button', { name: 'Criar romance' }).click();
  await expect(page).toHaveURL(/\/write\/novels\/[0-9a-f]{24}$/);

  await expect(page.getByRole('heading', { level: 1, name: 'A Casa das Marés' })).toBeVisible();
  await expect(page.getByText('Romance, Romance, Mistério')).toBeVisible();
  await expect(page.locator('.book-mock img')).toHaveAttribute('src', /^\/media\/covers\/[0-9a-f-]+\.webp$/);
  await expect(page.locator('.rich-text strong')).toHaveText('Capítulo um.');
  await page.getByRole('link', { name: 'Metas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meta diária' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Romance de novembro \d{4}$/ })).toBeVisible();
});

test('words are logged on the cover shelf, beat the daily goal and can be undone', async ({ writerPage: page }) => {
  await createNovel(page, { title: 'Primeiro Livro', daily: 100 });
  await page.getByRole('link', { name: 'Atualizar minhas palavras' }).click();
  await expect(page.getByRole('radio', { name: /Primeiro Livro/ })).toHaveAttribute('aria-checked', 'true');

  await page.locator('#field-count').fill('1850');
  await expect(page.locator('#field-count')).toHaveValue('1.850');
  await page.getByLabel('Onde você escreveu?').fill('Num café');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();

  await expect(page.getByText('Progresso salvo.')).toBeVisible();
  await expect(page.getByText('Meta batida!')).toBeVisible();
  await expect(page.getByText('1850%')).toBeVisible();
  await expect(page.getByText('Conquista desbloqueada!')).toBeVisible();
  await expect(page.getByText(/\+1\.850 palavras/)).toBeVisible();

  await page.getByRole('button', { name: 'Fechar todas as conquistas' }).click();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Nada registrado ainda.')).toBeVisible();
});

test('setting the total writes only the difference', async ({ writerPage: page }) => {
  await createNovel(page, { title: 'Total', daily: 500 });
  await page.goto('/write/update');
  await page.locator('#field-count').fill('300');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByText('Progresso salvo.')).toBeVisible();

  await page.getByLabel('Definir meu novo total').check();
  await page.locator('#field-count').fill('800');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();

  await expect(page.getByText(/\+500 palavras/)).toBeVisible();
  await expect(page.getByText(/\+300 palavras/)).toBeVisible();
});

test('stats show the rings, the pace and the months', async ({ writerPage: page }) => {
  await createNovel(page, { title: 'Estatística', daily: 1000 });
  await page.goto('/write/update');
  await page.locator('#field-count').fill('400');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByText('Progresso salvo.')).toBeVisible();

  await page.goto('/write/stats');

  await expect(page.getByText('palavras totais')).toBeVisible();
  await expect(page.getByText('palavras necessárias hoje')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meu ritmo em palavras' })).toBeVisible();
  await expect(page.getByRole('table').filter({ hasText: 'Mês' })).toContainText('400');
});

test('a goal is edited in place on the novel settings', async ({ writerPage: page }) => {
  const url = await createNovel(page, { title: 'Editável', daily: 500 });
  await page.goto(`${url}/edit`);

  await page.getByRole('button', { name: 'Editar meta' }).click();
  const editor = page.locator('form').filter({ hasText: 'Nome da meta' });
  await editor.getByLabel('Meta', { exact: true }).fill('2000');
  await editor.getByRole('button', { name: 'Todo mês' }).click();
  await editor.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Escreva 2.000 palavras este mês')).toBeVisible();
  await page.getByRole('button', { name: 'Editar meta' }).click();
  await page.getByRole('button', { name: 'Excluir esta meta' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
  await expect(page.getByText('Nenhuma meta ainda.')).toBeVisible();
});

test('the sprint timer counts down and offers to log the words', async ({ writerPage: page }) => {
  await createNovel(page, { title: 'Sprint', daily: 300 });
  await page.clock.install();
  await page.goto('/write/sprint');
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.clock.fastForward('05:01');

  await expect(page.getByText('Canetas abaixo! Quanto você escreveu?')).toBeVisible();
  await expect(page.locator('.alarm-ringing')).toBeVisible();
  await expect(page.locator('#field-count')).toBeVisible();
});
