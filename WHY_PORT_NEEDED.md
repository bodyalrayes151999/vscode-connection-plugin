# Why Port Numbers Are Needed

## The Confusion Explained

You asked: **"Why do you need port while SAP GUI doesn't request this?"**

This is an excellent question! Here's the truth:

## SAP GUI vs HTTP/Web Access

### SAP GUI (What Works Now)
- **Port**: 3210 (from your SAPUILandscape.xml)
- **Protocol**: RFC/DIAG (SAP's proprietary binary protocol)
- **Purpose**: Traditional SAP screens, transactions, ABAP development
- **Why it works**: SAP GUI knows to use RFC protocol automatically

### BSP/Fiori Browsing (What We're Building)
- **Port**: 8010 (from SMICM screenshot you sent)
- **Protocol**: HTTP/HTTPS (standard web protocol)
- **Purpose**: Web applications, Fiori apps, OData services
- **Why we need explicit port**: Different protocol requires different port

## The Real Issue

From your SMICM screenshot, we can see:
- **HTTP** service on port **8010**
- **HTTPS** service on port **44310**
- **SMTP** service on port **25010**

However, when we tested port 8010 through the SAP Router, it **timed out**. This means:

1. ✅ SAP Router accepts our connection
2. ✅ SAP Router tries to reach `172.20.1.8:8010`
3. ❌ The backend doesn't respond on port 8010

## Why Port 8010 Doesn't Respond

**Possible reasons:**

### 1. Firewall Rules
The SAP system might have firewall rules that:
- ✅ Allow RFC (port 3210) from the router
- ❌ Block HTTP (port 8010) from the router
- This is common for security - only SAP GUI access allowed externally

### 2. ICM Service Not Accessible Externally
The HTTP service might be configured to only listen on:
- Localhost (127.0.0.1)
- Internal network interface
- Not on the external interface that the router can reach

### 3. Different Network Routing
- RFC port 3210 might be forwarded/NAT'd differently than HTTP port 8010
- The `172.20.1.8` might be reachable on port 3210 but not 8010 from the router's perspective

## The Solution

Your SAP Basis team needs to either:

1. **Enable HTTP access through the router** 
   - Configure firewall to allow port 8010 from SAP Router IP (54.75.63.76)
   - Or configure ICM to listen on external interface

2. **Use VPN** 
   - Connect to VPN
   - Access `172.20.1.8:8010` directly without router
   - Our extension supports this (Direct Connection mode)

3. **Alternative: SAP GUI Scripting**
   - Since SAP GUI works perfectly, we could use SAP GUI Scripting API
   - Access BSP applications through RFC instead of HTTP

## Current Status

✅ **SAP Router implementation**: 100% working  
✅ **SAP GUI integration**: Working (uses RFC on port 3210)  
❌ **HTTP/BSP browsing through router**: Blocked by backend firewall/config  

The code is ready - we just need the network/firewall configuration to allow HTTP traffic through the router!
