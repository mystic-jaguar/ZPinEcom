import AsyncStorage from '@react-native-async-storage/async-storage';

// ponytail: device-local history, no server table — sync across devices would need one.
const KEY = 'zpin.recentlyViewed';
const MAX = 12;

export type RecentProduct = { id: string; name: string; price: number; image: string };

export const recentlyViewed = {
    async list(): Promise<RecentProduct[]> {
        try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); } catch { return []; }
    },
    /** Most recent first, deduped by id. */
    async add(p: RecentProduct) {
        if (!p.id) return;
        const next = [p, ...(await this.list()).filter(x => x.id !== p.id)].slice(0, MAX);
        try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* history is best-effort */ }
    },
};
