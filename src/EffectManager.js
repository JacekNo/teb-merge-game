import Phaser from 'phaser';

export class EffectManager {
    static scene;

    static init(scene) {
        this.scene = scene;
    }

    // --- 1. TEKST PŁYWAJĄCY (Przywrócona metoda!) ---
    static showFloatingText(x, y, text) {
        if (!this.scene) return;
        
        const label = this.scene.add.text(x, y, text, {
            font: '900 28px Arial',
            color: '#fbbf24', // Złoty kolor
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.scene.tweens.add({
            targets: label,
            y: y - 60, // Unosi się do góry
            alpha: 0,  // Zanika
            duration: 800,
            ease: 'Power1',
            onComplete: () => label.destroy()
        });
    }

    // --- 2. SUBTELNY SHOCKWAVE ---
    static createShockwave(x, y, scale = 1) {
        if (!this.scene) return;

        // Błysk w centrum (Flash) - mniejszy i szybszy
        const flash = this.scene.add.circle(x, y, 15 * scale, 0xffffff, 0.6); // Mniejsza alpha (0.6)
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: flash,
            scale: 1.5, // Mniejsza skala końcowa
            alpha: 0,
            duration: 100, // Bardzo szybkie zniknięcie
            onComplete: () => flash.destroy()
        });

        // Główny pierścień - cienki i elegancki
        const ring1 = this.scene.add.graphics();
        ring1.lineStyle(2, 0xffffff); // Cienki obrys (2px)
        ring1.strokeCircle(0, 0, 15); // Mniejszy promień startowy
        ring1.x = x;
        ring1.y = y;
        ring1.setBlendMode(Phaser.BlendModes.ADD);
        ring1.setAlpha(0.5); // Startuje półprzezroczysty

        this.scene.tweens.add({
            targets: ring1,
            scale: 2.5 * scale, // Skala max 2.5x (było 8x!)
            alpha: { from: 0.5, to: 0 },
            strokeWidth: 0,
            duration: 300,
            ease: 'Cubic.Out',
            onComplete: () => ring1.destroy()
        });

        // Wtórny pierścień (Fala koloru) - ledwo widoczna
        const ring2 = this.scene.add.graphics();
        ring2.lineStyle(2, 0x4f46e5); // Cieńsza linia
        ring2.strokeCircle(0, 0, 15);
        ring2.x = x;
        ring2.y = y;
        ring2.setAlpha(0.3); // Bardzo delikatny

        this.scene.tweens.add({
            targets: ring2,
            scale: 2.0 * scale, // Mniejszy zasięg (było 6x)
            alpha: 0,
            duration: 400,
            ease: 'Quad.Out',
            onComplete: () => ring2.destroy()
        });
    }

    // --- 3. EFEKT ŁĄCZENIA (MERGE) ---
    static createMergeEffect(x, y, radius, color) {
        if (!this.scene) return;

        // Rozprysk cząsteczek
        const particles = this.scene.add.particles(x, y, 'ball_neutral_0', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            tint: color ? parseInt(color.replace('#', '0x')) : 0xffffff
        });

        particles.explode(12); 
        this.scene.time.delayedCall(500, () => particles.destroy());
        
        // Wywołanie fali uderzeniowej
        this.createShockwave(x, y, radius / 40);
    }
}