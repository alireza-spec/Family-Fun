/* Family Fun 2.5.0 — GTA city dressing: road markings, crossings, curbs,
   planters and neon-style district signs. Runs once after the scene
   exists; every step is try/catch so dressing can never break gameplay.
   Main roads (from game-core buildGround): one road along Z at x=0
   (width 6) and one along X at z=0 (width 6), with sidewalks at x=±4. */
(function(){
'use strict';
var done = false;
function add(){
  if (done || !window.scene || !window.THREE) return;
  var T = window.THREE, S = window.scene;
  try{
    var white = new T.MeshStandardMaterial({color: 0xf2f2e8, roughness: 0.7});
    var yellow = new T.MeshStandardMaterial({color: 0xf2b705, roughness: 0.7});
    function flat(w, d, mat, x, z){
      var m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.045, z);
      m.receiveShadow = true; S.add(m); return m;
    }
    // Dashed centre lines on both main roads (GTA-style, not a flat plane).
    for (var z = -38; z <= 38; z += 4) flat(0.28, 1.8, white, 0, z);
    for (var x = -38; x <= 38; x += 4) flat(1.8, 0.28, white, x, 0);
    // Zebra crossings at the four approaches to the central junction.
    [[0, 9], [0, -9], [9, 0], [-9, 0]].forEach(function(c){
      var horiz = c[1] === 0;
      for (var i = -2; i <= 2; i++){
        if (horiz) flat(0.55, 4.6, white, c[0] + i * 1.1, c[1]);
        else flat(4.6, 0.55, white, c[0], c[1] + i * 1.1);
      }
    });
    // Curb stones along the sidewalks (dark edge so roads read as roads).
    var curb = new T.MeshStandardMaterial({color: 0x3a3f46, roughness: 0.9});
    [-5.1, 5.1].forEach(function(x){
      var m = new T.Mesh(new T.BoxGeometry(0.3, 0.14, 76), curb);
      m.position.set(x, 0.07, 0); m.castShadow = false; S.add(m); // 2.8.0: flat curb stones cast no shadow
    });
    // Flower planters flanking the plaza approach (colour, not flat grass).
    var soil = new T.MeshStandardMaterial({color: 0x4a3220, roughness: 1});
    var bloom = [0xe91e63, 0xffeb3b, 0xff7043, 0xffffff];
    [[-6, 26], [6, 26], [-6, -26], [6, -26]].forEach(function(p, pi){
      var b = new T.Mesh(new T.BoxGeometry(2.2, 0.4, 1.1), soil);
      b.position.set(p[0], 0.2, p[1]); b.castShadow = false; S.add(b);
      for (var i = 0; i < 4; i++){
        var f = new T.Mesh(new T.SphereGeometry(0.16, 8, 6),
          new T.MeshStandardMaterial({color: bloom[(pi + i) % bloom.length], roughness: 0.6}));
        f.position.set(p[0] - 0.75 + i * 0.5, 0.5, p[1]); f.castShadow = false; S.add(f);
      }
    });
    // Neon-style district signs on posts at the two main junctions.
    function neon(text, x, z, rotY){
      try{
        var c = document.createElement('canvas'); c.width = 512; c.height = 128;
        var g = c.getContext('2d');
        g.fillStyle = '#0b1020'; g.fillRect(0, 0, 512, 128);
        g.strokeStyle = '#22d3ee'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
        g.fillStyle = '#a5f3fc'; g.font = '700 52px Vazirmatn, Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
        var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
        var board = new T.Mesh(new T.PlaneGeometry(4.4, 1.1),
          new T.MeshStandardMaterial({map: tex, emissive: 0x0e7490, emissiveIntensity: 0.35, emissiveMap: tex}));
        board.position.set(x, 3.4, z); board.rotation.y = rotY; board.castShadow = false; S.add(board);
        var pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 3.0, 8),
          new T.MeshStandardMaterial({color: 0x25313d, metalness: 0.5, roughness: 0.5}));
        pole.position.set(x, 1.5, z); pole.castShadow = false; S.add(pole);
      }catch(e){}
    }
    neon('مرکز شهر', -7, -7, Math.PI / 4);
    neon('بازار شبانه', 7, 7, -Math.PI / 4);
    done = true;
  }catch(e){ /* dressing must never break the game */ }
}
setInterval(add, 900);
})();
