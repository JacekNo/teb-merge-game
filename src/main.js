import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { SETTINGS } from './Constants';

const config = {
    type: Phaser.AUTO,
    // Ustawiamy "wewnętrzną" rozdzielczość gry. 
    // 400x800 to dobre proporcje dla nowoczesnych telefonów (ok. 9:18).
    width: 400,  
    height: 800, 
    backgroundColor: SETTINGS.backgroundColor,
    parent: 'app',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: SETTINGS.gravity },
            debug: false 
        }
    },
    scene: [StartScene, GameScene, UIScene],
    
    // --- SEKCJA SKALOWANIA ---
    scale: {
        mode: Phaser.Scale.FIT, // Skaluje tak, aby zmieścić całość w oknie
        autoCenter: Phaser.Scale.CENTER_BOTH, // Centruje w pionie i poziomie
        // Opcjonalnie: minimalne i maksymalne wymiary, jeśli gra na tablecie wyglądałaby źle
        // min: { width: 320, height: 480 },
        // max: { width: 800, height: 1600 }
    },
    
    render: {
        pixelArt: false,
        antialias: true
    }
};

new Phaser.Game(config);