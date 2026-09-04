---
title: Ubuntu Virtual Machine Configuration
createdAt: 2025-09-11 23:13
updatedAt: 2026-09-04 14:00
tags:
  - Linux
---

# Ubuntu Virtual Machine Configuration

## Prepare the Installation Environment

1. Download the Lenovo App Store, search for VMware Workstation, and install it.
2. Visit the [Ubuntu Chinese official website](https://cn.ubuntu.com/) and click “Other download methods” at the bottom of the page.
3. Download Ubuntu 22.04.5 LTS Desktop. LTS stands for Long Term Support. The official provider offers five years of security and maintenance updates, so it is relatively stable.
4. Install Xunlei, drag the newly downloaded `.torrent` file into the Xunlei window, and click “Download Now.”

## Create the Virtual Machine

1. Open VMware Workstation, click “Create a New Virtual Machine,” and select the “Typical” configuration.
2. Select “Installer disc image file (ISO),” click “Browse,” and navigate to the location of `ubuntu-22.04.5-desktop-amd64.iso` (usually `C:\迅雷下载\`). Select and open the ISO file. After confirming that the path appears in the input box, continue to the next step. You may choose the name, password, and virtual machine name yourself.
3. Set the virtual machine's storage location. Avoid the C drive unless it has sufficient free space.
4. Keep the maximum disk size at the default 20.0 GB. You can expand it later with the tools provided by VMware. For virtual disk storage, select “Store virtual disk as a single file.”

Using a single file usually provides better read and write performance. Splitting the disk into multiple files is mainly intended for compatibility with older file systems such as FAT32, which do not support individual files larger than 2 GB. NTFS does not have this limitation; the primary advantage of split files is that they are easier to copy using USB drives and other removable devices.

## Install Ubuntu

1. Set Keyboard layout to English (US) to avoid garbled terminal text and path problems.
2. Select the following installation options:

   - Minimal installation: provides a clean system with less redundancy and lower performance overhead. Normal installation installs software such as LibreOffice, Thunderbird, and games, consuming more disk space and system resources.
   - Download updates while installing Ubuntu: reduces the update work required after installation.
   - Install third-party software for graphics and Wi-Fi hardware and additional media formats: installs NVIDIA graphics drivers, Wi-Fi adapter drivers, and media codecs required for formats such as MP3.

3. Under Installation type, select Erase disk and install Ubuntu. This option formats the 20 GB virtual disk just created for the virtual machine and installs Ubuntu; it does not affect the host machine's physical disk.
4. After entering the system, you may skip Connect Your Online Accounts and Enable Ubuntu Pro.
5. On the Ready to go page, click Code to install VS Code. This version is maintained by the official Ubuntu software repository and has good compatibility.
6. Click the “Full Screen” button at the top of the VMware window to fill the screen.

## Install VMware Tools

1. Use the `Ctrl+Alt+T` shortcut to open the terminal.
2. Run the following command:

```bash
sudo apt install open-vm-tools-desktop
```

Each part of the command means the following:

- `sudo`: runs the command with administrator privileges.
- `apt`: Ubuntu's package management tool.
- `install`: the installation command.
- `open-vm-tools-desktop`: the package to install, which contains the drivers and tools required by the desktop environment.

Next, enter your password and confirm the installation. After the installation finishes, run the following command in the terminal to restart the system:

```bash
reboot
```

## Handle a 403 Forbidden Error

If a 403 Forbidden error occurs while installing `open-vm-tools`, change the software source:

1. Open the terminal and run the following command:

```bash
software-properties-gtk
```

2. Click the drop-down menu at the end of “Download from:” and select “Other...”.
3. Click “Select Best Server” in the upper-right corner. The system tests the server speeds. Select one of the servers, and then click “Choose Server.”
4. Close the “Software and Updates” window. When the system prompts you to reload the software list, click “Reload.”
5. Run the following command in the terminal to update the software source list:

```bash
sudo apt update
```
