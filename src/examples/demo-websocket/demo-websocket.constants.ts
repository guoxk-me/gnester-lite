// AI modified: runtime handlers and AsyncAPI share one event inventory to prevent contract drift.
export const DEMO_WEBSOCKET_NAMESPACE = 'demo-websocket';

export const DEMO_WEBSOCKET_EVENTS = {
  Scenarios: 'demo-websocket.scenarios',
  Ping: 'demo-websocket.ping',
  Pong: 'demo-websocket.pong',
  RoomJoin: 'demo-websocket.room.join',
  RoomJoined: 'demo-websocket.room.joined',
  RoomMessage: 'demo-websocket.message',
  MessageAccepted: 'demo-websocket.message.accepted',
  HandshakeError: 'demo-websocket.error',
  Exception: 'demo-websocket.exception',
  Intercepted: 'demo-websocket.intercepted',
} as const;

export type DemoWebsocketEventName =
  (typeof DEMO_WEBSOCKET_EVENTS)[keyof typeof DEMO_WEBSOCKET_EVENTS];
