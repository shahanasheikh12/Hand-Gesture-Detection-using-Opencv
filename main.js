// DOM Elements
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('loading-overlay');
const cameraPlaceholder = document.getElementById('camera-placeholder');

// UI Buttons
const btnStartCamera = document.getElementById('btn-start-camera');
const btnMirror = document.getElementById('btn-mirror');
const btnFullscreen = document.getElementById('btn-fullscreen');

// Settings Inputs
const rangeMinDetection = document.getElementById('range-min-detection');
const rangeMinTracking = document.getElementById('range-min-tracking');
const rangeMaxHands = document.getElementById('range-max-hands');
const selectRenderMode = document.getElementById('select-render-mode');
const colorJoints = document.getElementById('color-joints');
const colorConnections = document.getElementById('color-connections');
const rangeJointSize = document.getElementById('range-joint-size');
const rangeLineWidth = document.getElementById('range-line-width');

// Value Displays
const valMinDetection = document.getElementById('val-min-detection');
const valMinTracking = document.getElementById('val-min-tracking');
const valMaxHands = document.getElementById('val-max-hands');
const textJoints = document.getElementById('text-joints');
const textConnections = document.getElementById('text-connections');
const valJointSize = document.getElementById('val-joint-size');
const valLineWidth = document.getElementById('val-line-width');
const statusLabel = document.getElementById('status-label');
const statusIndicator = document.querySelector('.system-status .status-indicator');

// HUD Displays
const hudFps = document.getElementById('hud-fps');
const hudLatency = document.getElementById('hud-latency');
const hudGesture = document.getElementById('hud-gesture');
const hudHands = document.getElementById('hud-hands');

// State Variables
let camera = null;
let handsTracker = null;
let isCameraActive = false;
let isMirrored = true;
let activePreset = 'classic'; // classic, cyber, minimal, hologram
let fpsList = [];
let lastFrameTime = performance.now();
let trackingLatencyStart = 0;
let showVideoFeed = true;

// Cyberpunk particles array
let particles = [];

// Particle Class
class SparkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2;
    this.speedX = (Math.random() * 2 - 1) * 1.5;
    this.speedY = (Math.random() * -3 - 0.5); // Rises upwards
    this.color = color;
    this.life = 1.0;
    this.decay = Math.random() * 0.04 + 0.015;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Map Landmark Connections for Drawing Manual Lines
const HAND_CONNECTIONS_MAP = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [9, 10], [10, 11], [11, 12],     // Middle
  [13, 14], [14, 15], [15, 16],    // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17]        // Palm boundary
];

// Initialize UI Interactions & Sync
function initUISync() {
  // Sync Sliders
  rangeMinDetection.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valMinDetection.textContent = val.toFixed(2);
    updateTrackerSettings();
  });

  rangeMinTracking.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valMinTracking.textContent = val.toFixed(2);
    updateTrackerSettings();
  });

  rangeMaxHands.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valMaxHands.textContent = val;
    updateTrackerSettings();
  });

  rangeJointSize.addEventListener('input', (e) => {
    valJointSize.textContent = `${e.target.value} px`;
  });

  rangeLineWidth.addEventListener('input', (e) => {
    valLineWidth.textContent = `${e.target.value} px`;
  });

  // Sync Color Pickers
  colorJoints.addEventListener('input', (e) => {
    textJoints.textContent = e.target.value;
  });
  colorConnections.addEventListener('input', (e) => {
    textConnections.textContent = e.target.value;
  });

  // Sync Select / Preset
  selectRenderMode.addEventListener('change', (e) => {
    activePreset = e.target.value;
    // Apply default color adjustments based on presets
    if (activePreset === 'hologram') {
      colorJoints.value = '#06b6d4';
      colorConnections.value = '#0891b2';
    } else if (activePreset === 'cyber') {
      colorJoints.value = '#d946ef';
      colorConnections.value = '#8b5cf6';
    } else if (activePreset === 'classic') {
      colorJoints.value = '#a855f7';
      colorConnections.value = '#06b6d4';
    }
    textJoints.textContent = colorJoints.value;
    textConnections.textContent = colorConnections.value;
  });

  // Mirror Toggle
  btnMirror.addEventListener('click', () => {
    isMirrored = !isMirrored;
    if (isMirrored) {
      btnMirror.classList.add('active');
      canvasElement.classList.add('mirrored');
    } else {
      btnMirror.classList.remove('active');
      canvasElement.classList.remove('mirrored');
    }
  });

  // Fullscreen Toggle
  btnFullscreen.addEventListener('click', () => {
    const viewport = document.querySelector('.viewport-card');
    if (!document.fullscreenElement) {
      viewport.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      btnFullscreen.classList.add('active');
    } else {
      document.exitFullscreen();
      btnFullscreen.classList.remove('active');
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      btnFullscreen.classList.remove('active');
    }
  });

  // Start Camera Buttons
  btnStartCamera.addEventListener('click', startCameraFeed);

  // Sync Webcam Feed Toggle Checkbox
  const checkShowVideo = document.getElementById('check-show-video');
  if (checkShowVideo) {
    checkShowVideo.addEventListener('change', (e) => {
      showVideoFeed = e.target.checked;
    });
  }
}

