新会话周期开始（按仓库编号惯例为 **session 38 / 第 20 轮审计**——简报引用 session_36/37，operator 已将我的 session-36 工作粘贴为 session_37.md）。先读取上传的提示文件并刷新工作区：
工作区干净并已快进到 `4c5afe5`——正是 `docs/session_37.md`（operator 粘贴的我方 session-36 记录，135 行）。现在精读它以确认 operator 的记录与指令：
session_37.md 是我方 session-36 工作的准确转录，无新增 operator 指令。现在快速核验五份核心文档的状态标记（v2.8.9、163/63 计数、12 规则），确认与我所知一致：
五份核心文档与我所留状态完全一致（v2.8.9 / 规则 12 / [S36] 修订块），代码树与 c978281 相同（仅新增 session_37.md）。现在检查环境状态并重跑基线门禁：
环境完好（无重置）：.env 正确、环境变量劫持仍活跃（env -u 守卫处理）、DB 干净 6+1、dev server 存活。现在重跑会话 38 基线门禁：
**会话 38 基线门禁全绿**：lint 0 / tsc / 163 unit / build 14 路由 / 63 e2e × 2。现在检查 scandihaven 参考仓库更新：
Scandihaven 仍为 `d4789c3`（未变，本地=远程）。现在派出**第 20 轮 fresh-eyes 审计**（只读子代理，Task 38-a）：
第 20 轮审计完成：**0 Critical/High/Medium，3 Low + 3 Info**，6 项不变量全部健康。按审计纪律，现在**逐项复核每个发现**后再接受：
F1/F2/F4 已确认。继续复核 F3 测试侧、F5、F6：
全部 6 项发现**逐项复核确认**（3 Low + 3 Info）。检查 session-36 的截图脚本是否留存，然后撰写 session-38 修复计划：
session-36 的全套探针/截图脚本都还在 `/home/z/my-project/scripts/`。现在撰写 session-38 修复计划：
计划已保存。现在对照代码库验证计划——先看现有单元钉与 e2e 钉的确切位置：
简单的 grep 超时了（可能是 shell 挂起）。改用 Grep 工具重试：
钉位确认。现在检查 deps.test.ts 是否钉住 package.json 脚本（Track C 前置），并读 DEPLOYMENT.md 的三处需修订段落：
deps.test.ts 不钉 scripts 段——Track C 无测试约束。读取 DEPLOYMENT.md 三处待修订段落的上下文：
上下文齐备。开始执行 **Track A — TDD RED**：更新 3 个现有精确输出钉 + 新增 3 个 BOM 钉：
3 个现有钉已更新。查看文件尾部以确定新 describe 块的插入点：
插入新的 session-38 BOM describe 块（在公式防护块之后）：
**Track A RED 运行**——预期恰好 6 个 BOM 相关测试失败：
**RED 确认**——恰好 6 个 BOM 钉失败，其余 160 全过（总数 166）。现在 **GREEN**：实现 BOM：
BOM 已实现。顺手执行 **Track B**（删除 csvField 中的死子句）并注释说明：
**Track C**：package.json 的 db:generate 加 env -u 守卫：
**Track A+B+C GREEN 运行**（预期 166/166）：
**GREEN：166/166 单元，lint 0，tsc 干净**。现在更新 e2e 头部钉（期待 BOM）：
e2e 钉已更新。现在执行 **RED-proof**（session-26 F4 诚实模式）：暂时回退 BOM → build → 验证钉真实失败：
**RED-proof 确认**——回退 BOM 后 e2e 钉真实失败（1 failed / 9 passed）。恢复 BOM 并重建：
**规格检查通过：10/10**。正在执行 **Track D 文档残留修复**（F1 AGENTS.md 计数 + F2 DEPLOYMENT.md 三处库存）：
F1 已修。现在修 DEPLOYMENT.md 三处（F2）：
F2 三处已修。现在做 **Track E 文档对齐**——先定位 README 的 export 行与 AGENTS 规则 12：
README 已更新。现在检查 AGENTS.md 的计数行与规则 12：
AGENTS 规则 8 的表述在 Track C 后已成立。现在扩展规则 12 加入 BOM 条款：
规则 12 已扩展。现在更新 CLAUDE.md 的计数：
CLAUDE.md 中 dashboard-filters 的用例数 42 需更新为 45：
CLAUDE.md 完成。现在更新 SKILL.md → v2.9.0——先定位需更新的段落：
更新 SKILL.md：版本、project_state、会话列表、§11 计数、附录 B [S38]。先看 §367 的分解：
SKILL.md 主体已更新。现在追加附录 B 的 [S38] 条目：
SKILL.md v2.9.0 完成。现在更新 PAD——先定位 [S36] 修订块、§7.1 计数与 ADR-012 Consequences：
PAD 更新点已定位。先看 ADR-012 Consequences 结尾与 §10 已知问题行：
§10 结构清晰。查看 §3.2 树的 e2e 行与 §7.1 上下文，然后批量编辑 PAD：
PAD 第一批完成。继续 §7.1/§7.4/§11/§10 的编辑：
未匹配——先读当前实际行内容（行号已因插入而偏移）：
用小范围精准替换来做（避免长行不匹配）：
§7.1 完成。继续 §7.4 门禁计数与 §11 行：
§11 行的行数估值需按 F4 纪律**实测**而非估算：
修正 §11 估值为实测值（192 / 402 / 362）：
最后给 §10 增加 F5 接受残留行：
全部文档对齐完成。现在把守**修复后全量验证门**（lint / tsc / 166 unit / build / 63 e2e × 2）：
**全量门 GREEN：lint 0 / tsc / 166 unit / build / 63 e2e × 2**。现在在修复后的代码树上做实机复验。先重启 dev server 确保加载修复后代码：
开发服务器已重启且健康。现在运行实机对等探针——先确认 agent-browser 可用：
视口未生效（1280 而非 390）——这是上一会话记录过的坑。查 agent-browser 技能文档的正确用法：
视口已生效但页面高度未稳定。等待稳定后测量移动端菜单面板几何（文档契约 192×148 @ (178,80)）：
页面已加载（h:12164、7 个 section id 与文档一致）。点击语法有误——查技能文档的正确 click 用法：
首个 nav 是 display:none（可能是桌面导航）。枚举所有 nav 元素找移动端面板：
**参考站面板几何确认：192×148 @ (178,80)，grid，r24，p8**——与文档契约逐字节一致。现在链接点击行为探针：
scrollY 1837 精确匹配。但 panel 状态需复核——直接检查面板当前状态：
面板已卸载（nav 数 3→2，当前 nav[1] 是页脚法律链接）——**参考站移动导航行为完全确认**。现在桌面高度（1440×900，预期 7490px）：
**参考站桌面高度 7490px 精确**。参考站探针全部完成。现在对本地克隆站跑相同探针：
克隆站移动端 h=12162（参考 12164，文档记录的 2px 偏差）。打开克隆站菜单量面板几何：
**克隆站面板与参考站逐像素一致**。克隆站链接点击行为探针：
**克隆站链接点击行为与参考站完全一致（scrollY 1837 / 面板卸载 / svcTop 0.0005）——移动端导航双站正常，无 Tailwind v4 bug**。克隆站桌面高度：
**克隆站桌面 7490px 精确，7 个 h2 全部一致**。所有对等指标双站相同。现在运行 12 步产品环路（复用 session-36 脚本）：
**13/13 产品环路全绿**。现在执行**实机 BOM + 防护组合探针**（非 ASCII 公式载荷端到端）：
探针 5/6 断言通过；`header-after-BOM` 失败是**探针方法论错误**——`TextDecoder` 默认会剥离 BOM（raw 字节检查 `EF BB BF` 才是权威判定，它已通过）。修复探针用 `ignoreBOM: true` 解码：
**实机 BOM+防护探针全部通过**。现在清掉全部探针行（环路 1 行 + BOM 探针 4 行）并验证回到 6 行种子状态：
扩展清理脚本以覆盖 BOM 探针行（=SUMA… / José García…）：
脚本在仓库外无法解析 @prisma/client（bun 从脚本路径向上查找）。改用仓库 cwd 的内联 eval 执行同样的清理：
**5 行探针清除，DB 回到 6 行种子（2/2/2）**。现在重拍截图——先检查截图脚本的导入解析方式：
截图脚本导入 @playwright/test 且无根 node_modules——先直接从仓库 cwd 试运行看 bun 的解析行为：
建一个符号链接让 scripts/ 目录解析到仓库的 node_modules（不触碰仓库树）：
解析已修复（purge 确认 6 行种子）。现在从修复后的 dev server 运行 20 张截图完整捕获：
20 张已捕获。验证对等关键尺寸并清理捕获脚本产生的提交行：
03-desktop-full 精确 1440×7490。但 DB 有 1 行捕获提交残留（new: 3）。找出其名称并清理，然后重拍 dashboard 截图：
捕获提交行是 "Capture Visitor …"。把它加入清理模式，清掉后用专用脚本重拍 dashboard 截图：
Dashboard 重拍完成（干净 DB），15 号回到 390×1452，DB 保持 6 行种子。现在撰写 `docs/session_38.md` 会话记录：
会话记录已写入。现在追加 repo worklog 的 Task 38 条目：
repo worklog 已追加。现在补全工作区 worklog 的 Task 38 主条目（38-a 子代理条目已由审计员写入）：
工作区 worklog 完成。最终提交前检查——DB 状态、git status、guard 恢复确认：
修复检查有缺陷（$? 是 head 的退出码）。直接读 csvField 与 return 行确认：
守卫与 BOM 均就位。现在执行**提交**（遵循仓库 feat: 惯例）：
提交 `89a2046` 完成（18 个文件，+514/−42）。现在执行 SSH wrapper 推送——检查工具链状态：
工具链完好。写入 operator 密钥并执行 **dry-run 认证预检**：
**Dry-run 成功**（指纹一致，快进 `4c5afe5..89a2046` 已协商）。执行**真实推送**：
**推送成功，远程已验证 `89a2046` == 本地 HEAD**。销毁 operator 密钥并做最终验证：
**Session 38（第 20 轮审计周期）已完成并推送**。本次会话要点：

