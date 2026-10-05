我将继续执行该任务。首先让我读取上传的指令文件并检查工作区状态。
工作区已被重置。让我检查现有文件，然后克隆仓库。
工作区已重置，需要重新克隆仓库。让我开始执行任务计划。
仓库克隆成功，main 分支干净。现在查看仓库结构并阅读核心文档。
现在阅读核心文档。
PAD 文档较大，让我读取其关键部分（最新修订记录）和其他文档。
现在让我阅读 `worklog` 并检查环境状态。
环境已重置（无 `.env`、无 `db/`、无 `node_modules`）。让我先读取 worklog 最新条目和 SKILL.md，然后重建环境。
现在让我并行进行：安装依赖、阅读 SKILL.md、检查 session-18 的代码变更。
环境中有 ambient `DATABASE_URL` 劫持（正如文档所述），npm scripts 的 `env -u` 防护会处理它。现在检查 bun install 进度并审查 session-18 代码变更。
环境已就绪，95/95 单元测试通过。现在运行其余基线门禁。
Build 通过，路由表与文档一致。现在运行 e2e 测试套件，同时审查 session-18 代码变更。
Session-18 代码变更与文档描述一致。检查 e2e 测试进度。
**基线全部通过**：lint 0 / tsc clean / 95 单元 / build OK / 43 e2e — 与 session-18 文档状态完全一致。现在查看技能目录。
现在克隆 scandihaven 参考仓库并运行安全审计。
Scandihaven 已克隆。bun audit 显示与文档一致的 2 个已知 dev-tooling 通告。现在快速审查 scandihaven 的架构文档。
Scandihaven 架构已审查（同技术栈模式：Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright）。现在启动 dev server 并派出全新视角审计子代理。
开发服务器（Dev server）健康。现在派出只读审计子代理（任务 20-a），同时我自己运行线上一致性（live parity）探测。
子代理发现 1 个 Low 级问题 + 3 个 Info。按代码库规范，我需要亲自重新验证每个关键发现。
A20-F1 已确认：第 148-151 行的 malformed payload 测试确实没有 XFF 头。现在验证 A20-F2。
A20-F1 和 A20-F2 均已确认。现在运行 live parity 探测（操作者最关心的部分）—— 使用 agent-browser 对比参考站与本站。
agent-browser 已安装。现在运行桌面端一致性探测 —— 先测参考站。
SPA 需要时间渲染，等待后重新测量。
参考站稳定在 7229px（session-18 记录为 7490px — 参考站可能有细微变化）。现在测量本地克隆站。
克隆站与当前参考站相差 21px（7229 vs 7208）。让我逐 section 对比找出差异来源。
全部差异集中在 hero 区（643.2 vs 621.4，差 21.8px），其余 7 个 section 完全一致。深入 hero 内部定位差异。
发现问题：viewport 实际是 1280×577（--viewport 参数在重新打开时未生效）。让我正确设置视口后重新测量。
视口修正后克隆站测量为 **7490px**（与文档记录的 parity 高度完全一致）。现在重新测量参考站。
**Parity 确认**：两站均为 7490px，h2/h3 完全一致。之前 7229/7208 是视口错误导致。现在测试操作者最关心的**移动端导航菜单**（390×844）。
参考站移动菜单行为全部符合文档记录。现在测试克隆站移动菜单。
克隆站面板几何完全一致（192×148 @ (178,80)，grid）。验证颜色、链接与点击行为。
**移动导航确认工作正常 —— 与参考站 byte-exact 一致**（面板 192×148 @ (178,80)、grid、r24、p8、oklab 等效颜色、链接点击后关闭+跳转 0.421875 完全相同）。

现在验证完整产品闭环（登录 → dashboard → 表单 POST → PATCH 状态转换）。
完整产品闭环全部通过。验证 dashboard 反映该行与 role="status" live region。
Dashboard 正确显示 probe 行（已完成徽章 + role="status"）。现在清除探测行并重建真实种子数据（A20-F3）。先写修复计划。

