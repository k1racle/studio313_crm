FROM ghcr.io/xtls/xray-core:latest

COPY client.json /etc/xray/config.json

EXPOSE 1080

ENTRYPOINT ["/usr/bin/xray"]
CMD ["-config", "/etc/xray/config.json"]
