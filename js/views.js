// Pintu masuk semua fungsi render layar. Isinya dipecah per layar di folder js/views/
// supaya tiap file tetap pendek; app.js cukup mengimpor dari file ini.
export { renderHome, renderStatusChips } from './views/home.js';
export { renderPracticeSetup, renderSimulationSetup } from './views/setup.js';
export { renderSession, renderQuestionGrid } from './views/session.js';
export { renderResult } from './views/result.js';
export { renderStats } from './views/stats.js';
export { renderSettings, renderStatusInfo } from './views/settings.js';
export { renderLoadError } from './views/common.js';
