---
title: Android Remote Control of WSL2: Take Over Your Agent from Your Phone Anytime
createdAt: 2026-08-30 10:36
updatedAt: 2026-08-30 14:06
tags:
  - Linux
---

## Phase 1: Get It Working on the Local Network

In this phase, we first make sure that the phone can SSH into WSL when the phone and computer are connected to the same Wi-Fi. SSH itself will be explained at the end.

### 1. Install the SSH Server in WSL

In WSL:

```bash
sudo apt update
sudo apt install openssh-server
```

Start it:

```bash
sudo service ssh start
```

Or, if systemd is enabled in your WSL:

```bash
sudo systemctl enable --now ssh
```

Check it:

```bash
sudo systemctl status ssh
```

Then confirm port 22:

```bash
ss -tlnp | grep ':22'
```

Ideally, you should see something like:

```bash
LISTEN 0 128 0.0.0.0:22
```

### 2. Change the WSL2 Network to mirrored

This is currently the more suitable approach for Windows 11 + WSL2 in this scenario.

Microsoft explicitly supports WSL2's mirrored networking mode. It allows WSL to be **accessed directly from the LAN**, without dealing with a WSL IP and Windows `netsh portproxy` as in traditional NAT mode. These terms will be explained later; for now, let us practice.

[Microsoft WSL networking documentation](https://learn.microsoft.com/en-us/windows/wsl/networking?utm_source=chatgpt.com)

In Windows:

```bash
C:\Users\<WINDOWS_USER>\.wslconfig
```

Add:

```bash
[wsl2]
networkingMode=mirrored
```

`<WINDOWS_USER>` is your Windows username, such as a five-digit number. `<WINDOWS_USER>` is used throughout the rest of this article.

If there is no `.wslconfig` file, execute the following in the WSL `/mnt/c/Users/<WINDOWS_USER>` directory:

```bash
cat > /mnt/c/Users/<WINDOWS_USER>/.wslconfig << 'EOF'
[wsl2]
networkingMode=mirrored
EOF
```

If `[wsl2]` already exists, do not write the section again; just add:

```bash
networkingMode=mirrored
```

View the `.wslconfig` file and confirm the change:

```bash
cat /mnt/c/Users/<WINDOWS_USER>/.wslconfig
```

It should output:

```bash
[wsl2]
networkingMode=mirrored
```

Then in PowerShell:

```powershell
wsl --shutdown
```

Reopen WSL.

Mirrored mode requires Windows 11 22H2 or later. It also improves VPN, IPv6, and Windows/WSL network interoperability.

### 3. Find the Computer's IP Address

After entering WSL again, run:

``` bash
ss -tlnp | grep ':22'
```

Confirm that it is still:

```bash
0.0.0.0:22
[::]:22
```

Now check whether mirrored mode has taken effect.

Run in WSL:

```bash
ip addr
```

Find the LAN interface currently in use and look at the IPv4 address after `inet`. In this environment, the interface is `eth2`:

```bash
inet <LAN_IP>/<PREFIX_LEN> brd <BROADCAST_IP> scope global noprefixroute eth2
```

For example:

```bash
inet 192.168.110.168/24 brd 192.168.110.255 scope global noprefixroute eth2
```

At the same time, run this in Windows PowerShell:

```powershell
ipconfig
```

Pay attention to:

```powershell
IPv4 Address . . . . . . . . . . : <LAN_IP>
Subnet Mask . . . . . . . . . . : <SUBNET_MASK>
```

For example:

```bash
IPv4 Address . . . . . . . . . . : 192.168.110.168
Subnet Mask . . . . . . . . . . : 255.255.255.0
```

Windows WLAN and WSL `eth2` now have the **exact same LAN address**:

```bash
Windows WLAN
192.168.110.168/24

WSL eth2
192.168.110.168/24
```

Note: a subnet mask of 255.255.255.0 means `/24`.

Also, WSL's SSH is now:

```
LISTEN 0.0.0.0:22
LISTEN [::]:22
```

So the current target is clear:

```
Android
   │
   │ Wi-Fi / LAN
   │
   ▼
<LAN_IP>:22
   │
   ▼
WSL sshd
```

If `ipconfig` in PowerShell shows an unknown adapter named SakuraiTunnel:

```
198.18.0.1/30
```

That is, it displays:

```powershell
IPv4 Address . . . . . . . . . . : 198.18.0.1
Subnet Mask . . . . . . . . . . : 255.255.255.252
```

The following also appears in WSL:

```
eth0 → 198.18.0.1/30
```

This further shows that mirrored mode has indeed mirrored Windows' network interfaces into WSL. If the proxy is working normally, do not change any proxy configuration for now.

### 4. Allow Inbound WSL SSH

Open PowerShell as administrator and run:

```powershell
New-NetFirewallHyperVRule `
  -Name "WSL-SSH" `
  -DisplayName "WSL SSH" `
  -Direction Inbound `
  -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
  -Protocol TCP `
  -LocalPorts 22
```

There are two ways to open PowerShell as administrator:

Method 1: click the Windows icon or press the Win key, search for PowerShell, and click Run as administrator.

Method 2: press Win+R, type powershell, hold Ctrl+Shift, and press Enter.

This is the Hyper-V firewall rule for mirrored WSL. Microsoft documentation also explains that when accessing WSL directly from the LAN in mirrored mode, the corresponding Hyper-V firewall inbound traffic must be allowed. [Microsoft WSL mirrored networking documentation](https://learn.microsoft.com/en-us/windows/wsl/networking?utm_source=chatgpt.com)

After successful execution, check it with:

```
Get-NetFirewallHyperVRule -Name "WSL-SSH"
```

Look at these key fields:

```bash
Direction         : Inbound
Protocol          : TCP
LocalPorts        : 22
Action            : Allow
Enabled           : True
EnforcementStatus : OK
```

If these values match, everything is ready and you can test the phone connection.

### 5. Install Termux on Android

First make sure that the phone and computer are connected to the same Wi-Fi. The computer's current LAN address is `<LAN_IP>`; it was found in step 3.

Search for Termux in a browser, find the Termux GitHub repository, and download the `.apk` file. The repository is provided directly here: https://github.com/termux/termux-app

### 6. Make an SSH Connection

After opening Termux:

```bash
pkg update
pkg install openssh
```

Then:

```bash
ssh <WSL_USER>@<LAN_IP>
```

Replace:

```bash
<WSL_USER>
```

with the username returned by:

```bash
whoami
```

inside WSL. You can also see the name displayed in WSL. `<WSL_USER>` is used throughout the rest of this article.

The first connection should show something like:

```bash
The authenticity of host '<LAN_IP>' can't be established.
...
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Enter `yes`.

If an error appears, check whether your phone and computer are connected to the same Wi-Fi.

Next:

```bash
<WSL_USER>@<LAN_IP>'s password:
```

Enter the password of your WSL Ubuntu user here, not your Windows PIN.

If successful, the Termux prompt on your phone changes from the Android environment to something like:

```
<WSL_USER>@<WINDOWS_USER>:~$
```

This means the entire link is working:

```
Android Termux
      │
      │ SSH
      ▼
   <LAN_IP>
      │
      ▼
   WSL2 Ubuntu
      │
      ├── codex
      ├── claude
      ├── pi
      └── tmux
```

At this point, the first phase is complete: under the same Wi-Fi, the phone can connect to the computer's WSL.

## Phase 2: Turn It into an Environment Suitable for Long-Term Use

### 1. Passwordless Login with an SSH Key

First exit the current WSL SSH session on the phone. There are two ways:

Method 1: enter `exit` and press Enter.

Method 2: tap Ctrl so that it changes from white to red (simulating holding Ctrl on a computer keyboard), then tap the letter `d`. When the `d` takes effect, Ctrl changes back from red to white.

Ctrl+D sends EOF to the current interactive shell, and the shell usually exits as a result. Here, after the remote shell ends, the SSH session closes as well and you return to Termux. It is not a WSL-specific exit shortcut.

After confirming that you are back in Termux's own shell, run this in **Termux on the phone**:

```bash
ssh-keygen -t ed25519
```

It asks:

```bash
Enter file in which to save the key (.../.ssh/id_ed25519):
```

Press Enter directly.

Then:

```bash
Enter passphrase (empty for no passphrase):
```

To take over an Agent quickly from the phone, press Enter without setting a passphrase, and press Enter once more to confirm.

After generation, run:

```bash
ssh-copy-id <WSL_USER>@<LAN_IP>
```

This time, enter the WSL password one final time.

Then test:

```
ssh <WSL_USER>@<LAN_IP>
```

If you enter WSL directly without a password, passwordless login is configured successfully.

### 2. Persistent tmux Sessions

The goal is that Codex/Claude Code continues running even if the phone is locked, Termux is sent to the background, or SSH disconnects.

First SSH into WSL from the phone:

```bash
ssh <WSL_USER>@<LAN_IP>
```

Confirm that tmux is installed:

```bash
tmux -V
```

If it is not installed:

```bash
sudo apt install tmux
```

Now test with a real project:

```bash
cd ~/projects/epsilon
tmux new -s epsilon
```

You are now in a persistent terminal named `epsilon`. Start Codex inside it:

```bash
codex
```

You can now operate Codex normally on the phone.

The key point: **do not exit Codex**. Instead, tap Ctrl, wait until it turns red, press `b`, and then press `d`. The sequence is Ctrl (red) → b → d, not Ctrl → b → release → Ctrl → d.

This is tmux detach. If you have already returned to the tmux shell, you can run `tmux detach`. If Codex/Claude Code is in the foreground, use `Ctrl+B → d`, or `Ctrl+B → type a colon → detach-client`.

You should return to the ordinary SSH shell and see something like:

```bash
[detached (from session epsilon)]
<WSL_USER>@<WINDOWS_USER>:~$
```

Run:

```bash
tmux ls
```

You should see:

```bash
epsilon: 1 windows (...)
```

Enter again:

```bash
tmux attach -t epsilon
```

The **Codex screen from earlier returns exactly as it was**.

This means the future workflow can be:

```
Computer
  │
  └─ WSL
      └─ tmux: epsilon
           └─ Codex
                ↓
          keeps running
                ↑
      ┌─────────┴─────────┐
      │                   │
   PC terminal        Android
 tmux attach          SSH + attach
```

You can even perform a harsher test: **while Codex is open, swipe Termux away or disconnect SSH**, then reopen Termux:

```bash
ssh <WSL_USER>@<LAN_IP>
tmux attach -t epsilon
```

Codex should still be there.

One useful Termux detail: **the volume-down key can also act as Ctrl**. You can therefore hold the phone's volume-down key and press `b`, release it, and press `d`.

Termux officially uses Volume Down as the Ctrl modifier. This can sometimes be more convenient than the on-screen Ctrl key.

### 3. Simplify Phone Login to `ssh wsl`

Currently, we need:

```bash
ssh <WSL_USER>@<LAN_IP>
```

to log in, which is somewhat inconvenient. We can simplify it.

Create a configuration file **locally in Termux on the phone**:

```bash
nano ~/.ssh/config
```

Write:

```bash
Host wsl
    HostName <LAN_IP>
    User <WSL_USER>
    IdentityFile ~/.ssh/id_ed25519
```

Press Ctrl+O to save, confirm the filename and press Enter, then press Ctrl+X to exit.

Check it:

```bash
ssh -G wsl | grep -E 'hostname|user|identityfile'
```

Ideally, you should see something like:

```bash
user <WSL_USER>
hostname <LAN_IP>
identityfile ~/.ssh/id_ed25519
```

After saving, test:

```bash
ssh wsl
```

You should enter WSL directly without a password.

To view all Agent sessions:

```bash
tmux ls
```

Enter Epsilon:

```bash
tmux attach -t epsilon
```

If you run multiple projects at the same time, you can naturally use:

```bash
epsilon    → Codex: Epsilon project
snake      → Codex: Snake game project
rag        → Claude Code: rag project
review     → Codex: Dianping review project
```

For example:

```bash
tmux new -s snake
tmux new -s rag
```

The phone has effectively become your remote Agent console.

### 4. Take Over a Project with One Command

Here we use the project named epsilon as an example.

View the `.bashrc` file in Termux on the phone:

```bash
nano ~/.bashrc
```

Add:

```bash
alias epsilon='ssh -t wsl "tmux new-session -A -s epsilon"'
```

Then apply the file:

```bash
source ~/.bashrc
```

After that, when opening Termux on the phone, you only need to enter:

```bash
epsilon
```

and the flow is:

```
Termux on the phone
    ↓
SSH into WSL
    ↓
Find the epsilon tmux session
    ↓
Exists → attach
Does not exist → create
    ↓
Enter your development terminal
```

Note that it does not start Codex automatically. If Codex was already running in the epsilon session, it is restored directly.

### 5. Configure Tailscale: Connect Even When Devices Are Not on the Same LAN

#### 5.1 Download Tailscale on Windows

Official download: https://tailscale.com/download

After installation, a Tailscale icon appears in the Windows system tray. Click it, sign in with an account such as a Google account, or sign up if you have not used it before. The official Windows client is installed and signed in this way. Do not install anything inside WSL for now.

#### 5.2 Install Tailscale on Android

You can install it directly from Google Play. If your phone does not support GMS or you have not set up GMS, visit: https://dl.tailscale.com/stable/?#android

Find the `.apk` file and tap it to download.

#### 5.3 Connect

Android asks whether it is allowed to establish a VPN connection. Allow it.

Then sign in with the **exact same Tailscale account as the computer**.

Afterward, open Tailscale. You should see at least two devices, for example:

```
Devices

Your Windows
<WINDOWS_TAILSCALE_IP>

Your Android
100.yy.yy.yy
```

`<WINDOWS_TAILSCALE_IP>` is the private address assigned by Tailscale to the Windows device, not a public IP. For example: `100.102.101.22`.

This article only needs to actively connect to Windows, so remember the Windows Tailscale IP as `<WINDOWS_TAILSCALE_IP>`. There is no need to remember Android's own Tailscale IP.

Tailscale assigns a separate Tailscale IP to every device in the Tailnet, so Windows and Android have different addresses. When the phone SSHs into the computer, we use `<WINDOWS_TAILSCALE_IP>`.

The interface on the phone should look approximately like this:

![Tailscale on Android showing the connected Windows and Android devices](./assets/Android远程控制WSL2：用手机随时接管Agent/Tailscale连接（手机）.png)

The two device names shown on the computer should be exactly the same as those shown on the phone.

#### 5.4 Modify the Configuration

On the phone:

1. **Turn off Wi-Fi.**
2. Keep 4G/5G enabled.
3. Make sure the Tailscale app is connected.

Then open Termux and run:

```bash
ssh <WSL_USER>@<WINDOWS_TAILSCALE_IP>
```

The first time, you may see:

```bash
The authenticity of host '<WINDOWS_TAILSCALE_IP>' can't be established...
Are you sure you want to continue connecting?
```

Enter `yes`.

Because the SSH key was configured for the same WSL user, public-key authentication should still work in theory. Changing the Host address does not change `authorized_keys` in WSL.

If successful, you should see directly:

```
<WSL_USER>@<WINDOWS_USER>:~$
```

Success here means that the complete connection has been established:

```
Android 4G/5G
      │
      │ Tailscale encrypted network
      ▼
<WINDOWS_TAILSCALE_IP>
      │
   Windows
      │
 mirrored WSL
      ▼
WSL sshd :22
      │
     tmux
      │
    Codex
```

Now we only need to run:

```bash
nano ~/.ssh/config
```

Change:

```bash
Host wsl
    HostName <LAN_IP>
```

to:

```bash
Host wsl
    HostName <WINDOWS_TAILSCALE_IP>
```

From now on, whether connected to home Wi-Fi, school Wi-Fi, or mobile 4G/5G, the command is the same:

```
epsilon
```

`epsilon` reconnects to the tmux session named `epsilon`. If Codex was already running in it, the original Codex session is restored.

### 6. Three Small Optimizations

#### 6.1 Configure SSH KeepAlive

While using Termux, you may encounter:

```bash
Connection reset by peer
client_loop: send disconnect: Broken pipe
```

KeepAlive cannot solve every brief network interruption, but it can significantly improve SSH disconnections caused by long idle periods on mobile networks and NAT/VPN links.

In **Termux on the phone**:

```bash
nano ~/.ssh/config
```

Change the current configuration to:

```bash
Host wsl
    HostName <WINDOWS_TAILSCALE_IP>
    User <WSL_USER>
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30
    ServerAliveCountMax 3
    TCPKeepAlive yes
```

```bash
ServerAliveInterval 30
```

means that SSH sends a keepalive message to the server every 30 seconds.

```bash
ServerAliveCountMax 3
```

means that the connection is considered dead only after three consecutive unanswered messages.

Therefore, it takes about 90 seconds of disconnection to declare it dead, rather than disconnecting inexplicably because of an idle connection.

Save:

```bash
Ctrl+O → Enter → Ctrl+X
```

Then check the configuration actually read by SSH:

```bash
ssh -G wsl | grep -E 'hostname|user|serveralive|tcpkeepalive'
```

You should see something like:

```bash
user <WSL_USER>
hostname <WINDOWS_TAILSCALE_IP>
tcpkeepalive yes
serveralivecountmax 3
serveraliveinterval 30
```

Even if the network really disconnects, it does not matter because we still have:

```
SSH disconnects
   ↓
tmux is unaffected
   ↓
Enter epsilon again
   ↓
Codex resumes in place
```

This creates two layers of protection:

```
First layer: SSH KeepAlive → try to stay connected
Second layer: tmux          → the Agent is not lost even after disconnecting
```

#### 6.2 Enable Tailscale Run Unattended on Windows

This is also important. Otherwise, this may happen:

```
You are away
↓
Windows restarts
↓
No one has logged in to Windows yet
↓
Tailscale is not in the expected connectable state
↓
The phone cannot SSH
```

Tailscale for Windows provides **Run Unattended**, which keeps it connected as a system service without depending on the user's login session.

Find the Tailscale icon in the Windows system tray, right-click it or open its menu, and find:

```
Preferences
    ↓
Run unattended
```

Enable it.

You can also use PowerShell to check:

```powershell
tailscale status
```

You should see the Android and Windows devices.

#### 6.3 Create Shortcuts for Different Projects/Agents

The `epsilon` command is already very useful.

You can continue adding shortcuts to the phone's `~/.bashrc`:

```bash
alias epsilon='ssh -t wsl "tmux new-session -A -s epsilon"'
alias snake='ssh -t wsl "tmux new-session -A -s snake"'
```

Then open Termux on the phone and enter:

```
epsilon
```

to take over Epsilon, or:

```
snake
```

to take over the Snake game project.

## Phase 3: Explanation of the Principles
