import Phaser from 'phaser';
import { SETTINGS } from './Constants';

export class EnvironmentBuilder {

    static init(scene) {
        const width = scene.game.config.width;
        const height = scene.game.config.height;

        // Marginesy wizualne (żeby ramka nie dotykała krawędzi telefonu)
        const pad = SETTINGS.sideMargin; 
        const bottomPad = SETTINGS.bottomMargin;
        
        // Wymiary wizualnego słoika
        const jX = pad;
        const jY = pad; 
        const jW = width - (pad * 2);
        const jH = height - pad - bottomPad;

        // 1. TŁO (Plan 3) - Z OBSŁUGĄ PNG
        let bg;
        if (scene.textures.exists('bg_main')) {
            bg = scene.add.image(width/2, height/2, 'bg_main');
            const scale = Math.max(width / bg.width, height / bg.height);
            bg.setScale(scale).setScrollFactor(0);
        } else {
            bg = scene.add.image(width/2, height/2, 'bg_radial');
            bg.setScale(Math.max(width/1024, height/1024)).setScrollFactor(0);
        }
        bg.setDepth(-100);
        // Usuwamy tint lub dajemy minimalny, skoro to Full Screen
        // bg.setTint(0xdddddd); 

        // --- PLAN 2.8 (FLOATING ARTIFACTS) ---
        const artifacts = this.createFloatingArtifacts(scene);

        // 2. SKANER (Plan 2.5)
        const grid = scene.add.tileSprite(width/2, height/2, width, height, 'scanline_pattern');
        grid.setAlpha(0.6); // Trochę delikatniejszy, żeby nie zasłaniał tła
        grid.setDepth(-90);
        grid.setBlendMode(Phaser.BlendModes.ADD);

        // 3. UI VIGNETTE (ZAMIAST CZARNEJ BELKI)
        // Tworzymy gradient na górze, żeby białe cyferki UI były widoczne na jasnym tle
        // 3. UI VIGNETTE (ZMODYFIKOWANA - CZYSTA)
        if (!scene.textures.exists('top_gradient')) {
             const canvas = document.createElement('canvas');
             canvas.width = width; canvas.height = 150; // Trochę krótszy
             const ctx = canvas.getContext('2d');
             const grad = ctx.createLinearGradient(0, 0, 0, 150);
             
             // ZMIANA: Zamiast czarnego, używamy głębokiego granatu (Brand Color)
             // Dzięki temu wygląda to jak część tła, a nie nakładka
             grad.addColorStop(0, 'rgba(16, 45, 105, 0.9)'); // Granat TEB
             grad.addColorStop(1, 'rgba(16, 45, 105, 0.0)'); // Przezroczysty
             
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,width,150);
             scene.textures.addCanvas('top_gradient', canvas);
        }
        const topVignette = scene.add.image(width/2, 75, 'top_gradient');
        topVignette.setDepth(190);
        
        // Dodajemy tryb mieszania, żeby ładnie "wtopił się" w tło
        topVignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

        // 4. BUDOWA KAPSUŁY (Full Screen)

        // A. TŁO KAPSUŁY (Subtelne przyciemnienie obszaru gry)
        const jarBack = scene.add.graphics();
        jarBack.fillStyle(0x000000, 0.2); // Bardzo delikatne
        jarBack.fillRoundedRect(jX, jY, jW, jH, 30);
        jarBack.setDepth(-10);

    

