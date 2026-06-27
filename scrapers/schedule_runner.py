# 文件功能: Python常驻定时爬取脚本 | schedule_runner.py → auto_crawler
"""
定时爬取后台进程 — 使用 schedule 库，无需配置系统任务计划
依赖: pip install schedule
使用: python scrapers/schedule_runner.py
     后台运行: Start-Process -NoNewWindow python scrapers/schedule_runner.py
频率: 每周一上午9点（修改 INTERVAL_CONFIG 调整）

另见: Windows任务计划程序方案（推荐生产环境使用）:
  1. Win+R → taskschd.msc
  2. 创建基本任务 → 触发器: 每周一 09:00
  3. 操作: 启动程序 → python.exe
  4. 参数: scrapers/auto_crawler.py
"""
import schedule
import time
import subprocess
import sys
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AUTO_CRAWLER = os.path.join(SCRIPT_DIR, 'auto_crawler.py')

# ===== 调度配置 =====
# 每周一上午9:00执行（可改为你想要的时间和频率）
schedule.every().monday.at('09:00').do(
    lambda: run_once()
)

# 可选：启动时立即跑一次（去掉注释即可首次启动自动跑）
# schedule.every(10).seconds.do(run_once)  # 测试用：每10秒


def run_once():
    """执行一次增量爬取"""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'\n{"="*50}')
    print(f'[{now}] 定时任务触发...')
    try:
        subprocess.run(
            [sys.executable, AUTO_CRAWLER],
            cwd=os.path.dirname(SCRIPT_DIR),
            check=True,
            timeout=600  # 10分钟超时
        )
    except Exception as e:
        print(f'❌ 执行失败: {e}')


def main():
    print('⏰ 定时爬取后台进程已启动')
    print(f'   任务: 每周一 09:00 执行增量爬取')
    print(f'   脚本: {AUTO_CRAWLER}')
    print(f'   提示: 按 Ctrl+C 停止')
    print(f'   生产环境建议使用 Windows 任务计划程序替代本脚本\n')

    # 启动时跑一次
    print('🚀 启动时先执行一次...')
    run_once()

    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次


if __name__ == '__main__':
    main()