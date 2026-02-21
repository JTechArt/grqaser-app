# Deployment and runbooks

Operator-facing runbooks for running and deploying the Grqaser system. See [Story 5.3](../stories/5.3.deployment-and-runbooks.md) and [testing and deployment strategy](../architecture/testing-and-deployment-strategy.md).

## Runbooks

| Application | Document | Description |
|-------------|----------|-------------|
| **Books-admin-app** | [books-admin-app.md](./books-admin-app.md) | Run instructions: port, DB path, env, crawler start/stop and config, DB versioning, full crawl and validate. Crawler is run only via this app (no separate crawler runbook). |
| **GrqaserApp** | [grqaserapp-distribution.md](./grqaserapp-distribution.md) | Build from repo, signing and env, store submission (TestFlight / App Store, Play internal / direct install). |

## Troubleshooting

Known troubleshooting is documented in **[docs/tasks/06-TROUBLESHOOTING.md](../tasks/06-TROUBLESHOOTING.md)**. Summary of areas covered:

- **Data crawling:** "socket hang up", no books found, search failures; browser launch options and selectors.
- **React Native:** Node version, Metro cache, npm cache, iOS/Android build failures, clean and rebuild steps.
- **Audio player:** Audio not playing, background audio, interruptions; permissions and event handling.
- **Performance:** App slow to load, memory leaks, battery drain; optimization and monitoring.
- **Development environment:** React Native CLI, Android Studio, Xcode setup.
- **Platform-specific:** iOS simulator, permissions; Android emulator, permissions.
- **Debugging:** Debug logging, React Native Debugger, network request monitoring.

For full details, fixes, and code snippets, use the linked guide. Operators should refer to it when runbook steps fail or when symptoms match the listed issues.
