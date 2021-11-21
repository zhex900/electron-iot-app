#! /bin/sh

export URL="$(snapctl get url)"

exec $SNAP/app/electron-kiosk --no-sandbox
