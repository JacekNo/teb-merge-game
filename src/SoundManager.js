export class SoundManager {
    static ctx = null;
    static isMuted = false;

    static init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            // latencyHint: 'interactive' wymusza najmniejszy bufor jaki system udźwignie
            this.ctx = new AudioContext({ latencyHint: 'interactive' });
            
            // "Rozgrzewamy" silnik grając ciszę. 
            // To zmusza przeglądarkę do natychmiastowego aktywowania wątku audio.
            this.warmUp();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    static warmUp() {
        // Gra pusty dźwięk, żeby "odetkać" rurę audio
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(0);
        osc.stop(0.1);
    }

    static play(type, params = {}) {
        if (this.isMuted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Używamy 'currentTime' bezpośrednio, bez żadnego dodawania marginesu
        const t = this.ctx.currentTime;

        switch (type) {
            case 'merge':   this.playMerge(t, params.tier || 0); break;
            case 'drop':    this.playDrop(t); break;
            case 'pop':     this.playPop(t, params.tier || 0); break;
            case 'grand':   this.playGrandWin(t); break;
            case 'click':   this.playClick(t); break;
            case 'gameover': this.playGameOver(t); break;
        }
    }

    // MERGE: Absolutnie natychmiastowy atak
    static playMerge(t, tier) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseFreq = 261.63; 
        const scale = [1, 1.125, 1.25, 1.5, 1.66, 2, 2.25, 2.5, 3, 3.33]; 
        const multiplier = scale[tier % scale.length] || 1;
        
        osc.frequency.value = baseFreq * multiplier;
        osc.type = 'sine';
        
        // ZMIANA: setValueAtTime zamiast linearRamp. 
        // To jest cyfrowe "ciach" - zero opóźnienia.
        gain.gain.setValueAtTime(0.3, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4); 

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.4);

        // Druga warstwa
        if (tier > 2) {
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.frequency.value = baseFreq * multiplier * 1.5;
            osc2.type = 'triangle';
            
            // Też instant
            gain2.gain.setValueAtTime(0.08, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.2);
        }
    }

    // DROP: Krótkie uderzenie (Kick)
    static playDrop(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        // Instant start
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    static playPop(t, tier) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.value = 600 + (tier * 100);
        osc.type = 'triangle';

        gain.gain.setValueAtTime(0.1, t); // Instant
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    static playClick(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.05);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    static playGrandWin(t) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const startT = t + (i * 0.08);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, startT);
            gain.gain.linearRampToValueAtTime(0.2, startT + 0.01); // Tu zostawiamy mini rampę, żeby nie trzeszczało przy akordzie
            gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startT);
            osc.stop(startT + 0.5);
        });
    }

    static playGameOver(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.5); 
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    }
}