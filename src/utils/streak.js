// 連勝核心邏輯：純函式，方便測試。日期一律用 'YYYY-MM-DD' 字串（使用者本地日期）。

export function toDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 兩個日期字串相差幾天（b - a）
export function diffDays(a, b) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  const ta = Date.UTC(ya, ma - 1, da)
  const tb = Date.UTC(yb, mb - 1, db)
  return Math.round((tb - ta) / 86400000)
}

/**
 * 計算打卡後的新連勝。
 * @param {object} p { currentStreak, longestStreak, lastCheckinDate, freezeCards }
 * @param {string} today 今天日期字串
 * @returns {object} 新狀態 + usedFreeze（是否消耗保護卡）+ alreadyCheckedIn
 */
export function applyCheckin(p, today) {
  const { currentStreak = 0, longestStreak = 0, lastCheckinDate = null, freezeCards = 0 } = p

  if (lastCheckinDate === today) {
    return { ...p, alreadyCheckedIn: true, usedFreeze: false }
  }

  let streak = 1
  let cards = freezeCards
  let usedFreeze = false

  if (lastCheckinDate) {
    const gap = diffDays(lastCheckinDate, today)
    if (gap === 1) {
      streak = currentStreak + 1
    } else if (gap === 2 && cards > 0) {
      // 漏一天，用一張保護卡接上
      streak = currentStreak + 1
      cards -= 1
      usedFreeze = true
    }
    // gap > 2，或沒卡：連勝歸 1
  }

  return {
    currentStreak: streak,
    longestStreak: Math.max(longestStreak, streak),
    lastCheckinDate: today,
    freezeCards: cards,
    alreadyCheckedIn: false,
    usedFreeze,
  }
}

/**
 * 顯示用：目前連勝是否還有效？今天沒打卡且已漏超過一天就算斷了。
 * 回傳 'safe'（今天已打）| 'at_risk'（今天還沒打，昨天有）| 'broken'
 */
export function streakStatus(lastCheckinDate, today) {
  if (!lastCheckinDate) return 'broken'
  const gap = diffDays(lastCheckinDate, today)
  if (gap === 0) return 'safe'
  if (gap === 1) return 'at_risk'
  return 'broken'
}
