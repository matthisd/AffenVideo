import { createApp } from 'vue'
import { createStore } from 'vuex'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import VideoPlayer from './views/VideoPlayer.vue'
import store from './store/index.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'VideoPlayer',
      component: VideoPlayer
    }
  ]
})

const app = createApp(App)
app.use(store)
app.use(router)
app.mount('#app')
