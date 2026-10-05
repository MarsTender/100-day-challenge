/* Tiny hand-rolled SVG charts (offline, no dependencies). */
(function (root) {
  'use strict';
  var W = 340, H = 190, L = 34, R = 10, T = 12, B = 24;

  function niceMax(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function frame(xMin, xMax, yMin, yMax, yFmt) {
    var sx = function (x) { return L + (xMax === xMin ? (W - L - R) / 2 : (x - xMin) / (xMax - xMin) * (W - L - R)); };
    var sy = function (y) { return T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B); };
    var g = '';
    for (var i = 0; i <= 4; i++) {
      var yv = yMin + (yMax - yMin) * i / 4, y = sy(yv);
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#262f3a" stroke-width="1"/>';
      g += '<text x="' + (L - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + (yFmt ? yFmt(yv) : (Math.abs(yv - Math.round(yv)) < 1e-9 ? Math.round(yv) : +yv.toFixed(1))) + '</text>';
    }
    var step = Math.max(1, Math.ceil((xMax - xMin) / 6));
    for (var x = xMin; x <= xMax; x += step) g += '<text x="' + sx(x) + '" y="' + (H - 7) + '" text-anchor="middle">' + x + '</text>';
    return { sx: sx, sy: sy, grid: g };
  }
  function svg(inner, label) {
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (label || 'chart') + '">' + inner + '</svg>';
  }
  function empty(msg) {
    return svg('<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle">' + (msg || 'No data yet') + '</text>');
  }

  /** series: [{color, points:[[x,y]...]}] ; opts: {xMin,xMax,yMin,yMax,yFmt,label,goal} */
  function lineChart(series, opts) {
    opts = opts || {};
    var pts = [].concat.apply([], series.map(function (s) { return s.points; }));
    if (!pts.length) return empty(opts.empty);
    var xMin = opts.xMin != null ? opts.xMin : Math.min.apply(null, pts.map(function (p) { return p[0]; }));
    var xMax = opts.xMax != null ? opts.xMax : Math.max.apply(null, pts.map(function (p) { return p[0]; }));
    var ys = pts.map(function (p) { return p[1]; });
    var yMin = opts.yMin != null ? opts.yMin : 0;
    var yMax = opts.yMax != null ? opts.yMax : niceMax(Math.max.apply(null, ys.concat(opts.goal || 0)));
    if (opts.autoMin) { var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), pad = Math.max(15, (hi - lo) * 0.15); yMin = Math.max(0, Math.floor((lo - pad) / 15) * 15); yMax = Math.ceil((hi + pad) / 15) * 15; }
    var f = frame(xMin, xMax, yMin, yMax, opts.yFmt), out = f.grid;
    if (opts.goal) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + f.sy(opts.goal) + '" y2="' + f.sy(opts.goal) + '" stroke="#ffffff55" stroke-dasharray="4 4"/>';
    series.forEach(function (s) {
      if (!s.points.length) return;
      var d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + f.sx(p[0]).toFixed(1) + ' ' + f.sy(p[1]).toFixed(1); }).join(' ');
      out += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
      if (s.points.length <= 40) s.points.forEach(function (p) { out += '<circle cx="' + f.sx(p[0]).toFixed(1) + '" cy="' + f.sy(p[1]).toFixed(1) + '" r="2.6" fill="' + s.color + '"/>'; });
    });
    return svg(out, opts.label);
  }

  /** bars: [{x, y, color, target}] */
  function barChart(bars, opts) {
    opts = opts || {};
    if (!bars.length) return empty(opts.empty);
    var xMin = opts.xMin != null ? opts.xMin : bars[0].x, xMax = opts.xMax != null ? opts.xMax : bars[bars.length - 1].x;
    var yMax = niceMax(Math.max.apply(null, bars.map(function (b) { return Math.max(b.y, b.target || 0); })));
    var f = frame(xMin, xMax, 0, yMax, opts.yFmt), out = f.grid;
    var bw = Math.max(2, Math.min(18, (W - L - R) / Math.max(1, xMax - xMin + 1) * 0.7));
    bars.forEach(function (b) {
      var x = f.sx(b.x) - bw / 2;
      if (b.target) out += '<rect x="' + x.toFixed(1) + '" y="' + f.sy(b.target).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (f.sy(0) - f.sy(b.target)).toFixed(1) + '" rx="2" fill="#ffffff10" stroke="#ffffff30" stroke-dasharray="2 2"/>';
      if (b.y > 0) out += '<rect x="' + x.toFixed(1) + '" y="' + f.sy(b.y).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (f.sy(0) - f.sy(b.y)).toFixed(1) + '" rx="2" fill="' + (b.color || '#3ee07f') + '"/>';
    });
    return svg(out, opts.label);
  }

  /** stacked bars: [{x, segs:[{v,color}], target}] */
  function stackedBarChart(bars, opts) {
    opts = opts || {};
    if (!bars.length) return empty(opts.empty);
    var xMin = opts.xMin != null ? opts.xMin : bars[0].x, xMax = opts.xMax != null ? opts.xMax : bars[bars.length - 1].x;
    var yMax = opts.yMax || niceMax(Math.max.apply(null, bars.map(function (b) { return Math.max(b.target || 0, b.segs.reduce(function (s, g) { return s + g.v; }, 0)); })));
    var f = frame(xMin, xMax, 0, yMax, opts.yFmt), out = f.grid;
    var bw = Math.max(2, Math.min(18, (W - L - R) / Math.max(1, xMax - xMin + 1) * 0.7));
    bars.forEach(function (b) {
      var x = (f.sx(b.x) - bw / 2).toFixed(1), acc = 0;
      if (b.target) out += '<rect x="' + x + '" y="' + f.sy(b.target).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (f.sy(0) - f.sy(b.target)).toFixed(1) + '" rx="2" fill="#ffffff08" stroke="#ffffff26" stroke-dasharray="2 2"/>';
      b.segs.forEach(function (g) {
        if (!(g.v > 0)) return;
        var y0 = f.sy(acc), y1 = f.sy(acc + g.v); acc += g.v;
        out += '<rect x="' + x + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y0 - y1 - 0.8).toFixed(1) + '" fill="' + g.color + '"/>';
      });
    });
    return svg(out, opts.label);
  }

  root.HDCCharts = { lineChart: lineChart, barChart: barChart, stackedBarChart: stackedBarChart };
})(typeof self !== 'undefined' ? self : this);
