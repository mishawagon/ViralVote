"use strict";

//https://stackoverflow.com/questions/831030/how-to-get-get-request-parameters-in-javascript
function get_url_params(name){
  if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search)) {
    return decodeURIComponent(name[1]);
  }

}

//https://rosettacode.org/wiki/Map_range#JavaScript
let mapRange = function(from, to, s) {
  return to[0] + (s - from[0]) * (to[1] - to[0]) / (from[1] - from[0]);
};


// SETTINGS of this demo:
const SETTINGS = {
  rotationOffsetX: 0, // negative -> look upper. in radians
  cameraFOV: 40,      // in degrees, 3D camera FOV
  pivotOffsetYZ: [0.2,0.2], // XYZ of the distance between the center of the cube and the pivot
  detectionThreshold: 0.5,  // sensibility, between 0 and 1. Less -> more sensitive
  detectionHysteresis: 0.1,
  scale: 1 // scale of the 3D cube
};

// some globalz:
let BABYLONVIDEOTEXTURE = null, BABYLONENGINE = null, BABYLONFACEOBJ3D = null, BABYLONFACEOBJ3DPIVOTED = null, BABYLONSCENE = null, BABYLONCAMERA = null, ASPECTRATIO = -1, JAWMESH = null, da_sphere = null, GLOB_face = false, text1 = "", MouthMesh = null, SPS2 = null, InstaDeathDelay = false, mouthOpening = 0, DRUMPF = null, sphereDrumpf = null, VoteLoad = 0, kInterval = 0, trueViralLoad = [], VotesLanded = [], drumpfStartColor=null, ViralLoadBar = null, ViralLoadBarOutlineStartColor = null, ViralLoadBarOutline = null, advancedTexture = null, GameState = 0, VoteLoadBar = null, VoteLoadBarOutline = null, VoteLoadBarOutlineStartColor = null, DrumpfMultiplies = null, maxVoteLoad = 60, DRUMPFVoteLoadAnimationThreshold = 10; //above 10
let ISDETECTED = false, textBack = null, speed = 0.01, speed2 = 0.01, standardSpeed = 40, ref_speed = .05, ref_speed2 = .08;


