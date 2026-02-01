.PHONY: setup help

help:
	@echo Available targets:
	@echo   make setup - Initial project setup

setup:
	@echo Running setup...
	@bash scripts/setup.sh
