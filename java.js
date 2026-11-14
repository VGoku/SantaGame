
(() => {
"use strict";
const $ = id => document.getElementById(id);
if (typeof BABYLON === "undefined") { $("overlay").innerHTML = '<div class="card"><h1>Babylon.js failed to load</h1></div>'; return; }

const ROAD_HALF = 52, ROW_GAP = 40, POOL_ROWS = 7, PER_ROW = 5, SPAN = ROW_GAP * POOL_ROWS;
const SLEIGH_Y = 9, RELEASE_Y = 8.7, ROOF_Y = 4.95, GRAVITY = 30, DROP_BACK = 1.6;
const BASE_SPEED = 12, MAX_SPEED = 24, LAT_SPEED = 34, STEER_RATE = 2.8;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), C3 = h => BABYLON.Color3.FromHexString(h);
const V = (x, y, z) => new BABYLON.Vector3(x, y, z);

const canvas = $("c");
const engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(.06, .08, .16, 1);
scene.skipPointerMovePicking = true;
const HORIZON = "#2b4477";
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogDensity = .0034; scene.fogColor = C3(HORIZON);

const camera = new BABYLON.FreeCamera("cam", V(0, 15, -22), scene);
camera.minZ = .3; camera.maxZ = 3000; camera.fov = .95; camera.inputs.clear();

const hemi = new BABYLON.HemisphericLight("h", V(0, 1, 0), scene);
hemi.intensity = .55; hemi.diffuse = C3("#9fb6ff"); hemi.groundColor = C3("#2a2040");
const moonLight = new BABYLON.DirectionalLight("m", V(-.4, -1, .3), scene);
moonLight.intensity = .85; moonLight.diffuse = C3("#cfe0ff"); moonLight.autoUpdateExtends = false; moonLight.shadowFrustumSize = 90;
const shadows = new BABYLON.ShadowGenerator(1024, moonLight);
shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 20;

// --- post-processing: glow on every emissive thing + AA + vignette
const glow = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 28 }); glow.intensity = .75;
const pipe = new BABYLON.DefaultRenderingPipeline("pipe", true, scene, [camera]);
pipe.fxaaEnabled = true;
pipe.imageProcessingEnabled = true;
pipe.imageProcessing.vignetteEnabled = true; pipe.imageProcessing.vignetteWeight = 2.2;
pipe.imageProcessing.contrast = 1.18; pipe.imageProcessing.exposure = 1.1;

function mat(n, hex, o = {}) {
  const m = new BABYLON.StandardMaterial(n, scene);
  m.diffuseColor = C3(hex); m.specularColor = new BABYLON.Color3(.05, .05, .08);
  if (o.e) m.emissiveColor = C3(o.e);
  if (o.a !== undefined) m.alpha = o.a;
  if (o.nl) m.disableLighting = true;
  return m;
}
const M = {
  snow: mat("snow", "#f3f9ff", { e: "#2a3552" }), trunk: mat("tr", "#4b3324"), tree: mat("tree", "#1d5236"),
  door: mat("door", "#43291c"), chimney: mat("ch", "#6d4636"),
  winOff: mat("wo", "#2a2a33", { e: "#34343f" }), winOn: mat("won", "#fff0c0", { e: "#ffc866" }),
  gold: mat("gold", "#e8b53a", { e: "#3a2a05" }), red: mat("red", "#cf2029"), redD: mat("redD", "#8f151c"),
  deer: mat("deer", "#7c4a29"), deerD: mat("deerD", "#5a341c"), antler: mat("ant", "#cbb28d"),
  white: mat("wh", "#fbfbfb", { e: "#222" }), skin: mat("skin", "#f0c49b"), black: mat("bk", "#17171b"),
  nose: mat("nose", "#ff2b2b", { e: "#ff2b2b" }), carrot: mat("car", "#ff8a1f", { e: "#552200" }),
  beacon: mat("bea", "#ffd76a", { e: "#ffd76a", nl: true }), marker: mat("mk", "#4be07a", { e: "#4be07a" }),
  beam: mat("bm", "#4be07a", { e: "#4be07a", a: .14 }), hill: mat("hill", "#22355c", { e: "#16233f" }),
  moon: mat("moon", "#f6f8ff", { e: "#e4ebff", nl: true }), halo: mat("halo", "#fff", { e: "#8fa8d8", nl: true, a: .16 })
};
const wallMats = ["#7a3f2e", "#4a5d7a", "#5f7546", "#8a4a5a", "#3f6b63", "#8a7040"].map((h, i) => mat("w" + i, h));
const roofMats = ["#8c2f39", "#2f6b4f", "#35507a", "#7a4a2a"].map((h, i) => mat("r" + i, h));
const giftMats = ["#e2483f", "#3f8fe0", "#4fbf5f", "#e0a53f", "#9a5fd0", "#ef7fae"].map((h, i) => mat("g" + i, h, { e: "#150a0a" }));
const ribbon = mat("rib", "#f7e7ae", { e: "#4a4020" });
const bulbBase = ["#ff3b3b", "#3bff6a", "#ffd23b", "#3b9bff"];
const bulbMats = bulbBase.map((h, i) => mat("bulb" + i, h, { e: h, nl: true }));
const X = { dog: mat("dog", "#8a5a32"), dogD: mat("dogD", "#5a3a20"), alert: mat("alert", "#ff3030", { e: "#ff3030", nl: true }), grinW: mat("grinW", "#3f7a3a"), grinR: mat("grinR", "#1f4d2a"), grinB: mat("grinB", "#7dff5a", { e: "#7dff5a", nl: true }), cookie: mat("cookie", "#e0a050", { e: "#b86a1a" }), chip: mat("chip", "#3a2010"), milk: mat("milk", "#f5f7ff", { e: "#8fa0c8" }), elfG: mat("elfG", "#2fa84f"), elfR: mat("elfR", "#d6342f"), shade: mat("shade", "#0a0a0f", { e: "#050508" }), goldS: mat("goldS", "#f0c040", { e: "#6a4a08" }), milkB: mat("milkB", "#3fa0ff", { e: "#2a80e0" }), haloC: mat("haloC", "#ffb347", { e: "#ffb347", nl: true, a: .22 }), haloM: mat("haloM", "#6fd0ff", { e: "#6fd0ff", nl: true, a: .22 }), coal: mat("coal", "#1a1a1f", { e: "#0a0a10" }), naughtyB: mat("naughtyB", "#ff4a6a", { e: "#ff4a6a", nl: true }), sign: mat("sign", "#c4223a", { e: "#c4223a" }), robB: mat("robB", "#5ab0ff", { e: "#5ab0ff", nl: true }), rob: mat("rob", "#25252d"), robS: mat("robS", "#f0f0f0"), bag: mat("bag", "#8a6a3a") };

