# 计划：从 GitHub 仓库移除简历相关文件

## 摘要
将仓库中所有 resume/简历 相关文件从 git 追踪中移除，并加入 `.gitignore` 防止再次提交。文件保留在本地磁盘，只是不再进入版本控制。

## 当前状态
仓库 `reborn` 分支，commit `4197343`，已推送到 GitHub。以下 12 个 resume 文件被追踪：

**整个目录（全是简历）：**
- `resume/` → resume.html
- `resume-revision/` → resume-revision.html
- `resume-xueca/` → 7个文件（html/pdf/docx/jpg）

**散落单文件：**
- `resume-xueca-v3.html`（根目录）
- `something/resume-xueca-v3.html`（something 目录，该目录还有面试相关文件需保留）

## 执行步骤

### 步骤 1：修改 `.gitignore`
在 `.gitignore` 末尾追加：
```
# Resume files (private)
resume/
resume-revision/
resume-xueca/
resume-xueca-v3.html
something/resume-xueca-v3.html
```

### 步骤 2：从 git 索引移除 resume 文件
用 Python 脚本 + `git update-index --force-remove` 逐个移除（绕过之前 git commit 崩溃问题）。

移除列表（12个文件）：
1. `resume/resume.html`
2. `resume-revision/resume-revision.html`
3. `resume-xueca/assets/photo.jpg`
4. `resume-xueca/resume-xueca-v2.html`
5. `resume-xueca/resume-xueca-v3.html`
6. `resume-xueca/resume-xueca-v4.html`
7. `resume-xueca/resume-xueca-v4.pdf`
8. `resume-xueca/resume-xueca-v5.pdf`
9. `resume-xueca/刘泽祥-简历.docx`
10. `resume-xueca/刘泽祥-简历.pdf`
11. `resume-xueca-v3.html`
12. `something/resume-xueca-v3.html`

### 步骤 3：重建 tree + commit
用底层命令（之前验证可行）：
1. `git write-tree` → 生成新 tree（不含 resume）
2. `git commit-tree <tree> -m "chore: remove resume files from tracking"` → 新 commit
3. `git update-ref HEAD <commit>` → 更新 HEAD

### 步骤 4：推送到 GitHub
```
git push --force origin reborn
```

### 步骤 5：验证
- `git ls-files | grep -i resume` → 应为空
- GitHub 页面确认无 resume 文件

## 注意事项
- 文件**保留在本地**，只是从 git 追踪移除
- `something/` 目录其他文件（mianjing_playwright.json、题库草稿等）不受影响
- 操作全程用底层命令，避免 git commit 的 long path 崩溃问题
- 推送前检查无密钥泄露