基于审计结果，让我先制定 session-20 修复计划。
A20-F4 确认。检查所有活文档中对 vitest.config.ts 的引用。
让我检查之前会话保留的种子行样式，用于 A20-F3 的重建。
现在读取 auth.spec.ts 剩余部分以完整理解测试顺序与键分布。
现在所有信息已齐备，编写 session-20 修复计划。
修复计划已保存。现在按 TDD 执行。**Phase 1 — Red 证据**：11 个连续无 XFF 的登录 POST 验证共享桶污染。
**RED 已确认**：第 11 次请求收到 429 —— 实证了共享 "unknown" 桶可被无 XFF 请求耗尽。现在 **Phase 2 — Green**：为 auth.spec.ts 添加 MALFORMED_KEY。
现在执行结构化验收：检查所有 spec 文件中不再存在无 XFF 的请求级 POST/PATCH。
让我更精确地核对每个请求站点。
请求级站点全部覆盖。现在验证浏览器驱动请求的路由注册站点。
所有浏览器驱动站点均正确注入密钥或中止。**F1 Green 完成**。现在 **Phase 3 — Vitest 配置现代化**（F4）。
95/95 通过且无弃用警告。更新两处活文档引用。
**Phase 4 — README 残留修复**（F2）。
F2 完成。**Phase 5 — 种子数据重建**（F3）。先查看可用的专科列表。
脚本在仓库外无法解析模块。将清除部分改为仓库内临时脚本执行。
Now update the restore script to remove the purge step (already done) and run the inserts.
种子数据已恢复（2 confirmed / 2 new / 2 completed，PATCH 写入同时作为 live probe）。现在 **阶段 6 — 完整验证门禁**。
43/43 (第 1 次运行)。现在进行双次运行验证（连续第二次运行）。
**双次运行验证通过**：43/43 × 2。现在重启 dev server 并在修复后的代码上重新验证 parity 与产品闭环。
修复后的树上的移动端导航：192×148 @ (178,80)、grid、r24、p8、点击关闭+跳转 0.421875 —— 与参考站 byte-exact 一致。验证 dashboard 最终状态。
验证状态计数来源（确保无异常）。
状态计数正常（badge + RSC flight 数据 + 统计标签）。验证门禁全部通过。现在 **阶段 7 — 截图重捕获**。编写 Playwright 截图脚本。
按钮名称不匹配。检查实际的表单按钮标签。
全部 20 张截图已捕获，`03-desktop-full.png` 正好是 **1440×7490**（parity 高度）。清除捕获产生的行并检查 dev.log。
数据库 6 行、dev.log 零错误。现在 **阶段 8 — 文档更新**。先查看 SKILL.md 与 PAD 的修订结构。
现在更新 SKILL.md → v2.8.1。
Now add the Session 20 entry to Appendix B (Validation History).
SKILL.md v2.8.1 完成。现在添加 PAD `[S20]` 修订块。
PAD 修订完成。现在编写 session 日志 `docs/session_20.md`。
现在追加 worklog 条目。先检查子代理写入的工作区 worklog。
子代理条目完好。现在向仓库 worklog.md 追加 orchestrator 的 Task 20 条目。
Worklog 完成。最终检查：git 变更集 + 秘密扫描 + 完整门禁复核。
最终门禁全绿。现在阅读 SSH push runbook 并准备提交。
Runbook 已理解。检查 ssh 二进制与 paramiko 可用性。
Python 版本不匹配（venv 3.12 与 pip 3.13）。修正安装目标。
paramiko 就绪。部署 paramiko ssh shim（附录 A）到仓库外的 workspace bin 目录。
Shim 部署完成。现在停止 dev server，写入操作者密钥并提交。
提交 `035e97b` 完成。现在通过 SSH wrapper 执行 dry-run 推送。
Dry-run 通过（fast-forward af5b493..035e97b）。执行真实推送。
**推送成功并验证**：远程 main @ 035e97b == 本地 HEAD，密钥已销毁，工作树干净。更新工作区 worklog 完成条目。
✅ **Session 20 complete and pushed** — commit `035e97b` on `main`, remote-verified via the SSH wrapper, operator key shredded.

**What this session delivered:**

- **Workspace re-bootstrapped** from reset (clone, install, `.env` with `DATABASE_URL="file:../db/custom.db"`, `db/` at repo root, seed) — baseline gates matched the documented session-18 state exactly (lint 0 / tsc / 95 unit / build / 43 e2e)
- **Audit (fresh-eyes sub-agent + my re-verification):** 4 findings, zero regressions. The standout: the "unknown limiter bucket never touched" claim was still one request short of literal — auth.spec's malformed-payload POST carried no XFF key (11-run flake horizon). I **proved it empirically** (10 XFF-less POSTs → 422×10, the 11th → 429), then fixed it TDD-first — a structural grep now proves every request in the suite carries a per-run key, and a **double-run proof (43/43 × 2)** confirms determinism
- **Mobile navigation re-verified byte-exact** against the live reference (panel 192×148 @ (178,80), link-click lands `#services` at 0.421875 on both sites); parity height 7490px on both at a verified viewport
- Plus: `vitest.config.mts` modernization (warning-free tests), README residuals fixed, 6 realistic dashboard rows restored, 20 screenshots refreshed, docs aligned (SKILL v2.8.1, PAD [S20])

**Suggested next steps:** run `bun run test:e2e` twice back-to-back to watch the determinism guarantee hold, or review the dashboard status flow. Natural next session: dashboard filtering/search or CSV export (recorded in the session log).
