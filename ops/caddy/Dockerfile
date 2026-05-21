# Custom Caddy image with the rate-limit module for edge abuse protection.
# Stock Caddy has no rate limiting, so we build it in with xcaddy.
FROM caddy:2.10.2-builder AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2.10.2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
