import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const ready = ref(false)
  const sent = ref(false)
  const error = ref('')

  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .maybeSingle()
    profile.value = data
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    await loadProfile()
    ready.value = true

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
      // 不能在 callback 內直接 await supabase 呼叫，會卡死，所以丟到下一個 tick
      setTimeout(loadProfile, 0)
    })
  }

  async function signIn(email) {
    error.value = ''
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (e) error.value = e.message
    else sent.value = true
  }

  async function saveNickname(nickname) {
    error.value = ''
    const { error: e } = await supabase
      .from('profiles')
      .upsert({ id: user.value.id, nickname })
    if (e) error.value = e.message
    else await loadProfile()
  }

  async function signOut() {
    await supabase.auth.signOut()
    sent.value = false
  }

  return { user, profile, ready, sent, error, init, signIn, saveNickname, signOut }
})
