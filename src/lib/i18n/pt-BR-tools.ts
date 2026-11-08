import { ptBRToolsRhythm } from './pt-BR-tools-rhythm';
import { ptBRToolsStory } from './pt-BR-tools-story';
import { ptBRToolsWrite } from './pt-BR-tools-write';

// Texts of the tools area. Each tool group keeps its own file next to this one and is spread in here.
export const ptBRTools: Record<string, string> = {
  ...ptBRToolsWrite,
  ...ptBRToolsStory,
  ...ptBRToolsRhythm,
  Tools: 'Ferramentas',
  'All tools': 'Todas as ferramentas',
  Favorites: 'Favoritas',
  'Favorite {tool}': 'Favoritar {tool}',
  'This tool is on its way.': 'Esta ferramenta está a caminho.',
  'Everything here works in the browser and keeps your work on this device. Star the ones you use most.':
    'Tudo aqui funciona no navegador e guarda o seu trabalho neste aparelho. Marque com estrela as que você mais usa.',
  Write: 'Escrever',
  'Review the text': 'Revisar o texto',
  'Build the story': 'Criar a história',
  'Pace and habit': 'Ritmo e hábito',
  Export: 'Exportar',
  'Focus editor': 'Editor de foco',
  'Full screen, no menus, live word count. Typewriter mode and no backspace if you want them.':
    'Tela cheia, sem menus, contagem de palavras ao vivo. Modo máquina de escrever e sem apagar, se quiser.',
  'Word counter': 'Contador de palavras',
  'Paste or write your text and log the new words to your goal in one tap.':
    'Cole ou escreva seu texto e lance as palavras novas na sua meta com um toque.',
  'Sprint with text': 'Sprint com texto',
  'A timed sprint with a page that counts the words you write while the clock runs.':
    'Um sprint cronometrado com uma página que conta as palavras escritas enquanto o relógio corre.',
  'Don’t stop': 'Não pare',
  'Stop typing for a few seconds and the page starts to turn red. A gentle push past the block.':
    'Pare de digitar por alguns segundos e a página começa a ficar vermelha. Um empurrãozinho contra o bloqueio.',
  'Drafts and snapshots': 'Rascunhos e cópias',
  'Everything you write here is saved on this device, with a snapshot every few minutes to undo accidents.':
    'Tudo o que você escreve aqui fica salvo neste aparelho, com uma cópia a cada poucos minutos para desfazer acidentes.',
  'Passage stats': 'Estatísticas do trecho',
  'Repeated words, sentences that run too long, adverbs ending in -mente and reading time.':
    'Palavras repetidas, frases longas demais, advérbios terminados em -mente e tempo de leitura.',
  Readability: 'Legibilidade',
  'The Flesch reading ease score adapted to Portuguese, with what it means.':
    'O índice de facilidade de leitura de Flesch adaptado ao português, com o que ele significa.',
  'Repetition highlighter': 'Destaque de repetição',
  'Colors the words you use too often inside each paragraph.':
    'Pinta as palavras que você usa demais dentro de cada parágrafo.',
  'Dialogue and narration': 'Diálogo e narração',
  'How much of the chapter is dialogue and how much is narration.': 'Quanto do capítulo é diálogo e quanto é narração.',
  'Name generator': 'Gerador de nomes',
  'Names by era and region, from lists that come with the app.':
    'Nomes por época e região, de listas que já vêm com o app.',
  'Character sheet': 'Ficha de personagem',
  'Looks, goal, fear and arc for each character of your novel.':
    'Aparência, objetivo, medo e arco de cada personagem do seu romance.',
  Timeline: 'Linha do tempo',
  'Events by chapter that you can move around.': 'Eventos por capítulo que você pode reorganizar.',
  'Scene board': 'Quadro de cenas',
  'Scene cards across planned, written and revised.': 'Cartões de cena entre planejada, escrita e revisada.',
  'Idea generator': 'Gerador de ideias',
  'A genre, popular tropes, a character, a place and a conflict drawn at random to get you unstuck.':
    'Um gênero, tropos populares, um personagem, um lugar e um conflito sorteados para destravar.',
  'Plot dice': 'Dado de enredo',
  'What happens now? Roll for a twist.': 'E agora, o que acontece? Jogue o dado e tire uma reviravolta.',
  'Goal calculator': 'Calculadora de meta',
  'Pick a finish date and see how many words a day you need, updated as you write.':
    'Escolha a data de término e veja quantas palavras por dia você precisa, atualizado conforme escreve.',
  'Year heatmap': 'Mapa de calor do ano',
  'One square per day of the year, darker on the days you wrote more.':
    'Um quadrado por dia do ano, mais escuro nos dias em que você escreveu mais.',
  Pomodoro: 'Pomodoro',
  'Write and rest in rounds, with the soft alarm clock between them.':
    'Escreva e descanse em rodadas, com o despertador suave entre elas.',
  'Writing reminder': 'Lembrete de escrita',
  'A notification at your writing time while the app is open on this device.':
    'Uma notificação no seu horário de escrever enquanto o app está aberto neste aparelho.',
  Manuscript: 'Manuscrito',
  'Your drafts as a .docx or a printable PDF in the format publishers expect.':
    'Seus rascunhos em .docx ou em PDF para imprimir, no formato que as editoras esperam.',
  'ePub book': 'Livro ePub',
  'Read your own book on an e-reader or a phone.': 'Leia o seu próprio livro num leitor digital ou no celular.',
  'EPUB converter': 'Conversor de EPUB',
  'Turn a .docx, .odt, .md, .txt or .html file into an ePub you can read on an e-reader or send to Kindle, right in the browser.':
    'Transforme um arquivo .docx, .odt, .md, .txt ou .html num ePub para ler no leitor digital ou mandar para o Kindle, direto no navegador.',
  'Full backup': 'Backup completo',
  'Everything the tools saved on this device in one .zip, and a way to bring it back.':
    'Tudo o que as ferramentas salvaram neste aparelho num .zip, e um jeito de trazer de volta.',
};
