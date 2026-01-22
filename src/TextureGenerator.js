import { BRANDS, TIERS, TEB_GRAND_BALL } from './Constants';

export class TextureGenerator {
    
    static createAll(scene) {
        this.createMissingIconPlaceholders(scene);
        this.createBackgroundTexture(scene);
        this.createNeutralBall(scene);
        this.createBrandBalls(scene);
        this.createGrandBall(scene); 
        this.createRipple(scene);
        this.createScanlineGrid(scene);
        this.createSpark(scene);
    }

    static createBrandBalls(scene) {
        Object.values(BRANDS).forEach(brand => {
            TIERS.forEach(tier => {
                if (tier.level === 0 || tier.level === 7) return;

                const key = `ball_${brand.id}_${tier.level}`;
                if (scene.textures.exists(key)) return;

                const d = tier.radius * 2;
                const canvas = document.createElement('canvas');
                canvas.width = d; canvas.height = d;
                const ctx = canvas.getContext('2d');
                const cx = tier.radius; const cy = tier.radius; const r = tier.radius;
                
                // 1. USTALANIE KOLORU
                let drawColor = brand.color;
                if (tier.level === 2) drawColor = adjustColor(brand.color, 30);
                if (tier.level === 3) drawColor = adjustColor(brand.color, 60);

                // --- 2. RYSOWANIE TŁA (ASYMETRYCZNE) ---
                const isGlassTier = (tier.level === 4 || tier.level === 5);
                const lightOffsetX = isGlassTier ? r * 0.25 : 0;
                const lightOffsetY = isGlassTier ? r * 0.25 : 0;

                const grad = ctx.createRadialGradient(cx - lightOffsetX, cy - lightOffsetY, 0, cx, cy, r);
                
                // T4: PÓŁPRZEZROCZYSTE (Delikatne)
                if (tier.level === 4) {
                    grad.addColorStop(0.0, hexToRgba('#ffffff', 0.08)); 
                    grad.addColorStop(0.5, hexToRgba(drawColor, 0.05)); 
                    grad.addColorStop(0.85, hexToRgba(drawColor, 0.25)); 
                    grad.addColorStop(1.0, hexToRgba(drawColor, 0.4));   
                }
                // T5: PRZEZROCZYSTE (Krystaliczne)
                else if (tier.level === 5) {
                    grad.addColorStop(0.0, hexToRgba('#ffffff', 0.0));   
                    grad.addColorStop(0.7, hexToRgba(drawColor, 0.02));  
                    grad.addColorStop(0.9, hexToRgba(drawColor, 0.15));  
                    grad.addColorStop(1.0, hexToRgba(drawColor, 0.3));   
                }
                // T1-T3: PEŁNE (Solid)
                else {
                    grad.addColorStop(0, drawColor); 
                    grad.addColorStop(1, adjustColor(drawColor, -30));
                }

                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 
                ctx.fillStyle = grad; ctx.fill();

                // Cień wewnętrzny (tylko dla Solid)
                if (tier.level <= 3) {
                    const shadowGrad = ctx.createLinearGradient(0, 0, 0, d);
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = shadowGrad; ctx.fill();
                }

                // --- 3. ZAWARTOŚĆ (IKONY) ---
                let assetKey = null;
                let iconScale = 1.0;

                if (tier.type === 'ICON') {
                    assetKey = `icon_${brand.id}_${tier.level}`;
                    if (tier.level === 4) iconScale = 1.5; 
                    if (tier.level === 5) iconScale = 1.65; 
                } else if (tier.type === 'SIGNET') {
                    assetKey = `signet_${brand.id}`;
                    iconScale = 1.4;
                }

                if (assetKey && scene.textures.exists(assetKey)) {
                    const img = scene.textures.get(assetKey).getSourceImage();
                    const iconSize = r * iconScale;
                    ctx.save();
                    if (tier.level <= 3) {
                        ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 2; ctx.shadowOffsetY = 2;
                    }
                    if (tier.level === 5) ctx.globalAlpha = 0.9;
                    ctx.drawImage(img, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
                    ctx.restore();
                } else {
                    // Fallback (Numer)
                    if (tier.type !== 'SOLID') {
                        ctx.fillStyle = (tier.level >= 4) ? drawColor : "rgba(255, 255, 255, 0.9)";
                        ctx.font = `900 ${Math.floor(r * 0.8)}px Arial`;
                        ctx.textAlign = "center"; ctx.textBaseline = "middle";
                        ctx.fillText(tier.level, cx, cy);
                    }
                }

                // --- 4. POLISH (BLIK - ULTRA SOFT) ---
                ctx.beginPath();
                // Rozciągamy elipsę bardziej, żeby gradient miał miejsce na rozmycie
                ctx.ellipse(cx - r*0.35, cy - r*0.35, r * 0.5, r * 0.35, Math.PI / 4, 0, Math.PI * 2);
                
                // Zwiększamy promień gradientu (r*0.8), żeby przejście było łagodne
                const softShine = ctx.createRadialGradient(cx - r*0.35, cy - r*0.35, 0, cx - r*0.35, cy - r*0.35, r * 0.8);
                
                if (isGlassTier) {
                    // SZKŁO: Bardzo miękki, mglisty start, szybkie wygaszenie
                    softShine.addColorStop(0.0, "rgba(255, 255, 255, 0.35)"); // Środek nie jest w pełni biały (unika plamy)
                    softShine.addColorStop(0.3, "rgba(255, 255, 255, 0.15)"); // Szybki spadek jasności
                    softShine.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");  // Całkowite rozmycie
                } else {
                    // SOLID: Rozproszone światło (Softbox)
                    softShine.addColorStop(0.0, "rgba(255, 255, 255, 0.25)"); 
                    softShine.addColorStop(0.5, "rgba(255, 255, 255, 0.05)"); 
                    softShine.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
                }
                ctx.fillStyle = softShine; ctx.fill();

                // --- 5. OBRYS (RIM LIGHT) ---
                if (tier.level >= 4) {
                    ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
                    ctx.strokeStyle = hexToRgba(drawColor, 0.25); 
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0.8 * Math.PI, 1.7 * Math.PI);
                    ctx.strokeStyle = "rgba(255,255,255,0.3)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(cx, cy, r - 1, Math.PI, Math.PI * 2);
                    ctx.strokeStyle = "rgba(255,255,255,0.1)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                scene.textures.addCanvas(key, canvas);
            });
        });
    }

    // --- GENERATOR KULKI NEUTRALNEJ (Również zmiękczony blik) ---
    static createNeutralBall(scene) {
        const tier = TIERS.find(t => t.level === 0);
        const key = `ball_neutral_${tier.level}`;
        if (scene.textures.exists(key)) return;
        const d = tier.radius * 2; const canvas = document.createElement('canvas'); canvas.width = d; canvas.height = d; const ctx = canvas.getContext('2d'); const cx = tier.radius; const r = tier.radius;
        const grad = ctx.createRadialGradient(cx - r*0.3, cx - r*0.3, 0, cx, cx, r); grad.addColorStop(0, '#cbd5e1'); grad.addColorStop(1, '#64748b'); 
        ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cx, r*0.25, 0, Math.PI*2); ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
        
        // ZMIĘKCZONY BLIK
        ctx.beginPath();
        ctx.ellipse(cx - r*0.3, cx - r*0.3, r * 0.4, r * 0.3, Math.PI / 4, 0, Math.PI * 2);
        const shine = ctx.createRadialGradient(cx - r*0.3, cx - r*0.3, 0, cx - r*0.3, cx - r*0.3, r * 0.7);
        shine.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        shine.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = shine; ctx.fill();
        
        scene.textures.addCanvas(key, canvas);
    }

