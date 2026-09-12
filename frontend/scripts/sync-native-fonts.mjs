#!/usr/bin/env node
/**
 * Copy every font listed in app.json's expo-font plugin into the prebuilt native
 * project, and fail the build if one is missing from source.
 *
 * Why this exists: the expo-font config plugin only runs during `expo prebuild`.
 * `android/` is checked out (gitignored) and `build_all_apks.sh` calls
 * `./gradlew assembleRelease` directly, so the plugin never runs on a normal build
 * — a font added to app.json silently never reaches the APK, and the app falls back
 * to the system face with no error anywhere. That is how Caveat shipped as plain
 * sans through three builds.
 *
 * Usage: node scripts/sync-native-fonts.mjs [frontendDir]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const appJson = join(root, 'app.json');
if (!existsSync(appJson)) {
    console.error(`sync-native-fonts: no app.json at ${appJson}`);
    process.exit(1);
}

const plugins = JSON.parse(readFileSync(appJson, 'utf8')).expo?.plugins ?? [];
const entry = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-font');
const fonts = entry?.[1]?.fonts ?? [];
if (fonts.length === 0) {
    console.log('sync-native-fonts: no expo-font fonts declared, nothing to do');
    process.exit(0);
}

const nativeDir = join(root, 'android/app/src/main/assets/fonts');
if (!existsSync(join(root, 'android'))) {
    console.log('sync-native-fonts: no prebuilt android/, prebuild will handle fonts');
    process.exit(0);
}
mkdirSync(nativeDir, { recursive: true });

let copied = 0;
for (const rel of fonts) {
    const src = join(root, rel);
    if (!existsSync(src)) {
        console.error(`sync-native-fonts: app.json lists ${rel} but the file does not exist`);
        process.exit(1);
    }
    const dest = join(nativeDir, basename(src));
    if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
    const verb = existsSync(dest) ? 'updated' : 'added';
    copyFileSync(src, dest);
    copied += 1;
    console.log(`sync-native-fonts: ${verb} ${basename(src)}`);
}
console.log(`sync-native-fonts: ${fonts.length} font(s) in sync (${copied} written)`);