// Update settings dynamically on the MediaPipe Hands object
function updateTrackerSettings() {
  if (handsTracker) {
    handsTracker.setOptions({
      maxNumHands: parseInt(rangeMaxHands.value),
      minDetectionConfidence: parseFloat(rangeMinDetection.value),
      minTrackingConfidence: parseFloat(rangeMinTracking.value)
    });
  }
}

// MediaPipe Hands Initialization
function initMediaPipe() {
  return new Promise((resolve, reject) => {
    try {
      if (!window.Hands) {
        throw new Error("MediaPipe Hands SDK not loaded correctly. Please check internet connection.");
      }

      handsTracker = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      handsTracker.setOptions({
        maxNumHands: parseInt(rangeMaxHands.value),
        modelComplexity: 1,
        minDetectionConfidence: parseFloat(rangeMinDetection.value),
        minTrackingConfidence: parseFloat(rangeMinTracking.value)
      });

      handsTracker.onResults(onResults);
      resolve();
    } catch (error) {
      console.error("Failed to init MediaPipe:", error);
      reject(error);
    }
  });
}

// Start Camera Stream & Capture Loop
async function startCameraFeed() {
  try {
    statusLabel.textContent = "Connecting Camera...";
    statusIndicator.className = 'status-indicator warn';
    
    // Hide placeholder
    cameraPlaceholder.classList.add('hidden');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: { ideal: 30 } },
      audio: false
    });

    videoElement.srcObject = stream;
    isCameraActive = true;

    if (!camera) {
      camera = new Camera(videoElement, {
        onFrame: async () => {
          if (isCameraActive) {
            trackingLatencyStart = performance.now();
            await handsTracker.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480
      });
    }

    await camera.start();
    
    statusLabel.textContent = "Tracking Active";
    statusIndicator.className = 'status-indicator online';
    loadingOverlay.classList.add('fade-out');
  } catch (error) {
    console.error("Camera access failed:", error);
    statusLabel.textContent = "Camera Error";
    statusIndicator.className = 'status-indicator error';
    
    // Re-show placeholder
    cameraPlaceholder.classList.remove('hidden');
    loadingOverlay.classList.add('fade-out');

    alert("Webcam access is required for real-time hand tracking. Please grant camera permissions and reload the page.");
  }
}

// Calculate FPS
function calculateFPS() {
  const now = performance.now();
  const fps = 1000 / (now - lastFrameTime);
  lastFrameTime = now;
  
  fpsList.push(fps);
  if (fpsList.length > 20) fpsList.shift();
  
  const avgFps = fpsList.reduce((a, b) => a + b, 0) / fpsList.length;
  hudFps.textContent = Math.round(avgFps).toString().padStart(2, '0');
}

