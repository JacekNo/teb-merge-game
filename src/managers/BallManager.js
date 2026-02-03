import Phaser from 'phaser';
import { SETTINGS, GAME_CONFIG, TIERS } from '../Constants';
import { SoundManager } from '../SoundManager';

export class BallManager {
    constructor(scene) {
        this.scene = scene;
        
        // Stan
        this.currentBrand = null;
        this.currentTier = 0;
        this.nextBrand = null;
        this.nextTier = 0;
        
        this.canDrop = true;
        this.currentBallPreview = null;
        this.aimLine = null;
    }

    init() {
        this.resetQueue();
    }

    // Losowanie nowej ręki
    resetQueue() {
        let pick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.currentBrand = pick.brand; 
        this.currentTier = pick.tier;

        pick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.nextBrand = pick.brand; 
        this.nextTier = pick.tier;

        // Powiadom UI
        this.scene.events.emit('update-next', { brand: this.nextBrand, tier: this.nextTier });
        this.spawnPreviewBall();
    }

    // Ustawienie linii celowniczej (przekazanej z EnvironmentBuilder)
    setAimLine(aimLineObject) {
        this.aimLine = aimLineObject;
    }

    updateAimPosition(x) {
        if (!this.canDrop) return;
        
        const sideMargin = SETTINGS.sideMargin + 25;
        const clampedX = Phaser.Math.Clamp(x, sideMargin, this.scene.game.config.width - sideMargin);
        
        if (this.aimLine) this.aimLine.x = clampedX;
        if (this.currentBallPreview) this.currentBallPreview.x = clampedX;
    }

    spawnPreviewBall() {
        if (this.currentBallPreview) this.currentBallPreview.destroy();
        
        const tierDef = TIERS.find(t => t.level === this.currentTier);
        if (!tierDef) return;

        let key = (this.currentBrand === 'neutral') 
            ? `ball_neutral_${this.currentTier}` 
            : `ball_${this.currentBrand}_${this.currentTier}`;

        if (!this.scene.textures.exists(key)) key = 'ball_neutral_0';

        // Używamy pozycji aimLine lub środka
        const startX = this.aimLine ? this.aimLine.x : this.scene.scale.width / 2;

        this.currentBallPreview = this.scene.add.image(startX, SETTINGS.spawnY, key)
            .setDisplaySize(tierDef.radius * 2, tierDef.radius * 2)
            .setAlpha(0.8)
            .setDepth(20); // Nad tłem

        // Mała animacja oddychania
        this.scene.tweens.add({ 
            targets: this.currentBallPreview, 
            scaleX: '*=1.05', scaleY: '*=1.05', 
            duration: 500, yoyo: true, repeat: -1 
        });
    }

    tryDropBall() {
        if (!this.canDrop || !this.currentBallPreview) return;

        this.canDrop = false;
        const dropX = this.currentBallPreview.x;
        
        // Niszczymy preview
        this.currentBallPreview.destroy();
        this.currentBallPreview = null;

        // Spawnowanie fizycznej kulki (delegujemy do metody spawnowania)
        this.spawnPhysicalBall(dropX, SETTINGS.spawnY, this.currentBrand, this.currentTier, false);

        // Przesunięcie kolejki
        this.currentBrand = this.nextBrand;
        this.currentTier = this.nextTier;

        // Nowy los
        const nextPick = Phaser.Utils.Array.GetRandom(GAME_CONFIG.spawnPool);
        this.nextBrand = nextPick.brand;
        this.nextTier = nextPick.tier;

        this.scene.events.emit('update-next', { brand: this.nextBrand, tier: this.nextTier });

        // Cooldown
        this.scene.time.addEvent({ 
            delay: SETTINGS.dropDelay, 
            callback: () => { 
                this.canDrop = true; 
                this.spawnPreviewBall(); 
            }
        });
    }

    // To jest "czysta" metoda do tworzenia kulek (używana też przy merge)
    spawnPhysicalBall(x, y, brand, tierLevel, isSafe = false) {
        const tier = TIERS.find(t => t.level === tierLevel);
        if (!tier) return null;

        let key = 'ball_neutral_0';
        if (tierLevel === 7) key = 'ball_TEB_GRAND';
        else if (brand === 'neutral') key = `ball_neutral_${tierLevel}`;
        else key = `ball_${brand}_${tierLevel}`;

        if (!this.scene.textures.exists(key)) key = 'ball_neutral_0';

        const ball = this.scene.matter.add.image(x, y, key);
        
        ball.setCircle(tier.radius);
        ball.setBounce(SETTINGS.bounce);
        ball.setFriction(SETTINGS.friction);
        ball.setDensity(0.001 + (tierLevel * 0.0005));
        
        ball.setData({ brand: brand, tier: tierLevel, safe: isSafe });

        if (!isSafe) {
            SoundManager.play('drop');
            // Efekt elastyczności przy pojawieniu
            ball.setScale(0.8, 1.2);
            this.scene.tweens.add({ targets: ball, scaleX: 1, scaleY: 1, duration: 400, ease: 'Elastic.Out' });
        }
        return ball;
    }
}