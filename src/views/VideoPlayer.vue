<template>
  <div class="video-player-container">
    <!-- Main Video Section -->
    <div class="video-main-area">
      <div class="video-wrapper">
        <video
          ref="videoElement"
          class="video-element"
          :src="currentVideoPath"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @timeupdate="onTimeUpdate"
          @loadedmetadata="onLoadedMetadata"
          @ended="onVideoEnded"
        ></video>
        
        <div class="video-overlay" v-if="!isPlaying">
          <button @click="togglePlayPause" class="play-button">
            <span class="play-icon">▶</span>
          </button>
        </div>
      </div>

      <!-- Video Controls -->
      <div class="video-controls-bar">
        <div class="controls-left">
          <button @click="togglePlayPause" class="control-button">
            <span v-if="isPlaying">⏸</span>
            <span v-else>▶</span>
          </button>
          <button @click="stopVideo" class="control-button" title="Stop">
            ⏹
          </button>
          <div class="time-display">
            <span>{{ formatTime(currentTime) }}</span>
            <span class="time-separator">/</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>
        
        <input
          type="range"
          :value="currentTime"
          :max="duration"
          @input="seekVideo"
          class="progress-bar"
        />
        
        <div class="controls-right">
          <button @click="toggleMute" class="control-button" title="Mute">
            <span v-if="isMuted">🔇</span>
            <span v-else>🔊</span>
          </button>
          <input
            type="range"
            min="0"
            max="100"
            :value="volume"
            @input="setVolume"
            class="volume-slider"
          />
          <button @click="toggleFullscreen" class="control-button" title="Fullscreen">
            ⛶
          </button>
        </div>
      </div>

      <!-- Video Info -->
      <div class="video-info-bar">
        <div class="info-item">
          <span class="info-label">Status:</span>
          <span class="info-value">{{ isPlaying ? 'Playing' : 'Paused' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Video:</span>
          <span class="info-value truncate">{{ currentVideoName }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Connected Devices:</span>
          <span class="info-value">{{ connectedDevices.length }}</span>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <div class="sidebar">
      <!-- Connection Status -->
      <div class="panel connection-panel">
        <div class="panel-header">
          <h3>Connection Status</h3>
          <span class="status-indicator" :class="{ connected: isConnected, disconnected: !isConnected }"></span>
        </div>
        <div class="panel-content">
          <p class="status-text">{{ isConnected ? '✓ Connected to AffenApp' : '✗ Waiting for connection' }}</p>
          <div class="devices-list">
            <p v-if="connectedDevices.length === 0" class="empty-text">No devices connected</p>
            <div v-for="device in connectedDevices" :key="device.id" class="device-item">
              <span class="device-name">{{ device.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Video Library -->
      <div class="panel videos-panel">
        <div class="panel-header">
          <h3>Video Library</h3>
        </div>
        <div class="panel-content">
          <div v-if="availableVideos.length === 0" class="empty-text">
            No videos available
          </div>
          <div v-else class="videos-list">
            <button
              v-for="video in availableVideos"
              :key="video.id"
              @click="selectVideo(video)"
              class="video-item"
              :class="{ active: currentVideoId === video.id }"
              :title="video.name"
            >
              <span class="video-item-name">{{ video.name }}</span>
              <span class="video-item-size">{{ formatFileSize(video.size) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Upload Section -->
      <div class="panel upload-panel">
        <div class="panel-header">
          <h3>Upload Video</h3>
        </div>
        <div class="panel-content">
          <label class="file-upload-label">
            <input
              type="file"
              accept="video/*"
              @change="handleVideoUpload"
              class="file-input-hidden"
            />
            <span class="file-upload-button">Choose Video</span>
          </label>
          <p v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            Uploading: {{ uploadProgress }}%
          </p>
        </div>
      </div>

      <!-- Observation Notes -->
      <div class="panel notes-panel">
        <div class="panel-header">
          <h3>Observation Notes</h3>
        </div>
        <div class="panel-content">
          <textarea
            v-model="newNote"
            placeholder="Add observation notes..."
            class="note-input"
            @keyup.ctrl.enter="addNote"
          ></textarea>
          <button @click="addNote" class="add-note-button">Add Note</button>
          <div v-if="notes.length > 0" class="notes-list">
            <div v-for="(note, idx) in notes" :key="idx" class="note-item">
              <span class="note-time">{{ note.time }}</span>
              <span class="note-text">{{ note.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const videoElement = ref(null)
const isPlaying = ref(false)
const isMuted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(100)
const uploadProgress = ref(0)
const newNote = ref('')
const notes = ref([])

const currentVideoId = ref(1)
const availableVideos = ref([
  { id: 1, name: 'Sample Video 1.mp4', path: 'videos/sample1.mp4', size: 5242880 },
  { id: 2, name: 'Sample Video 2.mp4', path: 'videos/sample2.mp4', size: 3145728 }
])

const currentVideoPath = computed(() => {
  const video = availableVideos.value.find(v => v.id === currentVideoId.value)
  return video ? video.path : ''
})

const currentVideoName = computed(() => {
  const video = availableVideos.value.find(v => v.id === currentVideoId.value)
  return video ? video.name : 'No video selected'
})

const isConnected = computed(() => store.state.wsConnected)
const connectedDevices = computed(() => store.state.connectedDevices)

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

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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

const stopVideo = () => {
  if (videoElement.value) {
    videoElement.value.pause()
    videoElement.value.currentTime = 0
    isPlaying.value = false
  }
}

const seekVideo = (event) => {
  if (videoElement.value) {
    videoElement.value.currentTime = parseFloat(event.target.value)
  }
}

const toggleMute = () => {
  if (videoElement.value) {
    videoElement.value.muted = !videoElement.value.muted
    isMuted.value = videoElement.value.muted
  }
}

const setVolume = (event) => {
  const vol = parseFloat(event.target.value)
  volume.value = vol
  if (videoElement.value) {
    videoElement.value.volume = vol / 100
  }
}

const toggleFullscreen = () => {
  if (videoElement.value?.requestFullscreen) {
    videoElement.value.requestFullscreen()
  }
}

const onVideoPlay = () => {
  isPlaying.value = true
  const wsManager = store.state.wsManager
  if (wsManager?.isConnected) {
    wsManager.sendMessage({
      type: 'video_state',
      action: 'play',
      video: currentVideoName.value,
      timestamp: currentTime.value,
      time: new Date().toISOString()
    })
  }
}

const onVideoPause = () => {
  isPlaying.value = false
  const wsManager = store.state.wsManager
  if (wsManager?.isConnected) {
    wsManager.sendMessage({
      type: 'video_state',
      action: 'pause',
      video: currentVideoName.value,
      timestamp: currentTime.value,
      time: new Date().toISOString()
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

const onVideoEnded = () => {
  isPlaying.value = false
}

const selectVideo = (video) => {
  currentVideoId.value = video.id
  if (videoElement.value) {
    videoElement.value.src = video.path
    videoElement.value.load()
  }
  const wsManager = store.state.wsManager
  if (wsManager?.isConnected) {
    wsManager.sendMessage({
      type: 'video_selected',
      video: video.name,
      timestamp: new Date().toISOString()
    })
  }
}

const handleVideoUpload = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      uploadProgress.value = Math.min(progress, 90)
      if (progress >= 90) {
        clearInterval(interval)
        uploadProgress.value = 100
        
        // Add to video list after upload
        const newVideo = {
          id: Math.max(...availableVideos.value.map(v => v.id), 0) + 1,
          name: file.name,
          path: `videos/${file.name}`,
          size: file.size
        }
        availableVideos.value.push(newVideo)
        
        setTimeout(() => {
          uploadProgress.value = 0
        }, 1000)
        
        const wsManager = store.state.wsManager
        if (wsManager?.isConnected) {
          wsManager.sendMessage({
            type: 'video_uploaded',
            video: newVideo.name,
            timestamp: new Date().toISOString()
          })
        }
      }
    }, 200)
  }
}

const addNote = () => {
  if (newNote.value.trim()) {
    notes.value.push({
      time: formatTime(currentTime.value),
      text: newNote.value.trim()
    })
    newNote.value = ''
  }
}

onMounted(() => {
  const wsManager = store.state.wsManager
  if (wsManager) {
    wsManager.connect().catch(() => {
      console.log('Will retry connection')
    })
  }
})

onUnmounted(() => {
  // Cleanup
})
</script>

<style scoped>
.video-player-container {
  display: flex;
  height: 100vh;
  background-color: #111827;
  color: #e5e7eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  gap: 1rem;
  padding: 1rem;
}

.video-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.video-wrapper {
  flex: 1;
  position: relative;
  background-color: #000;
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(76, 175, 80, 0.8);
  border: none;
  color: white;
  font-size: 40px;
  cursor: pointer;
  transition: all 0.3s;
}

.play-button:hover {
  background-color: rgba(76, 175, 80, 1);
  transform: scale(1.1);
}

.video-controls-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: #1f2937;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-button {
  background: none;
  border: none;
  color: #e5e7eb;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
}

.control-button:hover {
  color: #4caf50;
}

.time-display {
  font-size: 0.875rem;
  color: #9ca3af;
  white-space: nowrap;
  min-width: 100px;
}

.time-separator {
  margin: 0 0.25rem;
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
  background-color: #4caf50;
  cursor: pointer;
}

.progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #4caf50;
  cursor: pointer;
  border: none;
}

.volume-slider {
  width: 80px;
  height: 4px;
  cursor: pointer;
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
  background-color: rgba(255, 255, 255, 0.2);
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #4caf50;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #4caf50;
  cursor: pointer;
  border: none;
}

.video-info-bar {
  display: flex;
  gap: 2rem;
  background-color: #1f2937;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  color: #9ca3af;
  font-weight: 500;
}

.info-value {
  color: #4caf50;
  font-weight: 600;
}

.sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.panel {
  background-color: #1f2937;
  border-radius: 0.5rem;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #111827;
  padding: 1rem;
  border-bottom: 1px solid #374151;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f3f4f6;
}

.panel-content {
  padding: 1rem;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #6b7280;
  display: inline-block;
  transition: background-color 0.3s;
}

.status-indicator.connected {
  background-color: #4caf50;
  box-shadow: 0 0 8px #4caf50;
}

.status-indicator.disconnected {
  background-color: #ef4444;
}

.status-text {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #d1d5db;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.device-item {
  padding: 0.5rem;
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4caf50;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.device-name {
  color: #a3e635;
}

.empty-text {
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem 0;
  margin: 0;
}

.videos-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.video-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: #374151;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  color: #d1d5db;
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.video-item:hover {
  background-color: #4b5563;
  border-color: #4caf50;
}

.video-item.active {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
  font-weight: 600;
}

.video-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-item-size {
  color: #9ca3af;
  font-size: 0.75rem;
}

.file-upload-label {
  display: block;
}

.file-input-hidden {
  display: none;
}

.file-upload-button {
  display: block;
  padding: 0.75rem;
  background-color: #4caf50;
  color: white;
  text-align: center;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.file-upload-button:hover {
  background-color: #45a049;
}

.upload-progress {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
}

.note-input {
  width: 100%;
  height: 80px;
  padding: 0.5rem;
  background-color: #374151;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  font-family: inherit;
  font-size: 0.875rem;
  resize: none;
  margin-bottom: 0.5rem;
}

.note-input:focus {
  outline: none;
  border-color: #4caf50;
  background-color: #4b5563;
}

.add-note-button {
  width: 100%;
  padding: 0.5rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.add-note-button:hover {
  background-color: #45a049;
}

.notes-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.note-item {
  padding: 0.5rem;
  background-color: #374151;
  border-left: 3px solid #4caf50;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.note-time {
  color: #9ca3af;
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.note-text {
  color: #d1d5db;
  line-height: 1.4;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .video-player-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    max-height: 300px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .video-player-container {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .video-controls-bar {
    flex-wrap: wrap;
  }
  
  .progress-bar {
    order: 3;
    flex-basis: 100%;
    margin: 0.5rem 0;
  }
  
  .sidebar {
    display: none;
  }
}
</style>
