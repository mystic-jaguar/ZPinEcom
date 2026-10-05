import assert from 'node:assert';
import { artFor } from './artFor';

// "women" contains "men"; kids/ethnic/eyewear must win over the broader words.
assert.equal(artFor('Women'), 'women');
assert.equal(artFor('Men'), 'men');
assert.equal(artFor('Kids'), 'kids');
assert.equal(artFor('Ethnic Wear'), 'ethnic');
assert.equal(artFor('Sunglasses & Eyewear'), 'eyewear');
assert.equal(artFor('Eye Makeup'), 'makeup');
assert.equal(artFor('Slippers'), 'footwear');
assert.equal(artFor('Smart Watches'), 'watch');
assert.equal(artFor('Laptop Bags'), 'bags');
assert.equal(artFor('Earrings'), 'jewellery');
assert.equal(artFor('Home Improvement'), 'home');
assert.equal(artFor('Jackets'), 'winter');
// Unknown / missing names still get art, never a blank tile.
assert.equal(artFor('Something New'), 'fashion');
assert.equal(artFor(null), 'fashion');

console.log('artFor ok');
