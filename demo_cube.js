"use strict";


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
let BABYLONVIDEOTEXTURE = null, BABYLONENGINE = null, BABYLONFACEOBJ3D = null, BABYLONFACEOBJ3DPIVOTED = null, BABYLONSCENE = null, BABYLONCAMERA = null, ASPECTRATIO = -1, JAWMESH = null, da_sphere = null;
let ISDETECTED = false;


// analoguous to GLSL smoothStep function:
function smoothStep(edge0, edge1, x){
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// callback launched if a face is detected or lost:
function detect_callback(isDetected){
  if (isDetected){
    //console.log('INFO in detect_callback(): DETECTED');
  } else {
    //console.log('INFO in detect_callback(): LOST');
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK:
function init_babylonScene(spec){
  // INIT THE BABYLON.JS context:
  var canvas = document.getElementById("jeeFaceFilterCanvas");

  BABYLONENGINE = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

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
  //misha turning off cubes
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

  // misha adds particle system from Babylon.js playground particle system example.
  var scene = BABYLONSCENE; //need to set a scene for brought-in particle system example.

  scene.clearColor = new BABYLON.Color3( .2, .3, .6);
  /*
 //camera already made later, and so is light
  var camera = new BABYLON.ArcRotateCamera("camera1",  0, 0, 0, new BABYLON.Vector3(0, 0, -0), scene);
  camera.setPosition(new BABYLON.Vector3(0, 0, 0));
  camera.attachControl(canvas, true);
  */
  var pl = new BABYLON.PointLight("pl", new BABYLON.Vector3(0, 0, 0), scene);
  pl.diffuse = new BABYLON.Color3(1, 1, 1);
  pl.specular = new BABYLON.Color3(1, 1, 0.8);
  pl.intensity = 0.95;
  pl.position.x = 0;
  pl.position.y = 0;
  pl.position.z = 0;
  //pl.position = camera.position;



  var sphereRadius = .55;
  var ground = BABYLON.MeshBuilder.CreateGround("gd", {width: 10.0, height: 10.0}, scene);
  var sphere = BABYLON.Mesh.CreateSphere("sphere", 10, sphereRadius * 2.0, scene);

  sphere.getBoundingInfo().boundingSphere.scale(0.4);

  da_sphere = sphere;

  var box = BABYLON.MeshBuilder.CreateBox("b", {size: 0.05}, scene);
  var matBox = new BABYLON.StandardMaterial("mb", scene);
  matBox.emissiveColor = BABYLON.Color3.Green();
  box.material = matBox;

  var matSphere = new BABYLON.StandardMaterial("ms", scene);
  var matGround = new BABYLON.StandardMaterial("mg", scene);
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
  ground.position.y = -6;
  ground.position.z = 10;

  ground.rotation.x = 290 * (Math.PI /180);

  // Particle system
  var particleNb = 2000;
  var SPS = new BABYLON.SolidParticleSystem('SPS', scene, {particleIntersection: true, boundingSphereOnly: true, bSphereRadiusFactor: .2, useModelMaterial: true});

  SPS.addShape(box, particleNb);
  box.dispose();
  var mesh = SPS.buildMesh();
  SPS.isAlwaysVisible = true;



  // shared variables
  var speed = .05;                  // particle max speed
  var cone = 0.9;                   // emitter aperture
  var gravity = -speed / 100;       // gravity
  var restitution = 0;           // energy restitution
  var k = 0.0;
  var sign = 1;
  var tmpPos = BABYLON.Vector3.Zero();          // current particle world position
  var tmpNormal = BABYLON.Vector3.Zero();       // current sphere normal on intersection point
  var tmpDot = 0.0;                             // current dot product


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

    particle.rotation.x = Math.random() * Math.PI;
    particle.rotation.y = Math.random() * Math.PI;
    particle.rotation.z = Math.random() * Math.PI;

    particle.color.r = 0.0;
    particle.color.g = 1.0;
    particle.color.b = 0.0;
    particle.color.a = 1.0;
  };


  // particle behavior
  SPS.updateParticle = function(particle) {

    // recycle if touched the ground
    if ((particle.position.y + mesh.position.y) < ground.position.y) {
      this.recycleParticle(particle);
    }

    // intersection
    if (particle.intersectsMesh(sphere)) {
        particle.position.addToRef(mesh.position, tmpPos);                  // particle World position
        tmpPos.subtractToRef(sphere.position, tmpNormal);                   // normal to the sphere
        tmpNormal.normalize();                                              // normalize the sphere normal
        tmpDot = BABYLON.Vector3.Dot(particle.velocity, tmpNormal);            // dot product (velocity, normal)
        // bounce result computation
        particle.velocity.x = -particle.velocity.x + 2.0 * tmpDot * tmpNormal.x;
        particle.velocity.y = -particle.velocity.y + 2.0 * tmpDot * tmpNormal.y;
        particle.velocity.z = -particle.velocity.z + 2.0 * tmpDot * tmpNormal.z;
        particle.velocity.scaleInPlace(restitution);                      // aply restitution

/* makest stuff jittery but bounce works better */
        //particle.rotation.x *= -1.0;
         //particle.rotation.y *= -1.0;
         //particle.rotation.z *= -1.0;



        particle.color.r = 0.6;
        particle.color.b = 0.8;
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


  //scene.debugLayer.show();
  // animation
  scene.registerBeforeRender(function() {
    SPS.setParticles();
    //sphere.position.x = 0;//20.0 * Math.sin(k);
    //sphere.position.z = 6;//10.0 * Math.sin(k * 6.0);
    //sphere.position.y = 0;//5.0 * Math.sin(k * 10) + sphereAltitude;
    k += 0.01;
  });

  //scene.debugLayer.show();

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
      vertexElement: "videoMatVertexShaderCode", //cf index.html for shader source
      fragmentElement: "videoMatFragmentShaderCode"
    },
    {
      attributes: ["position"],
      uniforms: []
      ,needAlphaBlending: false
    }
  );
  videoMaterial.disableDepthWrite = true;
  videoMaterial.setTexture("samplerVideo", BABYLONVIDEOTEXTURE);

  // for custom mesh see https://babylonjsguide.github.io/advanced/Custom
  const videoMesh=new BABYLON.Mesh("custom", BABYLONSCENE);
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
} //end init_babylonScene()

// entry point:
function main(){
  JEEFACEFILTERAPI.init({
    canvasId: 'jeeFaceFilterCanvas',
    NNCpath: '../../../dist/', // root of NNC.json file
    callbackReady: function(errCode, spec){
      if (errCode){
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO : JEEFACEFILTERAPI IS READY');
      init_babylonScene(spec);
    }, //end callbackReady()

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
        let mouthOpening = detectState.expressions[0];
        mouthOpening = smoothStep(0.35, 0.7, mouthOpening);
        JAWMESH.position.y = -(0.5+0.15+0.01+0.7*mouthOpening*0.5);




            da_sphere.position.x = x;
            da_sphere.position.y = y+SETTINGS.pivotOffsetYZ[0];
            da_sphere.position.z = -z-SETTINGS.pivotOffsetYZ[1];
            da_sphere.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);//


            //console.log("x "+x+" y "+(y+SETTINGS.pivotOffsetYZ[0])+" z "+(-z-SETTINGS.pivotOffsetYZ[1]));

        //misha add affect on particle system
        //ParticleFountain
        //ParticleFountain.position.set(x,y+SETTINGS.pivotOffsetYZ[0],-z-SETTINGS.pivotOffsetYZ[1]);
        //misha offset fountain vertically
        //var FountainOffsetZ = 0;
        //ParticleFountain.position.set(x,3,7);


        //ParticleFountain.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);//"XYZ" rotation order;

        //ParticleSystemGlobal.minInitialRotation = detectState.rz;
        //ParticleSystemGlobal.maxInitialRotation = detectState.rz;

        //var orientation = new BABYLON.Vector3(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);

        //console.log(orientation);

        //ParticleSystemGlobal.direction1 = orientation;

      }

      // reinitialize the state of BABYLON.JS because JEEFACEFILTER have changed stuffs:
      BABYLONENGINE.wipeCaches(true);

      // trigger the render of the BABYLON.JS SCENE:
      BABYLONSCENE.render();

      BABYLONENGINE.wipeCaches();
    } //end callbackTrack()
  }); //end JEEFACEFILTERAPI.init call
} //end main()
