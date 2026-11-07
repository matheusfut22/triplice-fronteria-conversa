/* Confere o fluxo.js e explica, em português, o que precisa de ajuste.
   Usado pela página (modo ?depurar=1) e pela linha de comando (ferramentas/verificar.mjs). */
(function (raiz, fabrica) {
  var f = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = f;
  else raiz.validarFluxo = f;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ACOES = ['vai', 'link', 'whatsapp', 'reiniciar'];
  var urlValida = function (u) {
    return typeof u === 'string' && /^(https?:\/\/[^\s]+|\.?\/?assets\/[^\s]+|#[\w-]*|mailto:[^\s]+|tel:[\d+]+)$/i.test(u.trim());
  };
  var numeroWhatsapp = function (F) {
    return String((F.config && F.config.whatsapp) || '').replace(/\D/g, '');
  };

  return function validarFluxo(F) {
    var erros = [];
    var avisos = [];
    if (!F || typeof F !== 'object') {
      erros.push('O fluxo.js não definiu window.FLUXO. Confira se não falta uma vírgula, aspas ou chave { }.');
      return { erros: erros, avisos: avisos };
    }
    var etapas = F.etapas && typeof F.etapas === 'object' ? F.etapas : {};
    var ids = Object.keys(etapas);
    if (!ids.length) erros.push('Nenhuma etapa encontrada em "etapas".');
    if (!etapas[F.inicio]) erros.push('A etapa inicial "' + F.inicio + '" (campo "inicio") não existe.');

    ids.forEach(function (id) {
      var e = etapas[id] || {};
      var onde = 'Etapa "' + id + '"';

      if (e.mensagens !== undefined && !Array.isArray(e.mensagens)) erros.push(onde + ': "mensagens" precisa ser uma lista entre [ ].');
      (Array.isArray(e.mensagens) ? e.mensagens : []).forEach(function (m, i) {
        var pos = onde + ', mensagem ' + (i + 1);
        if (typeof m === 'string') {
          if (!m.trim()) avisos.push(pos + ': texto vazio.');
          return;
        }
        if (!m || typeof m !== 'object') return erros.push(pos + ': formato não reconhecido.');
        if ('video' in m) {
          if (!m.video) avisos.push(pos + ': vídeo (VSL) ainda sem link. Aparece um quadro "vídeo aqui" no lugar.');
          else if (!urlValida(m.video)) erros.push(pos + ': link de vídeo inválido (precisa começar com https://).');
        } else if ('imagem' in m) {
          if (!m.imagem || !urlValida(m.imagem)) erros.push(pos + ': endereço da imagem inválido.');
          if (!m.alt) avisos.push(pos + ': imagem sem "alt" (descrição para quem usa leitor de tela).');
        } else if ('audio' in m) {
          if (!m.audio || !urlValida(m.audio)) erros.push(pos + ': endereço do áudio inválido.');
        } else if ('cartao' in m) {
          var c = m.cartao || {};
          if (!c.titulo) avisos.push(pos + ': cartão sem "titulo".');
          if (!c.link) avisos.push(pos + ': cartão ainda sem link.');
          else if (!urlValida(c.link)) erros.push(pos + ': link do cartão inválido (precisa começar com https://).');
        } else if ('pausa' in m) {
          if (typeof m.pausa !== 'number' || m.pausa < 0) erros.push(pos + ': "pausa" precisa ser um número de segundos, ex.: { pausa: 2 }.');
        } else {
          erros.push(pos + ': tipo de mensagem desconhecido (' + Object.keys(m).join(', ') + ').');
        }
      });

      var opcoes = e.opcoes;
      if (opcoes !== undefined && !Array.isArray(opcoes)) erros.push(onde + ': "opcoes" precisa ser uma lista entre [ ].');
      var temOpcoes = Array.isArray(opcoes) && opcoes.length > 0;
      if (temOpcoes && e.entrada) avisos.push(onde + ': tem "opcoes" e "entrada" ao mesmo tempo. Só os botões serão usados.');
      if (!temOpcoes && !e.entrada && !e.fim) avisos.push(onde + ': não tem botões, campo de texto nem "fim: true". A conversa para aqui.');

      (Array.isArray(opcoes) ? opcoes : []).forEach(function (o, i) {
        var pos = onde + ', botão ' + (i + 1) + (o && o.texto ? ' ("' + o.texto + '")' : '');
        if (!o || typeof o !== 'object') return erros.push(pos + ': formato não reconhecido.');
        if (!o.texto) erros.push(pos + ': falta o "texto" do botão.');
        var acoes = ACOES.filter(function (k) { return k in o; });
        if (!acoes.length) erros.push(pos + ': diga o que o botão faz: vai, link, whatsapp ou reiniciar.');
        if (acoes.length > 1) avisos.push(pos + ': tem mais de uma ação (' + acoes.join(', ') + '). Vale a primeira.');
        if ('vai' in o && !etapas[o.vai]) erros.push(pos + ': leva para a etapa "' + o.vai + '", que não existe.');
        if ('link' in o) {
          if (!o.link) avisos.push(pos + ': link ainda vazio. O botão aparece como "link não configurado".');
          else if (!urlValida(o.link.replace(/\{\w+\}/g, 'x'))) erros.push(pos + ': link inválido (precisa começar com https://).');
        }
        if (o.whatsapp && numeroWhatsapp(F).length < 10) avisos.push(pos + ': o número de WhatsApp (config.whatsapp) ainda está vazio.');
      });

      if (e.entrada) {
        if (!e.entrada.campo) erros.push(onde + ': o campo de texto precisa de "campo" (ex.: campo: \'nome\').');
        if (!etapas[e.entrada.vai]) erros.push(onde + ': o campo de texto leva para a etapa "' + e.entrada.vai + '", que não existe.');
      }
      if (e.liberarOpcoesApos !== undefined && (typeof e.liberarOpcoesApos !== 'number' || e.liberarOpcoesApos < 0)) {
        erros.push(onde + ': "liberarOpcoesApos" precisa ser um número de segundos.');
      }
    });

    // etapas que nenhum botão alcança
    var alcancadas = {};
    var fila = [F.inicio];
    while (fila.length) {
      var atual = fila.shift();
      if (alcancadas[atual] || !etapas[atual]) continue;
      alcancadas[atual] = true;
      var et = etapas[atual];
      (Array.isArray(et.opcoes) ? et.opcoes : []).forEach(function (o) { if (o && o.vai) fila.push(o.vai); });
      if (et.entrada && et.entrada.vai) fila.push(et.entrada.vai);
    }
    ids.forEach(function (id) { if (!alcancadas[id]) avisos.push('Etapa "' + id + '": nenhum botão leva até ela.'); });

    // variáveis {x} usadas sem ninguém guardar o valor
    var campos = { nome: 1, primeiroNome: 1 };
    ids.forEach(function (id) {
      var e = etapas[id] || {};
      if (e.campo) campos[e.campo] = 1;
      if (e.entrada && e.entrada.campo) campos[e.entrada.campo] = 1;
    });
    var usadas = {};
    var re = /\{([A-Za-z_]\w*)\}/g;
    var texto = JSON.stringify(F);
    var achou;
    while ((achou = re.exec(texto))) usadas[achou[1]] = 1;
    Object.keys(usadas).forEach(function (v) {
      if (!campos[v]) avisos.push('A variável {' + v + '} é usada, mas nenhuma etapa guarda esse campo (use campo: \'' + v + '\').');
    });

    if (numeroWhatsapp(F) && numeroWhatsapp(F).length < 12) avisos.push('config.whatsapp parece incompleto: use DDI + DDD + número, ex.: 5545999999999.');
    return { erros: erros, avisos: avisos };
  };
});
