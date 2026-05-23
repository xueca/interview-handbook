const fs = require('fs')
const path = require('path')

readjson = (filename) => {
  try{
  const fullpath = path.join(__dirname,filename)
  if (!fs.existsSync(fullpath)){
    return {}
  }
  return JSON.parse(fs.readFileSync(fullpath, 'utf8'));
}catch(err){
  console.error('读取失败:', err.message)
  return {}
}
}
writejson = (filename,data) => {
  try{
  if(!data || Object.keys(data).length === 0){
    console.log('data is empty or null')
    return
  }
  const fullpath = path.join(__dirname,filename)
   fs.writeFileSync(fullpath, JSON.stringify(data, null, 2));
}catch(err){
  console.error('写入失败:', err.message)
}
}
module.exports = { readjson, writejson }
