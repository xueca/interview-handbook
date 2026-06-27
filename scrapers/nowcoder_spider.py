# 最终版: 牛客网面经爬虫 - 带重试和 Referer 防反爬
# 已验证: 加 Referer + 重试 = 稳定提取9条/页
import requests, json, time, sys
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

PAGES = int(sys.argv[1]) if len(sys.argv) > 1 else 2
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else 'mianjing_demo.json'

ua_obj = UserAgent()
all_results = []
seen_urls = set()
MAX_RETRIES = 3  # 每页最多重试次数

for page in range(1, PAGES + 1):
    url = 'https://www.nowcoder.com/discuss?type=2&order=0'
    url = url if page == 1 else f'{url}&page={page}'

    success = False
    for attempt in range(1, MAX_RETRIES + 1):
        headers = {
            'User-Agent': ua_obj.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.nowcoder.com/',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        }
        resp = requests.get(url, headers=headers, timeout=15)

        if resp.status_code != 200:
            print(f'  第{page}页 尝试{attempt}: HTTP {resp.status_code}')
            time.sleep(3)
            continue

        soup = BeautifulSoup(resp.text, 'html.parser')
        cards = soup.select('div.tw-px-5.tw-relative')

        if len(cards) == 0:
            # 被反爬拦了，等待后重试
            print(f'  第{page}页 尝试{attempt}: 空壳页面（反爬拦截），等待重试...')
            time.sleep(5)
            continue

        # 成功——提取数据
        count = 0
        for card in cards:
            a_tag = card.select_one('div.tw-overflow-hidden a')
            if not a_tag or '/discuss/' not in a_tag.get('href', ''):
                continue
            title = a_tag.get_text(strip=True)
            link = a_tag.get('href', '')

            author_el = card.select_one('.user-job-name .job-text')
            author = author_el.get_text(strip=True) if author_el else ''
            time_el = card.select_one('.show-time')
            post_time = time_el.get_text(strip=True) if time_el else ''

            full_url = 'https://www.nowcoder.com' + link.split('?')[0]
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            row = {'title': title, 'author': author, 'time': post_time, 'url': full_url}
            all_results.append(row)
            count += 1
            print(f'  #{count:2d} [{post_time}] {title[:55]}')

        print(f'  第{page}页: {count} 条 ✅')
        success = True
        break

    if not success:
        print(f'  第{page}页: 全部 {MAX_RETRIES} 次重试失败 ❌')

    time.sleep(3)  # 页间延迟

# 保存
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)

print(f'\n{"="*50}')
print(f'🎉 完成！共 {len(all_results)} 条面经 → {OUTPUT}')
if all_results:
    print(f'样例: [{all_results[0]["time"]}] {all_results[0]["title"][:60]} — {all_results[0]["author"]}')