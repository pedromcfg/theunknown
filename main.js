// ----- Estado base do perfil -----
const initialState = {
  passaporte: null,
  visto: null,
  dispostoVisto: null,
  been: [],
  story: '',
  numPessoas: '',
  tiposViagem: [],
  clima: null,
  bagagem: null,
  dataInicio: '',
  dataFim: '',
  theme: 'light'
};

// ----- Chaves de Local Storage -----
const PROFILE_KEY_BASE = 'theUnknownPerfilViagem';
const USERS_KEY = 'theUnknownUsers';
const ACTIVE_USER_KEY = 'theUnknownActiveUser';

let state = { ...initialState };
let activeUser = null;

function getProfileStorageKey() {
  const user = activeUser || 'guest';
  return `${PROFILE_KEY_BASE}_${user}`;
}

// Utilitário: guardar no localStorage
function saveToStorage() {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(getProfileStorageKey(), data);
  } catch (err) {
    console.error('Erro ao guardar no Local Storage', err);
  }
}

// Utilitário: carregar do localStorage
function loadFromStorage() {
  try {
    const data = localStorage.getItem(getProfileStorageKey());
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar do Local Storage', err);
    return null;
  }
}

// Utilitários: utilizadores / autenticação
function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Erro ao ler utilizadores', e);
    return {};
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao guardar utilizadores', e);
  }
}

function setActiveUser(username) {
  activeUser = username;
  if (username) {
    localStorage.setItem(ACTIVE_USER_KEY, username);
  } else {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

// Toast simples
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-brand'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto max-w-xs rounded-full px-4 py-2 text-sm text-white shadow-lg ${colors[type] || colors.info} flex items-center gap-2 animate-fade-in-up`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2', 'transition');
  }, 2300);

  setTimeout(() => {
    container.removeChild(toast);
  }, 2800);
}

// Animação básica via CSS inline (Tailwind não tem keyframe custom aqui)
const styleAnim = document.createElement('style');
styleAnim.textContent = `
.animate-fade-in-up {
  opacity: 0;
  transform: translateY(6px);
  animation: fadeInUp 0.25s ease-out forwards;
}
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
document.head.appendChild(styleAnim);

// Actualizar resumo lateral
function updateResumo() {
  const resumoPassaporte = document.getElementById('resumoPassaporte');
  const resumoVisto = document.getElementById('resumoVisto');
  const resumoClima = document.getElementById('resumoClima');
  const resumoTipoViagem = document.getElementById('resumoTipoViagem');
  const resumoDatas = document.getElementById('resumoDatas');
  const resumoBagagem = document.getElementById('resumoBagagem');
  const resumoPaisesVisitados = document.getElementById('resumoPaisesVisitados');
  const answersCount = document.getElementById('answersCount');

  let respostas = 0;

  // Passaporte
  if (state.passaporte) {
    resumoPassaporte.textContent = state.passaporte === 'sim' ? 'Tem passaporte' : 'Sem passaporte';
    respostas++;
  } else {
    resumoPassaporte.textContent = '—';
  }

  // Visto
  if (state.passaporte === 'sim') {
    if (state.visto) {
      if (state.visto === 'sim') {
        resumoVisto.textContent = 'Tem visto';
      } else if (state.dispostoVisto === 'sim') {
        resumoVisto.textContent = 'Não tem visto, mas está disposto a tirar';
      } else if (state.dispostoVisto === 'nao') {
        resumoVisto.textContent = 'Não tem visto e não está disposto a tirar';
      } else {
        resumoVisto.textContent = 'Não tem visto';
      }
      respostas++;
    } else {
      resumoVisto.textContent = '—';
    }
  } else {
    resumoVisto.textContent = '—';
  }

  // Clima
  if (state.clima) {
    const mapaClima = { quente: 'Quente', temperado: 'Temperado', frio: 'Frio' };
    resumoClima.textContent = mapaClima[state.clima] || state.clima;
    respostas++;
  } else {
    resumoClima.textContent = '—';
  }

  // Tipo de viagem
  if (state.tiposViagem.length) {
    const labelMap = {
      cultural: 'Cultural',
      solPraia: 'Sol e Praia',
      natureza: 'Natureza',
      religioso: 'Religioso',
      gastronomico: 'Gastronómico',
      aventura: 'Aventura'
    };
    const labels = state.tiposViagem.map((t) => labelMap[t] || t);
    resumoTipoViagem.textContent = labels.join(', ');
    respostas++;
  } else {
    resumoTipoViagem.textContent = '—';
  }

  // Datas
  if (state.dataInicio || state.dataFim) {
    const inicio = state.dataInicio ? new Date(state.dataInicio).toLocaleDateString('pt-PT') : '?';
    const fim = state.dataFim ? new Date(state.dataFim).toLocaleDateString('pt-PT') : '?';
    resumoDatas.textContent = `${inicio} → ${fim}`;
    respostas++;
  } else {
    resumoDatas.textContent = '—';
  }

  // Bagagem
  if (state.bagagem) {
    const bagMap = {
      mao10: 'Mala de mão 10kg',
      porao20: 'Mala porão 20kg +€',
      porao50: 'Mala porão 50kg +€'
    };
    resumoBagagem.textContent = bagMap[state.bagagem] || state.bagagem;
    respostas++;
  } else {
    resumoBagagem.textContent = '—';
  }

  // Países já visitados
  if (state.been.length) {
    resumoPaisesVisitados.textContent = state.been.join(', ');
    respostas++;
  } else {
    resumoPaisesVisitados.textContent = 'Nenhum selecionado';
  }

  // Story
  if (state.story && state.story.trim().length >= 10) {
    respostas++;
  }

  answersCount.textContent = `${respostas} resposta${respostas === 1 ? '' : 's'}`;
}

// Progresso simples baseado em campos obrigatórios
function updateProgress() {
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');

  // Campos considerados para progresso
  const checks = [
    !!state.passaporte,
    state.passaporte === 'sim' ? !!state.visto : true,
    state.passaporte === 'sim' && state.visto === 'nao' ? !!state.dispostoVisto : true,
    !!state.story && state.story.trim().length >= 20,
    state.tiposViagem.length > 0,
    !!state.clima,
    !!state.bagagem,
    !!state.dataInicio,
    !!state.dataFim
  ];

  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  const percent = Math.round((filled / total) * 100);

  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}%`;

  updateScore(percent);
}

