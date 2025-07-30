// Google Meet 明るさ・美肌フィルター拡張機能のコンテンツスクリプト
class MeetVideoFilter {
  constructor() {
    this.brightness = 100;
    this.skinSmoothing = 0;
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
            skinSmoothing: this.skinSmoothing
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
        <div class="filter-control">
          <label>明るさ: <span id="brightness-value">${this.brightness}%</span></label>
          <input type="range" id="brightness-slider" min="50" max="150" value="${this.brightness}">
        </div>
        <div class="filter-control">
          <label>美肌補正: <span id="smoothing-value">${this.skinSmoothing}%</span></label>
          <input type="range" id="smoothing-slider" min="0" max="100" value="${this.skinSmoothing}">
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

    resetBtn.addEventListener('click', () => {
      this.brightness = 100;
      this.skinSmoothing = 0;
      brightnessSlider.value = 100;
      smoothingSlider.value = 0;
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
    if (this.originalVideoElement) {
      // Apply brightness filter via CSS
      const brightnessFilter = `brightness(${this.brightness}%)`;
      this.originalVideoElement.style.filter = brightnessFilter;

      // Skin smoothing will be applied in the processing loop
      if (this.skinSmoothing > 0 && !this.isProcessing) {
        this.startProcessingLoop();
      }
    }
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
    if (!this.originalVideoElement || this.skinSmoothing === 0) {
      // 美肌補正が0の場合は明るさのみ適用
      this.originalVideoElement.style.filter = `brightness(${this.brightness}%)`;
      return;
    }

    const video = this.originalVideoElement;
    
    // 美白効果を重視したフィルター設定
    const skinSmoothingIntensity = this.skinSmoothing / 100;
    
    // 肌を白く明るく見せるフィルターの組み合わせ
    const baseBrightness = this.brightness; // ベースの明るさ
    const skinBrightness = baseBrightness + (skinSmoothingIntensity * 25); // 肌の明るさを大幅向上
    const blurAmount = skinSmoothingIntensity * 0.8; // やや強めのぼかし
    const contrastReduction = 100 - (skinSmoothingIntensity * 15); // コントラストを下げて柔らかに
    const saturationReduction = 100 - (skinSmoothingIntensity * 20); // 彩度を下げて白っぽく
    const exposure = 100 + (skinSmoothingIntensity * 30); // 露出を上げて明るく
    
    // 美白効果を強化した複合フィルター
    const combinedFilter = [
      `brightness(${skinBrightness}%)`, // 肌を明るく
      `blur(${blurAmount}px)`, // 肌の粗を目立たなく
      `contrast(${contrastReduction}%)`, // 柔らかな質感
      `saturate(${saturationReduction}%)`, // 白っぽい肌色
      `sepia(${skinSmoothingIntensity * 5}%)`, // 軽いセピアで温かみ
      `hue-rotate(${skinSmoothingIntensity * 2}deg)` // 軽い色相調整
    ].join(' ');
    
    video.style.filter = combinedFilter;
    
    // 高度な美白処理（Canvas使用）
    if (skinSmoothingIntensity > 0.2) {
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
          // 美白効果の適用
          const whiteningFactor = factor * 0.8;
          
          // 肌を白く明るくする処理
          let newR = r;
          let newG = g;
          let newB = b;
          
          // 1. 明度を大幅向上（美白効果）
          const brightnessBoost = 1 + (whiteningFactor * 0.4);
          newR = Math.min(255, r * brightnessBoost);
          newG = Math.min(255, g * brightnessBoost);
          newB = Math.min(255, b * brightnessBoost);
          
          // 2. 赤みを抑えて白っぽく
          const redReduction = 1 - (whiteningFactor * 0.15);
          newR = newR * redReduction;
          
          // 3. 青みを少し増やして透明感
          const blueBoost = 1 + (whiteningFactor * 0.1);
          newB = Math.min(255, newB * blueBoost);
          
          // 4. 周囲のピクセルとのブレンドで平滑化
          let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const weight = (dx === 0 && dy === 0) ? 4 : 1; // 中心を重視
              
              totalR += data[nIdx] * weight;
              totalG += data[nIdx + 1] * weight;
              totalB += data[nIdx + 2] * weight;
              totalWeight += weight;
            }
          }
          
          const avgR = totalR / totalWeight;
          const avgG = totalG / totalWeight;
          const avgB = totalB / totalWeight;
          
          // 5. 美白処理した色と平滑化した色をブレンド
          const smoothBlend = 0.3;
          newR = newR * (1 - smoothBlend) + avgR * smoothBlend;
          newG = newG * (1 - smoothBlend) + avgG * smoothBlend;
          newB = newB * (1 - smoothBlend) + avgB * smoothBlend;
          
          // 6. 最終的な美白効果を適用
          const finalWhitening = 1 + (whiteningFactor * 0.2);
          newData[idx] = Math.min(255, newR * finalWhitening);
          newData[idx + 1] = Math.min(255, newG * finalWhitening);
          newData[idx + 2] = Math.min(255, newB * finalWhitening);
          
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
