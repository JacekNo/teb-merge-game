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
        mode: Phaser.Scale.FIT,
        // ZMIANA: Wyłączamy centrowanie przez Phasera. 
        // Zrobimy to lepiej w CSS, dzięki czemu unikniemy przesunięcia w prawo.
        autoCenter: Phaser.Scale.NO_CENTER, 
    },
    
    render: {
        pixelArt: false,
        antialias: true
    }
};

new Phaser.Game(config);