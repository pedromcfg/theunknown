// ----- Base profile state -----
const initialState = {
  passaporte: null,
  been: [],
  theme: 'light',
  departureAirport: 'Aeroporto Francisco Sá Carneiro (Porto)',
  availabilityStart: '',
  availabilityEnd: '',
  stayDays: 1,
  tripType: '',
  climate: null,
  luggage: null,
  badges: [],
  generatedTrips: [],
  viagemMisterio: {
    aeroporto: 'Aeroporto Francisco Sá Carneiro (Porto)',
    dataHora: '',
    portaEmbarque: '',
    portaAviao: '',
    fila: '',
    lugar: '',
    returnDataHora: '',
    returnPortaEmbarque: '',
    returnPortaAviao: '',
    returnFila: '',
    returnLugar: '',
    hotelName: '',
    hotelNightly: 0,
    hotelNights: 0,
    hotelCost: 0,
    flightCost: 0,
    totalCost: 0,
    mysteryStep: 0,
    mysteryCompleted: false,
    destinationCity: '',
    landed: false,
    selectedRoutes: []
  }
};

// ----- Local Storage keys -----
const PROFILE_KEY_BASE = 'theUnknownPerfilViagem';
const USERS_KEY = 'theUnknownUsers';
const ACTIVE_USER_KEY = 'theUnknownActiveUser';

let state = { ...initialState };
let activeUser = null;

function ensureStateDefaults() {
  state.departureAirport = state.departureAirport || initialState.departureAirport;
  state.availabilityStart = state.availabilityStart || '';
  state.availabilityEnd = state.availabilityEnd || '';
  state.stayDays = Number(state.stayDays) || 1;
  state.tripType = state.tripType || '';
  state.climate = state.climate || null;
  state.luggage = state.luggage || null;
  state.badges = Array.isArray(state.badges) ? state.badges : [];
  state.generatedTrips = Array.isArray(state.generatedTrips) ? state.generatedTrips : [];
  state.viagemMisterio = {
    ...initialState.viagemMisterio,
    ...(state.viagemMisterio || {})
  };
  if (!state.viagemMisterio.aeroporto) {
    state.viagemMisterio.aeroporto = state.departureAirport;
  }
  const maxStayDays = getStayDaysMax();
  if (state.stayDays < 1) state.stayDays = 1;
  if (state.stayDays > maxStayDays) state.stayDays = maxStayDays;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getAvailabilityWindowDays() {
  if (!state.availabilityStart || !state.availabilityEnd) return null;
  const start = new Date(state.availabilityStart);
  const end = new Date(state.availabilityEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endOnly.getTime() - startOnly.getTime()) / DAY_MS) + 1;
}

function getStayDaysMax() {
  const availableDays = getAvailabilityWindowDays();
  if (!availableDays) return 5;
  return Math.max(1, Math.min(5, availableDays));
}

function formatLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function normalizeOutboundDateTime(outboundDateTime) {
  if (!outboundDateTime) return '';
  const outbound = new Date(outboundDateTime);
  if (Number.isNaN(outbound.getTime())) return '';
  // Keep outbound flights early in the day so the user can use the stay days.
  if (outbound.getHours() < 6) {
    outbound.setHours(6, 0, 0, 0);
  } else if (outbound.getHours() > 11) {
    outbound.setHours(11, 30, 0, 0);
  }
  return formatLocalDateTime(outbound);
}

function computeReturnDateTime(outboundDateTime) {
  if (!outboundDateTime) return '';
  const outbound = new Date(outboundDateTime);
  if (Number.isNaN(outbound.getTime())) return '';
  const stayOffsetDays = Math.max(0, (Number(state.stayDays) || 1) - 1);
  // Return on the last stay day between 18:00 and 23:59.
  const returnDate = new Date(outbound);
  returnDate.setDate(returnDate.getDate() + stayOffsetDays);
  // Deterministic slot based on outbound+stay, so it stays stable for the same trip.
  const seed =
    outbound.getFullYear() * 100000000 +
    (outbound.getMonth() + 1) * 1000000 +
    outbound.getDate() * 10000 +
    outbound.getHours() * 100 +
    outbound.getMinutes() +
    stayOffsetDays * 17;
  const returnHour = 18 + (Math.abs(seed) % 6); // 18..23
  const returnMinute = Math.abs(Math.floor(seed / 7)) % 60; // 00..59
  returnDate.setHours(returnHour, returnMinute, 0, 0);
  return formatLocalDateTime(returnDate);
}

function updateStayDaysUI() {
  const slider = document.getElementById('stayDaysRange');
  const value = document.getElementById('stayDaysValue');
  const hint = document.getElementById('stayDaysHint');
  const resumoEstadia = document.getElementById('resumoEstadia');
  const max = getStayDaysMax();
  const normalized = Math.min(max, Math.max(1, Number(state.stayDays) || 1));
  state.stayDays = normalized;

  if (slider) {
    slider.min = '1';
    slider.max = String(max);
    slider.value = String(normalized);
  }
  if (value) {
    value.textContent = `${normalized} day${normalized === 1 ? '' : 's'}`;
  }
  if (resumoEstadia) {
    resumoEstadia.textContent = `${normalized} day${normalized === 1 ? '' : 's'}`;
  }
  if (hint) {
    hint.textContent = `Choose your stay length. Maximum allowed by your availability: ${max} day${
      max === 1 ? '' : 's'
    }.`;
  }
}

function setupMysteryHubLayout() {
  const card = document.getElementById('mysteryCard');
  const hub = document.getElementById('mysteryHubContainer');
  const mysteryHubSection = document.getElementById('mysteryHubSection');
  if (!card || !hub) return;
  if (!hub.contains(card)) {
    hub.appendChild(card);
  }
  if (mysteryHubSection && !state.viagemMisterio.destinationCity) {
    mysteryHubSection.classList.add('hidden');
  }
}

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