// analoguous to GLSL smoothStep function:
function smoothStep(edge0, edge1, x){
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// callback launched if a face is detected or lost:
function detect_callback(isDetected){
  if (isDetected){
    GLOB_face = true;
    console.log('INFO in detect_callback(): DETECTED');
    da_sphere.scaling.x = 1;da_sphere.scaling.y = 1;da_sphere.scaling.z = 1;
  } else {
    GLOB_face = false;
    console.log('INFO in detect_callback(): LOST');
    da_sphere.scaling.x = 0;da_sphere.scaling.y = 0;da_sphere.scaling.z = 0;
  }
}

//Effect from https://www.babylonjs-playground.com/#TZJ0HQ#18
var thanosFX =
`varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 screenSize;

uniform sampler2D noiseRef0;
uniform sampler2D noiseRef1;

uniform float time;


void main(void){

    vec2 unit = vUV/screenSize;
    unit*=16.0+(sin(time*0.5)*50.0);
    vec2 pos = vUV;
    pos.x += sin(time*0.35);
    pos.y -= time*0.2;
    vec2 r = ((texture2D(noiseRef0, pos).rb)*2.0-1.0)*unit;


    vec3 c = texture2D(textureSampler, vUV+r).rgb;



   gl_FragColor = vec4(c, 1.0);
}
`;

BABYLON.Effect.ShadersStore['thanosEffectFragmentShader'] = thanosFX;


// build the 3D. called once when Jeeliz Face Filter is OK:
function init_babylonScene(spec){
  // INIT THE BABYLON.JS context:
  var canvas = document.getElementById("jeeFaceFilterCanvas");



  BABYLONENGINE = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, deterministicLockstep: true, });

  // CREATE THE SCENE:
  BABYLONSCENE = new BABYLON.Scene(BABYLONENGINE);

  // COMPOSITE OBJECT WHICH WILL FOLLOW THE HEAD:
  // in fact we create 2 objects to be able to shift the pivot point
  BABYLONFACEOBJ3D = new BABYLON.Mesh();
  BABYLONFACEOBJ3DPIVOTED = new BABYLON.Mesh();
  BABYLONFACEOBJ3DPIVOTED.position.set(0, -SETTINGS.pivotOffsetYZ[0], -SETTINGS.pivotOffsetYZ[1]);
  BABYLONFACEOBJ3DPIVOTED.scaling.set(SETTINGS.scale, SETTINGS.scale, SETTINGS.scale);
  BABYLONFACEOBJ3D.addChild(BABYLONFACEOBJ3DPIVOTED);
  BABYLONSCENE.addMesh(BABYLONFACEOBJ3D);

  // CREATE A CUBE:
  const cubeMaterial = new BABYLON.StandardMaterial("material", BABYLONSCENE);
  cubeMaterial.emissiveColor = new BABYLON.Color3(0, 0.28, 0.36);
  //misha turning off cubes by making them transparent.
  //they are useful for head and mouth tracking reference/debugging.
  cubeMaterial.alpha = 0.0;

  const babylonCube = new BABYLON.Mesh.CreateBox("box", 1, BABYLONSCENE);
  babylonCube.material = cubeMaterial;
  BABYLONFACEOBJ3DPIVOTED.addChild(babylonCube);
  babylonCube.position.set(0,0,0);

  // CREATE THE MESH MOVING WITH THE JAW (mouth opening):
  JAWMESH = BABYLON.MeshBuilder.CreateBox("jaw", {height: 0.3, width: 1, depth: 1}, BABYLONSCENE);
  JAWMESH.material = cubeMaterial;
  BABYLONFACEOBJ3DPIVOTED.addChild(JAWMESH);
  JAWMESH.position.set(0,-(0.5+0.15+0.01),0);


  MouthMesh = BABYLON.Mesh.CreatePlane("mouth", 1, BABYLONSCENE);
  const mouthMat = new BABYLON.StandardMaterial("mouthMat", BABYLONSCENE);
  mouthMat.emissiveColor = new BABYLON.Color3(1, .5, .3);

  mouthMat.alpha = 0;

  MouthMesh.material = mouthMat;
  BABYLONFACEOBJ3DPIVOTED.addChild(MouthMesh);
  MouthMesh.position.set(0,-0.4,0);

  //syntheticmagus
  //https://forum.babylonjs.com/t/ar-game-mechanics-across-devices/10296/3
  /*
  var perfMon = new BABYLON.PerformanceMonitor(1);
  perfMon.enable();
  BABYLONSCENE.onBeforeRenderObservable.add(() => {
      perfMon.sampleFrame();
      //console.log("This frame took " + perfMon.instantaneousFrameTime + " milliseconds.");
  });
  */
  BABYLONSCENE.clearColor = new BABYLON.Color3( .2, .3, .6);

  var pl = new BABYLON.PointLight("pl", new BABYLON.Vector3(0, 0, 0), BABYLONSCENE);
  pl.diffuse = new BABYLON.Color3(1, 1, 1);
  pl.specular = new BABYLON.Color3(1, 1, 0.8);
  pl.intensity = 0.95;
  pl.position.x = 0;
  pl.position.y = 0;
  pl.position.z = 0;
  //pl.position = camera.position;

  var sphereRadius = .55;
  var ground = BABYLON.MeshBuilder.CreateGround("ground for virus", {width: 10.0, height: 10.0}, BABYLONSCENE);
  var ground2 = BABYLON.MeshBuilder.CreateGround("ground for votes", {width: 10.0, height: 10.0}, BABYLONSCENE);

  var sphere = BABYLON.Mesh.CreateSphere("sphere", 10, sphereRadius * 2.0, BABYLONSCENE);

  sphere.getBoundingInfo().boundingSphere.scale(0.4);

  da_sphere = sphere;

  var box = BABYLON.MeshBuilder.CreateBox("b", {size: 0.05}, BABYLONSCENE);
  var matBox = new BABYLON.StandardMaterial("mb", BABYLONSCENE);
  matBox.emissiveColor = BABYLON.Color3.Green();
  box.material = matBox;


  // texture and material
 var url = "textures/Covid19-2.png";//"http://upload.wikimedia.org/wikipedia/en/8/86/Einstein_tongue.jpg";
 var mat = new BABYLON.StandardMaterial("mat1", BABYLONSCENE);
 mat.backFaceCulling = false;
 var texture = new BABYLON.Texture(url, BABYLONSCENE);
 mat.diffuseTexture = texture;

 var plane = BABYLON.Mesh.CreatePlane("plane", 0.15, BABYLONSCENE);

  var matSphere = new BABYLON.StandardMaterial("ms", BABYLONSCENE);
  var matGround = new BABYLON.StandardMaterial("mg", BABYLONSCENE);
  matSphere.diffuseColor = BABYLON.Color3.Blue();
  matGround.diffuseColor = new BABYLON.Color3(0.5, 0.45, 0.4);

  matSphere.alpha = .0;

  sphere.material = matSphere;
  //sphere.refreshBoundingInfo();
  //sphere.showBoundingBox = true;

  matGround.alpha = 0;
  ground.material = matGround;

  //ground.rotation.x = Math.PI / 2.0;
  ground.position.x = 0;
  ground.position.y = -5.2;
  ground.position.z = 10;

  ground.rotation.x = 0;



  ground2.material = matGround;

  ground2.position.x = 0;
  ground2.position.y = -2;
  ground2.position.z = -1;

  ground2.rotation.x = 290 * (Math.PI /180);



  // Viral particle system
  var particleNb = 1000;
  var SPS = new BABYLON.SolidParticleSystem('SPS', BABYLONSCENE, {particleIntersection: true, boundingSphereOnly: true, bSphereRadiusFactor: .2, useModelMaterial: true, expandable: true});
  //SPS.billboard = true;
  SPS.addShape(plane, particleNb);


  var mesh = SPS.buildMesh();



  mesh.material = mat;

  //mesh.hasVertexAlpha = true;
  mesh.material.diffuseTexture.hasAlpha = true;
  mesh.material.useAlphaFromDiffuseTexture = true;
  plane.dispose();
  SPS.isAlwaysVisible = true;




  // shared variables
  speed = ref_speed;                  // particle max speed
  var cone = 0.9;                   // emitter aperture
  var gravity = -speed / 100;       // gravity
  var restitution = 0;           // energy restitution
  var k = 0.0;  //drumpf rotaton step
  var sign = 1;
  var tmpPos = BABYLON.Vector3.Zero();          // current particle world position
  var tmpNormal = BABYLON.Vector3.Zero();       // current sphere normal on intersection point
  var tmpDot = 0.0;                             // current dot product

  kInterval = 0;


  // position things
  mesh.position.y = 1;//80.0/misha_divisor;
  mesh.position.x = 0;//-70.0/misha_divisor;
  mesh.position.z = 0;
  mesh.rotation.x = 0;
  mesh.rotation.y = 269 * (Math.PI/180);
  mesh.rotation.z = 56.3  * (Math.PI/180);

  // SPS initialization : just recycle all
  SPS.initParticles = function() {

    for (var p = 0; p < SPS.nbParticles; p++) {
      SPS.recycleParticle(SPS.particles[p]);
    }

  };

  // recycle : reset the particle at the emitter origin
  SPS.recycleParticle = function(particle) {
    particle.position.x = 0;
    particle.position.y = 0;
    particle.position.z = 0;
    particle.velocity.x = Math.random() * speed;
    particle.velocity.y = (Math.random() - 0.3) * cone * speed;
    particle.velocity.z = (Math.random() - 0.5) * cone * speed;

    particle.rotation.x = Math.PI/2;//Math.random() * Math.PI;
    particle.rotation.y = Math.random() * Math.PI;
    particle.rotation.z = Math.random() * Math.PI;

    //particle.color.r = 0.0;
    //particle.color.g = 1.0;
    //particle.color.b = 0.0;
    //particle.color.a = 1.0;
  };

  // particle behavior
  SPS.updateParticle = function(particle) {

    // recycle if touched the ground
    if ((particle.position.y + mesh.position.y) < ground.position.y) {
      this.recycleParticle(particle);
    }

    // intersection for viral load
    if (particle.intersectsMesh(sphere) && GLOB_face) {

        if (!trueViralLoad.includes(particle.idx)) { trueViralLoad.push(particle.idx)};

        particle.position.addToRef(mesh.position, tmpPos);                  // particle World position
        tmpPos.subtractToRef(sphere.position, tmpNormal);                   // normal to the sphere
        tmpNormal.normalize();                                              // normalize the sphere normal
        tmpDot = BABYLON.Vector3.Dot(particle.velocity, tmpNormal);            // dot product (velocity, normal)
        // bounce result computation
        particle.velocity.x = -particle.velocity.x + 2.0 * tmpDot * tmpNormal.x;
        particle.velocity.y = -particle.velocity.y + 2.0 * tmpDot * tmpNormal.y;
        particle.velocity.z = -particle.velocity.z + 2.0 * tmpDot * tmpNormal.z;
        particle.velocity.scaleInPlace(restitution);                      // aply restitution

    } else {
      //Actual viral load should aways accumulate, why not? Makes it an actual challenge
      /*
      if (trueViralLoad.includes(particle.idx)) {
        var index = trueViralLoad.indexOf(particle.idx);
        if (index !== -1) trueViralLoad.splice(index, 1);
      };
      */
    }


    // update velocity, rotation and position
    particle.velocity.y += gravity;                         // apply gravity to y
    (particle.position).addInPlace(particle.velocity);      // update particle new position
    sign = (particle.idx % 2 == 0) ? 1 : -1;                // rotation sign and then new value
    particle.rotation.z += 0.1 * sign;
    particle.rotation.x += 0.05 * sign;
    particle.rotation.y += 0.008 * sign;


  };

  // init all particle values
  SPS.initParticles();
  SPS.setParticles();

  SPS.computeParticleRotation = false;
  SPS.computeParticleColor = false;
  SPS.computeParticleTexture = false;


  // Second particle CreatePlane
  var plane2 = BABYLON.Mesh.CreatePlane("plane2", 1, BABYLONSCENE);


  // Second particle material

  // texture and material
  var url2 = "textures/viralVote2.png";//"http://upload.wikimedia.org/wikipedia/en/8/86/Einstein_tongue.jpg";
  var mat2 = new BABYLON.StandardMaterial("mat2", BABYLONSCENE);
  mat2.backFaceCulling = false;
  var texture2 = new BABYLON.Texture(url2, BABYLONSCENE);
  mat2.diffuseTexture = texture2;


  // Second mouth spew vote load particle system

  var particleNb2 = 10;
  SPS2 = new BABYLON.SolidParticleSystem('SPS2', BABYLONSCENE, {particleIntersection: true, boundingSphereOnly: true, bSphereRadiusFactor: .2, useModelMaterial: true});
  //SPS.billboard = true;
  SPS2.addShape(plane2, particleNb2);


  var mesh2 = SPS2.buildMesh();



  mesh2.material = mat2;

  //mesh.hasVertexAlpha = true;
  mesh2.material.diffuseTexture.hasAlpha = true;
  mesh2.material.useAlphaFromDiffuseTexture = true;

  mesh2.position.y = -0.5;
  mesh2.position.z = -.5;

  BABYLONFACEOBJ3DPIVOTED.addChild(mesh2);

  plane2.dispose();
  SPS2.isAlwaysVisible = true;


  // shared variables
   speed2 = ref_speed2;//* perfMon.instantaneousFrameTime / 80;                  // particle max speed
  var cone2 = 0.4;                   // emitter aperture
  var gravity2 = -speed / 1400;       // gravity
  var restitution2 = 1.2;           // energy restitution
  //var k2 = 0.0;
  var sign2 = 1;
  var tmpPos2 = BABYLON.Vector3.Zero();          // current particle world position
  var tmpNormal2 = BABYLON.Vector3.Zero();       // current sphere normal on intersection point
  var tmpDot2 = 0.0;                             // current dot product



  // position things

  mesh2.rotation.x = 0;
  mesh2.rotation.y = 100 * (Math.PI/180);
  mesh2.rotation.z = 300  * (Math.PI/180);

  // SPS initialization : just recycle all
  SPS2.initParticles = function() {

    for (var p = 0; p < SPS2.nbParticles; p++) {
      SPS2.recycleParticle(SPS2.particles[p]);
    }

  };

  // recycle : reset the particle at the emitter origin
  SPS2.recycleParticle = function(particle) {
    particle.position.x = 0;
    particle.position.y = 0;
    particle.position.z = 0;
    particle.velocity.x = Math.random() * speed2;
    //console.log("DST2 "+perfMon.instantaneousFPS);
    particle.velocity.y = (Math.random() - 0.3) * cone2 * speed2;
    particle.velocity.z = (Math.random() - 0.5) * cone2 * speed2;

    particle.rotation.x = Math.PI/2;//Math.random() * Math.PI;
    particle.rotation.y = -Math.PI;//Math.random() * Math.PI;
    particle.rotation.z = -Math.PI/2;//Math.random() * Math.PI;

  };

  //Drumpf's collision sphere
  var matSphereDrumpf = new BABYLON.StandardMaterial("msDrumpf", BABYLONSCENE);
  matSphereDrumpf.diffuseColor = BABYLON.Color3.Blue();
  matSphereDrumpf.alpha = 0;
  sphereDrumpf = BABYLON.Mesh.CreateSphere("sphereDrumpf", 10, .4, BABYLONSCENE);
  sphereDrumpf.getBoundingInfo().boundingSphere.scale(0.4);
  sphereDrumpf.material = matSphereDrumpf;



  // particle behavior
  SPS2.updateParticle = function(particle) {

    // recycle if touched the ground
    //changing to z because it's rotated up

    // recycle if touched the ground
    if ((particle.position.z + mesh2.position.z) < ground2.position.z) {
      this.recycleParticle(particle);
    }

    // intersection
    if (particle.intersectsMesh(sphereDrumpf) && InstaDeathDelay) {

        if (!VotesLanded.includes(particle.idx)) { VotesLanded.push(particle.idx)};

        particle.position.addToRef(mesh2.position, tmpPos2);                  // particle World position
        tmpPos2.subtractToRef(sphereDrumpf.position, tmpNormal2);                   // normal to the sphere
        tmpNormal2.normalize();                                              // normalize the sphere normal
        tmpDot2 = BABYLON.Vector3.Dot(particle.velocity, tmpNormal2);            // dot product (velocity, normal)
        // bounce result computation
        particle.velocity.x = -particle.velocity.x + 2.0 * tmpDot2 * tmpNormal2.x;
        particle.velocity.y = -particle.velocity.y + 2.0 * tmpDot2 * tmpNormal2.y;
        particle.velocity.z = -particle.velocity.z + 2.0 * tmpDot2 * tmpNormal2.z;
        particle.velocity.scaleInPlace(restitution2);                      // aply restitution

        VoteLoad += 1;


        //console.log(VoteLoad);
        if (VoteLoad > maxVoteLoad) { VoteLoad = maxVoteLoad; }

        if (VoteLoad > DRUMPFVoteLoadAnimationThreshold) { //start still
          kInterval = 0.2 * (VoteLoad)/maxVoteLoad;
        }

        if (DRUMPF != null) {


          //red
          var drumpfEndColor = new BABYLON.Color3(255/255,0,0);

          //interpolate
          //drumpfMaterial.emissiveColor = BABYLON.Color3.Lerp(drumpfStartColor, drumpfEndColor, VoteLoad/100);


          //AntiDrumpf vote registered initial pulse
          //Drumpf's vote registration pulse of max vote color animation
          var votePulse = new BABYLON.Animation("votePulse", "material.diffuseColor", 60, BABYLON.Animation.ANIMATIONTYPE_COLOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
          var votePulseKeys = [];

          votePulseKeys.push({
            frame: 0,
            value: drumpfEndColor
          });

          votePulseKeys.push({
            frame: 15,
            value: BABYLON.Color3.Lerp(drumpfStartColor, drumpfEndColor, VoteLoad/100)
          });

          votePulse.setKeys(votePulseKeys);

          DRUMPF.animations.push(votePulse);
          BABYLONSCENE.beginAnimation(DRUMPF, 0, 120, false);
        }

        if (VoteLoad == maxVoteLoad && GameState != "won" && GameState != "stop") {
          GameState = "won";

          DRUMPF.dispose();


          ShowRestartGUI();
        }


    } else {

      if (VotesLanded.includes(particle.idx)) {
        var index = VotesLanded.indexOf(particle.idx);
        if (index !== -1) VotesLanded.splice(index, 1);
      };
    }


    // update velocity, rotation and position
    particle.velocity.y += gravity2;                         // apply gravity to y
    (particle.position).addInPlace(particle.velocity);      // update particle new position
    sign2 = (particle.idx % 2 == 0) ? 1 : -1;                // rotation sign and then new value
    particle.rotation.z += 0.1 * sign2;
    particle.rotation.x += 0.05 * sign2;
    particle.rotation.y += 0.008 * sign2;

    if (mouthOpening > 0.85 && GLOB_face) {
      particle.isVisible = true;
    } else {
      if (GLOB_face) {
        this.recycleParticle(particle);
        particle.isVisible = false;
      }
    }


  };

  // init all particle values
  SPS2.initParticles();
  SPS2.setParticles();

  SPS2.computeParticleRotation = false;
  SPS2.computeParticleColor = false;
  SPS2.computeParticleTexture = false;



  // Create and load the sound async
  //var voteOutSound = new BABYLON.Sound("voteOut", "sounds/voteOut.wav", scene, null, { loop: false, autoplay: false });



  // The first parameter can be used to specify which mesh to import. Here we import all meshes

  //https://www.thingiverse.com/thing:1684507/files
  //Low Poly Donald Trump by digitalcoleman July 21, 2016
  BABYLON.SceneLoader.ImportMesh("", "meshes/", "Trump_lowPoly_print.stl", BABYLONSCENE, function (newMeshes) {
      // Set the target of the camera to the first imported mesh
      newMeshes[0].scaling.x = 3;
      newMeshes[0].scaling.y = 3;
      newMeshes[0].scaling.z = 3;

      newMeshes[0].position.x = 0.4;//1;
      newMeshes[0].position.y = -0.40;
      newMeshes[0].position.z = 1;//4;

      newMeshes[0].rotation.x = 330 * (Math.PI/180);
      newMeshes[0].rotation.y = 128 * (Math.PI/180);
      newMeshes[0].rotation.z = 0;

      //explude Drumpf from the light that makes his color all blown out overexposed
      pl.excludedMeshes.push(newMeshes[0]);
      DRUMPF = newMeshes[0];

      //AntiDrumpf vote registered colors
      var drumpfMaterial = new BABYLON.StandardMaterial("material", BABYLONSCENE);
      //yellow-orange
      drumpfStartColor = new BABYLON.Color3(255/255,165/155,0);

      drumpfMaterial.diffuseColor = drumpfStartColor;

      DRUMPF.material = drumpfMaterial;

      var stuff = 1 - 2*Math.random();
      DRUMPF.position.x = 0.4 * Math.sin(stuff);

      DRUMPF.rotation.y = (36 * Math.sin(stuff) * -1 + 178) * (Math.PI/180);



      InstaDeathDelay = true; //this is to help a weird bug where insta death happened when SPS2 particle (vote particles) is initalized and setup. It diminished the political head right away, so maybe it can just be delayed until the head is fully loaded.
  });

  //Thanos effect variables
  var time = 0;
  var rate = 0;//0.01;

  //https://stackoverflow.com/questions/8279729/calculate-fps-in-canvas-using-requestanimationframe
  var lastCalledTime;
  var fps;
  var averageFPS = 0;

  function requestAnimFrame() {

    if(!lastCalledTime) {
       lastCalledTime = performance.now();
       fps = 0;
       return;
    }
    var delta = (performance.now() - lastCalledTime)/1000;



    lastCalledTime = performance.now();
    fps = 1/delta;

    averageFPS = (averageFPS + fps)/2;

    var manualAnimRatio = standardSpeed/averageFPS; //standardSpeed globalz is what I get on my computer so that's my base. Stupid, I know. But i dont know how else to do it https://forum.babylonjs.com/t/ar-game-mechanics-across-devices/10296/8
    //console.log(averageFPS+"    "+manualAnimRatio);
    return manualAnimRatio;//parseInt(averageFPS);
  }



  BABYLONSCENE.registerBeforeRender(function() {
    //console.log(requestAnimFrame())//BABYLONSCENE.getEngine().getDeltaTime())

    //performance based particle speed tweak
    var ratty = requestAnimFrame();
    if (ratty > 0.2 && ratty < 5) {
      //speed = ref_speed*ratty;
      speed2 = ref_speed2*ratty;
    }


    // animation of Drumpf's head which escalates as more votes land (like a boss)
    if (DRUMPF != null && GameState != "lost") { //Animate drupmf's head

      if (VoteLoad > DRUMPFVoteLoadAnimationThreshold && GameState != "stop") {
        DRUMPF.position.x = 0.4 * Math.sin(k);
        var rotationBounds = [142, 214]; //best looking rotation angle bounds
        DRUMPF.rotation.y = ((rotationBounds[0] + (rotationBounds[1] - rotationBounds[0])/2) + ((rotationBounds[1] - rotationBounds[0])/2) * Math.cos(k)) * (Math.PI/180);
        //142 214

        DRUMPF.rotation.y = (36 * Math.sin(k) * -1 + 178) * (Math.PI/180);

      }


      if (VotesLanded.length > 0) {
        DRUMPF.scaling.x = 2.5+0.5*Math.random();
        DRUMPF.scaling.y = 2.5+0.5*Math.random();
        DRUMPF.scaling.z = 2.5+0.5*Math.random();

      } else {
        if (GameState != "restart") DRUMPF.scaling.set(3,3,3);
      }

    }
    // lost state animation
    if (DRUMPF != null && GameState == "lost" && GameState != "stop") {

      GameState = "animatingEnd";
      if (SPS != null) SPS.dispose();
      SPS = null;

      if (SPS2 != null) SPS2.dispose();
      SPS2 = null;
      //DRUMPF multiplies!
      if (DrumpfMultiplies == null) {
        DrumpfMultiplies = true;


        if (GameState == "animatingEnd") {
          var i= 0;
          var ii = 0;
          DRUMPF.position.x = .3;
          var SpawnDrumpfsInterval = setInterval(function(){

            if (ii < 4) {
              if (i < 3) {
                var newInstance = DRUMPF.createInstance("i"+i);
                newInstance.position.y = DRUMPF.position.y + i/3.1;
                i+=1;
              }
            }
            if (i == 3) {
              ii+=1;
              i = 0;
              DRUMPF.position.x -= .29;
            }
            if (ii == 4) {
              clearInterval(SpawnDrumpfsInterval);

              GameState = "animatedEnd";
              ShowRestartGUI();
            }
          }, 100)

        }



      }

    }



    k += kInterval;


    //for Thanos effect
    time+=BABYLONSCENE.getAnimationRatio()*rate;





    if (SPS != null) SPS.setParticles();


    if (SPS2 != null) SPS2.setParticles();


  });



  textBack = BABYLON.Mesh.CreateGround("textBack1", 26, 26, 2, BABYLONSCENE);
  textBack.rotation = new BABYLON.Vector3(0, 0, 0);
  textBack.position = new BABYLON.Vector3(0, 0, 0);

  textBack.position.x = 0; textBack.position.y = 6.5; textBack.position.z = 20;
  textBack.rotation.x = 270 * (Math.PI/180); textBack.rotation.y = 180 * (Math.PI/180); textBack.rotation.z = 0;

  //Line spacing in pixels with pointer enter/out observable
  advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(textBack, 1024, 1024);



    ViralLoadBarOutline = new BABYLON.GUI.Rectangle("ViralLoadBarOutline");
    ViralLoadBarOutline.width = "400px";
    ViralLoadBarOutline.height = "20px";
    ViralLoadBarOutline.thickness = 4;
    ViralLoadBarOutline.cornerRadius = 10;
    ViralLoadBarOutline.color = "#cccccc";//"#005b75";
    ViralLoadBarOutline.top = "7px";

    ViralLoadBarOutlineStartColor = BABYLON.Color3.FromHexString(ViralLoadBarOutline.color);


    advancedTexture.addControl(ViralLoadBarOutline);

    //Viral Load lifebar

    ViralLoadBar = new BABYLON.GUI.Rectangle("ViralLoadBar");
    ViralLoadBar.background = "#0cfadb";

    var ViralLoadBarStartColor = BABYLON.Color3.FromHexString(ViralLoadBar.background);

    ViralLoadBar.width = "400px";
    ViralLoadBar.height = "20px";
    ViralLoadBar.thickness = 4;
    ViralLoadBar.cornerRadius = 10;
    ViralLoadBar.color = "#271101";//"#005b75";
    //ViralLoadBar.left = "-500px";
    ViralLoadBar.top = "7px";
    //ViralLoadBar.horizontalAlignment = 0;

    advancedTexture.addControl(ViralLoadBar);


    // Adding image
    var viralIcon = new BABYLON.GUI.Image("viralIcon", "textures/Covid19-2.png");
    viralIcon.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
    viralIcon.width = "5%";
    viralIcon.top ="5px";
    viralIcon.left = "-200px";

    //viralIcon.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    advancedTexture.addControl(viralIcon);

    CreateVoteLoadBar();

//BABYLONSCENE.debugLayer.show();

  // ADD A LIGHT:
  const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 1, 0), BABYLONSCENE);
  pointLight.intensity = 0.5;

  // init the video texture:
  BABYLONVIDEOTEXTURE = new BABYLON.RawTexture(new Uint8Array([255,0,0,0]),1,1,spec.GL.RGBA,BABYLONSCENE);
  BABYLONVIDEOTEXTURE._texture._webGLTexture = spec.videoTexture;

  // CREATE THE VIDEO BACKGROUND
  // for custom material see https://gamedevelopment.tutsplus.com/tutorials/building-shaders-with-babylonjs-and-webgl-theory-and-examples--cms-24146
  const videoMaterial = new BABYLON.ShaderMaterial(
    'videoMat',
    BABYLONSCENE,
    {
      vertexElement: "videoMatVertexShaderCode", // see index.html for shader source
      fragmentElement: "videoMatFragmentShaderCode"
    },
    {
      attributes: ["position"],
      uniforms: ["videoTransformMat2"]
      ,needAlphaBlending: false
    }
  );
  videoMaterial.disableDepthWrite = true;
  videoMaterial.setTexture("samplerVideo", BABYLONVIDEOTEXTURE);
  videoMaterial.setMatrix2x2("videoTransformMat2", spec.videoTransformMat2);

  // for custom mesh see https://babylonjsguide.github.io/advanced/Custom
  const videoMesh=new BABYLON.Mesh("brokenRed", BABYLONSCENE);
  videoMesh.alwaysSelectAsActiveMesh = true; // disable frustum culling
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = [-1,-1,1,   1,-1,1,   1,1,1,   -1,1,1]; // z is set to 1 (zfar)
  vertexData.indices = [0,1,2, 0,2,3];
  vertexData.applyToMesh(videoMesh);
  videoMesh.material=videoMaterial;

  // CREATE THE CAMERA:
  BABYLONCAMERA = new BABYLON.Camera('camera', new BABYLON.Vector3(0,0,0), BABYLONSCENE);
  BABYLONSCENE.setActiveCameraByName('camera');
  BABYLONCAMERA.fov = SETTINGS.cameraFOV * Math.PI/180;
  BABYLONCAMERA.minZ = 0.1;
  BABYLONCAMERA.maxZ = 100;
  ASPECTRATIO = BABYLONENGINE.getAspectRatio(BABYLONCAMERA);



    //Thanos effect

    var postEffect = new BABYLON.PostProcess("thanosEffect", "thanosEffect", ["time", "screenSize"], ["noiseRef0", "noiseRef1"], 1, BABYLONCAMERA);

    var noiseTexture0 = new BABYLON.Texture('./textures/grass.png', BABYLONSCENE);
    var noiseTexture1 = new BABYLON.Texture('./textures/ground.jpg', BABYLONSCENE);

    postEffect.onApply = function (effect) {
        effect.setVector2("screenSize", new BABYLON.Vector2(postEffect.width, postEffect.height));
        effect.setFloat('time', time); //this is the problematic line
        effect.setTexture('noiseRef0', noiseTexture0);
        effect.setTexture('noiseRef1', noiseTexture1);
    };
    //end Thanos effect

} //end init_babylonScene()