// Score de compatibilidade (bastante simples)
function updateScore(progressPercent) {
  const scoreBadge = document.getElementById('scoreBadge');
  const recomendacoesLista = document.getElementById('recomendacoesLista');
  if (!scoreBadge || !recomendacoesLista) return;

  let baseScore = progressPercent;

  // Bónus por variedade de tipos de viagem
  baseScore += Math.min(state.tiposViagem.length * 4, 16);

  // Bónus por países já visitados
  baseScore += Math.min(state.been.length * 3, 15);

  if (state.visto === 'sim' || state.dispostoVisto === 'sim') {
    baseScore += 8;
  }

  const score = Math.max(0, Math.min(100, baseScore));

  scoreBadge.textContent = `Score: ${score}%`;

  // Recomendações simples
  recomendacoesLista.innerHTML = '';
  if (progressPercent < 30) {
    const p = document.createElement('p');
    p.className = 'text-slate-500 text-sm';
    p.textContent = 'Complete pelo menos 30% do perfil para ver recomendações.';
    recomendacoesLista.appendChild(p);
    return;
  }

  const recomendados = getRecommendedDestinations();
  if (!recomendados.length) {
    const p = document.createElement('p');
    p.className = 'text-slate-500 text-sm';
    p.textContent = 'Ainda não conseguimos encontrar destinos ideais com base no seu perfil.';
    recomendacoesLista.appendChild(p);
    return;
  }

  recomendados.forEach((dest) => {
    const item = document.createElement('div');
    item.className =
      'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex flex-col gap-0.5 dark:bg-slate-900 dark:border-slate-700';
    const title = document.createElement('div');
    title.className = 'flex justify-between text-xs font-semibold';
    title.innerHTML = `<span>${dest.nome}</span><span class="text-[0.7rem] text-slate-500">${dest.continente}</span>`;
    const meta = document.createElement('p');
    meta.className = 'text-[0.75rem] text-slate-500';
    meta.textContent = dest.descricao;
    item.appendChild(title);
    item.appendChild(meta);
    recomendacoesLista.appendChild(item);
  });
}