// --- sky: gradient, twinkling stars, shimmering aurora
BABYLON.Effect.ShadersStore.skyVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 vDir;void main(){vDir=position;gl_Position=worldViewProjection*vec4(position,1.);}`;
BABYLON.Effect.ShadersStore.skyFragmentShader = `precision highp float;varying vec3 vDir;uniform vec3 cT,cM,cB,fwd;uniform float time;
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){vec3 d=normalize(vDir);float h=d.y;
vec3 col=h>0.?mix(cM,cT,pow(h,.55)):mix(cM,cB,pow(-h,.35));
if(h>.015){vec3 sp=d*400.;float r=h13(floor(sp));if(r>.9925){vec3 f=fract(sp)-.5;col+=vec3(smoothstep(.24,0.,length(f))*(.6+.4*sin(time*2.4+r*90.)));}
vec2 fx=normalize(fwd.xz);vec2 dx=d.xz/max(.001,length(d.xz));float fr=dot(dx,fx);float lat=dot(d.xz,vec2(fx.y,-fx.x))/max(.25,dot(d.xz,fx));float w=sin(lat*7.+time*.4+sin(lat*2.3+time*.25)*1.8);float band=smoothstep(.02,.1,h)*smoothstep(.55,.2,h)*smoothstep(.2,.7,fr);
float a=pow(max(0.,w*.5+.5),3.)*band;vec3 ac=mix(vec3(.1,1.,.55),vec3(.7,.25,1.),clamp(h*3.-.2,0.,1.));col+=ac*a*.6;}
gl_FragColor=vec4(col,1.);}`;
const skyMat = new BABYLON.ShaderMaterial("sky", scene, { vertex: "sky", fragment: "sky" }, { attributes: ["position"], uniforms: ["worldViewProjection", "cT", "cM", "cB", "fwd", "time"] });
skyMat.setColor3("cT", C3("#050818")); skyMat.setColor3("cM", C3(HORIZON)); skyMat.setColor3("cB", C3("#1b2a4a"));
skyMat.backFaceCulling = false; skyMat.disableDepthWrite = true; skyMat.setVector3("fwd", V(0, 0, 1));
const skyDome = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 2000, segments: 24 }, scene);
skyDome.material = skyMat; skyDome.isPickable = false; skyDome.applyFog = false;
glow.addExcludedMesh(skyDome);
const skyRig = new BABYLON.TransformNode("rig", scene);
const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 22, segments: 14 }, scene);
moon.parent = skyRig; moon.position.set(25, 55, 240); moon.material = M.moon; moon.applyFog = false;
const halo = BABYLON.MeshBuilder.CreateSphere("halo", { diameter: 42, segments: 12 }, scene);
halo.parent = skyRig; halo.position.copyFrom(moon.position); halo.material = M.halo; halo.applyFog = false;
for (let i = 0; i < 18; i++) {
  const a = i / 18 * 6.283 + rnd(-.1, .1), dist = rnd(230, 320), hg = rnd(22, 52);
  const hl = BABYLON.MeshBuilder.CreateCylinder("hl", { height: hg, diameterTop: 0, diameterBottom: rnd(70, 140), tessellation: 5 }, scene);
  hl.parent = skyRig; hl.position.set(Math.cos(a) * dist, hg / 2 - 2, Math.sin(a) * dist); hl.material = M.hill; hl.applyFog = false;
}

// --- ground
const gtex = new BABYLON.DynamicTexture("gt", { width: 512, height: 512 }, scene, true);
{ const c = gtex.getContext(); c.fillStyle = "#e9f0fb"; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { c.fillStyle = Math.random() < .5 ? "rgba(255,255,255,.9)" : "rgba(180,200,235,.5)"; c.beginPath(); c.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + .5, 0, 6.283); c.fill(); }
  gtex.update(); gtex.uScale = 200; gtex.vScale = 200; }
const gm = mat("gm", "#ffffff"); gm.diffuseTexture = gtex;
const ground = BABYLON.MeshBuilder.CreateGround("g", { width: 2000, height: 2000, subdivisions: 2 }, scene);
ground.material = gm; ground.receiveShadows = true;

// --- houses (now with blinking Christmas lights) & decor (trees + snowmen)
const houses = [], rows = [];
function bx(n, o, p, x, y, z, m, extra) { const b = BABYLON.MeshBuilder.CreateBox(n, o, scene); b.parent = p; b.position.set(x, y, z); b.material = m; return b; }
function buildHouse() {
  const root = new BABYLON.TransformNode("house", scene);
  const w = rnd(5, 6.2), d = rnd(4.4, 5.4), wallH = 3.2, eave = .25, roofH = 1.5, side = (w + d) / 2 * 1.32, baseY = wallH + eave;
  const body = bx("hb", { width: w, height: wallH, depth: d }, root, 0, wallH / 2, 0, wallMats[0]); shadows.addShadowCaster(body);
  bx("he", { width: side, height: eave, depth: side }, root, 0, baseY - eave / 2, 0, M.chimney);
  const roof = BABYLON.MeshBuilder.CreateCylinder("hr", { height: roofH, diameterTop: 0, diameterBottom: side * 1.4142, tessellation: 4 }, scene);
  roof.parent = root; roof.rotation.y = .7854; roof.position.y = baseY + roofH / 2; shadows.addShadowCaster(roof);
  const cap = BABYLON.MeshBuilder.CreateCylinder("hc", { height: roofH * 1.03, diameterTop: 0, diameterBottom: side * 1.4142 * 1.02, tessellation: 4 }, scene);
  cap.parent = root; cap.rotation.y = .7854; cap.position.y = baseY + roofH / 2 + .03; cap.material = M.snow;
  const chim = BABYLON.MeshBuilder.CreateCylinder("hch", { height: 1.2, diameter: .42, tessellation: 8 }, scene);
  chim.parent = root; chim.position.set(w * .24, baseY + .6, d * .16); chim.material = M.chimney;
  bx("hcc", { width: .52, height: .13, depth: .52 }, root, w * .24, baseY + 1.22, d * .16, M.snow);
  bx("hd", { width: .8, height: 1.4, depth: .12 }, root, 0, .7, -d / 2 - .05, M.door);
  const wins = [-w * .26, w * .26].map(wx => bx("hw", { width: .6, height: .6, depth: .1 }, root, wx, wallH * .6, -d / 2 - .05, M.winOff));
  // string lights along the front eave
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const s = BABYLON.MeshBuilder.CreateSphere("bl", { diameter: .26, segments: 5 }, scene);
    s.parent = root; s.position.set(-side / 2 + 0.3 + i * (side - .6) / (nb - 1), baseY - .02, -side / 2 - .1); s.material = bulbMats[i % 4];
  }
  const gift = bx("hg", { size: .46 }, root, w * .33, .23, -d / 2 - .5, giftMats[0]); gift.setEnabled(false);
  const beacon = BABYLON.MeshBuilder.CreateSphere("bc", { diameter: .34, segments: 6 }, scene);
  beacon.parent = root; beacon.material = M.beacon;
  const dog = new BABYLON.TransformNode("dog", scene); dog.parent = root; dog.position.set(0, baseY + roofH - .3, 0);
  bx("db", { width: .8, height: .5, depth: 1.3 }, dog, 0, .45, 0, X.dog); bx("dh", { width: .5, height: .45, depth: .5 }, dog, 0, .85, .75, X.dog);
  bx("de", { width: .14, height: .3, depth: .12 }, dog, -.2, 1.15, .75, X.dogD); bx("de", { width: .14, height: .3, depth: .12 }, dog, .2, 1.15, .75, X.dogD);
  const bang = new BABYLON.TransformNode("bang", scene); bang.parent = dog; bang.position.set(0, 1.9, .75);
  bx("b1", { width: .16, height: .5, depth: .16 }, bang, 0, .15, 0, X.alert); bx("b2", { width: .16, height: .16, depth: .16 }, bang, 0, -.2, 0, X.alert); dog.setEnabled(false);
  const sign = new BABYLON.TransformNode("sign", scene); sign.parent = root; sign.position.set(-w * .42, 0, -d / 2 - 1.1);
  bx("sgp", { width: .12, height: 1.2, depth: .12 }, sign, 0, .6, 0, M.trunk); bx("sgb", { width: .9, height: .5, depth: .1 }, sign, 0, 1.25, 0, X.sign); sign.setEnabled(false);
  const rob = new BABYLON.TransformNode("rob", scene); rob.parent = root; rob.position.set(.9, baseY + roofH * (1 - .9 / (side / 2)) - .05, -.6);
  bx("rbd", { width: .55, height: .8, depth: .36 }, rob, 0, .5, 0, X.rob); [.3, .5, .7].forEach(y => bx("rst", { width: .57, height: .09, depth: .38 }, rob, 0, y, 0, X.robS));
  const rh = BABYLON.MeshBuilder.CreateSphere("rhd", { diameter: .42, segments: 6 }, scene); rh.parent = rob; rh.position.y = 1.1; rh.material = M.skin;
  bx("rms", { width: .46, height: .14, depth: .1 }, rob, 0, 1.12, -.2, X.rob); bx("rbn", { width: .46, height: .2, depth: .46 }, rob, 0, 1.38, 0, X.rob);
  const rbag = BABYLON.MeshBuilder.CreateSphere("rbag", { diameter: .65, segments: 6 }, scene); rbag.parent = rob; rbag.position.set(.4, .55, .25); rbag.material = X.bag; rob.setEnabled(false);
  const h = { root, body, roof, wins, gift, beacon, w, d, side, baseY, roofH, apex: baseY + roofH, x: 0, z: 0, delivered: false, dog, bang, hasDog: false, dogPhase: 0, grinch: false, naughty: false, sign, robber: false, rob, robY: rob.position.y };
  houses.push(h); return h;
}
function buildDecor() {
  const root = new BABYLON.TransformNode("dec", scene);
  if (Math.random() < .35) { // snowman with a carrot nose (the star of the village)
    [[.55, .5], [.4, 1.2], [.3, 1.75]].forEach(([r, y]) => { const s = BABYLON.MeshBuilder.CreateSphere("sm", { diameter: r * 2, segments: 8 }, scene); s.parent = root; s.position.y = y; s.material = M.white; });
    const n = BABYLON.MeshBuilder.CreateCylinder("cn", { height: .5, diameterTop: 0, diameterBottom: .12, tessellation: 6 }, scene);
    n.parent = root; n.rotation.x = 1.57; n.position.set(0, 1.75, .45); n.material = M.carrot;
    bx("sh", { width: .4, height: .3, depth: .4 }, root, 0, 2.15, 0, M.black);
  } else {
    const t = BABYLON.MeshBuilder.CreateCylinder("dc", { height: 3.4, diameterTop: 0, diameterBottom: 2, tessellation: 7 }, scene); t.parent = root; t.position.y = 1.7; t.material = M.tree;
    const s = BABYLON.MeshBuilder.CreateCylinder("ds", { height: 2.6, diameterTop: 0, diameterBottom: 1.5, tessellation: 7 }, scene); s.parent = root; s.position.y = 2.5; s.material = M.snow;
    const o = BABYLON.MeshBuilder.CreateSphere("orn", { diameter: .2, segments: 5 }, scene); o.parent = root; o.position.set(.5, 1.2, .4); o.material = pick(bulbMats);
  }
  return { root };
}
function layoutRow(row) {
  const spread = ROAD_HALF * 1.62 / (PER_ROW - 1);
  row.houses.forEach((hs, i) => {
    hs.x = (i - (PER_ROW - 1) / 2) * spread + rnd(-3.2, 3.2); hs.z = row.z + rnd(-2.2, 2.2);
    hs.root.position.set(hs.x, 0, hs.z);
    hs.body.material = pick(wallMats); hs.roof.material = pick(roofMats); hs.gift.material = pick(giftMats);
    hs.delivered = false; hs.gift.setEnabled(false); hs.beacon.setEnabled(true);
    hs.hasDog = Math.random() < clamp(.1 + hs.z / 3000, .1, .38); hs.dog.setEnabled(hs.hasDog); hs.dogPhase = rnd(0, 6.28);
    hs.grinch = !hs.hasDog && hs.z > 150 && Math.random() < .1;
    if (hs.grinch) { hs.body.material = X.grinW; hs.roof.material = X.grinR; }
    hs.naughty = !hs.hasDog && !hs.grinch && hs.z > 60 && Math.random() < .2; hs.sign.setEnabled(hs.naughty);
    hs.robber = !hs.hasDog && !hs.grinch && !hs.naughty && hs.z > 100 && Math.random() < clamp(.08 + hs.z / 6000, .08, .22); hs.rob.setEnabled(hs.robber);
    hs.beacon.material = hs.grinch ? X.grinB : hs.naughty ? X.naughtyB : hs.robber ? X.robB : M.beacon;
    hs.wins.forEach(w => { w.material = M.winOff; });
  });
  row.decor.forEach(dc => { dc.root.position.set(rnd(-ROAD_HALF * 2.1, ROAD_HALF * 2.1), 0, row.z + rnd(-7, 7)); dc.root.rotation.y = rnd(0, 6.28); });
}
for (let r = 0; r < POOL_ROWS; r++) {
  const row = { z: 26 + r * ROW_GAP, houses: [], decor: [] };
  for (let i = 0; i < PER_ROW; i++) row.houses.push(buildHouse());
  for (let i = 0; i < 7; i++) row.decor.push(buildDecor());
  layoutRow(row); rows.push(row);
}

// --- sleigh + Santa (his belly is not a rigid body)
const sleigh = new BABYLON.TransformNode("sleigh", scene); sleigh.position.set(0, SLEIGH_Y, 0);
const runner = [V(0, .12, -1.9), V(0, 0, -1.55), V(0, 0, 1.2), V(0, .12, 1.7), V(0, .45, 1.95), V(0, .9, 2)];
[-.85, .85].forEach(x => { const r = BABYLON.MeshBuilder.CreateTube("run", { path: runner, radius: .09, tessellation: 8 }, scene); r.parent = sleigh; r.position.x = x; r.material = M.gold; [-.9, .9].forEach(z => bx("str", { width: .1, height: .45, depth: .1 }, sleigh, x, .24, z, M.gold)); });
const sb = bx("sb", { width: 2, height: .85, depth: 3.3 }, sleigh, 0, .82, 0, M.red); shadows.addShadowCaster(sb);
bx("sk", { width: 2, height: 1.6, depth: .16 }, sleigh, 0, 1.55, -1.6, M.red);
bx("sf", { width: 2, height: 1, depth: .16 }, sleigh, 0, 1.3, 1.55, M.red).rotation.x = .4;
[-1.02, 1.02].forEach(x => bx("st", { width: .13, height: .17, depth: 3.3 }, sleigh, x, 1.24, 0, M.gold));
bx("ss", { width: 1.65, height: .16, depth: 1.1 }, sleigh, 0, 1.26, -.2, M.redD);
for (let i = 0; i < 12; i++) bx("cr", { size: .42 }, sleigh, i % 2 ? .38 : -.38, 1.52 + Math.floor(i / 4) * .42, -1.05 + i % 4 * .24, giftMats[i % 6]);

const santa = new BABYLON.TransformNode("santa", scene); santa.parent = sleigh; santa.position.set(0, 1.3, -.45);
function on(m, p, x, y, z, mt) { m.parent = p; m.position.set(x, y, z); m.material = mt; return m; }
const MB = BABYLON.MeshBuilder;
const torso = on(MB.CreateCylinder("t", { height: 1.05, diameterTop: .62, diameterBottom: 1, tessellation: 12 }, scene), santa, 0, .62, 0, M.red);
const belt = on(MB.CreateTorus("bt", { diameter: .88, thickness: .14, tessellation: 16 }, scene), santa, 0, .34, 0, M.black); belt.rotation.x = 1.5708;
on(MB.CreateBox("bk", { width: .2, height: .18, depth: .1 }, scene), santa, 0, .34, -.46, M.gold);
const head = on(MB.CreateSphere("hd", { diameter: .62, segments: 12 }, scene), santa, 0, 1.42, 0, M.skin);
const beard = on(MB.CreateSphere("bd", { diameter: .62, segments: 12 }, scene), santa, 0, 1.3, .14, M.white); beard.scaling.set(1.05, 1, .95);
on(MB.CreateCylinder("bt2", { height: .55, diameterTop: .06, diameterBottom: .52, tessellation: 10 }, scene), santa, 0, .95, .16, M.white);
on(MB.CreateSphere("sn", { diameter: .17, segments: 8 }, scene), santa, 0, 1.42, .3, M.nose);
[-.12, .12].forEach(x => on(MB.CreateSphere("se", { diameter: .08, segments: 5 }, scene), santa, x, 1.5, .28, M.black));
const hat = on(MB.CreateCylinder("hat", { height: .8, diameterTop: .06, diameterBottom: .74, tessellation: 12 }, scene), santa, 0, 1.92, -.02, M.red); hat.rotation.x = .18;
const band = on(MB.CreateTorus("hb", { diameter: .74, thickness: .18, tessellation: 16 }, scene), santa, 0, 1.68, -.04, M.white); band.rotation.x = 1.5708;
const pom = on(MB.CreateSphere("pom", { diameter: .24, segments: 8 }, scene), santa, 0, 2.28, -.16, M.white);
const arms = [];
[-1, 1].forEach(s => {
  const a = on(MB.CreateCylinder("arm", { height: .95, diameter: .2, tessellation: 8 }, scene), santa, s * .44, .74, .34, M.red); a.rotation.x = 1.05; arms.push(a);
  on(MB.CreateSphere("hn", { diameter: .22, segments: 8 }, scene), santa, s * .44, .52, .74, M.white);
});

function buildDeer(name, brown, o = {}) {
  const root = new BABYLON.TransformNode(name, scene); root.parent = sleigh; root.position.set(o.x || 0, 0, o.z || 0);
  on(MB.CreateBox("b", { width: .9, height: .76, depth: 1.6 }, scene), root, 0, 1.05, 0, brown);
  on(MB.CreateSphere("c", { diameter: .76, segments: 8 }, scene), root, 0, 1.06, .6, brown);
  const nk = on(MB.CreateBox("n", { width: .32, height: .34, depth: .95 }, scene), root, 0, 1.5, .76, brown); nk.rotation.x = .55;
  const hd = on(MB.CreateBox("h", { width: .42, height: .44, depth: .76 }, scene), root, 0, 1.8, 1.16, brown); hd.rotation.x = -.25;
  on(MB.CreateBox("m", { width: .27, height: .25, depth: .36 }, scene), root, 0, 1.68, 1.5, M.deerD);
  [-.14, .14].forEach(ex => {
    on(MB.CreateSphere("e", { diameter: .12, segments: 6 }, scene), root, ex, 1.88, 1.34, M.black);
    const ear = on(MB.CreateCylinder("ea", { height: .3, diameterTop: 0, diameterBottom: .19, tessellation: 6 }, scene), root, ex * 1.6, 2.06, 1.04, brown); ear.rotation.z = ex > 0 ? -.5 : .5;
  });
  [-1, 1].forEach(s => { const a = MB.CreateTube("an", { path: [V(s * .15, 2, 1.04), V(s * .32, 2.34, 1), V(s * .52, 2.54, .94)], radius: .045, tessellation: 6 }, scene); a.parent = root; a.material = M.antler;
    const b = MB.CreateTube("an2", { path: [V(s * .32, 2.3, 1.01), V(s * .55, 2.42, 1.2), V(s * .76, 2.54, 1.24)], radius: .038, tessellation: 6 }, scene); b.parent = root; b.material = M.antler; });
  const legs = [[-.32, .52], [.32, .52], [-.32, -.52], [.32, -.52]].map(([lx, lz]) => {
    const p = new BABYLON.TransformNode("p", scene); p.parent = root; p.position.set(lx, .76, lz);
    on(MB.CreateBox("l", { width: .16, height: .78, depth: .16 }, scene), p, 0, -.39, 0, M.deerD);
    on(MB.CreateBox("hf", { width: .19, height: .15, depth: .24 }, scene), p, 0, -.77, 0, M.black); return p;
  });
  const tail = on(MB.CreateCylinder("tl", { height: .34, diameterTop: 0, diameterBottom: .24, tessellation: 6 }, scene), root, 0, 1.28, -.86, M.deerD); tail.rotation.x = .8;
  let nose = null;
  if (o.rudolph) {
    nose = on(MB.CreateSphere("rn", { diameter: .3, segments: 8 }, scene), root, 0, 1.7, 1.68, M.nose);
    const l = new BABYLON.PointLight("rl", V(0, 1.7, 2), scene); l.parent = root; l.diffuse = C3("#ff4040"); l.intensity = .9; l.range = 12;
  }
  return { root, legs, nose, phase: rnd(0, 6.28), baseX: o.x || 0 };
}
const SNOUT = mat("snout", "#d9c3a0");
function buildDeer2(name, brown, o = {}) {
  const root = new BABYLON.TransformNode(name, scene); root.parent = sleigh; root.position.set(o.x || 0, 0, o.z || 0);
  on(MB.CreateSphere("rb", { diameter: 1, segments: 10 }, scene), root, 0, 1.1, 0, brown).scaling.set(1, .95, 1.75);
  on(MB.CreateSphere("rr", { diameter: .95, segments: 10 }, scene), root, 0, 1.12, -.5, brown);
  on(MB.CreateSphere("rc", { diameter: .95, segments: 10 }, scene), root, 0, 1.15, .5, brown);
  on(MB.CreateSphere("bib", { diameter: .6, segments: 8 }, scene), root, 0, .98, .85, M.white);
  on(MB.CreateCylinder("n", { height: .85, diameterTop: .34, diameterBottom: .5, tessellation: 10 }, scene), root, 0, 1.52, .9, brown).rotation.x = .87;
  on(MB.CreateSphere("h", { diameter: .62, segments: 10 }, scene), root, 0, 1.85, 1.18, brown).scaling.set(.9, .95, 1.1);
  on(MB.CreateSphere("sm", { diameter: .38, segments: 8 }, scene), root, 0, 1.73, 1.54, SNOUT).scaling.set(.85, .8, 1.25);
  if (!o.rudolph) on(MB.CreateSphere("rn", { diameter: .14, segments: 6 }, scene), root, 0, 1.75, 1.8, M.black);
  on(MB.CreateSphere("tl", { diameter: .32, segments: 6 }, scene), root, 0, 1.4, -1, M.white);
  [-1, 1].forEach(s => {
    on(MB.CreateSphere("e", { diameter: .13, segments: 6 }, scene), root, s * .2, 1.93, 1.38, M.black);
    on(MB.CreateCylinder("ea", { height: .42, diameterTop: 0, diameterBottom: .24, tessellation: 8 }, scene), root, s * .33, 2.2, 1, brown).rotation.z = -s * .8;
    [[V(s * .14, 2.1, 1.1), V(s * .3, 2.5, 1), V(s * .55, 2.85, .9)], [V(s * .3, 2.45, 1), V(s * .6, 2.6, 1.2), V(s * .85, 2.75, 1.25)], [V(s * .45, 2.7, .95), V(s * .5, 3, 1.1)]].forEach(path => { const a = MB.CreateTube("an", { path, radius: .05, tessellation: 6 }, scene); a.parent = root; a.material = M.antler; });
  });
  const legs = [[-.3, .58], [.3, .58], [-.3, -.55], [.3, -.55]].map(([lx, lz]) => {
    const p = new BABYLON.TransformNode("p", scene); p.parent = root; p.position.set(lx, .78, lz);
    on(MB.CreateCylinder("l", { height: .8, diameterTop: .24, diameterBottom: .15, tessellation: 8 }, scene), p, 0, -.4, 0, M.deerD);
    on(MB.CreateCylinder("hf", { height: .16, diameter: .22, tessellation: 8 }, scene), p, 0, -.82, 0, M.black); return p;
  });
  let nose = null;
  if (o.rudolph) {
    nose = on(MB.CreateSphere("rn", { diameter: .38, segments: 8 }, scene), root, 0, 1.76, 1.8, M.nose);
    const l = new BABYLON.PointLight("rl", V(0, 1.7, 2.1), scene); l.parent = root; l.diffuse = C3("#ff4040"); l.intensity = .9; l.range = 12;
  }
  return { root, legs, nose, phase: rnd(0, 6.28), baseX: o.x || 0 };
}
const deer = [buildDeer2("rudolph", M.deer, { z: 8, rudolph: true }), buildDeer2("dasher", M.deer, { z: 6.2, x: -.6 }), buildDeer2("dancer", M.deerD, { z: 4.9, x: .6 }), buildDeer2("prancer", M.deer, { z: 3.6, x: -.32 })];
deer.forEach(r => { const z = r.root.position.z;
  const t = MB.CreateTube("rein", { path: [V(.44, 1.82, .3), V(.62, 1.35, z * .45), V(r.baseX * .6, 1.2, z - .6), V(r.baseX, 1.28, z - .4)], radius: .028, tessellation: 5 }, scene); t.parent = sleigh; t.material = M.black; });

// --- landing marker
const ring = MB.CreateTorus("ring", { diameter: 3.8, thickness: .16, tessellation: 36 }, scene); ring.material = M.marker;
const beam = MB.CreateCylinder("beam", { height: 12, diameter: .2, tessellation: 8 }, scene); beam.material = M.beam;

// --- particles: snow, rainbow sleigh sparkle trail, and the (in)famous reindeer toot
const ptex = new BABYLON.DynamicTexture("pt", { width: 64, height: 64 }, scene, false);
{ const c = ptex.getContext(), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); ptex.update(); }
const snowPS = new BABYLON.ParticleSystem("snow", 1200, scene);
snowPS.particleTexture = ptex; snowPS.emitter = V(0, 0, 0);
snowPS.color1 = new BABYLON.Color4(1, 1, 1, .85); snowPS.color2 = new BABYLON.Color4(.85, .9, 1, .5); snowPS.colorDead = new BABYLON.Color4(1, 1, 1, 0);
snowPS.minSize = .07; snowPS.maxSize = .17; snowPS.minLifeTime = 4; snowPS.maxLifeTime = 8; snowPS.emitRate = 300;
snowPS.direction1 = V(-1.4, -2.6, -1.4); snowPS.direction2 = V(1.4, -4.4, 1.4); snowPS.updateSpeed = .012;
snowPS.startPositionFunction = (wm, pos) => pos.set(camera.position.x + rnd(-45, 45), camera.position.y + rnd(-6, 24), camera.position.z + rnd(-45, 45));
snowPS.start();

const trailEm = MB.CreateBox("te", { size: .1 }, scene); trailEm.parent = sleigh; trailEm.position.set(0, .8, -2.4); trailEm.isVisible = false;
const trail = new BABYLON.ParticleSystem("trail", 500, scene);
trail.particleTexture = ptex; trail.emitter = trailEm; trail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
trail.color1 = new BABYLON.Color4(1, .8, .3, 1); trail.color2 = new BABYLON.Color4(.4, .8, 1, 1); trail.colorDead = new BABYLON.Color4(1, .2, .8, 0);
trail.minSize = .25; trail.maxSize = .6; trail.minLifeTime = .6; trail.maxLifeTime = 1.4; trail.emitRate = 120;
trail.direction1 = V(-.8, -.3, -1); trail.direction2 = V(.8, .6, -2); trail.minEmitPower = 1; trail.maxEmitPower = 2.5; trail.start();

const tootEm = MB.CreateBox("toot", { size: .1 }, scene); tootEm.parent = sleigh; tootEm.position.set(-.32, 1.2, 2.7); tootEm.isVisible = false;
const toot = new BABYLON.ParticleSystem("tootPS", 120, scene);
toot.particleTexture = ptex; toot.emitter = tootEm; toot.manualEmitCount = 0;
toot.color1 = new BABYLON.Color4(.5, 1, .3, .9); toot.color2 = new BABYLON.Color4(.9, .8, .2, .8); toot.colorDead = new BABYLON.Color4(.4, .7, .2, 0);
toot.minSize = .9; toot.maxSize = 2.2; toot.minLifeTime = .8; toot.maxLifeTime = 1.6; toot.emitRate = 0;
toot.direction1 = V(-1, .4, -1.5); toot.direction2 = V(1, 1.2, -3); toot.start();

// --- audio
let actx = null, soundOn = true;
function initAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (actx && actx.state === "suspended") actx.resume(); }
function tone(f, dur, type = "sine", vol = .13, delay = 0, to = null) {
  if (!actx || !soundOn) return; const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol * sfxVol, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + .05);
}
const sfx = {
  drop: () => tone(520, .26, "triangle", .11, 0, 180),
  good: () => { tone(660, .14, "sine", .15); tone(990, .22, "sine", .13, .09); },
  miss: () => { tone(300, .35, "square", .07, 0, 70); },
  combo: () => { tone(880, .12, "sine", .14); tone(1320, .2, "sine", .13, .09); tone(1760, .25, "sine", .1, .18); },
  toot: () => { tone(110, .5, "sawtooth", .12, 0, 55); tone(90, .3, "square", .06, .1, 50); },
  ho: () => { [200, 170, 140].forEach((f, i) => tone(f, .22, "sawtooth", .1, i * .26, f * .8)); }
};

// --- Christmas music: public-domain carols on a tiny synth, plus sleigh bells
const SONGS = [
 { bpm: 88, n: [[4,1],[4,1],[4,2],[4,1],[4,1],[4,2],[4,1],[7,1],[0,1.5],[2,.5],[4,4],[5,1],[5,1],[5,1.5],[5,.5],[5,1],[4,1],[4,1],[4,.5],[4,.5],[4,1],[2,1],[2,1],[4,1],[2,2],[7,2]] },
 { bpm: 96, n: [[2,1],[7,1],[7,.5],[9,.5],[7,.5],[6,.5],[4,1],[4,1],[4,1],[9,1],[9,.5],[11,.5],[9,.5],[7,.5],[6,1],[2,1],[2,1],[11,1],[11,.5],[12,.5],[11,.5],[9,.5],[7,1],[4,1],[2,.5],[2,.5],[4,1],[9,1],[6,1],[7,2]] }
];
const music = { on: true, song: 0, i: 0, next: 0, bus: null };
function mnote(semi, beats, t0, bpm, gain = 1) {
  const f = 261.63 * Math.pow(2, semi / 12), dur = beats * 60 / bpm * .92;
  [[1, "sine", .06], [2, "sine", .014], [.5, "sine", .02]].forEach(([m, type, v]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f * m; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v * gain, t0 + .09); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .6); o.connect(g); g.connect(musicBus()); o.start(t0); o.stop(t0 + dur + .7); });
}
function bell(t0) { [2900, 4400].forEach(f => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.006, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .5); o.connect(g); g.connect(musicBus()); o.start(t0); o.stop(t0 + .6); }); }
function musicTick() {
  if (!actx || !music.on || !state.started || state.paused) return;
  if (music.next < actx.currentTime) music.next = actx.currentTime + .05;
  while (music.next < actx.currentTime + .35) {
    const s = SONGS[music.song], [n, b] = s.n[music.i], bt = 60 / s.bpm;
    mnote(n, b, music.next, s.bpm); if (b >= 2 || music.i % 4 === 0) mnote(n - 24, Math.max(b, 2), music.next, s.bpm, .7); if (music.i % 4 === 0) bell(music.next);
    music.next += b * bt; music.i++;
    if (music.i >= s.n.length) { music.i = 0; music.song = (music.song + 1) % SONGS.length; music.next += bt * 3; }
  }
}
setInterval(musicTick, 90);
function toggleMusic() { music.on = !music.on; $("musicBtn").textContent = music.on ? "🎵 Music: ON" : "🎵 Music: OFF"; if (music.on) initAudio(); }

// --- state / text
const state = { score: 0, delivered: 0, missed: 0, combo: 0, started: false, dropQueued: false, cooldown: 0, t: 0, speed: BASE_SPEED, steer: 0, stock: 25, nextToot: 18, lives: 3, invuln: 0, over: false, shake: 0, nextObs: 3, boost: 0, ev: null, evT: 0, nextEv: 35, nextPick: 6, frontCam: false, showcase: 0, roll: 0, nextRoll: 50, wind: 0, bolt: 0, nextBolt: 4, dark: 0, black: 0, nextDark: 75, shield: 0, slow: 0, magnet: 0, coalQueued: false, paused: false, flick: false, lastBuzz: 0, tipT: 0, tipI: 0 };
const vel = { x: 0, z: BASE_SPEED }, packages = [], fx = [], keys = {};
let best = 0; try { best = parseFloat(localStorage.getItem("sleighBest") || "0") || 0; } catch (e) { }

const GOOD = ["Nailed it! 🎯", "Bullseye, chimney-breath!", "Kevin is NOT home alone!", "Naughty list → Nice list!", "Fresh socks delivered 🧦", "They wanted a puppy. Tough.", "Thud! Santa-approved.", "Direct hit, ho ho HO!", "Gift-wrapped by an elf union", "That’s a lump of coal ‘for later’"];
const COMBO = ["On fire! 🔥 (the sleigh is NOT)", "Elves demand a raise!", "Rudolph is impressed!", "Mrs. Claus is watching…", "Santa’s cardio: ZERO, aim: 100"];
const MISS = ["Yeeted into a snowdrift ❄️", "Somebody’s getting coal.", "Oops! Return to sender.", "That one was for Karen.", "Gravity: 1, Santa: 0", "A squirrel got that one 🐿️", "Butterfingers McClaus!"];
const TOOT = ["Prancer had the beans 💨", "Dasher blames Rudolph 💨", "Eggnog was a mistake 💨", "Dancer: ‘it wasn’t me’ 💨", "Fuel efficiency: questionable 💨"];
const START = ["Ho ho… hold on, my belt!", "Santa’s GPS says ‘left’. Always.", "Cookies: 0. Milk: 0. Regrets: many."];
const say = t => { $("quipText").textContent = t; };

function toast(text, color = "#fff") { const el = $("toast"); el.textContent = text; el.style.color = color; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 1300); }
function popup(text, color) { const d = document.createElement("div"); d.className = "pop"; d.textContent = text; d.style.color = color; d.style.left = 44 + rnd(-8, 8) + "%"; d.style.top = 50 + rnd(-9, 8) + "%"; document.body.appendChild(d); setTimeout(() => d.remove(), 1100); }
function updateHUD() { $("score").textContent = state.score; $("delivered").textContent = state.delivered; $("misses").textContent = state.missed; $("canes").textContent = stats.canes || 0; $("lives").textContent = "❤️".repeat(Math.max(0, state.lives)) || "💀"; $("dist").textContent = Math.floor(sleigh.position.z) + " m"; $("best").textContent = Math.floor(best) + " m"; }

const radar = $("radar");
const dots = houses.map(() => { const d = document.createElement("div"); d.className = "rdot"; radar.appendChild(d); return d; });

// --- gifts
function makeGift(size = .54) {
  const root = new BABYLON.TransformNode("gift", scene);
  const b = MB.CreateBox("gb", { size }, scene); b.parent = root; b.material = pick(giftMats); shadows.addShadowCaster(b);
  MB.CreateBox("r1", { width: size * .22, height: size * 1.06, depth: size * 1.06 }, scene).parent = root;
  MB.CreateBox("r2", { width: size * 1.06, height: size * 1.06, depth: size * .22 }, scene).parent = root;
  root.getChildMeshes().forEach(m => { if (m !== b) m.material = ribbon; });
  return root;
}
const footprint = h => h.side / 2;
const roofYAt = (h, x, z) => h.baseY + h.roofH * (1 - Math.min(1, Math.max(Math.abs(x - h.x), Math.abs(z - h.z)) / footprint(h)));
function houseUnder(x, z) { for (const h of houses) { if (h.delivered) continue; const B = footprint(h); if (Math.abs(x - h.x) <= B && Math.abs(z - h.z) <= B) return h; } return null; }
function landingPoint() { const t = Math.sqrt(2 * Math.max(.2, RELEASE_Y - ROOF_Y) / GRAVITY); return { x: sleigh.position.x, z: sleigh.position.z - DROP_BACK + vel.z * .5 * t, t }; }

function dropGift(coal) {
  if (state.stock <= 0) { toast("Elves restocked the sleigh 🧝", "#9fd2ff"); state.stock = 25; }
  state.stock--;
  const lp = landingPoint(), target = houseUnder(lp.x, lp.z) || (state.magnet > 0 ? nearHouse(lp.x, lp.z, 14) : null), g = coal ? makeCoal() : makeGift();
  g.position.set(sleigh.position.x, RELEASE_Y, sleigh.position.z - DROP_BACK); g.rotation.set(rnd(0, 1), rnd(0, 6), rnd(0, 1));
  let vx = 0, vz = vel.z * .5;
  if (target) { const ax = target.robber ? target.x + .9 : target.x, az = target.robber ? target.z - .6 : target.z; vx = (ax - g.position.x) / lp.t; vz = (az - g.position.z) / lp.t; }
  packages.push({ node: g, vel: { x: vx, y: 0, z: vz }, coal: !!coal, perfect: !!target && !target.robber && Math.hypot(lp.x - target.x, lp.z - target.z) < 1.3 });
  sfx.drop(); state.cooldown = .3; arms[1].rotation.x = .35; setTimeout(() => { arms[1].rotation.x = 1.05; }, 200);
}
function puff(pos, color) {
  const m = MB.CreateSphere("puff", { diameter: .7, segments: 6 }, scene), mt = new BABYLON.StandardMaterial("pm", scene);
  mt.diffuseColor = C3(color); mt.emissiveColor = C3(color); mt.alpha = .85; mt.disableLighting = true; m.material = mt; m.position.copyFrom(pos);
  fx.push({ mesh: m, life: .45, max: .45 });
}
function sparkBurst(pos) {
  const ps = new BABYLON.ParticleSystem("sp", 60, scene); ps.particleTexture = ptex; ps.emitter = pos.clone(); ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.color1 = new BABYLON.Color4(1, .85, .3, 1); ps.color2 = new BABYLON.Color4(1, .3, .5, 1); ps.colorDead = new BABYLON.Color4(.3, .6, 1, 0);
  ps.minSize = .2; ps.maxSize = .55; ps.minLifeTime = .4; ps.maxLifeTime = .9; ps.emitRate = 0; ps.manualEmitCount = 50;
  ps.direction1 = V(-5, 4, -5); ps.direction2 = V(5, 9, 5); ps.gravity = V(0, -14, 0); ps.targetStopDuration = .2; ps.disposeOnStop = true; ps.start();
}
function deliver(pkg, house, surfY) {
  const pos = pkg.node.position.clone(); pkg.node.dispose(); packages.splice(packages.indexOf(pkg), 1);
  if (house.robber) { bonkRobber(house); pkg.coal = false; }
  if (pkg.coal || house.naughty) {
    const good = pkg.coal && house.naughty;
    house.delivered = true; house.beacon.setEnabled(false); house.sign.setEnabled(false);
    if (good) { state.combo++; state.delivered++; state.score += 25; popup("🪨 COAL! +25", "#c77dff"); say(pick(COALQ)); sfx.good(); bump("coal"); bump("delivered"); }
    else { state.combo = 0; state.score = Math.max(0, state.score - 10); popup("-10", "#ff8a6a"); say(pkg.coal ? "That house was NICE! Coal on Christmas?!" : "Naughty house! They get coal, not toys!"); sfx.miss(); }
    puff(pos, good ? "#c77dff" : "#ff9a8a"); updateHUD(); return;
  }
  if (house.grinch && state.combo < 3) { state.combo = 0; state.missed++; state.score = Math.max(0, state.score - 5); house.delivered = true; house.beacon.setEnabled(false); puff(pos, "#9bff7a"); sfx.miss(); toast("😈 The Grinch stole it!", "#9bff7a"); say("Land 3 in a row first, then he’ll behave!"); updateHUD(); return; }
  if (house.grinch) { state.lives = Math.min(5, state.lives + 1); state.score += 50; sfx.combo(); toast("💚 Heart grew 3 sizes! +1 life", "#9bff7a"); }
  const mult = state.boost > 0 ? 2 : 1;
  state.delivered++; state.combo++; state.score += (10 + Math.min(20, (state.combo - 1) * 2)) * mult; bump("delivered");
  if (pkg.perfect) { bump("perfect"); state.score += 20; popup("🏠 CHIMNEY! +20", "#ffb36a"); puff(V(house.x + house.w * .24, house.baseY + 1.6, house.z + house.d * .16), "#cfd8ff"); }
  house.delivered = true; house.gift.setEnabled(true); house.beacon.setEnabled(false); house.wins.forEach(w => { w.material = M.winOn; });
  puff(V(pos.x, surfY + .2, pos.z), "#ffe9a8"); sparkBurst(V(pos.x, surfY + .3, pos.z)); sfx.good(); popup("+10 🎁", "#ffe08a"); say(pick(GOOD));
  if (state.combo % 5 === 0) { sfx.combo(); toast(state.combo + " in a row! 🔥", "#ffb3b3"); say(pick(COMBO)); }
  updateHUD();
}
function miss(pkg) {
  const pos = pkg.node.position.clone(); pkg.node.dispose(); packages.splice(packages.indexOf(pkg), 1);
  state.missed++; state.combo = 0; puff(pos, "#e8f1ff"); sfx.miss(); popup("Missed…", "#9fd2ff"); say(pick(MISS)); updateHUD();
}
function doToot() { toot.manualEmitCount = 40; sfx.toot(); say(pick(TOOT)); toast("💨 PFFFT 💨", "#b8ff7a"); }

// --- obstacles: geese, a grumpy plane, a way-too-tall tree, power lines
const obstacles = [];
const OM = { goose: mat("goose", "#eee8da", { e: "#222" }), beak: mat("beak", "#ff9a1f"), plane: mat("plane", "#dfe3ec", { e: "#222831" }), planeR: mat("planeR", "#d6342f"), wire: mat("wire", "#15151f", { e: "#2a2a3c" }), pole: mat("pole", "#5a3f2a"), star: mat("star", "#ffe27a", { e: "#ffd23b", nl: true }), navR: mat("navR", "#ff2a2a", { e: "#ff2a2a", nl: true }), navG: mat("navG", "#2aff6a", { e: "#2aff6a", nl: true }) };
sfx.crash = () => { tone(180, .4, "sawtooth", .16, 0, 50); tone(90, .5, "square", .1, 0, 40); };
sfx.warn = () => { tone(880, .12, "square", .06); tone(880, .12, "square", .06, .18); };
function addOb(node, o) { node.getChildMeshes().forEach(m => { m.isPickable = false; }); obstacles.push(Object.assign({ node, vx: 0, vz: 0, cols: [], anim: null, len: 0 }, o)); }
function spawnGeese() {
  const dir = Math.random() < .5 ? 1 : -1, root = new BABYLON.TransformNode("geese", scene), wings = [], cols = [];
  root.position.set(clamp(sleigh.position.x + rnd(-12, 12), -ROAD_HALF, ROAD_HALF) - dir * 40, rnd(8.2, 10), sleigh.position.z + 110);
  [[0, 0, 0], [-dir * 2.4, .3, 2.4], [-dir * 2.4, -.3, -2.4]].forEach(([gx, gy, gz], k) => {
    const g = new BABYLON.TransformNode("goose", scene); g.parent = root; g.position.set(gx, gy, gz);
    on(MB.CreateSphere("gb", { diameter: 1, segments: 6 }, scene), g, 0, 0, 0, OM.goose).scaling.set(1.7, .8, .8);
    on(MB.CreateSphere("gh", { diameter: .45, segments: 6 }, scene), g, dir, .35, 0, OM.goose);
    on(MB.CreateBox("gk", { width: .4, height: .1, depth: .14 }, scene), g, dir * 1.3, .32, 0, OM.beak);
    [-1, 1].forEach(s => { const pv = new BABYLON.TransformNode("pv", scene); pv.parent = g; pv.position.set(0, .15, s * .3); on(MB.CreateBox("gw", { width: .8, height: .07, depth: 1.8 }, scene), pv, 0, 0, s * .9, OM.goose); wings.push([pv, s, k]); });
    cols.push({ x: gx, y: gy, z: gz, rx: 1.3, ry: .9, rz: 1.5 });
  });
  addOb(root, { kind: "geese", vx: dir * 7.5, vz: -5, cols, anim: T => wings.forEach(([pv, s, k]) => { pv.rotation.x = s * Math.sin(T * 11 + k) * .7; }) });
  say("Geese ahead! 🪿 Honk honk!");
}
function spawnPlane() {
  const root = new BABYLON.TransformNode("plane", scene);
  root.position.set(clamp(sleigh.position.x + rnd(-10, 10), -ROAD_HALF, ROAD_HALF), rnd(8.4, 9.4), sleigh.position.z + 175);
  on(MB.CreateCylinder("pf", { height: 6, diameter: 1.4, tessellation: 10 }, scene), root, 0, 0, 0, OM.plane).rotation.x = 1.5708;
  on(MB.CreateSphere("pn", { diameter: 1.4, segments: 8 }, scene), root, 0, 0, -3, OM.planeR).scaling.z = .8;
  on(MB.CreateBox("pw", { width: 8, height: .15, depth: 1.6 }, scene), root, 0, .1, -.3, OM.plane);
  [-3.6, 3.6].forEach(x => on(MB.CreateBox("pt", { width: 1, height: .17, depth: 1.62 }, scene), root, x, .1, -.3, OM.planeR));
  on(MB.CreateBox("pv", { width: .15, height: 1.5, depth: 1 }, scene), root, 0, .9, 2.8, OM.planeR);
  on(MB.CreateBox("ph", { width: 2.8, height: .12, depth: .9 }, scene), root, 0, .2, 2.8, OM.plane);
  on(MB.CreateSphere("n1", { diameter: .3, segments: 5 }, scene), root, -4, .2, -.3, OM.navR);
  on(MB.CreateSphere("n2", { diameter: .3, segments: 5 }, scene), root, 4, .2, -.3, OM.navG);
  const prop = new BABYLON.TransformNode("prop", scene); prop.parent = root; prop.position.set(0, 0, -3.9);
  on(MB.CreateBox("pp", { width: 3.2, height: .22, depth: .08 }, scene), prop, 0, 0, 0, OM.pole);
  addOb(root, { kind: "plane", vz: -30, cols: [{ x: 0, y: 0, z: -.3, rx: 4.2, ry: .9, rz: 1.5 }, { x: 0, y: 0, z: 0, rx: 1, ry: .9, rz: 3.4 }], anim: T => { prop.rotation.z = T * 40; } });
  toast("✈️ PLANE INCOMING!", "#ffd27a"); sfx.warn(); say("Low-flying plane! Dodge it!");
}
function spawnTree() {
  const root = new BABYLON.TransformNode("bigtree", scene);
  root.position.set(clamp(sleigh.position.x + rnd(-18, 18), -ROAD_HALF, ROAD_HALF), 0, sleigh.position.z + 150);
  on(MB.CreateCylinder("bt", { height: 6, diameter: 1.4, tessellation: 8 }, scene), root, 0, 3, 0, M.trunk);
  [[7.5, 9, 8], [12.5, 8, 6.4], [17, 7, 4.6], [21, 6, 3]].forEach(([y, h, d]) => {
    on(MB.CreateCylinder("bc", { height: h, diameterTop: 0, diameterBottom: d, tessellation: 8 }, scene), root, 0, y, 0, M.tree);
    on(MB.CreateCylinder("bs", { height: h * .55, diameterTop: 0, diameterBottom: d * .62, tessellation: 8 }, scene), root, 0, y + h * .25, 0, M.snow);
  });
  for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 3.3 - k * .27; on(MB.CreateSphere("or", { diameter: .4, segments: 5 }, scene), root, Math.cos(a) * r, 5 + k * 1.8, Math.sin(a) * r, bulbMats[k % 4]); }
  on(MB.CreateSphere("star", { diameter: 1.3, segments: 6 }, scene), root, 0, 24.5, 0, OM.star);
  addOb(root, { kind: "tree", cols: [{ x: 0, y: 10, z: 0, rx: 2.9, ry: 12, rz: 2.9 }] });
  say("Wow, that’s a TALL tree 🌲 Go around!");
}
function spawnLines() {
  const root = new BABYLON.TransformNode("lines", scene);
  root.position.set(clamp(sleigh.position.x + rnd(-16, 16), -ROAD_HALF, ROAD_HALF), 0, sleigh.position.z + 190);
  for (let k = -2; k <= 2; k++) { on(MB.CreateCylinder("pl", { height: 12.5, diameter: .5, tessellation: 6 }, scene), root, 0, 6.25, k * 16, OM.pole); on(MB.CreateBox("cb", { width: 5.4, height: .3, depth: .3 }, scene), root, 0, 11.6, k * 16, OM.pole); }
  [-2.4, 0, 2.4].forEach(wx => on(MB.CreateBox("w", { width: .08, height: .08, depth: 64 }, scene), root, wx, 10.4, 0, OM.wire));
  addOb(root, { kind: "lines", len: 32, cols: [{ x: 0, y: 10.4, z: 0, rx: 3.2, ry: .7, rz: 32 }] });
  say("Power lines ahead! ⚡ Steer around them!");
}
function spawnObstacle() { pick(sleigh.position.z < 120 ? [spawnGeese, spawnTree] : [spawnGeese, spawnGeese, spawnPlane, spawnPlane, spawnTree, spawnLines])(); }
const CRASH = { geese: "Goose 1, Santa 0 🪿", plane: "Pilot: get out of my airspace! ✈️", tree: "That tree was NOT in the GPS 🌲", lines: "Ho-ho-ho-LT! ⚡ Zzzzap!" };
function crash(o) {
  if (state.shield > 0) { state.shield = 0; state.invuln = 1.2; state.shake = .3; sparkBurst(V(sleigh.position.x, sleigh.position.y + 1, sleigh.position.z)); sfx.combo(); toast("🛡️ SHIELD POPPED!", "#7dffb0"); say("That would’ve hurt!"); return; }
  if (o.kind === "geese") bump("geese");
  state.lives--; state.combo = 0; state.score = Math.max(0, state.score - 15); state.invuln = 2; state.shake = .6; state.speed = 5;
  const p = V(sleigh.position.x, sleigh.position.y + 1, sleigh.position.z); puff(p, "#ffb347"); sparkBurst(p);
  sfx.crash(); toast("💥 BONK!", "#ff8a6a"); popup("-15", "#ff8a6a"); say(CRASH[o.kind]); updateHUD();
  if (state.lives <= 0) gameOver();
}
function gameOver() {
  state.over = true; state.started = false; sleigh.setEnabled(true); $("blackout").style.opacity = 0; state.dark = 0; state.black = 0; M.winOn.emissiveColor = C3("#ffc866");
  $("overText").textContent = "You delivered " + state.delivered + " gifts over " + Math.floor(sleigh.position.z) + " m and scored " + state.score + ". The elves are filing a complaint."; stats.top.push({ s: state.score, d: Math.floor(sleigh.position.z) }); stats.top.sort((a, b) => b.s - a.s); stats.top = stats.top.slice(0, 5); saveStats();
  $("topRuns").textContent = "🏆 Top runs: " + stats.top.map(t => t.s + " pts (" + t.d + " m)").join(" · ");
  shareText = "🎅 I scored " + state.score + " points and delivered " + state.delivered + " gifts over " + Math.floor(sleigh.position.z) + " m in Santa’s Questionable Christmas Run! Can you beat it?"; $("shareBtn").textContent = "📋 Share score";
  $("over").classList.remove("hidden");
}
function updateObstacles(dt, T) {
  const sx = sleigh.position.x, sy = sleigh.position.y + .9, sz = sleigh.position.z;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i], p = o.node.position;
    p.x += o.vx * dt; p.z += o.vz * dt; if (o.anim) o.anim(T);
    if (o.kind === "geese") { const dd = p.z - sz; o.hk = (o.hk || 0) - dt; if (dd < 75 && dd > -8 && o.hk <= 0) { honk(1 - Math.max(0, dd) / 75); o.hk = rnd(.7, 1.3); } }
    if (p.z + o.len < sz - 25) { o.node.dispose(); obstacles.splice(i, 1); continue; }
    if ((state.invuln > 0 || state.roll > 0 || state.dark > 0) && !o.pickup) continue;
    for (const c of o.cols) if (Math.abs(sx - (p.x + c.x)) < c.rx + 1.1 && Math.abs(sy - (p.y + c.y)) < c.ry + 1 && Math.abs(sz - (p.z + c.z)) < c.rz + 1.6) { if (o.pickup) { collect(o); o.node.dispose(); obstacles.splice(i, 1); } else crash(o); break; }
  }
}

// --- v3: grumpy dogs, Grinch houses, pickups, weather events, elf conga, unlockables
const elves = [];
sfx.woof = () => { tone(300, .12, "square", .1, 0, 180); tone(260, .14, "square", .1, .16, 150); };
const dogAwake = h => Math.sin(state.t * 1.6 + h.dogPhase) > .15;
function bounceGift(p) { p.bounced = true; p.vel.x = rnd(-9, 9); p.vel.y = 13; p.vel.z = rnd(-4, 8); sfx.woof(); toast("🐶 WOOF! Dog yeeted it!", "#ffb36a"); say("The dog said: not today, Santa."); }
const elfAt = (x, z) => elves.find(e => !e.caught && Math.hypot(x - e.node.position.x, z - e.node.position.z) < 1.9);
function elfCatch(p, e) { p.node.dispose(); packages.splice(packages.indexOf(p), 1); e.caught = true; e.node.scaling.y = .25; state.score += 8; state.delivered++; popup("🧝 +8", "#9bff9b"); sfx.good(); say("Elf bonked! OSHA has been notified."); updateHUD(); }
function spawnConga() {
  const x0 = clamp(sleigh.position.x + rnd(-8, 8), -40, 40);
  for (let k = 0; k < 10; k++) {
    const n = new BABYLON.TransformNode("elf", scene);
    on(MB.CreateCylinder("eb", { height: .9, diameter: .55, tessellation: 8 }, scene), n, 0, .5, 0, X.elfG);
    on(MB.CreateSphere("eh", { diameter: .42, segments: 6 }, scene), n, 0, 1.2, 0, M.skin);
    on(MB.CreateCylinder("ehat", { height: .5, diameterTop: 0, diameterBottom: .42, tessellation: 6 }, scene), n, 0, 1.6, 0, X.elfR);
    n.getChildMeshes().forEach(m => { m.isPickable = false; });
    elves.push({ node: n, k, x0, z: sleigh.position.z + 70 + k * 2.4, caught: false });
  }
}
function updateElves(dt, T) {
  for (let i = elves.length - 1; i >= 0; i--) {
    const e = elves[i]; e.z += 7 * dt;
    e.node.position.set(e.x0 + Math.sin(T * 2 + e.z * .25) * 3, e.caught ? 0 : Math.abs(Math.sin(T * 8 + e.k)) * .5, e.z);
    if (e.z < sleigh.position.z - 25) { e.node.dispose(); elves.splice(i, 1); }
  }
}
function updateEvents(dt) {
  state.nextEv -= dt;
  if (!state.ev && state.nextEv <= 0 && sleigh.position.z > 80) {
    state.ev = pick(["storm", "tail", "conga", "rain", "ice", "gale"]); state.evT = 14; state.wind = Math.random() < .5 ? -7 : 7;
    if (state.ev === "storm") { toast("❄️ SNOWSTORM!", "#cfe4ff"); say("Whiteout! Trust your feelings, Santa."); }
    else if (state.ev === "tail") { toast("🍃 TAILWIND!", "#b8ffcf"); say("Free speed! Rudolph is thrilled."); }
    else if (state.ev === "conga") { toast("🧝 ELF CONGA LINE!", "#9bff9b"); say("Drop gifts on the dancing elves for bonus points!"); spawnConga(); state.evT = 3; }
    else if (state.ev === "rain") { toast("🌧️ RAIN!", "#9ec8ff"); say("Wet sleigh, grumpy reindeer. Watch for lightning!"); }
    else if (state.ev === "ice") { toast("🧊 ICY SKIES!", "#aef0ff"); say("Steering is slippery! Plan your turns early."); }
    else { toast(state.wind > 0 ? "💨 CROSSWIND →" : "💨 ← CROSSWIND", "#d9f2ff"); say("Hold onto your hat, Santa!"); }
  }
  if (state.ev) { state.evT -= dt; if (state.evT <= 0) { state.ev = null; state.nextEv = rnd(30, 55); } }
  const st = state.ev === "storm", ra = state.ev === "rain", ic = state.ev === "ice", ga = state.ev === "gale", k = Math.min(1, dt * 1.5);
  scene.fogDensity += ((st ? .013 : ra ? .008 : ic ? .006 : .0034) - scene.fogDensity) * k;
  snowPS.emitRate += ((st ? 900 : ra ? 0 : ic ? 500 : ga ? 600 : 300) - snowPS.emitRate) * k;
  rainPS.emitRate += ((ra ? 1800 : 0) - rainPS.emitRate) * k * 2;
  const wk = ga ? state.wind * .5 : 0; snowPS.direction1.x = -1.4 + wk; snowPS.direction2.x = 1.4 + wk;
  scene.fogColor.r += ((ic ? .45 : .169) - scene.fogColor.r) * k; scene.fogColor.g += ((ic ? .85 : .267) - scene.fogColor.g) * k; scene.fogColor.b += ((ic ? 1 : .467) - scene.fogColor.b) * k;
  if (ra && (state.nextBolt -= dt) <= 0) { state.nextBolt = rnd(3, 7); state.bolt = .5; setTimeout(() => sfx.thunder(), 450); }
  const pd = state.nextDark; state.nextDark -= dt;
  if (state.nextDark < 1.6 && (state.roll > 0 || state.invuln > 0 || state.dark > 0)) state.nextDark = 1.7;
  else if (pd >= 1.6 && state.nextDark < 1.6) { toast("⚠️ Lights flickering…", "#ffd27a"); say("The lights are flickering… brace yourself!"); }
  state.flick = state.nextDark < 1.6 && state.nextDark > 0 && state.dark <= 0;
  if (state.flick && Math.floor(state.t * 8) !== state.lastBuzz) { state.lastBuzz = Math.floor(state.t * 8); tone(110 + Math.random() * 60, .06, "sawtooth", .05); }
  if (state.nextDark <= 0 && state.dark <= 0 && state.roll <= 0 && state.invuln <= 0) { state.dark = 2.2; state.nextDark = rnd(90, 170); bump("blackouts"); sfx.blackout(); toast("🔌 ROLLING BLACKOUT!", "#ffd27a"); say(pick(DARKQ)); }
  if (state.dark > 0) state.dark -= dt;
  state.black += ((state.dark > 0 ? 1 : 0) - state.black) * Math.min(1, dt * 8);
  $("blackout").style.opacity = state.dark > 0 ? .9 : (state.flick && Math.sin(state.t * 23) > .6 ? .35 : 0);
  M.winOn.emissiveColor = C3("#ffc866").scale((1 - state.black) * (state.flick && Math.sin(state.t * 31) < 0 ? .2 : 1));
  state.bolt = Math.max(0, state.bolt - dt); hemi.intensity = .55 + state.bolt * (state.bolt > .35 ? 2.2 : 1.2) - (state.flick && Math.sin(state.t * 37) > 0 ? .3 : 0);
}
function spawnPickup(kind = pickKind(), px, pz) {
  const milk = kind === "milk", root = new BABYLON.TransformNode("pick", scene);
  root.position.set(px ?? clamp(sleigh.position.x + rnd(-25, 25), -ROAD_HALF, ROAD_HALF), rnd(8.6, 10), pz ?? sleigh.position.z + 130);
  if (milk) { on(MB.CreateBox("mg", { width: .9, height: 1.2, depth: .9 }, scene), root, 0, 0, 0, X.milkB); on(MB.CreateBox("mt", { width: .95, height: .35, depth: .95 }, scene), root, 0, .5, 0, X.milk); on(MB.CreateBox("ml", { width: .6, height: .35, depth: .94 }, scene), root, 0, -.1, 0, X.alert); }
  else if (kind !== "cookie") buildPower(kind, root);
  else { on(MB.CreateCylinder("ck", { height: .3, diameter: 1.3, tessellation: 16 }, scene), root, 0, 0, 0, X.cookie); for (let k = 0; k < 5; k++) on(MB.CreateSphere("chip", { diameter: .2, segments: 4 }, scene), root, Math.cos(k * 1.3) * .4, .17, Math.sin(k * 1.3) * .4, X.chip); }
  const hl = MB.CreateSphere("halo2", { diameter: 3.6, segments: 10 }, scene); hl.parent = root; hl.material = HALO[kind];
  const pb = MB.CreateCylinder("pbeam", { height: 14, diameter: .25, tessellation: 6 }, scene); pb.parent = root; pb.position.y = -7; pb.material = HALO[kind]; root.scaling.setAll(kind === "cane" ? 1.1 : 1.5);
  const y0 = root.position.y;
  addOb(root, { kind, pickup: true, cols: [{ x: 0, y: 0, z: 0, rx: 1.3, ry: 1.5, rz: 1.3 }], anim: T => { root.rotation.y = T * 2.5; root.position.y = y0 + Math.sin(T * 3) * .3; } });
}
function collect(o) {
  const p = V(o.node.position.x, o.node.position.y, o.node.position.z); sparkBurst(p); if (o.kind === "cane") sfx.good(); else sfx.combo();
  if (o.kind === "milk") { state.lives = Math.min(5, state.lives + 1); toast("🥛 Extra life!", "#e8f0ff"); say("Milk: +1 life. Mrs. Claus approves."); }
  else if (o.kind === "cane") { bump("canes"); bump("caneEarn"); popup("+1 🍬", "#ff9ab0"); }
  else if (o.kind === "shield") { state.shield = 1; toast("🛡️ SHIELD!", "#7dffb0"); say("Shield up! One free bonk."); }
  else if (o.kind === "slow") { state.slow = 3.5; toast("⏳ SLOW-MO!", "#c9aaff"); say("Time? What time?"); }
  else if (o.kind === "magnet") { state.magnet = 10; toast("🧲 GIFT MAGNET!", "#ff8a8a"); say("Your gifts now seek out roofs."); }
  else { bump("cookies"); state.boost = 6; toast("🍪 SUGAR RUSH!", "#ffcf8a"); say("SUGAR RUSH! Double points, extra ZOOM!"); }
  updateHUD();
}
const UNLOCKS = [
  [250, "😎 Reindeer sunglasses", () => deer.forEach(r => on(MB.CreateBox("sg", { width: .52, height: .13, depth: .12 }, scene), r.root, 0, 1.93, 1.5, X.shade))],
  [600, "🕶️ Santa shades", () => on(MB.CreateBox("ss2", { width: .5, height: .1, depth: .08 }, scene), santa, 0, 1.5, .3, X.shade)],
  [1000, "🏆 Golden antlers", () => { M.antler.diffuseColor = C3("#ffd24a"); M.antler.emissiveColor = C3("#8a6a14"); }],
  [1600, "🌈 Rainbow trail", () => { trail.color1 = new BABYLON.Color4(1, .3, .6, 1); trail.color2 = new BABYLON.Color4(.3, 1, .6, 1); trail.colorDead = new BABYLON.Color4(.4, .5, 1, 0); }]
];
function checkUnlocks(announce) { UNLOCKS.forEach(u => { if (!u.done && best >= u[0]) { u.done = true; u[2](); if (announce) { state.showcase = 4; say("Showcase time! Back to flying in a moment… (Space skips)"); toast("🔓 Unlocked: " + u[1], "#ffe08a"); sfx.combo(); } } }); }
checkUnlocks(false);

// --- v4: rain, thunder, barrel roll, camera modes
const rainPS = new BABYLON.ParticleSystem("rain", 1600, scene);
rainPS.particleTexture = ptex; rainPS.emitter = V(0, 0, 0); rainPS.emitRate = 0; rainPS.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
rainPS.color1 = new BABYLON.Color4(.6, .75, 1, .85); rainPS.color2 = new BABYLON.Color4(.8, .9, 1, .7); rainPS.colorDead = new BABYLON.Color4(.7, .85, 1, 0);
rainPS.minSize = .14; rainPS.maxSize = .22; rainPS.minScaleY = 9; rainPS.maxScaleY = 14; rainPS.minLifeTime = .5; rainPS.maxLifeTime = .7;
rainPS.direction1 = V(-1.5, -62, -1.5); rainPS.direction2 = V(1.5, -80, 1.5); rainPS.updateSpeed = .012;
rainPS.startPositionFunction = (wm, pos) => pos.set(camera.position.x + rnd(-40, 40), camera.position.y + rnd(-4, 24), camera.position.z + rnd(-10, 45));
rainPS.start();
sfx.thunder = () => { tone(90, 1.2, "sawtooth", .16, 0, 30); tone(60, 1, "square", .08, .1, 30); };
sfx.wheee = () => { tone(300, .9, "sine", .12, 0, 1300); tone(450, .9, "triangle", .06, .05, 1600); };
const ROLLQ = ["WHEEEE! 🌀 Barrel roll!", "Santa: ‘I’m NOT scared!’ (he is)", "Rudolph hit the turbo-spin!", "Invincible while upside-down 😎"];
const camMode = () => state.frontCam || state.showcase > 0 ? "front" : (!state.started && !state.over ? "orbit" : "chase");
function camPos() { const m = camMode(), s = sleigh.position;
  if (m === "front") return tmp.set(s.x + 5, SLEIGH_Y + 3, s.z + 19);
  if (m === "orbit") { const a = state.t * .35; return tmp.set(s.x + Math.sin(a) * 15, SLEIGH_Y + 3.5, s.z + 3 + Math.cos(a) * 15); }
  return tmp.set(s.x * .85, SLEIGH_Y + 6.5, s.z - 21); }
function camAim() { const m = camMode(), s = sleigh.position;
  if (m === "front" || m === "orbit") return tmp.set(s.x, SLEIGH_Y + 1.3, s.z + 3);
  return tmp.set(s.x * .92, SLEIGH_Y + .6, s.z + 10); }
function toggleCam() { state.frontCam = !state.frontCam; $("camBtn").textContent = state.frontCam ? "📸 Front cam: ON" : "📸 Front cam: OFF"; }
$("camBtn").onclick = toggleCam;

// --- v5: screen rain, soft music bus, plane engine + goose honks, blackout
const rf = $("rainFx"), rx = rf.getContext("2d"); let rainAmt = 0;
const drops = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), l: rnd(.04, .1), v: rnd(1.4, 2.2) }));
function sizeRain() { rf.width = innerWidth; rf.height = innerHeight; } sizeRain(); addEventListener("resize", sizeRain);
function drawRain(dt) {
  rainAmt += ((state.ev === "rain" && state.started ? 1 : 0) - rainAmt) * Math.min(1, dt * 2.5);
  rx.clearRect(0, 0, rf.width, rf.height); if (rainAmt < .02) return;
  const W = rf.width, H = rf.height, n = Math.floor(drops.length * rainAmt);
  rx.fillStyle = "rgba(25,45,85," + .22 * rainAmt + ")"; rx.fillRect(0, 0, W, H);
  rx.strokeStyle = "rgba(200,222,255,.55)"; rx.lineWidth = Math.max(1.2, W / 700); rx.beginPath();
  for (let i = 0; i < n; i++) { const d = drops[i]; d.y += d.v * dt * 1.6; d.x -= d.v * dt * .25; if (d.y > 1.05) { d.y = -.1; d.x = Math.random() * 1.2; } if (d.x < -.05) d.x += 1.1;
    const x = d.x * W, y = d.y * H; rx.moveTo(x, y); rx.lineTo(x + d.l * H * .16, y - d.l * H); }
  rx.stroke();
}
function musicBus() {
  if (!music.bus) {
    const lp = actx.createBiquadFilter(), g = actx.createGain(), d = actx.createDelay(), fb = actx.createGain(), wet = actx.createGain();
    lp.type = "lowpass"; lp.frequency.value = 2200; g.gain.value = .85; d.delayTime.value = .34; fb.gain.value = .35; wet.gain.value = .4;
    lp.connect(g); g.connect(actx.destination); music.gain = g; g.gain.value = .85 * music.vol; lp.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(g); music.bus = lp;
  }
  return music.bus;
}
let eng = null;
function planeAudio() {
  if (!actx) return;
  let nd = 999, ndx = 0;
  if (state.started && !state.paused) for (const o of obstacles) if (o.kind === "plane") { const dd = o.node.position.z - sleigh.position.z; if (Math.abs(dd) < Math.abs(nd)) { nd = dd; ndx = o.node.position.x - sleigh.position.x; } }
  if (!eng) {
    const o = actx.createOscillator(), o2 = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain(), p = actx.createStereoPanner();
    o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(p); p.connect(actx.destination); o.start(); o2.start(); eng = { o, o2, g, p };
  }
  const v = nd > 0 ? clamp(1 - nd / 130, 0, 1) : clamp(1 + nd / 30, 0, 1), fr = nd > 0 ? 95 + v * 45 : 70 + v * 25, t = actx.currentTime;
  eng.g.gain.setTargetAtTime(soundOn ? v * v * .13 * sfxVol : 0, t, .08);
  eng.o.frequency.setTargetAtTime(fr, t, .1); eng.o2.frequency.setTargetAtTime(fr * 1.01, t, .1);
  eng.p.pan.setTargetAtTime(clamp(ndx / 30, -1, 1), t, .1);
}
function honk(v) { const vol = .04 + .07 * clamp(v, 0, 1); tone(420, .16, "sawtooth", vol, 0, 300); tone(330, .22, "sawtooth", vol, .2, 250); }
sfx.blackout = () => { tone(260, .7, "sawtooth", .12, 0, 40); tone(120, .25, "square", .06, 2, 200); };
const DARKQ = ["Rolling blackout! ⚡ Someone tripped on the extension cord.", "Lights out! The elves forgot to pay the bill.", "Santa: ‘Who turned off the village?!’", "Blackout! Trust Rudolph’s nose, you’re safe for a sec."];

// --- v6: naughty/nice + coal, power-ups, robbers, candy canes & shop, achievements, pause + tutorial
let sfxVol = 1, shareText = ""; music.vol = 1;
const P = { shield: mat("pS", "#5dff9a", { e: "#5dff9a", a: .5 }), slow: mat("pL", "#b48cff", { e: "#b48cff" }), magnet: mat("pM", "#ff4a4a", { e: "#ff4a4a" }), tip: mat("pT", "#e8e8f0", { e: "#555566" }), cane: mat("pC", "#ff4a6a", { e: "#aa1030" }), caneW: mat("pCW", "#ffffff", { e: "#aaaaaa" }), bubble: mat("pB", "#7dffb0", { e: "#4be0a0", a: .16, nl: true }) };
const HALO = { cookie: X.haloC, milk: X.haloM, shield: mat("hS", "#5dff9a", { e: "#5dff9a", nl: true, a: .22 }), slow: mat("hL", "#b48cff", { e: "#b48cff", nl: true, a: .22 }), magnet: mat("hM", "#ff5a5a", { e: "#ff5a5a", nl: true, a: .22 }), cane: mat("hC", "#ff7a9a", { e: "#ff7a9a", nl: true, a: .18 }) };
const pickKind = () => { const r = Math.random(); return r < .22 ? "cookie" : r < .32 ? "milk" : r < .42 ? "shield" : r < .5 ? "slow" : r < .58 ? "magnet" : "cane"; };
function buildPower(kind, root) {
  if (kind === "shield") { on(MB.CreateSphere("ps", { diameter: 1.2, segments: 12 }, scene), root, 0, 0, 0, P.shield); on(MB.CreateTorus("pr", { diameter: 1.3, thickness: .1, tessellation: 20 }, scene), root, 0, 0, 0, P.tip); }
  else if (kind === "slow") { on(MB.CreateTorus("cl", { diameter: 1.2, thickness: .16, tessellation: 20 }, scene), root, 0, 0, 0, P.slow).rotation.x = 1.5708; on(MB.CreateBox("h1", { width: .08, height: .5, depth: .08 }, scene), root, 0, .2, 0, P.tip); on(MB.CreateBox("h2", { width: .4, height: .08, depth: .08 }, scene), root, .15, 0, 0, P.tip); }
  else if (kind === "magnet") { on(MB.CreateTorus("mg2", { diameter: 1, thickness: .26, tessellation: 16 }, scene), root, 0, 0, 0, P.magnet).rotation.x = 1.5708; [-.5, .5].forEach(x => on(MB.CreateBox("mtp", { width: .3, height: .3, depth: .3 }, scene), root, x, -.1, 0, P.tip)); }
  else { on(MB.CreateCylinder("cn1", { height: 1.2, diameter: .24, tessellation: 8 }, scene), root, 0, 0, 0, P.cane); [-.3, 0, .3].forEach(y => on(MB.CreateTorus("cs", { diameter: .26, thickness: .08, tessellation: 8 }, scene), root, 0, y, 0, P.caneW)); on(MB.CreateTorus("hk", { diameter: .5, thickness: .24, tessellation: 12 }, scene), root, .22, .6, 0, P.cane).rotation.x = 1.5708; }
}
function spawnPickupSet() { const k = pickKind(); if (k === "cane") { const x0 = clamp(sleigh.position.x + rnd(-20, 20), -ROAD_HALF, ROAD_HALF); for (let i = 0; i < 5; i++) spawnPickup("cane", clamp(x0 + Math.sin(i * .9) * 5, -ROAD_HALF, ROAD_HALF), sleigh.position.z + 130 + i * 8); } else spawnPickup(k); }
function nearHouse(x, z, r) { let b = null, bd = r; houses.forEach(h => { if (h.delivered) return; const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; b = h; } }); return b; }
function makeCoal() { const root = new BABYLON.TransformNode("coal", scene); [[0, 0, 0, .55], [.2, .15, .1, .35], [-.2, .1, -.1, .3]].forEach(([x, y, z, d]) => { const s = MB.CreateSphere("cl", { diameter: d, segments: 4 }, scene); s.parent = root; s.position.set(x, y, z); s.material = X.coal; shadows.addShadowCaster(s); }); return root; }
const COALQ = ["Coal delivered! Warm and toasty 🔥", "Naughty list: handled.", "Santa’s coal: now 100% organic.", "Should’ve behaved, buddy!"];
const BONKQ = ["BONK! Robber gift-slapped off the roof!", "Crime doesn’t pay. Gifts do.", "Robber: ‘I just wanted the TV!’", "Santa 1, Burglar 0."];
const flyers = [];
sfx.bonk = () => { tone(500, .1, "square", .1, 0, 150); tone(200, .25, "triangle", .12, .08, 80); };
function bonkRobber(h) {
  const c = h.rob.clone("flyer", null); c.setEnabled(true); c.position.copyFrom(h.rob.getAbsolutePosition()); c.rotation.set(0, 0, 0); c.scaling.setAll(1);
  flyers.push({ n: c, vx: (Math.random() < .5 ? 1 : -1) * rnd(7, 12), vy: 13, vz: rnd(2, 8), life: 2 });
  h.rob.setEnabled(false); h.robber = false; state.score += 30; sparkBurst(c.position.clone()); sfx.bonk(); toast("🦹 BONK!", "#9ec8ff"); popup("+30", "#9ec8ff"); say(pick(BONKQ)); bump("robbers");
}
function updateFlyers(dt) { for (let i = flyers.length - 1; i >= 0; i--) { const f = flyers[i]; f.vy -= 26 * dt; f.n.position.x += f.vx * dt; f.n.position.y += f.vy * dt; f.n.position.z += f.vz * dt; f.n.rotation.z += 9 * dt; f.n.rotation.x += 6 * dt; f.life -= dt; if (f.life <= 0 || f.n.position.y < 0) { f.n.dispose(); flyers.splice(i, 1); } } }
function robberCheck() {
  if (!state.started || state.paused || state.showcase > 0) return;
  houses.forEach(h => { if (h.robber && h.z < sleigh.position.z - 10) { h.robber = false; h.rob.setEnabled(false); state.score = Math.max(0, state.score - 5); toast("🦹 Robber escaped with the TV!", "#ff9a8a"); say("Robber: ‘Nice TV, suckers!’ (-5)"); updateHUD(); } });
}
const shieldMesh = MB.CreateSphere("shield", { diameter: 6.5, segments: 16 }, scene); shieldMesh.parent = sleigh; shieldMesh.position.y = 1.2; shieldMesh.material = P.bubble; shieldMesh.isPickable = false; shieldMesh.setEnabled(false);
let lastPow = "";
function powerFx(dt) {
  shieldMesh.setEnabled(state.shield > 0); shieldMesh.rotation.y += dt;
  const s = [state.boost > 0 ? "🍪" + Math.ceil(state.boost) : "", state.shield > 0 ? "🛡️" : "", state.slow > 0 ? "⏳" + Math.ceil(state.slow) : "", state.magnet > 0 ? "🧲" + Math.ceil(state.magnet) : ""].filter(Boolean).join(" ") || "—";
  if (s !== lastPow) { lastPow = s; $("power").textContent = s; }
}
let stats = {}; try { stats = JSON.parse(localStorage.getItem("sleighStats") || "{}") || {}; } catch (e) { stats = {}; }
stats.owned = stats.owned || [0]; stats.skin = stats.skin || 0; stats.top = stats.top || [];
function saveStats() { try { localStorage.setItem("sleighStats", JSON.stringify(stats)); } catch (e) { } }
const ACH = [["geese", 3, "🪿 Goose Magnet", "Get honked into 3 geese"], ["robbers", 5, "🦹 Robber Basher", "Bonk 5 robbers"], ["coal", 5, "🪨 Coal Miner", "Coal 5 naughty houses"], ["perfect", 10, "🏠 Chimney Champ", "10 chimney drops"], ["cookies", 5, "🍪 Sugar Fiend", "Eat 5 cookies"], ["rolls", 3, "🌀 Spinner", "Do 3 barrel rolls"], ["blackouts", 3, "🔌 Blackout Survivor", "Live through 3 blackouts"], ["caneEarn", 50, "🍬 Candy Hoarder", "Collect 50 candy canes"], ["delivered", 100, "🎅 Santa Pro", "Deliver 100 gifts"]];
function bump(k, n = 1) { const b = stats[k] || 0; stats[k] = b + n; ACH.forEach(a => { if (a[0] === k && b < a[1] && stats[k] >= a[1]) { toast("🏅 " + a[2], "#ffe08a"); say("Achievement unlocked: " + a[2]); sfx.combo(); } }); saveStats(); }
const SKINS = [["Classic red", "#cf2029", 0], ["Candy pink", "#ef5fa0", 15], ["Ice blue", "#3f8fe0", 25], ["Forest green", "#2e9b4f", 25], ["Royal purple", "#8f4fd0", 40], ["Gold", "#e8b53a", 80]];
const sleighMat = mat("slg", SKINS[stats.skin][1]);
sleigh.getChildMeshes().forEach(m => { if (/^s[bkf]$/.test(m.name)) m.material = sleighMat; });
function renderShop() {
  $("shop").innerHTML = SKINS.map((s, i) => { const own = stats.owned.includes(i); return '<button class="skin" data-i="' + i + '"' + (!own && (stats.canes || 0) < s[2] ? " disabled" : "") + ">" + (stats.skin === i ? "✅ " : "") + s[0] + (own ? "" : " — " + s[2] + " 🍬") + "</button>"; }).join("");
  $("shop").querySelectorAll("button").forEach(b => { b.onclick = () => { const i = +b.dataset.i, s = SKINS[i]; if (!stats.owned.includes(i)) { if ((stats.canes || 0) < s[2]) return; stats.canes -= s[2]; stats.owned.push(i); } stats.skin = i; sleighMat.diffuseColor = C3(s[1]); saveStats(); updateHUD(); renderShop(); }; });
  $("achList").innerHTML = ACH.map(a => (stats[a[0]] || 0) >= a[1] ? "✅ " + a[2] : "🔒 " + a[2] + " — " + a[3] + " (" + Math.min(stats[a[0]] || 0, a[1]) + "/" + a[1] + ")").join("<br>");
}
function togglePause() {
  if (!state.started && !state.paused) return;
  state.paused = !state.paused; $("pause").classList.toggle("hidden", !state.paused);
  if (state.paused) { renderShop(); if (actx) actx.suspend(); } else { state.dropQueued = false; state.coalQueued = false; if (actx) actx.resume(); }
}
$("pauseBtn").onclick = togglePause;
$("resumeBtn").onclick = () => { if (state.paused) togglePause(); else $("pause").classList.add("hidden"); };
$("menuBtn").onclick = $("menuBtn2").onclick = () => { renderShop(); $("pause").classList.remove("hidden"); };
$("musicVol").oninput = e => { music.vol = +e.target.value; if (music.gain) music.gain.gain.value = .85 * music.vol; };
$("sfxVol").oninput = e => { sfxVol = +e.target.value; };
$("shareBtn").onclick = () => { const t = shareText; if (navigator.share) navigator.share({ text: t }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => { $("shareBtn").textContent = "✅ Copied!"; }).catch(() => { }); };
$("coalBtn").addEventListener("touchstart", e => { e.preventDefault(); state.coalQueued = true; state.dropQueued = true; });
$("coalBtn").addEventListener("click", () => { state.coalQueued = true; state.dropQueued = true; });
document.addEventListener("visibilitychange", () => { if (document.hidden && state.started && !state.paused) togglePause(); });
let tipsSeen = false, tipTimer = 0; try { tipsSeen = localStorage.getItem("sleighTips") === "1"; } catch (e) { }
const TIPS = [[1, "A / D steer the sleigh. W / S change speed."], [7, "Line the ring up over a roof (green = go), then press Space to drop a gift."], [16, "Dodge geese, planes, giant trees and power lines. You only have 3 lives!"], [28, "Red-sign houses are NAUGHTY: press X to drop coal on them for bonus points!"], [42, "Orange ring = a grumpy dog is awake. Wait for it to doze off."], [56, "Catch cookies 🍪, milk 🥛, shields 🛡️, clocks ⏳, magnets 🧲 and candy canes 🍬."], [70, "Robbers on blue-beacon roofs? Land a gift right on them to bonk them off!"]];
function tipTick(dt) {
  if (tipsSeen || !state.started || state.paused || state.showcase > 0) return;
  state.tipT += dt; const t = TIPS[state.tipI];
  if (t && state.tipT > t[0]) { const el = $("tip"); el.textContent = "💡 " + t[1]; el.style.display = "block"; clearTimeout(tipTimer); tipTimer = setTimeout(() => { el.style.display = "none"; }, 6500); state.tipI++; if (state.tipI >= TIPS.length) { tipsSeen = true; try { localStorage.setItem("sleighTips", "1"); } catch (e) { } } }
}

// --- input
const KEYMAP = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };
addEventListener("keydown", e => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); } if (e.code === "Space") { e.preventDefault(); if (state.showcase > 0) state.showcase = 0; else if (!e.repeat) state.dropQueued = true; } if (e.code === "KeyR" && !e.repeat) resetGame(); if (e.code === "KeyM" && !e.repeat) toggleMusic(); if (e.code === "KeyX" && !e.repeat && !state.paused) { state.coalQueued = true; state.dropQueued = true; } if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) togglePause(); if (e.code === "KeyC" && !e.repeat) toggleCam(); });
addEventListener("keyup", e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
document.querySelectorAll("#touch button[data-k]").forEach(b => { const k = b.dataset.k;
  ["touchstart", "mousedown"].forEach(ev => b.addEventListener(ev, e => { e.preventDefault(); keys[k] = true; }));
  ["touchend", "mouseup", "mouseleave"].forEach(ev => b.addEventListener(ev, e => { e.preventDefault(); keys[k] = false; })); });
$("dropBtn").addEventListener("touchstart", e => { e.preventDefault(); state.dropQueued = true; });
$("dropBtn").addEventListener("click", () => { state.dropQueued = true; });
$("soundBtn").onclick = () => { soundOn = !soundOn; $("soundBtn").textContent = soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF"; if (soundOn) initAudio(); };
$("musicBtn").onclick = toggleMusic; $("againBtn").onclick = () => { resetGame(); initAudio(); };
$("startBtn").onclick = () => { $("overlay").classList.add("hidden"); state.started = true; initAudio(); sfx.ho(); toast("HO HO HO!", "#ff6a6a"); say(pick(START)); };

function resetGame() {
  packages.slice().forEach(p => p.node.dispose()); packages.length = 0; fx.splice(0).forEach(f => f.mesh.dispose());
  Object.assign(state, { score: 0, delivered: 0, missed: 0, combo: 0, stock: 25, speed: BASE_SPEED, steer: 0, cooldown: 0, nextToot: 18, lives: 3, invuln: 0, over: false, shake: 0, nextObs: 3, boost: 0, ev: null, evT: 0, nextEv: 35, nextPick: 6, roll: 0, nextRoll: 50, wind: 0, bolt: 0, showcase: 0, dark: 0, black: 0, nextDark: 75, shield: 0, slow: 0, magnet: 0, coalQueued: false, paused: false, flick: false, tipT: 0, tipI: 0 });
  elves.splice(0).forEach(e => e.node.dispose()); scene.fogDensity = .0034; snowPS.emitRate = 300; rainPS.emitRate = 0; hemi.intensity = .55; sleigh.rotation.z = 0; flyers.splice(0).forEach(f => f.n.dispose()); $("pause").classList.add("hidden"); if (actx) actx.resume(); $("blackout").style.opacity = 0; M.winOn.emissiveColor = C3("#ffc866");
  obstacles.splice(0).forEach(o => o.node.dispose()); sleigh.setEnabled(true); $("over").classList.add("hidden"); state.started = $("overlay").classList.contains("hidden");
  vel.x = 0; vel.z = BASE_SPEED; sleigh.position.set(0, SLEIGH_Y, 0); sleigh.rotation.set(0, 0, 0);
  rows.forEach((r, i) => { r.z = 26 + i * ROW_GAP; layoutRow(r); });
  updateHUD(); toast("Santa respawns. Elves unionize.", "#fff");
}

// --- main loop
const camLook = V(0, SLEIGH_Y, 4), tmp = V(0, 0, 0);
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(.05, engine.getDeltaTime() / 1000) * (state.paused ? 0 : state.slow > 0 ? .5 : 1); state.t += dt; const T = state.t;
  skyMat.setFloat("time", T); skyMat.setVector3("fwd", V(camLook.x - camera.position.x, 0, camLook.z - camera.position.z));
  bulbMats.forEach((m, i) => { const k = (.35 + .65 * Math.max(0, Math.sin(T * 3 + i * 1.6))) * (1 - state.black) * (state.flick && Math.sin(T * 47) < 0 ? .12 : 1); m.emissiveColor = C3(bulbBase[i]).scale(k); });

  if (state.started && state.showcase <= 0 && !state.paused) {
    const target = clamp(BASE_SPEED + sleigh.position.z * .012, BASE_SPEED, MAX_SPEED) + (state.boost > 0 ? 9 : 0) + (state.ev === "tail" ? 5 : 0);
    if (keys.up) state.speed += 14 * dt; else if (keys.down) state.speed -= 16 * dt; else state.speed += (target - state.speed) * Math.min(1, dt * 1.2);
    state.speed = clamp(state.speed, 4, MAX_SPEED + 14); vel.z = state.speed;
    const input = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const ice = state.ev === "ice"; state.steer = clamp(state.steer + input * STEER_RATE * (ice ? .5 : 1) * dt, -1, 1); if (!input) state.steer -= state.steer * (ice ? .12 : .8) * dt;
    vel.x = BABYLON.Scalar.Lerp(vel.x, state.steer * LAT_SPEED, Math.min(1, dt * (ice ? 1.6 : 6)));
    sleigh.position.x = clamp(sleigh.position.x + (vel.x + (state.ev === "gale" ? state.wind : 0)) * dt, -ROAD_HALF - 4, ROAD_HALF + 4);
    sleigh.position.z += vel.z * dt; sleigh.position.y = SLEIGH_Y + Math.sin(T * 1.7) * .26;
    sleigh.rotation.z = BABYLON.Scalar.Lerp(sleigh.rotation.z, -state.steer * .42, Math.min(1, dt * 5));
    sleigh.rotation.y = BABYLON.Scalar.Lerp(sleigh.rotation.y, state.steer * .18, Math.min(1, dt * 5));
    sleigh.rotation.x = Math.sin(T * 1.1) * .03;
    state.nextRoll -= dt;
    if (state.nextRoll <= 0 && state.roll <= 0 && state.invuln <= 0 && state.ev !== "gale") { state.roll = 2; state.nextRoll = rnd(75, 140); state.score += 10; bump("rolls"); sfx.wheee(); toast("🌀 BARREL ROLL!", "#ffe08a"); popup("STYLE +10", "#ffe08a"); say(pick(ROLLQ)); }
    if (state.roll > 0) { state.roll -= dt; const kk = 1 - Math.max(0, state.roll) / 2; sleigh.rotation.z = kk * kk * (3 - 2 * kk) * Math.PI * 2; if (state.roll <= 0) sleigh.rotation.z = 0; }
    trail.emitRate = 60 + state.speed * 8;

    state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.dropQueued) { state.dropQueued = false; if (state.cooldown <= 0) dropGift(state.coalQueued); state.coalQueued = false; }
    if (T > state.nextToot) { doToot(); state.nextToot = T + rnd(25, 50); }
    state.nextObs -= dt;
    if (state.nextObs <= 0) { spawnObstacle(); state.nextObs = clamp(3.8 - sleigh.position.z / 600, 1.5, 3.8) + rnd(0, 1.2); }
    state.shake = Math.max(0, state.shake - dt); state.boost = Math.max(0, state.boost - dt); state.slow = Math.max(0, state.slow - dt); state.magnet = Math.max(0, state.magnet - dt);
    state.nextPick -= dt; if (state.nextPick <= 0) { spawnPickupSet(); state.nextPick = rnd(7, 12); }
    updateEvents(dt, T); updateElves(dt, T);
    if (state.invuln > 0) { state.invuln -= dt; sleigh.setEnabled(state.invuln <= 0 || Math.floor(T * 14) % 2 === 0); }
    updateObstacles(dt, T);

    for (let i = packages.length - 1; i >= 0; i--) {
      const p = packages[i]; p.vel.y -= GRAVITY * dt;
      p.node.position.x += p.vel.x * dt; p.node.position.y += p.vel.y * dt; p.node.position.z += p.vel.z * dt;
      p.node.rotation.y += dt * 2.4; p.node.rotation.x += dt * 1.2;
      const hs = houseUnder(p.node.position.x, p.node.position.z);
      if (hs && !p.bounced) { const s = roofYAt(hs, p.node.position.x, p.node.position.z); if (p.node.position.y <= s) { if (hs.hasDog && dogAwake(hs)) bounceGift(p); else { p.node.position.y = s + .12; deliver(p, hs, s); continue; } } }
      if (p.node.position.y <= .25) { const el = elfAt(p.node.position.x, p.node.position.z); if (el) elfCatch(p, el); else miss(p); }
    }
    rows.forEach(row => { if (row.z < sleigh.position.z - 55) { row.z += SPAN; layoutRow(row); } });
    if (sleigh.position.z > best) { best = sleigh.position.z; try { localStorage.setItem("sleighBest", String(Math.floor(best))); } catch (e) { } }
    checkUnlocks(true);
    updateHUD();
  }

  // Santa: jiggly belly, bobbing head, wobbling pom-pom
  const bounce = Math.sin(T * 7);
  torso.scaling.set(1 + bounce * .04, 1 - bounce * .03, 1 + bounce * .05); belt.scaling.setAll(1 + bounce * .04);
  head.position.y = 1.42 + Math.abs(bounce) * .03; pom.position.x = Math.sin(T * 5) * .12; pom.position.y = 2.28 + Math.cos(T * 5) * .03;
  arms[0].rotation.x = 1.05 + Math.sin(T * 3) * .1;
  deer.forEach((r, i) => {
    const sp = 2.4 + vel.z * .18 + i * .12;
    r.root.position.y = Math.sin(T * sp + r.phase) * .17; r.root.position.x = r.baseX + Math.sin(T * sp * .6 + r.phase) * .12;
    r.legs.forEach((l, j) => { l.rotation.x = Math.sin(T * sp * 2 + r.phase + j * 1.6 + (j % 2) * Math.PI) * .6; });
    if (r.nose) { const s = 1 + Math.max(0, Math.sin(T * 4)) * .5; r.nose.scaling.setAll(s); }
  });

  state.showcase = Math.max(0, state.showcase - dt); drawRain(dt); planeAudio(); powerFx(dt); updateFlyers(dt); tipTick(dt); robberCheck();
  const lp = landingPoint(), tgt = houseUnder(lp.x, lp.z) || (state.magnet > 0 ? nearHouse(lp.x, lp.z, 14) : null);
  houses.forEach(h => { if (h.robber) { h.rob.rotation.y = Math.sin(T * 2 + h.x) * .6; h.rob.position.y = h.robY + Math.abs(Math.sin(T * 5 + h.x)) * .12; } if (h.hasDog) { const aw = dogAwake(h); h.bang.setEnabled(aw); h.dog.rotation.z = aw ? Math.sin(T * 30) * .08 : 0; h.dog.scaling.y = aw ? 1.15 : .8; } if (!h.delivered) { h.beacon.position.y = h.apex + 1.25 + Math.sin(T * 2.4 + h.x) * .16; h.beacon.scaling.setAll(1 + Math.sin(T * 4 + h.x) * .12); } });
  const c = tgt ? (tgt.hasDog && dogAwake(tgt) ? C3("#ffb347") : tgt.naughty ? C3("#c77dff") : tgt.robber ? C3("#5ab0ff") : C3("#4be07a")) : C3("#ff7a7a");
  M.marker.emissiveColor = c; M.marker.diffuseColor = c; M.beam.emissiveColor = c; M.beam.diffuseColor = c;
  if (tgt) ring.position.set(tgt.x, tgt.apex + .45, tgt.z); else ring.position.set(lp.x, .16, lp.z);
  beam.position.set(ring.position.x, 6, ring.position.z); ring.rotation.y += dt * 1.2;

  BABYLON.Vector3.LerpToRef(camera.position, camPos(), Math.min(1, dt * 3), camera.position);
  BABYLON.Vector3.LerpToRef(camLook, camAim(), Math.min(1, dt * 3.2), camLook);
  camera.setTarget(camLook);
  if (state.shake > 0) camera.position.addInPlace(V(rnd(-1, 1) * state.shake * 1.2, rnd(-1, 1) * state.shake * 1.2, 0));
  camera.fov = .95 + (vel.z - BASE_SPEED) * .006; // speed = FOV stretch
  skyDome.position.copyFrom(camera.position); skyRig.position.set(camera.position.x, 0, camera.position.z); ground.position.set(camera.position.x, 0, camera.position.z);
  gtex.uOffset = camera.position.x / 10; gtex.vOffset = camera.position.z / 10;
  moonLight.position.set(camera.position.x + 40, 70, camera.position.z - 50);

  houses.forEach((h, i) => {
    const d = dots[i], ahead = h.z - sleigh.position.z;
    if (ahead < -30 || ahead > 140) { d.style.display = "none"; return; }
    d.style.display = "block"; d.style.left = 50 + clamp((h.x - sleigh.position.x) / (ROAD_HALF * 1.25), -1, 1) * 46 + "%"; d.style.top = 94 - ahead / 140 * 88 + "%";
    d.style.background = h.delivered ? "rgba(140,160,190,.45)" : h === tgt ? "#4be07a" : h.naughty ? "#ff4a6a" : h.robber ? "#5ab0ff" : h.grinch ? "#7dff5a" : "#ffd76a";
  });
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; const k = Math.max(0, f.life / f.max); f.mesh.scaling.setAll(1 + (1 - k) * 3.5); f.mesh.material.alpha = k * .8; if (f.life <= 0) { f.mesh.dispose(); fx.splice(i, 1); } }
});
engine.runRenderLoop(() => scene.render());
addEventListener("resize", () => engine.resize());
updateHUD();
})();
