// Frontend simples para consumir /api/cep/:cep e /api/frete
const $ = (sel) => document.querySelector(sel);

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

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
function setTheme(dark){
  if(dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  themeToggle.textContent = dark ? 'Modo claro' : 'Modo escuro';
  try{ localStorage.setItem('theme-dark', dark ? '1' : '0'); }catch(e){}
}
// inicializa
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
  } catch (err) {
    showResult(cepResult, `<div class="text-red-600">Erro: ${err.message}</div>`);
  }
});

freteForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  // prevent double submit
  const submitBtn = freteForm.querySelector('button[type=submit]') || freteForm.querySelector('button');
  if (submitBtn) submitBtn.disabled = true;
  const form = Object.fromEntries(new FormData(freteForm).entries());

  // normaliza números
  ['pesoKg','valorDeclarado','comprimentoCM'].forEach(k => {
    if (form[k]) form[k] = Number(form[k].toString().replace(',', '.')) || 0;
  });

  if (!form.cepOrigem || !form.cepDestino) {
    showResult(freteResult, '<div class="text-red-600">Preencha CEP de origem e destino.</div>');
    return;
  }

  hideResult(freteResult);
  // show skeleton
  freteSkeleton.classList.remove('hidden');
  freteResult.classList.add('opacity-0');

  try {
  // collect service buttons: por padrão pedimos todas as formas (PAC + SEDEX)
  // se selectOnlyMode estiver ativo, pedimos só as selecionadas
  const servNodes = Array.from(document.querySelectorAll('.service-btn'));
  let servicos = [];
  if (selectOnlyMode) {
    servicos = servNodes.filter(n => n.classList.contains('active')).map(n => n.getAttribute('data-service'));
    // se nenhum selecionado no selectOnlyMode, pedimos todas (fallback)
    if (servicos.length === 0) servicos = servNodes.map(n => n.getAttribute('data-service'));
  } else {
    // envia todos os serviços disponíveis para que o backend retorne todas as formas
    servicos = servNodes.map(n => n.getAttribute('data-service'));
  }

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

      // utilitário para parsear valor (trata vírgula)
      const parseValue = (v) => Number(String(v || 0).replace(',', '.')) || 0;
      // ordenar por valor crescente
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
      showResult(freteResult, rows);
      return;
    }

    // Formata resultados dos Correios
    if (data.results && Array.isArray(data.results)){
      const parseValue = (v) => Number(String(v || 0).replace(',', '.')) || 0;
      // ordenar por valor crescente
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
      showResult(freteResult, rows);
      return;
    }

    freteSkeleton.classList.add('hidden');
    showResult(freteResult, '<div class="text-red-600">Resposta inesperada dos Correios</div>');
  } catch (err) {
    freteSkeleton.classList.add('hidden');
    showResult(freteResult, `<div class="text-red-600">Erro: ${err.message}</div>`);
  }
  finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// service button toggle
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

// Clear all form fields and results
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

// Select-only mode toggle
selectOnlyBtn.addEventListener('click', () => {
  selectOnlyMode = !selectOnlyMode;
  selectOnlyBtn.classList.toggle('active', selectOnlyMode);
});

// override service button handler to account for selectOnlyMode
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
