/**
 * 答题统计工具函数
 */
// 计算正确率
/**
  @param {number} correctCount - 正确回答的题目数量
  @param {number} totalCount - 总题目数量
  @returns {number} - 正确率，范围为0到100之间
 */
export function calculateAccuracy(correctCount, totalCount) {
  if (totalCount === 0) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

/**
 * 计算用时
 * @param {number} startTime - 开始时间戳（毫秒）
 * @param {number} endTime - 结束时间戳（毫秒）
 * @returns {string} 格式化的用时字符串（如 "02:35"）
 */
export function calculateDuration(startTime, endTime) {
  const seconds = Math.floor((endTime - startTime) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
/**
 * 计算每题平均用时
 * @param {number} totalSeconds - 总用时（秒）
 * @param {number} answeredCount - 已答题数
 * @returns {string} 平均用时（如 "15.5秒"）
 */
export function calculateAverageTime(totalSeconds, answeredCount) {
  if (answeredCount === 0) return '0秒'
  const avg = (totalSeconds / answeredCount).toFixed(1)
  return `${avg}秒`
}
/**
 * 生成统计报告
 * @param {object} result - 答题结果
 * @param {number} startTime - 开始时间戳
 * @returns {object} 统计报告
 */
/**
 * 生成答题统计报告
 * @param {object} result - 答题结果对象，包含正确回答数、总题目数等信息
 * @param {number} startTime - 开始答题的时间戳（毫秒）
 * @returns {object} 包含基础统计、计算指标和时间戳的统计报告对象
 */
export function generateStats(result, startTime) {
  const endTime = Date.now()
  const totalSeconds = Math.floor((endTime - startTime) / 1000)
  
  return {
    // 基础统计
    score: result.score,
    correctCount: result.correctCount,
    answeredCount: result.answeredCount,
    totalCount: result.totalCount,
    
    // 计算指标
    accuracy: calculateAccuracy(result.correctCount, result.totalCount),
    duration: calculateDuration(startTime, endTime),
    averageTime: calculateAverageTime(totalSeconds, result.answeredCount),
    
    // 时间戳
    startTime,
    endTime,
    totalSeconds
  }
}