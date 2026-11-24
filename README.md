# Slackwater Fishing · 浅水钓鱼

一款用 RAEA、React 和 TypeScript 制作的 Windows 桌面钓鱼游戏。划船穿过浅水，选好位置抛竿，等红漂下沉再收线。船、渔夫、鱼、水草、湖底和声音均由仓库中的脚本生成。互动游戏和 25 秒演示共用一套钓鱼规则。

## 启动

Windows 10 或 11 x64、兼容 DirectX 12 或 Vulkan 的显卡。本项目使用 Blender 5.2 生成素材。在项目目录双击 **play.cmd**。首次启动会下载并校验固定版本的 RAEA，在后台启动 Blender 生成素材，随后打开游戏窗口。后续启动复用这些文件。若 Blender 安装在自定义位置，可以运行：

```powershell
.\tools\run.ps1 -Blender 'D:\Tools\Blender\blender.exe'
```

| 操作 | 按键 |
| --- | --- |
| 前进和后退 | ↑ / ↓ 或 W / S |
| 转向，调整抛竿方向 | ← / → 或 A / D |
| 抛竿 | 按住空格蓄力，松开抛出 |
| 提竿、收线 | 等红漂下沉、亮圈出现，再按住空格直到鱼跃进船中 |
| 提前收回鱼线 | X |
| 查看或收起按键说明 | H |

日间主要遇到 Reed Perch，傍晚主要遇到 Lantern Carp。过早提竿、错过咬钩和长时间松线都有相应反馈。鱼获计数保留在本次游玩中。

## 演示与验证

```powershell
.\play.cmd -Demo
.\tools\run.ps1 -PrepareOnly
node --experimental-strip-types tests/game.test.mjs
.\.local\raea\bin\raea.exe render demo.tsx -o output/Slackwater.mp4
```

逻辑测试使用 Node 24。若手动导出视频，先创建 `output` 目录。`game.tsx` 是交互入口，`demo.tsx` 是演示入口。`src/game.ts` 定义输入、鱼种、时间和鱼获，`src/world.tsx` 负责角色、鱼线和镜头。`shaders/lagoon.wesl` 负责水色、亮纹和尾流。`tools/build_media.py` 在 Blender 中构建模型与贴图，并合成声音。

## 致谢

游戏的视觉灵感来自 Shane（shinyobjectz）的《Slackwater》。[演示作品](https://media.raea.io/#slackwater) · [RAEA 引擎](https://github.com/shinyobjectz/raea) · [水面渲染指南](https://github.com/shinyobjectz/raea/blob/main/sdk/guides/craft/bevy/water.md)
