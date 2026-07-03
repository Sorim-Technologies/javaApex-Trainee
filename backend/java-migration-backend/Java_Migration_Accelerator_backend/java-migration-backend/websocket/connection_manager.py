# 1️⃣  Updated ConnectionManager – full file
from fastapi import WebSocket
from collections import defaultdict
import asyncio
import logging
import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Handles WebSocket connections per migration job.
    - Stores active sockets (self.connections)
    - Buffers all messages ever sent (self.message_buffer)
    - Keeps the latest overall job state for instant replay (self.job_state)
    - Performs safe cleanup after terminal jobs.
    """

    def __init__(self):
        # job_id → set of WebSocket objects
        self.connections: defaultdict[str, set[WebSocket]] = defaultdict(set)

        # job_id → list of raw message dicts (kept in chronological order)
        self.message_buffer: defaultdict[str, list[dict]] = defaultdict(list)

        # job_id → dict with the latest aggregated state
        # {
        #   "state": {progress_percent, status, current_step},
        #   "logs":  [ "timestamp level: message", … ],
        #   "completed": bool,
        #   "cleanup_task": asyncio.Task | None
        # }
        self.job_state: defaultdict[str, dict] = defaultdict(dict)

        # lock protects all three structures above
        self.lock = asyncio.Lock()

    # ------------------------------------------------------------------ #
    #  Connection lifecycle
    # ------------------------------------------------------------------ #
    async def connect(self, job_id: str, websocket: WebSocket):
        """Accept a client, register it and immediately replay everything."""
        await websocket.accept()
        logger.info(f"✅ WebSocket connected for job: {job_id}")

        async with self.lock:
            # Register the socket
            self.connections[job_id].add(websocket)
            logger.info(
                f"📊 Total connections for job {job_id}: {len(self.connections[job_id])}"
            )

            # ------------------------------------------------------------------
            # 1️⃣ Replay the latest aggregate state (if any)
            # ------------------------------------------------------------------
            state = self.job_state.get(job_id, {})
            if state.get("state"):
                try:
                    await websocket.send_json(
                        {"type": "state", **state["state"]}  # type: ignore[arg-type]
                    )
                    logger.info(f"🔄 Sent current state to newly‑connected client")
                except Exception as e:
                    logger.error(f"❌ Error sending state replay: {e}")

            # ------------------------------------------------------------------
            # 2️⃣ Replay all buffered log entries (chronological order)
            # ------------------------------------------------------------------
            if state.get("logs"):
                for log_msg in state["logs"]:
                    try:
                        await websocket.send_json(
                            {"type": "log", "timestamp": "", "level": "", "message": log_msg}
                        )
                    except Exception as e:
                        logger.error(f"❌ Error replaying log: {e}")
                        break

    async def disconnect(self, job_id: str, websocket: WebSocket):
        """Remove a socket. When the last client leaves a *terminal* job we start cleanup."""
        logger.info(f"❌ WebSocket disconnected for job: {job_id}")
        async with self.lock:
            if job_id in self.connections:
                self.connections[job_id].discard(websocket)
                if not self.connections[job_id]:
                    del self.connections[job_id]

                    # If the job is already terminal we can schedule a delayed cleanup
                    if self.job_state.get(job_id, {}).get("completed"):
                        # give clients up to 5 min to reconnect
                        task = asyncio.create_task(self._delayed_cleanup(job_id))
                        self.job_state[job_id]["cleanup_task"] = task

    # ------------------------------------------------------------------ #
    #  Broadcasting – always buffers first, then pushes to live sockets
    # ------------------------------------------------------------------ #
    async def broadcast(self, job_id: str, message: dict):
        """
        Send a message to all live clients **and** store it in the buffer.
        The buffer is the single source of truth for replay.
        """
        logger.info(f"📤 Broadcasting to job: {job_id}")

        async with self.lock:
            # --------------------------------------------------------------
            # 1️⃣ Store raw message in the chronological buffer
            # --------------------------------------------------------------
            self.message_buffer[job_id].append(message)

            # --------------------------------------------------------------
            # 2️⃣ Update the aggregated job state (used for instant replay)
            # --------------------------------------------------------------
            state = self.job_state.setdefault(job_id, {"logs": [], "completed": False})
            msg_type = message.get("type")

            if msg_type == "progress":
                # keep latest progress fields
                state["state"] = {
                    "type": "progress",
                    "progress": message.get("progress"),
                    "status": message.get("status"),
                    "message": message.get("message"),
                }
            elif msg_type == "log":
                # store a printable representation for replay
                log_entry = f"{message.get('timestamp')} {message.get('level')}: {message.get('message')}"
                state["logs"].append(log_entry)
            elif msg_type in ("completed", "error"):
                # final state – mark the job as terminal
                state["state"] = {
                    "type": msg_type,
                    "message": message.get("message"),
                }
                state["completed"] = True

            # --------------------------------------------------------------
            # 3️⃣ If no live client – just log and exit (buffer already saved)
            # --------------------------------------------------------------
            if not self.connections.get(job_id):
                logger.warning(
                    f"⏳ No active WebSocket connections for job: {job_id} — "
                    f"message buffered ({len(self.message_buffer[job_id])} total)"
                )
                return

            # --------------------------------------------------------------
            # 4️⃣ Send to all live sockets, collecting dead ones
            # --------------------------------------------------------------
            dead = []
            for ws in self.connections[job_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"❌ Send failed: {e}")
                    dead.append(ws)

        # clean up dead sockets outside the lock
        for ws in dead:
            await self.disconnect(job_id, ws)

    # ------------------------------------------------------------------ #
    #  Cleanup helpers
    # ------------------------------------------------------------------ #
    async def _delayed_cleanup(self, job_id: str, delay_seconds: int = 300):
        """Wait `delay_seconds` (default 5 min) then purge buffers if still no client."""
        logger.info(f"⏳ Scheduling buffer cleanup for job {job_id} in {delay_seconds}s")
        await asyncio.sleep(delay_seconds)
        async with self.lock:
            if not self.connections.get(job_id):
                self._purge_job(job_id)
                logger.info(f"🧹 Cleaned up job {job_id} after timeout")

    def _purge_job(self, job_id: str):
        """Remove all buffered data for a job."""
        if job_id in self.message_buffer:
            logger.info(
                f"🧹 Cleaning up message buffer for job: {job_id} "
                f"({len(self.message_buffer[job_id])} messages)"
            )
            del self.message_buffer[job_id]
        if job_id in self.job_state:
            del self.job_state[job_id]

    # ------------------------------------------------------------------ #
    #  Public API used from `main.py`
    # ------------------------------------------------------------------ #
    async def finalize_job(self, job_id: str):
        """
        Called when migration reaches a terminal state (completed / failed).
        Marks the job as completed and starts the delayed‑cleanup timer.
        """
        async with self.lock:
            state = self.job_state.setdefault(job_id, {})
            state["completed"] = True
            # If there are currently no connections, schedule cleanup
            if not self.connections.get(job_id):
                task = asyncio.create_task(self._delayed_cleanup(job_id))
                state["cleanup_task"] = task
