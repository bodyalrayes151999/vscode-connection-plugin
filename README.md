# SAP Development Toolkit for VS Code

A comprehensive VS Code extension for SAP UI5/Fiori development, similar to Eclipse SAP Development Tools.

## Features

- **Component Management**: Browse and manage SAP UI5 components
- **Project Generator**: Create new SAPUI5/Fiori projects from templates
- **Component Installation**: Install SAP components with progress tracking
- **Component Details**: View detailed information about each component
- **Status Bar Integration**: Quick access to toolkit features

## Installation

### Test Locally (Development)
1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. The extension will activate in the new window

### Package and Install
```bash
# Install VSCE (if needed)
npm install -g vsce

# Package the extension
vsce package

# Install the .vsix file
code --install-extension sap-development-toolkit-1.0.0.vsix
```

## Usage

### View SAP Components
1. Click the **SAP Toolkit** icon in the Activity Bar
2. Browse available SAP UI5 components
3. View version information and installation status

### Install Components
1. Right-click on any component
2. Select **Install Component**
3. Watch the installation progress

### Create New Project
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type **SAP: Create New Project**
3. Select a template and enter project details

## Configuration

- **Show Versions**: Display component versions in tree view
- **Auto Refresh**: Automatically refresh component list
- **UI5 Version**: Default SAPUI5 version (1.108.0)

## Commands

- `SAP: Create New Project` - Create a new SAPUI5/Fiori project
- `Refresh` - Refresh the component list

## Development

```bash
npm install
npm run compile
npm run watch
```

Press `F5` to test the extension.

## License

MIT
