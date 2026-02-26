// --- Global State ---
const state = {
    audioContext: null,
    analyserNode: null,
    audioSource: null,
    audioElement: null,
    destNode: null,
    dataArray: null,
    timeArray: null,
    audioFeatures: { bass: 0, mid: 0, high: 0, energy: 0, bassAvg: 0, beatFlash: 0, lastBeatTime: 0, prevTime: 0, phase: 0 },
        visualizerMode: 'radial-bars',

    // Render / DPI
    baseWidth: 1920,
    baseHeight: 1080,
    dpr: 1,

    // Frequency buffers (raw + smoothed)
    freqRaw: null,
    freqData: null,
    freqInited: false,
    // Images
    centerLogo: new Image(),
    bgImage: new Image(),
    particleImage: new Image(),
    hasParticleImage: false,
    
    // Recording
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    
    // Particles
    particles: [],
    
    // POSITIONING STATE
    bgOffsetX: 0,
    bgOffsetY: 0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    
    
    // TEXT POSITION (frei platzierbar)
    titleX: 0,
    titleY: 0,
    artistX: 0,
    artistY: 0,

    // Drag Targets
    isDraggingTitle: false,
    isDraggingArtist: false,
    dragScaleX: 1,
    dragScaleY: 1,
    // Maus Status
    isDraggingBg: false,
    isDraggingLogo: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// --- UI Elements ---
const canvas = document.getElementById('visualizer-canvas');
const ctxMain = canvas.getContext('2d');
const fxCanvas = document.createElement('canvas');
const fxCtx = fxCanvas.getContext('2d');

// Background FX Layer (nur für Hintergrund Afterglow / Trails)
const bgFxCanvas = document.createElement('canvas');
const bgFxCtx = bgFxCanvas.getContext('2d');

// Waterfall / Spectrogram buffer (low-res history)
const wfCanvas = document.createElement('canvas');
const wfCtx = wfCanvas.getContext('2d');


let ctx = ctxMain;
const ui = {
    resetLayoutBtn: document.getElementById('reset-layout'),
    playBtn: document.getElementById('btn-play'),
    pauseBtn: document.getElementById('btn-pause'),
    stopBtn: document.getElementById('btn-stop'),
    recBtn: document.getElementById('toggle-recording'),
    recStatus: document.getElementById('rec-status'),
    recFpsSelect: document.getElementById('rec-fps'),
    recCodecSelect: document.getElementById('rec-codec'),
    recBitrateSelect: document.getElementById('rec-bitrate'),
    recPerfToggle: document.getElementById('rec-performance'),
    audioUpload: document.getElementById('audio-upload'),
    bgUpload: document.getElementById('bg-image-upload'),
    logoUpload: document.getElementById('center-logo-upload'),
    particleUpload: document.getElementById('particle-image-upload'),
    titleInput: document.getElementById('song-title'),
    artistInput: document.getElementById('song-artist'),
    titleSizeSlider: document.getElementById('title-size-slider'),
    artistSizeSlider: document.getElementById('artist-size-slider'),
    titleColor: document.getElementById('title-color'),
    artistColor: document.getElementById('artist-color'),
    fftSlider: document.getElementById('fft-size-slider'),
    radiusSlider: document.getElementById('radius-slider'),
    radiusVal: document.getElementById('radius-value'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomVal: document.getElementById('zoom-value'),
    logoOpacitySlider: document.getElementById('logo-opacity-slider'),
    logoOpacityVal: document.getElementById('logo-opacity-value'),
    logoSizeSlider: document.getElementById('logo-size-slider'),
    logoSizeVal: document.getElementById('logo-size-value'),
    sensSlider: document.getElementById('sensitivity-slider'),
    sensVal: document.getElementById('sensitivity-value'),
    widthSlider: document.getElementById('bar-width-slider'),
    barWidthVal: document.getElementById('bar-width-value'),
    gapSlider: document.getElementById('bar-spacing-slider'),
    barGapVal: document.getElementById('bar-spacing-value'),
    glowSlider: document.getElementById('glow-slider'),
    bgScaleSlider: document.getElementById('bg-scale-slider'),
bgReactZoomSlider: document.getElementById('bg-react-zoom-slider'),
bgReactZoomVal: document.getElementById('bg-react-zoom-value'),
bgReactColorSlider: document.getElementById('bg-react-color-slider'),
bgReactColorVal: document.getElementById('bg-react-color-value'),
bgDistortSlider: document.getElementById('bg-distort-slider'),
bgDistortVal: document.getElementById('bg-distort-value'),
trailSlider: document.getElementById('trail-slider'),
trailVal: document.getElementById('trail-value'),
beatSensSlider: document.getElementById('beat-sens-slider'),
beatSensVal: document.getElementById('beat-sens-value'),
    pCountSlider: document.getElementById('particle-count-slider'),
    pSpeedSlider: document.getElementById('particle-speed-slider'),
    pSpeedVal: document.getElementById('particle-speed-value'),
    pSizeSlider: document.getElementById('particle-size-slider'),
    pSizeVal: document.getElementById('particle-size-value'),
    particleColor: document.getElementById('particle-color'),
    startColor: document.getElementById('start-color'),
    midColor: document.getElementById('mid-color'),
    endColor: document.getElementById('end-color'),
    bgColor: document.getElementById('bg-color'),
    modeSelect: document.getElementById('mode-select'),
    fftLabel: document.getElementById('fft-size-label'),
    smoothSlider: document.getElementById('smoothing-slider'),
    smoothVal: document.getElementById('smooth-value'),

    // React toggles + beat indicator
    bgReactCheck: document.getElementById('bg-react-check'),
    logoReactCheck: document.getElementById('logo-react-check'),
    titleReactCheck: document.getElementById('title-react-check'),
    artistReactCheck: document.getElementById('artist-react-check'),
    beatIndicator: document.getElementById('beat-indicator'),
    glowVal: document.getElementById('glow-value'),
    pCountVal: document.getElementById('particle-count-value'),
    titleSizeVal: document.getElementById('title-size-value'),
    artistSizeVal: document.getElementById('artist-size-value'),
};


// --- Auto-Save (LocalStorage) ---
const STORAGE_KEY = "studio_pro_visualizer_v6_settings";
const LEGACY_STORAGE_KEY = "studio_pro_visualizer_v5_settings";
let saveTimer = null;

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 200);
}

