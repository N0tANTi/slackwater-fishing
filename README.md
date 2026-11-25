# Slackwater Fishing · 浅水垂钓

一款用 **RAEA、React、TypeScript 和 Blender** 制作的 Windows 桌面浅水垂钓游戏。划着红白小木船穿行在宝石翠绿的浅湾间，伴着仰泳水獭、斑点鳐鱼与闲适湖畔原声吉他 BGM，选好位置抛竿，等红漂下沉、环形精力条亮起再拉鱼跃入船中。船只、围巾渔夫、珊瑚海胆、鱼群、水面着色器、湖底与原创配乐均由仓库脚本程序化生成。

## 快速试玩（免装 Blender）

1. 前往 [Releases 最新试玩版](https://github.com/N0tANTi/slackwater-fishing/releases/latest) 下载 `Slackwater-Fishing-v0.2.0-win-x64.zip`（内置已生成的 3D 模型与原声 BGM，无需安装 Blender）。
2. 解压后双击 **play.cmd**（Windows 10/11 x64，支持 DirectX 12 或 Vulkan 显卡）。首次启动会自动下载并校验固定版本的 RAEA 引擎，随后直接进入游戏。

## 从源码构建与启动

若直接克隆源码仓库，需安装 **Blender 5.2** 用于首次后台生成模型与音频。在项目目录双击 **play.cmd**，或指定自定义 Blender 路径：

```powershell
.\tools\run.ps1 -Blender 'D:\Tools\Blender\blender.exe'
```

| 操作 | 按键 |
| --- | --- |
| 前进和后退（自动展开双桨并双手划船） | ↑ / ↓ 或 W / S |
| 转向，调整抛竿方向 | ← / → 或 A / D |
| 抛竿（平滑收桨起竿） | 按住空格蓄力，松开抛出 |
| 提竿、收线 | 等红漂下沉、感叹号亮起，再按住空格填满环形进度条直到鱼跃入船中 |
| 提前收回鱼线 | X |
| 查看或收起鱼获图鉴 | J 或 Tab |
| 查看或收起中文按键说明 | H |

白昼浅湾主要遇到「芦苇鲈」，暮金油灯点亮时分主要遇到「灯笼鲤」。过早提竿、错过咬钩和鱼线松弛都有中文反馈，破纪录会盖上「新纪录」印章并收录进本次图鉴中。

## 演示与验证

```powershell
.\play.cmd -Demo
.\tools\run.ps1 -PrepareOnly
node --experimental-strip-types tests/game.test.mjs
.\.local\raea\bin\raea.exe render demo.tsx -o output/Slackwater.mp4 --quality high
```

逻辑测试使用 Node 24。`game.tsx` 是交互入口，`demo.tsx` 是 25 秒演示入口。`src/game.ts` 定义输入、平滑动画通道、鱼种与图鉴状态，`src/motion.ts` 负责二阶阻尼镜头、双臂 2-Bone IK 划桨/持竿衔接、鱼类水中搏斗轨迹与 3D→2D 投影，`src/world.tsx` 负责场景光照、后处理与角色，`src/hud.tsx` 为全中文手账风 UI 与环形收线进度条，`shaders/lagoon.wesl` 负责宝石翠绿/暮金靛青水面、聚簇波光、焦散与水花尾浪，`tools/build_media.py` 与 `tools/sound.py` 在 Blender 中构建全部多材质模型与原创湖畔 BGM。

## 致谢

游戏的视觉灵感来自 Shane（shinyobjectz）的《Slackwater》。[演示作品](https://media.raea.io/#slackwater) · [RAEA 引擎](https://github.com/shinyobjectz/raea) · [水面渲染指南](https://github.com/shinyobjectz/raea/blob/main/sdk/guides/craft/bevy/water.md)
