export const SETTINGS = {
    gravity: 1.5,
    bounce: 0.15,
    friction: 0.02,
    dropDelay: 250,
    backgroundColor: '#0f172a',

    // --- FULL SCREEN LAYOUT ---
    uiHeight: 0, 
    jarX: 0,
    jarY: 0,
    jarWidth: 400,
    jarHeight: 800,

    wallThickness: 100,
    sideMargin: 10,
    bottomMargin: 20,

    spawnY: 180,       
    dangerLineY: 240,  
};

export const TEB_GRAND_BALL = {
    radius: 50,
    color: '#102D69',
    label: 'TEB',
    points: 1000
};

// === 1. DEFINICJE MAREK ===

// A. Standardowe (Dla Łatwy/Średni) - 3 rodzaje
export const BRANDS_STD = {
    TM: { id: 'tm', color: '#C51523', label: 'TM', iconKey: 'icon_tm_a' }, // Domyślnie wariant A
    LP: { id: 'lp', color: '#A43282', label: 'LP', iconKey: 'icon_lp_a' },
    LO: { id: 'lo', color: '#0085B7', label: 'LO', iconKey: 'icon_lo_a' }
};

// B. Rozszerzone (Dla Trudny) - 6 rodzajów
export const BRANDS_HARD = {
    TM_A: { id: 'tm_a', color: '#C51523', label: 'TM', iconKey: 'icon_tm_a' },
    TM_B: { id: 'tm_b', color: '#C51523', label: 'TM', iconKey: 'icon_tm_b' }, // Inna ikona
    
    LP_A: { id: 'lp_a', color: '#A43282', label: 'LP', iconKey: 'icon_lp_a' },
    LP_B: { id: 'lp_b', color: '#A43282', label: 'LP', iconKey: 'icon_lp_b' },

    LO_A: { id: 'lo_a', color: '#0085B7', label: 'LO', iconKey: 'icon_lo_a' },
    LO_B: { id: 'lo_b', color: '#0085B7', label: 'LO', iconKey: 'icon_lo_b' }
};

// --- FIX DLA TEXTURE GENERATOR ---
// TextureGenerator musi widzieć WSZYSTKIE możliwe marki, żeby wygenerować dla nich grafiki na starcie.
// Łączymy obie listy w jedną dużą, którą eksportujemy jako 'BRANDS'.
export const BRANDS = { ...BRANDS_STD, ...BRANDS_HARD };

// === 2. DEFINICJE POZIOMÓW (TIERS) ===
const ALL_TIERS = [
    { level: 0, radius: 24, points: 10,  name: 'Draft' },
    { level: 1, radius: 28, points: 30,  name: 'Projekt' },
    { level: 2, radius: 34, points: 90,  name: 'Hero' },
    { level: 3, radius: 40, points: 300, name: 'Sygnet' },
];

// Eksportujemy jako TIERS dla TextureGeneratora i GameScene
export const TIERS = ALL_TIERS;

// === 3. GLOBALNA KONFIGURACJA (State) ===
// To będzie czytane przez GameScene w trakcie gry
export const GAME_CONFIG = {
    activeBrands: BRANDS_STD, 
    activeTiers: ALL_TIERS,
    spawnPool: []
};

// === 4. FUNKCJA USTAWIAJĄCA TRUDNOŚĆ ===
export function setDifficulty(mode) {
    let brandsSource = BRANDS_STD;
    let tiersSource = ALL_TIERS;

    switch (mode) {
        case 'EASY':
            // ŁATWY: Usuwamy najmniejszy tier (0). Gra zaczyna się od Projektu (1).
            // 3 Marki.
            tiersSource = ALL_TIERS.filter(t => t.level >= 1);
            brandsSource = BRANDS_STD;
            break;

        case 'MEDIUM':
            // ŚREDNI: Wszystkie tiery (0-3). 3 Marki.
            tiersSource = ALL_TIERS;
            brandsSource = BRANDS_STD;
            break;

        case 'HARD':
            // TRUDNY: Wszystkie tiery. 6 Marek (Warianty A i B).
            tiersSource = ALL_TIERS;
            brandsSource = BRANDS_HARD;
            break;
    }

    // Zapisujemy do globalnego configu
    GAME_CONFIG.activeBrands = brandsSource;
    GAME_CONFIG.activeTiers = tiersSource;

    // Generujemy Spawn Pool (Co wpada do słoika)
    // Zrzucamy tylko najniższy dostępny tier dla danej konfiguracji
    const startLevel = tiersSource[0].level; 
    
    GAME_CONFIG.spawnPool = [];
    Object.values(brandsSource).forEach(brand => {
        GAME_CONFIG.spawnPool.push({ brand: brand.id, tier: startLevel });
    });
}

// Domyślna inicjalizacja (Fallback)
setDifficulty('MEDIUM');