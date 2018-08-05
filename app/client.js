import { init } from 'sapper/runtime.js';
import store from '../client/store.js';
import { manifest } from './manifest/client.js';

init({
	target: document.querySelector('#sapper'),
	manifest,
	store: data => {
		store.set(data);

		fetch(`api/guide/contents`).then(r => r.json()).then(guide_contents => {
			store.set({ guide_contents });
		});

		window.store = store;
		return store;
	}
});

if (navigator.serviceWorker && navigator.serviceWorker.controller) {
	navigator.serviceWorker.controller.onstatechange = function(e) {
		if (e.target.state === 'redundant') {
			import('../components/Toast.html').then(mod => {
				mod.default.show();
			});
		}
	};
}

// store fonts in localStorage, to make repeat visits speedier
const fonts = document.querySelector('#fonts');
const css = fonts.textContent;

if (!localStorage.fonts) {
	// https://gist.github.com/jonleighton/958841

	/*
	MIT LICENSE
	Copyright 2011 Jon Leighton
	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/
	function base64ArrayBuffer(arrayBuffer) {
		var base64    = ''
		var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

		var bytes         = new Uint8Array(arrayBuffer)
		var byteLength    = bytes.byteLength
		var byteRemainder = byteLength % 3
		var mainLength    = byteLength - byteRemainder

		var a, b, c, d
		var chunk

		// Main loop deals with bytes in chunks of 3
		for (var i = 0; i < mainLength; i = i + 3) {
			// Combine the three bytes into a single integer
			chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

			// Use bitmasks to extract 6-bit segments from the triplet
			a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
			b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
			c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
			d = chunk & 63               // 63       = 2^6 - 1

			// Convert the raw binary segments to the appropriate ASCII encoding
			base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
		}

		// Deal with the remaining bytes and padding
		if (byteRemainder == 1) {
			chunk = bytes[mainLength]

			a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

			// Set the 4 least significant bits to zero
			b = (chunk & 3)   << 4 // 3   = 2^2 - 1

			base64 += encodings[a] + encodings[b] + '=='
		} else if (byteRemainder == 2) {
			chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

			a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
			b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

			// Set the 2 least significant bits to zero
			c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

			base64 += encodings[a] + encodings[b] + encodings[c] + '='
		}

		return base64
	}

	const font_files = [];

	const pattern = /url\(['"]?(.+?)['"]?\)/g;
	let match;

	while (match = pattern.exec(css)) {
		const url = match[1];

		font_files.push({
			url,
			promise: fetch(url).then(r => r.arrayBuffer())
		});
	}

	Promise.all(font_files.map(f => f.promise)).then(results => {
		const map = new Map();

		results.forEach((result, i) => {
			const { url } = font_files[i];
			map.set(url, base64ArrayBuffer(result));
		});

		const replaced = css.replace(pattern, (m, url) => {
			const base64 = map.get(url);
			const format = url.slice(url.lastIndexOf('.') + 1);
			return `url(data:application/font-${format};charset=utf-8;base64,${base64})`;
		});

		localStorage.fonts = replaced;
	});
}