    // --- GENERATOR GRAND BALLA (Poprawiony blik) ---
    static createGrandBall(scene) {
        const key = 'ball_TEB_GRAND';
        if (scene.textures.exists(key)) return;
        
        const d = TEB_GRAND_BALL.radius * 2;
        const canvas = document.createElement('canvas');
        canvas.width = d; canvas.height = d;
        const ctx = canvas.getContext('2d');
        
        // TU BYŁ BŁĄD: Brakowało definicji cy
        const cx = TEB_GRAND_BALL.radius; 
        const cy = TEB_GRAND_BALL.radius; // <--- DODANO
        const r = TEB_GRAND_BALL.radius;

        // Bogatszy gradient (Złoto i Granat)
        // Używamy cy zamiast drugiego cx dla porządku
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#FFF5CB');    // Bardzo jasny złoty środek
        grad.addColorStop(0.3, '#FBBF24');  // Złoty
        grad.addColorStop(0.7, TEB_GRAND_BALL.color); // Granat
        grad.addColorStop(1, '#0F172A');    // Ciemny granat na krawędzi

        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 
        ctx.fillStyle = grad; ctx.fill();

        // Efekt "Gwiezdnego pyłu"
        for(let i=0; i<20; i++) {
            const px = Math.random() * d;
            const py = Math.random() * d;
            if (Math.hypot(px-cx, py-cy) < r*0.9) {
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.beginPath(); ctx.arc(px, py, Math.random()*2, 0, Math.PI*2); ctx.fill();
            }
        }

        if (scene.textures.exists('logo_teb')) {
            const img = scene.textures.get('logo_teb').getSourceImage();
            const iconSize = r * 1.3;
            ctx.drawImage(img, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
        } else {
            // Fallback tekstowy
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10;
            ctx.fillStyle = "#ffffff";
            ctx.font = "900 42px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("TEB", cx, cy - 10);
            ctx.font = "700 24px Arial";
            ctx.fillText("MASTER", cx, cy + 25);
            ctx.restore();
        }

        // Mocny połysk
        ctx.beginPath();
        ctx.ellipse(cx - r*0.3, cy - r*0.3, r * 0.5, r * 0.3, Math.PI / 4, 0, Math.PI * 2);
        const shine = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx - r*0.3, cy - r*0.3, r*0.7);
        shine.addColorStop(0, "rgba(255, 255, 255, 0.6)");
        shine.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = shine; ctx.fill();

        scene.textures.addCanvas(key, canvas);
    }

    static createMissingIconPlaceholders(scene) {
        const requiredKeys = ['icon_ed', 'signet_ed', 'icon_tm', 'icon_lo', 'icon_lp'];
        
        requiredKeys.forEach(key => {
            if (!scene.textures.exists(key)) {
                const canvas = document.createElement('canvas');
                canvas.width = 64; canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = key.includes('ed') ? '#006B78' : '#64748b';
                ctx.beginPath(); ctx.roundRect(0,0,64,64,12); ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                const label = key.split('_')[1].toUpperCase(); 
                ctx.fillText(label, 32, 32);
                
                scene.textures.addCanvas(key, canvas);
            }
        });
    }

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

    static createRipple(scene) { 
        if (!scene.textures.exists('ripple')) {
            const size = 64; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d');
            ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI*2); ctx.stroke();
            scene.textures.addCanvas('ripple', canvas);
        }
    }

    static createScanlineGrid(scene) {
         if (!scene.textures.exists('scanline_pattern')) {
            const height = 120; 
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0,0,64,height);
            ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
            ctx.fillRect(0, 0, 64, 2);
            scene.textures.addCanvas('scanline_pattern', canvas);
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

// --- FUNKCJE POMOCNICZE ---

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Nowa funkcja (niezbędna do efektu szkła)
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}