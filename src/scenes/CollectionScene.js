import Phaser from 'phaser';
import { StorageManager } from '../StorageManager';
import { BRANDS, TIERS } from '../Constants';
import { SoundManager } from '../SoundManager';
import { TextureGenerator } from '../TextureGenerator';

export class CollectionScene extends Phaser.Scene {
    constructor() { super('CollectionScene'); }

    create() {
        // Zabezpieczenie: Jeśli wejdziemy tu jakimś cudem bez tekstur, wygeneruj je
        TextureGenerator.createAll(this);

        const w = this.scale.width;
        const h = this.scale.height;

        // Tło - spójne z resztą gry
        if (this.textures.exists('bg_radial')) {
            this.add.image(w/2, h/2, 'bg_radial').setDisplaySize(w, h).setAlpha(0.8);
        } else {
            this.add.rectangle(w/2, h/2, w, h, 0x0f172a);
        }

        // Nagłówek
        this.add.text(w/2, 50, 'KSIĘGA ABSOLWENTA', {
            font: '900 28px Arial', color: '#fbbf24', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w/2, 80, 'Odkryj wszystkie stopnie edukacji', {
            font: '14px Arial', color: '#94a3b8'
        }).setOrigin(0.5);

        // Przycisk powrotu
        const backBtn = this.add.container(w/2, h - 80);
        const btnBg = this.add.rectangle(0, 0, 200, 50, 0x334155).setStrokeStyle(2, 0xffffff);
        const btnTxt = this.add.text(0, 0, 'POWRÓT', { font: 'bold 18px Arial', color: '#fff' }).setOrigin(0.5);
        backBtn.add([btnBg, btnTxt]);
        
        btnBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                SoundManager.play('click');
                this.scene.start('StartScene');
            });

        // --- GRID KULEK ---
        const startX = 60; 
        const startY = 140;
        const rowHeight = 130; 
        const colWidth = 55; 

        const brandList = Object.values(BRANDS); 
        // Wyświetlamy Tiery 1-6 (Bez neutralnej 0 i bez Grand Balla 7 na liście zwykłej)
        const tierList = TIERS.filter(t => t.level >= 1 && t.level <= 6);

        brandList.forEach((brand, rowIndex) => {
            // Linia oddzielająca
            const lineY = startY + (rowIndex * rowHeight) - 25;
            this.add.line(0, 0, 40, lineY, w-40, lineY, 0xffffff, 0.1).setOrigin(0);

            // Etykieta marki (pionowo lub po lewej)
            const label = this.add.text(20, startY + (rowIndex * rowHeight) + 15, brand.label.toUpperCase(), {
                font: '900 12px Arial', color: brand.color
            }).setOrigin(0, 0.5);
            label.setAngle(-90); // Obracamy pionowo dla stylu

            tierList.forEach((tier, colIndex) => {
                const x = startX + (colIndex * colWidth);
                const y = startY + (rowIndex * rowHeight);
                
                // Klucz zapisu: "tm_1", "lo_4"
                const isDiscovered = StorageManager.isDiscovered(brand.id, tier.level);
                
                // Tło slotu
                this.add.circle(x, y, 22, 0x000000, 0.3);

                if (isDiscovered) {
                    const key = `ball_${brand.id}_${tier.level}`;
                    if (this.textures.exists(key)) {
                        const ball = this.add.image(x, y, key).setDisplaySize(40, 40);
                        
                        // Interakcja - Pokaż nazwę po kliknięciu
                        ball.setInteractive();
                        ball.on('pointerdown', () => {
                            SoundManager.play('click');
                            this.showToast(tier.name, brand.color);
                            // Efekt kliknięcia
                            this.tweens.add({targets: ball, scale: 0.8, yoyo: true, duration: 100});
                        });
                    }
                } else {
                    // Nieodkryte - Kłódka
                    this.add.circle(x, y, 18, 0x1e293b).setStrokeStyle(1, 0x334155);
                    this.add.text(x, y, '?', { font: 'bold 16px Arial', color: '#475569' }).setOrigin(0.5);
                }
            });
        });

        // STATYSTYKI
        const total = brandList.length * tierList.length;
        const discovered = StorageManager.data.discovered.filter(id => {
            const parts = id.split('_'); // np. tm_1
            return parts[1] >= 1 && parts[1] <= 6; // Liczymy tylko główne tiery
        }).length;
        
        const percent = Math.floor((discovered / total) * 100);
        
        this.add.text(w/2, h - 140, `POSTĘP: ${percent}%`, {
            font: 'bold 16px Arial', color: '#94a3b8'
        }).setOrigin(0.5);
    }

    showToast(text, color) {
        if (this.toast) this.toast.destroy();
        const container = this.add.container(this.scale.width/2, this.scale.height - 180).setDepth(100);
        
        const bg = this.add.rectangle(0, 0, text.length * 12 + 40, 40, 0x000000, 0.9)
            .setStrokeStyle(2, color);
        const txt = this.add.text(0, 0, text, { font: 'bold 16px Arial', color: '#fff' }).setOrigin(0.5);
        
        container.add([bg, txt]);
        this.toast = container;
        
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scaleX: 1, scaleY: 1,
            duration: 200,
            ease: 'Back.Out'
        });

        this.time.delayedCall(1500, () => {
            this.tweens.add({
                targets: container,
                alpha: 0,
                y: '+=20',
                duration: 300,
                onComplete: () => container.destroy()
            });
        });
    }
}