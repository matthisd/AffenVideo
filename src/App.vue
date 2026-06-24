<template>
  <div id="app" class="min-h-screen bg-gray-900">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import WebSocketManager from './services/websocket.js'

const store = useStore()

onMounted(() => {
  // Initialize WebSocket connection on app mount
  const wsManager = new WebSocketManager(
    'ws://localhost:8080',
    (message) => {
      store.dispatch('handleWebSocketMessage', message)
    }
  )
  
  store.commit('setWebSocketManager', wsManager)
  wsManager.connect().catch(() => {
    console.log('WebSocket connection pending - will retry')
  })
})

onUnmounted(() => {
  const wsManager = store.state.wsManager
  if (wsManager) {
    wsManager.disconnect()
  }
})
</script>

<style scoped>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
