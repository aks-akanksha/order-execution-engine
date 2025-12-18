# Logs Directory

This directory contains all application and test logs.

## Log Files

### Application Logs
- `application-YYYY-MM-DD.log` - Daily application logs (all levels)
- `error-YYYY-MM-DD.log` - Error logs only
- `exceptions-YYYY-MM-DD.log` - Uncaught exceptions
- `rejections-YYYY-MM-DD.log` - Unhandled promise rejections

### Test Logs
- `test-run-YYYYMMDD_HHMMSS.log` - Complete test execution logs
- `test-summary-YYYYMMDD_HHMMSS.log` - Test summary
- `comprehensive-YYYYMMDD_HHMMSS.log` - Comprehensive system report

## Log Rotation

Logs are automatically rotated:
- Daily rotation for all log files
- Maximum file size: 20MB
- Retention: 14 days (application), 30 days (errors)

## Viewing Logs

```bash
# View latest application log
tail -f logs/application-$(date +%Y-%m-%d).log

# View latest error log
tail -f logs/error-$(date +%Y-%m-%d).log

# View latest test results
cat logs/test-summary-*.log | tail -1

# View comprehensive report
cat logs/comprehensive-*.log | tail -1
```

