FROM alpine:latest
RUN apk add --no-cache bash tar postgresql-client cronie
COPY scripts/ /scripts/
COPY crontab /etc/crontabs/root
RUN chmod +x /scripts/*.sh
ENTRYPOINT ["crond","-f"]
