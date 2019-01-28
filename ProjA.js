// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variable -- Rotation angle rate (degrees/second)
var floatsPerVertex = 7;
var canvas;
var gl;
var u_ModelMatrix;
var modelMatrix;

//drag
var isDrag = false;
var xMouseClick = 0.0;
var yMouseClick = 0.0;
var xMouseDrag = 0.0;
var yMouseDrag = 0.0;
var lastMouseDown = Date.now();
//animation
var isRun = true;
var g_last = Date.now();
var ANGLE_STEP = 90.0
var CAR_SPEED = 1.0;
var rocketAngle = 30.0;
var carTranslate = 0.0;
var cameraAngle = 0.0;
var carYTranslate = -0.7;
var carYTranslateStep = 0.0;
var CAMERA_STEP = 30;
var carScale = 0.2;
var carScaleStep = 0.02;
var isCarScaleChanging = false;
var wingAngle = 0.0;
var wingAngleStep = 90.0;

function main() {
   canvas = document.getElementById('webgl');
   gl = getWebGLContext(canvas);
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to Initialize shaders.");
    return;
  }

  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log("Failed to set the vertex info");
    return;
  }

  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.enable(gl.DEPTH_TEST);

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  modelMatrix = new Matrix4();

  //event listeners
  window.addEventListener("mousedown", myMouseDown);
  window.addEventListener("mousemove", myMouseMove);
  window.addEventListener("mouseup", myMouseUp);
  window.addEventListener("keypress", myKeyPress, false);


  tick();


}

function tick() {
  if (!isRun) return;
  timerAll();

  draw();
  requestAnimationFrame(tick, canvas);
}

function buttonRunStop() {
  isRun = !isRun;
  if (isRun) tick();
}

function initVertexBuffer(gl) {

  makeWings();
  makeCylinder();
  makeCone();


  var mySiz = (wings.length + cylVerts.length + coneVerts.length);

  var nn = mySiz / floatsPerVertex;
  console.log('nn is', nn, 'mySiz is', mySiz, 'cylVerts length is ', cylVerts.length,
            'coneVerts length is ', coneVerts.length);

  var colorShapes = new Float32Array(mySiz);

  //copy wings
  wingsStart = 0;
  for(i=0,j=0; j< wings.length; i++,j++) {
  	colorShapes[i] = wings[j];
	}

  //copyCylinder
  cylStart = i;
  for(j = 0; j < cylVerts.length; i++, j++) {
    colorShapes[i] = cylVerts[j];

  }

  //copy coneVerts
  coneStart = i;
  for (j = 0; j < coneVerts.length; i++, j++) {
    colorShapes[i] = coneVerts[j];
  }

  //Create a buffer Object
  var shapeBufferHandle = gl.createBuffer();
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  var FSIZE = colorShapes.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * 7,0);
  gl.enableVertexAttribArray(a_Position);

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w

  gl.enableVertexAttribArray(a_Color);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

