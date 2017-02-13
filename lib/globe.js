// Realtime WebGL globe
// Copyright (c) 2015 Mike van Rossum

/**
 * Realtime Globe is a WebGL based earth globe that
 * makes it super simple to add shapes in realtime
 * on specific lat/lon positions on earth.
 *
 * @class Globe
 * @param {HTMLElement} container
 * @param {Object} urls - URLs of earth images
 * @param {String} urls.earth
 * @param {String|undefined} urls.bump (optional)
 * @param {String|undefined} urls.specular (optional)
 */
var Globe = function Globe(container, urls) {
  var PI = Math.PI;
  var PI_HALF = PI / 2;

  // Three.js objects
  var camera;
  var scene;
  var light;
  var renderer;

  var earthGeometry;
  var earthPosition;
  var earth;
  var mapImage = {};

  // camera's distance from center (and thus the globe)
  var distanceTarget = 900;
  var distance = distanceTarget;

  // camera's position
  var rotation = { x: 2, y: 1 };
  var target = { x: 2, y: 1 };

  // holds currently levitating blocks
  var levitatingBlocks = [];
  // holds all block references
  var blocks = [];

  // What gets exposed by calling:
  // 
  //    var globe = [new] Globe(div, urls);
  // 
  // attach public functions to this object
  var api = {};

  //添加标签的变量定义
  var canvas1,
      context1,
      texture1,
      sprite1,
      INTERSECTED,
      projector;

  /**
   * Initializes the globe
   *
   */
  api.init = function() {
    setSize();

    // Camera
    camera = new THREE.PerspectiveCamera(30, w / h, 1, 1000);
    camera.position.z = distance;

    // Scene
    scene = new THREE.Scene();

    // Earth geom, used for earth & atmosphere
    earthGeometry = new THREE.SphereGeometry(200, 64, 64);

    // Light, reposition close to camera
    light = createMesh.directionalLight();

    // we use this to correctly position camera and blocks
    earth = createMesh.earth(urls);
    earthPosition = earth.position;

    // Add meshes to scene
    scene.add(earth);
    scene.add(createMesh.atmosphere());

    // Add lights to scene
    scene.add(new THREE.AmbientLight(0x656565));
    scene.add(light);    

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(w, h);

    // Add scene to DOM
    renderer.domElement.style.position = 'absolute';
    container.appendChild(renderer.domElement);

    // DOM event handlers
    container.addEventListener('mousedown', handle.drag.start, false);
    window.addEventListener('resize', handle.resize, false);

    // Scroll for Chrome
    window.addEventListener('mousewheel', handle.scroll, false);
    // Scroll for Firefox
    window.addEventListener('DOMMouseScroll', handle.scroll, false);





    /////// draw text on canvas /////////
    // initialize object to perform world/screen calculations
    // projector = new THREE.Projector();

    // // create a canvas element
    // canvas1 = document.createElement('canvas');
    // context1 = canvas1.getContext('2d');
    // context1.font = "Bold 20px Arial";
    // context1.fillStyle = "rgba(0,0,0,0.95)";
    // context1.fillText('Hello, world!', 0, 20);
      
    // // canvas contents will be used for a texture
    // texture1 = new THREE.Texture(canvas1) 
    // texture1.needsUpdate = true;
    
    // ////////////////////////////////////////
    
    // var spriteMaterial = new THREE.SpriteMaterial( { map: texture1, useScreenCoordinates: true, alignment: 'topLeft' } );
    
    // sprite1 = new THREE.Sprite( spriteMaterial );
    // sprite1.scale.set(200,100,1.0);
    // sprite1.position.set( 50, 50, 0 );
    // scene.add( sprite1 ); 
    //////////////////////////////////////////


    


    // Bootstrap render
    animate();




    return this;
  }

  var setSize = function() {
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;
  }

  var createMesh = {

    // @param urls Object URLs of images
    // 
    //  {
    //    earth: String URL
    //    bump: Sting URL [optional]
    //    specular: String URL [optional]
    //  }
    //  
    // See
    // @link http://learningthreejs.com/blog/2013/09/16/how-to-make-the-earth-in-webgl/
    // @link http://learningthreejs.com/data/2013-09-16-how-to-make-the-earth-in-webgl/demo/index.html
    earth: function(urls) {
      if(!urls.earth)
        throw 'No image URL provided for an earth image';

      var material  = new THREE.MeshBasicMaterial();
      // var material  = new THREE.MeshPhongMaterial();

      for(var i in urls.earth){
      	mapImage[i] = THREE.ImageUtils.loadTexture(urls.earth[i]);
      	mapImage[i].name = i;
      }
      
      material.map = mapImage[urls.choose];
      
      if(urls.bump) {
        material.bumpMap = THREE.ImageUtils.loadTexture(urls.bump);
        material.bumpScale = 0.02;
      }

      if(urls.specular) {
        material.specularMap = THREE.ImageUtils.loadTexture(urls.specular);
        material1.specular = new THREE.Color('grey');
      }

      var earth = new THREE.Mesh(earthGeometry, material);

      if (urls.position) {
        earth.position.x = urls.position.x;
        earth.position.y = urls.position.y;
      }


  		earth.material.needsUpdate = true;

      return earth;
    },

    // See
    // @link https://github.com/dataarts/webgl-globe/blob/master/globe/globe.js#L52
    // @link http://bkcore.com/blog/3d/webgl-three-js-animated-selective-glow.html
    // 
    // Currently has some issues, especially when zooming out (distance > 900)
    atmosphere: function() {
      var material = new THREE.ShaderMaterial({
        vertexShader: [
          'varying vec3 vNormal;',
          'void main() {',
            'vNormal = normalize( normalMatrix * normal );',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          '}'
        ].join('\n'),
        fragmentShader: [
          'varying vec3 vNormal;',
          'void main() {',
            'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 7.0 );',
            'gl_FragColor = vec4( 0.7, 1.0, 0.7, 1.0 ) * intensity;',
          '}'
        ].join('\n'),
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: false
      });

      var mesh = new THREE.Mesh(earthGeometry, material);
      mesh.scale.set(1.1, 1.1, 1.1);
      return mesh;
    },

    directionalLight: function() {
      return new THREE.DirectionalLight(0xcccccc, 0.5);
    },


    block: function(color) {
      return new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 1),
        new THREE.MeshBasicMaterial({color: color})
      );
    }

  }

  // Keep track of mouse positions
  var mouse = { x: 0, y: 0 };
  var mouseOnDown = { x: 0, y: 0 };
  var targetOnDown = { x: 0, y: 0 };

  // DOM event handlers
  var handle = {
    scroll: function(e) {
      e.preventDefault();

      // See
      // @link http://www.h3xed.com/programming/javascript-mouse-scroll-wheel-events-in-firefox-and-chrome
      if(e.wheelDelta) {
        // chrome
        var delta = e.wheelDelta * 0.5;
      } else {
        // firefox
        var delta = -e.detail * 15;
      }

      api.zoomRelative(delta);

      return false;
    },

    resize: function(e) {
      setSize();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    },

    // See
    // @link https://github.com/dataarts/webgl-globe/blob/master/globe/globe.js#L273-L334
    drag: {
      start: function(e) {
        e.preventDefault();
        container.addEventListener('mousemove', handle.drag.move, false);
        container.addEventListener('mouseup', handle.drag.end, false);
        container.addEventListener('mouseout', handle.drag.end, false);

        mouseOnDown.x = -e.clientX;
        mouseOnDown.y = e.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';
      },
      move: function(e) {

        if (container.style.cursor === 'move') {
          mouse.x = -e.clientX;
          mouse.y = e.clientY;

          var zoomDamp = distance / 1000;

          target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
          target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

          target.y = target.y > PI_HALF ? PI_HALF : target.y;
          target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
        }else{
          //确定标签的位置
          // update sprite position
          sprite1.position.set( event.clientX, event.clientY - 20, 0 );
          

          // update the mouse variable
          mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
          mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        }
        

        
      },
      end: function(e) {
        // container.removeEventListener('mousemove', handle.drag.move, false);
        container.removeEventListener('mouseup', handle.drag.end, false);
        container.removeEventListener('mouseout', handle.drag.end, false);
        container.style.cursor = 'auto';
      }
    }
  }

  var checkAltituteBoundries = function() {
    // max zoom
    if(distanceTarget < 300)
      distanceTarget = 300;

    // min zoom
    else if(distanceTarget > 900)
      distanceTarget = 900;
  }

  var animate = function() {
    requestAnimationFrame(animate);
    render();
    // updateSprite();
  }

  var render = function() {
    levitateBlocks();

    // UPDATA:更改了系数，使动画效果变慢
    // Rotate towards the target
    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.05;

    // determine camera position
    set3dPosition(camera, {
      x: rotation.x,
      y: rotation.y,
      altitude: distance
    });

    // Determine light position based
    set3dPosition(light, {
      x: rotation.x - 150,
      y: rotation.y - 150,
      altitude: distance
    });

    camera.lookAt(earthPosition);
    renderer.render(scene, camera);
  }


  function updateSprite(){

    // create a Ray with origin at the mouse position
    //   and direction into the scene (camera direction)
    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    // vector.unproject( camera );
    projector.unprojectVector( vector, camera );
    // 
    
    // var dir = vector.sub( camera.position ).normalize();
    // var distance = - camera.position.z / dir.z;
    // var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    // create an array containing all objects in the scene with which the ray intersects
    var intersects = ray.intersectObjects( scene.children );




    // INTERSECTED = the object in the scene currently closest to the camera 
    //    and intersected by the Ray projected from the mouse position  
    
    // if there is one (or more) intersections
    if ( intersects.length > 0 )
    {
      // if the closest object intersected is not the currently stored intersection object
      if ( intersects[ 0 ].object != INTERSECTED ) 
      {
          // restore previous intersection object (if it exists) to its original color
        if ( INTERSECTED ) 
          INTERSECTED.material.color.setHex( INTERSECTED.currentHex );
        // store reference to closest object as current intersection object
        INTERSECTED = intersects[ 0 ].object;
        // store color of closest object (for later restoration)
        INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
        // set a new color for closest object
        INTERSECTED.material.color.setHex( 0xffff00 );
        console.log(intersects[ 0 ].object);
        // update text, if it has a "name" field.
        if ( intersects[ 0 ].object.data )
        {
          console.log(intersects[ 0 ].object.data);
          context1.clearRect(0,0,640,480);
          var message = intersects[ 0 ].object.data;
          var metrics = context1.measureText(message);
          var width = metrics.width;
          context1.fillStyle = "rgba(0,0,0,0.95)"; // black border
          context1.fillRect( 0,0, width+8,20+8);
          context1.fillStyle = "rgba(255,255,255,0.95)"; // white filler
          context1.fillRect( 2,2, width+4,20+4 );
          context1.fillStyle = "rgba(0,0,0,1)"; // text color
          context1.fillText( message.country, 4,20 );
          texture1.needsUpdate = true;
        }
        else
        {
          context1.clearRect(0,0,300,300);
          texture1.needsUpdate = true;
        }
      }
    } 
    else // there are no intersections
    {
      // restore previous intersection object (if it exists) to its original color
      if ( INTERSECTED ) 
        INTERSECTED.material.color.setHex( INTERSECTED.currentHex );
      // remove previous intersection object reference
      //     by setting current intersection object to "nothing"
      INTERSECTED = null;
      context1.clearRect(0,0,300,300);
      texture1.needsUpdate = true;
    }
    
    // controls.update();
    // stats.update();
  }
  // @param Object position (2d lat/lon coordinates)
  // @return Object coords (x/y coordinates)
  // 
  // Calculates x, y coordinates based on
  // lat/lon coordinates.
  var calculate2dPosition = function(coords) {
    var phi = (90 + coords.lon) * PI / 180;
    var theta = (180 - coords.lat) * PI / 180;

    return {
      x: phi,
      y: PI - theta
    }
  }

  // @param Mesh object
  // @param Object coords (x/y coordinates in 2d space + altitute)
  // 
  // Calculates 3d position and sets it on mesh
  var set3dPosition = function(mesh, coords) {
    if(!coords)
      coords = mesh.userData;

    var x = coords.x;
    var y = coords.y;
    var altitude = coords.altitude;

    mesh.position.set(
      altitude * Math.sin(x) * Math.cos(y),
      altitude * Math.sin(y),
      altitude * Math.cos(x) * Math.cos(y)
    );
  }

  // Create a block mesh and set its position in 3d
  // space just below the earths surface
  var createLevitatingBlock = function(properties) {
    // create mesh
    var block = createMesh.block(properties.color);

    // calculate 2d position
    var pos2d = calculate2dPosition(properties);

    block.userData = {
      // set 2d position on earth so we can more
      // easily recalculate the 3d position

      x: pos2d.x,
      y: pos2d.y,


      altitude: 200 - properties.size / 1.5,
      // speed at which block levitates outside
      // earth's core
      levitation: .1,

      size: properties.size
    }
    
    // calculate 3d position
    set3dPosition(block);

    // rotate towards earth
    block.lookAt(earthPosition);

    // UPDATA:更改了z的系数为和数据相关，除以了一个系数
    block.scale.z = properties.num * 2;
    block.scale.x = properties.size;
    block.scale.y = properties.size;

    block.data = properties;

    block.updateMatrix();
    
    return block;
  }

  // Create a block mesh and set its position in 3d
  // space just below the earths surface
  var createBlock = function(properties) {
    // create mesh
    var block = createMesh.block(properties.color);

    // calculate 2d position
    var pos2d = calculate2dPosition(properties);

    // add altitute
    pos2d.altitude = 200 + properties.size / 2;

    // calculate 3d position
    set3dPosition(block, pos2d);

    // rotate towards earth
    block.lookAt(earthPosition);

    block.scale.z = properties.size * 50;
    block.scale.x = properties.size;
    block.scale.y = properties.size;

    block.updateMatrix();
    
    return block;
  }

  // internal function to levitate all levitating
  // blocks each tick. Called on render.
  var levitateBlocks = function() {
    levitatingBlocks.forEach(function(block, i) {

      var userData = block.userData;

      // if entirely outide of earth, stop levitating
      if(userData.altitude > 200 + userData.size / 2) {
        levitatingBlocks.splice(i, 1);
        return;
      }

      userData.altitude += userData.levitation;
      set3dPosition(block);
      block.updateMatrix();
    });
  }

  //        Public functions

  /**
   * Zoom the earth relatively to its current zoom
   * (passing a positive number will zoom towards
   * the earth, while a negative number will zoom
   * away from earth).
   * 
   * @param  {Integer} delta
   * @return {this}
   */
  api.zoomRelative = function(delta) {
    distanceTarget -= delta;
    checkAltituteBoundries();

    return this;
  }

  /**
   * Transition the altitute of the camera to a
   * specific distance from the earth's core.
   *
   * @param  {Integer} altitute
   * @return {this}
   */
  api.zoomTo = function(altitute) {
    distanceTarget = altitute;
    checkAltituteBoundries();

    return this;
  }

  /**
   * Set the altitute of the camera to a specific
   * distance from the earth's core.
   *
   * @param  {Integer} altitude
   * @return {this}
   */
  api.zoomImmediatelyTo = function(altitute) {
    distanceTarget = distance = altitute;
    checkAltituteBoundries();

    return this;
  }
   
  /**
   * Transition the globe from its current position
   * to the new coordinates.
   *
   * @param  {Object} pos - the position
   * @param  {Float} pos.lat - latitute position
   * @param  {Float} pos.lon - longtitute position
   * @return {this}
   */
  api.center = function(pos) {
    target = calculate2dPosition(pos);
    return this;
  }

  /**
   * Center the globe on the new coordinates.
   *
   * @param  {Object} pos - the position
   * @param  {Float} pos.lat - latitute position
   * @param  {Float} pos.lon - longtitute position
   * @return {this}
   */
  api.centerImmediate = function(pos) {
    target = rotation = calculate2dPosition(pos);
    return this;
  }

  /**
   * Adds a block to the globe. The globe will spawn
   * just below the earth's surface and `levitate`
   * out of the surface until it is fully `out` of the
   * earth.
   *
   * @param  {Object} data
   * @param  {Float} data.lat - latitute position
   * @param  {Float} data.lon - longtitute position
   * @param  {Float} data.size - size of the block
   * @param  {String} data.color - color of the block
   * @return {this}
   */
  api.addLevitatingBlock = function(data) {
    var block = createLevitatingBlock(data);

    scene.add(block);
    levitatingBlocks.push(block);
    blocks.push(block);

    return this;
  }

  /**
   * Adds a block to the globe.
   *
   * @param  {Object} data
   * @param  {Float} data.lat - latitute position
   * @param  {Float} data.lon - longtitute position
   * @param  {Float} data.size - size of the block
   * @param  {String} data.color - color of the block
   * @return {this}
   */
  api.addBlock = function(data) {
    var block = createBlock(data);

    scene.add(block);
    blocks.push(block);

    return this;
  }
  /**
   * Remove all blocks from the globe.
   * 
   * @return {this}
   */
  api.removeAllBlocks = function() {
    blocks.forEach(function(block) {
      scene.remove(block);  
    });

    blocks = [];

    return this;
  }

  api.changeGlobeMap = function(name){
    if (earth.material.map.name === name) 
      return false;
    
  	earth.material.map = mapImage[name];
  }

  return api;
}