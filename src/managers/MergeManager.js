import Phaser from 'phaser';
import { BRANDS, TIERS } from '../Constants';
import { SoundManager } from '../SoundManager';
import { EffectManager } from '../EffectManager';
import { StorageManager } from '../StorageManager';

export class MergeManager {
    constructor(scene, ballManager) {
        this.scene = scene;
        this.ballManager = ballManager;
        
        // --- NOWOŚĆ: System Kolejkowania ---
        this.mergeQueue = [];          // Kolejka zadań do wykonania
        this.processedPairs = new Set(); // Zabezpieczenie przed duplikatami w klatce
        
        // Podpinamy się pod cykl update sceny, aby czyścić kolejkę bezpiecznie
        this.scene.events.on('update', this.processMergeQueue, this);
        
        // Sprzątanie przy restarcie
        this.scene.events.once('shutdown', () => {
            this.scene.events.off('update', this.processMergeQueue, this);
        });
    }

    setupCollisions() {
        this.scene.matter.world.on('collisionstart', (event) => {
            if (this.scene.isGameOver) return;

            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                
                // 1. Walidacja wstępna (czy to w ogóle GameObjecty?)
                if (!bodyA.gameObject || !bodyB.gameObject) return;
                
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;

                // Oznaczamy, że dotknęły czegokolwiek (dla logiki GameOver)
                objA.setData('safe', true);
                objB.setData('safe', true);

                // 2. Unikalne ID pary (zawsze mniejsze-większe), żeby A-B i B-A to było to samo
                const idA = bodyA.id;
                const idB = bodyB.id;
                const pairId = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;

                // 3. Sprawdzenie duplikatów w tej klatce
                if (this.processedPairs.has(pairId)) return;

                // 4. Sprawdzenie warunków logicznych (separacja logiki)
                if (this.canMerge(objA, objB)) {
                    // Blokujemy parę na tę klatkę
                    this.processedPairs.add(pairId);
                    
                    // Blokujemy obiekty (flagi), żeby nie weszły w inną kolizję w tej samej klatce
                    objA.isMerging = true;
                    objB.isMerging = true;

                    // WRZUCAMY DO KOLEJKI (nie niszczymy jeszcze!)
                    this.mergeQueue.push({ objA, objB });
                }
            });
        });
    }

    // --- Czysta funkcja logiczna: Czy te dwa obiekty mogą się połączyć? ---
    canMerge(objA, objB) {
        // Czy są aktywne i nie są już w trakcie łączenia?
        if (!objA.active || !objB.active) return false;
        if (objA.isMerging || objB.isMerging) return false;
        if (objA.isDestroying || objB.isDestroying) return false;

        const tierA = objA.getData('tier');
        const tierB = objB.getData('tier');

        // Muszą mieć ten sam tier i nie być Max Level (Grand Balli nie łączymy fizycznie)
        if (tierA !== tierB || tierA >= 7) return false;

        const brandA = objA.getData('brand');
        const brandB = objB.getData('brand');

        // Warunek 1: Dwie neutralne (szare)
        if (brandA === 'neutral' && brandB === 'neutral') return true;

        // Warunek 2: Ten sam brand (kolor)
        if (brandA === brandB && brandA !== 'neutral') return true;

        return false;
    }

    // --- FLUSH: Wykonuje się w 'update', czyli PO kroku fizyki ---
    processMergeQueue() {
        if (this.mergeQueue.length === 0) return;

        for (const task of this.mergeQueue) {
            const { objA, objB } = task;

            // Upewniamy się po raz ostatni (mogły zostać zniszczone przez wybuch w międzyczasie)
            if (!objA.active || !objB.active) continue;

            this.executeMerge(objA, objB);
        }

        // Czyścimy kolejkę i blokady par na następną klatkę
        this.mergeQueue = [];
        this.processedPairs.clear();
        
        // (Opcjonalnie) Sprawdź Trinity po wszystkich złączeniach
        this.checkTrinityCondition();
    }

    executeMerge(objA, objB) {
        const tier = objA.getData('tier');
        const brand = objA.getData('brand');
        
        const midX = (objA.x + objB.x) / 2;
        const midY = (objA.y + objB.y) / 2;

        // --- FIX: ZABIJAMY TWEENY PRZED ZNISZCZENIEM ---
        // To zatrzymuje deformację (squash), zanim usuniemy ciało fizyczne.
        // Zapobiega błędowi "Cannot read properties of undefined (reading 'position')"
        this.scene.tweens.killTweensOf(objA);
        this.scene.tweens.killTweensOf(objB);
        // -----------------------------------------------

        // Usuwanie ciał z World
        if (objA.body) this.scene.matter.world.remove(objA.body);
        if (objB.body) this.scene.matter.world.remove(objB.body);

        // Niszczenie wizualne
        objA.destroy();
        objB.destroy();

        // Logika gry (Dźwięk, Punkty)
        SoundManager.play('merge', { tier: tier }); // Dodalem param tier dla lepszego dzwieku
        const points = (tier + 1) * 10;
        this.scene.events.emit('update-score', this.scene.score + points);
        this.scene.score += points;

        // Efekty
        const brandInfo = BRANDS[brand ? brand.toUpperCase() : 'TM']; 
        if (EffectManager && EffectManager.createMergeEffect) {
            EffectManager.createMergeEffect(midX, midY, objA.displayWidth * 0.6, brandInfo ? brandInfo.color : '#ffffff');
            EffectManager.showFloatingText(midX, midY, `+${points}`);
        }

        // Spawn nowej kulki
        if (tier < 7) {
            this.spawnMergedBall(midX, midY, brand, tier + 1);
        }
    }

    spawnMergedBall(x, y, brand, tier) {
        if (tier >= 2) {
             if (StorageManager.markAsDiscovered(brand, tier)) {
                 this.scene.events.emit('discovery', { brand: brand, tier: tier });
             }
        }

        // isSafe = true, żeby nie zaliczyć Game Over
        const ball = this.ballManager.spawnPhysicalBall(x, y, brand, tier, true);

        if (ball) {
            // 1. MIKRO PODSKOK (Fizyka)
            ball.setVelocityY(-4); // Lekko w górę
            ball.setAngularVelocity(Phaser.Math.FloatBetween(-0.1, 0.1));

            // 2. BEZPIECZNA ELASTYCZNOŚĆ (Wizualne)
            // WAŻNE: Nie ustawiamy scale na 0! Zaczynamy od 0.7
            // Dzięki temu fizyka wciąż "widzi" kulkę i nie przepuści jej przez podłogę.
            ball.setScale(0.7); 
            
            this.scene.tweens.add({
                targets: ball,
                scaleX: 1, 
                scaleY: 1,
                duration: 600,
                ease: 'Elastic.Out',
                easeParams: [1.2, 0.8] 
            });
        }
    }
    
    // --- Trinity zostaje bez zmian, tylko wywołanie w update ---
    checkTrinityCondition() {
        if (this.isMorphingTrinity) return;
        // ... (reszta kodu Trinity bez zmian) ...
        const candidates = this.scene.children.list.filter(c => 
            c.getData && c.getData('tier') === 6 && c.getData('safe') && !c.isDestroying && c.active
        );

        if (candidates.length < 3) return;

        const uniqueBrands = new Set();
        const selectedBalls = [];

        for (let ball of candidates) {
            const b = ball.getData('brand');
            if (!uniqueBrands.has(b)) {
                uniqueBrands.add(b);
                selectedBalls.push(ball);
            }
            if (uniqueBrands.size === 3) break; 
        }

        if (uniqueBrands.size === 3) {
            this.performTrinityMerge(selectedBalls[0], selectedBalls[1], selectedBalls[2]);
        }
    }

    performTrinityMerge(ballA, ballB, ballC) {
        this.isMorphingTrinity = true;
        this.scene.isMorphingTrinity = true;
        
        // Tutaj też warto wyczyścić fizykę przed animacją
        [ballA, ballB, ballC].forEach(b => {
            b.isDestroying = true; 
            if(b.body) this.scene.matter.world.remove(b.body); // Usuwamy z symulacji
            b.body = null; // Odpinamy referencję
        });

        const cx = this.scene.scale.width / 2;
        const cy = this.scene.scale.height / 2;

        this.scene.effects.createEnergyRipple(cx, cy, true);

        this.scene.tweens.add({
            targets: [ballA, ballB, ballC],
            x: cx, y: cy, angle: 720, scaleX: 0.1, scaleY: 0.1,
            duration: 1500, ease: 'Expo.In',
            onComplete: () => {
                ballA.destroy(); ballB.destroy(); ballC.destroy();
                this.spawnGrandTebBall(cx, cy);
            }
        });
    }

    spawnGrandTebBall(x, y) {
        const ball = this.scene.add.image(x, y, 'ball_TEB_GRAND');
        ball.setDepth(3000).setScale(0);    
        
        this.scene.effects.createEnergyRipple(x, y, true);
        SoundManager.play('grand');

        this.scene.tweens.add({
            targets: ball, 
            scaleX: 1.5, scaleY: 1.5, angle: 360, 
            ease: 'Elastic.Out', duration: 1200,
            onComplete: () => {
                this.performGrandExplosion(x, y, ball);
            }
        });
    }

    performGrandExplosion(x, y, visualObject) {
        this.scene.cameras.main.shake(600, 0.03);
        this.scene.effects.createEnergyRipple(x, y, true);
        
        // Punkty za Grand Balla
        const points = 5000;
        this.scene.score += points;
        this.scene.events.emit('update-score', this.scene.score);
        EffectManager.showFloatingText(x, y, `TEB MASTER!`);

        // Niszczenie otoczenia
        const killRadius = 300; 
        const ballsToKill = this.scene.children.list.filter(c => 
            c.body && c.getData && c !== visualObject && c.getData('tier') < 6 
        );

        ballsToKill.forEach(b => {
            const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
            if (dist < killRadius) {
                // Mały efekt cząsteczkowy
                this.createExplosionDebris(b.x, b.y);
                b.destroy();
            } else if (dist < killRadius * 1.5) {
                const angle = Phaser.Math.Angle.Between(x, y, b.x, b.y);
                b.setVelocity(Math.cos(angle)*15, Math.sin(angle)*15);
            }
        });

        this.scene.tweens.add({
            targets: visualObject,
            scaleX: 3, scaleY: 3, alpha: 0, duration: 400, ease: 'Quad.Out',
            onComplete: () => {
                visualObject.destroy();
                this.isMorphingTrinity = false;
                this.scene.isMorphingTrinity = false;
                
                this.scene.grandBallsCollected++;
                this.scene.events.emit('update-grand-count', this.scene.grandBallsCollected);
            }
        });
    }

    createExplosionDebris(x, y) {
        if(!this.scene.textures.exists('spark')) return;
        const particles = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 50, max: 150 }, scale: { start: 0.5, end: 0 },
            lifespan: 300, quantity: 5, blendMode: 'ADD'
        });
        particles.explode();
        this.scene.time.delayedCall(300, () => particles.destroy());
    }
}