function makeCone() {
  var topColr = new Float32Array([0.2, 0.0, 0.4]);
  var botColr = new Float32Array([0.4,0.6,0.0]);
  var radius = 1.6;
  var verts = 48;
  var height = 1.0;

  coneVerts = new Float32Array((4 * verts + 4) * floatsPerVertex);

  for(v=0, j=0; v < (2 * verts + 2); v++, j += floatsPerVertex) {
    if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			coneVerts[j  ] = radius * Math.cos(Math.PI*(v)/verts);		// x
			coneVerts[j+1] = 0;		// y
			coneVerts[j+2] = radius * Math.sin(Math.PI*(v)/verts);	// z
			coneVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			coneVerts[j+4]=botColr[0];
			coneVerts[j+5]=botColr[1];
			coneVerts[j+6]=botColr[2];
		}
		else {				// position odd#'d vertices at center of the top cap:
			coneVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			coneVerts[j+1] = 2 * height;
			coneVerts[j+2] = 0.0;
			coneVerts[j+3] = 1.0;			// r,g,b = botColr[]
			coneVerts[j+4]=topColr[0];
			coneVerts[j+5]=topColr[1];
			coneVerts[j+6]=topColr[2];
		}
  }

  //create bottom cap
  for(v=0; v < (2 * verts + 2); v++, j += floatsPerVertex) {
    if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			coneVerts[j  ] = radius * Math.cos(Math.PI*(v)/verts);		// x
			coneVerts[j+1] = 0;		// y
			coneVerts[j+2] = radius * Math.sin(Math.PI*(v)/verts);	// z
			coneVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			coneVerts[j+4]=botColr[0];
			coneVerts[j+5]=botColr[1];
			coneVerts[j+6]=botColr[2];
		}
		else {				// position odd#'d vertices at center of the top cap:
			coneVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			coneVerts[j+1] = 0.0
			coneVerts[j+2] = 0.0;
			coneVerts[j+3] = 1.0;			// r,g,b = botColr[]
			coneVerts[j+4]=0.9
			coneVerts[j+5]=0.2
			coneVerts[j+6]=0.2
		}
  }
}