function showMysteryModal() {
  const modal = document.getElementById('mysteryModal');
  if (!modal) return;
  modal.classList.remove('show');
  void modal.offsetWidth;
  modal.classList.add('show');
  setTimeout(() => {
    modal.classList.remove('show');
  }, 1650);
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
  const resumoTripType = document.getElementById('resumoTripType');
  const resumoClima = document.getElementById('resumoClima');
  const resumoBagagem = document.getElementById('resumoBagagem');
  const resumoDisponibilidade = document.getElementById('resumoDisponibilidade');
  const resumoEstadia = document.getElementById('resumoEstadia');
  const resumoDeparture = document.getElementById('resumoDeparture');
  const resumoDestino = document.getElementById('resumoDestino');
  const resumoPaisesVisitados = document.getElementById('resumoPaisesVisitados');
  const answersCount = document.getElementById('answersCount');
  if (
    !resumoPassaporte ||
    !resumoTripType ||
    !resumoClima ||
    !resumoBagagem ||
    !resumoDisponibilidade ||
    !resumoEstadia ||
    !resumoDeparture ||
    !resumoDestino
  ) {
    return;
  }

  let respostas = 0;

  resumoPassaporte.textContent = state.passaporte === 'sim' ? 'Has passport' : state.passaporte === 'nao' ? 'No passport' : '—';
  if (state.passaporte) respostas++;

  const tripTypeLabels = {
    religious: 'Religious',
    cultural: 'Cultural',
    sunBeach: 'Sun and Beach',
    nature: 'Nature',
    gastronomic: 'Gastronomic',
    adventure: 'Adventure'
  };
  resumoTripType.textContent = tripTypeLabels[state.tripType] || '—';
  if (state.tripType) respostas++;

  const climateLabels = { quente: 'Warm', temperado: 'Mild', frio: 'Cold' };
  resumoClima.textContent = climateLabels[state.climate] || '—';
  if (state.climate) respostas++;

  const bagMap = {
    mao10: 'Cabin bag 10kg',
    porao20: 'Hold luggage 20kg +€',
    porao50: 'Hold luggage 50kg +€'
  };
  resumoBagagem.textContent = bagMap[state.luggage] || '—';
  if (state.luggage) respostas++;

  if (state.availabilityStart || state.availabilityEnd) {
    const inicio = state.availabilityStart ? new Date(state.availabilityStart).toLocaleDateString('pt-PT') : '?';
    const fim = state.availabilityEnd ? new Date(state.availabilityEnd).toLocaleDateString('pt-PT') : '?';
    resumoDisponibilidade.textContent = `${inicio} → ${fim}`;
    respostas++;
  } else {
    resumoDisponibilidade.textContent = '—';
  }

  resumoEstadia.textContent = `${state.stayDays} day${state.stayDays === 1 ? '' : 's'}`;
  respostas++;

  resumoDeparture.textContent = state.departureAirport || '—';
  if (state.departureAirport) respostas++;

  if (state.viagemMisterio.destinationCity && state.viagemMisterio.landed) {
    resumoDestino.textContent = state.viagemMisterio.destinationCity;
    respostas++;
  } else if (state.viagemMisterio.destinationCity) {
    resumoDestino.textContent = 'Hidden until landing';
    respostas++;
  } else {
    resumoDestino.textContent = '—';
  }

  if (state.been.length) {
    resumoPaisesVisitados.textContent = state.been.join(', ');
    respostas++;
  } else {
    resumoPaisesVisitados.textContent = 'None selected';
  }

  answersCount.textContent = `${respostas} answer${respostas === 1 ? '' : 's'}`;
}

