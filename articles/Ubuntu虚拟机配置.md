---
title: Ubuntu 虚拟机配置
createdAt: 2025-09-11 23:13
updatedAt: 2026-09-04 14:00
tags:
  - Linux
---

# Ubuntu 虚拟机配置

## 准备安装环境

1. 下载联想应用商店，搜索并安装 VMware Workstation。
2. 进入 [Ubuntu 中文官网](https://cn.ubuntu.com/)，点击页面下方的“其他下载方式”。
3. 下载 Ubuntu 22.04.5 LTS 桌面版。LTS 代表长期支持版，官方会提供 5 年的安全和维护更新，比较稳定。
4. 安装迅雷，将刚刚下载的 `.torrent` 文件拖入迅雷窗口，然后点击“立即下载”。

## 创建虚拟机

1. 打开 VMware Workstation，点击“创建新的虚拟机”，选择“典型”配置。
2. 选择“安装程序光盘映像文件（ISO）”，点击“浏览”，导航到 `ubuntu-22.04.5-desktop-amd64.iso` 所在的位置（一般是 `C:\迅雷下载\`），选中并打开该 ISO 文件。确认路径已经显示在输入框内后，继续下一步。名字、密码和虚拟机名称可以自行设置。
3. 设置虚拟机的存储位置。尽量不要选择 C 盘，除非 C 盘有充足的剩余空间。
4. 最大磁盘大小保持默认的 20.0 GB 即可，后续可以使用 VMware 提供的工具扩容。虚拟磁盘存储方式选择“将虚拟磁盘存储为单个文件”。

选择单个文件通常有更好的读写性能。拆分为多个文件主要是为了兼容 FAT32 等旧文件系统，因为这些系统不支持大于 2 GB 的单个文件。NTFS 没有这个限制；拆分文件的优势主要是便于通过 U 盘等移动设备复制。

## 安装 Ubuntu

1. 将 Keyboard layout 设置为 English (US)，避免终端乱码和路径问题。
2. 选择以下安装选项：

   - Minimal installation（最小化安装）：提供干净、冗余较少、性能开销较小的系统。Normal installation 会安装 LibreOffice、Thunderbird 和游戏等软件，占用更多磁盘空间和系统资源。
   - Download updates while installing Ubuntu（安装时下载更新）：减少安装完成后的更新操作。
   - Install third-party software for graphics and Wi-Fi hardware and additional media formats（安装第三方软件）：安装 NVIDIA 显卡驱动、Wi-Fi 网卡驱动和 MP3 等格式所需的媒体解码器。

3. 在 Installation type 中选择 Erase disk and install Ubuntu。该选项会格式化刚刚为虚拟机创建的 20 GB 虚拟硬盘，然后安装 Ubuntu，不会影响宿主机的物理硬盘。
4. 进入系统后的 Connect Your Online Accounts 和 Enable Ubuntu Pro 可以跳过。
5. 在 Ready to go 页面点击 Code，安装 VS Code。该版本由 Ubuntu 官方软件源维护，兼容性较好。
6. 点击 VMware 窗口顶部的“全屏”按钮，使界面铺满屏幕。

## 安装 VMware Tools

1. 使用快捷键 `Ctrl+Alt+T` 打开终端。
2. 运行以下命令：

```bash
sudo apt install open-vm-tools-desktop
```

命令中各部分的含义如下：

- `sudo`：以管理员权限运行命令。
- `apt`：Ubuntu 的软件包管理工具。
- `install`：安装指令。
- `open-vm-tools-desktop`：需要安装的软件包，其中包含桌面环境所需的驱动和工具。

接下来输入密码并确认安装。等待安装完成后，可以在终端运行以下命令重启系统：

```bash
reboot
```

## 处理 403 Forbidden 错误

如果安装 `open-vm-tools` 时出现 403 Forbidden 错误，可以更换软件源：

1. 打开终端，运行以下命令：

```bash
software-properties-gtk
```

2. 点击 “Download from:” 末尾的下拉菜单，选择 “Other...”。
3. 点击右上角的 “Select Best Server”。系统会测试服务器速度，从中选择一个服务器，然后点击 “Choose Server”。
4. 关闭“软件和更新”窗口，系统提示重新加载软件列表时，点击 “Reload”。
5. 在终端运行以下命令，更新软件源列表：

```bash
sudo apt update
```
