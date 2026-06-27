# 文件功能: 增量定时爬取入口 | auto_crawler → nowcoder_playwright → JSON + Markdown
"""
增量爬取入口 — 适合被 Windows 任务计划程序 / cron 触发
功能: 读已有数据 → 只爬新URL → 合并排序 → 输出JSON+MD + 写日志
使用: python scrapers/auto_crawler.py
配置: 修改 OUTPUT_JSON / OUTPUT_MD 路径；修改 SEARCH_QUERIES 到 nowcoder_playwright.py
"""
import json, os, sys, time
from datetime import datetime

# 相对路径 — 从项目根目录运行
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_JSON = os.path.join(PROJECT_DIR, 'fe_mianjing.json')
OUTPUT_MD   = os.path.join(PROJECT_DIR, 'fe_mianjing.md')
LOG_FILE    = os.path.join(PROJECT_DIR, 'crawler.log')

# 确保 scrapers 目录可导入
sys.path.insert(0, SCRIPT_DIR)
from nowcoder_playwright import run_crawl, slim_results
from json_to_markdown import json_to_markdown


def log(msg):
    """记录日志到文件和控制台"""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def load_existing_titles():
    """读取已有JSON中的标题集合"""
    titles = set()
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                titles.add(item.get('title', ''))
            log(f'读取已有数据: {len(data)} 条')
        except Exception as e:
            log(f'⚠️ 读取已有JSON失败: {e}')
    return titles


def main():
    start = time.time()
    log('========== 增量爬取开始 ==========')

    # Step 1: 加载已有标题（用于合并去重）
    existing_titles = load_existing_titles()
    log(f'已有 {len(existing_titles)} 条历史数据')

    # Step 2: 执行爬取 — 全量爬但合并时按标题去重
    import asyncio
    new_data = asyncio.run(run_crawl(raw_mode=False, existing_urls=set()))
    new_slim = slim_results(new_data)

    if not new_slim:
        log('无新数据，跳过写入')
        log(f'========== 完成(无新增) 耗时 {time.time()-start:.1f}s ==========\n')
        return

    # Step 3: 合并旧数据（按标题去重）
    old_data = _load_existing_records()
    all_data = old_data + new_slim
    seen = {}
    for r in all_data:
        t = r.get('title', '')
        if t not in seen or t not in existing_titles:
            seen[t] = r  # 新数据覆盖旧数据
    all_data = list(seen.values())
    all_data.sort(key=lambda x: x.get('priority', 0), reverse=True)

    # Step 4: 写入JSON
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    log(f'写入JSON: {OUTPUT_JSON} ({len(all_data)} 条)')

    # Step 5: 生成可读Markdown
    md_path = json_to_markdown(OUTPUT_JSON, OUTPUT_MD)
    log(f'写入MD: {md_path}')

    elapsed = time.time() - start
    new_count = len(new_slim)
    log(f'本次新增 {new_count} 条 | 总计 {len(all_data)} 条 | 耗时 {elapsed:.1f}s')
    log(f'========== 完成 ==========\n')


def _load_existing_records():
    """加载已有完整记录"""
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return []


if __name__ == '__main__':
    main()