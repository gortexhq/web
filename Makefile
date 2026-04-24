# Gortex web — Makefile
#
# Thin wrapper around npm scripts so CI, local workflows, and the parent
# gortex repo's `make *-ui` targets share the same vocabulary.

NPM ?= npm

.PHONY: help install dev build start lint typecheck check clean distclean

help:
	@echo "Targets:"
	@echo "  install    — install npm dependencies (npm ci when package-lock is clean)"
	@echo "  dev        — run Next.js dev server on :3000"
	@echo "  build      — production build (next build)"
	@echo "  start      — serve the production build"
	@echo "  lint       — next lint"
	@echo "  typecheck  — tsc --noEmit"
	@echo "  check      — typecheck + lint + build (same as CI)"
	@echo "  clean      — remove .next and build artifacts"
	@echo "  distclean  — clean + drop node_modules"

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

start:
	$(NPM) run start

lint:
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

check: typecheck lint build

clean:
	rm -rf .next out tsconfig.tsbuildinfo

distclean: clean
	rm -rf node_modules
