/**
 * =============================
 * Loader (Carregamento Visual)
 * =============================
 * Exibe e oculta o loader premium durante requisições e processamento.
 */
function showLoader() {
  const loader = document.getElementById('customLoader');
  if (loader) loader.classList.remove('hidden');
}
function toggleLoaderVisibility(isVisible) {
  const loader = document.getElementById('customLoader');
  if (loader) {
    loader.classList.toggle('hidden', !isVisible);
  }
}
function hideLoader() {
  const loader = document.getElementById('customLoader');
  if (loader) loader.classList.add('hidden');
}

/**
 * =============================
 * Efeito Ripple Premium
 * =============================
 * Adiciona animação visual ao clicar nos botões com a classe .ripple.
 */
function addRippleEffect() {
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const circle = document.createElement('span');
      circle.className = 'ripple-effect';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size/2) + 'px';
      circle.style.top = (e.clientY - rect.top - size/2) + 'px';
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 500);
    });
  });
}

/**
 * =============================
 * Histórico Premium (CEP e Frete)
 * =============================
 * Salva, recupera e renderiza o histórico de consultas de CEP e simulações de frete.
 */
const HISTORY_KEY = 'correios-helper-history-v2';
function saveHistory(type, data) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch {}
  const now = new Date().toISOString();
  hist.unshift({ type, data, date: now });
  if (hist.length > 20) hist = hist.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
/**
 * Renderiza o dropdown do histórico.
 * Mostra consultas de CEP e simulações de frete.
 * Exibe tipo, valor, prazo, data/hora e permite repopular o formulário ao clicar.
 */
function renderHistoryDropdown() {
  const dropdown = document.getElementById('historyDropdown');
  const list = document.getElementById('historyList');
  if (!dropdown || !list) return;
  const hist = getHistory();
  if (!hist.length) {
    list.innerHTML = '<div class="text-muted text-center">Nenhum histórico ainda.</div>';
    return;
  }
  list.innerHTML = hist.map((h, i) => {
    // Utilitário para converter data ISO para local (hora:min) e data local
    function formatDateLocal(iso) {
      const d = new Date(iso);
      const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const data = d.toLocaleDateString();
      return { hora, data };
    }
    if (h.type === 'cep') {
      const { hora, data } = formatDateLocal(h.date);
      return `<div class="history-item history-cep" data-type="cep" data-value="${h.data.cep}">
        <div class="history-label">🔎 Consulta CEP</div>
        <div class="history-info"><b>${h.data.cep}</b></div>
        <div class="history-meta">${data}<span> | </span>${hora}</div>
      </div>`;
    } else if (h.type === 'frete') {
      // Busca resultado salvo do frete para mostrar tipo e valor reais
      let servico = '-';
      let valor = '-';
      let prazo = '';
      if (h.data && h.data._lastFreteResults && Array.isArray(h.data._lastFreteResults) && h.data._lastFreteResults.length > 0) {
        // Pega o melhor resultado (menor valor)
        const best = h.data._lastFreteResults[0];
        servico = best.codigo === '04510' ? 'SEDEX' : (best.codigo === '04014' ? 'PAC' : best.codigo || '-');
        valor = best.valor !== undefined ? `R$ ${Number(best.valor).toFixed(2)}` : '-';
        prazo = best.prazo ? best.prazo : '';
      } else {
        // fallback antigo
        servico = h.data.servicos ? (Array.isArray(h.data.servicos) ? h.data.servicos.join(', ') : h.data.servicos) : '-';
        if (servico === '04510') servico = 'SEDEX';
        if (servico === '04014') servico = 'PAC';
        if (servico === '04510, 04014' || servico === '04014, 04510') servico = 'SEDEX + PAC';
        valor = h.data.valorFrete || h.data.valor ? `R$ ${Number(h.data.valorFrete || h.data.valor).toFixed(2)}` : '-';
        prazo = h.data.prazo || h.data.prazoDias || '';
      }
      const { hora, data } = formatDateLocal(h.date);
      return `<div class="history-item history-frete" data-type="frete" data-value='${JSON.stringify(h.data)}'>
        <div class="history-info-row force-nowrap">
          <span class="history-cep history-cep-origem">${h.data.cepOrigem || '-'}</span>
          <span class="history-arrow">→</span>
          <span class="history-cep history-cep-destino">${h.data.cepDestino || '-'}</span>
        </div>
        <div class="history-details-row">
          <span class="history-servico-label">Tipo:</span>
          <span class="history-servico">${servico}</span>
          <span class="history-valor-label">Valor:</span>
          <span class="history-valor"><span class="history-valor-rs">R$</span> <span class="history-valor-num">${valor.replace('R$','').trim()}</span></span>
        </div>
        <div class="history-metrics">
          ${prazo ? `<span class="history-prazo">Prazo: ${prazo} dias</span>` : ''}
        </div>
        <div class="history-meta">${data}<span> | </span>${hora}</div>
      </div>`;
    }
    return '';
  }).join('') + '<div class="history-clear">Limpar histórico</div>';
}
function setupHistoryDropdown() {
  const toggle = document.getElementById('historyToggle');
  const list = document.getElementById('historyList');
  if (!toggle || !list) return;
  toggle.addEventListener('click', () => {
    list.classList.toggle('hidden');
    renderHistoryDropdown();
  });
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !list.contains(e.target)) list.classList.add('hidden');
  });
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item) {
      if (item.dataset.type === 'cep') {
        document.getElementById('cepInput').value = item.dataset.value;
      } else if (item.dataset.type === 'frete') {
        try {
          const data = JSON.parse(item.dataset.value);
          for (const k in data) {
            const inp = document.querySelector(`[name="${k}"]`);
            if (inp) inp.value = data[k];
          }
        } catch {}
      }
      list.classList.add('hidden');
    }
    if (e.target.classList.contains('history-clear')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistoryDropdown();
    }
  });
}
const $ = (sel) => document.querySelector(sel);

