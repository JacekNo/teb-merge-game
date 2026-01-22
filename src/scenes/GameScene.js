import Phaser from 'phaser';
import { SETTINGS, GAME_CONFIG, TEB_GRAND_BALL, TIERS, BRANDS } from '../Constants';
import { TextureGenerator } from '../TextureGenerator';
import { EnvironmentBuilder } from '../EnvironmentBuilder';
import { SoundManager } from '../SoundManager';
import { EffectManager } from '../EffectManager';
import { StorageManager } from '../StorageManager';

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    // --- ZMIENNE ---
    currentBrand = null; currentTier = 0; currentBallPreview = null;
    nextBallBrand = null; nextBallTier = 0;
    canDrop = true; score = 0;
    grandBallsCollected = 0; 
    isGameOver = false; isMorphingTrinity = false;
    isAiming = false;

    aimLine; bgGrid; floatingArtifacts = []; effects;

        preload() {
        this.load.setPath('assets');
        
        // 1. Główne
        this.load.svg('logo_teb', 'logo_teb.svg');
        this.load.image('bg_main', 'background.png');

        // 2. Ikony Ewolucji (T2-T5) i Sygnety (T6)
        const brands = ['tm', 'lo', 'lp'];
        brands.forEach(id => {
            this.load.svg(`icon_${id}_2`, `icon_${id}_2.svg`);
            this.load.svg(`icon_${id}_3`, `icon_${id}_3.svg`);
            this.load.image(`icon_${id}_4`, `icon_${id}_4.png`); // PNG
            this.load.image(`icon_${id}_5`, `icon_${id}_5.png`); // PNG
            this.load.svg(`signet_${id}`, `signet_${id}.svg`);
            
            // --- 3. PRZYWRÓCONE: GLIFY TŁA ---
            // To naprawi brakujące elementy w tle!
            this.load.svg(`glyph_${id}`, `glyph_${id}.svg`);
        });
    }

    create() {
        StorageManager.init();
        // 1. GRAFIKA
        TextureGenerator.createAll(this);
        const env = EnvironmentBuilder.init(this);
        this.aimLine = env.aimLine;
        this.bgGrid = env.bgGrid;
        this.floatingArtifacts = env.artifacts;
        this.effects = new EffectManager(this);

        // 2. FIZYKA
        this.setupPhysicsWorld();

        // 3. INPUT
        this.setupInput();
        this.setupCollisions();

        // 4. UI
        this.scene.launch('UIScene');
        
        this.events.on('request-menu', () => { 
            this.scene.stop('UIScene');
            this.scene.start('StartScene'); 
        });
        SoundManager.init(this);
        // 5. START
        this.startNewGame();
    }

    startNewGame() {
        this.sys.resume();
        this.matter.world.resume();
        
        this.canDrop = true;
        this.score = 0;
        this.grandBallsCollected = 0;
        this.isGameOver = false;
        this.isMorphingTrinity = false;
        this.isAiming = false;

        this.time.delayedCall(50, () => {
            if (this.scene.get('UIScene')) {
                this.scene.get('UIScene').forceMenuClose();
            }
            this.events.emit('update-grand-count', 0);
            this.events.emit('update-score', 0);
            this.resetRoundLogic();
        });
    }

    setupPhysicsWorld() {
        const { width, height } = this.game.config;
        const pad = SETTINGS.sideMargin;
        const wallThick = 100;
        const bottomPad = SETTINGS.bottomMargin;

        this.matter.world.setBounds(0, 0, width, height, 64, false, false, false, false);
        this.matter.add.rectangle(pad - wallThick/2, height/2, wallThick, height, { isStatic: true });
        this.matter.add.rectangle(width - pad + wallThick/2, height/2, wallThick, height, { isStatic: true });
        this.matter.add.rectangle(width/2, height - bottomPad + wallThick/2, width, wallThick, { isStatic: true });
    }

    resetRoundLogic() {
        // Losowanie z puli (może być Neutral Tier 0 lub Kolor Tier 1)
        let pick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.currentBrand = pick.brand; this.currentTier = pick.tier;

        pick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.nextBallBrand = pick.brand; this.nextBallTier = pick.tier;

        this.events.emit('update-next', { brand: this.nextBallBrand, tier: this.nextBallTier });
        this.spawnPreviewBall();
    }

    update(time, delta) {
        if (this.isGameOver) return;
        if (this.bgGrid) this.bgGrid.tilePositionY -= 20 * (delta / 1000);
        this.updateArtifacts(time, delta);
        this.checkDangerZone();
    }

    updateArtifacts(time, delta) {
        if (!this.floatingArtifacts) return;
        const artifacts = Array.isArray(this.floatingArtifacts) ? this.floatingArtifacts : this.floatingArtifacts.getChildren();
        artifacts.forEach(a => {
            a.y += (a.getData('speedY') || -0.5) * (delta / 16);
            if (a.getData('wobbleSpeed')) a.x = a.getData('initialX') + Math.sin(time * a.getData('wobbleSpeed')) * a.getData('wobbleAmp');
            if (a.y < -100) {
                a.y = this.scale.height + 100;
                a.setData('initialX', Phaser.Math.Between(0, this.scale.width));
                a.x = a.getData('initialX');
            }
        });
    }

    checkDangerZone() {
        const dangerY = (SETTINGS.dangerLineY || 180) + 150;
        let isDanger = false;
        const balls = this.children.list.filter(c => c.body && c.active && c.getData && c.getData('tier') !== undefined);

        balls.forEach(ball => {
            if (ball.getData('safe')) {
                if (ball.y < dangerY) isDanger = true;
                if (ball.y < SETTINGS.dangerLineY && Math.abs(ball.body.velocity.y) < 0.1) {
                    this.triggerGameOver();
                }
            }
        });

        if (this.wasDanger !== isDanger) {
            this.events.emit('danger-zone', isDanger);
            this.wasDanger = isDanger;
        }
    }

    setupInput() {
        const isDesktop = this.sys.game.device.os.desktop;

        this.input.on('pointermove', (pointer) => {
            if (this.isGameOver) return;
            this.updateAimPosition(pointer.x);
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver || !this.canDrop) return;
            this.updateAimPosition(pointer.x);
            if (isDesktop) {
                this.dropBall(this.aimLine.x);
            } else {
                this.isAiming = true;
            }
        });

        this.input.on('pointerup', () => {
            if (this.isAiming && !isDesktop) {
                if (this.canDrop) this.dropBall(this.aimLine.x);
                this.isAiming = false;
            }
        });
        
        this.input.on('pointerupoutside', () => { this.isAiming = false; });
    }

    updateAimPosition(x) {
        const sideMargin = (SETTINGS && SETTINGS.sideMargin) ? SETTINGS.sideMargin : 50;
        const pad = sideMargin + 25;
        const clampedX = Phaser.Math.Clamp(x, pad, this.game.config.width - pad);
        
        if (this.aimLine) this.aimLine.x = clampedX;
        if (this.currentBallPreview && this.canDrop) this.currentBallPreview.x = clampedX;
    }

    spawnPreviewBall() {
        if (this.currentBallPreview) this.currentBallPreview.destroy();
        
        // Pobieramy definicję tieru
        const tierDef = TIERS.find(t => t.level === this.currentTier);
        if (!tierDef) return;

        // Klucz tekstury - obsługa Neutral vs Brand
        let key;
        if (this.currentBrand === 'neutral') {
            key = `ball_neutral_${this.currentTier}`;
        } else {
            key = `ball_${this.currentBrand}_${this.currentTier}`;
        }

        // Fallback, jeśli tekstura nie istnieje (żeby nie wywaliło gry)
        if (!this.textures.exists(key)) key = `ball_neutral_0`;

        this.currentBallPreview = this.add.image(this.aimLine ? this.aimLine.x : 200, SETTINGS.spawnY, key)
            .setDisplaySize(tierDef.radius*2, tierDef.radius*2).setAlpha(0.8);
        
        this.tweens.add({ targets: this.currentBallPreview, scaleX: '*=1.05', scaleY: '*=1.05', duration: 500, yoyo: true, repeat: -1 });
    }

    dropBall(x) {
        
        this.canDrop = false;
        if (this.currentBallPreview) { this.currentBallPreview.destroy(); this.currentBallPreview = null; }

        this.spawnBall(x, SETTINGS.spawnY, this.currentBrand, this.currentTier, false);

        // Kolejkowanie następnej kulki
        this.currentBrand = this.nextBallBrand; this.currentTier = this.nextBallTier;
        
        const nextPick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.nextBallBrand = nextPick.brand; this.nextBallTier = nextPick.tier;
        
        this.events.emit('update-next', { brand: this.nextBallBrand, tier: this.nextBallTier });
        
        this.time.addEvent({ delay: SETTINGS.dropDelay, callback: () => { 
            this.canDrop = true; 
            this.spawnPreviewBall(); 
        }});
    }

    spawnBall(x, y, brandKey, tierLevel, isSafe) {
        const tier = TIERS.find(t => t.level === tierLevel);
        if (!tier) return null;

        // --- POPRAWKA: USTALANIE KLUCZA TEKSTURY ---
        let key;
        
        // 1. Jeśli to Tier 7 (Grand Ball), ZAWSZE używamy tej tekstury
        if (tierLevel === 7) {
            key = 'ball_TEB_GRAND';
        } 
        // 2. Jeśli marka to 'neutral'
        else if (brandKey === 'neutral') {
            key = `ball_neutral_${tierLevel}`;
        } 
        // 3. Standardowa kulka brandowa
        else {
            key = `ball_${brandKey}_${tierLevel}`;
        }

        // Fallback (gdyby coś poszło bardzo źle)
        if (!this.textures.exists(key)) {
            console.warn(`Brak tekstury: ${key}, używam fallbacku.`);
            key = this.textures.exists('ball_neutral_0') ? 'ball_neutral_0' : 'spark'; 
        }

        // Fizyczne stworzenie obiektu
        const ball = this.matter.add.image(x, y, key);
        
        // Parametry fizyczne
        ball.setCircle(tier.radius);
        ball.setBounce(SETTINGS.bounce);
        ball.setFriction(SETTINGS.friction);

        // Dociążenie
        const density = 0.001 + (tierLevel * 0.0005); 
        ball.setDensity(density);

        // Zapis danych
        ball.setData({ brand: brandKey, tier: tierLevel, safe: isSafe });

        if (!isSafe) {
            SoundManager.play('drop');
            ball.setScale(0.8, 1.2);
            this.tweens.add({ targets: ball, scaleX: 1, scaleY: 1, duration: 400, ease: 'Elastic.Out' });
        }
        return ball;
    }

    setupCollisions() {
        this.matter.world.on('collisionstart', (event) => {
            if (this.isGameOver) return;
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if (bodyA.gameObject && bodyB.gameObject) {
                    const bA = bodyA.gameObject; const bB = bodyB.gameObject;
                    bA.setData('safe', true); bB.setData('safe', true);

                    // --- LOGIKA MERGE ---
                    // Sprawdzamy czy to ten sam tier
                    const tierA = bA.getData('tier');
                    const tierB = bB.getData('tier');
                    
                    if (tierA === tierB && 
                        tierA < 7 && // Nie łączymy Grand Balli w ten sposób
                        !bA.isDestroying && !bB.isDestroying) {

                        const brandA = bA.getData('brand');
                        const brandB = bB.getData('brand');

                        // WARUNEK 1: Obie są Neutralne (Tier 0 -> Tier 1)
                        // Wtedy łączą się zawsze
                        if (brandA === 'neutral' && brandB === 'neutral') {
                            this.handleMerge(bA, bB, true); // true = forceRandomBrand
                            return;
                        }

                        // WARUNEK 2: Ten sam Kolor (Tier 1+ -> Tier 2+)
                        if (brandA === brandB && brandA !== 'neutral') {
                            this.handleMerge(bA, bB, false);
                            return;
                        }

                        // Inne przypadki (Różne kolory) -> Brak reakcji (odpychanie fizyczne)
                    }
                }
            });
        });
    }

    handleMerge(ballA, ballB, randomizeBrand) {
        ballA.isDestroying = true; ballB.isDestroying = true;
        
        // Zatrzymujemy fizykę
        ballA.setSensor(true).setStatic(true); 
        ballB.setSensor(true).setStatic(true);
        this.tweens.killTweensOf([ballA, ballB]);

        const newX = (ballA.x + ballB.x) / 2; 
        const newY = (ballA.y + ballB.y) / 2;
        
        const currentTier = ballA.getData('tier');
        const nextTier = currentTier + 1;

        // Punkty
        const tierObj = TIERS.find(t => t.level === currentTier);
        if (tierObj) {
            this.score += tierObj.points;
            this.events.emit('update-score', this.score);
            
            // --- DODAJ TO WYWOŁANIE: ---
            // Kolor tekstu bierzemy z marki nowej kulki (żeby pasował)
            // Lub złoty (#fbbf24) jeśli to wysoki tier
            let textColor = '#ffffff';
            if (ballA.getData('brand') && BRANDS[ballA.getData('brand').toUpperCase()]) {
                 textColor = BRANDS[ballA.getData('brand').toUpperCase()].color;
            }
            if (nextTier >= 5) textColor = '#fbbf24'; // Złoty dla eksperta/absolwenta

            this.effects.showFloatingText(newX, newY, `+${tierObj.points}`, textColor);
            // ---------------------------
        }

        // Dźwięk łączenia (chyba że to finał, wtedy cisza przed burzą)
        if (nextTier < 7) SoundManager.play('merge', { tier: nextTier });

        // --- DECYZJA O ANIMACJI ---
        
        // SCENARIUSZ 1: FINAŁ (T6 + T6 -> T7)
        if (nextTier === 7) {
            // Uruchamiamy specjalną sekwencję implozji
            this.performFinalImplosion(ballA, ballB, newX, newY);
        } 
        
        // SCENARIUSZ 2: STANDARDOWY MERGE
        else {
            let nextBrand = ballA.getData('brand');
            if (randomizeBrand) {
                const availableBrands = Object.values(GAME_CONFIG.activeBrands);
                nextBrand = Phaser.Utils.Array.GetRandom(availableBrands).id;
            }

            this.effects.createEnergyRipple(newX, newY);
            
            this.tweens.add({
                targets: [ballA, ballB], x: newX, y: newY, scaleX: 0.1, scaleY: 0.1, duration: 80,
                onComplete: () => {
                    ballA.destroy(); ballB.destroy();
                    this.spawnMergedBall(newX, newY, nextBrand, nextTier);
                }
            });
        }
    }

    spawnMergedBall(x, y, brand, tier) {
        // 1. Sprawdź, czy to nowe odkrycie (dla Tier 2 i wyżej)
        if (tier >= 2) {
             // Jeśli StorageManager zwróci true, znaczy że to pierwszy raz
             if (StorageManager.markAsDiscovered(brand, tier)) {
                 // Wysyłamy sygnał do UI, żeby pokazało Toast
                 this.events.emit('discovery', { brand: brand, tier: tier });
             }
        }

        // 2. Standardowa logika spawnowania
        const ball = this.spawnBall(x, y, brand, tier, true);
        if (!ball) return;
        
        ball.setVisible(false);
        const dummy = this.add.image(x, y, ball.texture.key).setDisplaySize(ball.displayWidth, ball.displayHeight).setScale(0.5).setAlpha(0.8).setDepth(10);
        this.tweens.add({
            targets: dummy, scaleX: 1, scaleY: 1, alpha: 1, ease: 'Back.Out', duration: 300,
            onUpdate: () => { if(ball.body) { dummy.x = ball.x; dummy.y = ball.y; } },
            onComplete: () => { dummy.destroy(); ball.setVisible(true); }
        });
    }

    // --- TRINITY CLEANER LOGIC ---
    checkTrinityCondition() {
        if (this.isMorphingTrinity) return;
        
        // Szukamy wszystkich kul z Tier 6 (Absolwent)
        const candidates = this.children.list.filter(c => 
            c.getData && 
            c.getData('tier') === 6 && 
            c.getData('safe') && 
            !c.isDestroying
        );

        if (candidates.length < 3) return;

        // Szukamy 3 RÓŻNYCH marek
        // Set automatycznie usuwa duplikaty
        const uniqueBrands = new Set();
        const selectedBalls = [];

        for (let ball of candidates) {
            const b = ball.getData('brand');
            if (!uniqueBrands.has(b)) {
                uniqueBrands.add(b);
                selectedBalls.push(ball);
            }
            if (uniqueBrands.size === 3) break; // Mamy komplet!
        }

        if (uniqueBrands.size === 3) {
            this.performTrinityMerge(selectedBalls[0], selectedBalls[1], selectedBalls[2]);
        }
    }

    performTrinityMerge(ballA, ballB, ballC) {
        this.isMorphingTrinity = true;
        
        [ballA, ballB, ballC].forEach(b => {
            b.isDestroying = true; b.setSensor(true); b.setStatic(true); b.setVelocity(0,0);
        });

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.effects.createEnergyRipple(centerX, centerY, true);

        // Animacja zlotu
        this.tweens.add({
            targets: [ballA, ballB, ballC],
            x: centerX, y: centerY, angle: 720, scaleX: 0.1, scaleY: 0.1,
            duration: 1500, ease: 'Expo.In',
            onComplete: () => {
                ballA.destroy(); ballB.destroy(); ballC.destroy();
                this.spawnGrandTebBall(centerX, centerY);
            }
        });
    }