// Simple progress based on required fields
function updateProgress() {
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  if (!progressBar || !progressLabel) return;

  const checks = [
    !!state.passaporte,
    !!state.departureAirport,
    !!state.availabilityStart,
    !!state.availabilityEnd,
    !!state.tripType,
    !!state.luggage,
    !!state.viagemMisterio.destinationCity,
    !!state.viagemMisterio.dataHora,
    !!state.viagemMisterio.returnDataHora,
    state.viagemMisterio.landed
  ];

  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  const percent = Math.round((filled / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}%`;
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

const ROUTE_LIBRARY = {
  Rome: {
    generalRoute: ['Coliseu', 'Fórum Romano', 'Panteão', 'Fontana di Trevi', 'Piazza Navona', 'Piazza Venezia'],
    thematicRoutes: {
      religious: [
        'Basílica de São Pedro (Vaticano)',
        'Capela Sistina (Museus do Vaticano)',
        'Basílica de São João de Latrão',
        'Santa Maria Maggiore',
        'Pantheon',
        'Igreja de São Paulo Fora dos Muros'
      ],
      religiousMysterySummary:
        'Follow a clue-based path through St. Peter’s Basilica, Sistine Chapel, St. John Lateran, Santa Maria Maggiore, Pantheon, and St. Paul Outside the Walls.',
      generalMysterySummary:
        'Mystery route through Coliseu, Fórum Romano, Panteão, Fontana di Trevi, Piazza Navona and Piazza Venezia using thematic clues.'
    }
  },
  Paris: {
    generalRoute: ['Torre Eiffel', 'Museu do Louvre', 'Catedral de Notre-Dame', 'Montmartre', 'Champs-Élysées'],
    thematicRoutes: {
      gastronomic: [
        'Marché des Enfants Rouges',
        'Café de Flore',
        'Le Comptoir du Relais',
        'Ladurée',
        'Le Jules Verne'
      ],
      gastronomicMysterySummary:
        'Mystery food trail using clues that move from Eiffel Tower area to Louvre, Notre-Dame, Montmartre and Champs-Élysées.',
      generalMysterySummary:
        'General mystery route through Eiffel Tower, Louvre, Notre-Dame, Montmartre, Champs-Élysées and Arc de Triomphe.'
    }
  },
  Kyoto: {
    generalRoute: ['Arashiyama Bamboo Grove', 'Iwatayama Monkey Park', 'Katsura River'],
    thematicRoutes: {
      nature: ['Fushimi Inari Taisha', 'Kiyomizu-dera', 'Higashiyama', 'Yasaka Shrine'],
      natureMysterySummary:
        'Nature mystery route with clues that lead through Arashiyama Bamboo Grove, Iwatayama Monkey Park and Katsura River.'
    }
  },
  Tromso: {
    generalRoute: ['Catedral do Ártico', 'Ponte de Tromsø', 'Polaria', 'Rua Storgata'],
    thematicRoutes: {
      adventure: ['Catedral do Ártico', 'Ponte de Tromsø', 'Polaria', 'Rua Storgata'],
      generalMysterySummary:
        'Mystery route starting at Polaria and using clues to reach Rua Storgata, Ponte de Tromsø and Catedral do Ártico.',
      adventureMysterySummary:
        'Adventure mystery route repeating the Polaria → Storgata → Ponte de Tromsø → Catedral do Ártico sequence with adventure focus.'
    }
  },
  'Monte Carlo': {
    generalRoute: ['Praça do Casino', 'Casino de Monte Carlo', 'Porto de Mónaco (Port Hercule)', 'Palácio do Príncipe'],
    thematicRoutes: {
      sunBeach: ['Praia do Larvotto', 'Promenade du Larvotto', 'Crique des Pêcheurs'],
      generalMysterySummary:
        'Mystery route Praça do Casino → Casino de Monte-Carlo → Porto de Mónaco → Palácio do Príncipe with clues about luxury and history.',
      sunBeachMysterySummary:
        'Mystery sun & beach route Praia do Larvotto → Promenade du Larvotto → Crique des Pêcheurs with sea-themed clues.'
    }
  },
  Barcelona: {
    generalRoute: ['Sagrada Família', 'Park Güell', 'Casa Batlló', 'La Rambla', 'Barri Gòtic', 'Barceloneta Beach'],
    thematicRoutes: {
      cultural: ['Sagrada Família', 'Casa Batlló', 'La Pedrera', 'Barri Gòtic', 'Barcelona Cathedral'],
      generalMysterySummary:
        'General mystery route through Sagrada Família, Park Güell, Casa Batlló, La Rambla, Barri Gòtic and Barceloneta Beach.',
      culturalMysterySummary:
        'Cultural mystery route focusing on Casa Batlló, La Pedrera and Barri Gòtic with Gaudí-inspired clues.'
    }
  }
};

function getMysteryCluesForCity(city, tripTheme) {
  const data = ROUTE_LIBRARY[city];
  if (!data) return [];
  const general = data.generalRoute || [];
  const thematic = (data.thematicRoutes && data.thematicRoutes[tripTheme]) || [];
  const baseList = thematic.length ? thematic : general;
  return baseList.map(
    (stop, index) =>
      `Clue ${index + 1}: find the location associated with “${stop}” following the hints provided in your printed mystery booklet.`
  );
}

const DESTINATION_RULES = [
  { passaporte: 'nao', tripType: 'religious', city: 'Rome' },
  { passaporte: 'nao', tripType: 'gastronomic', city: 'Paris' },
  { passaporte: 'sim', tripType: 'nature', city: 'Kyoto' },
  { passaporte: 'nao', tripType: 'sunBeach', city: 'Monte Carlo' },
  { passaporte: 'nao', tripType: 'adventure', city: 'Tromso' },
  { passaporte: 'nao', tripType: 'cultural', city: 'Barcelona' }
];

const CITY_TO_COUNTRY = {
  Rome: 'Italy',
  Paris: 'France',
  Kyoto: 'Japan',
  'Monte Carlo': 'Monaco',
  Tromso: 'Norway',
  Barcelona: 'Spain'
};

const HOTEL_SAMPLES = {
  Rome: [
    { name: 'Hotel Trastevere Vista', nightly: 95 },
    { name: 'Roma Centro Boutique', nightly: 118 }
  ],
  Paris: [
    { name: 'Hotel Lumiere Paris', nightly: 132 },
    { name: 'Montmartre Urban Stay', nightly: 146 }
  ],
  Kyoto: [
    { name: 'Kyoto Garden Inn', nightly: 165 },
    { name: 'Arashiyama River Hotel', nightly: 182 }
  ],
  'Monte Carlo': [
    { name: 'Riviera Marina Hotel', nightly: 210 },
    { name: 'Casino District Suites', nightly: 238 }
  ],
  Tromso: [
    { name: 'Northern Lights Lodge', nightly: 156 },
    { name: 'Fjord Polar Hotel', nightly: 171 }
  ],
  Barcelona: [
    { name: 'Barri Gotic City Hotel', nightly: 124 },
    { name: 'Sagrada Urban Rooms', nightly: 138 }
  ]
};

function getFlightCost(city, luggage) {
  const baseCostByCity = {
    Rome: 320,
    Paris: 350,
    Kyoto: 980,
    'Monte Carlo': 420,
    Tromso: 640,
    Barcelona: 300
  };
  const luggageExtra = {
    mao10: 0,
    porao20: 35,
    porao50: 80
  };
  return (baseCostByCity[city] || 300) + (luggageExtra[luggage] || 0);
}

function buildHotelAndCostPreview(city) {
  const samples = HOTEL_SAMPLES[city] || [{ name: 'City Center Hotel', nightly: 120 }];
  const selected = samples[Math.floor(Math.random() * samples.length)];
  const nights = Math.max(1, Number(state.stayDays) || 1);
  const hotelCost = selected.nightly * nights;
  const flightCost = getFlightCost(city, state.luggage);
  const totalCost = hotelCost + flightCost;
  return {
    hotelName: selected.name,
    hotelNightly: selected.nightly,
    hotelNights: nights,
    hotelCost,
    flightCost,
    totalCost
  };
}

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

function renderVisitedTrips() {
  const list = document.getElementById('visitedTripsList');
  if (!list) return;

  list.innerHTML = '';

  const landedTrips = state.generatedTrips.filter((trip) => trip && trip.landedAt && trip.city);
  if (!landedTrips.length) {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent = 'No completed trips yet. Use "I landed" to register a visited city.';
    list.appendChild(li);
    return;
  }

  [...landedTrips]
    .sort((a, b) => new Date(b.landedAt).getTime() - new Date(a.landedAt).getTime())
    .forEach((trip) => {
      const li = document.createElement('li');
      li.className =
        'rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60';
      const country = trip.country || CITY_TO_COUNTRY[trip.city] || 'Unknown country';
      const hotel = trip.hotelName || 'Example Hotel';
      const hasCostData = trip.flightCost != null || trip.hotelCost != null || trip.totalCost != null;
      const flightCost = Number(trip.flightCost) || 0;
      const hotelCost = Number(trip.hotelCost) || 0;
      const totalCost = Number(trip.totalCost) || flightCost + hotelCost;
      li.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <span class="font-medium text-slate-800 dark:text-slate-100">${country} — ${trip.city}</span>
          <span class="text-xs text-slate-500">${new Date(trip.landedAt).toLocaleDateString('en-GB')}</span>
        </div>
        <div class="mt-1 text-xs text-slate-600 dark:text-slate-300">Hotel: ${hotel}</div>
        <div class="mt-1 grid grid-cols-3 gap-2 text-xs">
          <span class="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Flight: ${hasCostData ? `€${flightCost}` : '—'}</span>
          <span class="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Hotel: ${hasCostData ? `€${hotelCost}` : '—'}</span>
          <span class="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Total: ${hasCostData ? `€${totalCost}` : '—'}</span>
        </div>
      `;
      list.appendChild(li);
    });
}

