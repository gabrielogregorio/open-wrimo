// The Terms of Use and Privacy Policy, in Brazilian Portuguese, as structured text so the page can
// render headings, lists and tables. Links to e-mails and https addresses are made by the page.
export type TermsBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'steps'; items: readonly string[] }
  | { kind: 'table'; head: readonly string[]; rows: readonly (readonly string[])[] };

export type TermsSection = { id: string; title: string; blocks: readonly TermsBlock[] };

export const CONTROLLER_NAME = 'Gabriel Gregorio';
export const CONTACT_EMAIL = 'gabriel.gregorio.1@outlook.com';
export const ACCESS_LOG_MONTHS = 6;
export const DELETION_GRACE_DAYS = 30;
export const DELETION_DEADLINE_DAYS = 180;

const paragraph = (text: string): TermsBlock => ({ kind: 'paragraph', text });

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    id: 'quem-somos',
    title: '1. Quem somos',
    blocks: [
      paragraph(
        'O Open Wrimo é um projeto aberto e gratuito para quem escreve romances acompanhar palavras, metas e ritmo. O código está em https://github.com/gabrielogregorio/open-wrimo.',
      ),
      paragraph(
        `O responsável pelo serviço e pelo tratamento dos dados pessoais (controlador, nos termos da LGPD) é ${CONTROLLER_NAME}. Contato para dúvidas, denúncias e pedidos sobre seus dados: ${CONTACT_EMAIL}.`,
      ),
      paragraph('Ao criar uma conta, você declara que leu e aceita estes termos.'),
    ],
  },
  {
    id: 'idade',
    title: '2. Idade mínima',
    blocks: [
      paragraph(
        'Para usar o Open Wrimo é preciso ter 13 anos ou mais. Quem tem entre 13 e 17 anos deve ter a autorização de pai, mãe ou responsável legal, que concorda com estes termos em seu nome. Não aceitamos contas de menores de 13 anos; se identificarmos uma, ela será excluída.',
      ),
    ],
  },
  {
    id: 'projeto-aberto',
    title: '3. Projeto aberto, sem anúncios e sem renda',
    blocks: [
      paragraph(
        'O Open Wrimo não tem anúncios e não tem nenhuma fonte de renda até o momento. Ele é mantido de forma voluntária, com recursos limitados. Pedimos que você use o serviço com bom senso: não envie arquivos em excesso, não automatize acessos e não tente sobrecarregar o sistema. Abusos podem levar à limitação ou suspensão da conta.',
      ),
    ],
  },
  {
    id: 'sem-garantias',
    title: '4. Versão inicial: cuidado com seus dados, sem garantias',
    blocks: [
      paragraph(
        'Esta é uma versão inicial de um projeto aberto. Faremos tudo o que estiver ao nosso alcance para preservar seus dados e evitar problemas, com cópias de segurança e boas práticas de segurança. Mesmo assim, falhas técnicas podem acontecer, e dados podem ser corrompidos ou perdidos. Por isso:',
      ),
      {
        kind: 'list',
        items: [
          'o serviço é oferecido no estado em que se encontra, sem garantia de disponibilidade contínua ou de ausência de erros;',
          'recomendamos que você exporte seus dados com frequência, na tela Minha conta, e guarde uma cópia do seu texto fora do Open Wrimo;',
          'na medida máxima permitida pela lei, não nos responsabilizamos por perdas indiretas, lucros cessantes ou danos que não decorram de culpa nossa.',
        ],
      },
      paragraph('Nada nestes termos afasta direitos que a lei garante a você e que não podem ser renunciados.'),
    ],
  },
  {
    id: 'conteudo',
    title: '5. Seu conteúdo é seu',
    blocks: [
      paragraph(
        'Os romances, textos, metas e imagens que você cria continuam sendo seus. Você nos autoriza apenas a armazenar, processar e exibir esse conteúdo na medida necessária para o serviço funcionar, inclusive para mostrá-lo publicamente quando você escolher deixá-lo público. Você é responsável pelo que publica e declara ter os direitos sobre o conteúdo enviado.',
      ),
    ],
  },
  {
    id: 'privado-publico',
    title: '6. O que é privado e o que é público',
    blocks: [
      {
        kind: 'list',
        items: [
          'Textos e dados de escrita são privados por padrão. Romances, metas, contagens, humores e perfil só ficam visíveis para outras pessoas se você os marcar como públicos.',
          'Imagens (capas, foto de perfil e imagens dentro dos textos) ficam em endereços (URLs) públicos. Qualquer pessoa que tiver o link de uma imagem consegue abri-la, mesmo sem conta e mesmo que o romance seja privado. Os links são difíceis de adivinhar, mas podem ser compartilhados por quem os tiver.',
          'Não envie imagens que você não aceitaria ver públicas, como fotos pessoais, documentos ou imagens de outras pessoas sem autorização.',
        ],
      },
    ],
  },
  {
    id: 'ferramentas',
    title: '7. Ferramentas que funcionam no seu navegador',
    blocks: [
      paragraph(
        'A área de Ferramentas (editor de foco, rascunhos, fichas, ideias salvas, nomes guardados, linha do tempo, quadro de cenas, lembretes, conversor e as demais) funciona no seu navegador:',
      ),
      {
        kind: 'list',
        items: [
          'o que você cria nelas, como ideias salvas, rascunhos e fichas, fica guardado apenas no seu aparelho e não é enviado aos nossos servidores;',
          'nenhuma ferramenta usa inteligência artificial;',
          'esses dados ficam disponíveis só naquele navegador e podem ser perdidos se você limpar os dados do navegador ou trocar de aparelho; use a ferramenta Backup completo para levá-los para outro lugar;',
          'a única exceção é quando você escolhe lançar palavras numa meta: aí a contagem, e só ela, é enviada para a sua conta.',
        ],
      },
    ],
  },
  {
    id: 'sem-uso',
    title: '8. Não usamos seus dados para treinar ou melhorar tecnologias',
    blocks: [
      paragraph(
        'Seus dados não são acessados nem usados para melhorar ferramentas, treinar inteligência artificial ou desenvolver outras tecnologias, nem são vendidos ou compartilhados para publicidade. O acesso aos dados armazenados acontece apenas quando necessário para manter o serviço funcionando, corrigir falhas, garantir a segurança, analisar denúncias, atender a um pedido seu ou cumprir uma obrigação legal ou ordem judicial.',
      ),
    ],
  },
  {
    id: 'dados',
    title: '9. Dados que coletamos, para que e com que base legal (LGPD)',
    blocks: [
      {
        kind: 'table',
        head: ['Dado', 'Para quê', 'Base legal (LGPD, art. 7º)'],
        rows: [
          [
            'Nome, nome de usuário e e-mail',
            'Criar e identificar sua conta, entrar no sistema',
            'Execução do contrato (estes termos)',
          ],
          [
            'Senha',
            'Proteger o acesso; guardamos apenas uma versão cifrada (hash), nunca a senha em si',
            'Execução do contrato',
          ],
          [
            'Romances, metas, contagens, humores, local de escrita, perfil e pronomes',
            'Oferecer as funções do serviço',
            'Execução do contrato',
          ],
          ['Imagens enviadas', 'Exibir capas, foto de perfil e imagens dos textos', 'Execução do contrato'],
          [
            'Registros de acesso: endereço IP, navegador (user agent), data, hora e ação (cadastro, entrada, envio de imagem, aceite dos termos, pedido ou cancelamento de exclusão)',
            `Segurança, prevenção de abusos e cumprimento do Marco Civil da Internet (art. 15); guardados por ${ACCESS_LOG_MONTHS} meses e então apagados automaticamente`,
            'Cumprimento de obrigação legal e legítimo interesse (segurança)',
          ],
          [
            'Endereço IP para limitar tentativas',
            'Bloquear tentativas repetidas de entrada e envios em excesso; descartado em poucos minutos',
            'Legítimo interesse (segurança)',
          ],
          [
            'Denúncias: motivo, descrição, conta denunciante (se houver), IP e navegador de quem denunciou',
            'Analisar a denúncia e, quando for o caso, comunicar às autoridades',
            'Legítimo interesse e cumprimento de obrigação legal',
          ],
          [
            'Cookies essenciais (sessão, fuso horário e preferências)',
            'Manter você conectado e mostrar as datas certas',
            'Execução do contrato',
          ],
          [
            'Registro do aceite destes termos (versão e data)',
            'Comprovar o aceite',
            'Cumprimento de obrigação e exercício de direitos',
          ],
        ],
      },
      paragraph(
        'Não usamos cookies de rastreamento nem de publicidade. Os provedores de hospedagem também podem manter registros técnicos de acesso por períodos curtos, conforme as políticas deles.',
      ),
    ],
  },
  {
    id: 'compartilhamento',
    title: '10. Com quem os dados são compartilhados',
    blocks: [
      paragraph('Para funcionar, o Open Wrimo usa serviços de terceiros que processam dados em nosso nome:'),
      {
        kind: 'list',
        items: [
          'Vercel: hospedagem do site;',
          'MongoDB Atlas: banco de dados;',
          'Cloudinary: armazenamento das imagens.',
        ],
      },
      paragraph(
        'Esses serviços podem guardar dados fora do Brasil, o que configura transferência internacional de dados (LGPD, art. 33). Ela é feita para executar o serviço que você contratou, com provedores que adotam padrões reconhecidos de segurança. Não compartilhamos seus dados com mais ninguém, exceto nas situações da seção 13.',
      ),
    ],
  },
  {
    id: 'direitos',
    title: '11. Seus direitos',
    blocks: [
      paragraph('Você pode, a qualquer momento (LGPD, art. 18):'),
      {
        kind: 'list',
        items: [
          'acessar e exportar seus dados, na tela Minha conta, em formato JSON;',
          'corrigir seus dados, no seu perfil e nos seus romances;',
          'pedir a exclusão da conta, na tela Minha conta (veja a seção 12);',
          `saber com quem seus dados são compartilhados e tirar dúvidas sobre o tratamento, pelo e-mail ${CONTACT_EMAIL};`,
          'revogar consentimentos e se opor a tratamentos, nos limites da lei;',
          'apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
      },
      paragraph('Respondemos aos pedidos enviados por e-mail em até 15 dias.'),
    ],
  },
  {
    id: 'exclusao',
    title: '12. Exclusão da conta',
    blocks: [
      paragraph('Ao pedir a exclusão na tela Minha conta:'),
      {
        kind: 'steps',
        items: [
          'Na hora, a conta é desativada: seu perfil público e seus romances públicos deixam de aparecer, e você é desconectado.',
          `Durante ${DELETION_GRACE_DAYS} dias, você pode desistir entrando de novo na conta e cancelando o pedido.`,
          `Depois disso, em até ${DELETION_DEADLINE_DAYS} dias contados do pedido, a conta e os dados associados (textos, metas, contagens, perfil e imagens) são apagados de forma definitiva, inclusive das cópias de segurança.`,
        ],
      },
      paragraph(
        `Cópias de imagens podem continuar por algum tempo em caches de redes de distribuição antes de expirarem. Os registros de acesso seguem o prazo de ${ACCESS_LOG_MONTHS} meses da seção 9, e podemos manter o mínimo exigido por lei ou necessário para defesa em processos, pelo prazo legal.`,
      ),
      paragraph(
        'Os dados guardados nas Ferramentas ficam no seu navegador e não são apagados pela exclusão da conta. Para apagá-los, limpe os dados do site no seu navegador.',
      ),
    ],
  },
  {
    id: 'conteudo-proibido',
    title: '13. Conteúdo proibido, denúncias e autoridades',
    blocks: [
      paragraph('É proibido usar o Open Wrimo para publicar ou enviar conteúdo ilegal, como:'),
      {
        kind: 'list',
        items: [
          'abuso ou exploração sexual de crianças e adolescentes;',
          'nudez ou cena sexual de alguém sem o consentimento dessa pessoa;',
          'ameaças, incitação à violência, racismo e outros crimes de ódio;',
          'violação de direitos autorais ou de imagem de terceiros;',
          'vírus, golpes ou tentativas de invadir o sistema.',
        ],
      },
      paragraph('Quando tomarmos conhecimento de um conteúdo assim:'),
      {
        kind: 'list',
        items: [
          'removeremos o conteúdo e poderemos suspender ou excluir a conta;',
          'preservaremos as informações disponíveis sobre o envio, como dados da conta, data, hora, IP e navegador;',
          'comunicaremos às autoridades competentes (por exemplo, a Polícia Federal e a SaferNet Brasil), em especial nos casos que envolvem crianças e adolescentes, em que a comunicação é dever previsto em lei;',
          'entregaremos os dados que identificam o responsável quando houver ordem judicial ou outra hipótese prevista em lei.',
        ],
      },
      paragraph(
        `Para denunciar, use o botão Denunciar nos perfis e romances públicos ou escreva para ${CONTACT_EMAIL} com o link e a descrição. A pessoa denunciada não fica sabendo quem fez a denúncia. Pedidos de remoção de imagens íntimas divulgadas sem consentimento são atendidos assim que recebidos, como determina o Marco Civil da Internet (art. 21).`,
      ),
    ],
  },
  {
    id: 'terceiros',
    title: '14. Responsabilidade pelo conteúdo de terceiros',
    blocks: [
      paragraph(
        'O Open Wrimo é uma ferramenta usada por diferentes pessoas para escrever e publicar. Cada pessoa responde pelo conteúdo que envia. Conforme o Marco Civil da Internet (art. 19), o serviço só pode ser responsabilizado por conteúdo de terceiros se, depois de ordem judicial específica, não o tornar indisponível, salvo as exceções previstas em lei.',
      ),
      paragraph(
        'Você concorda em responder por danos que causar a terceiros ou ao projeto por violar estes termos ou a lei.',
      ),
    ],
  },
  {
    id: 'seguranca',
    title: '15. Segurança',
    blocks: [
      paragraph(
        'Usamos medidas técnicas razoáveis para proteger seus dados: conexão cifrada (HTTPS), senhas guardadas apenas como hash, sessões com tokens de curta duração, limite de tentativas de entrada e verificação dos arquivos enviados.',
      ),
      paragraph(
        'Nenhum sistema é totalmente invulnerável. Se ocorrer um incidente de segurança que possa causar risco ou dano relevante, avisaremos as pessoas afetadas e a ANPD, como exige a LGPD.',
      ),
    ],
  },
  {
    id: 'mudancas',
    title: '16. Mudanças nestes termos',
    blocks: [
      paragraph(
        'Podemos atualizar estes termos. A data da versão fica sempre no topo. Quando houver uma versão nova, mostraremos um resumo do que mudou na próxima vez que você entrar na área de escrita, e será preciso aceitá-la para continuar usando essa área. Enquanto isso, você continua podendo exportar seus dados, excluir a conta e sair. Se não concordar, pode exportar seus dados e excluir a conta.',
      ),
    ],
  },
  {
    id: 'lei',
    title: '17. Lei e foro',
    blocks: [
      paragraph(
        'Estes termos seguem as leis do Brasil, em especial a Lei Geral de Proteção de Dados (Lei 13.709/2018), o Marco Civil da Internet (Lei 12.965/2014) e, quando aplicável, o Código de Defesa do Consumidor. Fica eleito o foro do domicílio de quem usa o serviço, quando a lei assim garantir, ou o foro competente segundo a lei.',
      ),
    ],
  },
];
