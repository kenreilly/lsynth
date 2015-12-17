class Controller {

    public static audioContext: AudioContext = new window['AudioContext'];
}

class Scope {

    public analyzer: AnalyserNode;

    private canvas: HTMLCanvasElement;

    private ctx: CanvasRenderingContext2D;

    private width: number;
    private height: number;

    public offset: number = 0;
    public zoom: number = 1.0;
    public cut: number = 0;

    constructor(canvas: HTMLCanvasElement) {

        this.analyzer = Controller.audioContext.createAnalyser();
        this.analyzer.fftSize = 1024;
        this.analyzer.smoothingTimeConstant = 0.2;

        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "rgb(0,200,100)";
        this.ctx.fillStyle = 'rgb(0, 0, 0)';

        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    public refresh() {

        var data = new Uint8Array(this.analyzer.fftSize);
        this.analyzer.getByteTimeDomainData(data);
        this.render(this.extractWaveform(data));

        requestAnimationFrame(this.refresh.bind(this));
    }

    public extractWaveform(data: Uint8Array) {

        for (var phase = 0, offset = 0, x = 0, xx = data.length; x != xx; ++x) {

            if (data[x] > 127) { // 8-bit unsigned, 127 = 0dB
                
                switch (phase) {  // positive phase

                    case 0:
                        offset = x; // set waveform start
                        phase += 180; // shift 180 degrees
                        continue;

                    case 360: // return captured waveform
                        return data.slice(offset - 1, x);
                }
            }
            else {

                switch (phase) {  // negative phase

                    case 180:
                        phase += 180; // shift 180 degrees
                        continue;
                }
            }
        }

        return new Uint8Array(0);
    }

    public render(data: Uint8Array) {

        if (!data.length) {
            return; // no data
        }

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.setLineDash([4, 24]);
        this.ctx.stroke();


        this.ctx.beginPath();
        var sz = (this.zoom * this.canvas.width) / data.length,
            i = 0,
            x = 0;

        while (x <= this.width) {

            if (i === data.length) {
                i = 0;
            }

            var v = data[i] / 128.0;
            var y = this.height - (v * this.height / 2);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sz;
            ++i;
        }
        var dash = [Math.round(8 * (100 - y)), Math.round(2 * (Math.random()) + 1)];
        this.ctx.setLineDash(Math.round(0.420 + Math.random()) ? [0] : dash);

        this.ctx.setLineDash([0]);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
    }
}

class OSC {

    public oscillator: OscillatorNode;

    static WaveForm = {
        Sine: 'sine',
        Square: 'square'
    }

    constructor() {

        this.oscillator = Controller.audioContext.createOscillator();

        this.oscillator.type = OSC.WaveForm.Sine;
        this.oscillator.frequency.value = 440; // value in hertz
    }

    public connect(destination: AudioNode) {

        this.oscillator.connect(destination);
    }

    public start() {

        this.oscillator.start();
    }
}

class FunctionGenerator {

    public osc1: OSC;
    public osc2: OSC;

    public gain1: GainNode;
    public gain2: GainNode;

    public scope: Scope;

    public sum: GainNode;

    public initInputs(osc: OSC, amp: GainNode, parent: HTMLElement) {

        var f: HTMLInputElement = <HTMLInputElement>parent.querySelector("input[type='text']");
        f.value = osc.oscillator.frequency.value.toString();
        f.onkeyup = function (e) {

            try { osc.oscillator.frequency.value = parseInt(f.value); }
            catch (e) { osc.oscillator.frequency.value = 440; }
        }

        var v: HTMLInputElement = <HTMLInputElement>parent.querySelector("input[type='range']");
        v.value = (amp.gain.value * 100).toString();
        v.onchange = function (e) {
            amp.gain.value = (parseInt(v.value) / 100);
        }

        var buttons = parent.querySelectorAll('button[name]');
        for (var i = 0, ii = buttons.length; i != ii; ++i) {

            (<HTMLButtonElement>buttons[i]).onclick = function (e) {
                var button: HTMLButtonElement = <HTMLButtonElement>e.target;
                osc.oscillator.type = button.name;

                for (var j = 0, jj = buttons.length; j != jj; ++j) {
                    (<HTMLButtonElement>buttons[j]).classList.remove('selected');
                }

                button.classList.add('selected');
            }
        }
    }

    constructor() {

        this.osc1 = new OSC();
        this.osc2 = new OSC();

        this.gain1 = Controller.audioContext.createGain();
        this.gain2 = Controller.audioContext.createGain();

        this.gain1.gain.value = 0.5;
        this.gain2.gain.value = 0.5;

        this.osc1.connect(this.gain1);
        this.osc2.connect(this.gain2);

        this.sum = Controller.audioContext.createGain();
        this.gain1.connect(this.sum)
        this.gain2.connect(this.sum);

        this.initInputs(this.osc1, this.gain1, <HTMLElement>document.querySelector('.osc1'));
        this.initInputs(this.osc2, this.gain2, <HTMLElement>document.querySelector('.osc2'));

        this.scope = new Scope(<HTMLCanvasElement>document.querySelector('canvas'));
        this.sum.connect(this.scope.analyzer);

        this.osc1.start();
        this.osc2.start();

        this.scope.refresh();
    }
}

var fgen = new FunctionGenerator();