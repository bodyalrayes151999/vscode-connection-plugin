# SAP Router Connection Findings

## Summary
After extensive testing and Eclipse plugin analysis, we've determined that SAP Router connectivity from VS Code requires specific permissions or protocols not available through standard Node.js libraries.

## What Works ✅
1. **SAP GUI Integration**: Successfully launches sapshcut.exe with router strings
2. **XML Parser**: Reads SAPUILandscape.xml and extracts 31 SAP systems with router info
3. **Direct Connections**: Works for systems without SAP Router (when on VPN)
4. **Client Number Prompt**: Three connection modes (SAP GUI, Direct/VPN, Router Protocol)

## What Doesn't Work ❌

### 1. SAP NI Protocol (Custom Implementation)
**Approach**: Implemented SAP Router NI protocol from scratch using raw TCP sockets
**File**: `src/utils/SapRouterClient.ts`
**Test**: `test-router.js`
**Result**: Router returns error code 78 "NiRRouteRepl: invalid route received"

```
❌ SAP Router Error:
Error code: 78 (0x4e)
Message: NiRRouteRepl: invalid route received
```

**Analysis**: The router rejects our connection attempt, likely because:
- Missing authentication/authorization
- Incorrect NI protocol handshake
- Router needs specific client permissions configured

### 2. HTTP CONNECT Proxy
**Approach**: Treat SAP Router as standard HTTP proxy using `https-proxy-agent`
**File**: `src/managers/SapConnectionManager.ts` (testConnectionThroughRouter method)
**Test**: `test-router-as-proxy.js`
**Result**: Connection reset by router

```
❌ Error: read ECONNRESET
```

**Analysis**: SAP Router doesn't support standard HTTP CONNECT proxy protocol. Eclipse findings showed they use HTTP proxy, but there must be additional configuration or authentication we're missing.

### 3. Eclipse Plugin Analysis
**Files Analyzed**:
- `com.sap.ide.ui5.team_*.jar` - AfrClient, AfrRepositoryProvider
- `com.sap.adt.communication_*.jar` - HttpDestinationRegistry
- `com.sap.adt.destinations_*.jar` - Destination management

**Key Findings**:
- Eclipse uses Apache HttpClient library
- Has HttpDestinationRegistry for managing connections
- ApplicationServerConnectionAttributes class handles connection data
- Uses HTTP proxy configuration but likely with SAP-specific authentication

**Missing Piece**: Eclipse likely uses SAP JCo (Java Connector) or has enterprise SAP Router permissions configured that we don't have access to in Node.js.

## Test Environment
- **Test System**: Amer-DEV
- **Host**: 172.20.1.8:3210
- **Client**: 500
- **SAP Router**: /H/54.75.63.76 (port 3299)
- **User**: CIC.ELRAYES / A@123456

**Important Note**: SAP GUI works perfectly without VPN, proving the router is functional and properly configured.

## Recommended Solutions

### Option 1: VPN Requirement (Most Practical)
Accept that BSP browsing requires VPN connection and document this:
- SAP GUI integration works for launching systems
- Direct connection mode works when on VPN
- Router protocol mode only for systems where VPN isn't required

### Option 2: SAP JCo Integration (Complex)
Investigate Node.js SAP JCo libraries:
- `node-rfc` - Node.js RFC connector
- `node-sapnwrfc` - SAP NetWeaver RFC SDK bindings
- Requires native library installation
- May have built-in router support

### Option 3: Document Limitation
Clearly state in README:
```markdown
## SAP Router Limitations

Systems configured with SAP Router require one of the following:
1. Connect via VPN to bypass router
2. Use "Open in SAP GUI" option (works without VPN)
3. Contact SAP administrator to configure router permissions
```

## Files Modified

### Core Implementation
- `src/managers/SapConnectionManager.ts` - Connection logic with router attempts
- `src/utils/SapRouterClient.ts` - SAP NI protocol implementation
- `src/utils/SapGuiReader.ts` - XML parser for SAP systems
- `src/utils/SapShcutHelper.ts` - SAP GUI launcher
- `src/ui/ConnectionUIProvider.ts` - Three connection mode UI

### Test Files
- `test-router.js` - SAP NI protocol test
- `test-router-as-proxy.js` - HTTP proxy test
- `test-xml-parser.js` - XML parsing test
- `test-amer-dev.js` - Direct connection test

### Documentation
- `ECLIPSE_PLUGIN_ANALYSIS.md` - Eclipse reverse engineering findings
- `README.md` - Updated with router documentation

## Next Steps

1. **Discuss with user** which solution path to take
2. If VPN route: Focus on direct connection BSP browsing
3. If JCo route: Research node-rfc integration
4. If limitation route: Update documentation and focus on VPN scenario

## Technical Notes

### SAP Router Format
```
/H/router_host/S/router_port/H/app_host/S/app_port
```

### SAP NI Protocol Structure
```
00-03: Total length (4 bytes, big-endian)
04-07: Header length (4 bytes, big-endian)  
08-11: Version (4 bytes, big-endian)
12-15: Type (4 bytes, big-endian)
16-xx: Route string (variable length)
```

### HTTP Proxy Attempt
```javascript
const agent = new HttpsProxyAgent(`http://${routerHost}:${routerPort}`);
const options = {
  hostname: targetHost,
  port: targetPort,
  path: '/sap/public/info',
  agent: agent
};
```

Both methods failed with the test router, indicating the router requires special handling not provided by standard Node.js libraries.
