#!/bin/bash

# Comprehensive log generation script

LOG_DIR="logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
COMPREHENSIVE_LOG="${LOG_DIR}/comprehensive-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

{
    echo "═══════════════════════════════════════════════════════════════"
    echo "        ORDER EXECUTION ENGINE - COMPREHENSIVE LOG REPORT"
    echo "═══════════════════════════════════════════════════════════════"
    echo "Generated: $(date)"
    echo ""
    
    echo "📋 SYSTEM INFORMATION"
    echo "───────────────────────────────────────────────────────────────"
    echo "Node Version: $(node --version)"
    echo "NPM Version: $(npm --version)"
    echo "OS: $(uname -a)"
    echo "Working Directory: $(pwd)"
    echo ""
    
    echo "📦 PROJECT BUILD"
    echo "───────────────────────────────────────────────────────────────"
    npm run build 2>&1
    BUILD_STATUS=$?
    echo ""
    echo "Build Status: $([ $BUILD_STATUS -eq 0 ] && echo '✅ SUCCESS' || echo '❌ FAILED')"
    echo ""
    
    echo "🔍 CODE QUALITY"
    echo "───────────────────────────────────────────────────────────────"
    npm run lint 2>&1
    LINT_STATUS=$?
    echo ""
    echo "Lint Status: $([ $LINT_STATUS -eq 0 ] && echo '✅ PASSED' || echo '⚠️  WARNINGS')"
    echo ""
    
    echo "🧪 TEST EXECUTION"
    echo "───────────────────────────────────────────────────────────────"
    npm test -- --coverage --verbose 2>&1
    TEST_STATUS=$?
    echo ""
    
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    FINAL SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    echo "Build: $([ $BUILD_STATUS -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo "Lint: $([ $LINT_STATUS -eq 0 ] && echo '✅ PASSED' || echo '⚠️  WARNINGS')"
    echo "Tests: $([ $TEST_STATUS -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo ""
    echo "Log files location: $LOG_DIR/"
    echo "═══════════════════════════════════════════════════════════════"
    
} | tee "$COMPREHENSIVE_LOG"

echo ""
echo "✅ Comprehensive log generated: $COMPREHENSIVE_LOG"

