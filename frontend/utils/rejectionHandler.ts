// Client-side unhandled-promise-rejection handler.
//
// React Native ships the `promise` polyfill and wires its rejection tracker in
// __DEV__ only — in a release build an unawaited `api.x()` that throws vanishes
// silently, which is exactly the class of bug that leaves a screen stuck on a
// spinner with nothing in the logs. Re-enabling the tracker costs no new
// dependency.
//
// ponytail: logs to console (visible in `adb logcat` / Xcode). Point
// `onUnhandled` at a crash reporter if ZPIN ever adds one.

let installed = false;

export function installRejectionHandler() {
    if (installed) return;
    installed = true;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('promise/setimmediate/rejection-tracking').enable({
            allRejections: true,
            onUnhandled: (_id: number, error: any) =>
                console.error('[UnhandledRejection]', error?.stack || error?.message || String(error)),
            onHandled: () => { /* handled late — not worth logging */ },
        });
    } catch (e) {
        console.warn('Could not install rejection tracking', e);
    }
}
