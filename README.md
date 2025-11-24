# SAP Development Toolkit for VS Code

A comprehensive VS Code extension for SAP UI5/Fiori development with **on-premise SAP system connectivity** (like Eclipse ADT).

## 🌟 Key Features

### 🔌 SAP On-Premise Connection
- **Auto-import SAP GUI connections** from Windows SAP Logon
- **Connect to SAP systems** via HTTP/HTTPS or SAP Router
- **SAP Router support** - automatically detected from SAP GUI
- **Multiple connection methods**:
  - Direct connection (when on VPN)
  - SAP Router protocol (experimental)
  - Open in SAP GUI (recommended for router systems)
- **Secure credential storage**
- **Multiple connection management**

### 📦 BSP Application Management
- **Browse BSP applications** from your SAP system
- **Download** Fiori/UI5 apps to local workspace
- **Upload** changes back to SAP system
- **Real-time sync** with SAP backend
- **Works with SAP Router** connections

### 🚀 Project Generator
- Create new SAPUI5/Fiori projects from templates
- Pre-configured project structures
- Multiple project templates

### 🛠️ Component Management
- Browse and manage SAP UI5 components
- Version tracking
- Installation simulation

## Quick Start

### 1. Connect to SAP System

```
Ctrl+Shift+P → "SAP: Connect to System"
```

Fill in your SAP connection details:
- Host: `sap.company.com`
- Port: `443` (HTTPS) or `8000` (HTTP)
- Client: `100`
- System ID: `PRD`
- Username & Password

### 2. View BSP Applications

- Click **SAP Toolkit** icon in Activity Bar
- Navigate to **BSP Applications** view
- See all your BSP/Fiori applications

### 3. Download & Edit

- Right-click any BSP application
- Select **Download BSP Application**
- Edit locally in VS Code
- Upload changes back when ready

## Installation

### Test Locally (Development)
```bash
# Clone and setup
cd vscode-connection-plugin
npm install
npm run compile

# Press F5 to launch Extension Development Host
```

### Package and Install
```bash
npm install -g @vscode/vsce
vsce package
code --install-extension sap-development-toolkit-1.0.0.vsix
```

## Features in Detail

### SAP System Connection
- ✅ HTTP/HTTPS support
- ✅ Basic authentication
- ✅ Connection testing
- ✅ Multiple connection profiles
- ✅ Secure credential storage

### BSP Application Operations
- ✅ List all BSP applications
- ✅ Download to local workspace
- ✅ Upload changes to SAP
- ✅ View application metadata
- ⏳ Real-time file watching (coming soon)
- ⏳ Transport request integration (coming soon)

### Project Templates
- **Basic SAPUI5 Web Application**
- **SAP Fiori Master-Detail Application**
- **Custom UI5 Control Library**

## Available Commands

| Command | Description |
|---------|-------------|
| `SAP: Connect to System` | Open connection dialog |
| `SAP: Select Connection` | Switch between saved connections |
| `SAP: Create New Project` | Generate new SAPUI5 project |
| `Download BSP Application` | Download from SAP system |
| `Upload BSP Application` | Upload changes to SAP |
| `Refresh` | Refresh BSP applications list |

## Extension Views

### 1. SAP Components
Browse and install SAP UI5 components with version information

### 2. BSP Applications
Tree view showing all BSP/Fiori applications from connected SAP system

## Requirements

- **VS Code** 1.74.0 or higher
- **Node.js** 14.x or higher
- **SAP System** with UI5 Repository service enabled
- **SAP Authorization**: S_DEVELOP, S_ICF, S_SERVICE

## Configuration

Settings available in `File > Preferences > Settings`:

- `sapToolkit.showVersions` - Display component versions
- `sapToolkit.autoRefresh` - Auto-refresh component list
- `sapToolkit.ui5Version` - Default SAPUI5 version (1.108.0)

## Documentation

- 📘 [SAP Connection Guide](SAP_CONNECTION_GUIDE.md) - Detailed connection setup
- 🚀 [Quick Start Guide](QUICKSTART.md) - Get started quickly

## Architecture

```
vscode-connection-plugin/
├── src/
│   ├── managers/
│   │   └── SapConnectionManager.ts     # SAP system connectivity
│   ├── providers/
│   │   ├── SapToolkitProvider.ts       # Component tree
│   │   └── BspApplicationProvider.ts   # BSP app tree
│   ├── ui/
│   │   └── ConnectionUIProvider.ts     # Connection dialog
│   ├── generators/
│   │   └── ProjectGenerator.ts         # Project scaffolding
│   └── extension.ts                    # Main extension
```

## Workflow Example

```bash
# 1. Connect to SAP
Open Command Palette → "SAP: Connect to System"

# 2. Browse apps
Click SAP Toolkit → BSP Applications

# 3. Download
Right-click app → Download BSP Application

# 4. Edit locally
Make your changes in VS Code

# 5. Upload
Right-click app → Upload BSP Application

# 6. Test in SAP
Open in browser using SAP URL
```

## SAP Router Systems

For systems that require SAP Router (remote access without VPN):

### Option 1: Use SAP GUI Integration (Recommended)
When connecting to a router-based system, the extension will offer to open SAP GUI:
- Extension reads connection details from SAP Logon
- Launches SAP GUI with proper router configuration
- SAP GUI handles all router authentication

### Option 2: Connect via VPN
- Connect to your company VPN first
- Choose "Direct Connection (VPN)" when prompted
- Extension connects directly, bypassing router

### Option 3: Router Protocol (Experimental)
- Requires SAP Router permissions from Basis team
- May need additional configuration
- Contact SAP Basis to add route permissions for your machine

**Note**: BSP application browsing currently works best with:
- Direct connections (VPN)
- Or open the system in SAP GUI first, then the extension can access it

## Troubleshooting

### Connection Issues
- Verify host and port
- Check VPN/network access
- Confirm SAP system is running
- Try toggling HTTPS on/off

### Authorization Issues
- Contact SAP Basis team
- Verify S_DEVELOP authorization
- Check UI5 Repository access

See [SAP Connection Guide](SAP_CONNECTION_GUIDE.md) for more troubleshooting.

## Roadmap

- [x] SAP system connection
- [x] BSP application download/upload
- [x] Multiple connection management
- [x] Project templates
- [ ] Real-time file synchronization
- [ ] Transport request integration
- [ ] Advanced debugging
- [ ] OData service integration
- [ ] Code snippets for SAPUI5

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License

## Support

For issues and feature requests:
- GitHub Issues: [Create Issue](https://github.com/bodyalrayes151999/vscode-connection-plugin/issues)
- Documentation: See [SAP_CONNECTION_GUIDE.md](SAP_CONNECTION_GUIDE.md)

---

**Enjoy SAP development in VS Code!** 🚀
