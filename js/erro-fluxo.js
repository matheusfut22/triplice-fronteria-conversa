/* Carregado ANTES do fluxo.js: se houver erro de digitação nele (vírgula, aspas, chave),
   guarda a linha para a página mostrar uma mensagem clara em vez de ficar em branco. */
window.__erroFluxo = null;
window.addEventListener('error', function (ev) {
  if (ev && ev.filename && /fluxo\.js/.test(ev.filename)) {
    window.__erroFluxo = { mensagem: ev.message, linha: ev.lineno, coluna: ev.colno };
  }
});
