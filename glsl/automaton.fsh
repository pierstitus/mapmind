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

uniform int rain;
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
	if (dir==1 || dir==-2) return vec2(v_texCoord.x - du, v_texCoord.y - dv);
	if (dir==2 || dir==-1) return vec2(v_texCoord.x + du, v_texCoord.y + dv);
	if (dir==3 || dir==-4) return vec2(v_texCoord.x - du, v_texCoord.y     );
	if (dir==4 || dir==-3) return vec2(v_texCoord.x + du, v_texCoord.y     );
	if (dir==5 || dir==-6) return vec2(v_texCoord.x - du, v_texCoord.y + dv);
	if (dir==6 || dir==-5) return vec2(v_texCoord.x + du, v_texCoord.y - dv);
	if (dir==7 || dir==-8) return vec2(v_texCoord.x,      v_texCoord.y + dv);
	if (dir==8 || dir==-7) return vec2(v_texCoord.x,      v_texCoord.y - dv);
}

int elevation(int dir) {
	return int((zmax-zmin)*texture2D(elevationMap, coord(dir)).r/dw);
}

int waterlevel(int dir) {
	return int(255.0*texture2D(waterlevelMap, coord(dir)).r);
}

bool getbit(int a, int n) {
//	Below is an *UGLY* WebGL rewrite for
//	for (int i=7;i>n;i--) if(a-int(exp2(float(i)))>=0) a = a - int(exp2(float(i)));
	for (int i=7;i>=0;i--) if (i>n && a-int(exp2(float(i)))>=0) a = a - int(exp2(float(i)));
	if (a-int(exp2(float(n)))>=0) return true;
	else return false;
}

bool flowdir(int pos, int dir) {
	int flowdirs = int(255.0*texture2D(waterlevelMap, coord(pos)).g);
	return getbit(flowdirs, dir);
}

int rand(vec2 co, int max) {
	float a = 12.9898;
	float b = 78.233;
	float c = 43758.5453;
	float dt = dot(co.xy ,vec2(a,b));
	float sn = mod(dt, 3.14);
	int rnd = int(float(max)*fract(abs(sin(sn) * c)));
	if (rnd<0) rnd = 0;
	if (rnd>=max) rnd = max-1;
	return rnd;
}

void main() {
	if (pass == 0) {
		int flowdirs = 0;
		// only continue if water is available at gridpoint
		if (waterlevel(0) > 0) {
			// calculate slope (drop/verval) in 8 wind directions
			int dh[9];
			dh[0] = 0;
			for (int i=1;i<9;i++) dh[i] = (elevation(0) + waterlevel(0) - elevation(i) - waterlevel(i));
			
			// find out which winddirection has highest drop
			int m = 0;
			for (int i=1;i<9;i++) {
//				Below is an *UGLY* WebGL rewrite for
//				if (dh[i] > dh[m]) m = i;
				for (int k = 0; k < 9; ++k) if (m == k) {
					if (dh[i] > dh[k]) m = i;
				}
			}
			
			// only continue if gridpoint shows drop in one or more directions
			if (m>0) {
				// set flags for direction(s) with highest drop
				int n = 0;
				for (int i=1;i<9;i++) {
//					Below is an *UGLY* WebGL rewrite for
//					if (dh[i] == dh[m]) {
//						flowdirs = flowdirs + int(exp2(i-1));
//						n++;
//					}
					for (int k = 0; k < 9; ++k) if (m == k) {
						if (dh[i] == dh[k]) {
							flowdirs = flowdirs + int(exp2(float(i-1)));
							n++;
						}
					}
				}
				
				// check for available excess water at gridpoint
				int available = waterlevel(0);
				
//				Below is an *UGLY* WebGL rewrite for
//				if (dh[m] < available) available = dh[m];
				for (int k = 0; k < 9; ++k) if (m == k) {
					if (dh[k] < available) available = dh[k];
				}
				
				// knock down bits from flowdirs until the number matches available units, start at random
				int dir = rand(coord(rseed), 8);
				
//				Below is an *UGLY* WebGL rewrite for
//				while(n>available) {
				for (int d=0; d<8; d++) {
					if((n>available) && getbit(flowdirs, dir)) {
						flowdirs = flowdirs - int(exp2(float(dir)));
						n--;
					}
					dir++;
					if (dir == 8) dir = 0;
				}
			}
		}
		gl_FragColor = vec4(texture2D(waterlevelMap, v_texCoord).r, float(flowdirs)/255.0, 0.0, 0.0);
	}
	else {
		int level = int(255.0*texture2D(waterlevelMap, v_texCoord).r);
		
		// account flow from resp to gridpoint
		if (level>0) for (int i=1;i<9;i++) if (flowdir(0, i-1)) level--;
		for (int i=1;i<9;i++) if (flowdir(-i,i-1)) level++;
		
		// apply raining...
		if ((rain==1) && (rand(coord(rseed), 8)==0)) level++;
		
		// apply sources and sinks
		vec2 scale = vec2(1, du/dv);
		for (int i=0; i<16; i++) {
			if (i<nSources) {
				if (distance(scale*v_texCoord, scale*sourceCoords[i]) < 3.0*du) level+= 4;
			}
		}
		for (int i=0; i<16; i++) {
			if (i<nSinks) {
				if (distance(scale*v_texCoord, scale*sinkCoords[i]) < 3.0*du) level = 0;
			}
		}
		
		// drain at border of frame
		if ((v_texCoord.x < du) || (v_texCoord.x >= 1.0-du) || (v_texCoord.y < dv) || (v_texCoord.y >= 1.0-dv)) gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		else gl_FragColor = vec4(float(level)/255.0, 0.0, 0.0, 0.0);
	}
}
