# SAP Eclipse Plugin Analysis - Key Findings

## Plugin Structure

Found Eclipse plugins:
- `com.sap.ide.ui5.team` - SAPUI5 Team/Repository Integration  
- `com.sap.adt.communication` - ADT HTTP Communication Layer
- `com.sap.adt.destinations` - SAP Destination Management

## Key Classes Identified

### UI5 Repository (`com.sap.ide.ui5.team`)
- `AfrClient.class` - Main client for ABAP Fiori Repository
- `AfrRepositoryProvider.class` - Repository provider with logon handler
- `AfrFile.class` / `AfrFolder.class` / `AfrResource.class` - Resource models
- `ADTAtomParser.class` - Parses ADT Atom/XML responses

### Communication Layer (`com.sap.adt.communication`)
- `HttpDestinationRegistry.class` - Manages HTTP destinations
- `ApplicationServerConnectionAttributes.class` - Connection attributes

## How Eclipse Handles SAP Router

Eclipse ADT uses **Apache HttpClient (Java)** which:
1. Reads SAP destinations from Eclipse preferences
2. Uses system HTTP proxy settings OR SAP Router configuration
3. Apache HttpClient has built-in SOCKS/HTTP proxy support
4. SAP Router is treated as an HTTP CONNECT proxy

## VS Code Extension Recommendation

### Current Status ✅
Your extension already supports:
- Reading SAP GUI connections (SAPUILandscape.xml)
- SAP Router detection
- Three connection options (SAP GUI, Direct/VPN, Router Protocol)

### Best Path Forward

**Option 1: Use Node.js HTTP Agent with Proxy (Recommended)**
```typescript
import * as https from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
// or
import { HttpsProxyAgent } from 'https-proxy-agent';

// If SAP Router supports HTTP CONNECT proxy:
const agent = new HttpsProxyAgent(`http://${routerHost}:${routerPort}`);

const options = {
    hostname: targetHost,
    port: targetPort,
    path: '/sap/opu/odata/...',
    agent: agent
};
```

**Option 2: Require VPN for Direct Access**
- Document that BSP browsing requires VPN connection
- SAP Router systems: recommend using SAP GUI for development
- This is what you currently have - perfectly valid!

**Option 3: Use `node-sap-rfc` library**
- Wrapper around SAP's native libraries
- Requires SAP NW RFC SDK installation
- More complex setup

## SAP OData Endpoints (from plugin analysis)

The Eclipse plugin uses standard SAP endpoints:

### UI5 Repository Service
- **Base**: `/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV/`
- **Repositories**: `.../Repositories`
- **Files**: `.../Repositories('APP_NAME')/Files`
- **Content**: `.../Repositories('APP_NAME')/Files('file.js')/$value`

### ADT Services  
- **Discovery**: `/sap/bc/adt/discovery`
- **Repository**: `/sap/bc/adt/repository/...`

##  Conclusion

Your VS Code extension is on the right track! The Eclipse plugin uses standard Java HTTP libraries with proxy support. For Node.js, the challenge is that SAP Router requires either:

1. **Proxy support** (if router accepts HTTP CONNECT) - Worth trying!
2. **SAP NW RFC SDK** - Complex, requires native libraries
3. **VPN** - Simplest for end users

### Recommended Next Step

Try using `https-proxy-agent` with SAP Router as HTTP proxy:

```bash
npm install https-proxy-agent
```

This might work if the SAP Router supports HTTP CONNECT protocol (many do).

