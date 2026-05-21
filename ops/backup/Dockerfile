# syntax=docker/dockerfile:1
FROM postgres:18-bookworm@sha256:47855c76129d1383e7efc66a1a776e33c9171b3450e95deb822119e02eaab592

ARG TARGETARCH
ARG AGE_VERSION=1.2.1
ARG AGE_SHA256_amd64=7df45a6cc87d4da11cc03a539a7470c15b1041ab2b396af088fe9990f7c79d50
ARG AGE_SHA256_arm64=57fd79a7ece5fe501f351b9dd51a82fbee1ea8db65a8839db17f5c080245e99f

USER root
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*; \
    case "$TARGETARCH" in \
      amd64) AGE_SHA="$AGE_SHA256_amd64" ;; \
      arm64) AGE_SHA="$AGE_SHA256_arm64" ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    url="https://github.com/FiloSottile/age/releases/download/v${AGE_VERSION}/age-v${AGE_VERSION}-linux-${TARGETARCH}.tar.gz"; \
    curl -fsSL "$url" -o /tmp/age.tgz; \
    echo "${AGE_SHA}  /tmp/age.tgz" | sha256sum -c -; \
    tar -xzf /tmp/age.tgz -C /tmp; \
    install -m 0755 /tmp/age/age /usr/local/bin/age; \
    rm -rf /tmp/age /tmp/age.tgz; \
    age --version

COPY backup.sh lib-prune.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/lib-prune.sh

USER postgres
ENTRYPOINT ["/usr/local/bin/backup.sh"]
