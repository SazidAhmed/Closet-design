import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { useClosetStore } from './stores/useClosetStore'
import { useHistoryStore } from './stores/useHistoryStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

try {
  const closetStore = useClosetStore(pinia)
  const historyStore = useHistoryStore(pinia)
  closetStore.loadFromLocalStorage()
  historyStore.loadFromLocalStorage()
} catch (e) {
  console.warn('[main] Preloading from localStorage failed:', e)
}

app.mount('#app')
