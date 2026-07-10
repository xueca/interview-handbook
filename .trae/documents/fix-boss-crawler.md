# 修复：BOSS直聘爬虫白屏问题

## 根因
Playwright 自带的 Chromium 被 BOSS 直聘反爬检测拦截（`navigator.webdriver` 等指纹），页面加载 3 秒后白屏。

## 修复方案
改用用户本机已安装的 Chrome/Edge 浏览器（`channel='chrome'`），指纹与正常浏览器完全一致。

## 修改文件
`job-hunter/job_matcher.py` 第 86 行附近

### 改前
```python
browser = p.chromium.launch(headless=False)
```

### 改后
```python
# 用本机 Chrome/Edge，绕过 BOSS 反爬检测
browser = p.chromium.launch(
    headless=False,
    channel='chrome',  # 优先 Chrome，没有则回退 msedge
)
```

如果用户没装 Chrome，fallback 到 `msedge`。

## 额外优化
1. 加 `--disable-blink-features=AutomationControlled` 参数进一步隐藏自动化痕迹
2. 加 `user_agent` 伪装成正常浏览器

## 验证
1. `run_matcher.bat --mock` 确认不报错
2. `run_matcher.bat --renew` 确认浏览器正常打开 BOSS 登录页
