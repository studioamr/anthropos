// ANTHROPOS · todo lo que cambia de un golpe (nombre, país, metas, contacto)
export const CONFIG = {
  name: 'Anthropos',
  brand: 'Anthropos Cities',            // marca completa (ANTHROPOS solo ya existe en IMPI clase 35)
  tagline: 'The Superintelligence Republic',
  country: 'Panama',
  coast: 'Azuero Coast',
  region: 'the Azuero Peninsula',
  firstEmbassy: 'Mexico City',
  cityConcept: 'metropolis',                 // concepto de ciudad (ver concepts.html): anthropos · puerto · liceo · castrum · malecon · archipielago · acropolis · laguna
  goalCommitments: 1000,                // meta de la Campaña I
  goalDemandUSD: 1.0e9,                 // demanda de vivienda que destraba la Fase I
  avgHomeUSD: 1.0e6,                    // ticket promedio que usamos para traducir compromisos a demanda
  email: 'founders@anthroposcities.com',   // correo al que caen las solicitudes mientras no hay endpoint
  endpoint: '',                         // URL POST (Formspree, Supabase, etc.). Vacío = guarda local + abre correo
  statsUrl: 'data/stats.json',          // contador real; se actualiza a mano o por script
  year: 2026,
};
