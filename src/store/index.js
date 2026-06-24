import { createStore } from 'vuex'

const store = createStore({
  state() {
    return {
      currentVideo: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      videos: [],
      connectedDevices: [],
      wsConnected: false,
      wsManager: null,
      notes: []
    }
  },
  mutations: {
    setCurrentVideo(state, video) {
      state.currentVideo = video
    },
    setIsPlaying(state, isPlaying) {
      state.isPlaying = isPlaying
    },
    setCurrentTime(state, time) {
      state.currentTime = time
    },
    setDuration(state, duration) {
      state.duration = duration
    },
    setVideos(state, videos) {
      state.videos = videos
    },
    addVideo(state, video) {
      state.videos.push(video)
    },
    setConnectedDevices(state, devices) {
      state.connectedDevices = devices
    },
    addDevice(state, device) {
      if (!state.connectedDevices.find(d => d.id === device.id)) {
        state.connectedDevices.push(device)
      }
    },
    removeDevice(state, deviceId) {
      state.connectedDevices = state.connectedDevices.filter(d => d.id !== deviceId)
    },
    setWSConnected(state, connected) {
      state.wsConnected = connected
    },
    setWebSocketManager(state, manager) {
      state.wsManager = manager
    },
    addNote(state, note) {
      state.notes.push(note)
    }
  },
  actions: {
    updateCurrentVideo({ commit }, video) {
      commit('setCurrentVideo', video)
    },
    updatePlayStatus({ commit }, isPlaying) {
      commit('setIsPlaying', isPlaying)
    },
    updateTime({ commit }, time) {
      commit('setCurrentTime', time)
    },
    updateDuration({ commit }, duration) {
      commit('setDuration', duration)
    },
    loadVideos({ commit }, videos) {
      commit('setVideos', videos)
    },
    registerDevice({ commit }, device) {
      commit('addDevice', device)
    },
    unregisterDevice({ commit }, deviceId) {
      commit('removeDevice', deviceId)
    },
    setConnectionStatus({ commit }, status) {
      commit('setWSConnected', status)
    },
    handleWebSocketMessage({ commit, dispatch }, message) {
      console.log('WebSocket message:', message)
      
      switch (message.type) {
        case 'device_connected':
          commit('addDevice', message.device)
          break
        case 'device_disconnected':
          commit('removeDevice', message.device.id)
          break
        case 'connection_status':
          commit('setWSConnected', message.connected)
          break
      }
    }
  },
  getters: {
    currentVideo: state => state.currentVideo,
    isPlaying: state => state.isPlaying,
    currentTime: state => state.currentTime,
    duration: state => state.duration,
    videos: state => state.videos,
    connectedDevices: state => state.connectedDevices,
    isWSConnected: state => state.wsConnected,
    notes: state => state.notes
  }
})

export default store
