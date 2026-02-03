import Phaser from 'phaser';
import { SETTINGS } from '../Constants';
import { TextureGenerator } from '../TextureGenerator';
import { EnvironmentBuilder } from '../EnvironmentBuilder';
import { SoundManager } from '../SoundManager';
import { EffectManager } from '../EffectManager';
import { StorageManager } from '../StorageManager';

// Import Managerów
import { BallManager } from '../managers/BallManager';
import { MergeManager } from '../managers/MergeManager';

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    // Managery
    ballManager; 
    mergeManager;
    effects;
    
    // Stan gry
    score = 0;
    grandBallsCollected = 0; 
    isGameOver = false; 
    isMorphingTrinity = false; // Synchronizowane z MergeManager
    isAiming = false;
    wasDanger = false;

    // Referencje wizualne
    bgGrid; 
    floatingArtifacts = []; 

    preload() {
        this.load.setPath('assets');
        this.load.svg('logo_teb', 'logo_teb.svg');
        this.load.image('bg_main', 'background.png');
        
        ['tm', 'lo', 'lp'].forEach(id => {
            this.load.svg(`icon_${id}_2`, `icon_${id}_2.svg`);
            this.load.svg(`icon_${id}_3`, `icon_${id}_3.svg`);
            this.load.image(`icon_${id}_4`, `icon_${id}_4.png`);
            this.load.image(`icon_${id}_5`, `icon_${id}_5.png`);
            this.load.svg(`signet_${id}`, `signet_${id}.svg`);
            this.load.svg(`glyph_${id}`, `glyph_${id}.svg`);
        });
    }

    create() {
        StorageManager.init();
        SoundManager.init(this);

        // 1. Grafika
        TextureGenerator.createAll(this);
        const env = EnvironmentBuilder.init(this);
        this.bgGrid = env.bgGrid;
        this.floatingArtifacts = env.artifacts;
        
        // --- POPRAWKA: Inicjalizacja statyczna EffectManagera ---
        EffectManager.init(this); // To naprawi brakujący Shockwave!
        this.effects = EffectManager; // Opcjonalnie, dla spójności referencji

        // 2. Fizyka
        this.setupPhysicsWorld();

        // 3. Systemy (Ball & Merge)
        this.ballManager = new BallManager(this);
        this.ballManager.setAimLine(env.aimLine);

        this.mergeManager = new MergeManager(this, this.ballManager);
        this.mergeManager.setupCollisions(); 

        // 4. Input
        this.setupInput();

        // 5. Start Gry
        this.scene.launch('UIScene');
        this.startNewGame();
        
        this.events.on('request-menu', () => { 
            this.scene.stop('UIScene');
            this.scene.start('StartScene'); 
        });
    }

    startNewGame() {
        this.sys.resume();
        this.matter.world.resume();
        
        this.score = 0;
        this.grandBallsCollected = 0;
        this.isGameOver = false;
        this.isMorphingTrinity = false;
        this.isAiming = false;

        this.ballManager.init(); // Reset kulek

        this.time.delayedCall(50, () => {
            if (this.scene.get('UIScene')) this.scene.get('UIScene').forceMenuClose();
            this.events.emit('update-grand-count', 0);
            this.events.emit('update-score', 0);
        });
    }

    update(time, delta) {
        if (this.isGameOver) return;
        
        // Animacje tła
        if (this.bgGrid) this.bgGrid.tilePositionY -= 20 * (delta / 1000);
        this.updateArtifacts(time, delta);
        
        // Sprawdzanie zasad gry
        this.checkDangerZone();
        this.mergeManager.checkTrinityCondition(); // Delegacja do MergeManager
    }

    setupInput() {
        const isDesktop = this.sys.game.device.os.desktop;

        this.input.on('pointermove', (pointer) => {
            if (this.isGameOver) return;
            this.ballManager.updateAimPosition(pointer.x);
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver) return;
            this.ballManager.updateAimPosition(pointer.x);
            if (isDesktop) this.ballManager.tryDropBall();
            else this.isAiming = true;
        });

        this.input.on('pointerup', () => {
            if (this.isAiming && !isDesktop) {
                this.ballManager.tryDropBall();
                this.isAiming = false;
            }
        });
        
        this.input.on('pointerupoutside', () => { this.isAiming = false; });
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

    triggerGameOver() {
        this.isGameOver = true; 
        this.matter.world.pause(); 
        SoundManager.play('gameover'); 
        this.events.emit('game-over');
    }
}