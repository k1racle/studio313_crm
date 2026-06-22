FROM ghcr.io/xtls/xray-core:latest

RUN apk add --no-cache gettext

COPY client.json.template /etc/xray/client.json.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 1080

ENTRYPOINT ["/entrypoint.sh"]
