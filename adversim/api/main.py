"""
FastAPI Backend Main API Module
"""
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

app = FastAPI(title="AdverSim API", description="Cyber Defense Simulation Framework Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "AdverSim Cyber Defense Simulator", "version": "1.0.0"}

@app.get("/api/sim/state")
async def get_simulation_state():
    return {
        "status": "active",
        "current_round": 10,
        "nodes_count": 7,
        "active_condition": "F"
    }
