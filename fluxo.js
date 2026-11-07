/*
 * ==========================================================================
 *  FLUXO DA CONVERSA · Triplice Fronteria
 *  ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR.
 * ==========================================================================
 *
 *  Abra no Bloco de Notas ou no VS Code, altere, salve e recarregue a página.
 *
 *  Dica: coloque ?depurar=1 no fim do endereço (ex.: http://127.0.0.1:8093/?depurar=1)
 *  para ver o nome de cada etapa, pular direto para qualquer uma e ver a lista
 *  de erros do fluxo (link vazio, etapa que não existe etc.).
 *
 *  ----------------------------------------------------------------------
 *  COMO FUNCIONA
 *  A conversa é feita de ETAPAS. Cada etapa tem um nome (ex.: 'objetivo') e:
 *
 *    mensagens: [ ... ]   o que a assistente "digita", na ordem
 *
 *    e depois UMA destas formas de continuar:
 *    opcoes:  [ ... ]     botões de resposta
 *    entrada: { ... }     campo para a pessoa digitar (ex.: o nome)
 *    fim: true            a conversa termina ali
 *
 *    Extras da etapa:
 *    campo: 'objetivo'        guarda o botão escolhido com esse nome → use {objetivo} nos textos
 *    liberarOpcoesApos: 60    só mostra os botões depois de 60 segundos (bom para VSL)
 *
 *  ----------------------------------------------------------------------
 *  TIPOS DE MENSAGEM
 *    'Texto'                       aceita *negrito*, _itálico_, ~riscado~, emojis,
 *                                  quebra de linha com \n e variáveis como {nome}
 *    { imagem: 'assets/foto.jpg', legenda: 'Texto opcional', alt: 'Descrição da imagem' }
 *    { video: 'LINK', vertical: false, legenda: 'Texto opcional' }      ← VSL
 *         LINK pode ser: YouTube, YouTube Shorts, Vimeo, arquivo .mp4
 *         ou o link de "embed" do player (Panda Video, Vturb, Wistia...)
 *         vertical: true para vídeo em pé (9:16)
 *    { audio: 'assets/audio.mp3' }                                    mensagem de voz
 *    { cartao: { titulo: '...', texto: '...', imagem: '...', link: 'https://...', botao: 'Abrir' } }
 *                                  link com prévia (site, página de vendas, checkout)
 *    { pausa: 2 }                  espera 2 segundos sem mostrar "digitando"
 *
 *  ----------------------------------------------------------------------
 *  TIPOS DE BOTÃO (opções)
 *    { texto: 'Sim', vai: 'nome-da-etapa' }               vai para outra etapa
 *    { texto: 'Quero me inscrever', link: 'https://...' }  abre um site ou checkout
 *    { texto: 'Falar no WhatsApp', whatsapp: true }        abre o WhatsApp da empresa
 *                                                          com as respostas da pessoa
 *    { texto: 'Recomeçar', reiniciar: true }               volta ao início
 *
 *    Extras do botão:
 *    destaque: true      botão dourado (use no principal: checkout, inscrição)
 *    novaAba: true       abre o link em outra aba (o padrão é abrir na mesma)
 *    resposta: 'Texto'   a assistente responde isso antes de seguir
 *
 *  ATENÇÃO: cada item termina com vírgula, e todo texto fica entre aspas simples '...'.
 *  Se precisar de apóstrofo dentro do texto, use \' (ex.: 'd\'água').
 * ==========================================================================
 */

