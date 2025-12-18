#!/bin/bash

# Script to run all tests and generate comprehensive logs

LOG_DIR="logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_LOG_FILE="${LOG_DIR}/test-run-${TIMESTAMP}.log"
SUMMARY_LOG_FILE="${LOG_DIR}/test-summary-${TIMESTAMP}.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "═══════════════════════════════════════════════════════════════" | tee -a "$TEST_LOG_FILE"
echo "           TEST EXECUTION - $(date)" | tee -a "$TEST_LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$TEST_LOG_FILE"
echo "" | tee -a "$TEST_LOG_FILE"

# Run build first
echo "📦 Building project..." | tee -a "$TEST_LOG_FILE"
npm run build 2>&1 | tee -a "$TEST_LOG_FILE"
BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ Build failed!" | tee -a "$TEST_LOG_FILE"
    exit 1
fi

echo "" | tee -a "$TEST_LOG_FILE"
echo "✅ Build successful" | tee -a "$TEST_LOG_FILE"
echo "" | tee -a "$TEST_LOG_FILE"

# Run linting
echo "🔍 Running linter..." | tee -a "$TEST_LOG_FILE"
npm run lint 2>&1 | tee -a "$TEST_LOG_FILE"
LINT_EXIT_CODE=${PIPESTATUS[0]}

echo "" | tee -a "$TEST_LOG_FILE"
if [ $LINT_EXIT_CODE -eq 0 ]; then
    echo "✅ Linting passed" | tee -a "$TEST_LOG_FILE"
else
    echo "⚠️  Linting has warnings (non-blocking)" | tee -a "$TEST_LOG_FILE"
fi
echo "" | tee -a "$TEST_LOG_FILE"

# Run tests with coverage
echo "🧪 Running all tests with coverage..." | tee -a "$TEST_LOG_FILE"
echo "" | tee -a "$TEST_LOG_FILE"

npm test -- --coverage --verbose 2>&1 | tee -a "$TEST_LOG_FILE"
TEST_EXIT_CODE=${PIPESTATUS[0]}

echo "" | tee -a "$TEST_LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$TEST_LOG_FILE"

# Generate summary
{
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    TEST SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    echo "Date: $(date)"
    echo "Build: $([ $BUILD_EXIT_CODE -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo "Lint: $([ $LINT_EXIT_CODE -eq 0 ] && echo '✅ PASSED' || echo '⚠️  WARNINGS')"
    echo "Tests: $([ $TEST_EXIT_CODE -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo ""
    echo "Full test log: $TEST_LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════"
} | tee "$SUMMARY_LOG_FILE"

# Extract test results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL TESTS PASSED" | tee -a "$SUMMARY_LOG_FILE"
    echo "" | tee -a "$SUMMARY_LOG_FILE"
    grep -E "(Test Suites:|Tests:)" "$TEST_LOG_FILE" | tail -2 | tee -a "$SUMMARY_LOG_FILE"
else
    echo "❌ SOME TESTS FAILED" | tee -a "$SUMMARY_LOG_FILE"
    echo "" | tee -a "$SUMMARY_LOG_FILE"
    grep -E "(FAIL|●)" "$TEST_LOG_FILE" | head -20 | tee -a "$SUMMARY_LOG_FILE"
fi

echo "" | tee -a "$SUMMARY_LOG_FILE"
echo "Log files:" | tee -a "$SUMMARY_LOG_FILE"
echo "  - Test log: $TEST_LOG_FILE" | tee -a "$SUMMARY_LOG_FILE"
echo "  - Summary: $SUMMARY_LOG_FILE" | tee -a "$SUMMARY_LOG_FILE"
echo "  - Application logs: $LOG_DIR/application-*.log" | tee -a "$SUMMARY_LOG_FILE"

exit $TEST_EXIT_CODE

