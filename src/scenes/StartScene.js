import Phaser from 'phaser';
import { SoundManager } from '../SoundManager';
import { StorageManager } from '../StorageManager';
import { setDifficulty } from '../Constants'; // Importujemy funkcję z Constants

export class StartScene extends Phaser.Scene {
    constructor() { super('StartScene'); }

    // Kontener na przyciski menu głównego
    mainMenuContainer;
    // Kontener na przyciski wyboru trudności
    difficultyContainer;

    preload() {
        this.load.setPath('assets');
        
        // --- ZAKOMENTUJ TE LINIE JEŚLI NIE MASZ PLIKÓW MP3 ---
        // this.load.audio('theme', 'music_loop.mp3'); 
        // this.load.audio('drop', 'sfx_drop.mp3');
        // this.load.audio('merge', 'sfx_merge.mp3');
        // this.load.audio('grand', 'sfx_grand.mp3');
        // this.load.audio('click', 'sfx_click.mp3');
        // this.load.audio('gameover', 'sfx_gameover.mp3');
        // -----------------------------------------------------

        // --- 2. GRAFIKA MENU ---
        this.load.image('bg_menu', 'bg_start.png');
        this.load.svg('logo_full', 'logo_full.svg');
        this.load.image('title_game', 'teb_masters.png');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Inicjalizacja dźwięku
        SoundManager.init(this);
        // Opcjonalnie: SoundManager.playMusic('theme');

        // Tło
        this.add.image(w/2, h/2, 'bg_menu').setDisplaySize(w, h);
        
        // LOGO
        if (this.textures.exists('title_game')) {
            const logo = this.add.image(w/2, h/3 - 20, 'title_game').setScale(0.4);
            this.tweens.add({
                targets: logo, scaleX: 0.44, scaleY: 0.44, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut'
            });
        } else {
            this.add.text(w/2, h/3, 'TEB GAME', { font: '900 60px Arial', color: '#fff' }).setOrigin(0.5);
        }

        // --- KONTENER MENU GŁÓWNEGO ---
        this.mainMenuContainer = this.add.container(0, 0);

        const playBtn = this.createButton(w/2, h/2 + 60, 'GRAJ', '#C51523', () => {
            this.showDifficultyMenu(true);
        });

        const total = 21; 
        const unlocked = StorageManager.data.discovered ? StorageManager.data.discovered.length : 0;
        const colBtn = this.createButton(w/2, h/2 + 140, `KOLEKCJA (${unlocked}/${total})`, '#102D69', () => {
            this.scene.start('CollectionScene');
        });

        this.mainMenuContainer.add([playBtn, colBtn]);

        // --- KONTENER WYBORU TRUDNOŚCI (Domyślnie ukryty) ---
        this.difficultyContainer = this.add.container(0, 0).setVisible(false).setAlpha(0);

        const diffTitle = this.add.text(w/2, h/2 + 20, 'WYBIERZ POZIOM:', { font: 'bold 20px Arial', color: '#fff' })
        .setOrigin(0.5);
        this.difficultyContainer.add(diffTitle);

        const easyBtn = this.createButton(w/2, h/2 + 70, 'ŁATWY (dopiero się uczę)', '#22c55e', () => this.startGame('EASY'));
        const medBtn = this.createButton(w/2, h/2 + 140, 'ŚREDNI (znam kierunek)', '#f59e0b', () => this.startGame('MEDIUM'));
        const hardBtn = this.createButton(w/2, h/2 + 210, 'TRUDNY (wiem co robię)', '#ef4444', () => this.startGame('HARD'));
        
        // Przycisk powrotu
        const backBtn = this.add.text(w/2, h - 50, 'ANULUJ', { font: 'bold 16px Arial', color: '#94a3b8' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        backBtn.on('pointerdown', () => { SoundManager.play('click'); this.showDifficultyMenu(false); });
        
        this.difficultyContainer.add([easyBtn, medBtn, hardBtn, backBtn]);
    }

    showDifficultyMenu(show) {
        if (show) {
            // Ukryj główne, pokaż trudność
            this.mainMenuContainer.setVisible(false);
            this.difficultyContainer.setVisible(true);
            this.tweens.add({ targets: this.difficultyContainer, alpha: 1, duration: 300 });
        } else {
            // Wróć do głównego
            this.difficultyContainer.setVisible(false).setAlpha(0);
            this.mainMenuContainer.setVisible(true);
        }
    }

    startGame(difficulty) {
        // Ustawiamy globalną trudność
        setDifficulty(difficulty);
        
        // Startujemy grę
        this.scene.start('GameScene');
    }

    createButton(x, y, text, color, callback) {
        const btn = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 280, 60, parseInt(color.replace('#', '0x')), 1)
            .setInteractive({ useHandCursor: true });
        bg.setStrokeStyle(2, 0xffffff, 0.5);
        const label = this.add.text(0, 0, text, { font: 'bold 20px Arial', color: '#ffffff' }).setOrigin(0.5);

        btn.add([bg, label]);

        bg.on('pointerover', () => {
            this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
            bg.setFillStyle(0xffffff); label.setColor(color);
        });
        bg.on('pointerout', () => {
            this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 100 });
            bg.setFillStyle(parseInt(color.replace('#', '0x'))); label.setColor('#ffffff');
        });
        bg.on('pointerdown', () => {
            SoundManager.play('click');
            this.tweens.add({
                targets: btn, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true,
                onComplete: callback
            });
        });
        return btn;
    }
}