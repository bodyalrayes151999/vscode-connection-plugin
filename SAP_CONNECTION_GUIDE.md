# SAP On-Premise Connection Guide

## Overview
This extension now supports connecting to on-premise SAP systems (like Eclipse ADT) to retrieve and update Fiori BSP applications.

## Features

### 1. SAP System Connection
- Connect to on-premise SAP systems via HTTP/HTTPS
- Support for SAP GUI-style authentication
- Secure credential storage
- Multiple connection management

### 2. BSP Application Management
- List all BSP applications from your SAP system
- Download BSP applications to local workspace
- Upload changes back to SAP system
- Real-time sync with SAP backend

### 3. Integration with SAP Services
- Uses SAP UI5 Repository OData Service
- CSRF token handling
- Basic authentication support

## Quick Start

### Step 1: Connect to SAP System

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. Type: **`SAP: Connect to System`**
3. Fill in the connection form:
   - **Connection Name**: e.g., "Production System"
   - **Host**: Your SAP server (e.g., `sap.company.com`)
   - **Port**: `443` (HTTPS) or `8000` (HTTP)
   - **Client**: SAP client number (e.g., `100`)
   - **System ID**: SAP SID (e.g., `PRD`)
   - **Username**: Your SAP username
   - **Password**: Your SAP password
   - **Use HTTPS**: Check for secure connection

4. Click **Connect** - the extension will test the connection

### Step 2: View BSP Applications

1. Click the **SAP Toolkit** icon in the Activity Bar
2. Look for **BSP Applications** view
3. You'll see all BSP applications from your SAP system

### Step 3: Download a BSP Application

1. Right-click on any BSP application
2. Select **Download BSP Application**
3. Choose a local folder
4. The application will be downloaded with full structure

### Step 4: Upload Changes

1. Make changes to your downloaded BSP application
2. Right-click on the application in the BSP Applications view
3. Select **Upload BSP Application**
4. Confirm the upload
5. Changes will be pushed to SAP system

## Connection Dialog Fields

| Field | Description | Example |
|-------|-------------|---------|
| Connection Name | Friendly name for this connection | Production System |
| Host | SAP server hostname or IP | sap.company.com |
| Port | Port number (443 for HTTPS, 8000 for HTTP) | 443 |
| Client | SAP client number (3 digits) | 100 |
| System ID | SAP System ID (SID) | PRD |
| Use HTTPS | Enable secure connection | ✓ Checked |
| Username | Your SAP username | DEVELOPER01 |
| Password | Your SAP password | ********** |

## Managing Multiple Connections

### Add Multiple Connections
- Use **SAP: Connect to System** multiple times
- Each connection is saved with a unique name

### Switch Between Connections
1. Open Command Palette
2. Type: **`SAP: Select Connection`**
3. Choose from your saved connections

### Active Connection
- The status bar shows: **"📦 SAP Toolkit"**
- Click it to quickly switch connections
- Active connection is used for all BSP operations

## BSP Application Tree View

### Icons & Status
- **📄 Blue icon**: BSP Application available
- **ℹ️ Info icon**: No connection or no apps found

### Context Menu Options
- **Download BSP Application**: Download to local folder
- **Upload BSP Application**: Push changes to SAP
- **Refresh**: Reload BSP applications list

### Application Information
Hover over any application to see:
- Application name
- Description
- Version
- Namespace
- URL

## Technical Details

### SAP Services Used
```
/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories
```

### Authentication
- Basic Authentication (username/password)
- Credentials stored securely in VS Code's global state
- CSRF token automatically handled

### Supported Operations
- ✅ List BSP applications
- ✅ Download BSP applications
- ✅ Upload BSP applications
- ✅ Connection testing
- ⏳ Real-time file sync (coming soon)
- ⏳ Transport request integration (coming soon)

## Troubleshooting

### Connection Fails
**Issue**: "Connection timeout" or "Connection error"

**Solutions**:
1. Check host and port are correct
2. Verify SAP system is accessible from your network
3. Try toggling HTTPS on/off
4. Check if VPN is required
5. Verify firewall allows connection

### Authentication Error (401)
**Issue**: "Authorization failed"

**Solutions**:
1. Verify username and password are correct
2. Check if your user has UI5 Repository authorizations
3. Ensure client number is correct
4. Try logging into SAP GUI first

### No BSP Applications Found
**Issue**: BSP Applications view shows "No BSP applications found"

**Solutions**:
1. Verify you have authorization to view UI5 repositories
2. Check if BSP applications exist in the system
3. Try using transaction `SE80` in SAP GUI to verify

### Download/Upload Fails
**Issue**: "Failed to download/upload BSP application"

**Solutions**:
1. Check your SAP authorizations
2. Verify the application exists
3. For uploads, check if application is locked by another user
4. Try refreshing the BSP Applications view

## SAP Authorization Requirements

Your SAP user needs these authorizations:

### Required Authorization Objects
- **S_DEVELOP**: Development authorization
- **S_ICF**: ICF service authorization  
- **S_SERVICE**: Service authorization for UI5 Repository

### Required Transactions
- `/UI5/UI5_REPOSITORY_LOAD` - Upload UI5 applications
- `SE80` - Development workbench

Contact your SAP Basis team if you don't have these authorizations.

## Security Best Practices

1. **Use HTTPS**: Always enable HTTPS for production systems
2. **Secure Passwords**: Use strong passwords
3. **Limited Scope**: Only connect with users that have minimal required authorizations
4. **Review Changes**: Always review changes before uploading
5. **Backup**: Keep local backups of BSP applications

## Workflow Example

### Typical Development Flow

```bash
# 1. Connect to SAP system
Ctrl+Shift+P → "SAP: Connect to System"

# 2. Browse BSP applications
Click SAP Toolkit → BSP Applications view

# 3. Download app for development
Right-click app → Download BSP Application

# 4. Make changes locally
Edit files in your favorite editor

# 5. Test locally (if possible)
npm start

# 6. Upload back to SAP
Right-click app → Upload BSP Application

# 7. Test in SAP system
Open app URL in browser
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Command Palette | `Ctrl+Shift+P` |
| Connect to SAP | `Ctrl+Shift+P` → "SAP: Connect" |
| Refresh BSP Apps | Click refresh icon in view |
| Select Connection | Click status bar item |

## Advanced Configuration

### SAP System Endpoints

The extension uses these SAP endpoints:

```
# Test connection
/sap/bc/ping

# List BSP applications
/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories?$format=json

# Get BSP application files
/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories('{APP_NAME}')/Files

# CSRF token
/sap/opu/odata/sap/UI5_REPOSITORY_SRV/
```

### Custom Endpoints
If your SAP system uses custom endpoints, you may need to modify:
- `src/managers/SapConnectionManager.ts`

## FAQ

**Q: Can I use this with SAP BTP (Cloud)?**
A: Yes, just use the BTP endpoint URL as the host.

**Q: Does this work with SAP NetWeaver Gateway?**
A: Yes, as long as the UI5 Repository service is available.

**Q: Can I deploy directly from VS Code?**
A: Yes, use the Upload BSP Application feature.

**Q: Are my credentials stored securely?**
A: Yes, they're stored in VS Code's secure storage (global state).

**Q: Can I connect to multiple systems at once?**
A: Yes, you can save multiple connections and switch between them.

## Next Steps

- Try connecting to your DEV system first
- Download a simple BSP application
- Make a small change and upload it back
- Integrate with your CI/CD pipeline

---

**Need Help?**
- Check SAP connection settings
- Verify SAP authorizations
- Review SAP system logs
- Contact SAP Basis team for system issues

**Happy SAP Development! 🚀**
