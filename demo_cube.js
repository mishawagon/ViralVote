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
let BABYLONVIDEOTEXTURE = null, BABYLONENGINE = null, BABYLONFACEOBJ3D = null, BABYLONFACEOBJ3DPIVOTED = null, BABYLONSCENE = null, BABYLONCAMERA = null, ASPECTRATIO = -1, JAWMESH = null, ParticleFountain = null, ParticleSystemGlobal = null;
let ISDETECTED = false;


// analoguous to GLSL smoothStep function:
function smoothStep(edge0, edge1, x){
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// callback launched if a face is detected or lost:
function detect_callback(isDetected){
  if (isDetected){
    console.log('INFO in detect_callback(): DETECTED');
  } else {
    console.log('INFO in detect_callback(): LOST');
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK:
function init_babylonScene(spec){
  // INIT THE BABYLON.JS context:
  BABYLONENGINE = new BABYLON.Engine(spec.GL);

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
  // Fountain object
  //var fountain = BABYLON.Mesh.CreateBox("foutain", 1.0, scene);
  ParticleFountain = BABYLON.Mesh.CreateBox("foutain", 1.0, scene);
  ParticleFountain.position.set(0,2,5);

  const cubeMaterial2 = new BABYLON.StandardMaterial("material", BABYLONSCENE);
  cubeMaterial2.emissiveColor = new BABYLON.Color3(0, 0.28, 0.36);
  //misha turning off cubes
  cubeMaterial2.alpha = 0.0;


  ParticleFountain.material = cubeMaterial2;
  var fountain = ParticleFountain;



    // Create a particle system
  //  var particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);

    //misha gpu particle option
    var particleSystem;

    //console.log(BABYLON.GPUParticleSystem.IsSupported)
    if (BABYLON.GPUParticleSystem.IsSupported) {
      particleSystem = new BABYLON.GPUParticleSystem("particles", { capacity:1000000 }, scene);
      particleSystem.activeParticleCount = 20000;

    } else {
        var particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
    }


  //Texture of each particle
  particleSystem.particleTexture = new BABYLON.Texture("textures/flare_vert.png", scene);

  // Where the particles come from
  particleSystem.emitter = fountain; // the starting object, the emitter
  particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, 0); // Starting all from
  particleSystem.maxEmitBox = new BABYLON.Vector3(1, 0, 0); // To...

  // Colors of all particles
  particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
  particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
  particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

  // Size of each particle (random between...
  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.5;

  // Life time of each particle (random between...
  particleSystem.minLifeTime = 0.3;
  particleSystem.maxLifeTime = 1.5;

  // Emission rate
  particleSystem.emitRate = 15000;

  // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
  particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

  // Set the gravity of all particles
  particleSystem.gravity = new BABYLON.Vector3(0, -800, 0);

  // Direction of each particle after it has been emitted
  particleSystem.direction1 = new BABYLON.Vector3(-1, 0, -5);
  particleSystem.direction2 = new BABYLON.Vector3(1, 0, -5);

  // Angular speed, in radians
  particleSystem.minAngularSpeed = 0;//-Math.PI*6;
  particleSystem.maxAngularSpeed = 0;//Math.PI*6;

  particleSystem.minInitialRotation = 0;
  particleSystem.maxInitialRotation = 0;


  particleSystem.addDragGradient(0, 0.5, 3.1);

  // Speed
  particleSystem.minEmitPower = 8;
  particleSystem.maxEmitPower = 20;
  particleSystem.updateSpeed = 0.01;

  // Start the particle system
  particleSystem.start();
  ParticleSystemGlobal = particleSystem;

  /*
  // Fountain's animation
  var keys = [];
  var animation = new BABYLON.Animation("animation", "rotation.x", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT,
  BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  // At the animation key 0, the value of scaling is "1"
  keys.push({
      frame: 0,
      value: 0
  });

  // At the animation key 50, the value of scaling is "0.2"
  keys.push({
      frame: 50,
      value: Math.PI
  });

  // At the animation key 100, the value of scaling is "1"
  keys.push({
      frame: 100,
      value: 0
  });

  // Launch animation
  animation.setKeys(keys);
  fountain.animations.push(animation);
  scene.beginAnimation(fountain, 0, 100, true);
  */
  // end misha addition

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

        //misha add affect on particle system
        //ParticleFountain
        //ParticleFountain.position.set(x,y+SETTINGS.pivotOffsetYZ[0],-z-SETTINGS.pivotOffsetYZ[1]);
        //misha offset fountain vertically
        //var FountainOffsetZ = 0;
        ParticleFountain.position.set(x,3,7);


        ParticleFountain.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, -detectState.ry, detectState.rz);//"XYZ" rotation order;

        ParticleSystemGlobal.minInitialRotation = detectState.rz;
        ParticleSystemGlobal.maxInitialRotation = detectState.rz;

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
