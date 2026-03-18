// ----- Base profile state -----
const initialState = {
  passaporte: null,
  been: [],
  theme: 'light',
  departureAirport: 'Airport Francisco Sá Carneiro (Porto)',
  availabilityStart: '',
  availabilityEnd: '',
  stayDays: 1,
  tripType: '',
  climate: null,
  luggage: null,
  badges: [],
  generatedTrips: [],
  viagemMisterio: {
    aeroporto: 'Airport Francisco Sá Carneiro (Porto)',
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
let pendingSuggestedCity = null;

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
  if (state.stayDays < 1) state.stayDays = 1;
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

function openSuggestionModal(city) {
  pendingSuggestedCity = city;
  const modal = document.getElementById('suggestionModal');
  const label = document.getElementById('suggestionCityLabel');
  if (label) label.textContent = city;
  if (modal) modal.classList.remove('hidden');
}

function closeSuggestionModal() {
  const modal = document.getElementById('suggestionModal');
  if (modal) modal.classList.add('hidden');
  pendingSuggestedCity = null;
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

const COUNTRY_COORDS = {
  // Profile countries (Portuguese labels)
  Portugal: [39.5, -8],
  Espanha: [40, -4],
  'Estados Unidos': [39, -98],
  Brasil: [-14, -52],
  Japão: [36, 138],
  'África do Sul': [-30, 25],
  Austrália: [-25, 133],
  // Mystery trip destination countries (English labels used in CITY_TO_COUNTRY)
  Italy: [42.5, 12.5],
  France: [46.5, 2.5],
  Japan: [36, 138],
  Monaco: [43.73, 7.42],
  Norway: [61, 8],
  Spain: [40, -4]
};

const ROUTE_LIBRARY = {
  Rome: {
    // Vatican + Historic Center · General
    generalRoute: [
      'Colosseum',
      'Roman Forum',
      'Pantheon',
      'Trevi Fountain',
      'Piazza Navona',
      'Piazza Venezia'
    ],
    thematicRoutes: {
      // Religious Route
      religious: [
        'St. Peter’s Basilica (Vatican)',
        'Sistine Chapel (Vatican Museums)',
        'Basilica of St. John Lateran',
        'Santa Maria Maggiore',
        'Pantheon',
        'Basilica of St. Paul Outside the Walls'
      ],
      religiousMysterySummary:
        'Religious mystery route through St. Peter’s Basilica, Sistine Chapel, St. John Lateran, Santa Maria Maggiore, Pantheon and St. Paul Outside the Walls using thematic clues.',
      generalMysterySummary:
        'General mystery route through Colosseum, Roman Forum, Pantheon, Trevi Fountain, Piazza Navona and Piazza Venezia with clue-based exploration.'
    }
  },
  Paris: {
    // General Route
    generalRoute: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Montmartre', 'Champs-Élysées'],
    thematicRoutes: {
      // Gastronomic Route
      gastronomic: [
        'Marché des Enfants Rouges',
        'Café de Flore',
        'Le Comptoir du Relais',
        'Ladurée',
        'Le Jules Verne'
      ],
      gastronomicMysterySummary:
        'Gastronomic mystery route starting near the Eiffel Tower and moving through iconic markets, cafés and restaurants using food-themed clues.',
      generalMysterySummary:
        'General mystery route Eiffel Tower → Louvre Museum → Notre-Dame Cathedral → Montmartre → Champs-Élysées → Arc de Triomphe.'
    }
  },
  Kyoto: {
    // General Route
    generalRoute: ['Arashiyama Bamboo Grove', 'Iwatayama Monkey Park', 'Katsura River'],
    thematicRoutes: {
      // Nature Route
      nature: ['Fushimi Inari Taisha', 'Kiyomizu-dera', 'Higashiyama', 'Yasaka Shrine'],
      natureMysterySummary:
        'Nature mystery route with clues that lead through Arashiyama Bamboo Grove, Iwatayama Monkey Park and Katsura River.'
    }
  },
  Tromso: {
    // General Route
    generalRoute: ['Arctic Cathedral', 'Tromsø Bridge', 'Polaria', 'Storgata Street'],
    thematicRoutes: {
      // Adventure Route
      adventure: ['Arctic Cathedral', 'Tromsø Bridge', 'Polaria', 'Storgata Street'],
      generalMysterySummary:
        'Mystery route starting at Polaria and using clues to reach Storgata Street, Tromsø Bridge and Arctic Cathedral.',
      adventureMysterySummary:
        'Adventure mystery route repeating the Polaria → Storgata Street → Tromsø Bridge → Arctic Cathedral sequence with an Arctic exploration focus.'
    }
  },
  'Monte Carlo': {
    // General Route
    generalRoute: ['Casino Square', 'Monte Carlo Casino', 'Port Hercule', 'Prince’s Palace'],
    thematicRoutes: {
      // Sun & Beach Route
      sunBeach: ['Larvotto Beach', 'Larvotto Promenade', 'Fisherman’s Cove'],
      generalMysterySummary:
        'Mystery route Casino Square → Monte Carlo Casino → Port Hercule → Prince’s Palace with clues about luxury, history and sea views.',
      sunBeachMysterySummary:
        'Sun & beach mystery route Larvotto Beach → Larvotto Promenade → Fisherman’s Cove with sea-themed clues.'
    }
  },
  Barcelona: {
    // General Route
    generalRoute: [
      'Sagrada Família',
      'Park Güell',
      'Casa Batlló',
      'La Rambla',
      'Gothic Quarter',
      'Barceloneta Beach'
    ],
    thematicRoutes: {
      // Cultural Route
      cultural: ['Sagrada Família', 'Casa Batlló', 'La Pedrera', 'Gothic Quarter', 'Barcelona Cathedral'],
      generalMysterySummary:
        'General mystery route through Sagrada Família, Park Güell, Casa Batlló, La Rambla, Gothic Quarter and Barceloneta Beach.',
      culturalMysterySummary:
        'Cultural mystery route focusing on Sagrada Família, Casa Batlló, La Pedrera, Gothic Quarter and Barcelona Cathedral with Gaudí and old-town themed clues.'
    }
  }
};

function getMysteryCluesForCity(city, tripTheme) {
  return getClueStepsForCity(city, tripTheme).map((s) => s.text);
}

const CLUE_LIBRARY = {
  Rome: {
    religious: [
      {
        title: 'Clue 1',
        text:
          'In the heart of a walled city-state, a keeper of keys rests among embracing columns. Beneath the gaze of masters from centuries past, find the place where heaven meets stone and even kings bow in silence.',
        target: 'St. Peter’s Basilica (Vatican)'
      },
      {
        title: 'Clue 2',
        text:
          'Seek the space where heaven was painted above, where hands reached for the divine through color and light. Silence reigns—but every glance reveals a hidden story.',
        target: 'Sistine Chapel (Vatican Museums)'
      },
      {
        title: 'Clue 3',
        text:
          'The mother of all churches calls to those who follow the first of many. Its doors echo with crowns, its walls whisper of saints.',
        target: 'Basilica of St. John Lateran'
      },
      {
        title: 'Clue 4',
        text:
          'Golden within and radiant without, it welcomes travelers with star-like mosaics. Listen closely—ancient devotion still lingers here.',
        target: 'Santa Maria Maggiore'
      },
      {
        title: 'Clue 5',
        text:
          'Once home to many gods, now devoted to one. Its dome watches like an open eye, where emperors once dreamed of touching the sky.',
        target: 'Pantheon'
      },
      {
        title: 'Clue 6',
        text:
          'Beyond the ancient walls, an apostle rests. Quiet gardens guide your path, while mosaics tell stories of faith carried to the edges of an empire.',
        target: 'Basilica of St. Paul Outside the Walls'
      }
    ],
    general: [
      { title: 'Colosseum', text: 'A stone giant where echoes of glory and battle still roar.', target: 'Colosseum' },
      { title: 'Roman Forum', text: 'Ruins that whisper power, politics, and empire.', target: 'Roman Forum' },
      { title: 'Pantheon', text: 'A perfect dome beneath an open sky—timeless and watching.', target: 'Pantheon' },
      { title: 'Trevi Fountain', text: 'Where wishes flow with water and coins carry hope.', target: 'Trevi Fountain' },
      { title: 'Piazza Navona', text: 'Art, movement, and life in perfect harmony.', target: 'Piazza Navona' },
      { title: 'Piazza Venezia', text: 'A meeting point of history, power, and legacy.', target: 'Piazza Venezia' }
    ]
  },
  Paris: {
    general: [
      { title: 'Clue 1', text: 'You begin where iron meets the sky. Follow the river’s path toward timeless masterpieces.', target: 'Louvre Museum' },
      { title: 'Clue 2', text: 'Glass pyramids and mysterious smiles surround you. Now follow the sound of bells through stone and light.', target: 'Notre-Dame Cathedral' },
      { title: 'Clue 3', text: 'Gargoyles watch as the city unfolds below. Then climb toward the hill of artists and dreamers.', target: 'Montmartre' },
      { title: 'Clue 4', text: 'Descend into elegance and light, where the city’s most famous avenue awaits.', target: 'Champs-Élysées' },
      { title: 'Final clue', text: 'Follow the avenue to a monument of victory and pride.', target: 'Arc de Triomphe' }
    ],
    gastronomic: [
      {
        title: 'Gastronomic route',
        text: 'Follow the gastronomic route list and explore each stop at your own pace.',
        target: 'Marché des Enfants Rouges → Café de Flore → Le Comptoir du Relais → Ladurée → Le Jules Verne'
      }
    ]
  },
  Kyoto: {
    general: [
      { title: 'Clue 1', text: 'I am tall, green, and endless. The wind sings through me.', target: 'Arashiyama Bamboo Grove' },
      { title: 'Clue 2', text: 'Climb high to meet playful guardians with tails and curious eyes.', target: 'Iwatayama Monkey Park' },
      { title: 'Clue 3', text: 'I flow gently, reflecting sky and mountains.', target: 'Katsura River' }
    ]
  },
  Tromso: {
    adventure: [
      { title: 'Clue 1', text: 'Ice and life meet where science tells Arctic stories.', target: 'Polaria' },
      { title: 'Clue 2', text: 'A lively street—now find the path that curves over water.', target: 'Storgata Street' },
      { title: 'Clue 3', text: 'Walk above reflections of mountains and sea.', target: 'Tromsø Bridge' },
      { title: 'Final clue', text: 'Sharp lines rise toward the sky—glass and light define this northern icon.', target: 'Arctic Cathedral' }
    ],
    general: [
      { title: 'Clue 1', text: 'Ice and life meet where science tells Arctic stories.', target: 'Polaria' },
      { title: 'Clue 2', text: 'A lively street—now find the path that curves over water.', target: 'Storgata Street' },
      { title: 'Clue 3', text: 'Walk above reflections of mountains and sea.', target: 'Tromsø Bridge' },
      { title: 'Final clue', text: 'Sharp lines rise toward the sky—glass and light define this northern icon.', target: 'Arctic Cathedral' }
    ]
  },
  'Monte Carlo': {
    general: [
      { title: 'Casino Square', text: 'Luxury never sleeps—find the building that keeps time.', target: 'Casino Square' },
      { title: 'Casino', text: 'Where fortune dances under golden lights.', target: 'Monte Carlo Casino' },
      { title: 'Harbor', text: 'Yachts rest where the sea meets prestige.', target: 'Port Hercule' },
      { title: 'Palace', text: 'Climb to where royalty watches over the Mediterranean.', target: 'Prince’s Palace' }
    ]
  },
  Barcelona: {
    general: [
      { title: 'Clue 1', text: 'A towering masterpiece of color and light.', target: 'Sagrada Família' },
      { title: 'Clue 2', text: 'A world of mosaics, curves, and fantasy.', target: 'Park Güell' },
      { title: 'Clue 3', text: 'A living building shaped by imagination.', target: 'Casa Batlló' },
      { title: 'Clue 4', text: 'A vibrant street full of life and movement.', target: 'La Rambla' },
      { title: 'Clue 5', text: 'Ancient alleys whisper stories of the past.', target: 'Gothic Quarter' },
      { title: 'Final clue', text: 'Sun, sea, and sand welcome you to the perfect ending.', target: 'Barceloneta Beach' }
    ]
  }
};

function getClueStepsForCity(city, tripTheme) {
  const cityData = CLUE_LIBRARY[city];
  if (!cityData) return [];
  const themed = tripTheme && cityData[tripTheme];
  const steps = themed && themed.length ? themed : cityData.general || [];
  return steps.map((s) => ({
    title: s.title || 'Clue',
    text: s.text || '',
    target: s.target || ''
  }));
}

function openCluesModal() {
  const modal = document.getElementById('cluesModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  renderCluesModal();
}

function closeCluesModal() {
  const modal = document.getElementById('cluesModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function renderCluesModal() {
  const city = state.viagemMisterio.destinationCity;
  const tripTheme = state.tripType;
  const steps = getClueStepsForCity(city, tripTheme);

  const titleEl = document.getElementById('cluesModalTitle');
  const subtitleEl = document.getElementById('cluesModalSubtitle');
  const stepLabel = document.getElementById('cluesStepLabel');
  const progressLabel = document.getElementById('cluesProgressLabel');
  const textEl = document.getElementById('cluesText');
  const targetEl = document.getElementById('cluesTarget');
  const nextBtn = document.getElementById('cluesNextBtn');
  const advanceBtn = document.getElementById('cluesAdvanceBtn');
  const doneHint = document.getElementById('cluesDoneHint');

  if (
    !titleEl ||
    !subtitleEl ||
    !stepLabel ||
    !progressLabel ||
    !textEl ||
    !targetEl ||
    !nextBtn ||
    !advanceBtn ||
    !doneHint
  ) {
    return;
  }

  titleEl.textContent = city ? `${city} · Clues` : 'Clues';
  subtitleEl.textContent = tripTheme ? `Route type: ${tripTheme}` : '';

  if (!steps.length) {
    stepLabel.textContent = 'No clues available';
    progressLabel.textContent = '';
    textEl.textContent = 'This destination does not have a clue route yet.';
    targetEl.textContent = '';
    targetEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    advanceBtn.classList.add('hidden');
    doneHint.classList.add('hidden');
    return;
  }

  const total = steps.length;
  const currentStep =
    typeof state.viagemMisterio.mysteryStep === 'number' && state.viagemMisterio.mysteryStep >= 0
      ? state.viagemMisterio.mysteryStep
      : 0;
  const clueIndex = Math.min(currentStep, total - 1);
  const completed = !!state.viagemMisterio.mysteryCompleted || currentStep >= total;

  if (completed) {
    stepLabel.textContent = 'Completed';
    progressLabel.textContent = `${total}/${total}`;
    textEl.textContent = 'You have completed all clues for this destination.';
    targetEl.textContent = '';
    targetEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    advanceBtn.classList.add('hidden');
    doneHint.classList.remove('hidden');

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
      renderBadgesPanel();
    }
    return;
  }

  const step = steps[clueIndex];
  stepLabel.textContent = step.title || `Clue ${clueIndex + 1}`;
  progressLabel.textContent = `${clueIndex + 1}/${total}`;
  textEl.textContent = step.text;
  targetEl.textContent = step.target ? `→ ${step.target}` : '';
  targetEl.classList.add('hidden');
  nextBtn.classList.remove('hidden');
  advanceBtn.classList.add('hidden');
  doneHint.classList.add('hidden');
}

const DESTINATION_RULES = [
  { tripType: 'religious', city: 'Rome' },
  { tripType: 'gastronomic', city: 'Paris' },
  // Kyoto is the only destination that strictly requires a passport
  { tripType: 'nature', city: 'Kyoto', requiresPassport: true },
  { tripType: 'sunBeach', city: 'Monte Carlo' },
  { tripType: 'adventure', city: 'Tromso' },
  { tripType: 'cultural', city: 'Barcelona' }
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
  Rome: {
    name: 'Grand Hotel Palatino',
    nights: 3,
    hotelCost: 685.5,
    flightCostBase: 287.57
  },
  Paris: {
    name: 'Hotel Eiffel Seine',
    nights: 5,
    hotelCost: 1135,
    flightCostBase: 218
  },
  Kyoto: {
    name: 'Wander Kyoto Nanjo',
    nights: 4,
    hotelCost: 290,
    flightCostBase: 2025.96
  },
  'Monte Carlo': {
    name: 'Fairmont Monte-Carlo',
    nights: 4,
    hotelCost: 4034,
    flightCostBase: 534
  },
  Tromso: {
    name: 'St. Elisabeth Suites',
    nights: 3,
    hotelCost: 565,
    flightCostBase: 1434.28
  },
  Barcelona: {
    name: 'Hotel Europark',
    nights: 3,
    hotelCost: 1461,
    flightCostBase: 170
  }
};

const PROFIT_MULTIPLIER = 1.15;

function roundCurrency(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

let leafletMap = null;
let leafletMarkersLayer = null;

function getFlightCost(city, luggage) {
  const pricing = HOTEL_SAMPLES[city];
  const baseCost = pricing && typeof pricing.flightCostBase === 'number' ? pricing.flightCostBase : 300;
  const luggageExtra = {
    mao10: 0,
    porao20: 35,
    porao50: 80
  };
  return baseCost + (luggageExtra[luggage] || 0);
}

function buildHotelAndCostPreview(city) {
  const pricing = HOTEL_SAMPLES[city];
  if (!pricing) {
    const fallbackNightly = 120;
    const nightsFallback = Math.max(1, Number(state.stayDays) || 1);
    const hotelCostFallback = fallbackNightly * nightsFallback;
    const flightCostFallback = getFlightCost(city, state.luggage);
    const totalFallback = roundCurrency((hotelCostFallback + flightCostFallback) * PROFIT_MULTIPLIER);
    return {
      hotelName: 'City Center Hotel',
      hotelNightly: fallbackNightly,
      hotelNights: nightsFallback,
      hotelCost: hotelCostFallback,
      flightCost: flightCostFallback,
      totalCost: totalFallback
    };
  }

  const nights = pricing.nights || Math.max(1, Number(state.stayDays) || 1);
  const hotelCost = pricing.hotelCost;
  const hotelNightly = Number((hotelCost / nights).toFixed(2));
  const flightCost = getFlightCost(city, state.luggage);
  const totalCost = roundCurrency((hotelCost + flightCost) * PROFIT_MULTIPLIER);
  return {
    hotelName: pricing.name,
    hotelNightly,
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

// Stylised world map with visited countries (backup, not used)
function renderWorldMapBackup() {
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

// Leaflet-based world map with zoom and markers for visited countries
function renderWorldMap() {
  const mapContainer = document.getElementById('worldMap');
  if (!mapContainer) return;

  // If Leaflet failed to load, show a small fallback message
  if (typeof L === 'undefined') {
    mapContainer.innerHTML =
      '<p class="text-xs text-slate-500">Interactive map could not be loaded.</p>';
    return;
  }

  // Initialise map once
  if (!leafletMap) {
    mapContainer.innerHTML = '';
    leafletMap = L.map(mapContainer).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
    leafletMarkersLayer = L.layerGroup().addTo(leafletMap);
  }

  leafletMarkersLayer.clearLayers();

  const visitedNames = new Set();
  // Countries marked manually in the profile
  (state.been || []).forEach((name) => {
    if (name) visitedNames.add(name);
  });
  // Countries from landed mystery trips
  (state.generatedTrips || [])
    .filter((trip) => trip && trip.landedAt && trip.country)
    .forEach((trip) => {
      visitedNames.add(trip.country);
    });

  const visitedCountries = Array.from(visitedNames);

  if (!visitedCountries.length) {
    // No markers; just keep default world view
    leafletMap.setView([20, 0], 2);
    return;
  }

  const bounds = [];

  visitedCountries.forEach((name) => {
    const coords = COUNTRY_COORDS[name];
    if (!coords) return;
    const marker = L.circleMarker(coords, {
      radius: 6,
      color: '#16a34a',
      weight: 2,
      fillColor: '#22c55e',
      fillOpacity: 0.9
    }).bindPopup(`<strong>${name}</strong>`);
    marker.addTo(leafletMarkersLayer);
    bounds.push(coords);
  });

  if (bounds.length) {
    leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 });
  } else {
    leafletMap.setView([20, 0], 2);
  }
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
  const visitadosSection = document.getElementById('visitadosSection');
  const logoHomeBtn = document.getElementById('logoHomeBtn');
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileNavMenu = document.getElementById('mobileNavMenu');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const userNameLabel = document.getElementById('userNameLabel');
  const mobileUserNameLabel = document.getElementById('mobileUserNameLabel');

  function showSection(target) {
    if (landingSection) landingSection.classList.add('hidden');
    homeSection.classList.add('hidden');
    if (visitadosSection) visitadosSection.classList.add('hidden');

    if (target === 'landing') {
      if (landingSection) landingSection.classList.remove('hidden');
    } else if (target === 'visitados') {
      if (visitadosSection) {
        visitadosSection.classList.remove('hidden');
        renderVisitadosTabela();
        renderWorldMap();
        renderVisitedTrips();
      }
    } else {
      homeSection.classList.remove('hidden');
    }

    // Close mobile menu when navigating
    if (mobileNavMenu && mobileNavToggle) {
      mobileNavMenu.classList.add('hidden');
      mobileNavMenu.classList.add('pointer-events-none');
      const drawer = mobileNavMenu.querySelector('aside');
      if (drawer) drawer.classList.add('translate-x-full');
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

  if (mobileNavToggle && mobileNavMenu) {
    mobileNavToggle.addEventListener('click', () => {
      const drawer = mobileNavMenu.querySelector('aside');
      const isClosed = drawer && drawer.classList.contains('translate-x-full');
      if (isClosed) {
        mobileNavMenu.classList.remove('hidden');
        mobileNavMenu.classList.remove('pointer-events-none');
        if (drawer) drawer.classList.remove('translate-x-full');
      } else {
        mobileNavMenu.classList.add('pointer-events-none');
        if (drawer) drawer.classList.add('translate-x-full');
        setTimeout(() => {
          mobileNavMenu.classList.add('hidden');
        }, 200);
      }

      // Sync username into mobile menu when opening
      if (isClosed && userNameLabel && mobileUserNameLabel) {
        mobileUserNameLabel.textContent = userNameLabel.textContent || '';
      }
    });
  }

  if (mobileNavMenu) {
    mobileNavMenu.addEventListener('click', (e) => {
      const drawer = mobileNavMenu.querySelector('aside');
      const clickInsideDrawer = drawer && drawer.contains(e.target);
      if (clickInsideDrawer) return;

      mobileNavMenu.classList.add('pointer-events-none');
      if (drawer) drawer.classList.add('translate-x-full');
      setTimeout(() => {
        mobileNavMenu.classList.add('hidden');
      }, 200);
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
  const btnMobile = document.getElementById('themeToggleMobile');
  const labelMobile = document.getElementById('themeLabelMobile');

  function wire(button) {
    if (!button) return;
    button.addEventListener('click', () => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      if (labelMobile) {
        labelMobile.textContent = newTheme === 'dark' ? 'Dark' : 'Light';
        if (labelMobile.nextSibling) {
          labelMobile.nextSibling.textContent = newTheme === 'dark' ? '🌙' : '🌞';
        }
      }
    });
  }

  wire(btn);
  wire(btnMobile);
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
      if (state.viagemMisterio.dataHora) {
        state.viagemMisterio.returnDataHora = computeReturnDateTime(state.viagemMisterio.dataHora);
      }
      saveToStorage();
      updateResumo();
      updateProgress();
      renderViagemMisterio();
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
  const suggestionAcceptBtn = document.getElementById('suggestionAcceptBtn');
  const suggestionCancelBtn = document.getElementById('suggestionCancelBtn');
  const cluesModal = document.getElementById('cluesModal');
  const cluesModalCloseBtn = document.getElementById('cluesModalCloseBtn');
  const cluesNextBtn = document.getElementById('cluesNextBtn');
  const cluesAdvanceBtn = document.getElementById('cluesAdvanceBtn');

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
      const result = gerarViagemMisterioAuto();
      if (result === true) {
        if (mysteryHubSection) mysteryHubSection.classList.remove('hidden');
        updateResumo();
        updateProgress();
        showToast('Mystery trip generated.', 'success');
      }
      // if result is 'pending', a suggestion modal is shown and we wait for user action
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
      renderWorldMap();
      updateResumo();
      updateProgress();
      showToast('Landing confirmed. Routes unlocked.', 'success');
    });
  }

  if (suggestionAcceptBtn) {
    suggestionAcceptBtn.addEventListener('click', () => {
      if (!pendingSuggestedCity) {
        closeSuggestionModal();
        return;
      }
      const created = gerarViagemMisterioAuto(pendingSuggestedCity);
      closeSuggestionModal();
      if (!created) return;
      if (mysteryHubSection) mysteryHubSection.classList.remove('hidden');
      updateResumo();
      updateProgress();
      showToast('Alternative mystery trip generated.', 'success');
    });
  }

  if (suggestionCancelBtn) {
    suggestionCancelBtn.addEventListener('click', () => {
      closeSuggestionModal();
      showToast('No trip was generated for that combination.', 'info');
    });
  }

  if (cluesModalCloseBtn) {
    cluesModalCloseBtn.addEventListener('click', () => {
      closeCluesModal();
    });
  }
  if (cluesModal) {
    cluesModal.addEventListener('click', (e) => {
      const panel = cluesModal.querySelector('div.relative.w-full');
      if (panel && panel.contains(e.target)) return;
      closeCluesModal();
    });
  }
  if (cluesNextBtn) {
    cluesNextBtn.addEventListener('click', () => {
      const targetEl = document.getElementById('cluesTarget');
      if (targetEl && targetEl.classList.contains('hidden')) {
        targetEl.classList.remove('hidden');
        const advanceBtn = document.getElementById('cluesAdvanceBtn');
        if (advanceBtn) advanceBtn.classList.remove('hidden');
        return;
      }
    });
  }

  if (cluesAdvanceBtn) {
    cluesAdvanceBtn.addEventListener('click', () => {
      const city = state.viagemMisterio.destinationCity;
      const steps = getClueStepsForCity(city, state.tripType);
      if (!steps.length) return;
      const total = steps.length;
      const currentStep =
        typeof state.viagemMisterio.mysteryStep === 'number' && state.viagemMisterio.mysteryStep >= 0
          ? state.viagemMisterio.mysteryStep
          : 0;
      const nextStep = currentStep + 1;
      state.viagemMisterio.mysteryStep = nextStep;
      if (nextStep >= total) {
        state.viagemMisterio.mysteryCompleted = true;
        showToast('Mystery route completed! Badge unlocked.', 'success');
      }
      saveToStorage();
      renderCluesModal();
      renderBadgesPanel();
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
  // (Countries section removed)

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');

  function attachLogout(btn) {
    if (!btn) return;
    btn.addEventListener('click', () => {
      setActiveUser(null);
      state = { ...initialState, theme: state.theme };
      syncUIFromState();
      const userInfo = document.getElementById('userInfo');
      const appShell = document.getElementById('appShell');
      const authSection = document.getElementById('authSection');
      if (userInfo) userInfo.classList.add('hidden');
      if (appShell) appShell.classList.add('hidden');
      if (authSection) authSection.classList.remove('hidden');
      const mobileNavMenuEl = document.getElementById('mobileNavMenu');
      if (mobileNavMenuEl) {
        mobileNavMenuEl.classList.add('hidden', 'pointer-events-none');
      }
      showToast('Session ended.', 'info');
    });
  }

  attachLogout(logoutBtn);
  attachLogout(logoutBtnMobile);
}

// Mystery trip: helpers
function gerarViagemMisterioAuto(forcedCity) {
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
  let selectedCity = forcedCity || null;

  if (!selectedCity) {
    const matchedRule = DESTINATION_RULES.find((r) => {
      if (r.requiresPassport && state.passaporte !== 'sim') return false;
      return r.tripType === state.tripType;
    });

    let cities = Object.keys(ROUTE_LIBRARY);
    // If the user has no passport, they cannot be randomly sent to Kyoto
    if (state.passaporte !== 'sim') {
      cities = cities.filter((c) => c !== 'Kyoto');
    }

    if (matchedRule) {
      selectedCity = matchedRule.city;
    } else {
      // No exact match for this combination: suggest an alternative among the 5 non-Kyoto cities
      const suggestionPool = cities.filter((c) => c !== 'Kyoto');
      const suggestionCity =
        suggestionPool[Math.floor(Math.random() * suggestionPool.length)] ||
        cities[Math.floor(Math.random() * cities.length)];
      openSuggestionModal(suggestionCity);
      return 'pending';
    }
  }

  const cityPricing = HOTEL_SAMPLES[selectedCity];
  const stayDays = cityPricing && cityPricing.nights ? cityPricing.nights : Math.max(1, Number(state.stayDays) || 1);
  state.stayDays = stayDays;

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
        <div class="relative mt-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-3 text-xs text-slate-100">
          <p class="text-[0.8rem] text-slate-200">
            Play the clue game directly in the app.
          </p>
          <button
            id="openCluesModalBtn"
            class="mt-3 inline-flex items-center justify-center rounded-full bg-amber-400 px-3.5 py-1.5 text-[0.75rem] font-semibold text-amber-950 shadow hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 focus:ring-offset-slate-900 transition"
          >
            Open clues
          </button>
        </div>
      </article>
    `);
  }

  container.innerHTML = `<div class="grid gap-3 sm:grid-cols-2">${cards.join('')}</div>`;

  const openBtn = document.getElementById('openCluesModalBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      openCluesModal();
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


