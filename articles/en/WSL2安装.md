---
title: Installing WSL2
createdAt: 2026-05-09 16:05
updatedAt: 2026-05-12 13:47
tags:
  - Linux
---

## Step 1 - Enable Windows Features

### Enable Windows Subsystem for Linux

Method 1:

You must first enable the optional feature "Windows Subsystem for Linux" before you can install any Linux distribution on Windows.

Open PowerShell as administrator (three methods: 1. press Win+R, type powershell, hold Ctrl+Shift and press Enter; 2. press Win to open the Start menu, search for powershell, click "Run as administrator") and run:

```PowerShell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```

### Enable Virtual Machine Platform

Before installing WSL 2, you must enable the **Virtual Machine Platform** optional feature. The computer needs [virtualization capabilities](https://learn.microsoft.com/zh-cn/windows/wsl/troubleshooting#error-0x80370102-the-virtual-machine-could-not-be-started-because-a-required-feature-is-not-installed) to use this feature.

Open PowerShell as administrator and run:

```PowerShell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

**Restart** the computer to complete the WSL installation and update to WSL 2.

Method 2:

Press Win+R, type `optionalfeatures`, and press Enter.

![Open the Windows Features window through optionalfeatures](./assets/WSL2安装/winRoptionalfeatures.png)

Check these three options: Windows Hypervisor Platform, Windows Subsystem for Linux, and Virtual Machine Platform.

![Check the required WSL and virtualization components in Windows Features](./assets/WSL2安装/of启用wsl.png)

Regardless of which method you use, restart the computer after completing it.

## Step 2 - Set WSL 2 as the Default Version

Open PowerShell and run the following command to set WSL 2 as the default version when installing a new Linux distribution:

``` PowerShell
wsl --set-default-version 2
```

## Step 3 - Install the Selected Linux Distribution

Open the [Microsoft Store](ms-windows-store://collection?CollectionId=LinuxDistros) and choose your preferred Linux distribution.

Here we choose Ubuntu. After installation, run the following command in PowerShell to verify it:

```powershell
wsl --list --verbose
```

The result should look like this:

![Use wsl --list --verbose to verify that Ubuntu VERSION is 2](./assets/WSL2安装/验证wsl安装.png)

A result of 2 in the VERSION column means that WSL 2 was installed successfully.

## Step 4 - Run

Press Win+R, type `wsl`, and press Enter to run it.

# Proxy Configuration

Implement "the host uses a proxy, WSL automatically uses the proxy; the host disables the proxy, WSL automatically connects directly" without manually switching environment variables.

### Recommended Solution: Clash Verge Virtual Network Adapter Mode (TUN Mode)

This solution completely bypasses the limitations of NAT mode. The WSL network automatically synchronizes with the host proxy status, without requiring manual configuration scripts.

#### Step 1: Basic Clash Verge Settings

1. Open Clash Verge and enter the "Settings" page:

    - Enable "Allow LAN"
    - Confirm the proxy port (such as `7897`; no manual configuration is needed later)

2. Return to the "Network Settings" area on the home page and enable "Virtual Network Adapter Mode" (TUN mode).

![Enable virtual network adapter mode (TUN mode) in Clash Verge network settings](./assets/WSL2安装/ClashVerge开TUN模式.png)

#### Step 2: Restart WSL to Apply the Configuration

Run the following command in PowerShell to force all WSL processes to close:

```PowerShell
wsl --shutdown
```

Reopen WSL. The configuration will take effect automatically.

#### Step 3: Verify Proxy Connectivity

Run the following command in the WSL terminal to test access to Google:

```bash
curl -I https://www.google.com
```

If an `HTTP/2 200` response header is returned, the proxy is working normally. The ideal result is shown in the image:

![Access Google with curl in WSL and receive an HTTP 200 response](./assets/WSL2安装/wsl测试谷歌连接.png)