// Base de destinos simples
const DESTINOS = [
  {
    id: 'lisboa',
    nome: 'Lisboa',
    pais: 'Portugal',
    continente: 'Europa',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'naoPrecisa',
    descricao: 'Ideal para quem aprecia cultura, gastronomia e clima ameno.'
  },
  {
    id: 'rio',
    nome: 'Rio de Janeiro',
    pais: 'Brasil',
    continente: 'América',
    clima: 'quente',
    tipos: ['solPraia', 'aventura', 'natureza'],
    precisaVisto: 'necessita',
    descricao: 'Sol, praia e paisagens naturais impressionantes.'
  },
  {
    id: 'tokyo',
    nome: 'Tóquio',
    pais: 'Japão',
    continente: 'Ásia',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'necessita',
    descricao: 'Cultura vibrante, gastronomia única e tecnologia de ponta.'
  },
  {
    id: 'paris',
    nome: 'Paris',
    pais: 'França',
    continente: 'Europa',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'naoPrecisa',
    descricao: 'Destino clássico para cultura, arte e gastronomia.'
  },
  {
    id: 'cairo',
    nome: 'Cairo',
    pais: 'Egipto',
    continente: 'África',
    clima: 'quente',
    tipos: ['cultural', 'religioso', 'aventura'],
    precisaVisto: 'necessita',
    descricao: 'História milenar, cultura e experiências únicas no deserto.'
  }
];

function getRecommendedDestinations() {
  if (!state.clima || !state.tiposViagem.length) return [];

  // Preferências de visto
  const aceitaVistos = state.visto === 'sim' || state.dispostoVisto === 'sim';

  return DESTINOS.filter((d) => {
    if (!aceitaVistos && d.precisaVisto === 'necessita') return false;

    // Clima compatível ou neutro
    if (state.clima === 'frio' && d.clima === 'quente') return false;

    // Pelo menos um tipo de viagem em comum
    const temTipoComum = state.tiposViagem.some((t) => d.tipos.includes(t));
    if (!temTipoComum) return false;

    return true;
  });
}

// Países para a página "Países"
const COUNTRIES_DATA = [
  {
    id: 'pt',
    nome: 'Portugal',
    continente: 'Europa',
    precisaVisto: 'naoPrecisa',
    flagEmoji: '🇵🇹'
  },
  {
    id: 'es',
    nome: 'Espanha',
    continente: 'Europa',
    precisaVisto: 'naoPrecisa',
    flagEmoji: '🇪🇸'
  },
  {
    id: 'us',
    nome: 'Estados Unidos',
    continente: 'América',
    precisaVisto: 'necessita',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'br',
    nome: 'Brasil',
    continente: 'América',
    precisaVisto: 'onArrival',
    flagEmoji: '🇧🇷'
  },
  {
    id: 'jp',
    nome: 'Japão',
    continente: 'Ásia',
    precisaVisto: 'necessita',
    flagEmoji: '🇯🇵'
  },
  {
    id: 'za',
    nome: 'África do Sul',
    continente: 'África',
    precisaVisto: 'onArrival',
    flagEmoji: '🇿🇦'
  },
  {
    id: 'au',
    nome: 'Austrália',
    continente: 'Oceania',
    precisaVisto: 'necessita',
    flagEmoji: '🇦🇺'
  }
];

