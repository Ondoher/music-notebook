import { registry } from '@polylith/core';
import '@polylith/features';
import '@polylith/config';
import '@fontsource/comic-neue/400';
import '@fontsource/comic-neue/400-italic';
import '@fontsource/comic-neue/700';
import '@fontsource/comic-neue/700-italic';
import './services/index.js';
import './main/index.js';

await registry.start();