// Ao carregar, deixa SEDEX selecionado e aplica a lógica de seleção exclusiva/ambos
window.addEventListener('DOMContentLoaded', () => {
  addRippleEffect();
  setupHistoryDropdown();
  const sedexBtn = document.querySelector('.service-btn[data-service="04510"]');
  const pacBtn = document.querySelector('.service-btn[data-service="04014"]');
  sedexBtn.classList.add('active');
  pacBtn.classList.remove('active');

  let ambos = false;
  const selectBothBtn = document.getElementById('selectBoth');

  function updateSelection() {
    if (ambos) {
      sedexBtn.classList.add('active');
      pacBtn.classList.add('active');
    } else {
      // Garante que apenas um botão pode ficar ativo
      if (!sedexBtn.classList.contains('active') && !pacBtn.classList.contains('active')) {
        sedexBtn.classList.add('active');
      }
      if (sedexBtn.classList.contains('active')) pacBtn.classList.remove('active');
      if (pacBtn.classList.contains('active')) sedexBtn.classList.remove('active');
    }
  }

  sedexBtn.addEventListener('click', () => {
    if (ambos) return;
    // Se já está ativo, não permite desmarcar caso PAC não esteja ativo
    if (sedexBtn.classList.contains('active') && !pacBtn.classList.contains('active')) return;
    sedexBtn.classList.add('active');
    pacBtn.classList.remove('active');
    updateSelection();
  });
  pacBtn.addEventListener('click', () => {
    if (ambos) return;
    // Se já está ativo, não permite desmarcar caso SEDEX não esteja ativo
    if (pacBtn.classList.contains('active') && !sedexBtn.classList.contains('active')) return;
    pacBtn.classList.add('active');
    sedexBtn.classList.remove('active');
    updateSelection();
  });

  selectBothBtn.addEventListener('click', () => {
    ambos = !ambos;
    if (ambos) {
      sedexBtn.classList.add('active');
      pacBtn.classList.add('active');
      selectBothBtn.classList.add('active');
    } else {
      selectBothBtn.classList.remove('active');
      // Retorna para SEDEX selecionado
      sedexBtn.classList.add('active');
      pacBtn.classList.remove('active');
    }
    updateSelection();
  });

  updateSelection();
});

const cepInput = $('#cepInput');
const btnCep = $('#btnCep');
const cepResult = $('#cepResult');

const freteForm = $('#freteForm');
const freteResult = $('#freteResult');
const freteSkeleton = $('#freteSkeleton');
const exportCsvBtn = $('#exportCsv');
let lastFreteResults = null;
const clearBtn = $('#clearBtn');
const selectOnlyBtn = $('#selectOnly');
let selectOnlyMode = false;

// Alternância de tema (claro/escuro)
const themeToggle = document.getElementById('themeToggle');
function setTheme(dark){
  if(dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  themeToggle.textContent = dark ? 'Modo claro' : 'Modo escuro';
  try{ localStorage.setItem('theme-dark', dark ? '1' : '0'); }catch(e){}
}
// Inicializa o tema conforme preferência salva ou do sistema
try{
  const saved = localStorage.getItem('theme-dark');
  if(saved === null){
    // seguir preferência do sistema
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark);
  } else setTheme(saved === '1');
}catch(e){ setTheme(false); }

