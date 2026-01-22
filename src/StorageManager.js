export class StorageManager {
    static KEY = 'teb_game_progress_v1';
    static data = { 
        discovered: [], // Lista ID np. "tm_2", "lo_5"
        highScore: 0 
    };

    static init() {
        const saved = localStorage.getItem(this.KEY);
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                // Scalamy z domyślnymi, żeby nie zepsuć przy aktualizacji gry
                this.data = { ...this.data, ...parsed };
            } catch (e) { 
                console.warn('Błąd odczytu zapisu:', e); 
            }
        }
    }

    // Sprawdza, czy gracz już widział tę kulkę
    static isDiscovered(brandId, tierLevel) {
        const id = `${brandId}_${tierLevel}`;
        return this.data.discovered.includes(id);
    }

    // Zapisuje nową kulkę. Zwraca TRUE jeśli to nowość (do wyświetlenia powiadomienia)
    static markAsDiscovered(brandId, tierLevel) {
        const id = `${brandId}_${tierLevel}`;
        if (!this.data.discovered.includes(id)) {
            this.data.discovered.push(id);
            this.save();
            return true; 
        }
        return false;
    }

    static save() {
        localStorage.setItem(this.KEY, JSON.stringify(this.data));
    }
    
    // Reset postępów (do testów)
    static clear() {
        localStorage.removeItem(this.KEY);
        this.data.discovered = [];
    }
}