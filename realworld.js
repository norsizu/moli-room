/* RealWorld: where the viewer is, where the sun is, what the weather is doing.
   Sun maths after SunCalc (Vladimir Agafonkin, BSD-2). Location: ?lat=&lon= → saved precise fix → IP lookup
   (rejected when its time zone disagrees with this machine's, i.e. a proxy exit) → this machine's time zone. */
(function () {
'use strict';
const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, obl = rad * 23.4397, J0 = 0.0009;
const toDays = d => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
const rightAsc = l => Math.atan2(Math.sin(l) * Math.cos(obl), Math.cos(l));
const declin = l => Math.asin(Math.sin(obl) * Math.sin(l));
const meanAnomaly = d => rad * (357.5291 + 0.98560028 * d);
const eclLong = m => m + rad * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m)) + rad * 102.9372 + Math.PI;

/* altitude above the horizon; azimuth measured from south, positive toward the west (radians) */
function sunPos(date, lat, lon) {
  const lw = rad * -lon, phi = rad * lat, d = toDays(date), l = eclLong(meanAnomaly(d));
  const dec = declin(l), H = rad * (280.16 + 360.9856235 * d) - lw - rightAsc(l);
  return {
    azimuth: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)),
    altitude: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)),
  };
}
/* sunrise / sunset for the local day that contains `date`; null fields in polar day/night */
function sunTimes(date, lat, lon) {
  const lw = rad * -lon, phi = rad * lat, n = Math.round(toDays(date) - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n, m = meanAnomaly(ds), l = eclLong(m), dec = declin(l);
  const transit = x => J2000 + x + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);
  const noon = transit(ds);
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  if (isNaN(w)) return { rise: null, set: null, noon: fromJulian(noon) };
  const set = transit(J0 + (w + lw) / (2 * Math.PI) + n);
  return { rise: fromJulian(noon - (set - noon)), set: fromJulian(set), noon: fromJulian(noon) };
}

/* ---------- location ---------- */
const HOME_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
/* fallback when all we know is the time zone: the zone's namesake city */
const TZ_CITY = {
  'Asia/Shanghai': ['上海', 31.23, 121.47], 'Asia/Chongqing': ['重庆', 29.56, 106.55], 'Asia/Urumqi': ['乌鲁木齐', 43.83, 87.62],
  'Asia/Hong_Kong': ['香港', 22.32, 114.17], 'Asia/Taipei': ['台北', 25.03, 121.57], 'Asia/Macau': ['澳门', 22.2, 113.55],
  'Asia/Tokyo': ['东京', 35.68, 139.69], 'Asia/Seoul': ['首尔', 37.57, 126.98], 'Asia/Singapore': ['新加坡', 1.35, 103.82],
  'Europe/London': ['伦敦', 51.51, -0.13], 'Europe/Paris': ['巴黎', 48.86, 2.35], 'Europe/Berlin': ['柏林', 52.52, 13.4],
  'America/New_York': ['纽约', 40.71, -74.0], 'America/Los_Angeles': ['洛杉矶', 34.05, -118.24], 'America/Chicago': ['芝加哥', 41.88, -87.63],
  'Australia/Sydney': ['悉尼', -33.87, 151.21],
};
const tzOffset = (tz, when = new Date()) => {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(when).reduce((o, x) => (o[x.type] = +x.value, o), {});
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - when.getTime()) / 60000);
  } catch (e) { return NaN; }
};
const sameClock = tz => tz === HOME_TZ || tzOffset(tz) === -new Date().getTimezoneOffset();
const getJSON = (url, ms = 7000) => {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal, cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).finally(() => clearTimeout(to));
};
const IP_SOURCES = [
  () => getJSON(`https://ipwho.is/?lang=${window.LANG === 'en' ? 'en' : 'zh-CN'}`).then(j => j.success === false ? null : { city: j.city, lat: +j.latitude, lon: +j.longitude, tz: j.timezone && j.timezone.id }),
  () => getJSON('https://get.geojs.io/v1/ip/geo.json').then(j => ({ city: j.city, lat: +j.latitude, lon: +j.longitude, tz: j.timezone })),
  () => getJSON('https://ipapi.co/json/').then(j => ({ city: j.city, lat: +j.latitude, lon: +j.longitude, tz: j.timezone })),
];
const SAVE_KEY = 'moli-room.fix';
function tzGuess(note) {
  const c = TZ_CITY[HOME_TZ];
  if (c) return { city: c[0], lat: c[1], lon: c[2], tz: HOME_TZ, source: 'tz', note };
  /* unknown zone: longitude from the UTC offset, a temperate latitude */
  return { city: '本地', lat: 35, lon: -new Date().getTimezoneOffset() / 4, tz: HOME_TZ, source: 'tz', note };
}
async function locate() {
  const q = new URLSearchParams(location.search);
  if (q.has('lat') && q.has('lon')) return { city: q.get('city') || '指定位置', lat: +q.get('lat'), lon: +q.get('lon'), tz: HOME_TZ, source: 'url' };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && isFinite(s.lat)) return Object.assign(s, { source: s.source || 'gps' }); } catch (e) {}
  for (const src of IP_SOURCES) {
    let r = null;
    try { r = await src(); } catch (e) { continue; }
    if (!r || !isFinite(r.lat) || !isFinite(r.lon)) continue;
    if (r.tz && !sameClock(r.tz)) return tzGuess(`IP 在${r.city || '别处'}，时区和本机不一致（像是代理），按本机时区估计`);
    return Object.assign(r, { source: 'ip' });
  }
  return tzGuess('IP 定位不可用，按本机时区估计');
}
/* one-shot precise fix from the browser (asks permission); remembered for next time */
function preciseFix() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(p => {
      ok(saveFix({ city: '当前位置', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), source: 'gps' }));
    }, no, { timeout: 12000, maximumAge: 36e5 });
  });
}
/* a place picked by hand (or by the browser), remembered for next time */
function saveFix(r) {
  r = { city: r.city, lat: +r.lat, lon: +r.lon, tz: HOME_TZ, source: r.source || 'manual' };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(r)); } catch (e) {}
  return r;
}
/* city search by name (Open-Meteo geocoding, no key; understands Chinese) */
async function searchCity(name) {
  const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=${window.LANG === 'en' ? 'en' : 'zh'}&format=json`);
  return (j.results || []).map(r => ({ city: r.name, lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3),
    where: [r.admin1, r.country].filter((x, i, a) => x && x !== r.name && a.indexOf(x) === i).join(' · ') }));
}
function forgetFix() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
/* reverse-geocode a bare coordinate into a city name (best effort) */
async function cityName(lat, lon) {
  try {
    const j = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${window.LANG === 'en' ? 'en' : 'zh'}`);
    return j.city || j.locality || j.principalSubdivision || null;
  } catch (e) { return null; }
}

