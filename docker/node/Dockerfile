FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    auditd \
    audispd-plugins \
    openssh-server \
    python3 \
    python3-pip \
    curl \
    net-tools \
    iproute2 \
    cron \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Setup SSH and test user 'simuser' with password 'sim123'
RUN mkdir /var/run/sshd && \
    useradd -m -s /bin/bash simuser && \
    echo "simuser:sim123" | chpasswd && \
    usermod -aG sudo simuser && \
    echo "root:sim123" | chpasswd

# Configure auditd rules for security monitoring
RUN mkdir -p /etc/audit/rules.d && \
    echo "-a always,exit -F arch=b64 -S execve -k exec_log" >> /etc/audit/rules.d/adversim.rules && \
    echo "-a always,exit -F arch=b64 -S connect,accept -k network_log" >> /etc/audit/rules.d/adversim.rules && \
    echo "-w /etc/passwd -p wa -k identity_log" >> /etc/audit/rules.d/adversim.rules

# Enable SSH password authentication
RUN sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

EXPOSE 22

CMD service auditd start && service cron start && /usr/sbin/sshd -D
