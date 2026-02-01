.PHONY: setup help check jj-push jj-status jj-log

help:
	@echo Available targets:
	@echo   make setup      - Initial project setup
	@echo   make check      - Run biome linter and build
	@echo   make fixformat  - Format the project with biome
	@echo   make jj-push BOOKMARK=name - Push bookmark to remote
	@echo   make jj-status  - Show jj status
	@echo   make jj-log     - Show jj log

setup:
	@echo "=== Personal Website Setup ==="
	@echo ""
	@echo "Checking bun..."
	@bun --version || (echo "ERROR: bun is not installed" && exit 1)
	@echo ""
	@echo "Checking jj..."
	-@jj --version || echo "WARNING: jj is not installed (optional)"
	@echo ""
	@echo "Installing dependencies..."
	@bun install
	@echo ""
	@echo "Setup complete!"

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
	@echo "Pushing bookmark: $(BOOKMARK)"
	jj bookmark set $(BOOKMARK)
	-jj bookmark track $(BOOKMARK) --remote=origin
	jj git push --bookmark $(BOOKMARK) --allow-new

jj-status:
	jj status

jj-log:
	jj log