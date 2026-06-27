# 文件功能: BOSS直聘浏览器自动化爬虫Demo | 数据流: zhipin.com → Playwright → JSON
"""
BOSS直聘职位爬虫 - Playwright 验证脚本
注意:
  BOSS直聘反爬极严，本脚本需要手动登录后维持Cookie。
  一个Cookie只能爬3~4页，请手动更换Cookie后继续。
使用说明:
  1. 安装依赖: pip install playwright beautifulsoup4
  2. 安装浏览器: playwright install chromium
  3. 打开浏览器手动登录BOSS直聘，复制Cookie
  4. 修改下方 COOKIE 变量，运行: python boss_playwright.py
"""
import asyncio
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# ===== 配置 =====
# 请手动打开浏览器登录后，复制完整Cookie粘贴到这里
COOKIE = """YOUR_COOKIE_HERE"""

# 要爬取的城市和职位关键词
CITY_CODE = '100010000'  # 北京
KEYWORD = 'Python开发'
PAGE_START = 1
PAGE_END = 4  # 一个Cookie只能爬约4页，之后需要更换Cookie

REQUEST_DELAY = 5  # 每页请求间隔秒数，越慢越安全


class BossPlaywrightSpider:
    def __init__(self, cookie, city_code, keyword):
        self.cookie = cookie
        self.city_code = city_code
        self.keyword = keyword
        self.results = []

    def parse_cookie_string(self, cookie_str):
        """将Cookie字符串解析为Playwright需要的格式"""
        cookies = []
        for part in cookie_str.split(';'):
            if '=' in part:
                name, value = part.strip().split('=', 1)
                cookies.append({
                    'name': name,
                    'value': value,
                    'domain': '.zhipin.com',
                    'path': '/'
                })
        return cookies

    async def crawl(self):
        """主爬取流程"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=False,  # 有头模式更稳定，不容易被检测
                slow_mo=100      # 放慢操作，更像人
            )
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            # 设置Cookie
            parsed_cookies = self.parse_cookie_string(self.cookie)
            if parsed_cookies:
                await context.add_cookies(parsed_cookies)

            page = await context.new_page()

            for page_num in range(PAGE_START, PAGE_END + 1):
                url = f'https://www.zhipin.com/{self.city_code}/?query={self.keyword}&page={page_num}'
                print(f'正在爬取第{page_num}页: {url}')

                try:
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    # 等待页面加载
                    await asyncio.sleep(REQUEST_DELAY)

                    # 检查是否触发反爬
                    content = await page.content()
                    if '验证' in content or '滑块' in content:
                        print('⚠️ 触发了验证，请手动完成验证后按回车继续...')
                        input()
                        # 重新获取内容
                        content = await page.content()

                    # 解析职位列表
                    jobs = await self.parse_page(content)
                    if not jobs:
                        print(f'第{page_num}页未找到职位，Cookie可能已失效，请更换后重试')
                        break

                    self.results.extend(jobs)
                    print(f'✅ 第{page_num}页采集到 {len(jobs)} 个职位')

                    # 随机延迟，避免被检测
                    await asyncio.sleep(REQUEST_DELAY)

                except Exception as e:
                    print(f'爬取第{page_num}页失败: {str(e)}')
                    break

            await browser.close()

        # 保存结果
        output_file = f'boss_{self.keyword}_{self.city_code}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)

        print(f'\n🎉 爬取完成！结果保存到: {output_file}')
        print(f'共计 {len(self.results)} 个职位')

        return self.results

    async def parse_page(self, html):
        """解析单页职位列表"""
        soup = BeautifulSoup(html, 'lxml')
        job_list = soup.select('.job-list li')

        jobs = []
        for li in job_list:
            try:
                job_name = li.select_one('.job-name a')
                job = {
                    'job_name': job_name.get_text(strip=True) if job_name else '',
                    'job_area': li.select_one('.job-area').get_text(strip=True) if li.select_one('.job-area') else '',
                    'salary': li.select_one('.red').get_text(strip=True) if li.select_one('.red') else '',
                    'company': li.select_one('.company-text .name a').get_text(strip=True) if li.select_one('.company-text .name a') else '',
                    'industry': li.select_one('.company-text p a').get_text(strip=True) if li.select_one('.company-text p a') else '',
                    'requirement': [p.get_text(strip=True) for p in li.select('.job-limit p')],
                    'url': 'https://www.zhipin.com' + job_name['href'] if job_name and job_name.has_attr('href') else '',
                }
                jobs.append(job)
            except Exception as e:
                print(f'解析职位失败: {str(e)}')
                continue

        return jobs


if __name__ == '__main__':
    if COOKIE == 'YOUR_COOKIE_HERE':
        print('❌ 请先手动登录BOSS直聘，并复制Cookie到代码中的COOKIE变量')
        exit(1)

    spider = BossPlaywrightSpider(COOKIE, CITY_CODE, KEYWORD)
    asyncio.run(spider.crawl())