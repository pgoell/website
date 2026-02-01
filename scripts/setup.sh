#!/bin/bash

echo "==================================="
echo "Personal Website Setup"
echo "==================================="
echo ""

# Array to collect errors and warnings
ERRORS=()
WARNINGS=()
HAS_CRITICAL_ERROR=false

# Check if bun is installed
echo "Checking if bun is installed..."
if ! command -v bun &> /dev/null; then
    echo "✗ bun is not installed"
    ERRORS+=("bun is not installed")
    ERRORS+=("  Install bun:")
    ERRORS+=("    Windows (PowerShell): powershell -c \"irm bun.sh/install.ps1 | iex\"")
    ERRORS+=("    Linux/WSL: curl -fsSL https://bun.sh/install | bash")
    HAS_CRITICAL_ERROR=true
else
    echo "✓ bun is installed ($(bun --version))"
fi
echo ""

# Check if jj is installed
echo "Checking if jj (Jujutsu) is installed..."
if ! command -v jj &> /dev/null; then
    echo "⚠ jj is not installed (optional)"
    WARNINGS+=("jj is not installed (optional)")
    WARNINGS+=("  To install jj:")
    WARNINGS+=("    Windows (winget):  winget install jj")
    WARNINGS+=("    Windows (cargo):   cargo install --git https://github.com/martinvonz/jj.git --locked --bin jj jj-cli")
    WARNINGS+=("    Linux/macOS:       cargo install --git https://github.com/martinvonz/jj.git --locked --bin jj jj-cli")
else
    echo "✓ jj is installed ($(jj --version))"

    # Initialize jj if not already done
    if [ ! -d ".jj" ]; then
        echo ""
        echo "Initializing jj in existing git repo..."
        if jj git init --git-repo=.; then
            echo "✓ jj initialized!"
        else
            echo "✗ Failed to initialize jj"
            ERRORS+=("Failed to initialize jj repository")
        fi
    else
        echo "✓ jj already initialized in this repo"
    fi
fi
echo ""

# Report all errors and warnings
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "==================================="
    echo "ERRORS:"
    echo "==================================="
    for error in "${ERRORS[@]}"; do
        echo "$error"
    done
    echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "==================================="
    echo "WARNINGS:"
    echo "==================================="
    for warning in "${WARNINGS[@]}"; do
        echo "$warning"
    done
    echo ""
fi

# Exit with appropriate code
if [ "$HAS_CRITICAL_ERROR" = true ]; then
    echo "Setup cannot continue due to critical errors above."
    exit 1
else
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo "Setup complete with warnings. You may continue but some optional features may not be available."
    else
        echo "✓ Setup complete! All checks passed."
    fi
fi
