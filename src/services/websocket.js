/**
 * WebSocket Manager for communication between AffenVideo and AffenApp
 * Handles connection, message sending/receiving, and reconnection logic
 */

class WebSocketManager {
  constructor(url, messageHandler) {
    this.url = url
    this.messageHandler = messageHandler
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 2000
    this.messageQueue = []
  }

  /**
   * Establish WebSocket connection
   */
  connect(customUrl = null) {
    return new Promise((resolve, reject) => {
      try {
        const url = customUrl || this.url
        console.log(`Attempting WebSocket connection to ${url}`)

        this.socket = new WebSocket(url)

        this.socket.onopen = () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.flushMessageQueue()
          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log('WebSocket message received:', message)
            if (this.messageHandler) {
              this.messageHandler(message)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.socket.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnected = false
          this.attemptReconnect()
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        reject(error)
      }
    })
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message) {
    if (this.isConnected && this.socket) {
      try {
        this.socket.send(JSON.stringify(message))
        console.log('WebSocket message sent:', message)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        this.messageQueue.push(message)
      }
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
      console.log('Message queued (not connected):', message)
    }
  }

  /**
   * Send queued messages
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.sendMessage(message)
    }
  }

  /**
   * Attempt to reconnect after disconnection
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 3))
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will try again
        })
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.isConnected = false
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus() {
    return this.isConnected
  }
}

export default WebSocketManager
