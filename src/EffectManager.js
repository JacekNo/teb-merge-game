import Phaser from 'phaser';
import { DEPTHS } from './Constants'; // <--- NOWY IMPORT

export class EffectManager {
    static scene;
    
    static init(scene) {
        this.scene = scene;
    }

    // --- 1. EFEKT ŁĄCZENIA (Konfetti) ---
    static createMergeEffect(x, y, radius, colorHex) {
        if (!this.scene) return;

        const tintColor = typeof colorHex === 'string' 
            ? parseInt(colorHex.replace('#', '0x')) 
            : colorHex;

        const emitter = this.scene.add.particles(x, y, 'spark', {
            // ... (parametry bez zmian) ...
            lifespan: { min: 400, max: 800 },
            speed: { min: 100, max: 300 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            angle: { min: 0, max: 360 },
            rotate: { min: -180, max: 180 },
            gravityY: 800,
            quantity: 12,
            tint: tintColor,
            blendMode: 'ADD',
            emitting: false
        });

        // --- ZMIANA: Ustawiamy głębię nad kulkami ---
        emitter.setDepth(DEPTHS.EFFECTS);
        // --------------------------------------------

        emitter.explode();
        
        this.scene.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    // --- 2. PŁYWAJĄCY TEKST (+100) ---
    static showFloatingText(x, y, text) {
        if (!this.scene) return;

        const txt = this.scene.add.text(x, y, text, {
            font: '900 24px Arial',
            color: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // --- ZMIANA: Tekst na samej górze (UI) ---
        txt.setDepth(DEPTHS.UI);
        // ----------------------------------------

        this.scene.tweens.add({
            targets: txt,
            y: y - 80,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0,
            duration: 800,
            ease: 'Back.Out',
            onComplete: () => txt.destroy()
        });
    }

    // --- 3. FALA ENERGII (Dla Grand Balla) ---
    static createEnergyRipple(x, y, isShockwave = false) {
        if (!this.scene) return;

        const circle = this.scene.add.circle(x, y, 10, 0xffffff, 0);
        circle.setStrokeStyle(4, 0xffffff);
        
        // --- ZMIANA: Fala nad kulkami ---
        circle.setDepth(DEPTHS.EFFECTS);
        // --------------------------------

        this.scene.tweens.add({
            targets: circle,
            radius: isShockwave ? 500 : 150,
            alpha: 0,
            strokeWidth: 0,
            duration: isShockwave ? 800 : 500,
            ease: 'Quad.Out',
            onComplete: () => circle.destroy()
        });

        if (isShockwave) {
            this.scene.cameras.main.shake(300, 0.01);
            const flash = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0xffffff);
            // Flash też na warstwie efektów
            flash.setOrigin(0).setAlpha(0.5).setDepth(DEPTHS.EFFECTS + 1); 
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 200,
                onComplete: () => flash.destroy()
            });
        }
    }
}