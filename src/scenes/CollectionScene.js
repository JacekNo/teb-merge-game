import Phaser from 'phaser';
import { StorageManager } from '../StorageManager';
import { BRANDS, TIERS } from '../Constants';
import { SoundManager } from '../SoundManager';

export class CollectionScene extends Phaser.Scene {
    constructor() { super('CollectionScene'); }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Tło
        this.add.image(w/2, h/2, 'bg_main').setAlpha(0.3);
        this.add.rectangle(w/2, h/2, w, h, 0x0f172a, 0.9);

        this.add.text(w/2, 60, 'KSIĘGA ABSOLWENTA', {
            font: '900 28px Arial', color: '#fbbf24', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        const backBtn = this.add.text(w/2, h - 60, 'POWRÓT DO MENU', {
            font: 'bold 20px Arial', color: '#ffffff', backgroundColor: '#334155', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            SoundManager.play('click');
            this.scene.start('StartScene');
        });

        // --- POPRAWIONA SIATKA (GRID) ---
        // Zmniejszamy wartości, żeby zmieścić się w 400px
        const startX = 100; // Było 180 - przesuwamy mocno w lewo
        const startY = 160;
        const rowHeight = 110; 
        const colWidth = 42; // Było 55 - ścieśniamy kulki

        const brandList = Object.values(BRANDS); 
        const tierList = TIERS.filter(t => t.level >= 1 && t.level <= 7);

        brandList.forEach((brand, rowIndex) => {
            // Etykieta marki (zmniejszona czcionka)
            this.add.text(15, startY + (rowIndex * rowHeight), brand.label.toUpperCase(), {
                font: 'bold 12px Arial', color: brand.color // Mniejsza czcionka
            }).setOrigin(0, 0.5);

            // Linia oddzielająca
            this.add.line(0, 0, 20, startY + (rowIndex * rowHeight) + 35, w-20, startY + (rowIndex * rowHeight) + 35, 0xffffff, 0.1).setOrigin(0);

            tierList.forEach((tier, colIndex) => {
                const x = startX + (colIndex * colWidth);
                const y = startY + (rowIndex * rowHeight);
                
                const isDiscovered = StorageManager.isDiscovered(brand.id, tier.level);
                
                if (isDiscovered) {
                    const key = `ball_${brand.id}_${tier.level}`;
                    if (this.textures.exists(key)) {
                        const ball = this.add.image(x, y, key).setDisplaySize(36, 36); // Mniejsze kulki (było 44)
                        ball.setInteractive();
                        ball.on('pointerdown', () => {
                            this.showDetailToast(x, y, tier.name, brand.color);
                        });
                    }
                } else {
                    // Mniejsze kłódki
                    this.add.circle(x, y, 18, 0x1e293b).setStrokeStyle(1, 0x334155);
                    this.add.text(x, y, '?', { font: 'bold 16px Arial', color: '#475569' }).setOrigin(0.5);
                }
            });
        });

        const total = brandList.length * tierList.length;
        const discovered = StorageManager.data.discovered ? StorageManager.data.discovered.length : 0;
        const percent = Math.floor((discovered / total) * 100);
        
        this.add.text(w/2, h - 110, `POSTĘP: ${percent}%`, {
            font: 'bold 16px Arial', color: '#94a3b8'
        }).setOrigin(0.5);
    }

    showDetailToast(x, y, text, color) {
        if (this.detailToast) this.detailToast.destroy();
        const container = this.add.container(x, y - 40).setDepth(100);
        const bg = this.add.rectangle(0, 0, text.length * 10 + 20, 26, 0x000000, 0.9).setStrokeStyle(1, color);
        const txt = this.add.text(0, 0, text, { font: 'bold 12px Arial', color: '#fff' }).setOrigin(0.5);
        container.add([bg, txt]);
        this.detailToast = container;
        this.tweens.add({ targets: container, y: y - 50, alpha: 0, duration: 1000, delay: 500, onComplete: () => container.destroy() });
    }
}