function saveSettings() {
    try {
        const settings = {
            ui: {
                mode: ui.modeSelect ? ui.modeSelect.value : state.visualizerMode,
                fft: ui.fftSlider ? ui.fftSlider.value : null,
                radius: ui.radiusSlider ? ui.radiusSlider.value : null,
                spectrumScale: ui.zoomSlider ? ui.zoomSlider.value : null,
                sensitivity: ui.sensSlider ? ui.sensSlider.value : null,
                barWidth: ui.widthSlider ? ui.widthSlider.value : null,
                barGap: ui.gapSlider ? ui.gapSlider.value : null,
                glow: ui.glowSlider ? ui.glowSlider.value : null,
                bgScale: ui.bgScaleSlider ? ui.bgScaleSlider.value : null,
bgReactZoom: ui.bgReactZoomSlider ? ui.bgReactZoomSlider.value : null,
bgReactColor: ui.bgReactColorSlider ? ui.bgReactColorSlider.value : null,
bgDistort: ui.bgDistortSlider ? ui.bgDistortSlider.value : null,
trail: ui.trailSlider ? ui.trailSlider.value : null,
beatSens: ui.beatSensSlider ? ui.beatSensSlider.value : null,
                smoothing: ui.smoothSlider ? ui.smoothSlider.value : null,
                bgReact: ui.bgReactCheck ? ui.bgReactCheck.checked : true,
                logoReact: ui.logoReactCheck ? ui.logoReactCheck.checked : true,
                titleReact: ui.titleReactCheck ? ui.titleReactCheck.checked : true,
                artistReact: ui.artistReactCheck ? ui.artistReactCheck.checked : true,
                logoOpacity: ui.logoOpacitySlider ? ui.logoOpacitySlider.value : null,
                logoSize: ui.logoSizeSlider ? ui.logoSizeSlider.value : null,
                pCount: ui.pCountSlider ? ui.pCountSlider.value : null,
                pSpeed: ui.pSpeedSlider ? ui.pSpeedSlider.value : null,
                pSize: ui.pSizeSlider ? ui.pSizeSlider.value : null,

                title: ui.titleInput ? ui.titleInput.value : "",
                artist: ui.artistInput ? ui.artistInput.value : "",
                titleSize: ui.titleSizeSlider ? ui.titleSizeSlider.value : null,
                artistSize: ui.artistSizeSlider ? ui.artistSizeSlider.value : null,

                startColor: ui.startColor ? ui.startColor.value : null,
                midColor: ui.midColor ? ui.midColor.value : null,
                endColor: ui.endColor ? ui.endColor.value : null,
                bgColor: ui.bgColor ? ui.bgColor.value : null,
                titleColor: ui.titleColor ? ui.titleColor.value : null,
                artistColor: ui.artistColor ? ui.artistColor.value : null,
                particleColor: ui.particleColor ? ui.particleColor.value : null,
            },
            state: {
                bgOffsetX: state.bgOffsetX,
                bgOffsetY: state.bgOffsetY,
                logoOffsetX: state.logoOffsetX,
                logoOffsetY: state.logoOffsetY,
                titleX: state.titleX,
                titleY: state.titleY,
                artistX: state.artistX,
                artistY: state.artistY,
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn("Auto-Save fehlgeschlagen:", e);
    }
}

function loadSettings() {
    try {
        let raw = localStorage.getItem(STORAGE_KEY);
        let isLegacy = false;
        if (!raw) {
            raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            isLegacy = !!raw;
        }
        if (!raw) return;
        const settings = JSON.parse(raw);

        // Upgrade V5 -> V6 (FFT slider switched from "bins" to "index 0-5")
        if (isLegacy && settings.ui && settings.ui.fft) {
            const legacyBins = parseInt(settings.ui.fft);
            const powers = [64, 128, 256, 512, 1024, 2048];
            let bestIdx = 2;
            let bestErr = Infinity;
            for (let i = 0; i < powers.length; i++) {
                const err = Math.abs(powers[i] - legacyBins);
                if (err < bestErr) { bestErr = err; bestIdx = i; }
            }
            settings.ui.fft = String(bestIdx);
        }

        if (settings.ui) {
            if (ui.modeSelect && settings.ui.mode) ui.modeSelect.value = settings.ui.mode;
            if (ui.fftSlider && settings.ui.fft) ui.fftSlider.value = settings.ui.fft;
            if (ui.radiusSlider && settings.ui.radius) ui.radiusSlider.value = settings.ui.radius;
            if (ui.zoomSlider && settings.ui.spectrumScale) ui.zoomSlider.value = settings.ui.spectrumScale;
            if (ui.sensSlider && settings.ui.sensitivity) ui.sensSlider.value = settings.ui.sensitivity;
            if (ui.widthSlider && settings.ui.barWidth) ui.widthSlider.value = settings.ui.barWidth;
            if (ui.gapSlider && settings.ui.barGap) ui.gapSlider.value = settings.ui.barGap;
            if (ui.glowSlider && settings.ui.glow) ui.glowSlider.value = settings.ui.glow;
            if (ui.bgScaleSlider && settings.ui.bgScale) ui.bgScaleSlider.value = settings.ui.bgScale;
if (ui.bgReactZoomSlider && settings.ui.bgReactZoom) ui.bgReactZoomSlider.value = settings.ui.bgReactZoom;
if (ui.bgReactColorSlider && settings.ui.bgReactColor) ui.bgReactColorSlider.value = settings.ui.bgReactColor;
if (ui.bgDistortSlider && settings.ui.bgDistort) ui.bgDistortSlider.value = settings.ui.bgDistort;
if (ui.trailSlider && settings.ui.trail) ui.trailSlider.value = settings.ui.trail;
if (ui.beatSensSlider && settings.ui.beatSens) ui.beatSensSlider.value = settings.ui.beatSens;
            if (ui.smoothSlider && settings.ui.smoothing) ui.smoothSlider.value = settings.ui.smoothing;
            if (ui.bgReactCheck && typeof settings.ui.bgReact === "boolean") ui.bgReactCheck.checked = settings.ui.bgReact;
            if (ui.logoReactCheck && typeof settings.ui.logoReact === "boolean") ui.logoReactCheck.checked = settings.ui.logoReact;
            if (ui.titleReactCheck && typeof settings.ui.titleReact === "boolean") ui.titleReactCheck.checked = settings.ui.titleReact;
            if (ui.artistReactCheck && typeof settings.ui.artistReact === "boolean") ui.artistReactCheck.checked = settings.ui.artistReact;
            if (ui.logoOpacitySlider && settings.ui.logoOpacity) ui.logoOpacitySlider.value = settings.ui.logoOpacity;
            if (ui.logoSizeSlider && settings.ui.logoSize) ui.logoSizeSlider.value = settings.ui.logoSize;
            if (ui.pCountSlider && settings.ui.pCount) ui.pCountSlider.value = settings.ui.pCount;
            if (ui.pSpeedSlider && settings.ui.pSpeed) ui.pSpeedSlider.value = settings.ui.pSpeed;
            if (ui.pSizeSlider && settings.ui.pSize) ui.pSizeSlider.value = settings.ui.pSize;

            if (ui.titleInput && typeof settings.ui.title === "string") ui.titleInput.value = settings.ui.title;
            if (ui.artistInput && typeof settings.ui.artist === "string") ui.artistInput.value = settings.ui.artist;
            if (ui.titleSizeSlider && settings.ui.titleSize) ui.titleSizeSlider.value = settings.ui.titleSize;
            if (ui.artistSizeSlider && settings.ui.artistSize) ui.artistSizeSlider.value = settings.ui.artistSize;

            if (ui.startColor && settings.ui.startColor) ui.startColor.value = settings.ui.startColor;
            if (ui.midColor && settings.ui.midColor) ui.midColor.value = settings.ui.midColor;
            if (ui.endColor && settings.ui.endColor) ui.endColor.value = settings.ui.endColor;
            if (ui.bgColor && settings.ui.bgColor) ui.bgColor.value = settings.ui.bgColor;
            if (ui.titleColor && settings.ui.titleColor) ui.titleColor.value = settings.ui.titleColor;
            if (ui.artistColor && settings.ui.artistColor) ui.artistColor.value = settings.ui.artistColor;
            if (ui.particleColor && settings.ui.particleColor) ui.particleColor.value = settings.ui.particleColor;
        }

        if (settings.state) {
            if (typeof settings.state.bgOffsetX === "number") state.bgOffsetX = settings.state.bgOffsetX;
            if (typeof settings.state.bgOffsetY === "number") state.bgOffsetY = settings.state.bgOffsetY;
            if (typeof settings.state.logoOffsetX === "number") state.logoOffsetX = settings.state.logoOffsetX;
            if (typeof settings.state.logoOffsetY === "number") state.logoOffsetY = settings.state.logoOffsetY;

            if (typeof settings.state.titleX === "number") state.titleX = settings.state.titleX;
            if (typeof settings.state.titleY === "number") state.titleY = settings.state.titleY;
            if (typeof settings.state.artistX === "number") state.artistX = settings.state.artistX;
            if (typeof settings.state.artistY === "number") state.artistY = settings.state.artistY;
        }
    } catch (e) {
        console.warn("Settings konnten nicht geladen werden:", e);
    }
}

function resetLayout() {
    state.bgOffsetX = 0;
    state.bgOffsetY = 0;
    state.logoOffsetX = 0;
    state.logoOffsetY = 0;

    const cx = state.baseWidth / 2;
    const cy = state.baseHeight / 2;

    const tSize = ui.titleSizeSlider ? parseInt(ui.titleSizeSlider.value) * 1.5 : 60;
    state.titleX = cx;
    state.titleY = cy + 250;

    state.artistX = cx;
    state.artistY = state.titleY + tSize + 20;

    if (ui.bgScaleSlider) ui.bgScaleSlider.value = 1.0;

    scheduleSave();
}


// --- PARTICLE CLASS ---
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * state.baseWidth;
        this.y = Math.random() * state.baseHeight;
        const baseSize = ui.pSizeSlider ? parseFloat(ui.pSizeSlider.value) : 3;
        this.size = (Math.random() * baseSize) + 2; 
        const speedVal = ui.pSpeedSlider ? parseFloat(ui.pSpeedSlider.value) : 1.0;
        this.speedX = (Math.random() - 0.5) * speedVal * 2; 
        this.speedY = (Math.random() - 0.5) * speedVal * 2;
        this.life = Math.random() * 100 + 50; 
        this.opacity = Math.random() * 0.5 + 0.2;
    }
    update(bassPulse, dtNorm = 1) {
        const t = 1; // V5-like particle motion (no dt scaling)
        this.x += this.speedX * bassPulse * t;
        this.y += this.speedY * bassPulse * t;
        this.life -= t;
        if (this.x < 0 || this.x > state.baseWidth || this.y < 0 || this.y > state.baseHeight || this.life < 0) {
            this.reset();
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (state.hasParticleImage && state.particleImage.complete) {
            const s = this.size * 4; 
            ctx.drawImage(state.particleImage, this.x - s/2, this.y - s/2, s, s);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = (ui.particleColor ? ui.particleColor.value : ui.midColor.value); 
            ctx.fill();
        }
        ctx.restore();
    }
}


// --- Helper: Hit-Test für Text (für Drag & Drop) ---
function hitTestText(mouseX, mouseY) {
    const title = ui.titleInput ? ui.titleInput.value : "";
    const artist = ui.artistInput ? ui.artistInput.value : "";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const tSize = ui.titleSizeSlider ? parseInt(ui.titleSizeSlider.value) * 1.5 : 60;
    const aSize = ui.artistSizeSlider ? parseInt(ui.artistSizeSlider.value) * 1.5 : 30;

    // Title box
    if (title) {
        ctx.font = `bold ${tSize}px Inter, sans-serif`;
        const w = ctx.measureText(title).width;
        const h = tSize * 1.2;
        const left = state.titleX - w / 2;
        const top = state.titleY - h / 2;
        if (mouseX >= left && mouseX <= left + w && mouseY >= top && mouseY <= top + h) {
            ctx.restore();
            return "title";
        }
    }

    // Artist box
    if (artist) {
        ctx.font = `${aSize}px Inter, sans-serif`;
        const w = ctx.measureText(artist).width;
        const h = aSize * 1.2;
        const left = state.artistX - w / 2;
        const top = state.artistY - h / 2;
        if (mouseX >= left && mouseX <= left + w && mouseY >= top && mouseY <= top + h) {
            ctx.restore();
            return "artist";
        }
    }

    ctx.restore();
    return null;
}

// --- Init & Events ---
function init() {
    // HiDPI rendering (crisp text on 4K/Retina) — clamp DPR for performance
    state.dpr = 1; // Fixed 1080p render (V5-like), no HiDPI scaling
    const dpr = state.dpr;

    const W = state.baseWidth;
    const H = state.baseHeight;

    // Backing-store size
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.display = 'block';
    ctxMain.setTransform(dpr, 0, 0, dpr, 0, 0);

    // FX Layer (für Visuals)
    fxCanvas.width = Math.round(W * dpr);
    fxCanvas.height = Math.round(H * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background FX Layer (nur für Hintergrund Afterglow)
    bgFxCanvas.width = Math.round(W * dpr);
    bgFxCanvas.height = Math.round(H * dpr);
    bgFxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reset waterfall buffer (wird lazy initialisiert)
    wfCanvas.width = 0; wfCanvas.height = 0;


    // Defaults für Text-Position (wird ggf. durch Auto-Save überschrieben)
    state.titleX = state.baseWidth / 2;
    state.titleY = state.baseHeight / 2 + 250;
    const tSize0 = ui.titleSizeSlider ? parseInt(ui.titleSizeSlider.value) * 1.5 : 60;
    state.artistX = state.baseWidth / 2;
    state.artistY = state.titleY + tSize0 + 20;

    loadSettings();
    if (ui.modeSelect) state.visualizerMode = ui.modeSelect.value;

    // Collapsible sections (mehr Platz wie in Adobe-Tools)
    document.querySelectorAll('.sidebar section').forEach((sec) => {
        const h = sec.querySelector('h3');
        if (!h) return;
        h.addEventListener('click', () => sec.classList.toggle('collapsed'));
    });


    // --- DRAG & DROP LOGIK ---
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        state.dragScaleX = state.baseWidth / rect.width;
        state.dragScaleY = state.baseHeight / rect.height;

        const mouseCanvasX = (e.clientX - rect.left) * state.dragScaleX;
        const mouseCanvasY = (e.clientY - rect.top) * state.dragScaleY;

        // 1) Text hit-test (Priorität: Title/Artist)
        const textTarget = hitTestText(mouseCanvasX, mouseCanvasY);
        if (textTarget === "title") {
            state.isDraggingTitle = true;
            canvas.style.cursor = 'move';
        } else if (textTarget === "artist") {
            state.isDraggingArtist = true;
            canvas.style.cursor = 'move';
        } else {
            // 2) Logo hit-test
            const centerX = state.baseWidth / 2;
            const centerY = state.baseHeight / 2;

            const logoX = centerX + state.logoOffsetX;
            const logoY = centerY + state.logoOffsetY;

            const logoSize = ui.logoSizeSlider ? parseInt(ui.logoSizeSlider.value) : 560;
            const grabRadius = Math.max(30, logoSize / 2);

            const dist = Math.sqrt((mouseCanvasX - logoX) ** 2 + (mouseCanvasY - logoY) ** 2);

            if (state.centerLogo.complete && state.centerLogo.src && dist < grabRadius) {
                state.isDraggingLogo = true;
                canvas.style.cursor = 'move';
            } else {
                // 3) Sonst: Hintergrund
                state.isDraggingBg = true;
                canvas.style.cursor = 'grabbing';
            }
        }

        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        const deltaX = e.clientX - state.lastMouseX;
        const deltaY = e.clientY - state.lastMouseY;

        const dx = deltaX * (state.dragScaleX || 1);
        const dy = deltaY * (state.dragScaleY || 1);

        if (state.isDraggingTitle) {
            state.titleX += dx;
            state.titleY += dy;
        } else if (state.isDraggingArtist) {
            state.artistX += dx;
            state.artistY += dy;
        } else if (state.isDraggingLogo) {
            state.logoOffsetX += dx;
            state.logoOffsetY += dy;
        } else if (state.isDraggingBg) {
            state.bgOffsetX += dx;
            state.bgOffsetY += dy;
        }

        if (state.isDraggingTitle || state.isDraggingArtist || state.isDraggingLogo || state.isDraggingBg) {
            state.lastMouseX = e.clientX;
            state.lastMouseY = e.clientY;
        }
    });

    window.addEventListener('mouseup', () => {
        const wasDragging = state.isDraggingBg || state.isDraggingLogo || state.isDraggingTitle || state.isDraggingArtist;
        state.isDraggingBg = false;
        state.isDraggingLogo = false;
        state.isDraggingTitle = false;
        state.isDraggingArtist = false;
        canvas.style.cursor = 'default';
        if (wasDragging) scheduleSave();
    });

    if(ui.playBtn) ui.playBtn.addEventListener('click', () => { if (state.audioElement) state.audioElement.play(); });
    if(ui.pauseBtn) ui.pauseBtn.addEventListener('click', () => { if (state.audioElement) state.audioElement.pause(); });
    if(ui.stopBtn) ui.stopBtn.addEventListener('click', () => {
        stopAudio();
        if(state.isRecording) stopRecordingAndSave();
    });
    if(ui.recBtn) ui.recBtn.addEventListener('click', startAutoRecording);

    const updateLabel = (slider, label, suffix = "", decimals = null) => {
        if (!slider || !label) return;
        const set = () => {
            let v = slider.value;
            if (decimals !== null) {
                const num = parseFloat(slider.value);
                v = Number.isFinite(num) ? num.toFixed(decimals) : slider.value;
            }
            label.textContent = `${v}${suffix}`.trim();
        };
        set();
        slider.addEventListener('input', set);
        slider.addEventListener('change', set);
    };

    // Value Labels (live)
    updateFFT();
    updateLabel(ui.smoothSlider, ui.smoothVal, "", 2);
    updateLabel(ui.glowSlider, ui.glowVal);
    updateLabel(ui.radiusSlider, ui.radiusVal);
    updateLabel(ui.zoomSlider, ui.zoomVal, "", 2);
    updateLabel(ui.sensSlider, ui.sensVal, "", 2);
    updateLabel(ui.widthSlider, ui.barWidthVal);
    updateLabel(ui.gapSlider, ui.barGapVal);
    updateLabel(ui.logoOpacitySlider, ui.logoOpacityVal);
    updateLabel(ui.logoSizeSlider, ui.logoSizeVal);
updateLabel(ui.bgReactZoomSlider, ui.bgReactZoomVal, "", 2);
updateLabel(ui.bgReactColorSlider, ui.bgReactColorVal, "", 2);
updateLabel(ui.bgDistortSlider, ui.bgDistortVal);
updateLabel(ui.trailSlider, ui.trailVal, "", 2);
updateLabel(ui.beatSensSlider, ui.beatSensVal, "", 2);
    updateLabel(ui.pCountSlider, ui.pCountVal);
    updateLabel(ui.pSpeedSlider, ui.pSpeedVal, "", 2);
    updateLabel(ui.pSizeSlider, ui.pSizeVal);
    updateLabel(ui.titleSizeSlider, ui.titleSizeVal);
    updateLabel(ui.artistSizeSlider, ui.artistSizeVal);

    if(ui.fftSlider) ui.fftSlider.addEventListener('input', updateFFT);
    if(ui.smoothSlider) ui.smoothSlider.addEventListener('input', () => {
        if (state.analyserNode) state.analyserNode.smoothingTimeConstant = clamp(parseFloat(ui.smoothSlider.value), 0, 0.95);
    });
    if(ui.modeSelect) ui.modeSelect.addEventListener('change', (e) => { state.visualizerMode = e.target.value; scheduleSave(); });

    if(ui.audioUpload) ui.audioUpload.addEventListener('change', handleAudioUpload);
    
    if(ui.bgUpload) ui.bgUpload.addEventListener('change', (e) => {
        loadImg(e, state.bgImage);
        state.bgOffsetX = 0; state.bgOffsetY = 0;
    });
    
    if(ui.logoUpload) ui.logoUpload.addEventListener('change', (e) => {
        loadImg(e, state.centerLogo);
    });
    
    if(ui.particleUpload) ui.particleUpload.addEventListener('change', (e) => {
        loadImg(e, state.particleImage);
        state.hasParticleImage = true;
    });

    if(ui.pCountSlider) {
        initParticles(ui.pCountSlider ? parseInt(ui.pCountSlider.value) : 50);
        ui.pCountSlider.addEventListener('input', (e) => initParticles(parseInt(e.target.value)));
    } else {
        initParticles(ui.pCountSlider ? parseInt(ui.pCountSlider.value) : 50);
    }

    
    // Reset Layout
    if (ui.resetLayoutBtn) ui.resetLayoutBtn.addEventListener('click', resetLayout);

    // Auto-Save für alle Controls (ohne File-Inputs)
    document.addEventListener('input', (e) => {
        const t = e.target;
        if (!t) return;
        if (t.type === 'file') return;
        if (t.matches('input, select, textarea')) scheduleSave();
    });
    document.addEventListener('change', (e) => {
        const t = e.target;
        if (!t) return;
        if (t.type === 'file') return;
        if (t.matches('input, select, textarea')) scheduleSave();
    });

draw();
    console.log("Studio Pro V6 Loaded");
}

