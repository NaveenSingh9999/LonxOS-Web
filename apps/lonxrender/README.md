# 🌐 LonxRender - Native Browser Engine for LonxOS

LonxRender is a fully-featured, native browser engine built specifically for LonxOS. Unlike traditional web browsers that rely on iframes or external rendering engines, LonxRender implements its own custom rendering system with advanced web technologies support.

## ✨ Key Features

### 🚀 **True Native Rendering**
- Custom HTML/CSS parser and renderer
- No iframe limitations or restrictions
- Direct DOM manipulation and processing
- Hardware-accelerated rendering pipeline

### 🎮 **Advanced Web Technologies**
- **WebGL Support**: Full 3D graphics rendering with shaders
- **JavaScript Execution**: Sandboxed JS environment with Web Workers
- **CSS3 Support**: Modern styling with animations and transforms
- **Canvas Rendering**: 2D and 3D graphics capabilities

### 🛡️ **Security & Sandboxing**
- Isolated JavaScript execution environment
- CORS proxy fallback for restricted sites
- Safe DOM manipulation with XSS protection
- Secure download handling to `/home/user/Downloads/`

### 🎯 **Modern Browser Features**
- **Multi-tab Support**: True tabbed browsing experience
- **Bookmarks System**: Persistent bookmark storage
- **History Management**: Automatic browsing history
- **Developer Console**: Real-time debugging and inspection
- **Navigation Controls**: Back, forward, reload, home

### 🎨 **Beautiful Interface**
- Modern dark theme with gradient accents
- Smooth animations and transitions
- Responsive design for different screen sizes
- Intuitive controls and shortcuts

## 📂 File Structure

```
/apps/lonxrender/
├── index.html               # Main browser interface
├── engine.js                # Tab manager and UI logic
├── render.js                # Custom rendering engine
├── sandbox.worker.js        # Secure JavaScript execution
├── console.js               # Developer console system
├── webgl-test.html          # WebGL capabilities test
├── styles.css               # Modern UI styling
├── icon.svg                 # Application icon
├── browser.js               # Shell command integration
└── README.md                # This documentation
```

## 🚀 Getting Started

### Launch from LonxOS Shell
```bash
browser                          # Open with default homepage
browser https://github.com      # Open specific URL
browser ./webgl-test.html       # Open local file
```

### Launch from GUI
1. Open LonxOS application menu
2. Click on LonxRender browser icon
3. Browser opens in floating window

### Quick Actions
- **New Tab**: Click `+` button or `Ctrl+T`
- **Navigate**: Enter URL in address bar or search
- **Bookmarks**: Click bookmark icon or `Ctrl+D`
- **Console**: Click console icon or `F12`
- **Settings**: Click settings gear icon

## 🎮 WebGL Testing

LonxRender includes a comprehensive WebGL test suite:

1. Navigate to `webgl-test.html`
2. Click "Start Demo" to begin 3D rendering
3. Use controls to manipulate the 3D scene:
   - **Toggle Rotation**: Start/stop cube rotation
   - **Change Colors**: Randomize cube face colors
   - **Toggle Wireframe**: Switch to wireframe rendering
   - **Click Canvas**: Adjust rotation speed

### WebGL Features Tested
- Hardware-accelerated 3D rendering
- Custom vertex and fragment shaders
- Real-time transformations and matrices
- Dynamic color manipulation
- Interactive mouse controls
- Performance monitoring

## ⚙️ Configuration

### Settings Panel
Access via settings button to configure:
- **JavaScript**: Enable/disable JS execution
- **WebGL**: Enable/disable 3D rendering
- **Console**: Show/hide developer tools
- **Homepage**: Set default start page

### Data Storage Paths
```
/home/user/.lonbrowse/
├── bookmarks.json           # User bookmarks
├── history.json             # Browsing history
└── sessions.json            # Tab sessions
```

### LonxOS Settings Integration
```json
/dec/settings/settings.json
{
  "lonxrender": {
    "homepage": "https://lonx.dev",
    "javascript": true,
    "tabs": true,
    "webgl": true,
    "console": true
  }
}
```