function renderBadgesPanel() {
  const list = document.getElementById('badgesList');
  const countEl = document.getElementById('badgesCount');
  if (!list) return;

  list.innerHTML = '';
  const badges = Array.isArray(state.badges) ? state.badges : [];
  if (countEl) countEl.textContent = String(badges.length || 0);

  if (!badges.length) {
    const li = document.createElement('li');
    li.className = 'text-slate-500 text-sm';
    li.textContent = 'No badges unlocked yet.';
    list.appendChild(li);
    return;
  }

  [...badges]
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .forEach((badge) => {
      const li = document.createElement('li');
      li.className =
        'flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-900/60';
      const city = badge.city || 'Unknown city';
      const tripTypeLabel =
        {
          religious: 'Religious',
          cultural: 'Cultural',
          sunBeach: 'Sun and Beach',
          nature: 'Nature',
          gastronomic: 'Gastronomic',
          adventure: 'Adventure'
        }[badge.tripType] || 'General';
      const dateStr = badge.earnedAt
        ? new Date(badge.earnedAt).toLocaleDateString('en-GB')
        : '';
      li.innerHTML = `
        <div>
          <p class="font-semibold text-slate-800 dark:text-slate-100">${badge.title || 'Badge'}</p>
          <p class="text-[0.7rem] text-slate-500 dark:text-slate-300">${city} · ${tripTypeLabel}</p>
        </div>
        <div class="flex flex-col items-end">
          <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            ✦ Mystery route
          </span>
          ${
            dateStr
              ? `<span class="mt-1 text-[0.65rem] text-slate-400">${dateStr}</span>`
              : ''
          }
        </div>
      `;
      list.appendChild(li);
    });
}

