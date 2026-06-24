<template>
  <div class="video-player">
    <div class="video-container">
      <video
        ref="videoElement"
        class="video"
        :src="currentVideo"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
      ></video>
      
      <div class="video-controls">
        <button @click="togglePlayPause" class="control-btn">
          {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
        </button>
        <div class="time-display">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>
        <input
          type="range"
          :value="currentTime"
          :max="duration"
          @input="seekVideo"
          class="progress-bar"
        />
      </div>
    </div>

    <div class="sidebar">
      <div class="connection-status">
        <span class="status-dot" :class="{ connected: isConnected }"></span>
        {{ isConnected ? 'Connected to AffenApp' : 'Waiting for connection...' }}
      </div>

      <div class="video-list">
        <h3>Video Library</h3>
        <div class="local-videos">
          <button
            v-for="video in availableVideos"
            :key="video.id"
            @click="selectVideo(video)"
            class="video-item"
            :class="{ active: currentVideo === video.path }"
          >
            {{ video.name }}
          </button>
        </div>

        <div class="upload-section">
          <h4>Upload Video</h4>
          <input
            type="file"
            accept="video/*"
            @change="handleVideoUpload"
            class="file-input"
          />
        </div>
      </div>

      <div class="status-info">
        <h4>Video Info</h4>
        <p>Status: {{ isPlaying ? 'Playing' : 'Paused' }}</p>
        <p>Resolution: {{ videoResolution }}</p>
        <p>Connected Devices: {{ connectedDevices.length }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import WebSocketManager from '../services/websocket.js'

export default {
  name: 'VideoPlayer',
  setup() {
    const store = useStore()
    const videoElement = ref(null)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const videoResolution = ref('1080p')
    const isConnected = ref(false)
    const connectedDevices = ref([])
    const availableVideos = ref([
      { id: 1, name: 'Sample Video 1', path: 'videos/sample1.mp4' },
      { id: 2, name: 'Sample Video 2', path: 'videos/sample2.mp4' }
    ])
    const currentVideo = ref(availableVideos.value[0].path)
    const wsManager = ref(null)

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      }
      return `${minutes}:${String(secs).padStart(2, '0')}`
    }

    const togglePlayPause = () => {
      if (videoElement.value) {
        if (isPlaying.value) {
          videoElement.value.pause()
        } else {
          videoElement.value.play()
        }
      }
    }

    const seekVideo = (event) => {
      if (videoElement.value) {
        videoElement.value.currentTime = event.target.value
      }
    }

    const onVideoPlay = () => {
      isPlaying.value = true
      if (wsManager.value) {
        wsManager.value.sendMessage({
          type: 'video_state',
          action: 'play',
          timestamp: currentTime.value,
          video: currentVideo.value
        })
      }
    }

    const onVideoPause = () => {
      isPlaying.value = false
      if (wsManager.value) {
        wsManager.value.sendMessage({
          type: 'video_state',
          action: 'pause',
          timestamp: currentTime.value,
          video: currentVideo.value
        })
      }
    }

    const onTimeUpdate = () => {
      if (videoElement.value) {
        currentTime.value = videoElement.value.currentTime
      }
    }

    const onLoadedMetadata = () => {
      if (videoElement.value) {
        duration.value = videoElement.value.duration
      }
    }

    const selectVideo = (video) => {
      currentVideo.value = video.path
      if (videoElement.value) {
        videoElement.value.src = video.path
        videoElement.value.load()
      }
      if (wsManager.value) {
        wsManager.value.sendMessage({
          type: 'video_selected',
          video: video,
          timestamp: new Date().toISOString()
        })
      }
    }

    const handleVideoUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const videoName = file.name
          // Store in localStorage for now (in production, use proper storage)
          localStorage.setItem(`video_${videoName}`, e.target.result)
          
          const newVideo = {
            id: availableVideos.value.length + 1,
            name: videoName,
            path: `local:${videoName}`
          }
          availableVideos.value.push(newVideo)
          
          if (wsManager.value) {
            wsManager.value.sendMessage({
              type: 'video_uploaded',
              video: newVideo,
              timestamp: new Date().toISOString()
            })
          }
        }
        reader.readAsArrayBuffer(file)
      }
    }

    const handleWebSocketMessage = (message) => {
      console.log('WebSocket message received:', message)
      
      switch (message.type) {
        case 'play':
          if (videoElement.value && videoElement.value.paused) {
            videoElement.value.play()
          }
          break
        case 'pause':
          if (videoElement.value && !videoElement.value.paused) {
            videoElement.value.pause()
          }
          break
        case 'seek':
          if (videoElement.value) {
            videoElement.value.currentTime = message.timestamp
          }
          break
        case 'load_video':
          selectVideo(message.video)
          break
        case 'device_connected':
          connectedDevices.value.push(message.device)
          break
        case 'device_disconnected':
          connectedDevices.value = connectedDevices.value.filter(
            d => d.id !== message.device.id
          )
          break
      }
    }

    onMounted(() => {
      // Initialize WebSocket connection
      wsManager.value = new WebSocketManager(
        'ws://localhost:8080',
        handleWebSocketMessage
      )
      wsManager.value.connect().then(() => {
        isConnected.value = true
        wsManager.value.sendMessage({
          type: 'device_register',
          device: {
            type: 'video_player',
            name: 'AffenVideo Player',
            timestamp: new Date().toISOString()
          }
        })
      })

      // Try to detect network IP and establish connection
      detectNetworkAndConnect()
    })

    const detectNetworkAndConnect = () => {
      // Attempt to detect local network IP
      const ips = ['192.168.1.1', '192.168.0.1', '10.0.0.1', 'localhost']
      ips.forEach((ip, index) => {
        setTimeout(() => {
          const wsUrl = `ws://${ip}:8080`
          if (wsManager.value && !isConnected.value) {
            wsManager.value.connect(wsUrl).catch(() => {
              console.log(`Failed to connect to ${wsUrl}`)
            })
          }
        }, index * 500)
      })
    }

    onUnmounted(() => {
      if (wsManager.value) {
        wsManager.value.disconnect()
      }
    })

    return {
      videoElement,
      isPlaying,
      currentTime,
      duration,
      videoResolution,
      isConnected,
      connectedDevices,
      availableVideos,
      currentVideo,
      formatTime,
      togglePlayPause,
      seekVideo,
      selectVideo,
      handleVideoUpload,
      onVideoPlay,
      onVideoPause,
      onTimeUpdate,
      onLoadedMetadata
    }
  }
}
</script>

