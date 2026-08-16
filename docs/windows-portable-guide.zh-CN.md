# OpenGlance Windows Preview

[English](windows-portable-guide.md) | 简体中文

OpenGlance Windows 版目前通过未签名的自安装 ZIP 发布，不使用 Microsoft Store、MSI 或 MSIX，也不需要管理员权限。

由于可执行文件尚未进行 Authenticode 签名，Windows 可能显示未知发布者或 SmartScreen 警告。请只从 OpenGlance
官方下载页获取安装包并核对 SHA-256；不要为他人转发的文件绕过安全警告。

## 系统要求

- Windows 10 或 Windows 11；
- `git --version` 可以正常运行；
- 已经克隆到本机、准备由 OpenGlance 打开的 Git 仓库。

## 安装

1. 打开 `https://gitleaf.mangofuture.com/download?lang=zh-CN#windows`。
2. 下载 `OpenGlance-<version>-public-win32-x64.zip`。
3. 将 ZIP 的 SHA-256 与下载页公布的校验值进行比较。
4. 完全退出旧版 OpenGlance 或 Git Leaf。
5. 完整解压 ZIP，不要直接从压缩包预览中运行。
6. 打开 `OpenGlance-win32-x64` 并运行 `OpenGlance.exe`。
7. OpenGlance 会把完整 App 复制到 `%LOCALAPPDATA%\OpenGlance\app`，创建开始菜单快捷方式，然后从固定位置重新启动。
8. 选择一个本机 Git 仓库。

Electron App 必须保留完整目录，不要只复制 `OpenGlance.exe`。

## SmartScreen

如果 SmartScreen 显示未知发布者：

1. 再次确认文件来自官方下载页。
2. 核对 SHA-256。
3. 只有两项都匹配时才选择“更多信息”并继续。

如果下载来源或校验值不确定，请删除文件。

## 更新

正式公开构建会检查公开 stable 轨道。发现新版只会显示提示，不会自动下载。点击“更新”后才下载并准备，
退出或重启 App 后完成切换。

如果使用 Community Build，它不会连接 Mango Future 的更新服务；请自行拉取新源码并重新构建。

OpenPeek 2.x 或 Git Leaf 1.x 的固定安装升级到 OpenGlance 3.0 时，对应的兼容可执行文件会接收一次旧更新器
参数，把完整 App 迁移到 `%LOCALAPPDATA%\OpenGlance\app`。只有新可执行文件确认启动后，旧安装才会退出；
如果旧更新器仍占用文件，OpenGlance 会在下次启动时重试清理。

## Community Build

在 Node.js 22.13 或更高版本的源码 checkout 中运行：

```powershell
npm ci
npm run package:win
```

生成的包在技术字段中是 `source` distribution，界面显示“社区构建”，Windows CompanyName 是
`OpenGlance Community`。它不会使用官方更新服务，默认关闭使用统计，也不应被描述成 Mango Future 官方发行版。
完整步骤见英文技术文档 [Build from source](build-from-source.md)。

## Deep Link

OpenGlance 从固定安装目录注册 `openglance://`：

```powershell
Start-Process 'openglance://open'
Start-Process 'openglance://open?repo=C%3A%5CUsers%5Cexample%5CProjects%5Copenglance-guide-demo&path=README.md'
```

已有 `git-leaf://` 链接继续作为 1.x 兼容入口；OpenGlance 新生成的链接只使用 `openglance://`。

这里的 `repo` 是 URL 编码后的本机仓库路径，`path` 是仓库相对的 Markdown／MDX 路径。公开 HTTPS
分享链接使用 GitHub `owner/repo` 身份，不传输接收者的本机路径或文档正文。HTTPS 中转由 Mango Future
托管；精确元数据见[托管 `/open` 与 `/share` 链接](hosted-links.zh-CN.md)。

## 卸载

1. 完全退出 OpenGlance。
2. 从开始菜单删除 OpenGlance 快捷方式。
3. 删除 `%LOCALAPPDATA%\OpenGlance\app`。
4. 只有在明确不再需要仓库列表、工作台会话和个人设置时，才删除稳定 Profile
   `%APPDATA%\git-leaf`。

卸载 App 不会删除用户选择的 Git 仓库。

## 故障排查

- “找不到 Git”：确认同一 Windows 账号下的终端能够运行 `git --version`。
- App 从解压目录反复启动：确认 ZIP 已完整解压，并允许 App 写入 `%LOCALAPPDATA%\OpenGlance`。
- 更新提示重复出现：完全退出所有 OpenGlance 进程，再从开始菜单启动。
- 校验值不一致：立即删除文件并重新从官方下载页获取。