// Preencher tabela de países visitados (lista / Been)
function renderVisitadosTabela() {
  const tbody = document.getElementById('visitadosTabelaBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  COUNTRIES_DATA.forEach((c) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50';

    const visited = state.been.includes(c.nome);

    tr.innerHTML = `
      <td class="px-3 py-2">${c.nome}</td>
      <td class="px-3 py-2 text-slate-500">${c.continente}</td>
      <td class="px-3 py-2 text-center">
        <input
          type="checkbox"
          class="been-checkbox rounded text-brand focus:ring-brand"
          data-country="${c.nome}"
          ${visited ? 'checked' : ''}
        />
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Re-aplicar listeners para as novas checkboxes
  document.querySelectorAll('.been-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const country = e.target.getAttribute('data-country');
      if (e.target.checked) {
        if (!state.been.includes(country)) state.been.push(country);
      } else {
        state.been = state.been.filter((x) => x !== country);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
      renderWorldMap();
    });
  });
}

function computeAccessStatus(country) {
  if (state.passaporte !== 'sim') {
    return 'Restrito';
  }
  if (country.precisaVisto === 'naoPrecisa') {
    return 'Liberado';
  }
  if (country.precisaVisto === 'onArrival') {
    if (state.visto === 'sim' || state.dispostoVisto === 'sim') return 'Liberado';
    return 'Restrito';
  }
  if (country.precisaVisto === 'necessita') {
    if (state.visto === 'sim') return 'Liberado';
    if (state.dispostoVisto === 'sim') return 'Liberado';
    return 'Restrito';
  }
  return 'Restrito';
}

function renderCountriesGrid() {
  const grid = document.getElementById('countriesGrid');
  if (!grid) return;

  const filtroContinente = document.getElementById('filtroContinente').value;
  const filtroVisto = document.getElementById('filtroVisto').value;
  const filtroStatus = document.getElementById('filtroStatus').value;

  grid.innerHTML = '';

  COUNTRIES_DATA.forEach((c) => {
    const status = computeAccessStatus(c);

    if (filtroContinente && c.continente !== filtroContinente) return;
    if (filtroVisto && c.precisaVisto !== filtroVisto) return;
    if (filtroStatus && status !== filtroStatus) return;

    const card = document.createElement('article');
    card.className =
      'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2 dark:bg-slate-900 dark:border-slate-700';

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="text-2xl">${c.flagEmoji}</div>
        <span class="text-[0.7rem] px-2 py-0.5 rounded-full ${
          status === 'Liberado'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
        }">${status === 'Liberado' ? 'Livre' : 'Com restrições'}</span>
      </div>
      <div>
        <h3 class="text-sm font-semibold leading-tight">${c.nome}</h3>
        <p class="text-[0.75rem] text-slate-500">${c.continente}</p>
      </div>
      <p class="text-[0.75rem] text-slate-500 mt-1">
        Visto: ${
          c.precisaVisto === 'naoPrecisa'
            ? 'Não precisa'
            : c.precisaVisto === 'necessita'
            ? 'Necessita'
            : 'Visa on arrival'
        }
      </p>
    `;

    grid.appendChild(card);
  });
}

// Mapa estilizado do mundo com países visitados
function renderWorldMap() {
  const mapContainer = document.getElementById('worldMap');
  if (!mapContainer) return;

  mapContainer.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className =
    'w-full h-full flex flex-col gap-2 justify-between text-[0.7rem] text-slate-700 dark:text-slate-200';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 sm:grid-cols-4 gap-2 w-full h-full';

  COUNTRIES_DATA.forEach((c) => {
    const visited = state.been.includes(c.nome);
    const tile = document.createElement('div');
    tile.className =
      'flex flex-col items-center justify-center rounded-xl border text-center px-1 py-1.5 transition-colors ' +
      (visited
        ? 'bg-emerald-500/80 text-white border-emerald-600'
        : 'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700');

    tile.innerHTML = `<div class="text-lg mb-0.5">${c.flagEmoji}</div>
      <div class="leading-tight">
        <div class="font-semibold">${c.nome}</div>
        <div class="text-[0.6rem] opacity-80">${c.continente}</div>
      </div>`;

    grid.appendChild(tile);
  });

  const legend = document.createElement('div');
  legend.className = 'flex items-center justify-center gap-3 mt-1';
  legend.innerHTML = `
    <span class="inline-flex items-center gap-1.5 text-[0.7rem]">
      <span class="inline-block h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
      Visitado
    </span>
    <span class="inline-flex items-center gap-1.5 text-[0.7rem]">
      <span class="inline-block h-3 w-3 rounded-full bg-slate-300 border border-slate-400"></span>
      Ainda não visitado
    </span>
  `;

  wrapper.appendChild(grid);
  wrapper.appendChild(legend);
  mapContainer.appendChild(wrapper);
}

// Lista de países acessíveis no painel lateral
function updatePaisesAcessiveis() {
  const lista = document.getElementById('paisesAcessiveisLista');
  if (!lista) return;

  lista.innerHTML = '';

  if (state.passaporte !== 'sim') {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent = 'Indique se tem passaporte para ver os países acessíveis.';
    lista.appendChild(li);
    return;
  }

  const acessiveis = COUNTRIES_DATA.filter((c) => computeAccessStatus(c) === 'Liberado');

  if (!acessiveis.length) {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent =
      'De momento não há países liberados com base nas informações de visto fornecidas.';
    lista.appendChild(li);
    return;
  }

  acessiveis.forEach((c) => {
    const li = document.createElement('li');
    li.className =
      'flex items-center justify-between text-sm rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-900';
    li.innerHTML = `<span>${c.flagEmoji} ${c.nome}</span><span class="text-[0.7rem] text-emerald-600 dark:text-emerald-300">Livre</span>`;
    lista.appendChild(li);
  });
}