function initParticles(count) {
    state.particles = [];
    for(let i=0; i<count; i++) state.particles.push(new Particle());
}

function loadImg(e, imgObj) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    // Diagnostics: helpful when something fails to decode/draw
    imgObj.onload = () => {
        // Some browsers keep img.width/img.height at 0 for off-DOM images.
        // We'll use naturalWidth/naturalHeight when drawing.
        // console.log("Image loaded", imgObj.naturalWidth, imgObj.naturalHeight);
    };
    imgObj.onerror = (err) => {
        console.error("Image failed to load:", err, file);
    };

    imgObj.src = url;
}

function stopAudio() {
    if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement.currentTime = 0;
    }
}

function handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (state.audioContext) state.audioContext.close();
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    
    state.audioElement = new Audio(URL.createObjectURL(file));
    state.audioElement.loop = false;
    state.audioElement.onended = () => { if (state.isRecording) stopRecordingAndSave(); };
    
    state.audioSource = state.audioContext.createMediaElementSource(state.audioElement);
    state.analyserNode = state.audioContext.createAnalyser();
    state.destNode = state.audioContext.createMediaStreamDestination();
    
    state.audioSource.connect(state.analyserNode);
    state.analyserNode.connect(state.audioContext.destination);
    state.analyserNode.connect(state.destNode);
    
    updateFFT();
    state.audioElement.play().catch(e => console.log("Autoplay blocked"));
}