// Basic Hand Gesture Detection Heuristics
function detectGesture(landmarks, isRightHand) {
  // Landmarks indices:
  // Tip of thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20
  // Joints below tip: index: 6, middle: 10, ring: 14, pinky: 18
  // Knuckles (MCP joints): index: 5, middle: 9, ring: 13, pinky: 17
  
  const wrist = landmarks[0];
  
  // 1. Determine if fingers are extended (pointing upwards/away from wrist relative to knuckle)
  const isIndexExtended = landmarks[8].y < landmarks[6].y;
  const isMiddleExtended = landmarks[12].y < landmarks[10].y;
  const isRingExtended = landmarks[16].y < landmarks[14].y;
  const isPinkyExtended = landmarks[20].y < landmarks[18].y;
  
  // For thumb: check horizontal relative distance from knuckle (MCP index 5)
  // Or check if y of thumb tip 4 is higher than MCP joint 2
  const isThumbExtended = landmarks[4].y < landmarks[2].y;

  // Let's count how many fingers are extended
  let extendedCount = 0;
  if (isIndexExtended) extendedCount++;
  if (isMiddleExtended) extendedCount++;
  if (isRingExtended) extendedCount++;
  if (isPinkyExtended) extendedCount++;
  
  // Fist: All fingers folded close
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && landmarks[4].y > landmarks[9].y) {
    return "Fist ✊";
  }

  // Open Hand: All fingers extended
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
    return "Open Hand ✋";
  }

  // Victory / Peace: Index and Middle extended, others folded
  if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return "Victory / Peace ✌️";
  }

  // Thumbs Up: Thumb extended, other fingers folded
  // We check if other 4 fingers are folded
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && isThumbExtended) {
    // Make sure the thumb tip is higher than knuckle
    if (landmarks[4].y < landmarks[3].y) {
      return "Thumbs Up 👍";
    }
  }

  // Spider-Man (Rock-On): Index and Pinky extended, middle and ring folded
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
    return "Spider-Man / Rock-On 🤘";
  }

  return "Tracking...";
}

// Draw custom neon nodes and joints
function drawHandSkeleton(landmarks, label) {
  const width = canvasElement.width;
  const height = canvasElement.height;
  const jointRad = parseInt(rangeJointSize.value);
  const lineW = parseInt(rangeLineWidth.value);
  const connectionClr = colorConnections.value;
  const jointClr = colorJoints.value;

  canvasCtx.save();

  // Draw connection lines
  canvasCtx.lineWidth = lineW;
  canvasCtx.lineCap = 'round';
  canvasCtx.lineJoin = 'round';

  if (activePreset === 'hologram') {
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = connectionClr;
    canvasCtx.strokeStyle = connectionClr;
  } else if (activePreset === 'cyber') {
    canvasCtx.shadowBlur = 12;
    canvasCtx.shadowColor = connectionClr;
    canvasCtx.strokeStyle = connectionClr;
  } else {
    canvasCtx.strokeStyle = connectionClr;
  }

  HAND_CONNECTIONS_MAP.forEach(([pt1, pt2]) => {
    const p1 = landmarks[pt1];
    const p2 = landmarks[pt2];
    
    canvasCtx.beginPath();
    canvasCtx.moveTo(p1.x * width, p1.y * height);
    canvasCtx.lineTo(p2.x * width, p2.y * height);
    canvasCtx.stroke();
  });

  // Draw joints
  landmarks.forEach((lm, idx) => {
    const x = lm.x * width;
    const y = lm.y * height;

    canvasCtx.beginPath();
    
    if (activePreset === 'minimal') {
      // Draw small solid joints only
      canvasCtx.arc(x, y, jointRad, 0, Math.PI * 2);
      canvasCtx.fillStyle = jointClr;
      canvasCtx.fill();
    } else if (activePreset === 'hologram') {
      // Glow rings
      canvasCtx.arc(x, y, jointRad, 0, Math.PI * 2);
      canvasCtx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      canvasCtx.fill();
      canvasCtx.strokeStyle = jointClr;
      canvasCtx.lineWidth = 1.5;
      canvasCtx.stroke();
      
      // Draw crosshair on finger tips (4, 8, 12, 16, 20)
      if ([4, 8, 12, 16, 20].includes(idx)) {
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, jointRad + 4, 0, Math.PI * 2);
        canvasCtx.strokeStyle = '#06b6d4';
        canvasCtx.stroke();
      }
    } else if (activePreset === 'cyber') {
      // Pulsing grad joints
      const grad = canvasCtx.createRadialGradient(x, y, 1, x, y, jointRad + 6);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, jointClr);
      grad.addColorStop(1, 'transparent');
      
      canvasCtx.arc(x, y, jointRad + 6, 0, Math.PI * 2);
      canvasCtx.fillStyle = grad;
      canvasCtx.fill();

      // Spawn particles on tips (4, 8, 12, 16, 20)
      if ([4, 8, 12, 16, 20].includes(idx) && Math.random() < 0.3) {
        particles.push(new SparkParticle(x, y, jointClr));
      }
    } else {
      // Classic neon mode
      canvasCtx.shadowBlur = 6;
      canvasCtx.shadowColor = jointClr;
      canvasCtx.arc(x, y, jointRad, 0, Math.PI * 2);
      canvasCtx.fillStyle = jointClr;
      canvasCtx.fill();
    }
  });

  // HUD text near hand wrist (0)
  if (activePreset === 'hologram' || activePreset === 'cyber') {
    const wrist = landmarks[0];
    const wx = wrist.x * width;
    const wy = wrist.y * height;
    
    canvasCtx.font = 'bold 11px Space Grotesk';
    canvasCtx.fillStyle = activePreset === 'hologram' ? '#06b6d4' : '#d946ef';
    canvasCtx.shadowBlur = 4;
    canvasCtx.shadowColor = canvasCtx.fillStyle;
    canvasCtx.fillText(label.toUpperCase(), wx - 25, wy + 25);
  }

  canvasCtx.restore();
}

