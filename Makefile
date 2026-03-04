DOCKER_REGISTRY=deepcode
SERVER_IMAGE=$(DOCKER_REGISTRY)/chat-studio-web
VERSION=preview

build-x-web:
	@echo "Building Web Docker image: $(SERVER_IMAGE)\:$(VERSION)"
	docker buildx build --platform linux/amd64 -t $(SERVER_IMAGE):$(VERSION) ./
	docker save -o chat-studio-web-$(VERSION).tar $(SERVER_IMAGE):$(VERSION)
	@echo "Server Docker image built successfully: $(SERVER_IMAGE)\:$(VERSION)"

build-web:
	@echo "Building Web Docker image: $(SERVER_IMAGE)\:$(VERSION)"
	docker build -t $(SERVER_IMAGE):$(VERSION) ./
	docker save -o chat-studio-web-$(VERSION).tar $(SERVER_IMAGE):$(VERSION)
	@echo "Server Docker image built successfully: $(SERVER_IMAGE)\:$(VERSION)"

.PHONY: build-web
