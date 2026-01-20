import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene'; // <--- Poprawiona ścieżka
import { UIScene } from './scenes/UIScene';     // <--- Poprawiona ścieżka

const config = {
    type: Phaser.AUTO,
    // Stałe wymiary wewnętrzne gry (canvasu)
    width: 400, 
    height: 800,
    backgroundColor: '#0f172a', // Kolor tła ładowania
    parent: 'game-container',
    
    // --- NOWA SEKCJA SKALOWANIA ---
    scale: {
        // FIT: Dopasuj do okna, ale zachowaj proporcje (będą czarne pasy po bokach)
        mode: Phaser.Scale.FIT,
        // CENTER_BOTH: Automatycznie wyśrodkuj w pionie i poziomie
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // ------------------------------

    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.5 },
            debug: false
        }
    },
    scene: [StartScene, GameScene, UIScene]
};

new Phaser.Game(config);