function premain(){
  if (localStorage.getItem("retry") == "true") {
    main();
    return;
  }
  //main();
  document.getElementById("launchButton").style.visibility='visible';

}
// entry point:
function main(){

  var elem = document.querySelector('#disclaimer');
  elem.parentNode.removeChild(elem);

  JEELIZFACEFILTER.init({
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: 'neuralNets/', //for local use ../../../neuralNets/   // root of NN_DEFAULT.json file
    callbackReady: function(errCode, spec){
      if (errCode){
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO  JEELIZFACEFILTER IS READY');
      init_babylonScene(spec);
    },

    // called at each render iteration (drawing loop):
    callbackTrack: function(detectState){
      if (ISDETECTED && detectState.detected<SETTINGS.detectionThreshold-SETTINGS.detectionHysteresis){
        // DETECTION LOST
        detect_callback(false);
        ISDETECTED = false;
      } else if (!ISDETECTED && detectState.detected>SETTINGS.detectionThreshold+SETTINGS.detectionHysteresis){
        // FACE DETECTED
        detect_callback(true);
        ISDETECTED = true;
      }

      if (ISDETECTED){
        // move the cube in order to fit the head:
        const tanFOV = Math.tan(ASPECTRATIO*BABYLONCAMERA.fov/2); // tan(FOV/2), in radians
        const W = detectState.s;  // relative width of the detection window (1-> whole width of the detection window)
        const D = 1 / (2*W*tanFOV); // distance between the front face of the cube and the camera

        // coords in 2D of the center of the detection window in the viewport:
        const xv = detectState.x;
        const yv = detectState.y;

        // coords in 3D of the center of the cube (in the view coordinates system):
        var z=-D-0.5;   // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
        var x=xv*D*tanFOV;
        var y=yv*D*tanFOV/ASPECTRATIO;

        // move and rotate the cube:
        BABYLONFACEOBJ3D.position.set(x,y+SETTINGS.pivotOffsetYZ[0],-z-SETTINGS.pivotOffsetYZ[1]);
        BABYLONFACEOBJ3D.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);//"XYZ" rotation order;

        // mouth opening:
        mouthOpening = detectState.expressions[0];
        mouthOpening = smoothStep(0.35, 0.7, mouthOpening);
        JAWMESH.position.y = -(0.5+0.15+0.01+0.7*mouthOpening*0.5);

        MouthMesh.scaling.y = mouthOpening;


        da_sphere.position.x = x;
        da_sphere.position.y = y+SETTINGS.pivotOffsetYZ[0];
        da_sphere.position.z = -z-SETTINGS.pivotOffsetYZ[1];
        da_sphere.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);//


        if (sphereDrumpf != null && DRUMPF != null) {
          sphereDrumpf.position.set(DRUMPF.position.x-.1, DRUMPF.position.y+.15, DRUMPF.position.z);
        }

      } else {
      }

      var maxViralLoad = 450; //Stay under the max to survive
      var truncatedViralLoad = trueViralLoad.length > maxViralLoad ? maxViralLoad : trueViralLoad.length;

      if (ViralLoadBar != null && ViralLoadBarOutline != null) {

        var ViralLoadOutlineEndColor = BABYLON.Color3.FromHexString("#ea090b");
        ViralLoadBarOutline.color = BABYLON.Color3.Lerp(ViralLoadBarOutlineStartColor, ViralLoadOutlineEndColor, truncatedViralLoad/maxViralLoad).toHexString();

        ViralLoadBar.width = mapRange([0,maxViralLoad],[0, 400],truncatedViralLoad) + "px";

        ViralLoadBar.left = -1*(parseInt(ViralLoadBarOutline.width) - parseInt(ViralLoadBar.width))/2;
      }


      var truncatedVoteLoad = VoteLoad > maxVoteLoad ? maxVoteLoad : VoteLoad;

      if (VoteLoadBar != null && VoteLoadBarOutline != null) {

        var VoteLoadOutlineEndColor = BABYLON.Color3.FromHexString("#32CD32");
        VoteLoadBarOutline.color = BABYLON.Color3.Lerp(VoteLoadBarOutlineStartColor, VoteLoadOutlineEndColor, truncatedVoteLoad/maxVoteLoad).toHexString();

        //Why is the minimum range 10? Because for some reason VoteLoad starts off at 10, maybe due to instant collisions with DRUMPF on creation? Instead of looking into it I'm just gonna assume 10 is the minimum
        VoteLoadBar.width = mapRange([10,maxVoteLoad],[0, 400],truncatedVoteLoad) + "px";

        VoteLoadBar.left = -1*(parseInt(VoteLoadBarOutline.width) - parseInt(VoteLoadBar.width))/2;
      }

      if (trueViralLoad.length >= maxViralLoad && GameState != "lost" && GameState != "stop") {

        GameState = "lost";

      }

      // reinitialize the state of BABYLON.JS because JEEFACEFILTER have changed stuffs:
      BABYLONENGINE.wipeCaches(true);

      // trigger the render of the BABYLON.JS SCENE:
      BABYLONSCENE.render();

      BABYLONENGINE.wipeCaches();
    } //end callbackTrack()
  }); //end JEEFACEFILTERAPI.init call
} //end main()


