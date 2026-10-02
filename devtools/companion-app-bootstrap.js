import { LOCAL_ART_PREVIEW } from '../src/localArtPreview.js';
if (!LOCAL_ART_PREVIEW) throw new Error('Please use the dedicated local art review server');
await import('./companion-app-identity.js');
await import('../src/app.js');
