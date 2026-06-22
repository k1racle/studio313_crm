FROM ghcr.io/xtls/xray-core:latest AS xray

FROM alpine:latest
RUN apk add --no-cache ca-certificates

COPY --from=xray /usr/bin/xray /usr/bin/xray
COPY client.json.template /etc/xray/client.json.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 1080

ENTRYPOINT ["/entrypoint.sh"]
