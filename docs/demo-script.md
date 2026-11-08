# Demo GIF script

The README tour (`docs/demo-small.gif` on top, `docs/demo.gif` linked under it) is recorded by
`scripts/record-demo.mts`. This page is its script: what each scene shows, what it says and why. Change the scene
here and in `SCENES` in the script together, so the next recording keeps the same story.

## Record it

```bash
pnpm run build
DEMO_CHECK=1 pnpm run demo:record   # runs every scene without recording; fails and names the scene that broke
pnpm run demo:record                # records and writes docs/demo.gif and docs/demo-small.gif
```

- Runs on the production build with a throwaway database, like the E2E tests, so it never touches real data.
- Creates its own writers through the public API: Ana Souza (`ana-souza`), whose notebook the tour shows, with three
  novels, a monthly goal on each and 40 days of history, plus four public writers for the community page. Covers and
  pictures are plain colors with the title or initials, made on the fly.
- Needs ffmpeg at `/usr/bin/ffmpeg` (or set `FFMPEG`). It takes about two minutes and one Chrome; on a busy machine,
  limit it, for example `systemd-run --user --scope -p MemoryMax=4G -p CPUQuota=600% pnpm run demo:record`.
- A caption bar and a pointer are drawn into the page, so the GIF shows where the eye goes and why.

## Scenes

| #   | Scene id         | Caption (pt-BR, as shown)                                       | What happens                                                               |
| --- | ---------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `sign-up`        | Criar conta: o olhinho mostra a senha digitada                  | Types a password on `/register` and clicks the eye to show it              |
| 2   | `sign-in`        | Entrar e ir direto para a escrivaninha                          | Signs in as Ana Souza                                                      |
| 3   | `desk`           | Escrivaninha: seus romances, metas e conquistas                 | Moves over the first cover so it turns in 3D, then scrolls to the goals    |
| 4   | `update`         | Atualizar: escolha o livro na prateleira 3D                     | Turns the shelf, types 1850 words and a place, saves; a goal or badge pops |
| 5   | `stats`          | Estatísticas: anéis do total e do dia                           | Rings, then the pace chart and the months                                  |
| 6   | `sprint`         | Sprint: timer com despertador no fim                            | Picks 10 min and starts the timer                                          |
| 7   | `tools`          | Ferramentas: editor de foco, nomes, ideias, conversor para ePub | Scrolls the tools grid, opens the plot dice and rolls it twice             |
| 8   | `novel`          | Cada romance: detalhes, metas e conquistas                      | Opens the featured novel and its Goals and Badges tabs                     |
| 9   | `community`      | Comunidade: quem abriu o perfil para o mundo                    | The public writers, sorted by words                                        |
| 10  | `public-profile` | Perfil público em /u/username, você escolhe o que mostra        | Opens Bruno Lima's page, opens the report dialog, closes it with Escape    |

Pages change through the app's own router, as a click would; a full reload would replay the book animation that only
shows on the first visit.

## Sizes

| File                  | Width | fps | Colors | Speed | Size on 2026-11-08 |
| --------------------- | ----- | --- | ------ | ----- | ------------------ |
| `docs/demo.gif`       | 900   | 6   | 64     | 1.2x  | 5.0 MB, 53 s       |
| `docs/demo-small.gif` | 640   | 5   | 40     | 1.8x  | 2.0 MB             |

Both come from the same frames (10 per second, 1200x760). Flat scenes and no dithering keep them small; more motion
or more colors grow them fast.

## When the UI changes

1. Run `DEMO_CHECK=1 pnpm run demo:record`. A scene whose button or label changed fails by name.
2. Fix its locator in `SCENES`, using the Portuguese text the user sees, as the E2E tests do.
3. New feature worth showing: add a scene here first (caption of one line, under about 60 characters), then in the
   script, in the order a writer would meet it.
4. Record, look at a few frames (`ffmpeg -i docs/demo-small.gif -vf "fps=1/3,scale=320:-1,tile=5x4" sheet.png`) and
   check every caption is readable and no scene shows a loading screen for long.
5. Update the alt text of the GIF in the README if the tour now shows something else.
