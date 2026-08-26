#!/bin/bash
# backend/setup_env.sh
# Source this script to configure environment variables for native dependencies (like XGBoost/libomp)

if command -v brew &> /dev/null; then
    LIBOMP_PREFIX=$(brew --prefix libomp 2>/dev/null)
    if [ -n "$LIBOMP_PREFIX" ] && [ -d "$LIBOMP_PREFIX/lib" ]; then
        # Export DYLD_LIBRARY_PATH for direct python invocations
        export DYLD_LIBRARY_PATH="$LIBOMP_PREFIX/lib:$DYLD_LIBRARY_PATH"
        
        # Symlink into the active virtual environment as a fallback for SIP-scrubbed subprocesses
        if [[ -n "$VIRTUAL_ENV" ]]; then
            mkdir -p "$VIRTUAL_ENV/lib"
            ln -sf "$LIBOMP_PREFIX/lib/libomp.dylib" "$VIRTUAL_ENV/lib/libomp.dylib"
        fi
    fi
fi

# Set PYTHONPATH so Python can resolve 'app.main'
export PYTHONPATH="$(pwd)/backend:${PYTHONPATH:-}"

# Alias pytest to bypass macOS System Integrity Protection (SIP) scrubbing of DYLD_LIBRARY_PATH
alias pytest="python -m pytest"

echo "Environment setup complete."