performFinalImplosion(ballA, ballB, x, y) {
        // 1. Wstęp: Kulki wirują i zbiegają się do środka (IMPLOZJA)
        
        // Dźwięk narastania (jeśli masz, jak nie to grand)
        SoundManager.play('grand'); 

        this.tweens.add({
            targets: [ballA, ballB],
            x: x, y: y,
            angle: 360,          // Obrót przy wciąganiu
            scaleX: 0, scaleY: 0, // Znikają w nicość
            duration: 600,
            ease: 'Back.In',     // Efekt "zassania"
            onComplete: () => {
                ballA.destroy(); 
                ballB.destroy();
                
                // 2. Odsłonięcie Sygnetu (TEB Grand Ball jako czysty sygnet)
                this.revealTheSignet(x, y);
            }
        });
        
        // Efekt wciągania cząsteczek
        this.effects.createEnergyRipple(x, y, true);
    }

    revealTheSignet(x, y) {
        // Tworzymy wizualny obiekt Sygnetu (bez fizyki na razie)
        // Używamy tekstury 'ball_TEB_GRAND' (ona ma logo w środku)
        // ALBO 'logo_teb' jeśli wolisz czyste logo bez tła
        const core = this.add.image(x, y, 'ball_TEB_GRAND'); 
        core.setDepth(2000);
        core.setScale(0); // Startujemy od zera
        core.setAlpha(1);

        // 3. Pulsowanie i Wybuch
        this.tweens.add({
            targets: core,
            scaleX: 1.2, scaleY: 1.2, // Rośnie szybko
            duration: 400,
            ease: 'Expo.Out',
            onComplete: () => {
                // Chwila zawieszenia (Tension)
                this.tweens.add({
                    targets: core,
                    scaleX: 0.9, scaleY: 0.9, // Lekki skurcz przed wybuchem
                    duration: 150,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        // 4. WIELKI WYBUCH
                        this.performGrandExplosion(x, y, core);
                    }
                });
            }
        });
    }
    spawnGrandTebBall(x, y) {
        // Tier 7 - Grand Ball
        const ball = this.add.image(x, y, 'ball_TEB_GRAND');
        ball.setDepth(3000); 
        ball.setScale(0);    
        
        if (this.effects) {
            this.effects.createEnergyRipple(x, y, true);
            this.effects.createImpactSparks(x, y, true);
        }
        SoundManager.play('grand');

        // Faza 1: Pojawienie się i ładowanie
        this.tweens.add({
            targets: ball, 
            scaleX: 1.5, scaleY: 1.5, angle: 360, 
            ease: 'Elastic.Out', duration: 1200,
            onComplete: () => {
                // Faza 2: EKSPLOZJA (Board Cleaner)
                this.performGrandExplosion(x, y, ball);
            }
        });
    }

    performGrandExplosion(x, y, visualObject) {
        // Efekt wizualny wybuchu
        this.cameras.main.shake(600, 0.03); // Mocny wstrząs
        this.effects.createEnergyRipple(x, y, true); // Wielka fala
        
        // Punkty
        this.score += 5000;
        this.events.emit('update-score', this.score);
        this.effects.showFloatingText(x, y, `TEB MASTER!`, '#fbbf24');

        // Logika niszczenia otoczenia
        const killRadius = 300; // Zwiększony zasięg wybuchu
        const ballsToKill = this.children.list.filter(c => 
            c.body && c.getData && 
            c !== visualObject && // Nie niszczymy samego sygnetu jeszcze
            c.getData('tier') < 6 // Nie niszczymy innych T6 (żeby można było zrobić combo)
        );

        ballsToKill.forEach(b => {
            const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
            if (dist < killRadius) {
                this.createExplosionDebris(b.x, b.y, b.getData('tier'));
                b.destroy();
            } else if (dist < killRadius * 1.5) {
                // Odpychamy te dalej
                const angle = Phaser.Math.Angle.Between(x, y, b.x, b.y);
                const force = 15;
                b.setVelocity(Math.cos(angle)*force, Math.sin(angle)*force);
            }
        });

        // Finałowe zniknięcie Sygnetu (Ucieczka do UI lub Fade out)
        // Tutaj robimy Fade Out + Skalowanie jako "rozpłynięcie się energii"
        this.tweens.add({
            targets: visualObject,
            scaleX: 3, scaleY: 3, 
            alpha: 0,
            duration: 400,
            ease: 'Quad.Out',
            onComplete: () => {
                visualObject.destroy();
                this.isMorphingTrinity = false;
                
                // Licznik Grand Balli
                this.grandBallsCollected++;
                this.events.emit('update-grand-count', this.grandBallsCollected);
            }
        });
    }
    
    // Mały efekt cząsteczkowy przy niszczeniu kulki wybuchem
    createExplosionDebris(x, y, tier) {
        if(!this.textures.exists('spark')) return;
        const particles = this.add.particles(x, y, 'spark', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 5,
            blendMode: 'ADD'
        });
        particles.explode();
        this.time.delayedCall(300, () => particles.destroy());
    }

    triggerVictory() {
        // W trybie Endless to może być po prostu nowy próg punktowy
        this.events.emit('game-won', this.score);
    }
    
    triggerGameOver() {
        this.isGameOver = true; this.matter.world.pause(); 
        SoundManager.play('gameover'); 
        this.events.emit('game-over');
    }
}