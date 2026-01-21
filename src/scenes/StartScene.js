import Phaser from 'phaser';
import { SoundManager } from '../SoundManager'; 
import { setDifficulty } from '../Constants';

export class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('bg_main', 'background.png');
        this.load.svg('logo_full', 'logo_full.svg');
    }

    create() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        const cx = width / 2;
        const cy = height / 2;

        // 1. TŁO
        if (this.textures.exists('bg_main')) {
            const bg = this.add.image(cx, cy, 'bg_main');
            const scale = Math.max(width / bg.width, height / bg.height);
            bg.setScale(scale).setScrollFactor(0);
            bg.setTint(0x666666); 
        } else {
            this.add.rectangle(cx, cy, width, height, 0x0f172a).setDepth(-100);
        }

        // 2. LOGO
        if (this.textures.exists('logo_full')) {
            const logo = this.add.image(cx, 120, 'logo_full');
            const maxW = 260;
            if (logo.width > maxW) logo.setScale(maxW / logo.width);
        }

        // 3. MENU TRUDNOŚCI
        this.add.text(cx, cy - 60, 'WYBIERZ POZIOM', {
            font: '700 24px Arial', color: '#94a3b8'
        }).setOrigin(0.5);

        const startY = cy + 10;
        const gap = 90;

        this.createMenuButton(cx, startY, 'ŁATWY', '#22c55e', () => this.startGame('EASY'));
        this.createMenuButton(cx, startY + gap, 'ŚREDNI', '#3b82f6', () => this.startGame('MEDIUM'));
        this.createMenuButton(cx, startY + gap * 2, 'TRUDNY', '#ef4444', () => this.startGame('HARD'));

        this.add.text(cx, height - 20, 'TEB Edukacja 2026 v1.3', { font: '12px Arial', color: '#475569' }).setOrigin(0.5);
    }

    createMenuButton(x, y, text, colorHex, callback) {
        const container = this.add.container(x, y);
        const shadow = this.add.rectangle(0, 5, 240, 70, 0x000000, 0.3).setOrigin(0.5);
        const bg = this.add.rectangle(0, 0, 240, 70, Number(colorHex.replace('#', '0x')))
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, text, { font: '900 32px Arial', color: '#ffffff' }).setOrigin(0.5);

        container.add([shadow, bg, label]);

        bg.on('pointerdown', () => {
            SoundManager.init();
            SoundManager.play('click');
            this.tweens.add({
                targets: container, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true,
                onComplete: callback
            });
        });
    }

    startGame(difficulty) {
        setDifficulty(difficulty);

        // --- KLUCZOWA POPRAWKA ---
        // Najpierw ubijamy stare UI (jeśli istnieje), żeby nie blokowało nowej gry
        if (this.scene.get('UIScene')) {
            this.scene.stop('UIScene');
        }

        // Animacja wyjścia i start nowej sceny
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene');
        });
    }
}
