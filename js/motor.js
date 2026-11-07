/* Motor da conversa · Triplice Fronteria
   Lê window.FLUXO (fluxo.js) e encena a conversa. Não é preciso editar este arquivo. */
(function () {
  'use strict';

  var F = window.FLUXO;
  var parametros = new URLSearchParams(window.location.search);
  var depurar = parametros.has('depurar');
  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    rolagem: $('rolagem'),
    mensagens: $('mensagens'),
    digitando: $('digitando'),
    opcoes: $('opcoes'),
    compositor: $('compositor'),
    campo: $('campo-texto'),
    rotuloCampo: $('rotulo-campo'),
    status: $('status'),
    rodape: $('rodape'),
    toast: $('toast'),
  };

  var estado = { respostas: {}, geracao: 0, etapaAtual: null, etapaEtiquetada: null, ultimoAutor: null, teclado: false, linksUsados: {} };
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ util */
  var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var velocidade = function () {
    var v = Number((F && F.config && F.config.velocidade) || 1);
    return (v > 0 ? v : 1) * (depurar ? 0.15 : 1);
  };
  var hora = function () {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  var criar = function (tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  };
  var icone = function (caminhos, classe) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    if (classe) s.setAttribute('class', classe);
    caminhos.forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  };
  var ICONES = {
    seta: ['M9 6l6 6-6 6'],
    externo: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
    whatsapp: ['M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.9z'],
    reiniciar: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
    play: ['M8 5.5v13l11-6.5z'],
    pausa: ['M8 5h3v14H8z', 'M13 5h3v14h-3z'],
    video: ['M3 6.5A1.5 1.5 0 0 1 4.5 5h11A1.5 1.5 0 0 1 17 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 17.5z', 'M17 10l4-2.5v9L17 14'],
    alerta: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17v.5'],
  };

  /* Troca {nome}, {objetivo}... pelas respostas. */
  function substituir(texto, codificar) {
    return String(texto).replace(/\{([A-Za-z_]\w*)\}/g, function (_, campo) {
      var v = estado.respostas[campo];
      if (campo === 'primeiroNome') v = String(estado.respostas.nome || '').split(/\s+/)[0];
      v = v === undefined || v === null ? '' : String(v);
      return codificar ? encodeURIComponent(v) : v;
    });
  }

  /* Formatação estilo WhatsApp: *negrito* _itálico_ ~riscado~, quebras de linha e links. Sem innerHTML. */
  function formatar(texto) {
    var frag = document.createDocumentFragment();
    String(texto).split('\n').forEach(function (linha, i) {
      if (i) frag.appendChild(document.createElement('br'));
      var re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;
      var pos = 0;
      var m;
      while ((m = re.exec(linha))) {
        if (m.index > pos) frag.appendChild(document.createTextNode(linha.slice(pos, m.index)));
        var t = m[0];
        var n;
        if (t[0] === '*') n = criar('strong', null, t.slice(1, -1));
        else if (t[0] === '_') n = criar('em', null, t.slice(1, -1));
        else if (t[0] === '~') n = criar('s', null, t.slice(1, -1));
        else {
          n = criar('a', 'link-texto', t);
          n.href = t;
          n.target = '_blank';
          n.rel = 'noopener noreferrer';
        }
        frag.appendChild(n);
        pos = m.index + t.length;
      }
      if (pos < linha.length) frag.appendChild(document.createTextNode(linha.slice(pos)));
    });
    return frag;
  }

  /* Links de saída: variáveis, UTMs da campanha e WhatsApp. */
  function montarLink(url) {
    var final = substituir(url, true);
    if (!F.config || F.config.repassarUtm !== false) {
      try {
        var destino = new URL(final, window.location.href);
        if (/^https?:$/.test(destino.protocol) && destino.origin !== window.location.origin) {
          parametros.forEach(function (valor, chave) {
            if (/^(utm_\w+|src|sck|fbclid|gclid)$/i.test(chave) && !destino.searchParams.has(chave)) destino.searchParams.set(chave, valor);
          });
          final = destino.toString();
        }
      } catch (e) { /* link relativo ou inválido: usa como está */ }
    }
    return final;
  }
  function linkWhatsapp() {
    var numero = String((F.config && F.config.whatsapp) || '').replace(/\D/g, '');
    if (numero.length < 10) return '';
    var texto = substituir((F.config && F.config.mensagemWhatsapp) || 'Olá!');
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  function rolar() {
    var r = el.rolagem;
    window.requestAnimationFrame(function () {
      r.scrollTo({ top: r.scrollHeight, behavior: reduzirMovimento ? 'auto' : 'smooth' });
    });
  }
  function avisar(texto) {
    el.toast.textContent = texto;
    el.toast.classList.add('toast--visivel');
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { el.toast.classList.remove('toast--visivel'); }, 3200);
  }
  function digitando(sim) {
    el.digitando.hidden = !sim;
    el.status.textContent = sim ? 'digitando…' : (F.marca && F.marca.status) || 'online';
    el.status.classList.toggle('contato-status--digitando', sim);
    if (sim) rolar();
  }

  /* ----------------------------------------------------------- balões */
  function novoBalao(autor, extraClasse) {
    var linha = criar('div', 'msg msg--' + autor + ' entrar');
    if (estado.ultimoAutor !== autor) linha.classList.add('msg--cauda');
    estado.ultimoAutor = autor;
    if (depurar && autor === 'bot' && estado.etapaAtual && estado.etapaEtiquetada !== estado.etapaAtual) {
      estado.etapaEtiquetada = estado.etapaAtual;
      linha.classList.add('msg--etiquetada');
      linha.appendChild(criar('span', 'depurar-etapa', 'etapa: ' + estado.etapaAtual));
    }
    var balao = criar('div', 'balao' + (extraClasse ? ' ' + extraClasse : ''));
    linha.appendChild(balao);
    return { linha: linha, balao: balao };
  }
  function carimbo(balao, autor) {
    var h = criar('span', 'hora', hora());
    if (autor === 'eu') {
      var t = icone(['M2 12.5l4 4 8-9', 'M9.5 15.5l1 1 8-9'], 'ticks');
      h.appendChild(t);
      setTimeout(function () { t.classList.add('ticks--lido'); }, 700);
    }
    balao.appendChild(h);
  }
  function publicar(linha) {
    el.mensagens.appendChild(linha);
    rolar();
  }

  function balaoTexto(autor, texto) {
    var b = novoBalao(autor);
    var p = criar('p', 'texto');
    p.appendChild(formatar(texto));
    b.balao.appendChild(p);
    carimbo(b.balao, autor);
    publicar(b.linha);
  }

  function urlVideo(u) {
    var yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { tipo: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0&modestbranding=1&playsinline=1', vertical: /shorts\//.test(u) };
    var vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return { tipo: 'iframe', src: 'https://player.vimeo.com/video/' + vm[1] + '?dnt=1&title=0&byline=0' };
    if (/\.(mp4|webm|mov)(\?|#|$)/i.test(u)) return { tipo: 'video', src: u };
    return { tipo: 'iframe', src: u }; // embed de player (Panda Video, Vturb, Wistia...)
  }

  function balaoVideo(m) {
    var b = novoBalao('bot', 'balao--midia');
    var caixa = criar('div', 'midia-video');
    if (!m.video) {
      caixa.classList.add('midia-vazia');
      caixa.appendChild(icone(ICONES.video, 'midia-vazia-icone'));
      caixa.appendChild(criar('strong', null, 'Seu vídeo (VSL) aparece aqui'));
      caixa.appendChild(criar('span', null, 'Cole o link em fluxo.js → { video: \'...\' }'));
    } else {
      var info = urlVideo(String(m.video).trim());
      if (m.vertical || info.vertical) caixa.classList.add('midia-video--vertical');
      if (info.tipo === 'video') {
        var v = document.createElement('video');
        v.src = info.src;
        v.controls = true;
        v.playsInline = true;
        v.preload = 'metadata';
        if (m.capa) v.poster = m.capa;
        caixa.appendChild(v);
      } else {
        var f = document.createElement('iframe');
        f.src = info.src;
        f.title = m.legenda ? 'Vídeo: ' + m.legenda : 'Vídeo da Triplice Fronteria';
        f.loading = 'lazy';
        f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        caixa.appendChild(f);
      }
    }
    b.balao.appendChild(caixa);
    if (m.legenda) {
      var p = criar('p', 'texto legenda');
      p.appendChild(formatar(substituir(m.legenda)));
      b.balao.appendChild(p);
    }
    carimbo(b.balao, 'bot');
    publicar(b.linha);
  }

  function balaoImagem(m) {
    var b = novoBalao('bot', 'balao--midia');
    var img = document.createElement('img');
    img.src = m.imagem;
    img.alt = m.alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', rolar);
    b.balao.appendChild(img);
    if (m.legenda) {
      var p = criar('p', 'texto legenda');
      p.appendChild(formatar(substituir(m.legenda)));
      b.balao.appendChild(p);
    }
    carimbo(b.balao, 'bot');
    publicar(b.linha);
  }

  function balaoAudio(m) {
    var b = novoBalao('bot', 'balao--audio');
    var audio = new Audio();
    audio.preload = 'metadata';
    audio.src = m.audio;
    var botao = criar('button', 'audio-botao');
    botao.type = 'button';
    botao.setAttribute('aria-label', 'Ouvir mensagem de voz');
    botao.appendChild(icone(ICONES.play));
    var barra = criar('div', 'audio-barra');
    var progresso = criar('div', 'audio-progresso');
    barra.appendChild(progresso);
    var tempo = criar('span', 'audio-tempo', '0:00');
    var fmt = function (s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    audio.addEventListener('loadedmetadata', function () { tempo.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', function () {
      if (audio.duration) progresso.style.transform = 'scaleX(' + audio.currentTime / audio.duration + ')';
      tempo.textContent = fmt(audio.currentTime || audio.duration);
    });
    var trocar = function (tocando) {
      botao.replaceChildren(icone(tocando ? ICONES.pausa : ICONES.play));
      botao.setAttribute('aria-label', tocando ? 'Pausar mensagem de voz' : 'Ouvir mensagem de voz');
    };
    audio.addEventListener('play', function () { trocar(true); });
    audio.addEventListener('pause', function () { trocar(false); });
    audio.addEventListener('ended', function () { trocar(false); progresso.style.transform = 'scaleX(0)'; });
    botao.addEventListener('click', function () { if (audio.paused) audio.play(); else audio.pause(); });
    var player = criar('div', 'audio');
    player.append(botao, barra, tempo);
    b.balao.appendChild(player);
    carimbo(b.balao, 'bot');
    publicar(b.linha);
  }

  function balaoCartao(m) {
    var c = m.cartao || {};
    var b = novoBalao('bot', 'balao--midia');
    var link = criar(c.link ? 'a' : 'div', 'cartao');
    if (c.link) {
      link.href = montarLink(c.link);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    if (c.imagem) {
      var img = document.createElement('img');
      img.src = c.imagem;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('load', rolar);
      link.appendChild(img);
    }
    var corpo = criar('span', 'cartao-corpo');
    if (c.titulo) corpo.appendChild(criar('strong', 'cartao-titulo', substituir(c.titulo)));
    if (c.texto) corpo.appendChild(criar('span', 'cartao-texto', substituir(c.texto)));
    if (c.link) {
      try { corpo.appendChild(criar('span', 'cartao-dominio', new URL(c.link, location.href).hostname.replace(/^www\./, ''))); } catch (e) { /* ok */ }
    }
    link.appendChild(corpo);
    if (c.botao) {
      var rotulo = criar('span', 'cartao-botao', c.botao);
      rotulo.appendChild(icone(ICONES.externo));
      link.appendChild(rotulo);
    }
    b.balao.appendChild(link);
    carimbo(b.balao, 'bot');
    publicar(b.linha);
  }

  function duracaoDigitando(m) {
    if (typeof m !== 'string') return 1100 * velocidade();
    var ms = 450 + substituir(m).length * 26;
    return Math.min(2600, Math.max(700, ms)) * velocidade();
  }

  async function mostrarMensagem(m, geracao) {
    if (m && typeof m === 'object' && 'pausa' in m) {
      await esperar(Number(m.pausa) * 1000 * velocidade());
      return;
    }
    digitando(true);
    await esperar(duracaoDigitando(m));
    if (geracao !== estado.geracao) return;
    digitando(false);
    if (typeof m === 'string') balaoTexto('bot', substituir(m));
    else if (m && 'video' in m) balaoVideo(m);
    else if (m && 'imagem' in m) balaoImagem(m);
    else if (m && 'audio' in m) balaoAudio(m);
    else if (m && 'cartao' in m) balaoCartao(m);
    await esperar(260 * velocidade());
  }

  /* ----------------------------------------------------------- respostas */
  function limparAcoes() {
    el.opcoes.replaceChildren();
    el.opcoes.hidden = true;
    el.compositor.hidden = true;
    el.rodape.hidden = false;
  }

  function mostrarOpcoes(etapa, id) {
    limparAcoes();
    var titulo = criar('p', 'opcoes-dica', 'Toque em uma opção para responder');
    titulo.id = 'opcoes-dica';
    el.opcoes.appendChild(titulo);
    el.opcoes.setAttribute('aria-labelledby', 'opcoes-dica');
    var primeiro = null;
    etapa.opcoes.forEach(function (o, i) {
      var classe = 'opcao entrar' + (o.destaque ? ' opcao--destaque' : '');
      var n;
      if ('link' in o || o.whatsapp) {
        var href = o.whatsapp ? linkWhatsapp() : (o.link ? montarLink(o.link) : '');
        n = criar('a', classe);
        n.appendChild(criar('span', 'opcao-texto', substituir(o.texto)));
        if (!href) {
          n.classList.add('opcao--pendente');
          n.href = '#';
          n.setAttribute('aria-disabled', 'true');
          n.appendChild(criar('small', 'opcao-pendente', o.whatsapp ? 'WhatsApp não configurado' : 'link não configurado'));
          n.addEventListener('click', function (ev) {
            ev.preventDefault();
            avisar(o.whatsapp ? 'Coloque o número em config.whatsapp no fluxo.js.' : 'Coloque o link deste botão no fluxo.js.');
          });
        } else {
          n.href = href;
          var novaAba = o.whatsapp || o.novaAba === true;
          if (novaAba) {
            n.target = '_blank';
            n.rel = 'noopener noreferrer';
          }
          n.addEventListener('click', function () {
            if (!estado.linksUsados[o.texto]) {
              estado.linksUsados[o.texto] = true;
              if (etapa.campo) estado.respostas[etapa.campo] = o.texto;
              balaoTexto('eu', substituir(o.texto));
            }
          });
        }
        n.appendChild(icone(o.whatsapp ? ICONES.whatsapp : ICONES.externo, o.whatsapp ? 'icone-whatsapp' : null));
        if (o.whatsapp) n.classList.add('opcao--whatsapp');
      } else {
        n = criar('button', classe);
        n.type = 'button';
        n.appendChild(criar('span', 'opcao-texto', substituir(o.texto)));
        n.appendChild(icone(o.reiniciar ? ICONES.reiniciar : ICONES.seta));
        n.addEventListener('click', function () { escolher(etapa, o); });
      }
      if (!reduzirMovimento) n.style.animationDelay = i * 45 + 'ms';
      el.opcoes.appendChild(n);
      if (!primeiro) primeiro = n;
    });
    el.opcoes.hidden = false;
    rolar();
    if (estado.teclado && primeiro) primeiro.focus({ preventScroll: true });
    if (depurar) el.opcoes.dataset.etapa = id;
  }

  async function escolher(etapa, o) {
    var geracao = estado.geracao;
    limparAcoes();
    if (etapa.campo) estado.respostas[etapa.campo] = o.valor !== undefined ? o.valor : o.texto;
    balaoTexto('eu', substituir(o.texto));
    if (o.reiniciar) {
      await esperar(400);
      reiniciar();
      return;
    }
    await esperar(500 * velocidade());
    if (o.resposta) {
      await mostrarMensagem(o.resposta, geracao);
      if (geracao !== estado.geracao) return;
    }
    if (o.vai) executarEtapa(o.vai, geracao);
  }

  function mostrarEntrada(etapa) {
    limparAcoes();
    var e = etapa.entrada;
    el.rotuloCampo.textContent = e.placeholder || 'Digite sua resposta';
    el.campo.placeholder = e.placeholder || 'Digite sua resposta';
    el.campo.value = '';
    el.campo.type = e.tipo === 'email' ? 'email' : e.tipo === 'telefone' ? 'tel' : 'text';
    el.campo.autocomplete = e.campo === 'nome' ? 'given-name' : e.tipo === 'email' ? 'email' : e.tipo === 'telefone' ? 'tel' : 'off';
    el.campo.maxLength = e.maximo || 60;
    el.campo.removeAttribute('aria-invalid');
    el.compositor.hidden = false;
    el.rodape.hidden = true;
    el.compositor.onsubmit = function (ev) {
      ev.preventDefault();
      var valor = el.campo.value.trim().replace(/\s+/g, ' ');
      if (valor.length < (e.minimo || 2)) {
        el.campo.setAttribute('aria-invalid', 'true');
        avisar('Escreva sua resposta para continuar.');
        el.campo.focus();
        return;
      }
      if (e.campo === 'nome') valor = valor.replace(/(^|\s)(\p{L})/gu, function (_, s, l) { return s + l.toUpperCase(); });
      estado.respostas[e.campo] = valor;
      limparAcoes();
      balaoTexto('eu', valor);
      var geracao = estado.geracao;
      setTimeout(function () { executarEtapa(e.vai, geracao); }, 500 * velocidade());
    };
    // no computador, já deixa o cursor no campo; no celular, espera o toque (para não abrir o teclado de surpresa)
    if (window.matchMedia('(pointer: fine)').matches || estado.teclado) el.campo.focus({ preventScroll: true });
    rolar();
  }

  function mostrarFim() {
    limparAcoes();
  }

  /* ----------------------------------------------------------- etapas */
  async function executarEtapa(id, geracao) {
    if (geracao === undefined) geracao = estado.geracao;
    if (geracao !== estado.geracao) return;
    var etapa = F.etapas[id];
    if (!etapa) {
      balaoTexto('bot', 'Ops! A etapa "' + id + '" não existe no fluxo.js.');
      return;
    }
    estado.etapaAtual = id;
    var mensagens = Array.isArray(etapa.mensagens) ? etapa.mensagens : [];
    for (var i = 0; i < mensagens.length; i++) {
      if (geracao !== estado.geracao) return;
      await mostrarMensagem(mensagens[i], geracao);
    }
    if (geracao !== estado.geracao) return;
    if (etapa.liberarOpcoesApos > 0) await esperar(etapa.liberarOpcoesApos * 1000 * (depurar ? 0.05 : 1));
    if (geracao !== estado.geracao) return;
    if (Array.isArray(etapa.opcoes) && etapa.opcoes.length) mostrarOpcoes(etapa, id);
    else if (etapa.entrada) mostrarEntrada(etapa);
    else mostrarFim();
  }

  function reiniciar(irPara) {
    estado.geracao += 1;
    estado.respostas = {};
    estado.ultimoAutor = null;
    estado.etapaEtiquetada = null;
    estado.linksUsados = {};
    digitando(false);
    limparAcoes();
    el.mensagens.querySelectorAll('.msg').forEach(function (n) { n.remove(); });
    executarEtapa(irPara || F.inicio, estado.geracao);
  }

  /* ----------------------------------------------------------- depuração */
  function painelDepuracao(resultado) {
    // <details>: abre e fecha com um toque; no celular começa fechado para não cobrir a conversa
    var painel = criar('details', 'depurar');
    painel.open = window.matchMedia('(min-width: 1000px)').matches;
    var resumo = criar('summary', 'depurar-titulo', 'Depuração · ' + resultado.erros.length + ' erro(s) · ' + resultado.avisos.length + ' aviso(s)');
    if (resultado.erros.length) resumo.classList.add('depurar-titulo--erro');
    painel.appendChild(resumo);
    var lista = criar('ul', 'depurar-lista');
    resultado.erros.forEach(function (t) { lista.appendChild(criar('li', 'depurar-erro', t)); });
    resultado.avisos.forEach(function (t) { lista.appendChild(criar('li', 'depurar-aviso', t)); });
    if (!resultado.erros.length && !resultado.avisos.length) lista.appendChild(criar('li', 'depurar-ok', 'Tudo certo no fluxo.'));
    painel.appendChild(lista);
    var linha = criar('div', 'depurar-pular');
    var rotulo = criar('label', null, 'Pular para a etapa');
    rotulo.htmlFor = 'depurar-etapa';
    var select = criar('select');
    select.id = 'depurar-etapa';
    Object.keys(F.etapas || {}).forEach(function (id) {
      var op = criar('option', null, id);
      op.value = id;
      select.appendChild(op);
    });
    var ir = criar('button', 'depurar-ir', 'Ir');
    ir.type = 'button';
    ir.addEventListener('click', function () { reiniciar(select.value); });
    linha.append(rotulo, select, ir);
    painel.appendChild(linha);
    document.body.appendChild(painel);
  }

  /* ----------------------------------------------------------- início */
  function aplicarMarca() {
    var m = (F && F.marca) || {};
    if (m.nome) {
      document.querySelectorAll('[data-marca="nome"]').forEach(function (n) { n.textContent = m.nome; });
    }
    if (m.status) el.status.textContent = m.status;
    var faixa = $('faixa');
    if (m.faixa) faixa.textContent = m.faixa; else faixa.hidden = true;
    var aviso = $('aviso');
    if (m.aviso) aviso.textContent = m.aviso; else aviso.hidden = true;
    if (m.rodape) $('rodape-texto').textContent = m.rodape;
    if (m.avatar) document.querySelectorAll('[data-marca="avatar"]').forEach(function (n) { n.src = m.avatar; });
  }

  function falhaFatal(texto) {
    el.status.textContent = 'fora do ar';
    var b = novoBalao('bot', 'balao--erro');
    b.balao.appendChild(criar('p', 'texto', texto));
    el.mensagens.appendChild(b.linha);
  }

  // teclado x toque: só move o foco automaticamente para quem navega pelo teclado
  window.addEventListener('keydown', function (ev) { if (ev.key === 'Tab' || ev.key === 'Enter' || ev.key === ' ') estado.teclado = true; });
  window.addEventListener('pointerdown', function () { estado.teclado = false; });
  $('reiniciar').addEventListener('click', function () { reiniciar(); });

  if (window.__erroFluxo || !F) {
    var info = window.__erroFluxo;
    falhaFatal(info
      ? 'O arquivo fluxo.js tem um erro de digitação perto da linha ' + info.linha + ' (' + info.mensagem + '). Confira vírgulas, aspas e chaves.'
      : 'Não encontrei o arquivo fluxo.js. Ele precisa estar na mesma pasta do index.html.');
    return;
  }
  aplicarMarca();
  var resultado = window.validarFluxo ? window.validarFluxo(F) : { erros: [], avisos: [] };
  if (resultado.erros.length || resultado.avisos.length) {
    console.groupCollapsed('Fluxo da conversa: ' + resultado.erros.length + ' erro(s), ' + resultado.avisos.length + ' aviso(s)');
    resultado.erros.forEach(function (t) { console.error(t); });
    resultado.avisos.forEach(function (t) { console.warn(t); });
    console.groupEnd();
  }
  if (depurar) painelDepuracao(resultado);
  if (!F.etapas || !F.etapas[F.inicio]) {
    falhaFatal('O fluxo.js não tem a etapa inicial "' + F.inicio + '". Abra com ?depurar=1 para ver os detalhes.');
    return;
  }
  setTimeout(function () { executarEtapa(F.inicio, estado.geracao); }, 450 * velocidade());
})();
