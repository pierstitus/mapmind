// terrain sculpting vertex shader
precision mediump float;

// declare variables for various coordinates (framebuffer, texture) we get from the main program
attribute vec2 a_position;
attribute vec2 a_texCoord;

// declare additional variables we pass from the main program into this shader
uniform vec2 u_resolution;

// declare the texture coordinate that is passed on to the fragment shader
varying vec2 v_texCoord;

void main() {
	// convert the rectangle from pixels (0,0 to u_resolution) to clipspace (-1.0 to 1.0)
	vec2 clipCoord = 2.0*(a_position/u_resolution) - 1.0;
	
	// set position
	gl_Position = vec4(clipCoord, 0, 1);
	
	// pass the texCoord to the fragment shader
	v_texCoord = a_texCoord;
}
