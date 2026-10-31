/* Family Fun 2.7.0 — DENSER CITY.
   The 2.6.0 screenshot showed a van tiny in a sea of empty grass with
   one cone tree and one brick wall. This layer fills the city:
   - A second road grid (vertical x=-32, horizontal z=32) with dashes,
     sidewalks and curbs, so the world is not one cross of roads.
   - 10 varied district buildings (heights 5-9, varied facades) in the
     outer ring, each registered as a logic collider so the player and
     the camera collide with them (no walking through walls).
   - Tree rows along roads (instanced trunks + foliage, 3 colours),
     lamp posts along roads (emissive bulbs only — no extra point
     lights, so mobile performance stays intact).
   - A park at (-28, 30) with paths, benches, flower beds and trees.
   - 4 parked cars along the new roads (detailed boxes + cabin +
     cylinder wheels, userData.gtaCar so camera24 avoids them, and a
     logic collider each so the player cannot walk through them).
   - A distant skyline silhouette ring (radius ~88) so the horizon is
     not an empty flat plane.
   Everything is try/catch: dressing can never break gameplay. */
(function(){
'use strict';
var done = false;
function add(){
  if (done || !window.scene || !window.THREE) return;
  var T = window.THREE, S = window.scene;
  try{
    function mat(c, o){
      o = o || {};
      if (window.FFTextures) return window.FFTextures.material(c, o.tex, o);
      return new T.MeshStandardMaterial({color: c, roughness: 0.9});
    }
    function box(w, h, d, m, x, y, z, cast){
      var mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      if (cast !== false){ mesh.castShadow = true; }
      mesh.receiveShadow = true;
      S.add(mesh);
      return mesh;
    }
    function flat(w, d, m, x, z, y){
      var mesh = new T.Mesh(new T.PlaneGeometry(w, d), m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y === undefined ? 0.045 : y, z);
      mesh.receiveShadow = true;
      S.add(mesh);
      return mesh;
    }
    function collider(x, z, hx, hz, h){
      try{
        if (window.FFLogic && window.FFLogic.colliders)
          window.FFLogic.colliders.push([x, z, hx, hz, h]);
      }catch(e){}
    }
    var asphalt = mat(0x2a2d33, {tex: 'asphalt', roughness: 0.65}); // 2.8.0 wet-look sheen
    var walk = mat(0xc9bba6, {tex: 'sidewalk', roughness: 0.85});
    var white = new T.MeshStandardMaterial({color: 0xf2f2e8, roughness: 0.7});
    var curbM = new T.MeshStandardMaterial({color: 0x3a3f46, roughness: 0.9});

    /* --- Second road grid --- */
    flat(5, 80, asphalt, -32, 0, 0.02);
    flat(80, 5, asphalt, 0, 32, 0.02);
    flat(2, 80, walk, -35.5, 0, 0.03);
    flat(2, 80, walk, -28.5, 0, 0.03);
    flat(80, 2, walk, 0, 28.5, 0.03);
    flat(80, 2, walk, 0, 35.5, 0.03);
    for (var z = -38; z <= 38; z += 4) flat(0.28, 1.8, white, -32, z, 0.045);
    for (var x = -38; x <= 38; x += 4) flat(1.8, 0.28, white, x, 32, 0.045);
    box(0.3, 0.14, 80, curbM, -29.6, 0.07, 0);
    box(0.3, 0.14, 80, curbM, -34.4, 0.07, 0);
    box(80, 0.14, 0.3, curbM, 0, 0.07, 29.6);
    box(80, 0.14, 0.3, curbM, 0, 0.07, 34.4);

    /* --- District buildings (outer ring, clear of the house ±12 and
           of the main roads x=0 / z=0 and the new roads x=-32 / z=32).
           [x, z, w, h, d, colour, texture] --- */
    var builds = [
      [-45, -28, 8, 7, 7, 0xd9a06b, 'brick'],
      [-45, 10, 7, 5, 8, 0x7fa8c9, 'plaster'],
      [-45, 44, 9, 8, 7, 0xc96f4a, 'brick'],
      [45, -28, 8, 6, 8, 0x9db98a, 'plaster'],
      [45, 10, 7, 9, 7, 0xb08bb5, 'brick'],
      [45, 44, 9, 5, 8, 0x8a9fb5, 'plaster'],
      [-20, -40, 8, 6, 7, 0xd9c27a, 'brick'],
      [20, -40, 7, 8, 7, 0x7fb5a0, 'plaster'],
      [20, 44, 8, 5, 7, 0xc98a8a, 'brick'],
      [-40, -44, 7, 7, 7, 0x9a8ac0, 'plaster']
    ];
    var winM = new T.MeshStandardMaterial({color: 0x1c2b3a, roughness: 0.2, metalness: 0.3});
    var litM = new T.MeshStandardMaterial({color: 0xffe9a8, emissive: 0xffc95c, emissiveIntensity: 0.7});
    builds.forEach(function(b, bi){
      var x = b[0], z = b[1], w = b[2], h = b[3], d = b[4];
      box(w, h, d, mat(b[5], {tex: b[6]}), x, h / 2, z);
      box(w + 0.4, 0.3, d + 0.4, mat(0x5a3d2a, {tex: 'roof'}), x, h + 0.15, z);
      // Window grid on the street-facing side (facing the city centre).
      var faceZ = z + (z > 0 ? -d / 2 - 0.06 : d / 2 + 0.06);
      var rows = Math.max(1, Math.floor(h / 2.2));
      for (var r = 0; r < rows; r++){
        for (var c = 0; c < 3; c++){
          var wx = x - w / 2 + 1.2 + c * (w - 2.4) / 2;
          var wm = new T.Mesh(new T.PlaneGeometry(1.0, 1.2), (bi + r + c) % 3 === 0 ? litM : winM);
          wm.position.set(wx, 1.6 + r * 2.2, faceZ);
          if (z > 0) wm.rotation.y = Math.PI;
          S.add(wm);
        }
      }
      // Door + awning.
      var door = new T.Mesh(new T.BoxGeometry(1.2, 2.2, 0.15), mat(0x4a2c14, {tex: 'wood'}));
      door.position.set(x, 1.1, faceZ + (z > 0 ? -0.05 : 0.05));
      S.add(door);
      var awn = new T.Mesh(new T.BoxGeometry(2.2, 0.15, 1.0), new T.MeshStandardMaterial({color: [0xc0392b, 0x2980b9, 0x27ae60][bi % 3], roughness: 0.8}));
      awn.position.set(x, 2.6, faceZ + (z > 0 ? -0.5 : 0.5));
      awn.castShadow = true;
      S.add(awn);
      collider(x, z, w / 2, d / 2, h);
    });

    /* --- Tree rows along roads (instanced: cheap on phones) --- */
    var trunkGeo = new T.CylinderGeometry(0.14, 0.22, 2.2, 7);
    var trunkMat = new T.MeshStandardMaterial({color: 0x5c3d1e, roughness: 1});
    var folGeo = new T.SphereGeometry(1.25, 10, 8);
    var folCols = [0x2d6a2d, 0x4f9b58, 0x3a7d3a];
    var spots = [];
    for (var tz = -36; tz <= 36; tz += 8){ spots.push([-38, tz]); spots.push([38, tz]); }
    for (var tx = -36; tx <= 36; tx += 8){ spots.push([tx, -38]); spots.push([tx, 38]); }
    // Keep trees off the new roads and the park.
    spots = spots.filter(function(p){
      return Math.abs(p[0] + 32) > 3 && Math.abs(p[1] - 32) > 3 &&
        !(p[0] > -38 && p[0] < -18 && p[1] > 22 && p[1] < 38);
    });
    var trunks = new T.InstancedMesh(trunkGeo, trunkMat, spots.length);
    var fols = folCols.map(function(c){
      return new T.InstancedMesh(folGeo, new T.MeshStandardMaterial({color: c, roughness: 1}), Math.ceil(spots.length / 3));
    });
    var m4 = new T.Matrix4(), q = new T.Quaternion(), one = new T.Vector3(1, 1, 1);
    var counts = [0, 0, 0];
    spots.forEach(function(p, i){
      m4.compose(new T.Vector3(p[0], 1.1, p[1]), q, one);
      trunks.setMatrixAt(i, m4);
      var fi = i % 3;
      m4.compose(new T.Vector3(p[0], 2.9, p[1]), q, one);
      fols[fi].setMatrixAt(counts[fi]++, m4);
    });
    trunks.instanceMatrix.needsUpdate = true;
    trunks.castShadow = true;
    S.add(trunks);
    fols.forEach(function(f){ f.instanceMatrix.needsUpdate = true; f.castShadow = false; S.add(f); }); // 2.8.0: instanced foliage casts no shadow (trunks still do)

    /* --- Lamp posts along the new roads (emissive only) --- */
    var poleM = new T.MeshStandardMaterial({color: 0x25313d, metalness: 0.5, roughness: 0.5});
    var bulbM = new T.MeshStandardMaterial({color: 0xffd27d, emissive: 0xffa62b, emissiveIntensity: 1.2});
    for (var lz = -36; lz <= 36; lz += 12){
      [[-29.2, lz], [29.2, lz]].forEach(function(p){
        var pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 3.4, 8), poleM);
        pole.position.set(p[0], 1.7, p[1]); pole.castShadow = false; S.add(pole);
        var bulb = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), bulbM);
        bulb.position.set(p[0], 3.5, p[1]); S.add(bulb);
      });
    }

    /* --- Park at (-20, 26): inside the block bounded by roads x=-32
           and z=32, clear of both (roads start at x=-29.5 / z=29.5). --- */
    flat(14, 6, mat(0x9db98a, {tex: 'grass'}), -20, 26, 0.03);
    flat(2, 6, walk, -20, 26, 0.04);
    flat(14, 2, walk, -20, 26, 0.04);
    var benchM = mat(0x8a5a32, {tex: 'wood'});
    [[-25, 24], [-15, 24], [-25, 28], [-15, 28]].forEach(function(p){
      var seat = new T.Mesh(new T.BoxGeometry(1.8, 0.1, 0.5), benchM);
      seat.position.set(p[0], 0.5, p[1]); seat.castShadow = false; S.add(seat);
    });
    var bloom = [0xe91e63, 0xffeb3b, 0xff7043, 0xffffff];
    [[-23, 25], [-17, 27]].forEach(function(p, pi){
      var bed = new T.Mesh(new T.BoxGeometry(2.2, 0.4, 1.1), new T.MeshStandardMaterial({color: 0x4a3220, roughness: 1}));
      bed.position.set(p[0], 0.2, p[1]); bed.castShadow = false; S.add(bed);
      for (var fi = 0; fi < 4; fi++){
        var f = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), new T.MeshStandardMaterial({color: bloom[(pi + fi) % 4], roughness: 0.6}));
        f.position.set(p[0] - 0.75 + fi * 0.5, 0.5, p[1]); S.add(f);
      }
    });

    /* --- Parked cars along the new roads (detailed props, static) --- */
    var carCols = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12];
    [[-29.5, -12, 0], [-29.5, 12, 0], [29.5, -20, Math.PI], [29.5, 20, Math.PI]].forEach(function(c, ci){
      var g = new T.Group();
      g.position.set(c[0], 0, c[1]);
      g.rotation.y = c[2];
      var paint = new T.MeshStandardMaterial({color: carCols[ci], metalness: 0.55, roughness: 0.38});
      var body = new T.Mesh(new T.BoxGeometry(1.8, 0.6, 4.2), paint);
      body.position.y = 0.55; body.castShadow = true; g.add(body);
      var cabin = new T.Mesh(new T.BoxGeometry(1.6, 0.55, 2.0), new T.MeshStandardMaterial({color: 0x1c2b3a, roughness: 0.2, metalness: 0.3}));
      cabin.position.set(0, 1.1, -0.2); cabin.castShadow = true; g.add(cabin);
      var wheelM = new T.MeshStandardMaterial({color: 0x111111, roughness: 0.9});
      [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].forEach(function(wp){
        var w = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 0.25, 12), wheelM);
        w.rotation.z = Math.PI / 2;
        w.position.set(wp[0], 0.35, wp[1]);
        g.add(w);
      });
      g.userData.gtaCar = true;
      g.userData.ff24Radius = 2.2;
      S.add(g);
      collider(c[0], c[1], 1.1, 2.2, 1.5);
    });

    /* --- Skyline silhouette ring (horizon, not empty) --- */
    var skyM = new T.MeshStandardMaterial({color: 0x3d4a5c, roughness: 1});
    for (var a = 0; a < 24; a++){
      var ang = a / 24 * Math.PI * 2;
      var sx = Math.cos(ang) * 88, sz = Math.sin(ang) * 88;
      var sh = 12 + ((a * 7) % 9);
      var sw = 8 + ((a * 5) % 6);
      var tower = new T.Mesh(new T.BoxGeometry(sw, sh, sw), skyM);
      tower.position.set(sx, sh / 2, sz);
      S.add(tower);
    }
    done = true;
  }catch(e){ /* dressing must never break the game */ }
}
setInterval(add, 900);
})();
