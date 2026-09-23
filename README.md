# 鹈鹕骑自行车 · 六模式实测横评

同一道 Three.js 程序化建模题（鹈鹕骑自行车），在 **DSH 与 zcode** 两套 harness、**标准 / PTC / 计划**三种模式、**GLM-5.3 与 GLM-5.3-Flash** 两个模型下的实测横评。

**首页同屏直出 6 个真实产物**（iframe 隔离渲染、各 demo 自带操作面板在卡片视图下自动收纳、点 ⛶ 全屏恢复完整交互、滚出视口自动释放 GPU、懒加载可控），画廊下方依次为：

- **02 成本 × 耗时定位**：散点图（横轴实际费用、纵轴模型用时），越靠左下 = 越省钱、越快，悬停查看详情；
- **03 数据总表**：全指标对照，每行最优值绿色高亮；表下一行注明价格口径；
- **04 已知 Bug**：逐个实测后录入（当前为空，待补充）。

## 目录结构

```
pelican-benchmark-site/
├─ index.html                  # 首页（同屏 13 路画廊 + 成本×耗时散点 + 数据总表 + 已知 Bug 行）
├─ .nojekyll                   # 跳过 GitHub Pages 的 Jekyll 处理（必需保留）
├─ assets/
│  ├─ style.css                # 站点样式（暗色主题，零外部字体/图片）
│  ├─ data.js                  # 横评数据（13 项目全指标，改数据只动这里）
│  └─ app.js                   # 画廊控制 / 散点图与图例 / 数据表渲染逻辑
├─ vendor/                     # 本地化第三方库（离线可跑，不受 CDN 波动影响）
│  ├─ three-0.147.0.min.js
│  ├─ three-0.160.0.module.js
│  ├─ three-0.160.0-addons/controls/OrbitControls.js
│  ├─ three-0.161.0.module.js
│  ├─ three-0.165.0.module.min.js
│  ├─ three-0.165.0-addons/controls/OrbitControls.js
│  ├─ three-0.170.0.module.js
│  └─ three-0.170.0-addons/controls/OrbitControls.js
└─ demos/                      # 13 个原始交付物（未改场景代码，仅本地化依赖）
   ├─ dsh-standard-glm5f.html  # 原 测试用例-标准-glm5f/pelican-rider.html（GLM-5.3-Flash）
   ├─ dsh-ptc-glm5f.html       # 原 测试用例-PTC-glm5f/index.html（GLM-5.3-Flash）
   ├─ zcode-standard-glm5.html # 原 测试用例-zcode-glm5/index.html（GLM-5.3）
   ├─ zcode-standard-glm5f.html# 原 测试用例-zcode-glm5f/鹈鹕骑自行车.html（GLM-5.3-Flash）
   ├─ zcode-plan-glm5.html     # 原 测试用例-zcode计划-glm5/index.html（GLM-5.3，three 全内联）
   ├─ zcode-plan-glm5f.html    # 原 测试用例-zcode计划-glm5f/index.html（GLM-5.3-Flash）
   ├─ dsh-standard-mimo26f.html# 原 测试用例-标准-mimo26f/index.html（MiMo-V2.6-Flash）
   ├─ dsh-ptc-mimo26f.html     # 原 测试用例-PTC-mimo26f/index.html（MiMo-V2.6-Flash）
   ├─ zcode-standard-mimo26f.html # 原 测试用例-zcode-mimo26f/鹈鹕骑自行车.html（MiMo-V2.6-Flash）
   ├─ dsh-ptc-s5.html          # 原 测试用例-PTC-s5/index.html（step 5）
   ├─ zcode-standard-mimo26p.html # 原 测试用例-zcode-mimo26p/index.html（MiMo-V2.6-Pro）
   ├─ dsh-standard-mimo26p.html# 原 测试用例-标准-mimo26p/index.html（MiMo-V2.6-Pro）
   └─ dsh-standard-s5.html     # 原 测试用例-标准-s5/index.html（step 5）
```

## 本地预览

ES Module 的 importmap 不支持 `file://` 直开，**必须走 HTTP**（任选其一）：

```bash
# 方式一：Python
python -m http.server 8080
# 方式二：Node
npx serve .
```

然后浏览器打开 <http://localhost:8080>。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个**公开**仓库（如 `pelican-benchmark`，不要勾选任何初始化选项）；
2. 在本目录执行：

```bash
git init
git add -A
git commit -m "init: 鹈鹕六模式横评站"
git branch -M main
git remote add origin https://github.com/<你的用户名>/pelican-benchmark.git
git push -u origin main
```

3. 打开仓库页面 → **Settings → Pages → Build and deployment**：
   - Source 选 **Deploy from a branch**；
   - Branch 选 **main** / **/(root)** → Save；
4. 等待 1–2 分钟，访问 `https://<你的用户名>.github.io/pelican-benchmark/`。

> 有 `gh` CLI 的话，第 1、2 步可合并为一条：`gh repo create pelican-benchmark --public --source=. --push`

## 说明

- 站点内全部资源均为**相对路径**引用，适配 `github.io/<仓库名>/` 子路径托管，无需任何构建步骤。
- 5 个原本依赖 jsdelivr / unpkg / esm.sh CDN 的产物已改为加载 `vendor/` 内的本地 three.js（r160 / r165 / r170 与各产物原版本一一对应），部署后**完全离线可跑**，国内访问不再受 CDN 波动影响。
- `demos/` 内文件已重命名为 ASCII（原始文件为中文文件名，URL 会百分号编码），场景代码未做任何修改。
- 数据口径与计费方式见站点页末「口径说明」，源自《测试报告.md》。
