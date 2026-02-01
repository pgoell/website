.PHONY: setup help check jj-push

help:
	@echo Available targets:
	@echo   make setup - Initial project setup
	@echo   make check - Run biome linter and build
	@echo   make format - Format the project with biome
	@echo   make jj-push BOOKMARK=name - Push bookmark to remote (auto-track and set)

setup:
	@echo Running setup...
	@bash scripts/setup.sh

check:
	@echo Running biome linter...
	bun run check
	@echo Building the project...
	bun run build

fixformat:
	@echo Formatting the project with biome...
	bun run fix

jj-push:
ifndef BOOKMARK
	@echo "Error: BOOKMARK not specified"
	@echo "Usage: make jj-push BOOKMARK=feature/my-feature"
	@exit 1
endif
	@bash scripts/jj-push.sh $(BOOKMARK)