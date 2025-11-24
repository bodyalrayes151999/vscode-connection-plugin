# Quick Start Guide - SAP Development Toolkit

## 🚀 How to Test the Extension

### Method 1: Development Mode (Recommended for Testing)

1. **Open the project in VS Code**
   ```bash
   cd vscode-connection-plugin
   code .
   ```

2. **Press F5**
   - This launches a new VS Code window titled "[Extension Development Host]"
   - Your extension is automatically loaded

3. **Look for the SAP Toolkit**
   - Check the Activity Bar (left sidebar) for the package icon
   - Click it to open the SAP Components view

4. **Try the features:**
   - View SAP components with version info
   - Right-click components for options
   - Click status bar item "SAP Toolkit"
   - Use Command Palette: `Ctrl+Shift+P` → "SAP: Create New Project"

### Method 2: Package and Install Permanently

```bash
# Install packaging tool (if not already installed)
npm install -g @vscode/vsce

# Package the extension
vsce package

# Install in VS Code
code --install-extension sap-development-toolkit-1.0.0.vsix
```

## 📋 What You'll See

### Activity Bar (SAP Toolkit Icon)
- **Components Tree View**
  - UI development toolkit for HTML5 (v1.44.14) 
  - SAPUI5 Application Development (v1.44.14) ✅
  - SAPUI5 Runtime (Client-side) (v1.44.14)
  - SAPUI5 Runtime (Server-side) (v1.44.14) ✅

### Context Menu Options
- Install Component
- Show Details

### Status Bar
- "$(package) SAP Toolkit" - Click to refresh

### Commands (Ctrl+Shift+P)
- SAP: Create New Project
- SAP: Start Debugging (coming soon)

## 🎯 Test Creating a Project

1. **Open Command Palette**: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
2. **Type**: `SAP: Create New Project`
3. **Select a template**:
   - Basic SAPUI5 Web Application
   - SAP Fiori Master-Detail Application
   - Custom UI5 Control Library
4. **Enter project name**: e.g., "MyFirstUI5App"
5. **Choose location**: Select a folder on your computer
6. **Click "Open Project"** when creation is complete

### Generated Project Structure
```
MyFirstUI5App/
├── webapp/
│   ├── controller/
│   │   └── Main.controller.js
│   ├── view/
│   │   └── Main.view.xml
│   ├── model/
│   │   └── models.js
│   ├── i18n/
│   │   └── i18n.properties
│   ├── css/
│   ├── Component.js
│   ├── manifest.json
│   └── index.html
├── package.json
└── .gitignore
```

## 🔧 Troubleshooting

### Extension Doesn't Appear
```bash
# Reload the window
Ctrl+Shift+P → "Developer: Reload Window"

# Check for errors
View → Output → Select "Extension Host"
```

### Compilation Errors
```bash
# Recompile
npm run compile

# Watch for changes
npm run watch
```

### Can't Find the SAP Toolkit Icon
- Look for the package icon (📦) in the Activity Bar
- If not visible, View → Open View → SAP Toolkit

## 📚 Next Steps

1. **Customize Components**: Edit `src/providers/SapToolkitProvider.ts`
2. **Add More Templates**: Edit `src/generators/ProjectGenerator.ts`
3. **Enhance Features**: Edit `src/extension.ts`
4. **Test Changes**: Press `F5` after saving

## 🎨 Customization

### Add Your Own Components
Edit `src/providers/SapToolkitProvider.ts`:
```typescript
private components: SapComponent[] = [
    {
        name: 'Your Component Name',
        version: '1.0.0',
        featureGroup: 'com.your.feature.group',
        type: 'toolkit',
        installed: false,
        description: 'Your description'
    }
    // ... add more
];
```

### Add Custom Project Templates
Edit `src/generators/ProjectGenerator.ts`:
```typescript
{
    id: 'your-template',
    name: 'Your Template Name',
    description: 'Template description',
    type: 'webapp',
    ui5Version: '1.108.0'
}
```

## 🐛 Debug the Extension

1. Set breakpoints in your TypeScript files
2. Press `F5`
3. Trigger the feature in the Extension Development Host
4. Debugger will stop at breakpoints

## 📦 Publishing (Optional)

```bash
# Create a publisher account on VS Code Marketplace
# https://marketplace.visualstudio.com/manage

# Login
vsce login your-publisher-name

# Publish
vsce publish
```

## ✅ Success Checklist

- [ ] Extension loads in Development Host
- [ ] SAP Toolkit icon appears in Activity Bar
- [ ] Components tree shows 4 items
- [ ] Right-click menu works
- [ ] Status bar item appears
- [ ] Create Project command works
- [ ] Install Component shows progress
- [ ] Component details webview opens

---

**Happy Coding! 🎉**

If you encounter any issues, check the Output panel (View → Output → Extension Host) for error messages.
