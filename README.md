# Google Meet Brightness & Skin Filter Chrome Extension

A Chrome extension that adds brightness and skin smoothing filters to Google Meet video calls.

## Features

- **Brightness Control**: Adjust video brightness from 50% to 150%
- **Skin Smoothing**: Apply skin smoothing filter from 0% to 100%
- **Persistent Settings**: Settings are saved and restored automatically
- **Works on Both Screens**: Functions on preview screen and during meetings
- **Lightweight UI**: Minimizable panel in the top-right corner
- **Performance Optimized**: Uses requestAnimationFrame for smooth video processing

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this extension folder
4. Navigate to [Google Meet](https://meet.google.com)
5. The filter panel will appear in the top-right corner

## Usage

### Controls
- **Brightness Slider**: Adjusts the brightness of your video feed
- **Skin Smoothing Slider**: Applies a smoothing effect to skin tones
- **Reset Button**: Resets both sliders to default values
- **Minimize Button**: Collapses/expands the control panel

### Settings Persistence
Your slider settings are automatically saved and will be restored when you:
- Reload the page
- Join a new meeting
- Return to Google Meet

## Technical Details

### Files Structure
```
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker for settings storage
├── content_script.js      # Main logic for video processing
├── styles.css            # UI styling
└── README.md             # This file
```

### Key Features Implementation
- **Manifest V3**: Uses modern Chrome extension architecture
- **Content Script Injection**: Only runs on meet.google.com domain
- **Video Processing**: Uses Canvas API for skin smoothing with requestAnimationFrame
- **CSS Filters**: Applies brightness adjustments via CSS filter property
- **Storage API**: Persists settings using Chrome's storage.local API

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Works with Google Meet's current video architecture

## Privacy & Permissions

This extension only requests minimal permissions:
- `storage`: To save your filter preferences
- `activeTab`: To interact with Google Meet tabs
- `host_permissions`: Limited to meet.google.com only

**No data is collected or transmitted** - all processing happens locally in your browser.

## Troubleshooting

### Panel Not Appearing
- Ensure you're on meet.google.com
- Check that the extension is enabled in chrome://extensions/
- Refresh the page

### Filters Not Working
- Make sure your camera is enabled in Google Meet
- Try adjusting the sliders - effects may be subtle at low values
- Check browser console for any error messages

### Performance Issues
- Lower the skin smoothing value if experiencing lag
- Close other resource-intensive browser tabs
- The extension automatically optimizes using requestAnimationFrame

## Development

To modify or extend this extension:

1. Make changes to the source files
2. Go to chrome://extensions/
3. Click the refresh icon on this extension
4. Reload any Google Meet tabs

### Adding New Filters
New video filters can be added by:
1. Adding UI controls in `content_script.js` `createUI()` method
2. Implementing filter logic in `applySkinSmoothingFilter()` or similar methods
3. Adding corresponding CSS in `styles.css`

## License

This project is open source. Feel free to modify and distribute according to your needs.
