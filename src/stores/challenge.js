import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { applyCheckin, streakStatus, toDateStr } from '../utils/streak'

export const useChallengeStore = defineStore('challenge', () => {
  const mine = ref([]) // 我參與的挑戰列表
  const participation = ref(null) // 目前選中的參與紀錄
  const group = ref(null) // 目前挑戰所屬小組
  const leaderboard = ref([])
  const loading = ref(false)
  const error = ref('')

  const status = computed(() =>
    participation.value
      ? streakStatus(participation.value.last_checkin_date, toDateStr())
      : 'broken',
  )

  const currentTitle = computed(
    () => mine.value.find((m) => m.id === participation.value?.id)?.challenges?.title ?? '',
  )

  async function loadMine(userId) {
    // 一定要 eq user_id：RLS 允許看同組別人的 participation，不過濾會混進別人的
    const { data, error: e } = await supabase
      .from('participations')
      .select('*, challenges(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (e) {
      error.value = e.message
      return
    }
    mine.value = data ?? []
    if (!participation.value && mine.value.length) await select(mine.value[0].id)
  }

  async function select(participationId) {
    loading.value = true
    error.value = ''
    const { data, error: e } = await supabase
      .from('participations')
      .select('*')
      .eq('id', participationId)
      .single()
    loading.value = false
    if (e) {
      error.value = e.message
      return
    }
    participation.value = data
    await loadGroup()
  }

  async function loadGroup() {
    group.value = null
    leaderboard.value = []
    const gid = participation.value?.group_id
    if (!gid) return
    const [g, lb] = await Promise.all([
      supabase.from('groups').select('*').eq('id', gid).maybeSingle(),
      supabase.from('group_leaderboard').select('*').eq('group_id', gid),
    ])
    group.value = g.data
    leaderboard.value = (lb.data ?? []).sort((a, b) => b.current_streak - a.current_streak)
  }

  async function createChallenge(userId, title) {
    error.value = ''
    const { data: c, error: e1 } = await supabase
      .from('challenges')
      .insert({ owner_id: userId, title })
      .select()
      .single()
    if (e1) {
      error.value = e1.message
      return
    }
    const { data: p, error: e2 } = await supabase
      .from('participations')
      .insert({ user_id: userId, challenge_id: c.id })
      .select()
      .single()
    if (e2) {
      error.value = e2.message
      return
    }
    await loadMine(userId)
    await select(p.id)
  }

  async function attachGroup(groupId) {
    const { error: e } = await supabase
      .from('participations')
      .update({ group_id: groupId })
      .eq('id', participation.value.id)
    if (e) {
      error.value = e.message
      return
    }
    await select(participation.value.id)
  }

  async function createGroup(userId, name) {
    error.value = ''
    const { data: g, error: e1 } = await supabase
      .from('groups')
      .insert({ name, owner_id: userId })
      .select()
      .single()
    if (e1) {
      error.value = e1.message
      return
    }
    const { error: e2 } = await supabase
      .from('group_members')
      .insert({ group_id: g.id, user_id: userId })
    if (e2) {
      error.value = e2.message
      return
    }
    await attachGroup(g.id)
  }

  async function joinGroup(code) {
    error.value = ''
    const { data: gid, error: e } = await supabase.rpc('join_group', { code: code.trim() })
    if (e) {
      error.value = e.message.includes('invalid') ? '邀請碼不存在' : e.message
      return
    }
    await attachGroup(gid)
  }

  async function checkin(note = '') {
    const p = participation.value
    if (!p) return
    const today = toDateStr()
    const next = applyCheckin(
      {
        currentStreak: p.current_streak,
        longestStreak: p.longest_streak,
        lastCheckinDate: p.last_checkin_date,
        freezeCards: p.freeze_cards,
      },
      today,
    )
    if (next.alreadyCheckedIn) return next

    const { error: e1 } = await supabase
      .from('checkins')
      .insert({ participation_id: p.id, checkin_date: today, note })
    if (e1) {
      error.value = e1.message
      return
    }

    const { data, error: e2 } = await supabase
      .from('participations')
      .update({
        current_streak: next.currentStreak,
        longest_streak: next.longestStreak,
        last_checkin_date: next.lastCheckinDate,
        freeze_cards: next.freezeCards,
      })
      .eq('id', p.id)
      .select()
      .single()
    if (e2) error.value = e2.message
    else participation.value = data

    await loadGroup()
    return next
  }

  return {
    mine, participation, group, leaderboard, loading, error, status, currentTitle,
    loadMine, select, createChallenge, createGroup, joinGroup, checkin,
  }
})
