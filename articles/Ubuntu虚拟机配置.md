---
title: Ubuntu 虚拟机配置
createdAt: 2025-09-11 23:13
updatedAt: 2026-05-02 19:43
tags:
  - Linux
---



# :computer:Ubuntu虚拟机配置

## :one:下载联想应用商店，搜索VMWare WorkStation并安装

## :two:进入[Ubuntu中文官网](https://cn.ubuntu.com/)

## :three:点击页面下方“其他下载方式”

## :four:下载Ubuntu 22.04.5 LTS（桌面版）

LTS代表长期支持版，官方会提供5年的安全和维护更新，比较稳定。

## :five:安装迅雷。将刚刚安装好的.torrent文件拖到迅雷的窗口里，点击立即下载

## :six:打开VMware WorkStation，点击“创建新的虚拟机”。选择“典型”类型的配置

## :seven:选择“安装程序光盘映像文件(iso)，点击浏览，导航到存放ubuntu-22.04.5-desktop-amd64.iso文件的位置（一般是C:\迅雷下载\)，选中该iso文件并打开，可以看到路径已经显示在输入框内。下一步的名字、密码、虚拟机名称随便取

## :eight:位置：尽量不要在C盘，除非C盘有很多剩余空间

## :nine:最大磁盘大小保持默认20.0GB即可。VMware有工具可以非常方便地扩容。虚拟磁盘存储方式选择”将虚拟磁盘存储为单个文件"

PS:，这样性能更好。读写一个大文件比同时读写几十个2GB地小文件效率更高。拆分多个文件的用途主要是为了兼容老旧的Windows文件系统，如FAT32，因为这些系统不支持单个大于2GB的我呢见。现在几乎所有电脑都是用NTFS文件系统，完全没有这个限制。它唯一的优势是方便用U盘等移动设备拷贝，但这个优势在如今大容量移动硬盘面前已微不足道。

## :keycap_ten:Keyboard layout选择English(US)，避免终端乱码和路径问题

## :next_track_button:选择Minimal installation（最小化安装）、Download updates while installing Ubuntu（安装时下载更新）、Install third-party software for graphics and Wi-Fi hardware and additional media formats（安装第三方软件）

解释：1.Minimal installation提供干净、无冗余、性能开销最小的纯净系统。Normal installation会安装LibreOffice办公套件、雷鸟邮件客户端、游戏等大量软件，占用磁盘空间和系统资源

2.安装时下载更新：省去了安装完成后的漫长更新操作

3.安装第三方软件：这个选项会安装一些驱动（如NVidia显卡驱动、更好的Wi-Fi网卡驱动）和媒体解码器（允许播放MP3等格式的音视频文件）

## :next_track_button:Installation type选择Erase disk and install Ubuntu

这个选项的意思是：把我刚刚为虚拟机创建的那块空白的20GB虚拟硬盘格式化然后装上Ubuntu

## :next_track_button:进入界面后的Connect Your Online Accounts和enable Ubuntu Pro可跳过

## :next_track_button:在Ready to go可以点击code，安装VSCode

安装的版本是Ubuntu官方软件源维护的，兼容性好

## :next_track_button:安装VMware驱动程序

1.使用快捷键Ctrl+Alt+T进入终端

2.输入以下命令然后按回车键：

```bash
sudo apt install open-vm-tools-desktop
```

:arrow_up_small:sudo：表示以管理员权限运行命令

:arrow_up_small:apt：Ubuntu的软件包管理工具

:arrow_up_small:install：安装指令

:arrow_up_small:open-vm-tools-desktop：要安装的软件包名称，它包含了桌面环境所需的驱动和工具

接下来输入密码，确认安装。等待安装完成后重启。

可以在终端输入重启命令：

```bash
reboot
```

## :next_track_button:点击VMware窗口顶部的“全屏”按钮，让界面铺满屏幕



## :wrench:安装open-vm-tools时出现403Forbidden错误的处理方法

1.打开终端，输入命令：

```bash
software-properties-gtk
```

2.点击"Download from:"这一行末尾的下拉菜单按钮，选择最下面的"Other..."

3.点击右上角的"Select Best Server"，系统会自动测试并为您选择一个当前网络下速度最快的服务器。从里面选一个，然后点击"Choose Server"

4.关闭“软件和更新”窗口，系统会提示"Reload"软件列表信息，点击"Reload"即可

5.再在终端运行：

```bash
sudo apt update
```

这一步是更新软件源列表后必做的
