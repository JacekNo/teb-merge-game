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
        // Tworzymy kontener, żeby łatwiej skalować tekst razem z ewentualnym cieniem
        // Ale dla wydajności wystarczy sam Text z obrysem
        const text = this.scene.add.text(x, y, message, { 
            font: '900 28px Arial', 
            color: color || '#ffffff', 
            stroke: '#000000', 
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, fill: true }
        }).setOrigin(0.5).setDepth(2000).setScale(0); // Startujemy od zera

        // 1. WYSKOK (Dynamiczny start)
        this.scene.tweens.add({
            targets: text,
            scaleX: 1, scaleY: 1,
            duration: 200,
            ease: 'Back.Out', // Efekt sprężynki przy pojawieniu się
        });

        // 2. UNOSZENIE I ZNIKANIE (Delikatny koniec)
        // Lekki losowy ruch na boki (żeby nie wszystkie leciały idealnie prosto)
        const randomX = Phaser.Math.Between(-20, 20);
        
        this.scene.tweens.add({
            targets: text,
            y: y - 80,       // Unoszenie w górę
            x: x + randomX,  // Lekko na bok
            alpha: 0,        // Zanikanie
            duration: 1000,  // Całość trwa 1 sekundę
            delay: 100,      // Chwila widoczności zanim zacznie znikać
            ease: 'Quad.Out',
            onComplete: () => text.destroy() // Sprzątanie
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