// Navegação simples entre secções
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-link');
  const homeSection = document.getElementById('homeSection');
  const paisesSection = document.getElementById('paisesSection');
  const visitadosSection = document.getElementById('visitadosSection');
  const roteirosSection = document.getElementById('roteirosSection');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');

      navButtons.forEach((b) =>
        b.classList.remove('text-brand', 'font-semibold', 'bg-brand-softer')
      );
      btn.classList.add('text-brand', 'font-semibold', 'bg-brand-softer');

      // Reset visibilidade
      homeSection.classList.add('hidden');
      paisesSection.classList.add('hidden');
      if (visitadosSection) visitadosSection.classList.add('hidden');
      if (roteirosSection) roteirosSection.classList.add('hidden');

      if (target === 'paises') {
        paisesSection.classList.remove('hidden');
        renderCountriesGrid();
      } else if (target === 'visitados') {
        if (visitadosSection) {
          visitadosSection.classList.remove('hidden');
          renderVisitadosTabela();
          renderWorldMap();
        }
      } else if (target === 'roteiros') {
        if (roteirosSection) roteirosSection.classList.remove('hidden');
      } else {
        // 'home' / perfil
        homeSection.classList.remove('hidden');
        renderCountriesGrid();
      }
    });
  });
}

// Tema (dark / light)
function applyTheme(theme) {
  const root = document.documentElement;
  const label = document.getElementById('themeLabel');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (label) {
      label.textContent = 'Escuro';
      label.nextSibling && (label.nextSibling.textContent = '🌙');
    }
  } else {
    root.classList.remove('dark');
    if (label) {
      label.textContent = 'Claro';
      label.nextSibling && (label.nextSibling.textContent = '🌞');
    }
  }

  state.theme = theme;
  saveToStorage();
}

function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });
}

// Exportar JSON
function exportProfile() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'perfil-viagem.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Sincronizar UI com estado
function syncUIFromState() {
  // Passaporte
  if (state.passaporte) {
    const radio = document.querySelector(`input[name="passaporte"][value="${state.passaporte}"]`);
    if (radio) radio.checked = true;
  }

  const vistosGroup = document.getElementById('vistosGroup');
  const vistoDispostoGroup = document.getElementById('vistoDispostoGroup');

  if (state.passaporte === 'sim') {
    vistosGroup.classList.remove('hidden');
  } else {
    vistosGroup.classList.add('hidden');
    vistoDispostoGroup.classList.add('hidden');
  }

  // Visto
  if (state.visto) {
    const radio = document.querySelector(`input[name="visto"][value="${state.visto}"]`);
    if (radio) radio.checked = true;
    if (state.visto === 'nao') {
      vistoDispostoGroup.classList.remove('hidden');
    } else {
      vistoDispostoGroup.classList.add('hidden');
    }
  }

  // Disposto a tirar visto
  if (state.dispostoVisto) {
    const radio = document.querySelector(
      `input[name="dispostoVisto"][value="${state.dispostoVisto}"]`
    );
    if (radio) radio.checked = true;
  }

  // Been checkboxes
  document.querySelectorAll('.been-checkbox').forEach((cb) => {
    const country = cb.getAttribute('data-country');
    cb.checked = state.been.includes(country);
  });

  // Story
  // (story passa a não ter input direto; mantemos no estado para futuro se necessário)

  // Num pessoas
  // quantidade de pessoas removida do questionário

  // Tipos de viagem
  document.querySelectorAll('input[name="tipoViagem"]').forEach((cb) => {
    cb.checked = state.tiposViagem.includes(cb.value);
  });

  // Clima cards
  document.querySelectorAll('.clima-card').forEach((btn) => {
    const val = btn.getAttribute('data-clima');
    if (state.clima === val) {
      btn.classList.add('border-brand', 'bg-brand-softer');
    } else {
      btn.classList.remove('border-brand', 'bg-brand-softer');
    }
  });

  // Bagagem cards
  document.querySelectorAll('.bagagem-card').forEach((btn) => {
    const val = btn.getAttribute('data-bagagem');
    if (state.bagagem === val) {
      btn.classList.add('border-brand', 'bg-brand-softer');
    } else {
      btn.classList.remove('border-brand', 'bg-brand-softer');
    }
  });

  // Datas
  const dataInicio = document.getElementById('dataInicio');
  const dataFim = document.getElementById('dataFim');
  if (dataInicio) dataInicio.value = state.dataInicio || '';
  if (dataFim) dataFim.value = state.dataFim || '';

  // Tema
  applyTheme(state.theme || 'light');

  updateResumo();
  updateProgress();
  updatePaisesAcessiveis();
  renderCountriesGrid();
  renderVisitadosTabela();
  renderWorldMap();
}

