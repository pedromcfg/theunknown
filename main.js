// ----- Base profile state -----
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
  theme: 'light',
  viagemMisterio: {
    aeroporto: 'Aeroporto Francisco Sá Carneiro (Porto)',
    dataHora: '',
    portaEmbarque: '',
    portaAviao: '',
    fila: '',
    lugar: ''
  }
};

// ----- Local Storage keys -----
const PROFILE_KEY_BASE = 'theUnknownPerfilViagem';
const USERS_KEY = 'theUnknownUsers';
const ACTIVE_USER_KEY = 'theUnknownActiveUser';

let state = { ...initialState };
let activeUser = null;

function getProfileStorageKey() {
  const user = activeUser || 'guest';
  return `${PROFILE_KEY_BASE}_${user}`;
}

// Utility: save to localStorage
function saveToStorage() {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(getProfileStorageKey(), data);
  } catch (err) {
    console.error('Error saving to Local Storage', err);
  }
}

// Utility: load from localStorage
function loadFromStorage() {
  try {
    const data = localStorage.getItem(getProfileStorageKey());
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading from Local Storage', err);
    return null;
  }
}

// User / auth helpers
function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading users', e);
    return {};
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users', e);
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

// Simple toast
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

// Small animation helper via inline CSS
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

// Update side summary
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

  // Passport
  if (state.passaporte) {
    resumoPassaporte.textContent = state.passaporte === 'sim' ? 'Has passport' : 'No passport';
    respostas++;
  } else {
    resumoPassaporte.textContent = '—';
  }

  // Visa
  if (state.passaporte === 'sim') {
    if (state.visto) {
      if (state.visto === 'sim') {
        resumoVisto.textContent = 'Has visa';
      } else if (state.dispostoVisto === 'sim') {
        resumoVisto.textContent = 'No visa, but willing to obtain one';
      } else if (state.dispostoVisto === 'nao') {
        resumoVisto.textContent = 'No visa and not willing to obtain one';
      } else {
        resumoVisto.textContent = 'No visa';
      }
      respostas++;
    } else {
      resumoVisto.textContent = '—';
    }
  } else {
    resumoVisto.textContent = '—';
  }

  // Climate
  if (state.clima) {
    const mapaClima = { quente: 'Warm', temperado: 'Mild', frio: 'Cold' };
    resumoClima.textContent = mapaClima[state.clima] || state.clima;
    respostas++;
  } else {
    resumoClima.textContent = '—';
  }

  // Trip type
  if (state.tiposViagem.length) {
    const labelMap = {
      cultural: 'Cultural',
      solPraia: 'Sun & beach',
      natureza: 'Nature',
      religioso: 'Religious',
      gastronomico: 'Gastronomic',
      aventura: 'Adventure'
    };
    const labels = state.tiposViagem.map((t) => labelMap[t] || t);
    resumoTipoViagem.textContent = labels.join(', ');
    respostas++;
  } else {
    resumoTipoViagem.textContent = '—';
  }

  // Dates
  if (state.dataInicio || state.dataFim) {
    const inicio = state.dataInicio ? new Date(state.dataInicio).toLocaleDateString('pt-PT') : '?';
    const fim = state.dataFim ? new Date(state.dataFim).toLocaleDateString('pt-PT') : '?';
    resumoDatas.textContent = `${inicio} → ${fim}`;
    respostas++;
  } else {
    resumoDatas.textContent = '—';
  }

  // Luggage
  if (state.bagagem) {
    const bagMap = {
      mao10: 'Cabin bag 10kg',
      porao20: 'Hold luggage 20kg +€',
      porao50: 'Hold luggage 50kg +€'
    };
    resumoBagagem.textContent = bagMap[state.bagagem] || state.bagagem;
    respostas++;
  } else {
    resumoBagagem.textContent = '—';
  }

  // Visited countries
  if (state.been.length) {
    resumoPaisesVisitados.textContent = state.been.join(', ');
    respostas++;
  } else {
    resumoPaisesVisitados.textContent = 'None selected';
  }

  // Story
  if (state.story && state.story.trim().length >= 10) {
    respostas++;
  }

  answersCount.textContent = `${respostas} answer${respostas === 1 ? '' : 's'}`;
}