window.FLUXO = {
  /* Cabeçalho e textos fixos da tela */
  marca: {
    nome: 'Triplice Fronteria',
    status: 'Assistente virtual • online',
    faixa: 'Trabalho e nova vida em Foggia, Itália',
    aviso: 'Atendimento automático. Toque nas respostas abaixo.',
    rodape: 'Suas respostas ficam só neste aparelho até você escolher enviar.',
    avatar: 'assets/avatar.svg',
  },

  config: {
    /* WhatsApp da empresa: DDI + DDD + número, só dígitos. Ex.: '5545999999999' */
    whatsapp: '',
    /* Mensagem que já vai escrita no WhatsApp. Use as respostas: {nome}, {objetivo}, {area}, {passaporte} */
    mensagemWhatsapp:
      'Olá! Vim pela conversa do site da Triplice Fronteria.\nNome: {nome}\nObjetivo: {objetivo}\nExperiência: {area}\nPassaporte: {passaporte}',
    /* Velocidade da digitação: 1 = normal, 0.5 = mais rápido, 1.5 = mais devagar */
    velocidade: 1,
    /* Repassa os parâmetros de campanha (utm_source, utm_campaign...) para os links de checkout */
    repassarUtm: true,
  },

  /* Etapa por onde a conversa começa */
  inicio: 'boas-vindas',

  etapas: {
    'boas-vindas': {
      mensagens: [
        'Olá! 👋 Que bom ter você aqui.',
        'Sou a assistente virtual da *Triplice Fronteria*. Em poucos minutos, vou te mostrar como funciona o caminho para trabalhar e viver em *Foggia, no sul da Itália*.',
        'Para começar: como posso te chamar?',
      ],
      entrada: { campo: 'nome', placeholder: 'Digite seu primeiro nome', vai: 'objetivo' },
    },

    objetivo: {
      mensagens: ['Prazer, {nome}! 😊', 'O que você mais busca nessa mudança para a Itália?'],
      campo: 'objetivo',
      opcoes: [
        {
          texto: 'Trabalhar e juntar dinheiro',
          vai: 'experiencia',
          resposta: 'Ótimo objetivo. Foggia fica no Tavoliere delle Puglie, uma das maiores regiões agrícolas e agroindustriais da Itália.',
        },
        {
          texto: 'Mudar com a minha família',
          vai: 'experiencia',
          resposta: 'Entendo. Mudar em família pede planejamento, e a gente orienta cada etapa.',
        },
        {
          texto: 'Construir uma carreira na Europa',
          vai: 'experiencia',
          resposta: 'Experiência de trabalho na Europa abre portas. Vamos conhecer o seu perfil.',
        },
        {
          texto: 'Ainda estou pesquisando',
          vai: 'experiencia',
          resposta: 'Perfeito, é para isso que estou aqui: te dar clareza antes de qualquer decisão.',
        },
      ],
    },

    experiencia: {
      mensagens: ['Agora me conta: em qual área você tem mais experiência?'],
      campo: 'area',
      opcoes: [
        { texto: 'Agricultura e campo', vai: 'passaporte' },
        { texto: 'Construção civil', vai: 'passaporte' },
        { texto: 'Indústria e logística', vai: 'passaporte' },
        { texto: 'Hotelaria e restaurantes', vai: 'passaporte' },
        { texto: 'Outra área', vai: 'passaporte' },
      ],
    },

    passaporte: {
      mensagens: ['E sobre documentos: você já tem passaporte?'],
      campo: 'passaporte',
      opcoes: [
        { texto: 'Sim, válido', vai: 'transparencia', resposta: 'Ótimo, isso adianta bastante o processo. ✅' },
        { texto: 'Ainda não', vai: 'transparencia', resposta: 'Sem problema. É um dos primeiros passos, e a gente te orienta sobre ele.' },
        { texto: 'Está em andamento', vai: 'transparencia', resposta: 'Perfeito, você já está no caminho certo.' },
      ],
    },

    transparencia: {
      mensagens: [
        'Antes de seguir, {nome}, uma informação importante:',
        'A Triplice Fronteria *não oferece ajuda de custo* para passagens aéreas nem para os custos iniciais da mudança. A mudança para a Itália é de responsabilidade do candidato.',
        'Preferimos deixar isso claro desde o começo. Faz sentido para você seguir assim?',
      ],
      opcoes: [
        { texto: 'Sim, entendo e quero seguir', vai: 'video' },
        { texto: 'Quais custos devo prever?', vai: 'custos' },
        { texto: 'Agora não', vai: 'agora-nao' },
      ],
    },

    custos: {
      mensagens: [
        'Boa pergunta. Os principais custos por conta do candidato são:',
        '✈️ *Passagem aérea* até a Itália\n🏠 *Primeiros dias*: hospedagem, alimentação e transporte\n🛂 *Documentos pessoais*, como o passaporte',
        'Nossa recomendação é chegar com uma reserva para cobrir as despesas até o primeiro salário.',
        'Quer continuar?',
      ],
      opcoes: [
        { texto: 'Sim, quero continuar', vai: 'video' },
        { texto: 'Agora não', vai: 'agora-nao' },
      ],
    },

    video: {
      mensagens: [
        'Perfeito, {nome}! Separei um vídeo curto explicando como funciona, do primeiro contato até a chegada em Foggia. 🎬',
        /* VSL: cole aqui o link do vídeo (YouTube, Vimeo, .mp4 ou embed do player) */
        { video: '', vertical: false, legenda: 'Assista com o som ligado.' },
        'Quando quiser, escolha abaixo. Na página de inscrição você vê todos os detalhes e valores antes de decidir.',
      ],
      /* Para mostrar os botões só depois de um tempo de vídeo, troque 0 pelos segundos (ex.: 90) */
      liberarOpcoesApos: 0,
      opcoes: [
        /* CHECKOUT: cole aqui o link da sua página de inscrição / checkout */
        { texto: 'Quero fazer minha inscrição', link: '', destaque: true },
        { texto: 'Falar com a equipe no WhatsApp', whatsapp: true },
        { texto: 'Conhecer o site da Triplice Fronteria', link: 'https://matheusfut22.github.io/triplice-fronteria-previa/', novaAba: true },
      ],
    },

    'agora-nao': {
      mensagens: [
        'Tudo bem, {nome}! Sem pressa. 🙂',
        'Quando quiser retomar, é só voltar aqui. Enquanto isso, você pode conhecer melhor a Triplice Fronteria:',
        {
          cartao: {
            titulo: 'Triplice Fronteria',
            texto: 'Trabalho e nova vida em Foggia, no sul da Itália.',
            imagem: 'assets/cartao-site.jpg',
            link: 'https://matheusfut22.github.io/triplice-fronteria-previa/',
            botao: 'Abrir o site',
          },
        },
      ],
      opcoes: [{ texto: 'Recomeçar a conversa', reiniciar: true }],
    },
  },
};
