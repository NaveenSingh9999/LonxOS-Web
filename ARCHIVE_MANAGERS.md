# LonxOS Archive Management Suite

## Overview
Built comprehensive ZIP and TAR archive management tools for LonxOS with modern GUI interfaces and full CLI compatibility. These tools provide professional-grade archive functionality with intuitive nano-like interfaces.

## 📦 **ZIP Archive Manager** (`zip.js`)

### Features
- **Dual Interface**: Full GUI mode + complete CLI support
- **Visual File Browser**: Nano-inspired interface with syntax highlighting
- **Compression Control**: 6 compression levels (0-9) with real-time stats
- **Batch Operations**: Mark multiple files for group operations
- **Smart Caching**: In-memory archive indexing for fast operations
- **Progress Tracking**: Visual progress bars for long operations

### GUI Interface
```bash
┌─ 📦 LonxOS ZIP Manager ─────────────────────────────────┐
│ [Open] [Create] [Extract] [Add] [Settings] [Help] [Exit] │
├─────────────────┬───────────────────────────────────────┤
│ Archive Info    │ Name          Size    Compressed Ratio │
│ ├ myfiles.zip   │ ├📄 doc.txt   1.2KB   512B      58%   │
│ ├ 15 files      │ ├📁 images/   --      --        --    │
│ ├ 2.5MB total   │ ├🖼️ logo.png  256KB   198KB     23%   │
│ └ 1.8MB comp.   │ └📜 code.js   4.1KB   2.8KB     32%   │
├─────────────────┴───────────────────────────────────────┤
│ Status: Ready                    ↑↓:Nav Enter:Extract   │
└─────────────────────────────────────────────────────────┘
```

### CLI Commands
```bash
zip                           # Launch GUI
zip list archive.zip          # List contents
zip extract docs.zip /tmp/    # Extract to directory  
zip create backup.zip *.txt   # Create from files
zip add project.zip new.js    # Add file to archive
```

### Keyboard Shortcuts
- `↑↓` - Navigate files
- `Enter` - Extract/view file
- `Space` - Mark for batch operations
- `Ctrl+O` - Open archive
- `Ctrl+N` - Create new archive
- `Ctrl+E` - Extract all
- `Ctrl+Q` - Quit

## 📦 **TAR Archive Manager** (`tar.js`)

### Features
- **Advanced TAR Support**: .tar, .tar.gz, .tar.bz2, .tar.xz, .tar.lzma
- **Permission Preservation**: Unix permissions, ownership, timestamps
- **Symbolic Link Support**: Proper handling of symlinks and hardlinks
- **Multiple View Modes**: List, details, tree view
- **Compression Algorithms**: Gzip, Bzip2, XZ, LZMA support
- **Professional Interface**: Detailed file information display

### GUI Interface
```bash
┌─ 📦 LonxOS TAR Manager ─────────────────────────────────┐
│ [Open] [Create] [Extract] [Add] [Compress] [Help] [Exit] │
├─────────────────┬───────────────────────────────────────┤
│ Archive Info    │ Name         Size   Perms    Owner    │
│ ├ backup.tar.gz │ ├📄 readme    2KB   -rw-r--r-- user   │
│ ├ TAR+Gzip      │ ├📁 src/      --    drwxr-xr-x user   │
│ ├ 8 entries     │ ├⚡ script    1KB   -rwxr-xr-x user   │
│ └ 2.1MB comp.   │ └🔗 link      --    lrwxrwxrwx user   │
├─────────────────┴───────────────────────────────────────┤
│ Status: Ready               ↑↓:Nav Enter:Extract Space:Mark │
└─────────────────────────────────────────────────────────┘
```

### CLI Commands
```bash
tar                           # Launch GUI
tar list backup.tar.gz        # List contents with permissions
tar extract src.tar.bz2 /tmp/ # Extract preserving permissions
tar create docs.tar *.md      # Create from files
tar compress backup.tar gzip  # Compress existing TAR
tar decompress file.tar.gz    # Decompress to TAR
```

### Compression Support
- **None** - Uncompressed TAR (.tar)
- **Gzip** - Fast compression (.tar.gz, .tgz)
- **Bzip2** - Better compression (.tar.bz2, .tbz2)
- **XZ** - Best compression (.tar.xz, .txz)
- **LZMA** - Legacy compression (.tar.lzma)

## 🎨 **Design Philosophy**

### Modern CLI GUI
- **Nano-inspired**: Familiar keyboard shortcuts and layout
- **Real-time feedback**: Instant status updates and progress bars
- **Context-sensitive help**: F1 for help, tooltips, and hints
- **Professional styling**: Dark theme with orange/green accents

### Technical Architecture
- **Modular design**: Separate GUI and CLI logic
- **Memory efficient**: Smart caching and progressive loading
- **Error resilient**: Comprehensive error handling and validation
- **Cross-compatible**: Works with standard archive formats

## 📁 **File Structure Integration**

### Repository Updates
```json
{
  "name": "zip",
  "desc": "Advanced GUI ZIP archive manager with CLI support", 
  "version": "1.0.0",
  "url": "packages/zip.js"
},
{
  "name": "tar", 
  "desc": "Professional TAR/TAR.GZ archive manager with compression support",
  "version": "1.0.0",
  "url": "packages/tar.js"
}
```

### Manual Pages
- Added comprehensive `man zip` documentation
- Added detailed `man tar` documentation  
- Included keyboard shortcuts, examples, and feature lists

## 🚀 **Usage Examples**

### Creating Archives
```bash
# ZIP: Create project backup
zip create project-backup.zip src/ docs/ *.md

# TAR: Create compressed source archive  
tar create source-code.tar.gz src/ --compression=gzip

# GUI: Launch visual archive manager
zip    # Opens ZIP manager
tar    # Opens TAR manager
```

### Extracting Archives
```bash
# ZIP: Extract to specific directory
zip extract backup.zip /home/user/restored/

# TAR: Extract preserving permissions
tar extract backup.tar.bz2 /tmp/restore/

# GUI: Visual extraction with file selection
# Use Space to mark files, Enter to extract selected
```

### Archive Management
```bash
# View contents
zip list project.zip
tar list backup.tar.gz

# Add files to existing archives
zip add project.zip newfile.txt
tar add backup.tar additional-files/

# Compress/decompress
tar compress backup.tar gzip
tar decompress backup.tar.gz
```

## 🎯 **Key Benefits**

1. **Professional Tools**: Enterprise-grade archive management
2. **Dual Interfaces**: GUI for exploration, CLI for automation
3. **Modern UX**: Intuitive interfaces with real-time feedback
4. **Full Compatibility**: Standard ZIP/TAR format support
5. **Advanced Features**: Compression options, permissions, batch operations
6. **Integrated Help**: Built-in documentation and shortcuts

## 📊 **Technical Specifications**

### ZIP Manager
- **Supported formats**: ZIP, JAR, APK
- **Compression levels**: 0 (store) to 9 (maximum)
- **Max file size**: Limited by browser memory
- **Features**: File marking, progress tracking, compression stats

### TAR Manager  
- **Supported formats**: TAR + Gzip/Bzip2/XZ/LZMA
- **Permission handling**: Full Unix permission preservation
- **Special files**: Symbolic links, directories, executables
- **Features**: Multi-view modes, ownership display, compression control

Both tools are now available in the LonxOS package repository and ready for installation via `mim install zip` or `mim install tar`! 🎉