function makeWings() {
  var leafX = 1.2;
  var leafX_long = 2.0;
  var leafY = 0.1;
  var leafZ = 0.4;
  wings = new Float32Array([
    // +x face: RED
     leafX_long, -leafY, -leafZ, 1.0,		1.0, 0.0, 0.0,	// Node 3
     leafX_long,  leafY, -leafZ, 1.0,		1.0, 0.0, 0.0,	// Node 2
     leafX_long,  leafY,  0.0, 1.0,	  1.0, 0.5, 0.0,  // Node 4

     leafX_long,  leafY,  0.0, 1.0,	  1.0, 0.5, 0.0,	// Node 4
     leafX_long, -leafY,  0.0, 1.0,	 1.0, 0.5, 0.0,	// Node 7
     leafX_long, -leafY, -leafZ, 1.0,	 1.0, 0.0, 0.0,	// Node 3

		// +y face: RED
    -leafX,  leafY, -leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 1
    -leafX,  leafY,  leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 5
     leafX,  leafY,  leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 4

     leafX,  leafY,  leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 4
     leafX,  leafY, -leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 2
    -leafX,  leafY, -leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 1

    leafX_long,leafY, -leafZ,1.0,         0.5,1.0,0.0,
    leafX, leafY, -leafZ, 1.0,     1.0, 0.5, 0.0,
    leafX_long,leafY, 0.0, 1.0,   0.5,1.0,0.0,


    leafX, leafY, -leafZ, 1.0,      1.0, 0.5, 0.0,
    leafX_long, leafY, 0.0, 1.0,    0.5,1.0,0.0,
    leafX, leafY, 0.0, 1.0,   1.0, 0.5, 0.0,

    leafX_long, leafY, 0.0, 1.0,    0.5,1.0,0.0,
    leafX, leafY, 0.0, 1.0,      1.0, 0.5, 0.0,
    leafX, leafY, leafZ, 1.0, 1.0, 0.5, 0.0,



		// +z face: BLUE
    -leafX,  leafY,  leafZ, 1.0,	  0.0, 0.5, 1.0,	// Node 5
    -leafX, -leafY,  leafZ, 1.0,	  0.0, 0.5, 1.0,	// Node 6
     leafX, -leafY,  leafZ, 1.0,	  0.0, 0.5, 0.0,	// Node 7

     leafX, -leafY,  leafZ, 1.0,	  0.0, 0.5, 0.0,	// Node 7
     leafX,  leafY,  leafZ, 1.0,	  0.0, 0.5, 0.0,	// Node 4
    -leafX,  leafY,  leafZ, 1.0,	  0.0, 0.5, 1.0,	// Node 5

    leafX_long, -leafY, 0.0, 1.0,    1.0, 0.5, 0.0,
    leafX, -leafY, leafZ, 1.0,     0.0, 0.5, 0.0,
    leafX, leafY, leafZ, 1.0,    0.0, 0.5, 0.0,

    leafX_long, -leafY, 0.0, 1.0,    1.0, 0.5, 0.0,
    leafX_long, leafY, 0.0, 1.0,     1.0, 0.5, 0.0,
    leafX, leafY, leafZ, 1.0,    0.0, 0.5, 0.0,

		// -x face: CYAN // no color required
    -leafX, -leafY,  leafZ, 1.0,	  1.0, 1.0, 0.0,	// Node 6
    -leafX,  leafY,  leafZ, 1.0,	  0.0, 1.0, 1.0,	// Node 5
    -leafX,  leafY, -leafZ, 1.0,	  1.0, 0.0, 1.0,	// Node 1

    -leafX,  leafY, -leafZ, 1.0,	  1.0, 1.0, 0.0,	// Node 1
    -leafX, -leafY, -leafZ, 1.0,	  0.0, 1.0, 1.0,	// Node 0
    -leafX, -leafY,  leafZ, 1.0,	  1.0, 0.0, 1.0,	// Node 6

		// -y face: MAGENTA
     -leafX,  -leafY, -leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 1
     -leafX,  -leafY,  leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 5
      leafX,  -leafY,  leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 4

      leafX,  -leafY,  leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 4
      leafX,  -leafY, -leafZ, 1.0,	  1.0, 0.5, 0.0,	// Node 2
     -leafX,  -leafY, -leafZ, 1.0,	  1.0, 0.0, 0.0,	// Node 1

     leafX_long,-leafY, -leafZ,1.0,         0.5,1.0,0.0,
     leafX, -leafY, -leafZ, 1.0,     1.0, 0.5, 0.0,
     leafX_long,-leafY, 0.0, 1.0,   0.5,1.0,0.0,


     leafX, -leafY, -leafZ, 1.0,      1.0, 0.5, 0.0,
     leafX_long, -leafY, 0.0, 1.0,     0.5,1.0,0.0,
     leafX, -leafY, 0.0, 1.0,   1.0, 0.5, 0.0,

     leafX_long, -leafY, 0.0, 1.0,     0.5,1.0,0.0,
     leafX, -leafY, 0.0, 1.0,     1.0, 0.5, 0.0,
     leafX, -leafY, leafZ, 1.0, 1.0, 0.5, 0.0,

     // -z face: YELLOW
     leafX_long,  leafY, -leafZ, 1.0,	   0.0, 0.5, 0.0,	// Node 2
     leafX_long, -leafY, -leafZ, 1.0,	   0.0, 0.5, 0.0,	// Node 3
    -leafX, -leafY, -leafZ, 1.0,	  0.0, 1.0, 0.0,	// Node 0

    -leafX, -leafY, -leafZ, 1.0,	  0.0, 0.5, 0.0,	// Node 0
    -leafX,  leafY, -leafZ, 1.0,	  0.0, 0.5, 0.0,	// Node 1
     leafX_long,  leafY, -leafZ, 1.0,	   0.0, 1.0, 0.0,	// Node 2
  ]);
}

