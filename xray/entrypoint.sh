#!/bin/sh
set -e

if [ -z "$XRAY_ADDRESS" ] || [ -z "$XRAY_PORT" ] || [ -z "$XRAY_ID" ]; then
    echo "ERROR: XRAY_ADDRESS, XRAY_PORT and XRAY_ID must be set"
    exit 1
fi

envsubst < /etc/xray/client.json.template > /etc/xray/config.json
exec /usr/bin/xray -config /etc/xray/config.json
