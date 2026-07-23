# OpenSCAD 项目工作区规范

> 本文件首先写给接手此目录的下一个 Agent。开始任何建模、导出、归档或 Git 操作前，必须完整阅读并遵守本文件。

`CURRENT_PROJECT: jetson-orin-nano-super-case`

## 根目录结构

根目录的业务内容只分为以下四个文件夹和本 README：

```text
current_stl/          当前项目的最新 STL 导出文件
historical_stl/       已结束或已切换项目的 STL 归档
project_files/        每个项目的源码、资料和过程文件
model_viewer/         本地实时 3D 查看、自动刷新与模型导出工具
README.md             全工作区规则与当前项目指针
```

`.git/`、`.gitignore` 和 `.gitattributes` 是版本控制基础设施，不属于业务目录。

### 1. `current_stl/`

- 只能存放 `CURRENT_PROJECT` 的最新 `.stl` 文件。
- 不允许放 SCAD、STEP、PNG、PDF、ZIP、说明文档或临时文件。
- 同一零件更新设计时必须覆盖原文件名，不创建 `v2`、`final`、`final-final`、日期副本等文件。
- 旧版 STL 由 Git 提交历史保存，不在文件系统中保留重复副本。

### 2. `historical_stl/`

- 每个历史项目使用一个独立子文件夹：`historical_stl/<project-slug>/`。
- 每个项目子文件夹内只能存放该项目最后一次归档的 `.stl` 文件。
- 不允许把源码、图片、资料或日志放入历史 STL 子文件夹。
- 项目内部的旧设计版本仍由 Git 历史保存，不创建多套 STL 副本。

### 3. `project_files/`

- 每个项目使用一个独立子文件夹：`project_files/<project-slug>/`。
- 推荐内部结构：

```text
source/               可编辑源文件，例如 SCAD
references/           尺寸资料、官方模型和来源清单
process/              预览、测量、渲染和中间过程
README.md              项目说明
CHANGELOG.md           人类可读的改动记录
```

- 这里不存放最终导出的 STL；当前 STL 放在 `current_stl/`，历史最终 STL 放在 `historical_stl/<project-slug>/`。
- 大型厂商原始资料放入 `references/vendor/`。该目录默认不提交 Git，必须用 `SOURCES.md` 记录官方下载地址和用途。
- 可再生成的临时分析文件放入 `process/research_tmp/`，默认不提交 Git。

### 文件命名

- 项目文件夹使用能明确区分项目的完整 slug，但项目内部文件名必须简短，不要在每个文件名中重复项目 slug。
- 单一外壳项目优先使用 `case.scad`、`case.stl`、`assembly.png`、`rear.png`、`print.png` 等短名。
- 只有同时存在多个独立输出零件时才增加必要限定词，例如 `base.stl`、`lid.stl`；不得堆叠冗长设备全名。
- 已被查看器、脚本或 Git 历史引用的现有长文件名不为纯改名而立即破坏；在新项目或下一次明确的路径重构时统一采用短名并同步全部引用。

### 4. `model_viewer/`

- 根部只放面向用户的两个入口：`index.html` 和 `open-in-safari.command`；查看器的脚本、样式、配置、构建文件和本机辅助程序全部放入 `model_viewer/app/`。
- 默认读取 `current_stl/`，其次读取 `historical_stl/<project-slug>/`。`current_stl/` 表示当前项目，不再等同于“正在制作”；当前项目阶段由 `model_viewer/app/config.json` 的 `projectStatus` 决定，历史文件固定显示“制作完成”。
- 当前模型文件被同名覆盖后，查看器必须自动重新加载，不得依赖版本号文件名。
- `model_viewer/app/config.json` 记录当前项目阶段、SCAD 源码、输出 STL 和 OpenSCAD `-D` 参数。`projectStatus` 仅允许使用 `working` 或 `completed`；切换项目、开始修改、完成定稿或调整输出零件时必须同步更新。
- Safari 完整模式通过与 HTML 并列的 `model_viewer/open-in-safari.command` 启动，只监听本机回环地址；使用 macOS 原生目录选择器完成 U 盘或外置硬盘导出。
- 直接打开 `index.html` 时，Chrome 可使用浏览器目录读写接口；Safari/Firefox 只能使用兼容读取和普通下载。
- 支持的查看格式至少包括 STL 与 3MF；当前实现还支持 OBJ、PLY、AMF 和 GLB。
- `node_modules/` 不提交 Git；必须提交离线可运行的 `viewer.bundle.js`、防止浏览器复用旧 bundle 的 `loader.js`、依赖锁文件和源代码。

