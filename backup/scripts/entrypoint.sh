#!/bin/sh
# Entrypoint for backup container – just start cron in foreground
exec crond -f
