/**
 * JSON 文件读写工具
 * 统一管理 data/ 目录下的 JSON 文件读写
 */
const fs = require('fs')
const path = require('path')

// data 目录的绝对路径
const DATA_DIR = __dirname

/**
 * 读取 JSON 文件
 * @param {string} filename - 文件名（如 'users.json'）
 * @returns {Array|Object} 解析后的数据
 */
function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    // 文件不存在或格式错误时返回空数组
    console.error(`读取 ${filename} 失败:`, err.message)
    return []
  }
}

/**
 * 写入 JSON 文件
 * @param {string} filename - 文件名
 * @param {Array|Object} data - 要写入的数据
 */
function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

module.exports = { readJSON, writeJSON }