function updateFFT() {
    if (!ui.fftSlider) return;

    const powers = [64, 128, 256, 512, 1024, 2048]; // frequencyBinCount
    const labels = ["Low (64)", "Med (128)", "Standard (256)", "High (512)", "Ultra (1024)", "Max (2048)"];

    let idx = parseInt(ui.fftSlider.value);
    if (!Number.isFinite(idx)) idx = 2;
    idx = clamp(idx, 0, powers.length - 1);

    // Label update (works even without audio)
    if (ui.fftLabel) ui.fftLabel.textContent = labels[idx];

    if (!state.analyserNode) return;

    // analyser.fftSize is always double of frequencyBinCount
    state.analyserNode.fftSize = powers[idx] * 2;

    // Apply analyser smoothing as well
    const sm = ui.smoothSlider ? parseFloat(ui.smoothSlider.value) : 0.60;
    state.analyserNode.smoothingTimeConstant = 0; // use our own smoothing for consistent latency
    // const sm = ui.smoothSlider ? parseFloat(ui.smoothSlider.value) : 0.60;

    const bufferLength = state.analyserNode.frequencyBinCount;

    // Raw + smoothed frequency buffers
    state.freqRaw = new Uint8Array(bufferLength);
    state.freqData = new Float32Array(bufferLength);
    state.freqInited = false;
    state.dataArray = state.freqRaw; // legacy alias (do not draw from this directly)

    // Time-domain buffer (same length is fine for waveform)
    state.timeArray = new Uint8Array(bufferLength);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function setDprForAllCanvases(newDpr) {
    const dpr = 1; // locked to 1x for V5-like performance
    state.dpr = dpr;
    const W = state.baseWidth;
    const H = state.baseHeight;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctxMain.setTransform(dpr, 0, 0, dpr, 0, 0);

    fxCanvas.width = Math.round(W * dpr);
    fxCanvas.height = Math.round(H * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bgFxCanvas.width = Math.round(W * dpr);
    bgFxCanvas.height = Math.round(H * dpr);
    bgFxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function pickRecorderMimeType(requested) {
    const candidates = [];
    if (requested === 'vp8') candidates.push('video/webm;codecs=vp8');
    if (requested === 'vp9') candidates.push('video/webm;codecs=vp9');
    if (requested === 'auto' || !requested) {
        candidates.push('video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm');
    } else {
        candidates.push('video/webm');
    }
    for (const t of candidates) {
        try {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
        } catch (_) {}
    }
    return '';
}
function hexToRgbArr(hex) {
    const h = hex.replace('#', '').trim();
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
function rgbCss(r, g, b) { return `rgb(${r|0},${g|0},${b|0})`; }
function triColorAt(t) {
    t = clamp(t, 0, 1);
    const [r1, g1, b1] = hexToRgbArr(ui.startColor.value);
    const [r2, g2, b2] = hexToRgbArr(ui.midColor.value);
    const [r3, g3, b3] = hexToRgbArr(ui.endColor.value);
    if (t < 0.5) {
        const tt = t * 2;
        return rgbCss(lerp(r1, r2, tt), lerp(g1, g2, tt), lerp(b1, b2, tt));
    } else {
        const tt = (t - 0.5) * 2;
        return rgbCss(lerp(r2, r3, tt), lerp(g2, g3, tt), lerp(b2, b3, tt));
    }
}

// --- Audio Analyse: Bass/Mid/High/Energie + Beat Trigger ---
function updateAudioFeatures(nowMs) {
    const f = state.audioFeatures;
    const prev = (f.prevTime || nowMs);
    const dt = Math.max(0, (nowMs - prev) / 1000);
    f.prevTime = nowMs;
    f.dt = dt;

    // Phase für Distortion / Bewegung
    f.phase = (f.phase || 0) + dt * (1.0 + (f.mid || 0) * 2.5);

    // Wenn kein Audio geladen: sanft ausklingen lassen
    if (!state.analyserNode || !state.freqRaw || !state.freqData) {
        f.bass *= 0.90;
        f.mid *= 0.90;
        f.high *= 0.90;
        f.energy *= 0.90;
        f.beatFlash *= 0.88;
        return;
    }

    // Frequency-Daten holen (raw) + eigenes Smoothing (damit Balken nicht hektisch zappeln)
    state.analyserNode.getByteFrequencyData(state.freqRaw);
    if (state.timeArray) state.analyserNode.getByteTimeDomainData(state.timeArray);

    const smoothKeep = ui.smoothSlider ? parseFloat(ui.smoothSlider.value) : 0.60;
    const dtNorm = clamp((dt || 0.016) * 60, 0.25, 4);
    const k = Math.pow(clamp(smoothKeep, 0, 0.95), dtNorm);

    // First frame: snap to current values
    if (!state.freqInited) {
        for (let i = 0; i < state.freqRaw.length; i++) state.freqData[i] = state.freqRaw[i];
        state.freqInited = true;
    } else {
        for (let i = 0; i < state.freqRaw.length; i++) {
            state.freqData[i] = state.freqData[i] * k + state.freqRaw[i] * (1 - k);
        }
    }

    const freq = state.freqData;
    const n = freq.length;

    const lowEnd = Math.max(2, Math.floor(n * 0.12));
    const midEnd = Math.max(lowEnd + 2, Math.floor(n * 0.45));

    const avg = (a, b) => {
        let sum = 0;
        const end = Math.min(n, b);
        for (let i = a; i < end; i++) sum += freq[i];
        const denom = Math.max(1, end - a);
        return (sum / denom) / 255;
    };

    const bassRaw = avg(0, lowEnd);
    const midRaw = avg(lowEnd, midEnd);
    const highRaw = avg(midEnd, n);
    const energyRaw = avg(0, n);

    // Smoothing (Attack/Release)
    const attack = 0.35;
    const release = 0.12;
    const smooth = (cur, target) => cur + (target - cur) * (target > cur ? attack : release);

    f.bass = smooth(f.bass, bassRaw);
    f.mid = smooth(f.mid, midRaw);
    f.high = smooth(f.high, highRaw);
    f.energy = smooth(f.energy, energyRaw);

    // Beat Trigger (Peak über Bass-EMA)
    f.bassAvg = (f.bassAvg || 0) * 0.97 + f.bass * 0.03;

    const beatSens = ui.beatSensSlider ? parseFloat(ui.beatSensSlider.value) : 1.3;
    const threshold = 0.12 / clamp(beatSens, 1.0, 2.0); // höherer Wert => sensibler
    const minGapMs = 180;

    const delta = f.bass - f.bassAvg;
    if (delta > threshold && (nowMs - (f.lastBeatTime || 0)) > minGapMs) {
        f.beatFlash = 1;
        f.lastBeatTime = nowMs;
    } else {
        f.beatFlash *= 0.88;
        if (f.beatFlash < 0.001) f.beatFlash = 0;
    }
}

function draw() {
    requestAnimationFrame(draw);

    const now = performance.now();

    const spectrumScale = ui.zoomSlider ? parseFloat(ui.zoomSlider.value) : 1.0;
    const radius = ui.radiusSlider ? parseInt(ui.radiusSlider.value) * spectrumScale * 1.5 : 200;
    const sensitivity = ui.sensSlider ? parseFloat(ui.sensSlider.value) : 1.0;
    const barWidth = ui.widthSlider ? parseInt(ui.widthSlider.value) * spectrumScale * 1.5 : 5;
    const barGap = ui.gapSlider ? parseInt(ui.gapSlider.value) * spectrumScale * 1.5 : 2;
    const glowAmount = ui.glowSlider ? parseInt(ui.glowSlider.value) * 2 : 0;

    // Audio Features aktualisieren (auch wenn kein Audio -> decays)
    updateAudioFeatures(now);
    const f = state.audioFeatures;

    const pulse = 1 + (f.bass * 0.18) + (f.beatFlash * 0.06);
    const highPulse = 1 + (f.high * 0.22) + (f.beatFlash * 0.10);

    // Selective reactivity (Still vs. Pulse)
    const bgReact = ui.bgReactCheck ? ui.bgReactCheck.checked : true;
    const logoPulse = (ui.logoReactCheck ? ui.logoReactCheck.checked : true) ? pulse : 1.0;
    const titlePulse = (ui.titleReactCheck ? ui.titleReactCheck.checked : true) ? pulse : 1.0;
    const artistPulse = (ui.artistReactCheck ? ui.artistReactCheck.checked : true) ? pulse : 1.0;

    // Beat indicator (UI lamp)
    if (ui.beatIndicator) {
        const on = f.beatFlash > 0.6;
        ui.beatIndicator.classList.toggle('on', on);
        ui.beatIndicator.style.opacity = String(clamp(0.25 + f.beatFlash, 0.25, 1));
    }// 1) BACKGROUND: Render to bgFxCanvas (Trail/Afterglow betrifft NUR Hintergrund)
const bgTrail = ui.trailSlider ? parseFloat(ui.trailSlider.value) : 0;

// Clear or fade previous BG frame (ohne "Schwarz wird immer deckender"-Bug)
if (bgTrail <= 0.001) {
    bgFxCtx.clearRect(0, 0, state.baseWidth, state.baseHeight);
} else {
    const dtNormBg = clamp(((f.dt || 0.016) * 60), 0.25, 4);
    const keep = Math.pow(clamp(1 - bgTrail, 0, 1), dtNormBg);
    bgFxCtx.save();
    bgFxCtx.globalCompositeOperation = 'destination-in';
    bgFxCtx.fillStyle = `rgba(0,0,0,${keep})`;
    bgFxCtx.fillRect(0, 0, state.baseWidth, state.baseHeight);
    bgFxCtx.restore();
}

// Wenn Trails aktiv sind: neues BG-Frame leicht transparent zeichnen -> echte Afterglow-Spuren
const baseBgDrawAlpha = (bgTrail <= 0.001) ? 1 : clamp(1 - bgTrail * 1.2, 0.25, 1);
const bgDrawAlpha = (bgTrail <= 0.001) ? 1 : (1 - Math.pow(1 - baseBgDrawAlpha, clamp(((f.dt || 0.016) * 60), 0.25, 4)));

// MAIN: Base Background Color
ctx = ctxMain;
ctx.fillStyle = ui.bgColor.value;
ctx.fillRect(0, 0, state.baseWidth, state.baseHeight);

// BG Image + Distort + React Zoom (in bgFxCanvas)
if (state.bgImage && state.bgImage.complete && (state.bgImage.naturalWidth || state.bgImage.width) && state.bgImage.src) {
    const zoomAmt = bgReact ? (ui.bgReactZoomSlider ? parseFloat(ui.bgReactZoomSlider.value) : 0.35) : 0;
    const bgZoom = bgReact ? (1 + (f.bass * zoomAmt * 0.6) + (f.beatFlash * 0.10)) : 1;

    const maxDistort = (bgReact && ui.bgDistortSlider) ? parseFloat(ui.bgDistortSlider.value) : 0;
    const distortNow = maxDistort * (0.10 + f.mid * 0.95 + f.beatFlash * 0.50);

    bgFxCtx.save();
    bgFxCtx.globalAlpha = bgDrawAlpha;
    drawBgWithDistort(bgFxCtx, state.bgImage, bgZoom, distortNow, f.phase);
    bgFxCtx.restore();
}

// Background Color React Overlay (auch in bgFxCanvas -> Trails wirken mit)
const colorAmt = (bgReact && ui.bgReactColorSlider) ? parseFloat(ui.bgReactColorSlider.value) : 0;
if (colorAmt > 0.001) {
    const t = clamp(0.15 + f.high * 0.95, 0, 1);
    const col = triColorAt(t);
    let a = (f.energy * 0.55 + f.high * 0.35) * colorAmt;
    a += (f.beatFlash * 0.10) * colorAmt;
    a = clamp(a, 0, 0.75);

    bgFxCtx.save();
    bgFxCtx.globalAlpha = a * bgDrawAlpha;
    bgFxCtx.fillStyle = col;
    bgFxCtx.fillRect(0, 0, state.baseWidth, state.baseHeight);
    bgFxCtx.restore();
}

// Composite BG FX over base BG color
ctxMain.drawImage(bgFxCanvas, 0, 0, state.baseWidth, state.baseHeight);

// 2) FX Layer: Visuals (Particles/Spectrum/Logo/Text) werden JEDES Frame neu gezeichnet (kein Trail)
fxCtx.clearRect(0, 0, state.baseWidth, state.baseHeight);

ctx = fxCtx;

    // Partikel (bekommen Trails)
    const dtNorm = clamp(((f.dt || 0.016) * 60), 0.25, 4);
    state.particles.forEach(p => { p.update(highPulse, dtNorm); p.draw(ctx); });

    // --- POSITIONS ---
    const spectrumX = state.baseWidth / 2;
    const spectrumY = state.baseHeight / 2;
    const logoX = spectrumX + state.logoOffsetX;
    const logoY = spectrumY + state.logoOffsetY;

    // Spectrum + Glow
    ctx.shadowBlur = glowAmount;
    ctx.shadowColor = ui.midColor.value;

    if (state.analyserNode && state.freqData) {
        if (state.visualizerMode === 'radial-bars') drawRadialBars(spectrumX, spectrumY, radius, sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'radial-lines') drawRadialLines(spectrumX, spectrumY, radius, sensitivity, barGap);
        else if (state.visualizerMode === 'points-circle') drawPointsCircle(spectrumX, spectrumY, radius, sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'concentric-rings') drawConcentricRings(spectrumX, spectrumY, radius, sensitivity, barWidth);
        else if (state.visualizerMode === 'linear-bars') drawLinearBars(sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'mirrored-bars') drawMirroredBars(spectrumX, spectrumY, sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'radial-inout') drawRadialInOutBars(spectrumX, spectrumY, radius, sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'arc-eq') drawArcEQ(spectrumX, spectrumY, radius, sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'log-bars') drawLogBars(sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'led-bars') drawLEDBars(sensitivity, barWidth, barGap);
        else if (state.visualizerMode === 'area-spectrum') drawAreaSpectrum(sensitivity);
        else if (state.visualizerMode === 'waterfall') drawWaterfall(sensitivity);
        else if (state.visualizerMode === 'vectorscope') drawVectorScope(spectrumX, spectrumY, radius, sensitivity);
        else if (state.visualizerMode === 'wave') drawWaveform(spectrumX, spectrumY, radius, sensitivity);
    }

    ctx.shadowBlur = 0;

    // Logo (Aspect-Ratio safe + optional Pulse)
    if (state.centerLogo.complete && state.centerLogo.src) {
        const baseLogoSize = ui.logoSizeSlider ? parseInt(ui.logoSizeSlider.value) : 560;
        const size = baseLogoSize * logoPulse;
        const opacity = ui.logoOpacitySlider ? (parseInt(ui.logoOpacitySlider.value) / 100) : 1;

        const iw = state.centerLogo.naturalWidth || state.centerLogo.width;
        const ih = state.centerLogo.naturalHeight || state.centerLogo.height;

        // Keep aspect ratio (no deformation)
        let drawW = size, drawH = size;
        if (iw && ih) {
            const ar = iw / ih;
            if (ar >= 1) { drawW = size; drawH = size / ar; }
            else { drawH = size; drawW = size * ar; }
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(logoX, logoY, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(state.centerLogo, logoX - drawW / 2, logoY - drawH / 2, drawW, drawH);
        ctx.restore();
    }

    // Text (mit Trails)
    const title = ui.titleInput ? ui.titleInput.value : "";
    const artist = ui.artistInput ? ui.artistInput.value : "";
    if (title || artist) {
        ctx.save();
        ctx.textAlign = "center";
        const tSize = parseInt(ui.titleSizeSlider.value) * 1.5;
        const aSize = parseInt(ui.artistSizeSlider.value) * 1.5;

        if (title) {
            ctx.font = `bold ${tSize * titlePulse}px Inter, sans-serif`;
            ctx.fillStyle = ui.titleColor.value;
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.fillText(title, state.titleX, state.titleY);
        }
        if (artist) {
            ctx.font = `${aSize * artistPulse}px Inter, sans-serif`;
            ctx.fillStyle = ui.artistColor.value;
            ctx.fillText(artist, state.artistX, state.artistY);
        }
        ctx.restore();
    }

    // 3) Composite: FX über Background
    ctxMain.drawImage(fxCanvas, 0, 0, state.baseWidth, state.baseHeight);

    // restore default ctx (für hitTestText etc.)
    ctx = ctxMain;
}

function drawBgWithZoom(ctx, img, bassZoom) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const manualScale = ui.bgScaleSlider ? parseFloat(ui.bgScaleSlider.value) : 1.0;
    const manualX = state.bgOffsetX;
    const manualY = state.bgOffsetY;

    const ratio = Math.max(state.baseWidth / iw, state.baseHeight / ih);
    const finalScale = ratio * bassZoom * manualScale;

    const nw = iw * finalScale;
    const nh = ih * finalScale;
    const nx = (state.baseWidth - nw) / 2 + manualX;
    const ny = (state.baseHeight - nh) / 2 + manualY;

    ctx.drawImage(img, nx, ny, nw, nh);
}

function drawBgWithDistort(ctx, img, bassZoom, distortPx, phase) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const manualScale = ui.bgScaleSlider ? parseFloat(ui.bgScaleSlider.value) : 1.0;
    const manualX = state.bgOffsetX;
    const manualY = state.bgOffsetY;

    const ratio = Math.max(state.baseWidth / iw, state.baseHeight / ih);
    const finalScale = ratio * bassZoom * manualScale;

    const nw = iw * finalScale;
    const nh = ih * finalScale;
    const nx = (state.baseWidth - nw) / 2 + manualX;
    const ny = (state.baseHeight - nh) / 2 + manualY;

    if (!distortPx || distortPx <= 0.5) {
        ctx.drawImage(img, nx, ny, nw, nh);
        return;
    }

    // Slice-based warp (cheap 2D distortion without WebGL)
    const slices = 60;
    const sliceW = nw / slices;
    const srcSliceW = iw / slices;

    for (let i = 0; i < slices; i++) {
        const wobbleY = Math.sin(phase + i * 0.35) * distortPx;
        const wobbleX = Math.cos(phase * 0.7 + i * 0.25) * distortPx * 0.25;

        ctx.drawImage(
            img,
            i * srcSliceW, 0, srcSliceW, ih,
            nx + i * sliceW + wobbleX, ny + wobbleY,
            sliceW + 1, nh
        );
    }
}

// --- VISUALIZER FUNCTIONS ---

// --- Erweiterte Modi (ohne WebGL, ohne Zeit-Glättung) ---
// Ziel: Mehr "Spektrum-Feeling" bei stabiler 1080p Performance.

const MODE_BANDS = 96;

// Log/Octave-ähnliche Bandbildung (mehr Details im Bassbereich)
function computeLogBands(freq, bands = MODE_BANDS, curve = 2.4) {
    const n = freq ? freq.length : 0;
    if (!n) return null;

    // Cache im state, damit wir keine Arrays pro Frame allocaten
    if (!state._logBands || state._logBands.length !== bands) state._logBands = new Uint8Array(bands);

    // Wir ignorieren die ersten 1-2 Bins (DC / very low noise) für stabileres Bild
    const minBin = Math.min(2, n - 1);
    const maxBin = n - 1;

    for (let i = 0; i < bands; i++) {
        const t0 = i / bands;
        const t1 = (i + 1) / bands;

        const a = minBin + Math.floor(Math.pow(t0, curve) * (maxBin - minBin));
        const b = minBin + Math.floor(Math.pow(t1, curve) * (maxBin - minBin));
        const start = Math.max(minBin, Math.min(maxBin, a));
        const end = Math.max(start + 1, Math.min(maxBin + 1, b));

        // "Max" wirkt punchy (gut für Beat/YouTube), ohne Zeit-Glättung
        let mx = 0;
        for (let k = start; k < end; k++) {
            const v = freq[k];
            if (v > mx) mx = v;
        }
        state._logBands[i] = mx;
    }
    return state._logBands;
}

// Helper: x-Layout für N Balken mit Width/Gap (wie euer Classic-Modus)
function computeBarLayout(bars, width, gap) {
    const totalWidth = bars * (width + gap);
    let startX = (state.baseWidth - totalWidth) / 2;
    if (startX < 0) startX = 0; // gleiche Logik wie classic
    return { totalWidth, startX };
}

// 1) Log EQ (96 Bänder) — sieht sofort "voller" aus als lineare FFT
function drawLogBars(sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    const bars = bands.length;
    const { startX } = computeBarLayout(bars, width, gap);

    const maxH = state.baseHeight * 0.8;
    for (let i = 0; i < bars; i++) {
        const percent = bands[i] / 255;
        const barHeight = maxH * percent * sensitivity;
        if (barHeight <= 0) continue;

        const yPos = state.baseHeight - barHeight;
        const gradient = ctx.createLinearGradient(0, state.baseHeight, 0, yPos);
        gradient.addColorStop(0, ui.startColor.value);
        gradient.addColorStop(0.5, ui.midColor.value);
        gradient.addColorStop(1, ui.endColor.value);

        ctx.fillStyle = gradient;
        ctx.fillRect(startX + i * (width + gap), yPos, width, barHeight);
    }
}

// 2) LED EQ (96 Bänder + Peak Hold Caps) — "Studio"-Look
function drawLEDBars(sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    const bars = bands.length;
    const { startX } = computeBarLayout(bars, width, gap);

    // Peak-Caps Cache
    if (!state._ledPeaks || state._ledPeaks.length !== bars) state._ledPeaks = new Float32Array(bars);

    const maxH = state.baseHeight * 0.8;

    // LED Segment-Geometrie: reagiert indirekt auf barWidth/spectrumScale
    const segH = Math.max(4, Math.round(width * 1.2));
    const segGap = Math.max(2, Math.round(segH * 0.35));

    // Peak-Fall pro Sekunde (kein Smoothing, nur visueller "Cap")
    const dt = Math.max(0.010, (state.audioFeatures && state.audioFeatures.dt) ? state.audioFeatures.dt : 0.016);
    const peakFall = (maxH * 1.2) * dt; // schnell genug für Beat

    for (let i = 0; i < bars; i++) {
        const percent = bands[i] / 255;
        const barHeight = maxH * percent * sensitivity;
        if (barHeight <= 0.5) {
            // Peak trotzdem fallen lassen
            state._ledPeaks[i] = Math.max(0, state._ledPeaks[i] - peakFall);
            continue;
        }

        // Peak Update
        state._ledPeaks[i] = Math.max(state._ledPeaks[i] - peakFall, barHeight);

        const x = startX + i * (width + gap);
        let y = state.baseHeight;

        const segCount = Math.floor(barHeight / (segH + segGap));
        for (let s = 0; s < segCount; s++) {
            const y0 = y - (segH + segGap);
            const t = (s / Math.max(1, segCount - 1));
            ctx.fillStyle = triColorAt(t);
            ctx.fillRect(x, y0, width, segH);
            y = y0;
        }

        // Peak Cap (kleiner Strich)
        const capY = state.baseHeight - state._ledPeaks[i];
        ctx.fillStyle = ui.endColor.value;
        ctx.fillRect(x, capY - 2, width, 4);
    }
}

// 3) Area Spectrum (96) — gefüllte Wellen ("dichter" als Bars)
function drawAreaSpectrum(sensitivity) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    const bars = bands.length;
    // wir nutzen barWidth/gap, damit deine Einstellungen wirken
    const width = ui.widthSlider ? parseInt(ui.widthSlider.value) * (ui.zoomSlider ? parseFloat(ui.zoomSlider.value) : 1) * 1.5 : 6;
    const gap = ui.gapSlider ? parseInt(ui.gapSlider.value) * (ui.zoomSlider ? parseFloat(ui.zoomSlider.value) : 1) * 1.5 : 2;
    const { startX } = computeBarLayout(bars, width, gap);

    const maxH = state.baseHeight * 0.55;
    const baseY = state.baseHeight * 0.92;

    ctx.beginPath();
    ctx.moveTo(startX, baseY);

    for (let i = 0; i < bars; i++) {
        const percent = bands[i] / 255;
        const h = maxH * percent * sensitivity;
        const x = startX + i * (width + gap) + width / 2;
        const y = baseY - h;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(startX + (bars - 1) * (width + gap) + width / 2, baseY);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY, 0, baseY - maxH);
    grad.addColorStop(0, ui.startColor.value);
    grad.addColorStop(0.5, ui.midColor.value);
    grad.addColorStop(1, ui.endColor.value);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
}

// 4) Waterfall / Spectrogram — low-res history buffer, dann hochskaliert
function ensureWaterfallBuffer() {
    if (wfCanvas.width && wfCanvas.height) return;
    wfCanvas.width = 640;
    wfCanvas.height = 360;
    wfCtx.clearRect(0, 0, wfCanvas.width, wfCanvas.height);
}

function drawWaterfall(sensitivity) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    ensureWaterfallBuffer();

    const W = wfCanvas.width;
    const H = wfCanvas.height;

    // Scroll down by 1px
    wfCtx.drawImage(wfCanvas, 0, 1);

    // Neue Zeile oben zeichnen
    wfCtx.clearRect(0, 0, W, 1);

    // Gap/Breite Verhältnis aus euren Reglern übernehmen (wirkt optisch im Waterfall)
    const bw = Math.max(1, parseInt(ui.widthSlider ? ui.widthSlider.value : 6));
    const gp = Math.max(0, parseInt(ui.gapSlider ? ui.gapSlider.value : 2));
    const ratio = bw / Math.max(1, (bw + gp)); // 0..1

    const colW = W / bands.length;
    const barW = colW * ratio;
    const xPad = (colW - barW) / 2;

    for (let i = 0; i < bands.length; i++) {
        const v = (bands[i] / 255) * sensitivity;
        const t = clamp(v, 0, 1);
        wfCtx.fillStyle = triColorAt(t);
        wfCtx.fillRect(i * colW + xPad, 0, Math.max(1, barW), 1);
    }

    // Zeichne hochskaliert in die Scene (als Mode)
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(wfCanvas, 0, 0, state.baseWidth, state.baseHeight);
    ctx.restore();
}

// 5) Stereo Scope (Lissajous) — reagiert auf time-domain
function drawVectorScope(cx, cy, radius, sensitivity) {
    const a = state.timeArray;
    if (!a || a.length < 32) return;

    // Für echte Stereo bräuchten wir L/R getrennt; hier nutzen wir eine "Pseudo"-Variante:
    // x = sample(t), y = sample(t + offset)
    const N = a.length;
    const offset = Math.floor(N * 0.25);
    const scale = radius * 0.95 * clamp(sensitivity, 0.5, 3);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.strokeStyle = ui.midColor.value;

    ctx.beginPath();
    for (let i = 0; i < N - offset; i += 2) {
        const x = ((a[i] - 128) / 128) * scale;
        const y = ((a[i + offset] - 128) / 128) * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

// Kreis: In+Out Bars (füllt mehr Fläche, wirkt "reicher")
function drawRadialInOutBars(cx, cy, radius, sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    const bars = bands.length;
    const step = (Math.PI * 2) / bars;
    for (let i = 0; i < bars; i++) {
        const value = bands[i] * sensitivity * 1.2;
        const h = Math.max(value, 1);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * step);

        const g = ctx.createLinearGradient(0, radius - h, 0, radius + h);
        g.addColorStop(0, ui.endColor.value);
        g.addColorStop(0.5, ui.midColor.value);
        g.addColorStop(1, ui.startColor.value);
        ctx.fillStyle = g;

        // Out
        ctx.fillRect(-width / 2, radius, width, h);
        // In
        ctx.fillRect(-width / 2, radius - h, width, h);
        ctx.restore();
    }
}

// Arc EQ (Halbkreis) — ideal wenn Logo/Text unten bleibt
function drawArcEQ(cx, cy, radius, sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bands = computeLogBands(freq, MODE_BANDS);
    if (!bands) return;

    const bars = bands.length;
    const arcStart = Math.PI * 1.1;
    const arcEnd = Math.PI * 1.9;
    const span = arcEnd - arcStart;
    const step = span / bars;

    for (let i = 0; i < bars; i++) {
        const value = bands[i] * sensitivity * 1.25;
        const h = Math.max(value, 1);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(arcStart + i * step);

        const g = ctx.createLinearGradient(0, radius, 0, radius + h);
        g.addColorStop(0, ui.startColor.value);
        g.addColorStop(0.5, ui.midColor.value);
        g.addColorStop(1, ui.endColor.value);
        ctx.fillStyle = g;

        ctx.fillRect(-width / 2, radius, width, h);
        ctx.restore();
    }
}


function drawRadialBars(cx, cy, radius, sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bars = freq.length;
    const step = (Math.PI * 2) / bars;
    for (let i = 0; i < bars; i++) {
        const value = freq[i] * sensitivity * 1.5; 
        const barHeight = Math.max(value, 1);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * step);
        const gradient = ctx.createLinearGradient(0, radius, 0, radius + barHeight);
        gradient.addColorStop(0, ui.startColor.value);
        gradient.addColorStop(0.5, ui.midColor.value);
        gradient.addColorStop(1, ui.endColor.value);
        ctx.fillStyle = gradient;
        ctx.fillRect(-width / 2, radius, width, barHeight);
        ctx.restore();
    }
}
function drawRadialLines(cx, cy, radius, sensitivity, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bars = freq.length;
    const step = (Math.PI * 2) / bars;
    ctx.lineWidth = 3; 
    for (let i = 0; i < bars; i++) {
        const value = freq[i] * sensitivity * 1.5;
        const barHeight = Math.max(value, 1);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * step);
        const gradient = ctx.createLinearGradient(0, radius, 0, radius + barHeight);
        gradient.addColorStop(0, ui.startColor.value);
        gradient.addColorStop(1, ui.endColor.value);
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, radius);
        ctx.lineTo(0, radius + barHeight);
        ctx.stroke();
        ctx.restore();
    }
}
function drawPointsCircle(cx, cy, radius, sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bars = freq.length;
    const step = (Math.PI * 2) / bars;
    const dotSize = width / 2;
    for (let i = 0; i < bars; i++) {
        const value = freq[i] * sensitivity * 1.5;
        const distance = radius + value + 10;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * step);
        ctx.beginPath();
        ctx.arc(0, distance, dotSize, 0, Math.PI * 2);
        if (value > 150) ctx.fillStyle = ui.endColor.value;
        else if (value > 75) ctx.fillStyle = (ui.particleColor ? ui.particleColor.value : ui.midColor.value);
        else ctx.fillStyle = ui.startColor.value;
        ctx.fill();
        ctx.restore();
    }
}
function drawConcentricRings(cx, cy, radius, sensitivity, width) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const steps = 20;
    const totalData = freq.length;
    const stepSize = Math.floor(totalData / steps);
    for (let i = 0; i < steps; i++) {
        const value = freq[i * stepSize] * sensitivity;
        const ringRadius = radius + (i * (width * 1.5));
        const opacity = Math.min(1, value / 200);
        if (opacity > 0.05) {
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.lineWidth = width / 2;
            if (i < steps / 3) ctx.strokeStyle = `rgba(${hexToRgb(ui.startColor.value)}, ${opacity})`;
            else if (i < steps / 1.5) ctx.strokeStyle = `rgba(${hexToRgb(ui.midColor.value)}, ${opacity})`;
            else ctx.strokeStyle = `rgba(${hexToRgb(ui.endColor.value)}, ${opacity})`;
            ctx.stroke();
        }
    }
}
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r},${g},${b}`;
}

// --- FIX: KLASSISCHE BALKEN (ROBUST & SKALIERBAR) ---
function drawLinearBars(sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bars = freq.length;
    const totalWidth = bars * (width + gap);
    
    // Zentrieren, aber nicht abschneiden (0 wenn zu breit)
    let startX = (state.baseWidth - totalWidth) / 2;
    if (startX < 0) startX = 0;

    for (let i = 0; i < bars; i++) {
        // Normalisieren auf 0-1 (Wert durch 255)
        const percent = freq[i] / 255;
        
        // Höhe basierend auf Bildschirmhöhe (Max 80% des Screens)
        const barHeight = (state.baseHeight * 0.8) * percent * sensitivity; 
        
        // Nur zeichnen wenn sichtbar
        if (barHeight > 0) {
            const yPos = state.baseHeight - barHeight;
            const gradient = ctx.createLinearGradient(0, state.baseHeight, 0, yPos);
            gradient.addColorStop(0, ui.startColor.value);
            gradient.addColorStop(0.5, ui.midColor.value);
            gradient.addColorStop(1, ui.endColor.value);

            ctx.fillStyle = gradient;
            ctx.fillRect(startX + i * (width + gap), yPos, width, barHeight);
        }
    }
}

function drawMirroredBars(cx, cy, sensitivity, width, gap) {
    const freq = state.freqData || state.dataArray;
    if (!freq) return;
    const bars = freq.length;
    const startX = cx; 
    for (let i = 0; i < bars / 2; i++) {
        const value = freq[i] * sensitivity * 1.5;
        const barHeight = Math.max(value, 1);
        const gradient = ctx.createLinearGradient(0, cy - barHeight / 2, 0, cy + barHeight / 2);
        gradient.addColorStop(0, ui.endColor.value);
        gradient.addColorStop(0.5, ui.startColor.value);
        gradient.addColorStop(1, ui.endColor.value);
        ctx.fillStyle = gradient;
        ctx.fillRect(startX + i * (width + gap), cy - barHeight / 2, width, barHeight);
        ctx.fillRect(startX - (i + 1) * (width + gap), cy - barHeight / 2, width, barHeight);
    }
}
function drawWaveform(cx, cy, radius, sensitivity) {
    const bufferLength = (state.timeArray ? state.timeArray.length : state.dataArray.length);
    ctx.lineWidth = 4;
    const gradient = ctx.createLinearGradient(0, 0, state.baseWidth, 0);
    gradient.addColorStop(0, ui.startColor.value);
    gradient.addColorStop(0.5, ui.midColor.value);
    gradient.addColorStop(1, ui.endColor.value);
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    const sliceWidth = state.baseWidth / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = (state.timeArray ? state.timeArray[i] : freq[i]) / 128.0;
        const y = cy + (v - 1) * (state.baseHeight / 2) * sensitivity;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
}
function startAutoRecording() {
    if (!state.audioContext) { alert("Bitte erst Musik laden!"); return; }

    // Toggle behavior (REC acts as START/STOP)
    if (state.isRecording) { stopRecordingAndSave(); return; }

    stopAudio();

    // Recording settings (safe defaults)
    const perfMode = ui.recPerfToggle ? !!ui.recPerfToggle.checked : true;
    const recordFps = clamp(parseInt(ui.recFpsSelect ? ui.recFpsSelect.value : 30, 10) || 30, 10, 60);

    // In Performance mode, force DPR=1 + VP8 to avoid heavy 4K/VP9 encoding slowdowns
    const selectedCodec = (ui.recCodecSelect ? ui.recCodecSelect.value : 'auto');
    const requestedCodec = (perfMode && (!selectedCodec || selectedCodec === 'auto')) ? 'vp8' : selectedCodec;
    const mimeType = pickRecorderMimeType(requestedCodec);

    const bitrate = perfMode ? 8000000 : (parseInt(ui.recBitrateSelect ? ui.recBitrateSelect.value : 12000000, 10) || 12000000);

    // Reduce internal canvas resolution while recording if requested
    state.savedDpr = null;
    if (perfMode && state.dpr > 1) {
        state.savedDpr = state.dpr;
        setDprForAllCanvases(1);
    }

    const canvasStream = canvas.captureStream(recordFps);
    try {
        const vTrack = canvasStream.getVideoTracks()[0];
        if (vTrack && vTrack.applyConstraints) vTrack.applyConstraints({ frameRate: recordFps });
    } catch (_) {}

    const audioStream = state.destNode.stream;
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
    ]);

    const options = {};
    if (mimeType) options.mimeType = mimeType;
    options.videoBitsPerSecond = bitrate;

    try {
        state.mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
        console.warn("MediaRecorder init failed with options, retrying without mimeType:", e);
        delete options.mimeType;
        state.mediaRecorder = new MediaRecorder(combinedStream, options);
    }

    state.recordedChunks = [];
    state.mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) state.recordedChunks.push(e.data); };
    state.mediaRecorder.onerror = e => { console.error("MediaRecorder error:", e); };

    // Timeslice prevents huge memory spikes on long recordings
    state.mediaRecorder.start();

    state.isRecording = true;
    ui.recBtn.innerHTML = '<i class="fas fa-circle"></i> STOP';
    ui.recBtn.classList.add('recording');
    ui.recStatus.textContent = `Aufnahme läuft... (${recordFps}fps, ${requestedCodec.toUpperCase()}, ${(bitrate/1000000).toFixed(0)}Mbps${perfMode ? ", DPR=1" : ""})`;

    state.audioElement.play();
}
function stopRecordingAndSave() {
    if (!state.isRecording || !state.mediaRecorder) return;

    state.isRecording = false;
    ui.recBtn.innerHTML = '<i class="fas fa-circle"></i> REC';
    ui.recBtn.classList.remove('recording');
    ui.recStatus.textContent = "Speichere Video...";

    const restoreDpr = () => {
        if (state.savedDpr) {
            setDprForAllCanvases(state.savedDpr);
            state.savedDpr = null;
        }
    };

    state.mediaRecorder.onstop = () => {
        try {
            const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visualizer_HD.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                ui.recStatus.textContent = "Fertig!";
                restoreDpr();
            }, 100);
        } catch (e) {
            console.error(e);
            ui.recStatus.textContent = "Fehler beim Speichern";
            restoreDpr();
        }
    };

    try {
        state.mediaRecorder.stop();
    } catch (e) {
        console.error(e);
        ui.recStatus.textContent = "Fehler beim Stoppen";
        restoreDpr();
    }
}

init();