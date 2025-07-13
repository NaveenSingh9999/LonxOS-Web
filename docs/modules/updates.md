# Lonx OS Update System

The Lonx OS Update System provides automatic package management and updates for system modules. It checks configured update channels for newer versions and can automatically install them.

## Features

- **Automatic Update Checking**: Checks for updates on boot and periodically
- **Multiple Update Channels**: Support for multiple package repositories
- **Version Management**: Tracks installed package versions and dependencies
- **Auto-Update Support**: Optional automatic installation of updates
- **Manual Control**: Full manual control over update process
- **Background Service**: Runs continuously to check for updates

## Commands

### lonx-update

Main update management command:

```bash
# Check for available updates
lonx-update check

# Install all available updates
lonx-update install

# Install specific package update
lonx-update install wget

# Show configuration
lonx-update config

# Enable auto-updates
lonx-update config autoUpdate=true

# Manage update channels
lonx-update channels add https://example.com/repo/index.json
lonx-update channels remove https://old-repo.com/index.json

# List installed packages
lonx-update list

# Show system status
lonx-update status
```

### update-service

Control the background update service:

```bash
# Check service status
update-service status

# Start/stop service
update-service start
update-service stop
update-service restart
```

### setup-updates

Initial setup command:

```bash
# Configure update system for first use
setup-updates
```

## Configuration

The update system is configured via `/etc/lonx/update.conf`:

```json
{
  "enabled": true,
  "checkOnBoot": true,
  "autoUpdate": false,
  "checkInterval": 24,
  "updateChannels": [
    "https://naveensingh9999.github.io/standard-module-lib-lonxos/index.json"
  ],
  "lastCheck": "2025-07-13T00:00:00Z"
}
```

### Configuration Options

- `enabled`: Enable/disable the update system
- `checkOnBoot`: Check for updates during system boot
- `autoUpdate`: Automatically install updates (manual approval by default)
- `checkInterval`: Hours between update checks
- `updateChannels`: Array of repository URLs to check
- `lastCheck`: Timestamp of last update check

## Update Channels

Update channels are JSON repositories that list available packages:

```json
[
  {
    "name": "wget",
    "desc": "Advanced web downloader",
    "version": "2.0.0",
    "url": "packages/wget.js",
    "checksum": "sha256:wget-v2.0.0",
    "lastUpdated": "2025-07-13T00:00:00Z"
  }
]
```

### Adding Custom Channels

You can add your own update channels:

```bash
lonx-update channels add https://myrepo.com/lonx-packages/index.json
```

## How It Works

1. **Boot Check**: On system boot, if `checkOnBoot` is enabled and enough time has passed since the last check, the system automatically checks for updates.

2. **Background Service**: A background service runs continuously and periodically checks for updates based on the configured interval.

3. **Version Comparison**: The system compares semantic versions (e.g., 1.0.0 vs 1.1.0) to determine if updates are available.

4. **Download and Install**: Updates are downloaded from the configured channels and installed to `/bin/` directory.

5. **Registry Tracking**: Installed packages are tracked in `/var/lib/lonx/installed.json` with version information.

## Security

- Only HTTPS update channels are recommended
- Package checksums are verified when available
- Manual approval required by default (auto-update can be enabled)
- Update channels can be managed by users

## Troubleshooting

### Updates Not Checking

```bash
# Check if update system is enabled
lonx-update status

# Manually check for updates
lonx-update check

# Check service status
update-service status
```

### Update Failures

```bash
# Check network connectivity
ping github.com

# Verify update channels
lonx-update channels

# Check system logs in browser console
```

### Reset Update System

```bash
# Re-run setup
setup-updates

# Or manually reconfigure
lonx-update config enabled=true
lonx-update config checkOnBoot=true
```

## Examples

### Daily Auto-Updates

```bash
# Enable automatic updates
lonx-update config autoUpdate=true
lonx-update config checkInterval=24

# Verify configuration
lonx-update status
```

### Manual Updates Only

```bash
# Disable boot checks but keep manual updates
lonx-update config checkOnBoot=false
lonx-update config autoUpdate=false

# Check manually when needed
lonx-update check
lonx-update install
```

### Custom Repository

```bash
# Add your own package repository
lonx-update channels add https://mycompany.com/lonx-packages/index.json

# Check for updates from all channels
lonx-update check
```

## Integration with CI/CD

The update system can automatically pick up packages deployed to your repositories without requiring manual Vercel deployments, solving the original workflow issue.

<!-- yo -->
