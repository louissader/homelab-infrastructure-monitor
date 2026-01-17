"""
WebSocket endpoint for real-time metrics streaming.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import logging
import json
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # All active connections
        self.active_connections: Set[WebSocket] = set()
        # Connections subscribed to specific hosts
        self.host_subscriptions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        # Remove from all host subscriptions
        for host_id in list(self.host_subscriptions.keys()):
            self.host_subscriptions[host_id].discard(websocket)
            if not self.host_subscriptions[host_id]:
                del self.host_subscriptions[host_id]
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    def subscribe_to_host(self, websocket: WebSocket, host_id: str):
        """Subscribe a connection to updates for a specific host."""
        if host_id not in self.host_subscriptions:
            self.host_subscriptions[host_id] = set()
        self.host_subscriptions[host_id].add(websocket)
        logger.debug(f"WebSocket subscribed to host {host_id}")

    def unsubscribe_from_host(self, websocket: WebSocket, host_id: str):
        """Unsubscribe a connection from a specific host."""
        if host_id in self.host_subscriptions:
            self.host_subscriptions[host_id].discard(websocket)
            if not self.host_subscriptions[host_id]:
                del self.host_subscriptions[host_id]

    async def broadcast(self, message: dict):
        """Send a message to all connected clients."""
        if not self.active_connections:
            return

        data = json.dumps(message)
        disconnected = set()

        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception as e:
                logger.warning(f"Failed to send message: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_host_subscribers(self, host_id: str, message: dict):
        """Send a message to all clients subscribed to a specific host."""
        subscribers = self.host_subscriptions.get(host_id, set())
        if not subscribers:
            return

        data = json.dumps(message)
        disconnected = set()

        for connection in subscribers:
            try:
                await connection.send_text(data)
            except Exception as e:
                logger.warning(f"Failed to send message to subscriber: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific client."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")


# Global connection manager instance
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance."""
    return manager


@router.websocket("/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    WebSocket endpoint for real-time metrics streaming.

    Clients can send JSON messages to:
    - Subscribe to specific hosts: {"action": "subscribe", "host_id": "uuid"}
    - Unsubscribe from hosts: {"action": "unsubscribe", "host_id": "uuid"}
    - Ping: {"action": "ping"}

    Server will send:
    - Metrics updates: {"type": "metric", "host_id": "uuid", "data": {...}}
    - Alerts: {"type": "alert", "data": {...}}
    - Host status changes: {"type": "host_status", "host_id": "uuid", "status": "online/offline"}
    - Pong responses: {"type": "pong"}
    """
    await manager.connect(websocket)

    try:
        # Send welcome message
        await manager.send_personal_message(websocket, {
            "type": "connected",
            "message": "Connected to HomeLab Monitor WebSocket"
        })

        while True:
            try:
                # Wait for messages from client
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=60.0  # Send ping after 60 seconds of inactivity
                )

                try:
                    message = json.loads(data)
                    action = message.get("action")

                    if action == "subscribe":
                        host_id = message.get("host_id")
                        if host_id:
                            manager.subscribe_to_host(websocket, host_id)
                            await manager.send_personal_message(websocket, {
                                "type": "subscribed",
                                "host_id": host_id
                            })

                    elif action == "unsubscribe":
                        host_id = message.get("host_id")
                        if host_id:
                            manager.unsubscribe_from_host(websocket, host_id)
                            await manager.send_personal_message(websocket, {
                                "type": "unsubscribed",
                                "host_id": host_id
                            })

                    elif action == "ping":
                        await manager.send_personal_message(websocket, {"type": "pong"})

                except json.JSONDecodeError:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "message": "Invalid JSON"
                    })

            except asyncio.TimeoutError:
                # Send heartbeat ping
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    break

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def broadcast_metric(host_id: str, metric_data: dict):
    """
    Broadcast a new metric to all subscribers.
    Called from the metrics endpoint when new metrics are received.
    """
    message = {
        "type": "metric",
        "host_id": host_id,
        "data": metric_data
    }
    # Send to all connections and host-specific subscribers
    await manager.broadcast(message)


async def broadcast_alert(alert_data: dict):
    """Broadcast a new alert to all connected clients."""
    message = {
        "type": "alert",
        "data": alert_data
    }
    await manager.broadcast(message)


async def broadcast_host_status(host_id: str, status: str):
    """Broadcast host status change to all connected clients."""
    message = {
        "type": "host_status",
        "host_id": host_id,
        "status": status
    }
    await manager.broadcast(message)
