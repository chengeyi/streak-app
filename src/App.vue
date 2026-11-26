<script setup>
import { onMounted, ref, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChallengeStore } from './stores/challenge'

const auth = useAuthStore()
const store = useChallengeStore()

const email = ref('')
const nickname = ref('')
const newTitle = ref('')
const groupName = ref('')
const inviteCode = ref('')

onMounted(() => auth.init())

// 取得 profile 後載入我的挑戰
watch(
  () => auth.profile,
  (p) => {
    if (p) store.loadMine(auth.user.id)
  },
  { immediate: true },
)

const statusText = {
  safe: '今天已完成 ✅',
  at_risk: '今天還沒打卡，連勝快斷了！',
  broken: '從今天重新開始',
}

async function addChallenge() {
  if (!newTitle.value.trim()) return
  await store.createChallenge(auth.user.id, newTitle.value.trim())
  newTitle.value = ''
}
async function addGroup() {
  if (!groupName.value.trim()) return
  await store.createGroup(auth.user.id, groupName.value.trim())
  groupName.value = ''
}
async function join() {
  if (!inviteCode.value.trim()) return
  await store.joinGroup(inviteCode.value)
  inviteCode.value = ''
}
</script>

<template>
  <main class="wrap">
    <h1>Streak</h1>

    <p v-if="!auth.ready" class="sub">載入中…</p>

    <!-- 1. 登入 -->
    <section v-else-if="!auth.user" class="card">
      <h2>登入</h2>
      <p v-if="auth.sent" class="status safe">登入連結已寄到 {{ email }}，請到信箱點擊。</p>
      <form v-else @submit.prevent="auth.signIn(email)">
        <input v-model="email" type="email" placeholder="your@email.com" required />
        <button>寄送登入連結</button>
      </form>
      <p v-if="auth.error" class="err">{{ auth.error }}</p>
    </section>

    <!-- 2. 取暱稱 -->
    <section v-else-if="!auth.profile" class="card">
      <h2>取個暱稱</h2>
      <form @submit.prevent="auth.saveNickname(nickname.trim())">
        <input v-model="nickname" maxlength="20" placeholder="排行榜上顯示的名字" required />
        <button>開始</button>
      </form>
      <p v-if="auth.error" class="err">{{ auth.error }}</p>
    </section>

    <!-- 3. 主畫面 -->
    <template v-else>
      <p class="sub">
        {{ auth.profile.nickname }} ·
        <a href="#" @click.prevent="auth.signOut()">登出</a>
      </p>
      <p v-if="store.error" class="err">{{ store.error }}</p>

      <section class="card">
        <h2>我的挑戰</h2>
        <div v-if="store.mine.length" class="tabs">
          <button
            v-for="m in store.mine"
            :key="m.id"
            :class="['tab', { on: m.id === store.participation?.id }]"
            @click="store.select(m.id)"
          >
            {{ m.challenges?.title }}
          </button>
        </div>
        <form @submit.prevent="addChallenge">
          <input v-model="newTitle" maxlength="40" placeholder="新挑戰，例如：每天刷一題 LeetCode" />
          <button>建立挑戰</button>
        </form>
      </section>

      <section v-if="store.participation" class="card">
        <h2>{{ store.currentTitle }}</h2>
        <div class="fire">🔥 {{ store.participation.current_streak }}</div>
        <p class="sub">
          最長 {{ store.participation.longest_streak }} 天 ·
          保護卡 {{ store.participation.freeze_cards }} 張
        </p>
        <p :class="['status', store.status]">{{ statusText[store.status] }}</p>
        <button :disabled="store.status === 'safe'" @click="store.checkin()">
          {{ store.status === 'safe' ? '已打卡' : '今日打卡' }}
        </button>
      </section>

      <section v-if="store.participation" class="card">
        <template v-if="store.group">
          <h2>小組：{{ store.group.name }}</h2>
          <p class="sub">邀請碼：<code>{{ store.group.invite_code }}</code></p>
          <ol>
            <li v-for="row in store.leaderboard" :key="row.user_id">
              <span>{{ row.nickname }}</span>
              <strong>🔥 {{ row.current_streak }}</strong>
            </li>
          </ol>
        </template>
        <template v-else>
          <h2>加入小組比連勝</h2>
          <form @submit.prevent="addGroup">
            <input v-model="groupName" maxlength="30" placeholder="建立小組名稱" />
            <button>建立小組</button>
          </form>
          <p class="sub">或</p>
          <form @submit.prevent="join">
            <input v-model="inviteCode" placeholder="輸入朋友給你的邀請碼" />
            <button>加入小組</button>
          </form>
        </template>
      </section>
    </template>
  </main>
</template>

<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #0f1115; color: #eee; }
.wrap { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
.card { background: #1a1d24; border-radius: 16px; padding: 20px; margin-top: 16px; text-align: center; }
.card h2 { margin: 0 0 12px; font-size: 18px; }
.fire { font-size: 56px; font-weight: 700; }
.sub { color: #9aa; font-size: 14px; }
.sub a { color: #9aa; }
.status.at_risk { color: #ffb020; }
.status.safe { color: #4cd964; }
form { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
input { padding: 12px; border-radius: 10px; border: 1px solid #2a2e37; background: #0f1115; color: #eee; font-size: 16px; }
button { padding: 14px; border: 0; border-radius: 12px; font-size: 16px; background: #ff6b35; color: #fff; cursor: pointer; }
button:disabled { background: #444; cursor: default; }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.tab { padding: 8px 12px; font-size: 14px; background: #2a2e37; }
.tab.on { background: #ff6b35; }
code { background: #0f1115; padding: 2px 8px; border-radius: 6px; user-select: all; }
ol { list-style: none; padding: 0; text-align: left; }
li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2a2e37; }
.err { color: #ff6b6b; }
</style>
