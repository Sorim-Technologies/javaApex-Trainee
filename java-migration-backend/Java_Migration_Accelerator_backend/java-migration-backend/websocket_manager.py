from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder


class ConnectionManager:
    """Manage one active WebSocket connection per migration job."""

    def __init__(self) -> None:
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, job_id: str, websocket: WebSocket) -> bool:
        existing = self.connections.get(job_id)
        if existing is not None and existing is not websocket:
            try:
                await existing.close(code=1000, reason="Reconnected to a new socket")
            except Exception:
                pass
        self.connections[job_id] = websocket
        return True

    def disconnect(self, job_id: str) -> None:
        self.connections.pop(job_id, None)

    async def send_update(self, job_id: str, data: Dict[str, Any]) -> bool:
        websocket = self.connections.get(job_id)
        if websocket is None:
            return False

        try:
            await websocket.send_json(jsonable_encoder(data))
            return True
        except (RuntimeError, WebSocketDisconnect):
            self.disconnect(job_id)
            return False
        except Exception:
            self.disconnect(job_id)
            return False


manager = ConnectionManager()