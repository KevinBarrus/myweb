---
title: Ubuntu Virtual Machine Configuration
createdAt: 2025-09-11 23:13
updatedAt: 2026-05-02 19:43
tags:
  - Linux
---

# :computer: Ubuntu Virtual Machine Configuration

## :one: Download the Lenovo App Store, search for VMware Workstation, and install it

## :two: Enter the [Ubuntu Chinese official website](https://cn.ubuntu.com/)

## :three: Click “Other download methods” at the bottom of the page

## :four: Download Ubuntu 22.04.5 LTS (Desktop version)

LTS means Long Term Support. The official provider offers five years of security and maintenance updates, so it is relatively stable.

## :five: Install Xunlei. Drag the newly downloaded `.torrent` file into the Xunlei window and click Download Now

## :six: Open VMware Workstation, click “Create a New Virtual Machine”, and choose the “Typical” configuration

## :seven: Select “Installer disc image file (iso)”, click Browse, navigate to the location containing `ubuntu-22.04.5-desktop-amd64.iso` (usually `C:\迅雷下载\`), select and open the ISO file, and confirm that the path is displayed in the input box. The name, password, and virtual machine name on the next step can be arbitrary.

## :eight: Location: preferably do not use the C drive unless it has plenty of free space

## :nine: Keep the maximum disk size at the default 20.0GB. VMware provides tools for convenient expansion. For virtual disk storage, choose “Store virtual disk as a single file”.

PS: This provides better performance. Reading and writing one large file is more efficient than reading and writing dozens of 2GB small files at the same time. Splitting into multiple files is mainly for compatibility with older Windows file systems such as FAT32, because those systems do not support a single file larger than 2GB. Almost all computers now use NTFS, so this limitation no longer exists. Its only advantage is that it is convenient to copy files with USB drives and other removable devices, but this advantage is negligible with today's large-capacity portable hard drives.

## :keycap_ten: Set Keyboard layout to English (US) to avoid terminal garbled text and path problems

## :next_track_button: Select Minimal installation, Download updates while installing Ubuntu, and Install third-party software for graphics and Wi-Fi hardware and additional media formats

Explanation: 1. Minimal installation provides a clean system without redundancy and with minimal performance overhead. Normal installation installs a large amount of software such as the LibreOffice office suite, Thunderbird mail client, and games, consuming disk space and system resources.

2. Downloading updates during installation eliminates the lengthy update operation after installation is complete.

3. Installing third-party software installs some drivers (such as NVIDIA graphics drivers and better Wi-Fi adapter drivers) and media codecs (which allow audio and video files such as MP3 to be played).

## :next_track_button: For Installation type, choose Erase disk and install Ubuntu

This means formatting the empty 20GB virtual hard disk just created for the virtual machine and installing Ubuntu on it.

## :next_track_button: Connect Your Online Accounts and enable Ubuntu Pro on the screen after entering the system can be skipped

## :next_track_button: At Ready to go, click the code icon to install VSCode

The installed version is maintained by the official Ubuntu software repository and has good compatibility.

## :next_track_button: Install VMware drivers

1. Use the shortcut Ctrl+Alt+T to open the terminal.

2. Enter the following command and press Enter:

```bash
sudo apt install open-vm-tools-desktop
```

:arrow_up_small: `sudo`: runs the command with administrator privileges

:arrow_up_small: `apt`: Ubuntu's package management tool

:arrow_up_small: `install`: the installation command

:arrow_up_small: `open-vm-tools-desktop`: the name of the package to install; it contains the drivers and tools required by the desktop environment

Next, enter the password and confirm the installation. Wait for the installation to finish and restart.

You can enter the restart command in the terminal:

```bash
reboot
```

## :next_track_button: Click the “Full Screen” button at the top of the VMware window to fill the screen

## :wrench: How to handle a 403 Forbidden error when installing open-vm-tools

1. Open the terminal and enter:

```bash
software-properties-gtk
```

2. Click the drop-down button at the end of the “Download from:” row and choose “Other...”.

3. Click “Select Best Server” in the upper-right corner. The system automatically tests and selects the fastest server for the current network. Choose one and click “Choose Server”.

4. Close the “Software and Updates” window. The system will prompt you to reload the software list; click “Reload”.

5. Run the following command in the terminal again:

```bash
sudo apt update
```

This step is required after updating the software source list.
