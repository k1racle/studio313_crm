FROM ghcr.io/xtls/xray-core:latest

COPY client.json.template /etc/xray/client.json.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 1080

ENTRYPOINT ["/entrypoint.sh"]
