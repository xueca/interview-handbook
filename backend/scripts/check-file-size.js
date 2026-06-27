const fs = require('fs')
const path = require('path')

const LIMITS = { controllers: 150, routes: 50, middleware: 80 }
let hasError = false

Object.entries(LIMITS).forEach(([dir, maxLines]) => {
  const dirPath = path.join(__dirname, '..', dir)
  if (!fs.existsSync(dirPath)) return
  fs.readdirSync(dirPath).forEach(file => {
    if (!file.endsWith('.js')) return
    const lines = fs.readFileSync(path.join(dirPath, file), 'utf-8').split('\n').length
    if (lines > maxLines) { console.error(`❌ ${dir}/${file}: ${lines}行 > ${maxLines}行`); hasError = true }
    else { console.log(`✅ ${dir}/${file}: ${lines}行`) }
  })
})

if (hasError) { console.error('\n⚠️  有文件超行数限制'); process.exit(1) }
else { console.log('\n✅ 所有文件行数检查通过') }
