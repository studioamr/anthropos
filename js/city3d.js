// ANTHROPOS · la ciudad del sitio: usa el concepto elegido (CONFIG.cityConcept, o ?c= en la URL)
import { CONFIG } from './config.js';
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';

export function mountCity(root, opts = {}) {
  const id = new URLSearchParams(location.search).get('c') || opts.concept || CONFIG.cityConcept;
  const c = byId(id);
  return mountView(root, () => c.build(), opts);
}
