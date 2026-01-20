import { BRANDS, TIERS, TEB_GRAND_BALL } from './Constants';

export class TextureGenerator {
    
    static createAll(scene) {
        this.createBackgroundTexture(scene);
        this.createBrandBalls(scene);
        this.createGrandBall(scene);
        this.createRipple(scene);
        this.createScanlineGrid(scene);
        this.createGlyphPlaceholders(scene);
        this.createSpark(scene);
    }

    // 1. TŁO
    static createBackgroundTexture(scene) {
        if (!scene.textures.exists('bg_radial')) {
            const size = 1024;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#020617');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
            scene.textures.addCanvas('bg_radial', canvas);
        }
    }

    // 2. KULKI - OBSŁUGA WARIANTÓW A/B ORAZ SYGNETÓW
    static createBrandBalls(scene) {
        // Iterujemy po wszystkich markach zdefiniowanych w Constants (TM_A, TM_B, LP_A...)
        Object.values(BRANDS).forEach(brand => {
            
            TIERS.forEach(tier => {
                // Generujemy klucz, np. ball_tm_a_0
                const key = `ball_${brand.id}_${tier.level}`;
                
                // Jeśli tekstura już istnieje, pomijamy
                if (scene.textures.exists(key)) return;

                const d = tier.radius * 2;
                const canvas = document.createElement('canvas');
                canvas.width = d; canvas.height = d;
                const ctx = canvas.getContext('2d');
                const cx = tier.radius; const cy = tier.radius;
                const r = tier.radius;

                // A. BAZA (Kolor marki)
                const grad = ctx.createRadialGradient(cx - r*0.4, cy - r*0.4, 0, cx, cy, r);
                grad.addColorStop(0, brand.color); 
                grad.addColorStop(1, adjustColor(brand.color, -40)); // Ciemniejszy na brzegach
                
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 
                ctx.fillStyle = grad; ctx.fill();

                // B. Cień wewnętrzny (Ambient)
                const shadowGrad = ctx.createLinearGradient(0, 0, 0, d);
                shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                shadowGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 
                ctx.fillStyle = shadowGrad; ctx.fill();

                // --- C. IKONA LUB SYGNET (KLUCZOWA ZMIANA) ---
                let iconKey;

                if (tier.level >= 3) {
                    // DLA SYGNETÓW (Level 3+):
                    // Ignorujemy warianty A/B. TM_A i TM_B mają używać tego samego 'signet_tm'.
                    // Wyciągamy bazę ID (np. z 'tm_a' robimy 'tm')
                    const baseId = brand.id.split('_')[0].toLowerCase(); 
                    iconKey = `signet_${baseId}`;
                } else {
                    // DLA ZWYKŁYCH KULEK (Level 0-2):
                    // Używamy klucza zdefiniowanego w Constants (np. 'icon_tm_a')
                    // Jeśli nie ma, fallback do starej metody
                    iconKey = brand.iconKey ? brand.iconKey : `icon_${brand.id}`;
                }

                // Rysowanie ikony
                if (scene.textures.exists(iconKey)) {
                    const img = scene.textures.get(iconKey).getSourceImage();
                    
                    // Skala ikony: Sygnety nieco większe od zwykłych ikon
                    const scaleFactor = (tier.level >= 3) ? 1.3 : 1.1;
                    const iconSize = r * scaleFactor; 
                    
                    ctx.save();
                    // Lekki cień pod ikoną dla efektu głębi
                    ctx.shadowColor = "rgba(0,0,0,0.2)";
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetY = 2;
                    
                    // Centrowanie i rysowanie
                    ctx.drawImage(img, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
                    ctx.restore();
                } else {
                    // Fallback tekstowy (gdyby plik svg się nie załadował)
                    ctx.fillStyle = "rgba(255,255,255,0.9)";
                    ctx.font = `bold ${Math.floor(r * 0.5)}px Arial`;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(brand.label, cx, cy);
                }
                // ----------------------------------------------

                // D. Odblask (Highlight)
                ctx.beginPath();
                ctx.ellipse(cx - r*0.3, cy - r*0.3, r * 0.4, r * 0.3, Math.PI / 4, 0, Math.PI * 2);
                const softShine = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx - r*0.3, cy - r*0.3, r*0.6);
                softShine.addColorStop(0, "rgba(255, 255, 255, 0.25)");
                softShine.addColorStop(1, "rgba(255, 255, 255, 0.0)");
                ctx.fillStyle = softShine; ctx.fill();

                // E. Obrys górny (Rim light)
                ctx.beginPath();
                ctx.arc(cx, cy, r - 1, Math.PI, Math.PI * 2);
                ctx.strokeStyle = "rgba(255,255,255,0.15)";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Zapisujemy teksturę do managera Phasera
                scene.textures.addCanvas(key, canvas);
            });
        });
    }

