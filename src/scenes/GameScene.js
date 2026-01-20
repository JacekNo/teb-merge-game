import Phaser from 'phaser';
import { SETTINGS, GAME_CONFIG, TEB_GRAND_BALL } from '../Constants';
import { TextureGenerator } from '../TextureGenerator';
import { EnvironmentBuilder } from '../EnvironmentBuilder';
import { SoundManager } from '../SoundManager';
import { EffectManager } from '../EffectManager';

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    // --- ZMIENNE ---
    currentBrand = null; currentTier = 0; currentBallPreview = null;
    nextBallBrand = null; nextBallTier = 0;
    canDrop = true; score = 0;
    grandBallsCollected = 0; ballsToWin = 3;
    isGameOver = false; isMorphingTrinity = false;
    isAiming = false; // <--- DODAJ TĘ ZMIENNĄ

    aimLine; bgGrid; floatingArtifacts = []; effects;

    preload() {
        this.load.setPath('assets');
        ['tm_a', 'lo_a', 'lp_a', 'tm_b', 'lo_b', 'lp_b'].forEach(k => 
            this.load.svg(`icon_${k}`, `${k.startsWith('tm')?'tm':k.startsWith('lo')?'lo':'lp'}_icon_${k.endsWith('a')?'1':'2'}.svg`));
        ['tm', 'lo', 'lp'].forEach(k => {
            this.load.svg(`signet_${k}`, `signet_${k}.svg`);
            this.load.svg(`glyph_${k}`, `glyph_${k}.svg`);
        });
        this.load.svg('logo_teb', 'logo_teb.svg');
        this.load.svg('claim', 'claim.svg');
        this.load.image('bg_main', 'background.png');
    }

    create() {
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

        // 4. UI START (POPRAWKA: Bez sprawdzania isActive, po prostu uruchamiamy)
        this.scene.launch('UIScene');
        
        // Listener powrotu
        this.events.on('request-menu', () => { 
            this.scene.stop('UIScene');
            this.scene.start('StartScene'); 
        });

        // 5. START LOGIKI
        this.startNewGame();
    }

    startNewGame() {
        // Zmuszamy silnik do pracy
        this.sys.resume();
        this.matter.world.resume();
        
        // Reset zmiennych
        this.canDrop = true;
        this.score = 0;
        this.grandBallsCollected = 0;
        this.isGameOver = false;
        this.isMorphingTrinity = false;
        this.isAiming = false; // <--- DODAJ RESET TUTAJ

        // Reset UI (z lekkim opóźnieniem, żeby scena zdążyła wstać)
        this.time.delayedCall(50, () => {
            // Wymuszamy zamknięcie menu pauzy w UI (jeśli by wisiało)
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
        // Losowanie pierwszych kulek
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
        // Sprawdzamy typ urządzenia
        const isDesktop = this.sys.game.device.os.desktop;

        // 1. RUCH (Celowanie)
        this.input.on('pointermove', (pointer) => {
            if (this.isGameOver) return;
            this.updateAimPosition(pointer.x);
        });

        // 2. WCIŚNIĘCIE
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver || !this.canDrop) return;
            
            this.updateAimPosition(pointer.x);

            if (isDesktop) {
                this.dropBall(this.aimLine.x);
            } else {
                this.isAiming = true;
            }
        });

        // 3. PUSZCZENIE (Dla mobile)
        this.input.on('pointerup', () => {
            if (this.isAiming && !isDesktop) {
                if (this.canDrop) {
                    this.dropBall(this.aimLine.x);
                }
                this.isAiming = false;
            }
        });

        this.input.on('pointerupoutside', () => {
            this.isAiming = false;
        });
    }

    // --- TA METODA MUSI BYĆ TUTAJ, WEWNĄTRZ KLASY ---
    updateAimPosition(x) {
        // Upewniamy się, że SETTINGS istnieje
        const sideMargin = (SETTINGS && SETTINGS.sideMargin) ? SETTINGS.sideMargin : 50;
        const pad = sideMargin + 25;
        
        const clampedX = Phaser.Math.Clamp(x, pad, this.game.config.width - pad);
        
        if (this.aimLine) {
            this.aimLine.x = clampedX;
        }
        
        if (this.currentBallPreview && this.canDrop) {
            this.currentBallPreview.x = clampedX;
        }
    }

    spawnPreviewBall() {
        if (this.currentBallPreview) this.currentBallPreview.destroy();
        const tierDef = GAME_CONFIG.activeTiers.find(t => t.level === this.currentTier);
        if (!tierDef) return;

        const key = `ball_${this.currentBrand}_${this.currentTier}`;
        this.currentBallPreview = this.add.image(this.aimLine ? this.aimLine.x : 200, SETTINGS.spawnY, key)
            .setDisplaySize(tierDef.radius*2, tierDef.radius*2).setAlpha(0.8);
        
        this.tweens.add({ targets: this.currentBallPreview, scaleX: '*=1.05', scaleY: '*=1.05', duration: 500, yoyo: true, repeat: -1 });
    }

    dropBall(x) {
        this.canDrop = false;
        if (this.currentBallPreview) { this.currentBallPreview.destroy(); this.currentBallPreview = null; }

        this.spawnBall(x, SETTINGS.spawnY, this.currentBrand, this.currentTier, false);

        this.currentBrand = this.nextBallBrand; this.currentTier = this.nextBallTier;
        const nextPick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.nextBallBrand = nextPick.brand; this.nextBallTier = nextPick.tier;
        
        this.events.emit('update-next', { brand: this.nextBallBrand, tier: this.nextBallTier });
        this.time.addEvent({ delay: SETTINGS.dropDelay, callback: () => { this.canDrop = true; this.spawnPreviewBall(); } });
    }

    spawnBall(x, y, brandKey, tierLevel, isSafe) {
        const brand = GAME_CONFIG.activeBrands[brandKey.toUpperCase()] || GAME_CONFIG.activeBrands[brandKey];
        const tier = GAME_CONFIG.activeTiers.find(t => t.level === tierLevel);
        if (!brand || !tier) return null;

        let key = `ball_${brand.id}_${tier.level}`;
        if (!this.textures.exists(key)) key = `ball_${brandKey}_0`;

        const ball = this.matter.add.image(x, y, key);
        ball.setCircle(tier.radius).setBounce(SETTINGS.bounce).setFriction(SETTINGS.friction);
        ball.setData({ brand: brand.id, tier: tier.level, safe: isSafe });

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

                    if (bA.getData('brand') === bB.getData('brand') && 
                        bA.getData('tier') === bB.getData('tier') && 
                        bA.getData('tier') < 3 && 
                        !bA.isDestroying && !bB.isDestroying) {
                        this.handleMerge(bA, bB);
                    }
                }
            });
        });
    }

    handleMerge(ballA, ballB) {
        if (!ballA.body || !ballB.body || ballA.isDestroying || ballB.isDestroying) return;

        ballA.isDestroying = true; ballB.isDestroying = true;
        this.tweens.killTweensOf([ballA, ballB]);
        ballA.setSensor(true).setStatic(true); ballB.setSensor(true).setStatic(true);

        const newX = (ballA.x + ballB.x) / 2; const newY = (ballA.y + ballB.y) / 2;
        const brandId = ballA.getData('brand');
        const nextTier = ballA.getData('tier') + 1;
        
        const tierObj = GAME_CONFIG.activeTiers.find(t => t.level === ballA.getData('tier'));
        if (tierObj) {
            this.score += tierObj.points;
            this.events.emit('update-score', this.score);
        }

        this.effects.createEnergyRipple(newX, newY); // UŻYCIE EFFECT MANAGERA
        SoundManager.play('merge', { tier: ballA.getData('tier') });

        this.tweens.add({
            targets: [ballA, ballB], x: newX, y: newY, scaleX: 0.1, scaleY: 0.1, duration: 50,
            onComplete: () => {
                ballA.destroy(); ballB.destroy();
                if (GAME_CONFIG.activeTiers.some(t => t.level === nextTier)) {
                    this.spawnMergedBall(newX, newY, brandId, nextTier);
                    if (nextTier === 3) this.time.delayedCall(50, () => this.checkTrinityCondition());
                }
            }
        });
    }

    spawnMergedBall(x, y, brand, tier) {
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

    checkTrinityCondition() {
        if (this.isMorphingTrinity) return;
        const balls = this.children.list.filter(c => c.getData && c.getData('tier') === 3 && c.getData('safe') && !c.isDestroying);
        const tm = balls.find(b => b.getData('brand').toLowerCase().startsWith('tm'));
        const lo = balls.find(b => b.getData('brand').toLowerCase().startsWith('lo'));
        const lp = balls.find(b => b.getData('brand').toLowerCase().startsWith('lp'));

        if (tm && lo && lp) this.performTrinityMerge(tm, lo, lp);
    }

    performTrinityMerge(ballA, ballB, ballC) {
        this.isMorphingTrinity = true;
        
        // Zatrzymujemy kulki i wyłączamy im kolizje
        [ballA, ballB, ballC].forEach(b => {
            b.isDestroying = true;
            b.setSensor(true);
            b.setStatic(true);
            b.setVelocity(0,0);
        });

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.effects.createEnergyRipple(centerX, centerY, true);

        // Animacja zbiegania się do środka
        this.tweens.add({
            targets: [ballA, ballB, ballC],
            x: centerX, 
            y: centerY, 
            angle: 720, 
            scaleX: 0.1, 
            scaleY: 0.1,
            duration: 1500, 
            ease: 'Expo.In',
            onComplete: () => {
                // Usuwamy stare kulki
                ballA.destroy(); 
                ballB.destroy(); 
                ballC.destroy();
                
                // Tworzymy Wielką Kulę
                this.spawnGrandTebBall(centerX, centerY);
            }
        });
    }

    spawnGrandTebBall(x, y) {
        if (!this.textures.exists('ball_TEB_GRAND')) {
            TextureGenerator.createGrandBall(this);
        }

        // Tworzymy obiekt jako obrazek (nie fizyczny)
        const ball = this.add.image(x, y, 'ball_TEB_GRAND');
        ball.setDepth(3000); 
        ball.setScale(0);    
        
        if (this.effects) {
            this.effects.createEnergyRipple(x, y, true);
            this.effects.createImpactSparks(x, y, true);
        }
        SoundManager.play('grand');

        // --- ANIMACJA 1: POJAWIENIE SIĘ (Eksplozja) ---
        this.tweens.add({
            targets: ball, 
            scaleX: 1.5, scaleY: 1.5, angle: 360, 
            ease: 'Elastic.Out', duration: 1200,
            onComplete: () => {
                // Zwiększamy licznik w logice gry
                this.grandBallsCollected++;
                
                // Dodajemy punkty i tekst od razu
                this.score += TEB_GRAND_BALL.points;
                this.events.emit('update-score', this.score);
                if (this.effects) {
                    this.effects.showFloatingText(x, y, `+${TEB_GRAND_BALL.points}`, '#fbbf24');
                }

                // UWAGA: NIE aktualizujemy UI tutaj, żeby nie psuć timingu!
                // this.events.emit('update-grand-count', ...); <--- USUNIĘTE STĄD

                this.isMorphingTrinity = false;

                // --- DECYZJA ---
                if (this.grandBallsCollected >= this.ballsToWin) {
                    // 1. WYGRANA (3. kula)
                    // Tu aktualizujemy UI od razu, bo nie ma animacji lotu
                    this.events.emit('update-grand-count', this.grandBallsCollected);
                    
                    this.time.delayedCall(500, () => {
                        this.triggerVictory();
                    });
                } else {
                    // 2. ZBIERANIE (1. lub 2. kula) -> Odlot do UI
                    this.time.delayedCall(800, () => {
                        // --- ANIMACJA 2: LOT DO UI ---
                        this.tweens.add({
                            targets: ball,
                            x: this.scale.width - 50, // Prawy górny róg
                            y: 120, 
                            scaleX: 0.1, scaleY: 0.1, alpha: 0, 
                            duration: 800, ease: 'Back.In',
                            onComplete: () => {
                                // --- AKTUALIZACJA UI DOPIERO TERAZ ---
                                // Kula doleciała i zniknęła -> zapalamy ikonkę
                                this.events.emit('update-grand-count', this.grandBallsCollected);
                                ball.destroy();
                            }
                        });
                    });
                }
            }
        });
    }

    triggerVictory() {
        this.isGameOver = true; this.matter.world.pause(); this.events.emit('game-won', this.score);
    }
    triggerGameOver() {
        this.isGameOver = true; this.matter.world.pause(); SoundManager.play('gameover'); this.events.emit('game-over');
    }
}