function CreateVoteLoadBar() {

  VoteLoadBarOutline = new BABYLON.GUI.Rectangle("VoteLoadBarOutline");
  VoteLoadBarOutline.width = "400px";
  VoteLoadBarOutline.height = "20px";
  VoteLoadBarOutline.thickness = 4;
  VoteLoadBarOutline.cornerRadius = 10;
  VoteLoadBarOutline.color = "#cccccc";//"#005b75";
  VoteLoadBarOutline.top = "40px";

  VoteLoadBarOutlineStartColor = BABYLON.Color3.FromHexString(VoteLoadBarOutline.color);

  advancedTexture.addControl(VoteLoadBarOutline);

  //Viral Load lifebar

  VoteLoadBar = new BABYLON.GUI.Rectangle("VoteLoadBar");
  VoteLoadBar.background = "#fc01b2";

  var VoteLoadBarStartColor = BABYLON.Color3.FromHexString(VoteLoadBar.background);

  VoteLoadBar.width = "400px";
  VoteLoadBar.height = "20px";
  VoteLoadBar.thickness = 4;
  VoteLoadBar.cornerRadius = 10;
  VoteLoadBar.color = "#271101";//"#005b75";
  //ViralLoadBar.left = "-500px";
  VoteLoadBar.top = "40px";
  //ViralLoadBar.horizontalAlignment = 0;

  advancedTexture.addControl(VoteLoadBar);


  // Adding image
  var voteIcon = new BABYLON.GUI.Image("viralIcon", "textures/viralVote.png");
  voteIcon.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
  voteIcon.width = "5%";
  voteIcon.top ="40px";
  voteIcon.left = "-200px";

  //viralIcon.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  advancedTexture.addControl(voteIcon);

}

