# 文件功能: JSON→可读Markdown转换器 | json_to_markdown.py → .md
"""
JSON面经数据 → 人类可读 Markdown 格式转换
使用: python scrapers/json_to_markdown.py <input.json> [output.md]
     如不指定output，自动将 .json 后缀替换为 .md
"""
import json, sys, os
from datetime import datetime


def json_to_markdown(input_path, output_path=None):
    """将爬取结果JSON转换为排版良好的Markdown文件"""
    # 确定输出路径
    if output_path is None:
        base, _ = os.path.splitext(input_path)
        output_path = base + '.md'

    # 读取JSON
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not data:
        print(f'⚠️ {input_path} 为空，跳过')
        return

    # 按优先级降序排列
    data.sort(key=lambda x: x.get('priority', 0), reverse=True)

    # 统计
    total = len(data)
    t1 = sum(1 for r in data if r.get('company_level') == '小厂')
    t2 = sum(1 for r in data if r.get('company_level') == '中厂')
    t3 = sum(1 for r in data if r.get('company_level') == '大厂')
    fj = sum(1 for r in data if r.get('fujian'))
    total_chars = sum(len(r.get('content', '')) for r in data)
    now = datetime.now().strftime('%Y-%m-%d %H:%M')

    # ====== 构建 Markdown ======
    lines = []
    lines.append(f'# 前端/全栈面经合集')
    lines.append(f'')
    lines.append(f'> 共 **{total}** 条 | 小厂 **{t1}** | 中厂 **{t2}** | 大厂 **{t3}** | 福建 **{fj}**')
    lines.append(f'> 排序规则: 小厂 > 中厂 > 大厂，福建优先')
    lines.append(f'> 总计约 **{total_chars:,}** 字 | 最后更新: {now}')
    lines.append(f'')
    lines.append(f'---')
    lines.append(f'')

    for i, row in enumerate(data, 1):
        title = row.get('title', '无标题')
        content = row.get('content', '')
        company = row.get('company', '未知')
        level = row.get('company_level', '?')
        fujian = row.get('fujian', False)
        priority = row.get('priority', 0)
        cn = len(content)

        # 福建标记
        fj_flag = ' 🏠福建' if fujian else ''

        # 公司信息行
        lines.append(f'## {i}. ⭐{priority} [{level}] {title}{fj_flag}')
        lines.append(f'')
        lines.append(f'> 公司: {company} | 字数: {cn} | 福建: {"是" if fujian else "否"}')
        lines.append(f'')

        # 正文 — 每段之间增加空行保持可读性
        if content:
            paragraphs = content.split('\n')
            for p in paragraphs:
                p = p.strip()
                if p:
                    lines.append(p)
                    lines.append('')
        else:
            lines.append('*(正文提取失败)*')
            lines.append('')

        lines.append('---')
        lines.append('')

    # 写入文件
    markdown = '\n'.join(lines)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(markdown)

    print(f'✅ 转换完成: {input_path} → {output_path}')
    print(f'   共 {total} 条 | T1/T2/T3 = {t1}/{t2}/{t3} | 福建 {fj} | {total_chars:,} 字')

    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python json_to_markdown.py <input.json> [output.md]')
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    json_to_markdown(inp, out)