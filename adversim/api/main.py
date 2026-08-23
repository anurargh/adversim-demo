"""
AdverSim API Forwarder
Forwards to canonical simulation.api.main
"""
from simulation.api.main import app, run_standalone_server, live_engine
from simulation.api.websocket_manager import manager

if __name__ == "__main__":
    run_standalone_server()