// Listeners
function setupListeners() {
  // Passaporte
  document.querySelectorAll('input[name="passaporte"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.passaporte = e.target.value;
      if (state.passaporte !== 'sim') {
        state.visto = null;
        state.dispostoVisto = null;
      }
      saveToStorage();
      syncUIFromState();
    });
  });

  // Visto
  document.querySelectorAll('input[name="visto"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.visto = e.target.value;
      if (state.visto !== 'nao') {
        state.dispostoVisto = null;
      }
      saveToStorage();
      syncUIFromState();
    });
  });

  // Disposto a tirar visto
  document.querySelectorAll('input[name="dispostoVisto"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.dispostoVisto = e.target.value;
      saveToStorage();
      syncUIFromState();
    });
  });

  // Been
  document.querySelectorAll('.been-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const country = e.target.getAttribute('data-country');
      if (e.target.checked) {
        if (!state.been.includes(country)) state.been.push(country);
      } else {
        state.been = state.been.filter((c) => c !== country);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
      updateScore(parseInt(document.getElementById('progressLabel').textContent, 10) || 0);
    });
  });

  // Story
  const storyTextarea = document.getElementById('storyTextarea');
  if (storyTextarea) {
    storyTextarea.addEventListener('input', (e) => {
      state.story = e.target.value;
      saveToStorage();
      updateResumo();
      updateProgress();
    });
  }

  // Número de pessoas
  // quantidade de pessoas removida do questionário

  // Tipos de viagem
  document.querySelectorAll('input[name="tipoViagem"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const val = e.target.value;
      if (e.target.checked) {
        if (!state.tiposViagem.includes(val)) state.tiposViagem.push(val);
      } else {
        state.tiposViagem = state.tiposViagem.filter((t) => t !== val);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
    });
  });

  // Clima
  document.querySelectorAll('.clima-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-clima');
      state.clima = state.clima === val ? null : val;
      saveToStorage();
      syncUIFromState();
    });
  });

  // Bagagem
  document.querySelectorAll('.bagagem-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-bagagem');
      state.bagagem = state.bagagem === val ? null : val;
      saveToStorage();
      syncUIFromState();
    });
  });

  // Datas
  const dataInicio = document.getElementById('dataInicio');
  const dataFim = document.getElementById('dataFim');
  if (dataInicio) {
    dataInicio.addEventListener('change', (e) => {
      state.dataInicio = e.target.value;
      saveToStorage();
      updateResumo();
      updateProgress();
    });
  }
  if (dataFim) {
    dataFim.addEventListener('change', (e) => {
      state.dataFim = e.target.value;
      saveToStorage();
      updateResumo();
      updateProgress();
    });
  }

  // Botões principais
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');
  const clearProfileBtn = document.getElementById('clearProfileBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      saveToStorage();
      showToast('Perfil guardado com sucesso!', 'success');
    });
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', () => {
      const stored = loadFromStorage();
      if (stored) {
        state = { ...state, ...stored };
        syncUIFromState();
        showToast('Perfil carregado!', 'info');
      } else {
        showToast('Nenhum perfil guardado encontrado.', 'error');
      }
    });
  }

  if (clearProfileBtn) {
    clearProfileBtn.addEventListener('click', () => {
      state = { ...initialState, theme: state.theme };
      localStorage.removeItem(getProfileStorageKey());
      syncUIFromState();
      showToast('Perfil limpo.', 'info');
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportProfile();
      showToast('Perfil exportado como JSON.', 'success');
    });
  }

  // Filtros países
  ['filtroContinente', 'filtroVisto', 'filtroStatus'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        renderCountriesGrid();
      });
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setActiveUser(null);
      state = { ...initialState, theme: state.theme };
      syncUIFromState();
      const userInfo = document.getElementById('userInfo');
      const appShell = document.getElementById('appShell');
      const authSection = document.getElementById('authSection');
      if (userInfo) userInfo.classList.add('hidden');
      if (appShell) appShell.classList.add('hidden');
      if (authSection) authSection.classList.remove('hidden');
      showToast('Sessão terminada.', 'info');
    });
  }
}