    // 3. WIELKA KULA TEB
    static createGrandBall(scene) {
        const key = 'ball_TEB_GRAND';
        if (scene.textures.exists(key)) return;
        const d = TEB_GRAND_BALL.radius * 2;
        const canvas = document.createElement('canvas');
        canvas.width = d; canvas.height = d;
        const ctx = canvas.getContext('2d');
        const cx = TEB_GRAND_BALL.radius; const cy = TEB_GRAND_BALL.radius;
        const r = TEB_GRAND_BALL.radius;

        const grad = ctx.createRadialGradient(cx - r*0.4, cy - r*0.4, 0, cx, cy, r);
        grad.addColorStop(0, TEB_GRAND_BALL.color);
        grad.addColorStop(1, '#0a1a3f');
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 
        ctx.fillStyle = grad; ctx.fill();

        if (scene.textures.exists('logo_teb')) {
            const img = scene.textures.get('logo_teb').getSourceImage();
            const iconSize = r * 1.1;
            ctx.drawImage(img, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
        }

        ctx.beginPath();
        ctx.ellipse(cx - r*0.3, cy - r*0.3, r * 0.4, r * 0.3, Math.PI / 4, 0, Math.PI * 2);
        const softShine = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx - r*0.3, cy - r*0.3, r*0.6);
        softShine.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        softShine.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = softShine; ctx.fill();

        scene.textures.addCanvas(key, canvas);
    }

    // 4. GRID
    static createScanlineGrid(scene) {
         if (!scene.textures.exists('scanline_pattern')) {
            const height = 120; 
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0,0,64,height);
            const lineColor = "rgba(100, 200, 255, 0.15)";
            ctx.fillStyle = lineColor;
            ctx.fillRect(0, 0, 64, 2);
            ctx.fillStyle = "rgba(100, 200, 255, 0.08)";
            ctx.fillRect(0, height/2, 64, 1);

            scene.textures.addCanvas('scanline_pattern', canvas);
        }
    }

    // 5. GLIFY TŁA
    static createGlyphPlaceholders(scene) {
        const glyphs = ['glyph_tm', 'glyph_lo', 'glyph_lp'];
        const colors = { 'glyph_tm': '#C51523', 'glyph_lo': '#0085B7', 'glyph_lp': '#A43282' };
        
        glyphs.forEach(key => {
            if (!scene.textures.exists(key)) {
                const size = 64;
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = colors[key];
                ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.fill();

                ctx.globalAlpha = 0.8;
                ctx.fillStyle = "white";
                ctx.font = "bold 30px Arial";
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                const text = key.split('_')[1].toUpperCase();
                ctx.fillText(text, size/2, size/2);

                scene.textures.addCanvas(key, canvas);
            }
        });
    }

    static createRipple(scene) { 
        if (!scene.textures.exists('ripple')) {
            const size = 64; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d');
            ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI*2); ctx.stroke();
            scene.textures.addCanvas('ripple', canvas);
        }
    }

    static createSpark(scene) { 
        if (!scene.textures.exists('spark')) {
            const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8; const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(4,4,0, 4,4,4); grad.addColorStop(0, 'white'); grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad; ctx.fillRect(0,0,8,8);
            scene.textures.addCanvas('spark', canvas);
        }
    }
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}