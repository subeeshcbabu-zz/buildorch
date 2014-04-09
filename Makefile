REPORTER = spec
MOCHA = ./node_modules/.bin/mocha

test:
	$(MOCHA) \
		--require chai \
		--reporter $(REPORTER) \
		--timeout 10000 test/orchestrator_test.js
.PHONY: test