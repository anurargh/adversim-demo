"""
AdverSim WebSocket Manager
Handles active WebSocket connections for both FastAPI and standard library Python servers,
supporting broadcast of real-time simulation round ticks, alerts, and live state updates.
"""

import json
import asyncio
import threading
from typing import List, Any, Set


class WebSocketConnectionManager:
    def __init__(self):
        self.active_fastapi_connections: List[Any] = []
        self.raw_ws_clients: Set[Any] = set()
        self.lock = threading.Lock()

    async def connect(self, websocket: Any):
        await websocket.accept()
        with self.lock:
            self.active_fastapi_connections.append(websocket)

    def disconnect(self, websocket: Any):
        with self.lock:
            if websocket in self.active_fastapi_connections:
                self.active_fastapi_connections.remove(websocket)

    def add_raw_client(self, client: Any):
        with self.lock:
            self.raw_ws_clients.add(client)

    def remove_raw_client(self, client: Any):
        with self.lock:
            self.raw_ws_clients.discard(client)

    async def broadcast_json_async(self, data: dict):
        with self.lock:
            connections = list(self.active_fastapi_connections)
        for connection in connections:
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

    def broadcast_sync(self, data: dict):
        """Thread-safe synchronous broadcast for raw WebSocket clients and background workers."""
        msg = json.dumps(data)
        with self.lock:
            raw_clients = list(self.raw_ws_clients)

        for client in raw_clients:
            try:
                client.send_text_frame(msg)
            except Exception:
                self.remove_raw_client(client)

    def broadcast(self, data: dict):
        self.broadcast_sync(data)


manager = WebSocketConnectionManager()
