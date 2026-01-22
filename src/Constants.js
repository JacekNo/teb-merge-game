export const SETTINGS = {
    gravity: 1.5,
    bounce: 0.15,
    friction: 0.02,
    dropDelay: 250,
    backgroundColor: '#0f172a',

    // --- LAYOUT ---
    uiHeight: 0, 
    jarX: 0, jarY: 0,
    jarWidth: 400, jarHeight: 800,

    sideMargin: 10, bottomMargin: 20,
    spawnY: 180, dangerLineY: 240,  
};

export const TEB_GRAND_BALL = {
    radius: 95, 
    color: '#102D69',
    label: 'TEB',
    points: 5000
};

// === 1. DEFINICJE MAREK (TYLKO 3 GŁÓWNE) ===
export const BRANDS = {
    TM: { id: 'tm', color: '#C51523', label: 'Technikum' }, 
    LO: { id: 'lo', color: '#0085B7', label: 'Liceum' },
    LP: { id: 'lp', color: '#A43282', label: 'Plastyczne' }
};

// === 2. DEFINICJE POZIOMÓW (TIERS 0-7) ===
export const TIERS = [
    // --- FAZA WSTĘPNA ---
    { level: 0, radius: 13, points: 5,   name: 'Iskra',     type: 'NEUTRAL' }, // Było 16
    { level: 1, radius: 19, points: 10,  name: 'Pasja',     type: 'SOLID'   }, // Było 24
    
    // --- FAZA IKON (EWOLUCJA) ---
    { level: 2, radius: 27, points: 25,  name: 'Kierunek',  type: 'ICON'    }, // Było 34
    { level: 3, radius: 36, points: 60,  name: 'Wiedza',    type: 'ICON'    }, // Było 44
    
    // Tu wchodzą PNG (bogatsze detale)
    { level: 4, radius: 46, points: 150, name: 'Praktyka',  type: 'ICON'    }, // Było 56
    { level: 5, radius: 58, points: 350, name: 'Ekspert',   type: 'ICON'    }, // Było 70

    // --- FAZA SYGNETÓW ---
    { level: 6, radius: 71, points: 800, name: 'Absolwent', type: 'SIGNET'  }, // Było 85 (Teraz 3 mieszczą się na styk!)

    // --- FAZA MASTER ---
    { level: 7, radius: 82, points: 5000, name: 'TEB Master', type: 'GRAND' }  // Było 95
];

export const GAME_CONFIG = {
    activeBrands: {}, 
    activeTiers: TIERS,
    spawnPool: []
};

// === 4. LOGIKA TRUDNOŚCI ===
export function setDifficulty(mode) {
    let selectedBrands = {};

    switch (mode) {
        case 'EASY': // Tylko 2 marki, brak szarych
            selectedBrands = { TM: BRANDS.TM, LO: BRANDS.LO };
            break;
        // Medium i Hard na razie to to samo przy 3 markach, 
        // różnicą może być ilość szarych kulek w przyszłości
        case 'MEDIUM': 
        case 'HARD': 
            selectedBrands = BRANDS; // Wszystkie 3 (TM, LO, LP)
            break;
        default:
            selectedBrands = BRANDS;
    }

    GAME_CONFIG.activeBrands = selectedBrands;
    GAME_CONFIG.activeTiers = TIERS;

    GAME_CONFIG.spawnPool = [];

    // Szare kulki (Tier 0) - wyłączone na EASY
    if (mode !== 'EASY') {
        for(let i=0; i<3; i++) GAME_CONFIG.spawnPool.push({ brand: 'neutral', tier: 0 });
    }

    // Kolorowe kulki (Tier 1)
    Object.values(selectedBrands).forEach(brand => {
        const count = (mode === 'EASY') ? 4 : 2; 
        for(let i=0; i<count; i++) GAME_CONFIG.spawnPool.push({ brand: brand.id, tier: 1 });
    });
}

setDifficulty('MEDIUM');