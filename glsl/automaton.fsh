/*
 * LICENSE
 * MapMind was developed by Harmen G. Zijp at the Cooperative University of Amersfoort. The code is distributed under the Simple Public License 2.0 which can be found at https://opensource.org/licenses/Simple-2.0
 * 
 * Contact: harmen [at] universiteitamersfoort [dot] nl
*/

// colormap fragment shader

// Watch out: Some horrible ugly hacks were used because stupid webgl cannot handle variable array indices!
// See https://stackoverflow.com/questions/30585265/what-can-i-use-as-an-array-index-in-glsl-in-webgl

precision mediump float;

// our textures
uniform sampler2D waterlevelMap;
uniform sampler2D elevationMap;

// declare the texture coordinate that is passed in from the fragment shader
varying vec2 v_texCoord;

// declare additional variables we pass from the main program into this shader
uniform float zmin;
uniform float zmax;
uniform float dw; // water increment
uniform float du; // the width of the cells
uniform float dv; // the height of the cells

const float outflowrange = 10.0; // defines the resolution of outflow as it is only 8bit

uniform float rain;
uniform float lastX;
uniform float lastY;
uniform float currX;
uniform float currY;
uniform float wellX;
uniform float wellY;

uniform int nSources;
uniform vec2 sourceCoords[16];
uniform int nSinks;
uniform vec2 sinkCoords[16];

uniform int pass;
uniform int rseed;

vec2 coord(int dir) {
	if (dir==0)            return vec2(v_texCoord.x,      v_texCoord.y     );
	if (dir==1 || dir==-2) return vec2(v_texCoord.x - du, v_texCoord.y     );
	if (dir==2 || dir==-1) return vec2(v_texCoord.x + du, v_texCoord.y     );
	if (dir==3 || dir==-4) return vec2(v_texCoord.x,      v_texCoord.y + dv);
	if (dir==4 || dir==-3) return vec2(v_texCoord.x,      v_texCoord.y - dv);
	if (dir==5 || dir==-6) return vec2(v_texCoord.x - du, v_texCoord.y - dv);
	if (dir==6 || dir==-5) return vec2(v_texCoord.x + du, v_texCoord.y + dv);
	if (dir==7 || dir==-8) return vec2(v_texCoord.x - du, v_texCoord.y + dv);
	if (dir==8 || dir==-7) return vec2(v_texCoord.x + du, v_texCoord.y - dv);
}

float elevation(int dir) {
	return (zmax-zmin)*(texture2D(elevationMap, coord(dir)).r + texture2D(elevationMap, coord(dir)).g/255.0)/dw;
}

float waterlevel(int dir) {
	return 255.0*texture2D(waterlevelMap, coord(dir)).r + texture2D(waterlevelMap, coord(dir)).g;
}

void main() {
	if (pass == 0) {
		float flowfactor = 0.0;
		float outflow = 0.0;
		// calculate flow away from gridpoint
		if (waterlevel(0) > 0.0) {
			float flowsum = 0.0;
			// outflow to neighboring gridcells
			for (int dir=1; dir<5; dir++) {
				float flow = (elevation(0) + waterlevel(0) - elevation(dir) - waterlevel(dir)) * 0.5;
				if (flow < 0.0) flow = 0.0;
				flowsum += flow;
				if (flow > outflow) outflow = flow;
			}
			// spread slower in diagonals to spread evenly in every direction
			for (int dir=5; dir<9; dir++) {
				float flow = (elevation(0) + waterlevel(0) - elevation(dir) - waterlevel(dir)) * 0.5 * 0.7071;
				if (flow < 0.0) flow = 0.0;
				flowsum += flow;
				if (flow > outflow) outflow = flow;
			}
			// add momentum based on previous outflow (better would be to incorporate direction of momentum, but as
			// storage is limited to 4 bytes we just take the outflow)
			// 0.5 or higher is unstable, so 0.4 seems a nice choice
			outflow += 0.4 * texture2D(waterlevelMap, v_texCoord).b*outflowrange;
			// limit outflow to water level
			if (outflow > waterlevel(0)) {
				outflow = waterlevel(0);
			}
			// limit outflow to flowrange, higher values can't be stored in the 8 bit value
			if (outflow > outflowrange) {
				outflow = outflowrange;
			}
			if (flowsum > 0.0) {
				flowfactor = outflow / flowsum;
			}
		}
		gl_FragColor = vec4(texture2D(waterlevelMap, v_texCoord).r, texture2D(waterlevelMap, v_texCoord).g, outflow/outflowrange, flowfactor);
	}
	else { // pass == 1
		// level minus flow away from gridpoint
		float outflow = outflowrange*texture2D(waterlevelMap, v_texCoord).b;
		float level = waterlevel(0) - outflow;
		
		// account flow to gridpoint
		for (int dir=1; dir<5; dir++) {
			float flow = -(elevation(0) + waterlevel(0) - elevation(-dir) - waterlevel(-dir)) * 0.5;
			if (flow < 0.0) flow = 0.0;
			float flowfactor = texture2D(waterlevelMap, coord(-dir)).a;
			level += flow * flowfactor;
		}
		// spread slower in diagonals to spread evenly in every direction
		for (int dir=5; dir<9; dir++) {
			float flow = -(elevation(0) + waterlevel(0) - elevation(-dir) - waterlevel(-dir)) * 0.5 * 0.7071;
			if (flow < 0.0) flow = 0.0;
			float flowfactor = texture2D(waterlevelMap, coord(-dir)).a;
			level += flow * flowfactor;
		}

		// apply raining...
		level += rain;
		
		// apply sources and sinks
		vec2 scale = vec2(1, du/dv);
		for (int i=0; i<16; i++) {
			if (i<nSources) {
				if (distance(scale*v_texCoord, scale*sourceCoords[i]) < 3.0*du) level += 4.0;
			}
		}
		for (int i=0; i<16; i++) {
			if (i<nSinks) {
				if (distance(scale*v_texCoord, scale*sinkCoords[i]) < 3.0*du) level = 0.0;
			}
		}
		
		// drain at border of frame
		if ((v_texCoord.x < du) || (v_texCoord.x >= 1.0-du) || (v_texCoord.y < dv) || (v_texCoord.y >= 1.0-dv)) {
			gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		}
		else {
			float l1 = floor(level);
			gl_FragColor = vec4(l1/255.0, level-l1, texture2D(waterlevelMap, v_texCoord).b, 0.0);
		}
	}
}
