我将系统地继续这项工作。指令已更新——我现在需要查看 `docs/session_10.md`、`docs/remediation-plan-session10.md`、`worklog.md` 和 `docs/session_11.md`（项目已推进至第 11 次会话）。让我先制定我的任务计划并检查工作区状态。
The workspace has been reset — only the `download/` folder remains. I need to clone the repository fresh.
克隆成功 —— 当前在 `main` 分支，最新提交为 `d11c8a3 update session log`。现在我来读取核心文档。
现在让我阅读这五份核心文档。
Let me read the remaining key sections of the architecture document — especially Known Issues and the developer handbook.
现在让我阅读一下会话文档 —— session_10、remediation-plan-session10、worklog 和 session_11。
session_11.md is the operator's transcript paste of session 10's work — the current tree is the session-10 remediated state (`134b9c6`) plus the docs-only `d11c8a3`. Now let me read the repo worklog.
我现在对项目状态有了全面的了解。让我更新待办任务列表，并阅读 skills 目录以选择审计工具。
已识别出相关技能：`agent-browser`、`code-review-checklist`、`tdd`/`test-driven-development`、`clone-app-pat-pro`、`tailwind-patterns`。让我检查一下之前会话中使用的 code-review-and-audit 技能和 TDD 技能。
已理解审计技能 —— 我将使用 Native CLI Fallback Protocol（静态门控 + `bun audit` + 通过 `sub-agent` 进行全新视角审查），这与之前的会话保持一致。现在让我来验证环境状态。
Environment state: `.env` missing, `db/` missing, `node_modules` missing (sandbox reset), and the ambient `DATABASE_URL` hijack is **ACTIVE** again (`file:/home/z/my-project/db/custom.db` — the exact threat the `env -u` guards exist for). Let me set up the environment.
`.env.example` 与代码库匹配，且 `DATABASE_URL="file:../db/custom.db"` 已按照要求进行了配置。Vitest + Playwright 套件已经就位。现在让我来配置环境——安装依赖并创建 `.env`。
The heredoc un-escaped the `\$`. The dotenv gotcha requires the literal backslash in the file. Let me fix it:
`.env` is correct now (`\$Abcd1234` with literal backslash). Now push the DB schema and seed the staff account:
数据库已初始化 —— 写入操作已存入 `<repo>/db/custom.db`，尽管存在环境劫持（`env -u` 防护机制仍生效）。现在让我运行完整的基准验证门。
Build OK with the documented route table (4 static + 5 dynamic + `/_not-found`). Now the e2e suite:
**所有基准检查（Baseline gates）均通过（绿色）**：lint 0 / tsc clean / 76/76 unit / build（相同路由表）/ 37/37 e2e —— 完全与记录的 session-10 状态相符。现在进入审计阶段。让我运行安全扫描并检查最近的代码变更。
Security scans clean — same two known dev-tooling advisories (braces, deepmerge-ts) documented and accepted in prior sessions. Now let me review the session-10 code changes and dispatch a fresh-eyes audit.
现在我将派遣一个只读的全新视角审计 sub-agent（基于既定的 code-review-and-audit 方法论），同时启动 dev server 以进行实时对齐检测。
Dev server is up and healthy. Now dispatching the fresh-eyes audit sub-agent:
Excellent audit — 9 NEW findings, zero regressions of documented fixes. Per the repo doctrine, let me empirically verify the key findings myself before accepting them into the remediation plan. First, let me read the relevant code:
F-01 confirmed by code read — email has no max length. Let me verify it live:
**F-01 已在线确认** —— 60,000 字符的邮箱已被接受 (201) 并持久化。现在让我通过阅读 `readJsonBody` 的逻辑及其调用点来验证 F-02：
F-02 and F-09 confirmed by code read: `await readJsonBody(request)` sits outside any try/catch in both routes, and the login route duplicates the email regex inline. Let me reproduce F-02 live with a mid-body abort probe:
**F-02 CONFIRMED live** — mid-body abort produces an unhandled `ECONNRESET` framework error. Now let me verify the remaining findings by reading the implicated files:
F-03, F-04, F-05, F-07 all confirmed by code read. Let me complete verification with the dashboard page and seed script:
All 9 audit findings are now verified (2 live-probed, 7 code-read). Now for the live parity probes against the reference site. Let me read the agent-browser skill first:
Reference desktop parity confirmed: 7490px, h2 60px/63px, h3 20px, 7 ids, `<main>`, no date min. Now the mobile menu probe on the reference:
Reference panel contract confirmed: 192×148 @ (178,80), grid, r24, p8, rgba(38,74,57,.9), 3 links. Now the link-click behavior:
Reference: link click closes panel + `#services` at top 0.421875. Now the identical probe sequence on the local clone:
克隆桌面端与参考完全一致 (7490px)。现在进行克隆端的移动端菜单检测——操作员关注的关键点：
**Mobile menu: byte-exact parity** — panel 192×148 @ (178,80), grid, r24, p8, oklab-equivalent paint (documented v4 variance), and link-click lands `#services` at **0.421875 — identical to the reference to the pixel**. The operator's key concern is verified. Now the product loop (login → dashboard → form POST → row visible):
The 422 shows the specialty allowlist working (Cardiology isn't in the list — I should check the actual service names). But "Parity Loop Probe" appeared on the dashboard despite the 422 — let me check the DB state:
My probe script itself was redirected by the ambient `DATABASE_URL` hijack (Error 14 — the exact documented threat). Retrying with the `env -u` guard:
The 422 correctly rejected the invalid specialty (allowlist working). But the grep matched "Parity Loop Probe" without a persisted row — let me investigate:
该行从未被持久化（422 已完成它的工作），并且 `grep` 匹配到了短暂的 `stdout` 交错 —— DB 才是事实来源。让我检查一下有效的专科（specialties）并重新正确运行产品循环：
产品循环已验证：登录 200 → 仪表盘 200 → 表单 201 → 认证后的仪表盘上可见记录。让我重新探查 session-10 的修复以进行回归检查（分块 413、登录空主体 422）：
All session-10 fixes hold — zero regressions. Let me quickly check an odd reference I noticed in next.config.ts ("session-12 methodology finding"):
现在让我查看现有的测试文件，以匹配它们新测试的风格：
我现在已经完全验证了。让我来编写全面的整改计划：
整改计划已保存。现在开始执行 TDD —— **第一阶段（红色）**：针对电子邮件最大长度的失败测试：
第一阶段 Red 已就位。现在开始添加第二至四阶段的 Red 测试：
接下来是 `validation.test.ts` 中第三阶段（specialty type）和第四阶段（upcoming-visits floor）的 Red 测试：
现在进行第 4 阶段的 Red 测试 —— `upcomingVisitsFloor`。让我检查一下测试文件的末尾：
已添加所有 Red 测试。现在确认 Red 阶段 —— 新测试必须在实现前失败：
**已确认进入 Red 阶段** — 有 6 个新测试完全按预期失败。现在进入 **Green 阶段**。首先，`validation.ts` 中的 F1 + F7 + F9：
现在让我将 `preferredDate` 容差重构为使用共享的 floor helper 以实现真正的 DRY，并更新仪表盘页面：
现在更新仪表盘页面（F6）——使用导入的 `floor` 并移除现已未使用的 `todayIsoDate`：
现在是 `rate-limit.ts` 中的 F2 —— 传输错误容差：
Now Phase 5 — F4 (logout catch), F8 (seed exitCode), F9 (login route EMAIL_PATTERN import):
Now F9 — the login route imports the shared EMAIL_PATTERN:
现在让我运行单元测试套件，来验证阶段 1–5 的 Green：
**GREEN — 85/85**（76 + 9 个新增）。现在进入阶段 6 —— lint 门禁的真实性检查。让我重新启用高价值规则，看看会显现出什么：
重新启用的规则表明代码库确实很干净（exhaustive-deps、purity、no-explicit-any、no-unused-vars 中无报错）。显现出的问题有：(1) `no-undef` 在仅限 TS 的类型全局变量（`RequestInit`、`ScrollBehavior`）上存在误报——已记录在案禁用；(2) 2 个真实的 `no-html-link-for-pages` 错误，值得通过转换为 `next/link` 来修复；(3) 3 个 `<img>` 警告——这是特意保留的与原版一致的写法。让我来看看这两个锚点位置：
两个站点都已安全地转换为 `next/link`（渲染出的 HTML 相同，但使用了客户端导航 —— 已被 e2e 测试覆盖）。让我来执行转换：
两者都已完成转换。现在编写最终的 eslint.config.mjs，其中包含已启用的规则，并记录下故意禁用的规则：
One more genuine hit — the dashboard's "View site" anchor. Converting it too:
Now F5 — the `reactStrictMode` rationale comment:
Lint 检查均已通过 —— lint 0 / tsc clean / 85/85 unit。现在进行第 7 阶段 —— 登录限制器 e2e 测试。我来查看一下现有的认证测试用例（auth spec）：
Adding the login limiter 429 e2e pin (Phase 7):
One flake risk: my per-run key `203.0.113.${...}` could collide with the fixed keys `203.0.113.50/51` used by other specs in this file. Let me switch to a disjoint range:
Now Phase 8 — the full verification gate. Build first, then e2e:
**Full gate GREEN**: lint 0 / tsc / 85 unit / build identical routes / **38 e2e** (37+1). Now live re-probes — restart the dev server with remediated code:
F1 and F7 verified live. Now the F2 re-probe — mid-body abort must no longer produce an unhandled framework error:
**F2 fix verified** — no more unhandled `⨯ Error: aborted`; the route resolves cleanly. Let me verify the email boundary behavior live, then run the parity spot-checks:
边界已验证。现在对修复后的代码树进行最后的实时一致性抽查：
The probe had a sequencing bug (measured after panel close, clicked the Insurance link). Let me redo it properly:
**最终一致性验证**：面板字节完全一致（192×148 @ (178,80), grid, r24, p8, oklab 绘制），且 link-click 落点为 0.421875 —— 与参考完全相同。现在进入第 9 阶段 —— 清理 audit probe 行并准备用于截图的真实数据：
deleteMany 运行成功，但数组语法需要 createMany。正在修复：
Database is clean with 3 realistic rows. Now capturing the screenshot set:
The session-4 daemon-cwd trap — relative paths fail. Using absolute paths:
Desktop shots captured. Now mobile + legal pages:
Now the appointment form flow screenshots (09 form, 10 success, 14 field errors):
Now submit the form to capture the actual success state:
截图 14 捕获到了错误的状态（成功后表单已被替换）。让我检查一下表单的原生验证姿势，然后重新正确操作：
Let me check how the form renders field errors:
422 字段错误状态已正确渲染（invalidCount=1，显示提示）。现在登录并捕获仪表板截图：
所有 20 个截图已全部捕获。完整性检查 —— 验证尺寸和内容：
所有截图已验证 —— `03-desktop-full.png` 尺寸正好为 1440×7490（一致性高度）。现在进入第 10 阶段 —— 文档编写。首先更新会话日志：
现在更新仓库工作日志：
现在将 SKILL.md 更新至 v2.5.0。让我检查一下它的 frontmatter 和 session 附录结构：
Now append the Session 12 entry to Appendix B:
现在更新 PAD —— 修订块、测试计数、已知问题：
PAD 已更新。现在请更新 README、CLAUDE.md 和 AGENTS.md 中的计数：
Now CLAUDE.md updates:
CLAUDE.md done. Now AGENTS.md — the lint-gate disclosure and the updated seams description:
所有文档已更新。`.env.example` 无需更改（未引入新的环境变量 —— 已验证）。现在进行最后的提交前验证：
rg 标志解析失败——扫描并未实际运行。正在重新正确执行：
在 `\$Abcd1234` 的扫描中发现了匹配项 —— 让我检查一下具体的上下文，并从新的会话文档中清除具体的凭据值：
The credential value already exists throughout the repo's committed docs (operator's own prompt files, README, session logs) — so no NEW exposure. Still, let me scrub my two new files to generic descriptions as best practice:
sed 导致文本重复。正在妥善修复这两个文件：
现在让我阅读 SSH 推送运行手册和 wrapper 脚本：
Runbook understood. Let me check the push prerequisites (ssh binary, paramiko, wrapper integrity):
paramiko 5.0.0 installed. Now deploy the paramiko ssh shim outside the repo (per Appendix A):
已部署 Shim。现在停止 dev server 并在 main 上创建 commit：
Committed as `8b52c73` on main. Now the push sequence per the runbook — writing the operator key outside the repo with 0600:
Key verified (ed25519). Now the dry-run push:
Dry-run passed (fast-forward `d11c8a3..8b52c73`). Executing the real push:
**Push successful** — remote main @ `8b52c73` verified == local HEAD. Now shredding the operator key per the runbook:
全部已完成。让我整理一下工作区工作日志并进行收尾：
✅ **Session 12 complete and pushed** — commit `8b52c73` on `main`, remote-verified via the SSH wrapper, operator key shredded.