// Draw/Update Active Spark Particles
function drawParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.update();
    p.draw(canvasCtx);
  });
}

// MediaPipe results handler
function onResults(results) {
  // Mirroring adjustments: the canvas coordinate system drawing does not change,
  // we handle mirror visualization via CSS transforms.
  
  // Adjust Canvas viewport scaling
  if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;
  }

  // Clear Canvas
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw Webcam Video Feed to Canvas if enabled
  if (showVideoFeed && results.image) {
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }

  // Compute Latency
  const latency = performance.now() - trackingLatencyStart;
  hudLatency.textContent = `${Math.round(latency)} ms`;

  // Compute FPS
  calculateFPS();

  // Active Hands Telemetry
  const detectedHandsCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
  hudHands.textContent = detectedHandsCount;

  if (results.multiHandLandmarks && results.multiHandedness) {
    let mainGesture = "None";

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const handedness = results.multiHandedness[i];
      
      // The handedness can be mirrored on preview.
      const handLabel = handedness.label; // "Left" or "Right"
      
      // Draw the skeleton
      drawHandSkeleton(landmarks, handLabel);
      
      // Classify gesture for the primary hand (index 0)
      if (i === 0) {
        mainGesture = detectGesture(landmarks, handLabel === 'Right');
      }
    }

    hudGesture.textContent = mainGesture;
  } else {
    hudGesture.textContent = "None";
  }

  // Render particles overlay (if cyberpunk preset is selected)
  if (activePreset === 'cyber') {
    drawParticles();
  } else {
    particles = []; // Clear array
  }
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  // Lucide Icons initialization
  lucide.createIcons();

  initUISync();

  try {
    await initMediaPipe();
    // Auto-start camera if permissions are already saved,
    // otherwise loading screen shows button or prompts them
    await startCameraFeed();
  } catch (err) {
    console.error("Initialization error:", err);
    statusLabel.textContent = "Model Error";
    statusIndicator.className = 'status-indicator error';
    
    // De-activate loader so user can see issue
    loadingOverlay.classList.add('fade-out');
  }
});
