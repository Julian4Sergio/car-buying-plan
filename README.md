# 广州家庭纯电 SUV 购车决策站

这是一个面向广州家庭的纯电 SUV 只读决策站，用于集中查看候选车型、价格资料、试驾记录、家庭意见和购车进度。页面不收集、不提交任何用户信息。

## 本地查看

在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后访问 [http://localhost:8000](http://localhost:8000)。

## 数据文件

所有内容均由 `data/` 下的 JSON 文件提供：

- `profile.json`：家庭需求、预算、评分权重和最后复核日期。
- `vehicles.json`：候选车型、推荐版本、参数、风险和来源。
- `quotes.json`：车型推荐版本的价格与报价资料。
- `test-drives.json`：试驾记录。
- `family-notes.json`：家庭意见。
- `progress.json`：购车进度。

更新任何价格、车型或结论资料时，必须同步更新来源、查询日期和有效期；无法确认的事实应保留为待核实，不要猜测或补全。

请勿在仓库或数据文件中放入贷款资料、证件信息、联系方式或其他敏感个人资料。

## 发布到 GitHub Pages

先将站点实现分支合并到并推送至 GitHub 的 `main`，确认 `main` 根目录包含 `index.html`；再在 GitHub 仓库中依次打开：**Settings -> Pages -> Deploy from a branch -> main -> /(root)**，保存后等待 Pages 完成部署。

本项目目前没有后端，也没有构建步骤；静态文件可直接发布。
