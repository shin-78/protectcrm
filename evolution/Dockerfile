FROM evoapicloud/evolution-api:latest

# Copy custom entrypoint that handles P3005 migration baseline
COPY entrypoint.sh /usr/local/bin/protectcrm-entrypoint.sh
RUN chmod +x /usr/local/bin/protectcrm-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/protectcrm-entrypoint.sh"]
