# 文件功能: 前端/全栈面经定向爬虫 | nowcoder.com → Playwright → 过滤→正文→分类→排序→JSON
"""
前端/全栈面经定向爬虫 - 搜索模式 + 关键词过滤 + 厂级分类 + 优先级排序 + react/ts密度控制
依赖: playwright==1.60.0 | Chromium 1223
使用:  python scrapers/nowcoder_playwright.py [输出文件] [--raw]
      默认: 搜索"前端 面经"(3页) + "全栈 面经"(2页)，每页20条
      --raw: 跳过过滤，爬全部搜索结果"""
import asyncio, json, sys, time, re
from playwright.async_api import async_playwright

# ===== 配置 =====
CHROMIUM_PATH = r'C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe'
OUTPUT = sys.argv[1] if len(sys.argv) > 1 else 'fe_mianjing.json'
RAW_MODE = '--raw' in sys.argv          # 跳过过滤，爬全部
PAGE_DELAY = 3                           # 页间延迟(秒)
CARD_WAIT = 10                           # 等待卡片渲染超时(秒)
REACT_TS_MAX_DENSITY = 0.20              # react/ts 正文密度上限

# 搜索查询列表 — 多轮搜索确保覆盖面
SEARCH_QUERIES = [
    ('前端 面经', 3),        # 前端面经，爬3页
    ('全栈 面经', 2),        # 全栈面经，爬2页
]

# ====== 关键词词典 ======

# 绝对排除 — 标题命中任意一条即跳过
REJECT_KEYWORDS = [
    'java', 'spring', 'mybatis', 'jvm', '高并发', '多线程',
    'c++', 'cpp', 'c语言', '嵌入式', 'linux内核', '驱动',
    '算法工程师', '自然语言', 'nlp', 'cv算法', '视觉算法',
    '测试开发', '测试工程师', 'qa', '测开', '自动化测试',
    '产品经理', '运营', '销售', '设计师', 'ue设计师', 'ui设计',
    '数据分析师', '大数据开发', '数据仓库', 'etl',
    '运维', 'devops', 'sre', '安全工程师', '渗透',
]

# 前端/全栈命中 — 标题必须命中至少一个（不含react/typescript）
FRONTEND_KEYWORDS = [
    '前端', 'web前端', 'h5', 'vue', 'angular', 'node',
    'javascript', 'js', '小程序', 'flutter',
    'react native', 'rn', 'electron', '前端开发',
    '全栈', 'fullstack', 'full stack',
]

# ====== 厂级分类 ======

# 大厂名单 — 标题中出现即标记T3
BIG_COMPANIES = [
    '阿里', '阿里巴巴', '淘宝', '天猫', '支付宝', '蚂蚁', '菜鸟',
    '腾讯', '微信', '字节', '抖音', 'tiktok',
    '美团', '京东', '拼多多', '快手', '小红书',
    '华为', '百度', '网易', '滴滴', '小米',
    'oppo', 'vivo', '荣耀', '联想', '携程', '去哪儿',
    '哔哩哔哩', 'b站', 'shein', '米哈游', '莉莉丝',
    '商汤', '科大讯飞', '大疆', '微软', '谷歌', 'google',
    '亚马逊', 'apple', '英伟达', 'nvidia',
]

# 中厂名单
MID_COMPANIES = [
    '虾皮', 'shopee', '得物', '唯品会', '陌陌', '探探',
    '知乎', '搜狐', '新浪', '微博', '360',
    '虎牙', '斗鱼', '金山', 'wps', '深信服',
    '海康威视', '大华', '恒生', '用友', '金蝶',
    '同花顺', '东方财富', '三七互娱', '完美世界',
    '巨人网络', '叠纸', '鹰角', '库洛', '吉比特',
    '游卡', '趣头条', '喜马拉雅', '汽车之家',
    'keep', '陌陌', '美图', '网龙', '4399',
    '途虎', '货拉拉', '满帮', '水滴', '涂鸦',
    '声网', '极光', '有赞', '微盟',
]

# 福建省公司 — 命中即加3分
FUJIAN_COMPANIES = [
    '4399', '网龙', '美图', '吉比特', 'igg',
    '飞鱼科技', '瑞芯微', '星网锐捷', '厦门美柚',
    '厦门网宿', '厦门吉比特', '厦门三五互联',
    '福州网龙', '福州星网锐捷', '福州瑞芯微',
    '厦门', '福州', '泉州', '福建',
]


# ====== 过滤与分类函数 ======

def filter_frontend(title, author):
    """返回 True = 前端/全栈面经，False = 排除"""
    tl = title.lower()

    # Step 1: 绝对排除 — 命中即丢弃
    for kw in REJECT_KEYWORDS:
        if kw in tl:
            # java特殊处理: 如果标题同时包含前端关键词则不排除
            if kw == 'java':
                has_fe = any(fk in tl for fk in ['前端', '全栈', 'js', 'vue', 'node', 'javascript'])
                if has_fe:
                    return True
            return False

    # Step 2: 作者标签辅助判断 — 作者标签含"前端工程师/全栈"则直接通过
    if author:
        al = author.lower()
        if '前端' in al or '全栈' in al:
            return True

    # Step 3: 标题必须包含前端/全栈关键词
    for kw in FRONTEND_KEYWORDS:
        if kw in tl:
            return True

    return False