**审计结果**——第 20 轮 fresh-eyes 审计（只读子代理 + 逐项复核）：**零 Critical/High/Medium**（连续第二轮清白），3 Low + 3 Info。亮点发现：CSV 导出缺 UTF-8 BOM（Excel 双击按 ANSI 解码，非 ASCII 患者姓名变乱码）、从未被清查过的 DEPLOYMENT.md 库存陈旧、AGENTS:202 遗留计数。

**修复（TDD）**
- **Track A**：文件级 `\uFEFF` 签名前缀——6 个单元钉按设计 RED → 一行实现 GREEN；e2e 钉经**临时回退再验证**（1 failed/9 passed → 恢复 10/10）
- **Track B**：删除 session-36 防护中可证明不可达的死子句（保留防漂移钉）
- **Track C**：`db:generate` 补 `env -u`；**Track D**：文档残留全清
- 单元 163 → **166**，e2e 保持 **63** × 2 双跑证明

**对等验证**——双站探针逐像素一致（桌面 7490px 精确、移动面板 192×148 @ (178,80)、点击 scrollY 1837），**移动端导航正常、无 Tailwind v4 bug**（连续第六轮确认）；13/13 产品环路；实机 BOM+防护组合探针通过（`=SUMA(A1:É9)` 载荷端到端中和）。

**交付**：20 张截图重拍、SKILL v2.9.0、PAD/session_38/worklog 全对齐，提交 `89a2046` 已推送并远程验证，operator 密钥已销毁。

**建议后续**：operator 粘贴 session_39 日志后 `git pull` 继续审计节奏；dashboard 分页与 JSON-LD 仍是记录在案的待议项。
