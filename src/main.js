import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { CollectionScene } from './scenes/CollectionScene';
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
scene: [StartScene, GameScene, UIScene, CollectionScene],

// --- SEKCJA SKALOWANIA ---
scale: {
        mode: Phaser.Scale.FIT, // Skaluje zachowując proporcje
        autoCenter: Phaser.Scale.CENTER_BOTH, // ZMIANA: Włączmy to z powrotem, to najbezpieczniejsza opcja w połączeniu z CSS
        width: 400,
        height: 800,
    },
    
    render: {
        pixelArt: false,
        antialias: true
    }
};

new Phaser.Game(config);