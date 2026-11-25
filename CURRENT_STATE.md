# 2026-11-25 · 精致微缩生态版（v0.2.0）

交互入口为 `play.cmd`，免 Blender 试玩包发布于 GitHub Releases。启动和操作见 [README](README.md)。

- **环境校验**：Windows x64、RAEA 0.1.9、Blender 5.2.1。便携版引擎通过官方 SHA-256 校验。
- **画面与渲染升级**：移除屏幕空间折射接缝与重影，改为宝石翠绿（白昼）/ 靛青蓝金（暮色）自定义 WESL 水面（含聚簇液态波光、四角星芒、水底焦散、船头油灯暖晕与搏斗水花尾浪）；启用 AgX ToneMapping、SSAO 接触阴影、Bloom、DepthOfField 景深、Grade 调色与 4096 级阴影贴图。
- **资产与生态升级**：拆分木漆/黄铜/湿鱼鳞/毛绒/河石/玻璃等多套 PBR 材质；新增红白条纹木船、红尖船桨、围巾渔夫、仰泳水獭、管状珊瑚、紫海胆、褶皱海白菜、橙白锦鲤群与大号斑点鳐鱼。
- **动画与交互升级**：引入 `rowBlend`/`rodBlend`/`holdBlend`/`oarPhase` 连续通道与统一双臂 2-Bone IK，实现起桨/收桨/起竿/抱鱼全程无硬切衔接；新增水中 S 形鱼类搏斗轨迹、破水高跃、紧随鱼身的环形收线精力条与二阶阻尼镜头。
- **全中文 UI 与原创配乐**：重设计宣纸手账风全中文鱼获博物卡、鱼获图鉴（`J` 键）、开场标题与淡入淡出；新增 Karplus-Strong 尼龙原声吉他 + 电钢 + 卡林巴琴 F 大调湖畔 BGM 及同调鱼获音效。
- **自动化验收**：`node --experimental-strip-types tests/game.test.mjs` 全量通过；`raea scene stage demo.tsx` 全 750 帧 `0 errors, 0 warns, 0 notes`；完整导出 25 秒 1280×720 30fps `output/Slackwater.mp4`（平均响度 `-16.9 dB`，峰值 `-1.2 dB`）。
