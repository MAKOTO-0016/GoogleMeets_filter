// Google Meet 明るさ・美肌フィルター拡張機能のコンテンツスクリプト
class MeetVideoFilter {
  constructor() {
    this.brightness = 100;
    this.skinSmoothing = 0;
    this.portraitLighting = false;
    this.lowLightAdjust = false;
    this.appearanceCorrection = false;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.videoElement = null;
    this.originalVideoElement = null;
    this.isProcessing = false;
    
    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Create UI panel
    this.createUI();
    
    // Start monitoring for video elements
    this.startVideoMonitoring();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'togglePanel') {
        this.togglePanel();
      }
    });
  }

  async loadSettings() {
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'loadSettings' }, resolve);
      });
      
      this.brightness = result.brightness || 100;
      this.skinSmoothing = result.skinSmoothing || 0;
      this.portraitLighting = result.portraitLighting || false;
      this.lowLightAdjust = result.lowLightAdjust || false;
      this.appearanceCorrection = result.appearanceCorrection || false;
    } catch (error) {
      console.log('デフォルト設定を使用します');
    }
  }

  async saveSettings() {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveSettings',
          data: {
            brightness: this.brightness,
            skinSmoothing: this.skinSmoothing,
            portraitLighting: this.portraitLighting,
            lowLightAdjust: this.lowLightAdjust,
            appearanceCorrection: this.appearanceCorrection
          }
        }, resolve);
      });
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  }

  createUI() {
    // 既存のパネルがあれば削除
    const existingPanel = document.getElementById('meet-filter-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // パネルコンテナを作成
    const panel = document.createElement('div');
    panel.id = 'meet-filter-panel';
    panel.className = 'meet-filter-panel';
    
    panel.innerHTML = `
      <div class="filter-header">
        <span>映像フィルター</span>
        <button class="minimize-btn" id="minimize-btn">−</button>
      </div>
      <div class="filter-content" id="filter-content">
        <div class="zoom-features">
          <div class="feature-toggle">
            <label class="toggle-label">
              <input type="checkbox" id="portrait-lighting" ${this.portraitLighting ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="feature-text">💡 ポートレート照明</span>
            </label>
          </div>
          <div class="feature-toggle">
            <label class="toggle-label">
              <input type="checkbox" id="low-light-adjust" ${this.lowLightAdjust ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="feature-text">☀️ 低照度に合わせて調整する</span>
            </label>
          </div>
          <div class="feature-toggle">
            <label class="toggle-label">
              <input type="checkbox" id="appearance-correction" ${this.appearanceCorrection ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="feature-text">😊 外見補正</span>
            </label>
          </div>
        </div>
        <div class="manual-controls">
          <div class="filter-control">
            <label>明るさ: <span id="brightness-value">${this.brightness}%</span></label>
            <input type="range" id="brightness-slider" min="20" max="250" value="${this.brightness}">
          </div>
          <div class="filter-control">
            <label>美肌補正: <span id="smoothing-value">${this.skinSmoothing}%</span></label>
            <input type="range" id="smoothing-slider" min="0" max="150" value="${this.skinSmoothing}">
          </div>
        </div>
        <div class="filter-actions">
          <button id="reset-btn">リセット</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // イベントリスナーを設定
    this.setupEventListeners();
  }

  setupEventListeners() {
    const brightnessSlider = document.getElementById('brightness-slider');
    const smoothingSlider = document.getElementById('smoothing-slider');
    const brightnessValue = document.getElementById('brightness-value');
    const smoothingValue = document.getElementById('smoothing-value');
    const resetBtn = document.getElementById('reset-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    
    // Zoom風機能のトグルボタン
    const portraitLightingToggle = document.getElementById('portrait-lighting');
    const lowLightAdjustToggle = document.getElementById('low-light-adjust');
    const appearanceCorrectionToggle = document.getElementById('appearance-correction');

    brightnessSlider.addEventListener('input', (e) => {
      this.brightness = parseInt(e.target.value);
      brightnessValue.textContent = `${this.brightness}%`;
      this.applyFilters();
      this.saveSettings();
    });

    smoothingSlider.addEventListener('input', (e) => {
      this.skinSmoothing = parseInt(e.target.value);
      smoothingValue.textContent = `${this.skinSmoothing}%`;
      this.applyFilters();
      this.saveSettings();
    });

    // トグル機能のイベントリスナー
    portraitLightingToggle.addEventListener('change', (e) => {
      this.portraitLighting = e.target.checked;
      this.applyFilters();
      this.saveSettings();
    });

    lowLightAdjustToggle.addEventListener('change', (e) => {
      this.lowLightAdjust = e.target.checked;
      this.applyFilters();
      this.saveSettings();
    });

    appearanceCorrectionToggle.addEventListener('change', (e) => {
      this.appearanceCorrection = e.target.checked;
      this.applyFilters();
      this.saveSettings();
    });

    resetBtn.addEventListener('click', () => {
      this.brightness = 100;
      this.skinSmoothing = 0;
      this.portraitLighting = false;
      this.lowLightAdjust = false;
      this.appearanceCorrection = false;
      
      brightnessSlider.value = 100;
      smoothingSlider.value = 0;
      portraitLightingToggle.checked = false;
      lowLightAdjustToggle.checked = false;
      appearanceCorrectionToggle.checked = false;
      
      brightnessValue.textContent = '100%';
      smoothingValue.textContent = '0%';
      this.applyFilters();
      this.saveSettings();
    });

    minimizeBtn.addEventListener('click', () => {
      this.togglePanel();
    });
  }

  togglePanel() {
    const panel = document.getElementById('meet-filter-panel');
    const content = document.getElementById('filter-content');
    const minimizeBtn = document.getElementById('minimize-btn');
    
    if (panel) {
      if (content.style.display === 'none') {
        content.style.display = 'block';
        minimizeBtn.textContent = '−';
        panel.classList.remove('minimized');
      } else {
        content.style.display = 'none';
        minimizeBtn.textContent = '+';
        panel.classList.add('minimized');
      }
    }
  }

  startVideoMonitoring() {
    // 映像要素を監視
    const observer = new MutationObserver(() => {
      this.findAndProcessVideo();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初期チェック
    this.findAndProcessVideo();
  }

  findAndProcessVideo() {
    // 映像要素を検索（プレビューと会議中の両方）
    const videoSelectors = [
      'video[autoplay]', // 会議中の映像
      'video[muted]',    // プレビュー映像
      'video'            // すべての映像要素
    ];

    for (const selector of videoSelectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video.srcObject && !video.dataset.filtered) {
          this.setupVideoProcessing(video);
          break;
        }
      }
    }
  }

  setupVideoProcessing(video) {
    this.originalVideoElement = video;
    video.dataset.filtered = 'true';

    // 処理用キャンバスを作成
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }

    // 初期フィルターを適用
    this.applyFilters();

    // 処理ループを開始
    this.startProcessingLoop();
  }

  applyFilters() {
    if (!this.originalVideoElement) return;
    
    // 基本フィルターの組み合わせ
    let filters = [];
    
    // 1. 基本明るさ
    let finalBrightness = this.brightness;
    
    // 2. ポートレート照明（顔を明るく照らす）
    if (this.portraitLighting) {
      finalBrightness += 15; // 顔を明るく
      filters.push('drop-shadow(0 0 10px rgba(255,255,255,0.3))'); // 柔らかな光
    }
    
    // 3. 低照度自動調整
    if (this.lowLightAdjust) {
      finalBrightness += 20; // 暗い環境での明るさ向上
      filters.push('contrast(110%)'); // コントラスト向上
      filters.push('saturate(105%)'); // 彩度微調整
    }
    
    // 4. 外見補正（美肌効果）
    if (this.appearanceCorrection) {
      this.applySkinSmoothing(); // 美肌処理を実行
      return; // 美肌処理でフィルターが適用される
    }
    
    // 5. 手動美肌補正
    if (this.skinSmoothing > 0) {
      this.applySkinSmoothing();
      return;
    }
    
    // 基本フィルターの適用
    filters.unshift(`brightness(${Math.min(200, finalBrightness)}%)`);
    this.originalVideoElement.style.filter = filters.join(' ');
  }

  startProcessingLoop() {
    if (this.isProcessing || !this.originalVideoElement) return;
    
    this.isProcessing = true;
    
    const processFrame = () => {
      if (!this.originalVideoElement || this.skinSmoothing === 0) {
        this.isProcessing = false;
        return;
      }

      try {
        this.applySkinSmoothing();
      } catch (error) {
        console.error('フレーム処理エラー:', error);
      }

      this.animationId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  applySkinSmoothing() {
    if (!this.originalVideoElement) return;
    
    // 外見補正が有効な場合は大幅な美肌効果を適用
    const effectiveSmoothing = this.appearanceCorrection ? 85 : this.skinSmoothing;
    
    if (effectiveSmoothing === 0) {
      // 美肌補正が0の場合は基本フィルターのみ適用
      let filters = [];
      let finalBrightness = this.brightness;
      
      if (this.portraitLighting) {
        finalBrightness += 15;
        filters.push('drop-shadow(0 0 10px rgba(255,255,255,0.3))');
      }
      
      if (this.lowLightAdjust) {
        finalBrightness += 20;
        filters.push('contrast(110%)');
        filters.push('saturate(105%)');
      }
      
      // 明るさの制限を大幅に緩和して劇的な変化を実現
      const dramaticBrightness = Math.max(10, Math.min(400, finalBrightness));
      filters.unshift(`brightness(${dramaticBrightness}%)`);
      this.originalVideoElement.style.filter = filters.join(' ');
      return;
    }

    const video = this.originalVideoElement;
    
    // 美白効果を重視したフィルター設定
    const skinSmoothingIntensity = effectiveSmoothing / 100;
    
    // 肌の赤みを抑えて白く美しく見せるフィルターの組み合わせ
    const baseBrightness = this.brightness; // ベースの明るさ
    
    // 外見補正時はさらに効果を強化
    const intensityMultiplier = this.appearanceCorrection ? 1.5 : 1.0;
    
    // 美肌補正の効果を劇的に強化（スライダーの変化をより分かりやすく）
    const skinBrightness = baseBrightness + (skinSmoothingIntensity * 80 * intensityMultiplier); // 肌の明るさを劇的向上
    const blurAmount = skinSmoothingIntensity * 2.5 * intensityMultiplier; // ボカシ効果を大幅強化
    const contrastReduction = 100 - (skinSmoothingIntensity * 50 * intensityMultiplier); // コントラスト削減を劇的に
    const saturationReduction = 100 - (skinSmoothingIntensity * 70 * intensityMultiplier); // 彩度削減を劇的に強化
    const redReduction = skinSmoothingIntensity * 35 * intensityMultiplier; // 赤み抑制を劇的に強化
    const blueBoost = skinSmoothingIntensity * 25 * intensityMultiplier; // 青み強化を劇的に
    
    // 赤み除去と美白効果を強化した複合フィルター
    const combinedFilter = [
      `brightness(${skinBrightness}%)`, // 肌を大幅明るく
      `blur(${blurAmount}px)`, // 赤みを目立たなくする
      `contrast(${contrastReduction}%)`, // 柔らかな質感
      `saturate(${saturationReduction}%)`, // 彩度を大幅下げて白肌に
      `sepia(-${redReduction}%)`, // 赤みを抑制
      `hue-rotate(${blueBoost}deg)`, // 青みで透明感をプラス
      `drop-shadow(0 0 5px rgba(255,255,255,${skinSmoothingIntensity * 0.2}))` // 柔らかな白い光
    ].join(' ');
    
    video.style.filter = combinedFilter;
    
    // 高度な美白処理（Canvas使用）
    // 闾値を下げて低い値でも効果が見えるように
    if (this.appearanceCorrection || skinSmoothingIntensity > 0.05) {
      this.applyAdvancedSkinWhitening(video);
    }
  }

  applyAdvancedSkinWhitening(video) {
    // Canvasで高度な美白処理
    if (!this.canvas || !this.ctx) return;
    
    this.canvas.width = video.videoWidth || video.clientWidth;
    this.canvas.height = video.videoHeight || video.clientHeight;
    
    if (this.canvas.width === 0 || this.canvas.height === 0) return;
    
    try {
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const processedData = this.applySkinWhiteningFilter(imageData, this.skinSmoothing);
      this.ctx.putImageData(processedData, 0, 0);
    } catch (error) {
      console.error('高度な美白処理エラー:', error);
    }
  }

  applySkinWhiteningFilter(imageData, intensity) {
    // 美白効果を重視した肌処理アルゴリズム
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const factor = intensity / 100;
    const newData = new Uint8ClampedArray(data);

    // 肌領域のみを美白処理
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // 肌色検出
        if (this.isAdvancedSkinTone(r, g, b)) {
          // 美白効果の適用（外見補正時はさらに強化）
          const baseWhiteningFactor = factor * 0.8;
          const whiteningFactor = this.appearanceCorrection ? 
            Math.min(1.0, baseWhiteningFactor * 1.3) : baseWhiteningFactor;
          
          // 肌を白く明るくする処理
          let newR = r;
          let newG = g;
          let newB = b;
          
          // 1. 明度を劇的向上（美白効果を大幅強化）
          const brightnessBoost = 1 + (whiteningFactor * 1.2); // 明るさを劇的に強化
          newR = Math.min(255, r * brightnessBoost);
          newG = Math.min(255, g * brightnessBoost);
          newB = Math.min(255, b * brightnessBoost);
          
          // 2. 赤みを劇的に抑制して白肌に
          const redReduction = 1 - (whiteningFactor * 0.6); // 赤み抑制を劇的に強化
          newR = Math.max(0, newR * redReduction);
          
          // 3. 緑も強く抑えて赤みを目立たなく
          const greenReduction = 1 - (whiteningFactor * 0.3); // 緑抑制を強化
          newG = Math.max(0, newG * greenReduction);
          
          // 4. 青みを劇的に増やして透明感と白さをプラス
          const blueBoost = 1 + (whiteningFactor * 0.4); // 青みを劇的に強化
          newB = Math.min(255, newB * blueBoost);
          
          // 4. 周囲のピクセルとのブレンドで平滑化（外見補正時はより幅広に）
          let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
          const smoothingRadius = this.appearanceCorrection ? 2 : 1; // 外見補正時はより幅広な範囲で平滑化
          
          for (let dy = -smoothingRadius; dy <= smoothingRadius; dy++) {
            for (let dx = -smoothingRadius; dx <= smoothingRadius; dx++) {
              if (y + dy >= 0 && y + dy < height && x + dx >= 0 && x + dx < width) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = this.appearanceCorrection ? 
                  Math.exp(-(distance * distance) / 4) : // ガウシアン重み
                  (dx === 0 && dy === 0) ? 4 : 1; // 通常の重み
                
                totalR += data[nIdx] * weight;
                totalG += data[nIdx + 1] * weight;
                totalB += data[nIdx + 2] * weight;
                totalWeight += weight;
              }
            }
          }
          
          const avgR = totalR / totalWeight;
          const avgG = totalG / totalWeight;
          const avgB = totalB / totalWeight;
          
          // 5. 美白処理した色と平滑化した色をブレンド（外見補正時はより強く）
          const smoothBlend = this.appearanceCorrection ? 0.5 : 0.3; // 外見補正時はより強い平滑化
          newR = newR * (1 - smoothBlend) + avgR * smoothBlend;
          newG = newG * (1 - smoothBlend) + avgG * smoothBlend;
          newB = newB * (1 - smoothBlend) + avgB * smoothBlend;
          
          // 6. 最終的な美白効果を適用（赤み除去を重視）
          const finalWhitening = 1 + (whiteningFactor * 0.3); // 美白効果を強化
          
          // 赤成分をさらに抑制し、青成分を強化
          const finalR = Math.min(255, newR * finalWhitening * 0.85); // 赤をさらに抑制
          const finalG = Math.min(255, newG * finalWhitening * 0.92); // 緑も軽く抑制
          const finalB = Math.min(255, newB * finalWhitening * 1.1);  // 青を強化
          
          newData[idx] = finalR;
          newData[idx + 1] = finalG;
          newData[idx + 2] = finalB;
          
        } else {
          // 肌以外の領域はそのまま保持
          newData[idx] = r;
          newData[idx + 1] = g;
          newData[idx + 2] = b;
        }
      }
    }

    return new ImageData(newData, width, height);
  }
  
  // 互換性のために旧関数も保持
  applySkinSmoothingFilter(imageData, intensity) {
    return this.applySkinWhiteningFilter(imageData, intensity);
  }

  isAdvancedSkinTone(r, g, b) {
    // 改善された肌色検出アルゴリズム
    // HSV色空間での肌色判定
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    // 彩度（Saturation）と明度（Value）を計算
    const saturation = max === 0 ? 0 : delta / max;
    const value = max / 255;
    
    // 色相（Hue）を計算
    let hue = 0;
    if (delta !== 0) {
      if (max === r) {
        hue = ((g - b) / delta) % 6;
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    
    // 肌色の範囲を判定（より精密に）
    const isSkinHue = (hue >= 0 && hue <= 50) || (hue >= 300 && hue <= 360); // オレンジ～赤系
    const isSkinSaturation = saturation >= 0.1 && saturation <= 0.7; // 適度な彩度
    const isSkinValue = value >= 0.2 && value <= 0.9; // 適度な明度
    
    // RGBでの追加チェック
    const rgbSkinCheck = r > 60 && g > 40 && b > 20 && 
                        r > g && r > b && 
                        (r - g) >= 10 && (r - b) >= 15;
    
    return (isSkinHue && isSkinSaturation && isSkinValue) || rgbSkinCheck;
  }
  
  isSkinTone(r, g, b) {
    // シンプルな肌色検出（互換性のため保持）
    return r > 95 && g > 40 && b > 20 && 
           r > g && r > b && 
           Math.abs(r - g) > 15;
  }
}

// Initialize the filter when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MeetVideoFilter();
  });
} else {
  new MeetVideoFilter();
}