function makeCylinder() {
  var ctrColrTop = new Float32Array([0.4, 0.2, 0.0]);
  var ctrColrBot = new Float32Array([0.6, 0.4, 0.0]);	// dark gray
  var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
  var botColr = new Float32Array([0.5, 0.5, 1.0, 1.0,0.5,0.5]);	// light blue
  var verts = 48;
  var radius = 1.6;
  var height = 1.5;
  cylVerts = new Float32Array((verts * 6 + 4) * floatsPerVertex);

  //top cap
  for(v=0, j=0; v <= (2 * verts); v++, j += floatsPerVertex) {
    if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = radius * Math.cos(Math.PI*(v)/verts);		// x
			cylVerts[j+1] = height;		// y
			cylVerts[j+2] = radius * Math.sin(Math.PI*(v)/verts);	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0];
			cylVerts[j+5]=topColr[1];
			cylVerts[j+6]=topColr[2];
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = height;
			cylVerts[j+2] = 0.0;
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=topColr[0];
			cylVerts[j+5]=topColr[1];
			cylVerts[j+6]=topColr[2];
		}
  }

  // Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*verts + 2; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{
				cylVerts[j  ] = radius * Math.cos(Math.PI*(v)/verts);		// x
				cylVerts[j+1] = height;		// y
				cylVerts[j+2] = radius * Math.sin(Math.PI*(v)/verts);;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=ctrColrTop[0];
				cylVerts[j+5]=ctrColrTop[1];
				cylVerts[j+6]=ctrColrTop[2];
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = radius * Math.cos(Math.PI*(v-1)/verts);		// x
				cylVerts[j+1] = -height;		// y
				cylVerts[j+2] = radius * Math.sin(Math.PI*(v-1)/verts);;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=ctrColrBot[0];
				cylVerts[j+5]=ctrColrBot[1];
				cylVerts[j+6]=ctrColrBot[2];
		}
	}

  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*verts + 2); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = radius * Math.cos(Math.PI*(v)/verts);		// x
			cylVerts[j+1] = -height;	// y
			cylVerts[j+2] =	radius * Math.sin(Math.PI*(v)/verts);	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[3];
			cylVerts[j+5]=botColr[4];
			cylVerts[j+6]=botColr[5];
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = -height;
			cylVerts[j+2] = 0.0;
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0];
			cylVerts[j+5]=botColr[1];
			cylVerts[j+6]=botColr[2];
		}
	}
}


