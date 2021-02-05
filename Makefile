.PHONY: develop run test build

develop:
	docker-compose \
		-f docker-compose.yml \
		-f docker-compose.dev.yml \
		up

run:
	docker-compose \
		-f docker-compose.yml \
		-f docker-compose.prod.yml \
		up

test:
	docker-compose \
		-f docker-compose.yml \
		-f docker-compose.dev.yml \
		-f docker-compose.test.yml \
		up

build:
	docker-compose \
		-f docker-compose.yml \
		-f docker-compose.dev.yml \
		-f docker-compose.prod.yml \
		-f docker-compose.test.yml \
		build --compress --parallel

pull:
	docker-compose \
		-f docker-compose.yml \
		-f docker-compose.dev.yml \
		-f docker-compose.prod.yml \
		-f docker-compose.test.yml \
		pull