themeToggle.addEventListener('click', ()=> setTheme(!document.documentElement.classList.contains('dark')));

function showResult(el, html) {
  el.innerHTML = html;
  el.classList.remove('opacity-0');
  el.classList.remove('translate-y-2');
}

function hideResult(el) {
  el.classList.add('opacity-0');
  el.classList.add('translate-y-2');
  setTimeout(() => { el.innerHTML = ''; }, 300);
}

btnCep.addEventListener('click', async () => {
  showLoader();
  const cep = (cepInput.value || '').replace(/\D/g, '');
  if (!cep || cep.length !== 8) {
    showResult(cepResult, '<div class="text-red-600">CEP inválido. Use 8 dígitos.</div>');
    return;
  }

  hideResult(cepResult);
  showResult(cepResult, '<div class="text-slate-500">Buscando...</div>');

  try {
    const res = await fetch(`/api/cep/${cep}`);
    if (!res.ok) throw new Error('CEP não encontrado');
    const data = await res.json();
    const html = `
      <div class="space-y-1">
        <div class="font-medium heading-font text-primary">${data.logradouro || '-'} ${data.complemento || ''}</div>
        <div>${data.bairro || '-'}</div>
        <div>${data.localidade || '-'} - ${data.uf || '-'}</div>
        <div class="text-xs text-muted">CEP: ${data.cep || cep}</div>
      </div>
    `;
    showResult(cepResult, html);
    saveHistory('cep', { cep });
  } catch (err) {
    showResult(cepResult, `<div class="text-red-600">Erro: ${err.message}</div>`);
  } finally {
    hideLoader();
  }
});

  freteForm.addEventListener('submit', async (e) => {
    showLoader();
    e.preventDefault();
    const sedexBtn = document.querySelector('.service-btn[data-service="04510"]');
    const pacBtn = document.querySelector('.service-btn[data-service="04014"]');
    if (!sedexBtn.classList.contains('active') && !pacBtn.classList.contains('active')) {
      showResult(freteResult, '<div class="text-red-500 font-bold">Selecione pelo menos um serviço (SEDEX ou PAC) para calcular o frete.</div>');
      hideLoader();
      return;
    }
    if (freteSkeleton) freteSkeleton.classList.remove('hidden');
    if (freteResult) hideResult(freteResult);
    // ...existing code...
  const form = Object.fromEntries(new FormData(freteForm).entries());
  // Não salva mais aqui, só após obter lastFreteResults!

  // Normaliza números dos campos do formulário
  ['pesoKg','valorDeclarado','comprimentoCM'].forEach(k => {
    if (form[k]) form[k] = Number(form[k].toString().replace(',', '.')) || 0;
  });

  if (!form.cepOrigem || !form.cepDestino) {
    showResult(freteResult, '<div class="text-red-600">Preencha CEP de origem e destino.</div>');
    hideLoader();
    return;
  }

  hideResult(freteResult);
  // Exibe skeleton loader
  freteSkeleton.classList.remove('hidden');
  freteResult.classList.add('opacity-0');

  try {
  // Coleta apenas os serviços selecionados (ativos)
  const servNodes = Array.from(document.querySelectorAll('.service-btn'));
  let servicos = servNodes.filter(n => n.classList.contains('active')).map(n => n.getAttribute('data-service'));
  // Nunca envia vazio (já tem validação acima), mas se por algum bug, fallback para SEDEX
  if (servicos.length === 0) servicos = ['04510'];

  const payload = Object.assign({}, form, { servicos });

    const res = await fetch('/api/correios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no cálculo');

    // Caso fallback do servidor (agora retorna { fallback: true, results: [...] })
    freteSkeleton.classList.add('hidden');
    if (data.fallback) {
      const results = Array.isArray(data.results) ? data.results : [{ codigo: data.codigo || 'FALLBACK', service: data.service || '', valor: data.valor || 0, prazo: data.prazo || data.prazoDias }];

      // Utilitário para parsear valor (trata vírgula)
      const parseValue = (v) => Number(String(v || 0).replace(',', '.')) || 0;
      // Ordena resultados por valor crescente
      const ordered = results.slice().sort((a, b) => parseValue(a.valor) - parseValue(b.valor));

      const rows = ordered.map((r, idx) => {
        const label = r.service || r.codigo || 'Serviço';
        const valor = parseValue(r.valor).toFixed(2);
        const prazo = r.prazo || r.prazoDias || '-';
        const bestBadge = idx === 0 ? `<span class="ml-2 inline-block text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Mais barato</span>` : '';
        const highlightClass = idx === 0 ? 'ring-2 ring-emerald-300 dark:ring-emerald-600' : '';
        return `
          <div class="p-3 rounded-md bg-white/60 dark:bg-black/30 shadow-sm ${highlightClass}">
            <div class="flex justify-between items-center">
              <div class="font-medium">${label} ${bestBadge}</div>
              <div class="text-sm text-muted">Prazo: ${prazo} dias</div>
            </div>
            <div class="text-xl font-bold text-accent">R$ ${valor}</div>
            <div class="text-xs text-muted">(Resposta fallback: ${data.errorDetail || 'sem detalhe'})</div>
          </div>
        `;
      }).join('');

      lastFreteResults = ordered.map(r => ({ codigo: r.codigo || r.service || 'FALLBACK', valor: parseValue(r.valor), prazo: r.prazo }));
      // Salva histórico com resultados
      const formWithResults = { ...form, _lastFreteResults: lastFreteResults };
      saveHistory('frete', formWithResults);
      showResult(freteResult, rows);
      hideLoader();
      return;
    }

    // Formata resultados dos Correios
    if (data.results && Array.isArray(data.results)){
      const parseValue = (v) => Number(String(v || 0).replace(',', '.')) || 0;
      // Ordena resultados por valor crescente
      const ordered = data.results.slice().sort((a, b) => parseValue(a.valor) - parseValue(b.valor));

      const rows = ordered.map((r, idx) => {
        if (r.erro && r.erro !== '0'){
          return `<div class="p-2 rounded border-l-2 border-red-400 bg-red-50 text-red-700">${r.codigo}: erro ${r.erro} - ${r.msgErro || ''}</div>`;
        }
        const label = r.codigo || r.service || 'Serviço';
        const valor = parseValue(r.valor).toFixed(2);
        const prazo = r.prazo || '-';
        const bestBadge = idx === 0 ? `<span class="ml-2 inline-block text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Mais barato</span>` : '';
        const highlightClass = idx === 0 ? 'ring-2 ring-emerald-300 dark:ring-emerald-600' : '';
        return `
          <div class="p-3 rounded-md bg-white/60 dark:bg-black/30 shadow-sm ${highlightClass}">
            <div class="flex justify-between items-center">
              <div class="font-medium">${label} ${bestBadge}</div>
              <div class="text-sm text-muted">Prazo: ${prazo} dias</div>
            </div>
            <div class="text-xl font-bold text-accent">R$ ${valor}</div>
          </div>
        `;
      }).join('');

      lastFreteResults = ordered.map(r => ({ codigo: r.codigo || r.service || 'SERV', valor: parseValue(r.valor), prazo: r.prazo }));
      // Salva histórico com resultados
      const formWithResults = { ...form, _lastFreteResults: lastFreteResults };
      saveHistory('frete', formWithResults);
      showResult(freteResult, rows);
      hideLoader();
      return;
    }

    freteSkeleton.classList.add('hidden');
    showResult(freteResult, '<div class="text-red-600">Resposta inesperada dos Correios</div>');
    hideLoader();
  } catch (err) {
    freteSkeleton.classList.add('hidden');
    hideLoader();
    showResult(freteResult, `<div class="text-red-600">Erro: ${err.message}</div>`);
  }
  finally {
    if (submitBtn) submitBtn.disabled = false;
    hideLoader();
  }
});

// Alterna estado dos botões de serviço
document.querySelectorAll('.service-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

exportCsvBtn.addEventListener('click', () => {
  if (!lastFreteResults || lastFreteResults.length === 0) return alert('Nenhum resultado para exportar');
  const rows = ['codigo,valor,prazo', ...lastFreteResults.map(r => `${r.codigo},${(r.valor||0)},${r.prazo||''}`)];
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `frete-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Limpa todos os campos do formulário e resultados
clearBtn.addEventListener('click', () => {
  // clear inputs
  freteForm.querySelectorAll('input').forEach(i => i.value = '');
  // reset service buttons
  document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
  // clear results
  lastFreteResults = null;
  hideResult(freteResult);
  freteSkeleton.classList.add('hidden');
});

// Alterna modo "Selecionar Somente"
selectOnlyBtn.addEventListener('click', () => {
  selectOnlyMode = !selectOnlyMode;
  selectOnlyBtn.classList.toggle('active', selectOnlyMode);
});

// Sobrescreve handler dos botões de serviço para considerar o modo "Selecionar Somente"
document.querySelectorAll('.service-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (selectOnlyMode){
      // remove active from all and set only this
      document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    } else {
      btn.classList.toggle('active');
    }
  });
});
