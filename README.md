# AffenVideo - Standalone Video Player

A Vue.js-based video player for observing baboon behavior. This application runs completely standalone without requiring an external server and communicates with AffenApp over a local network via WebSocket.

## Features

- **Standalone Vue.js Application**: Built with Vue 3, Vuex, and Vue Router
- **Local Network Communication**: WebSocket-based communication with AffenApp
- **Video Playback Controls**: Play, pause, seek, and progress tracking
- **Local Video Storage**: Support for video uploads and local storage
- **Multi-device Support**: Track connected AffenApp instances
- **Responsive Design**: Works on desktop and tablet devices
- **Real-time Synchronization**: Video state synchronized between apps

## Installation

### Prerequisites
- Node.js 14+ and npm

### Setup

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:5173`

3. The app will automatically attempt to connect to AffenApp on the local network

4. Upload or select videos from the sidebar

5. Use the video controls to play, pause, and seek

## Communication Protocol

The application communicates with AffenApp using WebSocket messages:

### Video Control Messages

```json
{
  "type": "video_state",
  "action": "play|pause",
  "timestamp": 0,
  "video": "video/filename.mp4"
}
```

### Video Selection

```json
{
  "type": "video_selected",
  "video": {
    "id": 1,
    "name": "Video Name",
    "path": "video/path.mp4"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Device Registration

```json
{
  "type": "device_register",
  "device": {
    "type": "video_player",
    "name": "AffenVideo Player",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Architecture

### Components

- **VideoPlayer.vue**: Main video player component with controls
- **WebSocketManager**: Handles WebSocket communication with reconnection logic
- **Vuex Store**: Centralized state management

### Directory Structure

```
src/
├── main.js              # Application entry point
├── App.vue              # Root component
├── views/
│   └── VideoPlayer.vue  # Main video player view
├── services/
│   └── websocket.js     # WebSocket communication manager
└── store/
    └── index.js         # Vuex store configuration
```

## Network Setup

The application automatically detects and connects to AffenApp on the local network. It attempts to connect to common local IP addresses:

- `192.168.1.1`
- `192.168.0.1`
- `10.0.0.1`
- `localhost`

For custom network configurations, modify the IP addresses in `src/views/VideoPlayer.vue`'s `detectNetworkAndConnect()` method.

## Development

### Debugging

Open the browser's Developer Tools (F12) to view:
- WebSocket connection status
- Message logs
- Network activity

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## License

MIT License

## Contributing

Contributions are welcome! Please create a feature branch and submit a pull request.