function computeAccessStatus(country) {
  if (state.passaporte !== 'sim') return 'Restrito';
  return country.precisaVisto === 'necessita' ? 'Restrito' : 'Liberado';
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
  const landingSection = document.getElementById('landingSection');
  const homeSection = document.getElementById('homeSection');
  const paisesSection = document.getElementById('paisesSection');
  const visitadosSection = document.getElementById('visitadosSection');
  const logoHomeBtn = document.getElementById('logoHomeBtn');

  function showSection(target) {
    if (landingSection) landingSection.classList.add('hidden');
    homeSection.classList.add('hidden');
    paisesSection.classList.add('hidden');
    if (visitadosSection) visitadosSection.classList.add('hidden');

    if (target === 'landing') {
      if (landingSection) landingSection.classList.remove('hidden');
    } else if (target === 'paises') {
      paisesSection.classList.remove('hidden');
      renderCountriesGrid();
    } else if (target === 'visitados') {
      if (visitadosSection) {
        visitadosSection.classList.remove('hidden');
        renderVisitadosTabela();
        renderWorldMap();
        renderVisitedTrips();
      }
    } else {
      homeSection.classList.remove('hidden');
      renderCountriesGrid();
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');

      navButtons.forEach((b) =>
        b.classList.remove('text-brand', 'font-semibold', 'bg-brand-softer')
      );
      btn.classList.add('text-brand', 'font-semibold', 'bg-brand-softer');
      showSection(target === 'profile' ? 'profile' : target);
    });
  });

  if (logoHomeBtn) {
    logoHomeBtn.addEventListener('click', () => {
      navButtons.forEach((b) =>
        b.classList.remove('text-brand', 'font-semibold', 'bg-brand-softer')
      );
      showSection('landing');
    });
  }
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
  ensureStateDefaults();

  // Passport
  if (state.passaporte) {
    const radio = document.querySelector(`input[name="passaporte"][value="${state.passaporte}"]`);
    if (radio) radio.checked = true;
  }

  // Been checkboxes
  document.querySelectorAll('.been-checkbox').forEach((cb) => {
    const country = cb.getAttribute('data-country');
    cb.checked = state.been.includes(country);
  });

  const departureAirport = document.getElementById('departureAirport');
  if (departureAirport) departureAirport.value = state.departureAirport || '';

  const availabilityStart = document.getElementById('availabilityStart');
  const availabilityEnd = document.getElementById('availabilityEnd');
  if (availabilityStart) availabilityStart.value = state.availabilityStart || '';
  if (availabilityEnd) availabilityEnd.value = state.availabilityEnd || '';
  updateStayDaysUI();

  document.querySelectorAll('input[name="tripType"]').forEach((radio) => {
    radio.checked = radio.value === state.tripType;
  });

  // Climate cards
  document.querySelectorAll('.clima-card').forEach((btn) => {
    const val = btn.getAttribute('data-clima');
    if (state.climate === val) {
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

  // Luggage cards
  document.querySelectorAll('.bagagem-card').forEach((btn) => {
    const val = btn.getAttribute('data-bagagem');
    if (state.luggage === val) {
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

  // Tema
  applyTheme(state.theme || 'light');

  updateResumo();
  updateProgress();
  updatePaisesAcessiveis();
  renderCountriesGrid();
  renderVisitadosTabela();
  renderWorldMap();
  renderVisitedTrips();
  renderBadgesPanel();
  renderViagemMisterio();
  renderRouteContent();
}

// Listeners
function setupListeners() {
  // Passport
  document.querySelectorAll('input[name="passaporte"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.passaporte = e.target.value;
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
      renderRouteContent();
    });
  });

  const departureAirport = document.getElementById('departureAirport');
  if (departureAirport) {
    departureAirport.addEventListener('change', (e) => {
      state.departureAirport = e.target.value;
      state.viagemMisterio.aeroporto = e.target.value;
      saveToStorage();
      updateResumo();
      renderViagemMisterio();
    });
  }

  const availabilityStart = document.getElementById('availabilityStart');
  const availabilityEnd = document.getElementById('availabilityEnd');
  if (availabilityStart) {
    availabilityStart.addEventListener('change', (e) => {
      state.availabilityStart = e.target.value;
      updateStayDaysUI();
      if (state.viagemMisterio.dataHora) {
        state.viagemMisterio.returnDataHora = computeReturnDateTime(state.viagemMisterio.dataHora);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
      renderViagemMisterio();
    });
  }
  if (availabilityEnd) {
    availabilityEnd.addEventListener('change', (e) => {
      state.availabilityEnd = e.target.value;
      updateStayDaysUI();
      if (state.viagemMisterio.dataHora) {
        state.viagemMisterio.returnDataHora = computeReturnDateTime(state.viagemMisterio.dataHora);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
      renderViagemMisterio();
    });
  }
  const stayDaysRange = document.getElementById('stayDaysRange');
  if (stayDaysRange) {
    stayDaysRange.addEventListener('input', (e) => {
      state.stayDays = Number(e.target.value) || 1;
      updateStayDaysUI();
      if (state.viagemMisterio.dataHora) {
        state.viagemMisterio.returnDataHora = computeReturnDateTime(state.viagemMisterio.dataHora);
        renderViagemMisterio();
      }
      saveToStorage();
      updateResumo();
      updateProgress();
    });
  }

  // Trip type
  document.querySelectorAll('input[name="tripType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.tripType = e.target.value;
      saveToStorage();
      updateResumo();
      updateProgress();
      renderRouteContent();
    });
  });

  // Climate
  document.querySelectorAll('.clima-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-clima');
      state.climate = state.climate === val ? null : val;
      saveToStorage();
      syncUIFromState();
    });
  });

  // Luggage
  document.querySelectorAll('.bagagem-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-bagagem');
      state.luggage = state.luggage === val ? null : val;
      saveToStorage();
      syncUIFromState();
    });
  });

  // Mystery trip
  const dataHoraInput = document.getElementById('misterioDataHora');
  const landedBtn = document.getElementById('landedBtn');
  const heroGenerateBtn = document.getElementById('heroGenerateBtn');
  const mysteryHubSection = document.getElementById('mysteryHubSection');

  if (dataHoraInput) {
    dataHoraInput.addEventListener('change', (e) => {
      const normalizedOutbound = normalizeOutboundDateTime(e.target.value);
      state.viagemMisterio.dataHora = normalizedOutbound;
      state.viagemMisterio.returnDataHora = computeReturnDateTime(normalizedOutbound);
      if (normalizedOutbound !== e.target.value) {
        e.target.value = normalizedOutbound;
      }
      saveToStorage();
      renderViagemMisterio();
      updateResumo();
    });
  }
  if (heroGenerateBtn) {
    heroGenerateBtn.addEventListener('click', () => {
      const created = gerarViagemMisterioAuto();
      if (!created) return;
      if (mysteryHubSection) mysteryHubSection.classList.remove('hidden');
      updateResumo();
      updateProgress();
      showToast('Random destination generated.', 'success');
    });
  }
  if (landedBtn) {
    landedBtn.addEventListener('click', () => {
      if (!state.viagemMisterio.destinationCity) {
        showToast('Generate a trip first.', 'error');
        return;
      }
      if (state.viagemMisterio.landed) {
        showToast('This trip is already marked as landed.', 'info');
        return;
      }
      state.viagemMisterio.landed = true;
      const landedCity = state.viagemMisterio.destinationCity;
      const landedCountry = CITY_TO_COUNTRY[landedCity] || 'Unknown country';
      state.generatedTrips.push({
        city: landedCity,
        country: landedCountry,
        departureAirport: state.viagemMisterio.aeroporto,
        flightDate: state.viagemMisterio.dataHora,
        returnFlightDate: state.viagemMisterio.returnDataHora,
        hotelName: state.viagemMisterio.hotelName,
        hotelNightly: state.viagemMisterio.hotelNightly,
        hotelNights: state.viagemMisterio.hotelNights,
        hotelCost: state.viagemMisterio.hotelCost,
        flightCost: state.viagemMisterio.flightCost,
        totalCost: state.viagemMisterio.totalCost,
        landedAt: new Date().toISOString()
      });
      saveToStorage();
      landedBtn.classList.add('landing-pop');
      setTimeout(() => landedBtn.classList.remove('landing-pop'), 500);
      showMysteryModal();
      renderViagemMisterio();
      renderRouteContent();
      renderVisitedTrips();
      updateResumo();
      updateProgress();
      showToast('Landing confirmed. Routes unlocked.', 'success');
    });
  }

  // Main buttons
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');
  const clearProfileBtn = document.getElementById('clearProfileBtn');
  const clearTripsBtn = document.getElementById('clearTripsBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      saveToStorage();
      renderBadgesPanel();
      showToast('Profile saved successfully!', 'success');
    });
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', () => {
      const stored = loadFromStorage();
      if (stored) {
        state = { ...state, ...stored };
        ensureStateDefaults();
        syncUIFromState();
        renderBadgesPanel();
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

  if (clearTripsBtn) {
    clearTripsBtn.addEventListener('click', () => {
      state.generatedTrips = [];
      state.viagemMisterio = {
        ...initialState.viagemMisterio,
        aeroporto: state.departureAirport
      };
      saveToStorage();
      syncUIFromState();
      showToast('All generated trips were deleted.', 'info');
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
  if (!state.availabilityStart || !state.availabilityEnd) {
    showToast('Set your availability dates first.', 'error');
    return false;
  }

  const startDate = new Date(state.availabilityStart);
  const endDate = new Date(state.availabilityEnd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    showToast('Invalid availability range.', 'error');
    return false;
  }
  const stayDays = Math.min(getStayDaysMax(), Math.max(1, Number(state.stayDays) || 1));
  state.stayDays = stayDays;

  const matchedRule = DESTINATION_RULES.find(
    (r) => r.passaporte === state.passaporte && r.tripType === state.tripType
  );
  const cities = Object.keys(ROUTE_LIBRARY);
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const selectedCity = matchedRule ? matchedRule.city : randomCity;

  // Gate 1-40
  const portaEmbarque = `G${Math.floor(Math.random() * 40) + 1}`;
  // Aircraft door 1-5
  const portaAviao = String(Math.floor(Math.random() * 5) + 1);
  // Row 1-30
  const fila = String(Math.floor(Math.random() * 30) + 1);
  // Seat A-F
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const lugar = letras[Math.floor(Math.random() * letras.length)];

  // Outbound day must leave enough room for return on the last day at 23:59.
  const firstOutboundDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const lastOutboundDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  lastOutboundDay.setDate(lastOutboundDay.getDate() - (stayDays - 1));
  if (lastOutboundDay < firstOutboundDay) {
    showToast('Availability is too short for the selected stay length.', 'error');
    return false;
  }

  const daySpan = Math.floor((lastOutboundDay.getTime() - firstOutboundDay.getTime()) / DAY_MS);
  const dayOffset = Math.floor(Math.random() * (daySpan + 1));
  const selectedDate = new Date(firstOutboundDay);
  selectedDate.setDate(selectedDate.getDate() + dayOffset);
  // Early outbound window: 06:00 to 11:59.
  const outboundHour = 6 + Math.floor(Math.random() * 6);
  const outboundMinute = Math.floor(Math.random() * 60);
  selectedDate.setHours(outboundHour, outboundMinute, 0, 0);
  const localISO = normalizeOutboundDateTime(formatLocalDateTime(selectedDate));
  const returnISO = computeReturnDateTime(localISO);

  const returnPortaEmbarque = `G${Math.floor(Math.random() * 40) + 1}`;
  const returnPortaAviao = String(Math.floor(Math.random() * 5) + 1);
  const returnFila = String(Math.floor(Math.random() * 30) + 1);
  const returnLugar = letras[Math.floor(Math.random() * letras.length)];
  const pricingPreview = buildHotelAndCostPreview(selectedCity);

  state.viagemMisterio = {
    ...state.viagemMisterio,
    aeroporto: state.departureAirport,
    dataHora: localISO,
    portaEmbarque,
    portaAviao,
    fila,
    lugar,
    returnDataHora: returnISO,
    returnPortaEmbarque,
    returnPortaAviao,
    returnFila,
    returnLugar,
    hotelName: pricingPreview.hotelName,
    hotelNightly: pricingPreview.hotelNightly,
    hotelNights: pricingPreview.hotelNights,
    hotelCost: pricingPreview.hotelCost,
    flightCost: pricingPreview.flightCost,
    totalCost: pricingPreview.totalCost,
    mysteryStep: 0,
    mysteryCompleted: false,
    destinationCity: selectedCity,
    landed: false,
    selectedRoutes: []
  };
  saveToStorage();
  renderViagemMisterio();
  renderRouteContent();
  return true;
}

function renderViagemMisterio() {
  const departureSelect = document.getElementById('departureAirport');
  const aeroportoEl = document.getElementById('misterioAeroporto');
  const destinoEl = document.getElementById('misterioDestino');
  const dataHoraInput = document.getElementById('misterioDataHora');
  const portaEmbarqueEl = document.getElementById('misterioPortaEmbarque');
  const portaAviaoEl = document.getElementById('misterioPortaAviao');
  const filaEl = document.getElementById('misterioFila');
  const lugarEl = document.getElementById('misterioLugar');
  const returnDataHoraEl = document.getElementById('misterioReturnDataHora');
  const returnPortaEmbarqueEl = document.getElementById('misterioReturnPortaEmbarque');
  const returnPortaAviaoEl = document.getElementById('misterioReturnPortaAviao');
  const returnFilaEl = document.getElementById('misterioReturnFila');
  const returnLugarEl = document.getElementById('misterioReturnLugar');
  const returnFlightStatusLabel = document.getElementById('returnFlightStatusLabel');
  const flightStatusLabel = document.getElementById('flightStatusLabel');
  const landedBtn = document.getElementById('landedBtn');

  const summaryFlightDate = document.getElementById('summaryFlightDate');
  const summaryReturnFlightDate = document.getElementById('summaryReturnFlightDate');
  const summaryGate = document.getElementById('summaryGate');
  const summaryReturnGate = document.getElementById('summaryReturnGate');
  const summaryDoor = document.getElementById('summaryDoor');
  const summaryReturnDoor = document.getElementById('summaryReturnDoor');
  const summarySeat = document.getElementById('summarySeat');
  const summaryReturnSeat = document.getElementById('summaryReturnSeat');
  const mysteryHotelName = document.getElementById('mysteryHotelName');
  const mysteryHotelNights = document.getElementById('mysteryHotelNights');
  const mysteryHotelCost = document.getElementById('mysteryHotelCost');
  const mysteryFlightCost = document.getElementById('mysteryFlightCost');
  const mysteryTotalCost = document.getElementById('mysteryTotalCost');

  if (
    !aeroportoEl ||
    !destinoEl ||
    !dataHoraInput ||
    !portaEmbarqueEl ||
    !portaAviaoEl ||
    !filaEl ||
    !lugarEl
  ) {
    return;
  }

  if (departureSelect) departureSelect.value = state.departureAirport;
  aeroportoEl.textContent = state.viagemMisterio.aeroporto;
  destinoEl.textContent = state.viagemMisterio.destinationCity
    ? state.viagemMisterio.landed
      ? state.viagemMisterio.destinationCity
      : 'Hidden until landing'
    : 'Hidden until landing';
  dataHoraInput.value = state.viagemMisterio.dataHora || '';
  portaEmbarqueEl.textContent = state.viagemMisterio.portaEmbarque || '—';
  portaAviaoEl.textContent = state.viagemMisterio.portaAviao || '—';
  filaEl.textContent = state.viagemMisterio.fila || '—';
  lugarEl.textContent = state.viagemMisterio.lugar || '—';
  if (returnDataHoraEl) returnDataHoraEl.value = state.viagemMisterio.returnDataHora || '';
  if (returnPortaEmbarqueEl) returnPortaEmbarqueEl.textContent = state.viagemMisterio.returnPortaEmbarque || '—';
  if (returnPortaAviaoEl) returnPortaAviaoEl.textContent = state.viagemMisterio.returnPortaAviao || '—';
  if (returnFilaEl) returnFilaEl.textContent = state.viagemMisterio.returnFila || '—';
  if (returnLugarEl) returnLugarEl.textContent = state.viagemMisterio.returnLugar || '—';
  if (flightStatusLabel) {
    flightStatusLabel.textContent = state.viagemMisterio.landed ? 'Landed' : 'Not landed';
  }
  if (returnFlightStatusLabel) {
    returnFlightStatusLabel.textContent = state.viagemMisterio.returnDataHora ? 'Planned' : '—';
  }
  if (landedBtn) {
    landedBtn.classList.remove('hidden');
    landedBtn.classList.remove('opacity-0');
    landedBtn.style.display = 'inline-flex';
  }

  if (summaryFlightDate) summaryFlightDate.textContent = state.viagemMisterio.dataHora || '—';
  if (summaryReturnFlightDate) summaryReturnFlightDate.textContent = state.viagemMisterio.returnDataHora || '—';
  if (summaryGate) summaryGate.textContent = state.viagemMisterio.portaEmbarque || '—';
  if (summaryReturnGate) summaryReturnGate.textContent = state.viagemMisterio.returnPortaEmbarque || '—';
  if (summaryDoor) summaryDoor.textContent = state.viagemMisterio.portaAviao || '—';
  if (summaryReturnDoor) summaryReturnDoor.textContent = state.viagemMisterio.returnPortaAviao || '—';
  if (summarySeat) {
    summarySeat.textContent =
      state.viagemMisterio.fila && state.viagemMisterio.lugar
        ? `${state.viagemMisterio.fila}${state.viagemMisterio.lugar}`
        : '—';
  }
  if (summaryReturnSeat) {
    summaryReturnSeat.textContent =
      state.viagemMisterio.returnFila && state.viagemMisterio.returnLugar
        ? `${state.viagemMisterio.returnFila}${state.viagemMisterio.returnLugar}`
        : '—';
  }
  if (mysteryHotelName) mysteryHotelName.textContent = state.viagemMisterio.hotelName || '—';
  if (mysteryHotelNights) mysteryHotelNights.textContent = state.viagemMisterio.hotelNights || '—';
  if (mysteryHotelCost) mysteryHotelCost.textContent = state.viagemMisterio.hotelCost ? `€${state.viagemMisterio.hotelCost}` : '—';
  if (mysteryFlightCost) mysteryFlightCost.textContent = state.viagemMisterio.flightCost ? `€${state.viagemMisterio.flightCost}` : '—';
  if (mysteryTotalCost) mysteryTotalCost.textContent = state.viagemMisterio.totalCost ? `€${state.viagemMisterio.totalCost}` : '—';

  const summaryCost = document.getElementById('summaryCost');
  if (summaryCost) {
    if (state.viagemMisterio.totalCost) {
      summaryCost.textContent = `€${state.viagemMisterio.totalCost}`;
    } else {
      const fallback = getFlightCost(state.viagemMisterio.destinationCity, state.luggage);
      summaryCost.textContent = `€${fallback}`;
    }
  }
}

function renderRouteContent() {
  const container = document.getElementById('routeContent');
  if (!container) return;

  const city = state.viagemMisterio.destinationCity;
  if (!city) {
    container.textContent = 'Generate your trip first. Routes are unlocked after landing.';
    return;
  }

  if (!state.viagemMisterio.landed) {
    container.innerHTML = `
      <p class="text-amber-600 dark:text-amber-300 font-medium">Routes locked.</p>
      <p class="mt-1 text-sm">Press "I landed" to reveal destination and unlock routes.</p>
    `;
    return;
  }

  const cityData = ROUTE_LIBRARY[city];
  if (!cityData) {
    container.textContent = 'No route data for this city yet.';
    return;
  }

  const tripTheme = state.tripType;
  const thematic = cityData.thematicRoutes || {};
  const themedRoute = thematic[tripTheme];

  const mysteryKeyForTheme = tripTheme ? `${tripTheme}MysterySummary` : null;
  const themedMysterySummary =
    (mysteryKeyForTheme && thematic[mysteryKeyForTheme]) || thematic.generalMysterySummary || null;

  const generalList = (cityData.generalRoute || [])
    .map((stop) => `<li class="flex items-start gap-2"><span class="mt-[3px] h-1.5 w-1.5 rounded-full bg-brand"></span><span>${stop}</span></li>`)
    .join('');

  const themedList = (themedRoute || [])
    .map((stop) => `<li class="flex items-start gap-2"><span class="mt-[3px] h-1.5 w-1.5 rounded-full bg-amber-500"></span><span>${stop}</span></li>`)
    .join('');

  const cards = [];

  cards.push(`
    <article class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <h4 class="font-semibold mb-1">General route</h4>
      ${
        generalList
          ? `<ul class="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-200">${generalList}</ul>`
          : '<p class="mt-1 text-sm text-slate-500">No general route defined yet.</p>'
      }
    </article>
  `);

  if (themedRoute) {
    cards.push(`
      <article class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
        <h4 class="font-semibold mb-1">Trip-type route</h4>
        <p class="text-xs uppercase tracking-wide text-slate-500 mb-1">
          Based on your selected trip type: <span class="font-semibold">${tripTheme || '—'}</span>
        </p>
        <ul class="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          ${themedList}
        </ul>
      </article>
    `);
  }

  if (themedMysterySummary) {
    cards.push(`
      <article class="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-3 sm:p-4 text-slate-50 shadow-lg">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),transparent_55%)]"></div>
        <div class="relative flex items-center justify-between gap-2 mb-2">
          <div>
            <h4 class="font-semibold mb-0.5 text-amber-200">Mystery route (with clues)</h4>
            <p class="text-[0.7rem] text-slate-300 max-w-xs">
              Turn your itinerary into a small game. Follow the clues and unlock a badge at the end.
            </p>
          </div>
          <div class="flex flex-col items-end text-right">
            <span class="inline-flex items-center rounded-full bg-amber-500/90 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-950 shadow">
              <span class="mr-1" aria-hidden="true">★</span> Mystery
            </span>
          </div>
        </div>
        <div id="mysteryGameInner" class="relative mt-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2.5 text-xs text-slate-100">
          <!-- filled by JS below -->
        </div>
      </article>
    `);
  }

  container.innerHTML = `<div class="grid gap-3 sm:grid-cols-2">${cards.join('')}</div>`;

  // Mystery mini‑game: step-by-step clues
  if (!themedMysterySummary) return;
  const clues = getMysteryCluesForCity(city, tripTheme);
  if (!clues.length) return;
  const inner = document.getElementById('mysteryGameInner');
  if (!inner) return;

  const total = clues.length;
  const currentStep =
    typeof state.viagemMisterio.mysteryStep === 'number' && state.viagemMisterio.mysteryStep >= 0
      ? state.viagemMisterio.mysteryStep
      : 0;
  const completed = !!state.viagemMisterio.mysteryCompleted || currentStep >= total;

  if (completed) {
    inner.innerHTML = `
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="font-semibold">All locations found!</p>
        <span class="inline-flex items-center rounded-full bg-emerald-500/90 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-950">
          Badge unlocked
        </span>
      </div>
      <p class="mb-2 text-[0.8rem]">You have completed the mystery route for <strong>${city}</strong>.</p>
      <div class="flex items-center gap-2 mt-1">
        <div class="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-sm font-extrabold shadow">
          ✦
        </div>
        <div>
          <p class="text-[0.75rem] font-semibold">The Unknown Explorer</p>
          <p class="text-[0.7rem] text-slate-300">Mystery badge added to your journey log.</p>
        </div>
      </div>
    `;
    // Ensure badge is stored
    const badgeId = `mystery_${city}_${tripTheme || 'general'}`;
    const already = (state.badges || []).some((b) => b && b.id === badgeId);
    if (!already) {
      state.badges.push({
        id: badgeId,
        city,
        tripType: tripTheme || null,
        type: 'mystery_route',
        title: 'The Unknown Explorer',
        earnedAt: new Date().toISOString()
      });
      saveToStorage();
    }
    return;
  }

  const clueIndex = Math.min(currentStep, total - 1);
  inner.innerHTML = `
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="font-semibold text-[0.8rem]">Clue ${clueIndex + 1} of ${total}</p>
      <div class="flex items-center gap-1 text-[0.65rem] text-slate-300">
        <span class="inline-flex h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
          <span class="h-1.5 bg-amber-400" style="width: ${(100 * (clueIndex + 1)) / total}%"></span>
        </span>
        <span>${clueIndex + 1}/${total}</span>
      </div>
    </div>
    <p class="mb-3 leading-snug">${clues[clueIndex]}</p>
    <button
      id="mysteryNextClueBtn"
      class="inline-flex items-center justify-center rounded-full bg-amber-400 px-3.5 py-1.5 text-[0.75rem] font-semibold text-amber-950 shadow hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 focus:ring-offset-slate-900 transition"
    >
      <span class="mr-1" aria-hidden="true">✔</span> I found this place
    </button>
  `;

  const btn = document.getElementById('mysteryNextClueBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const nextStep = clueIndex + 1;
      state.viagemMisterio.mysteryStep = nextStep;
      if (nextStep >= total) {
        state.viagemMisterio.mysteryCompleted = true;
        showToast('Mystery route completed! Reward unlocked.', 'success');
        // badge will be written by completed-render branch on next render
      }
      saveToStorage();
      renderRouteContent();
    });
  }
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
      ensureStateDefaults();
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
      ensureStateDefaults();
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
  ensureStateDefaults();

  applyTheme(state.theme);

  setupAuth();
  setupMysteryHubLayout();
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
    const landingSection = document.getElementById('landingSection');
    const homeSection = document.getElementById('homeSection');
    if (landingSection) landingSection.classList.remove('hidden');
    if (homeSection) homeSection.classList.add('hidden');
  }
});