function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //draw rocket
  //draw Cylinder
  // modelMatrix.setTranslate(xMouseDrag, yMouseDrag, 0.0);

  modelMatrix.setTranslate(xMouseDrag-0.5,yMouseDrag+0.2,0.0);
  modelMatrix.scale(0.1,0.15,0.15);
  modelMatrix.rotate(rocketAngle / 10, 0.0, 0.0, 1.0);
  modelMatrix.rotate(30, 1,1,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  //drawCone
  modelMatrix.translate(0.0,1.5,0.0);
  // modelMatrix.rotate(rocketAngle / 10, 0.0, 0.0, 1.0);
  // modelMatrix.rotate(30, 1,1,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, coneStart/floatsPerVertex, coneVerts.length/floatsPerVertex);

  //draw rocket bottom
  modelMatrix.translate(0.0, -4.0,0,0);
  modelMatrix.rotate(rocketAngle / 3, 1,0,1);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, coneStart/floatsPerVertex, coneVerts.length/floatsPerVertex);

  // Draw first wing
  modelMatrix.setTranslate(xMouseDrag-0.4, yMouseDrag + 0.3, 0.0);
  modelMatrix.scale(0.1,0.15,0.15);
  modelMatrix.rotate(-rocketAngle, 0.0, 0.0, 1.0);
  modelMatrix.translate(1.0,0.0,0.0);

   modelMatrix.rotate(30, 1,1,0);
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  modelMatrix.translate(1.0,-0.7,0.0);
  modelMatrix.scale(0.7,0.7,0.7);
  modelMatrix.rotate(wingAngle, 1,1,0);
  modelMatrix.translate(2.0,0,0)
  modelMatrix.translate(0,1,0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  // //draw second wing
  modelMatrix.setTranslate(xMouseDrag-0.6,yMouseDrag+0.3,0.0);
  modelMatrix.scale(0.1,0.15,0.15);
  modelMatrix.rotate(rocketAngle, 0.0, 0.0, 1.0);
  modelMatrix.translate(-1.0,0.0,0.0);
  modelMatrix.rotate(30, 1,1,0);

  modelMatrix.rotate(180, 0,1,0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);


  modelMatrix.translate(1.0,-0.7,0.0);
  modelMatrix.scale(0.7,0.7,0.7);
  modelMatrix.rotate(wingAngle, -1,-1,0);

  modelMatrix.translate(2.0,0,0)
  modelMatrix.translate(0,1,0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  



  //draw car
  //car body
  modelMatrix.setTranslate(-0.5, carYTranslate, 0.0);
  modelMatrix.scale(carScale, carScale, carScale);
  modelMatrix.rotate(270, 1,0,0);
  modelMatrix.rotate(-15,1,0,-1);
  modelMatrix.translate(carTranslate,1,0,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  modelMatrix.translate(0.0,0.2,0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  modelMatrix.translate(0.0,0.2,0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  modelMatrix.translate(0.0,0.2,0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, wings.length/floatsPerVertex);

  pushMatrix(modelMatrix);

  //car top
  modelMatrix.translate(0.8,-0.5,0.4);
  modelMatrix.scale(0.3,0.3,0.3);
  modelMatrix.rotate(90,1,0,0);
  modelMatrix.translate(-1.0,0.0,0.0);
  // modelMatrix.rotate(lightAngle,1,1,0);
  // modelMatrix.translate(-4.0,0,0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, coneStart/floatsPerVertex, coneVerts.length/floatsPerVertex);

  //revolving camera
  modelMatrix.translate(0.0,3.0,0.0);
  modelMatrix.rotate(90,0,0,1);
  modelMatrix.scale(0.8,1.0,1.0)
  modelMatrix.rotate(cameraAngle,1,0,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);
  
  pushMatrix(modelMatrix);

  modelMatrix.translate(0.0,2.5,0.0);
  modelMatrix.scale(1.5,0.6,0.6);
  modelMatrix.rotate(90, 0,1,0);
  modelMatrix.rotate(wingAngle / 2,0,0,1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();
  modelMatrix.translate(0.0,-2.5,0.0);
  modelMatrix.scale(1.5,0.6,0.6);
  modelMatrix.rotate(90, 0,1,0);
  modelMatrix.rotate(wingAngle / 2,1,0,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  //car wheel1
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);

  modelMatrix.translate(-0.5,-0.5,-0.4);
  modelMatrix.scale(0.2,0.05,0.2);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
  //car wheel2
  modelMatrix.translate(1.0,-0.5,-0.4);
  modelMatrix.rotate(rocketAngle,0,0,1);

  modelMatrix.scale(0.2,0.05,0.2);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
  //car wheel3
  modelMatrix.translate(-0.5,-0.2,-0.4);
  modelMatrix.scale(0.2,0.05,0.2);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();
  //car wheel4
  modelMatrix.translate(1.0,-0.2,-0.4);
  modelMatrix.rotate(rocketAngle,0,0,1);

  modelMatrix.scale(0.2,0.05,0.2);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);




}

function timerAll() {
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  if (elapsed > 500) elapsed = 20;

  //rocket angle
  if(rocketAngle >   40.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(rocketAngle <  -40.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  rocketAngle = rocketAngle + (ANGLE_STEP* elapsed) / 1000.0;
  rocketAngle %= 360;

  //car translate
  if(carTranslate >= 5.0 && CAR_SPEED > 0 || carTranslate <= -0.5 && CAR_SPEED < 0) {
    CAR_SPEED = -CAR_SPEED
  }

  
  carTranslate = carTranslate + (CAR_SPEED * elapsed) / 1000.0;


  //car Y translation
  if(carYTranslate >= 0.0 && carYTranslateStep > 0 || carYTranslate <= -1.0 && carYTranslateStep < 0) {
    carYTranslateStep = -carYTranslateStep;
  }
  carYTranslate = carYTranslate + carYTranslateStep * elapsed / 1000.0;

  //camera angle
  cameraAngle = cameraAngle + (CAMERA_STEP * elapsed) / 1000.0;
  cameraAngle %= 360;

  //carScale
  if (isCarScaleChanging) {
    if (carScale >= 0.3 || carScale <= 0.2) carScaleStep = -carScaleStep;
    carScale += (carScaleStep * elapsed) / 1000.0;
  }

  //wing angle
  if (wingAngle >= 90.0 && wingAngleStep > 0 || wingAngle <= -90 && wingAngleStep < 0) wingAngleStep = -wingAngleStep;
  wingAngle = wingAngle + (wingAngleStep * elapsed) / 1000;
  wingAngleStep %= 360;

}

function driveFaster() {
  if (CAR_SPEED >= 0) CAR_SPEED++;
  else CAR_SPEED--;
}
function driveSlower() {
  if (CAR_SPEED >= 0) CAR_SPEED--;
  else CAR_SPEED++;
}


//========Mouse Drag============
function myMouseDown(ev) {
  //pause rocketAngle



  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = canvas.height - (ev.clientY - rect.top);

  var x = (xp - canvas.width/2) / (canvas.width/2);
  var y = (yp - canvas.height/2) / (canvas.height/2);


  lastMouseDown = Date.now();

  isDrag = true;
  xMouseClick = x;
  yMouseClick = y;
  //document.getElementById('MouseAtResult').innerHTML = 'myMouseDown() at CVV coords x,y = '
+x+','+y;
}

function myMouseMove(ev) {
  if (!isDrag) return;
  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = canvas.height - (ev.clientY - rect.top);

  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);

  xMouseDrag += (x - xMouseClick);
  yMouseDrag += (y - yMouseClick);
  xMouseClick = x;
  yMouseClick = y;
}

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									  // x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
// console.log('rect= ',rect, 'ev= ', ev, 'xp =', xp ,'yp= ', yp)

  var now = Date.now();
  var diff = now - lastMouseDown;
  // console.log("diff: ", diff);
  if (diff < 100) {
    isCarScaleChanging = !isCarScaleChanging;
    console.log("isCarScaleChanging ", isCarScaleChanging);
  }

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);


	//console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);

	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMouseDrag += (x - xMouseClick);
	yMouseDrag += (y - yMouseClick);
	// console.log('myMouseUp: xMdragTot,yMdragTot =',g_xMdragTot,',\t', g_yMdragTot);
	// Put it on our webpage too...
	//document.getElementById('MouseAtResult').innerHTML =
	//'myMouseUp(       ) at CVV coords x,y = '+x+', '+y;
};

//=====KeyBoard Interaction
function myKeyPress(kev) {
  var charCode = kev.which || kev.keyCode;
  myChar = String.fromCharCode(kev.keyCode);
  console.log("key press! ", charCode);

  switch(charCode) {
    case 112:
      console.log("Pause/UnPause");
      document.getElementById('KeyPressResult').innerHTML = 'Pause Key Pressed';
      buttonRunStop();
      break;
    case 119:
      console.log('w pressed');
      document.getElementById('KeyPressResult').innerHTML = 'W Key Pressed';
      carYTranslateStep+=0.5
      break;
    case 115:
      console.log('s pressed');
      document.getElementById('KeyPressResult').innerHTML = 'S Key Pressed';
      carYTranslateStep-=0.5;
      break;
    case 113:
      console.log('q pressed');
      document.getElementById('KeyPressResult').innerHTML = 'Q Key Pressed';
      if (CAMERA_STEP != 0) CAMERA_STEP = 0;
      else CAMERA_STEP = 30;
      break;

    case 101:
      console.log('e pressed');
      document.getElementById('KeyPressResult').innerHTML = 'E Key Pressed';
      if (CAMERA_STEP != 0) CAMERA_STEP = 0;
      else CAMERA_STEP = -30;
      break;
  }
}

function reset() {
   isRun = true;
   g_last = Date.now();
   ANGLE_STEP = 90.0
   CAR_SPEED = 1.0;
   rocketAngle = 30.0;
   carTranslate = 0.0;
   cameraAngle = 0.0;
   carYTranslate = -0.7;
   CAMERA_STEP = 30;
   carScale = 0.2;

   isDrag = false;
   xMouseClick = 0.0;
   yMouseClick = 0.0;
   xMouseDrag = 0.0;
   yMouseDrag = 0.0;
}
