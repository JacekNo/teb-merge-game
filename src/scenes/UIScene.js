import Phaser from 'phaser';
import { SoundManager } from '../SoundManager';
import { BRANDS, TIERS } from '../Constants';

export class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene' }); }

    scoreText; highScoreText; nextBallImage; 
    mascot; mascotState = 'IDLE'; idleTimer;
    currentScore = 0; highScore = 0;
    grandIcons = [];
    isMenuOpen = false;
    
    // Kontener powiadomienia
    toastContainer;
    toastText;
    toastIcon;
    toastBg;
    isToastActive = false;

    preload() {
        this.load.spritesheet('mascot', 'assets/mascot.png', { frameWidth: 150, frameHeight: 150 });
    }

    create() {
        this.isMenuOpen = false;
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Odczyt HighScore z localStorage (jeśli nie używamy StorageManager do tego, to zostawiamy jak było)
        const savedScore = localStorage.getItem('teb_game_highscore');
        this.highScore = savedScore ? parseInt(savedScore) : 0;

        // --- MASKOTKA ---
        if (this.textures.exists('mascot')) {
            this.createMascotAnimations();
            this.mascot = this.add.sprite(70, height - 80, 'mascot').setScale(0.7);
            this.mascot.play('idle'); 
        }

        // --- HUD GŁÓWNY ---
        // Pauza
        const menuBtn = this.add.container(30, 30);
        const hitArea = this.add.rectangle(0, 0, 50, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        const menuGfx = this.add.graphics().lineStyle(4, 0xffffff, 1);
        menuGfx.moveTo(-15, -10).lineTo(15, -10);
        menuGfx.moveTo(-15, 0).lineTo(15, 0);
        menuGfx.moveTo(-15, 10).lineTo(15, 10).strokePath();
        menuBtn.add([hitArea, menuGfx]);
        
        hitArea.on('pointerdown', () => {
            SoundManager.play('click');
            this.toggleMenu();
        });

        // Logo
        if (this.textures.exists('logo_full')) {
            const logo = this.add.image(width / 2, 45, 'logo_full');
            if (logo.width > 140) logo.setScale(140 / logo.width);
        }

        // Wyniki
        this.scoreText = this.add.text(20, 70, '0', { font: '900 40px Arial', color: '#ffffff', stroke: '#0f172a', strokeThickness: 6 });
        this.highScoreText = this.add.text(22, 115, `BEST: ${this.highScore}`, { font: '700 14px Arial', color: '#fbbf24', stroke: '#0f172a', strokeThickness: 3 });

        // Next Ball
        const nextX = width - 50; const nextY = 50;
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffffff, 1).strokeCircle(nextX, nextY, 32);
        ring.fillStyle(0x000000, 0.3).fillCircle(nextX, nextY, 32);
        this.add.text(nextX, nextY + 40, 'NEXT', { font: '700 10px Arial', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
        this.nextBallImage = this.add.image(nextX, nextY, 'ball_neutral_0').setScale(0.5); // Startowy placeholder

        // Grand Icons (Liczniki)
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

        // --- TOAST NOTIFICATION SYSTEM (NOWOŚĆ!) ---
        this.createToastSystem(width);

        // --- LISTENERS ---
        const gameScene = this.scene.get('GameScene');
        
        // Update Score
        gameScene.events.on('update-score', (p) => { 
            this.currentScore = p; 
            this.scoreText.setText(p); 
            if (this.mascotState !== 'SCARED') this.playEmotion('happy', 1500); 
            
            if (this.currentScore > this.highScore) { 
                this.highScore = this.currentScore; 
                this.highScoreText.setText(`BEST: ${this.highScore}`); 
                this.highScoreText.setColor('#ef4444'); 
                localStorage.setItem('teb_game_highscore', this.highScore); 
            } 
        });

        // Update Next Ball
        gameScene.events.on('update-next', (d) => { 
            let key = `ball_${d.brand}_${d.tier}`;
            if (!this.textures.exists(key)) key = 'ball_neutral_0';
            
            this.nextBallImage.setTexture(key);
            // Skalowanie, żeby zmieściło się w kółku (max 50px)
            const scale = 50 / this.nextBallImage.width;
            this.nextBallImage.setScale(scale);
        });

        // Update Grand Count
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

        // Danger Zone
        gameScene.events.on('danger-zone', (isDanger) => { 
            if (isDanger) { 
                if (this.mascotState !== 'SCARED') { this.mascotState = 'SCARED'; this.playEmotion('scared'); } 
            } else { 
                if (this.mascotState === 'SCARED') { this.mascotState = 'IDLE'; this.playEmotion('idle'); } 
            } 
        });

        // New Discovery (OBSŁUGA ZDARZENIA)
        gameScene.events.on('discovery', (data) => {
            this.showUnlockNotification(data.brand, data.tier);
        });

        gameScene.events.on('game-over', () => { this.mascotState = 'DEAD'; this.playEmotion('sad'); this.showGameOver(); });
        gameScene.events.on('game-won', (score) => { this.playEmotion('happy'); this.showVictoryScreen(score); });
        
        this.createGameOverScreen(width, height);
        this.createPauseMenu(width, height);
    }

    // --- SYSTEM TOASTÓW (POWIADOMIEŃ) ---
    createToastSystem(width) {
        this.toastContainer = this.add.container(width / 2, -100).setDepth(3000);
        
        // Tło paska
        this.toastBg = this.add.rectangle(0, 0, width - 40, 70, 0xffffff).setStrokeStyle(2, 0x102D69);
        this.toastBg.isStroked = true;
        
        // Ikona w pasku
        this.toastIcon = this.add.image(-120, 0, 'ball_neutral_0').setScale(0.5);
        
        // Teksty
        const title = this.add.text(-80, -15, 'NOWE ODKRYCIE!', { font: '900 14px Arial', color: '#102D69' });
        this.toastText = this.add.text(-80, 5, 'Technik Informatyk', { font: 'bold 20px Arial', color: '#000000' });

        this.toastContainer.add([this.toastBg, this.toastIcon, title, this.toastText]);
    }

    showUnlockNotification(brandId, tierLevel) {
        // Jeśli już coś wyświetlamy, ignorujemy (albo kolejkujemy, ale tu wersja prosta)
        if (this.isToastActive) return;
        this.isToastActive = true;

        // Dane do wyświetlenia
        const tierDef = TIERS.find(t => t.level === tierLevel);
        const brandDef = BRANDS[brandId.toUpperCase()];
        
        const tierName = tierDef ? tierDef.name : `Poziom ${tierLevel}`;
        const brandLabel = brandDef ? brandDef.label : '';
        
        // Ustawiamy tekst i kolor
        this.toastText.setText(`${tierName}`);
        
        // Ustawiamy ikonę
        const key = `ball_${brandId}_${tierLevel}`;
        if (this.textures.exists(key)) {
            this.toastIcon.setTexture(key);
            const scale = 40 / this.toastIcon.width;
            this.toastIcon.setScale(scale);
        }

        // Animacja wjazdu
        SoundManager.play('click'); // Lub inny dźwięk sukcesu
        
        this.tweens.add({
            targets: this.toastContainer,
            y: 80, // Wjeżdża pod górny pasek
            duration: 500,
            ease: 'Back.Out',
            onComplete: () => {
                // Czekamy 2.5s
                this.time.delayedCall(2500, () => {
                    // Wyjazd
                    this.tweens.add({
                        targets: this.toastContainer,
                        y: -100,
                        duration: 500,
                        ease: 'Back.In',
                        onComplete: () => {
                            this.isToastActive = false;
                        }
                    });
                });
            }
        });
    }

    // --- PAUSE & MENUS (Bez większych zmian, tylko skrócone dla czytelności wklejania) ---
    forceMenuClose() { this.isMenuOpen = false; if (this.menuContainer) this.menuContainer.setVisible(false); }
    toggleMenu() { this.isMenuOpen = !this.isMenuOpen; this.menuContainer.setVisible(this.isMenuOpen); const gs = this.scene.get('GameScene'); if(this.isMenuOpen){gs.matter.world.pause(); gs.sys.pause();} else {gs.matter.world.resume(); gs.sys.resume();} }
    createPauseMenu(w, h) {
        this.menuContainer = this.add.container(0, 0).setVisible(false).setDepth(2000);
        const bg = this.add.rectangle(w/2, h/2, w, h, 0x0f172a, 0.95).setInteractive();
        const t = this.add.text(w/2, h/2 - 80, 'PAUZA', { font: '900 40px Arial', color: '#fff' }).setOrigin(0.5);
        this.menuContainer.add([bg, t]);
        this.createMenuButton(this.menuContainer, w/2, h/2+20, 'WZNÓW', 0x3b82f6, ()=>this.toggleMenu());
        this.createMenuButton(this.menuContainer, w/2, h/2+100, 'MENU GŁÓWNE', 0xef4444, ()=>this.returnToMainMenu());
    }
    createMenuButton(cont, x, y, txt, col, cb) {
        const c = this.add.container(x, y);
        const bg = this.add.rectangle(0,0,220,60,col).setInteractive({useHandCursor:true});
        const l = this.add.text(0,0,txt,{font:'700 20px Arial',color:'#fff'}).setOrigin(0.5);
        bg.on('pointerdown', ()=>{this.tweens.add({targets:c,scale:0.95,yoyo:true,duration:50,onComplete:cb});});
        c.add([bg,l]); cont.add(c);
    }
    // ... Mascot animations (copy from previous if needed, or assume exists) ...
    createMascotAnimations() { if (this.anims.exists('idle')) return; this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('mascot', { start: 0, end: 4 }), frameRate: 6, repeat: -1, yoyo: true }); this.anims.create({ key: 'scared', frames: this.anims.generateFrameNumbers('mascot', { start: 5, end: 9 }), frameRate: 10, repeat: -1, yoyo: true }); this.anims.create({ key: 'happy', frames: this.anims.generateFrameNumbers('mascot', { start: 10, end: 14 }), frameRate: 8, repeat: -1, yoyo: true }); this.anims.create({ key: 'sad', frames: this.anims.generateFrameNumbers('mascot', { start: 15, end: 19 }), frameRate: 4, repeat: -1, yoyo: true }); }
    playEmotion(k, d) { if(!this.mascot)return; if(this.mascotState==='DEAD'&&k!=='sad')return; this.mascot.play(k,true); if(d && this.mascotState!=='SCARED') this.time.delayedCall(d, ()=>this.mascot.play('idle')); }
    
  // --- EKRAN KOŃCOWY (GAME OVER) ---

    createGameOverScreen(width, height) {
        // Kontener ukryty na start
        this.gameOverContainer = this.add.container(0, 0).setVisible(false).setDepth(3000);

        // 1. Tło (Półprzezroczyste czarne)
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x0f172a, 0.95).setInteractive();
        
        // WAŻNA POPRAWKA: Dodajemy tło do kontenera OD RAZU, żeby było na samym spodzie
        this.gameOverContainer.add(bg);

        // 2. Nagłówek
        this.gameOverTitle = this.add.text(width/2, height/2 - 120, 'KONIEC GRY', { 
            font: '900 48px Arial', color: '#ef4444', stroke: '#ffffff', strokeThickness: 2 
        }).setOrigin(0.5);

        // 3. Wyniki
        this.finalScoreText = this.add.text(width/2, height/2 - 40, 'WYNIK: 0', { 
            font: 'bold 32px Arial', color: '#ffffff' 
        }).setOrigin(0.5);
        
        // Dodajemy teksty do kontenera
        this.gameOverContainer.add([this.gameOverTitle, this.finalScoreText]);

        // 4. Przyciski (Teraz dodadzą się NA WIERZCH tła)
        // Restart
        this.createMenuButton(this.gameOverContainer, width/2, height/2 + 60, 'SPRÓBUJ PONOWNIE', 0x3b82f6, () => {
            this.restartGame();
        });

        // Menu
        this.createMenuButton(this.gameOverContainer, width/2, height/2 + 140, 'WRÓĆ DO MENU', 0x64748b, () => {
            this.returnToMainMenu();
        });
    }

    showGameOver() {
        // Aktualizuj tekst wyniku
        this.finalScoreText.setText(`WYNIK: ${this.currentScore}`);
        this.gameOverTitle.setText('KONIEC GRY');
        this.gameOverTitle.setColor('#ef4444');

        // Pokaż kontener z animacją
        this.gameOverContainer.setVisible(true);
        this.gameOverContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.gameOverContainer,
            alpha: 1,
            duration: 500
        });
    }

    showVictoryScreen(score) {
        // Używamy tego samego ekranu, ale na zielono/złoto
        this.finalScoreText.setText(`WYNIK: ${score}`);
        this.gameOverTitle.setText('ZWYCIĘSTWO!');
        this.gameOverTitle.setColor('#fbbf24'); // Złoty

        this.gameOverContainer.setVisible(true);
        this.gameOverContainer.setAlpha(0);
        this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 500 });
    }

    restartGame() {
        SoundManager.play('click');
        // Resetujemy UI
        this.gameOverContainer.setVisible(false);
        this.mascotState = 'IDLE';
        this.playEmotion('idle');
        
        // Restartujemy scenę gry
        const gs = this.scene.get('GameScene');
        gs.startNewGame();
    }
    returnToMainMenu() { SoundManager.play('click'); const gs=this.scene.get('GameScene'); gs.matter.world.resume(); gs.sys.resume(); gs.events.emit('request-menu'); }
}