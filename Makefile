GO ?= go
DIST := dist
LDFLAGS := -s -w

.PHONY: test artifacts extension all-artifacts clean-artifacts

test:
	$(GO) test ./...

artifacts:
	mkdir -p $(DIST)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -trimpath -ldflags="$(LDFLAGS)" -o $(DIST)/spelling-b-linux-amd64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 $(GO) build -trimpath -ldflags="$(LDFLAGS)" -o $(DIST)/spelling-b-linux-arm64 .
	cd $(DIST) && sha256sum spelling-b-linux-amd64 spelling-b-linux-arm64 > SHA256SUMS

extension:
	PATH="$(dir $(GO)):$$PATH" ./scripts/build-extension.sh

all-artifacts: artifacts extension

clean-artifacts:
	rm -f $(DIST)/spelling-b-linux-amd64 $(DIST)/spelling-b-linux-arm64 $(DIST)/SHA256SUMS
	rm -f $(DIST)/spelling-b-chrome-extension.zip $(DIST)/spelling-b-chrome-extension.sha256
	rm -rf $(DIST)/chrome-extension