def classify_company(title, author):
    """返回 (公司名, 厂级分类, 是否福建)"""
    tl = title.lower()
    al = author.lower() if author else ''

    # 检查大厂
    for c in BIG_COMPANIES:
        if c.lower() in tl or c.lower() in al:
            fujian = any(fc in tl for fc in FUJIAN_COMPANIES)
            return (c, '大厂', 'T3', fujian)

    # 检查中厂
    for c in MID_COMPANIES:
        if c.lower() in tl or c.lower() in al:
            fujian = any(fc in tl for fc in FUJIAN_COMPANIES)
            return (c, '中厂', 'T2', fujian)

    # 默认小厂
    fujian = any(fc in tl for fc in FUJIAN_COMPANIES)
    city_match = re.search(r'([\u4e00-\u9fa5]+(?:大学|学院|公司|科技|网络|软件|信息))', title)
    company = city_match.group(1) if city_match else '未知'
    return (company, '小厂', 'T1', fujian)


def calc_priority(title, author, company_level, is_fujian):
    """计算优先级分 — 分数越高越靠前"""
    tl = title.lower()
    score = 0

    # 关键词分: 前端+3, 全栈+2, 面经+1
    if '前端' in tl:
        score += 3
    if '全栈' in tl:
        score += 2
    if '面经' in tl:
        score += 1
    if author and '前端' in author.lower():
        score += 2

    # 厂级分: 小厂+3, 中厂+2, 大厂+1
    level_score = {'T1': 3, 'T2': 2, 'T3': 1}
    score += level_score.get(company_level, 0)

    # 福建加分+3
    if is_fujian:
        score += 3

    return score


def check_react_ts_density(content):
    """检查正文中 react/typescript 密度，≥20%返回False(需排除)"""
    if not content or len(content) < 50:
        return True  # 内容太短不判断

    total = len(content)
    # react: 匹配 "react" 单词（不区分大小写）
    react_count = len(re.findall(r'\b[Rr][Ee][Aa][Cc][Tt]\b', content))
    # typescript/ts: 匹配 "typescript" 或 "ts" 作为独立单词
    ts_count = len(re.findall(r'\b[Tt][Yy][Pp][Ee][Ss][Cc][Rr][Ii][Pp][Tt]\b|\b[Tt][Ss]\b', content))

    density = (react_count + ts_count) / max(total, 1)
    return density < REACT_TS_MAX_DENSITY


# ====== 爬虫核心 ======

def get_search_url(query, page_num):
    """构造搜索URL: 已被验证搜索'前端 面经'每页稳定20条"""
    from urllib.parse import quote
    q = quote(query)
    base = f'https://www.nowcoder.com/search?type=post&query={q}'
    return base if page_num == 1 else f'{base}&page={page_num}'


async def extract_list_page(page):
    """从列表页提取所有面经卡片的基本信息"""
    try:
        await page.wait_for_selector('div.tw-px-5.tw-relative', timeout=CARD_WAIT * 1000)
    except:
        pass
    await asyncio.sleep(1)

    cards = await page.query_selector_all('div.tw-px-5.tw-relative')
    results = []

    for card in cards:
        try:
            a_tag = await card.query_selector('div.tw-overflow-hidden a')
            if not a_tag:
                continue
            href = await a_tag.get_attribute('href')
            if not href or '/discuss/' not in href:
                continue
            title = (await a_tag.inner_text()).strip()

            author_el = await card.query_selector('.user-job-name .job-text')
            author = (await author_el.inner_text()).strip() if author_el else ''

            clean_url = f'https://www.nowcoder.com{href.split("?")[0]}'
            results.append({'title': title, 'author': author, 'url': clean_url})
        except:
            pass

    return results


async def extract_detail_page(page, url):
    """提取面经详情页正文（适配2026年新结构: .post-content-box）"""
    await page.goto(url, wait_until='domcontentloaded', timeout=20000)
    try:
        await page.wait_for_selector('.post-content-box, [class*=content], article', timeout=8000)
    except:
        pass
    await asyncio.sleep(0.5)

    content = ''
    for sel in ['.post-content-box', '[class*=post-content]', '.post-topic-main', 'article']:
        el = await page.query_selector(sel)
        if el:
            content = (await el.inner_text()).strip()
            if len(content) > 50:
                break

    # 清洗: 合并多余换行
    if content:
        content = re.sub(r'\n{3,}', '\n\n', content)

    return content[:5000] if content else ''