// Simple progress based on required fields
function updateProgress() {
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');

  // Fields considered for progress
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

// Compatibility score (simple heuristic)
function updateScore(progressPercent) {
  const scoreBadge = document.getElementById('scoreBadge');
  const recomendacoesLista = document.getElementById('recomendacoesLista');
  if (!scoreBadge || !recomendacoesLista) return;

  let baseScore = progressPercent;

  // Bonus for variety of trip types
  baseScore += Math.min(state.tiposViagem.length * 4, 16);

  // Bonus for visited countries
  baseScore += Math.min(state.been.length * 3, 15);

  if (state.visto === 'sim' || state.dispostoVisto === 'sim') {
    baseScore += 8;
  }

  const score = Math.max(0, Math.min(100, baseScore));

  scoreBadge.textContent = `Score: ${score}%`;

  // Simple recommendations
  recomendacoesLista.innerHTML = '';
  if (progressPercent < 30) {
    const p = document.createElement('p');
    p.className = 'text-slate-500 text-sm';
    p.textContent = 'Complete at least 30% of your profile to see recommendations.';
    recomendacoesLista.appendChild(p);
    return;
  }

  const recomendados = getRecommendedDestinations();
  if (!recomendados.length) {
    const p = document.createElement('p');
    p.className = 'text-slate-500 text-sm';
    p.textContent = 'We could not yet find ideal destinations based on your profile.';
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

// Simple destination base
const DESTINOS = [
  {
    id: 'lisboa',
    nome: 'Lisboa',
    pais: 'Portugal',
    continente: 'Europa',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'naoPrecisa',
    descricao: 'Ideal for travellers who enjoy culture, gastronomy and mild weather.'
  },
  {
    id: 'rio',
    nome: 'Rio de Janeiro',
    pais: 'Brasil',
    continente: 'América',
    clima: 'quente',
    tipos: ['solPraia', 'aventura', 'natureza'],
    precisaVisto: 'necessita',
    descricao: 'Sun, beach and impressive natural landscapes.'
  },
  {
    id: 'tokyo',
    nome: 'Tóquio',
    pais: 'Japão',
    continente: 'Ásia',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'necessita',
    descricao: 'Vibrant culture, unique gastronomy and cutting-edge technology.'
  },
  {
    id: 'paris',
    nome: 'Paris',
    pais: 'França',
    continente: 'Europa',
    clima: 'temperado',
    tipos: ['cultural', 'gastronomico'],
    precisaVisto: 'naoPrecisa',
    descricao: 'Classic destination for culture, art and gastronomy.'
  },
  {
    id: 'cairo',
    nome: 'Cairo',
    pais: 'Egipto',
    continente: 'África',
    clima: 'quente',
    tipos: ['cultural', 'religioso', 'aventura'],
    precisaVisto: 'necessita',
    descricao: 'Ancient history, culture and unique desert experiences.'
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

// Countries used across the app
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

// Fill visited countries table (Been)
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
        }">${status === 'Liberado' ? 'Available' : 'Unavailable'}</span>
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

// Stylised world map with visited countries
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
      Visited
    </span>
    <span class="inline-flex items-center gap-1.5 text-[0.7rem]">
      <span class="inline-block h-3 w-3 rounded-full bg-slate-300 border border-slate-400"></span>
      Not yet visited
    </span>
  `;

  wrapper.appendChild(grid);
  wrapper.appendChild(legend);
  mapContainer.appendChild(wrapper);
}

// List of accessible countries in the side panel
function updatePaisesAcessiveis() {
  const lista = document.getElementById('paisesAcessiveisLista');
  if (!lista) return;

  lista.innerHTML = '';

  if (state.passaporte !== 'sim') {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent = 'Indicate whether you have a passport to see accessible countries.';
    lista.appendChild(li);
    return;
  }

  const acessiveis = COUNTRIES_DATA.filter((c) => computeAccessStatus(c) === 'Liberado');

  if (!acessiveis.length) {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent =
      'At the moment there are no available countries based on the visa information provided.';
    lista.appendChild(li);
    return;
  }

  acessiveis.forEach((c) => {
    const li = document.createElement('li');
    li.className =
      'flex items-center justify-between text-sm rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-900';
    li.innerHTML = `<span>${c.flagEmoji} ${c.nome}</span><span class="text-[0.7rem] text-emerald-600 dark:text-emerald-300">Available</span>`;
    lista.appendChild(li);
  });
}

// Simple navigation between sections
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-link');
  const homeSection = document.getElementById('homeSection');
  const paisesSection = document.getElementById('paisesSection');
  const visitadosSection = document.getElementById('visitadosSection');

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

      if (target === 'paises') {
        paisesSection.classList.remove('hidden');
        renderCountriesGrid();
      } else if (target === 'visitados') {
        if (visitadosSection) {
          visitadosSection.classList.remove('hidden');
          renderVisitadosTabela();
          renderWorldMap();
        }
      } else {
        // 'home' / perfil
        homeSection.classList.remove('hidden');
        renderCountriesGrid();
      }
    });
  });
}

// Theme (dark / light)
function applyTheme(theme) {
  const root = document.documentElement;
  const label = document.getElementById('themeLabel');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (label) {
      label.textContent = 'Dark';
      label.nextSibling && (label.nextSibling.textContent = '🌙');
    }
  } else {
    root.classList.remove('dark');
    if (label) {
      label.textContent = 'Light';
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

// Export JSON
function exportProfile() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'travel-profile.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Sync UI from state
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
      btn.classList.add(
        'border-brand',
        'bg-brand-softer',
        'dark:bg-brand-softer',
        'text-brand'
      );
    } else {
      btn.classList.remove('border-brand', 'bg-brand-softer', 'dark:bg-brand-softer', 'text-brand');
    }
  });

  // Bagagem cards
  document.querySelectorAll('.bagagem-card').forEach((btn) => {
    const val = btn.getAttribute('data-bagagem');
    if (state.bagagem === val) {
      btn.classList.add(
        'border-brand',
        'bg-brand-softer',
        'dark:bg-brand-softer',
        'text-brand'
      );
    } else {
      btn.classList.remove('border-brand', 'bg-brand-softer', 'dark:bg-brand-softer', 'text-brand');
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
  renderViagemMisterio();
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

  // Number of people removed from questionnaire

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

  // Mystery trip
  const dataHoraInput = document.getElementById('misterioDataHora');
  const gerarMisterioBtn = document.getElementById('gerarMisterioBtn');
  if (dataHoraInput) {
    dataHoraInput.addEventListener('change', (e) => {
      state.viagemMisterio.dataHora = e.target.value;
      saveToStorage();
      renderViagemMisterio();
    });
  }
  if (gerarMisterioBtn) {
    gerarMisterioBtn.addEventListener('click', () => {
      gerarViagemMisterioAuto();
      showToast('Mystery trip details updated.', 'info');
    });
  }

  // Main buttons
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');
  const clearProfileBtn = document.getElementById('clearProfileBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      saveToStorage();
      showToast('Profile saved successfully!', 'success');
    });
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', () => {
      const stored = loadFromStorage();
      if (stored) {
        state = { ...state, ...stored };
        syncUIFromState();
        showToast('Profile loaded!', 'info');
      } else {
        showToast('No saved profile found.', 'error');
      }
    });
  }

  if (clearProfileBtn) {
    clearProfileBtn.addEventListener('click', () => {
      state = { ...initialState, theme: state.theme };
      localStorage.removeItem(getProfileStorageKey());
      syncUIFromState();
      showToast('Profile cleared.', 'info');
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportProfile();
      showToast('Profile exported as JSON.', 'success');
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
      showToast('Session ended.', 'info');
    });
  }
}

// Mystery trip: helpers
function gerarViagemMisterioAuto() {
  // Porta de embarque 1-40
  const portaEmbarque = `G${Math.floor(Math.random() * 40) + 1}`;
  // Porta do avião 1-5
  const portaAviao = String(Math.floor(Math.random() * 5) + 1);
  // Fila 1-30
  const fila = String(Math.floor(Math.random() * 30) + 1);
  // Lugar A-F
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const lugar = letras[Math.floor(Math.random() * letras.length)];

  // Data/hora sugerida: se não existir, próximo dia às 10h
  let dataHora = state.viagemMisterio.dataHora;
  if (!dataHora) {
    const agora = new Date();
    const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    amanha.setHours(10, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    const localISO = `${amanha.getFullYear()}-${pad(amanha.getMonth() + 1)}-${pad(
      amanha.getDate()
    )}T${pad(amanha.getHours())}:${pad(amanha.getMinutes())}`;
    dataHora = localISO;
  }

  state.viagemMisterio = {
    ...state.viagemMisterio,
    dataHora,
    portaEmbarque,
    portaAviao,
    fila,
    lugar
  };
  saveToStorage();
  renderViagemMisterio();
}

function renderViagemMisterio() {
  const aeroportoEl = document.getElementById('misterioAeroporto');
  const dataHoraInput = document.getElementById('misterioDataHora');
  const portaEmbarqueEl = document.getElementById('misterioPortaEmbarque');
  const portaAviaoEl = document.getElementById('misterioPortaAviao');
  const filaEl = document.getElementById('misterioFila');
  const lugarEl = document.getElementById('misterioLugar');

  if (!aeroportoEl || !dataHoraInput || !portaEmbarqueEl || !portaAviaoEl || !filaEl || !lugarEl) {
    return;
  }

  aeroportoEl.textContent = state.viagemMisterio.aeroporto;
  dataHoraInput.value = state.viagemMisterio.dataHora || '';
  portaEmbarqueEl.textContent = state.viagemMisterio.portaEmbarque || '—';
  portaAviaoEl.textContent = state.viagemMisterio.portaAviao || '—';
  filaEl.textContent = state.viagemMisterio.fila || '—';
  lugarEl.textContent = state.viagemMisterio.lugar || '—';
}

// ----- Authentication (login / register) -----
function setupAuth() {
  const authSection = document.getElementById('authSection');
  const appShell = document.getElementById('appShell');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const passwordConfirmGroup = document.getElementById('passwordConfirmGroup');
  const emailGroup = document.getElementById('emailGroup');
  const authTitle = document.getElementById('authTitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authForm = document.getElementById('authForm');
  const usernameInput = document.getElementById('authUsername');
  const emailInput = document.getElementById('authEmail');
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
    !emailGroup ||
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
      emailGroup.classList.add('hidden');
      authTitle.textContent = 'Sign in to The Unknown';
      authSubmitBtn.textContent = 'Sign in';
      // Update label for login to indicate username or email
      const usernameLabel = document.querySelector('label[for="authUsername"]');
      if (usernameLabel) usernameLabel.textContent = 'Username or Email';
    } else {
      registerTab.classList.add('bg-white', 'shadow-sm', 'text-brand');
      loginTab.classList.remove('bg-white', 'shadow-sm', 'text-brand');
      loginTab.classList.add('text-slate-500');
      passwordConfirmGroup.classList.remove('hidden');
      emailGroup.classList.remove('hidden');
      authTitle.textContent = 'Create an account in The Unknown';
      authSubmitBtn.textContent = 'Sign up';
      // Update label for register
      const usernameLabel = document.querySelector('label[for="authUsername"]');
      if (usernameLabel) usernameLabel.textContent = 'Username';
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
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput.value;

    if (!username || !password) {
      showToast('Please fill in username and password.', 'error');
      return;
    }

    const users = loadUsers();

    if (mode === 'register') {
      const password2 = passwordConfirmInput.value;
      if (password.length < 4) {
        showToast('Password must have at least 4 characters.', 'error');
        return;
      }
      if (password !== password2) {
        showToast('Passwords do not match.', 'error');
        return;
      }
      if (users[username]) {
        showToast('A user with that name already exists.', 'error');
        return;
      }
      // Check if email is already used
      if (email) {
        const emailExists = Object.keys(users).some(
          (key) => users[key].email && users[key].email.toLowerCase() === email.toLowerCase()
        );
        if (emailExists) {
          showToast('An account with that email already exists.', 'error');
          return;
        }
      }
      users[username] = { password, email: email || '' };
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
      showToast('Account created successfully. Welcome!', 'success');
    } else {
      // login - pode ser username ou email
      let foundUser = null;
      let foundUsername = null;

      // Primeiro tenta por username
      if (users[username] && users[username].password === password) {
        foundUser = users[username];
        foundUsername = username;
      } else {
        // Se não encontrar, procura por email
        for (const [key, user] of Object.entries(users)) {
          if (user.email && user.email.toLowerCase() === username.toLowerCase() && user.password === password) {
            foundUser = user;
            foundUsername = key;
            break;
          }
        }
      }

      if (!foundUser) {
        showToast('Invalid credentials.', 'error');
        return;
      }

      setActiveUser(foundUsername);
      if (userNameLabel) userNameLabel.textContent = foundUsername;
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
      showToast('Session started.', 'success');
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

  // Se houver utilizador ativo, fazer login automático
  if (activeUser) {
    const authSection = document.getElementById('authSection');
    const appShell = document.getElementById('appShell');
    const userInfo = document.getElementById('userInfo');
    const userNameLabel = document.getElementById('userNameLabel');

    if (authSection) authSection.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');
    if (userInfo) userInfo.classList.remove('hidden');
    if (userNameLabel) userNameLabel.textContent = activeUser;
  }
});