var ShowRestartGUI = function() {
          if (GameState == "animatedEnd") {
            /*
            var rectangle = new BABYLON.GUI.Rectangle("rect");
            rectangle.background = "#005b75";
            //rectangle.color = "yellow";

            rectangle.width = "600px";
            rectangle.height = "300px";
            rectangle.thickness = 0;
            //rectangle.top = "250px";

            advancedTexture.addControl(rectangle);
            */

            //Viral Load Text
            text1 = new BABYLON.GUI.TextBlock("text1");
            text1.width = "500px";
            text1.fontFamily = 'vag_roundedregular';
            text1.textWrapping = true;
            text1.lineSpacing = "0px";

            text1.text = "Open mouth to vote against the target. Avoid viral buildup!";
            text1.color = "#0cfadb";
            text1.fontSize = "35px";

            text1.top = "400px";
            //advancedTexture.addControl(text1);

            var replayText =  "textures/replaytext.png";
            var replay = BABYLON.GUI.Button.CreateImageWithCenterTextButton("replay", "", replayText);
            replay.top =  "38%";

            replay.left = "0px";
            replay.width = "500px";
            replay.height = "90px";
            //replay.cornerRadius = 20;
            replay.thickness = 0;
            //replay.children[0].color = "#0cfadb";
            //replay.children[0].fontSize = 50;
            //replay.children[0].fontFamily = 'vag_roundedregular';
            //replay.children[0].top = '-20px';

          //replay.children[0].rotation.x = 270 * (Math.PI/180); button.children[0].rotation.y = 180 * (Math.PI/180); button.children[0].rotation.z = 0;
            //replay.color = "#FF7979";
            //replay.background = "#FF6600";

            console.log("Try Again GUI fully loaded");


            advancedTexture.addControl(replay);


          } else {
            advancedTexture.dispose();
          }

          if (GameState != "stop") {
            if (GameState != "animatedEnd" && GameState != "stop") GameState = "won-restart";

            var gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("myUI");

            var buttext = GameState == "won-restart" ? "textures/winagain.png" : "textures/tryagain.png";
            var button = BABYLON.GUI.Button.CreateImageWithCenterTextButton("button", "", buttext);
            button.top = GameState == "won-restart" ? "30%" : "0px";
            GameState = "stop";
            button.left = "0px";
            button.width = "300px";
            button.height = "100px";
            button.cornerRadius = 20;
            button.thickness = 4;
            button.children[0].color = "#0cfadb";
            button.children[0].fontSize = 50;
            button.children[0].fontFamily = 'vag_roundedregular';
            //button.children[0].top = '-20px';

          //button.children[0].rotation.x = 270 * (Math.PI/180); button.children[0].rotation.y = 180 * (Math.PI/180); button.children[0].rotation.z = 0;
            button.color = "#FF7979";
            button.background = "#EB4D4B";

            button.onPointerClickObservable.add(function () {
              localStorage.setItem("retry", "true");
              location.reload();
              //window.location = "https://caitlinandmisha.com/viralvote?retry=true"
            });
            if (get_url_params("touchless") == "true") setTimeout(function(){location.reload();}, 7000);

            gui.addControl(button);

            textBack.renderingGroupId = 1;



          }

}
