import Phaser from 'phaser';
import { SoundManager } from '../SoundManager';

export class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene' }); }

    scoreText; highScoreText; nextBallImage; gameOverContainer;
    mascot; mascotState = 'IDLE'; idleTimer;
    currentScore = 0; highScore = 0;
    grandIcons = [];
    isMenuOpen = false; // Reset na starcie

    preload() {
        this.load.spritesheet('mascot', 'assets/mascot.png', { frameWidth: 150, frameHeight: 150 });
    }

    create() {
        this.isMenuOpen = false;
        
        const width = this.game.config.width;
        const height = this.game.config.height;
        const savedScore = localStorage.getItem('teb_game_highscore');
        this.highScore = savedScore ? parseInt(savedScore) : 0;

        // MASKOTKA
        if (this.textures.exists('mascot')) {
            this.createMascotAnimations();
            this.mascot = this.add.sprite(70, height - 80, 'mascot').setScale(0.7);
            this.mascot.play('idle'); 
        }

        // --- HUD ---
        const menuBtn = this.add.container(30, 30);
        const menuGfx = this.add.graphics();
        menuGfx.lineStyle(4, 0xffffff, 1);
        menuGfx.moveTo(-15, -10); menuGfx.lineTo(15, -10);
        menuGfx.moveTo(-15, 0);   menuGfx.lineTo(15, 0);
        menuGfx.moveTo(-15, 10);  menuGfx.lineTo(15, 10);
        menuGfx.strokePath();
        const hitArea = this.add.rectangle(0, 0, 50, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        menuBtn.add([hitArea, menuGfx]);
        
        hitArea.on('pointerdown', () => {
            SoundManager.play('click');
            this.toggleMenu();
        });

        if (this.textures.exists('logo_full')) {
            const logo = this.add.image(width / 2, 45, 'logo_full');
            if (logo.width > 140) logo.setScale(140 / logo.width);
        }

        this.scoreText = this.add.text(20, 70, '0', { font: '900 40px Arial', color: '#ffffff', stroke: '#0f172a', strokeThickness: 6 });
        this.highScoreText = this.add.text(22, 115, `BEST: ${this.highScore}`, { font: '700 14px Arial', color: '#fbbf24', stroke: '#0f172a', strokeThickness: 3 });

        // --- NEXT BALL & SLOTS ---
        const nextX = width - 50; const nextY = 50;
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffffff, 1); ring.strokeCircle(nextX, nextY, 32);
        ring.fillStyle(0x000000, 0.3); ring.fillCircle(nextX, nextY, 32);
        this.add.text(nextX, nextY + 40, 'NEXT', { font: '700 10px Arial', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
        this.nextBallImage = this.add.image(nextX, nextY, 'ball_TM_0').setScale(0.6);

        this.grandIcons = [];
        const startIconX = nextX - 25; const iconY = nextY + 65; const gap = 25;
        for(let i=0; i<3; i++) {
            this.add.circle(startIconX + (i*gap), iconY, 8, 0x000000, 0.5).setStrokeStyle(1, 0xffffff, 0.5);
            let icon;
            if (this.textures.exists('logo_teb')) {
                icon = this.add.image(startIconX + (i*gap), iconY, 'logo_teb').setDisplaySize(16,16).setTint(0x444444);
            } else {
                icon = this.add.circle(startIconX + (i*gap), iconY, 6, 0xffff00).setAlpha(0.2);
            }
            this.grandIcons.push(icon);
        }

        // --- LISTENERS ---
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('update-score', (p) => { this.currentScore = p; this.scoreText.setText(p); if (this.mascotState !== 'SCARED') this.playEmotion('happy', 1500); if (this.currentScore > this.highScore) { this.highScore = this.currentScore; this.highScoreText.setText(`BEST: ${this.highScore}`); this.highScoreText.setColor('#ef4444'); localStorage.setItem('teb_game_highscore', this.highScore); } });
        gameScene.events.on('update-next', (d) => { const key = `ball_${d.brand}_${d.tier}`; if (this.textures.exists(key)) { this.nextBallImage.setTexture(key).setScale(50/this.nextBallImage.width); } });
        gameScene.events.on('update-grand-count', (count) => {
            if (count === 0) { this.grandIcons.forEach(i => (i.type==='Image'?i.setTint(0x444444):i.setAlpha(0.2))); return; }
            for(let i=0; i<3; i++) {
                const icon = this.grandIcons[i];
                if (i < count) {
                    if (icon.type === 'Image') { icon.clearTint(); if(icon.scaleX < 0.2) this.tweens.add({targets: icon, scaleX: '*=1.5', scaleY: '*=1.5', duration: 100, yoyo: true}); }
                    else icon.setAlpha(1);
                }
            }
        });
        gameScene.events.on('danger-zone', (isDanger) => { if (isDanger) { if (this.mascotState !== 'SCARED') { this.mascotState = 'SCARED'; this.playEmotion('scared'); } } else { if (this.mascotState === 'SCARED') { this.mascotState = 'IDLE'; this.playEmotion('idle'); } } });
        gameScene.events.on('game-over', () => { this.mascotState = 'DEAD'; this.playEmotion('sad'); this.showGameOver(); });
        gameScene.events.on('game-won', (score) => { this.playEmotion('happy'); this.showVictoryScreen(score); });
        
        // PAUSE & GAME OVER SCREENS
        this.createGameOverScreen(width, height);
        this.createPauseMenu(width, height);
    }

    // --- FIX PAUZY ---
    forceMenuClose() {
        this.isMenuOpen = false;
        if (this.menuContainer) this.menuContainer.setVisible(false);
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.menuContainer.setVisible(this.isMenuOpen);
        const gameScene = this.scene.get('GameScene');
        if (this.isMenuOpen) { gameScene.matter.world.pause(); gameScene.sys.pause(); } 
        else { gameScene.matter.world.resume(); gameScene.sys.resume(); }
    }

   createPauseMenu(width, height) {
        // 1. Tworzymy kontener
        this.menuContainer = this.add.container(0, 0).setVisible(false).setDepth(2000);

        // 2. Tworzymy Tło i Tytuł
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x0f172a, 0.95);
        bg.setInteractive(); // Blokuje klikanie w grę pod spodem

        const title = this.add.text(width/2, height/2 - 80, 'PAUZA', { 
            font: '900 40px Arial', color: '#ffffff', stroke: '#334155', strokeThickness: 6 
        }).setOrigin(0.5);

        // 3. NAJWAŻNIEJSZE: Dodajemy tło i tytuł do kontenera JAKO PIERWSZE
        this.menuContainer.add([bg, title]);

        // 4. Dopiero TERAZ tworzymy przyciski (zostaną dodane NA WIERZCH tła)
        this.createMenuButton(this.menuContainer, width/2, height/2 + 20, 'WZNÓW', 0x3b82f6, () => {
            SoundManager.play('click');
            this.toggleMenu();
        });

        this.createMenuButton(this.menuContainer, width/2, height/2 + 100, 'MENU GŁÓWNE', 0xef4444, () => {
             this.returnToMainMenu();
        });
    }

    createMenuButton(container, x, y, text, color, callback) {
        const btnContainer = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 220, 60, color).setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, text, { font: '700 20px Arial', color: '#ffffff' }).setOrigin(0.5);
        bg.on('pointerdown', () => { this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50, yoyo: true, onComplete: callback }); });
        btnContainer.add([bg, label]);
        container.add(btnContainer);
    }

    createMascotAnimations() { if (this.anims.exists('idle')) return; this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('mascot', { start: 0, end: 4 }), frameRate: 6, repeat: -1, yoyo: true, repeatDelay: 1000 }); this.anims.create({ key: 'scared', frames: this.anims.generateFrameNumbers('mascot', { start: 5, end: 9 }), frameRate: 10, repeat: -1, yoyo: true }); this.anims.create({ key: 'happy', frames: this.anims.generateFrameNumbers('mascot', { start: 10, end: 14 }), frameRate: 8, repeat: -1, yoyo: true }); this.anims.create({ key: 'sad', frames: this.anims.generateFrameNumbers('mascot', { start: 15, end: 19 }), frameRate: 4, repeat: -1, yoyo: true }); }
    playEmotion(key, duration) { if (!this.mascot) return; if (this.mascotState === 'DEAD' && key !== 'sad') return; if (duration) { if (this.mascotState === 'SCARED' || this.mascotState === 'DEAD') return; this.mascot.play(key, true); if (this.idleTimer) this.idleTimer.remove(); this.idleTimer = this.time.delayedCall(duration, () => { if (this.mascotState !== 'SCARED' && this.mascotState !== 'DEAD') this.mascot.play('idle'); }); } else { this.mascot.play(key, true); } }
    
    createGameOverScreen(width, height) {
        this.gameOverContainer = this.add.container(0, 0).setVisible(false).setAlpha(0).setDepth(1000);
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x020617, 0.85).setInteractive(); 
        const title = this.add.text(width/2, height/2 - 50, 'KONIEC GRY', { font: '900 40px Arial', color: '#ffffff', stroke: '#ef4444', strokeThickness: 6 }).setOrigin(0.5);
        const scoreLabel = this.add.text(width/2, height/2 + 10, 'TWÓJ WYNIK', { font: '700 16px Arial', color: '#94a3b8' }).setOrigin(0.5);
        this.finalScoreText = this.add.text(width/2, height/2 + 50, '0', { font: '900 60px Arial', color: '#fbbf24' }).setOrigin(0.5);
        const btnBg = this.add.rectangle(width/2, height/2 + 140, 220, 60, 0x22c55e).setInteractive({ useHandCursor: true });
        const btnText = this.add.text(width/2, height/2 + 140, 'MENU GŁÓWNE', { font: '700 18px Arial', color: '#ffffff' }).setOrigin(0.5);
        btnBg.on('pointerdown', () => { SoundManager.play('click'); this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true, onComplete: () => { this.returnToMainMenu(); } }); });
        this.gameOverContainer.add([bg, title, scoreLabel, this.finalScoreText, btnBg, btnText]);
    }
    showGameOver() { this.finalScoreText.setText(this.currentScore); this.gameOverContainer.setVisible(true); this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 500, ease: 'Power2' }); }

    showVictoryScreen(finalScore) {
        const w = this.scale.width; const h = this.scale.height;
        const container = this.add.container(0, 0).setDepth(2000);
        const bg = this.add.rectangle(w/2, h/2, w, h, 0x0f172a, 0.9).setInteractive();
        const title = this.add.text(w/2, h/2 - 120, 'GRATULACJE!', { font: '900 42px Arial', color: '#fbbf24', stroke: '#fff', strokeThickness: 2 }).setOrigin(0.5);
        const subTitle = this.add.text(w/2, h/2 - 60, 'TEB MASTER', { font: 'bold 24px Arial', color: '#ffffff' }).setOrigin(0.5);
        const scoreMsg = this.add.text(w/2, h/2 + 20, `WYNIK: ${finalScore}`, { font: 'bold 30px Arial', color: '#38bdf8' }).setOrigin(0.5);
        const menuBtn = this.add.rectangle(w/2, h/2 + 120, 220, 60, 0x3b82f6).setInteractive({ useHandCursor: true });
        const menuTxt = this.add.text(w/2, h/2 + 120, 'MENU GŁÓWNE', { font: 'bold 20px Arial', color: '#ffffff' }).setOrigin(0.5);
        menuBtn.on('pointerdown', () => { this.tweens.add({ targets: [menuBtn, menuTxt], scale: 0.95, duration: 50, yoyo: true, onComplete: () => this.returnToMainMenu() }); });
        container.add([bg, title, subTitle, scoreMsg, menuBtn, menuTxt]);
        container.setScale(0.8); container.setAlpha(0);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, alpha: 1, ease: 'Back.Out', duration: 600 });
    }

    returnToMainMenu() {
        SoundManager.play('click');
        const gameScene = this.scene.get('GameScene');
        gameScene.matter.world.resume(); gameScene.sys.resume();
        gameScene.events.emit('request-menu');
    }
}