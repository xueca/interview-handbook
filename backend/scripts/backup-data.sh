#!/bin/bash
# 文件功能: 打包备份 backend/data 目录下的 JSON 数据 | 数据流: crontab → backup-data.sh → /var/backups/interview-handbook

set -e

APP_DIR="/var/www/interview-handbook"
BACKUP_DIR="/var/backups/interview-handbook"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 打包数据目录
tar czf "$BACKUP_DIR/data_$DATE.tar.gz" -C "$APP_DIR/backend" data/

# 保留最近 30 天的备份
find "$BACKUP_DIR" -name "data_*.tar.gz" -type f -mtime +30 -delete

echo "备份完成: $BACKUP_DIR/data_$DATE.tar.gz"