/* ---------- weather (Open-Meteo, no key) ---------- */
/* WMO code → what the scene should do */
function wmo(code) {
  const W = (text, o) => Object.assign({ text, code, cloud: 0, rain: 0, snow: 0, thunder: 0, fog: 0 }, o);
  if (code === 0) return W('晴');
  if (code === 1) return W('晴间少云', { cloud: 0.25 });
  if (code === 2) return W('多云', { cloud: 0.55 });
  if (code === 3) return W('阴', { cloud: 0.9 });
  if (code === 45 || code === 48) return W('雾', { cloud: 0.7, fog: 1 });
  const DRIZ = { 51: 0.15, 53: 0.25, 55: 0.35, 56: 0.2, 57: 0.35 }, RAIN = { 61: ['小雨', 0.35], 63: ['中雨', 0.65], 65: ['大雨', 1], 66: ['冻雨', 0.4], 67: ['冻雨', 0.8] };
  if (code in DRIZ) return W(code >= 56 ? '冻毛毛雨' : '毛毛雨', { cloud: 0.85, rain: DRIZ[code], fog: 0.3 });
  if (code in RAIN) return W(RAIN[code][0], { cloud: 0.95, rain: RAIN[code][1], fog: 0.25 });
  if (code >= 71 && code <= 77) return W(['小雪', '小雪', '中雪', '中雪', '大雪', '大雪', '米雪'][code - 71], { cloud: 0.95, snow: [0.35, 0.35, 0.65, 0.65, 1, 1, 0.3][code - 71], fog: 0.3 });
  if (code >= 80 && code <= 82) return W(['阵雨', '强阵雨', '暴雨'][code - 80], { cloud: 0.85, rain: [0.55, 0.8, 1][code - 80] });
  if (code === 85 || code === 86) return W(code === 85 ? '阵雪' : '强阵雪', { cloud: 0.9, snow: code === 85 ? 0.5 : 0.9 });
  if (code >= 95) return W(code === 95 ? '雷阵雨' : '雷阵雨伴冰雹', { cloud: 1, rain: 0.9, thunder: 1 });
  return W('未知', { cloud: 0.3 });
}
async function weather(lat, lon) {
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,precipitation,snow_depth,is_day&timezone=auto`);
  const c = j.current, w = wmo(c.weather_code);
  /* measured cloud cover beats the code's guess; wind in m/s */
  w.cloud = Math.max(w.cloud * 0.5, c.cloud_cover / 100);
  w.temp = c.temperature_2m; w.humidity = c.relative_humidity_2m;
  w.wind = c.wind_speed_10m / 3.6; w.gust = (c.wind_gusts_10m || c.wind_speed_10m) / 3.6;
  w.snowDepth = c.snow_depth || 0;                       // metres of snow lying on the ground
  if (c.precipitation > 0 && !w.rain && !w.snow) w.rain = Math.min(1, 0.2 + c.precipitation / 4);
  w.at = new Date();
  return w;
}
/* ?wx=clear|cloudy|overcast|rain|storm|snow|fog — preview a sky without waiting for it */
const PRESET = { clear: 0, cloudy: 2, overcast: 3, fog: 45, drizzle: 53, rain: 63, heavy: 65, shower: 81, storm: 95, snow: 73, lightsnow: 71, heavysnow: 75 };
function presetWeather(name) {
  if (!(name in PRESET)) return null;
  const w = wmo(PRESET[name]);
  const snowy = /snow/.test(name);
  Object.assign(w, { snowDepth: snowy ? { lightsnow: 0.015, heavysnow: 0.1 }[name] || 0.04 : 0, temp: snowy ? -2 : 24, humidity: 70, wind: name === 'storm' ? 11 : name === 'clear' ? 1.5 : 4.5, preset: true, at: new Date() });
  w.gust = w.wind * 1.6;
  return w;
}

window.RealWorld = { sunPos, sunTimes, locate, preciseFix, saveFix, searchCity, forgetFix, cityName, weather, presetWeather, wmo, HOME_TZ };
})();