## 🔧 Technical Architecture

### Rendering Engine (`render.js`)
- Custom DOM parser using DOMParser API
- CORS proxy integration for external sites
- Resource resolution and URL handling
- Content sanitization and security filtering

### Tab Management (`engine.js`)
- Multi-tab state management
- Navigation history per tab
- Window focus and switching logic
- UI state synchronization

### Sandbox Execution (`sandbox.worker.js`)
- Isolated Web Worker environment
- Safe JavaScript execution context
- Blocked dangerous API access
- Performance and security monitoring

### Console System (`console.js`)
- Real-time command execution
- JavaScript debugging interface
- System command integration
- History and autocomplete

## 🌐 Supported Content Types

### Web Pages
- **HTML5**: Full modern HTML support
- **CSS3**: Advanced styling and animations
- **JavaScript**: ES6+ with sandboxing
- **Images**: PNG, JPEG, GIF, SVG, WebP
- **Fonts**: Web fonts and icon fonts

### Special Content
- **JSON**: Formatted JSON viewer
- **Plain Text**: Syntax-highlighted text
- **Local Files**: Direct file system access
- **Data URLs**: Inline content support

### External Resources
- **CORS-enabled sites**: Direct loading
- **Restricted sites**: Proxy fallback
- **CDN resources**: CSS, JS, fonts
- **API endpoints**: RESTful services

## 🎯 Performance Features

### Optimization
- Hardware-accelerated CSS animations
- Efficient DOM manipulation
- Lazy loading for large content
- Memory management for tabs

### Monitoring
- Real-time performance metrics
- WebGL frame rate monitoring
- Memory usage tracking
- Network request analysis

## 🔒 Security Features

### JavaScript Sandboxing
- Isolated execution environment
- No access to LonxOS internals
- Blocked dangerous functions
- Safe API subset exposure

### Content Security
- XSS protection mechanisms
- Safe DOM manipulation
- Secure resource loading
- Download path restrictions

### Network Security
- CORS compliance checking
- Proxy fallback for safety
- SSL/TLS validation
- Safe redirect handling

## 🎨 Customization

### Themes
- Dark mode (default)
- Customizable color schemes
- CSS variable system
- Responsive layouts

### UI Elements
- Configurable toolbar
- Customizable shortcuts
- Adjustable panel sizes
- Flexible window layouts

## 🚀 Future Enhancements

### Planned Features
- [ ] Full-screen browsing mode
- [ ] Incognito/private browsing
- [ ] Element inspector tool
- [ ] Browser extension system (.rnx plugins)
- [ ] Advanced download manager
- [ ] Password manager integration
- [ ] Mobile viewport simulation
- [ ] Screen capture tools

### Performance Improvements
- [ ] Service Worker support
- [ ] Progressive Web App features
- [ ] Advanced caching system
- [ ] WebAssembly support
- [ ] HTTP/2 and HTTP/3 support

## 🐛 Troubleshooting

### Common Issues

**Page Won't Load**
- Check network connection
- Try reloading the page
- Check console for errors
- Verify URL is correct

**JavaScript Not Working**
- Enable JavaScript in settings
- Check console for errors
- Verify sandbox worker is loaded
- Try refreshing the page

**WebGL Issues**
- Check browser WebGL support
- Update graphics drivers
- Enable hardware acceleration
- Test with webgl-test.html

**Performance Problems**
- Close unused tabs
- Clear browsing history
- Disable heavy animations
- Restart browser engine

### Debug Mode
Access developer console (F12) for:
- Error logging and debugging
- Performance monitoring
- Network request analysis
- JavaScript execution testing

## 📄 License

LonxRender is part of the LonxOS project and follows the same licensing terms.

## 🤝 Contributing

Contributions to LonxRender are welcome! Please follow the LonxOS contribution guidelines.

## 📞 Support

For support and bug reports, please use the LonxOS issue tracker or community forums.

---

**LonxRender** - The next-generation browser engine for LonxOS, bringing the full power of the modern web to your operating system with uncompromising security and performance.