// ----- Autenticação (login / registo) -----
function setupAuth() {
  const authSection = document.getElementById('authSection');
  const appShell = document.getElementById('appShell');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const passwordConfirmGroup = document.getElementById('passwordConfirmGroup');
  const authTitle = document.getElementById('authTitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authForm = document.getElementById('authForm');
  const usernameInput = document.getElementById('authUsername');
  const passwordInput = document.getElementById('authPassword');
  const passwordConfirmInput = document.getElementById('authPasswordConfirm');
  const userInfo = document.getElementById('userInfo');
  const userNameLabel = document.getElementById('userNameLabel');

  if (
    !authSection ||
    !appShell ||
    !loginTab ||
    !registerTab ||
    !passwordConfirmGroup ||
    !authForm
  ) {
    return;
  }

  let mode = 'login'; // 'login' | 'register'

  function updateAuthUI() {
    if (mode === 'login') {
      loginTab.classList.add('bg-white', 'shadow-sm', 'text-brand');
      registerTab.classList.remove('bg-white', 'shadow-sm', 'text-brand');
      registerTab.classList.add('text-slate-500');
      passwordConfirmGroup.classList.add('hidden');
      authTitle.textContent = 'Entrar em The Unknown';
      authSubmitBtn.textContent = 'Entrar';
    } else {
      registerTab.classList.add('bg-white', 'shadow-sm', 'text-brand');
      loginTab.classList.remove('bg-white', 'shadow-sm', 'text-brand');
      loginTab.classList.add('text-slate-500');
      passwordConfirmGroup.classList.remove('hidden');
      authTitle.textContent = 'Criar conta em The Unknown';
      authSubmitBtn.textContent = 'Criar conta';
    }
  }

  loginTab.addEventListener('click', () => {
    mode = 'login';
    updateAuthUI();
  });

  registerTab.addEventListener('click', () => {
    mode = 'register';
    updateAuthUI();
  });

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showToast('Preencha utilizador e palavra-passe.', 'error');
      return;
    }

    const users = loadUsers();

    if (mode === 'register') {
      const password2 = passwordConfirmInput.value;
      if (password.length < 4) {
        showToast('A palavra-passe deve ter pelo menos 4 caracteres.', 'error');
        return;
      }
      if (password !== password2) {
        showToast('As palavras-passe não coincidem.', 'error');
        return;
      }
      if (users[username]) {
        showToast('Já existe um utilizador com esse nome.', 'error');
        return;
      }
      users[username] = { password };
      saveUsers(users);
      setActiveUser(username);
      if (userNameLabel) userNameLabel.textContent = username;
      if (userInfo) userInfo.classList.remove('hidden');
      authSection.classList.add('hidden');
      appShell.classList.remove('hidden');

      // Novo utilizador: começa com perfil vazio
      state = { ...initialState, theme: state.theme };
      saveToStorage();
      syncUIFromState();
      showToast('Conta criada com sucesso. Bem-vindo!', 'success');
    } else {
      // login
      if (!users[username] || users[username].password !== password) {
        showToast('Credenciais inválidas.', 'error');
        return;
      }
      setActiveUser(username);
      if (userNameLabel) userNameLabel.textContent = username;
      if (userInfo) userInfo.classList.remove('hidden');
      authSection.classList.add('hidden');
      appShell.classList.remove('hidden');

      // Carregar perfil desse utilizador (se existir)
      const stored = loadFromStorage();
      if (stored) {
        state = { ...state, ...stored };
      } else {
        state = { ...initialState, theme: state.theme };
      }
      syncUIFromState();
      showToast('Sessão iniciada.', 'success');
    }
  });

  updateAuthUI();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Detectar utilizador ativo
  const storedActive = localStorage.getItem(ACTIVE_USER_KEY);
  if (storedActive) {
    activeUser = storedActive;
  }

  // Tema base (antes de carregar perfil)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  state.theme = prefersDark ? 'dark' : 'light';

  // Se existir utilizador ativo, tenta carregar o perfil dele
  const storedProfile = loadFromStorage();
  if (storedProfile) {
    state = { ...state, ...storedProfile };
  }

  applyTheme(state.theme);

  setupAuth();
  setupNavigation();
  setupThemeToggle();
  setupListeners();
  syncUIFromState();
});