        // C. STREFA ENERGII (Dno)
        if (!scene.textures.exists('energy_zone_grad')) {
             const canvas = document.createElement('canvas');
             canvas.width = 100; canvas.height = 200; // Wymiar bazowy
             const ctx = canvas.getContext('2d');
             // Gradient liniowy od dołu do góry
             const grad = ctx.createLinearGradient(0, 200, 0, 0);
             grad.addColorStop(0, 'rgba(0, 179, 255, 0.4)'); // Jasny błękit na dnie
             grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)'); // Przezroczysty na górze
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,100,200);
             scene.textures.addCanvas('energy_zone_grad', canvas);
        }
        const energyZone = scene.add.image(width/2, jY + jH - 100, 'energy_zone_grad');
        energyZone.setDisplaySize(jW, 200); // Rozciągamy
        energyZone.setDepth(-8);
        energyZone.setBlendMode(Phaser.BlendModes.ADD);
        // ... (Twój kod powyżej) ...
        energyZone.setAlpha(0.5);

        // === NAPRAWA ROGÓW (MASKOWANIE) ===
        // 1. Tworzymy niewidzialny kształt idealnie pasujący do słoika
        const maskGraph = scene.make.graphics();
        maskGraph.fillStyle(0xffffff);
        
        // Używamy tych samych wymiarów (jX, jY, jW, jH) i promienia (30) co w ramce słoika
        maskGraph.fillRoundedRect(jX, jY, jW, jH, 30);

        // 2. Tworzymy maskę i nakładamy na strefę energii
        const mask = maskGraph.createGeometryMask();
        energyZone.setMask(mask);

        // D. LINIA LIMITU (HUD)
        const limitGraphics = scene.add.graphics();
        limitGraphics.lineStyle(2, 0xef4444, 0.5);
        const dashLen = 4; const gapLen = 12; const lineY = SETTINGS.dangerLineY;
        for (let x = jX + 20; x < jX + jW - 20; x += (dashLen + gapLen)) {
            limitGraphics.moveTo(x, lineY);
            limitGraphics.lineTo(x + dashLen, lineY);
        }
        limitGraphics.strokePath();
        limitGraphics.setDepth(5);

        // E. RAMKA SŁOIKA (Szkło na pełnym ekranie)
        const jarGlass = scene.add.graphics();
        
        // Zewnętrzna krawędź (subtelna)
        jarGlass.lineStyle(2, 0xffffff, 0.15);
        jarGlass.strokeRoundedRect(jX, jY, jW, jH, 30);
        
        // Wewnętrzny akcent (Rim light)
        jarGlass.lineStyle(1, 0xffffff, 0.3);
        jarGlass.strokeRoundedRect(jX+4, jY+4, jW-8, jH-8, 26);

        jarGlass.setDepth(100);

        // F. CZĄSTECZKI NA DNIE
        // Musimy stworzyć maskę, żeby nie wylatywały
        const maskShape = scene.make.graphics({x: 0, y: 0, add: false});
        maskShape.fillRoundedRect(jX, jY, jW, jH, 30);
        const jarMask = maskShape.createGeometryMask();
        this.createBottomParticles(scene, jX, jY + jH - 50, jW, 50, jarMask);


        // G. LINIA CELOWNICZA
        const aimLine = scene.add.rectangle(200, 400, 1, 800, 0xffffff).setDepth(90).setAlpha(0.15);

        return {
            aimLine: aimLine,
            bgGrid: grid,
            artifacts: artifacts // <--- KLUCZOWE: Musimy to zwrócić!
        };
    }

    // ... createFloatingArtifacts i createBottomParticles bez zmian (skopiuj z poprzedniej wersji) ...
    static createFloatingArtifacts(scene) {
        const artifacts = [];
        // Używamy tylko tych 3 kluczy, które załadowałeś
        const textures = ['glyph_tm', 'glyph_lo', 'glyph_lp'];
        
        for (let i = 0; i < 12; i++) { // Dajmy ich trochę więcej (12)
            const tex = Phaser.Utils.Array.GetRandom(textures);
            
            // Losowa pozycja startowa
            const x = Phaser.Math.Between(0, scene.game.config.width);
            const y = Phaser.Math.Between(100, 900);
            
            // Jeśli plik SVG się nie załadował, gra użyje 'spark' żeby nie było błędu
            const key = scene.textures.exists(tex) ? tex : 'spark';

            const artifact = scene.add.image(x, y, key);
            
            // Stylizacja:
            // Muszą być małe i subtelne, żeby nie myliły się z kulkami gry
            const scale = Phaser.Math.FloatBetween(0.3, 0.6); 
            artifact.setScale(scale);
            
            // Bardzo przezroczyste (duchy)
            artifact.setAlpha(Phaser.Math.FloatBetween(0.1, 0.2)); 
            
            // Są daleko w tle
            artifact.setDepth(-95); 
            artifact.setBlendMode(Phaser.BlendModes.ADD);

            // DANE DO ANIMACJI (To sprawia, że się ruszają)
            artifact.setData('speedY', Phaser.Math.FloatBetween(-0.3, -1.0)); // Prędkość wznoszenia
            artifact.setData('wobbleSpeed', Phaser.Math.FloatBetween(0.001, 0.003)); // Szybkość falowania
            artifact.setData('wobbleAmp', Phaser.Math.FloatBetween(20, 50)); // Szerokość falowania
            artifact.setData('initialX', x); // Punkt odniesienia X
            
            artifacts.push(artifact);
        }
        return artifacts;
    }

    static createBottomParticles(scene, jX, jY, jW, jH, mask) {
        if (!scene.textures.exists('spark')) return;
        const emitter = scene.add.particles(0, 0, 'spark', {
            x: { min: jX + 20, max: jX + jW - 20 },
            y: jY, 
            lifespan: 4000,
            speedY: { min: -30, max: -80 }, 
            scale: { start: 0.5, end: 0 },  
            alpha: { start: 0.4, end: 0 },
            frequency: 300, 
            quantity: 1,
            blendMode: 'ADD',
            tint: [0x38bdf8, 0x818cf8, 0xffffff] 
        });
        emitter.setDepth(-5); 
        emitter.setMask(mask); 
    }
}