**What this session delivered:**

**Audit** (fresh-eyes sub-agent + orchestrator re-verification): the session-10 remediation held up perfectly — mobile menu parity is **byte-exact** (panel 192×148 @ (178,80); link-click lands at the identical pixel, 0.421875, on both sites). The audit found 9 NEW gaps: the email field was **unbounded** (a 60,012-char email persisted — proven live), transport errors (mid-body aborts) escaped as **unhandled framework errors** (proven live via raw socket), the "lint 0" gate ran with ~24 rules silently disabled, plus six smaller contract/robustness gaps.

**Remediation (all TDD — Red confirmed first):** email bounded at 254 (RFC 5321, boundary live-probed), `readJsonBody` now tolerates transport failures (routes always resolve 400), non-string specialties 422 instead of silently fabricating data, the dashboard's "Upcoming visits" stat now shares one floor function with the validation tolerance (drift impossible), logout/seed/regex-DRY fixes, an honest ESLint config (13 correctness rules ON at zero findings, every off documented) with 3 real `next/link` conversions, and a new login-limiter 429 e2e pin.

**Verification:** lint 0 / tsc / **85 unit** (76+9) / build identical routes / **38 e2e** (37+1); every fix re-probed live; parity unchanged; 20 screenshots refreshed (`03-desktop-full` is exactly 1440×7490).

**Suggested next steps:** run `bun install && bun run dev` and try a 300-char email in the form to see the new 422. The natural next feature remains appointment status management (confirm/complete) on the dashboard.
