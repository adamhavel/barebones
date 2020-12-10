.PHONY: develop test

develop:
	docker-compose -f docker-compose.yml \
				   -f docker-compose.dev.yml \
				   up

run:
	docker-compose -f docker-compose.yml \
				   -f docker-compose.prod.yml \
				   up

test:
	docker-compose -f docker-compose.yml \
			  	   -f docker-compose.test.yml \
			  	   up --abort-on-container-exit

build:
	docker-compose -f docker-compose.yml \
			   	   -f docker-compose.dev.yml \
			   	   -f docker-compose.prod.yml \
			   	   -f docker-compose.test.yml \
			   	   build --compress --parallel --pull