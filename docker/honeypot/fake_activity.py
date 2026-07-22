#!/usr/bin/env python3
"""
Honeypot Fake Background Activity Generator
Simulates realistic traffic every 30 seconds:
- Fake logins
- Fake file accesses
- Fake cron jobs
"""
import time
import os
import datetime

print("[HONEYPOT] Background activity generator initialized. Cycle: 30s.")

ACTIVITIES = [
    "FAKE LOGIN: simuser authenticated successfully from 172.20.0.12",
    "FAKE CRON: /usr/sbin/logrotate executed successfully",
    "FAKE FILE ACCESS: read /etc/shadow by security_daemon",
    "FAKE SERVICE: MySQL decoy query executed SELECT * FROM user_credentials",
    "FAKE NETWORK: SSH connection attempt on port 22 from 172.20.0.15",
    "FAKE EXECUTION: /usr/bin/python3 background_audit_collector.py"
]

idx = 0
while True:
    now = datetime.datetime.now().isoformat()
    activity = ACTIVITIES[idx % len(ACTIVITIES)]
    
    # Touch log file to trigger file system audit event
    with open("/tmp/honeypot_decoy_activity.log", "a") as f:
        f.write(f"[{now}] {activity}\n")
    
    # Trigger execution event for auditd execve capture
    os.system("ls -la /tmp > /dev/null")
    
    print(f"[{now}] [HONEYPOT BACKGROUND NOISE] {activity}")
    idx += 1
    time.sleep(30)