## 接到“开新项目”请求时

必须按以下顺序执行：

1. 从本文件读取 `CURRENT_PROJECT`。
2. 检查 `current_stl/` 中只有当前项目的 STL。
3. 创建 `historical_stl/<旧项目 slug>/`；若目录已存在，先检查内容并避免覆盖，不能擅自删除。
4. 将 `current_stl/` 中全部 STL **移动**到该历史项目子文件夹，不复制。
5. 在 `project_files/<新项目 slug>/` 创建源码、资料和过程目录。
6. 把本文件的 `CURRENT_PROJECT` 更新为新项目 slug。
7. 更新 `model_viewer/app/config.json`，把 `projectStatus` 设为 `working`，并使自动导出指向新项目源码和固定 STL 文件名。
8. 完成新项目首个可用版本后，将最新 STL 导出到 `current_stl/`。
9. 在 Safari 完整模式或 Chrome 中确认查看器默认打开新项目且项目阶段为“正在制作”。
10. 更新项目 `CHANGELOG.md`，然后创建一次聚焦的 Git 提交。

如果当前项目还没有任何 STL，仍应创建其项目资料目录和变更记录，但无需创建空的历史项目子文件夹。

## 更新当前项目设计时

1. 开始修改前把 `model_viewer/app/config.json` 的 `projectStatus` 设为 `working`，然后只编辑 `project_files/<CURRENT_PROJECT>/source/` 中的源文件。
2. 先生成预览并检查尺寸、装配间隙和流形状态。
3. 使用固定文件名和 OpenSCAD `--export-format binstl` 覆盖 `current_stl/` 中对应 STL，避免自动导出退回体积更大、兼容性较差的 ASCII STL。
4. 在项目 `CHANGELOG.md` 中记录变更原因、尺寸变化和验证结果。
5. 完成验证并确认定稿后，把 `projectStatus` 设为 `completed`；若仍需修改则保持 `working`。
6. 用 `git diff --stat`、`git status --short` 检查范围。
7. 提交源码、改动记录、必要预览和同名更新后的 STL。

使用 Safari 完整模式时，保存 SCAD 后会自动按 `model_viewer/app/config.json` 重新导出；必须观察页面状态栏并确认导出完成。直接打开 HTML 时，页面只能自动刷新已被 OpenSCAD 或命令行覆盖的 STL，不能自行启动系统程序。

禁止用文件名承担版本管理；版本号、日期、原因和旧文件内容都交给 Git。

## Git 与 GitHub 工作流

Git/GitHub 可以实现“工作区只显示最新版、旧版只存在历史记录”的目标：同名 STL 每次覆盖后提交，旧内容仍可从旧 commit 或 tag 恢复，不需要保留多个可见 STL 文件。

- STL 在 `.gitattributes` 中标记为二进制，避免生成无意义的大段文本差异。
- 每次提交必须描述实际设计变化，例如：
  - `feat(jetson-case): enlarge fan opening`
  - `fix(jetson-case): correct mounting-hole clearance`
  - `archive(jetson-case): move completed STL set to history`
- 可打印里程碑使用 Git tag，例如 `jetson-case-v1.0.0`。
- GitHub Release 可附加 STL 供下载，但不应在工作树中再创建一套带版本号的 STL。
- GitHub 单文件硬限制为 100 MB。大型官方 CAD、Allegro 数据和解压资料不得直接普通提交；优先记录来源并忽略本地 vendor 文件。确有需要时，再经用户同意安装并使用 Git LFS。
- 创建 GitHub 仓库或首次推送前，必须向用户确认仓库名称及 `private/public`，不得自行假定公开性。
- 获得确认后可设置 `origin`、推送默认分支，并在后续按分支/提交/PR 工作流更新。

## 当前项目

- 项目 slug：`jetson-orin-nano-super-case`
- 源码：`project_files/jetson-orin-nano-super-case/source/`
- 项目说明：`project_files/jetson-orin-nano-super-case/README.md`
- 当前打印文件：`current_stl/`
- 实时查看器：`model_viewer/index.html`
- Safari 完整模式：`model_viewer/open-in-safari.command`

## 本机 OpenSCAD

原生 Apple Silicon 命令：

```bash
arch -arm64 /Applications/Utilities/OpenSCAD.app/Contents/MacOS/OpenSCAD
```

在 Codex 沙盒中，Qt 读取 CPU NEON 特性可能被限制；渲染时可按权限流程在沙盒外运行上述固定 OpenSCAD 命令。不得退回依赖 Rosetta 的长期方案。
