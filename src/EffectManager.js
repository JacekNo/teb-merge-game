import Phaser from 'phaser';

export class EffectManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Efekt fali uderzeniowej (przy łączeniu)
    createEnergyRipple(x, y, isGrand = false) {
        if (this.scene.textures.exists('ripple')) {
            const ring = this.scene.add.image(x, y, 'ripple')
                .setBlendMode(Phaser.BlendModes.SCREEN)
                .setAlpha(isGrand ? 0.6 : 0.4)
                .setScale(0.5);
            
            this.scene.tweens.add({
                targets: ring,
                scale: isGrand ? 4 : 2,
                alpha: 0,
                duration: 600,
                onComplete: () => ring.destroy()
            });
        }
        // Trzęsienie kamery
        this.scene.cameras.main.shake(isGrand ? 200 : 50, 0.005);
    }

    // Pływający tekst punktów (+100)
    showFloatingText(x, y, message, color) {
        const text = this.scene.add.text(x, y, message, { 
            font: '900 40px Arial', 
            color: color, 
            stroke: '#000', 
            strokeThickness: 4 
        }).setOrigin(0.5).setDepth(2000);

        this.scene.tweens.add({
            targets: text,
            y: y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy()
        });
    }

    // Iskry przy uderzeniu (Wielka Kula) - TEGO BRAKOWAŁO
    createImpactSparks(x, y, isGrand = false) {
        if (!this.scene.textures.exists('spark')) return;

        const particles = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 100, max: isGrand ? 400 : 200 },
            angle: { min: 0, max: 360 },
            scale: { start: isGrand ? 1.5 : 1, end: 0 },
            blendMode: 'ADD',
            lifespan: isGrand ? 800 : 500,
            quantity: isGrand ? 30 : 10,
            gravityY: 300
        });

        // Cząsteczki muszą zniknąć po chwili (nie emitujemy ich w nieskończoność)
        particles.explode();
        
        // Phaser 3.60+ particles.explode() nie tworzy obiektu, który trzeba niszczyć ręcznie,
        // ale jeśli używasz emitera ciągłego, trzeba go zatrzymać. 
        // Tutaj explode jest jednorazowy, ale sam manager cząsteczek warto posprzątać.
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
    }
}