async def run_crawl(raw_mode=False, existing_urls=None):
    """核心爬取逻辑 — 可被外部调用（auto_crawler等）
    Args:
        raw_mode: True=爬全部不过滤
        existing_urls: 已有URL集合，增量模式下跳过这些
    Returns:
        list[dict]: 爬取结果（未排序、未精简）
    """
    all_results = []
    seen_urls = set(existing_urls or [])
    skipped_title = 0
    skipped_density = 0
    start = time.time()

    mode = 'RAW(爬全部)' if raw_mode else '定向过滤(前端/全栈)'
    print(f'🚀 前端/全栈面经定向爬虫 (搜索模式)')
    print(f'   模式: {mode} | 查询: {[(q,f"{p}页")for q,p in SEARCH_QUERIES]}')
    print(f'   已有 {len(existing_urls or set())} 条已爬URL | 增量模式: {bool(existing_urls)}')
    print(f'   密度上限: react/ts < {REACT_TS_MAX_DENSITY*100:.0f}%\n')

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROMIUM_PATH,
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage']
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                       '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='zh-CN',
        )
        page = await context.new_page()
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        """)

        for query, pages in SEARCH_QUERIES:
            print(f'🔍 查询: "{query}" ({pages}页)')

            for page_num in range(1, pages + 1):
                url = get_search_url(query, page_num)
                print(f'  📄 第{page_num}页: {url}')

                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                rows = await extract_list_page(page)
                if not rows:
                    print(f'    ⚠️ 无数据，跳过')
                    break

                # Step 1: 标题过滤
                passed = []
                for row in rows:
                    if not raw_mode and not filter_frontend(row['title'], row['author']):
                        skipped_title += 1
                        continue
                    company, level_name, level_key, fujian = classify_company(row['title'], row['author'])
                    row['company'] = company
                    row['company_level'] = level_name
                    row['fujian'] = fujian
                    row['priority'] = calc_priority(row['title'], row['author'], level_key, fujian)
                    passed.append(row)

                print(f'    📋 列表{len(rows)}条 → 过滤通过{len(passed)}条')

                # Step 2: 爬正文
                for i, row in enumerate(passed):
                    if row['url'] in seen_urls:
                        continue
                    seen_urls.add(row['url'])
                    print(f'    📝 [{i+1}/{len(passed)}] {row["title"][:45]}...', end='', flush=True)

                    try:
                        row['content'] = await extract_detail_page(page, row['url'])

                        if not raw_mode and not check_react_ts_density(row['content']):
                            densities = calc_density_debug(row['content'])
                            print(f' 🚫 排除(密度={densities:.0%})')
                            skipped_density += 1
                            continue

                        content_len = len(row['content'])
                        print(f' ✅ {content_len}字')
                        all_results.append(row)

                    except Exception as e:
                        row['content'] = ''
                        print(f' ⚠️ 失败: {e}')
                        all_results.append(row)

                    await asyncio.sleep(1)

                await asyncio.sleep(PAGE_DELAY)

        await browser.close()

    # 排序
    all_results.sort(key=lambda x: x.get('priority', 0), reverse=True)

    elapsed = time.time() - start
    print(f'\n{"="*50}')
    print(f'🎉 爬取完成！新增 {len(all_results)} 条 | 耗时 {elapsed:.1f}s')
    print(f'   标题排除: {skipped_title} | 密度排除: {skipped_density}')
    return all_results


def slim_results(data):
    """精简为仅保留 title + content + 分类信息"""
    return [{
        'title': r['title'],
        'content': r.get('content', ''),
        'company': r['company'],
        'company_level': r['company_level'],
        'fujian': r['fujian'],
        'priority': r['priority'],
    } for r in data]


async def main():
    """CLI入口 — 保持原有命令行使用方式不变"""
    data = await run_crawl(raw_mode=RAW_MODE)
    output_data = slim_results(data)

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f'   输出: {len(output_data)} 条')
    if output_data:
        t1 = sum(1 for r in output_data if r['company_level'] == '小厂')
        t2 = sum(1 for r in output_data if r['company_level'] == '中厂')
        t3 = sum(1 for r in output_data if r['company_level'] == '大厂')
        fj = sum(1 for r in output_data if r['fujian'])
        print(f'   厂级分布: 小厂(T1)={t1} | 中厂(T2)={t2} | 大厂(T3)={t3} | 福建={fj}')
        for r in output_data[:3]:
            cn = len(r['content'])
            flag = '🏠福建 ' if r['fujian'] else ''
            print(f'   ⭐{r["priority"]:2d} [{r["company_level"]}] {flag}{r["title"][:50]} ({cn}字)')
    print(f'   → {OUTPUT}\n')


def calc_density_debug(content):
    """调试用：计算react/ts密度"""
    total = max(len(content), 1)
    rc = len(re.findall(r'\b[Rr][Ee][Aa][Cc][Tt]\b', content))
    tc = len(re.findall(r'\b[Tt][Yy][Pp][Ee][Ss][Cc][Rr][Ii][Pp][Tt]\b|\b[Tt][Ss]\b', content))
    return (rc + tc) / total


if __name__ == '__main__':
    asyncio.run(main())