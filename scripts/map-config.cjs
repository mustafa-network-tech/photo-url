// Only this explicitly public value is emitted; archive secrets never leave the server.
module.exports = function mapConfig(env = process.env) {
  return 'window.MAVI_MAP_CONFIG = ' + JSON.stringify({
    apiKey: (env.PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
  }).replace(/</g, '\\u003c') + ';\n';
};
