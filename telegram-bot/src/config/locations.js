function formatRoute(route, locations) {
  return route.map((m, i) => `${i + 1}. ${locations[m] || `Маркер ${m}`}`).join('\n');
}

module.exports = { formatRoute };