<style scoped>
.video-player {
  display: flex;
  height: 100vh;
  background-color: #1a1a1a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.video-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #000;
  padding: 20px;
}

.video {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}

.video-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  width: 100%;
  max-width: 800px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
}

.control-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background-color: #45a049;
}

.progress-bar {
  flex: 1;
  height: 6px;
  cursor: pointer;
  border-radius: 3px;
  -webkit-appearance: none;
  appearance: none;
  background-color: rgba(255, 255, 255, 0.2);
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #4CAF50;
  cursor: pointer;
}

.progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #4CAF50;
  cursor: pointer;
  border: none;
}

.time-display {
  font-size: 12px;
  color: #aaa;
  white-space: nowrap;
}

.sidebar {
  width: 300px;
  background-color: #2a2a2a;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-left: 1px solid #444;
  overflow-y: auto;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  font-size: 14px;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #999;
  display: inline-block;
  transition: background-color 0.3s;
}

.status-dot.connected {
  background-color: #4CAF50;
  box-shadow: 0 0 8px #4CAF50;
}

.video-list h3 {
  margin-top: 0;
  font-size: 16px;
  color: #fff;
}

.local-videos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-item {
  padding: 10px;
  background-color: #3a3a3a;
  border: 1px solid #444;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  transition: all 0.2s;
}

.video-item:hover {
  background-color: #404040;
  border-color: #555;
}

.video-item.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.upload-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #444;
}

.upload-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #aaa;
}

.file-input {
  display: block;
  width: 100%;
  padding: 8px;
  background-color: #3a3a3a;
  border: 1px dashed #555;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  font-size: 12px;
}

.file-input:hover {
  border-color: #4CAF50;
}

.status-info {
  padding-top: 15px;
  border-top: 1px solid #444;
}

.status-info h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #aaa;
}

.status-info p {
  margin: 5px 0;
  font-size: 12px;
  color: #999;
}

@media (max-width: 1024px) {
  .video-player {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid #444;
    padding: 15px;
  }

  .video {
    max-height: 60vh;
  }
}
</style>
