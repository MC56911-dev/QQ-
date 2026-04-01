# 海报字体网站（桌面包）

这个文件夹包含：
- 网站源码：`index.html`、`sketch.js`、`layout.js`、`style.css`
- 字体资源：`fonts/`（含 `flor-de-ruina` 与 `ouvrieres`）
- 本地预览入口：`本地预览.webloc`
- 一键启动脚本：`启动预览.command`

## 如何预览

方式 1（推荐）
1. 双击 `启动预览.command`
2. 浏览器会自动打开 `http://127.0.0.1:8890/`

方式 2（手动）
1. 打开终端，进入此文件夹
2. 运行：`python3 -m http.server 8890`
3. 打开：`http://127.0.0.1:8890/`
